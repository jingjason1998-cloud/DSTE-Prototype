#!/usr/bin/env node
/**
 * 文件变更范围检查脚本
 * 核心目标：防止AI修改不属于本次升级的文件/模块
 * 用法：node scripts/check-file-scope.js <allowed-pattern1> <allowed-pattern2> ...
 * 示例：node scripts/check-file-scope.js "reviewer.html" "reviewer"
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(process.cwd());

// 核心保护文件 — 任何变更都会触发警告
const CORE_PROTECTED_FILES = [
  'src/lib/config.js',
  'src/lib/shell.js',
  'vite.config.js',
  'package.json',
  'playwright.config.js',
  'index.html',
];

// 主线模块 — 除非明确授权，否则不应修改
const MAINLINE_MODULES = [
  'src/cockpit.html',
  'assets/css/main.css',
  'assets/js/main.js',
];

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (e) {
    // 可能不是git仓库或没有变更
    try {
      const output = execSync('git diff --name-only', {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
      });
      return output.trim().split('\n').filter(Boolean);
    } catch (e2) {
      console.error('❌ 无法获取变更文件列表');
      process.exit(1);
    }
  }
}

function checkScope(changedFiles, allowedPatterns) {
  const violations = [];
  const warnings = [];

  for (const file of changedFiles) {
    // 检查核心保护文件
    if (CORE_PROTECTED_FILES.some(p => file === p || file.endsWith('/' + p))) {
      violations.push({
        file,
        level: 'CRITICAL',
        reason: '核心配置文件变更，可能导致系统级破坏',
      });
      continue;
    }

    // 检查主线模块
    if (MAINLINE_MODULES.some(p => file === p || file.endsWith('/' + p))) {
      violations.push({
        file,
        level: 'HIGH',
        reason: '主线模块变更，可能影响多个页面',
      });
      continue;
    }

    // 检查是否在允许范围内
    const isAllowed = allowedPatterns.some(pattern => {
      if (file.includes(pattern)) return true;
      // 支持通配符
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(file);
    });

    if (!isAllowed && allowedPatterns.length > 0) {
      violations.push({
        file,
        level: 'MEDIUM',
        reason: `不在本次升级允许范围内（允许: ${allowedPatterns.join(', ')}）`,
      });
    }
  }

  return { violations, warnings };
}

function main() {
  const allowedPatterns = process.argv.slice(2);
  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    console.log('ℹ️ 没有检测到文件变更');
    process.exit(0);
  }

  console.log('═══════════════════════════════════════');
  console.log('文件变更范围检查');
  console.log('═══════════════════════════════════════');
  console.log(`\n变更文件 (${changedFiles.length}个):`);
  changedFiles.forEach(f => console.log(`  • ${f}`));

  if (allowedPatterns.length > 0) {
    console.log(`\n允许范围: ${allowedPatterns.join(', ')}`);
  }

  const { violations } = checkScope(changedFiles, allowedPatterns);

  if (violations.length > 0) {
    console.log('\n❌ 发现违规变更:');
    violations.forEach(v => {
      const icon = v.level === 'CRITICAL' ? '🚨' : v.level === 'HIGH' ? '⚠️' : '⚡';
      console.log(`  ${icon} [${v.level}] ${v.file}`);
      console.log(`     原因: ${v.reason}`);
    });

    console.log('\n───────────────────────────────────────');
    console.log('如需强制提交，请确认以下事项:');
    console.log('1. 变更确实必要且经过审查');
    console.log('2. 已运行全量测试并通过');
    console.log('3. 已通知团队成员');
    console.log('───────────────────────────────────────');

    process.exit(1);
  }

  console.log('\n✅ 文件变更范围检查通过');
  process.exit(0);
}

main();
