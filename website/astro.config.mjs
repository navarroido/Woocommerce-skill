import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://agenticwoo.dev',
  base: '/',
  output: 'static',
  build: {
    assets: 'assets',
  },
});
