/**
 * 营销线预算执行监控 — Excel 解析器
 * 依赖全局 XLSX（SheetJS）
 */

export const RATIO_ROWS = { 145: true, 146: true };

function normalizeHeader(h) {
  return String(h || '').replace(/\s+/g, '').replace(/[（(].*?[)）]/g, '');
}

function findCol(headers, candidates) {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    for (let j = 0; j < candidates.length; j++) {
      if (h.indexOf(candidates[j]) >= 0) return i;
    }
  }
  return -1;
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/,/g, '').replace(/\s+/g, '');
  if (s === '' || s === '-' || s === '—') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(convertSheetToData(json));
      } catch (err) {
        reject(err.message || '解析失败');
      }
    };
    reader.onerror = () => reject('文件读取失败');
    reader.readAsArrayBuffer(file);
  });
}

function convertSheetToData(rowsRaw) {
  if (!rowsRaw || rowsRaw.length < 2) throw new Error('表格至少需要表头和一行数据');
  const headers = rowsRaw[0];

  const colRow = findCol(headers, ['行号', '行', 'row', '编号']);
  const colName = findCol(headers, ['科目名称', '科目', '项目', 'name']);
  const colLevel = findCol(headers, ['层级', 'level', '等级']);

  if (colRow < 0 || colName < 0 || colLevel < 0) {
    throw new Error('缺少必要列：行号、科目名称、层级（当前表头：' + headers.join(' / ') + '）');
  }

  const colCur = findCol(headers, ['当月实际', '当月', 'cur', '本月实际']);
  const colYtd = findCol(headers, ['累计实际', '累计', 'ytd', '本年累计']);
  const colBudget = findCol(headers, ['年度预算', '预算', 'budget', '全年预算']);
  const colLyYtd = findCol(headers, ['上年同期累计', '同期', 'lyYtd', '去年累计']);
  const colLyYear = findCol(headers, ['上年全年', '去年全年', 'lyYear']);
  const colFcst = findCol(headers, ['全年预测', '预测', 'fcst']);

  const parsedRows = [];
  for (let i = 1; i < rowsRaw.length; i++) {
    const r = rowsRaw[i];
    if (!r || !r.length) continue;
    const rowId = toNum(r[colRow]);
    const name = String(r[colName] || '').trim();
    const level = toNum(r[colLevel]);
    if (!rowId || !name || !level) continue;

    const cur = colCur >= 0 ? toNum(r[colCur]) : null;
    const ytd = colYtd >= 0 ? toNum(r[colYtd]) : null;
    const budget = colBudget >= 0 ? toNum(r[colBudget]) : null;
    const lyYtd = colLyYtd >= 0 ? toNum(r[colLyYtd]) : null;
    const lyYear = colLyYear >= 0 ? toNum(r[colLyYear]) : null;
    const fcst = colFcst >= 0 ? toNum(r[colFcst]) : null;

    const rate = (budget !== null && budget !== 0 && ytd !== null) ? ytd / budget : null;
    const yoy = (ytd !== null && lyYtd !== null) ? ytd - lyYtd : null;
    const yoyPct = (yoy !== null && lyYtd !== 0 && lyYtd !== null) ? yoy / Math.abs(lyYtd) : null;

    parsedRows.push({
      row: rowId,
      name,
      level,
      cur,
      ytd,
      budget,
      rate,
      lyYtd,
      lyYear,
      yoy,
      yoyPct,
      fcst,
      isRatio: !!RATIO_ROWS[rowId]
    });
  }

  if (!parsedRows.length) throw new Error('未解析到有效数据行');

  return {
    title: '国内营销线预算执行监控',
    unit: '万元',
    asOf: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
    columns: [
      '当月实际', '累计实际', '年度预算', '预算完成率',
      '上年同期累计', '上年全年', '同期变动', '变动比例', '全年预测'
    ],
    rows: parsedRows,
    note: '数据来源于上传的 Excel，请核对科目行号与层级。'
  };
}

export function buildTemplate() {
  return [
    ['行号', '科目名称', '层级', '当月实际', '累计实际', '年度预算', '上年同期累计', '上年全年', '全年预测'],
    [5, '一、销售额-D', 1, 19622.59, 64986.35, 180623.0, 64644.49, 144078.94, 171586.08],
    [6, '外包签单', 1, 1623.51, 10781.42, 25135.0, 8443.53, 20351.05, 0],
    [7, '实施外包', 2, 1343.84, 8415.37, 0, 6946.20, 16384.48, 0],
    [12, '净销售额', 1, 18100.86, 54087.98, 152760.59, 55431.99, 121921.59, 146807.56],
    [13, '二、回款', 1, 13309.70, 49512.53, 160890.71, 49020.62, 130547.70, 146876.38],
    [25, '净回款', 1, 12000.0, 42000.0, 130000.0, 38000.0, 110000.0, 125000.0],
    [27, '税后净回款', 1, 11000.0, 38000.0, 120000.0, 35000.0, 100000.0, 115000.0],
    [28, '直接费用', 1, 11200.0, 35000.0, 80000.0, 32000.0, 85000.0, 72000.0],
    [120, '间接费用', 1, 5400.0, 18000.0, 40000.0, 17000.0, 42000.0, 38000.0],
    [144, '贡献利润', 1, 3000.0, 11000.0, 30000.0, 9500.0, 28000.0, 27000.0],
    [145, '贡献利润率', 1, 0.17, 0.17, 0.20, 0.15, 0.16, 0.18],
    [146, 'E/R', 1, 0.55, 0.52, 0.50, 0.54, 0.53, 0.51]
  ];
}

export function downloadTemplate() {
  const template = buildTemplate();
  const ws = XLSX.utils.aoa_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '预算执行数据');
  XLSX.writeFile(wb, '营销线预算执行模板.xlsx');
}
