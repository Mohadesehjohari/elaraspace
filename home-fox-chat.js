/* Home-only mini chat uses the SAME live Elara AI card as the Freedom chat.
 * This is intentionally a UI portal, NOT a second API client / conversation.
 */
(()=>{'use strict';
const FOX='assets/ui/fox-loved.webp',home=()=>document.getElementById('panel-home');
let root=null,placeholder=null,card=null,open=false,opener=null;
const onHome=()=>{
  const h=home(),hash=(location.hash||'').split('?')[0];
  return !!h&&!h.classList.contains('hidden')&&!h.hidden&&(!hash||hash==='#home');
};
function findCard(){
  const freedom=document.getElementById('panel-freedom');
  return freedom?.querySelector('.freedom-fox-chat-box > .freedom-ai-card')||
    freedom?.querySelector('.freedom-ai-card')||null;
}
function mount(){
  if(root?.isConnected||!home())return;
  root=document.createElement('div');root.className='elara-home-fox-widget';root.dir='rtl';
  root.innerHTML='<button type="button" class="elara-home-fox-launch" data-ehf-toggle aria-label="گفتگو با الارا فاکس" aria-expanded="false" aria-controls="elara-home-fox-panel">'+
    '<img src="'+FOX+'" alt="" width="77" height="77" decoding="async" fetchpriority="high">'+
    '<span class="elara-home-fox-launch-label">با الارا حرف بزن ✨</span></button>'+
    '<section id="elara-home-fox-panel" class="elara-home-fox-popover" role="dialog" aria-label="گفتگوی کوچک با الارا فاکس" hidden>'+
    '<header class="elara-home-fox-top"><div class="elara-home-fox-heading">'+
    '<img src="'+FOX+'" alt="" width="49" height="49"><span><strong>الارا فاکس <i>✦</i></strong><small>اینجام، حرف بزنیم؟</small></span></div>'+
    '<div class="elara-home-fox-head-actions"><button type="button" data-ehf-full title="رفتن به چت کامل" aria-label="چت کامل">⛶</button>'+
    '<button type="button" data-ehf-close title="بستن چت" aria-label="بستن چت">✕</button></div></header>'+
    '<div class="elara-home-fox-content"><div class="elara-home-fox-loading" data-ehf-loading>در حال آماده‌کردن گفتگو…</div></div>'+
    '<footer class="elara-home-fox-bottom">💜 چت هوشمند الارا · تغییر اطلاعات سایت فقط با تأیید تو</footer></section>';
  document.body.append(root);
  root.addEventListener('click',e=>{
    if(e.target.closest('[data-ehf-toggle]')){open?close():show();return}
    if(e.target.closest('[data-ehf-close]')){close();return}
    if(e.target.closest('[data-ehf-full]')){close();window.ElaraOpen?.('freedom');if(location.hash!=='#freedom')location.hash='freedom';return}
  });
  sync();
}
function restoreCard(){
  if(placeholder?.parentNode&&card){placeholder.replaceWith(card);}
  else if(card){const target=document.querySelector('#panel-freedom .freedom-fox-chat-box');
    if(target)target.append(card)}
  placeholder=null;card=null;
}
function show(){
  if(open||!onHome()||window.ElaraFreedomChatPage?.expanded)return;
  mount();
  const original=findCard();if(!original){
    const loader=root?.querySelector('[data-ehf-loading]');
    if(loader)loader.textContent='چت الارا هنوز آماده نیست. یک‌بار صفحه را تازه کن.';
    return;
  }
  const content=root.querySelector('.elara-home-fox-content');
  if(!content)return;
  opener=document.activeElement;
  placeholder=document.createComment('Elara AI card origin');
  original.parentNode.insertBefore(placeholder,original);card=original;
  content.replaceChildren(original);
  open=true;
  const popup=root.querySelector('.elara-home-fox-popover'),button=root.querySelector('[data-ehf-toggle]');
  popup.hidden=false;button.setAttribute('aria-expanded','true');
  window.ElaraFreedomAI?.render?.();
  popup.querySelector('[data-f-ai-form] textarea')?.focus({preventScroll:true});
}
function close(){
  if(!open)return;
  restoreCard();open=false;
  const popup=root?.querySelector('.elara-home-fox-popover');
  if(popup)popup.hidden=true;
  root?.querySelector('[data-ehf-toggle]')?.setAttribute('aria-expanded','false');
  if(opener?.isConnected&&onHome())opener.focus({preventScroll:true});
  opener=null;
}
function sync(){
  if(!root?.isConnected)return;
  const visible=onHome()&&!window.ElaraFreedomChatPage?.expanded;
  if(!visible)close();
  root.hidden=!visible;
}
function start(){
  mount();
  window.addEventListener('hashchange',sync);
  window.addEventListener('popstate',sync);
  for(const event of ['elara:open','elara:visual-ready','elara:account-ready','elara:logout','elara:home-rendered']){
    window.addEventListener(event,()=>{if(!root?.isConnected)mount();sync()});
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&open){e.preventDefault();close()}
  });
  document.addEventListener('pointerdown',e=>{
    if(open&&!e.target.closest?.('.elara-home-fox-widget'))close();
  });
  // Home can render after deferred modules load.
  const watch=new MutationObserver(()=>sync());
  if(home())watch.observe(home(),{attributes:true,attributeFilter:['class','hidden']});
  window.addEventListener('pagehide',()=>watch.disconnect(),{once:true});
}
window.ElaraHomeFox={show,close,get expanded(){return open}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();