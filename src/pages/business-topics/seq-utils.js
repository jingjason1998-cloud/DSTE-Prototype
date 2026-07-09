/**
 * 业务专题序号/排序工具函数
 * 纯函数，不依赖 DOM 或全局状态，便于单元测试。
 */

/**
 * 获取下一个可用的专题序号
 * @param {object[]} topics
 * @returns {number}
 */
export function getNextTopicSeq(topics) {
  if (!Array.isArray(topics) || topics.length === 0) return 1;
  const max = Math.max(...topics.map(t => (typeof t?.seq === 'number' ? t.seq : 0)));
  return max + 1;
}

/**
 * 按 (seq, id) 排序
 * @param {object[]} topics
 * @returns {object[]} 新数组，按 seq 升序，seq 相同时按 id 升序
 */
export function sortTopicsBySeq(topics) {
  if (!Array.isArray(topics)) return topics;
  return [...topics].sort((a, b) => {
    const seqA = typeof a?.seq === 'number' ? a.seq : 0;
    const seqB = typeof b?.seq === 'number' ? b.seq : 0;
    if (seqA !== seqB) return seqA - seqB;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

/**
 * 按当前数组顺序重新编号，确保 seq 从 1 开始连续无断点
 * @param {object[]} topics
 * @returns {object[]} 原数组（对象会被修改）
 */
export function renumberTopicsSeq(topics) {
  if (!Array.isArray(topics)) return topics;
  topics.forEach((t, idx) => {
    t.seq = idx + 1;
  });
  return topics;
}

/**
 * 判断是否处于自然序号顺序（序号升序），此时可启用排序按钮
 * @param {{field:string, direction:string}} sortConfig
 * @returns {boolean}
 */
export function isNaturalSeqOrder(sortConfig) {
  return !!sortConfig && sortConfig.field === 'seq' && sortConfig.direction === 'asc';
}
