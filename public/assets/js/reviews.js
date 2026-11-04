// Live Google reviews — page side.
//
// Normally the Worker has already written the live reviews into the page's quote
// slots as it served the HTML (src/reviews.js), marking them data-reviews-live, and
// there is nothing left to do here. When it could not (its cache of the reviews was
// empty), this script fills the slots in place from GET /api/reviews, one fetch per
// page; that request also fills the cache for the next visitor. The static quote
// already in each slot is the fallback: it stays until a live review that passes
// the filter arrives, so nothing ever shows empty.
//
//   <blockquote class="hero-quote" data-reviews="hero" data-reviews-max-chars="200">
//       one review in the hero treatment (keeps the static quote inside as fallback)
//   <blockquote data-reviews="aside" data-reviews-max-chars="220">  inside .aside-quote
//       one review in the sidebar treatment
//   <ul class="reviews" data-reviews="page">
//       every review that passed, as the reviews page's own list items
//
//   data-reviews-max-chars="200"   a tighter text cap for this slot than the Worker's MAX_CHARS
//   data-reviews-index="0"         pin a single-quote slot to a position in the newest-first list
//                                  (0 = newest). Without it the slot rotates by page: each page
//                                  starts at a different review (a hash of its path), and further
//                                  rotating slots on the same page take the next ones, so no page
//                                  repeats a review and neighbouring pages differ.
//   data-reviews-max="3"           cap the count in a list slot (omit: all that passed)
//   data-reviews-notice="page"     an element that gets the ordering/filter notice for that list
//   data-reviews-rating / data-reviews-count   elements that get the live average and count
(function () {
  'use strict';

  var roots = document.querySelectorAll('[data-reviews]:not([data-reviews-live])');
  if (!roots.length || !window.fetch) return; // the Worker already filled every slot (or there are none)

  var pageHash = fnv1a(location.pathname.replace(/index\.html$/, ''));
  var rotating = 0; // how many page-rotating slots have been filled so far on this page

  fetch('/api/reviews', { credentials: 'same-origin' })
    .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
    .then(function (data) {
      Array.prototype.forEach.call(roots, function (root) { render(root, data); });
      setText('[data-reviews-rating]', data.rating != null ? data.rating.toFixed(1) : null);
      setText('[data-reviews-count]', data.ratingCount != null ? String(data.ratingCount) : null);
    })
    .catch(function () { /* the static quotes stay */ });

  function render(root, data) {
    var key = root.getAttribute('data-reviews');
    var isList = root.tagName === 'UL' || root.tagName === 'OL';
    var maxChars = parseInt(root.getAttribute('data-reviews-max-chars'), 10) || Infinity;
    var eligible = (data.reviews || []).filter(function (r) { return r.text.length <= maxChars; });

    if (isList) {
      var max = parseInt(root.getAttribute('data-reviews-max'), 10) || Infinity;
      var reviews = eligible.slice(0, max);
      if (!reviews.length) return;
      root.textContent = '';
      reviews.forEach(function (r) { root.appendChild(listItem(r)); });
      var notice = key && document.querySelector('[data-reviews-notice="' + key + '"]');
      if (notice) {
        notice.textContent = 'Showing brief five-star reviews from ';
        notice.appendChild(attribution());
        notice.appendChild(document.createTextNode(', newest first.'));
      }
    } else {
      var n = eligible.length;
      if (!n) return;
      var pinned = root.getAttribute('data-reviews-index');
      var index;
      if (pinned !== null) {
        index = parseInt(pinned, 10) || 0;
        if (index >= n) return; // nothing that far down the list yet: keep the static quote
      } else {
        var ordinal = rotating++;
        if (ordinal >= n) return; // more rotating slots than reviews: keep the static quote, never repeat one
        index = (pageHash + ordinal) % n;
      }
      fillQuote(root, eligible[index], index === 0);
    }
    root.setAttribute('data-reviews-live', '');
  }

  // Hero and sidebar: the slot is the blockquote itself.
  function fillQuote(root, r, isNewest) {
    root.textContent = '';
    if (r.url) root.setAttribute('cite', r.url);
    root.appendChild(el('p', null, '“' + r.text + '”'));
    var foot = document.createElement('footer');
    appendAuthor(foot, r);
    foot.appendChild(meta(r, isNewest ? 'Newest brief five-star review on ' : 'Recent brief five-star review on '));
    root.appendChild(foot);
  }

  // Stable per-path number (FNV-1a) so a page always starts at the same review.
  function fnv1a(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  // Reviews page: same markup as the page's own list items.
  function listItem(r) {
    var li = document.createElement('li');
    var m = el('div', 'review-meta');
    var name = el('span', 'name');
    appendAuthor(name, r);
    m.appendChild(name);
    if (r.when) {
      var t = document.createElement('time');
      if (r.publishTime) t.dateTime = r.publishTime;
      t.textContent = r.when;
      m.appendChild(t);
    }
    li.appendChild(m);
    var stars = el('span', 'stars', '★★★★★');
    stars.setAttribute('aria-label', r.rating + ' out of 5 stars');
    li.appendChild(stars);
    li.appendChild(el('p', null, r.text));
    var row = el('p', 'gq-meta-row');
    row.appendChild(meta(r, 'Five-star review on '));
    li.appendChild(row);
    return li;
  }

  // Author attribution: avatar, name, profile link (Google requires all three where space allows).
  function appendAuthor(parent, r) {
    if (!r.author) return;
    if (r.author.photo) {
      var img = document.createElement('img');
      img.className = 'gq-avatar';
      img.src = r.author.photo;
      img.alt = '';
      img.width = 22;
      img.height = 22;
      img.referrerPolicy = 'no-referrer';
      img.onerror = function () { img.remove(); }; // no blank gap if Google's image host is slow or blocked
      parent.appendChild(img);
    }
    var shown = shortName(r.author.name || '');
    parent.appendChild(r.author.url ? link(r.author.url, shown, 'gq-name') : el('span', 'gq-name', shown));
  }

  // "Michelle Laughlin" -> "Michelle L."; a one-word name stays as it is. The avatar and the
  // profile link still credit the full author, as Google's display rules ask.
  function shortName(name) {
    var parts = name.replace(/\s+/g, ' ').trim().split(' ');
    if (parts.length < 2) return cap(name.trim());
    var last = parts[parts.length - 1];
    var first = parts.slice(0, -1).map(cap).join(' ');
    return /^[A-Za-z\u00C0-\u024F]/.test(last) ? first + ' ' + last.charAt(0).toUpperCase() + '.' : first;
  }
  function cap(word) { return word.charAt(0).toUpperCase() + word.slice(1); }

  // The marker line: ordering/filter notice, Google Maps attribution, link to the review.
  function meta(r, lead) {
    var s = el('span', 'gq-meta', lead);
    s.appendChild(attribution());
    if (r.url) {
      s.appendChild(document.createTextNode(' · '));
      s.appendChild(link(r.url, 'View review'));
    }
    if (r.translated) s.appendChild(document.createTextNode(' · Translated by Google'));
    return s;
  }

  function attribution() {
    var g = el('span', 'GMP-attribution', 'Google Maps');
    g.setAttribute('translate', 'no');
    return g;
  }

  function setText(selector, text) {
    if (text == null) return;
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (n) { n.textContent = text; });
  }

  function link(href, text, className) {
    var a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.target = '_blank';
    a.rel = 'noopener';
    if (className) a.className = className;
    return a;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
})();
