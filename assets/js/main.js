/**
 * DSTE 战略管理平台 - 主脚本
 * 功能：主题切换、侧边栏折叠、导航激活、AI助手
 */

(function() {
  'use strict';

  // ===== 主题管理 =====
  const ThemeManager = {
    key: 'dste-theme',
    
    init() {
      const saved = localStorage.getItem(this.key);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = saved || (prefersDark ? 'dark' : 'light');
      this.set(theme);
    },
    
    set(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(this.key, theme);
      this.updateIcon(theme);
    },
    
    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      this.set(next);
    },
    
    updateIcon(theme) {
      const btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? '切换亮色模式' : '切换暗色模式';
      }
    }
  };

  // ===== 侧边栏管理 =====
  const SidebarManager = {
    key: 'dste-sidebar-collapsed',
    
    init() {
      const collapsed = localStorage.getItem(this.key) === 'true';
      if (collapsed) {
        document.querySelector('.sidebar')?.classList.add('collapsed');
      }
    },
    
    toggle() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const collapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem(this.key, collapsed);
      }
    }
  };

  // ===== 导航管理 =====
  const NavigationManager = {
    init() {
      // 高亮当前页面导航
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href && href.includes(currentPage)) {
          item.classList.add('active');
        }
      });
      
      // 绑定导航点击（SPA模式）
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const href = item.getAttribute('href');
          if (href && href.startsWith('#')) {
            e.preventDefault();
            const page = href.slice(1);
            this.navigate(page);
          }
        });
      });
    },
    
    navigate(page) {
      // 更新导航高亮
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${page}`) {
          item.classList.add('active');
        }
      });
      
      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('dste:navigate', { 
        detail: { page } 
      }));
    }
  };

  // ===== AI 助手 =====
  const AIAssistant = {
    init() {
      const btn = document.getElementById('ai-assistant-btn');
      const panel = document.getElementById('ai-panel');
      const close = document.getElementById('ai-panel-close');
      
      if (btn && panel) {
        btn.addEventListener('click', () => {
          panel.classList.toggle('open');
        });
      }
      
      if (close && panel) {
        close.addEventListener('click', () => {
          panel.classList.remove('open');
        });
      }
      
      // 快捷按钮
      document.querySelectorAll('.ai-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const question = btn.textContent;
          this.sendMessage(question);
        });
      });
      
      // 发送消息
      const input = document.getElementById('ai-input');
      const sendBtn = document.getElementById('ai-send');
      
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.sendMessage(input.value);
            input.value = '';
          }
        });
      }
      
      if (sendBtn && input) {
        sendBtn.addEventListener('click', () => {
          this.sendMessage(input.value);
          input.value = '';
        });
      }
    },
    
    sendMessage(text) {
      if (!text.trim()) return;
      
      const content = document.getElementById('ai-panel-content');
      if (!content) return;
      
      // 添加用户消息
      const userMsg = document.createElement('div');
      userMsg.className = 'ai-message user';
      userMsg.innerHTML = '\u003cstrong\u003e您:\u003c/strong\u003e ';
      const userText = document.createElement('span');
      userText.textContent = text;
      userMsg.appendChild(userText);
      content.appendChild(userMsg);
      
      // 模拟AI回复
      const aiMsg = document.createElement('div');
      aiMsg.className = 'ai-message ai';
      aiMsg.innerHTML = '\u003cstrong\u003e🤖 AI:\u003c/strong\u003e 正在分析...';
      content.appendChild(aiMsg);
      
      // 滚动到底部
      content.scrollTop = content.scrollHeight;
      
      // 模拟延迟回复
      setTimeout(() => {
        aiMsg.innerHTML = '\u003cstrong\u003e🤖 AI:\u003c/strong\u003e 我理解了您关于"';
        const aiText = document.createElement('span');
        aiText.textContent = text;
        aiMsg.appendChild(aiText);
        aiMsg.appendChild(document.createTextNode('"的问题。根据当前战略数据，我可以帮您分析KPI达成情况、生成报告或进行What-if模拟。请告诉我您需要哪方面的帮助。'));
        content.scrollTop = content.scrollHeight;
      }, 1000);
    },
    
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // ===== 全局搜索 =====
  const GlobalSearch = {
    init() {
      const input = document.getElementById('global-search');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const query = input.value.trim();
            if (query) {
              this.search(query);
            }
          }
        });
      }
      
      // Ctrl+K 快捷键
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          input?.focus();
        }
      });
    },
    
    search(query) {
      console.log('搜索:', query);
      // TODO: 实现搜索逻辑
      alert(`搜索: ${query}\n\n（演示版本，搜索功能待实现）`);
    }
  };

  // ===== 初始化 =====
  function init() {
    ThemeManager.init();
    SidebarManager.init();
    NavigationManager.init();
    AIAssistant.init();
    GlobalSearch.init();
    
    // 绑定主题切换按钮
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      ThemeManager.toggle();
    });
    
    // 绑定侧边栏切换按钮
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      SidebarManager.toggle();
    });
    
    console.log('✅ DSTE 战略管理平台已加载');
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // 暴露全局API
  window.DSTE = {
    ThemeManager,
    SidebarManager,
    NavigationManager,
    AIAssistant,
    GlobalSearch
  };
})();
