#!/usr/bin/env node
/**
 * 从 assets/js/phosphor-icons.js 提取 SVG path，用 Playwright 截图为透明底 PNG。
 * 输出: scripts/assets/icons/{name}-{color}.png (512x512)
 *
 * 用法: node scripts/build_icon_pngs.mjs
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(REPO, 'assets/js/phosphor-icons.js');
const OUT_DIR = path.join(REPO, 'scripts/assets/icons');

const NEEDED = [
  // P1 阶梯
  ['pencil-simple', '035DCF'], ['link', '035DCF'], ['siren', 'FFFFFF'],
  // P2 评分条
  ['clipboard-text', '035DCF'], ['chat', '035DCF'], ['flag', 'FFFFFF'],
  // P3 时间轴 + 价值
  ['calendar-check', 'FFFFFF'], ['gauge', '035DCF'], ['shield-check', '035DCF'],
  ['check-circle', '035DCF'],
  // P4 三栏
  ['robot', '035DCF'], ['arrows-clockwise', '035DCF'],
  // P5 脊柱节点（白图标压蓝点）
  ['users-three', 'FFFFFF'], ['map-trifold', 'FFFFFF'], ['tree-structure', 'FFFFFF'],
  ['currency-dollar', 'FFFFFF'], ['calendar-check', 'FFFFFF'], ['arrows-clockwise', 'FFFFFF'],
  // P6 蓝块大图标 + 左侧灰图标
  ['paper-plane-right', 'FFFFFF'], ['paper-plane-right', 'BFDCFC'],
  // 栏目标签小图标
  ['gear', '035DCF'], ['list-checks', '035DCF'], ['lightbulb', '035DCF'],
  ['calendar-check', '035DCF'], ['users-three', 'B8BCC2'],
];

const text = readFileSync(SRC, 'utf8');
const icons = {};
for (const m of text.matchAll(/'([\w-]+)':\s*\{\s*viewBox:\s*'([^']+)',\s*content:\s*`([^`]+)`/gs)) {
  icons[m[1]] = { viewBox: m[2], content: m[3] };
}

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });

for (const [name, color] of NEEDED) {
  const icon = icons[name];
  if (!icon) { console.log(`!! 缺失图标: ${name}`); continue; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="512" height="512"><g fill="#${color}">${icon.content}</g></svg>`;
  await page.setContent(svg, { waitUntil: 'load' });
  const out = path.join(OUT_DIR, `${name}-${color}.png`);
  await page.locator('svg').screenshot({ path: out, omitBackground: true });
  console.log(`OK ${name}-${color}.png`);
}

await browser.close();
