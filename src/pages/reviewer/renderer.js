        function renderPrincipleCards(sceneId) {
            const container = document.getElementById('principleCardsContainer');
            if (!container) return;
            const activeScene = sceneId || 'general-topic-review';
            const dims = sceneDimensionData[activeScene] || [];
            if (dims.length === 0) {
                container.innerHTML = '<div class="principle-card" style="opacity:0.6;text-align:center;padding:24px 0;">该场景评审维度暂未配置</div>';
                return;
            }
            container.innerHTML = dims.map(d => `
                <div class="principle-card" data-dim="${d.dim}">
                    <div class="dim-title">${d.dim} <span class="dim-weight">${d.weight}</span></div>
                    <div class="dim-body">${d.body}</div>
                    <div class="dim-bottom ${d.bottomClass}">${d.bottom}</div>
                </div>
            `).join('');
        }

        function drawTrendChart(history) {
            const canvas = document.getElementById('trendCanvas');
            const ctx = canvas.getContext('2d');
            const w = canvas.width, h = canvas.height;
            const padding = 30;
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            ctx.clearRect(0, 0, w, h);
            
            // 背景
            ctx.fillStyle = isDark ? '#1a1a2e' : '#f9fafb';
            ctx.fillRect(0, 0, w, h);
            
            const data = [...history].reverse();
            const scores = data.map(d => d.total_score || 0);
            const maxScore = Math.max(...scores, 100);
            const minScore = Math.min(...scores, 0);
            const range = maxScore - minScore || 1;
            
            // 网格线
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding + (h - 2 * padding) * (1 - i / 5);
                ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w - padding, y); ctx.stroke();
                ctx.fillStyle = isDark ? '#888' : '#9ca3af';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(Math.round(minScore + range * i / 5), 5, y + 3);
            }
            
            if (data.length >= 2) {
                // 数据线
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                data.forEach((d, i) => {
                    const x = padding + (w - 2 * padding) * (i / (data.length - 1));
                    const y = padding + (h - 2 * padding) * (1 - ((d.total_score || 0) - minScore) / range);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.stroke();
                
                // 数据点
                data.forEach((d, i) => {
                    const x = padding + (w - 2 * padding) * (i / (data.length - 1));
                    const y = padding + (h - 2 * padding) * (1 - ((d.total_score || 0) - minScore) / range);
                    ctx.fillStyle = '#3b82f6';
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = isDark ? '#fff' : '#1f2937';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(d.total_score || 0, x, y - 8);
                });
            }
            
            // X轴日期
            ctx.fillStyle = isDark ? '#888' : '#9ca3af';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            data.forEach((d, i) => {
                const x = padding + (w - 2 * padding) * (i / (data.length - 1));
                const date = new Date(d.timestamp);
                ctx.fillText(`${date.getMonth()+1}/${date.getDate()}`, x, h - 10);
            });
        }

        // ==================== 修改对比功能 ====================
        
        const STOP_WORDS = new Set(['的', '了', '是', '在', '有', '和', '与', '或', '但', '如果', '因为', '所以', '需要', '建议', '问题', '材料', '分析', '审核', '报告', '没有', '进行', '可以', '对于', '通过', '根据', '进行', '是否', '应该', '可能', '部分', '一些', '一个', '进行', '相关', '具体', '明确', '充分', '切实', '有效', '合理', '科学', '系统', '全面', '深入', '到位', '完善', '优化', '提升', '提高', '加强', '增强', '确保', '保证', '实现', '完成', '达到', '满足', '符合', '遵循', '按照', '依据', '针对', '关于', '对', '为', '将', '把', '被', '让', '使', '于', '从', '向', '到', '以', '及', '等', '或', '且', '而', '则', '即', '乃', '就', '便', '才', '都', '全', '总', '凡', '凡例', '以及', '还有', '另外', '此外', '同时', '并且', '而且', '然而', '但是', '不过', '只是', '只要', '只有', '无论', '不管', '不论', '尽管', '虽然', '即使', '即便', '除非', '否则', '不然', '要么', '不如', '宁可', '宁愿', '与其', '不但', '不仅', '不只', '不光', '不单', '不独', '而且', '反而', '反倒', '却', '可是', '然而', '只是', '不过', '无奈', '岂料', '岂知', '谁知', '哪知', '不料', '不想', '不提防', '不防备', '不虞', '不图', '不备', '不意', '不期', '不防', '不堤', '不虞']);

        function renderIssueCard(issue, type) {
            const colors = {'致命': '#ff5555', '严重': '#ff5555', '警告': '#ffcc00', '建议': '#00ff88'};
            const icons = {'resolved': '✅', 'new': '❗', 'persistent': '⏳'};
            const labels = {'resolved': '→ 已修复', 'new': '← 新增', 'persistent': '仍遗留'};
            const color = colors[issue.level] || '#888';
            return `
                <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                        <span style="font-size:0.75em;">${icons[type]}</span>
                        <span style="color:${color};font-size:0.8em;font-weight:600;">${issue.level}</span>
                        <span style="color:#888;font-size:0.8em;">· ${issue.dimension || '通用'}</span>
                    </div>
                    <div style="font-size:0.85em;color:#ccc;padding-left:18px;">${renderRichComment(issue.desc || '')}</div>
                    <div style="font-size:0.75em;color:#666;padding-left:18px;margin-top:2px;">${labels[type]}</div>
                </div>
            `;
        }

        function renderCompareMatrix(data) {
            var content = document.getElementById('compareMatrixContent');
            if (!content) return;
            if (!data.matrix || !Array.isArray(data.matrix) || data.matrix.length === 0) {
                content.innerHTML = '<p style="color:#dc2626;text-align:center;padding:20px;">对比矩阵数据为空</p>';
                return;
            }
            if (!data.matrix[0] || typeof data.matrix[0] !== 'object') {
                content.innerHTML = '<p style="color:#dc2626;text-align:center;padding:20px;">对比矩阵数据格式错误</p>';
                return;
            }
            
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            var colKeys = Object.keys(data.matrix[0]).filter(function(k) { return k !== 'dimension'; });
            
            // 建立 url -> title 映射
            var urlTitleMap = {};
            (data.scores || []).forEach(function(s) {
                urlTitleMap[s.url] = s.title || s.url;
            });
            
            // 按总分排序（高->低）
            var sortedScores = (data.scores || []).slice().sort(function(a, b) {
                return (b.total_score || 0) - (a.total_score || 0);
            });
            var sortedColKeys = sortedScores.map(function(s) { return s.url; });
            
            // 合格线
            var PASS_LINE = 80;
            
            var html = '';
            
            // ===== 排名卡片区域 =====
            html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">';
            sortedScores.forEach(function(s, idx) {
                var rankColors = ['#f59e0b', '#9ca3af', '#b45309']; // 金、银、铜
                var rankBg = idx < 3 ? 'background:linear-gradient(135deg,' + rankColors[idx] + '15,transparent);' : '';
                var rankBorder = idx < 3 ? 'border-color:' + rankColors[idx] + '40;' : '';
                var passed = (s.total_score || 0) >= PASS_LINE;
                var statusBadge = passed 
                    ? '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.7em;background:#dcfce7;color:#166534;font-weight:600;">✅ 合格</span>'
                    : '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.7em;background:#fee2e2;color:#991b1b;font-weight:600;">❌ 不合格</span>';
                var scoreColor = s.total_score >= 80 ? '#16a34a' : (s.total_score >= 60 ? '#ca8a04' : '#dc2626');
                var titleShort = (s.title || s.url || '未知').substring(0, 20) + ((s.title || s.url || '').length > 20 ? '...' : '');
                html += '<div style="flex:1;min-width:160px;max-width:220px;padding:14px;border-radius:10px;border:1px solid #e5e7eb;' + rankBg + rankBorder + 'box-shadow:0 1px 3px rgba(0,0,0,0.04);">';
                html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
                html += '<span style="font-size:1.1em;font-weight:800;color:' + (idx < 3 ? rankColors[idx] : '#6b7280') + ';">#' + (idx + 1) + '</span>';
                html += '<span style="font-size:0.75em;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;" title="' + escapeHtml(s.title || s.url) + '">' + escapeHtml(titleShort) + '</span>';
                html += '</div>';
                html += '<div style="font-size:2em;font-weight:800;color:' + scoreColor + ';line-height:1;">' + (s.total_score || 0) + '<span style="font-size:0.5em;color:#9ca3af;font-weight:400;">/100</span></div>';
                html += '<div style="margin-top:6px;">' + statusBadge + '</div>';
                html += '</div>';
            });
            html += '</div>';
            
            // ===== 热力图表格 =====
            var theadBorder = '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb');
            var cellBorder = '1px solid ' + (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6');
            var dimTextColor = isDark ? '#ccc' : '#374151';
            var thBg = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb';
            
            html += '<div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb;">';
            html += '<table style="width:100%;border-collapse:collapse;font-size:0.85em;">';
            
            // 表头
            html += '<thead><tr style="background:' + thBg + ';">';
            html += '<th style="padding:10px 8px;border-bottom:' + theadBorder + ';text-align:left;font-weight:600;color:#6b7280;font-size:0.8em;white-space:nowrap;">维度 \ 材料</th>';
            sortedColKeys.forEach(function(k) {
                var title = urlTitleMap[k] || k;
                var shortTitle = title.substring(0, 12) + (title.length > 12 ? '...' : '');
                html += '<th style="padding:10px 8px;border-bottom:' + theadBorder + ';text-align:center;font-weight:600;color:#374151;font-size:0.8em;min-width:80px;" title="' + escapeHtml(title) + '">' + escapeHtml(shortTitle) + '</th>';
            });
            html += '</tr></thead><tbody>';
            
            // 维度行
            data.matrix.forEach(function(row) {
                html += '<tr style="border-bottom:' + cellBorder + ';">';
                html += '<td style="padding:10px 8px;text-align:left;font-weight:500;color:' + dimTextColor + ';white-space:nowrap;font-size:0.85em;">' + escapeHtml(row.dimension) + '</td>';
                sortedColKeys.forEach(function(k) {
                    var score = row[k] || 0;
                    var maxScore = data.scores.find(function(s) { return s.url === k; });
                    // 热力图背景色
                    var heatBg = '';
                    if (score >= 8) heatBg = 'background:rgba(22,163,74,0.08);';
                    else if (score >= 5) heatBg = 'background:rgba(202,138,4,0.08);';
                    else heatBg = 'background:rgba(220,38,38,0.06);';
                    var scoreColor = score >= 8 ? '#16a34a' : (score >= 5 ? '#ca8a04' : '#dc2626');
                    html += '<td style="padding:10px 8px;text-align:center;font-weight:600;color:' + scoreColor + ';font-size:0.9em;' + heatBg + '">' + score + '</td>';
                });
                html += '</tr>';
            });
            
            // 总分行
            html += '<tr style="background:' + thBg + ';font-weight:700;border-top:2px solid #e5e7eb;">';
            html += '<td style="padding:10px 8px;text-align:left;color:#1f2937;font-size:0.9em;white-space:nowrap;">🏆 总分</td>';
            sortedColKeys.forEach(function(k) {
                var s = sortedScores.find(function(item) { return item.url === k; });
                var total = s ? (s.total_score || 0) : 0;
                var totalColor = total >= 80 ? '#16a34a' : (total >= 60 ? '#ca8a04' : '#dc2626');
                html += '<td style="padding:10px 8px;text-align:center;font-size:1.1em;font-weight:800;color:' + totalColor + ';">' + total + '</td>';
            });
            html += '</tr>';
            
            // 统计行：平均分
            html += '<tr style="border-top:1px dashed #e5e7eb;">';
            html += '<td style="padding:10px 8px;text-align:left;color:#6b7280;font-size:0.8em;white-space:nowrap;">📊 平均分</td>';
            sortedColKeys.forEach(function(k) {
                var scores = data.matrix.map(function(row) { return row[k] || 0; });
                var avg = scores.length ? (scores.reduce(function(a,b){return a+b;}, 0) / scores.length).toFixed(1) : 0;
                html += '<td style="padding:10px 8px;text-align:center;color:#6b7280;font-size:0.8em;">' + avg + '</td>';
            });
            html += '</tr>';
            
            // 统计行：最高分
            html += '<tr>';
            html += '<td style="padding:10px 8px;text-align:left;color:#6b7280;font-size:0.8em;white-space:nowrap;">⬆️ 最高分</td>';
            sortedColKeys.forEach(function(k) {
                var scores = data.matrix.map(function(row) { return row[k] || 0; });
                var max = scores.length ? Math.max.apply(null, scores) : 0;
                html += '<td style="padding:10px 8px;text-align:center;color:#16a34a;font-size:0.8em;">' + max + '</td>';
            });
            html += '</tr>';
            
            // 统计行：最低分
            html += '<tr>';
            html += '<td style="padding:10px 8px;text-align:left;color:#6b7280;font-size:0.8em;white-space:nowrap;">⬇️ 最低分</td>';
            sortedColKeys.forEach(function(k) {
                var scores = data.matrix.map(function(row) { return row[k] || 0; });
                var min = scores.length ? Math.min.apply(null, scores) : 0;
                html += '<td style="padding:10px 8px;text-align:center;color:#dc2626;font-size:0.8em;">' + min + '</td>';
            });
            html += '</tr>';
            
            html += '</tbody></table></div>';
            
            // ===== 图例 =====
            html += '<div style="display:flex;gap:16px;justify-content:center;margin-top:16px;font-size:0.75em;color:#9ca3af;">';
            html += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:rgba(22,163,74,0.15);margin-right:4px;vertical-align:middle;"></span>优秀 (≥8)</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:rgba(202,138,4,0.15);margin-right:4px;vertical-align:middle;"></span>一般 (5-7)</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:rgba(220,38,38,0.1);margin-right:4px;vertical-align:middle;"></span>需改进 (&lt;5)</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#f59e0b;margin-right:4px;vertical-align:middle;"></span>前3名</span>';
            html += '</div>';
            
            content.innerHTML = html;
        }
        
        // 批量输入区默认收起
        (function() {
            var area = document.getElementById('batchInputArea');
            if (area) area.style.display = 'none';
        })();
        
        // ==================== 原有函数 ====================

        function drawRadarChart(data) {
            const canvas = document.getElementById('radarCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const { scores, totalScore, passed } = data;
            
            if (!scores || scores.length === 0) return;
            
            // 确保容器可见后再获取尺寸
            document.getElementById('radarChartBox').style.display = 'block';
            
            // 固定逻辑尺寸，避免多次调用导致canvas无限放大
            const W = 280;
            const H = 230;
            
            const dpr = window.devicePixelRatio || 1;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            // 使用setTransform重置变换矩阵，避免scale叠加
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            
            const cx = W / 2;
            const cy = H / 2 - 8;
            const radius = Math.max(20, Math.min(W, H) / 2 - 50);
            
            ctx.clearRect(0, 0, W, H);
            
            const dimCount = scores.length || 6;
            const angleStep = (Math.PI * 2) / dimCount;
            const startAngle = -Math.PI / 2;
            
            // 检测主题（雷达图在浅色卡片内，统一用适合白底的颜色）
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            
            // 网格 — 在白底上用浅灰色
            const gridLevels = 5;
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            for (let level = 1; level <= gridLevels; level++) {
                const r = (radius / gridLevels) * level;
                ctx.beginPath();
                for (let i = 0; i < dimCount; i++) {
                    const angle = startAngle + i * angleStep;
                    const x = cx + Math.cos(angle) * r;
                    const y = cy + Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            
            // 轴线
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            for (let i = 0; i < dimCount; i++) {
                const angle = startAngle + i * angleStep;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
                ctx.stroke();
            }
            
            // 数据区域
            ctx.beginPath();
            for (let i = 0; i < dimCount; i++) {
                const angle = startAngle + i * angleStep;
                const ratio = scores[i].score / scores[i].max;
                const r = radius * ratio;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gradient.addColorStop(0, 'rgba(37,99,235,0.2)');
            gradient.addColorStop(1, 'rgba(37,99,235,0.06)');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // 数据点
            for (let i = 0; i < dimCount; i++) {
                const angle = startAngle + i * angleStep;
                const ratio = scores[i].score / scores[i].max;
                const r = radius * ratio;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#2563eb';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // 标签
            ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < dimCount; i++) {
                const angle = startAngle + i * angleStep;
                const labelR = radius + 22;
                const x = cx + Math.cos(angle) * labelR;
                const y = cy + Math.sin(angle) * labelR;
                ctx.fillStyle = '#555';
                ctx.fillText(scores[i].short, x, y);
                ctx.fillStyle = getScoreColor(scores[i].score / scores[i].max);
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(`${scores[i].score}/${scores[i].max}`, x, y + 16);
                ctx.font = '13px sans-serif';
            }
            
            // 中心总分
            ctx.fillStyle = '#1f1f1f';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${totalScore}`, cx, cy - 4);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText('/ 100', cx, cy + 14);
            
            // 雷达图区域不重复显示状态（左侧总分卡片已有）
            const badgeEl = document.getElementById('radarPassBadge');
            if (badgeEl) badgeEl.innerHTML = '';
            
            document.getElementById('radarChartBox').style.display = 'block';
        }

        // 直接审核：获取内容 + 调用 Kimi API

        function fillAnalysisReport(scoreData, reportText, facts) {
            
            // ========== 合格标准 ==========
            const stdBody = document.getElementById('passStandardBody');
            const currentScene = getCurrentSceneId();
            if (currentScene === 'general-topic-review') {
                stdBody.innerHTML = `
                    <div class="std-item"><span class="std-dot"></span><span>总分 ≥ <strong>80分</strong></span></div>
                    <div class="std-item"><span class="std-dot"></span><span>且未触碰任何红线：</span></div>
                    <div style="padding-left:18px;color:#6b7280;font-size:0.9em;">
                        <div>• 零决策请求 / 零数据支撑 / 零责任主体 / 零时间计划</div>
                    </div>
                    <div style="margin-top:6px;padding:6px 10px;background:#fff;border-radius:6px;border:1px solid #e5e7eb;font-size:0.85em;color:#6b7280;">
                        触碰红线 → 总分封顶60分，判定<span class="std-redline">「待修改」</span>
                    </div>
                `;
            } else {
                stdBody.innerHTML = `
                    <div class="std-item"><span class="std-dot"></span><span>总分 ≥ <strong>80分</strong></span></div>
                    <div class="std-item"><span class="std-dot"></span><span>且差距与根因分析 ≥ <strong>12分</strong>（单项底线）</span></div>
                    <div style="margin-top:6px;padding:6px 10px;background:#fff;border-radius:6px;border:1px solid #e5e7eb;font-size:0.85em;color:#6b7280;">
                        根因分析低于12分 → 直接判定<span class="std-redline">「待修改」</span>，不论总分
                    </div>
                `;
            }
            
            // ========== 总体评分大卡片 ==========
            const totalEl = document.getElementById('analysisTotalScore');
            const badgeEl = document.getElementById('analysisStatusBadge');
            totalEl.textContent = scoreData.totalScore;
            
            if (scoreData.passed === true) {
                badgeEl.textContent = '✅ 通过';
                badgeEl.className = 'analysis-status-badge pass';
            } else if (scoreData.passed === false) {
                badgeEl.textContent = '❌ 待修改';
                badgeEl.className = 'analysis-status-badge fail';
            } else {
                badgeEl.textContent = '审核完成';
                badgeEl.className = 'analysis-status-badge';
            }
            
            // 各维度小卡片
            const dimsBox = document.getElementById('scoreBoardDims');
            dimsBox.innerHTML = scoreData.scores.map(s => {
                const ratio = s.score / s.max;
                const cls = getScoreClass(ratio);
                return `<div class="score-dim-item">
                    <div class="score-dim-value ${cls}">${s.score}</div>
                    <div class="score-dim-label">${escapeHtml(s.name)} / ${s.max}</div>
                </div>`;
            }).join('');
            
            // 单项底线提示（根据场景适配）
            const bottomLine = document.getElementById('scoreBoardBottomLine');
            let bottomLineHtml = '';
            
            if (currentScene === 'general-topic-review') {
                // 通用议题场景：检查红线触碰
                const alignScore = scoreData.scores.find(s => s.name.includes('目标'));
                const decisionScore = scoreData.scores.find(s => s.name.includes('决策'));
                const actionScore = scoreData.scores.find(s => s.name.includes('行动'));
                const redLines = [];
                if (alignScore && alignScore.score < 8) redLines.push('目标-解决方案对齐度 &lt; 8分（零决策请求风险）');
                if (decisionScore && decisionScore.score < 8) redLines.push('决策支撑度 &lt; 8分（零数据支撑风险）');
                if (actionScore && actionScore.score < 6) redLines.push('行动具体化 &lt; 6分（零责任主体或零时间计划风险）');
                if (redLines.length > 0) {
                    bottomLineHtml = `<span class="highlight-red">触碰红线：</span><br>` + redLines.map(l => `• ${l}`).join('<br>');
                    bottomLineHtml += '<br><span style="color:#ff7777;font-size:0.85em;">触碰任意红线，总分封顶60分，不得直接上会</span>';
                }
            } else {
                // 述职场景：差距与根因分析底线
                const rcScore = scoreData.scores.find(s => s.name.includes('根因'));
                if (rcScore && rcScore.score < 12) {
                    bottomLineHtml = `<span class="highlight-red">差距与根因分析 ${rcScore.score} 分 &lt; 12 分底线</span><br>按评分规则直接判定为「待修改」，不论总分`;
                }
            }
            bottomLine.innerHTML = bottomLineHtml;
            
            // ========== 分项评分表 ==========
            const tbody = document.getElementById('dimensionTableBody');
            tbody.innerHTML = scoreData.scores.map(s => {
                const ratio = s.score / s.max;
                return `<tr>
                    <td><strong>${escapeHtml(s.name)}</strong></td>
                    <td style="font-weight:700;color:${getScoreColor(ratio)}">${s.score}</td>
                    <td>${s.max}</td>
                    <td>${renderRichComment(s.comment) || '—'}</td>
                </tr>`;
            }).join('');
            
            // ========== 问题清单 ==========
            const issues = parseIssues(reportText);
            const issuesCard = document.getElementById('issuesCard');
            if (issues.length > 0) {
                issuesCard.style.display = 'block';
                const badgeMap = {'致命':'badge-fatal','严重':'badge-serious','警告':'badge-warn','建议':'badge-tip'};
                document.getElementById('issueTableBody').innerHTML = issues.map(iss => {
                    const badgeCls = badgeMap[iss.level] || 'badge-warn';
                    const rowCls = iss.level === '致命' ? 'issue-fatal' : (iss.level === '严重' ? 'issue-serious' : (iss.level === '警告' ? 'issue-warn' : 'issue-tip'));
                    return `<tr class="${rowCls}">
                        <td><span class="${badgeCls}">${escapeHtml(iss.level)}</span></td>
                        <td>${escapeHtml(iss.dimension || '—')}</td>
                        <td>${renderRichComment(iss.desc)}</td>
                    </tr>`;
                }).join('');
            } else {
                issuesCard.style.display = 'none';
            }
            
            // ========== 改进建议 ==========
            const suggestions = parseSuggestions(reportText);
            const suggCard = document.getElementById('suggestionsCard');
            if (suggestions.length > 0) {
                suggCard.style.display = 'block';
                const pCls = {'P0':'priority-p0','P1':'priority-p1','P2':'priority-p2'};
                document.getElementById('suggestionTableBody').innerHTML = suggestions.map(s => {
                    return `<tr>
                        <td class="${pCls[s.priority] || 'priority-p1'}">${escapeHtml(s.priority)}</td>
                        <td>${renderRichComment(s.problem)}</td>
                        <td>${renderRichComment(s.suggestion)}</td>
                    </tr>`;
                }).join('');
            } else {
                suggCard.style.display = 'none';
            }
            
            // ========== 亮点 ==========
            const highlights = parseHighlights(reportText);
            const highCard = document.getElementById('highlightsCard');
            if (highlights.length > 0) {
                highCard.style.display = 'block';
                document.getElementById('highlightList').innerHTML = highlights.map(h => `<li>${renderRichComment(h)}</li>`).join('');
            } else {
                highCard.style.display = 'none';
            }
            
            // ========== 审核结论 ==========
            const conclusion = parseConclusion(reportText);
            const concCard = document.getElementById('conclusionCard');
            if (conclusion) {
                concCard.style.display = 'block';
                // 将 markdown 简单转换为 HTML，并保留AI输出的颜色标签
                let html = renderRichComment(conclusion)
                    .replace(/\n/g, '<br>');
                const box = document.getElementById('conclusionBox');
                box.innerHTML = html;
                // 根据通过状态给结论框添加样式
                box.classList.remove('conclusion-pass', 'conclusion-fail');
                if (scoreData.passed === true) box.classList.add('conclusion-pass');
                else if (scoreData.passed === false) box.classList.add('conclusion-fail');
            } else {
                concCard.style.display = 'none';
            }
            
            // 原始报告
            document.getElementById('reportBox').textContent = reportText;
            
            // 系统事实检查
            fillFactCheck(facts);
        }

        function fillFactCheck(facts) {
            const box = document.getElementById('factCheckBox');
            if (!facts) {
                box.innerHTML = '<div style="color:#666;font-size:0.85em;text-align:center;">暂无事实检查数据</div>';
                return;
            }
            
            const items = [];
            
            // ========== 通用议题场景检查项 ==========
            // 问题定义
            const prob = facts.problem_definition;
            if (prob) {
                items.push(renderFactItem(prob.has_problem_definition, prob.has_problem_definition ? '✓' : '✗', prob.has_problem_definition ? `问题定义：已检测到（${(prob.keywords_found || []).slice(0, 3).join('、')}）` : '问题定义：未明确检测到议题/问题/痛点描述'));
            }
            
            // 目标-方案对齐
            const align = facts.solution_alignment;
            if (align) {
                if (align.has_alignment) {
                    items.push(renderFactItem(true, '✓', '目标-方案对齐：问题与解决方案均已检测到'));
                } else if (align.has_problem && !align.has_solution) {
                    items.push(renderFactItem(false, '✗', '目标-方案对齐：有问题描述但缺少对应解决方案'));
                } else if (!align.has_problem && align.has_solution) {
                    items.push(renderFactItem(false, '✗', '目标-方案对齐：有解决方案但缺少问题定义'));
                } else {
                    items.push(renderFactItem(false, '✗', '目标-方案对齐：未检测到明确的问题和解决方案'));
                }
            }
            
            // 数据支撑
            const data = facts.data_support;
            if (data) {
                items.push(renderFactItem(data.has_data_support, data.has_data_support ? '✓' : '✗', data.has_data_support ? `数据支撑：检测到 ${data.data_count || 0} 处量化数据` : '数据支撑：未检测到量化数据（百分比/金额/数量等）'));
            }
            
            // 决策逻辑
            const logic = facts.decision_logic;
            if (logic) {
                items.push(renderFactItem(logic.has_decision_logic, logic.has_decision_logic ? '✓' : '✗', logic.has_decision_logic ? '决策逻辑：已检测到推理/结论表述' : '决策逻辑：未检测到明确的分析推理过程'));
            }
            
            // 行动具体化
            const action = facts.action_specificity;
            if (action) {
                const parts = [];
                if (action.has_action_items) parts.push('有行动项');
                if (action.has_responsible_person) parts.push('有责任人');
                if (action.has_timeline) parts.push('有时间节点');
                if (parts.length > 0) {
                    items.push(renderFactItem(null, '•', `行动具体化：${parts.join(' | ')}`, 'info'));
                } else {
                    items.push(renderFactItem(false, '✗', '行动具体化：未检测到具体行动安排'));
                }
            }
            
            // 材料格式
            const fmt = facts.material_format;
            if (fmt) {
                const parts = [];
                if (fmt.has_headings) parts.push('标题层级');
                if (fmt.has_lists) parts.push('列表');
                if (fmt.has_tables) parts.push('表格');
                if (fmt.has_paragraphs) parts.push('分段');
                if (parts.length > 0) {
                    items.push(renderFactItem(true, '✓', `材料格式：${parts.join(' | ')}`));
                } else {
                    items.push(renderFactItem(false, '✗', '材料格式：结构混乱，缺少标题/列表/表格'));
                }
            }
            
            // ========== 述职场景检查项（保持原有逻辑） ==========
            // 完整性
            const comp = facts.completeness;
            if (comp) {
                const pass = comp.has_all_modules;
                items.push(renderFactItem(pass, pass ? '✓' : '✗', pass ? `5大模块齐全（${comp.found_count}/${comp.total_count}）` : `模块缺失：${comp.found_count}/${comp.total_count}，缺少：${(comp.missing || []).join('、')}`));
            }
            
            // 根因分析工具
            const tools = facts.root_cause_tools;
            if (tools) {
                const pass = tools.has_tool;
                items.push(renderFactItem(pass, pass ? '✓' : '✗', pass ? `根因分析工具：${(tools.tools_found || []).join('、')}` : '根因分析工具：未检测到 5Why/鱼骨图/漏斗分析'));
            }
            
            // 归因
            const attr = facts.attribution;
            if (attr) {
                if (attr.total_attributions > 0) {
                    items.push(renderFactItem(null, '•', `主观归因：${attr.subjective_count} 个，客观归因：${attr.objective_count} 个（主观占比 ${Math.round(attr.subjective_ratio * 100)}%）`, 'info'));
                } else {
                    items.push(renderFactItem(null, '•', '归因分析：未检测到主观/客观归因关键词', 'info'));
                }
            }
            
            // 里程碑
            const ms = facts.milestones;
            if (ms) {
                items.push(renderFactItem(ms.has_milestone, ms.has_milestone ? '✓' : '✗', ms.has_milestone ? '里程碑/验收标准：已检测到' : '里程碑/验收标准：未检测到'));
            }
            
            // SP引用
            const sp = facts.sp_reference;
            if (sp) {
                items.push(renderFactItem(sp.has_sp_reference, sp.has_sp_reference ? '✓' : '✗', sp.has_sp_reference ? 'SP/战略引用：已检测到' : 'SP/战略引用：未检测到'));
            }
            
            // 资源需求
            const res = facts.resources;
            if (res) {
                const parts = [];
                const labels = {hr: '人力', budget: '预算', training: '培训', policy: '政策支持'};
                for (const key of ['hr', 'budget', 'training', 'policy']) {
                    parts.push(`${res[key] && res[key].has ? '✓' : '✗'}${labels[key]}`);
                }
                items.push(renderFactItem(null, '•', `资源需求：${parts.join(' | ')}`, 'info'));
            }
            
            // 硬缺口方案
            const gap = facts.hard_gap_plan;
            if (gap) {
                items.push(renderFactItem(gap.has_gap_plan, gap.has_gap_plan ? '✓' : '✗', gap.has_gap_plan ? '硬缺口应对方案：已检测到' : '硬缺口应对方案：未检测到'));
            }
            
            // 表格
            const tbl = facts.tables;
            if (tbl) {
                items.push(renderFactItem(tbl.has_tables, tbl.has_tables ? '✓' : '✗', tbl.has_tables ? `数据表格：已检测到（${tbl.table_line_count || 0} 行表格）` : '数据表格：未检测到'));
            }
            
            // 同比环比
            const qoq = facts.quarter_over_quarter;
            if (qoq) {
                items.push(renderFactItem(qoq.has_qoq, qoq.has_qoq ? '✓' : '✗', qoq.has_qoq ? '同比/环比数据：已检测到' : '同比/环比数据：未检测到'));
            }
            
            box.innerHTML = items.join('');
        }

        function renderFactItem(pass, icon, text, type) {
            let cls = 'fact-check-item';
            if (type === 'info') cls += ' info';
            else if (pass === true) cls += ' pass';
            else if (pass === false) cls += ' fail';
            return `<div class="${cls}"><span class="icon">${icon}</span><span>${escapeHtml(text)}</span></div>`;
        }
