// Neptune site motion. Plain JS, no dependencies.
// Every effect here is IntersectionObserver or pointer driven; there is no
// scroll listener. Under prefers-reduced-motion everything is shown at rest.
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function () {
    var header = $('#siteHeader');
    var heroPhone = $('.hero .phone-wrap');

    // ---------------------------------------------------- reduced motion --
    if (reduce || !canObserve) {
      $$('.reveal').forEach(function (el) { el.classList.add('in'); });
      $$('.phone-wrap').forEach(function (el) { el.classList.add('is-active'); });
      $$('.story-copy').forEach(function (el) { el.classList.add('is-active'); });
      if (header) header.dataset.scrolled = 'true';
      return;
    }

    // -------------------------------------------- header glass on scroll --
    // A 1px sentinel at the top of the page: once it leaves, the header
    // picks up its glass background.
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      header.dataset.scrolled = entries[0].isIntersecting ? 'false' : 'true';
    }).observe(sentinel);

    // ---------------------------------------------- active nav section --
    var navLinks = $$('.nav a[href^="#"]');
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + entry.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (target) sectionIO.observe(target);
    });

    // ------------------------------------------------- hero screen data --
    // Let the phone land first, then draw the score ring and bars.
    setTimeout(function () { if (heroPhone) heroPhone.classList.add('is-active'); }, 1100);

    // ---------------------------------------------------- scroll reveals --
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('in');
        if (el.classList.contains('phone-wrap')) {
          setTimeout(function () { el.classList.add('is-active'); }, 350);
        }
        revealIO.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    $$('.reveal').forEach(function (el) { revealIO.observe(el); });

    // ------------------------------------------------------ count-up stats --
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var to = Number(el.dataset.count);
        var start = null;
        var dur = 1600;
        var step = function (t) {
          if (start === null) start = t;
          var p = Math.min((t - start) / dur, 1);
          el.textContent = fmt(to * (1 - Math.pow(1 - p, 4)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        countIO.unobserve(el);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) {
      el.textContent = '0';
      countIO.observe(el);
    });

    // --------------------------------------------- walkthrough story mode --
    // The step nearest the middle of the viewport is active: its copy goes
    // full opacity and its phone shows in the sticky slot.
    var story = $('#story');
    var copies = $$('.story-copy');
    var phones = $$('.story-phone');
    var setStep = function (i) {
      copies.forEach(function (c, k) { c.classList.toggle('is-active', k === i); });
      phones.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
      if (story) story.style.setProperty('--progress', ((i + 1) / copies.length).toFixed(3));
    };
    // Re-measure every step on each callback rather than trusting the one
    // entry that fired: a long jump (anchor link, scrollbar drag) can skip
    // past steps without each of them reporting.
    var storyIO = new IntersectionObserver(function () {
      var mid = window.innerHeight / 2;
      var best = 0;
      var bestDist = Infinity;
      copies.forEach(function (c, k) {
        var r = c.getBoundingClientRect();
        var dist = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (dist < bestDist) { bestDist = dist; best = k; }
      });
      setStep(best);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 1] });
    copies.forEach(function (c) { storyIO.observe(c); });
    setStep(0);

    // ------------------------------------------------ hero device tilt --
    // Fine pointers only; touch devices keep the phone flat.
    var tilt = $('#heroTilt');
    var hero = $('.hero');
    if (tilt && hero && window.matchMedia('(pointer: fine)').matches) {
      var frame = null;
      hero.addEventListener('pointermove', function (e) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = null;
          var r = hero.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          tilt.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
          tilt.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
        });
      });
      hero.addEventListener('pointerleave', function () {
        tilt.style.setProperty('--ry', '0deg');
        tilt.style.setProperty('--rx', '0deg');
      });
    }

    // ------------------------------------------------- bento spotlight --
    var bento = $('#bento');
    if (bento) {
      bento.addEventListener('pointermove', function (e) {
        var tile = e.target.closest('.tile');
        if (!tile) return;
        var r = tile.getBoundingClientRect();
        tile.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        tile.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    }
  });
})();
