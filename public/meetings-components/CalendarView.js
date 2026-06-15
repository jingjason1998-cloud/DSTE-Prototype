
// ---- 会议详情函数 ----
// ---- 日历视图状态与渲染 ----
window._calendarState = { year: new Date().getFullYear(), month: new Date().getMonth(), view: 'month' };

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function renderCalendarMonth(year, month) {
  console.log('[Calendar] renderCalendarMonth called:', year, month);
  const header = document.getElementById('calendar-header');
  const body = document.getElementById('calendar-body');
  const footer = document.getElementById('calendar-footer');
  console.log('[Calendar] DOM elements:', { header: !!header, body: !!body, footer: !!footer });
  if (!header || !body || !footer) {
    const panel = document.getElementById('meetings-calendar-panel');
    const body = document.getElementById('calendar-body');
    if (body) body.innerHTML = '<div style="padding:20px;color:var(--danger)">日历渲染错误：DOM元素未找到</div>';
    return;
  }

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const monthMeetings = (window._meetingsData || []).filter(m => m.date && m.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));

  // 头部：导航 + 视图切换
  header.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button onclick="changeCalendarMonth(-1)" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">← 上一月</button>
        <span style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${year}年${monthNames[month]}</span>
        <button onclick="changeCalendarMonth(1)" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">下一月 →</button>
        <button onclick="goCalendarToday()" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer;">📅 今天</button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 12px; color: var(--text-tertiary);">本月 ${monthMeetings.length} 场会议</span>
        <button onclick="switchCalendarView('year')" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">📆 年视图</button>
      </div>
    </div>
  `;

  // 主体：日历网格
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  let gridHtml = `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--border-light); border-radius: 8px; overflow: hidden;">`;
  ['日','一','二','三','四','五','六'].forEach(d => {
    gridHtml += `<div style="text-align: center; padding: 6px 0; font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--bg-card);">${d}</div>`;
  });

  for (let i = 0; i < firstDay; i++) {
    gridHtml += `<div style="min-height: 100px; padding: 6px; background: var(--bg-page);"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayMeetings = (window._meetingsData || []).filter(m => m.date === dateStr);
    const isToday = isCurrentMonth && d === today.getDate();

    gridHtml += `<div style="min-height: 100px; padding: 6px; background: var(--bg-card); position: relative;">
      <div style="font-size: 12px; font-weight: ${isToday ? '700' : '400'}; color: ${isToday ? '#fff' : 'var(--text-primary)'}; background: ${isToday ? 'var(--primary)' : 'transparent'}; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-bottom: 4px;">${d}</div>
      <div style="display: flex; flex-direction: column; gap: 3px;">
        ${dayMeetings.slice(0, 2).map(m => {
          const sc = window.SCENARIO_CONFIG[m.scenario] || { color: 'var(--text-secondary)', icon: '📋' };
          const st = window.STATUS_CONFIG[m.status] || window.STATUS_CONFIG.planned;
          const title = escapeHtml(m.title).slice(0, 12) + (m.title.length > 12 ? '...' : '');
          const location = m.location ? escapeHtml(m.location).slice(0, 6) + (m.location.length > 6 ? '...' : '') : '';
          const actionCount = (m.actions || []).length;
          const decisionCount = (m.decisions || []).length;
          return `<div data-calendar-meeting onclick="openMeetingDetail('${m.id}')" onmouseenter="showMeetingTooltip(this, true)" onmouseleave="showMeetingTooltip(this, false)" style="position: relative; padding: 2px 5px; border-radius: 3px; font-size: 10px; cursor: pointer; background: ${sc.color}18; color: ${sc.color}; border-left: 3px solid ${sc.color};">
            <span style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <span data-status-dot style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${st.color}; margin-right: 3px; vertical-align: middle;"></span>
              <span style="vertical-align: middle;">${sc.icon} ${title}${location ? ' · ' + location : ''}</span>
            </span>
            <div class="meeting-tooltip" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; z-index: 100; width: max-content; max-width: 280px; padding-top: 4px;">
              <div style="padding: 10px 14px; background: var(--bg-page); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.18); font-size: 12px; white-space: normal; line-height: 1.5; position: relative;">
                <div style="position: absolute; top: -5px; left: 14px; width: 8px; height: 8px; background: var(--bg-page); border-left: 1px solid var(--border-color); border-top: 1px solid var(--border-color); transform: rotate(45deg);"></div>
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${escapeHtml(m.title)}</div>
                <div style="color: var(--text-tertiary);">
                  <div>📅 ${m.date} · ${sc.icon} ${escapeHtml(sc.label)}</div>
                  <div>📍 ${escapeHtml(m.location) || '待定'} · 👤 ${escapeHtml(m.host) || '待定'}</div>
                  <div>📊 ${escapeHtml(st.label)}${decisionCount ? ' · ✅ ' + decisionCount + ' 决议' : ''}${actionCount ? ' · 🏃 ' + actionCount + ' 行动' : ''}</div>
                </div>
                <div style="margin-top: 8px; border-top: 1px solid var(--border-light); padding-top: 8px;">
                  <button type="button" onclick="event.stopPropagation(); cloneMeeting('${m.id}');" style="padding: 4px 10px; font-size: 11px; border: 1px solid var(--success); border-radius: 4px; background: rgba(34,197,94,0.08); color: var(--success); cursor: pointer; font-weight: 500; pointer-events: auto;">📋 复制此会议</button>
                </div>
              </div>
            </div>
          </div>`;
        }).join('')}
        ${dayMeetings.length > 2 ? `<div style="font-size: 10px; color: var(--text-tertiary); padding-left: 4px;">+${dayMeetings.length - 2}</div>` : ''}
      </div>
    </div>`;
  }
  gridHtml += `</div>`;
  console.log('[Calendar] gridHtml length:', gridHtml.length);
  body.innerHTML = gridHtml;
  console.log('[Calendar] body.innerHTML set, body children:', body.children.length);
  // 日历渲染完成

  // 底部：当月会议清单
  const sorted = monthMeetings.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  footer.innerHTML = `
    <div class="card" style="margin-bottom: 0;">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="card-title">📋 ${year}年${monthNames[month]} 会议清单</div>
        <span style="font-size: 12px; color: var(--text-tertiary);">共 ${sorted.length} 场</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${sorted.length === 0 ? '<div style="text-align: center; color: var(--text-tertiary); padding: 20px;">本月暂无会议</div>' : sorted.map(m => {
          const sc = window.SCENARIO_CONFIG[m.scenario] || { label: m.scenario, color: 'var(--text-tertiary)', icon: '📋' };
          const st = window.STATUS_CONFIG[m.status] || window.STATUS_CONFIG.planned;
          const actionCount = (m.actions || []).length;
          const decisionCount = (m.decisions || []).length;
          return `<div onclick="openMeetingDetail('${m.id}')" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.15s; border-left: 3px solid ${sc.color};">
            <span style="font-size: 12px; color: var(--text-tertiary); min-width: 60px;">${m.date.slice(5)}</span>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(m.title)}</div>
              <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">📍 ${escapeHtml(m.location) || '待定'} · 👤 ${escapeHtml(m.host) || '待定'}${actionCount ? ' · ✅ ' + decisionCount + ' 决议' : ''}${actionCount ? ' · 🏃 ' + actionCount + ' 行动' : ''}</div>
            </div>
            <span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: ${sc.color}15; color: ${sc.color}; white-space: nowrap;">${sc.icon} ${escapeHtml(sc.label)}</span>
            <span class="status-badge ${st.badgeClass}" style="font-size: 11px; white-space: nowrap;">${escapeHtml(st.label)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}
window.renderCalendarMonth = renderCalendarMonth;

function renderCalendarYear(year) {
  const header = document.getElementById('calendar-header');
  const body = document.getElementById('calendar-body');
  const footer = document.getElementById('calendar-footer');
  if (!header || !body || !footer) return;

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const today = new Date();

  header.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button onclick="changeCalendarYear(-1)" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">← 上一年</button>
        <span style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${year}年</span>
        <button onclick="changeCalendarYear(1)" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">下一年 →</button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button onclick="goCalendarToday()" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer;">📅 今天</button>
        <button onclick="switchCalendarView('month')" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">📅 月视图</button>
      </div>
    </div>
  `;

  let gridHtml = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">`;

  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const monthMeetings = (window._meetingsData || []).filter(mt => mt.date && mt.date.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`));
    const isCurrentMonth = year === today.getFullYear() && m === today.getMonth();

    let miniGrid = '';
    for (let i = 0; i < firstDay; i++) {
      miniGrid += `<div></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayMeetings = (window._meetingsData || []).filter(mt => mt.date === dateStr);
      const isToday = isCurrentMonth && d === today.getDate();
      const hasMeeting = dayMeetings.length > 0;
      const sc = hasMeeting ? window.SCENARIO_CONFIG[dayMeetings[0].scenario] : null;
      miniGrid += `<div style="position: relative; display: flex; align-items: center; justify-content: center; height: 22px; font-size: 10px; color: ${isToday ? '#fff' : hasMeeting ? sc.color : 'var(--text-tertiary)'}; background: ${isToday ? 'var(--primary)' : 'transparent'}; border-radius: 3px; cursor: ${hasMeeting ? 'pointer' : 'default'};" ${hasMeeting ? `onclick="switchCalendarView('month'); window._calendarState.year=${year}; window._calendarState.month=${m}; renderCalendarMonth(${year}, ${m});" title="${dayMeetings.map(dm => escapeHtml(dm.title)).join(', ')}"` : ''}>
        ${d}
        ${hasMeeting ? `<div style="position: absolute; bottom: 2px; left: 20%; right: 20%; height: 2px; background: ${sc.color}; border-radius: 1px;"></div>` : ''}
      </div>`;
    }

    gridHtml += `
      <div onclick="switchCalendarView('month'); window._calendarState.year=${year}; window._calendarState.month=${m}; renderCalendarMonth(${year}, ${m});" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-light)'" style="padding: 10px; background: var(--bg-card); border-radius: 8px; border: 1px solid ${isCurrentMonth ? 'var(--primary)' : 'var(--border-light)'}; cursor: pointer; transition: border-color 0.15s;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 13px; font-weight: 600; color: ${isCurrentMonth ? 'var(--primary)' : 'var(--text-primary)'};">${monthNames[m]}</span>
          <span style="font-size: 11px; color: var(--text-tertiary);">${monthMeetings.length} 场</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; text-align: center;">
          ${miniGrid}
        </div>
      </div>
    `;
  }

  gridHtml += `</div>`;
  body.innerHTML = gridHtml;
  footer.innerHTML = '';
}

window.switchCalendarView = function(mode) {
  window._calendarState.view = mode;
  const state = window._calendarState;
  if (mode === 'month') {
    renderCalendarMonth(state.year, state.month);
  } else {
    renderCalendarYear(state.year);
  }
};

window.changeCalendarMonth = function(delta) {
  const state = window._calendarState;
  state.month += delta;
  if (state.month > 11) { state.month = 0; state.year++; }
  if (state.month < 0) { state.month = 11; state.year--; }
  renderCalendarMonth(state.year, state.month);
};

window.changeCalendarYear = function(delta) {
  window._calendarState.year += delta;
  renderCalendarYear(window._calendarState.year);
};

window.goCalendarToday = function() {
  const now = new Date();
  window._calendarState.year = now.getFullYear();
  window._calendarState.month = now.getMonth();
  if (window._calendarState.view === 'month') {
    renderCalendarMonth(now.getFullYear(), now.getMonth());
  } else {
    renderCalendarYear(now.getFullYear());
  }
};

window.showMeetingTooltip = function(el, show) {
  const tooltip = el.querySelector('.meeting-tooltip');
  if (tooltip) tooltip.style.display = show ? 'block' : 'none';
};

window.toggleMeetingsView = function() {
  console.log('[Calendar] toggleMeetingsView called, current mode:', window._meetingsViewMode);
  const btn = document.getElementById('btn-toggle-view');
  const listPanel = document.getElementById('meetings-list-panel');
  const calPanel = document.getElementById('meetings-calendar-panel');
  console.log('[Calendar] panels:', { list: !!listPanel, cal: !!calPanel });
  if (window._meetingsViewMode === 'calendar') {
    window._meetingsViewMode = 'list';
    if (btn) btn.textContent = '📅 日历视图';
    if (listPanel) listPanel.style.display = 'block';
    if (calPanel) calPanel.style.display = 'none';
  } else {
    window._meetingsViewMode = 'calendar';
    if (btn) btn.textContent = '📋 列表视图';
    if (listPanel) listPanel.style.display = 'none';
    if (calPanel) calPanel.style.display = 'block';
    // 渲染日历
    const state = window._calendarState;
    console.log('[Calendar] rendering calendar, state:', state);
    if (state.view === 'month') {
      renderCalendarMonth(state.year, state.month);
    } else {
      renderCalendarYear(state.year);
    }
  }
};
