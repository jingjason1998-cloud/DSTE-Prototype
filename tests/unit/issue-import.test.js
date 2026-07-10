import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage before importing modules that use Storage
const storage = {};
globalThis.localStorage = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(key => delete storage[key]); }
};

const {
  loadIssues,
  saveIssues,
  loadAllIssues,
  validateIssueRow,
  buildIssueFromRow,
  issuesStRepo,
  issuesAtRepo,
} = await import('../../src/pages/business-topics/issue-import.js');

describe('issue-import Repository', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('loadIssues returns empty array for missing data', () => {
    expect(loadIssues('ST')).toEqual([]);
    expect(loadIssues('AT')).toEqual([]);
  });

  it('saveIssues and loadIssues round-trip for ST', () => {
    const issues = [{ issueId: 'ST-2024-Q1-001', issueTitle: 'Test' }];
    saveIssues(issues, 'ST');
    expect(loadIssues('ST')).toEqual(issues);
    expect(loadIssues('AT')).toEqual([]);
  });

  it('saveIssues and loadIssues round-trip for AT', () => {
    const issues = [{ issueId: 'AT-2024-Q1-001', issueTitle: 'AT Test' }];
    saveIssues(issues, 'AT');
    expect(loadIssues('AT')).toEqual(issues);
    expect(loadIssues('ST')).toEqual([]);
  });

  it('loadAllIssues combines ST and AT', () => {
    saveIssues([{ issueId: 'ST-001' }], 'ST');
    saveIssues([{ issueId: 'AT-001' }], 'AT');
    const all = loadAllIssues();
    expect(all.length).toBe(2);
    expect(all.some(i => i.issueId === 'ST-001')).toBe(true);
    expect(all.some(i => i.issueId === 'AT-001')).toBe(true);
  });

  it('uses the exported Repository instances', () => {
    expect(issuesStRepo.storageKey).toBe('dste_issues_v1_ST');
    expect(issuesAtRepo.storageKey).toBe('dste_issues_v1_AT');
    expect(issuesStRepo.options.schema).toBe('array');
    expect(issuesAtRepo.options.schema).toBe('array');
  });

  it('buildIssueFromRow sets id equal to issueId', () => {
    const row = {
      '议题主题': '测试议题',
      '议题描述': '描述',
      '片联议题类型': '经营',
      '提交人姓名': '张三',
    };
    const issue = buildIssueFromRow(row, 'ST', 0);
    expect(issue.id).toBe(issue.issueId);
    expect(issue.id).toBeTruthy();
  });

  it('saveIssues normalizes id and adds lastModified', () => {
    const issues = [{ issueId: 'ST-2024-Q1-001', issueTitle: 'Test' }];
    saveIssues(issues, 'ST');
    const loaded = loadIssues('ST');
    expect(loaded[0].id).toBe('ST-2024-Q1-001');
    expect(loaded[0].lastModified).toBeDefined();
  });

  it('validateIssueRow rejects empty row', () => {
    const result = validateIssueRow({}, 'ST');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('buildIssueFromRow creates fallback title from description', () => {
    const row = {
      '议题主题': '',
      '议题描述': '这是一个比较长的描述用来测试标题截取',
      '片联议题类型': '经营',
      '提交人姓名': '张三',
    };
    const issue = buildIssueFromRow(row, 'ST', 0);
    expect(issue.issueTitle).toContain('这是一个比较长的描述用来测试标题截取'.slice(0, 30));
    expect(issue.sourceSystem).toBe('ST');
  });
});
