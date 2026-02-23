# Changelog

All notable changes to this project are documented in this file.

## Week of February 23, 2026

### Highlights
- Added configurable Umami analytics integration (`WEBSITE_ID`, optional `UMAMI_SCRIPT_URL`) with production-only loading.
- Improved SEO metadata and social image generation for the homepage and integration detail pages.
- Standardized base-path handling with helper utilities and updated integration links for safer multi-platform deployment.
- Refactored HACS integration data loading to use static JSON imports and strengthened error handling.
- Expanded CI/CD workflows to include dataset sync during build and updated deployment configuration for GitHub Pages and Cloudflare Workers.
- Added deployment documentation and configuration updates for Cloudflare Workers.
- Updated catalog plumbing to expose the data catalog URL via `data-catalog-url` for dynamic script retrieval.
- Refreshed data sync metadata (`last-sync`) and tuned font loading behavior.
