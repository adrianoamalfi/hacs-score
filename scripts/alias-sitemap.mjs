import { access, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');
const sitemapAliasPath = path.join(distDir, 'sitemap.xml');

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(sitemapIndexPath))) {
    console.warn('[alias:sitemap] dist/sitemap-index.xml not found. Skipping alias generation.');
    return;
  }

  await copyFile(sitemapIndexPath, sitemapAliasPath);
  console.log('[alias:sitemap] copied sitemap-index.xml -> sitemap.xml');
}

await main();
