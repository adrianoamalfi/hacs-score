import { loadIntegrations } from '../data/hacs/load';

function normalizeBasePath(input: string | undefined): string {
  const value = (input || '/').trim();
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function joinPath(basePath: string, path: string): string {
  if (path === '/') return basePath;
  return `${basePath}${path.replace(/^\/+/, '')}`;
}

export async function GET(context) {
  const site = context.site || new URL('https://example.com');
  const integrations = await loadIntegrations();
  const basePath = normalizeBasePath(import.meta.env.BASE_URL);

  const urls = ['/', ...integrations.map((item) => item.detailsPath)];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `<url><loc>${new URL(joinPath(basePath, path), site).toString()}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
