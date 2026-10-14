# Level Nexus — company website

Static, no build step, no framework. Vanilla HTML, CSS and JavaScript.

Open `index.html` in a browser and it works. Upload the folder to any host and
it works. There is nothing to compile.

---

## Structure

```
level-nexus/
├── index.html · materials.html · services.html · about.html · platform.html · contact.html · 404.html
├── css/
│   ├── sectors.css         Sector accent colours (load first)
│   ├── style.css           The whole design system — tokens, header, hero, cards, forms, footer
│   └── platform.css        Platform page, photo/video frames, Facebook card
├── js/                     config · nav · ui · hero-register · register · forms · main
│                           + zoom.js (lightbox, index & platform) and facebook.js (index)
├── data/                   materials.js (used by the site) + materials.json
├── assets/
│   ├── img/                logos, hero-mesh.svg, og-image.jpg, graphics/, photos/, partners/, platform/
│   ├── icons/              favicons + apple-touch + maskable
│   └── video/              crest-motion.mp4 (seamless hero-crest loop) + poster in img/graphics/
├── build-logo-assets.py    Rebuilds the logo PNGs from assets/img/logo-source.jpg (numpy, run manually)
├── CNAME · robots.txt · sitemap.xml · site.webmanifest · favicon.ico
└── _dev/                   Local only — backups, probe harness, scratch captures, media staging.
                            Excluded from the deployment zip; delete freely.
```

CSS load order: `sectors.css` → `style.css` → `platform.css`.

`_dev/` holds nothing the site loads. `backups/` are pre-edit snapshots of the HTML/CSS/JS,
`probes/` is the old headless-Chrome check harness, `scratch/` is throwaway capture scripts and
screenshots, and `media-output/` is the raw AI-generation staging folder for the card photos and
the crest video (all already optimised into `assets/`).

---

## Why plain `<script>` tags and not ES modules

ES modules fail with a CORS error when a page is opened straight from disk
(`file://`), which makes local previewing awkward for anyone without a dev
server. Each file here is still a self-contained module — it just registers
itself on a shared `window.LN` namespace instead of using `import`/`export`.

Every module exposes an `init()` that exits quietly if its markup is absent, so
all six pages can load the identical set of scripts.

To switch to real ES modules later: change each IIFE to `export default`, change
`main.js` to import them, and add `type="module"` to the script tag.

---

## The Materials Register

**252 unique programmes across 16 sectors**, parsed from
`QCTO_and_Legacy_Materials_Register.docx`.

The source document lists 288 rows, but a number appear twice across its two
listings (Carpenter, Millwright, Bodyguard, Chemical Hair Reformation and
several SP codes among them). Those were merged rather than counted twice, so
the site says 252 rather than the ~260 estimate.

Every record looks like this:

```js
{
  "id": "lnx-042",
  "code": "91761",                    // SAQA ID, SP code, or MQA code
  "codeType": "QCTO",                 // QCTO | SP | MQA | OTHER
  "badge": "QCTO",                    // what shows in the code chip
  "title": "Electrician",             // cleaned of prefixes and issuer noise
  "qualification": "Occupational Certificate",
  "sector": "Electrical & Energy",
  "sectorSlug": "electrical",
  "search": "electrician 91761 …"     // pre-lowercased haystack
}
```

`search` is a pre-built lowercase string of title + code + sector +
qualification + badge. Filtering is a single `indexOf` per record against 252
records held in memory, so it stays instant with no network call per keystroke.

### Editing the register

Edit `data/materials.js` directly — it is a plain array. Add, remove or correct
entries and the site picks it up on reload.

Two things to keep in sync when you add a record:

1. Add a matching `search` string (lowercase, containing everything you want
   that record to be findable by).
2. Update the `meta` block at the top: `total`, and the relevant `count` in
   `meta.sectors` and `meta.types`.

The counts printed on the site (hero stats, "Search 252 programmes", sector
chips, About page facts) all read from `meta`, so they correct themselves once
`meta` is right. Anything marked `data-count="materials"` or
`data-count="sectors"` is filled in at runtime.

If you add a **new sector**, also add its colour token to `css/sectors.css` as
`--sector-<slug>`.

`data/materials.json` is not loaded by the site. It exists so a backend or API
can consume the same dataset later. Keep it in step if you plan to use it.

### Deep links

The register reads and writes the query string, so any filtered view is
shareable:

```
materials.html?q=welder
materials.html?sector=Mining%20%26%20Minerals
materials.html?sector=ICT%20%26%20Digital&type=QCTO
```

Invalid sector or type values in a URL are ignored rather than producing an
empty page. Footer and sector-cloud links use this.

---

## Contact form

There is no backend. The form validates fully on the client, then falls back to
opening WhatsApp with the whole enquiry pre-filled, so nothing is lost.

To connect a real handler, set one line in `js/forms.js`:

```js
var ENDPOINT = 'https://formspree.io/f/xxxxxxx';
```

It will then `POST` JSON:

```json
{
  "name": "…", "company": "…", "email": "…", "phone": "…",
  "interest": "…", "message": "…",
  "submittedAt": "2026-08-01T09:14:22.000Z",
  "source": "/contact.html"
}
```

Works as-is with Formspree, Netlify Forms (add `netlify` to the `<form>` tag),
Basin, or your own endpoint. A honeypot field (`_hp`) is already in place and is
stripped from the payload.

---

## Changing contact details

`js/config.js` is the single source of truth for the WhatsApp number, phone and
email. Anything with a `data-wa` attribute gets its `href` built from it at
runtime, so the number appears in one place in the JS.

Note that the number is *also* hard-coded as the `href` fallback in the HTML, so
the links still work if JavaScript fails. If you change the number, search the
project for `27847624831` and update those fallbacks too.

---

## Design

Modelled on the King's College Doha redesign (utility bar, sticky header with
dropdowns, diagonal-cut hero, glass pill buttons, gradient cards with corner
triangles, slide-out mobile panel), re-coloured navy · teal · amber.

| Token | Value |
|---|---|
| Navy | `#153A77` |
| Teal | `#0FD3C4` |
| Amber | `#FE9A36` |
| Ink | `#0B1F3F` |

Type: **Montserrat** for text, **JetBrains Mono** for codes and labels.

### Corner treatment

Card and panel surfaces are **diagonal-radius**, not uniformly rounded: two
opposite corners are rounded and the other two stay square. Three tokens drive
it in `css/style.css` — `--r-diag` (22px, large surfaces), `--r-diag-md` (16px,
standard cards) and `--r-diag-sm` (12px, small surfaces). Each is written in
TL/TR/BR/BL order, so `22px 0 22px 0` rounds top-left and bottom-right. Buttons,
pills, chips, code badges and circular avatars deliberately stay at `999px` /
`50%` — they are not part of the scheme.

### Feature-card media and the crest loop

The three homepage feature cards each carry a photograph under a diagonal brand
wash (navy · teal · amber — `assets/img/photos/ph-card-*.jpg`), with the original
card gradient retained underneath as the load-in fallback. The crest panel plays
a 5.5s seamless line-art loop (`assets/video/crest-motion.mp4`; muted,
`playsinline`, `loop`, opacity 0.34 desktop / 0.26 mobile) behind the static logo
mark, which stays a crisp PNG and breathes on its own 9s animation. The wash and
the loop are both gated by `prefers-reduced-motion`, and the video degrades to
its poster frame (`assets/img/graphics/gr-crest-motion-poster.jpg`) plus the
panel gradient if it cannot load.

## Accessibility

Verified in-browser rather than assumed:

- Skip link is the first tab stop; visible teal focus ring throughout.
- Mobile drawer traps focus, closes on <kbd>Esc</kbd>, returns focus to the
  toggle, and is `inert` while closed.
- Search results announce their count via `role="status"`.
- All text pairs meet WCAG AA (≥4.5:1). The WhatsApp green was darkened from
  `#1FAF54` to `#12833C` because brand green with white text only reaches
  2.87:1.
- All controls are at least 44px tall.
- `prefers-reduced-motion` stops the console loop, the caret blink, the live
  pulse and all scroll reveals.
- One `<h1>` per page, semantic landmarks, every image has `alt` text.
- No horizontal scroll at 360px on any page.

---

## Deployment

Upload the folder as-is — no build, no Node, no environment variables. The only
thing to leave behind is `_dev/`, which nothing in the site references; the
handed-over zip already excludes it.

Before going live, replace `https://www.levelnexus.co.za` with the real domain
in `sitemap.xml`, `robots.txt`, and the `canonical` / `og:url` tags at the top
of each HTML file.

Suggested headers if your host allows them:

```
Cache-Control: public, max-age=31536000, immutable   # /assets/*
Cache-Control: public, max-age=3600                  # *.html
```

---

## Known gaps

- Social links in the footer are `href="#"` placeholders — real profiles not
  supplied.
- The contact form has no backend (see above).
- No analytics is installed.
- The register's "last reviewed" date on `materials.html` is hard-coded as
  August 2026; update it when you revise the data.
