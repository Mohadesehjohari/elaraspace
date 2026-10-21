/* Elara dual-persona chat: full-viewport chooser, Fox / Character workspaces.
 * Uses the existing authenticated ElaraFreedomAI transport, memory, and site actions.
 * Chat views are presentation: no impersonation of real people, no silent data writes.
 */
(()=>{
'use strict';
const VIEW='fox-chat';
const FOX='assets/ui/fox-loved.webp';
const NIGHT='assets/ui/Celestial Mirror Lake at Night.webp';
const panel=()=>document.getElementById('panel-freedom');
const route=()=>location.hash==='#freedom'&&history.state?.elaraFreedomView===VIEW;
let card=null,overlay=null,placeholder=null,opener=null,mode='',focusMode=false,settingsOpen=false,syncing=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const persona=m=>m==='character'?{name:'الارا · کاراکتر شخصی',nameEn:'ELARA CHARACTER',desc:'گفتگو با حالت کاراکتر اختصاصی تو؛ حافظه هر فرد جداست.',img:FOX}:
 {name:'الارا فاکس',nameEn:'ELARA FOX',desc:'روباه مهربون و باهوشت برای گفتگو و برنامه‌ریزی',img:FOX};
const signed=()=>!!window.ElaraAccount?.user?.uid;
function warm(){
 if(document.querySelector('link[data-elara-fox-preload]'))return;
 const l=document.createElement('link');l.rel='preload';l.as='image';l.href=FOX;l.fetchPriority='high';
 l.dataset.elaraFoxPreload='1';document.head.append(l);
}
if(location.hash.startsWith('#freedom'))warm();
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='freedom')warm()});
function recent(){
 const rows=window.ElaraFreedomAI?.recent?.()||[];
 return rows.filter(r=>r.role==='user'&&typeof r.text==='string').slice(-7).reverse();
}
function ensureCard(){
 const p=panel();if(!p||overlay)return;
 const dashboard=p.querySelector('.fd-dashboard');
 const features=dashboard?.querySelector('.fd-features')||p.querySelector('.freedom-features');
 const ai=p.querySelector('.freedom-ai-card');
 if(!features||!ai)return;
 let box=p.querySelector('.freedom-fox-chat-box');
 if(!box){
  box=document.createElement('section');box.className='freedom-fox-chat-box';
  box.innerHTML='<div class="ef-entry">'+
    '<div class="ef-entry-text"><span class="ef-overline">ELARA · YOUR COMPANIONS</span>'+
    '<h3>امروز با کدوم همراهت حرف می‌زنی؟</h3>'+
    '<p>دو شخصیت، دو دنیای متفاوت؛ گفتگو، خاطره‌ها و برنامه‌هات کنار تو هستند.</p>'+
    '<button type="button" class="ef-entry-open" data-fox-open>ورود به دنیای چت <span aria-hidden="true">↗</span></button></div>'+
    '<div class="ef-entry-pics" aria-hidden="true"><img src="'+FOX+'" alt="" width="130" height="140" loading="eager" fetchpriority="high"></div></div>';
  features.insertAdjacentElement('afterend',box);
 }
 if(ai.parentNode!==box)box.append(ai);
 card=ai;
}
function markup(){
 return '<div class="ef-shell" dir="rtl">'+
  '<header class="ef-header"><div class="ef-brand"><img src="'+FOX+'" alt="" width="53" height="53"><span><b>ELARA <em>AI</em></b><small>دنیای گفتگوهای تو ✦</small></span></div>'+
   '<div class="ef-global-nav"><button type="button" data-ef-settings-toggle aria-controls="ef-chat-privacy" aria-expanded="false" class="ef-mobile-settings">⚙ تنظیمات</button><button type="button" data-ef-chooser>انتخاب شخصیت</button><button type="button" data-ef-focus>⛶ <span>تمام‌صفحه</span></button></div>'+
   '<button type="button" class="ef-header-close" data-fox-close aria-label="بازگشت به آزادی">← بازگشت به آزادی</button></header>'+
  '<section class="ef-chooser" data-ef-chooser-view aria-label="انتخاب همراه گفتگو">'+
   '<span class="ef-spark">✦ ELARA · YOUR COMPANION ✦</span>'+
   '<h1>امروز با کدوم همراهت حرف می‌زنی؟</h1>'+
   '<p>یک همراه تصویری، دو حالت گفتگو؛ بدون نمایش عکس پیش‌فرض به جای کاراکتر شخصی تو.</p>'+
   '<div class="ef-single-fox"><img src="'+FOX+'" alt="روباه الارا" width="235" height="235" fetchpriority="high" decoding="async"></div>'+
   '<div class="ef-persona-buttons" role="group" aria-label="انتخاب حالت گفتگو">'+
    '<button type="button" class="ef-persona-button" data-ef-persona="fox"><strong>🦊 الارا فاکس</strong><small>روباه مهربونت برای گفتگو و برنامه‌ریزی</small></button>'+
    '<button type="button" class="ef-persona-button" data-ef-persona="character"><strong>✦ کاراکتر شخصی من</strong><small>همراه اختصاصی خودت؛ بدون آواتار پیش‌فرض دیگران</small></button>'+
   '</div><span class="ef-choose-note">تنظیمات حافظه و اجازه شخصی‌سازی در بخش تنظیمات سایت قرار دارد.</span></section>'+
  '<section class="ef-workspace" data-ef-workspace hidden>'+
   '<button class="ef-sidebar-scrim" data-ef-settings-close type="button" hidden aria-label="بستن تنظیمات"></button>'+
   '<aside class="ef-sidebar" aria-label="گفتگوها و تنظیمات الارا">'+
    '<div class="ef-sidebar-toolbar"><strong>فضای الارا ✦</strong><button type="button" data-ef-settings-toggle aria-controls="ef-chat-privacy" aria-expanded="false">⚙ تنظیمات</button></div>'+
    '<div class="ef-sidebar-chat" data-ef-sidebar-chat>'+
     '<button type="button" class="ef-new-chat" data-ef-new>＋ گفتگوی جدید</button>'+
     '<button type="button" class="ef-sidebar-link is-active" data-ef-chooser>✧ تغییر شخصیت</button>'+
     '<h4>پیام‌های اخیر</h4><div data-ef-recent class="ef-recent"></div>'+
     '<div class="ef-art-tools"><b>پیشنهادهای سریع ✨</b>'+
      '<div class="ef-tool-grid"><button type="button" data-ef-prompt="برای درس خوندن کمکم کن">✎ کمک در درس</button><button type="button" data-ef-prompt="برای سفر یک برنامه خوب بده">♧ سفر و تفریح</button><button type="button" data-ef-prompt="یک هدف با ریزقدم پیشنهاد بده">⌁ هدف و برنامه</button><button type="button" data-ef-prompt="چند ایده خلاقانه بهم بده">✧ خلاقیت</button></div></div>'+
     '<div class="ef-sidebar-footer"><span class="ef-live-pulse"></span><span>الارا آماده گفتگوه</span></div>'+
    '</div>'+
    '<div class="ef-sidebar-settings" id="ef-chat-privacy" data-ef-settings-panel hidden>'+
     '<button type="button" class="ef-settings-back" data-ef-settings-close>← برگشت به گفتگوها</button>'+
     '<div data-ef-settings-mount></div>'+
    '</div>'+
   '</aside>'+
   '<main class="ef-main"><div class="ef-conversation"></div></main>'+
  '</section>'+
  '<div class="ef-disclosure">الارا هوش مصنوعی است، نه انسان. تغییر تسک، هدف و عادت فقط پس از تأیید تو انجام می‌شود.</div>'+
 '</div>';
}
function overlayRender(){
 if(overlay)return;
 ensureCard();
 if(!card?.isConnected)return;
 opener=document.activeElement;
 const layer=document.createElement('section');
 layer.className='freedom-fox-overlay ef-dual-chat';layer.setAttribute('role','dialog');
 layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','چت الارا');layer.dir='rtl';
 layer.innerHTML=markup();
 placeholder=document.createComment('Original Elara Freedom AI card');
 card.parentNode.insertBefore(placeholder,card);
 layer.querySelector('.ef-conversation').append(card);
 document.body.append(layer);
 overlay=layer;mode='';focusMode=false;settingsOpen=false;
 document.documentElement.classList.add('freedom-fox-open');
 document.body.classList.add('freedom-fox-open');
 renderUI();
 window.ElaraFreedomAI?.renderSettings?.();
 layer.querySelector('[data-ef-persona="fox"]')?.focus();
}
function renderUI(){
 if(!overlay)return;
 const choosing=!mode;
 overlay.dataset.persona=mode||'choose';
 overlay.classList.toggle('ef-immersive',focusMode&&!!mode);
 overlay.classList.toggle('ef-settings-open',settingsOpen&&!!mode);
 overlay.querySelectorAll('[data-ef-settings-toggle]').forEach(b=>{b.hidden=choosing;b.setAttribute('aria-expanded',String(settingsOpen));});
 const settingsPanel=overlay.querySelector('[data-ef-settings-panel]');if(settingsPanel)settingsPanel.hidden=!settingsOpen;
 const chats=overlay.querySelector('[data-ef-sidebar-chat]');if(chats)chats.hidden=settingsOpen;
 const scrim=overlay.querySelector('.ef-sidebar-scrim');if(scrim)scrim.hidden=!settingsOpen;
 overlay.querySelector('[data-ef-chooser-view]').hidden=!choosing;
 overlay.querySelector('[data-ef-workspace]').hidden=choosing;
 const button=overlay.querySelector('[data-ef-focus]');
 if(button){button.hidden=choosing;button.querySelector('span').textContent=focusMode?'نمایش پنل‌ها':'تمام‌صفحه';button.setAttribute('aria-pressed',String(focusMode));}
 overlay.querySelectorAll('[data-ef-chooser]').forEach(b=>b.hidden=choosing);

 if(choosing)return;
 const p=persona(mode);
 const set=(q,v)=>{const el=overlay.querySelector(q);if(el)el.textContent=v};
 set('[data-ef-heading]',mode==='character'?'سلام! به دنیای الارا خوش اومدی 🌙':'سلام! بیا با هم یه ماجراجویی شروع کنیم ✨');
 set('[data-ef-subhead]',p.desc);
 set('[data-ef-name]',p.name);set('[data-ef-description]',p.desc);
 set('[data-ef-speech]',mode==='character'?'من اینجام... از خیال‌هات تا برنامه‌های فردا باهاتم 💜':'سلام دوست من! بیا برای ایده‌هامون نقشه بکشیم ✨');
 const art=overlay.querySelector('[data-ef-art]');if(art){art.src=FOX;art.alt='روباه الارا'}
 updateRecent();
}
function choose(value,{keepSettings=false}={}){
 if(!overlay||!['fox','character'].includes(value))return;
 mode=value;focusMode=false;settingsOpen=keepSettings&&settingsOpen;
 renderUI();
 window.ElaraFreedomAI?.render?.();
 updateRecent();
 window.ElaraFreedomAI?.renderSettings?.();
 overlay.querySelector('[data-f-ai-form] textarea')?.focus();
}
function updateRecent(){
 if(!overlay||!mode)return;
 const box=overlay.querySelector('[data-ef-recent]');if(!box)return;
 const rows=recent();
 box.innerHTML=rows.length?rows.map(row=>'<button type="button" class="ef-recent-item" data-ef-recent-at="'+Number(row.at||0)+'" title="نمایش پیام قدیمی: '+esc(row.text.slice(0,130))+'"><span>✦</span><span>'+esc(row.text.slice(0,65))+'</span></button>').join(''):'<p class="ef-recent-empty">اینجا گفتگوهای تازه‌ات دیده می‌شن.</p>';
}
function restore(){
 if(!overlay)return;
 if(placeholder?.parentNode&&card)placeholder.replaceWith(card);
 else panel()?.querySelector('.freedom-fox-chat-box')?.append(card);
 if(document.fullscreenElement===overlay)void document.exitFullscreen?.().catch(()=>{});
 overlay.remove();overlay=null;placeholder=null;mode='';focusMode=false;settingsOpen=false;
 window.ElaraFreedomAI?.renderSettings?.();
 document.documentElement.classList.remove('freedom-fox-open');
 document.body.classList.remove('freedom-fox-open');
 if(opener?.isConnected)opener.focus();opener=null;
}
function sync(){
 if(syncing)return;syncing=true;
 try{if(route())overlayRender();else if(overlay)restore();
 if(!overlay&&location.hash==='#freedom')ensureCard()}finally{syncing=false}
}
function open(){
 if(overlay||location.hash!=='#freedom'||panel()?.querySelector('.freedom-subpage-shell'))return;
 ensureCard();if(!card?.isConnected)return;
 const prev=history.state||{};
 history.pushState({...prev,elaraTab:'freedom',elaraFreedomView:VIEW,elaraDepth:(Number(prev.elaraDepth)||0)+1},
  '',location.pathname+location.search+'#freedom');
 overlayRender();
}
function close(){
 if(!overlay)return;
 if(route())history.back();else restore();
}
function toggleSettings(force){
 if(!overlay||!mode)return;
 settingsOpen=typeof force==='boolean'?force:!settingsOpen;
 if(settingsOpen&&focusMode){focusMode=false;if(document.fullscreenElement===overlay)void document.exitFullscreen?.().catch(()=>{});}
 renderUI();
 window.ElaraFreedomAI?.renderSettings?.();
 if(settingsOpen)overlay.querySelector('.ef-settings-back')?.focus();
 else overlay.querySelector('[data-ef-settings-toggle]')?.focus();
}
function toggleFocus(){
 if(!overlay||!mode)return;
 focusMode=!focusMode;renderUI();
 // CSS immersive layout works across all browsers; native fullscreen enhances it.
 if(focusMode&&overlay.requestFullscreen)void overlay.requestFullscreen().catch(()=>{});
 else if(!focusMode&&document.fullscreenElement===overlay)void document.exitFullscreen?.().catch(()=>{});
}
function chooser(){
 if(!overlay)return;
 focusMode=false;
 if(document.fullscreenElement===overlay)void document.exitFullscreen?.().catch(()=>{});
 mode='';settingsOpen=false;renderUI();
 overlay.querySelector('[data-ef-persona="fox"]')?.focus();
}
function focusTrap(event){
 if(!overlay||event.key!=='Tab')return;
 const visible=[...overlay.querySelectorAll('button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')]
  .filter(x=>!x.closest('[hidden]')&&x.getClientRects().length);
 if(!visible.length)return;
 if(event.shiftKey&&document.activeElement===visible[0]){event.preventDefault();visible.at(-1).focus()}
 else if(!event.shiftKey&&document.activeElement===visible.at(-1)){event.preventDefault();visible[0].focus()}
}
function start(){
 document.addEventListener('click',event=>{
  const target=event.target;if(!target?.closest)return;
  if(target.closest('[data-fox-open]')){event.preventDefault();event.stopPropagation();open();return}
  if(!overlay||!overlay.contains(target))return;
  if(target.closest('[data-fox-close]')){event.preventDefault();close();return}
  const p=target.closest('[data-ef-persona]');if(p){event.preventDefault();choose(p.dataset.efPersona);return}
  if(target.closest('[data-ef-settings-toggle]')){toggleSettings();return}
  if(target.closest('[data-ef-settings-close]')){toggleSettings(false);return}
  if(target.closest('[data-ef-chooser]')){chooser();return}
  if(target.closest('[data-ef-focus]')){toggleFocus();return}
  const historyItem=target.closest('[data-ef-recent-at]');
  if(historyItem){window.ElaraFreedomAI?.showFromMessage?.(Number(historyItem.dataset.efRecentAt));return}
  if(target.closest('[data-ef-new]')){
   if(window.ElaraFreedomAI?.startNewChat?.()){
    window.ElaraAIPlans?.invalidate?.();window.ElaraFreedomAI.render();updateRecent();
   }return;
  }
  const prompt=target.closest('[data-ef-prompt]');
  if(prompt){const text=overlay.querySelector('[data-f-ai-form] textarea');if(text){
   text.value=prompt.dataset.efPrompt||'';text.focus();
  }return}
  if(target.closest('[data-ef-tools]'))overlay.querySelector('.ef-art-tools')?.scrollIntoView({behavior:'smooth',block:'nearest'});
 },true);
 document.addEventListener('keydown',event=>{
  if(!overlay)return;
  if(event.key === 'Escape'){
   event.preventDefault();
   if(settingsOpen)toggleSettings(false);else if(focusMode)toggleFocus();else if(mode)chooser();else close();
  }else focusTrap(event);
 },true);
 window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);
 window.addEventListener('elara:open',event=>{if(event.detail?.tab!=='freedom'){if(overlay)restore()}else sync()});
 window.addEventListener('fullscreenchange',()=>{if(overlay&&document.fullscreenElement!==overlay&&focusMode){focusMode=false;renderUI()}});
 for(const n of ['elara:freedom-rendered','elara:visual-ready','elara:account-ready','elara:logout']){
  window.addEventListener(n,()=>{if(!overlay)ensureCard();else updateRecent()});
 }
 window.addEventListener('elara:chat-updated',updateRecent);
 ensureCard();sync();
}
window.ElaraFreedomChatPage={open,close,choose,toggleSettings,get mode(){return mode||'fox'},get expanded(){return!!overlay},get fullScreen(){return focusMode},get nativeFullscreen(){return document.fullscreenElement===overlay}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();