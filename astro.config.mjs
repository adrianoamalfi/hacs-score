import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') return '/';
  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`;
}

function getDefaultBasePath() {
  const repoRef = process.env.GITHUB_REPOSITORY;
  if (!repoRef) return '/';

  const [owner, repo] = repoRef.split('/');
  if (!owner || !repo) return '/';

  return repo === `${owner}.github.io` ? '/' : `/${repo}/`;
}

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://example.com',
  base: normalizeBasePath(process.env.BASE_PATH || getDefaultBasePath()),
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});
