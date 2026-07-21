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
        meetings: resolve(__dirname, 'src/meetings.html'),
        'strategy-map': resolve(__dirname, 'src/strategy-map.html'),
        'strategy-map-list': resolve(__dirname, 'src/strategy-map-list.html'),
        'employee-directory': resolve(__dirname, 'src/employee-directory.html'),
        'requirement-pool': resolve(__dirname, 'src/requirement-pool.html'),
        'rule-engine': resolve(__dirname, 'src/rule-engine.html'),
        'at-issue-tracking': resolve(__dirname, 'src/at-issue-tracking.html'),
        'st-issue-tracking': resolve(__dirname, 'src/st-issue-tracking.html'),
      },
    },
  },
  // esbuild >= 0.28.1 requires explicit support flag for destructuring
  // in target environments that still list older browsers (chrome87/edge88/etc.)
  esbuild: {
    supported: {
      destructuring: true,
    },
  },
  server: {
    port: 3456,
    open: '/src/cockpit.html',
    hmr: false,
    allowedHosts: ['dste.jasonxspace.cc'],
    // 本地开发：仅代理 AI 端点到生产 Worker（已修复），便于本地走真实 Kimi。
    // 限定 /api/ai 是为了避免本地会议/议题等写操作误打到生产 KV。
    // 全量本地开发仍走 cloudflare tunnel（dste.jasonxspace.cc）方案。
    proxy: {
      '/api/ai': {
        target: 'https://api.dste.jasonxspace.cc',
        changeOrigin: true, // 改写 Host，命中 Worker 自定义域名路由
        secure: true,
      },
      // CAS 登录 / 会话校验：代理到真实 Worker，避免隧道域名下相对 /api/auth 落到 vite
      // HTML fallback 导致 resp.json() 抛错、登录静默失败。仅鉴权端点，不含业务数据写操作。
      '/api/auth': {
        target: 'https://api.dste.jasonxspace.cc',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 3456,
    allowedHosts: ['dste.jasonxspace.cc'],
  },
  // Static assets that should NOT be processed as modules (images, fonts, etc.)
  // CSS/JS files in assets/ should still be processed by Vite
  assetsInclude: ['assets/**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot,mp4,webm}'],
  plugins: [
    {
      name: 'copy-static-files',
      closeBundle() {
        try {
          mkdirSync('dist/src/styles', { recursive: true });
          copyFileSync('src/styles/shell.css', 'dist/src/styles/shell.css');
          // Copy reviewer main.js (non-module script, Vite won't bundle it)
          mkdirSync('dist/src/pages/reviewer', { recursive: true });
          copyFileSync('src/pages/reviewer/main.js', 'dist/src/pages/reviewer/main.js');
        } catch (e) {
          console.error('Failed to copy static files:', e.message);
        }
      }
    }
  ],
});
