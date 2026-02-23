# HACS Showcase

Static showcase for HACS integrations (Home Assistant Community Store), built with Astro.

## Overview

The project includes:
- Hero section with a distinctive visual identity
- Featured integrations section
- Catalog with search, filtering, sorting, confidence filter, and quick presets
- Score explainability (formula block + inline score help)
- Side-by-side comparison workflow (up to 3 integrations)
- Core SEO setup (Open Graph/Twitter meta, canonical, JSON-LD, robots, sitemap)
- Improved mobile UX (sticky controls)
- Baseline accessibility (skip link, focus states, `aria-live`)

## Stack

- **Astro 5** (SSG)
- **Tailwind CSS 4** (utility-first styling)
- **daisyUI 5** (component library for buttons, cards, form controls, badges)
- Vanilla JavaScript for client-side catalog filtering
- Single theme: `hacs-dark` (palette and UI tokens in `src/styles/global.css`)

## Requirements

- Node.js 20+
- npm 9+

## Quick start

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Static output is generated in `dist/`.

## Available scripts

- `npm run dev`: start local development
- `npm run sync:hacs`: download HACS datasets locally
- `npm run build`: static build
- `npm run verify:publication`: validate robots/sitemap/canonical/_headers in `dist`
- `npm run preview`: preview local build
- `npm run test`: run unit tests (Vitest) for catalog + score model logic

## Project structure

```text
.
├── astro.config.mjs
├── package.json
├── public/
│   └── _headers
├── src/
│   ├── components/
│   │   └── IntegrationCard.astro
│   ├── data/
│   │   └── hacs/
│   │       ├── integration-data.json
│   │       ├── integration-repositories.json
│   │       └── last-sync.json
│   ├── lib/
│   │   ├── score-model.ts
│   │   └── score-model.test.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── integration/[slug].astro
│   │   ├── robots.txt.ts
│   │   └── sitemap.xml.ts
│   ├── scripts/
│   │   ├── catalog-core.ts
│   │   ├── catalog.ts
│   │   ├── catalog.worker.ts
│   │   └── catalog.test.ts
│   └── styles/
│       └── global.css
└── .github/workflows/
    ├── ci.yml
    └── deploy-gh-pages.yml
```

## Environment configuration

Variables used in `astro.config.mjs`:

- `SITE_URL`: full production site URL (for example `https://username.github.io`)
- `BASE_PATH`: site base path
  - GitHub Pages user/org site: `/`
  - GitHub Pages project site: `/<repo>/`
  - Cloudflare Pages: usually `/`

Variables used for analytics in `src/layouts/BaseLayout.astro`:
- `WEBSITE_ID`: Umami website ID. Tracking script is included only in production when this variable is set.
- `UMAMI_SCRIPT_URL`: optional Umami script host URL.
  - Default: `https://cloud.umami.is/script.js`
  - Set to your self-hosted endpoint for self-hosted Umami.

Optional variables for social metadata:
- `TWITTER_SITE`: X/Twitter handle to expose in `twitter:site` metadata (example: `@hacs_showcase`)
- `SEO_OG_LOCALE`: Open Graph locale value (default: `en_US`)

## Content management

Integrations data is stored in:
- `src/data/hacs/integration-data.json` (generated)
- `src/data/hacs/integration-repositories.json` (generated)
- `src/data/hacs/last-sync.json` (generated)

Generated files are updated by `npm run sync:hacs`, which is automatically invoked by `npm run build`.

Each integration object supports:

```js
{
  name: 'Name',
  category: 'Category',
  author: 'Author',
  stars: 1234,
  recommendedScore: 78.4,
  scoreConfidence: 74.9,
  featured: true,
  url: 'https://github.com/org/repo',
  description: 'Short description'
}
```

## Catalog filtering and sorting

Implemented in `src/pages/index.astro`:
- Text search
- Category filter
- Minimum stars filter
- Minimum confidence filter
- `featured only` toggle
- Sorting with `Recommended` (composite score) as default
- Async filtering/sorting through Web Worker
- Compare drawer for side-by-side evaluation (up to 3)
- Filter state synced in URL query string (`q`, `category`, `stars`, `updated`, `confidence`, `sort`, `featured`, `compare`)
- `compare` accepts comma-separated slugs, deduplicates while preserving first-seen order, ignores empty values, and is capped to 3 items

Logic is split into:
- `src/scripts/catalog-core.ts` (pure functions + state/query params)
- `src/scripts/catalog.ts` (DOM init + rendering + worker orchestration)
- `src/scripts/catalog.worker.ts` (off-main-thread filter/sort)
- `src/lib/score-model.ts` (shared scoring logic/constants)

## Score model

HACS Score (0–100):
- 50% popularity percentile (from `log1p(stars)`)
- 30% freshness decay (full score for the first 14 days, then exponential decay)
- 20% maintenance health (issue pressure normalized by adoption)

Score Confidence (0–100):
- 60% popularity percentile
- 40% freshness decay

## Integration detail pages

- Static route: `src/pages/integration/[slug].astro`
- Each integration has a dedicated page with:
  - score cockpit (score, confidence, rank)
  - weighted score breakdown aligned with the shared model
  - main metrics (stars, domain, updated)
  - topics
  - repository/issues links
  - related integrations by category

## SEO implementation

- Meta description
- Canonical URL
- Open Graph tags
- Twitter tags
- Dynamic social PNG generation per page (`/og/home.png`, `/og/integration/:slug.png`)
- JSON-LD (`CollectionPage`)
- `src/pages/robots.txt.ts`
- `src/pages/sitemap.xml.ts`

Note: for correct production SEO, set a real `SITE_URL`.

## Accessibility implementation

- Skip link at the top of the page
- Visible focus ring on controls and links
- `aria-live` for filtered result counts
- Improved text/control contrast
- `prefers-reduced-motion` support

## Performance implementation

- Static rendering with Astro
- Filtering and sorting via Web Worker (non-blocking UI)
- Skeleton cards during recalculation
- `preconnect`/`dns-prefetch` for Google Fonts

## Deployment

- GitHub Pages: see `docs/DEPLOYMENT.md`
- Cloudflare Pages: see `docs/DEPLOYMENT.md`

## Publication profile

Production publication is standardized for both GitHub Pages and Cloudflare Pages:
- Static output only (`astro` SSG).
- Per-platform env configuration (`SITE_URL`, `BASE_PATH`).
- Edge header rules via `public/_headers` (cache + security, no redirects).
- CI validation before deploy (`.github/workflows/ci.yml`).
- GitHub production deploy workflow (`.github/workflows/deploy-gh-pages.yml`).

Required environment variables:
- `SITE_URL`: public canonical site URL
- `BASE_PATH`: `/` or `/<repo>/` depending on platform/site type
- `HACS_FETCH_STRICT`: recommended `true` for publish jobs
- `HACS_FETCH_TIMEOUT_MS`: recommended `30000`

Optional analytics environment variables:
- `WEBSITE_ID`: enables Umami tracking in production only when present
- `UMAMI_SCRIPT_URL`: optional override for Umami script URL (cloud fallback if omitted)

## HACS data sync

Endpoints used:
- `https://data-v2.hacs.xyz/integration/data.json`
- `https://data-v2.hacs.xyz/integration/repositories.json`

Script behavior:
- validates payload format (`data.json` = object, `repositories.json` = array)
- saves JSON files to `src/data/hacs/`
- saves a sync report to `src/data/hacs/last-sync.json`
- in CI (`HACS_FETCH_STRICT=true`) the build fails if download fails

## Design customization

Guidelines and customization points:
- `docs/CUSTOMIZATION.md`

## Quick troubleshooting

- `npm: command not found`
  - install Node.js + npm and reopen the terminal
- Broken page on GitHub Pages (asset 404)
  - verify `BASE_PATH`
- Incorrect canonical/OG values
  - verify `SITE_URL`
- Incorrect robots/sitemap domain
  - run `npm run verify:publication` with your deployment env values

## Post-deploy verification

1. Open `https://<domain>/<base-path-if-any>robots.txt` and verify `Sitemap:` absolute URL.
2. Open `https://<domain>/<base-path-if-any>sitemap.xml` and verify no `#` fragment URLs.
3. Check canonical tag in page source matches `SITE_URL` and includes `BASE_PATH`.
4. Confirm compare/filter UI works in production.

## Suggested roadmap

- Integration detail page enhancements (`/integration/[slug]`)
- External data source support (JSON/API)
- CI with automatic lint/check workflow
