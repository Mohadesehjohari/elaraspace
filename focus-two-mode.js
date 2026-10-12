/* FOCUS-02: one canonical Pomodoro, two presentation modes and an inline library controller. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||fa;
const state=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return{}}};
let fullscreen=false;
function setFullscreen(on){
 fullscreen=!!on;
 document.body.classList.toggle('elara-focus-fullscreen',fullscreen);
 const p=$('#panel-focus-pomodoro'),btn=$('#elara-focus-expand');
 if(p){p.classList.toggle('elara-focus-expanded',fullscreen);p.setAttribute('data-focus-view',fullscreen?'immersive':'setup')}
 if(btn){btn.textContent=fullscreen?t('خروج از تمام‌صفحه','Exit full screen'):t('تمام‌صفحه','Full screen');btn.setAttribute('aria-pressed',String(fullscreen))}
 const exit=$('#elara-focus-exit');if(exit)exit.hidden=!fullscreen;
}
function sync(){
 const active=state().activeFocus;
 const live=!!active;
 const playing=active?.status==='running';
 const btn=$('[data-lib01-focus-inline]');
 if(btn){const label=playing?'Ⅱ':'▶';if(btn.textContent!==label)btn.textContent=label;btn.setAttribute('aria-label',playing?t('مکث تایمر','Pause timer'):live?t('ادامه تایمر','Resume timer'):t('شروع تایمر در کتابخانه','Start timer in library'));btn.setAttribute('aria-pressed',String(playing))}
 const dial=$('#lib01-overview .lib01-focus-dial');if(dial)dial.classList.toggle('is-running',playing);
 if(fullscreen && !live)setFullscreen(false);
}
function install(){
 const panel=$('#panel-focus-pomodoro');
 if(panel&&!$('#elara-focus-expand')){
  const bar=document.createElement('div');bar.className='elara-focus-view-actions';
  bar.innerHTML='<button type="button" id="elara-focus-expand"></button>';
  panel.querySelector('.feature-subpage-head')?.after(bar);
  const modes=document.createElement('div');modes.className='elara-focus-mode-options';
  modes.innerHTML=[['📖',t('مطالعه','Reading')],['✎',t('نوشتن','Writing')],['◈',t('کار عمیق','Deep work')],['✧',t('مدیتیشن','Meditation')]].map(([icon,name],i)=>'<button type="button" data-elara-focus-mode="'+i+'" aria-pressed="'+(i===0)+'"><span>'+icon+'</span><b>'+name+'</b></button>').join('');
  panel.querySelector('.focus-card')?.after(modes);
  if(!panel.querySelector('#elara-focus-exit')){const exit=document.createElement('button');exit.type='button';exit.id='elara-focus-exit';exit.hidden=true;exit.textContent='← '+t('بازگشت به تنظیمات','Back to setup');panel.prepend(exit)}
  bar.querySelector('button').textContent=t('تمام‌صفحه','Full screen');
 }
 const duplicates=panel?.querySelectorAll('#elara-focus-exit')||[];duplicates.forEach((node,i)=>{if(i)node.remove()});
 const source=$('#lib01-overview .lib01-focus-dial button[data-lib01-route]');
 if(source){source.removeAttribute('data-lib01-route');source.dataset.lib01FocusInline='';source.setAttribute('title',t('شروع یا مکث تایمر همین‌جا','Start or pause timer here'))}
 sync();
}
document.addEventListener('click',e=>{
 const inline=e.target.closest('[data-lib01-focus-inline]');
 if(inline){e.preventDefault();e.stopImmediatePropagation();const start=$('#timer-start');if(start)start.click();sync();return}
 if(e.target.closest('#elara-focus-expand')){e.preventDefault();setFullscreen(!fullscreen);return}
 if(e.target.closest('#elara-focus-exit')){e.preventDefault();setFullscreen(false);return}
 const mode=e.target.closest('[data-elara-focus-mode]');
 if(mode){e.preventDefault();document.querySelectorAll('[data-elara-focus-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===mode)));return}
 const start=e.target.closest('#panel-focus-pomodoro #timer-start');
 if(start){return}
 if(e.target.closest('#panel-focus-pomodoro #timer-reset'))setTimeout(sync,0);
},true);
window.addEventListener('elara:focus-toggle',()=>{if(location.hash==='#focus-pomodoro'&&!fullscreen&&state().activeFocus?.status==='running')setFullscreen(true);sync()});
window.addEventListener('elara:open',e=>{if(e.detail?.tab!=='focus-pomodoro')setFullscreen(false);setTimeout(install,0)});
for(const ev of ['elara:state-committed','elara:data-changed','elara:hydrate','elara:locale-changed'])window.addEventListener(ev,()=>setTimeout(install,0));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fullscreen)setFullscreen(false)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
new MutationObserver(()=>{if($('#lib01-overview .lib01-focus-dial button[data-lib01-route]')||($('#panel-focus-pomodoro .focus-card')&&!$('#elara-focus-expand')))install()}).observe(document.documentElement,{subtree:true,childList:true});
window.ElaraFocusPresentation={setFullscreen,sync};
})();
