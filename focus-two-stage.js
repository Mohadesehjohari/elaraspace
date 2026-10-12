/* FOCUS-02: two-stage presentation around the existing phase2.js Pomodoro.
 * All actions delegate to the canonical #timer-start / #timer-reset controls.
 * No parallel clock, XP, saved sessions or synthetic data. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||fa;
const modes=[
 ['reading','📖','مطالعه','Reading'],
 ['writing','✎','نوشتن','Writing'],
 ['deep','♡','کار عمیق','Deep work'],
 ['meditation','✧','مدیتیشن','Meditation']
];
let immersive=false,previousFocus=null,selected='reading',observed=null,installing=false,retryPending=false,retries=0;
try{selected=localStorage.getItem('elara_focus_view_mode')||'reading'}catch{}
if(!modes.some(x=>x[0]===selected))selected='reading';
const state=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return{}}};
const canon=()=>$('#timer-start');
const modeButtons=group=>modes.map(([id,icon,fa,en])=>'<button type="button" class="focus-v2-mode" data-focus-v2-mode="'+id+'" aria-pressed="'+(selected===id)+'"><span aria-hidden="true">'+icon+'</span><strong>'+t(fa,en)+'</strong></button>').join('');
const active=()=>state().activeFocus;
function runCanonical(){
 const btn=canon();
 if(!btn||btn.disabled)return false;
 btn.click();sync();
 return true;
}
function selectMode(id,go=false){
 if(!modes.some(x=>x[0]===id))return;
 selected=id;
 try{localStorage.setItem('elara_focus_view_mode',id)}catch{}
 document.querySelectorAll('[data-focus-v2-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focusV2Mode===id)));
 if(go){window.ElaraOpen?.('focus-pomodoro',{history:'push'});setTimeout(install,40)}
 sync();
}
function addPreview(){
 const panel=$('#panel-focus-pomodoro'),card=panel?.querySelector('.focus-card');
 if(!panel||!card||!$('#timer-start')||!$('#focus-duration'))return false;
 panel.classList.add('focus-v2-preview');
 const dial=$('#timer-display');if(dial){dial.setAttribute('role','button');dial.setAttribute('tabindex','0');dial.setAttribute('aria-label',t('باز کردن جلسهٔ تمام‌صفحه','Open immersive focus session'));}
 const actions=card.querySelector('.timer-actions');
 if(actions&&!actions.querySelector('[data-focus-v2-enter]')){
  const b=document.createElement('button');
  b.type='button';b.className='focus-v2-enter';
  b.dataset.focusV2Enter='';
  b.innerHTML='<span aria-hidden="true">▶</span> <span data-focus-v2-enter-label>'+t('شروع جلسه تمرکز','Start focus session')+'</span>';
  actions.prepend(b);
 }
 if(!card.querySelector('.focus-v2-preview-modes')){
  const strip=document.createElement('div');
  strip.className='focus-v2-preview-modes';strip.innerHTML=modeButtons();
  const hint=card.querySelector(':scope > .muted');
  if(hint)hint.before(strip);else card.append(strip);
 }
 if(!panel.querySelector('.focus-v2-preview-caption')){
  const p=document.createElement('p');p.className='focus-v2-preview-caption';
  p.textContent=t('ابتدا تنظیم کن؛ سپس با شروع تایمر وارد نمای تمام‌صفحه شو.','Configure first, then start to enter the immersive view.');
  panel.querySelector('.feature-subpage-head')?.after(p);
 }
 if(!observed){
  const node=$('#timer-display');
  observed=new MutationObserver(()=>sync());
  observed.observe(node,{childList:true,characterData:true,subtree:true});
 }
 return true;
}
function immersiveMarkup(){
 const el=document.createElement('section');
 el.id='elara-focus-immersive';el.className='focus-v2-immersive';el.hidden=true;
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.setAttribute('aria-label',t('اتاق تمرکز تمام‌صفحه','Immersive focus room'));
 el.dir='rtl';
 el.innerHTML=
 '<header class="focus-v2-top"><button type="button" data-focus-v2-exit class="focus-v2-back">← '+t('بازگشت','Back')+'</button><span class="focus-v2-brand">✧ Elara <small>SPACE</small></span><div class="focus-v2-top-title"><h1>'+t('اتاق تمرکز','Focus room')+'</h1><p>'+t('با تمرکز عمیق، مسیر رؤیاهایت را کوتاه‌تر کن.','Deep focus brings your goals closer.')+'</p></div></header>'+
 '<div class="focus-v2-layout">'+
 '<div class="focus-v2-stage">'+
 '<div class="focus-v2-disc"><div class="focus-v2-timer"><strong data-focus-v2-time>25:00</strong><span data-focus-v2-phase>'+t('تمرکز','Focus')+'</span></div><button data-focus-v2-pause type="button" class="focus-v2-pause">Ⅱ '+t('مکث','Pause')+'</button></div>'+
 '<div class="focus-v2-quick"><button type="button" data-focus-v2-reset>↻ '+t('بازنشانی','Reset')+'</button><span data-focus-v2-today-chip></span></div>'+
 '<div class="focus-v2-modes" aria-label="'+t('حالت‌های تمرکز','Focus modes')+'">'+modeButtons()+'</div>'+
 '</div>'+
 '<aside class="focus-v2-aside"><section class="focus-v2-mode-panel"><h2>✧ '+t('حالت تمرکز','Focus modes')+'</h2><div class="focus-v2-modes">'+modeButtons()+'</div></section><section class="focus-v2-settings">'+
 '<h2>⚙ '+t('تنظیمات تایمر','Timer settings')+'</h2>'+
 [['focus-duration','مدت تمرکز','Focus duration'],['focus-break-duration','استراحت کوتاه','Short break'],['focus-session-count','تعداد چرخه‌ها','Cycles']].map(([id,fa,en])=>
 '<div class="focus-v2-setting"><label for="focus-v2-'+id+'">'+t(fa,en)+'</label><div><button type="button" data-focus-v2-dec="'+id+'" aria-label="'+t('کاهش','Decrease')+' '+t(fa,en)+'">−</button><output id="focus-v2-'+id+'" data-focus-v2-value="'+id+'">25</output><button type="button" data-focus-v2-inc="'+id+'" aria-label="'+t('افزایش','Increase')+' '+t(fa,en)+'">+</button></div></div>').join('')+
 '<label class="focus-v2-auto"><input type="checkbox" data-focus-v2-check="focus-auto-break"><span>'+t('شروع خودکار استراحت','Auto-start breaks')+'</span></label>'+
 '<p class="focus-v2-lock" data-focus-v2-lock hidden>'+t('تنظیمات در جلسه فعال قفل هستند.','Settings are locked during an active session.')+'</p>'+
 '<button class="focus-v2-main" type="button" data-focus-v2-pause>Ⅱ '+t('مکث / ادامه','Pause / Resume')+'</button></section></aside></div>'+
 '<section class="focus-v2-progress"><header><h2>▥ '+t('پیشرفت امروز','Today’s progress')+'</h2><span>'+t('براساس جلسات واقعی','Based on real sessions')+'</span></header><div class="focus-v2-metrics">'+
 '<div><strong data-focus-v2-today-sessions>۰</strong><small>'+t('جلسهٔ امروز','Sessions today')+'</small></div>'+
 '<div><strong data-focus-v2-today-minutes>۰</strong><small>'+t('دقیقهٔ تمرکز امروز','Minutes focused today')+'</small></div>'+
 '<div><strong data-focus-v2-all-sessions>۰</strong><small>'+t('کل جلسات ثبت‌شده','All recorded sessions')+'</small></div>'+
 '</div></section>';
 document.body.append(el);
 return el;
}
function overlay(){return $('#elara-focus-immersive')||immersiveMarkup()}
function todayStats(){
 const items=(Array.isArray(state().focusSessions)?state().focusSessions:[]).filter(x=>x?.completed);
 const d=new Date(),today=[d.getFullYear(),d.getMonth(),d.getDate()];
 const day=items.filter(x=>{let n=Number(x.endedAt);if(!Number.isFinite(n))n=Date.parse(x.endedAt);if(!Number.isFinite(n))return false;const dt=new Date(n);return dt.getFullYear()===today[0]&&dt.getMonth()===today[1]&&dt.getDate()===today[2]});
 const fa=n=>String(n).replace(/\d/g,c=>'۰۱۲۳۴۵۶۷۸۹'[Number(c)]);
 return {sessions:fa(day.length),minutes:fa(day.reduce((n,x)=>n+(Number(x.durationMin)||0),0)),total:fa(items.length)};
}
function sync(){
 const isActive=!!active(),now=state(),display=$('#timer-display');
 const label=$('[data-focus-v2-enter-label]');
 if(label)label.textContent=isActive?t('نمایش جلسهٔ فعال','View active session'):now.focusPlanProgress?t('ادامهٔ چرخه','Continue cycle'):t('شروع جلسه تمرکز','Start focus session');
 const time=display?.textContent?.trim()||'25:00';
 document.querySelectorAll('[data-focus-v2-time]').forEach(e=>{if(e.textContent!==time)e.textContent=time});
 const phase=$('[data-focus-v2-phase]');
 if(phase)phase.textContent=$('#focus-status')?.textContent?.trim()||t('تمرکز','Focus');
 const btn=canon(),paused=active()?.status==='paused';
 document.querySelectorAll('[data-focus-v2-pause]').forEach(e=>{e.textContent=btn?.textContent||t(paused?'ادامه':'مکث',paused?'Resume':'Pause')});
 for(const id of ['focus-duration','focus-break-duration','focus-session-count']){
  const source=$('#'+id),dest=$('[data-focus-v2-value="'+id+'"]');
  if(dest&&source){dest.textContent=source.value;dest.closest('.focus-v2-setting')?.classList.toggle('locked',!!source.disabled)}
 }
 const check=$('[data-focus-v2-check="focus-auto-break"]'),source=$('#focus-auto-break');
 if(check&&source){check.checked=!!source.checked;check.disabled=!!source.disabled}
 document.querySelectorAll('[data-focus-v2-dec],[data-focus-v2-inc]').forEach(b=>b.disabled=!!$('#'+(b.dataset.focusV2Dec||b.dataset.focusV2Inc))?.disabled);
 const lock=$('[data-focus-v2-lock]');if(lock)lock.hidden=!$('#focus-duration')?.disabled;
 const stats=todayStats();
 const values={'[data-focus-v2-today-sessions]':stats.sessions,'[data-focus-v2-today-minutes]':stats.minutes,'[data-focus-v2-all-sessions]':stats.total};
 for(const [k,v] of Object.entries(values)){const e=$(k);if(e)e.textContent=v}
 const chip=$('[data-focus-v2-today-chip]');if(chip)chip.textContent=stats.sessions+' '+t('جلسه امروز','sessions today');
 document.querySelectorAll('[data-focus-v2-mode]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.focusV2Mode===selected)));
}
function enter(){
 if(!addPreview())return;
 if(!active()&&!runCanonical())return;
 const v=overlay();
 previousFocus=document.activeElement;
 immersive=true;v.hidden=false;document.body.classList.add('focus-v2-immersive-open');
 sync();
 v.querySelector('[data-focus-v2-exit]')?.focus({preventScroll:true});
}
function exit(){
 const v=$('#elara-focus-immersive');if(!v||v.hidden)return;
 immersive=false;v.hidden=true;document.body.classList.remove('focus-v2-immersive-open');
 if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 previousFocus=null;
}
function adjust(id,dir){
 const input=$('#'+id);if(!input||input.disabled)return;
 let n=Number(input.value)||1,lo=Number(input.min)||1,hi=Number(input.max)||180;
 input.value=String(Math.max(lo,Math.min(hi,n+dir)));
 input.dispatchEvent(new Event('input',{bubbles:true}));sync();
}
function install(){
 if(installing)return;
 installing=true;
 let mounted=false;
 try{mounted=addPreview();if(mounted)overlay();sync()}finally{installing=false}
 if(mounted){retries=0;return}
 if(retries<65&&!retryPending){
  retries++;retryPending=true;
  setTimeout(()=>{retryPending=false;install()},300);
 }
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('#panel-focus-pomodoro #timer-display,[data-focus-v2-inline-start],[data-focus-v2-library-mode],[data-focus-v2-mode],[data-focus-v2-enter],[data-focus-v2-exit],[data-focus-v2-pause],[data-focus-v2-reset],[data-focus-v2-inc],[data-focus-v2-dec]');
 if(!b)return;
 e.preventDefault();e.stopPropagation();
 if(b.hasAttribute('data-focus-v2-inline-start')){runCanonical();return}
 if(b.dataset.focusV2LibraryMode){selectMode(b.dataset.focusV2LibraryMode,true);return}
 if(b.dataset.focusV2Mode){selectMode(b.dataset.focusV2Mode);return}
 if(b.id==='timer-display'||b.hasAttribute('data-focus-v2-enter')){enter();return}
 if(b.hasAttribute('data-focus-v2-exit')){exit();return}
 if(b.hasAttribute('data-focus-v2-pause')){runCanonical();return}
 if(b.hasAttribute('data-focus-v2-reset')){$('#timer-reset')?.click();setTimeout(sync,20);return}
 if(b.dataset.focusV2Inc){adjust(b.dataset.focusV2Inc,1);return}
 if(b.dataset.focusV2Dec){adjust(b.dataset.focusV2Dec,-1);return}
},true);
document.addEventListener('change',e=>{
 const input=e.target.closest?.('[data-focus-v2-check]');
 if(!input)return;const source=$('#'+input.dataset.focusV2Check);
 if(source&&!source.disabled){source.checked=input.checked;source.dispatchEvent(new Event('change',{bubbles:true}))}sync();
},true);
document.addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.id==='timer-display'&&!immersive){e.preventDefault();enter();return}
 if(e.key!=='Escape'||!immersive)return;
 e.preventDefault();e.stopPropagation();exit();
},true);
let priorRoute=location.hash.replace(/^#/,'')||'home';
window.addEventListener('elara:open',e=>{
 const route=e.detail?.tab;
 if(route==='focus-room'&&priorRoute==='books'){
  // Library entry enters the regular Pomodoro setup; shared presence remains gated.
  queueMicrotask(()=>window.ElaraOpen?.('focus-pomodoro',{history:'replace'}));
 }
 if(route!=='focus-pomodoro')exit();
 if(route)priorRoute=route;
 setTimeout(install,40);
});
for(const event of ['elara:state-committed','elara:hydrate','elara:locale-changed'])window.addEventListener(event,()=>setTimeout(sync,0));
window.addEventListener('elara:data-changed',()=>setTimeout(sync,0));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(install,40);setTimeout(install,500)},{once:true});
else{setTimeout(install,40);setTimeout(install,500)}
window.ElaraFocusJourney={enter,exit,sync,selectMode};
})();