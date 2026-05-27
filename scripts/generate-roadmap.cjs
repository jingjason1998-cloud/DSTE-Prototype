/**
 * 从 CHANGELOG.md 自动生成 roadmap-data.json
 * 用法: node scripts/generate-roadmap.js
 */

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'roadmap-data.json');

function parseChangelog(content) {
  const versions = [];
  const upcoming = [];
  
  // 匹配版本块: ## [vX.Y.Z] - YYYY-MM-DD
  const versionRegex = /##\s+\[(v\d+\.\d+\.\d+)\]\s+-\s+(\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=##\s+\[|$)/g;
  
  let match;
  while ((match = versionRegex.exec(content)) !== null) {
    const version = match[1];
    const date = match[2];
    const section = match[3];
    
    const changes = [];
    // 匹配 ### Added / Fixed / Changed / Security 下的列表项
    const typeRegex = /###\s+(Added|Fixed|Changed|Security)\n([\s\S]*?)(?=###\s|$)/g;
    let typeMatch;
    while ((typeMatch = typeRegex.exec(section)) !== null) {
      const type = typeMatch[1];
      const items = typeMatch[2];
      // 提取列表项 (- item)
      const itemRegex = /^-\s+(.+)$/gm;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(items)) !== null) {
        changes.push({ type, desc: itemMatch[1].trim() });
      }
    }
    
    versions.push({ version, date, status: 'released', changes });
  }
  
  // 匹配 Unreleased / 计划中
  const unreleasedRegex = /##\s+\[Unreleased\]\n([\s\S]*?)(?=##\s+\[|$)/;
  const unreleasedMatch = content.match(unreleasedRegex);
  if (unreleasedMatch) {
    const planRegex = /^-\s+(.+)$/gm;
    let planMatch;
    while ((planMatch = planRegex.exec(unreleasedMatch[1])) !== null) {
      upcoming.push({ name: planMatch[1].trim(), priority: '中', eta: '待定' });
    }
  }
  
  return { versions, upcoming };
}

function main() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error('CHANGELOG.md not found');
    process.exit(1);
  }
  
  const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  const { versions, upcoming } = parseChangelog(content);
  
  const data = {
    versions: versions.reverse(), // 最新在前
    modules: [
      { name: '驾驶舱首页', progress: 60, status: 'doing', targetVersion: 'v0.5.0' },
      { name: '会议审核助手', progress: 95, status: 'done', targetVersion: 'v0.1.0' },
      { name: '业务专题管理', progress: 90, status: 'done', targetVersion: 'v0.1.0' },
      { name: '经营分析会', progress: 85, status: 'doing', targetVersion: 'v0.4.0' },
      { name: '开发路线图', progress: 100, status: 'done', targetVersion: 'v0.3.0' },
      { name: '战略地图', progress: 0, status: 'todo', targetVersion: 'v0.5.0' },
      { name: 'KPI 看板', progress: 5, status: 'todo', targetVersion: 'v0.5.0' },
      { name: 'BEM 战略解码', progress: 0, status: 'todo', targetVersion: 'v0.6.0' },
      { name: '用户权限系统', progress: 0, status: 'todo', targetVersion: 'v1.0.0' }
    ],
    upcoming,
    plans: [
      { id: 'PLAN-001', name: '经营分析会纪要生成', status: '测试中', owner: 'AI-1', targetVersion: 'v0.4.0' },
      { id: 'PLAN-002', name: '战略地图可视化（BSC）', status: '开发中', owner: 'AI-2', targetVersion: 'v0.5.0' },
      { id: 'PLAN-003', name: 'KPI 看板数据对接', status: '开发中', owner: 'AI-1', targetVersion: 'v0.4.0' },
      { id: 'PLAN-004', name: 'BEM 战略解码工具', status: '设计中', owner: 'AI-2', targetVersion: 'v0.5.0' },
      { id: 'PLAN-005', name: '用户权限系统方案', status: '待评审', owner: '待分配', targetVersion: 'v1.0.0' },
      { id: 'PLAN-006', name: '数据导出与报表中心', status: '设计中', owner: 'AI-1', targetVersion: 'v1.0.0' }
    ]
  };
  
  // 确保 public 目录存在
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`Generated ${OUTPUT_PATH} with ${versions.length} versions`);
}

main();
