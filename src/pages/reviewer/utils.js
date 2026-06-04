        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function sanitizeUrl(url) {
            if (!url) return '#';
            // 仅允许 http/https 协议，防止 javascript: 等协议注入
            try {
                const parsed = new URL(url);
                if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                    return url;
                }
            } catch(e) {
                // 非绝对 URL，检查是否以 http 开头
                if (/^https?:\/\//.test(url)) return url;
            }
            return '#';
        }
        
        // 安全渲染AI输出的颜色标签（highlight-green/yellow/red）

        function getScoreColor(ratio) {
            if (ratio >= 0.8) return '#00ff88';
            if (ratio >= 0.6) return '#ffcc00';
            return '#ff5555';
        }

        function getScoreClass(ratio) {
            if (ratio >= 0.8) return 'high';
            if (ratio >= 0.6) return 'mid';
            return 'low';
        }

        function extractKeywords(text) {
            if (!text) return [];
            return text
                .replace(/<[^>]+>/g, '')
                .replace(/[\d,\.]+/g, '')
                .split(/[\s，。、；！？\(\)""''【】|:：«»\-\/]/)
                .filter(w => w.length >= 2)
                .filter(w => !STOP_WORDS.has(w));
        }

        function textSimilarity(text1, text2) {
            const words1 = new Set(extractKeywords(text1));
            const words2 = new Set(extractKeywords(text2));
            if (words1.size === 0 || words2.size === 0) return 0;
            const intersection = new Set([...words1].filter(w => words2.has(w)));
            const union = new Set([...words1, ...words2]);
            return intersection.size / union.size;
        }

        function renderRichComment(text) {
            if (!text) return '';
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const colorMap = {
                'green': isDark ? '#7ee787' : '#237804',
                'yellow': isDark ? '#ffd666' : '#ad6800',
                'red': isDark ? '#ff7875' : '#cf1322'
            };
            const parts = [];
            const regex = /<span class="highlight-(green|yellow|red)">(.*?)<\/span>/g;
            let lastIndex = 0;
            let match;
            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(escapeHtml(text.slice(lastIndex, match.index)));
                }
                const color = colorMap[match[1]] || '#ccc';
                parts.push(`<span style="color:${color}">${escapeHtml(match[2])}</span>`);
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < text.length) {
                parts.push(escapeHtml(text.slice(lastIndex)));
            }
            return parts.join('');
        }
        
        document.getElementById('kmsUrl').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') directReview();
        });
        
        // API 配置管理
