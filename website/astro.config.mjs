import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://navarroido.github.io',
  base: '/Woocommerce-skill',
  output: 'static',
  build: {
    assets: 'assets',
  },
});
