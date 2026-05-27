const ISSUE_STORAGE_KEY = 'dste_issues_v1';
function loadIssues(sourceSystem) {
    const key = ISSUE_STORAGE_KEY + '_' + (sourceSystem || 'ALL');
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        return data;
    } catch {
        return [];
    }
}

function saveIssues(issues, sourceSystem) {
    const key = ISSUE_STORAGE_KEY + '_' + (sourceSystem || 'ALL');
    localStorage.setItem(key, JSON.stringify(issues || []));
    // 同步到云端（合并 ST + AT）
    const allIssues = [...loadIssues('ST'), ...loadIssues('AT')];
    apiSave('/api/issues', allIssues);
}

function loadAllIssues() {
    return [...loadIssues('ST'), ...loadIssues('AT')];
}

export function validateIssueRow(row, sourceSystem) {
    const errors = [];
    const warnings = [];
    const cleanedRow = { ...row };

    // 检测导入格式：新格式（真实Excel列）vs 旧格式（预设模板列）
    const isNewFormat = cleanedRow['议题主题'] !== undefined || cleanedRow['片联议题类型'] !== undefined;
    const isOldFormat = cleanedRow['议题标题'] !== undefined || cleanedRow['议题编号'] !== undefined;

    if (!isNewFormat && !isOldFormat) {
        errors.push('无法识别导入格式：缺少必要的列（议题主题/片联议题类型 或 议题标题/议题编号）');
    }

    // 新格式必填校验
    if (isNewFormat) {
        if (!cleanedRow['议题主题'] || String(cleanedRow['议题主题']).trim() === '') {
            errors.push('议题主题不能为空');
        }
    }

    // CSV 注入防护（覆盖新旧格式的文本字段）
    const textFields = isNewFormat
        ? ['议题主题', '议题描述', '结论', '团队负责人审核结论']
        : ['议题标题', '议题内容', '决议内容', '行动项'];
    textFields.forEach(field => {
        if (cleanedRow[field] && hasCsvFormulaInjection(cleanedRow[field])) {
            warnings.push(`字段 "${field}" 可能包含 CSV 公式注入，已自动清理`);
            cleanedRow[field] = sanitizeCsvCell(cleanedRow[field]);
        }
    });

    return { isValid: errors.length === 0, errors, warnings, cleanedRow };
}

export function safeIssueId(id) {
    return typeof id === 'string' && /^(ST|AT)-[0-9]{4}-Q[1-4]-[0-9]+$/.test(id);
}

export function hasCsvFormulaInjection(text) {
    if (typeof text !== 'string') return false;
    const trimmed = text.trim();
    const dangerous = ['=', '+', '-', '@', '\t', '\r'];
    return dangerous.some(p => trimmed.startsWith(p));
}

export function sanitizeCsvCell(text) {
    if (typeof text !== 'string') return text;
    const trimmed = text.trim();
    const dangerous = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerous.some(p => trimmed.startsWith(p))) {
        return "'" + trimmed;
    }
    return text;
}

export function checkStorageCapacity() {
    const STORAGE_LIMIT = 5 * 1024 * 1024;
    let used = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            used += (localStorage.getItem(key) || '').length * 2;
        }
    }
    const ratio = used / STORAGE_LIMIT;
    return {
        usedBytes: used,
        limitBytes: STORAGE_LIMIT,
        ratio,
        isWarning: ratio > 0.8,
        isCritical: ratio > 0.95
    };
}

export function parseCSV(text, delimiter) {
    delimiter = delimiter || ',';
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };
    const headers = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, ''));
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] !== undefined ? values[idx] : '';
        });
        result.push(row);
    }
    return result;
}

export function buildIssueFromRow(row, sourceSystem, index) {
    const parseActionItems = (text) => {
        if (!text) return [];
        return text.split(';').filter(s => s.trim()).map(item => {
            const parts = item.split('|').map(s => s.trim());
            return { item: parts[0] || '', owner: parts[1] || '', deadline: parts[2] || '', status: parts[3] || '未开始' };
        });
    };
    const parseRelatedKpis = (text) => {
        if (!text) return [];
        return text.split(',').map(s => s.trim()).filter(Boolean);
    };
    let issueId = row['议题编号'];
    if (!issueId || String(issueId).trim() === '') {
        issueId = sourceSystem + '-AUTO-' + Date.now() + '-' + (index || 0);
    }
    return {
        issueId: issueId,
        sourceSystem: sourceSystem,
        meetingName: row['会议名称'] || '未指定',
        meetingDate: row['会议日期'] || '',
        issueTitle: row['议题标题'] || '未命名议题',
        issueType: row['议题类型'] || '经营',
        department: row['主责部门'] || '未指定',
        proposer: row['提案人'] || '未指定',
        content: row['议题内容'] || '',
        decision: row['决议内容'] || '',
        actionItems: parseActionItems(row['行动项']),
        relatedKpis: parseRelatedKpis(row['关联KPI']),
        status: row['状态'] || '已创建',
        priority: row['优先级'] || 'P2'
    };
}

export function importIssuesFromPaste(text, sourceSystem) {
    const rows = parseCSV(text);
    const results = { success: [], errors: [], warnings: [], total: rows.length };
    const existing = loadIssues(sourceSystem);
    rows.forEach(row => {
        const validated = validateIssueRow(row, sourceSystem);
        if (!validated.isValid) {
            results.errors.push({ row, errors: validated.errors });
            return;
        }
        const issue = buildIssueFromRow(validated.cleanedRow, sourceSystem);
        issue.importQuality = { hasWarnings: validated.warnings.length > 0, warnings: validated.warnings, importedAt: new Date().toISOString() };
        const idx = existing.findIndex(i => i.issueId === issue.issueId);
        if (idx >= 0) { existing[idx] = issue; }
        else { existing.push(issue); }
        results.success.push(issue);
        results.warnings.push(...validated.warnings);
    });
    saveIssues(existing, sourceSystem);
    return results;
}

export function openImportModal() {
    document.getElementById('importPasteArea').value = '';
    document.getElementById('importPreviewArea').style.display = 'none';
    document.getElementById('importErrorArea').style.display = 'none';
    document.getElementById('importDropZone').style.borderColor = 'var(--border-color)';
    document.getElementById('importDropZone').style.background = '';
    document.getElementById('importDropZone').innerHTML =
        '<div style="font-size: 36px; margin-bottom: 8px;">📁</div>' +
        '<div style="font-weight: 500; color: var(--text-secondary); margin-bottom: 4px;">拖拽 Excel / CSV 文件到此处</div>' +
        '<div style="font-size: 13px; color: var(--text-muted);">或点击选择文件 · 支持 .xlsx .xls .csv</div>' +
        '<input type="file" id="importFileInput" style="display: none;" accept=".xlsx,.xls,.csv" data-action="import-file-select">';
    document.querySelector('input[name="importSource"][value="ST"]').checked = true;
    _importRows = null;
    _importFileName = null;
    openModal('importModal');
}

export function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const zone = document.getElementById('importDropZone');
    zone.style.borderColor = 'var(--primary)';
    zone.style.background = 'rgba(79, 70, 229, 0.05)';
}

export function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const zone = document.getElementById('importDropZone');
    zone.style.borderColor = 'var(--border-color)';
    zone.style.background = '';
}

export function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const zone = document.getElementById('importDropZone');
    zone.style.borderColor = 'var(--border-color)';
    zone.style.background = '';
    const files = e.dataTransfer.files;
    if (files.length > 0) processImportFile(files[0]);
}

export function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) processImportFile(files[0]);
}

export function processImportFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        alert('不支持的文件格式，请上传 .xlsx .xls 或 .csv 文件');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let rows = [];
            if (ext === 'csv') {
                const text = e.target.result;
                rows = parseCSV(text);
            } else {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                if (jsonData.length < 2) { alert('文件内容为空或格式不正确'); return; }
                const headers = jsonData[0].map(h => String(h || '').trim());
                rows = jsonData.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : ''; });
                    return obj;
                });
            }
            _importRows = rows;
            _importFileName = file.name;
            document.getElementById('importDropZone').innerHTML =
                '<div style="font-size: 36px; margin-bottom: 8px;">✅</div>' +
                '<div style="font-weight: 500; color: var(--success);">' + escapeHtml(file.name) + '</div>' +
                '<div style="font-size: 13px; color: var(--text-muted);">共 ' + _importRows.length + ' 行数据 · 点击可重新选择</div>' +
                '<input type="file" id="importFileInput" style="display: none;" accept=".xlsx,.xls,.csv" data-action="import-file-select">';
            updateImportPreview();
        } catch (err) {
            alert('解析文件失败: ' + err.message);
        }
    };
    if (ext === 'csv') reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
}

export function isIssueClosed(row) {
    const status = String(row['状态'] || '').trim();
    return status === '已关闭' || status === '关闭';
}

export function importIssuesFromRows(rows, sourceSystem) {
    const filteredRows = rows.filter(row => !isIssueClosed(row));
    const skippedCount = rows.length - filteredRows.length;
    const results = { success: [], errors: [], warnings: [], total: rows.length, skipped: skippedCount };
    const existing = loadIssues(sourceSystem);
    filteredRows.forEach((row, rowIdx) => {
        const validated = validateIssueRow(row, sourceSystem);
        if (!validated.isValid) { results.errors.push({ row, errors: validated.errors }); return; }
        const issue = buildIssueFromRow(validated.cleanedRow, sourceSystem, rowIdx);
        issue.importQuality = { hasWarnings: validated.warnings.length > 0, warnings: validated.warnings, importedAt: new Date().toISOString() };
        const existingIdx = existing.findIndex(i => i.issueId === issue.issueId);
        if (existingIdx >= 0) existing[existingIdx] = issue; else existing.push(issue);
        results.success.push(issue);
        results.warnings.push(...validated.warnings);
    });
    saveIssues(existing, sourceSystem);
    return results;
}

export function updateImportPreview() {
    const text = document.getElementById('importPasteArea').value.trim();
    const previewArea = document.getElementById('importPreviewArea');
    const errorArea = document.getElementById('importErrorArea');

    let rows = [];
    if (_importRows && _importRows.length > 0) {
        rows = _importRows;
    } else if (text) {
        rows = parseCSV(text);
    } else {
        previewArea.style.display = 'none';
        errorArea.style.display = 'none';
        return;
    }

    const sourceSystem = document.querySelector('input[name="importSource"]:checked').value;
    const filteredRows = rows.filter(row => !isIssueClosed(row));
    const skippedCount = rows.length - filteredRows.length;
    const tbody = document.querySelector('#importPreviewTable tbody');
    tbody.innerHTML = '';

    let validCount = 0, errorCount = 0;
    filteredRows.slice(0, 5).forEach(row => {
        const validated = validateIssueRow(row, sourceSystem);
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + escapeHtml(row['议题编号'] || '-') + '</td>' +
            '<td>' + escapeHtml(row['议题标题'] || '-') + '</td>' +
            '<td>' + escapeHtml(row['状态'] || '-') + '</td>' +
            '<td>' + (validated.isValid ? '<span style="color:var(--success)">✅ 有效</span>' : '<span style="color:var(--danger)">❌ ' + escapeHtml(validated.errors[0]) + '</span>') + '</td>';
        tbody.appendChild(tr);
        if (validated.isValid) validCount++; else errorCount++;
    });

    let statsText = '共 ' + rows.length + ' 条';
    if (skippedCount > 0) statsText += ' · 自动过滤已关闭 ' + skippedCount + ' 条';
    statsText += ' · 待导入 ' + filteredRows.length + ' 条 · 有效 ' + validCount + ' · 错误 ' + errorCount;
    if (filteredRows.length > 5) statsText += '（仅预览前5条）';
    document.getElementById('importStats').textContent = statsText;
    previewArea.style.display = 'block';
    errorArea.style.display = 'none';
}

export function confirmImport() {
    const text = document.getElementById('importPasteArea').value.trim();
    const errorArea = document.getElementById('importErrorArea');

    let rows = [];
    if (_importRows && _importRows.length > 0) {
        rows = _importRows;
    } else if (text) {
        rows = parseCSV(text);
    } else {
        errorArea.textContent = '请输入要导入的数据或上传文件';
        errorArea.style.display = 'block';
        return;
    }

    const sourceSystem = document.querySelector('input[name="importSource"]:checked').value;
    const result = importIssuesFromRows(rows, sourceSystem);

    if (result.success.length === 0) {
        errorArea.innerHTML = '导入失败：<br>' + result.errors.map(e => '• ' + escapeHtml(e.errors.join(', '))).join('<br>');
        errorArea.style.display = 'block';
        return;
    }

    let msg = '导入成功！';
    if (result.skipped > 0) msg += '自动过滤已关闭 ' + result.skipped + ' 条，';
    msg += '实际导入 ' + result.success.length + ' 条议题';
    if (result.errors.length > 0) msg += '，' + result.errors.length + ' 条失败';
    if (result.warnings.length > 0) msg += '，' + result.warnings.length + ' 条警告';
    alert(msg);
    closeModal('importModal');
}

