/**
 * 员工/组织架构导入器
 * 负责解析 Excel/CSV 人员信息表并写入员工目录。
 */

import {
  buildEmployeeFromRow,
  buildOrgHierarchy,
  saveEmployeeDirectory,
  getEmployees,
  IMPORT_META_STORAGE_KEY,
  rebuildPersonRefs,
} from './employee-directory.js';
import { Storage, showToast } from './utils.js';
import * as XLSX from 'xlsx';

const SUPPORTED_EXTS = ['xlsx', 'xls', 'csv'];
const REQUIRED_FIELDS = ['工号', '姓名', '组织全称', 'ldap'];

/**
 * 处理导入文件，返回解析后的原始行数据
 * @param {File} file
 * @returns {Promise<{success:boolean, rows?:Array, fileName?:string, error?:string}>}
 */
export function readImportFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ success: false, error: '未选择文件' });
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!SUPPORTED_EXTS.includes(ext)) {
      resolve({ success: false, error: '仅支持 .xlsx .xls .csv 格式' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseFileData(e.target.result, ext);
        resolve({ success: true, rows, fileName: file.name });
      } catch (err) {
        resolve({ success: false, error: `解析失败: ${err.message}` });
      }
    };
    reader.onerror = () => resolve({ success: false, error: '文件读取失败' });

    if (ext === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

function parseFileData(data, ext) {
  if (ext === 'csv') {
    return parseCSV(data);
  }
  if (typeof XLSX === 'undefined') {
    throw new Error('XLSX 库未加载');
  }
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
}

function parseCSV(text) {
  const lines = String(text || '').split(/\r?\n/);
  return lines.map(line => parseCsvLine(line));
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * 将行数组转换为对象数组（第一行为表头）
 * @param {Array[]} rows
 * @returns {Array}
 */
export function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => String(h || '').trim());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx] : '';
    });
    return obj;
  });
}

/**
 * 校验单行员工数据
 * @param {object} row
 * @param {number} index
 * @returns {{isValid:boolean, errors:string[], warnings:string[], row:object}}
 */
export function validateEmployeeRow(row, index) {
  const errors = [];
  const warnings = [];

  REQUIRED_FIELDS.forEach(field => {
    const val = row[field];
    if (val === undefined || val === null || String(val).trim() === '') {
      errors.push(`缺少必填字段: ${field}`);
    }
  });

  const id = String(row['工号'] || '').trim();
  if (id && !/^\d+$/.test(id)) {
    warnings.push(`工号 ${id} 包含非数字字符`);
  }

  const ldap = String(row['ldap'] || '').trim();
  if (ldap && !/^\d+(,\d+)*$/.test(ldap)) {
    errors.push(`ldap 格式不正确: ${ldap}`);
  }

  const orgPath = String(row['组织全称'] || '').trim();
  const ldapParts = ldap.split(',').filter(Boolean);
  const pathParts = orgPath.split('-').map(s => s.trim()).filter(Boolean);
  if (orgPath && ldapParts.length > 0 && pathParts.length !== ldapParts.length) {
    warnings.push(`组织全称分段数 (${pathParts.length}) 与 ldap 链长度 (${ldapParts.length}) 不一致`);
  }

  if (errors.length === 0 && !id) {
    errors.push('工号为空');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.map(e => `第 ${index + 1} 行: ${e}`),
    warnings: warnings.map(w => `第 ${index + 1} 行: ${w}`),
    row,
  };
}

/**
 * 校验去重后的完整员工列表
 * @param {Array} employees
 * @returns {{isValid:boolean, errors:string[], warnings:string[]}}
 */
export function validateEmployeeList(employees) {
  const errors = [];
  const warnings = [];
  const idSet = new Set();

  employees.forEach((emp, idx) => {
    if (idSet.has(emp.id)) {
      errors.push(`工号 ${emp.id} 重复（第 ${idx + 1} 条）`);
    }
    idSet.add(emp.id);
  });

  if (employees.length === 0) {
    errors.push('没有有效的员工数据');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * 构建导入结果摘要
 * @param {Array} results
 * @returns {{total:number, valid:number, invalid:number, employees:Array, errors:string[], warnings:string[]}}
 */
export function buildImportSummary(results) {
  let validCount = 0;
  const employees = [];
  const errors = [];
  const warnings = [];

  results.forEach(r => {
    if (r.isValid) {
      validCount++;
      try {
        employees.push(buildEmployeeFromRow(r.row));
      } catch (e) {
        errors.push(`构建员工对象失败: ${e.message}`);
      }
    }
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  });

  const dupValidation = validateEmployeeList(employees);
  errors.push(...dupValidation.errors);
  warnings.push(...dupValidation.warnings);

  return {
    total: results.length,
    valid: validCount,
    invalid: results.length - validCount,
    employees,
    errors,
    warnings,
  };
}

/**
 * 执行导入
 * @param {Array} employees
 * @param {object} meta
 * @returns {{success:boolean, count?:number, error?:string}}
 */
export function executeImport(employees, meta = {}) {
  const listValidation = validateEmployeeList(employees);
  if (!listValidation.isValid) {
    return { success: false, error: listValidation.errors.join('; ') };
  }

  const { orgUnits, roots } = buildOrgHierarchy(employees);
  if (roots.length === 0) {
    return { success: false, error: '无法构建组织架构，请检查 ldap 字段' };
  }

  return saveEmployeeDirectory(employees, meta);
}

/**
 * 从 File 对象完成完整导入流程（解析 → 校验 → 写入）
 * @param {File} file
 * @returns {Promise<{success:boolean, summary?:object, error?:string}>}
 */
export async function importEmployeesFromFile(file) {
  const readResult = await readImportFile(file);
  if (!readResult.success) {
    return { success: false, error: readResult.error };
  }

  const objects = rowsToObjects(readResult.rows);
  if (objects.length === 0) {
    return { success: false, error: '文件中没有数据' };
  }

  const results = objects.map((row, idx) => validateEmployeeRow(row, idx));
  const summary = buildImportSummary(results);

  if (summary.employees.length === 0) {
    return { success: false, summary, error: '没有有效的员工记录' };
  }

  const writeResult = executeImport(summary.employees, {
    fileName: readResult.fileName,
    sourceRows: readResult.rows.length - 1,
  });

  if (!writeResult.success) {
    return { success: false, summary, error: writeResult.error };
  }

  const rebuild = await rebuildPersonRefs();

  showToast(`成功导入 ${summary.employees.length} 名员工`, 'success');
  return { success: true, summary, rebuild };
}

/**
 * 获取上一次导入的统计信息（用于展示）
 */
export function getLastImportStats() {
  const meta = Storage.get(IMPORT_META_STORAGE_KEY, null);
  if (!meta) return null;
  const employees = getEmployees();
  const { orgUnits, roots } = buildOrgHierarchy(employees);
  return {
    ...meta,
    employeeCount: employees.length,
    orgUnitCount: Object.keys(orgUnits).length,
    rootCount: roots.length,
  };
}
