// Live Google reviews — page side.
//
// Fills the site's existing quote slots in place with live reviews from
// GET /api/reviews (see src/reviews.js in the Worker), one fetch per page.
// The static quote already in each slot is the fallback: it stays until a
// live review that passes the filter arrives, so nothing ever shows empty.
//
//   <blockquote class="hero-quote" data-reviews="hero" data-reviews-max-chars="200">
//       one review in the hero treatment (keeps the static quote inside as fallback)
//   <blockquote data-reviews="aside" data-reviews-max-chars="220">  inside .aside-quote
//       one review in the sidebar treatment
//   <ul class="reviews" data-reviews="page">
//       every review that passed, as the reviews page's own list items
//
//   data-reviews-max-chars="200"   a tighter text cap for this slot than the Worker's MAX_CHARS
//   data-reviews-index="1"         for a single-quote slot: show the 2nd newest instead of the newest
//   data-reviews-max="3"           cap the count in a list slot (omit: all that passed)
//   data-reviews-notice="page"     an element that gets the ordering/filter notice for that list
//   data-reviews-rating / data-reviews-count   elements that get the live average and count
(function () {
  'use strict';

  var roots = document.querySelectorAll('[data-reviews]');
  if (!roots.length || !window.fetch) return;

  fetch('/api/reviews', { headers: { Accept: 'application/json' } })
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
      var index = parseInt(root.getAttribute('data-reviews-index'), 10) || 0;
      if (!eligible[index]) return;
      fillQuote(root, eligible[index], index);
    }
    root.setAttribute('data-reviews-live', '');
  }

  // Hero and sidebar: the slot is the blockquote itself.
  function fillQuote(root, r, index) {
    root.textContent = '';
    if (r.url) root.setAttribute('cite', r.url);
    root.appendChild(el('p', null, '“' + r.text + '”'));
    var foot = document.createElement('footer');
    appendAuthor(foot, r);
    foot.appendChild(meta(r, index ? 'Recent brief five-star review on ' : 'Newest brief five-star review on '));
    root.appendChild(foot);
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
      img.loading = 'lazy';
      parent.appendChild(img);
    }
    parent.appendChild(r.author.url ? link(r.author.url, r.author.name || '', 'gq-name') : el('span', 'gq-name', r.author.name || ''));
  }

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
