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

  /* 3. Services slider: arrows, progress line and counter on top of a native scroll-snap track */
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Array.prototype.forEach.call(document.querySelectorAll("[data-slider]"), function (slider) {
    var track = slider.querySelector(".slider-track");
    var prev = slider.querySelector('[data-dir="-1"]');
    var next = slider.querySelector('[data-dir="1"]');
    var thumb = slider.querySelector(".slider-thumb");
    var count = slider.querySelector(".slider-count .cur");
    if (!track || !prev || !next) return;
    var slides = track.children;
    var total = slides.length;

    function gap() { return parseFloat(getComputedStyle(track).columnGap) || 0; }
    function step() {
      var first = slides[0];
      if (!first) return track.clientWidth;
      return first.getBoundingClientRect().width + gap();
    }
    // the last visible slide needs no trailing gap, so count the gap once more than the slides
    function perView() { return Math.max(1, Math.floor((track.clientWidth + gap() + 1) / step())); }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var x = track.scrollLeft;
      var first = Math.min(total, Math.ceil(x / step() - 0.02) + 1);
      var last = Math.min(total, first + perView() - 1);
      if (count) count.textContent = first === last ? String(first) : first + "–" + last;
      if (thumb) {
        var w = Math.max(track.clientWidth / track.scrollWidth, 0.1);
        thumb.style.width = (w * 100) + "%";
        thumb.style.left = (max > 0 ? (x / max) * (1 - w) * 100 : 0) + "%";
      }
      prev.disabled = x <= 2;
      next.disabled = x >= max - 2;
    }
    function go(dir) {
      track.scrollBy({ left: dir * step() * perView(), behavior: reducedMotion ? "auto" : "smooth" });
    }
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

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
