/* Keyboard and scroll containment for the existing profile/wardrobe dialogs.
   Does not replace their content, actions, save handlers or routing. */
(() => {
  'use strict';
  const specs = [
    {selector: '.approved-wardrobe', panel: '.approved-wardrobe-window', close: '[data-close-wardrobe]'}
  ];
  let session = null;
  const visible = (el) => el && !el.hidden && !el.closest('[hidden]') && el.getClientRects().length > 0;

  function restore() {
    if (!session) return;
    const {launcher, overflow, htmlOverflow} = session;
    session = null;
    document.body.style.overflow = overflow;
    document.documentElement.style.overflow = htmlOverflow;
    if (launcher?.isConnected) launcher.focus({preventScroll: true});
  }

  function active() {
    if (!session) return null;
    if (session.root.hidden || !session.root.isConnected) {
      restore();
      return null;
    }
    return session;
  }

  function activate(spec, launcher) {
    const root = document.querySelector(spec.selector);
    if (!root || root.hidden) return;
    if (session?.root === root) return;
    restore();
    const panel = root.querySelector(spec.panel);
    if (!panel) return;
    session = {root, panel, spec, launcher,
      overflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow};
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    // An already-focused text field keeps its insertion point and typed draft.
    if (!panel.contains(document.activeElement)) {
      (panel.querySelector('button:not([disabled]),input:not([disabled])') || panel).focus({preventScroll: true});
    }
  }

  function focusables(panel) {
    return [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(visible);
  }

  document.addEventListener('click', event => {
    const launcher = event.target.closest('[data-approved-wardrobe]');
    if (launcher) {
      const spec = specs[0];
      // The original click handler creates/displays the existing dialog first.
      queueMicrotask(() => activate(spec, launcher));
    } else if (session && (session.root.hidden || !session.root.isConnected)) {
      restore();
    }
  });

  document.addEventListener('keydown', event => {
    const state = active();
    if (!state) return;
    const otherDialog = document.getElementById('elara-dialog-root');
    if (otherDialog && !otherDialog.hidden && !otherDialog.classList.contains('hidden')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.root.querySelector(state.spec.close)?.click();
      restore();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables(state.panel);
    if (!items.length) {event.preventDefault();state.panel.focus({preventScroll: true});return;}
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (!state.panel.contains(document.activeElement) || document.activeElement === first)) {
      event.preventDefault();last.focus({preventScroll: true});
    } else if (!event.shiftKey && (!state.panel.contains(document.activeElement) || document.activeElement === last)) {
      event.preventDefault();first.focus({preventScroll: true});
    }
  }, true);
})();
