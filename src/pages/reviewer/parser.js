        function parsePromptSuffix(suffix) {
            const lines = suffix.split('\n').filter(line => line.trim().startsWith('-'));
            return lines.map(line => line.trim().substring(1).trim());
        }

        // 本地硬编码的审核要点（代理不可用时使用）

        function parseDimensionScores(reportText, sceneId) {
            const scores = [];
            const lines = reportText.split('\n');
            const dimConfig = getDimensionConfig(sceneId || getCurrentSceneId());

            for (const dim of dimConfig) {
                let found = false;
                const escapedName = dim.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // 兼容维度名和得分被 HTML 标签包裹的情况，不严格匹配满分列（从报告中提取实际满分）
                const regex = new RegExp('\\|\\s*(?:<[^>]+>)?\\s*' + escapedName + '\\s*(?:<\\/[^>]+>)?\\s*\\|\\s*(?:<[^>]+>)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:<\\/[^>]+>)?\\s*\\|');
                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        // 提取评价：分割表格行，取第4/5列（先去掉HTML标签）
                        const cleanLine = line.replace(/<[^>]+>/g, '');
                        const parts = cleanLine.split('|').map(s => s.trim()).filter(s => s);
                        const score = parseFloat(match[1]);
                        const maxFromReport = parts.length >= 3 ? parseFloat(parts[2]) || dim.max : dim.max;
                        const comment = parts.length >= 5 ? parts[4] : (parts.length >= 4 ? parts[3] : '');
                        scores.push({ ...dim, score, max: maxFromReport, comment });
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    scores.push({ ...dim, score: 0, comment: '未识别到评分' });
                }
            }

            let totalScore = 0;
            const totalMatch = reportText.match(/【总体评分】\s*(\d+(?:\.\d+)?)\s*\/\s*100/);
            if (totalMatch) totalScore = parseFloat(totalMatch[1]);

            let passed = null;
            // 精确匹配判定结果，避免在"通过标准"段落误匹配
            if (/判定[：:]\s*✅\s*通过/.test(reportText)) passed = true;
            else if (/判定[：:]\s*❌\s*待修改/.test(reportText)) passed = false;

            return { scores, totalScore, passed };
        }

        function parseIssues(reportText) {
            const issues = [];
            const lines = reportText.split('\n');
            let inIssues = false;
            for (const line of lines) {
                const trimmed = line.trim();
                // 支持多种标题格式：【问题清单】、问题清单（分级）、## 问题清单 等
                if (!inIssues && (/问题清单/.test(trimmed) && !/【问题清单】/.test(trimmed) || trimmed.includes('【问题清单'))) {
                    inIssues = true; continue;
                }
                // 遇到下一个一级标题或空行+标题时退出
                if (inIssues && (/^#{1,2}\s/.test(trimmed) || /^【/.test(trimmed) || /^[-=]{3,}$/.test(trimmed))) {
                    // 如果是紧跟的下一个大段落标题，退出
                    if (/亮点|改进建议|审核结论|总体评分/.test(trimmed)) break;
                }
                if (!inIssues) continue;
                // 表格行：| 致命 | 维度 | 描述 |
                let m = line.match(/^\|\s*(?:\[[红黄绿]\])?\s*(致命|严重|警告|建议)\s*\|\s*([^|]*)\|\s*(.+)\|/);
                if (m) {
                    // 过滤表头行
                    const dimName = m[2].trim();
                    const descText = m[3].trim();
                    if (dimName === '维度' && /^(描述|问题|建议)$/.test(descText)) continue;
                    const emoji = m[1]==='致命'?'[红]':m[1]==='建议'?'[绿]':'[黄]';
                    issues.push({emoji, level:m[1], dimension:dimName, desc:descText});
                    continue;
                }
                // 列表行：- [红] 致命：维度 | 描述
                m = line.match(/^[\-*•]\s*(?:\[[红黄绿]\])?\s*(致命|严重|警告|建议)[：:]\s*(.+)$/);
                if (m) {
                    const emoji = m[1]==='致命'?'[红]':m[1]==='建议'?'[绿]':'[黄]';
                    // 尝试拆分维度和描述
                    const parts = m[2].split(/[|｜]/).map(s => s.trim()).filter(s => s);
                    if (parts.length >= 2) {
                        issues.push({emoji, level:m[1], dimension:parts[0], desc:parts.slice(1).join(' | ')});
                    } else {
                        issues.push({emoji, level:m[1], dimension:'', desc:m[2].trim()});
                    }
                    continue;
                }
                // 简单行：[红] 致命：描述
                m = line.match(/^(?:\[[红黄绿]\])?\s*(致命|严重|警告|建议)[：:]\s*(.+)$/);
                if (m) {
                    const emoji = m[1]==='致命'?'[红]':m[1]==='建议'?'[绿]':'[黄]';
                    issues.push({emoji, level:m[1], dimension:'', desc:m[2].trim()});
                }
            }
            return issues;
        }

        function parseSuggestions(reportText) {
            const suggestions = [];
            const lines = reportText.split('\n');
            let inSugg = false;
            for (const line of lines) {
                const trimmed = line.trim();
                // 支持多种标题格式
                if (/改进建议/.test(trimmed) && !/【改进建议】/.test(trimmed) || trimmed.includes('【改进建议')) {
                    inSugg = true; continue;
                }
                if (inSugg && (/^#{1,2}\s/.test(trimmed) || /^【/.test(trimmed))) {
                    if (/亮点|审核结论|总体评分|问题清单/.test(trimmed)) break;
                }
                if (!inSugg) continue;
                // 表格行：| P0 | 问题 | 建议 |
                let m = line.match(/^\|\s*(P[012])\s*\|\s*([^|]*)\|\s*(.+)\|/);
                if (m) {
                    suggestions.push({priority:m[1], problem:m[2].trim(), suggestion:m[3].trim()});
                    continue;
                }
                // 列表行：- P0 | 问题 | 建议
                m = line.match(/^[\-*•]\s*(P[012])\s*[|｜]\s*([^|｜]*)[|｜]\s*(.+)$/);
                if (m) {
                    suggestions.push({priority:m[1], problem:m[2].trim(), suggestion:m[3].trim()});
                    continue;
                }
                // 简单行：P0：问题 → 建议
                m = line.match(/^(P[012])[：:]\s*(.+?)[→\-\~]\s*(.+)$/);
                if (m) {
                    suggestions.push({priority:m[1], problem:m[2].trim(), suggestion:m[3].trim()});
                    continue;
                }
                // 行内格式：P0 问题 → 建议
                m = line.match(/^(P[012])\s+(.+?)[→\-\~]\s*(.+)$/);
                if (m) {
                    suggestions.push({priority:m[1], problem:m[2].trim(), suggestion:m[3].trim()});
                }
            }
            return suggestions;
        }

        function parseHighlights(reportText) {
            const highlights = [];
            const lines = reportText.split('\n');
            let inHigh = false;
            for (const line of lines) {
                const trimmed = line.trim();
                if (!inHigh && /亮点/.test(trimmed) && !trimmed.includes('无亮点') && !trimmed.includes('未识别')) {
                    inHigh = true; continue;
                }
                if (inHigh && (/^#{1,2}\s/.test(trimmed) || /^【/.test(trimmed))) {
                    if (/改进建议|审核结论|总体评分|问题清单/.test(trimmed)) break;
                }
                if (!inHigh) continue;
                const m = line.match(/^[\-*•]\s*(.+)$/);
                if (m) highlights.push(m[1].trim());
            }
            return highlights;
        }

        function parseConclusion(reportText) {
            const lines = reportText.split('\n');
            let inConc = false;
            const parts = [];
            for (const line of lines) {
                const trimmed = line.trim();
                if (/审核结论/.test(trimmed) || trimmed.includes('【审核结论')) { inConc = true; continue; }
                if (inConc && (/^#{1,2}\s/.test(trimmed) || /^【/.test(trimmed))) break;
                if (!inConc) continue;
                if (trimmed) parts.push(trimmed);
            }
            return parts.join('\n');
        }
