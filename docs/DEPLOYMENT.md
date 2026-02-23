# Deployment

## GitHub Pages (recommended for GitHub repos)

Publish and validation workflows:
- `.github/workflows/deploy-gh-pages.yml` (production deploy on `main`)
- `.github/workflows/ci.yml` (validation on PRs and non-main pushes)
- `.github/workflows/lighthouse.yml` (Lighthouse gate + optional PageSpeed report)

### Steps

1. Push code to the `main` branch.
2. In GitHub: `Settings > Pages`, set source to **GitHub Actions**.
3. In `Settings > Secrets and variables > Actions > Variables` set:
   - `SITE_URL`: full production URL (required, non-placeholder)
   - `BASE_PATH`: `/` (user/org pages) or `/<repo>/` (project pages)
   - `WEBSITE_ID`: Umami website ID (optional, enables tracking in production)
   - `UMAMI_SCRIPT_URL`: optional script URL (default `https://cloud.umami.is/script.js`)
   - `TWITTER_SITE`: optional X/Twitter handle for social cards
   - `SEO_OG_LOCALE`: optional Open Graph locale (default `en_US`)
   - `PSI_API_KEY`: optional, enables PageSpeed report artifacts in Lighthouse workflow
4. Every push to `main` triggers automatic build and deploy.

### Build settings used by the workflow

- Node: 20
- Install: `npm ci`
- Build: `npm run build` (automatically includes `npm run sync:hacs`)
- Validation: `npm run verify:publication` (robots/sitemap/canonical/headers checks)
- Output: `dist`
- Strict data fetch: `HACS_FETCH_STRICT=true`
- Sitemap output: `dist/sitemap-index.xml` + compatibility alias `dist/sitemap.xml`

## Cloudflare Pages (Direct Build from GitHub)

### Steps

1. Create a new Pages project connected to the repository.
2. Set:
   - Build command: `npm run build` (automatically includes `npm run sync:hacs`)
   - Build output directory: `dist`
3. Set environment variables:
   - `SITE_URL`: public Cloudflare Pages URL
   - `BASE_PATH`: `/`
   - `HACS_FETCH_STRICT`: `true`
   - `HACS_FETCH_TIMEOUT_MS`: `30000`
   - `WEBSITE_ID`: Umami website ID (optional)
   - `UMAMI_SCRIPT_URL`: optional script URL (default `https://cloud.umami.is/script.js`)
   - `TWITTER_SITE`: optional X/Twitter handle for social cards
   - `SEO_OG_LOCALE`: optional Open Graph locale (default `en_US`)
4. Deploy.

## Cloudflare Workers (Wrangler assets deploy)

Use this mode when your platform runs an explicit deploy command like `npx wrangler deploy`.

### Steps

1. Build the site (`npm run build`) so `dist/` exists.
2. Deploy with Wrangler:
   - `npx wrangler deploy`
3. Set environment variables:
   - `SITE_URL`: public Cloudflare Workers/custom-domain URL
   - `BASE_PATH`: `/`
   - `HACS_FETCH_STRICT`: `true`
   - `HACS_FETCH_TIMEOUT_MS`: `30000`
   - `WEBSITE_ID`: Umami website ID (optional)
   - `UMAMI_SCRIPT_URL`: optional script URL (default `https://cloud.umami.is/script.js`)
   - `TWITTER_SITE`: optional X/Twitter handle for social cards
   - `SEO_OG_LOCALE`: optional Open Graph locale (default `en_US`)

This repo includes `wrangler.jsonc` with `assets.directory: "./dist"`, so Wrangler publishes the static build output.

## Environment matrix

| Variable | GitHub Pages (user/org) | GitHub Pages (project) | Cloudflare Pages |
|---|---|---|---|
| `SITE_URL` | `https://<user>.github.io` | `https://<user>.github.io` | `https://<project>.pages.dev` or custom domain |
| `BASE_PATH` | `/` | `/<repo>/` | `/` |
| `HACS_FETCH_STRICT` | `true` | `true` | `true` |
| `HACS_FETCH_TIMEOUT_MS` | `30000` | `30000` | `30000` |
| `WEBSITE_ID` | optional | optional | optional |
| `UMAMI_SCRIPT_URL` | optional | optional | optional |

## Custom domain

With a custom domain on either platform:
- update `SITE_URL` to the final public URL
- re-run deployment
- verify canonical, sitemap, and social metadata point to the custom domain

## Post-deploy checks

Run this checklist on the deployed domain:
1. Homepage: `https://<domain>/` returns `200`.
2. Robots: `https://<domain>/<base-path-if-any>robots.txt` contains absolute sitemap URL.
3. Sitemap: `https://<domain>/<base-path-if-any>sitemap.xml` has no fragment URLs (`#...`).
4. Canonical: page source canonical URL matches `SITE_URL` + `BASE_PATH`.
5. Static headers: `_headers` rules applied (cache/security).
6. Filters/sorting/compare UI all work in production.
7. RSS endpoint responds: `https://<domain>/<base-path-if-any>rss.xml`.

## Troubleshooting

- Canonical/sitemap point to wrong domain
  - Ensure `SITE_URL` matches the deployed public URL exactly.
- Routes broken on GitHub Pages project site
  - Ensure `BASE_PATH=/<repo>/`.
- Build fails due to HACS download
  - Increase `HACS_FETCH_TIMEOUT_MS` (for example `45000`) and retry.
- Lighthouse job fails with Chrome lookup
  - Keep `.github/workflows/lighthouse.yml` step `browser-actions/setup-chrome@v1` enabled.
- Deploy workflow fails with placeholder URL
  - Set `SITE_URL` in GitHub repository variables.
