import {
    validateIssueRow, safeIssueId, hasCsvFormulaInjection, sanitizeCsvCell,
    checkStorageCapacity, parseCSV, buildIssueFromRow, importIssuesFromPaste,
    openImportModal, handleDragOver, handleDragLeave, handleFileDrop,
    handleFileSelect, processImportFile, isIssueClosed, importIssuesFromRows,
    updateImportPreview, confirmImport
} from './issue-import.js';

import {
    extractKeywords, jaccardSimilarity, computeAiMatchScore, openAiMatchModal,
    runAiMatch, renderAiMatchResults, applyAiMatches, extractTitleKeywords,
    findClusters, checkUpgradePotential, findExecutionRisks, findLongPendingIssues,
    findDeptConcentration, findHighPriorityIssues, findIssuesWithoutActionItems,
    analyzeDistribution, generateGlobalReport, loadCachedReport, saveCachedReport,
    openAiReportModal, regenerateAiReport, updateAiReportCards, openIssueDetailModal
} from './ai-analysis.js';

import {
    linkIssueToTopic, unlinkIssueFromTopic, updateTopicIssueStats,
    openLinkIssuesModal, renderLinkIssuesList, saveTopicLinks
} from './topic-issues.js';

// ===================== Data Layer =====================
const STORAGE_KEY = 'dste_business_topics_v2';
const CURRENT_USER = '销售总监'; // 演示用：当前登录用户
let _cachedTopics = null;
let _deleteTargetId = null;
let _currentTab = 'all';
let _sortConfig = { field: 'priority', direction: 'desc' };

// ===== API 同步配置 =====
const API_BASE = (() => {
    // 生产环境使用 Cloudflare Worker，开发环境可覆盖
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return localStorage.getItem('dste_api_base') || '';
    }
    return 'https://dste-api.jasonxspace.workers.dev';
})();

async function apiSave(endpoint, data) {
    if (!API_BASE) return;
    try {
        await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    } catch (e) {
        console.warn('API save failed (offline?), data kept in localStorage:', e.message);
    }
}

async function apiLoad(endpoint) {
    if (!API_BASE) return null;
    try {
        const resp = await fetch(API_BASE + endpoint);
        const json = await resp.json();
        return json.success ? json.data : null;
    } catch (e) {
        console.warn('API load failed (offline?):', e.message);
        return null;
    }
}

function loadTopics() {
    if (_cachedTopics) return [..._cachedTopics];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        _cachedTopics = JSON.parse(raw);
        return [..._cachedTopics];
    } catch {
        return [];
    }
}

function saveTopics(topics) {
    _cachedTopics = topics;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
    apiSave('/api/topics', topics); // 同步到云端
}

function initDefaultData(shouldSave = true) {
    const now = new Date().toISOString();
    const topics = [
        {
            id: "bt_1716100000001",
            name: "滚运预测能力",
            description: "建立滚动预测机制，提升经营预测准确性",
            target: "1. 预测准确率达到85%\n2. 建立月度滚动预测机制\n3. 风险提前预警能力提升",
            priority: "P1",
            status: "in_progress",
            owner: "财务总监",
            department: "财务部",
            progress: 50,
            startDate: "2024-03-01",
            endDate: "2024-12-31",
            budget: 120,
            actualCost: 80,
            milestones: [{id: "ms_1", name: "预测模型搭建", date: "2024-05-31", status: "completed"}, {id: "ms_2", name: "数据源整合", date: "2024-08-31", status: "completed"}, {id: "ms_3", name: "试点运行与调优", date: "2024-10-31", status: "in_progress"}, {id: "ms_4", name: "全面推广", date: "2024-12-31", status: "pending"}],
            tags: ["预测", "财务", "风险"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000002",
            name: "项目群经营分析",
            description: "体系客户（项目群）经营分析方法论建设",
            target: "1. 建立项目群经营分析模板\n2. 覆盖TOP20客户群\n3. 月度经营分析会常态化",
            priority: "P0",
            status: "in_progress",
            owner: "战略VP",
            department: "战略部",
            progress: 50,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            budget: 200,
            actualCost: 150,
            milestones: [{id: "ms_1", name: "方法论调研与设计", date: "2024-03-31", status: "completed"}, {id: "ms_2", name: "模板开发与验证", date: "2024-06-30", status: "completed"}, {id: "ms_3", name: "TOP20客户群试点", date: "2024-09-30", status: "in_progress"}, {id: "ms_4", name: "全量推广与固化", date: "2024-12-31", status: "pending"}],
            tags: ["项目群", "战略", "客户"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000003",
            name: "产品折扣管理",
            description: "产品盈利能力和价格管控专项",
            target: "1. 折扣审批流程线上化\n2. 低价订单占比控制在10%以内\n3. 产品毛利率提升3%",
            priority: "P1",
            status: "in_progress",
            owner: "产品总监",
            department: "产品部",
            progress: 50,
            startDate: "2024-04-01",
            endDate: "2024-11-30",
            budget: 150,
            actualCost: 90,
            milestones: [{id: "ms_1", name: "折扣现状分析", date: "2024-05-15", status: "completed"}, {id: "ms_2", name: "审批流程设计", date: "2024-07-31", status: "completed"}, {id: "ms_3", name: "系统开发与上线", date: "2024-10-15", status: "pending"}, {id: "ms_4", name: "效果评估", date: "2024-11-30", status: "pending"}],
            tags: ["折扣", "价格", "盈利"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000004",
            name: "合同质量分析",
            description: "合同质量评分与签约改进专项",
            target: "1. 建立合同质量评分模型\n2. 合同评审周期缩短50%\n3. 风险条款识别率100%",
            priority: "P2",
            status: "preparing",
            owner: "法务经理",
            department: "法务部",
            progress: 0,
            startDate: "2024-09-01",
            endDate: "2025-03-31",
            budget: 80,
            actualCost: 20,
            milestones: [{id: "ms_1", name: "评分标准制定", date: "2024-10-15", status: "in_progress"}, {id: "ms_2", name: "历史合同质量盘点", date: "2024-12-15", status: "pending"}, {id: "ms_3", name: "评审流程优化", date: "2025-02-15", status: "pending"}],
            tags: ["合同", "法务", "质量"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000005",
            name: "临时授权管理",
            description: "临时授权期限与机制管理优化",
            target: "1. 授权流程标准化\n2. 超期授权自动预警\n3. 授权台账100%覆盖",
            priority: "P2",
            status: "in_progress",
            owner: "运营经理",
            department: "运营部",
            progress: 50,
            startDate: "2024-06-01",
            endDate: "2024-12-31",
            budget: 60,
            actualCost: 35,
            milestones: [{id: "ms_1", name: "授权现状梳理", date: "2024-07-15", status: "completed"}, {id: "ms_2", name: "流程标准化设计", date: "2024-09-30", status: "completed"}, {id: "ms_3", name: "预警机制上线", date: "2024-11-15", status: "pending"}, {id: "ms_4", name: "全量推广", date: "2024-12-31", status: "pending"}],
            tags: ["授权", "运营", "风控"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000006",
            name: "应收账款管理",
            description: "超长应收管理，提升应收及时率",
            target: "1. 超长应收（>90天）降低30%\n2. DSO控制在60天以内\n3. 回款及时率达到95%",
            priority: "P0",
            status: "in_progress",
            owner: "财务总监",
            department: "财务部",
            progress: 75,
            startDate: "2024-02-01",
            endDate: "2024-12-31",
            budget: 100,
            actualCost: 70,
            milestones: [{id: "ms_1", name: "应收账龄分析", date: "2024-04-15", status: "completed"}, {id: "ms_2", name: "催收机制建立", date: "2024-06-30", status: "completed"}, {id: "ms_3", name: "DSO监控看板上线", date: "2024-09-15", status: "completed"}, {id: "ms_4", name: "效果验收", date: "2024-12-31", status: "in_progress"}],
            tags: ["应收", "回款", "财务"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000007",
            name: "项目四算专项",
            description: "低利润分析，提高合同与交付质量",
            target: "1. 项目四算覆盖率100%\n2. 低利润项目预警机制\n3. 交付成本降低10%",
            priority: "P0",
            status: "in_progress",
            owner: "项目总监",
            department: "项目管理部",
            progress: 50,
            startDate: "2024-01-01",
            endDate: "2025-06-30",
            budget: 180,
            actualCost: 120,
            milestones: [{id: "ms_1", name: "四算方法论设计", date: "2024-04-30", status: "completed"}, {id: "ms_2", name: "系统功能开发", date: "2024-08-31", status: "completed"}, {id: "ms_3", name: "试点项目验证", date: "2024-12-31", status: "in_progress"}, {id: "ms_4", name: "全量推广", date: "2025-06-30", status: "pending"}],
            tags: ["四算", "项目", "成本"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000008",
            name: "费控专项",
            description: "杜绝浪费，异常预警",
            target: "1. 费用预算执行偏差控制在5%以内\n2. 异常费用自动预警\n3. 费用分析月度报告",
            priority: "P1",
            status: "done",
            owner: "财务经理",
            department: "财务部",
            progress: 100,
            startDate: "2024-01-01",
            endDate: "2024-08-31",
            budget: 90,
            actualCost: 85,
            milestones: [{id: "ms_1", name: "费用现状分析", date: "2024-02-28", status: "completed"}, {id: "ms_2", name: "预警规则配置", date: "2024-04-30", status: "completed"}, {id: "ms_3", name: "系统上线运行", date: "2024-06-30", status: "completed"}, {id: "ms_4", name: "效果评估与优化", date: "2024-08-31", status: "completed"}],
            tags: ["费控", "预算", "成本"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000009",
            name: "收入确认规则",
            description: "销售收入确认原则梳理与标准化",
            target: "1. 收入确认规则文档化\n2. 跨部门确认流程标准化\n3. 收入确认差错率降至0",
            priority: "P1",
            status: "in_progress",
            owner: "财务经理",
            department: "财务部",
            progress: 50,
            startDate: "2024-05-01",
            endDate: "2024-12-31",
            budget: 70,
            actualCost: 45,
            milestones: [{id: "ms_1", name: "现行规则梳理", date: "2024-06-30", status: "completed"}, {id: "ms_2", name: "规则文档编写", date: "2024-08-31", status: "completed"}, {id: "ms_3", name: "流程标准化", date: "2024-10-31", status: "pending"}, {id: "ms_4", name: "培训与宣贯", date: "2024-12-31", status: "pending"}],
            tags: ["收入", "财务", "规则"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1716100000010",
            name: "制衡关系分析",
            description: "分析指标间的制衡关系及优化方法",
            target: "1. 建立关键指标制衡矩阵\n2. 避免单一指标导向\n3. 指标体系健康度评估",
            priority: "P2",
            status: "preparing",
            owner: "战略经理",
            department: "战略部",
            progress: 0,
            startDate: "2024-10-01",
            endDate: "2025-06-30",
            budget: 100,
            actualCost: 15,
            milestones: [{id: "ms_1", name: "指标现状调研", date: "2024-11-30", status: "in_progress"}, {id: "ms_2", name: "制衡矩阵设计", date: "2025-02-28", status: "pending"}, {id: "ms_3", name: "评估模型开发", date: "2025-04-30", status: "pending"}, {id: "ms_4", name: "试点验证", date: "2025-06-30", status: "pending"}],
            tags: ["制衡", "指标", "战略"],
            summary: '',
            createdAt: "2026-05-19T17:24:00.297250",
            updatedAt: "2026-05-19T17:24:00.297250",
        },
        {
            id: "bt_1779433644768_921",
            name: "战区-销售组长带人人数制度的优化",
            description: "组长带人人数的限制政策在当下是否需要优化？如何优化？",
            target: "修改完善制度，提高带人人数20人以上；",
            priority: "P2",
            status: "in_progress",
            owner: "方朱穆睿",
            department: "",
            progress: 0,
            startDate: "2026-03-27",
            endDate: "2026-06-30",
            budget: 0,
            actualCost: 0,
            milestones: [{id: "ms_1779433586058_286", name: "方案提交片联AT会议决策", date: "2026-06-03", status: "pending"}, {id: "ms_1779433604521_319", name: "管理制度正式发布与执行", date: "2026-06-30", status: "pending"}],
            tags: [],
            summary: '',
            createdAt: "2026-05-22T07:07:24.768Z",
            updatedAt: "2026-05-22T07:07:24.768Z",
            linkedIssues: [],
            linkedKpis: [],
            issueStats: {stCount:0, atCount:0, totalCount:0, lastMeetingDate:null},
            dataVersion: 2,
        },
    ];
    if (shouldSave) saveTopics(topics);
    return topics;
}

function computeProgress(milestones) {
    if (!milestones || milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.status === 'completed').length;
    return Math.round((completed / milestones.length) * 100);
}

function computeStats(topics) {
    return {
        inProgress: topics.filter(t => t.status === 'in_progress').length,
        archived: topics.filter(t => t.status === 'archived').length,
        p1Urgent: topics.filter(t => t.priority === 'P0' && t.status !== 'archived').length,
        delayed: topics.filter(t => t.status === 'delayed').length,
    };
}

function generateId() {
    return 'bt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function generateMsId() {
    return 'ms_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// ===================== Helpers =====================
function getStatusLabel(s) {
    const map = { preparing: '准备中', in_progress: '进行中', done: '已结束', archived: '已归档', delayed: '已延期' };
    return map[s] || s;
}

function getStatusTagClass(s) {
    const map = { preparing: 'tag-yellow', in_progress: 'tag-green', done: 'tag-blue', archived: 'tag-purple', delayed: 'tag-red' };
    return map[s] || 'tag-yellow';
}

function getPriorityTagClass(p) {
    const map = { P0: 'tag-red', P1: 'tag-yellow', P2: 'tag-blue' };
    return map[p] || 'tag-blue';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function safeId(id) {
    return /^bt_[a-zA-Z0-9_]+$/.test(id) ? id : '';
}

// ===================== Phase 1: Issue Data Layer (v2.1) =====================

function migrateV1ToV2() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
        const topics = JSON.parse(raw);
        if (!Array.isArray(topics)) return false;
        let migrated = false;
        topics.forEach(topic => {
            if (topic.dataVersion === undefined) {
                topic.linkedIssues = topic.linkedIssues || [];
                topic.linkedKpis = topic.linkedKpis || [];
                topic.issueStats = {
                    stCount: 0,
                    atCount: 0,
                    totalCount: 0,
                    lastMeetingDate: null
                };
                topic.dataVersion = 2;
                migrated = true;
            }
        });
        if (migrated) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
            _cachedTopics = topics;
        }
        return migrated;
    } catch (e) {
        console.error('[Migrate] 数据迁移失败:', e);
        return false;
    }
}

function simpleHash(str) {
    if (typeof str !== 'string') str = String(str);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}




// ===================== Phase 2: CSV Parser & Issue Import =====================




// ===================== Phase 2: Issue Import UI =====================

let _importRows = null;
let _importFileName = null;











let _currentLinkTopicId = null;
let _linkIssuesFilter = 'all';







// ===================== AI 智能匹配 =====================
let _aiMatchTopicId = null;
let _aiMatchResults = [];








// ===================== Phase 4: AI Global Report =====================













let _currentReportType = null;





function formatPeriod(start, end) {
    if (!start && !end) return '-';
    const s = start ? start.slice(0, 7) : '';
    const e = end ? end.slice(0, 7) : '';
    if (s === e) return s;
    return (s || '?') + ' ~ ' + (e || '?');
}

// ===================== Filter =====================
function getFilteredTopics() {
    let topics = loadTopics();
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const dept = document.getElementById('filterDept').value;
    const priority = document.getElementById('filterPriority').value;
    const year = document.getElementById('filterYear').value;

    // Tab filter
    if (_currentTab === 'in_progress') topics = topics.filter(t => t.status === 'in_progress');
    else if (_currentTab === 'done') topics = topics.filter(t => t.status === 'done');
    else if (_currentTab === 'archived') topics = topics.filter(t => t.status === 'archived');
    else if (_currentTab === 'mine') topics = topics.filter(t => t.owner === CURRENT_USER);

    // Dropdown filters
    if (dept) topics = topics.filter(t => t.department === dept);
    if (priority) topics = topics.filter(t => t.priority === priority);
    if (year) {
        topics = topics.filter(t => {
            const y = (t.startDate || '').slice(0, 4);
            return y === year;
        });
    }

    // Search
    if (search) {
        topics = topics.filter(t => {
            const fields = [t.name, t.description, t.owner, t.department].filter(Boolean).join(' ').toLowerCase();
            return fields.includes(search);
        });
    }

    // Sort: configurable
    const { field, direction } = _sortConfig;
    const dir = direction === 'asc' ? 1 : -1;
    const pOrder = { P0: 3, P1: 2, P2: 1 };
    const sOrder = { preparing: 1, in_progress: 2, done: 3, archived: 4, delayed: 5 };

    topics.sort((a, b) => {
        let cmp = 0;
        switch (field) {
            case 'name':
                cmp = (a.name || '').localeCompare(b.name || '');
                break;
            case 'priority':
                cmp = (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0);
                break;
            case 'owner':
                cmp = (a.owner || '').localeCompare(b.owner || '');
                break;
            case 'department':
                cmp = (a.department || '').localeCompare(b.department || '');
                break;
            case 'startDate':
                cmp = (a.startDate || '').localeCompare(b.startDate || '');
                break;
            case 'progress':
                cmp = (a.progress || 0) - (b.progress || 0);
                break;
            case 'status':
                cmp = (sOrder[a.status] || 0) - (sOrder[b.status] || 0);
                break;
            case 'linkedIssues':
                cmp = ((a.linkedIssues || []).length) - ((b.linkedIssues || []).length);
                break;
            default:
                cmp = (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0);
        }
        if (cmp === 0) {
            // 第二排序键：更新时间
            cmp = (a.updatedAt || '').localeCompare(b.updatedAt || '');
        }
        return cmp * dir;
    });

    return topics;
}

// ===================== Render =====================
function renderDeptFilter() {
    const topics = loadTopics();
    const depts = [...new Set(topics.map(t => t.department).filter(Boolean))].sort();
    const select = document.getElementById('filterDept');
    const currentVal = select.value;
    select.innerHTML = '<option value="">全部部门</option>' + depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    select.value = depts.includes(currentVal) ? currentVal : '';
}

function renderTable() {
    const topics = getFilteredTopics();
    const tbody = document.getElementById('topicTableBody');
    const empty = document.getElementById('emptyState');

    if (topics.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = '';

    for (const t of topics) {
        const sid = safeId(t.id);
        if (!sid) continue;

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = (e) => {
            if (!e.target.closest('.op-group')) {
                openDetailModal(sid);
            }
        };

        // 名称 + 描述
        const tdName = document.createElement('td');
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = 'font-weight:500; color:var(--text-primary);';
        nameDiv.textContent = t.name || '';
        tdName.appendChild(nameDiv);
        if (t.description) {
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'font-size:12px; color:var(--text-muted);';
            descDiv.textContent = t.description;
            tdName.appendChild(descDiv);
        }
        tr.appendChild(tdName);

        // 优先级
        const tdPriority = document.createElement('td');
        const priorityTag = document.createElement('span');
        priorityTag.className = 'tag ' + getPriorityTagClass(t.priority);
        priorityTag.textContent = t.priority || '';
        tdPriority.appendChild(priorityTag);
        tr.appendChild(tdPriority);

        // 负责人
        const tdOwner = document.createElement('td');
        tdOwner.textContent = t.owner || '-';
        tr.appendChild(tdOwner);

        // 部门
        const tdDept = document.createElement('td');
        tdDept.textContent = t.department || '-';
        tr.appendChild(tdDept);

        // 时间周期
        const tdPeriod = document.createElement('td');
        tdPeriod.textContent = formatPeriod(t.startDate, t.endDate);
        tr.appendChild(tdPeriod);

        // 进度
        const tdProgress = document.createElement('td');
        const progressWrap = document.createElement('div');
        progressWrap.style.cssText = 'display:flex; align-items:center; gap:8px;';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.width = '80px';
        const progressFill = document.createElement('div');
        const progressColor = t.progress >= 80 ? 'green' : t.progress >= 50 ? 'yellow' : 'red';
        progressFill.className = 'progress-fill ' + progressColor;
        progressFill.style.width = (t.progress || 0) + '%';
        progressBar.appendChild(progressFill);
        progressWrap.appendChild(progressBar);
        const progressText = document.createElement('span');
        progressText.style.fontSize = '12px';
        progressText.textContent = (t.progress || 0) + '%';
        progressWrap.appendChild(progressText);
        tdProgress.appendChild(progressWrap);
        tr.appendChild(tdProgress);

        // 状态
        const tdStatus = document.createElement('td');
        const statusTag = document.createElement('span');
        statusTag.className = 'tag ' + getStatusTagClass(t.status);
        statusTag.textContent = getStatusLabel(t.status);
        tdStatus.appendChild(statusTag);
        tr.appendChild(tdStatus);

        // 议题关联
        const tdIssues = document.createElement('td');
        tdIssues.style.fontSize = '12px';
        const stCount = (t.linkedIssues || []).filter(i => i.sourceSystem === 'ST').length;
        const atCount = (t.linkedIssues || []).filter(i => i.sourceSystem === 'AT').length;
        if (stCount > 0 || atCount > 0) {
            tdIssues.textContent = '🏛️' + stCount + ' 🏢' + atCount;
        } else {
            const dashSpan = document.createElement('span');
            dashSpan.style.color = 'var(--text-muted)';
            dashSpan.textContent = '-';
            tdIssues.appendChild(dashSpan);
        }
        tr.appendChild(tdIssues);

        // 操作按钮 - 显式绑定 onclick
        const tdOps = document.createElement('td');
        const opGroup = document.createElement('div');
        opGroup.className = 'op-group';

        const btnDetail = document.createElement('button');
        btnDetail.className = 'op-btn';
        btnDetail.type = 'button';
        btnDetail.dataset.action = 'detail';
        btnDetail.dataset.topicId = sid;
        btnDetail.textContent = '详情';
        btnDetail.onclick = (e) => {
            e.stopPropagation();
            openDetailModal(sid);
        };
        opGroup.appendChild(btnDetail);

        const btnEdit = document.createElement('button');
        btnEdit.className = 'op-btn';
        btnEdit.type = 'button';
        btnEdit.dataset.action = 'edit';
        btnEdit.dataset.topicId = sid;
        btnEdit.textContent = '编辑';
        btnEdit.onclick = (e) => {
            e.stopPropagation();
            openFormModal(sid);
        };
        opGroup.appendChild(btnEdit);

        const btnDelete = document.createElement('button');
        btnDelete.className = 'op-btn danger';
        btnDelete.type = 'button';
        btnDelete.dataset.action = 'delete';
        btnDelete.dataset.topicId = sid;
        btnDelete.textContent = '删除';
        btnDelete.onclick = (e) => {
            e.stopPropagation();
            openDeleteModal(sid);
        };
        opGroup.appendChild(btnDelete);

        tdOps.appendChild(opGroup);
        tr.appendChild(tdOps);

        tbody.appendChild(tr);
    }

    updateSortIndicators();
}

function renderStats() {
    const topics = loadTopics();
    const s = computeStats(topics);
    document.getElementById('statInProgress').textContent = s.inProgress;
    document.getElementById('statArchived').textContent = s.archived;
    document.getElementById('statP1Urgent').textContent = s.p1Urgent;
    document.getElementById('statDelayed').textContent = s.delayed;

    // Update subtitle count
    const total = topics.length;
    const active = topics.filter(t => t.status === 'in_progress').length;
    document.getElementById('pageSubtitle').textContent = `战略执行层业务攻坚 · 共${total}个专题 · ${active}个进行中`;
}

function switchTab(tab) {
    _currentTab = tab;
    document.querySelectorAll('#topicTabs .dashboard-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    renderTable();
}

function applyFilters() {
    renderTable();
}

function toggleSort(field) {
    if (_sortConfig.field === field) {
        _sortConfig.direction = _sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        _sortConfig.field = field;
        _sortConfig.direction = 'desc';
    }
    renderTable();
}

function updateSortIndicators() {
    document.querySelectorAll('.sortable-header').forEach(th => {
        const field = th.dataset.sortField;
        const indicator = th.querySelector('.sort-indicator');
        if (!indicator) return;
        if (_sortConfig.field === field) {
            indicator.textContent = _sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
            th.style.color = 'var(--accent-violet)';
        } else {
            indicator.textContent = '';
            th.style.color = '';
        }
    });
}

// ===================== Form Modal =====================
function openFormModal(id) {
    const isEdit = !!id;
    document.getElementById('formTitle').textContent = isEdit ? '编辑业务专题' : '新建业务专题';
    document.getElementById('formTopicId').value = id || '';

    if (isEdit) {
        const topic = loadTopics().find(t => t.id === id);
        if (!topic) return;
        document.getElementById('fName').value = topic.name || '';
        document.getElementById('fDesc').value = topic.description || '';
        document.getElementById('fTarget').value = topic.target || '';
        document.getElementById('fPriority').value = topic.priority || 'P1';
        document.getElementById('fStatus').value = topic.status || 'preparing';
        document.getElementById('fOwner').value = topic.owner || '';
        document.getElementById('fDepartment').value = topic.department || '';
        document.getElementById('fStartDate').value = topic.startDate || '';
        document.getElementById('fEndDate').value = topic.endDate || '';
        document.getElementById('fBudget').value = topic.budget || '';
        document.getElementById('fActualCost').value = topic.actualCost || '';
        document.getElementById('fTags').value = (topic.tags || []).join(', ');
        document.getElementById('fSummary').value = topic.summary || '';
        renderFormMilestones(topic.milestones || []);
    } else {
        document.getElementById('topicForm').reset();
        document.getElementById('fPriority').value = 'P1';
        document.getElementById('fStatus').value = 'preparing';
        renderFormMilestones([]);
    }

    openModal('formModal');
}

function renderFormMilestones(milestones) {
    const container = document.getElementById('formMilestones');
    if (!milestones.length) {
        container.innerHTML = '<div class="milestone-placeholder" style="font-size:12px; color:var(--text-muted); padding:8px 0;">暂无里程碑，点击下方按钮添加</div>';
        return;
    }
    container.innerHTML = milestones.map((m, idx) => `
        <div class="milestone-row" data-msid="${m.id || generateMsId()}">
            <input type="text" class="ms-name" value="${escapeHtml(m.name)}" placeholder="里程碑名称" required>
            <input type="date" class="ms-date" value="${m.date || ''}">
            <span class="milestone-status ${m.status}" data-ms-action="toggle">${m.status === 'completed' ? '✓ 已完成' : '○ 未完成'}</span>
            <button type="button" class="milestone-remove" data-ms-action="remove">×</button>
        </div>
    `).join('');
}

function addMilestoneRow() {
    const container = document.getElementById('formMilestones');
    // Remove placeholder if present
    const placeholder = container.querySelector('.milestone-placeholder');
    if (placeholder) placeholder.remove();
    const row = document.createElement('div');
    row.className = 'milestone-row';
    row.dataset.msid = generateMsId();
    row.innerHTML = `
        <input type="text" class="ms-name" placeholder="里程碑名称" required>
        <input type="date" class="ms-date">
        <span class="milestone-status pending" data-ms-action="toggle">○ 未完成</span>
        <button type="button" class="milestone-remove" data-ms-action="remove">×</button>
    `;
    container.appendChild(row);
}

function removeMilestoneRow(btn) {
    btn.closest('.milestone-row').remove();
    const container = document.getElementById('formMilestones');
    if (!container.querySelector('.milestone-row')) {
        container.innerHTML = '<div class="milestone-placeholder" style="font-size:12px; color:var(--text-muted); padding:8px 0;">暂无里程碑，点击下方按钮添加</div>';
    }
}

function toggleMsStatus(el) {
    const isCompleted = el.classList.contains('completed');
    el.classList.remove('completed', 'pending');
    if (isCompleted) {
        el.classList.add('pending');
        el.textContent = '○ 未完成';
    } else {
        el.classList.add('completed');
        el.textContent = '✓ 已完成';
    }
}

function collectFormMilestones() {
    const rows = document.querySelectorAll('#formMilestones .milestone-row');
    return Array.from(rows).map(row => ({
        id: row.dataset.msid || generateMsId(),
        name: row.querySelector('.ms-name').value.trim(),
        date: row.querySelector('.ms-date').value,
        status: row.querySelector('.milestone-status').classList.contains('completed') ? 'completed' : 'pending',
    })).filter(m => m.name);
}

function saveTopic() {
    const id = document.getElementById('formTopicId').value;
    const name = document.getElementById('fName').value.trim();
    const owner = document.getElementById('fOwner').value.trim();
    if (!name || !owner) {
        alert('请填写必填字段：专题名称、负责人');
        return;
    }

    const milestones = collectFormMilestones();
    const progress = computeProgress(milestones);
    const now = new Date().toISOString();
    const tagsRaw = document.getElementById('fTags').value;
    const tags = tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean);

    const topicData = {
        id: id || generateId(),
        name,
        description: document.getElementById('fDesc').value.trim(),
        target: document.getElementById('fTarget').value.trim(),
        priority: document.getElementById('fPriority').value,
        status: document.getElementById('fStatus').value,
        owner,
        department: document.getElementById('fDepartment').value.trim(),
        summary: document.getElementById('fSummary').value.trim(),
        startDate: document.getElementById('fStartDate').value,
        endDate: document.getElementById('fEndDate').value,
        budget: parseFloat(document.getElementById('fBudget').value) || 0,
        actualCost: parseFloat(document.getElementById('fActualCost').value) || 0,
        progress,
        milestones,
        tags,
        linkedIssues: id ? (loadTopics().find(t => t.id === id)?.linkedIssues || []) : [],
        linkedKpis: id ? (loadTopics().find(t => t.id === id)?.linkedKpis || []) : [],
        issueStats: id ? (loadTopics().find(t => t.id === id)?.issueStats || {stCount:0, atCount:0, totalCount:0, lastMeetingDate:null}) : {stCount:0, atCount:0, totalCount:0, lastMeetingDate:null},
        dataVersion: 2,
        createdAt: id ? (loadTopics().find(t => t.id === id)?.createdAt || now) : now,
        updatedAt: now,
    };

    let topics = loadTopics();
    if (id) {
        const idx = topics.findIndex(t => t.id === id);
        if (idx >= 0) topics[idx] = topicData;
    } else {
        topics.push(topicData);
    }
    saveTopics(topics);

    closeModal('formModal');
    renderTable();
    renderStats();
    renderDeptFilter();
}

// ===================== Detail Modal =====================
function openDetailModal(id) {
    const topic = loadTopics().find(t => t.id === id);
    if (!topic) return;

    document.getElementById('detailTitle').textContent = '🎯 ' + topic.name;
    const subtitleParts = [getStatusLabel(topic.status), topic.priority, topic.owner, topic.department].filter(Boolean);
    document.getElementById('detailSubtitle').textContent = subtitleParts.join(' · ');

    const progressColor = topic.progress >= 80 ? 'var(--success)' : topic.progress >= 50 ? 'var(--warning)' : 'var(--danger)';
    const daysLeft = topic.endDate ? Math.ceil((new Date(topic.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    let milestonesHtml = '';
    if (topic.milestones && topic.milestones.length) {
        const sorted = [...topic.milestones].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        const firstPendingIdx = sorted.findIndex(x => x.status !== 'completed');
        milestonesHtml = `<div class="timeline">` + sorted.map((m, i) => {
            const cls = m.status === 'completed' ? 'done' : (i === firstPendingIdx) ? 'active' : '';
            return `<div class="timeline-item ${cls}">${escapeHtml(m.name)} <span style="color:var(--text-muted); font-size:11px;">${m.date || ''}</span></div>`;
        }).join('') + `</div>`;
    } else {
        milestonesHtml = '<div style="font-size:13px; color:var(--text-muted);">暂无里程碑</div>';
    }

    const tagsHtml = topic.tags && topic.tags.length
        ? `<div class="tag-list">${topic.tags.map(t => `<span class="tag tag-blue">${escapeHtml(t)}</span>`).join('')}</div>`
        : '<div style="font-size:13px; color:var(--text-muted);">无标签</div>';

    const linkedIssues = topic.linkedIssues || [];
    let linkedIssuesHtml = '';
    if (linkedIssues.length > 0) {
        linkedIssuesHtml = `<div style="display: grid; gap: 10px;">` + linkedIssues.map(li => {
            const icon = li.sourceSystem === 'ST' ? '🏛️' : '🏢';
            const iconClass = li.sourceSystem === 'ST' ? 'st' : 'at';
            const relBadgeClass = li.relationType === 'direct' ? 'relation-badge direct' : li.relationType === 'support' ? 'relation-badge support' : 'relation-badge reference';
            const relLabel = li.relationType === 'direct' ? '直接驱动' : li.relationType === 'support' ? '相关支撑' : '参考关联';
            const linkStrength = li.linkStrength || 0.8;
            const strengthBar = `<div style="width:40px; height:3px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; display:inline-block; vertical-align:middle; margin-left:4px;"><div style="width:${Math.round(linkStrength * 100)}%; height:100%; background:var(--accent-violet); border-radius:2px;"></div></div>`;
            return `<div class="issue-link-card">
                <span class="${relBadgeClass}">${relLabel}${strengthBar}</span>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="issue-icon ${iconClass}">${icon}</div>
                    <div style="flex: 1; min-width: 0; padding-right: 8px;">
                        <div class="issue-title">${escapeHtml(li.issueId)} ${escapeHtml(li.issueTitle)}</div>
                        <div class="issue-meta">${escapeHtml(li.meetingName)} · ${escapeHtml(li.meetingDate)} · ${escapeHtml(li.sourceSystem)}</div>
                    </div>
                </div>
                <div class="issue-actions">
                    <button class="op-btn" data-action="issue-detail" data-issue-id="${escapeHtml(li.issueId)}" data-stop-propagation>📋 查看议题</button>
                    <button class="op-btn" data-action="manage-links" data-topic-id="${topic.id}" data-stop-propagation>🔗 管理关联</button>
                    <button class="op-btn danger" data-action="unlink-issue" data-topic-id="${topic.id}" data-issue-id="${escapeHtml(li.issueId)}" data-stop-propagation>✕ 解除关联</button>
                </div>
            </div>`;
        }).join('') + `</div>`;
    } else {
        linkedIssuesHtml = '<div style="font-size:13px; color:var(--text-muted); padding: 16px 0;">暂无关联议题 <button class="op-btn" data-action="close-and-link" data-topic-id="' + topic.id + '">+ 关联议题</button> <button class="op-btn" data-action="close-and-ai-match" data-topic-id="' + topic.id + '">🤖 AI 智能匹配</button></div>';
    }

    const linkedKpis = topic.linkedKpis || [];
    let linkedKpisHtml = '';
    if (linkedKpis.length > 0) {
        linkedKpisHtml = `<div style="display: grid; gap: 8px;">` + linkedKpis.map(k => `<div style="padding: 8px 12px; background: var(--bg-surface); border-radius: 6px; font-size: 13px;">
            <div style="font-weight: 500;">${escapeHtml(k.kpiName)}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">当前: ${k.currentValue}${escapeHtml(k.unit)} / 目标: ${k.targetValue}${escapeHtml(k.unit)}</div>
        </div>`).join('') + `</div>`;
    } else {
        linkedKpisHtml = '<div style="font-size:13px; color:var(--text-muted);">暂无关联KPI（KPI模块接入后显示）</div>';
    }

    let knowledgeMapHtml = '';
    if (linkedIssues.length > 0) {
        const width = 560, height = 200, cx = width / 2, cy = height / 2;
        const issueNodes = linkedIssues.map((li, i) => {
            const angle = (2 * Math.PI * i) / linkedIssues.length - Math.PI / 2;
            const r = 70;
            return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), ...li };
        });
        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-height:200px;">`;
        issueNodes.forEach(node => {
            const isDirect = node.relationType === 'direct';
            svg += `<line x1="${cx}" y1="${cy}" x2="${node.x}" y2="${node.y}" stroke="#6366f1" stroke-width="${isDirect ? 2 : 1}" stroke-dasharray="${isDirect ? 'none' : '5,5'}" opacity="0.6"/>`;
        });
        issueNodes.forEach(node => {
            const color = node.sourceSystem === 'ST' ? '#8b5cf6' : '#06b6d4';
            svg += `<circle cx="${node.x}" cy="${node.y}" r="16" fill="${color}" opacity="0.9"/><text x="${node.x}" y="${node.y + 3}" text-anchor="middle" fill="white" font-size="8">${node.sourceSystem}</text><text x="${node.x}" y="${node.y + 28}" text-anchor="middle" fill="#374151" font-size="9">${escapeHtml(node.issueId)}</text>`;
        });
        svg += `<rect x="${cx - 50}" y="${cy - 20}" width="100" height="40" rx="6" fill="#4f46e5"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="white" font-size="11">${escapeHtml(topic.name.slice(0, 8))}</text></svg>`;
        knowledgeMapHtml = `<div style="margin-top: 8px;">${svg}</div>`;
    }

    const summarySection = topic.summary
        ? `<div class="detail-section">
            <div class="detail-section-title">📝 结项总结</div>
            <div style="font-size:13px; color:var(--text-tertiary); line-height:1.8; white-space:pre-wrap;">${escapeHtml(topic.summary)}</div>
           </div>`
        : '';

    document.getElementById('detailContent').innerHTML = `
        <div class="detail-grid">
            <div class="detail-kpi">
                <div class="detail-kpi-label">整体进度</div>
                <div class="detail-kpi-value" style="color:${progressColor};">${topic.progress}%</div>
            </div>
            <div class="detail-kpi">
                <div class="detail-kpi-label">预算</div>
                <div class="detail-kpi-value">¥${topic.budget || 0}万</div>
            </div>
            <div class="detail-kpi">
                <div class="detail-kpi-label">实际成本</div>
                <div class="detail-kpi-value">¥${topic.actualCost || 0}万</div>
            </div>
            <div class="detail-kpi">
                <div class="detail-kpi-label">剩余天数</div>
                <div class="detail-kpi-value" style="color:${daysLeft !== null && daysLeft < 0 ? 'var(--danger)' : 'var(--text-primary)'};">${daysLeft !== null ? (daysLeft < 0 ? '已逾期 ' + Math.abs(daysLeft) + ' 天' : daysLeft + ' 天') : '-'}</div>
            </div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">📌 专题目标</div>
            <div style="font-size:13px; color:var(--text-tertiary); line-height:1.8; white-space:pre-wrap;">${escapeHtml(topic.target || '暂无目标描述')}</div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">📍 里程碑时间线</div>
            ${milestonesHtml}
        </div>
        <div class="detail-section">
            <div class="detail-section-title">🏷️ 标签</div>
            ${tagsHtml}
        </div>
        <div class="detail-section">
            <div class="detail-section-title" style="display:flex; justify-content:space-between; align-items:center;">
                <span>🔗 关联议题</span>
                <button class="op-btn" data-action="close-and-link" data-topic-id="${topic.id}">+ 关联议题</button>
            </div>
            ${linkedIssuesHtml}
        </div>
        <div class="detail-section">
            <div class="detail-section-title">📈 关联KPI</div>
            ${linkedKpisHtml}
        </div>
        ${knowledgeMapHtml ? `<div class="detail-section">
            <div class="detail-section-title">🗺️ 知识地图</div>
            ${knowledgeMapHtml}
        </div>` : ''}
        ${summarySection}
    `;

    document.getElementById('detailEditBtn').onclick = () => {
        closeModal('bizTopicModal');
        setTimeout(() => openFormModal(id), 200);
    };

    openModal('bizTopicModal');
}

// ===================== Delete =====================
function openDeleteModal(id) {
    _deleteTargetId = id;
    openModal('deleteModal');
}

function confirmDeleteTopic() {
    if (!_deleteTargetId) return;
    let topics = loadTopics().filter(t => t.id !== _deleteTargetId);
    saveTopics(topics);
    _deleteTargetId = null;
    closeModal('deleteModal');
    renderTable();
    renderStats();
}

// ===================== Export =====================
function exportTopics() {
    const topics = loadTopics();
    const data = { exportTime: new Date().toISOString(), version: 1, topics };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business_topics_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function importTopicsFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const topics = data.topics || data;
            if (!Array.isArray(topics)) {
                alert('备份文件格式错误：未找到 topics 数组');
                return;
            }
            // Validate topic structure
            const validTopics = topics.filter(t => t.id && t.name);
            if (validTopics.length === 0) {
                alert('备份文件中未找到有效的专题数据');
                return;
            }
            const confirmed = confirm(`确认导入备份？\n- 备份时间：${data.exportTime || '未知'}\n- 专题数量：${validTopics.length}\n- 当前专题数量：${loadTopics().length}\n\n⚠️ 导入将覆盖当前所有专题数据！`);
            if (!confirmed) return;
            // Ensure all topics have required v2 fields
            validTopics.forEach(t => {
                t.linkedIssues = t.linkedIssues || [];
                t.linkedKpis = t.linkedKpis || [];
                t.issueStats = t.issueStats || {stCount:0, atCount:0, totalCount:0, lastMeetingDate:null};
                t.dataVersion = 2;
            });
            saveTopics(validTopics);
            renderTable();
            renderStats();
            renderDeptFilter();
            alert(`导入成功！共恢复 ${validTopics.length} 个专题`);
        } catch (err) {
            alert('备份文件解析失败：' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ===================== Modal / UI Utilities =====================
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// ===================== AI Assistant (retained) =====================
function toggleAI() {
    document.getElementById('aiPanel').classList.toggle('active');
}
function askAI(text) {
    document.getElementById('aiInput').value = text;
    sendAI();
}
function sendAI() {
    const input = document.getElementById('aiInput');
    const text = input.value.trim();
    if (!text) return;
    const messages = document.getElementById('aiMessages');
    messages.innerHTML += `<div class="ai-message user">${escapeHtml(text)}</div>`;
    setTimeout(() => {
        let response = '💡 收到你的问题。我正在查询相关数据并分析，请稍候...\n\n（这是一个演示回复，实际产品将连接AI模型提供智能分析）';
        if (text.includes('营收')) response = '📊 Q3营收分析：\n• 目标：¥3.75亿\n• 实际：¥3.46亿（达成率92.3%）\n• 主要原因：华东区增速放缓、新产品推广滞后\n• 建议：加大华东区资源投入';
        else if (text.includes('报告')) response = '📋 月度经营分析报告已生成！\n\n【执行摘要】\nQ3整体达成率87%，3个KPI预警\n\n【关键发现】\n1. 营收增长12.5%\n2. 客户满意度提升5.2分\n3. 新产品收入占比偏低';
        messages.innerHTML += `<div class="ai-message assistant">${response}</div>`;
        messages.scrollTop = messages.scrollHeight;
    }, 800);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
}

// ===================== Init =====================
async function init() {
    migrateV1ToV2(); // v2.1: auto-migrate v1.2 data on load

    // 优先从云端加载数据
    const remoteTopics = await apiLoad('/api/topics');
    if (remoteTopics && remoteTopics.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteTopics));
        _cachedTopics = remoteTopics;
    }

    let topics = loadTopics();
    if (topics.length === 0) {
        topics = initDefaultData();
    } else {
        // Ensure all default topics are present (merge missing ones)
        const defaults = initDefaultData(false);
        const existingIds = new Set(topics.map(t => t.id));
        let added = 0;
        defaults.forEach(d => {
            if (!existingIds.has(d.id)) {
                topics.push(d);
                added++;
            }
        });
        if (added > 0) {
            saveTopics(topics);
        }
    }

    // 同步加载云端议题数据
    const remoteIssues = await apiLoad('/api/issues');
    if (remoteIssues && remoteIssues.length > 0) {
        // 按 sourceSystem 分组保存
        const stIssues = remoteIssues.filter(i => i.sourceSystem === 'ST');
        const atIssues = remoteIssues.filter(i => i.sourceSystem === 'AT');
        localStorage.setItem(ISSUE_STORAGE_KEY + '_ST', JSON.stringify(stIssues));
        localStorage.setItem(ISSUE_STORAGE_KEY + '_AT', JSON.stringify(atIssues));
    }

    renderTable();
    renderStats();
    renderDeptFilter();
    updateAiReportCards(); // v2.1: update AI report entry cards

    bindDelegatedEvents();

    // Nav active state removed (integrated into DSTE nav)
}

// ===================== Event Delegation =====================
function bindDelegatedEvents() {
    const container = document.body;

    container.addEventListener('click', handleDelegatedClick);
    container.addEventListener('change', handleDelegatedChange);
    container.addEventListener('input', handleDelegatedInput);

    // Drag & drop on import drop zone
    const dropZone = document.getElementById('importDropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleFileDrop);
    }

    // Form submit
    const topicForm = document.getElementById('topicForm');
    if (topicForm) {
        topicForm.addEventListener('submit', e => {
            e.preventDefault();
            saveTopic();
        });
    }
}

function handleDelegatedClick(e) {
    const target = e.target;

    // Stop propagation marker
    if (target.closest('[data-stop-propagation]')) {
        // Individual handlers below will check this; don't early return here
    }

    // data-action handlers
    const actionEl = target.closest('[data-action]');
    if (actionEl) {
        const action = actionEl.dataset.action;
        const topicId = actionEl.dataset.topicId;
        const issueId = actionEl.dataset.issueId;

        if (actionEl.hasAttribute('data-stop-propagation')) {
            e.stopPropagation();
        }

        switch (action) {
            case 'export-topics':
                exportTopics();
                return;
            case 'trigger-import':
                document.getElementById('backupFileInput').click();
                return;
            case 'open-import':
                openImportModal();
                return;
            case 'new-topic':
                openFormModal();
                return;
            case 'ai-report':
                openAiReportModal(actionEl.dataset.reportType);
                return;
            case 'detail':
                if (topicId) openDetailModal(topicId);
                return;
            case 'edit':
                if (topicId) openFormModal(topicId);
                return;
            case 'delete':
                if (topicId) openDeleteModal(topicId);
                return;
            case 'import-file-select':
                // handled by change event
                return;
            case 'issue-detail':
                if (issueId) openIssueDetailModal(issueId);
                return;
            case 'manage-links':
                if (topicId) openLinkIssuesModal(topicId);
                return;
            case 'unlink-issue':
                if (topicId && issueId) {
                    unlinkIssueFromTopic(topicId, issueId);
                    openDetailModal(topicId);
                }
                return;
            case 'close-and-link':
                if (topicId) {
                    closeModal('bizTopicModal');
                    setTimeout(() => openLinkIssuesModal(topicId), 200);
                }
                return;
            case 'close-and-ai-match':
                if (topicId) {
                    closeModal('bizTopicModal');
                    setTimeout(() => { openLinkIssuesModal(topicId); openAiMatchModal(); }, 300);
                }
                return;
            case 'ai-match':
                openAiMatchModal();
                return;
            case 'regenerate-report':
                regenerateAiReport();
                return;
            case 'toggle-ai':
                toggleAI();
                return;
            case 'send-ai':
                sendAI();
                return;
        }
    }

    // data-tab (tab switching)
    const tabEl = target.closest('[data-tab]');
    if (tabEl) {
        switchTab(tabEl.dataset.tab);
        return;
    }

    // data-modal-close
    const modalCloseEl = target.closest('[data-modal-close]');
    if (modalCloseEl) {
        closeModal(modalCloseEl.dataset.modalClose);
        return;
    }

    // data-modal-action
    const modalActionEl = target.closest('[data-modal-action]');
    if (modalActionEl) {
        switch (modalActionEl.dataset.modalAction) {
            case 'confirm-delete':
                confirmDeleteTopic();
                return;
            case 'confirm-import':
                confirmImport();
                return;
            case 'save-links':
                saveTopicLinks();
                return;
            case 'apply-ai-matches':
                applyAiMatches();
                return;
        }
    }

    // data-ms-action (milestones)
    const msEl = target.closest('[data-ms-action]');
    if (msEl) {
        switch (msEl.dataset.msAction) {
            case 'add':
                addMilestoneRow();
                return;
            case 'toggle':
                toggleMsStatus(msEl);
                return;
            case 'remove':
                removeMilestoneRow(msEl);
                return;
        }
    }

    // data-ask-ai
    const askAiEl = target.closest('[data-ask-ai]');
    if (askAiEl) {
        askAI(askAiEl.dataset.askAi);
        return;
    }

    // data-trigger-file-input
    const triggerFileEl = target.closest('[data-trigger-file-input]');
    if (triggerFileEl) {
        const inputId = triggerFileEl.dataset.triggerFileInput;
        const input = document.getElementById(inputId);
        if (input) input.click();
        return;
    }

    // data-link-filter
    const linkFilterEl = target.closest('[data-link-filter]');
    if (linkFilterEl) {
        window._linkIssuesFilter = linkFilterEl.dataset.linkFilter;
        renderLinkIssuesList();
        return;
    }

    // data-sort-field
    const sortEl = target.closest('[data-sort-field]');
    if (sortEl) {
        toggleSort(sortEl.dataset.sortField);
        return;
    }
}

function handleDelegatedChange(e) {
    const target = e.target;

    // data-filter selects
    if (target.hasAttribute('data-filter')) {
        applyFilters();
        return;
    }

    // data-action="import-file" (backup file input)
    if (target.dataset.action === 'import-file') {
        importTopicsFromFile(e);
        return;
    }

    // data-action="import-file-select" (import modal file input)
    if (target.dataset.action === 'import-file-select') {
        handleFileSelect(e);
        return;
    }

    // data-import-source radio buttons
    if (target.hasAttribute('data-import-source')) {
        updateImportPreview();
        return;
    }

    // data-link-checkbox
    if (target.hasAttribute('data-link-checkbox')) {
        const issueId = target.dataset.issueId;
        const relSelect = document.getElementById('link_rel_' + issueId);
        if (relSelect) {
            relSelect.style.display = target.checked ? 'inline-block' : 'none';
        }
        const item = target.closest('.link-issue-item');
        if (item) {
            item.classList.toggle('linked', target.checked);
        }
        return;
    }
}

function handleDelegatedInput(e) {
    const target = e.target;

    // data-search
    if (target.hasAttribute('data-search')) {
        applyFilters();
        return;
    }

    // data-link-search
    if (target.hasAttribute('data-link-search')) {
        renderLinkIssuesList();
        return;
    }

    // data-import-preview
    if (target.hasAttribute('data-import-preview')) {
        updateImportPreview();
        return;
    }
}

// DSTE 主题切换
(function() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        const updateIcon = function() {
            var t = document.documentElement.getAttribute('data-theme');
            btn.textContent = t === 'dark' ? '☀️' : '🌙';
        };
        updateIcon();
        btn.addEventListener('click', function() {
            var current = document.documentElement.getAttribute('data-theme');
            var next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('dste-theme', next);
            updateIcon();
        });
    }
    window.addEventListener('storage', function(e) {
        if (e.key === 'dste-theme') {
            document.documentElement.setAttribute('data-theme', e.newValue);
            var b = document.getElementById('theme-toggle');
            if (b) b.textContent = e.newValue === 'dark' ? '☀️' : '🌙';
        }
    });
})();

init();
