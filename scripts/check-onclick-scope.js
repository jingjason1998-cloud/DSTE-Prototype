#!/usr/bin/env node
/**
 * 检查 HTML 中 onclick 调用的函数是否已暴露到全局作用域
 * 针对 IIFE 包裹全部脚本的文件（如 cockpit.html）
 * 用法: node scripts/check-onclick-scope.js src/cockpit.html
 */
import fs from 'fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node check-onclick-scope.js <html-file>');
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf8');

// 提取所有 script 内容
const scripts = [];
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = scriptRegex.exec(content)) !== null) {
  scripts.push(m[1]);
}

if (scripts.length === 0) {
  console.log('No inline scripts found');
  process.exit(0);
}

// 分析每个 script 块：判断函数是否在 IIFE 内部
// 简化策略：如果 script 以 (function() 开头，则认为全部函数在 IIFE 内
const localFuncs = new Set();
const globalFuncs = new Set();

scripts.forEach(script => {
  const trimmed = script.trim();
  const wrappedInIife = trimmed.startsWith('(function()') || trimmed.startsWith('(function (');

  // 全局暴露: window.xxx = function() / window.xxx = () => / window.xxx = yyy;
  const globalMatches = script.match(/window\.(\w+)\s*[=:]\s*(function|\(|=>|\w)/g) || [];
  globalMatches.forEach(match => {
    const name = match.match(/window\.(\w+)/)[1];
    globalFuncs.add(name);
  });

  // 局部函数（仅在 IIFE 包裹时）
  if (wrappedInIife) {
    const localMatches = script.match(/function\s+(\w+)\s*\(/g) || [];
    localMatches.forEach(match => {
      const name = match.match(/function\s+(\w+)/)[1];
      localFuncs.add(name);
    });
  }
});

// 提取所有 onclick 中的函数调用
const onclickMatches = content.match(/onclick="([^"]*)"/g) || [];
const onclickFuncs = new Set();
const onclickLines = new Map();

content.split('\n').forEach((line, idx) => {
  const matches = line.match(/onclick="([^"]*)"/g) || [];
  matches.forEach(match => {
    const code = match.replace(/onclick="/, '').replace(/"$/, '');
    const calls = code.match(/(\w+)\s*\(/g) || [];
    calls.forEach(c => {
      const name = c.replace(/\s*\($/, '');
      if (!['event', 'document', 'window', 'alert', 'confirm', 'console', 'setTimeout'].includes(name)) {
        onclickFuncs.add(name);
        onclickLines.set(name, idx + 1);
      }
    });
  });
});

// 检查冲突
let errors = 0;
onclickFuncs.forEach(func => {
  if (localFuncs.has(func) && !globalFuncs.has(func)) {
    // 额外检查：window.xxx = xxx; 形式的引用暴露
    const refPattern = new RegExp(`window\\.${func}\\s*=[^=]*${func}[^;]*;`, 'g');
    const hasRef = scripts.some(s => refPattern.test(s));
    if (!hasRef) {
      const line = onclickLines.get(func);
      console.error(`❌ "${func}" called via onclick at line ${line}, but defined locally in IIFE without window.* exposure`);
      errors++;
    }
  }
});

if (errors > 0) {
  console.error(`\nFound ${errors} scope error(s). Fix by changing:`);
  console.error(`  function foo() { ... }`);
  console.error(`To:`);
  console.error(`  window.foo = function() { ... };`);
  process.exit(1);
} else {
  console.log(`✅ All ${onclickFuncs.size} onclick functions are globally accessible.`);
  process.exit(0);
}
