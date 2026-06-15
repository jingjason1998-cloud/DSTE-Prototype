#!/usr/bin/env node
/**
 * DSTE 平台健康度检查脚本
 * 定制化体检：功能覆盖度 + 架构健康度 + AI协作规范
 * 与 SonarQube 互补，关注业务完整度和产品健康度
 *
 * 用法: node scripts/health-check.js
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const C = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function status(value, thresholds) {
  if (value <= thresholds[0]) return { color: C.green, icon: '✅', level: '健康' };
  if (value <= thresholds[1]) return { color: C.yellow, icon: '⚠️', level: '警告' };
  return { color: C.red, icon: '🔴', level: '危险' };
}

function print(title, value, thresholds, unit = '') {
  const s = status(value, thresholds);
  console.log(`${s.color}${s.icon} ${title}: ${value}${unit} (${s.level})${C.reset}`);
  return s.level !== '危险';
}

function section(title) {
  console.log(`\n${C.bold}${C.blue}═══ ${title} ═══${C.reset}`);
}

// ========== 1. 代码规模检查 ==========
function checkCodeScale() {
  section('1. 代码规模检查');
  let passed = true;

  const files = [
    { path: 'src/cockpit.html', max: 500 },
    { path: 'src/reviewer.html', max: 500 },
    { path: 'src/business-topics.html', max: 500 },
    { path: 'assets/css/main.css', max: 500 },
    { path: 'assets/js/main.js', max: 300 },
  ];

  files.forEach(f => {
    if (fs.existsSync(f.path)) {
      const lines = fs.readFileSync(f.path, 'utf-8').split('\n').length;
      const s = status(lines, [f.max, f.max * 2]);
      console.log(`${s.color}${s.icon} ${f.path}: ${lines} 行 (阈值: ${f.max})${C.reset}`);
      if (s.level === '危险') passed = false;
    }
  });

  return passed;
}

// ========== 2. 功能覆盖度检查 ==========
function checkFeatureCoverage() {
  section('2. 功能覆盖度检查（PRD对比）');

  const cockpit = fs.readFileSync('src/cockpit.html', 'utf-8');

  const features = [
    { id: 'sp/strategy-map', name: '战略地图' },
    { id: 'sp/strategy-topics', name: '战略专题' },
    { id: 'sp/market-insight', name: '市场洞察' },
    { id: 'bp/kpi', name: 'KPI指标体系' },
    { id: 'bp/bem', name: 'BEM战略解码' },
    { id: 'bp/annual-plan', name: '年度经营计划' },
    { id: 'exe/tasks', name: '重点工作管理' },
    { id: 'exe/business-topics', name: '业务专题管理' },
    { id: 'exe/meetings', name: '经营分析会' },
    { id: 'exe/finereport', name: 'FineReport报表' },
    { id: 'rev/performance', name: '绩效与激励' },
    { id: 'rev/cadre', name: '干部管理' },
    { id: 'rev/review', name: '战略复盘' },
    { id: 'rev/gap-analysis', name: '差距分析' },
    { id: 'dashboard', name: '驾驶舱概览' },
    { id: 'ai', name: 'AI助手' },
    { id: 'dashboard/roadmap', name: '开发路线图' },
  ];

  let implemented = 0;
  let placeholder = 0;

  features.forEach(f => {
    const isPlaceholder = cockpit.includes(`'${f.id}': () => renderPlaceholder`) ||
                         cockpit.includes(`renderPlaceholder('${f.name[0]}`);
    const isImplemented = cockpit.includes(`'${f.id}'`) && !isPlaceholder;

    if (isImplemented) {
      console.log(`  ✅ ${f.name}`);
      implemented++;
    } else if (isPlaceholder) {
      console.log(`  🔴 ${f.name} (Placeholder)`);
      placeholder++;
    } else {
      console.log(`  ❓ ${f.name} (未找到)`);
    }
  });

  const coverage = Math.round((implemented / features.length) * 100);
  print('功能覆盖度', coverage, [80, 60], '%');
  console.log(`  已实现: ${implemented} | Placeholder: ${placeholder} | 总计: ${features.length}`);

  return coverage >= 60;
}

// ========== 3. 架构耦合度检查 ==========
function checkArchitecture() {
  section('3. 架构耦合度检查');
  let passed = true;

  const cockpit = fs.readFileSync('src/cockpit.html', 'utf-8');

  // 检查 cockpit.html 中的模块耦合
  const modules = {
    '执行模块': /exe\/|tasks|meetings|会议|重点工作/g,
    'SP模块': /sp\/|strategy|战略(?!执行|解码|评估)/g,
    'BP模块': /bp\/|kpi|bem|年度/g,
    '评估模块': /rev\/|performance|cadre|复盘|差距/g,
    'AI模块': /ai[^a-z]|copilot|助手(?!页面)/gi,
  };

  console.log('cockpit.html 模块引用频次:');
  Object.entries(modules).forEach(([name, regex]) => {
    const matches = cockpit.match(regex) || [];
    const s = status(matches.length, [50, 100]);
    console.log(`  ${s.color}${s.icon} ${name}: ${matches.length} 次${C.reset}`);
    if (s.level === '危险') passed = false;
  });

  // 检查 render 函数数量
  const renderFns = cockpit.match(/function render\w+/g) || [];
  const s = status(renderFns.length, [10, 15]);
  console.log(`\n${s.color}${s.icon} cockpit.html 渲染函数: ${renderFns.length} 个 (建议 <10)${C.reset}`);
  if (s.level === '危险') passed = false;

  return passed;
}

// ========== 4. 重复代码检查 ==========
function checkDuplications() {
  section('4. 重复代码检查');
  let passed = true;

  const files = ['src/cockpit.html', 'src/reviewer.html', 'src/business-topics.html'];
  const patterns = {
    '主题切换': /data-theme|localStorage\.getItem\(['"]dste-theme['"]\)/g,
    '导航渲染': /top-nav|sidebar|nav-item/g,
    '按钮样式': /class="btn/g,
    '卡片样式': /class="card"/g,
  };

  Object.entries(patterns).forEach(([name, regex]) => {
    const counts = {};
    files.forEach(f => {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf-8');
        counts[f] = (content.match(regex) || []).length;
      }
    });

    const maxCount = Math.max(...Object.values(counts));
    const s = status(maxCount, [20, 50]);
    console.log(`  ${s.color}${s.icon} ${name}:${C.reset}`);
    Object.entries(counts).forEach(([f, c]) => {
      console.log(`      ${f}: ${c} 次`);
    });
    if (s.level === '危险') passed = false;
  });

  return passed;
}

// ========== 5. 代码异味扫描 ==========
function checkCodeSmells() {
  section('5. 代码异味扫描');
  let passed = true;

  const files = ['src/cockpit.html', 'src/reviewer.html', 'src/business-topics.html'];
  const smells = {
    'innerHTML/outerHTML': /innerHTML|outerHTML/g,
    'alert()': /alert\(/g,
    'confirm()': /confirm\(/g,
    'console.log': /console\.log/g,
    'eval/Function': /\beval\b|\bnew Function\b/g,
    'localStorage': /localStorage/g,
    'sessionStorage': /sessionStorage/g,
  };

  Object.entries(smells).forEach(([name, regex]) => {
    let total = 0;
    files.forEach(f => {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf-8');
        total += (content.match(regex) || []).length;
      }
    });

    const thresholds = name === 'innerHTML/outerHTML' ? [10, 30] :
                      name === 'alert()' ? [5, 15] :
                      name === 'eval/Function' ? [0, 1] :
                      [10, 20];

    const s = status(total, thresholds);
    console.log(`  ${s.color}${s.icon} ${name}: ${total} 处${C.reset}`);
    if (s.level === '危险') passed = false;
  });

  return passed;
}

// ========== 6. AI 协作规范检查 ==========
function checkAICollaboration() {
  section('6. AI 协作规范检查');
  let passed = true;

  // 检查 .ai/SKILL.md 是否存在
  if (!fs.existsSync('.ai/SKILL.md')) {
    console.log(`${C.red}🔴 .ai/SKILL.md 不存在${C.reset}`);
    passed = false;
  } else {
    console.log(`${C.green}✅ .ai/SKILL.md 存在${C.reset}`);
  }

  // 检查文件范围检查脚本
  if (!fs.existsSync('scripts/check-file-scope.js')) {
    console.log(`${C.red}🔴 scripts/check-file-scope.js 不存在${C.reset}`);
    passed = false;
  } else {
    console.log(`${C.green}✅ 文件范围检查脚本存在${C.reset}`);
  }

  // 检查 CI 配置
  if (!fs.existsSync('.github/workflows/ci.yml')) {
    console.log(`${C.red}🔴 CI 配置不存在${C.reset}`);
    passed = false;
  } else {
    console.log(`${C.green}✅ CI 配置存在${C.reset}`);
  }

  // 检查 SonarQube 配置
  if (!fs.existsSync('sonar-project.properties')) {
    console.log(`${C.red}🔴 SonarQube 配置不存在${C.reset}`);
    passed = false;
  } else {
    console.log(`${C.green}✅ SonarQube 配置存在${C.reset}`);
  }

  // 检查 ESLint 配置（支持传统 .eslintrc.js 和新 flat config eslint.config.js）
  if (!fs.existsSync('.eslintrc.js') && !fs.existsSync('eslint.config.js')) {
    console.log(`${C.red}🔴 ESLint 配置不存在${C.reset}`);
    passed = false;
  } else {
    console.log(`${C.green}✅ ESLint 配置存在${C.reset}`);
  }

  return passed;
}

// ========== 7. 测试覆盖检查 ==========
function checkTestCoverage() {
  section('7. 测试覆盖检查');
  let passed = true;

  const testFiles = [];
  function findTests(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) {
        findTests(fp);
      } else if (f.endsWith('.spec.js') || f.endsWith('.test.js') || f.endsWith('.py')) {
        testFiles.push(fp);
      }
    });
  }
  findTests('tests');

  console.log(`  测试文件: ${testFiles.length} 个`);
  testFiles.forEach(f => {
    const lines = fs.readFileSync(f, 'utf-8').split('\n').length;
    console.log(`    🧪 ${f}: ${lines} 行`);
  });

  // 检查是否有单元测试
  const hasUnitTests = testFiles.some(f => f.includes('.test.js') || f.includes('unit'));
  if (!hasUnitTests) {
    console.log(`${C.yellow}⚠️ 无单元测试（建议补充 vitest）${C.reset}`);
  } else {
    console.log(`${C.green}✅ 有单元测试${C.reset}`);
  }

  return passed;
}

// ========== 8. 版本同步检查 ==========
function checkVersionSync() {
  section('8. 版本同步检查');
  let passed = true;

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  console.log(`  package.json 版本: ${pkg.version}`);

  // 检查 vite.config.js 是否有版本注入
  const viteConfig = fs.readFileSync('vite.config.js', 'utf-8');
  if (viteConfig.includes('__APP_VERSION__')) {
    console.log(`${C.green}✅ vite.config.js 已配置版本注入${C.reset}`);
  } else {
    console.log(`${C.red}🔴 vite.config.js 未配置版本注入${C.reset}`);
    passed = false;
  }

  // 检查 cockpit.html 是否有版本显示
  const cockpit = fs.readFileSync('src/cockpit.html', 'utf-8');
  if (cockpit.includes('app-version') || cockpit.includes('__APP_VERSION__')) {
    console.log(`${C.green}✅ cockpit.html 已配置版本显示${C.reset}`);
  } else {
    console.log(`${C.red}🔴 cockpit.html 未配置版本显示${C.reset}`);
    passed = false;
  }

  return passed;
}

// ========== 主程序 ==========
function main() {
  console.log(`${C.bold}${C.blue}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     DSTE 战略管理平台 — 健康度检查（定制化体检）              ║');
  console.log('║     与 SonarQube 互补，关注业务完整度和产品健康度            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  const results = {
    '代码规模': checkCodeScale(),
    '功能覆盖': checkFeatureCoverage(),
    '架构耦合': checkArchitecture(),
    '重复代码': checkDuplications(),
    '代码异味': checkCodeSmells(),
    'AI协作规范': checkAICollaboration(),
    '测试覆盖': checkTestCoverage(),
    '版本同步': checkVersionSync(),
  };

  // 总结
  section('体检总结');
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log(`\n通过: ${passed}/${total}`);

  if (passed === total) {
    console.log(`${C.green}${C.bold}✅ 所有检查通过！平台健康度良好。${C.reset}`);
  } else if (passed >= total * 0.7) {
    console.log(`${C.yellow}${C.bold}⚠️ 部分检查未通过，建议优化。${C.reset}`);
  } else {
    console.log(`${C.red}${C.bold}🔴 多项检查未通过，需要重点关注！${C.reset}`);
  }

  console.log(`\n${C.blue}提示：此检查与 SonarQube 互补，建议同时查看 SonarQube 报告。${C.reset}`);
  console.log(`${C.blue}SonarQube 关注：代码质量、Bug、漏洞、技术债务${C.reset}`);
  console.log(`${C.blue}此检查关注：功能完整度、架构健康、AI协作规范${C.reset}`);

  process.exit(passed === total ? 0 : 1);
}

main();
