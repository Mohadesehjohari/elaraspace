/* Elara Freedom: dedicated AI chat route using the EXISTING authenticated AI gateway.
 * Do not duplicate the AI form or replace its backend; move the live card into this view.
 */
(() => {
  'use strict';
  const panel = () => document.getElementById('panel-freedom');
  const ACTIVE_VIEW = 'ai-chat';
  let active = false;
  let originalCard = null;
  let placeholder = null;
  let syncing = false;

  function chatCard() {
    return originalCard?.isConnected ? originalCard : panel()?.querySelector('.freedom-ai-card');
  }

  function addEntry() {
    const p = panel();
    if (!p || p.querySelector('[data-freedom-ai-launch]')) return;
    const dashboard = p.querySelector('.fd-dashboard');
    const features = dashboard?.querySelector('.fd-features') || p.querySelector('.freedom-features');
    if (!features) return;
    const section = document.createElement('section');
    section.className = 'freedom-ai-shortcut';
    section.setAttribute('aria-label', 'چت هوش مصنوعی آزادی');
    section.innerHTML =
      '<div><strong>گفت‌وگو با Elara AI</strong>' +
      '<p>صفحهٔ مستقل چت برای ایده‌ها، برنامه‌ریزی و مرتب‌کردن فکرهایت.</p></div>' +
      '<button class="freedom-ai-shortcut-button" type="button" data-freedom-ai-launch>' +
      'ورود به صفحه چت <span aria-hidden="true">←</span></button>';
    features.insertAdjacentElement('afterend', section);
  }

  function restore() {
    const p = panel();
    const shell = p?.querySelector('.freedom-ai-chat-shell');
    if (originalCard) {
      if (placeholder?.parentNode) placeholder.replaceWith(originalCard);
      else {
        const target = p?.querySelector('[data-fd-advanced]') || p?.querySelector('.freedom-bottom');
        target?.append(originalCard);
      }
    }
    placeholder = null;
    originalCard = null;
    shell?.remove();
    p?.classList.remove('freedom-ai-subpage-open');
    active = false;
  }

  function show() {
    const p = panel();
    if (!p || !p.querySelector('.freedom-root')) return;
    if (active) { window.ElaraFreedomAI?.render?.(); return; }
    // Other Freedom subpages already own their own back navigation.
    if (p.querySelector('.freedom-subpage-shell')) return;
    addEntry();
    const card = chatCard();
    if (!card) return;
    active = true;
    placeholder = document.createComment('Freedom AI original card position');
    card.parentNode.insertBefore(placeholder, card);
    originalCard = card;
    const shell = document.createElement('section');
    shell.className = 'freedom-ai-chat-shell freedom-subpage-shell';
    shell.setAttribute('dir', 'rtl');
    shell.setAttribute('aria-label', 'صفحه چت آزادی');
    shell.innerHTML =
      '<header class="freedom-ai-chat-hero">' +
      '<button type="button" class="freedom-ai-chat-back" data-freedom-ai-back ' +
      'aria-label="بازگشت به تب قبلی">→ بازگشت به تب قبلی</button>' +
      '<div><small>ELARA · FREEDOM</small><h1>چت هوش مصنوعی</h1>' +
      '<p>با دستیار آزادی دربارهٔ ایده‌ها و اولویت‌هایت گفت‌وگو کن.</p></div>' +
      '</header><div class="freedom-ai-chat-content"></div>';
    shell.querySelector('.freedom-ai-chat-content').append(card);
    p.classList.add('freedom-ai-subpage-open');
    p.append(shell);
    window.ElaraFreedomAI?.render?.();
    shell.scrollIntoView?.({block:'start',behavior:'auto'});
  }

  function isChatState() {
    return location.hash === '#freedom' && history.state?.elaraFreedomView === ACTIVE_VIEW;
  }

  function sync() {
    if (syncing) return;
    syncing = true;
    try {
      if (isChatState()) show();
      else if (active) restore();
      if (!active && location.hash === '#freedom') addEntry();
    } finally { syncing = false; }
  }

  function navigate() {
    if (active || location.hash !== '#freedom') return;
    const p = panel();
    if (!p?.querySelector('.freedom-ai-card') || p.querySelector('.freedom-subpage-shell')) return;
    const state = history.state || {};
    history.pushState({
      ...state, elaraTab:'freedom', elaraFreedomView:ACTIVE_VIEW,
      elaraDepth:(Number(state.elaraDepth) || 0) + 1
    },'',location.pathname + location.search + '#freedom');
    show();
  }

  function goBack() {
    if (!active) return;
    if (isChatState() && history.length > 1) history.back();
    else {
      history.replaceState({...history.state,elaraFreedomView:null},'',location.pathname + location.search + '#freedom');
      restore();
    }
  }

  function start() {
    document.addEventListener('click',event => {
      if (event.target.closest('[data-freedom-ai-launch]')) {
        event.preventDefault(); event.stopPropagation();
        navigate();
      } else if (event.target.closest('[data-freedom-ai-back]')) {
        event.preventDefault(); event.stopPropagation();
        goBack();
      }
    },true);

    // If another top-level tab opens while chat is visible, restore its original card.
    window.addEventListener('elara:open',event => {
      if (event.detail?.tab !== 'freedom') {
        if (active) restore();
        return;
      }
      sync();
    });
    window.addEventListener('popstate',sync);
    window.addEventListener('hashchange',sync);
    window.addEventListener('elara:freedom-rendered',addEntry);
    window.addEventListener('elara:visual-ready',sync);
    addEntry();
    sync();
  }
  window.ElaraFreedomChatPage = {open:navigate,back:goBack};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
