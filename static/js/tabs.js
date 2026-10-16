/*! Level Nexus: tabs.js
 *  Accessible role tabs on the Platform page. Without JavaScript every panel
 *  is shown in full (see site.css), so nothing is hidden from crawlers or
 *  from visitors with scripts blocked.
 */
window.LN = window.LN || {};

window.LN.tabs = (function () {
  'use strict';

  var u = window.LN.util;

  function init() {
    u.$$('[data-tabs]').forEach(function (root) {
      var tabs = u.$$('[role="tab"]', root);
      var panels = u.$$('[role="tabpanel"]', root);
      if (!tabs.length) return;

      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p) { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
        if (focus) tab.focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(tab, false); });
        tab.addEventListener('keydown', function (e) {
          var n = null;
          if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
          else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === 'Home') n = tabs[0];
          else if (e.key === 'End') n = tabs[tabs.length - 1];
          if (n) { e.preventDefault(); select(n, true); }
        });
      });

      var first = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
      select(first, false);
    });
  }

  return { init: init };
})();
