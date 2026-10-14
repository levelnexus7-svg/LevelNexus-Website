/*! Level Nexus — register.js
 *  The Materials Register: live search, sector filter, programme-type filter,
 *  match highlighting, incremental rendering and shareable URL state.
 *
 *  All 252 records live in memory (data/materials.js), so filtering is
 *  synchronous and instant — no network round-trip per keystroke.
 */
window.LN = window.LN || {};

window.LN.register = (function () {
  'use strict';

  var u = window.LN.util;

  var PAGE = 12;

  var data;
  var state = { q: '', sector: '', type: '', shown: PAGE };
  var el = {};
  var sectorColor = {};
  var results = [];

  /* ---------------------------------------------------------------- filter */

  function apply() {
    var q = state.q.trim().toLowerCase();

    results = data.materials.filter(function (m) {
      if (state.sector && m.sector !== state.sector) return false;
      if (state.type && m.codeType !== state.type) return false;
      if (q && m.search.indexOf(q) === -1) return false;
      return true;
    });
  }

  /* ---------------------------------------------------------------- render */

  function highlight(text, query) {
    var safe = u.escapeHtml(text);
    if (!query) return safe;

    var re = new RegExp('(' + u.escapeRegExp(query) + ')', 'ig');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function cardHtml(m, query) {
    var color = sectorColor[m.sector] || '#153A77';
    var badgeClass = 'code-chip--' + m.badge.toLowerCase();

    return '<li class="reg-card" style="--sector:' + color + '">' +
      '<div class="reg-card__body">' +
        '<h3 class="reg-card__title">' + highlight(m.title, query) + '</h3>' +
        '<p class="reg-card__qual">' + u.escapeHtml(m.qualification) + '</p>' +
      '</div>' +
      '<div class="reg-card__meta">' +
        '<span class="sector-tag">' + u.escapeHtml(m.sector) + '</span>' +
        '<span class="code-chip ' + badgeClass + '">' +
          '<span class="code-chip__badge">' + u.escapeHtml(m.badge) + '</span>' +
          '<span>' + highlight(m.code, query) + '</span>' +
        '</span>' +
      '</div>' +
    '</li>';
  }

  function render() {
    var query = state.q.trim();
    var slice = results.slice(0, state.shown);

    /* Count line */
    if (el.count) {
      el.count.innerHTML = results.length === data.materials.length
        ? 'Showing all <strong>' + results.length + '</strong> programmes'
        : '<strong>' + results.length + '</strong> of ' + data.materials.length + ' programmes';
    }

    /* Empty state */
    if (!results.length) {
      el.list.innerHTML = '';
      el.list.hidden = true;
      el.empty.hidden = false;
      if (el.emptyQuery) {
        el.emptyQuery.textContent = query || 'those filters';
      }
      if (el.more) el.more.hidden = true;
      return;
    }

    el.empty.hidden = true;
    el.list.hidden = false;
    el.list.innerHTML = slice.map(function (m) { return cardHtml(m, query); }).join('');

    /* Load-more */
    if (el.more) {
      var remaining = results.length - slice.length;
      el.more.hidden = remaining <= 0;
      if (el.moreBtn && remaining > 0) {
        el.moreBtn.textContent = 'Show ' + Math.min(PAGE, remaining) + ' more';
      }
    }

    /* Reset button only matters when something is actually filtered */
    if (el.reset) {
      el.reset.hidden = !(state.q || state.sector || state.type);
    }

    updateFilterBadge();
  }

  function updateFilterBadge() {
    if (!el.filterCount) return;
    var n = (state.sector ? 1 : 0) + (state.type ? 1 : 0);
    el.filterCount.dataset.count = String(n);
    el.filterCount.textContent = n;
  }

  function announce() {
    if (el.live) {
      el.live.textContent = results.length + ' programmes match.';
    }
  }

  /* ------------------------------------------------------------ update run */

  function update(resetPaging) {
    if (resetPaging !== false) state.shown = PAGE;
    apply();
    render();
    announce();
    u.params.replace({ q: state.q, sector: state.sector, type: state.type });
  }

  /* --------------------------------------------------------------- filters */

  function buildSectorPills() {
    if (!el.sectors) return;

    var html = ['<li><button type="button" class="pill" data-sector="" aria-pressed="true">' +
                'All sectors <span class="pill__count">' + data.meta.total + '</span></button></li>'];

    data.meta.sectors.forEach(function (s) {
      html.push(
        '<li><button type="button" class="pill pill--dot" data-sector="' + u.escapeHtml(s.name) +
        '" style="--sector:' + s.color + '" aria-pressed="false">' +
        u.escapeHtml(s.name) + ' <span class="pill__count">' + s.count + '</span></button></li>'
      );
    });

    el.sectors.innerHTML = html.join('');
  }

  function buildTypePills() {
    if (!el.types) return;

    var html = ['<li><button type="button" class="pill" data-type="" aria-pressed="true">' +
                'All types</button></li>'];

    data.meta.types.forEach(function (t) {
      html.push(
        '<li><button type="button" class="pill" data-type="' + u.escapeHtml(t.key) +
        '" aria-pressed="false" title="' + u.escapeHtml(t.description) + '">' +
        u.escapeHtml(t.label) + ' <span class="pill__count">' + t.count + '</span></button></li>'
      );
    });

    el.types.innerHTML = html.join('');
  }

  function syncPills(group, attr, value) {
    if (!group) return;
    u.$$('.pill', group).forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset[attr] === value));
    });
  }

  function syncControls() {
    if (el.input) el.input.value = state.q;
    if (el.clear) el.clear.classList.toggle('is-visible', !!state.q);
    syncPills(el.sectors, 'sector', state.sector);
    syncPills(el.types, 'type', state.type);
  }

  /* ------------------------------------------------------------------ init */

  function readUrl() {
    state.q = u.params.get('q') || '';
    var sector = u.params.get('sector') || '';
    var type = u.params.get('type') || '';

    // Only honour values that actually exist in the dataset.
    if (data.meta.sectors.some(function (s) { return s.name === sector; })) state.sector = sector;
    if (data.meta.types.some(function (t) { return t.key === type; })) state.type = type;
  }

  function bind() {
    if (el.input) {
      var run = u.debounce(function () {
        state.q = el.input.value;
        if (el.clear) el.clear.classList.toggle('is-visible', !!state.q);
        update();
      }, 130);

      el.input.addEventListener('input', run);

      // Enter should never submit and reload the page.
      el.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') e.preventDefault();
        if (e.key === 'Escape' && el.input.value) {
          el.input.value = '';
          state.q = '';
          el.clear.classList.remove('is-visible');
          update();
        }
      });
    }

    if (el.clear) {
      el.clear.addEventListener('click', function () {
        state.q = '';
        el.input.value = '';
        el.clear.classList.remove('is-visible');
        el.input.focus();
        update();
      });
    }

    if (el.sectors) {
      el.sectors.addEventListener('click', function (e) {
        var btn = e.target.closest('.pill');
        if (!btn) return;
        state.sector = btn.dataset.sector === state.sector ? '' : btn.dataset.sector;
        syncPills(el.sectors, 'sector', state.sector);
        update();
      });
    }

    if (el.types) {
      el.types.addEventListener('click', function (e) {
        var btn = e.target.closest('.pill');
        if (!btn) return;
        state.type = btn.dataset.type === state.type ? '' : btn.dataset.type;
        syncPills(el.types, 'type', state.type);
        update();
      });
    }

    if (el.moreBtn) {
      el.moreBtn.addEventListener('click', function () {
        state.shown += PAGE;
        render();
        // Move focus to the first newly revealed row for keyboard users.
        var rows = u.$$('.reg-card', el.list);
        var target = rows[state.shown - PAGE];
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      });
    }

    if (el.reset) {
      el.reset.addEventListener('click', function () {
        state.q = '';
        state.sector = '';
        state.type = '';
        syncControls();
        update();
        if (el.input) el.input.focus();
      });
    }

    if (el.emptyReset) {
      el.emptyReset.addEventListener('click', function () {
        state.q = '';
        state.sector = '';
        state.type = '';
        syncControls();
        update();
      });
    }

    if (el.filtersToggle) {
      el.filtersToggle.addEventListener('click', function () {
        setRail(!el.root.classList.contains('is-rail-open'));
      });
    }

    if (el.railClose) {
      el.railClose.addEventListener('click', function () { setRail(false); });
    }

    if (el.scrim) {
      el.scrim.addEventListener('click', function () { setRail(false); });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.root && el.root.classList.contains('is-rail-open')) setRail(false);
    });

    // Above the breakpoint the rail is permanently visible, so drop any open
    // state that was left behind by a narrow viewport.
    window.addEventListener('resize', u.debounce(function () {
      if (window.innerWidth > 1080) setRail(false);
    }, 150));
  }

  /* On narrow screens the rail becomes a slide-over sheet. */
  function setRail(open) {
    if (!el.root) return;
    el.root.classList.toggle('is-rail-open', open);
    if (el.filtersToggle) el.filtersToggle.setAttribute('aria-expanded', String(open));
    if (el.scrim) el.scrim.hidden = !open;
  }

  function init() {
    var root = u.$('#register');
    if (!root || !window.LN.data) return;

    data = window.LN.data;
    data.meta.sectors.forEach(function (s) { sectorColor[s.name] = s.color; });

    el.input = u.$('#register-search');
    el.clear = u.$('#register-clear');
    el.sectors = u.$('#filter-sectors');
    el.types = u.$('#filter-types');
    el.list = u.$('#register-list');
    el.empty = u.$('#register-empty');
    el.emptyQuery = u.$('#register-empty-query');
    el.emptyReset = u.$('#register-empty-reset');
    el.count = u.$('#register-count');
    el.more = u.$('#register-more');
    el.moreBtn = u.$('#register-more-btn');
    el.reset = u.$('#register-reset');
    el.live = u.$('#register-live');
    el.filters = u.$('#register-filters');
    el.filtersToggle = u.$('#filters-toggle');
    el.filterCount = u.$('#filters-count');
    el.root = root;
    el.scrim = u.$('#register-scrim');
    el.railClose = u.$('#register-rail-close');

    buildSectorPills();
    buildTypePills();
    readUrl();
    syncControls();
    bind();
    update();
  }

  return { init: init };
})();
