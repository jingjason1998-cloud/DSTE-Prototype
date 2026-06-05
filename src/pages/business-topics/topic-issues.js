let _currentLinkTopicId = null;

export function linkIssueToTopic(topicId, issueId, relationType) {
    const topics = loadTopics();
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    topic.linkedIssues = topic.linkedIssues || [];
    const existing = topic.linkedIssues.find(li => li.issueId === issueId);
    const allIssues = loadAllIssues();
    const issue = allIssues.find(i => i.issueId === issueId);
    if (!issue) return;
    if (existing) {
        existing.relationType = relationType || 'support';
    } else {
        topic.linkedIssues.push({
            issueId: issue.issueId,
            sourceSystem: issue.sourceSystem,
            meetingName: issue.meetingName,
            meetingDate: issue.meetingDate,
            issueTitle: issue.issueTitle,
            relationType: relationType || 'support',
            linkStrength: 0.8,
            linkedAt: new Date().toISOString(),
            linkedBy: '用户:' + CURRENT_USER
        });
    }
    updateTopicIssueStats(topic);
    saveTopics(topics);
    renderTable();
    renderStats();
}

export function unlinkIssueFromTopic(topicId, issueId) {
    const topics = loadTopics();
    const topic = topics.find(t => t.id === topicId);
    if (!topic || !topic.linkedIssues) return;
    topic.linkedIssues = topic.linkedIssues.filter(li => li.issueId !== issueId);
    updateTopicIssueStats(topic);
    saveTopics(topics);
    renderTable();
    renderStats();
}

export function updateTopicIssueStats(topic) {
    const linked = topic.linkedIssues || [];
    topic.issueStats = {
        stCount: linked.filter(i => i.sourceSystem === 'ST').length,
        atCount: linked.filter(i => i.sourceSystem === 'AT').length,
        totalCount: linked.length,
        lastMeetingDate: linked.length > 0 ? linked.map(i => i.meetingDate).sort().pop() : null
    };
}

export function openLinkIssuesModal(topicId) {
    _currentLinkTopicId = topicId;
    const topic = loadTopics().find(t => t.id === topicId);
    document.getElementById('linkIssuesSubtitle').textContent = topic ? '「' + topic.name + '」' : '';
    document.getElementById('linkIssuesSearch').value = '';
    window._linkIssuesFilter = 'all';
    renderLinkIssuesList();
    openModal('linkIssuesModal');
}

export function renderLinkIssuesList() {
    const container = document.getElementById('linkIssuesList');
    const search = document.getElementById('linkIssuesSearch').value.trim().toLowerCase();
    const allIssues = loadAllIssues();
    const topic = loadTopics().find(t => t.id === _currentLinkTopicId);
    const linkedIds = new Set((topic?.linkedIssues || []).map(li => li.issueId));
    const linkedMap = new Map((topic?.linkedIssues || []).map(li => [li.issueId, li]));

    let filtered = allIssues;
    if (window._linkIssuesFilter !== 'all') {
        filtered = filtered.filter(i => i.sourceSystem === window._linkIssuesFilter);
    }
    if (search) {
        filtered = filtered.filter(i =>
            (i.issueTitle || '').toLowerCase().includes(search) ||
            (i.issueId || '').toLowerCase().includes(search) ||
            (i.department || '').toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">暂无议题数据<br>请先导入议题</div>';
        return;
    }

    container.innerHTML = filtered.map(issue => {
        const isLinked = linkedIds.has(issue.issueId);
        const existing = linkedMap.get(issue.issueId);
        const relationType = existing?.relationType || 'support';
        const badgeClass = issue.sourceSystem === 'ST' ? 'st' : 'at';
        const relBadgeClass = relationType === 'direct' ? 'relation-direct' : relationType === 'support' ? 'relation-support' : 'relation-reference';
        const relLabel = relationType === 'direct' ? '直接驱动' : relationType === 'support' ? '相关支撑' : '参考关联';
        return `<div class="link-issue-item ${isLinked ? 'linked' : ''}">
            <input type="checkbox" id="link_cb_${issue.issueId}" ${isLinked ? 'checked' : ''} style="cursor:pointer; width: 16px; height: 16px; accent-color: var(--accent-indigo);" data-link-checkbox data-issue-id="${issue.issueId}">
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                    <span class="link-issue-badge ${badgeClass}">${issue.sourceSystem}</span>
                    <span style="font-weight: 600; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(issue.issueId)} ${escapeHtml(issue.issueTitle)}</span>
                    ${isLinked ? `<span class="link-issue-badge ${relBadgeClass}">${relLabel}</span>` : ''}
                </div>
                <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(issue.issueType || issue.department || '未分类')} · ${escapeHtml(issue.proposer || '未指定')} · ${escapeHtml(issue.status)}${issue.currentNode ? ' · ' + escapeHtml(issue.currentNode) : ''}</div>
            </div>
            <select id="link_rel_${issue.issueId}" style="font-size: 12px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-standard); display: ${isLinked ? 'inline-block' : 'none'}; background: var(--bg-surface); color: var(--text-primary); min-width: 90px;">
                <option value="direct" ${relationType === 'direct' ? 'selected' : ''}>直接驱动</option>
                <option value="support" ${relationType === 'support' ? 'selected' : ''}>相关支撑</option>
                <option value="reference" ${relationType === 'reference' ? 'selected' : ''}>参考关联</option>
            </select>
        </div>`;
    }).join('');
}

export function saveTopicLinks() {
    if (!_currentLinkTopicId) return;
    const allIssues = loadAllIssues();
    const topic = loadTopics().find(t => t.id === _currentLinkTopicId);
    if (!topic) return;

    const previouslyLinked = new Set((topic.linkedIssues || []).map(li => li.issueId));
    const currentlyLinked = new Set();

    allIssues.forEach(issue => {
        const cb = document.getElementById('link_cb_' + issue.issueId);
        if (cb && cb.checked) {
            currentlyLinked.add(issue.issueId);
            const relSelect = document.getElementById('link_rel_' + issue.issueId);
            const relationType = relSelect ? relSelect.value : 'support';
            linkIssueToTopic(_currentLinkTopicId, issue.issueId, relationType);
        }
    });

    // Remove unchecked
    previouslyLinked.forEach(issueId => {
        if (!currentlyLinked.has(issueId)) {
            unlinkIssueFromTopic(_currentLinkTopicId, issueId);
        }
    });

    closeModal('linkIssuesModal');
}

