#!/usr/bin/env node
/**
 * DSTE 每日体检报告 — 企业微信机器人推送
 * 用法: WEBHOOK_URL=https://qyapi.weixin.qq.com/... node scripts/daily-health-report.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEBHOOK_URL = process.env.WEBHOOK_URL;

// ─── 颜色映射 ───
const COLOR = {
  '🔴': '#FF5630',  // 严重
  '⚠️': '#FFAB00',  // 警告
  '✅': '#36B37E',  // 通过
};

// ─── 运行体检 ───
function runHealthCheck() {
  try {
    const output = execSync('node scripts/health-check.cjs', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      timeout: 60000,
    });
    return output;
  } catch (e) {
    return e.stdout || e.message;
  }
}

// ─── 解析体检结果 ───
function parseReport(output) {
  const lines = output.split('\n');
  const issues = [];
  let currentSection = '';
  let score = 0;
  let total = 0;

  for (const line of lines) {
    // 提取评分
    const scoreMatch = line.match(/通过:\s*(\d+)\/(\d+)/);
    if (scoreMatch) {
      score = parseInt(scoreMatch[1]);
      total = parseInt(scoreMatch[2]);
    }

    // 提取问题项
    if (line.includes('🔴') || line.includes('⚠️')) {
      const clean = line.replace(/\[\d+m/g, '').replace(/\[0m/g, '').trim();
      if (clean.length > 0 && !clean.startsWith('═══')) {
        issues.push(clean);
      }
    }
  }

  return { score, total, issues };
}

// ─── 格式化 Markdown 消息 ───
function formatMessage({ score, total, issues }) {
  const percent = Math.round((score / total) * 100);
  const grade = percent >= 80 ? 'A' : percent >= 60 ? 'B' : percent >= 40 ? 'C' : 'D';
  const gradeColor = percent >= 80 ? 'green' : percent >= 60 ? 'orange' : 'red';

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // 取最严重的前 5 个问题
  const topIssues = issues.slice(0, 5).map((issue, i) => {
    const icon = issue.includes('🔴') ? '🔴' : '⚠️';
    const text = issue.replace(/🔴|⚠️|✅/g, '').trim();
    return `${i + 1}. ${icon} ${text}`;
  }).join('\n');

  return {
    msgtype: 'markdown',
    markdown: {
      content: `**DSTE 每日体检报告 — ${today}**

> 健康评分：<font color="${gradeColor}">**${percent}% (${score}/${total}) 等级 ${grade}**</font>

**⚠️ 需关注的问题（Top 5）：**
${topIssues}

${issues.length > 5 ? `> 还有 ${issues.length - 5} 项问题，详见完整报告` : ''}

---
<font color="info">💡 建议：每天修复一点点，产品越来越好</font>`,
    },
  };
}

// ─── 保存报告到文件 ───
function saveReport(output) {
  const reportsDir = path.resolve(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const filename = `health-report-${timestamp}.txt`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, output, 'utf-8');
  return filepath;
}

// ─── 推送到企业微信 ───
async function pushToWeCom(message) {
  if (!WEBHOOK_URL) {
    console.error('❌ 错误: 未设置 WEBHOOK_URL 环境变量');
    console.error('用法: WEBHOOK_URL=https://qyapi.weixin.qq.com/... node scripts/daily-health-report.js');
    process.exit(1);
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    if (result.errcode === 0) {
      console.log('✅ 企业微信推送成功');
    } else {
      console.error('❌ 推送失败:', result.errmsg);
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ 网络错误:', e.message);
    process.exit(1);
  }
}

// ─── 主流程 ───
async function main() {
  console.log('🚀 运行 DSTE 每日体检...\n');

  // 1. 运行体检
  const output = runHealthCheck();

  // 2. 保存报告
  const reportPath = saveReport(output);
  console.log(`📄 报告已保存: ${reportPath}`);

  // 3. 解析结果
  const report = parseReport(output);
  console.log(`\n📊 健康评分: ${Math.round((report.score / report.total) * 100)}% (${report.score}/${report.total})`);
  console.log(`🔍 发现问题: ${report.issues.length} 项\n`);

  // 4. 推送企业微信
  const message = formatMessage(report);
  await pushToWeCom(message);
}

main();
