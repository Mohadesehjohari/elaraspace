/* Mobile IA refresh — 2026-10-05.
   Keeps Ranking as its own route, removes it from the mobile dock, and exposes it from Friends.
   The Friends ranking entry deliberately carries ranking-entry-ready-for-gold so a later visual pass
   can apply the requested gold skin without changing navigation semantics. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const open=route=>window.ElaraOpen?.(route,{history:'push'});
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const read=()=>{try{const data=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return data&&typeof data==='object'?data:{}}catch{return{}}};

function ensureStoreButton(){
 const actions=document.querySelector('.topbar .topbar-actions');if(!actions)return;
 let store=$('ref-header-store');
 if(!store){
  store=document.createElement('button');store.id='ref-header-store';store.type='button';store.className='icon-button ref-header-store';
  store.setAttribute('aria-label','فروشگاه');store.title='فروشگاه';
  store.innerHTML='<img src="assets/ui/15-store-nav-default.webp" alt="" aria-hidden="true" decoding="async">';
  store.addEventListener('click',()=>open('store'));
  const theme=$('theme-toggle');if(theme?.parentElement===actions)actions.insertBefore(store,theme);else actions.prepend(store);
 }
}

function renderLanguageStrip(){
 const strip=$('ref-theme-strip');if(!strip)return;
 strip.classList.add('ref-language-strip');
 strip.dataset.mobileIaLanguage='true';
 const data=read(),words=Array.isArray(data.words)?data.words:[],day=today();
 const ready=words.filter(w=>!w?.due||String(w.due)<=day).length,total=words.length,signature=ready+':'+total;
 if(strip.dataset.languageSignature!==signature){
  strip.dataset.languageSignature=signature;
  strip.innerHTML=`<header class="ref-language-strip-head">
    <h2><img class="ref-language-brain" src="assets/icon-brain.png" alt="" aria-hidden="true"> زبان · جعبه لایتنر</h2>
    <div class="ref-language-strip-actions">
      <button type="button" class="ref-home-reports-button" data-home-reports aria-label="گزارش‌ها">گزارش‌ها</button>
      <button type="button" class="elara-link ref-language-all" data-home-language-all>همه ←</button>
    </div>
   </header>
   <div class="ref-language-strip-body">
    <button type="button" class="ref-language-leitner-main" data-home-leitner>
      <img src="assets/ui/22-leitner-box-icon.webp" alt="" aria-hidden="true">
      <span><strong>آمادهٔ مرور</strong><b>${Number(ready).toLocaleString('fa-IR')}</b></span>
    </button>
    <div class="ref-language-stat"><img src="assets/icon-brain.png" alt="" aria-hidden="true"><span><small>کل واژه‌ها</small><strong>${Number(total).toLocaleString('fa-IR')}</strong></span></div>
    <button type="button" class="ref-language-add-word" data-home-word-add aria-label="افزودن لغت به لایتنر">+ لغت</button>
   </div>`;
 }
 if(matchMedia('(max-width:700px)').matches){
  strip.style.setProperty('grid-area','auto','important');
  strip.style.setProperty('grid-column','1 / -1','important');
  strip.style.setProperty('grid-row','auto','important');
 }else{
  strip.style.setProperty('grid-area','themes','important');
  strip.style.removeProperty('grid-column');strip.style.removeProperty('grid-row');
 }
}

function ensureFriendsRankingEntry(){
 const root=$('elara-social-page');if(!root)return;
 const onFriends=(location.hash.replace(/^#/,'')||'home')==='social';
 const head=root.querySelector('.social-page-head');
 let button=root.querySelector('[data-friends-ranking-entry]');
 if(!onFriends){button?.remove();return}
 if(!head)return;
 if(!button){
  button=document.createElement('button');button.type='button';
  button.className='friends-ranking-entry ranking-entry-ready-for-gold';
  button.dataset.friendsRankingEntry='';
  button.innerHTML='<img src="assets/ui/icon-ranking-trophy.webp" alt="" aria-hidden="true"><span>رنکینگ</span>';
  button.setAttribute('aria-label','رفتن به صفحه رنکینگ');
  button.addEventListener('click',()=>open('ranking'));
  head.append(button);
 }
}

function handleClick(e){
 if(e.target.closest('[data-home-language-all]')){open('language');return}
 if(e.target.closest('[data-home-leitner]')){open('words');return}
 if(e.target.closest('[data-home-word-add]')){open('words');setTimeout(()=>$('word-front')?.focus?.(),180);return}
 if(e.target.closest('[data-home-reports]')){open('reports');return}
}
let queued=false;
function refresh(){
 queued=false;ensureStoreButton();renderLanguageStrip();ensureFriendsRankingEntry();
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(refresh)}
function observe(){
 for(const target of [$('panel-home'),$('elara-social-page')].filter(Boolean)){
  new MutationObserver(schedule).observe(target,{childList:true,subtree:true});
 }
}
function init(){
 document.addEventListener('click',handleClick);
 for(const ev of ['elara:open','elara:data-changed','elara:hydrate','elara:state-committed','elara:social-updated','elara:account-ready','elara:locale-changed'])window.addEventListener(ev,schedule);
 window.addEventListener('hashchange',schedule);window.addEventListener('resize',schedule,{passive:true});
 refresh();observe();setTimeout(refresh,250);setTimeout(refresh,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();