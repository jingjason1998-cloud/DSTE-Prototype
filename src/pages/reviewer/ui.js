        function resetReportArea() {
            // 重置评分总览
            const totalEl = document.getElementById('analysisTotalScore');
            const badgeEl = document.getElementById('analysisStatusBadge');
            const dimsBox = document.getElementById('scoreBoardDims');
            const bottomLine = document.getElementById('scoreBoardBottomLine');
            if (totalEl) totalEl.textContent = '--';
            if (badgeEl) { badgeEl.textContent = '审核中'; badgeEl.className = 'analysis-status-badge'; }
            if (dimsBox) dimsBox.innerHTML = '';
            if (bottomLine) bottomLine.innerHTML = '';

            // 重置分项评分表
            const tbody = document.getElementById('dimensionTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;">等待审核结果...</td></tr>';

            // 隐藏问题清单、改进建议、亮点、结论
            ['issuesCard','suggestionsCard','highlightsCard','conclusionCard'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            // 清空事实检查和原始报告
            const factCheckBox = document.getElementById('factCheckBox');
            const reportBox = document.getElementById('reportBox');
            if (factCheckBox) factCheckBox.innerHTML = '';
            if (reportBox) reportBox.innerHTML = '';

            // 收起事实检查和原始报告
            const factCheckContent = document.getElementById('factCheckContent');
            const rawReportContent = document.getElementById('rawReportContent');
            const factCheckBar = document.getElementById('factCheckBar');
            const rawReportBar = document.getElementById('rawReportBar');
            if (factCheckContent) factCheckContent.classList.remove('expanded');
            if (rawReportContent) rawReportContent.classList.remove('expanded');
            if (factCheckBar) factCheckBar.classList.remove('expanded');
            if (rawReportBar) rawReportBar.classList.remove('expanded');
        }

        // 场景选择变化时重新渲染维度卡片、更新合格标准、重置报告区域
        document.getElementById('sceneSelect').addEventListener('change', async function() {
            const sceneId = this.value;

            // 先渲染对应场景的维度卡片
            renderPrincipleCards(sceneId);

            // 更新合格标准
            updatePassStandard(sceneId);

            // 如果报告区域已显示，重置并提示重新审核
            const reportSection = document.getElementById('reportSection');
            if (reportSection && !reportSection.classList.contains('hidden')) {
                resetReportArea();
                // 在合格标准下方添加场景切换提示
                const stdBody = document.getElementById('passStandardBody');
                if (stdBody) {
                    stdBody.innerHTML += '<div style="margin-top:8px;padding:6px 10px;background:#fffbeb;border-radius:6px;border:1px solid #fcd34d;font-size:0.85em;color:#92400e;">⚠️ 场景已切换，请重新执行审核以获取当前场景的评审结果</div>';
                }
            }

            if (!sceneId) return;

            // 获取场景详情
            let focusDims = [];
            try {
                const resp = await fetch(PROXY_URL + '/api/scenes/' + sceneId, { method: 'GET', mode: 'cors' });
                const data = await resp.json();
                if (data.success && data.scene && data.scene.focus_dimensions) {
                    focusDims = data.scene.focus_dimensions;
                }
            } catch(e) {
                console.log('从代理获取场景详情失败:', e);
            }

            // 本地备用映射
            if (focusDims.length === 0) {
                focusDims = getLocalFocusDimensions(sceneId);
            }

            // 高亮匹配的 principle-card
            highlightFocusDimensions(focusDims);
        });

        // 页面加载时默认渲染通用议题评审维度
        renderPrincipleCards('general-topic-review');

        // 解析 prompt_suffix 提取要点

        function closeCompareModal() {
            document.getElementById('compareModal').classList.add('hidden');
        }

        function toggleHistoryPanel() {
            var panel = document.getElementById('historyPanel');
            var listEl = document.getElementById('historyList');
            if (!panel) { alert('错误：找不到面板'); return; }
            var hasHidden = panel.classList.contains('hidden');
            if (hasHidden) {
                panel.classList.remove('hidden');
                panel.style.setProperty('display', 'block', 'important');
                if (listEl) {
                    listEl.innerHTML = '<p style="color:#2563eb;text-align:center;padding:20px;">正在加载历史记录...</p>';
                }
                renderHistoryPanel().catch(function(err) {
                    if (listEl) listEl.innerHTML = '<p style="color:#dc2626;text-align:center;padding:20px;">加载失败: ' + (err.message || '未知错误') + '</p>';
                });
            } else {
                panel.classList.add('hidden');
                panel.style.setProperty('display', 'none', 'important');
            }
        }

        // 绑定按钮事件（只绑定一次，避免重复触发）
        (function() {
            var hb = document.getElementById('historyBtn');
            var hcb = document.getElementById('historyCloseBtn');
            if (hb) hb.onclick = toggleHistoryPanel;
            if (hcb) hcb.onclick = toggleHistoryPanel;
        })();

        // ==================== 批量审核功能 ====================

        function toggleBatchInput() {
            var area = document.getElementById('batchInputArea');
            if (!area) return;
            if (area.style.display === 'none') {
                var sceneSelect = document.getElementById('sceneSelect');
                var label = document.getElementById('batchSceneLabel');
                if (sceneSelect && label) {
                    var text = sceneSelect.options[sceneSelect.selectedIndex].text || '默认场景';
                    label.textContent = text;
                }
                area.style.display = 'block';
            } else {
                area.style.display = 'none';
            }
        }

        function closeCompareMatrixModal() {
            var modal = document.getElementById('compareMatrixModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.setProperty('display', 'none', 'important');
            }
        }

        async function showCompareMatrix() {
            var taskId = window._lastBatchTaskId;
            if (!taskId) {
                alert('请先完成批量审核');
                return;
            }
            var modal = document.getElementById('compareMatrixModal');
            var content = document.getElementById('compareMatrixContent');
            if (!modal || !content) return;
            
            content.innerHTML = '<p style="color:#2563eb;text-align:center;padding:20px;">正在生成对比矩阵...</p>';
            modal.classList.remove('hidden');
            modal.style.setProperty('display', 'flex', 'important');
            
            try {
                var resp = await fetch(PROXY_URL + '/api/batch/' + taskId + '/compare');
                var data = await resp.json();
                if (!data.success) {
                    content.innerHTML = '<p style="color:#dc2626;text-align:center;padding:20px;">' + (data.error || '生成失败') + '</p>';
                    return;
                }
                renderCompareMatrix(data);
            } catch(e) {
                content.innerHTML = '<p style="color:#dc2626;text-align:center;padding:20px;">请求失败: ' + e.message + '</p>';
            }
        }

        function setStatus(msg, type) {
            const el = document.getElementById('status');
            el.textContent = msg;
            el.className = 'status ' + type;
        }
        
        let lastReviewTime = 0;
        const REVIEW_COOLDOWN = 30000; // 30秒冷却

        // ── 维度配置（按场景） ──

        function copyReport() {
            if (!currentReport) return;
            navigator.clipboard.writeText(currentReport).then(() => {
                setStatus('✅ 报告已复制到剪贴板！', 'success');
            }).catch(() => {
                fallbackCopy(currentReport);
            });
        }

        function copyPrompt() {
            if (!currentPrompt) return;
            navigator.clipboard.writeText(currentPrompt).then(() => {
                setStatus('✅ 提示词已复制到剪贴板！', 'success');
            }).catch(() => {
                fallbackCopy(currentPrompt);
            });
        }

        function fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setStatus('✅ 已复制到剪贴板！', 'success');
        }

        function toggleRawReport() {
            const content = document.getElementById('rawReportContent');
            const bar = document.getElementById('rawReportBar');
            content.classList.toggle('expanded');
            bar.classList.toggle('expanded');
        }

        function toggleFactCheck() {
            const content = document.getElementById('factCheckContent');
            const bar = document.getElementById('factCheckBar');
            content.classList.toggle('expanded');
            bar.classList.toggle('expanded');
        }

        function resetForm() {
            document.getElementById('kmsUrl').value = '';
            document.getElementById('resultCard').classList.add('hidden');
            document.getElementById('status').style.display = 'none';
            document.getElementById('radarChartBox').style.display = 'none';
            document.getElementById('analysisTotalScore').textContent = '--';
            document.getElementById('analysisStatusBadge').textContent = '审核中';
            document.getElementById('analysisStatusBadge').className = 'analysis-status-badge';
            document.getElementById('scoreBoardDims').innerHTML = '';
            document.getElementById('scoreBoardBottomLine').innerHTML = '';
            document.getElementById('dimensionTableBody').innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;">等待审核结果...</td></tr>';
            document.getElementById('issuesCard').style.display = 'none';
            document.getElementById('issueTableBody').innerHTML = '';
            document.getElementById('suggestionsCard').style.display = 'none';
            document.getElementById('suggestionTableBody').innerHTML = '';
            document.getElementById('highlightsCard').style.display = 'none';
            document.getElementById('highlightList').innerHTML = '';
            document.getElementById('conclusionCard').style.display = 'none';
            document.getElementById('conclusionBox').innerHTML = '';
            document.getElementById('rawReportContent').classList.remove('expanded');
            document.getElementById('rawReportBar').classList.remove('expanded');
            document.getElementById('factCheckContent').classList.remove('expanded');
            document.getElementById('factCheckBar').classList.remove('expanded');
            document.getElementById('factCheckBox').innerHTML = '';
            document.querySelectorAll('.principle-card').forEach(card => card.classList.remove('focus'));
            currentPrompt = '';
            currentReport = '';
        }

        function toggleConfig() {
            const section = document.getElementById('configSection');
            const bar = document.getElementById('configBar');
            section.classList.toggle('expanded');
            bar.classList.toggle('expanded');
        }

        function setConfigStatus(msg, type) {
            const el = document.getElementById('configStatus');
            el.textContent = msg;
            el.className = 'status ' + type;
        }
        
        // 页面加载时自动加载配置
        loadConfig();
        
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

        // 暴露解析函数供测试使用（不影响生产功能）
        window._testParseDimensionScores = parseDimensionScores;
        window._testParseIssues = parseIssues;
        window._testParseSuggestions = parseSuggestions;
        window._testParseHighlights = parseHighlights;
        window._testParseConclusion = parseConclusion;
        window._testGetDimensionConfig = getDimensionConfig;

        // 移动端汉堡菜单切换
        (function() {
            const menuToggle = document.getElementById('mobile-menu-toggle');
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (menuToggle && sidebar && overlay) {
                menuToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('open');
                    overlay.classList.toggle('open');
                });
                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                });
                sidebar.addEventListener('click', function(e) {
                    if (e.target.closest('.sidebar-item')) {
                        sidebar.classList.remove('open');
                        overlay.classList.remove('open');
                    }
                });
            }
        })();
