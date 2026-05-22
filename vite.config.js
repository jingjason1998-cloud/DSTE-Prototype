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
    port: 8080,
    open: '/src/cockpit.html',
  },
  preview: {
    port: 8080,
  },
  // Don't try to process assets/ as modules - they're static files
  assetsInclude: ['assets/**/*'],
});
