/*! Level Nexus — main.js
 *  Entry point. Every module is optional: each one bails out quietly if its
 *  markup is not on the current page, so all pages load the same bundle.
 */
(function () {
  'use strict';

  function boot() {
    var LN = window.LN || {};
    ['nav', 'ui', 'heroRegister', 'register', 'forms', 'tabs'].forEach(function (name) {
      var mod = LN[name];
      if (!mod || typeof mod.init !== 'function') return;
      try {
        mod.init();
      } catch (err) {
        // One broken module must never take the rest of the page down.
        if (window.console && console.error) {
          console.error('[Level Nexus] ' + name + ' failed to start:', err);
        }
      }
    });

    document.documentElement.classList.add('js-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
