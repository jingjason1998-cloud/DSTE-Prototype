/**
 * DSTE 通用工具库
 * 提供 toast 通知、安全 HTML 转义和统一 localStorage 封装
 */

export function showToast(message, type = 'info', duration = 3000) {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !document) return;

    const existing = document.getElementById('dste-toast-container');
    const container = existing || document.createElement('div');
    if (!existing) {
        container.id = 'dste-toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
        info: 'var(--primary, #3b82f6)',
        success: 'var(--success, #10b981)',
        warning: 'var(--warning, #f59e0b)',
        error: 'var(--danger, #ef4444)'
    };
    toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:12px 16px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:320px;word-break:break-word;pointer-events:auto;transform:translateX(100%);opacity:0;transition:all 0.3s ease;`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

export function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function isQuotaError(e) {
    return e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
}

function reportStorageError(op, key, e) {
    const message = `Storage.${op}(${key}) failed: ${e.message || e}`;
    console.warn(message);
    if (isQuotaError(e)) {
        showToast('存储空间不足，部分数据可能未保存。建议导出备份后清理数据。', 'error', 5000);
    }
}

export const Storage = {
    get(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            console.warn(`Storage.get(${key}) failed:`, e.message);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            reportStorageError('set', key, e);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`Storage.remove(${key}) failed:`, e.message);
            return false;
        }
    },

    getString(key, defaultValue = '') {
        try {
            return localStorage.getItem(key) || defaultValue;
        } catch (e) {
            console.warn(`Storage.getString(${key}) failed:`, e.message);
            return defaultValue;
        }
    },

    setString(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            reportStorageError('setString', key, e);
            return false;
        }
    },

    getKeys(prefix = '') {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) keys.push(key);
            }
            return keys;
        } catch (e) {
            console.warn('Storage.getKeys failed:', e.message);
            return [];
        }
    },

    /**
     * 检测 localStorage 是否接近配额上限
     * @returns {{ok:boolean, usedBytes?:number, totalBytes?:number, message?:string}}
     */
    checkQuota() {
        try {
            // 先估算当前已用空间
            let usedBytes = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                const value = localStorage.getItem(key) || '';
                usedBytes += (key.length + value.length) * 2; // UTF-16
            }

            // 尝试写入 1MB 测试数据
            const testKey = '_dste_quota_test';
            const testChunk = 'x'.repeat(1024 * 1024);
            try {
                localStorage.setItem(testKey, testChunk);
                localStorage.removeItem(testKey);
                return {
                    ok: true,
                    usedBytes,
                    message: 'Quota check passed',
                };
            } catch (e) {
                localStorage.removeItem(testKey);
                return {
                    ok: false,
                    usedBytes,
                    message: isQuotaError(e) ? 'Storage quota exceeded' : e.message,
                };
            }
        } catch (e) {
            return { ok: false, message: e.message };
        }
    },

    /**
     * 估算指定数据写入后所需的字节数
     * @param {*} data
     * @returns {number}
     */
    estimateSize(data) {
        try {
            const str = JSON.stringify(data);
            return str.length * 2; // UTF-16
        } catch (e) {
            return 0;
        }
    }
};
