/* Elara Goals Dashboard — presentation-only enhancement of the canonical goals UI.
 * Never replaces goal storage, click actions, drag handling or scheduled-step logic. */
(() => {
  'use strict';
  const panel = document.getElementById('panel-goals');
  const list = document.getElementById('goal-list');
  const form = document.getElementById('goal-form');
  if (!panel || !list || !form) return;

  const format = new Intl.NumberFormat('fa-IR');
  const today = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  };
  const dateLabel = iso => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return 'بدون موعد';
    const date = new Date(iso + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return 'بدون موعد';
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day:'numeric', month:'long'}).format(date);
  };
  const icons = {
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m13 11 8-8m-5 0h5v5"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h3m-3 3h3"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 17 6-6 4 4 8-9M16 6h5v5"/></svg>',
    steps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18h5v-5h5V8h6"/><path d="m16 4 4 4-4 4"/></svg>'
  };
  const dashboard = document.createElement('div');
  dashboard.className = 'goal-dashboard';
  dashboard.innerHTML =
    '<section class="goal-overview-grid" aria-label="خلاصه پیشرفت اهداف">' +
      '<div class="goal-overview-tile goal-overview-total"><span class="goal-overview-icon">' + icons.target + '</span><div><span class="goal-overview-label">تعداد هدف‌های فعال</span><strong data-goal-stat="active">۰</strong><small data-goal-stat="total-caption">از ۰ هدف</small></div></div>' +
      '<div class="goal-overview-tile goal-overview-progress"><span class="goal-overview-ring" data-goal-stat-ring><strong data-goal-stat="percent">۰٪</strong></span><div><span class="goal-overview-label">درصد پیشرفت کل</span><small>از همه ریزقدم‌ها</small></div></div>' +
      '<div class="goal-overview-tile goal-overview-steps"><span class="goal-overview-icon">' + icons.steps + '</span><div><span class="goal-overview-label">ریزقدم‌های انجام‌شده</span><strong data-goal-stat="steps">۰ / ۰</strong><small>پیشرفت ریزقدم‌ها</small></div></div>' +
      '<div class="goal-overview-tile goal-overview-deadline"><span class="goal-overview-icon">' + icons.calendar + '</span><div><span class="goal-overview-label">نزدیک‌ترین مهلت</span><strong data-goal-stat="deadline">بدون موعد</strong><small data-goal-stat="deadline-caption">برای اهداف باقی‌مانده</small></div></div>' +
    '</section>' +
    '<div class="goal-dashboard-toolbar">' +
      '<label class="goal-dashboard-search"><span class="sr-only">جست‌وجوی هدف‌ها</span><input type="search" data-goal-search placeholder="جست‌وجوی هدف‌ها…" autocomplete="off"><span class="goal-search-glyph" aria-hidden="true">⌕</span></label>' +
      '<label class="goal-filter"><span class="sr-only">فیلتر وضعیت هدف‌ها</span><select data-goal-filter="status"><option value="all">همه وضعیت‌ها</option><option value="active">در حال پیشرفت</option><option value="done">تکمیل‌شده</option><option value="new">شروع‌نشده</option><option value="overdue">عقب‌افتاده</option></select></label>' +
      '<label class="goal-filter"><span class="sr-only">فیلتر اولویت هدف‌ها</span><select data-goal-filter="priority"><option value="all">همه اولویت‌ها</option><option value="1">فوری · P1</option><option value="2">بالا · P2</option><option value="3">متوسط · P3</option><option value="4">عادی · P4</option></select></label>' +
      '<label class="goal-filter"><span class="sr-only">فیلتر بازه هدف‌ها</span><select data-goal-filter="horizon"><option value="all">همه دسته‌بندی‌ها</option><option value="short">کوتاه‌مدت</option><option value="medium">میان‌مدت</option><option value="long">بلندمدت</option></select></label>' +
      '<button class="goal-add-trigger" data-goal-create type="button"><span aria-hidden="true">＋</span> افزودن هدف</button>' +
    '</div>';
  const heading = panel.querySelector(':scope > .section-heading');
  (heading || form).insertAdjacentElement('afterend', dashboard);
  dashboard.insertAdjacentElement('afterend', form);
  panel.classList.add('goal-dashboard-ready');
  const emptyFilter = document.createElement('p');
  emptyFilter.className = 'goal-filter-empty hidden';
  emptyFilter.textContent = 'هدفی با این جست‌وجو یا فیلتر پیدا نشد.';
  list.insertAdjacentElement('afterend', emptyFilter);
  const search = dashboard.querySelector('[data-goal-search]');
  const filters = Object.fromEntries(['status','priority','horizon'].map(k => [k, dashboard.querySelector('[data-goal-filter="' + k + '"]')]));
  const expanded = new Map();
  let liveState = null;
  let preferHydratedState = false;

  function goalsFromStore() {
    // Cloud hydration may precede localStorage persistence; subsequent edits
    // are read directly from the canonical saved state.
    if (preferHydratedState && Array.isArray(liveState?.goals)) return liveState.goals;
    try {
      const data = JSON.parse(localStorage.getItem('elara_space_v1') || '{}');
      if (Array.isArray(data.goals)) return data.goals;
    } catch { /* Cloud-only sessions may not have local storage yet. */ }
    return Array.isArray(liveState?.goals) ? liveState.goals : [];
  }
  function isStepDone(step, date) {
    if (step?.recurrenceRule) return Array.isArray(step.occurrenceDone) && step.occurrenceDone.includes(date);
    const target = Math.max(1, Math.min(24, Math.round(Number(step?.dailyTarget) || 1)));
    return !!step?.done || (target > 1 && Number(step?.dailyProgress?.[date] || 0) >= target);
  }
  function goalNumbers(goal, date) {
    const steps = Array.isArray(goal?.steps) ? goal.steps : [];
    const count = steps.length;
    const done = steps.filter(step => isStepDone(step, date)).length;
    const dailyTarget = Math.max(1, Math.min(24, Math.round(Number(goal?.dailyTarget) || 1)));
    const daily = Math.min(dailyTarget, Number(goal?.dailyProgress?.[date] || 0));
    const percent = count ? Math.round(done * 100 / count) : dailyTarget > 1 ? Math.round(daily * 100 / dailyTarget) : 0;
    return {count, done, percent, complete: count > 0 && done === count};
  }
  function dataForRows() {
    const stored = goalsFromStore();
    const byId = new Map(stored.map(g => [String(g.id), g]));
    const rows = Array.from(list.querySelectorAll(':scope > .goal-item'));
    const day = today();
    return rows.map(row => {
      const id = row.dataset.entityId || '';
      const goal = byId.get(id);
      const n = goal ? goalNumbers(goal, day) : {
        count: row.querySelectorAll('.goal-step-item').length,
        done: row.querySelectorAll('.goal-step-item.done').length
      };
      if (n.percent === undefined) n.percent = n.count ? Math.round(100 * n.done / n.count) : 0;
      if (n.complete === undefined) n.complete = n.count > 0 && n.done === n.count;
      return {id, row, goal, ...n};
    });
  }

  function applyFilters(items) {
    let visible = 0;
    const query = search.value.trim().toLocaleLowerCase();
    for (const item of items) {
      const {goal, row, count, done, complete} = item;
      const name = (goal?.title || row.querySelector('.goal-title-row .item-title')?.textContent || '').toLocaleLowerCase();
      const matchesSearch = !query || name.includes(query) || String(goal?.description || '').toLocaleLowerCase().includes(query) || String(goal?.tag || '').toLocaleLowerCase().includes(query);
      const horizon = filters.horizon.value;
      const priority = filters.priority.value;
      const status = filters.status.value;
      const overdue = !!goal?.date && goal.date < today() && !complete;
      const matchingStatus = status === 'all' || status === 'done' && complete || status === 'new' && done === 0 && item.percent === 0 || status === 'overdue' && overdue || status === 'active' && !complete && (done > 0 || item.percent > 0);
      const show = matchesSearch && (horizon === 'all' || goal?.horizon === horizon) &&
        (priority === 'all' || String(goal?.priority || '4') === priority) && matchingStatus;
      row.classList.toggle('goal-is-filtered', !show);
      if (show) visible++;
    }
    emptyFilter.classList.toggle('hidden', visible > 0 || !items.length);
  }

  function updateStats(items) {
    const set = (key, value) => { const el = dashboard.querySelector('[data-goal-stat="' + key + '"]'); if (el) el.textContent = value; };
    const active = items.filter(item => !item.complete).length;
    const stepCount = items.reduce((sum, item) => sum + item.count, 0);
    const stepDone = items.reduce((sum, item) => sum + item.done, 0);
    const percent = stepCount ? Math.round(100 * stepDone / stepCount) : 0;
    const deadline = items.filter(item => !item.complete && /^\d{4}-\d{2}-\d{2}$/.test(item.goal?.date || '') && item.goal.date >= today())
      .sort((a, b) => a.goal.date.localeCompare(b.goal.date))[0];
    set('active', format.format(active));
    set('total-caption', 'از ' + format.format(items.length) + ' هدف');
    set('steps', format.format(stepDone) + ' / ' + format.format(stepCount));
    set('percent', format.format(percent) + '٪');
    set('deadline', deadline ? dateLabel(deadline.goal.date) : 'بدون موعد');
    set('deadline-caption', deadline ? deadline.goal.title : 'برای اهداف باقی‌مانده');
    dashboard.querySelector('[data-goal-stat-ring]')?.style.setProperty('--goal-progress', percent + '%');
  }

  function decorateRow(item) {
    const {row, goal, id, count, done, percent} = item;
    const header = document.createElement('div');
    header.className = 'goal-card-header';
    const ring = document.createElement('div');
    ring.className = 'goal-card-ring';
    ring.style.setProperty('--goal-progress', percent + '%');
    ring.setAttribute('aria-label', format.format(percent) + ' درصد پیشرفت');
    const ringInner = document.createElement('span');
    ringInner.textContent = format.format(percent) + '٪';
    ring.appendChild(ringInner);
    header.appendChild(ring);
    const symbol = document.createElement('span');
    symbol.className = 'goal-card-symbol';
    symbol.innerHTML = icons.target;
    header.appendChild(symbol);
    const content = row.querySelector(':scope > .item-content');
    const title = content?.querySelector(':scope > .goal-title-row');
    const details = document.createElement('div');
    details.className = 'goal-card-title';
    if (title) details.appendChild(title);
    const fraction = document.createElement('span');
    fraction.className = 'goal-card-fraction';
    fraction.textContent = format.format(done) + ' از ' + format.format(count) + ' ریزقدم';
    details.appendChild(fraction);
    header.appendChild(details);
    const controls = document.createElement('div');
    controls.className = 'goal-card-controls';
    const drag = row.querySelector(':scope > .entity-drag-handle');
    if (drag) controls.appendChild(drag);
    const actions = row.querySelector(':scope > .item-actions');
    if (actions) {
      const menu = document.createElement('details');
      menu.className = 'goal-card-menu';
      const summary = document.createElement('summary');
      summary.textContent = '⋮';
      summary.setAttribute('aria-label', 'عملیات هدف');
      summary.title = 'عملیات هدف';
      menu.append(summary, actions);
      controls.appendChild(menu);
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'goal-card-toggle';
    toggle.dataset.goalToggle = id;
    toggle.setAttribute('aria-label', 'باز و بسته کردن ریزقدم‌های هدف');
    const open = expanded.get(id) === true;
    toggle.setAttribute('aria-expanded', String(!!open));
    toggle.innerHTML = '<span aria-hidden="true">⌄</span>';
    controls.appendChild(toggle);
    header.appendChild(controls);
    row.insertBefore(header, content);
    if (content) {
      content.classList.add('goal-card-content');
      content.id = 'goal-details-' + id.replace(/[^a-zA-Z0-9_-]/g, '-');
      toggle.setAttribute('aria-controls', content.id);
      content.hidden = !open;
    }
    row.classList.toggle('goal-card-open', !!open);
    for (const button of row.querySelectorAll('.goal-step-actions [data-action]')) {
      if (button.dataset.action === 'edit-step') { button.setAttribute('aria-label','ویرایش ریزقدم'); button.title = 'ویرایش ریزقدم'; button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'; }
      if (button.dataset.action === 'delete-step') { button.setAttribute('aria-label','حذف ریزقدم'); button.title = 'حذف ریزقدم'; button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7m4-7v7"/></svg>'; }
    }
    // The original step list, edit/share/delete handlers and drag data are untouched.
  }

  function refresh() {
    const items = dataForRows();
    for (const item of items) if (!item.row.querySelector(':scope > .goal-card-header')) decorateRow(item);
    updateStats(items);
    applyFilters(items);
  }

  list.addEventListener('click', event => {
    const toggle = event.target.closest('[data-goal-toggle]');
    if (!toggle) return;
    const id = toggle.dataset.goalToggle;
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    expanded.set(id, open);
    const content = toggle.closest('.goal-item')?.querySelector(':scope > .goal-card-content');
    if (content) content.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.closest('.goal-item')?.classList.toggle('goal-card-open', open);
  });
  list.addEventListener('toggle', event => {
    if (event.target.matches?.('.goal-card-menu') && event.target.open) {
      list.querySelectorAll('.goal-card-menu').forEach(menu => { if (menu !== event.target) menu.open = false; });
    }
  }, true);
  const updateFiltered = () => applyFilters(dataForRows());
  search.addEventListener('input', updateFiltered);
  Object.values(filters).forEach(select => select.addEventListener('change', updateFiltered));

  const createButton = dashboard.querySelector('[data-goal-create]');
  function setComposer(open) {
    panel.classList.toggle('goal-form-visible', open);
    createButton.setAttribute('aria-expanded', String(open));
    createButton.innerHTML = open ? '<span aria-hidden="true">×</span> بستن فرم' : '<span aria-hidden="true">＋</span> افزودن هدف';
    if (open) {
      form.scrollIntoView({block:'nearest', behavior:'smooth'});
      document.getElementById('goal-title')?.focus({preventScroll:true});
    }
  }
  createButton.setAttribute('aria-expanded', 'false');
  createButton.setAttribute('aria-controls', 'goal-form');
  createButton.addEventListener('click', () => setComposer(!panel.classList.contains('goal-form-visible')));
  form.addEventListener('submit', () => {
    const before = list.querySelectorAll(':scope > .goal-item').length;
    queueMicrotask(() => {
      if (form.checkValidity() && list.querySelectorAll(':scope > .goal-item').length > before) setComposer(false);
    });
  }, {capture:true});

  function decorateHero() {
    const hero = panel.querySelector(':scope > .elara-global-hero');
    if (!hero) return;
    const h1 = hero.querySelector('h1');
    if (h1) h1.textContent = 'هدف‌های من';
    const small = hero.querySelector('small');
    if (small) small.textContent = 'ELARA SPACE';
    const copy = hero.querySelector(':scope > div');
    if (copy && !copy.querySelector('.goal-hero-caption')) {
      const p = document.createElement('p');
      p.className = 'goal-hero-caption';
      p.textContent = 'هدف‌های بزرگ را به قدم‌های کوچک و قابل انجام تبدیل کن.';
      copy.appendChild(p);
    }
  }

  new MutationObserver(() => refresh()).observe(list, {childList:true});
  new MutationObserver(() => decorateHero()).observe(panel, {childList:true});
  for (const name of ['elara:hydrate', 'elara:state-committed', 'elara:linked-state']) {
    window.addEventListener(name, event => {
      if (event.detail && Array.isArray(event.detail.goals)) {
        liveState = event.detail;
        preferHydratedState = true;
      }
      queueMicrotask(refresh);
    });
  }
  window.addEventListener('elara:data-changed', () => { preferHydratedState = false; });
  window.addEventListener('hashchange', decorateHero);
  decorateHero();
  refresh();
})();