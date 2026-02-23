import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

function normalizeBasePath(input) {
  const value = (input || '/').trim();
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function fail(message) {
  console.error(`[verify:publication] ${message}`);
  process.exitCode = 1;
}

async function fileExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const htmlFiles = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      htmlFiles.push(...(await walkHtmlFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(entryPath);
    }
  }

  return htmlFiles;
}

function expectedSitemapUrl(siteUrl, basePath) {
  return new URL(`${basePath}sitemap.xml`, siteUrl).toString();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMetaContent(html, attrName, attrValue) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*${attrName}=["']${escapeRegex(attrValue)}["'][^>]*content=["']([^"']+)["'][^>]*>|<meta\\s+[^>]*content=["']([^"']+)["'][^>]*${attrName}=["']${escapeRegex(attrValue)}["'][^>]*>`,
    'i'
  );
  const match = html.match(pattern);
  return match?.[1] || match?.[2] || null;
}

function parsePngMetadata(buffer) {
  if (buffer.length < 24) return null;
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];

  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[i] !== signature[i]) return null;
  }

  const ihdrName = buffer.subarray(12, 16).toString('ascii');
  if (ihdrName !== 'IHDR') return null;

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function urlToDistPath(url, basePath) {
  const normalizedBase = normalizeBasePath(basePath);
  const pathname = url.pathname;

  if (!pathname.startsWith(normalizedBase)) {
    return null;
  }

  const relative = pathname.slice(normalizedBase.length).replace(/^\/+/, '');
  return path.join(distDir, relative);
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function verifyRobots(siteUrl, basePath) {
  const robotsPath = path.join(distDir, 'robots.txt');
  if (!(await fileExists(robotsPath))) {
    fail('dist/robots.txt is missing.');
    return;
  }

  const robots = await readFile(robotsPath, 'utf8');
  const expected = expectedSitemapUrl(siteUrl, basePath);
  if (!robots.includes(`Sitemap: ${expected}`)) {
    fail(`robots sitemap mismatch. Expected: ${expected}`);
  }
}

async function verifySitemap(siteUrl, basePath) {
  const sitemapAliasPath = path.join(distDir, 'sitemap.xml');
  const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');

  if (!(await fileExists(sitemapAliasPath))) {
    fail('dist/sitemap.xml is missing.');
    return;
  }
  if (!(await fileExists(sitemapIndexPath))) {
    fail('dist/sitemap-index.xml is missing.');
    return;
  }

  const sitemapAlias = await readFile(sitemapAliasPath, 'utf8');
  const sitemapIndex = await readFile(sitemapIndexPath, 'utf8');

  if (sitemapAlias.includes('#') || sitemapIndex.includes('#')) {
    fail('sitemap.xml contains fragment URLs (#...), which are not canonical.');
  }

  if (!sitemapAlias.includes('<sitemapindex') || !sitemapIndex.includes('<sitemapindex')) {
    fail('Expected sitemap alias and sitemap-index to contain <sitemapindex>.');
    return;
  }

  const expectedOrigin = new URL(siteUrl).origin;
  const childSitemapUrls = extractLocs(sitemapIndex);

  if (childSitemapUrls.length === 0) {
    fail('sitemap-index.xml contains no child sitemap <loc> entries.');
    return;
  }

  for (const childUrlRaw of childSitemapUrls) {
    const childUrl = new URL(childUrlRaw);
    if (childUrl.origin !== expectedOrigin) {
      fail(`sitemap URL has wrong origin: ${childUrlRaw}`);
      continue;
    }

    if (!childUrl.pathname.startsWith(basePath)) {
      fail(`sitemap URL does not respect BASE_PATH (${basePath}): ${childUrlRaw}`);
      continue;
    }

    const childDistPath = urlToDistPath(childUrl, basePath);
    if (!childDistPath || !(await fileExists(childDistPath))) {
      fail(`Child sitemap is missing in dist: ${childUrlRaw}`);
      continue;
    }

    const childSitemap = await readFile(childDistPath, 'utf8');
    if (childSitemap.includes('#')) {
      fail(`Child sitemap contains fragment URLs: ${childUrlRaw}`);
      continue;
    }

    const pageLocs = extractLocs(childSitemap);
    if (pageLocs.length === 0) {
      fail(`Child sitemap contains no URL entries: ${childUrlRaw}`);
      continue;
    }

    for (const pageLoc of pageLocs) {
      const pageUrl = new URL(pageLoc);
      if (pageUrl.origin !== expectedOrigin) {
        fail(`sitemap URL has wrong origin: ${pageLoc}`);
      }

      if (!pageUrl.pathname.startsWith(basePath)) {
        fail(`sitemap URL does not respect BASE_PATH (${basePath}): ${pageLoc}`);
      }
    }
  }
}

async function verifyCanonical(siteUrl, basePath) {
  const htmlFiles = await walkHtmlFiles(distDir);
  if (htmlFiles.length === 0) {
    fail('No HTML files found in dist/ to validate canonical URLs.');
    return;
  }

  const expectedOrigin = new URL(siteUrl).origin;

  for (const htmlPath of htmlFiles) {
    const html = await readFile(htmlPath, 'utf8');
    const match = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
    if (!match) {
      fail(`Missing canonical link in ${path.relative(rootDir, htmlPath)}`);
      continue;
    }

    const canonical = new URL(match[1]);
    if (canonical.origin !== expectedOrigin) {
      fail(`Canonical origin mismatch in ${path.relative(rootDir, htmlPath)}: ${canonical.toString()}`);
    }
    if (!canonical.pathname.startsWith(basePath)) {
      fail(`Canonical path does not respect BASE_PATH (${basePath}) in ${path.relative(rootDir, htmlPath)}: ${canonical.toString()}`);
    }
  }
}

async function verifySocialMetadata(siteUrl, basePath) {
  const htmlFiles = await walkHtmlFiles(distDir);
  if (htmlFiles.length === 0) return;

  const expectedOrigin = new URL(siteUrl).origin;
  const imageUrls = new Set();

  for (const htmlPath of htmlFiles) {
    const relativePath = path.relative(rootDir, htmlPath);
    const html = await readFile(htmlPath, 'utf8');

    const ogImage = getMetaContent(html, 'property', 'og:image');
    const twitterImage = getMetaContent(html, 'name', 'twitter:image');
    const ogImageType = getMetaContent(html, 'property', 'og:image:type');
    const ogImageWidth = getMetaContent(html, 'property', 'og:image:width');
    const ogImageHeight = getMetaContent(html, 'property', 'og:image:height');

    if (!ogImage) {
      fail(`Missing og:image in ${relativePath}`);
      continue;
    }
    if (!twitterImage) {
      fail(`Missing twitter:image in ${relativePath}`);
      continue;
    }

    for (const rawUrl of [ogImage, twitterImage]) {
      let parsed;
      try {
        parsed = new URL(rawUrl);
      } catch {
        fail(`Invalid social image URL in ${relativePath}: ${rawUrl}`);
        continue;
      }

      if (parsed.origin !== expectedOrigin) {
        fail(`Social image URL origin mismatch in ${relativePath}: ${rawUrl}`);
      }
      if (!parsed.pathname.startsWith(basePath)) {
        fail(`Social image URL does not respect BASE_PATH (${basePath}) in ${relativePath}: ${rawUrl}`);
      }

      imageUrls.add(parsed.toString());
    }

    if (ogImageType && ogImageType !== 'image/png') {
      fail(`og:image:type must be image/png in ${relativePath}`);
    }
    if (ogImageWidth && ogImageWidth !== '1200') {
      fail(`og:image:width must be 1200 in ${relativePath}`);
    }
    if (ogImageHeight && ogImageHeight !== '630') {
      fail(`og:image:height must be 630 in ${relativePath}`);
    }
  }

  for (const rawUrl of imageUrls) {
    const parsedUrl = new URL(rawUrl);
    const filePath = urlToDistPath(parsedUrl, basePath);

    if (!filePath) {
      fail(`Cannot map social image URL to dist path: ${rawUrl}`);
      continue;
    }

    if (!(await fileExists(filePath))) {
      fail(`Missing social image file for URL ${rawUrl} (expected ${path.relative(rootDir, filePath)})`);
      continue;
    }

    const data = await readFile(filePath);
    const pngInfo = parsePngMetadata(data);
    if (!pngInfo) {
      fail(`Social image is not a valid PNG: ${path.relative(rootDir, filePath)}`);
      continue;
    }

    if (pngInfo.width !== 1200 || pngInfo.height !== 630) {
      fail(
        `Social image dimensions must be 1200x630 in ${path.relative(rootDir, filePath)} (found ${pngInfo.width}x${pngInfo.height})`
      );
    }
  }
}

async function verifyHeaders() {
  const headersPath = path.join(distDir, '_headers');
  if (!(await fileExists(headersPath))) {
    fail('dist/_headers is missing.');
    return;
  }

  const headers = await readFile(headersPath, 'utf8');
  const required = [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'X-Frame-Options: SAMEORIGIN',
    '/_astro/*',
    'immutable'
  ];

  for (const token of required) {
    if (!headers.includes(token)) {
      fail(`_headers is missing required rule/token: ${token}`);
    }
  }
}

async function main() {
  const siteUrl = process.env.SITE_URL;
  const basePath = normalizeBasePath(process.env.BASE_PATH || '/');

  if (!siteUrl) {
    console.warn('[verify:publication] SITE_URL is not set. Skipping publication URL checks.');
    await verifyHeaders();
    return;
  }

  await verifyRobots(siteUrl, basePath);
  await verifySitemap(siteUrl, basePath);
  await verifyCanonical(siteUrl, basePath);
  await verifySocialMetadata(siteUrl, basePath);
  await verifyHeaders();

  if (!process.exitCode) {
    console.log('[verify:publication] Publication checks passed.');
  }
}

main().catch((error) => {
  console.error(`[verify:publication] Unexpected error: ${error.message}`);
  process.exit(1);
});
