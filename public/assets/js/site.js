/* Winnetka Dental Arts — minimal site script
   1. Mobile menu + dropdown toggles (keyboard and touch friendly)
   2. Click-to-load YouTube embeds (keeps pages light until a video is wanted)
   3. Services slider controls (the track itself is native scroll-snap) */
(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
    });
  }

  var subs = document.querySelectorAll(".has-sub");
  Array.prototype.forEach.call(subs, function (li) {
    var btn = li.querySelector(".sub-toggle");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var open = li.getAttribute("data-open") === "true";
      Array.prototype.forEach.call(subs, function (other) {
        if (other !== li) {
          other.setAttribute("data-open", "false");
          var ob = other.querySelector(".sub-toggle");
          if (ob) ob.setAttribute("aria-expanded", "false");
        }
      });
      li.setAttribute("data-open", open ? "false" : "true");
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest(".has-sub")) return;
    Array.prototype.forEach.call(subs, function (li) {
      li.setAttribute("data-open", "false");
      var b = li.querySelector(".sub-toggle");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    Array.prototype.forEach.call(subs, function (li) { li.setAttribute("data-open", "false"); });
    if (nav && nav.getAttribute("data-open") === "true") {
      nav.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });

  /* 3. Services carousel. The track is a native horizontal scroller (swipes and arrow keys work
        without JS). site.js turns it into a slow, continuous loop: the seven cards are cloned once,
        the track creeps along at CAROUSEL_SPEED px/s, and every time it has moved one full set it
        is rewound by that same distance, which looks identical, so the loop never visibly restarts.
        It pauses while hovered, focused or touched and for a few seconds after a wheel or trackpad
        scroll, stands still while the tab is hidden or the carousel is off screen, and for visitors
        who prefer reduced motion it stays a plain snapping slider with arrows. */
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CAROUSEL_SPEED = 28; // pixels per second: one card every ~11 s, all seven in about 80 s
  Array.prototype.forEach.call(document.querySelectorAll("[data-slider]"), function (slider) {
    var track = slider.querySelector(".slider-track");
    var prev = slider.querySelector('[data-dir="-1"]');
    var next = slider.querySelector('[data-dir="1"]');
    var thumb = slider.querySelector(".slider-thumb");
    var count = slider.querySelector(".slider-count .cur");
    if (!track || !prev || !next) return;
    var total = track.children.length;
    var loop = !reducedMotion && total > 1;

    if (loop) {
      // One extra copy of every card, hidden from assistive tech and the tab order.
      for (var i = 0; i < total; i++) {
        var clone = track.children[i].cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        Array.prototype.forEach.call(clone.querySelectorAll("a, button"), function (el) { el.setAttribute("tabindex", "-1"); });
        track.appendChild(clone);
      }
      slider.classList.add("is-looping");
    }

    function gap() { return parseFloat(getComputedStyle(track).columnGap) || 0; }
    function step() {
      var first = track.children[0];
      return first ? first.getBoundingClientRect().width + gap() : track.clientWidth;
    }
    function loopWidth() { return step() * total; }
    // the last visible slide needs no trailing gap, so count the gap once more than the slides
    function perView() { return Math.max(1, Math.floor((track.clientWidth + gap() + 1) / step())); }

    function update() {
      var x = track.scrollLeft;
      var s = step();
      var view = perView();
      if (loop) {
        var pos = ((x % loopWidth()) + loopWidth()) % loopWidth();
        var first = Math.floor(pos / s + 0.02) % total;
        if (count) count.textContent = String(first + 1); // the leading card; the loop has no fixed "last"
        if (thumb) {
          var w = Math.min(1, view / total);
          thumb.style.width = (w * 100) + "%";
          thumb.style.left = ((pos / loopWidth()) * (1 - w) * 100) + "%";
        }
      } else {
        var max = track.scrollWidth - track.clientWidth;
        var f = Math.min(total, Math.ceil(x / s - 0.02) + 1);
        var l = Math.min(total, f + view - 1);
        if (count) count.textContent = f === l ? String(f) : f + "–" + l;
        if (thumb) {
          var tw = Math.max(track.clientWidth / track.scrollWidth, 0.1);
          thumb.style.width = (tw * 100) + "%";
          thumb.style.left = (max > 0 ? (x / max) * (1 - tw) * 100 : 0) + "%";
        }
        prev.disabled = x <= 2;
        next.disabled = x >= max - 2;
      }
    }

    // Arrows: one screenful at a time. In the loop the track is first rewound or advanced by a
    // whole set when needed, which is invisible, so there is always room to move either way.
    var holdUntil = 0;
    function go(dir) {
      var page = step() * perView();
      if (loop) {
        var lw = loopWidth();
        if (dir < 0 && track.scrollLeft < page) track.scrollLeft += lw;
        if (dir > 0 && track.scrollLeft + page > track.scrollWidth - track.clientWidth) track.scrollLeft -= lw;
        holdUntil = performance.now() + 2500;
      }
      track.scrollBy({ left: dir * page, behavior: reducedMotion ? "auto" : "smooth" });
    }
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    if (!loop) return;

    // scrollLeft only holds whole pixels, so the exact position is kept here and written out
    // rounded; if the track has moved on its own since the last write, the visitor scrolled it,
    // and the exact position follows them.
    var held = false, onScreen = true, last = 0, raf = 0, pos = 0, written = 0;
    function frame(now) {
      raf = 0;
      if (!onScreen || document.hidden) return;
      var dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      if (!held && now > holdUntil) {
        if (Math.abs(track.scrollLeft - written) > 1) pos = track.scrollLeft;
        pos += CAROUSEL_SPEED * dt / 1000;
        var lw = loopWidth();
        if (pos >= lw) pos -= lw;
        written = Math.round(pos);
        track.scrollLeft = written;
      }
      raf = requestAnimationFrame(frame);
    }
    function run() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function hold() { held = true; }
    function release() { held = false; run(); }
    slider.addEventListener("pointerenter", hold);
    slider.addEventListener("pointerleave", release);
    slider.addEventListener("focusin", hold);
    slider.addEventListener("focusout", release);
    slider.addEventListener("touchstart", hold, { passive: true });
    slider.addEventListener("touchend", function () { holdUntil = performance.now() + 2500; release(); }, { passive: true });
    track.addEventListener("wheel", function () { holdUntil = performance.now() + 3000; }, { passive: true });
    track.addEventListener("keydown", function () { holdUntil = performance.now() + 3000; });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) run(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) run();
      }, { threshold: 0.2 }).observe(slider);
    }
    run();
  });

  /* 4. Appointment request forms: one submission per click, and the Cloudflare Turnstile check.
        TURNSTILE_SITE_KEY comes from the Cloudflare dashboard (Turnstile -> the widget for
        winnetkadentalarts.com). Until it is set, the forms work without the check. The matching
        secret key lives on the Worker as the TURNSTILE_SECRET secret. */
  var TURNSTILE_SITE_KEY = "";
  var forms = document.querySelectorAll('form[action="/api/appointment-request"]');
  Array.prototype.forEach.call(forms, function (form) {
    var button = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", function (event) {
      if (form.getAttribute("data-submitting")) { event.preventDefault(); return; }
      form.setAttribute("data-submitting", "1");
      if (button) { button.disabled = true; button.textContent = "Sending\u2026"; }
    });
    // Back button to a page restored from the cache: let them submit again.
    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) return;
      form.removeAttribute("data-submitting");
      if (button) { button.disabled = false; button.textContent = "Submit"; }
    });
  });
  if (TURNSTILE_SITE_KEY && forms.length) {
    window.__wdaTurnstile = function () {
      Array.prototype.forEach.call(forms, function (form) {
        var slot = form.querySelector("[data-turnstile]");
        if (!slot || !window.turnstile) return;
        window.turnstile.render(slot, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: form.closest(".on-dark") ? "dark" : "light",
          "error-callback": function () { slot.setAttribute("data-turnstile-error", ""); }
        });
      });
    };
    var ts = document.createElement("script");
    ts.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__wdaTurnstile&render=explicit";
    ts.async = true;
    ts.defer = true;
    document.head.appendChild(ts);
  }

  var videos = document.querySelectorAll(".video[data-video]");
  Array.prototype.forEach.call(videos, function (box) {
    var btn = box.querySelector("button");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var id = box.getAttribute("data-video");
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      iframe.title = btn.getAttribute("aria-label") || "Video";
      iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      iframe.setAttribute("allowfullscreen", "");
      box.innerHTML = "";
      box.appendChild(iframe);
    });
  });
})();
