/*! Level Nexus — config.js
 *  Single source of truth for contact details plus the small helpers every
 *  other module leans on. Loaded first; everything hangs off window.LN.
 */
window.LN = window.LN || {};

window.LN.config = {
  company: 'Level Nexus',
  tagline: 'Creating Possibilities',
  whatsapp: '27847624831',
  whatsappUrl: 'https://wa.me/27847624831',
  phoneDisplay: '+27 84 762 4831',
  phoneHref: 'tel:+27847624831',
  email: 'levelnexus@outlook.com',
  region: 'KwaZulu-Natal, South Africa',
  serviceArea: 'All nine provinces',
  hours: 'Mon–Fri, 08:00–17:00 SAST',

  /** Pre-filled WhatsApp opener, URL-encoded at call time. */
  waMessage: 'Hi Level Nexus, I would like to enquire about QCTO training materials.',
};

window.LN.util = (function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  return {
    /** Does the visitor want motion kept to a minimum? */
    prefersReducedMotion: function () {
      return reduceMotion.matches;
    },

    $: function (sel, ctx) {
      return (ctx || document).querySelector(sel);
    },

    $$: function (sel, ctx) {
      return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    },

    /** Escape a string for safe insertion into innerHTML. */
    escapeHtml: function (str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /** Escape a string for use inside a RegExp. */
    escapeRegExp: function (str) {
      return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /** Trailing-edge debounce. */
    debounce: function (fn, wait) {
      var t;
      return function () {
        var ctx = this, args = arguments;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, wait || 150);
      };
    },

    /** Build a wa.me link with an optional pre-filled message. */
    waLink: function (message) {
      var cfg = window.LN.config;
      var text = message || cfg.waMessage;
      return cfg.whatsappUrl + '?text=' + encodeURIComponent(text);
    },

    /** Read and write the query string without reloading the page. */
    params: {
      get: function (key) {
        return new URLSearchParams(window.location.search).get(key);
      },
      replace: function (obj) {
        var p = new URLSearchParams();
        Object.keys(obj).forEach(function (k) {
          if (obj[k]) p.set(k, obj[k]);
        });
        var qs = p.toString();
        var url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
        window.history.replaceState(null, '', url);
      }
    }
  };
})();
