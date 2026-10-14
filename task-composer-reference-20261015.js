/* Visual adaptation of the single canonical task composer. Business logic stays in phase2.js. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  let initialized = false;
  const isoOffset = n => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  };

  function enhance() {
    const shell = byId('task-composer-shell'), form = byId('task-form');
    if (!shell || !form || !shell.contains(form)) return false;
    if (initialized) return true;
    initialized = true;
    shell.classList.add('elara-task-reference-composer');
    shell.setAttribute('aria-label', 'افزودن یا ویرایش تسک');
    const heading = form.querySelector('.form-title');
    if (heading && !heading.querySelector('.elara-task-hint')) {
      const hint = document.createElement('span');
      hint.className = 'elara-task-hint';
      hint.textContent = 'یک هدف کوچک، یک قدم بزرگ‌تر به جلو ...';
      heading.append(hint);
    }
    const row = form.querySelector('.form-row');
    const titleLabel = form.querySelector('label[for="task-title"]');
    if (row && titleLabel && titleLabel.parentElement !== row) row.insertBefore(titleLabel, row.firstChild);
    const title = shell.querySelector('.task-composer-window>header h2');
    if (title) title.textContent = 'تسک من';
    const close = shell.querySelector('[data-composer-close]');
    if (close) close.setAttribute('title', 'بستن پنجره');
    const shortcuts = shell.querySelector('.task-date-shortcuts');
    const date = byId('task-due');

    const sync = () => {
      const open = !shell.hidden;
      document.body.classList.toggle('elara-task-modal-open', open);
      if (!open) return;
      shortcuts?.querySelectorAll('[data-date-offset]').forEach(button => {
        const active = date?.value === isoOffset(Number(button.dataset.dateOffset));
        button.classList.toggle('elara-date-selected', active);
        button.setAttribute('aria-pressed', String(active));
      });
    };
    new MutationObserver(sync).observe(shell, {attributes: true, attributeFilter: ['hidden']});
    shell.addEventListener('click', e => {
      if (e.target.closest('[data-date-offset],[data-task-calendar]')) requestAnimationFrame(sync);
    });
    date?.addEventListener('input', sync);
    date?.addEventListener('change', sync);
    form.addEventListener('reset', () => requestAnimationFrame(sync));
    sync();
    return true;
  }

  function start() {
    if (enhance()) return;
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document.body, {childList: true});
    // In case a task window was created between our first check and observe.
    if (enhance()) observer.disconnect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once: true});
  } else start();
})();
