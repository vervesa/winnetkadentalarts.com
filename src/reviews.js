/* Live Google reviews.
 *
 * Two jobs:
 *   GET /api/reviews      a small JSON document of the practice's recent five-star reviews
 *   renderReviews()       the same reviews written into a page's quote slots as the HTML is
 *                         served, so the page arrives with the live review already in place
 *                         (no swap after first paint, and the text is there for crawlers)
 *
 * The pages never talk to Google. The route asks Places API (New) Place Details, keeps the
 * reviews that pass the rules below, and caches one answer per Cloudflare data center for
 * CACHE_SECONDS. HTML rendering only ever reads that cache: a cold cache leaves the page's
 * static quotes in place and assets/js/reviews.js fetches /api/reviews (which fills the cache),
 * so a page never waits on Google.
 *
 * The API key stays here (secret `PlacesAPI` on the Worker). Google's terms allow storing the
 * place ID indefinitely but not review text beyond a short cache, so nothing is written into
 * the static pages.
 */

const PLACE_ID = "ChIJRZU3OvfED4gRt8GRSdCafGQ"; // Winnetka Dental Arts (ChIJ… place ID, not the cid= number)

const STARS = 5;                     // only reviews with exactly this rating
const MIN_CHARS = 80;                // review text at least this long…
const MAX_CHARS = 400;               // …and at most this long (after trimming); pages cap further per slot
const CACHE_SECONDS = 6 * 60 * 60;   // reuse one Google answer for this long
const CACHE_VERSION = "2";           // bump to discard every data center's cached answer on deploy

const FIELD_MASK = "rating,userRatingCount,googleMapsUri,reviews";

export async function handleReviews(request, env, ctx) {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  }
  const cached = await cache().match(cacheKey(request.url));
  if (cached) return cached;

  const apiKey = env.PlacesAPI || env.GOOGLE_PLACES_KEY;
  if (!apiKey) return json({ error: "reviews not configured" }, 503);

  let place;
  try {
    const upstream = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=en`, {
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
    });
    if (!upstream.ok) return json({ error: `google responded ${upstream.status}` }, 502);
    place = await upstream.json();
  } catch {
    return json({ error: "google unreachable" }, 502);
  }

  const reviews = (place.reviews || [])
    .filter((r) => r.rating === STARS)
    .map(shape)
    .filter((r) => r.text.length >= MIN_CHARS && r.text.length <= MAX_CHARS)
    .sort((a, b) => (a.publishTime < b.publishTime ? 1 : a.publishTime > b.publishTime ? -1 : 0));

  const body = {
    rating: place.rating,
    ratingCount: place.userRatingCount,
    placeUrl: place.googleMapsUri,
    criteria: { stars: STARS, minChars: MIN_CHARS, maxChars: MAX_CHARS },
    fetchedAt: new Date().toISOString(),
    reviews,
  };

  const response = json(body, 200, { "Cache-Control": `public, max-age=${CACHE_SECONDS}` });
  ctx.waitUntil(cache().put(cacheKey(request.url), response.clone()));
  return response;
}

/* ---- HTML rendering ------------------------------------------------------------------ */

// The reviews this data center already holds, or null (never fetches: pages don't wait on Google).
export async function cachedReviews(requestUrl) {
  const hit = await cache().match(cacheKey(requestUrl));
  if (!hit) return null;
  try {
    const data = await hit.json();
    return data && Array.isArray(data.reviews) && data.reviews.length ? data : null;
  } catch {
    return null;
  }
}

// A short tag for this set of reviews, so a page's ETag changes when the reviews do.
export function reviewsVersion(data) {
  return fnv1a(data.reviews.map((r) => r.id + "|" + r.text).join("\n")).toString(36);
}

// Fill the page's quote slots the way assets/js/reviews.js would (same markup, same choice of
// review per slot), and mark them data-reviews-live so the script leaves them alone.
export function renderReviews(response, data, pathname) {
  const pageHash = fnv1a(pathname.replace(/index\.html$/, ""));
  let rotating = 0;

  return new HTMLRewriter()
    .on("[data-reviews]", {
      element(el) {
        const maxChars = parseInt(el.getAttribute("data-reviews-max-chars"), 10) || Infinity;
        const eligible = data.reviews.filter((r) => r.text.length <= maxChars);
        const isList = /^(ul|ol)$/i.test(el.tagName);
        if (isList) {
          const max = parseInt(el.getAttribute("data-reviews-max"), 10) || Infinity;
          const reviews = eligible.slice(0, max);
          if (!reviews.length) return;
          el.setInnerContent(reviews.map(listItem).join(""), { html: true });
        } else {
          const n = eligible.length;
          if (!n) return;
          const pinned = el.getAttribute("data-reviews-index");
          let index;
          if (pinned !== null) {
            index = parseInt(pinned, 10) || 0;
            if (index >= n) return;
          } else {
            const ordinal = rotating++;
            if (ordinal >= n) return;
            index = (pageHash + ordinal) % n;
          }
          const r = eligible[index];
          if (r.url) el.setAttribute("cite", r.url);
          el.setInnerContent(quote(r, index === 0), { html: true });
        }
        el.setAttribute("data-reviews-live", "");
      },
    })
    .on("[data-reviews-notice]", {
      element(el) {
        el.setInnerContent(`Showing brief five-star reviews from ${attribution()}, newest first.`, { html: true });
      },
    })
    .on("[data-reviews-rating]", {
      element(el) {
        if (data.rating != null) el.setInnerContent(Number(data.rating).toFixed(1));
      },
    })
    .on("[data-reviews-count]", {
      element(el) {
        if (data.ratingCount != null) el.setInnerContent(String(data.ratingCount));
      },
    })
    .on('link[rel="preload"][href="/api/reviews"]', {
      element(el) {
        el.remove(); // the script will not need the JSON on this page
      },
    })
    .transform(response);
}

// Hero and sidebar: the slot is the blockquote itself.
function quote(r, isNewest) {
  return (
    `<p>${esc("“" + r.text + "”")}</p>` +
    `<footer>${author(r)}${meta(r, isNewest ? "Newest brief five-star review on " : "Recent brief five-star review on ")}</footer>`
  );
}

// Reviews page: same markup as the page's own list items.
function listItem(r) {
  const when = r.when ? `<time${r.publishTime ? ` datetime="${esc(r.publishTime)}"` : ""}>${esc(r.when)}</time>` : "";
  return (
    `<li><div class="review-meta"><span class="name">${author(r)}</span>${when}</div>` +
    `<span class="stars" aria-label="${esc(String(r.rating))} out of 5 stars">★★★★★</span>` +
    `<p>${esc(r.text)}</p>` +
    `<p class="gq-meta-row">${meta(r, "Five-star review on ")}</p></li>`
  );
}

// Author attribution: avatar, name, profile link (Google requires all three where space allows).
function author(r) {
  if (!r.author) return "";
  const avatar = r.author.photo
    ? `<img class="gq-avatar" src="${esc(r.author.photo)}" alt="" width="22" height="22" referrerpolicy="no-referrer" onerror="this.remove()">`
    : "";
  const shown = esc(shortName(r.author.name || ""));
  const name = r.author.url
    ? `<a class="gq-name" href="${esc(r.author.url)}" target="_blank" rel="noopener">${shown}</a>`
    : `<span class="gq-name">${shown}</span>`;
  return avatar + name;
}

// "Michelle Laughlin" -> "Michelle L."; a one-word name stays as it is.
function shortName(name) {
  const parts = name.replace(/\s+/g, " ").trim().split(" ");
  if (parts.length < 2) return cap(name.trim());
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).map(cap).join(" ");
  return /^[A-Za-zÀ-ɏ]/.test(last) ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}
function cap(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// The marker line: ordering/filter notice, Google Maps attribution, link to the review.
function meta(r, lead) {
  let s = `<span class="gq-meta">${esc(lead)}${attribution()}`;
  if (r.url) s += ` · <a href="${esc(r.url)}" target="_blank" rel="noopener">View review</a>`;
  if (r.translated) s += " · Translated by Google";
  return s + "</span>";
}

function attribution() {
  return '<span class="GMP-attribution" translate="no">Google Maps</span>';
}

/* ---- helpers ------------------------------------------------------------------------- */

// Keep only what the pages render, with flat names.
function shape(r) {
  // Verbatim text, with runs of whitespace collapsed (reviews sometimes carry double spaces or stray newlines).
  const text = (r.text && r.text.text ? r.text.text : "").replace(/\s+/g, " ").trim();
  const translated = Boolean(r.originalText && r.text && r.originalText.languageCode !== r.text.languageCode);
  const a = r.authorAttribution;
  return {
    id: r.name,
    text,
    translated,
    rating: r.rating,
    when: r.relativePublishTimeDescription,
    publishTime: r.publishTime,
    url: r.googleMapsUri, // this review on Google Maps
    reportUrl: r.flagContentUri, // "report a problem" for this review
    // the page shows the avatar at 22px, so ask Google for a 64px image instead of 128px
    author: a ? { name: a.displayName, url: a.uri, photo: (a.photoUri || "").replace(/=s\d+-/, "=s64-") || undefined } : null,
  };
}

// Cloudflare's cache is per data center; the key is a fixed URL on our origin.
function cache() {
  return caches.default;
}
function cacheKey(requestUrl) {
  return new Request(String(new URL(`/api/reviews?v=${CACHE_VERSION}`, requestUrl)), { method: "GET" });
}

// Stable per-string number (FNV-1a), the same function assets/js/reviews.js uses for page rotation.
function fnv1a(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
