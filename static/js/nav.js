/*! Level Nexus — nav.js
 *  Desktop: plain links, no dropdowns.
 *  Mobile (<= 980px): slide-out panel with scrim and focus trap. Also marks the current page.
 */
window.LN = window.LN || {};

window.LN.nav = (function () {
  'use strict';

  var u = window.LN.util;
  var header, nav, toggle, scrim, lastFocused;
  var mq = window.matchMedia('(max-width: 980px)');

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function isOpen() { return nav && nav.classList.contains('open'); }

  function open() {
    nav.classList.add('open');
    if (scrim) scrim.classList.add('on');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.documentElement.classList.add('nav-lock');
    document.body.classList.add('is-locked');
    lastFocused = document.activeElement;
    var first = nav.querySelector('.panel-x') || nav.querySelector(FOCUSABLE);
    if (first) first.focus();
  }

  function close(returnFocus) {
    nav.classList.remove('open');
    if (scrim) scrim.classList.remove('on');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.documentElement.classList.remove('nav-lock');
    document.body.classList.remove('is-locked');
    if (returnFocus && lastFocused) lastFocused.focus();
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || !isOpen()) return;
    var items = u.$$(FOCUSABLE, nav).filter(function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /** Mark the top-level link whose section matches the current path. */
  function markCurrent() {
    var seg = '/' + (window.location.pathname.split('/')[1] || '');
    u.$$('[data-nav]').forEach(function (link) {
      var target = '/' + (link.getAttribute('href').split('/')[1] || '');
      if (target === seg) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function initScrollState() {
    if (!header) return;
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function init() {
    header = u.$('.site-header');
    nav = u.$('#site-nav');
    toggle = u.$('.menu-toggle');
    scrim = u.$('.scrim');

    markCurrent();
    initScrollState();
    if (!nav || !toggle) return;

    toggle.addEventListener('click', function () { isOpen() ? close(true) : open(); });
    if (scrim) scrim.addEventListener('click', function () { close(true); });

    var closeBtn = u.$('.panel-x', nav);
    if (closeBtn) closeBtn.addEventListener('click', function () { close(true); });

    // Any real link tap inside the panel dismisses it.
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || e.defaultPrevented) return;
      close(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close(true);
      trapFocus(e);
    });

    mq.addEventListener('change', function (e) {
      if (!e.matches) { if (isOpen()) close(false); }
    });
  }

  return { init: init };
})();
