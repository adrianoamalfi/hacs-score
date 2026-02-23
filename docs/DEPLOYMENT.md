# Deployment

## GitHub Pages (recommended for GitHub repos)

Publish and validation workflows:
- `.github/workflows/deploy-gh-pages.yml` (production deploy on `main`)
- `.github/workflows/ci.yml` (validation on PRs and non-main pushes)

### Steps

1. Push code to the `main` branch.
2. In GitHub: `Settings > Pages`, set source to **GitHub Actions**.
3. In `Settings > Secrets and variables > Actions > Variables` set:
   - `SITE_URL`: full production URL (required, non-placeholder)
   - `BASE_PATH`: `/` (user/org pages) or `/<repo>/` (project pages)
4. Every push to `main` triggers automatic build and deploy.

### Build settings used by the workflow

- Node: 20
- Install: `npm ci`
- Build: `npm run build` (automatically includes `npm run sync:hacs`)
- Validation: `npm run verify:publication` (robots/sitemap/canonical/headers checks)
- Output: `dist`
- Strict data fetch: `HACS_FETCH_STRICT=true`

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
4. Deploy.

## Environment matrix

| Variable | GitHub Pages (user/org) | GitHub Pages (project) | Cloudflare Pages |
|---|---|---|---|
| `SITE_URL` | `https://<user>.github.io` | `https://<user>.github.io` | `https://<project>.pages.dev` or custom domain |
| `BASE_PATH` | `/` | `/<repo>/` | `/` |
| `HACS_FETCH_STRICT` | `true` | `true` | `true` |
| `HACS_FETCH_TIMEOUT_MS` | `30000` | `30000` | `30000` |

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

## Troubleshooting

- Canonical/sitemap point to wrong domain
  - Ensure `SITE_URL` matches the deployed public URL exactly.
- Routes broken on GitHub Pages project site
  - Ensure `BASE_PATH=/<repo>/`.
- Build fails due to HACS download
  - Increase `HACS_FETCH_TIMEOUT_MS` (for example `45000`) and retry.
- Deploy workflow fails with placeholder URL
  - Set `SITE_URL` in GitHub repository variables.
