#!/usr/bin/env node
/**
 * 自动生成 roadmap-data.json
 * 数据来源：Git tag + CHANGELOG.md + docs/01-Product产品/开发计划.yml
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');
const PLANS_PATH = path.join(ROOT, 'docs/01-Product产品/开发计划.yml');
const OUTPUT_PATH = path.join(ROOT, 'src/data/roadmap-data.json');

function extractChangelogSection(changelog, tag) {
  const header = `## [${tag}]`;
  const start = changelog.indexOf(header);
  if (start === -1) return [];

  const nextHeader = changelog.indexOf('## [', start + header.length);
  const section = nextHeader === -1
    ? changelog.slice(start)
    : changelog.slice(start, nextHeader);

  const changes = [];
  const typeMap = {
    'Added': '新增',
    'Fixed': '修复',
    'Changed': '变更',
    'Security': '安全',
    'Removed': '移除'
  };

  for (const [type, label] of Object.entries(typeMap)) {
    const regex = new RegExp(`^### ${type}\\s*\\n([\\s\\S]*?)(?=\\n### |\\n---|$)`, 'm');
    const match = section.match(regex);
    if (match) {
      const items = match[1].trim().split('\n').filter(l => l.trim().startsWith('-'));
      for (const item of items) {
        const desc = item.replace(/^-\s*/, '').trim();
        if (desc) changes.push({ type: label, desc });
      }
    }
  }

  return changes;
}

function parseYamlPlans(yamlText) {
  const plans = [];
  const planBlocks = yamlText.split(/^ {2}- id:/m).slice(1);
  for (const block of planBlocks) {
    const lines = ('  - id:' + block).split('\n');
    const plan = {};
    for (const line of lines) {
      const m = line.match(/^\s+(\w+):\s*(.*)$/);
      if (m) {
        const [, key, val] = m;
        if (key === 'issues') {
          plan[key] = val.replace(/[\[\]'"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        } else if (key === 'progress') {
          plan[key] = parseInt(val, 10) || 0;
        } else {
          plan[key] = val.trim();
        }
      }
    }
    if (plan.id) plans.push(plan);
  }
  return plans;
}

function getModulesFromPlans(plans) {
  const moduleMap = new Map();
  for (const plan of plans) {
    const name = plan.name?.split('（')[0]?.trim() || plan.name;
    if (!moduleMap.has(name)) {
      moduleMap.set(name, { name, progress: 0, status: 'todo', targetVersion: plan.targetVersion || '', owner: plan.owner || '' });
    }
    const m = moduleMap.get(name);
    m.progress = Math.max(m.progress, plan.progress || 0);
    if (plan.status === '已发布') m.status = 'done';
    else if (plan.status === '测试中' || plan.status === '开发中') m.status = 'doing';
  }
  return Array.from(moduleMap.values());
}

function main() {
  // 1. 读取 Git tags
  let tags = [];
  try {
    tags = execSync("git tag -l 'v*' --sort=-v:refname", { cwd: ROOT, encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
  } catch (e) {
    console.warn('无法读取 Git tags:', e.message);
  }

  // 2. 解析 CHANGELOG
  let changelog = '';
  try {
    changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  } catch (e) {
    console.warn('无法读取 CHANGELOG:', e.message);
  }

  const versions = tags.map(tag => {
    let date = '';
    try {
      date = execSync(`git log -1 --format=%ai ${tag}`, { cwd: ROOT, encoding: 'utf8' }).trim().split(' ')[0];
    } catch (e) {}
    const changes = extractChangelogSection(changelog, tag);
    return { version: tag, date, status: 'released', changes };
  });

  // 3. 读取开发计划
  let plans = [];
  try {
    const yamlText = fs.readFileSync(PLANS_PATH, 'utf8');
    plans = parseYamlPlans(yamlText);
  } catch (e) {
    console.warn('无法读取开发计划 YAML:', e.message);
  }

  // 4. 构建 modules（从 plans 推导）
  let modules = getModulesFromPlans(plans);

  // 兜底：如果 plans 为空，使用默认模块
  if (modules.length === 0) {
    modules = [
      { name: '驾驶舱首页', progress: 85, status: 'doing', targetVersion: 'v0.4.0', owner: 'AI-1' },
      { name: '会议审核助手', progress: 100, status: 'done', targetVersion: 'v0.1.0', owner: 'AI-2' },
      { name: '业务专题管理', progress: 100, status: 'done', targetVersion: 'v0.1.0', owner: 'AI-1' },
      { name: '经营分析会', progress: 100, status: 'done', targetVersion: 'v0.2.0', owner: 'AI-1' },
      { name: '开发路线图', progress: 100, status: 'done', targetVersion: 'v0.3.0', owner: 'AI-2' },
      { name: '战略地图', progress: 0, status: 'todo', targetVersion: 'v0.5.0', owner: '待分配' },
      { name: 'KPI 看板', progress: 35, status: 'doing', targetVersion: 'v0.4.0', owner: 'AI-2' },
      { name: 'BEM 战略解码', progress: 0, status: 'todo', targetVersion: 'v0.5.0', owner: '待分配' },
      { name: '用户权限系统', progress: 0, status: 'todo', targetVersion: 'v1.0.0', owner: '待分配' }
    ];
  }

  // 5. 写入 JSON
  const data = { versions, modules, plans };
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ Generated roadmap-data.json: ${versions.length} versions, ${modules.length} modules, ${plans.length} plans`);
}

main();
