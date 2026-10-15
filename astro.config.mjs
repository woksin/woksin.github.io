// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.woksin.com',
  output: 'static',
  trailingSlash: 'ignore',
  redirects: {
    '/resume': '/cv',
    '/about': '/#about',
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
