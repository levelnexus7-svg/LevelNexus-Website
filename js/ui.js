/*! Level Nexus — ui.js
 *  Small shared behaviours: scroll reveal, FAQ disclosure, footer year,
 *  and filling WhatsApp links from config so the number lives in one place.
 */
window.LN = window.LN || {};

window.LN.ui = (function () {
  'use strict';

  var u = window.LN.util;

  /** Fade sections in as they arrive. Skipped entirely for reduced motion. */
  function initReveal() {
    var items = u.$$('.reveal');
    if (!items.length) return;

    if (u.prefersReducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    items.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
      io.observe(el);
    });
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
  }

  /** Sector shortcuts that deep-link into the register. */
  function initSectorCloud() {
    var cloud = u.$('#sector-cloud');
    if (!cloud || !window.LN.data) return;

    cloud.innerHTML = window.LN.data.meta.sectors.map(function (s) {
      return '<li><a href="materials.html?sector=' + encodeURIComponent(s.name) +
             '" style="--sector:' + s.color + '">' +
             u.escapeHtml(s.name) + ' <b>' + s.count + '</b></a></li>';
    }).join('');
  }

  function init() {
    initWhatsApp();
    initYear();
    initCounts();
    initSectorCloud();
    initReveal();
    initFaq();
  }

  return { init: init };
})();
