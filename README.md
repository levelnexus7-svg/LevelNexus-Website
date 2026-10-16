# Level Nexus website

Static site, no framework. `build.mjs` turns `src/` and `static/` into `dist/`, and a GitHub Action publishes `dist/` to GitHub Pages.

```
node build.mjs        # writes dist/
npx serve dist        # preview at http://localhost:3000
```

## Layout

```
src/pages/*.html       Page bodies (home, services, platform, about, contact, privacy). First line is a <!--meta {...}--> block
                       with path, title, description and optional FAQ / JSON-LD.
src/partials/          Shared header, footer, floating buttons.
src/data/materials.json   The register: single source of truth. Edit this, then rebuild.
src/data/sector-copy.json Copy for the 16 sector pages.
static/                Copied as-is: css/, js/, assets/, favicon, manifest.
build.mjs              Builds every page, the Materials Register table, 16 sector pages, legacy .html stubs,
                       sitemap.xml, robots.txt, 404.html and one bundled stylesheet (css/all.css).
.github/workflows/pages.yml  Builds and deploys dist/ to GitHub Pages on every push to main.
```

## URLs

Pages are folders (`/about/`, `/materials/`, `/materials/health-safety/`). The old `*.html` addresses are kept as tiny stubs
that point to the new URL with a canonical tag and a redirect. In the repo's Settings > Pages, set Source to "GitHub Actions" and enforce HTTPS.
The canonical host is `levelnexus.co.za` (matches `CNAME`).

## Editing the register

1. Edit `src/data/materials.json` (`materials[]` and the counts in `meta`).
2. `node build.mjs`. The table, sector pages, counts, sitemap and the homepage console data all regenerate.

## Contact form

Set `ENDPOINT` in `static/js/forms.js` to a handler (Formspree, Web3Forms, etc.). Until then the form opens WhatsApp with the enquiry filled in.
The shortlist sends `?items=` and the Platform page sends `?interest=` to pre-fill the form.

## Not yet done

See CHECKLIST.md at the root of the delivered pack.

## Backgrounds, register and palette (v9)
- `static/js/fx.js` draws the animated triangle mesh into every `.hero-bg` / `.band-bg` (canvas, no images). Palette stops are at the top of the file.
- `static/css/refresh.css` holds the v9 changes: unified blue-teal dark surfaces, card-style Materials Register, Platform page layout, phone fixes. It loads after `polish.css` and before `mobile.css`.
- The register is the same table markup shown as cards via CSS; sorting is the `#sort-select` dropdown, filters are the rail/segments (desktop) or the two selects (phones).
