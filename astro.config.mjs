import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://example.com',
  base: process.env.BASE_PATH || '/',
  vite: {
    plugins: [tailwindcss()]
  }
});
