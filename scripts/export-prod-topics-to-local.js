#!/usr/bin/env node
/**
 * 导出生产环境业务专题数据到本地测试系统
 * 从 Cloudflare KV 读取 dste_topics_v2 和 dste_issues_v1，
 * 按 sourceSystem 拆分议题为 ST/AT，写入 backups/prod-business-topics-sync.json
 *
 * 用法：node scripts/export-prod-topics-to-local.js
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = resolve(__dirname, '../backups');
const OUTPUT_FILE = resolve(BACKUP_DIR, 'prod-business-topics-sync.json');

const KV_NAMESPACE_ID = '69ed6153435d4ba5b3b17c9077ce74c9';

function wranglerGet(key) {
  const cmd = `npx wrangler kv:key get ${key} --namespace-id=${KV_NAMESPACE_ID} --preview=false`;
  const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 });
  const raw = output.trim();
  // 过滤 wrangler 的代理警告等非 JSON 前缀
  const start = raw.search(/[\[{]/);
  if (start === -1) {
    throw new Error(`KV key ${key} 返回内容不是 JSON：${raw.slice(0, 200)}`);
  }
  return raw.slice(start);
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`解析 ${label} 失败：`, e.message);
    console.error('原始内容前 500 字符：', raw.slice(0, 500));
    process.exit(1);
  }
}

console.log('正在读取生产环境 KV 数据...');

const topicsRaw = wranglerGet('dste_topics_v2');
const issuesRaw = wranglerGet('dste_issues_v1');

const topics = parseJson(topicsRaw, 'topics');
const issues = parseJson(issuesRaw, 'issues');

const stIssues = issues.filter(i => (i.sourceSystem || '').toUpperCase() === 'ST');
const atIssues = issues.filter(i => (i.sourceSystem || '').toUpperCase() === 'AT');

const output = {
  exportTime: new Date().toISOString(),
  source: 'production KV',
  topicsCount: topics.length,
  stIssuesCount: stIssues.length,
  atIssuesCount: atIssues.length,
  topics,
  stIssues,
  atIssues,
};

writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

console.log('导出完成：', OUTPUT_FILE);
console.log(`- 专题：${topics.length}`);
console.log(`- ST 议题：${stIssues.length}`);
console.log(`- AT 议题：${atIssues.length}`);
console.log(`- 文件大小：${(Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(1)} KB`);
