/* Tasks overview: four live statistic tiles matching Goals, with no floating Reports button.
   Canonical task storage and completion handlers remain owned by phase2.js. */
(() => {
  'use strict';
  const KEY = 'elara_space_v1';
  const fa = value => Number(value || 0).toLocaleString('fa-IR');
  const isoToday = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const today = () => window.ElaraSchedule?.today?.() || isoToday();
  const svg = {
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 9 1.5 1.5L12 8m2 2h3M8 16h9"/></svg>',
    steps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>'
  };
  let hydratedState = null;
  let observing = false;
  let scheduled = false;

  function readState() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (stored && Array.isArray(stored.tasks)) return stored;
    } catch (_) { /* Try hydrated snapshot. */ }
    return hydratedState && Array.isArray(hydratedState.tasks) ? hydratedState : {tasks:[]};
  }
  function taskIsDone(task, date) {
    if (typeof window.ElaraTasks?.taskDone === 'function') return !!window.ElaraTasks.taskDone(task, date);
    const target = Math.max(1, Math.round(Number(task.dailyTarget) || 1));
    const progress = task.dailyProgress && Object.prototype.hasOwnProperty.call(task.dailyProgress, date)
      ? Number(task.dailyProgress[date]) : null;
    if (target > 1 && progress !== null) return progress >= target;
    return task.recurrenceRule ? (Array.isArray(task.occurrenceDone) && task.occurrenceDone.includes(date)) : !!task.completed;
  }
  function isDue(task, date) {
    if (typeof window.ElaraSchedule?.taskDue === 'function') return !!window.ElaraSchedule.taskDue(task, date);
    return !task.date || task.date === date;
  }
  function dateCaption(raw) {
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'بدون موعد';
    const date = new Date(raw + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return 'بدون موعد';
    try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day:'numeric',month:'long'}).format(date); }
    catch (_) { return raw; }
  }
  function ensure() {
    const panel = document.getElementById('panel-tasks');
    const hero = panel?.querySelector('#astra-task-hero');
    if (!panel || !hero) return null;
    panel.querySelectorAll('.task-banner-report-label').forEach(link => link.remove());
    let overview = panel.querySelector('#elara-task-overview');
    if (!overview) {
      overview = document.createElement('section');
      overview.id = 'elara-task-overview';
      overview.className = 'elara-task-overview';
      overview.setAttribute('aria-label', 'گزارش و خلاصه کارها');
      overview.innerHTML =
        '<div class="task-overview-tile task-overview-total"><span class="task-overview-icon">' + svg.list + '</span><div><span class="task-overview-label">تعداد کارهای فعال</span><strong data-task-stat="active">۰</strong><small data-task-stat="total-caption">از ۰ کار</small></div></div>' +
        '<div class="task-overview-tile task-overview-progress"><span class="task-overview-ring" data-task-progress-ring role="img" aria-label="پیشرفت امروز صفر درصد"><strong data-task-stat="percent">۰٪</strong></span><div><span class="task-overview-label">درصد پیشرفت امروز</span><small>از کارهای برنامه‌ریزی‌شده</small></div></div>' +
        '<div class="task-overview-tile task-overview-completed"><span class="task-overview-icon">' + svg.steps + '</span><div><span class="task-overview-label">کارهای انجام‌شده امروز</span><strong data-task-stat="completed">۰ / ۰</strong><small>انجام‌شده از کارهای امروز</small></div></div>' +
        '<div class="task-overview-tile task-overview-deadline"><span class="task-overview-icon">' + svg.calendar + '</span><div><span class="task-overview-label">نزدیک‌ترین موعد</span><strong data-task-stat="deadline">بدون موعد</strong><small data-task-stat="deadline-caption">برای کارهای باقی‌مانده</small></div></div>';
    }
    if (hero.nextElementSibling !== overview) hero.insertAdjacentElement('afterend', overview);
    if (!observing) {
      observing = true;
      const list = panel.querySelector('#task-list');
      if (list) new MutationObserver(refresh).observe(list, {childList:true});
      new MutationObserver(scheduleRefresh).observe(panel, {childList:true});
    }
    return overview;
  }
  function refresh() {
    const overview = ensure();
    if (!overview) return;
    const state = readState();
    const tasks = (Array.isArray(state.tasks) ? state.tasks : []).filter(task => task && typeof task === 'object');
    const dateInput = document.getElementById('task-occurrence-date');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateInput?.value || '') ? dateInput.value : today();
    const active = tasks.filter(task => task.recurrenceRule || !task.completed).length;
    const due = tasks.filter(task => isDue(task, date) && (task.recurrenceRule || !task.completed || !task.doneAt || task.doneAt >= date));
    const completed = due.filter(task => taskIsDone(task, date)).length;
    const percent = due.length ? Math.round(completed / due.length * 100) : 0;
    const dates = tasks.filter(task => !task.recurrenceRule && !taskIsDone(task, date) && /^\d{4}-\d{2}-\d{2}$/.test(task.date || '') && task.date >= date).map(task => task.date).sort();
    const overdue = tasks.filter(task => !task.recurrenceRule && !task.completed && /^\d{4}-\d{2}-\d{2}$/.test(task.date || '') && task.date < date).length;
    const values = {
      active: fa(active),
      'total-caption': 'از ' + fa(tasks.length) + ' کار',
      percent: fa(percent) + '٪',
      completed: fa(completed) + ' / ' + fa(due.length),
      deadline: dateCaption(dates[0]),
      'deadline-caption': overdue ? fa(overdue) + ' کار عقب‌افتاده' : 'برای کارهای باقی‌مانده'
    };
    for (const [key, value] of Object.entries(values)) {
      const field = overview.querySelector('[data-task-stat="' + key + '"]');
      if (field && field.textContent !== value) field.textContent = value;
    }
    const ring = overview.querySelector('[data-task-progress-ring]');
    if (ring) {
      ring.style.setProperty('--task-overview-percent', percent + '%');
      ring.setAttribute('aria-label', 'پیشرفت کارهای امروز ' + fa(percent) + ' درصد');
    }
  }
  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; refresh(); });
  }
  function start() {
    ensure();
    refresh();
    for (const eventName of ['elara:tasks-ready','elara:open','elara:hydrate','elara:data-changed','elara:linked-state','hashchange']) {
      window.addEventListener(eventName, scheduleRefresh);
    }
    window.addEventListener('elara:state-committed', event => {
      if (event.detail && Array.isArray(event.detail.tasks)) hydratedState = event.detail;
      scheduleRefresh();
    });
    const panel = document.getElementById('panel-tasks');
    panel?.addEventListener('change', event => {
      if (event.target?.id === 'task-occurrence-date') scheduleRefresh();
    });
    panel?.addEventListener('click', event => {
      if (event.target?.closest('#task-date-today')) scheduleRefresh();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
