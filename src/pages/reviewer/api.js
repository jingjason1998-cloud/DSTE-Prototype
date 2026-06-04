        async function saveReviewRecord(record) {
            const resp = await fetch(PROXY_URL + '/api/history', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(record)
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || '保存失败');
            // 同步最高分到 localStorage，供 cockpit 议程展示使用
            try {
                const map = JSON.parse(localStorage.getItem('dste_review_scores') || '{}');
                const url = record.url;
                const current = map[url];
                if (!current || (record.total_score || 0) > current.maxScore) {
                    map[url] = { maxScore: record.total_score || 0, lastReviewAt: record.timestamp };
                    localStorage.setItem('dste_review_scores', JSON.stringify(map));
                }
            } catch (e) { /* ignore localStorage errors */ }
            return data;
        }

        async function getReviewHistory(limit = 50) {
            const resp = await fetch(PROXY_URL + '/api/history?limit=' + limit);
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || '获取失败');
            return data.history || [];
        }

        async function deleteReviewRecord(id) {
            const resp = await fetch(PROXY_URL + '/api/history/' + id, {method: 'DELETE'});
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || '删除失败');
        }

        async function clearReviewHistory() {
            const resp = await fetch(PROXY_URL + '/api/history/clear', {method: 'DELETE'});
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || '清空失败');
        }

        async function openCompareModal(url) {
            const history = await getReviewHistory(10);
            const versions = history.filter(r => r.url === url).sort((a, b) => (a.version || 1) - (b.version || 1));
            if (versions.length < 2) { alert('该材料不足2个版本，无法对比'); return; }
            
            // 默认对比最早版本和最新版本
            showVersionCompare(versions[0], versions[versions.length - 1]);
        }

        async function startBatchReview() {
            var textarea = document.getElementById('batchUrls');
            var statusEl = document.getElementById('batchStatus');
            var progressDiv = document.getElementById('batchProgress');
            var progressBar = document.getElementById('batchProgressBar');
            var progressText = document.getElementById('batchProgressText');
            var progressList = document.getElementById('batchProgressList');
            var actionsDiv = document.getElementById('batchActions');
            
            if (!textarea) return;
            var urls = textarea.value.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
            if (urls.length === 0) {
                statusEl.textContent = '请输入至少一个链接';
                statusEl.style.color = '#dc2626';
                return;
            }
            
            statusEl.textContent = '正在创建任务...';
            statusEl.style.color = '#2563eb';
            
            try {
                var resp = await fetch(PROXY_URL + '/api/batch', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({urls: urls, scene_id: document.getElementById('sceneSelect').value})
                });
                var data = await resp.json();
                if (!data.success) {
                    statusEl.textContent = data.error || '创建失败';
                    statusEl.style.color = '#dc2626';
                    return;
                }
                
                progressDiv.style.display = 'block';
                actionsDiv.style.display = 'none';
                statusEl.textContent = '任务已创建，审核中...';
                pollBatchProgress(data.task_id);
            } catch(e) {
                statusEl.textContent = '请求失败: ' + e.message;
                statusEl.style.color = '#dc2626';
            }
        }

        async function pollBatchProgress(taskId, pollCount) {
            if (pollCount === undefined) pollCount = 0;
            pollCount++;
            var MAX_POLL = 300; // 最多轮询300次，约10分钟
            
            var progressBar = document.getElementById('batchProgressBar');
            var progressText = document.getElementById('batchProgressText');
            var progressList = document.getElementById('batchProgressList');
            var statusEl = document.getElementById('batchStatus');
            var actionsDiv = document.getElementById('batchActions');
            
            try {
                var resp = await fetch(PROXY_URL + '/api/batch/' + taskId);
                var data = await resp.json();
                if (!data.success) return;
                
                var task = data.task;
                var total = task.total || 1;
                var completed = task.completed || 0;
                var pct = Math.round((completed / total) * 100);
                
                progressBar.style.width = pct + '%';
                progressText.textContent = completed + '/' + total + ' 已完成';
                
                var rresp = await fetch(PROXY_URL + '/api/batch/' + taskId + '/results');
                var rdata = await rresp.json();
                if (rdata.success && rdata.results) {
                    var html = '';
                    rdata.results.forEach(function(res) {
                        var icon = res.status === 'completed' ? '✅' : (res.status === 'failed' ? '❌' : '⏳');
                        var score = res.total_score ? ' · <strong style="color:' + (res.total_score >= 80 ? '#16a34a' : (res.total_score >= 60 ? '#ca8a04' : '#dc2626')) + ';">' + res.total_score + '分</strong>' : '';
                        var titleColor = res.status === 'failed' ? '#dc2626' : '#374151';
                        html += '<div style="margin-bottom:4px;color:#6b7280;">' + icon + ' <span style="color:' + titleColor + ';">' + (res.title || res.url).substring(0, 40) + '</span>' + score + '</div>';
                    });
                    progressList.innerHTML = html;
                }
                
                if (task.status === 'completed' || task.status === 'failed') {
                    statusEl.textContent = '审核完成';
                    statusEl.style.color = '#16a34a';
                    actionsDiv.style.display = 'block';
                    window._lastBatchTaskId = taskId;
                } else if (pollCount >= MAX_POLL) {
                    statusEl.textContent = '轮询超时，请手动刷新查看结果';
                    statusEl.style.color = '#ca8a04';
                    actionsDiv.style.display = 'block';
                    window._lastBatchTaskId = taskId;
                } else {
                    setTimeout(function() { pollBatchProgress(taskId, pollCount); }, 2000);
                }
            } catch(e) {
                statusEl.textContent = '查询进度失败';
                statusEl.style.color = '#dc2626';
            }
        }

        async function checkProxy() {
            try {
                const resp = await fetch(PROXY_URL + '/api/health', { 
                    method: 'GET',
                    mode: 'cors'
                });
                if (resp.ok) {
                    document.getElementById('proxyStatus').textContent = '✅ 代理在线';
                    document.getElementById('proxyStatus').className = 'proxy-status online';
                    return true;
                }
            } catch(e) {}
            document.getElementById('proxyStatus').textContent = '❌ 代理离线';
            document.getElementById('proxyStatus').className = 'proxy-status offline';
            return false;
        }
        
        checkProxy();
        setInterval(checkProxy, 30000);

        async function directReview() {
            const url = document.getElementById('kmsUrl').value.trim();
            if (!url) {
                setStatus('请输入 KMS 链接', 'error');
                return;
            }
            
            // 检查冷却时间
            const now = Date.now();
            const elapsed = now - lastReviewTime;
            if (elapsed < REVIEW_COOLDOWN) {
                const wait = Math.ceil((REVIEW_COOLDOWN - elapsed) / 1000);
                setStatus(`请等待 ${wait} 秒后再审核（避免API限流）`, 'error');
                return;
            }
            
            const btn = document.getElementById('reviewBtn');
            const btnText = document.getElementById('reviewBtnText');
            btn.disabled = true;
            btnText.innerHTML = '<span class="spinner"></span> 审核中...';
            setStatus('正在获取内容并调用 AI 审核，请稍候（约 10-30 秒）...', 'info');
            
            const payload = {
                url: url,
                scene: document.getElementById('sceneSelect').value || undefined
            };
            
            try {
                const proxyOnline = await checkProxy();
                if (!proxyOnline) {
                    throw new Error('代理服务离线，请确认服务已启动');
                }
                
                const resp = await fetch(PROXY_URL + '/api/review', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                
                if (resp.status === 429) {
                    throw new Error('AI 服务繁忙，请稍后再试（429 限流）');
                }
                
                // 检查响应内容类型，防止收到 HTML 错误页面
                const contentType = resp.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await resp.text();
                    const preview = text.substring(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    console.error('服务器返回非JSON响应:', resp.status, preview);
                    throw new Error(`服务器返回非 JSON 响应（HTTP ${resp.status}）\n响应预览：${preview.substring(0, 150)}...\n可能原因：①后端服务未启动 ②后端崩溃 ③网络超时`);
                }
                
                const data = await resp.json();
                
                if (!data.success) {
                    throw new Error(data.error || '审核失败');
                }
                
                // 显示页面信息
                currentPageInfo = { title: data.title, space: data.space, url: data.url };
                document.getElementById('pageInfo').innerHTML = `
                    <p><strong style="color:#00d4ff">标题：</strong>${escapeHtml(data.title)}</p>
                    <p><strong style="color:#00d4ff">空间：</strong>${escapeHtml(data.space)}</p>
                    <p><strong style="color:#00d4ff">链接：</strong><a href="${sanitizeUrl(data.url)}" target="_blank" style="color:#7b2cbf">${escapeHtml(data.url)}</a></p>
                `;
                
                // 显示审核报告
                currentReport = data.report;
                document.getElementById('reportBox').textContent = data.report;
                
                // 优先使用后端结构化数据，兼容旧格式
                let scoreData;
                if (data.dimension_scores && Object.keys(data.dimension_scores).length > 0) {
                    // 从报告文本中解析打分理由（分数用后端返回的，理由从文本解析）
                    const parsed = parseDimensionScores(data.report, data.scene_id);
                    const commentMap = {};
                    parsed.scores.forEach(s => { commentMap[s.name] = s.comment; });
                    const dimConfig = getDimensionConfig(data.scene_id || getCurrentSceneId());
                    
                    const scores = dimConfig.map(dim => {
                        const score = data.dimension_scores[dim.name] || 0;
                        return { ...dim, score, comment: commentMap[dim.name] || '' };
                    });
                    scoreData = {
                        scores,
                        totalScore: data.total_score || 0,
                        passed: parsed.passed
                    };
                } else {
                    scoreData = parseDimensionScores(data.report, getCurrentSceneId());
                }
                drawRadarChart(scoreData);
                fillAnalysisReport(scoreData, data.report, data.facts);
                
                document.getElementById('reportSection').classList.remove('hidden');
                document.getElementById('promptSection').classList.add('hidden');
                
                document.getElementById('resultCard').classList.remove('hidden');
                setStatus('✅ AI 审核完成！', 'success');
                lastReviewTime = Date.now();  // 记录成功审核时间
                
                // 保存到 IndexedDB 历史记录
                try {
                    const history = await getReviewHistory(10);
                    const sameUrlRecords = history.filter(r => r.url === data.url);
                    const version = sameUrlRecords.length + 1;
                    const sceneSelect = document.getElementById('sceneSelect');
                    await saveReviewRecord({
                        url: data.url,
                        title: data.title,
                        space: data.space,
                        scene_id: sceneSelect ? sceneSelect.value : '',
                        scene_name: sceneSelect && sceneSelect.options[sceneSelect.selectedIndex] ? sceneSelect.options[sceneSelect.selectedIndex].text : '默认',
                        timestamp: Date.now(),
                        version: version,
                        total_score: data.total_score || scoreData.totalScore,
                        dimension_scores: data.dimension_scores || {},
                        issues: data.issues || [],
                        report: data.report,
                        facts: data.facts || {}
                    });
                } catch(e) {
                    console.log('保存历史记录失败:', e);
                }
                
            } catch(err) {
                setStatus('❌ ' + err.message, 'error');
                console.error(err);
            } finally {
                btn.disabled = false;
                btnText.textContent = '[AI] 直接审核';
            }
        }
        
        // 内容提要：获取内容 + 调用 Kimi API 生成精炼总结

        async function generateSummary() {
            const url = document.getElementById('kmsUrl').value.trim();
            if (!url) {
                setStatus('请输入 KMS 链接', 'error');
                return;
            }
            
            const btn = document.getElementById('summaryBtn');
            const btnText = document.getElementById('summaryBtnText');
            btn.disabled = true;
            btnText.innerHTML = '<span class="spinner"></span> 总结中...';
            setStatus('正在获取内容并生成提要，请稍候...', 'info');
            
            try {
                const proxyOnline = await checkProxy();
                if (!proxyOnline) {
                    throw new Error('代理服务离线，请确认服务已启动');
                }
                
                const resp = await fetch(PROXY_URL + '/api/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url }),
                    mode: 'cors'
                });
                const data = await resp.json();
                
                if (!data.success) {
                    throw new Error(data.error || '生成失败');
                }
                
                currentPageInfo = {
                    title: data.title,
                    space: data.space,
                    url: data.url
                };
                
                document.getElementById('pageInfo').innerHTML = `
                    <p><strong style="color:#00d4ff">标题：</strong>${escapeHtml(data.title)}</p>
                    <p><strong style="color:#00d4ff">空间：</strong>${escapeHtml(data.space)}</p>
                    <p><strong style="color:#00d4ff">字数：</strong>${data.content_length} 字符</p>
                `;
                
                document.getElementById('reportBox').innerHTML = '<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;line-height:1.8;">' + escapeHtml(data.summary) + '</pre>';
                document.getElementById('reportSection').classList.remove('hidden');
                document.getElementById('promptSection').classList.add('hidden');
                
                document.getElementById('scoreBoardCard').classList.add('hidden');
                document.getElementById('dimensionTable').classList.add('hidden');
                document.getElementById('issuesCard').classList.add('hidden');
                document.getElementById('suggestionsCard').classList.add('hidden');
                document.getElementById('highlightsCard').classList.add('hidden');
                document.getElementById('conclusionCard').classList.add('hidden');
                document.getElementById('factCheckContent').classList.add('hidden');
                document.getElementById('rawReportContent').classList.add('hidden');
                
                document.getElementById('resultCard').classList.remove('hidden');
                setStatus('✅ 内容提要生成完毕', 'success');
                
            } catch(err) {
                setStatus('❌ ' + err.message, 'error');
                console.error(err);
            } finally {
                btn.disabled = false;
                btnText.textContent = '[编辑] 内容提要';
            }
        }

        async function exportReportToPDF() {
            if (!currentReport) {
                setStatus('请先完成审核再导出', 'error');
                return;
            }
            
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner" style="border-color:rgba(0,0,0,0.2);border-top-color:var(--primary);"></span> 生成中...';
            btn.disabled = true;
            
            try {
                // 构建导出内容：页面信息 + 右侧报告
                const container = document.createElement('div');
                container.style.cssText = 'padding:24px;background:#fff;color:#1f1f1f;font-family:Inter,-apple-system,sans-serif;line-height:1.7;font-size:14px;max-width:800px;margin:0 auto;';
                
                // 标题
                const title = currentPageInfo ? (currentPageInfo.title || '审核报告') : '审核报告';
                container.innerHTML = `
                    <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1677ff;">
                        <h1 style="font-size:22px;font-weight:700;color:#1f1f1f;margin:0 0 8px 0;">会议材料审核报告</h1>
                        <p style="font-size:13px;color:#666;margin:0;">${escapeHtml(title)}</p>
                        <p style="font-size:12px;color:#999;margin:4px 0 0 0;">生成时间：${new Date().toLocaleString('zh-CN')}</p>
                    </div>
                `;
                
                // 页面信息
                if (currentPageInfo) {
                    container.innerHTML += `
                        <div style="margin-bottom:20px;padding:12px 16px;background:#f6f8fa;border-radius:8px;border-left:3px solid #1677ff;">
                            <p style="margin:4px 0;font-size:13px;"><strong>标题：</strong>${escapeHtml(currentPageInfo.title || '')}</p>
                            <p style="margin:4px 0;font-size:13px;"><strong>空间：</strong>${escapeHtml(currentPageInfo.space || '')}</p>
                            <p style="margin:4px 0;font-size:13px;"><strong>链接：</strong>${escapeHtml(currentPageInfo.url || '')}</p>
                        </div>
                    `;
                }
                
                // 克隆右侧报告区域
                const reportRight = document.querySelector('.report-right');
                if (reportRight) {
                    const clone = reportRight.cloneNode(true);
                    
                    // 清理不需要的元素（原始报告折叠栏、系统事实检查等）
                    const rawBar = clone.querySelector('.raw-report-bar');
                    const rawContent = clone.querySelector('.raw-report-content');
                    const factBar = clone.querySelector('.fact-check-bar');
                    const factContent = clone.querySelector('.fact-check-content');
                    const actionBtns = clone.querySelector('div[style*="flex-wrap"]');
                    if (rawBar) rawBar.remove();
                    if (rawContent) rawContent.remove();
                    if (factBar) factBar.remove();
                    if (factContent) factContent.remove();
                    if (actionBtns && actionBtns.querySelector('button')) actionBtns.remove();
                    
                    // 处理canvas：把雷达图转为高清图片，PDF中保持足够尺寸
                    const canvas = document.getElementById('radarCanvas');
                    const cloneCanvas = clone.querySelector('canvas');
                    if (canvas && cloneCanvas) {
                        const img = document.createElement('img');
                        img.src = canvas.toDataURL('image/png');
                        img.style.cssText = 'width:240px;height:auto;display:block;margin:0 auto;';
                        cloneCanvas.parentNode.replaceChild(img, cloneCanvas);
                    }
                    
                    // 清理内联样式中不适应打印的部分
                    clone.querySelectorAll('[class*="hidden"]').forEach(el => {
                        if (el.style.display === 'none') el.remove();
                    });
                    
                    // 展开所有折叠内容
                    clone.querySelectorAll('.raw-report-content, .fact-check-content').forEach(el => {
                        el.style.maxHeight = 'none';
                        el.style.overflow = 'visible';
                    });
                    
                    container.appendChild(clone);
                }
                
                // PDF 配置
                const opt = {
                    margin: [12, 12, 12, 12],
                    filename: `审核报告-${title.substring(0, 30).replace(/[\\/:*?"<>|]/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.95 },
                    html2canvas: { 
                        scale: 2, 
                        useCORS: true, 
                        logging: false,
                        backgroundColor: '#ffffff'
                    },
                    jsPDF: { 
                        unit: 'mm', 
                        format: 'a4', 
                        orientation: 'portrait' 
                    },
                    pagebreak: { 
                        mode: ['css', 'legacy'],
                        avoid: 'table'
                    }
                };
                
                await html2pdf().set(opt).from(container).save();
                setStatus('✅ PDF 导出成功', 'success');
                
            } catch (err) {
                console.error('PDF导出失败:', err);
                setStatus('❌ PDF 导出失败: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        async function loadConfig() {
            // 先填充本地保存的后端地址
            document.getElementById('cfgProxyUrl').value = localStorage.getItem('meetingReviewerProxyUrl') || '';
            
            try {
                const resp = await fetch(PROXY_URL + '/api/config', { method: 'GET', mode: 'cors' });
                const data = await resp.json();
                
                if (!data.success) {
                    throw new Error(data.error || '加载失败');
                }
                
                const cfg = data.config || data;
                document.getElementById('cfgApiKey').value = cfg.kimi_api_key || '';
                document.getElementById('cfgApiUrl').value = cfg.kimi_api_url || '';
                document.getElementById('cfgModel').value = cfg.kimi_model || '';
                document.getElementById('cfgTemp').value = cfg.temperature !== undefined ? cfg.temperature : '';
                document.getElementById('cfgMaxTokens').value = cfg.max_tokens || '';
                document.getElementById('cfgTimeout').value = cfg.api_timeout || '';
                
                // 更新摘要显示
                const model = cfg.kimi_model || '默认模型';
                const temp = cfg.temperature !== undefined ? cfg.temperature : '0.3';
                document.getElementById('configSummary').textContent = `${model} · temp=${temp}`;
                
                setConfigStatus('✅ 配置已加载', 'success');
            } catch(err) {
                setConfigStatus('⚠️ 后端连接失败，使用本地配置', 'error');
                document.getElementById('configSummary').textContent = '本地模式';
            }
        }

        async function saveConfig() {
            // 保存后端地址到 localStorage
            const proxyUrl = document.getElementById('cfgProxyUrl').value.trim();
            if (proxyUrl) {
                localStorage.setItem('meetingReviewerProxyUrl', proxyUrl);
                PROXY_URL = proxyUrl;
            }
            
            const updates = {};
            const apiKey = document.getElementById('cfgApiKey').value.trim();
            const apiUrl = document.getElementById('cfgApiUrl').value.trim();
            const model = document.getElementById('cfgModel').value.trim();
            const temp = document.getElementById('cfgTemp').value.trim();
            const maxTokens = document.getElementById('cfgMaxTokens').value.trim();
            const timeout = document.getElementById('cfgTimeout').value.trim();
            
            // 只发送有值的字段（支持部分更新）
            if (apiKey && !apiKey.startsWith('***')) updates.kimi_api_key = apiKey;
            if (apiUrl) updates.kimi_api_url = apiUrl;
            if (model) updates.kimi_model = model;
            if (temp !== '') updates.temperature = parseFloat(temp);
            if (maxTokens !== '') updates.max_tokens = parseInt(maxTokens);
            if (timeout !== '') updates.api_timeout = parseInt(timeout);
            
            if (Object.keys(updates).length === 0) {
                setConfigStatus('⚠️ 没有要保存的更改', 'error');
                return;
            }
            
            try {
                const resp = await fetch(PROXY_URL + '/api/config', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(updates)
                });
                const data = await resp.json();
                
                if (!data.success) {
                    throw new Error(data.error || '保存失败');
                }
                
                setConfigStatus('✅ 配置已保存', 'success');
                // 重新加载以显示脱敏后的值和更新摘要
                await loadConfig();
            } catch(err) {
                setConfigStatus('❌ ' + err.message, 'error');
            }
        }
