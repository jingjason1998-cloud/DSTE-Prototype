#!/usr/bin/env node
/**
 * 清理生产 KV 中的测试/mock 数据
 *
 * 用法:
 *   node scripts/cleanup-kv-mock-data.cjs --dry-run    # 预览变更
 *   node scripts/cleanup-kv-mock-data.cjs --apply      # 执行删除
 *
 * 需要 Wrangler CLI 已登录并有 DSTE_KV 访问权限。
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WRANGLER_DIR = path.join(ROOT, 'api-worker');

const BASE_KV_KEYS = {
  meetings: 'dste_meetings_v1',
  topics: 'dste_topics_v2',
};

const OPTIONAL_KV_KEYS = {
  issues: 'dste_issues_v1',
};

const TEST_PATTERNS = ['测试保存', '测试行动项内容', '决议中心测试_'];
const TEST_PATTERNS_CI = ['测试', 'test', 'Test'];

function log(...args) {
  console.log(...args);
}

function runWrangler(cmd) {
  const fullCmd = `cd "${WRANGLER_DIR}" && npx wrangler ${cmd}`;
  return execSync(fullCmd, { encoding: 'utf-8', stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
}

function fetchKvData(key) {
  try {
    const result = runWrangler(`kv:key get --binding=DSTE_KV "${key}"`);
    // Wrangler may print warnings/proxy messages before the actual JSON value;
    // find the first JSON-like boundary.
    const jsonStart = Math.min(
      result.indexOf('[') === -1 ? Infinity : result.indexOf('['),
      result.indexOf('{') === -1 ? Infinity : result.indexOf('{')
    );
    const jsonText = Number.isFinite(jsonStart) ? result.slice(jsonStart) : result;
    return JSON.parse(jsonText);
  } catch (e) {
    if (e.stderr && e.stderr.toString().includes('not found')) {
      return null;
    }
    throw e;
  }
}

function saveKvData(key, data) {
  const tmpFile = path.join(__dirname, `.tmp-kv-${key}-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  try {
    runWrangler(`kv:key put --binding=DSTE_KV "${key}" --path="${tmpFile}"`);
    log(`  ✅ ${key} updated.`);
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

function containsAny(str, patterns) {
  if (typeof str !== 'string') return false;
  return patterns.some(p => str.includes(p));
}

function cleanMeetings(meetings) {
  const removed = [];
  const cleaned = [];

  for (const m of meetings) {
    if (m.isMock === true) {
      removed.push({ key: 'dste_meetings_v1', id: m.id, title: m.title, reason: 'mock meeting (isMock: true)' });
      continue;
    }

    const originalActions = m.actions || [];
    const originalDecisions = m.decisions || [];

    const actions = originalActions.filter(a => !containsAny(a.content, TEST_PATTERNS));
    const decisions = originalDecisions.filter(d => !containsAny(d.content, TEST_PATTERNS));

    const removedActions = originalActions.length - actions.length;
    const removedDecisions = originalDecisions.length - decisions.length;

    if (removedActions > 0 || removedDecisions > 0) {
      removed.push({
        key: 'dste_meetings_v1',
        id: m.id,
        title: m.title,
        reason: `removed ${removedActions} test action(s), ${removedDecisions} test decision(s)`,
      });
    }

    cleaned.push({ ...m, actions, decisions });
  }

  return { cleaned, removed };
}

function cleanTopics(topics) {
  const removed = [];
  const cleaned = [];

  for (const t of topics) {
    if (typeof t.id === 'string' && /^bt_171610000000\d+$/.test(t.id)) {
      removed.push({ key: 'dste_topics_v2', id: t.id, title: t.name, reason: 'default demo topic' });
      continue;
    }
    if (containsAny(t.name, TEST_PATTERNS_CI) || containsAny(t.description, TEST_PATTERNS_CI)) {
      removed.push({ key: 'dste_topics_v2', id: t.id, title: t.name, reason: 'contains test keyword' });
      continue;
    }
    cleaned.push(t);
  }

  return { cleaned, removed };
}

function cleanIssues(issues) {
  const removed = [];
  const cleaned = [];

  for (const i of issues) {
    if (containsAny(i.issueTitle, TEST_PATTERNS_CI) || containsAny(i.content, TEST_PATTERNS_CI)) {
      removed.push({ key: 'dste_issues_v1', id: i.issueId || i.id, title: i.issueTitle, reason: 'contains test keyword' });
      continue;
    }
    cleaned.push(i);
  }

  return { cleaned, removed };
}

function analyzeAndClean(key, data, cleaner) {
  if (!Array.isArray(data)) {
    log(`⚠️  ${key} is not an array, skipping.`);
    return { cleaned: data, removed: [] };
  }
  return cleaner(data);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const apply = args.includes('--apply');
  const cleanIssues = args.includes('--clean-issues');

  const KV_KEYS = { ...BASE_KV_KEYS };
  if (cleanIssues) {
    KV_KEYS.issues = OPTIONAL_KV_KEYS.issues;
  }

  if (!dryRun && !apply) {
    console.error('Usage: node scripts/cleanup-kv-mock-data.cjs --dry-run | --apply [--clean-issues]');
    process.exit(1);
  }

  if (apply) {
    log('⚠️  WARNING: This will modify production KV data.');
    log('    Press Ctrl+C within 3 seconds to cancel...');
    const start = Date.now();
    while (Date.now() - start < 3000) { /* busy wait */ }
    log('Proceeding with apply.\n');
  }

  const allRemoved = [];
  const toWrite = [];

  for (const [label, key] of Object.entries(KV_KEYS)) {
    log(`\n=== ${key} ===`);
    let data;
    try {
      data = fetchKvData(key);
    } catch (e) {
      console.error(`❌ Failed to fetch ${key}:`, e.message);
      if (e.stderr) console.error(e.stderr.toString());
      process.exit(1);
    }

    if (data === null) {
      log(`  Key ${key} not found, skipping.`);
      continue;
    }

    let result;
    if (label === 'meetings') result = analyzeAndClean(key, data, cleanMeetings);
    else if (label === 'topics') result = analyzeAndClean(key, data, cleanTopics);
    else if (label === 'issues') result = analyzeAndClean(key, data, cleanIssues);

    log(`  Total:    ${data.length}`);
    log(`  To keep:  ${result.cleaned.length}`);
    log(`  To remove: ${result.removed.length}`);

    if (result.removed.length > 0) {
      for (const r of result.removed) {
        log(`    - [${r.id}] ${r.title} (${r.reason})`);
      }
      allRemoved.push(...result.removed);
    }

    if (result.removed.length > 0) {
      toWrite.push({ key, data: result.cleaned, originalData: data });
    }
  }

  log(`\n=== Summary ===`);
  log(`Total items to remove: ${allRemoved.length}`);

  if (dryRun) {
    log('[Dry run] No changes made.');
    return;
  }

  if (apply && allRemoved.length === 0) {
    log('Nothing to remove. Exiting.');
    return;
  }

  // Backup all current KV data before mutating
  const backupDir = path.join(__dirname, `kv-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(backupDir, { recursive: true });
  for (const { key, originalData } of toWrite) {
    fs.writeFileSync(path.join(backupDir, `${key}.json`), JSON.stringify(originalData, null, 2));
  }
  fs.writeFileSync(path.join(backupDir, 'removed.json'), JSON.stringify(allRemoved, null, 2));
  log(`\nBackup written to: ${backupDir}`);
  log(`Removal log written to: ${path.join(backupDir, 'removed.json')}`);

  for (const { key, data } of toWrite) {
    saveKvData(key, data);
  }

  log(`\n✅ Removed ${allRemoved.length} item(s) from production KV.`);
}

main();
