import { showToast, Storage } from '../../lib/utils.js';
import { loadIssues, loadAllIssues } from './issue-import.js';

let _currentReportType = null;
let _aiMatchTopicId = null;
let _aiMatchResults = [];

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('active');
        document.body.style.overflow = '';
    }
}

export function extractKeywords(text) {
    if (!text) return [];
    const stopWords = new Set(['的','了','在','是','和','就','不','都','一','上','也','很','到','说','要','去','会','着','看','好','这','那','个','为','与','及','等','对','可','能','由','从','被','将','于','中','而','或','但','如','若','给','以','之','其','有','我','你','他','她','它','们','来','过','下','短','年','月','日','时','分','秒','第','把','让','向','往','前','后','左','右','内','外','间','里','面']);
    const cleaned = text.toLowerCase();
    const words = [];

    // 1. 提取英文/数字词（邮箱前缀、英文名等）
    const englishWords = cleaned.match(/[a-z0-9][a-z0-9._-]*/g) || [];
    englishWords.forEach(w => {
        if (w.length >= 2 && !stopWords.has(w)) words.push(w);
    });

    // 2. 中文按非中文字符分段，每段做 2-3 字 n-gram（4-gram噪声太大）
    const segments = cleaned.split(/[^一-鿿]+/).filter(s => s.length >= 2);
    segments.forEach(seg => {
        for (let i = 0; i < seg.length - 1; i++) {
            for (let len = 2; len <= 3 && i + len <= seg.length; len++) {
                const word = seg.slice(i, i + len);
                if (![...word].some(c => stopWords.has(c))) {
                    words.push(word);
                }
            }
        }
    });

    return [...new Set(words)].slice(0, 25);
}

// ===== 语义关联词扩展 =====
const SEMANTIC_MAP = {
    '人数': ['编制', '人头', '人员', '人力', '名额', '配置', ' staffing'],
    '编制': ['人数', '人头', '人员', '人力', '名额', '配置'],
    '组长': ['小组', '团队', '队长', '主管', 'leader', '负责人'],
    '小组': ['组长', '团队', '队伍', '班组'],
    '制度': ['规则', '规范', '政策', '规定', '机制', '章程'],
    '规则': ['制度', '规范', '政策', '规定', '机制'],
    '优化': ['改进', '提升', '完善', '改良', '调整', '升级'],
    '改进': ['优化', '提升', '完善', '改良'],
    '战区': ['区域', '地区', '片区', '分战区', '地域', '片区'],
    '区域': ['战区', '地区', '片区', '地域'],
    '销售': ['售卖', '营销', '营收', '业绩', '收入', '售卖', '业务'],
    '营收': ['销售', '收入', '业绩', '售卖'],
    '业务': ['销售', '营收', '经营', ' Commercial'],
    '客户': ['用户', '客群', '顾客', 'consumer'],
    '成本': ['费用', '支出', '开销', '花费', '投入'],
    '费用': ['成本', '支出', '开销', '预算'],
    '绩效': ['业绩', '表现', '考核', '评价', 'KPI'],
    '考核': ['绩效', '评价', '评估', '考评'],
    '培训': ['培养', '赋能', '学习', '教育', '训练'],
    '招聘': ['招募', '引进', '纳新', '招人', '人才'],
    '流程': ['过程', '工序', '环节', '步骤', '流程'],
    '系统': ['平台', '工具', '软件', '应用', '体系'],
    '数据': ['信息', '指标', '数字', '统计', 'Data'],
    '风险': ['隐患', '问题', '危机', '威胁', '漏洞'],
    '预算': ['计划', '拨款', '资金', '经费', '费用'],
    '战略': ['策略', '规划', '方针', '路线', '方向'],
    '组织': ['机构', '架构', '体系', '结构', '团队'],
    '干部': ['管理层', '领导', '主管', '负责人', '经理'],
    '管理': ['管控', '治理', '监督', '统筹', '运营'],
    '交付': ['实施', '交付', '上线', '部署', ' rollout'],
    '项目': ['专项', '工程', '计划', '项目'],
    '专项': ['项目', '计划', '工程', '专题'],
    '专题': ['专项', '项目', '议题'],
    '质量': ['品质', '品控', 'QA', '质量'],
    '安全': ['安防', '保密', '风控', '安全'],
    '合规': ['合法', '规范', '风控', '合規'],
};

function getSemanticSet(word) {
    const set = new Set([word]);
    const related = SEMANTIC_MAP[word];
    if (related) related.forEach(r => set.add(r));
    return set;
}

function computeSemanticJaccard(a, b) {
    if (!a.length || !b.length) return { exact: 0, semantic: 0 };
    const setA = new Set(a);
    const setB = new Set(b);
    const exactMatch = new Set([...setA].filter(x => setB.has(x)));

    // 语义匹配：A中的词在B的语义扩展中
    let semanticMatch = 0;
    setA.forEach(wa => {
        if (exactMatch.has(wa)) return; // 已精确匹配的不重复计算
        const semA = getSemanticSet(wa);
        for (const wb of setB) {
            const semB = getSemanticSet(wb);
            // 检查两个词的语义集合是否有交集
            const hasOverlap = [...semA].some(x => semB.has(x));
            if (hasOverlap) {
                semanticMatch++;
                break;
            }
        }
    });

    const unionSize = new Set([...setA, ...setB]).size;
    const exactSim = exactMatch.size / Math.max(unionSize, 1);
    const semanticSim = semanticMatch / Math.max(unionSize, 1);
    return { exact: exactSim, semantic: semanticSim };
}

function extractNames(text) {
    if (!text) return [];
    // 提取中文姓名（2-4个汉字）
    const chineseNames = (text.match(/[一-鿿]{2,4}/g) || []);
    // 提取英文名（字母开头，可含点号、下划线）
    const englishNames = (text.match(/[a-zA-Z][a-zA-Z0-9._-]*/g) || []);
    return [...new Set([...chineseNames, ...englishNames])];
}

export function jaccardSimilarity(a, b) {
    if (!a.length || !b.length) return 0;
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / Math.max(union.size, 1);
}

function computeCharOverlap(a, b) {
    // 字符级重叠率：计算两个文本中相同字符的比例（去重后）
    if (!a || !b) return 0;
    const ca = new Set(a.toLowerCase().replace(/[^一-鿿]/g, ''));
    const cb = new Set(b.toLowerCase().replace(/[^一-鿿]/g, ''));
    if (ca.size === 0 || cb.size === 0) return 0;
    const intersection = [...ca].filter(c => cb.has(c));
    return intersection.length / Math.max(ca.size, cb.size);
}

export function computeAiMatchScore(topic, issue) {
    let score = 0;
    const reasons = [];
    let relationSuggestion = 'support';

    // 1. 负责人/提交人匹配 (权重 0.15)
    const topicOwner = extractNames(topic.owner || '');
    const issueProposer = extractNames(issue.proposer || '');
    const issueHandler = extractNames(issue.currentOwner || issue.handler || '');
    const ownerMatch = topicOwner.some(n => issueProposer.includes(n) || issueHandler.includes(n));
    if (ownerMatch) {
        score += 0.15;
        reasons.push('同一负责人');
    }

    // 2. 部门匹配 (权重 0.12)
    const tDept = (topic.department || '').trim();
    const iDept = (issue.department || '').trim();
    if (tDept && iDept && tDept !== '-' && iDept !== '-') {
        if (tDept === iDept) {
            score += 0.12;
            reasons.push('责任部门一致');
        } else if (tDept.includes(iDept) || iDept.includes(tDept)) {
            score += 0.08;
            reasons.push('责任部门相关');
        }
    }

    // 3. 关键词重叠 (权重 0.40) — 核心匹配维度
    const topicText = [topic.name, topic.description, topic.target, topic.department, ...(topic.tags || [])].join(' ');
    const issueText = [
        issue.issueSubject || issue.issueTitle,
        issue.issueDescription || issue.content,
        issue.finalConclusion || issue.auditConclusion || issue.decision,
        issue.issueCategory || issue.issueType || issue.department,
        ...(issue.relatedKpis || [])
    ].join(' ');
    const topicKeywords = extractKeywords(topicText);
    const issueKeywords = extractKeywords(issueText);
    const { exact: exactSim, semantic: semanticSim } = computeSemanticJaccard(topicKeywords, issueKeywords);
    const combinedSim = exactSim + semanticSim * 0.6; // 语义匹配按60%权重
    score += combinedSim * 0.40;
    if (exactSim > 0.15) {
        reasons.push(`关键词高度相关(${Math.round(exactSim * 100)}%)`);
    } else if (exactSim > 0.03 || semanticSim > 0.05) {
        reasons.push(`关键词部分相关(精确${Math.round(exactSim * 100)}%+语义${Math.round(semanticSim * 100)}%)`);
    }

    // 4. 字符级重叠匹配 (权重 0.12) — 补充 n-gram 的不足
    const charOverlap = computeCharOverlap(topic.name, issue.issueSubject || issue.issueTitle);
    if (charOverlap > 0.15) {
        score += charOverlap * 0.12;
        reasons.push(`字符重叠(${Math.round(charOverlap * 100)}%)`);
    }

    // 5. KPI/标签关联 (权重 0.12)
    const topicTags = (topic.tags || []).map(t => t.toLowerCase());
    const issueKpis = (issue.relatedKpis || []).map(k => k.toLowerCase());
    let kpiOverlap = 0;
    topicTags.forEach(t => {
        issueKpis.forEach(k => {
            if (k.includes(t) || t.includes(k)) kpiOverlap++;
        });
    });
    if (kpiOverlap > 0) {
        score += Math.min(0.12, kpiOverlap * 0.05);
        reasons.push(`KPI关联(${kpiOverlap}个)`);
    }

    // 6. 时间窗口 (权重 0.06)
    const issueDate = issue.submitTime || issue.meetingDate;
    if (topic.startDate && topic.endDate && issueDate) {
        const s = new Date(topic.startDate);
        const e = new Date(topic.endDate);
        const m = new Date(issueDate);
        if (m >= s && m <= e) {
            score += 0.06;
            reasons.push('议题日期在专题周期内');
        } else {
            const daysDiff = Math.abs(m - Math.max(s, Math.min(m, e))) / (1000 * 60 * 60 * 24);
            if (daysDiff < 90) {
                score += 0.03;
                reasons.push('议题日期临近专题周期');
            }
        }
    }

    // 7. 优先级加权
    if (issue.priority === 'P0') score += 0.02;
    else if (issue.priority === 'P1') score += 0.01;

    // 8. 议题标题与专题名称直接包含关系 (权重 0.10)
    const tName = (topic.name || '').toLowerCase();
    const iTitle = (issue.issueSubject || issue.issueTitle || '').toLowerCase();
    if (tName && iTitle && (tName.includes(iTitle) || iTitle.includes(tName))) {
        score += 0.10;
        reasons.push('名称高度相似');
    }

    // 关系类型建议
    if (score >= 0.50) relationSuggestion = 'direct';
    else if (score >= 0.25) relationSuggestion = 'support';
    else relationSuggestion = 'reference';

    const finalScore = Math.min(0.99, score);
    return { score: finalScore, reasons, relationSuggestion, topic, issue };
}

export function openAiMatchModal() {
    _aiMatchTopicId = typeof window !== 'undefined' ? window._currentLinkTopicId : null;
    const topic = window.loadTopics().find(t => t.id === _aiMatchTopicId);
    if (!topic) return;

    document.getElementById('aiMatchSubtitle').textContent = '「' + topic.name + '」— 基于部门、关键词、KPI、时间窗口等维度分析';
    document.getElementById('aiMatchLoading').style.display = 'block';
    document.getElementById('aiMatchContent').style.display = 'none';
    document.getElementById('aiMatchEmpty').style.display = 'none';
    document.getElementById('aiMatchApplyBtn').style.display = 'none';
    openModal('aiMatchModal');

    setTimeout(() => {
        runAiMatch(topic);
    }, 600);
}

export function runAiMatch(topic) {
    const allIssues = loadAllIssues();
    const linkedIds = new Set((topic.linkedIssues || []).map(li => li.issueId));
    const candidates = allIssues.filter(i => !linkedIds.has(i.issueId));

    console.log('[AI Match] 专题:', topic.name, '| 议题总数:', allIssues.length, '| 已关联:', linkedIds.size, '| 待匹配:', candidates.length);

    if (candidates.length === 0) {
        document.getElementById('aiMatchLoading').style.display = 'none';
        document.getElementById('aiMatchEmpty').style.display = 'block';
        return;
    }

    const scored = candidates.map(issue => computeAiMatchScore(topic, issue));
    const results = scored
        .filter(r => r.score >= 0.12)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

    // 调试：输出得分分布
    const distribution = { high: 0, mid: 0, low: 0, filtered: 0 };
    scored.forEach(r => {
        if (r.score >= 0.30) distribution.high++;
        else if (r.score >= 0.20) distribution.mid++;
        else if (r.score >= 0.12) distribution.low++;
        else distribution.filtered++;
    });
    console.log('[AI Match] 得分分布:', distribution, '| 推荐:', results.length);
    if (results.length > 0) {
        console.log('[AI Match] TOP3:', results.slice(0, 3).map(r => ({
            id: r.issue.issueId,
            title: r.issue.issueTitle?.slice(0, 20),
            score: r.score.toFixed(3),
            reasons: r.reasons
        })));
    }

    _aiMatchResults = results;
    document.getElementById('aiMatchLoading').style.display = 'none';

    if (results.length === 0) {
        document.getElementById('aiMatchEmpty').style.display = 'block';
        return;
    }

    document.getElementById('aiMatchContent').style.display = 'block';
    document.getElementById('aiMatchApplyBtn').style.display = 'inline-block';

    const highCount = results.filter(r => r.score >= 0.5).length;
    document.getElementById('aiMatchStats').innerHTML =
        `分析完成 · 共扫描 ${candidates.length} 条未关联议题 · 发现 <strong style="color:var(--success)">${results.length}</strong> 条潜在关联` +
        (highCount > 0 ? ` · <strong style="color:var(--accent-violet)">${highCount}</strong> 条高置信度` : '');

    renderAiMatchResults();
}

export function renderAiMatchResults() {
    const container = document.getElementById('aiMatchList');
    container.innerHTML = _aiMatchResults.map((r, idx) => {
        const scorePct = Math.round(r.score * 100);
        const scoreClass = scorePct >= 50 ? 'high' : scorePct >= 30 ? 'medium' : 'low';
        const icon = r.issue.sourceSystem === 'ST' ? '🏛️' : '🏢';
        const relLabel = r.relationSuggestion === 'direct' ? '直接驱动' : r.relationSuggestion === 'support' ? '相关支撑' : '参考关联';
        const relColor = r.relationSuggestion === 'direct' ? '#ef4444' : r.relationSuggestion === 'support' ? '#3b82f6' : '#6b7280';
        return `
        <div class="ai-match-card" id="aimatch_card_${idx}">
            <div class="ai-match-header">
                <div class="ai-match-score ${scoreClass}">${scorePct}%</div>
                <div class="ai-match-info">
                    <div class="ai-match-title">${icon} ${escapeHtml(r.issue.issueId)} ${escapeHtml(r.issue.issueTitle)}</div>
                    <div class="ai-match-meta">${escapeHtml(r.issue.meetingName)} · ${escapeHtml(r.issue.department)} · ${escapeHtml(r.issue.status)} · 建议关系: <span style="color:${relColor}; font-weight:600;">${relLabel}</span></div>
                </div>
                <input type="checkbox" id="aimatch_cb_${idx}" checked style="width:18px; height:18px; accent-color: var(--accent-indigo); cursor:pointer;">
            </div>
            <div class="ai-match-reasons">
                ${r.reasons.map(reason => `<span class="ai-match-reason">${escapeHtml(reason)}</span>`).join('')}
            </div>
            <div class="ai-match-actions">
                <label style="font-size:12px; color:var(--text-muted);">关系类型:</label>
                <select id="aimatch_rel_${idx}">
                    <option value="direct" ${r.relationSuggestion === 'direct' ? 'selected' : ''}>直接驱动</option>
                    <option value="support" ${r.relationSuggestion === 'support' ? 'selected' : ''}>相关支撑</option>
                    <option value="reference" ${r.relationSuggestion === 'reference' ? 'selected' : ''}>参考关联</option>
                </select>
            </div>
        </div>`;
    }).join('');
}

export function applyAiMatches() {
    if (!_aiMatchTopicId || !_aiMatchResults.length) return;
    let linkedCount = 0;
    _aiMatchResults.forEach((r, idx) => {
        const cb = document.getElementById('aimatch_cb_' + idx);
        if (cb && cb.checked) {
            const relSelect = document.getElementById('aimatch_rel_' + idx);
            const relationType = relSelect ? relSelect.value : r.relationSuggestion;
            if (typeof window !== 'undefined' && window.linkIssueToTopic) {
                window.linkIssueToTopic(_aiMatchTopicId, r.issue.issueId, relationType);
            }
            linkedCount++;
        }
    });
    closeModal('aiMatchModal');
    if (linkedCount > 0) {
        showToast(`AI 智能关联完成！已关联 ${linkedCount} 条议题`, 'success');
        const linkModal = document.getElementById('linkIssuesModal');
        if (linkModal && linkModal.classList.contains('active')) {
            if (typeof window !== 'undefined' && window.renderLinkIssuesList) {
                window.renderLinkIssuesList();
            }
        }
    }
}

export function extractTitleKeywords(title) {
    if (!title || title.length < 4) return [];
    const stopWords = new Set(['的','了','在','是','和','就','不','都','一','上','也','很','到','说','要','去','会','着','看','好','这','那','个','为','与','及','等','对','可','能','由','从','被','将','于','中','而','或','但','如','若','给','以']);
    const words = [];
    for (let i = 0; i < title.length - 1; i++) {
        for (let len = 2; len <= 4 && i + len <= title.length; len++) {
            const word = title.slice(i, i + len);
            if (![...word].some(c => stopWords.has(c))) words.push(word);
        }
    }
    return [...new Set(words)].slice(0, 10);
}

export function findClusters(issues) {
    const issueKeywords = new Map();
    issues.forEach(issue => {
        issueKeywords.set(issue.issueId, extractTitleKeywords(issue.issueTitle || ''));
    });
    const clusters = [];
    const deptMap = new Map();
    issues.forEach(issue => {
        const dept = issue.department || '未指定';
        if (!deptMap.has(dept)) deptMap.set(dept, []);
        deptMap.get(dept).push(issue);
    });
    const checked = new Set();
    deptMap.forEach((deptIssues) => {
        let pairCount = 0;
        const maxPairs = 3000;
        outer: for (let i = 0; i < deptIssues.length; i++) {
            for (let j = i + 1; j < deptIssues.length; j++) {
                if (++pairCount > maxPairs) break outer;
                const issue1 = deptIssues[i];
                const issue2 = deptIssues[j];
                const key = [issue1.issueId, issue2.issueId].sort().join('|');
                if (checked.has(key)) continue;
                let score = 0;
                const evidence = [];
                const kpis1 = issue1.relatedKpis || [];
                const kpis2 = issue2.relatedKpis || [];
                const sharedKpis = kpis1.filter(k => kpis2.includes(k));
                if (sharedKpis.length > 0) {
                    score += sharedKpis.length * 0.35;
                    evidence.push({ type: 'SHARED_KPI', desc: `共享 ${sharedKpis.length} 个KPI`, strength: Math.min(0.95, sharedKpis.length * 0.35 + 0.3) });
                }
                if (issue1.meetingDate && issue2.meetingDate && issue1.meetingDate.slice(0, 7) === issue2.meetingDate.slice(0, 7)) {
                    score += 0.25;
                    evidence.push({ type: 'TIME_OVERLAP', desc: `同月召开`, strength: 0.6 });
                }
                const words1 = issueKeywords.get(issue1.issueId);
                const words2 = issueKeywords.get(issue2.issueId);
                let sharedCount = 0;
                for (const w of words1) { if (words2.includes(w)) sharedCount++; }
                if (sharedCount > 0) {
                    score += Math.min(0.2, sharedCount * 0.05);
                    evidence.push({ type: 'SEMANTIC_SIMILARITY', desc: `标题关键词重叠`, strength: 0.5 });
                }
                if (issue1.meetingName && issue2.meetingName && issue1.meetingName === issue2.meetingName) {
                    score += 0.2;
                    evidence.push({ type: 'SAME_MEETING', desc: `同一次会议`, strength: 0.6 });
                }
                if (score >= 0.5) {
                    clusters.push({ issues: [issue1, issue2], evidence, confidence: Math.min(0.95, score) });
                    checked.add(key);
                    if (clusters.length >= 20) break outer;
                }
            }
        }
    });
    return clusters;
}

export function checkUpgradePotential(issue) {
    let score = 0.1;
    if ((issue.actionItems || []).length > 3) score += 0.25;
    if ((issue.relatedKpis || []).length >= 3) score += 0.25;
    if (issue.status === '审议中' || issue.status === '进行中') score += 0.15;
    if ((issue.issueTitle || '').length > 20) score += 0.1;
    return Math.min(1, score);
}

export function findExecutionRisks(issues) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return issues.filter(issue => {
        if (issue.status === '已关闭' || issue.status === '关闭' || issue.status === 'closed') return false;
        const items = issue.actionItems || [];
        if (items.length === 0) {
            // 无行动项：如果已决议或长期未决也算风险
            if (issue.status === '已决议') return true;
            if (issue.meetingDate && new Date(issue.meetingDate) < thirtyDaysAgo) return true;
            return false;
        }
        const completed = items.filter(a => a.status === '已完成').length;
        return completed / items.length < 0.5;
    });
}

export function findLongPendingIssues(issues) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return issues.filter(issue => {
        if (!issue.meetingDate) return false;
        const d = new Date(issue.meetingDate);
        const isClosed = issue.status === '已关闭' || issue.status === '关闭' || issue.status === 'closed';
        return d < thirtyDaysAgo && !isClosed;
    });
}

export function findDeptConcentration(issues) {
    const dist = {};
    issues.forEach(issue => {
        const dept = issue.department || '未指定';
        dist[dept] = (dist[dept] || 0) + 1;
    });
    const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? { topDept: sorted[0][0], topCount: sorted[0][1], distribution: dist } : null;
}

export function findHighPriorityIssues(issues) {
    return issues.filter(i => i.priority === 'P0' || i.priority === '高' || i.priority === 'High');
}

export function findIssuesWithoutActionItems(issues) {
    return issues.filter(i => !(i.actionItems && i.actionItems.length > 0));
}

// Stub functions for missing analysis helpers
function findStuckIssues(issues) {
    return issues.filter(i => i.processStatus === '进行中' && i.node === '初审');
}

function findNoConclusionIssues(issues) {
    return issues.filter(i => !i.conclusion || i.conclusion.trim() === '');
}

function findDeadlineRisk(issues) {
    return issues.filter(i => i.deadline && new Date(i.deadline) < new Date(Date.now() + 7 * 86400000));
}

function findTypeDistribution(issues) {
    const dist = {};
    issues.forEach(i => { dist[i.issueType || '未知'] = (dist[i.issueType || '未知'] || 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
}

function findProcessDistribution(issues) {
    const dist = {};
    issues.forEach(i => { dist[i.node || '未知'] = (dist[i.node || '未知'] || 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
}

function findStatusDistribution(issues) {
    const dist = {};
    issues.forEach(i => { dist[i.processStatus || '未知'] = (dist[i.processStatus || '未知'] || 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
}

function findNodeDistribution(issues) {
    const dist = {};
    issues.forEach(i => { dist[i.node || '未知'] = (dist[i.node || '未知'] || 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
}

function findProposerActivity(issues) {
    const dist = {};
    issues.forEach(i => { dist[i.proposer || '未知'] = (dist[i.proposer || '未知'] || 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
}

function findHandlerActivity(issues) {
    const dist = {};
    issues.forEach(i => { dist[i.handler || '未知'] = (dist[i.handler || '未知'] || 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
}

function computeAvgProcessDays(issues) {
    const withDays = issues.filter(i => i.processDays && i.processDays > 0);
    return withDays.length > 0 ? Math.round(withDays.reduce((s, i) => s + i.processDays, 0) / withDays.length) : 0;
}

export function analyzeDistribution(issues) {
    const dist = {};
    issues.forEach(issue => {
        const type = issue.issueType || '未知';
        dist[type] = (dist[type] || 0) + 1;
    });
    return dist;
}

export function generateGlobalReport(issues, reportType) {
    const checksum = simpleHash(JSON.stringify(issues.map(i => i.issueId).sort()));
    const cached = loadCachedReport(reportType, checksum);
    if (cached) return { ...cached, isCached: true };

    // ===== 执行各类分析 =====
    const clusters = findClusters(issues);
    const longPending = findLongPendingIssues(issues);
    const stuck = findStuckIssues(issues);
    const noConclusion = findNoConclusionIssues(issues);
    const deadlineRisk = findDeadlineRisk(issues);
    const typeDist = findTypeDistribution(issues);
    const processDist = findProcessDistribution(issues);
    const statusDist = findStatusDistribution(issues);
    const nodeDist = findNodeDistribution(issues);
    const proposerActivity = findProposerActivity(issues);
    const handlerActivity = findHandlerActivity(issues);
    const deptConc = findDeptConcentration(issues);
    const noActionItems = findIssuesWithoutActionItems(issues);
    const avgProcessDays = computeAvgProcessDays(issues);

    const inProgressCount = issues.filter(i => (i.processStatus || i.status || '').includes('进行中')).length;
    const closedCount = issues.filter(i => (i.processStatus || i.status || '').includes('关闭') || (i.processStatus || i.status || '').includes('完成')).length;
    const totalIssues = issues.length;

    const findings = [];

    if (clusters.length > 0) {
        findings.push({
            findingId: 'F001', title: '议题聚合机会', confidence: 0.85, type: 'CLUSTER',
            description: `发现 ${clusters.length} 组高度相关的议题（同类型/关键词重叠/同一提交人/同月），建议聚合成专题管理`,
            evidence: clusters.slice(0, 5).map(c => ({
                type: c.evidence[0]?.type || 'SAME_TYPE',
                desc: `${c.issues[0].issueSubject || c.issues[0].issueTitle} ↔ ${c.issues[1].issueSubject || c.issues[1].issueTitle}`,
                strength: c.confidence
            })),
            relatedIssues: [...new Set(clusters.slice(0, 10).flatMap(c => c.issues.map(i => i.issueId)))],
            suggestedAction: '查看关联议题并考虑创建业务专题进行统一管理'
        });
    }
    if (deadlineRisk.length > 0) {
        findings.push({
            findingId: 'F002', title: '逾期议题预警', confidence: 0.88, type: 'RISK',
            description: `${deadlineRisk.length} 个议题已超过补充意见截止时间仍未关闭（占 ${(deadlineRisk.length / totalIssues * 100).toFixed(1)}%），需紧急跟进`,
            evidence: deadlineRisk.slice(0, 5).map(i => ({
                type: 'DEADLINE',
                desc: `${i.issueSubject || i.issueTitle} (截止: ${i.commentDeadline || '未知'})`,
                strength: 0.8
            })),
            relatedIssues: deadlineRisk.map(i => i.issueId),
            suggestedAction: '立即review逾期议题，明确当前负责人并推动闭环'
        });
    }
    if (longPending.length > 0) {
        findings.push({
            findingId: 'F003', title: '长期未更新议题', confidence: 0.82, type: 'RISK',
            description: `${longPending.length} 个议题超过 30 天未更新（占 ${(longPending.length / totalIssues * 100).toFixed(1)}%），可能存在推进停滞`,
            evidence: longPending.slice(0, 5).map(i => ({
                type: 'TIME_OVERLAP',
                desc: `${i.issueSubject || i.issueTitle} (更新: ${i.updateTime || '未知'})`,
                strength: 0.7
            })),
            relatedIssues: longPending.map(i => i.issueId),
            suggestedAction: 'review长期未更新议题，确认是否需要重新激活或关闭'
        });
    }
    if (stuck.length > 0) {
        findings.push({
            findingId: 'F004', title: '卡滞议题预警', confidence: 0.8, type: 'RISK',
            description: `${stuck.length} 个"进行中"议题超过 14 天未更新，当前节点可能卡滞`,
            evidence: stuck.slice(0, 5).map(i => ({
                type: 'NODE_STUCK',
                desc: `${i.issueSubject || i.issueTitle} (节点: ${i.currentNode || '未知'})`,
                strength: 0.75
            })),
            relatedIssues: stuck.map(i => i.issueId),
            suggestedAction: '催促当前节点负责人推进，或升级处理'
        });
    }
    if (noConclusion.length > 0) {
        findings.push({
            findingId: 'F005', title: '缺少结论的议题', confidence: 0.75, type: 'GAP',
            description: `${noConclusion.length} 个议题（${(noConclusion.length / totalIssues * 100).toFixed(1)}%）尚未形成结论，影响决策闭环`,
            evidence: [{
                type: 'NO_CONCLUSION',
                desc: `涉及 ${[...new Set(noConclusion.map(i => i.issueCategory || i.issueType || '未分类'))].length} 种议题类型`,
                strength: Math.min(0.8, noConclusion.length / totalIssues)
            }],
            relatedIssues: noConclusion.slice(0, 20).map(i => i.issueId),
            suggestedAction: '组织专题讨论，推动议题形成明确结论'
        });
    }
    if (typeDist.length > 0 && typeDist[0][1] / totalIssues > 0.3) {
        findings.push({
            findingId: 'F006', title: '议题类型集中度', confidence: 0.7, type: 'DISTRIBUTION',
            description: `${typeDist[0][0]} 类议题占 ${(typeDist[0][1] / totalIssues * 100).toFixed(1)}%，为当前最主要议题类别`,
            evidence: typeDist.slice(0, 5).map(([k, v]) => ({
                type: 'DISTRIBUTION',
                desc: `${k}: ${v} 个 (${(v / totalIssues * 100).toFixed(0)}%)`,
                strength: v / totalIssues
            })),
            relatedIssues: [],
            suggestedAction: typeDist[0][1] / totalIssues > 0.5 ? 'review议题组合，确保各类型议题均衡覆盖' : '持续关注议题类型结构'
        });
    }
    if (nodeDist.length > 0) {
        const topNode = nodeDist[0];
        if (topNode[1] / totalIssues > 0.2) {
            findings.push({
                findingId: 'F007', title: '审批节点集中', confidence: 0.68, type: 'DISTRIBUTION',
                description: `${topNode[0]} 节点积压了 ${topNode[1]} 个议题（${(topNode[1] / totalIssues * 100).toFixed(1)}%），可能存在审批瓶颈`,
                evidence: nodeDist.slice(0, 5).map(([k, v]) => ({
                    type: 'NODE_DIST',
                    desc: `${k}: ${v} 个`,
                    strength: v / totalIssues
                })),
                relatedIssues: issues.filter(i => i.currentNode === topNode[0]).map(i => i.issueId),
                suggestedAction: '评估当前节点审批效率，必要时增加处理人或简化流程'
            });
        }
    }

    const summary = `本期共分析 ${totalIssues} 个议题：${inProgressCount} 个进行中，${closedCount} 个已关闭；${typeDist.length} 种议题类型，平均处理周期 ${avgProcessDays} 天；${deadlineRisk.length} 个逾期，${longPending.length} 个长期未更新，${stuck.length} 个卡滞，${noConclusion.length} 个缺少结论`;

    const recommendations = [
        deadlineRisk.length > 0 ? `🚨 优先处理 ${deadlineRisk.length} 个逾期议题` : '逾期控制良好',
        stuck.length > 0 ? `⚠️ ${stuck.length} 个议题卡滞，需推动当前节点审批` : '议题流转顺畅',
        noConclusion.length > totalIssues * 0.1 ? `📝 ${noConclusion.length} 个议题缺少结论，需组织专题讨论` : '结论覆盖率良好',
        longPending.length > 0 ? `⏰ review ${longPending.length} 个长期未更新议题` : '更新频率正常',
        clusters.length > 0 ? `🔗 考虑将 ${clusters.length} 组相关议题聚合成专题管理` : '持续关注议题关联性',
        typeDist[0] && typeDist[0][1] / totalIssues > 0.5 ? `📊 ${typeDist[0][0]} 类议题占比过半，建议评估资源投入` : '议题类型分布均衡'
    ].filter(Boolean);

    const report = {
        reportId: 'RPT_' + Date.now(), reportType,
        analysisPeriod: '最近导入批次', issueCount: totalIssues,
        dataChecksum: checksum, isCached: false, summary, findings, recommendations,
        stats: {
            totalIssues, inProgressCount, closedCount,
            longPendingCount: longPending.length,
            stuckCount: stuck.length,
            deadlineRiskCount: deadlineRisk.length,
            noConclusionCount: noConclusion.length,
            noActionItemCount: noActionItems.length,
            avgProcessDays,
            typeCount: typeDist.length,
            topType: typeDist[0] ? typeDist[0][0] : '',
            topTypeRatio: typeDist[0] ? (typeDist[0][1] / totalIssues) : 0,
            nodeCount: nodeDist.length,
            typeDistribution: typeDist,
            processDistribution: processDist,
            statusDistribution: statusDist,
            nodeDistribution: nodeDist,
            proposerTop5: proposerActivity.slice(0, 5),
            handlerTop5: handlerActivity.slice(0, 5)
        }
    };
    saveCachedReport(reportType, checksum, report);
    return report;
}

export function loadCachedReport(reportType, checksum) {
    try {
        const raw = Storage.getString('dste_ai_reports_v1_' + reportType);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        // schemaVersion check: invalidate old cache when report structure changes
        if (!cache.report || cache.report.schemaVersion !== 2) return null;
        return cache.checksum === checksum ? cache.report : null;
    } catch { return null; }
}

export function saveCachedReport(reportType, checksum, report) {
    try {
        report.schemaVersion = 2;
        Storage.set('dste_ai_reports_v1_' + reportType, { checksum, report, cachedAt: new Date().toISOString() });
    } catch (e) { console.warn('[ReportCache] 缓存保存失败:', e.message); }
}

export function openAiReportModal(reportType) {
    _currentReportType = reportType;
    const issues = loadIssues(reportType);
    const report = generateGlobalReport(issues, reportType + '_GLOBAL');

    document.getElementById('aiReportTitle').textContent = (reportType === 'ST' ? '🏛️ ST' : '🏢 AT') + ' 议题全局分析报告';
    document.getElementById('aiReportSubtitle').textContent = '分析周期: ' + report.analysisPeriod + ' | 议题总数: ' + report.issueCount + (report.isCached ? ' | 来自缓存' : ' | 刚刚生成');

    // ===== 构建丰富的报告视图 =====
    const s = report.stats || {};
    const maxVal = (arr) => arr && arr.length > 0 ? Math.max(...arr.map(x => x[1])) : 1;

    // 1. 概览卡片
    const overviewHtml = `<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="text-align: center; padding: 14px 8px; background: var(--bg-surface); border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 26px; font-weight: 700; color: var(--primary);">${s.totalIssues || 0}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">议题总数</div>
        </div>
        <div style="text-align: center; padding: 14px 8px; background: var(--bg-surface); border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 26px; font-weight: 700; color: var(--success);">${s.inProgressCount || 0}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">进行中</div>
        </div>
        <div style="text-align: center; padding: 14px 8px; background: var(--bg-surface); border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 26px; font-weight: 700; color: var(--warning);">${s.closedCount || 0}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">已关闭</div>
        </div>
        <div style="text-align: center; padding: 14px 8px; background: var(--bg-surface); border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 26px; font-weight: 700; color: var(--danger);">${s.deadlineRiskCount || 0}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">已逾期</div>
        </div>
        <div style="text-align: center; padding: 14px 8px; background: var(--bg-surface); border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 26px; font-weight: 700; color: var(--accent-violet);">${s.avgProcessDays || 0}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">平均处理(天)</div>
        </div>
    </div>`;

    // 2. 类型分布条形图
    const typeDistHtml = (s.typeDistribution || []).slice(0, 8).map(([name, count]) => {
        const pct = ((count / (s.totalIssues || 1)) * 100).toFixed(0);
        return `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px;">
            <div style="width: 140px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary);">${escapeHtml(name)}</div>
            <div style="flex: 1; height: 18px; background: var(--bg-surface); border-radius: 4px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent-violet)); border-radius: 4px;"></div>
            </div>
            <div style="width: 50px; color: var(--text-muted);">${count} (${pct}%)</div>
        </div>`;
    }).join('');

    // 3. 流程状态分布
    const processDistHtml = (s.processDistribution || []).slice(0, 6).map(([name, count]) => {
        const pct = ((count / (s.totalIssues || 1)) * 100).toFixed(0);
        return `<span style="display: inline-block; padding: 4px 10px; margin: 3px; background: var(--bg-surface); border-radius: 12px; font-size: 12px; color: var(--text-secondary); border: 1px solid var(--border-subtle);">
            ${escapeHtml(name)} <strong style="color: var(--primary);">${count}</strong> <span style="color: var(--text-muted); font-size: 11px;">${pct}%</span>
        </span>`;
    }).join('');

    // 4. 节点分布
    const nodeDistHtml = (s.nodeDistribution || []).slice(0, 6).map(([name, count]) => {
        const pct = ((count / (s.totalIssues || 1)) * 100).toFixed(0);
        return `<span style="display: inline-block; padding: 4px 10px; margin: 3px; background: var(--bg-surface); border-radius: 12px; font-size: 12px; color: var(--text-secondary); border: 1px solid var(--border-subtle);">
            ${escapeHtml(name)} <strong style="color: var(--warning);">${count}</strong> <span style="color: var(--text-muted); font-size: 11px;">${pct}%</span>
        </span>`;
    }).join('');

    // 5. 人员活跃度
    const proposerHtml = (s.proposerTop5 || []).map(([name, count]) =>
        `<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--border-subtle); font-size: 12px;">
            <span style="color: var(--text-secondary);">${escapeHtml(name)}</span><span style="color: var(--primary); font-weight: 600;">${count}</span>
        </div>`
    ).join('');
    const handlerHtml = (s.handlerTop5 || []).map(([name, count]) =>
        `<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--border-subtle); font-size: 12px;">
            <span style="color: var(--text-secondary);">${escapeHtml(name)}</span><span style="color: var(--success); font-weight: 600;">${count}</span>
        </div>`
    ).join('');

    // 6. 核心发现
    let findingsHtml = '';
    if (report.findings && report.findings.length > 0) {
        findingsHtml = report.findings.map(f => {
            const typeColor = f.type === 'CLUSTER' ? '#4f46e5' : f.type === 'RISK' ? '#dc2626' : '#0891b2';
            return `<div style="margin-bottom: 12px; padding: 12px 14px; background: var(--bg-surface); border-radius: 8px; border-left: 3px solid ${typeColor};">
                <div style="font-weight: 600; margin-bottom: 4px; font-size: 13px; display: flex; justify-content: space-between;">
                    <span>${escapeHtml(f.title)}</span>
                    <span style="font-size: 11px; color: var(--text-muted);">置信 ${Math.round(f.confidence * 100)}%</span>
                </div>
                <div style="font-size: 12px; color: var(--text-tertiary); line-height: 1.5;">${escapeHtml(f.description)}</div>
                ${f.evidence && f.evidence.length > 0 ? '<div style="margin-top: 6px; font-size: 11px; color: var(--text-muted);">' + f.evidence.slice(0, 3).map(e => escapeHtml(e.desc)).join(' · ') + '</div>' : ''}
            </div>`;
        }).join('');
    } else {
        findingsHtml = '<div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px;">暂无显著发现</div>';
    }

    // 7. 综合建议
    const recommendationsHtml = (report.recommendations || []).length > 0
        ? `<div style="padding: 12px 14px; background: var(--bg-surface); border-radius: 8px; font-size: 12px; color: var(--text-tertiary); line-height: 1.7;">
            ${report.recommendations.map(r => '<div style="margin-bottom: 4px;">• ' + escapeHtml(r) + '</div>').join('')}
           </div>`
        : '';

    // 组装报告
    document.getElementById('aiReportContent').innerHTML =
        overviewHtml +
        '<div style="margin-bottom: 12px; font-weight: 600; color: var(--text-secondary); font-size: 14px;">📊 执行摘要</div>' +
        '<div style="padding: 12px 14px; background: var(--bg-surface); border-radius: 8px; font-size: 12px; color: var(--text-tertiary); line-height: 1.6; margin-bottom: 20px;">' + escapeHtml(report.summary) + '</div>' +

        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">' +
            '<div>' +
                '<div style="margin-bottom: 10px; font-weight: 600; color: var(--text-secondary); font-size: 14px;">🏷️ 议题类型分布</div>' +
                '<div style="padding: 12px; background: var(--bg-surface); border-radius: 8px;">' + typeDistHtml + '</div>' +
            '</div>' +
            '<div>' +
                '<div style="margin-bottom: 10px; font-weight: 600; color: var(--text-secondary); font-size: 14px;">👥 人员活跃度</div>' +
                '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">' +
                    '<div style="padding: 10px; background: var(--bg-surface); border-radius: 8px;"><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Top 提交人</div>' + proposerHtml + '</div>' +
                    '<div style="padding: 10px; background: var(--bg-surface); border-radius: 8px;"><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Top 负责人</div>' + handlerHtml + '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<div style="margin-bottom: 10px; font-weight: 600; color: var(--text-secondary); font-size: 14px;">📋 流程与节点分布</div>' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">' +
            '<div style="padding: 12px; background: var(--bg-surface); border-radius: 8px;"><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">流程状态</div>' + (processDistHtml || '<span style="color: var(--text-muted); font-size: 12px;">无数据</span>') + '</div>' +
            '<div style="padding: 12px; background: var(--bg-surface); border-radius: 8px;"><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">当前节点</div>' + (nodeDistHtml || '<span style="color: var(--text-muted); font-size: 12px;">无数据</span>') + '</div>' +
        '</div>' +

        '<div style="margin-bottom: 12px; font-weight: 600; color: var(--text-secondary); font-size: 14px;">🔍 核心发现 (' + (report.findings || []).length + ')</div>' + findingsHtml +

        (recommendationsHtml ? '<div style="margin-top: 20px;"><div style="margin-bottom: 10px; font-weight: 600; color: var(--text-secondary); font-size: 14px;">💡 综合建议</div>' + recommendationsHtml + '</div>' : '');

    openModal('aiReportModal');
}

export function regenerateAiReport() {
    if (!_currentReportType) return;
    Storage.remove('dste_ai_reports_v1_' + _currentReportType + '_GLOBAL');
    document.getElementById('aiReportContent').innerHTML = '<div style="text-align:center; padding:60px;"><div style="font-size:32px; margin-bottom:12px;">🔄</div><div style="color:var(--text-secondary);">正在重新分析...</div></div>';
    setTimeout(() => {
        openAiReportModal(_currentReportType);
    }, 300);
}

export function updateAiReportCards() {
    ['ST', 'AT'].forEach(type => {
        const issues = loadIssues(type);
        const statusEl = document.getElementById(type.toLowerCase() + 'ReportStatus');
        const metaEl = document.getElementById(type.toLowerCase() + 'ReportMeta');
        if (statusEl && metaEl) {
            if (issues.length === 0) {
                statusEl.textContent = '暂无数据';
                metaEl.textContent = '请先导入' + type + '议题';
            } else {
                const typeDist = {};
                issues.forEach(i => {
                    const t = i.issueCategory || i.issueType || '未分类';
                    typeDist[t] = (typeDist[t] || 0) + 1;
                });
                const topType = Object.entries(typeDist).sort((a, b) => b[1] - a[1])[0];
                const inProgress = issues.filter(i => (i.processStatus || i.status || '').includes('进行中')).length;
                statusEl.textContent = `${issues.length} 条 · ${inProgress} 进行中`;
                metaEl.textContent = topType ? `Top类型: ${topType[0]} (${topType[1]}) · 点击查看报告` : '点击查看分析报告';
            }
        }
    });
}

export function openIssueDetailModal(issueId) {
    const allIssues = loadAllIssues();
    const issue = allIssues.find(i => i.issueId === issueId);
    if (!issue) return;

    document.getElementById('issueDetailTitle').textContent = (issue.sourceSystem === 'ST' ? '🏛️ ' : '🏢 ') + escapeHtml(issue.issueId);
    document.getElementById('issueDetailSubtitle').textContent = escapeHtml(issue.issueType || issue.department || '未分类') + ' · ' + escapeHtml(issue.proposer || '未指定') + ' · ' + escapeHtml(issue.status);

    let actionItemsHtml = '';
    if (issue.actionItems && issue.actionItems.length > 0) {
        actionItemsHtml = '<div style="margin-top: 12px;"><div style="font-weight: 600; margin-bottom: 8px; color: var(--text-secondary);">📋 行动项</div>' +
            issue.actionItems.map(a => '<div style="padding: 8px 12px; background: var(--bg-surface); border-radius: 6px; margin-bottom: 6px; font-size: 13px;">' +
                '<div>' + escapeHtml(a.item) + '</div>' +
                '<div style="color: var(--text-tertiary); margin-top: 4px;">负责人: ' + escapeHtml(a.owner) + ' | 截止: ' + escapeHtml(a.deadline) + ' | 状态: ' + escapeHtml(a.status) + '</div>' +
            '</div>').join('') + '</div>';
    }

    let kpisHtml = '';
    if (issue.relatedKpis && issue.relatedKpis.length > 0) {
        kpisHtml = '<div style="margin-top: 12px;"><div style="font-weight: 600; margin-bottom: 8px; color: var(--text-secondary);">📈 关联 KPI</div>' +
            '<div style="display: flex; gap: 8px; flex-wrap: wrap;">' + issue.relatedKpis.map(k => '<span style="padding: 4px 10px; background: var(--bg-surface); border-radius: 4px; font-size: 12px;">' + escapeHtml(k) + '</span>').join('') + '</div></div>';
    }

    let qualityHtml = '';
    if (issue.importQuality && issue.importQuality.hasWarnings) {
        qualityHtml = '<div style="margin-top: 12px; padding: 10px 12px; background: #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e;">' +
            '⚠️ 导入警告：<br>' + issue.importQuality.warnings.map(w => '• ' + escapeHtml(w)).join('<br>') + '</div>';
    }

    document.getElementById('issueDetailContent').innerHTML =
        '<div style="display: grid; gap: 12px;">' +
        '<div class="detail-row"><span class="detail-label">议题主题</span><span class="detail-value">' + escapeHtml(issue.issueTitle) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">片联议题类型</span><span class="detail-value"><span class="tag ' + getPriorityTagClass(issue.priority) + '">' + escapeHtml(issue.issueType || '未分类') + '</span></span></div>' +
        '<div class="detail-row"><span class="detail-label">议题状态</span><span class="detail-value">' + escapeHtml(issue.status) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">提交人</span><span class="detail-value">' + escapeHtml(issue.proposer || '未指定') + '</span></div>' +
        (issue.currentNode ? '<div class="detail-row"><span class="detail-label">当前节点</span><span class="detail-value">' + escapeHtml(issue.currentNode) + '</span></div>' : '') +
        (issue.currentOwner ? '<div class="detail-row"><span class="detail-label">当前负责人</span><span class="detail-value">' + escapeHtml(issue.currentOwner) + '</span></div>' : '') +
        (issue.content ? '<div class="detail-row" style="align-items: flex-start;"><span class="detail-label">议题描述</span><span class="detail-value">' + escapeHtml(issue.content).replace(/\n/g, '<br>') + '</span></div>' : '') +
        (issue.decision ? '<div class="detail-row" style="align-items: flex-start;"><span class="detail-label">结论</span><span class="detail-value">' + escapeHtml(issue.decision).replace(/\n/g, '<br>') + '</span></div>' : '') +
        (issue.submitTime ? '<div class="detail-row"><span class="detail-label">提交时间</span><span class="detail-value">' + escapeHtml(String(issue.submitTime).slice(0, 10)) + '</span></div>' : '') +
        actionItemsHtml + kpisHtml + qualityHtml +
        '</div>';

    openModal('issueDetailModal');
}

