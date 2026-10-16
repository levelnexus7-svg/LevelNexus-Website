// Level Nexus site builder. No framework: reads src/, writes dist/.
//   node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const STATIC = path.join(ROOT, 'static');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://levelnexus.co.za';
const TODAY = new Date().toISOString().slice(0, 10);
const BUILD = Date.now().toString(36);

const read = (p) => fs.readFileSync(p, 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const data = JSON.parse(read(path.join(SRC, 'data/materials.json')));
const copy = JSON.parse(read(path.join(SRC, 'data/sector-copy.json')));
const { meta, materials } = data;

// ---------------------------------------------------------------- sectors
const sectors = meta.sectors.map((s) => ({ ...s, url: '/materials/' + slugify(s.name) + '/', key: s.slug }));
const sectorByName = Object.fromEntries(sectors.map((s) => [s.name, s]));
const typeLabel = (m) => (m.badge === 'CORE' ? 'Core' : m.badge);
const typeCount = (k) => materials.filter((m) => m.badge === k).length;

// ---------------------------------------------------------------- link rewriting
const PAGE_URLS = {
  'index.html': '/', 'materials.html': '/materials/', 'services.html': '/services/',
  'platform.html': '/platform/', 'about.html': '/about/', 'contact.html': '/contact/', 'privacy.html': '/privacy/',
};
function rewriteValue(v) {
  if (/^(https?:|\/\/|\/|#|mailto:|tel:|data:|javascript:|\[)/.test(v) || v === '') return v;
  const m = v.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  const file = m[1], q = m[2] || '', h = m[3] || '';
  if (PAGE_URLS[file]) {
    if (file === 'materials.html' && q.startsWith('?sector=')) {
      const name = decodeURIComponent(q.slice(8).split('&')[0]);
      if (sectorByName[name]) return sectorByName[name].url;
    }
    return PAGE_URLS[file] + q + h;
  }
  return '/' + v;
}
const rewriteLinks = (html) => html.replace(/\b(href|src|poster|action)="([^"]*)"/g, (_, a, v) => `${a}="${rewriteValue(v)}"`);

// ---------------------------------------------------------------- partials
const header = read(path.join(SRC, 'partials/header.html'));
const footer = read(path.join(SRC, 'partials/footer.html'));
const floating = read(path.join(SRC, 'partials/floating.html'));

const ORG = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': SITE + '/#org',
  name: 'Level Nexus',
  slogan: 'Creating Possibilities',
  description: 'Supplier of QCTO-aligned and legacy learning material and accreditation support for Skills Development Providers in South Africa.',
  url: SITE + '/',
  logo: SITE + '/assets/img/logo-full.png',
  image: SITE + '/assets/img/og/home.jpg',
  email: 'levelnexus@outlook.com',
  telephone: '+27847624831',
  address: { '@type': 'PostalAddress', addressRegion: 'KwaZulu-Natal', addressCountry: 'ZA' },
  areaServed: { '@type': 'Country', name: 'South Africa' },
  openingHours: 'Mo-Fr 08:00-17:00',
  sameAs: ['https://www.facebook.com/profile.php?id=61581938459125'],
  serviceType: ['QCTO-aligned learning material', 'Accreditation support', 'Skills programmes', 'Customised and branded learning material'],
  knowsAbout: ['QCTO occupational qualifications', 'SAQA qualification IDs', 'SETA accreditation', 'Skills programmes', 'Learner management systems'],
  contactPoint: { '@type': 'ContactPoint', contactType: 'sales', telephone: '+27847624831', email: 'levelnexus@outlook.com', areaServed: 'ZA', availableLanguage: ['en'] },
  hasOfferCatalog: {
    '@type': 'OfferCatalog', name: 'Level Nexus services',
    itemListElement: [
      ['QCTO-aligned learning material', 'Curriculum-mapped learner and facilitator guides, workbooks, assessment instruments and logbooks for the occupational qualification a provider is registered to deliver.'],
      ['Accreditation support', 'Gap analysis, QMS documentation, assessor and moderator records, site readiness and evidence file assembly for QCTO and SETA accreditation.'],
      ['Skills programmes', 'SP-coded skills programmes, MQA mining programmes and legacy unit-standard material.'],
      ['Customised branded material', 'Rebranding, adaptation and new development of learning material against a curriculum document.'],
    ].map(([name, description]) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name, description, provider: { '@id': SITE + '/#org' }, areaServed: { '@type': 'Country', name: 'South Africa' } } })),
  },
};
const WEBSITE = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#site', name: 'Level Nexus', url: SITE + '/', publisher: { '@id': SITE + '/#org' } };

function layout(page, main) {
  const url = SITE + page.path;
  const ld = (page.jsonld || []).map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  const seg = page.path === '/' ? 'home' : page.path.split('/')[1];
  const og = page.ogImage || (['materials', 'services', 'platform', 'about', 'contact'].includes(seg) ? `/assets/img/og/${seg}.jpg` : '/assets/img/og/home.jpg');
  const scripts = ['config.js', ...(page.data ? ['../data/materials.js'] : []), 'nav.js', 'ui.js', ...(page.data ? ['hero-register.js'] : []), ...(page.scripts || []), 'fx.js', 'forms.js', 'main.js', ...(page.extraScripts || [])]
    .map((s) => `<script src="${s.startsWith('../') ? '/' + s.slice(3) : '/js/' + s}" defer></script>`).join('\n');
  const html = `<!DOCTYPE html>
<html lang="en-ZA" id="top">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="theme-color" content="#031A2A">
${page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Level Nexus">
<meta property="og:locale" content="en_ZA">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/assets/icons/icon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/assets/icons/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/montserrat-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/montserrat-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/all.css?v=${BUILD}">
${ld}
${page.path === '/' ? '<script>if(/\\/index\\.html$/.test(location.pathname))history.replaceState(null,"","/"+location.search+location.hash)</script>' : ''}
<script>(function(d){if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&"IntersectionObserver"in window)d.classList.add("js-motion")})(document.documentElement)</script>
</head>
<body${page.bodyClass ? ` class="${page.bodyClass}"` : ''}>

<a class="skip" href="#main">Skip to main content</a>

${header}
${main}

${footer}
${floating}
${scripts}
</body>
</html>
`;
  return rewriteLinks(html);
}

const out = (rel, content) => {
  const p = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};
const urlToFile = (u) => (u.endsWith('/') ? u + 'index.html' : u);
const sitemapUrls = [];

function emit(page, main, { priority = '0.7', changefreq = 'monthly' } = {}) {
  out(urlToFile(page.path), layout(page, main));
  if (!page.noindex) sitemapUrls.push({ loc: SITE + page.path, priority, changefreq, lastmod: page.lastmod || TODAY });
}

// ---------------------------------------------------------------- register markup
function rows(list, { showSector }) {
  return list.map((m) => {
    const sec = sectorByName[m.sector];
    const hasCode = m.codeType !== 'OTHER' && m.code && m.code !== '—';
    return `<tr style="--sector:${sec.color}" data-id="${m.id}" data-sector="${sec.key}" data-type="${m.badge}" data-s="${esc(m.search)}">
<td class="c-code">${hasCode ? `<button class="code-copy" type="button" data-code="${esc(m.code)}" title="Copy code" aria-label="Copy code ${esc(m.code)}">${esc(m.code)}</button>` : '<span class="nocode"><span aria-hidden="true">\u2014</span><span class="visually-hidden">No code</span></span>'}</td>
<td class="c-title"><span class="t">${esc(m.title)}</span><span class="q">${esc(m.qualification)}</span></td>
${showSector ? `<td class="c-sector"><span class="sdot" style="--sector:${sec.color}"></span>${esc(m.sector)}</td>` : ''}
<td class="c-type"><span class="tchip tchip--${m.badge.toLowerCase()}">${typeLabel(m)}</span></td>
<td class="c-add"><button class="add-btn" type="button" data-title="${esc(m.title)}" data-code="${hasCode ? esc(m.code) : ''}" aria-pressed="false" aria-label="Add ${esc(m.title)} to shortlist"><span class="add-btn__i" aria-hidden="true"></span><span class="add-btn__t">Add</span></button></td>
</tr>`;
  }).join('\n');
}

function typeBar(list) {
  const kinds = [['', 'All', list.length], ['QCTO', 'QCTO', 0], ['SP', 'SP', 0], ['MQA', 'MQA', 0], ['CORE', 'Core', 0]];
  return kinds.map(([k, label]) => {
    const n = k ? list.filter((m) => m.badge === k).length : list.length;
    if (k && !n) return '';
    return `<button type="button" class="seg" data-type="${k}" aria-pressed="${k === '' ? 'true' : 'false'}">${label}<b>${n}</b></button>`;
  }).join('');
}

function register(list, { showSector, rail }) {
  const railHtml = rail ? `
<aside class="reg-rail" aria-label="Sectors">
  <p class="reg-rail__h">Sector</p>
  <ul>
    <li><a href="/materials/" data-sector="" aria-current="true">All sectors<b>${materials.length}</b></a></li>
    ${sectors.map((s) => `<li><a href="${s.url}" data-sector="${s.key}"><span class="sdot" style="--sector:${s.color}"></span>${esc(s.name)}<b>${s.count}</b></a></li>`).join('\n    ')}
  </ul>
</aside>` : '';
  return `
<div class="reg" id="register" data-total="${list.length}">
  <div class="container reg-layout${rail ? '' : ' reg-layout--one'}">
    ${railHtml}
    <div class="reg-main">
      <div class="reg-tools">
        <div class="reg-search search">
          <label class="visually-hidden" for="register-search">Search programmes by title or code</label>
          <span class="search__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>
          <input class="input" id="register-search" type="search" placeholder="Search by title or code, e.g. welder or 118707" autocomplete="off" spellcheck="false">
        </div>
        ${rail ? `<label class="visually-hidden" for="sector-select">Sector</label>
        <select class="select reg-sector-select" id="sector-select"><option value="">All sectors (${materials.length})</option>${sectors.map((s) => `<option value="${s.key}">${esc(s.name)} (${s.count})</option>`).join('')}</select>` : ''}
        <label class="visually-hidden" for="type-select">Programme type</label>
        <select class="select reg-type-select" id="type-select">${[['', 'All types'], ['QCTO', 'QCTO'], ['SP', 'Skills programmes'], ['MQA', 'MQA mining'], ['CORE', 'Core']].map(([k, l]) => { const n = k ? list.filter((m) => m.badge === k).length : list.length; return k && !n ? '' : `<option value="${k}">${l} (${n})</option>`; }).join('')}</select>
        ${rail ? `<nav class="reg-chips" aria-label="Sectors"><a href="/materials/" data-sector="" aria-current="true">All</a>${sectors.map((x) => `<a href="${x.url}" data-sector="${x.key}"><span class="sdot" style="--sector:${x.color}"></span>${esc(x.name)}</a>`).join('')}</nav>` : ''}
        <div class="segs" role="group" aria-label="Programme type">${typeBar(list)}</div>
      </div>
      <div class="reg-meta">
        <p class="reg-count" id="register-count" role="status" aria-live="polite">Showing all <strong>${list.length}</strong> programmes</p>
        <label class="reg-sort"><span>Sort</span><select class="select" id="sort-select" aria-label="Sort programmes"><option value="title:1">A to Z</option><option value="title:-1">Z to A</option>${showSector ? '<option value="sector:1">Sector</option>' : ''}<option value="code:1">Code</option></select></label>
      </div>
      <div class="reg-tablewrap">
        <table class="reg-table">
          <thead><tr><th scope="col" class="c-code"><button type="button" class="sort" data-sort="code">Code</button></th><th scope="col"><button type="button" class="sort" data-sort="title" aria-sort="ascending">Programme</button></th>${showSector ? '<th scope="col" class="c-sector"><button type="button" class="sort" data-sort="sector">Sector</button></th>' : ''}<th scope="col" class="c-type">Type</th><th scope="col" class="c-add"><span class="visually-hidden">Add to list</span></th></tr></thead>
          <tbody id="register-body">
${rows(list, { showSector })}
          </tbody>
        </table>
      </div>
      <div class="reg-more" id="register-more" hidden><button class="btn ghost" type="button" id="register-more-btn">Show more programmes</button></div>
      <div class="empty-state" id="register-empty" hidden>
        <p class="empty-state__title">No programme matches “<span id="register-empty-query"></span>”</p>
        <p>We may still be able to develop it. Send us the SAQA ID or the exact qualification title and we'll come back with an answer, usually the same working day.</p>
        <div class="btn-row center"><button class="btn ghost" id="register-reset" type="button">Clear filters</button><a class="btn" href="contact.html">Ask about this programme</a></div>
      </div>
      <div class="register-note">
        <p><strong>Reading the codes.</strong>
          <span class="code-chip code-chip--qcto"><span class="code-chip__badge">QCTO</span><span>91761</span></span> is a SAQA-registered occupational qualification ID.
          <span class="code-chip code-chip--sp"><span class="code-chip__badge">SP</span><span>SP-220303</span></span> is a registered skills programme, and
          <span class="code-chip code-chip--mqa"><span class="code-chip__badge">MQA</span><span>MQA SP0069-08</span></span> is a Mining Qualifications Authority programme.</p>
        <p>Register last reviewed ${esc(meta.updated ? meta.updated : 'August 2026')}. Availability of individual items is confirmed at quote stage. A listing here means we hold or can supply the material; it doesn't accredit you to deliver it.</p>
      </div>
    </div>
  </div>
  <div class="tray" id="tray" hidden>
    <button class="tray__bar" type="button" id="tray-open" aria-expanded="false" aria-controls="tray-panel"><span>My list</span> <b id="tray-n">0</b><span class="tray__go">Review and send</span></button>
    <div class="tray__panel" id="tray-panel" hidden role="dialog" aria-label="Your shortlist">
      <div class="tray__head"><h2>Your shortlist</h2><button type="button" class="tray__x" id="tray-close" aria-label="Close shortlist">×</button></div>
      <ul class="tray__list" id="tray-list"></ul>
      <div class="tray__actions">
        <a class="btn wa block" id="tray-wa" href="https://wa.me/27847624831" rel="noopener" target="_blank">Send on WhatsApp</a>
        <a class="btn block" id="tray-quote" href="contact.html">Request a quote</a>
        <button class="btn-reset" type="button" id="tray-clear">Clear list</button>
      </div>
    </div>
  </div>
</div>`;
}

function itemList(list, pageUrl) {
  return {
    '@context': 'https://schema.org', '@type': 'ItemList', url: SITE + pageUrl, numberOfItems: list.length,
    itemListElement: list.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.title + (m.code && m.code !== '—' ? ` (${m.code})` : '') })),
  };
}
const crumbs = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + u })) });
const faqLd = (qa) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

const CTA = (h = 'Found what you need?') => `
<section class="cta section">
  <div class="container rv">
    <h2>${h}</h2>
    <p>Send us the codes and we'll come back with a quote, a lead time and a sample page.</p>
    <div class="btn-row"><a class="btn amber" href="contact.html">Request a quote</a><a class="btn line-light" href="https://wa.me/27847624831" data-wa="Hi Level Nexus, I am looking for material for the following programmes:" rel="noopener" target="_blank">WhatsApp us the codes</a></div>
  </div>
</section>`;

const WHATS_IN_SET = `
<section class="inset">
  <div class="container inset__grid">
    <div><h2>What arrives with every programme</h2><p>Each register item comes as a complete set, in editable Word and print-ready PDF, styled to your organisation. Most items ship in 2–5 working days.</p></div>
    <ul class="inc"><li>Learner and facilitator guides</li><li>Workbooks</li><li>Assessment instruments with memoranda</li><li>Logbooks and workplace modules</li><li>Curriculum and SAQA documents</li><li>Alignment matrix</li></ul>
  </div>
</section>`;

// ---------------------------------------------------------------- materials page
function buildMaterials() {
  const page = {
    path: '/materials/', title: `QCTO Materials Register: ${materials.length} Programmes | Level Nexus`,
    description: `Search ${materials.length} QCTO-aligned qualifications, skills programmes and legacy learnership materials across ${sectors.length} sectors. Find material by title, SAQA ID or SP code.`,
    data: false, scripts: ['register.js'], bodyClass: 'is-register',
    jsonld: [crumbs([['Home', '/'], ['Materials Register', '/materials/']]), itemList(materials, '/materials/')],
  };
  const main = `
<main id="main">
<section class="page-head page-head--tool page-head--teal">
  <span class="hero-bg" aria-hidden="true"></span>
  <span class="hero-shape s1" aria-hidden="true"></span>
  <div class="container">
    <h1>Materials Register</h1>
    <p>Every QCTO-aligned qualification, skills programme and legacy programme we hold material for: <strong>${materials.length} entries across ${sectors.length} sectors</strong>. Search by title, SAQA ID or SP code, add what you need to a list, and send it to us in one tap.</p>
  </div>
  <span class="tri" aria-hidden="true"></span>
</section>
${register(materials, { showSector: true, rail: true })}
${WHATS_IN_SET}
${CTA()}
</main>`;
  emit(page, main, { priority: '0.9', changefreq: 'weekly' });
}

// ---------------------------------------------------------------- sector pages
function buildSectorPages() {
  for (const s of sectors) {
    const list = materials.filter((m) => m.sector === s.name);
    const c = copy[s.key];
    const t = Object.fromEntries(['QCTO', 'SP', 'MQA', 'CORE'].map((k) => [k, list.filter((m) => m.badge === k).length]));
    const parts = [t.QCTO && `${t.QCTO} QCTO-aligned`, t.SP && `${t.SP} registered skills programme${t.SP > 1 ? 's' : ''}`, t.MQA && `${t.MQA} MQA mining programme${t.MQA > 1 ? 's' : ''}`, t.CORE && `${t.CORE} core programme${t.CORE > 1 ? 's' : ''}`].filter(Boolean);
    const mix = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts.slice(-1) : parts[0];
    const intro = `We hold learning material for ${list.length} ${s.name} programme${list.length > 1 ? 's' : ''}: ${mix}. They run ${c.covers}. This list is built for ${c.audience}. Every item arrives as a complete set that you can brand as your own.`;
    const qa = [
      [c.q, `Send us the SAQA ID or the exact qualification title. If it is not on file we will tell you straight away, and quote for developing it if that is possible.`],
      [`How quickly can I get ${s.name} material?`, `Items on this list usually ship in 2–5 working days. We confirm availability and the lead time when we quote.`],
      ['Does buying material make me accredited?', `No. A listing means we hold or can supply the material. Accreditation is granted by the QCTO or the relevant SETA to your organisation.`],
    ];
    const others = sectors.filter((o) => o.key !== s.key);
    const page = {
      path: s.url, title: (`${s.name} QCTO Learning Material | Level Nexus`.length <= 60 ? `${s.name} QCTO Learning Material | Level Nexus` : `${s.name} Learning Material | Level Nexus`),
      description: `${list.length} ${s.name} programmes with learning material ready to supply, with QCTO, SP and MQA codes. Search and build a shortlist.`,
      scripts: ['register.js'], bodyClass: 'is-register',
      jsonld: [crumbs([['Home', '/'], ['Materials Register', '/materials/'], [s.name, s.url]]), itemList(list, s.url), faqLd(qa)],
    };
    const main = `
<main id="main">
<section class="page-head page-head--tool page-head--teal">
  <span class="hero-bg" aria-hidden="true"></span>
  <span class="hero-shape s1" aria-hidden="true"></span>
  <div class="container">
    <ol class="crumbs"><li><a href="materials.html">Materials Register</a></li><li aria-current="page">${esc(s.name)}</li></ol>
    <h1>${esc(s.name)} learning material</h1>
    <p>${esc(intro)}</p>
  </div>
  <span class="tri" aria-hidden="true"></span>
</section>
${register(list, { showSector: false, rail: false })}
<section class="section sector-faq">
  <div class="container narrow">
    <h2>Questions about ${esc(s.name)} material</h2>
    ${qa.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n    ')}
  </div>
</section>
<section class="section alt related">
  <div class="container">
    <h2>Other sectors</h2>
    <ul class="sector-cloud">${others.map((o) => `<li><a href="${o.url}" style="--sector:${o.color}">${esc(o.name)} <b>${o.count}</b></a></li>`).join('')}</ul>
  </div>
</section>
${CTA(`Need ${esc(s.name)} material?`)}
</main>`;
    emit(page, main, { priority: '0.7' });
  }
}

// ---------------------------------------------------------------- sector marquee (home)
function sectorMarquee() {
  const chips = (hidden) => sectors.map((x) => `<a class="chip" href="${x.url}"${hidden ? ' tabindex="-1"' : ''}>${esc(x.name)}</a>`).join('');
  return `<div class="marquee" role="region" aria-label="Browse the register by sector"><div class="marquee__track"><div class="marquee__set">${chips(false)}</div><div class="marquee__set" aria-hidden="true">${chips(true)}</div></div></div>`;
}

// ---------------------------------------------------------------- generic pages
function buildPages() {
  const dir = path.join(SRC, 'pages');
  for (const f of fs.readdirSync(dir)) {
    const raw = read(path.join(dir, f));
    const m = raw.match(/^<!--meta (.*?)-->\n/s);
    const page = JSON.parse(m[1]);
    const body = raw.slice(m[0].length).replace(/\{\{total\}\}/g, materials.length).replace(/\{\{sectors\}\}/g, sectors.length).replace(/\{\{sectormarquee\}\}/g, sectorMarquee());
    if (page.path === '/') { page.jsonld = [ORG, WEBSITE]; page.data = true; page.extraScripts = ['zoom.js', 'facebook.js']; page.scripts = []; }
    if (page.path === '/platform/') { page.scripts = ['tabs.js']; page.extraScripts = ['zoom.js']; }
    const prio = { '/': '1.0', '/services/': '0.8', '/platform/': '0.8', '/about/': '0.6', '/contact/': '0.7', '/privacy/': '0.3' }[page.path] || '0.5';
    if (page.faqFromDom) { const qs=[...body.matchAll(/<button class="faq__q"[^>]*><span>(.*?)<\/span>[\s\S]*?<div class="faq__a"><p>(.*?)<\/p>/g)].map(x=>[x[1].replace(/&amp;/g,'&'),x[2].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&')]); page.faq=qs; }
    const CRUMB_NAMES = { '/services/': 'Services', '/platform/': 'Nexus Learn', '/about/': 'About', '/contact/': 'Contact', '/privacy/': 'Privacy notice' };
    if (CRUMB_NAMES[page.path]) page.jsonld = [...(page.jsonld || []), crumbs([['Home', '/'], [CRUMB_NAMES[page.path], page.path]])];
    if (page.path === '/contact/') page.jsonld = [...(page.jsonld || []), { '@context': 'https://schema.org', '@type': 'ContactPage', url: SITE + '/contact/', name: 'Request a quote', about: { '@id': SITE + '/#org' } }];
    if (page.faq) page.jsonld = [...(page.jsonld || []), faqLd(page.faq)];
    if (page.ld) page.jsonld = [...(page.jsonld || []), ...page.ld];
    emit(page, body, { priority: prio });
  }
}

// ---------------------------------------------------------------- 404, stubs, static, sitemap
function build404() {
  const page = { path: '/404.html', title: 'Page not found | Level Nexus', description: 'That page does not exist.', noindex: true };
  const main = `<main id="main"><section class="section"><div class="container narrow"><h1>That page is not here</h1><p class="lead">The link may be old, or the page has moved. Try the Materials Register, or message us and we'll point you to it.</p><div class="btn-row"><a class="btn" href="index.html">Home</a><a class="btn ghost" href="materials.html">Materials Register</a><a class="btn ghost" href="contact.html">Contact</a></div></div></section></main>`;
  out('404.html', layout(page, main));
}
function buildStubs() {
  for (const [file, url] of Object.entries(PAGE_URLS)) {
    if (file === 'index.html') continue; // the home page is index.html itself
    out(file, `<!DOCTYPE html>
<html lang="en-ZA"><head><meta charset="utf-8"><title>Moved | Level Nexus</title>
<meta name="robots" content="noindex"><link rel="canonical" href="${SITE}${url}">
<meta http-equiv="refresh" content="0; url=${url}">
<script>location.replace(${JSON.stringify(url)}+location.search+location.hash)</script></head>
<body><p>This page has moved to <a href="${url}">${SITE}${url}</a>.</p></body></html>
`);
  }
}
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}
function buildData() {
  // materials.js (used by the homepage console) generated from the single JSON source.
  const js = `/*! Level Nexus: Materials Register dataset (generated by build.mjs from src/data/materials.json) */
window.LN = window.LN || {};
window.LN.data = ${JSON.stringify({ meta, materials })};
`;
  out('data/materials.js', js);
}

fs.rmSync(DIST, { recursive: true, force: true });
copyDir(STATIC, DIST);
// One stylesheet instead of five: fewer round trips before first paint.
{
  const order = ['fonts.css', 'sectors.css', 'style.css', 'platform.css', 'site.css', 'polish.css', 'refresh.css', 'mobile.css'];
  const css = order.map((f) => read(path.join(STATIC, 'css', f))).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}');
  for (const f of order) fs.rmSync(path.join(DIST, 'css', f));
  fs.writeFileSync(path.join(DIST, 'css/all.css'), css);
}
buildData();
buildPages();
buildMaterials();
buildSectorPages();
build404();
buildStubs();
out('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'CNAME'), 'levelnexus.co.za\n');
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
console.log(`built ${sitemapUrls.length} pages into dist/`);
