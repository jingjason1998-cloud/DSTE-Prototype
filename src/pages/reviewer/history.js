        async function renderHistoryPanel() {
            try {
                const history = await getReviewHistory(10);
                const listEl = document.getElementById('historyList');
                const trendEl = document.getElementById('trendChartBox');
                if (!history.length) {
                    listEl.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;">暂无审核记录<br><span style="font-size:0.8em;color:#d1d5db;">成功审核后记录会自动保存到服务器</span></p>';
                    if (trendEl) trendEl.style.display = 'none';
                    const vcBox = document.getElementById('versionCompareBox');
                    if (vcBox) vcBox.style.display = 'none';
                    return;
                }
                
                // 按 URL 分组，同一材料的多版本归为一组
                const urlGroups = {};
                history.forEach(rec => {
                    const key = rec.url || 'unknown';
                    if (!urlGroups[key]) urlGroups[key] = [];
                    urlGroups[key].push(rec);
                });
                
                // 按最新审核时间排序（最新的在前）
                const sortedGroups = Object.entries(urlGroups).sort((a, b) => {
                    const maxA = Math.max(...a[1].map(r => r.timestamp || 0));
                    const maxB = Math.max(...b[1].map(r => r.timestamp || 0));
                    return maxB - maxA;
                });
                
                let html = '';
                sortedGroups.forEach(([url, recs]) => {
                    recs.sort((a, b) => (a.version || 1) - (b.version || 1));
                    const latest = recs[recs.length - 1];
                    const hasMultiple = recs.length > 1;
                    
                    let tagsHtml = '';
                    recs.forEach(rec => {
                        const isLatest = rec.id === latest.id;
                        const bg = isLatest ? 'rgba(59,130,246,0.1)' : '#f3f4f6';
                        const color = isLatest ? '#2563eb' : '#6b7280';
                        const border = isLatest ? 'rgba(59,130,246,0.3)' : '#e5e7eb';
                        const timeStr = new Date(rec.timestamp || 0).toLocaleString('zh-CN');
                        tagsHtml += '<span class="history-version-tag' + (isLatest ? ' latest' : '') + '" style="padding:4px 10px;border-radius:6px;font-size:0.8em;cursor:pointer;background:' + bg + ';color:' + color + ';border:1px solid ' + border + ';white-space:nowrap;" onclick="event.stopPropagation();showHistoryDetail(' + rec.id + ')" title="' + escapeHtml(timeStr) + '">v' + (rec.version || 1) + ' · ' + (rec.total_score || '--') + '分</span>';
                    });
                    
                    let compareBtn = '';
                    if (hasMultiple) {
                        // 使用 data-url 方式避免引号嵌套问题
                        compareBtn = '<button class="btn btn-primary" style="padding:4px 12px;font-size:0.8em;" data-compare-url="' + escapeHtml(url) + '" onclick="event.stopPropagation();handleCompareClick(this)">&#128269; 对比版本</button>';
                    }
                    
                    html += '<div class="history-group" style="margin-bottom:16px;padding:16px;background:#f9fafb;border-radius:12px;border:1px solid #e8e8e8;">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
                    html += '<div style="font-weight:600;color:#1f2937;font-size:0.95em;">' + escapeHtml(latest.title || '无标题') + '</div>';
                    html += '<span style="font-size:0.8em;color:#9ca3af;">' + escapeHtml(latest.scene_name || '默认') + '</span>';
                    html += '</div>';
                    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;max-width:100%;">' + tagsHtml + '</div>';
                    html += '<div style="display:flex;gap:8px;align-items:center;">' + compareBtn + '<span style="font-size:0.75em;color:#9ca3af;">' + recs.length + ' 个版本</span></div>';
                    html += '</div>';
                });
                
                listEl.innerHTML = html;
                
                if (history.length >= 2) {
                    trendEl.style.display = 'block';
                    drawTrendChart(history);
                } else {
                    trendEl.style.display = 'none';
                }
                document.getElementById('versionCompareBox').style.display = 'none';
            } catch (err) {
                console.error('renderHistoryPanel 错误:', err);
                document.getElementById('historyList').innerHTML = '<p style="color:#dc2626;text-align:center;padding:20px;">加载失败: ' + escapeHtml(err.message) + '<br><span style="font-size:0.8em;color:#9ca3af;">请按 F12 查看控制台详细错误</span></p>';
            }
        }

        async function handleCompareClick(btn) {
            const url = btn.getAttribute('data-compare-url');
            if (!url) return;
            const history = await getReviewHistory(10);
            const versions = history.filter(r => r.url === url).sort((a, b) => (a.version || 1) - (b.version || 1));
            if (versions.length < 2) { alert('该材料不足2个版本，无法对比'); return; }
            showVersionCompare(versions[0], versions[versions.length - 1]);
        }

        function compareIssues(issues1, issues2) {
            const resolved = [];
            const persistent = [];
            const newIssues = [];
            
            const matched2 = new Set();
            issues1.forEach((iss1, idx1) => {
                let bestMatch = -1;
                let bestScore = 0;
                
                issues2.forEach((iss2, idx2) => {
                    if (matched2.has(idx2)) return;
                    const score = textSimilarity(iss1.desc || '', iss2.desc || '');
                    if (score > bestScore && score > 0.5) {
                        bestScore = score;
                        bestMatch = idx2;
                    }
                });
                
                if (bestMatch >= 0) {
                    matched2.add(bestMatch);
                    persistent.push({v1: iss1, v2: issues2[bestMatch], similarity: bestScore});
                } else {
                    resolved.push(iss1);
                }
            });
            
            issues2.forEach((iss2, idx2) => {
                if (!matched2.has(idx2)) {
                    newIssues.push(iss2);
                }
            });
            
            return {resolved, persistent, new: newIssues};
        }

        function generateCompareSummary(v1, v2, compareResult) {
            const scoreChange = (v2.total_score || 0) - (v1.total_score || 0);
            const resolvedFatal = compareResult.issues.resolved.filter(i => i.level === '致命').length;
            const resolvedWarn = compareResult.issues.resolved.filter(i => i.level === '警告' || i.level === '严重').length;
            const resolvedTip = compareResult.issues.resolved.filter(i => i.level === '建议').length;
            const newFatal = compareResult.issues.new.filter(i => i.level === '致命').length;
            const newWarn = compareResult.issues.new.filter(i => i.level === '警告' || i.level === '严重').length;
            
            const parts = [];
            if (scoreChange > 0) parts.push(`分数提升 ${scoreChange} 分`);
            else if (scoreChange < 0) parts.push(`分数下降 ${Math.abs(scoreChange)} 分`);
            else parts.push('分数持平');
            
            if (resolvedFatal > 0) parts.push(`修复 ${resolvedFatal} 个致命问题`);
            if (resolvedWarn > 0) parts.push(`修复 ${resolvedWarn} 个警告`);
            if (resolvedTip > 0) parts.push(`修复 ${resolvedTip} 个建议`);
            if (newFatal > 0) parts.push(`新增 ${newFatal} 个致命问题 ⚠️`);
            if (newWarn > 0) parts.push(`新增 ${newWarn} 个警告`);
            
            return `从 v${v1.version || 1}(${v1.total_score || '--'}分) 到 v${v2.version || '--'}(${v2.total_score || '--'}分)：${parts.join('，')}`;
        }

        function showVersionCompare(v1, v2) {
            const modal = document.getElementById('compareModal');
            const content = document.getElementById('compareContent');
            
            const compareResult = {
                issues: compareIssues(v1.issues || [], v2.issues || [])
            };
            const summary = generateCompareSummary(v1, v2, compareResult);
            const scoreChange = (v2.total_score || 0) - (v1.total_score || 0);
            const scoreColor = scoreChange >= 0 ? '#00ff88' : '#ff5555';
            
            // 维度分数对比
            const compareDimConfig = getDimensionConfig(v2.scene_id || v1.scene_id || '');
            const dimChanges = compareDimConfig.map(dim => {
                const s1 = (v1.dimension_scores || {})[dim.name] || 0;
                const s2 = (v2.dimension_scores || {})[dim.name] || 0;
                const change = s2 - s1;
                return {name: dim.name, v1: s1, v2: s2, change, max: dim.max};
            });
            
            const materialTitle = escapeHtml(v2.title || v1.title || '未知材料');
            
            content.innerHTML = `
                <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-bottom:16px;border:1px solid #e8e8e8;">
                    <div style="font-size:0.85em;color:#6b7280;margin-bottom:4px;">📄 对比材料</div>
                    <div style="font-size:1em;color:#1f2937;font-weight:600;">${materialTitle}</div>
                    <div style="font-size:0.75em;color:#9ca3af;margin-top:2px;">${escapeHtml(v2.url || v1.url || '')}</div>
                </div>
                
                <div style="background:rgba(59,130,246,0.08);padding:12px 16px;border-radius:8px;margin-bottom:20px;border-left:3px solid #2563eb;">
                    <div style="font-size:0.9em;color:#2563eb;font-weight:600;">📊 ${escapeHtml(summary)}</div>
                </div>
                
                <div style="display:flex;gap:16px;margin-bottom:24px;">
                    <div style="flex:1;text-align:center;padding:16px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:0.8em;color:#888;margin-bottom:4px;">v${v1.version || 1} · ${new Date(v1.timestamp).toLocaleString('zh-CN', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</div>
                        <div style="font-size:2.2em;font-weight:bold;color:#fff;">${v1.total_score || '--'}</div>
                        <div style="font-size:0.75em;color:#888;">分</div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:center;font-size:1.2em;color:${scoreColor};font-weight:600;">
                        ${scoreChange > 0 ? '↑ +' + scoreChange : (scoreChange < 0 ? '↓ ' + scoreChange : '→ 0')}
                    </div>
                    <div style="flex:1;text-align:center;padding:16px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:0.8em;color:#888;margin-bottom:4px;">v${v2.version || '--'} · ${new Date(v2.timestamp).toLocaleString('zh-CN', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</div>
                        <div style="font-size:2.2em;font-weight:bold;color:#00d4ff;">${v2.total_score || '--'}</div>
                        <div style="font-size:0.75em;color:#888;">分</div>
                    </div>
                </div>
                
                <div style="margin-bottom:20px;">
                    <h4 style="color:#fff;font-size:0.9em;margin-bottom:10px;">各维度分数变化</h4>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        ${dimChanges.map(d => {
                            const changeColor = d.change > 0 ? '#00ff88' : (d.change < 0 ? '#ff5555' : '#888');
                            const arrow = d.change > 0 ? '↑' : (d.change < 0 ? '↓' : '→');
                            return `
                                <div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:6px;">
                                    <div style="flex:1;font-size:0.85em;color:#ccc;">${d.name}</div>
                                    <div style="font-size:0.85em;color:#888;">${d.v1}/${d.max}</div>
                                    <div style="font-size:0.8em;color:${changeColor};width:50px;text-align:center;">${arrow} ${Math.abs(d.change)}</div>
                                    <div style="font-size:0.85em;color:#00d4ff;width:50px;text-align:right;">${d.v2}/${d.max}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr;gap:16px;">
                    ${compareResult.issues.resolved.length > 0 ? `
                        <div style="background:rgba(0,255,136,0.03);padding:12px 16px;border-radius:8px;border:1px solid rgba(0,255,136,0.1);">
                            <div style="font-size:0.85em;color:#00ff88;font-weight:600;margin-bottom:8px;">✅ 已修复的问题 (${compareResult.issues.resolved.length})</div>
                            ${compareResult.issues.resolved.map(i => renderIssueCard(i, 'resolved')).join('')}
                        </div>
                    ` : ''}
                    
                    ${compareResult.issues.new.length > 0 ? `
                        <div style="background:rgba(255,85,85,0.03);padding:12px 16px;border-radius:8px;border:1px solid rgba(255,85,85,0.1);">
                            <div style="font-size:0.85em;color:#ff5555;font-weight:600;margin-bottom:8px;">❗ 新增的问题 (${compareResult.issues.new.length})</div>
                            ${compareResult.issues.new.map(i => renderIssueCard(i, 'new')).join('')}
                        </div>
                    ` : ''}
                    
                    ${compareResult.issues.persistent.length > 0 ? `
                        <div style="background:rgba(255,204,0,0.03);padding:12px 16px;border-radius:8px;border:1px solid rgba(255,204,0,0.1);">
                            <div style="font-size:0.85em;color:#ffcc00;font-weight:600;margin-bottom:8px;">⏳ 遗留的问题 (${compareResult.issues.persistent.length})</div>
                            ${compareResult.issues.persistent.map(p => renderIssueCard(p.v2, 'persistent')).join('')}
                        </div>
                    ` : ''}
                </div>
                
                ${compareResult.issues.resolved.length === 0 && compareResult.issues.new.length === 0 && compareResult.issues.persistent.length === 0 ? `
                    <div style="text-align:center;padding:30px;color:#666;">两次审核的问题清单基本一致，无显著变化</div>
                ` : ''}
            `;
            modal.classList.remove('hidden');
        }

        async function deleteHistoryItem(id) {
            if (!confirm('确定删除这条记录吗？')) return;
            await deleteReviewRecord(id);
            await renderHistoryPanel();
        }

        async function showHistoryDetail(id) {
            const history = await getReviewHistory(10);
            const rec = history.find(r => r.id === id);
            if (!rec) return;
            document.getElementById('kmsUrl').value = rec.url || '';
            currentPageInfo = { title: rec.title, space: rec.space, url: rec.url };
            document.getElementById('pageInfo').innerHTML = `
                <p><strong style="color:#2563eb">标题：</strong>${escapeHtml(rec.title || '')}</p>
                <p><strong style="color:#2563eb">空间：</strong>${escapeHtml(rec.space || '')}</p>
                <p><strong style="color:#2563eb">链接：</strong><a href="${sanitizeUrl(rec.url)}" target="_blank" style="color:#7c3aed">${escapeHtml(rec.url)}</a></p>`;
            currentReport = rec.report || '';
            document.getElementById('reportBox').textContent = rec.report || '';
            let scoreData;
            if (rec.dimension_scores && Object.keys(rec.dimension_scores).length > 0) {
                const parsed = parseDimensionScores(rec.report || '', rec.scene_id);
                const commentMap = {};
                parsed.scores.forEach(s => { commentMap[s.name] = s.comment; });
                const dimConfig = getDimensionConfig(rec.scene_id || '');
                const scores = dimConfig.map(dim => {
                    const score = rec.dimension_scores[dim.name] || 0;
                    return { ...dim, score, comment: commentMap[dim.name] || '' };
                });
                scoreData = {
                    scores,
                    totalScore: rec.total_score || 0,
                    passed: parsed.passed
                };
            } else {
                scoreData = parseDimensionScores(rec.report || '', rec.scene_id);
            }
            drawRadarChart(scoreData);
            fillAnalysisReport(scoreData, rec.report || '', rec.facts || {});
            document.getElementById('reportSection').classList.remove('hidden');
            document.getElementById('promptSection').classList.add('hidden');
            document.getElementById('resultCard').classList.remove('hidden');
            setStatus(`[文件] 已加载历史记录 v${rec.version || 1}`, 'info');
        }
