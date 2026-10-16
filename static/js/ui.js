/*! Level Nexus — ui.js
 *  Small shared behaviours: scroll reveal, FAQ disclosure, footer year,
 *  and filling WhatsApp links from config so the number lives in one place.
 */
window.LN = window.LN || {};

window.LN.ui = (function () {
  'use strict';

  var u = window.LN.util;

  /** Fade sections in as they arrive. CSS only hides .rv when html.js-motion is set. */
  function initReveal() {
    var items = u.$$('.rv');
    if (!items.length) return;

    if (!document.documentElement.classList.contains('js-motion') || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    items.forEach(function (el, i) {
      el.style.setProperty('--d', Math.min(i % 4, 3) * 70 + 'ms');
      io.observe(el);
    });
  }

  /** Scroll progress bar, back-to-top, mobile action bar. */
  function initFloating() {
    var top = u.$('.totop');
    var stick = u.$('.stickbar');
    if (!top && !stick) return;

    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      if (top) top.classList.toggle('on', y > 600);
      if (stick) stick.classList.toggle('on', y > 420);
    }

    // The action bar repeats what the footer already offers, so it steps
    // aside while the footer is on screen instead of covering it.
    var foot = u.$('footer');
    if (stick && foot && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        stick.classList.toggle('over-footer', entries[0].isIntersecting);
      }).observe(foot);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();

    if (top) {
      top.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: u.prefersReducedMotion() ? 'auto' : 'smooth' });
      });
    }
  }

  /** Progressive-enhancement accordion — answers stay readable without JS. */
  function initFaq() {
    var items = u.$$('.faq__item');
    if (!items.length) return;

    items.forEach(function (item, i) {
      var btn = item.querySelector('.faq__q');
      var panel = item.querySelector('.faq__a');
      if (!btn || !panel) return;

      var id = panel.id || 'faq-panel-' + (i + 1);
      panel.id = id;
      btn.setAttribute('aria-controls', id);
      btn.setAttribute('aria-expanded', 'false');
      panel.classList.remove('is-open');

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('is-open', !open);
      });
    });
  }

  /** Long lists on phones: show the first few rows, the rest behind a toggle.
   *  Opt in with data-collapse="<rows to keep>". Everything stays in the page,
   *  and CSS only collapses it at phone widths, so desktop and no-JS are unchanged. */
  function initCollapse() {
    u.$$('[data-collapse]').forEach(function (list, n) {
      var items = Array.prototype.slice.call(list.children);
      var keep = parseInt(list.getAttribute('data-collapse'), 10) || 3;
      if (items.length <= keep + 1) return;

      var hidden = items.length - keep;
      items.forEach(function (el, i) { if (i >= keep) el.classList.add('c-extra'); });
      list.id = list.id || 'collapse-' + (n + 1);
      list.classList.add('is-collapsed');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'more-btn';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', list.id);
      btn.textContent = 'Show ' + hidden + ' more';
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        list.classList.toggle('is-collapsed', open);
        btn.textContent = open ? 'Show ' + hidden + ' more' : 'Show fewer';
      });
      list.insertAdjacentElement('afterend', btn);
    });
  }

  /** Any [data-wa] element becomes a WhatsApp link built from config. */
  function initWhatsApp() {
    u.$$('[data-wa]').forEach(function (link) {
      var custom = link.getAttribute('data-wa');
      link.href = u.waLink(custom || undefined);
      link.rel = 'noopener';
      link.target = '_blank';
    });
  }

  function initYear() {
    u.$$('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /** Print the live record count anywhere it is quoted in copy. */
  function initCounts() {
    if (!window.LN.data) return;
    var meta = window.LN.data.meta;

    u.$$('[data-count="materials"]').forEach(function (el) {
      el.textContent = meta.total;
    });
    u.$$('[data-count="sectors"]').forEach(function (el) {
      el.textContent = meta.sectorCount;
    });
    u.$$('[data-count="qcto"]').forEach(function (el) {
      var t = meta.types.filter(function (x) { return x.key === 'QCTO'; })[0];
      el.textContent = t ? t.count : '';
    });
    u.$$('[data-count="sp"]').forEach(function (el) {
      var t = meta.types.filter(function (x) { return x.key === 'SP'; })[0];
      el.textContent = t ? t.count : '';
    });
    countUp();
  }

  /** Count the big stat numerals up once, when they scroll into view. */
  function countUp() {
    var els = u.$$('[data-countup]');
    if (!els.length) return;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !('IntersectionObserver' in window)) return;
    function run(el) {
      var end = parseInt(el.textContent, 10);
      if (!end) return;
      var t0 = null, dur = 1100;
      function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step); else el.textContent = end;
      }
      el.textContent = '0';
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  function init() {
    initWhatsApp();
    initYear();
    initCounts();
    initReveal();
    initFloating();
    initFaq();
    initCollapse();
  }

  return { init: init };
})();
