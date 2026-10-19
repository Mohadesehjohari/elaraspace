/* Visible, accessible Back action on every Freedom detail page.
 * Uses the existing page's own close button so local state, scroll and
 * browser history remain owned by Freedom Enhancements / R30 / R31.
 */
(() => {
  'use strict';

  const panel = () => document.getElementById('panel-freedom');
  const currentShell = () => panel()?.querySelector(':scope > .freedom-subpage-shell[data-freedom-view]');

  let button = null;
  let observer = null;

  function visible() {
    const p = panel();
    return Boolean(
      p &&
      !p.classList.contains('hidden') &&
      currentShell() &&
      !document.body.classList.contains('freedom-fox-open')
    );
  }

  function refresh() {
    if (!button) return;
    button.hidden = !visible();
    if (!button.hidden) {
      const title = currentShell()?.querySelector('h1')?.textContent?.trim();
      button.setAttribute('aria-label', title ? 'بازگشت از ' + title + ' به آزادی' : 'بازگشت به آزادی');
    }
  }

  function back() {
    const p = panel();
    if (!p || p.classList.contains('hidden')) return;
    const shell = currentShell();
    if (!shell) { refresh(); return; }

    // Delegate to each page's real handler: the R30/R31 handlers and the
    // original reflection/notes handler all update their local state.
    const nativeBack = shell.querySelector('[data-r30-back],[data-r31-back],[data-f-sub-back]');
    if (nativeBack) {
      nativeBack.click();
    } else if (history.state?.elaraFreedomView) {
      history.back();
    } else {
      // Defensive fallback only for a malformed page without its own handler.
      shell.remove();
      p.classList.remove('freedom-subpage-open');
    }
    refresh();
  }

  function start() {
    if (document.getElementById('freedom-universal-back')) return;
    const p = panel();
    if (!p) return;

    button = document.createElement('button');
    button.id = 'freedom-universal-back';
    button.className = 'freedom-universal-back';
    button.type = 'button';
    button.hidden = true;
    button.innerHTML =
      '<span class="freedom-universal-back-arrow" aria-hidden="true">→</span>' +
      '<span>بازگشت به آزادی</span>';
    button.addEventListener('click', back);
    // Outside panel: not clipped by its overflow or overlapped by its
    // generated/banner hero; guaranteed visible in all detail views.
    document.body.append(button);

    observer = new MutationObserver(refresh);
    observer.observe(p,{childList:true,attributes:true,attributeFilter:['class']});
    for(const event of ['elara:open','popstate','hashchange','elara:freedom-rendered','elara:visual-ready'])
      window.addEventListener(event,refresh);
    window.addEventListener('pageshow',refresh);
    refresh();
  }

  window.ElaraFreedomUniversalBack = {refresh,back,get visible(){return visible();}};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
