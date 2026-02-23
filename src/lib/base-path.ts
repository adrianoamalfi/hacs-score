export function normalizeBasePath(input = '/'): string {
  const value = input.trim() || '/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export function withBasePath(pathname: string, basePath = '/'): string {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname;
  }

  const normalizedBase = normalizeBasePath(basePath);
  const cleanedPath = pathname.replace(/^\/+/, '');

  if (!cleanedPath) return normalizedBase;
  if (normalizedBase === '/') return `/${cleanedPath}`;
  return `${normalizedBase}${cleanedPath}`;
}
