/*! Level Nexus — hero-register.js
 *  The homepage signature: a console that types real queries against the real
 *  register data and renders the matches as they narrow. Nothing here is
 *  mocked — every code and title comes from data/materials.js.
 *
 *  It idles when off-screen or on a hidden tab, and renders a single static
 *  frame when the visitor prefers reduced motion.
 */
window.LN = window.LN || {};

window.LN.heroRegister = (function () {
  'use strict';

  var u = window.LN.util;

  /* Queries chosen because each one narrows to a visibly different slice. */
  var SCRIPT = [
    { q: 'welder',     sector: 'Construction & Built Environment' },
    { q: 'ohs',        sector: 'Health & Safety' },
    { q: 'mining',     sector: 'Mining & Minerals' },
    { q: 'solar',      sector: 'Electrical & Energy' },
    { q: 'crane',      sector: 'Transport & Logistics' },
    { q: 'developer',  sector: 'ICT & Digital' },
    { q: 'farmer',     sector: 'Agriculture & Environment' }
  ];

  var TYPE_MS = 96;
  var DELETE_MS = 42;
  var HOLD_MS = 2200;
  var GAP_MS = 420;
  var ROWS = 5;

  var el = {};
  var data, sectorColor = {};
  var step = 0, timer = null, running = false, visible = true;

  function matches(query) {
    var q = query.trim().toLowerCase();
    if (!q) return data.materials;
    return data.materials.filter(function (m) {
      return m.search.indexOf(q) !== -1;
    });
  }

  function renderRows(list) {
    if (!el.results) return;

    var slice = list.slice(0, ROWS);

    if (!slice.length) {
      el.results.innerHTML =
        '<li class="console__row"><span class="console__label">' +
        'No match yet. Keep typing.</span></li>';
      return;
    }

    el.results.innerHTML = slice.map(function (m, i) {
      var color = sectorColor[m.sector] || '#0FD3C4';
      return '<li class="console__row" style="--sector:' + color +
             ';animation-delay:' + (i * 45) + 'ms">' +
             '<span class="console__code">' + u.escapeHtml(m.code) + '</span>' +
             '<span class="console__label">' + u.escapeHtml(m.title) + '</span>' +
             '</li>';
    }).join('');
  }

  function renderChips(activeSector) {
    if (!el.chips) return;
    u.$$('.console__chip', el.chips).forEach(function (chip) {
      chip.classList.toggle('is-on', chip.dataset.sector === activeSector);
    });
  }

  function renderCount(n) {
    if (el.count) el.count.textContent = n;
  }

  /** Push one frame of state to the DOM. */
  function paint(text, sector) {
    if (el.typed) el.typed.textContent = text;
    var list = matches(text);
    renderRows(list);
    renderCount(list.length);
    renderChips(text ? sector : null);
  }

  function schedule(fn, ms) {
    timer = window.setTimeout(fn, ms);
  }

  function typeIn(entry, i) {
    if (!running) return;
    if (i > entry.q.length) {
      schedule(function () { typeOut(entry, entry.q.length); }, HOLD_MS);
      return;
    }
    paint(entry.q.slice(0, i), entry.sector);
    schedule(function () { typeIn(entry, i + 1); }, TYPE_MS);
  }

  function typeOut(entry, i) {
    if (!running) return;
    if (i < 0) {
      step = (step + 1) % SCRIPT.length;
      schedule(next, GAP_MS);
      return;
    }
    paint(entry.q.slice(0, i), entry.sector);
    schedule(function () { typeOut(entry, i - 1); }, DELETE_MS);
  }

  function next() {
    if (!running) return;
    typeIn(SCRIPT[step], 0);
  }

  function start() {
    if (running || !visible) return;
    running = true;
    next();
  }

  function stop() {
    running = false;
    window.clearTimeout(timer);
  }

  function buildChips() {
    if (!el.chips) return;
    var wanted = SCRIPT.map(function (s) { return s.sector; });
    el.chips.innerHTML = wanted.slice(0, 4).map(function (name) {
      var short = name.split(' & ')[0];
      return '<span class="console__chip" data-sector="' + u.escapeHtml(name) + '">' +
             u.escapeHtml(short) + '</span>';
    }).join('');
  }

  function init() {
    var root = u.$('#hero-console');
    if (!root || !window.LN.data) return;

    data = window.LN.data;
    data.meta.sectors.forEach(function (s) { sectorColor[s.name] = s.color; });

    el.typed = u.$('#console-typed', root);
    el.results = u.$('#console-results', root);
    el.count = u.$('#console-count', root);
    el.chips = u.$('#console-chips', root);

    buildChips();

    // Reduced motion: one meaningful static frame, no loop.
    if (u.prefersReducedMotion()) {
      paint('welder', 'Construction & Built Environment');
      var caret = u.$('.console__caret', root);
      if (caret) caret.style.display = 'none';
      return;
    }

    paint('', null);

    // Only animate while the panel is actually on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
      }, { threshold: 0.15 }).observe(root);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
  }

  return { init: init };
})();
