/*! Level Nexus: register.js
 *  Progressive enhancement for the Materials Register. The table is already
 *  in the HTML (so it works without scripts and can be indexed); this adds
 *  search, sector and type filters, sorting, copy-code and the shortlist.
 */
window.LN = window.LN || {};

window.LN.register = (function () {
  'use strict';

  var u = window.LN.util;
  var KEY = 'ln-shortlist';
  var root, body, rows, countEl, emptyEl, search, sectorSelect, typeSelect, typeBtns, railLinks;
  var PAGE = 30;
  var state = { q: '', sector: '', type: '', sort: 'title', dir: 1, limit: PAGE, sig: '' };
  var list = [];           // shortlist: [{ title, code }]
  var memory = null;       // fallback when localStorage is unavailable

  /* ------------------------------------------------------------- shortlist */
  function load() {
    try { var raw = window.localStorage.getItem(KEY); if (raw) return JSON.parse(raw) || []; }
    catch (e) { /* storage blocked: use memory only */ }
    return memory || [];
  }
  function save() {
    memory = list.slice();
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
  function indexOfItem(title, code) {
    for (var i = 0; i < list.length; i++) if (list[i].title === title && list[i].code === code) return i;
    return -1;
  }
  function lineFor(it) { return it.title + (it.code ? ' (' + it.code + ')' : ''); }

  function syncAddButtons() {
    u.$$('.add-btn', root).forEach(function (b) {
      var on = indexOfItem(b.getAttribute('data-title'), b.getAttribute('data-code')) !== -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.querySelector('.add-btn__t').textContent = on ? 'Added' : 'Add';
      b.classList.toggle('is-on', on);
    });
  }

  function renderTray() {
    var tray = u.$('#tray', root);
    if (!tray) return;
    var n = list.length;
    tray.hidden = n === 0;
    u.$('#tray-n', root).textContent = n;
    var ul = u.$('#tray-list', root);
    ul.innerHTML = list.map(function (it, i) {
      return '<li><span>' + u.escapeHtml(it.title) + (it.code ? ' <code>' + u.escapeHtml(it.code) + '</code>' : '') +
             '</span><button type="button" data-rm="' + i + '" aria-label="Remove ' + u.escapeHtml(it.title) + '">Remove</button></li>';
    }).join('');
    var text = 'Hi Level Nexus, I am looking for material for the following programmes:\n' + list.map(function (it) { return '- ' + lineFor(it); }).join('\n');
    u.$('#tray-wa', root).href = u.waLink(text);
    u.$('#tray-quote', root).href = '/contact/?items=' + encodeURIComponent(list.map(lineFor).join('|'));
    if (!n) setPanel(false);
  }

  function setPanel(open) {
    var panel = u.$('#tray-panel', root), btn = u.$('#tray-open', root);
    if (!panel) return;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }

  function toggleItem(btn) {
    var title = btn.getAttribute('data-title'), code = btn.getAttribute('data-code');
    var i = indexOfItem(title, code);
    if (i === -1) list.push({ title: title, code: code }); else list.splice(i, 1);
    save(); syncAddButtons(); renderTray();
  }

  /* --------------------------------------------------------------- filtering */
  function apply() {
    var q = state.q.trim().toLowerCase();
    var sig = q + '|' + state.sector + '|' + state.type;
    if (sig !== state.sig) { state.sig = sig; state.limit = PAGE; }
    var shown = 0, visible = 0;
    rows.forEach(function (tr) {
      var ok = (!q || tr.getAttribute('data-s').indexOf(q) !== -1) &&
               (!state.sector || tr.getAttribute('data-sector') === state.sector) &&
               (!state.type || tr.getAttribute('data-type') === state.type);
      if (ok) shown++;
      var show = ok && visible < state.limit;
      if (show) visible++;
      tr.hidden = !show;
    });
    var moreEl = u.$('#register-more', root);
    if (moreEl) {
      moreEl.hidden = visible >= shown;
      var mb = u.$('#register-more-btn', root);
      if (mb) mb.textContent = 'Show ' + Math.min(PAGE, shown - visible) + ' more (' + visible + ' of ' + shown + ' shown)';
    }

    var total = rows.length;
    var sec = state.sector ? (railLinks.filter(function (a) { return a.getAttribute('data-sector') === state.sector; })[0]) : null;
    var secName = sec ? sec.textContent.replace(/\d+$/, '').trim() : '';
    var parts = [];
    if (shown === total) parts.push('Showing all <strong>' + total + '</strong> programmes');
    else parts.push('<strong>' + shown + '</strong> of ' + total + ' programmes' + (secName ? ' in ' + u.escapeHtml(secName) : ''));
    if (shown !== total) parts.push(' <button type="button" class="link-btn" id="register-clear">Clear filters</button>');
    countEl.innerHTML = parts.join('');
    var clear = u.$('#register-clear', root);
    if (clear) clear.addEventListener('click', reset);

    var table = u.$('.reg-table', root);
    table.hidden = shown === 0;
    emptyEl.hidden = shown !== 0;
    if (shown === 0) u.$('#register-empty-query', root).textContent = state.q || (secName || 'these filters');

    railLinks.forEach(function (a) { a.setAttribute('aria-current', String((a.getAttribute('data-sector') || '') === state.sector)); });
    if (sectorSelect) sectorSelect.value = state.sector;
    if (typeSelect) typeSelect.value = state.type;
    typeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-type') || '') === state.type)); });
    writeUrl();
  }

  function reset() {
    state.q = ''; state.sector = ''; state.type = '';
    search.value = '';
    apply();
  }

  function sortRows() {
    var key = state.sort, dir = state.dir;
    function val(tr) {
      if (key === 'code') return (tr.querySelector('.c-code').textContent || '').toLowerCase();
      if (key === 'sector') return (tr.querySelector('.c-sector') ? tr.querySelector('.c-sector').textContent : '').toLowerCase();
      return tr.querySelector('.t').textContent.toLowerCase();
    }
    rows.sort(function (a, b) {
      var x = val(a), y = val(b);
      return x < y ? -dir : x > y ? dir : 0;
    }).forEach(function (tr) { body.appendChild(tr); });
    u.$$('.sort', root).forEach(function (b) {
      b.removeAttribute('aria-sort');
      if (b.getAttribute('data-sort') === key) b.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
    });
  }

  /* ----------------------------------------------------------------- url state */
  function readUrl() {
    try {
      var qs = new URLSearchParams(window.location.search);
      state.q = qs.get('q') || '';
      var type = (qs.get('type') || '').toUpperCase();
      if (typeBtns.some(function (b) { return b.getAttribute('data-type') === type; })) state.type = type;
      var sector = qs.get('sector');
      if (sector) {
        var hit = railLinks.filter(function (a) { return a.textContent.replace(/\d+$/, '').trim() === sector; })[0];
        if (hit) state.sector = hit.getAttribute('data-sector') || '';
      }
      search.value = state.q;
    } catch (e) { /* no query string support */ }
  }
  function writeUrl() {
    if (!window.history || !window.history.replaceState) return;
    try {
      var qs = new URLSearchParams();
      if (state.q) qs.set('q', state.q);
      if (state.type) qs.set('type', state.type);
      if (state.sector) {
        var hit = railLinks.filter(function (a) { return a.getAttribute('data-sector') === state.sector; })[0];
        if (hit) qs.set('sector', hit.textContent.replace(/\d+$/, '').trim());
      }
      var s = qs.toString();
      window.history.replaceState(null, '', window.location.pathname + (s ? '?' + s : ''));
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------------- init */
  function init() {
    root = u.$('#register');
    if (!root) return;
    body = u.$('#register-body', root);
    rows = u.$$('tr', body);
    countEl = u.$('#register-count', root);
    emptyEl = u.$('#register-empty', root);
    search = u.$('#register-search', root);
    sectorSelect = u.$('#sector-select', root);
    typeBtns = u.$$('.seg', root);
    typeSelect = u.$('#type-select', root);
    railLinks = u.$$('.reg-rail a, .reg-chips a', root);
    root.classList.add('is-enhanced');

    list = load();
    readUrl();

    search.addEventListener('input', u.debounce(function () { state.q = search.value; apply(); }, 120));
    typeBtns.forEach(function (b) { b.addEventListener('click', function () { state.type = b.getAttribute('data-type') || ''; apply(); }); });
    railLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        state.sector = a.getAttribute('data-sector') || '';
        apply();
      });
    });
    if (sectorSelect) sectorSelect.addEventListener('change', function () { state.sector = sectorSelect.value; apply(); });
    if (typeSelect) typeSelect.addEventListener('change', function () { state.type = typeSelect.value; apply(); });
    var sortSel = u.$('#sort-select', root);
    if (sortSel) sortSel.addEventListener('change', function () { var v = sortSel.value.split(':'); state.sort = v[0]; state.dir = parseInt(v[1], 10); sortRows(); apply(); });
    var resetBtn = u.$('#register-reset', root);
    if (resetBtn) resetBtn.addEventListener('click', reset);
    var moreBtn = u.$('#register-more-btn', root);
    if (moreBtn) moreBtn.addEventListener('click', function () { state.limit += PAGE; apply(); });

    u.$$('.sort', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = 1; }
        sortRows();
      });
    });

    root.addEventListener('click', function (e) {
      var copy = e.target.closest('.code-copy');
      if (copy) {
        var code = copy.getAttribute('data-code');
        var done = function () { var old = copy.textContent; copy.textContent = 'Copied'; copy.classList.add('is-copied'); setTimeout(function () { copy.textContent = old; copy.classList.remove('is-copied'); }, 1100); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () {});
        return;
      }
      var add = e.target.closest('.add-btn');
      if (add) { toggleItem(add); return; }
      var rm = e.target.closest('[data-rm]');
      if (rm) { list.splice(parseInt(rm.getAttribute('data-rm'), 10), 1); save(); syncAddButtons(); renderTray(); return; }
    });

    var open = u.$('#tray-open', root);
    if (open) {
      open.addEventListener('click', function () { setPanel(u.$('#tray-panel', root).hidden); });
      u.$('#tray-close', root).addEventListener('click', function () { setPanel(false); u.$('#tray-open', root).focus(); });
      u.$('#tray-clear', root).addEventListener('click', function () { list = []; save(); syncAddButtons(); renderTray(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setPanel(false); });
    }

    syncAddButtons();
    renderTray();
    apply();
  }

  return { init: init };
})();
