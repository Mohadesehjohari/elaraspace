/* Approved Home -> full-page navigation: preserve the existing routes and task drafts. */
(() => {
  'use strict';
  const routes = {tasks: 'تسک‌ها', habits: 'عادت‌ها', goals: 'اهداف'};
  let openedFromHome = null;
  let pendingFromHome = null;
  const currentRoute = () => decodeURIComponent(location.hash.replace(/^#/, '')) || 'home';

  function ensureHomeLinks() {
    for (const [route, title] of Object.entries(routes)) {
      const content = document.getElementById('elara-home-' + route);
      const card = content?.closest('.elara-card');
      const header = card?.querySelector('header');
      if (!header || header.querySelector(`[data-elara-tab="${route}"]`)) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'elara-link elara-home-all';
      button.dataset.elaraTab = route;
      button.textContent = 'همه ›';
      button.setAttribute('aria-label', `نمایش همهٔ ${title}`);
      header.append(button);
    }
  }

  function ensureBackControls() {
    for (const [route, title] of Object.entries(routes)) {
      const panel = document.getElementById('panel-' + route);
      const heading = panel?.querySelector('.section-heading');
      if (!heading) continue;
      let back = heading.querySelector('[data-elara-home-return]');
      if (!back) {
        back = document.createElement('button');
        back.type = 'button';
        back.className = 'quiet-button elara-home-return';
        back.dataset.elaraHomeReturn = route;
        back.textContent = '→ بازگشت به خانه';
        back.setAttribute('aria-label', `بازگشت از ${title} به خانه`);
        heading.append(back);
      }
      back.hidden = openedFromHome !== route || currentRoute() !== route;
    }
  }

  function sync(route) {
    if (pendingFromHome === route) openedFromHome = route;
    else if (route !== openedFromHome) openedFromHome = null;
    pendingFromHome = null;
    ensureHomeLinks();
    ensureBackControls();
  }

  function onClick(event) {
    const back = event.target.closest('[data-elara-home-return]');
    if (back) {
      event.preventDefault();
      event.stopPropagation();
      openedFromHome = null;
      pendingFromHome = null;
      window.ElaraOpen?.('home');
      sync('home');
      return;
    }
    const link = event.target.closest('[data-elara-tab]');
    const route = link?.dataset.elaraTab;
    if (!routes[route]) return;
    const card = link.closest('.elara-card');
    pendingFromHome = currentRoute() === 'home' &&
      !!card?.querySelector('#elara-home-' + route) ? route : null;
  }

  function initialize() {
    ensureHomeLinks();
    sync(currentRoute());
    document.addEventListener('click', onClick, true);
    window.addEventListener('elara:open', event => sync(event.detail?.tab || currentRoute()));
    window.addEventListener('popstate', () => sync(currentRoute()));
    window.addEventListener('hashchange', () => sync(currentRoute()));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
