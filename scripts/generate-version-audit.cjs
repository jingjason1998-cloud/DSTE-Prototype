#!/usr/bin/env node
/**
 * 生成版本审计数据
 * 用法:
 *   node scripts/generate-version-audit.cjs
 *   node scripts/generate-version-audit.cjs --publish   # 生成后直接写入 Cloudflare KV
 * 输出: public/version-audit.json
 * 生产部署时，可用 --publish 直接写入 KV，或手动 POST /api/version-audit（需带 token）。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');

function md5File(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function fileInfo(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  const hash = md5File(filePath);
  return {
    md5: hash ? hash.slice(0, 8) : null,
    hash,
    mtime: new Date(stat.mtime).toISOString().replace('T', ' ').slice(0, 19),
    size: stat.size,
  };
}

function gitInfo() {
  try {
    const tag = execSync('git describe --tags --abbrev=0', { cwd: ROOT, encoding: 'utf-8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf-8' }).trim();
    const dirty = execSync('git status --short', { cwd: ROOT, encoding: 'utf-8' }).trim().length > 0;
    return { tag, commit, branch, dirty };
  } catch (e) {
    return { tag: null, commit: null, branch: null, dirty: null };
  }
}

function pkgVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  return `v${pkg.version}`;
}

function frontendFiles(baseDir) {
  const files = {
    cockpit_html: path.join(baseDir, 'src', 'cockpit.html'),
    reviewer_html: path.join(baseDir, 'src', 'reviewer.html'),
    business_topics_html: path.join(baseDir, 'src', 'business-topics.html'),
    meetings_html: path.join(baseDir, 'src', 'meetings.html'),
  };
  const info = {};
  for (const [key, filePath] of Object.entries(files)) {
    const i = fileInfo(filePath);
    if (i) info[key] = i;
  }
  return info;
}

function main() {
  const versionTag = pkgVersion();
  const git = gitInfo();
  const timestamp = new Date().toISOString();

  // 本地：优先从 dist 读取（构建产物），否则从 src 读取
  const localBase = fs.existsSync(DIST) ? DIST : ROOT;
  const local = {
    version_tag: versionTag,
    build_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    source: fs.existsSync(DIST) ? 'dist' : 'src',
    ...frontendFiles(localBase),
  };

  // Git：基于 src 目录（代表当前工作区提交的源代码）
  const gitFiles = frontendFiles(SRC);
  const gitData = {
    version_tag: git.tag || versionTag,
    commit: git.commit,
    branch: git.branch,
    dirty: git.dirty,
    ...gitFiles,
  };

  // 生产：从独立配置文件读取，不存在时使用本地数据占位
  // 配置文件通常是上次从生产环境下载的 version-audit.json，取其 local 部分作为生产数据
  const prodConfigPath = path.join(ROOT, 'version-audit-production.json');
  let production = null;
  if (fs.existsSync(prodConfigPath)) {
    try {
      const prodRaw = JSON.parse(fs.readFileSync(prodConfigPath, 'utf-8'));
      production = prodRaw.local || prodRaw;
      production.fetched_at = prodRaw.generated_at;
    } catch (e) {
      console.warn('Failed to read production config:', e.message);
    }
  }
  if (!production) {
    production = {
      version_tag: versionTag,
      note: '未配置生产环境数据，当前显示为本地构建占位数据',
      ...local,
    };
  }

  const audit = {
    generated_at: timestamp,
    project: 'dste-platform',
    local,
    git: gitData,
    production,
  };

  const outputPath = path.join(PUBLIC, 'version-audit.json');
  fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));
  console.log(`Generated ${outputPath}`);

  if (process.argv.includes('--publish')) {
    console.log('Publishing version-audit to Cloudflare KV...');
    const wranglerDir = path.join(ROOT, 'api-worker');
    execSync(
      `npx wrangler kv:key put dste_version_audit_v1 --path="${outputPath}" --binding=DSTE_KV`,
      { cwd: wranglerDir, stdio: 'inherit' }
    );
    console.log('Published version-audit to KV.');
  }
}

main();
