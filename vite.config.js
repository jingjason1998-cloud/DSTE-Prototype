import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';

// 读取 package.json 版本号
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
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
    hmr: false,
  },
  preview: {
    port: 3456,
  },
  // Static assets that should NOT be processed as modules (images, fonts, etc.)
  // CSS/JS files in assets/ should still be processed by Vite
  assetsInclude: ['assets/**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot,mp4,webm}'],
  plugins: [
    {
      name: 'copy-shell-css',
      closeBundle() {
        try {
          mkdirSync('dist/src/styles', { recursive: true });
          copyFileSync('src/styles/shell.css', 'dist/src/styles/shell.css');
        } catch (e) {
          console.error('Failed to copy shell.css:', e.message);
        }
      }
    }
  ],
});
