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
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  if (!(await fileExists(sitemapPath))) {
    fail('dist/sitemap.xml is missing.');
    return;
  }

  const sitemap = await readFile(sitemapPath, 'utf8');
  if (sitemap.includes('#')) {
    fail('sitemap.xml contains fragment URLs (#...), which are not canonical.');
  }

  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (locs.length === 0) {
    fail('sitemap.xml contains no <loc> entries.');
    return;
  }

  const expectedOrigin = new URL(siteUrl).origin;
  for (const loc of locs) {
    const url = new URL(loc);
    if (url.origin !== expectedOrigin) {
      fail(`sitemap URL has wrong origin: ${loc}`);
    }

    if (!url.pathname.startsWith(basePath)) {
      fail(`sitemap URL does not respect BASE_PATH (${basePath}): ${loc}`);
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
  await verifyHeaders();

  if (!process.exitCode) {
    console.log('[verify:publication] Publication checks passed.');
  }
}

main().catch((error) => {
  console.error(`[verify:publication] Unexpected error: ${error.message}`);
  process.exit(1);
});

