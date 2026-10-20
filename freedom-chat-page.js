/* Freedom Fox companion: collapsible dashboard card and full-screen real AI chat.
 * Uses the existing ElaraFreedomAI form, memory and the admin-configured gateway.
 * Never duplicates the AI transport, messages, settings or authentication.
 */
(() => {
  'use strict';
  const panel = () => document.getElementById('panel-freedom');
  const VIEW = 'fox-chat';
  const FOX = 'assets/ui/fox-loved.webp';
  // Show the companion immediately on Freedom instead of deferring this visible art.
  const warmFox=()=>{
    if(document.querySelector('link[data-elara-fox-preload]'))return;
    const link=document.createElement('link');
    link.rel='preload';link.as='image';link.href=FOX;link.fetchPriority='high';
    link.dataset.elaraFoxPreload='1';document.head.appendChild(link);
  };
  if(location.hash.startsWith('#freedom'))warmFox();
  window.addEventListener('elara:open',e=>{if(e?.detail?.tab==='freedom')warmFox()});

  let card = null;
  let placeholder = null;
  let overlay = null;
  let opener = null;
  let syncing = false;

  const chatState = () => location.hash === '#freedom' && history.state?.elaraFreedomView === VIEW;
  const currentUser = () => window.ElaraAccount?.user?.uid || 'guest';

  function latestPreview() {
    try {
      const rows = JSON.parse(localStorage.getItem('elara_freedom_ai_chat_v1_' + currentUser()) || '[]');
      if (!Array.isArray(rows)) return '';
      const last = rows.slice().reverse().find(row => typeof row?.text === 'string' && row.text.trim());
      return last ? last.text.trim().slice(0,105) + (last.text.trim().length > 105 ? '…' : '') : '';
    } catch { return ''; }
  }

  function updatePreview() {
    const node = panel()?.querySelector('[data-fox-preview]');
    if (node) node.textContent = latestPreview() || 'هرچی توی ذهنت هست بهم بگو… من اینجام که به حرف‌هات گوش بدم.';
  }

  function ensureCard() {
    const p = panel();
    if (!p || overlay) return;
    const dashboard = p.querySelector('.fd-dashboard');
    const features = dashboard?.querySelector('.fd-features') || p.querySelector('.freedom-features');
    const ai = p.querySelector('.freedom-ai-card');
    if (!features || !ai) return;
    let box = p.querySelector('.freedom-fox-chat-box');
    if (!box) {
      box = document.createElement('section');
      box.className = 'freedom-fox-chat-box';
      box.setAttribute('aria-label', 'گفت‌وگو با روباه الارا');
      box.innerHTML =
        '<button class="freedom-fox-preview" type="button" data-fox-open aria-label="بازکردن گفت‌وگوی تمام‌صفحه با روباه الارا">' +
        '<img src="' + FOX + '" alt="روباه الارا" width="92" height="92" loading="eager" decoding="async" fetchpriority="high">' +
        '<span class="freedom-fox-preview-copy"><small>دوست هوشمند تو در آزادی</small>' +
        '<strong>بیا با هم حرف بزنیم <span aria-hidden="true">♡</span></strong>' +
        '<span class="freedom-fox-preview-message" data-fox-preview></span>' +
        '</span><span class="freedom-fox-open-label">بازکردن چت <span aria-hidden="true">↗</span></span></button>';
      features.insertAdjacentElement('afterend',box);
    }
    if (ai.parentNode !== box) box.append(ai);
    card = ai;
    updatePreview();
  }

  function show() {
    if (overlay) return;
    ensureCard();
    if (!card?.isConnected) return;
    opener = document.activeElement;
    const layer = document.createElement('section');
    layer.className = 'freedom-fox-overlay';
    layer.setAttribute('role','dialog');
    layer.setAttribute('aria-modal','true');
    layer.setAttribute('aria-label','گفت‌وگو با روباه الارا');
    layer.setAttribute('dir','rtl');
    layer.innerHTML =
      '<div class="freedom-fox-overlay-shell">' +
      '<header class="freedom-fox-overlay-header">' +
      '<button type="button" class="freedom-fox-back" data-fox-close aria-label="کوچک کردن چت و بازگشت به آزادی">→ بازگشت به آزادی</button>' +
      '<div class="freedom-fox-companion">' +
      '<img src="' + FOX + '" alt="روباه الارا" width="88" height="88" loading="eager" decoding="async">' +
      '<span><small>ELARA FOX · AI</small><strong>من اینجام، باهات حرف می‌زنم</strong>' +
      '<small>همراه هوشمندت برای درد دل، ایده‌ها و کارهای روزمره</small></span></div>' +
      '</header><main class="freedom-fox-conversation"></main>' +
      '<p class="freedom-fox-disclosure">الارا یک دستیار هوش مصنوعی است، نه انسان. گفت‌وگو از اتصال امن AI تنظیم‌شده در پنل ادمین استفاده می‌کند.</p>' +
      '</div>';
    placeholder = document.createComment('original Elara AI card');
    card.parentNode.insertBefore(placeholder,card);
    layer.querySelector('.freedom-fox-conversation').append(card);
    overlay = layer;
    document.body.append(layer);
    document.documentElement.classList.add('freedom-fox-open');
    document.body.classList.add('freedom-fox-open');
    window.ElaraFreedomAI?.render?.();
    layer.querySelector('[data-fox-close]')?.focus();
  }

  function restore() {
    if (!overlay) return;
    if (placeholder?.parentNode && card) placeholder.replaceWith(card);
    else {
      const box = panel()?.querySelector('.freedom-fox-chat-box');
      if (box && card) box.append(card);
    }
    overlay.remove();
    overlay = null;
    placeholder = null;
    document.documentElement.classList.remove('freedom-fox-open');
    document.body.classList.remove('freedom-fox-open');
    updatePreview();
    if (opener?.isConnected) opener.focus();
    opener = null;
  }

  function sync() {
    if (syncing) return;
    syncing = true;
    try {
      if (chatState()) show();
      else if (overlay) restore();
      if (!overlay && location.hash === '#freedom') ensureCard();
    } finally { syncing = false; }
  }

  function open() {
    if (overlay || location.hash !== '#freedom' || panel()?.querySelector('.freedom-subpage-shell')) return;
    ensureCard();
    if (!card?.isConnected) return;
    const state = history.state || {};
    history.pushState({
      ...state, elaraTab:'freedom',elaraFreedomView:VIEW,
      elaraDepth:(Number(state.elaraDepth)||0)+1
    },'',location.pathname + location.search + '#freedom');
    show();
  }

  function close() {
    if (!overlay) return;
    if (chatState()) history.back();
    else restore();
  }

  function focusTrap(event) {
    if (!overlay || event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')]
      .filter(el => el.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length-1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
  }

  function start() {
    document.addEventListener('click',event => {
      if (event.target.closest('[data-fox-open]')) {event.preventDefault();event.stopPropagation();open();}
      else if (event.target.closest('[data-fox-close]')) {event.preventDefault();event.stopPropagation();close();}
    },true);
    document.addEventListener('keydown',event => {
      if (overlay && event.key === 'Escape') {event.preventDefault();close();}
      else focusTrap(event);
    },true);
    window.addEventListener('popstate',sync);
    window.addEventListener('hashchange',sync);
    window.addEventListener('elara:open',event => {
      if (event.detail?.tab !== 'freedom') {if (overlay) restore();}
      else sync();
    });
    for (const name of ['elara:freedom-rendered','elara:visual-ready','elara:account-ready','elara:logout'])
      window.addEventListener(name,() => {if(!overlay)ensureCard();updatePreview();});
    ensureCard();
    sync();
  }

  window.ElaraFreedomChatPage = {open,close,get expanded(){return Boolean(overlay)}};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
