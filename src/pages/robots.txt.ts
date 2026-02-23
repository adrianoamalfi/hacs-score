function normalizeBasePath(input: string | undefined): string {
  const value = (input || '/').trim();
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function joinPath(basePath: string, path: string): string {
  if (path === '/') return basePath;
  return `${basePath}${path.replace(/^\/+/, '')}`;
}

export async function GET(context: { site?: URL }) {
  const site = context.site || new URL('https://example.com');
  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const sitemapUrl = new URL(joinPath(basePath, 'sitemap.xml'), site).toString();

  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

