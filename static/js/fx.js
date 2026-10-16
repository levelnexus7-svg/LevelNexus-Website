/* Level Nexus: animated faceted-triangle backgrounds (hero, page-head, dark band).
   A low-poly mesh whose points drift slowly, with light sweeping across the facets, a pointer glow,
   and the odd facet catching teal or orange. Canvas 2D: sharp at any pixel density.
   Pauses off-screen / hidden tab; a single still frame for prefers-reduced-motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hosts = document.querySelectorAll('.hero-bg, .band-bg');
  if (!hosts.length) return;

  var PAL = {
    navy: [[3, 22, 38], [6, 54, 88], [9, 104, 136], [15, 184, 178]],
    teal: [[3, 22, 38], [6, 54, 88], [9, 104, 136], [15, 184, 178]]
  };
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ramp(stops, t) {
    t = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
    var i = Math.floor(t), f = t - i, a = stops[i], b = stops[i + 1];
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
  }

  function build(host) {
    host.classList.add('fx');
    host.innerHTML = '<canvas class="fx-tri"></canvas>';
    var cv = host.querySelector('canvas'), ctx = cv.getContext('2d');
    var stops = PAL[host.getAttribute('data-palette') === 'teal' ? 'teal' : 'navy'];
    var W = 0, H = 0, dpr = 1, cols = 0, rows = 0, pts = [], tris = [], raf = 0, visible = true, last = 0, T = 0;
    var mx = -1, my = -1, tmx = -1, tmy = -1;

    function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

    function seed() {
      var cell = W < 700 ? 74 : 104;
      cols = Math.ceil(W / cell) + 3; rows = Math.ceil(H / (cell * 0.86)) + 3;
      var ch = cell * 0.86, k = 0;
      pts = [];
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++, k++) {
        pts.push({
          x: (i - 1) * cell + (j % 2 ? cell / 2 : 0) + (rnd(k) - .5) * cell * .42,
          y: (j - 1) * ch + (rnd(k + 999) - .5) * ch * .42,
          ph: rnd(k + 50) * 6.283, ph2: rnd(k + 80) * 6.283, amp: 5 + rnd(k + 20) * 9
        });
      }
      tris = [];
      for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) {
        var a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
        var odd = j % 2;
        var t1 = odd ? [a, b, c] : [a, b, d], t2 = odd ? [b, d, c] : [a, d, c];
        [t1, t2].forEach(function (v, n) {
          var id = (j * cols + i) * 2 + n;
          tris.push({ v: v, r: rnd(id + 7), s: rnd(id + 301), hot: rnd(id + 555) > 0.9 ? (rnd(id + 9) > 0.55 ? 'a' : 't') : '', hp: rnd(id + 41) * 20 });
        });
      }
    }

    function size() {
      var b = host.getBoundingClientRect();
      W = Math.max(1, b.width); H = Math.max(1, b.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(); draw(reduce ? 14 : T);
    }

    function draw(t) {
      var i, p, tr, v0, v1, v2, cx, cy;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        p.dx = Math.sin(t * 0.35 + p.ph) * p.amp; p.dy = Math.cos(t * 0.3 + p.ph2) * p.amp * 0.8;
      }
      ctx.clearRect(0, 0, W, H);
      var sweep = ((t * 0.07) % 1.6) - 0.3;           /* light band travelling left to right */
      for (i = 0; i < tris.length; i++) {
        tr = tris[i];
        v0 = pts[tr.v[0]]; v1 = pts[tr.v[1]]; v2 = pts[tr.v[2]];
        var x0 = v0.x + v0.dx, y0 = v0.y + v0.dy, x1 = v1.x + v1.dx, y1 = v1.y + v1.dy, x2 = v2.x + v2.dx, y2 = v2.y + v2.dy;
        cx = (x0 + x1 + x2) / 3; cy = (y0 + y1 + y2) / 3;
        var u = cx / W, base = ramp(stops, u * 0.9 + (cy / H) * 0.12 + (tr.r - .5) * 0.12);
        var shade = 0.78 + tr.s * 0.36 + 0.07 * Math.sin(t * 0.5 + tr.hp);
        var d = (u + (cy / H) * 0.25) - sweep, glow = Math.exp(-d * d * 55) * 0.3;
        var pg = 0;
        if (mx >= 0) { var ddx = cx - mx, ddy = cy - my, dd = Math.sqrt(ddx * ddx + ddy * ddy); pg = Math.max(0, 1 - dd / 260) * 0.38; }
        var l = shade + glow + pg;
        var R = base[0] * l, G = base[1] * l, B = base[2] * l;
        ctx.fillStyle = 'rgb(' + (R > 255 ? 255 : R | 0) + ',' + (G > 255 ? 255 : G | 0) + ',' + (B > 255 ? 255 : B | 0) + ')';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill();
        if (tr.hot && u > 0.25) {
          var pulse = Math.pow(Math.max(0, Math.sin(t * 0.55 + tr.hp)), 6) * 0.42;
          if (pulse > 0.02) { ctx.fillStyle = tr.hot === 'a' ? 'rgba(254,154,54,' + pulse.toFixed(3) + ')' : 'rgba(15,211,196,' + pulse.toFixed(3) + ')'; ctx.fill(); }
        }
        ctx.strokeStyle = 'rgba(190,225,255,.07)'; ctx.lineWidth = 1; ctx.stroke();
      }
      var vg = ctx.createLinearGradient(0, 0, W, 0);
      vg.addColorStop(0, 'rgba(2,10,24,.5)'); vg.addColorStop(.55, 'rgba(2,10,24,.1)'); vg.addColorStop(1, 'rgba(2,10,24,0)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    function step(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; T += dt;
      if (tmx >= 0) { mx = mx < 0 ? tmx : mx + (tmx - mx) * 0.08; my = my < 0 ? tmy : my + (tmy - my) * 0.08; }
      draw(T);
      raf = requestAnimationFrame(step);
    }
    function start() { if (!reduce && !raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(step); } }

    if (!reduce) {
      var par = host.closest('section') || host;
      par.addEventListener('pointermove', function (e) { var b = host.getBoundingClientRect(); tmx = e.clientX - b.left; tmy = e.clientY - b.top; }, { passive: true });
      par.addEventListener('pointerleave', function () { tmx = -1; mx = -1; });
    }
    size();
    if (window.ResizeObserver) new ResizeObserver(function () { size(); }).observe(host); else window.addEventListener('resize', size);
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }, { rootMargin: '80px' }).observe(host);
    document.addEventListener('visibilitychange', start);
    start();
  }

  for (var i = 0; i < hosts.length; i++) build(hosts[i]);
})();
