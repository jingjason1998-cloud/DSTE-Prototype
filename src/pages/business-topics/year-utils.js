/**
 * 业务专题年份工具函数
 * 年度筛选需同时考虑 topic.year 以及 startDate/endDate 时间范围，
 * 避免老数据或外部导入数据缺失 year 字段时导致某些年份无法筛选。
 */

export function getTopicYears(t) {
  const years = new Set();
  if (t.year) years.add(String(t.year));

  const sYear = t.startDate ? t.startDate.slice(0, 4) : '';
  const eYear = t.endDate ? t.endDate.slice(0, 4) : '';
  if (sYear) years.add(sYear);
  if (eYear) years.add(eYear);

  // 填充起止日期之间的所有年份，避免跨年专题遗漏
  if (sYear && eYear) {
    const s = parseInt(sYear, 10);
    const e = parseInt(eYear, 10);
    for (let y = Math.min(s, e); y <= Math.max(s, e); y++) {
      years.add(String(y));
    }
  }

  return years;
}

export function getAllYearsFromTopics(topics) {
  const years = new Set();
  (topics || []).forEach(t => {
    getTopicYears(t).forEach(y => years.add(y));
  });
  return Array.from(years).sort().reverse();
}
