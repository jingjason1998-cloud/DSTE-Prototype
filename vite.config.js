import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cockpit: resolve(__dirname, 'src/cockpit.html'),
        reviewer: resolve(__dirname, 'src/reviewer.html'),
        'business-topics': resolve(__dirname, 'src/business-topics.html'),
      },
    },
  },
  server: {
    port: 3456,
    open: '/src/cockpit.html',
  },
  preview: {
    port: 3456,
  },
  // Static assets that should NOT be processed as modules (images, fonts, etc.)
  // CSS/JS files in assets/ should still be processed by Vite
  assetsInclude: ['assets/**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot,mp4,webm}'],
});
