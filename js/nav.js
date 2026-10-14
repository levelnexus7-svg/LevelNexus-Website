/*! Level Nexus — nav.js
 *  Desktop: hover/focus dropdowns (pure CSS) with Esc-to-dismiss.
 *  Mobile (<= 980px): slide-out panel with drill-down sub-menus, scrim,
 *  focus trap, and Close Panel. Also marks the current page.
 */
window.LN = window.LN || {};

window.LN.nav = (function () {
  'use strict';

  var u = window.LN.util;
  var header, nav, toggle, scrim, lastFocused;
  var mq = window.matchMedia('(max-width: 980px)');

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function isOpen() { return nav && nav.classList.contains('open'); }

  function resetDrill() {
    nav.classList.remove('drilled');
    u.$$('.has-dd', nav).forEach(function (li) {
      li.classList.remove('open');
      var a = li.querySelector('.dd-parent');
      if (a) a.setAttribute('aria-expanded', 'false');
    });
  }

  function open() {
    nav.classList.add('open');
    if (scrim) scrim.classList.add('on');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.documentElement.classList.add('nav-lock');
    document.body.classList.add('is-locked');
    lastFocused = document.activeElement;
    var first = nav.querySelector('.panel-title') || nav.querySelector(FOCUSABLE);
    if (first) first.focus();
  }

  function close(returnFocus) {
    nav.classList.remove('open');
    if (scrim) scrim.classList.remove('on');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.documentElement.classList.remove('nav-lock');
    document.body.classList.remove('is-locked');
    window.setTimeout(resetDrill, 300);
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

  /** Mark the top-level link matching the current file. */
  function markCurrent() {
    var file = window.location.pathname.split('/').pop() || 'index.html';
    u.$$('[data-nav]').forEach(function (link) {
      var target = link.getAttribute('href').split('/').pop().split('#')[0].split('?')[0];
      if (target === file) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function initScrollState() {
    if (!header) return;
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initDrill() {
    u.$$('.has-dd', nav).forEach(function (li) {
      var parent = li.querySelector('.dd-parent');
      var back = li.querySelector('.dd-back');
      if (!parent) return;

      parent.addEventListener('click', function (e) {
        if (!mq.matches) return;             // desktop: the link just navigates
        e.preventDefault();
        li.classList.add('open');
        nav.classList.add('drilled');
        parent.setAttribute('aria-expanded', 'true');
        nav.scrollTop = 0;
        var firstLink = li.querySelector('.dd a');
        if (firstLink) firstLink.focus();
      });

      if (back) {
        back.addEventListener('click', function (e) {
          e.preventDefault();
          li.classList.remove('open');
          nav.classList.remove('drilled');
          parent.setAttribute('aria-expanded', 'false');
          parent.focus();
        });
      }

      // Desktop Esc: hide the open dropdown until the pointer/focus leaves.
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !mq.matches) {
          li.classList.add('dismiss');
          parent.focus();
        }
      });
      ['mouseleave', 'focusout'].forEach(function (ev) {
        li.addEventListener(ev, function () { li.classList.remove('dismiss'); });
      });
    });
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

    var closeBtn = u.$('.panel-close', nav);
    if (closeBtn) closeBtn.addEventListener('click', function () { close(true); });

    initDrill();

    // Any real link tap inside the panel dismisses it.
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || e.defaultPrevented) return;
      if (a.classList.contains('dd-back')) return;
      close(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close(true);
      trapFocus(e);
    });

    mq.addEventListener('change', function (e) {
      if (!e.matches) { if (isOpen()) close(false); resetDrill(); }
    });
  }

  return { init: init };
})();
