/* Elara date/time picker: an in-app Gregorian calendar and 24-hour clock.
   Underlying input values remain YYYY-MM-DD / HH:MM for existing task logic. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SELECTOR = [
    '#task-due', '#task-time',
    '#task-form input[type="date"]', '#task-form input[type="time"]',
    '#task-occurrence-date', '#habit-start', '#habit-recurrence-end'
  ].join(',');
  const fa = n => Number(n).toLocaleString('fa-IR');
  const pad = n => String(n).padStart(2, '0');
  const iso = date => [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
  const validDate = value => {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!parts) return null;
    const y = Number(parts[1]), m = Number(parts[2]), d = Number(parts[3]);
    const result = new Date(y, m - 1, d, 12);
    return y >= 100 && result.getFullYear() === y &&
      result.getMonth() === m - 1 && result.getDate() === d ? result : null;
  };
  const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
  const monthLabel = date => new Intl.DateTimeFormat('fa-IR-u-ca-gregory', {
    month: 'long', year: 'numeric'
  }).format(date);
  const weekdayNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  let active = null;

  function enhance(input) {
    if (!input || input.dataset.elaraPicker) return;
    const kind = input.type;
    if (kind !== 'date' && kind !== 'time') return;
    const currentValue = input.value;
    input.dataset.elaraPicker = kind;
    if (input.hasAttribute('min')) input.dataset.elaraPickerMin = input.getAttribute('min');
    if (input.hasAttribute('max')) input.dataset.elaraPickerMax = input.getAttribute('max');
    input.type = 'text';
    input.value = currentValue;
    input.readOnly = true;
    input.inputMode = 'none';
    input.autocomplete = 'off';
    input.classList.add('elara-dtp-trigger');
    input.setAttribute('aria-haspopup', 'dialog');
    input.setAttribute('aria-expanded', 'false');
    input.placeholder = kind === 'date' ? 'انتخاب تاریخ' : 'انتخاب ساعت';
    input.title = kind === 'date' ? 'باز کردن تقویم الارا' : 'باز کردن ساعت الارا';
  }

  function enhanceAll() {
    document.querySelectorAll(SELECTOR).forEach(enhance);
  }

  function inRange(value) {
    if (!active) return false;
    const el = active.input;
    const min = el.dataset.elaraPickerMin;
    const max = el.dataset.elaraPickerMax;
    return (!min || value >= min) && (!max || value <= max);
  }

  function renderCalendar() {
    const panel = active.panel;
    const year = active.view.getFullYear(), month = active.view.getMonth();
    const start = (new Date(year, month, 1).getDay() + 1) % 7;
    const last = new Date(year, month + 1, 0).getDate();
    const today = iso(new Date());
    const cells = [];
    for (let i = 0; i < start; i++) cells.push('<span class="elara-dtp-blank" aria-hidden="true"></span>');
    for (let day = 1; day <= last; day++) {
      const value = [year, pad(month + 1), pad(day)].join('-');
      const classes = ['elara-dtp-day'];
      if (value === today) classes.push('is-today');
      if (value === active.selected) classes.push('is-selected');
      const selected = value === active.selected;
      cells.push('<button type="button" class="' + classes.join(' ') +
        '" data-dtp-day="' + value + '" aria-pressed="' + selected +
        '" aria-label="' + fa(day) + ' ' + monthLabel(active.view) + '"' +
        (inRange(value) ? '' : ' disabled') + '>' + fa(day) + '</button>');
    }
    panel.querySelector('[data-dtp-month]').textContent = monthLabel(active.view);
    panel.querySelector('[data-dtp-days]').innerHTML = cells.join('');
    panel.querySelector('[data-dtp-selected]').textContent =
      active.selected ? new Intl.DateTimeFormat('fa-IR-u-ca-gregory', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(validDate(active.selected)) : 'تاریخی انتخاب نشده';
  }

  function updateTime() {
    const chosen = pad(active.hour) + ':' + pad(active.minute);
    active.panel.querySelector('[data-dtp-clock]').textContent = chosen;
    active.panel.querySelectorAll('[data-dtp-hour],[data-dtp-minute]').forEach(button => {
      const picked = Number(button.dataset.dtpHour ?? button.dataset.dtpMinute);
      const type = button.hasAttribute('data-dtp-hour') ? 'hour' : 'minute';
      const on = picked === active[type];
      button.classList.toggle('is-selected', on);
      button.setAttribute('aria-pressed', String(on));
    });
    active.panel.querySelectorAll('[data-dtp-quick]').forEach(button => {
      button.classList.toggle('is-selected', button.dataset.dtpQuick === chosen);
    });
  }

  function renderTime() {
    const hours = Array.from({length:24}, (_, h) =>
      '<button type="button" data-dtp-hour="' + h + '" aria-label="ساعت ' + fa(h) +
      '" aria-pressed="false">' + pad(h) + '</button>').join('');
    const minutes = Array.from({length:60}, (_, m) =>
      '<button type="button" data-dtp-minute="' + m + '" aria-label="دقیقه ' + fa(m) +
      '" aria-pressed="false">' + pad(m) + '</button>').join('');
    active.panel.querySelector('[data-dtp-hours]').innerHTML = hours;
    active.panel.querySelector('[data-dtp-minutes]').innerHTML = minutes;
    updateTime();
    requestAnimationFrame(() => {
      if (!active || active.kind !== 'time') return;
      for (const name of ['hour','minute']) {
        const list = active.panel.querySelector('[data-dtp-' + name + 's]');
        const button = list?.querySelector('[data-dtp-' + name + '="' + active[name] + '"]');
        if (list && button) list.scrollTop = Math.max(0, button.offsetTop - list.offsetTop - list.clientHeight / 2 + button.offsetHeight / 2);
      }
    });
  }

  function close() {
    if (!active) return;
    const previous = active;
    active = null;
    document.removeEventListener('keydown', handleKeyboard, true);
    document.body.style.overflow = previous.overflow;
    previous.input.setAttribute('aria-expanded', 'false');
    previous.root.remove();
    if (previous.input.isConnected) previous.input.focus({preventScroll:true});
  }

  function commit(value) {
    if (!active || (value && !inRange(value))) return;
    const input = active.input;
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
    close();
  }

  function handleKeyboard(event) {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      const buttons = [...active.panel.querySelectorAll('button:not([disabled])')];
      if (!buttons.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || !active.panel.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !active.panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  }

  function moveMonth(delta) {
    if (!active || active.kind !== 'date') return;
    active.view = new Date(active.view.getFullYear(), active.view.getMonth() + delta, 1, 12);
    renderCalendar();
  }

  function onPickerClick(event) {
    if (!active) return;
    if (event.target === active.root) { close(); return; }
    const control = event.target.closest('button');
    if (!control) return;
    const action = control.dataset.dtpAction;
    if (action === 'cancel') return close();
    if (action === 'clear') return commit('');
    if (action === 'apply') {
      return commit(active.kind === 'date' ? active.selected :
        pad(active.hour) + ':' + pad(active.minute));
    }
    if (action === 'previous') return moveMonth(-1);
    if (action === 'next') return moveMonth(1);
    if (action === 'today') {
      const value = iso(new Date());
      if (inRange(value)) {
        active.selected = value;
        const date = validDate(value);
        active.view = new Date(date.getFullYear(), date.getMonth(), 1, 12);
        renderCalendar();
      }
      return;
    }
    if (control.dataset.dtpDay) {
      active.selected = control.dataset.dtpDay;
      renderCalendar();
      return;
    }
    if (control.dataset.dtpHour !== undefined) active.hour = Number(control.dataset.dtpHour);
    if (control.dataset.dtpMinute !== undefined) active.minute = Number(control.dataset.dtpMinute);
    if (control.dataset.dtpQuick && validTime(control.dataset.dtpQuick)) {
      const pieces = control.dataset.dtpQuick.split(':');
      active.hour = Number(pieces[0]);
      active.minute = Number(pieces[1]);
    }
    if (active.kind === 'time') updateTime();
  }

  function open(input) {
    if (typeof input === 'string') input = $(input);
    if (!input) return false;
    enhance(input);
    const kind = input.dataset.elaraPicker;
    if (kind !== 'date' && kind !== 'time') return false;
    if (active) close();
    const now = new Date();
    const initialDate = validDate(input.value) || now;
    const [hour,minute] = validTime(input.value) ? input.value.split(':').map(Number) :
      [now.getHours(), now.getMinutes()];
    const root = document.createElement('div');
    root.className = 'elara-dtp-overlay';
    root.innerHTML = '<section class="elara-dtp-panel" role="dialog" aria-modal="true" aria-labelledby="elara-dtp-title" tabindex="-1">' +
      '<header class="elara-dtp-heading"><div><span class="elara-dtp-kicker">ELARA SPACE ✦</span><h2 id="elara-dtp-title">' +
      (kind === 'date' ? 'انتخاب تاریخ' : 'انتخاب ساعت') +
      '</h2><p>زمانت رو با سلیقهٔ خودت تنظیم کن</p></div>' +
      '<button type="button" class="elara-dtp-close" data-dtp-action="cancel" aria-label="بستن">×</button></header>' +
      (kind === 'date'
      ? '<div class="elara-dtp-date-selected" data-dtp-selected></div>' +
        '<div class="elara-dtp-month-controls"><button type="button" data-dtp-action="previous" aria-label="ماه قبل">‹</button>' +
        '<strong data-dtp-month></strong><button type="button" data-dtp-action="next" aria-label="ماه بعد">›</button></div>' +
        '<div class="elara-dtp-weekdays">' + weekdayNames.map(x => '<span>' + x + '</span>').join('') + '</div>' +
        '<div class="elara-dtp-days" data-dtp-days></div>' +
        '<button type="button" class="elara-dtp-today" data-dtp-action="today">✦ امروز</button>'
      : '<div class="elara-dtp-clock-preview" dir="ltr" data-dtp-clock></div>' +
        '<div class="elara-dtp-clock-caption">ساعت و دقیقه · قالب ۲۴ ساعته</div>' +
        '<div class="elara-dtp-quick"><button type="button" data-dtp-quick="09:00">۰۹:۰۰ صبح</button>' +
        '<button type="button" data-dtp-quick="12:00">۱۲:۰۰ ظهر</button>' +
        '<button type="button" data-dtp-quick="18:00">۱۸:۰۰ عصر</button>' +
        '<button type="button" data-dtp-quick="21:00">۲۱:۰۰ شب</button></div>' +
        '<div class="elara-dtp-wheels"><div><h3>ساعت</h3><div class="elara-dtp-wheel" data-dtp-hours></div></div>' +
        '<div><h3>دقیقه</h3><div class="elara-dtp-wheel" data-dtp-minutes></div></div></div>') +
      '<footer class="elara-dtp-actions"><button type="button" data-dtp-action="clear">پاک کردن</button>' +
      '<button type="button" data-dtp-action="cancel">انصراف</button>' +
      '<button type="button" class="elara-dtp-apply" data-dtp-action="apply">تأیید انتخاب</button></footer></section>';
    document.body.append(root);
    active = {
      input, kind, root, panel:root.firstElementChild,
      selected:iso(initialDate),
      view:new Date(initialDate.getFullYear(),initialDate.getMonth(),1,12),
      hour, minute, overflow:document.body.style.overflow
    };
    document.body.style.overflow = 'hidden';
    input.setAttribute('aria-expanded','true');
    root.addEventListener('click', onPickerClick);
    document.addEventListener('keydown', handleKeyboard, true);
    if (kind === 'date') renderCalendar(); else renderTime();
    root.querySelector('.elara-dtp-close').focus({preventScroll:true});
    return true;
  }

  document.addEventListener('click', event => {
    const calendarShortcut = event.target.closest('[data-task-calendar]');
    if (calendarShortcut && $('task-due')) {
      event.preventDefault();
      event.stopPropagation();
      open($('task-due'));
      return;
    }
    const input = event.target.closest('[data-elara-picker]');
    if (!input) return;
    event.preventDefault();
    event.stopPropagation();
    open(input);
  }, true);
  document.addEventListener('keydown', event => {
    const input = event.target.closest('[data-elara-picker]');
    if (input && ['Enter',' '].includes(event.key) && !active) {
      event.preventDefault(); open(input);
    }
  });
  function start() {
    enhanceAll();
    const observer = new MutationObserver(records => {
      if (!records.some(record => [...record.addedNodes].some(node =>
        node.nodeType === 1 && (node.matches?.(SELECTOR) || node.querySelector?.(SELECTOR))))) return;
      enhanceAll();
    });
    observer.observe(document.body, {subtree:true, childList:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
  window.ElaraDateTimePicker = {open, close, enhanceAll};
})();
