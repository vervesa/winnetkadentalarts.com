/* Live Google reviews — GET /api/reviews
 *
 * The pages never talk to Google. assets/js/reviews.js asks this route for the
 * practice's reviews; the route asks Places API (New) Place Details, keeps the
 * reviews that pass the rules below, and answers with a small JSON document.
 * The API key stays here (secret `PlacesAPI` on the Worker), and Google sees
 * one request per Cloudflare data center per CACHE_SECONDS instead of one per
 * visitor.
 *
 * Google's terms allow storing the place ID indefinitely but not review text
 * (beyond this short cache), so nothing here is written into the static pages.
 */

const PLACE_ID = "ChIJRZU3OvfED4gRt8GRSdCafGQ"; // Winnetka Dental Arts (ChIJ… place ID, not the cid= number)

const STARS = 5;                     // only reviews with exactly this rating
const MIN_CHARS = 80;                // review text at least this long…
const MAX_CHARS = 400;               // …and at most this long (after trimming); pages cap further per slot
const CACHE_SECONDS = 6 * 60 * 60;   // reuse one Google answer for this long

const FIELD_MASK = "rating,userRatingCount,googleMapsUri,reviews";

export async function handleReviews(request, env, ctx) {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  }

  // Cloudflare's cache is per data center; the key is a fixed URL on our origin.
  const cache = caches.default;
  const cacheKey = new Request(String(new URL("/api/reviews", request.url)), { method: "GET" });
  const cached = await cache.match(cacheKey);
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
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

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
    author: a ? { name: a.displayName, url: a.uri, photo: a.photoUri } : null,
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
