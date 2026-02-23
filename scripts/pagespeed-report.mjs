import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportDir = path.join(rootDir, 'reports', 'pagespeed');

function normalizeBasePath(input = '/') {
  const value = input.trim() || '/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function getBaseUrl(siteUrl, basePath) {
  const normalizedSite = siteUrl?.trim();
  if (!normalizedSite || normalizedSite === 'https://example.com') {
    return null;
  }

  const normalizedBase = normalizeBasePath(basePath);
  const site = new URL(normalizedSite);
  site.pathname = normalizedBase;
  site.search = '';
  site.hash = '';
  return site.toString();
}

async function fetchPageSpeed(apiKey, url) {
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.set('category', 'performance');
  endpoint.searchParams.set('category', 'accessibility');
  endpoint.searchParams.set('category', 'best-practices');
  endpoint.searchParams.set('category', 'seo');
  endpoint.searchParams.set('key', apiKey);

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`PageSpeed request failed (${response.status})`);
  }

  const data = await response.json();
  const categories = data?.lighthouseResult?.categories || {};

  return {
    url,
    scores: {
      performance: categories.performance?.score ?? null,
      accessibility: categories.accessibility?.score ?? null,
      bestPractices: categories['best-practices']?.score ?? null,
      seo: categories.seo?.score ?? null
    },
    fetchedAt: new Date().toISOString()
  };
}

function formatScore(value) {
  if (value === null || value === undefined) return 'n/a';
  return `${Math.round(Number(value) * 100)}`;
}

async function main() {
  const apiKey = process.env.PSI_API_KEY?.trim();
  if (!apiKey) {
    console.log('[pagespeed] PSI_API_KEY not set. Skipping report generation.');
    return;
  }

  const baseUrl = getBaseUrl(process.env.SITE_URL, process.env.BASE_PATH || '/');
  if (!baseUrl) {
    console.log('[pagespeed] SITE_URL missing or placeholder. Skipping report generation.');
    return;
  }

  const rootUrl = new URL('.', baseUrl).toString();
  const blogUrl = new URL('blog/', baseUrl).toString();
  const targets = [rootUrl, blogUrl];

  const results = [];
  for (const target of targets) {
    try {
      const result = await fetchPageSpeed(apiKey, target);
      results.push(result);
    } catch (error) {
      results.push({
        url: target,
        error: error instanceof Error ? error.message : String(error),
        fetchedAt: new Date().toISOString()
      });
    }
  }

  await mkdir(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, 'pagespeed-report.json');
  await writeFile(jsonPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');

  const lines = ['# PageSpeed Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const result of results) {
    lines.push(`## ${result.url}`);
    if (result.error) {
      lines.push(`- error: ${result.error}`, '');
      continue;
    }
    lines.push(`- performance: ${formatScore(result.scores.performance)}`);
    lines.push(`- accessibility: ${formatScore(result.scores.accessibility)}`);
    lines.push(`- best-practices: ${formatScore(result.scores.bestPractices)}`);
    lines.push(`- seo: ${formatScore(result.scores.seo)}`);
    lines.push('');
  }

  const mdPath = path.join(reportDir, 'pagespeed-report.md');
  await writeFile(mdPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`[pagespeed] wrote ${path.relative(rootDir, jsonPath)} and ${path.relative(rootDir, mdPath)}`);
}

await main();
