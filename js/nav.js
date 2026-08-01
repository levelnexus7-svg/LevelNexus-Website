/*! Level Nexus — nav.js
 *  Sticky header state, mobile drawer with focus trapping, and marking the
 *  current page in both navs.
 */
window.LN = window.LN || {};

window.LN.nav = (function () {
  'use strict';

  var u = window.LN.util;
  var header, toggle, drawer, lastFocused;

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function isOpen() {
    return drawer && drawer.classList.contains('is-open');
  }

  function open() {
    drawer.classList.add('is-open');
    drawer.removeAttribute('inert');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('is-locked');
    lastFocused = document.activeElement;

    var first = drawer.querySelector(FOCUSABLE);
    if (first) first.focus();
  }

  function close(returnFocus) {
    drawer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('is-locked');

    // Keep the hidden drawer out of the tab order.
    window.setTimeout(function () {
      if (!isOpen()) drawer.setAttribute('inert', '');
    }, 240);

    if (returnFocus && lastFocused) lastFocused.focus();
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || !isOpen()) return;

    var items = u.$$(FOCUSABLE, drawer).filter(function (el) {
      return el.offsetParent !== null;
    });
    if (!items.length) return;

    var first = items[0];
    var last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /** Mark the link matching the current file as the current page. */
  function markCurrent() {
    var file = window.location.pathname.split('/').pop() || 'index.html';

    u.$$('[data-nav]').forEach(function (link) {
      var target = link.getAttribute('href').split('/').pop().split('#')[0].split('?')[0];
      if (target === file) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function initSticky() {
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function init() {
    header = u.$('.site-header');
    toggle = u.$('.nav-toggle');
    drawer = u.$('#mobile-nav');

    markCurrent();
    initSticky();

    if (!toggle || !drawer) return;

    drawer.setAttribute('inert', '');

    toggle.addEventListener('click', function () {
      isOpen() ? close(true) : open();
    });

    // Any link tap inside the drawer dismisses it.
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) close(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close(true);
      trapFocus(e);
    });

    // Never leave the drawer open when the layout switches to desktop.
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) {
      if (e.matches && isOpen()) close(false);
    });
  }

  return { init: init };
})();
