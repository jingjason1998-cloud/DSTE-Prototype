// ==========================================
// AI 智能匹配诊断脚本
// 在正式系统的浏览器控制台粘贴运行
// ==========================================

(() => {
    const topic = window.loadTopics().find(t => t.id === window._currentLinkTopicId);
    if (!topic) {
        console.error('❌ 请先打开「关联议题」弹窗并点击「AI 智能匹配」');
        return;
    }

    const allIssues = window.loadAllIssues ? window.loadAllIssues() : [];
    const linkedIds = new Set((topic.linkedIssues || []).map(li => li.issueId));
    const candidates = allIssues.filter(i => !linkedIds.has(i.issueId));

    console.log('========================================');
    console.log('📋 诊断报告');
    console.log('========================================');
    console.log('专题:', topic.name);
    console.log('负责人:', topic.owner);
    console.log('部门:', topic.department);
    console.log('时间:', topic.startDate, '~', topic.endDate);
    console.log('标签:', topic.tags || []);
    console.log('');
    console.log('议题总数:', allIssues.length);
    console.log('已关联:', linkedIds.size);
    console.log('待匹配:', candidates.length);
    console.log('');

    if (candidates.length === 0) {
        console.error('❌ 没有可匹配的议题（全部已关联或议题数据为空）');
        return;
    }

    // 检查议题数据字段完整性
    console.log('📊 议题字段统计（前3条样本）:');
    candidates.slice(0, 3).forEach((issue, i) => {
        console.log(`  [${i + 1}] ${issue.issueId} ${issue.issueTitle}`);
        console.log(`      sourceSystem: ${issue.sourceSystem}`);
        console.log(`      department: ${issue.department}`);
        console.log(`      proposer: ${issue.proposer}`);
        console.log(`      meetingDate: ${issue.meetingDate}`);
        console.log(`      status: ${issue.status}`);
        console.log(`      content: ${(issue.content || '').slice(0, 50)}...`);
        console.log(`      decision: ${(issue.decision || '').slice(0, 50)}...`);
        console.log(`      relatedKpis: ${(issue.relatedKpis || []).join(',')}`);
    });
    console.log('');

    // 模拟计算得分分布
    const scores = candidates.map(issue => {
        let score = 0;
        let reasons = [];

        // 1. 负责人匹配
        const extractNames = (text) => {
            if (!text) return [];
            const cn = (text.match(/[一-鿿]{2,4}/g) || []);
            const en = (text.match(/[a-zA-Z][a-zA-Z0-9._-]*/g) || []);
            return [...new Set([...cn, ...en])];
        };
        const topicOwner = extractNames(topic.owner || '');
        const issueProposer = extractNames(issue.proposer || '');
        const ownerMatch = topicOwner.some(n => issueProposer.includes(n));
        if (ownerMatch) { score += 0.18; reasons.push('同一负责人'); }

        // 2. 部门匹配
        const tDept = (topic.department || '').trim();
        const iDept = (issue.department || '').trim();
        if (tDept && iDept && tDept !== '-' && iDept !== '-') {
            if (tDept === iDept) { score += 0.15; reasons.push('部门一致'); }
            else if (tDept.includes(iDept) || iDept.includes(tDept)) { score += 0.10; reasons.push('部门相关'); }
        }

        // 3. 关键词提取（简化版）
        const extractKeywords = (text) => {
            if (!text) return [];
            const stopWords = new Set(['的','了','在','是','和','就','不','都','一','上','也','很','到','说','要','去','会','着','看','好','这','那','个','为','与','及','等','对','可','能','由','从','被','将','于','中','而','或','但','如','若','给','以','之','其','有','我','你','他','她','它','们','来','过','下','短','年','月','日','时','分','秒','第','把','让','向','往','前','后','左','右','内','外','间','里','面']);
            const cleaned = text.toLowerCase();
            const words = [];
            const segments = cleaned.split(/[^一-鿿]+/).filter(s => s.length >= 2);
            segments.forEach(seg => {
                for (let i = 0; i < seg.length - 1; i++) {
                    for (let len = 2; len <= 4 && i + len <= seg.length; len++) {
                        const word = seg.slice(i, i + len);
                        if (![...word].some(c => stopWords.has(c))) words.push(word);
                    }
                }
            });
            return [...new Set(words)].slice(0, 30);
        };
        const topicText = [topic.name, topic.description, topic.target, topic.department, ...(topic.tags || [])].join(' ');
        const issueText = [issue.issueTitle, issue.content, issue.decision, issue.issueType, issue.department, ...(issue.relatedKpis || [])].join(' ');
        const topicKw = extractKeywords(topicText);
        const issueKw = extractKeywords(issueText);
        const sa = new Set(topicKw), sb = new Set(issueKw);
        const exactMatch = [...sa].filter(x => sb.has(x));
        const jaccard = exactMatch.length / Math.max([...new Set([...sa, ...sb])].length, 1);
        score += jaccard * 0.35;
        if (jaccard > 0.05) reasons.push(`关键词${Math.round(jaccard * 100)}%`);

        // 4. 时间窗口
        const issueDate = issue.meetingDate || issue.submitTime;
        if (topic.startDate && topic.endDate && issueDate) {
            const s = new Date(topic.startDate), e = new Date(topic.endDate), m = new Date(issueDate);
            if (m >= s && m <= e) { score += 0.08; reasons.push('时间在范围内'); }
        }

        // 5. 名称包含
        const tName = (topic.name || '').toLowerCase();
        const iTitle = (issue.issueTitle || '').toLowerCase();
        if (tName && iTitle && (tName.includes(iTitle) || iTitle.includes(tName))) {
            score += 0.12; reasons.push('名称包含');
        }

        return { issue, score: Math.min(0.99, score), reasons };
    });

    scores.sort((a, b) => b.score - a.score);

    // 得分分布
    console.log('📈 得分分布:');
    const bins = { '0.00-0.05': 0, '0.05-0.10': 0, '0.10-0.15': 0, '0.15-0.20': 0, '0.20-0.30': 0, '0.30+': 0 };
    scores.forEach(s => {
        if (s.score < 0.05) bins['0.00-0.05']++;
        else if (s.score < 0.10) bins['0.05-0.10']++;
        else if (s.score < 0.15) bins['0.10-0.15']++;
        else if (s.score < 0.20) bins['0.15-0.20']++;
        else if (s.score < 0.30) bins['0.20-0.30']++;
        else bins['0.30+']++;
    });
    Object.entries(bins).forEach(([range, count]) => {
        const bar = '█'.repeat(Math.round(count / Math.max(scores.length, 1) * 30));
        console.log(`  ${range}: ${String(count).padStart(3)} ${bar}`);
    });
    console.log('');

    // TOP 10 详情
    console.log('🏆 TOP 10 匹配详情:');
    scores.slice(0, 10).forEach((s, i) => {
        const pass = s.score >= 0.20 ? '✅' : '❌';
        console.log(`  ${pass} #${i + 1} ${(s.score * 100).toFixed(1)}% | ${s.issue.issueId} ${s.issue.issueTitle.slice(0, 20)}`);
        console.log(`      原因: ${s.reasons.join(', ') || '无'}`);
    });
    console.log('');

    // 诊断结论
    const aboveThreshold = scores.filter(s => s.score >= 0.20).length;
    console.log('========================================');
    console.log('🔍 诊断结论');
    console.log('========================================');
    console.log(`当前阈值: 0.20 (推荐 ${aboveThreshold} 条)`);

    if (aboveThreshold === 0) {
        const above15 = scores.filter(s => s.score >= 0.15).length;
        const above10 = scores.filter(s => s.score >= 0.10).length;
        const above08 = scores.filter(s => s.score >= 0.08).length;
        console.log('');
        console.log('❌ 阈值 0.20 过高！没有任何议题超过阈值');
        console.log(`   如果阈值降到 0.15 → 推荐 ${above15} 条`);
        console.log(`   如果阈值降到 0.10 → 推荐 ${above10} 条`);
        console.log(`   如果阈值降到 0.08 → 推荐 ${above08} 条`);
        console.log('');
        console.log('💡 建议方案:');
        console.log('   1. 降低阈值到 0.10-0.15');
        console.log('   2. 或提高各维度权重（如负责人匹配权重）');
    } else {
        console.log(`✅ 有 ${aboveThreshold} 条超过阈值`);
    }

    if (candidates.length > 0 && scores[0].reasons.length === 0) {
        console.log('');
        console.log('⚠️ 所有议题得分为 0！可能原因:');
        console.log('   - 议题数据字段缺失（proposer/department/meetingDate 为空）');
        console.log('   - 专题和议题完全没有关键词重叠');
        console.log('   - 议题数据格式与代码期望不一致');
    }

    // 暴露到全局方便进一步调试
    window._diagnoseScores = scores;
    console.log('');
    console.log('💡 完整得分数组已保存到 window._diagnoseScores');
    console.log('   可运行 window._diagnoseScores.filter(s=>s.score>0.1) 查看高分项');
})();
