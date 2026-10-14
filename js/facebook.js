/*! Level Nexus — facebook.js
 *  Drives the "Latest offer" block: loads the official Facebook Page Plugin,
 *  which always shows the most recent posts on the page, and keeps a branded
 *  card on screen until that plugin actually paints.
 *
 *  The plugin is a third-party iframe, so it will not render:
 *    - when the page is opened straight off disk (file://), or
 *    - when the network blocks connect.facebook.net, or
 *    - if the Facebook Page is not public.
 *  In any of those cases the branded card simply stays put.
 *
 *  WANT TO PIN A SPECIFIC OFFER INSTEAD? Fill in the `offer` object below.
 *  Anything left blank falls back to the generic card.
 */
window.LN = window.LN || {};

(function () {
  'use strict';

  var u = window.LN.util;

  var PAGE = 'https://www.facebook.com/profile.php?id=61581938459125';

  /* ---- edit these fields to show one specific offer in the branded card ---- */
  var offer = {
    title: '',        // e.g. '20% off any Skills Programme set'
    body: '',         // the offer copy
    date: '',         // e.g. 'Posted 14 October 2026'
    image: '',        // e.g. 'assets/img/photos/ph-material-dispatch.jpg'
    link: PAGE        // the post URL, if you want the button to go straight to it
  };
  /* -------------------------------------------------------------------------- */

  function fill(el, o) {
    if (!el) return;

    var kicker = el.querySelector('[data-fb="kicker"]');
    var text = el.querySelector('[data-fb="text"]');
    var date = el.querySelector('[data-fb="date"]');
    var image = el.querySelector('[data-fb="image"]');
    var cta = el.querySelector('[data-fb="cta"]');

    if (o.title && kicker) kicker.textContent = o.title;
    if (o.body && text) text.textContent = o.body;
    if (o.date && date) { date.textContent = o.date; date.hidden = false; }
    if (o.image && image) { image.src = o.image; image.hidden = false; }
    if (o.link && cta) cta.href = o.link;
  }

  /* Facebook caps the Page Plugin at 500px wide and 180px minimum. Give it an
     explicit width from the column it sits in rather than letting it guess,
     which is what produces an oversized embed on phones. */
  function sizePlugin(wrap) {
    var page = wrap.querySelector('.fb-page');
    if (!page) return;

    var column = Math.round(wrap.clientWidth || wrap.getBoundingClientRect().width);
    if (!column) column = Math.min(500, document.documentElement.clientWidth - 48);

    page.setAttribute('data-width', String(Math.max(180, Math.min(500, column))));
    page.setAttribute('data-adapt-container-width', 'false');
  }

  /* A refused embed still injects an iframe, just a zero-width one, and the
     plugin can render at full size and collapse again a moment later when its
     sizing handshake fails. Only a size that holds steady counts as rendered. */
  function isRendered(wrap) {
    var frame = wrap.querySelector('iframe');
    if (!frame) return false;
    var r = frame.getBoundingClientRect();
    return r.width >= 180 && r.height >= 250;
  }

  function init() {
    var wrap = u.$('#fb-latest-frame');
    if (!wrap) return;

    fill(wrap, offer);
    sizePlugin(wrap);

    /* Tell the SDK what to do once it lands. Parsing explicitly means the
       plugin still renders if the SDK arrives after DOMContentLoaded. */
    window.fbAsyncInit = function () {
      if (!window.FB) return;
      window.FB.init({ xfbml: true, version: 'v21.0' });
      window.FB.XFBML.parse(wrap);
    };

    var s = document.createElement('script');
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v21.0';
    document.body.appendChild(s);

    /* The branded card stays visible until the plugin has held a usable size
       for a couple of seconds, and comes back if the embed collapses again. A
       blocked, refused or still-loading embed therefore never leaves a hole. */
    var ticks = 0;
    var stable = 0;

    var poll = setInterval(function () {
      ticks++;

      if (isRendered(wrap)) {
        stable++;
        if (stable >= 4) wrap.classList.add('is-live');
      } else {
        if (stable) wrap.classList.remove('is-live');
        stable = 0;
      }

      if (ticks > 24) clearInterval(poll);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
