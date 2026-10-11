/* FOCUS-01: a warm, independent Focus Room rendering the one phase2.js engine. */
(()=>{'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const en=()=>document.documentElement.lang==='en',t=(fa,e)=>en()?e:fa,num=v=>Number(v||0).toLocaleString(en()?'en-US':'fa-IR');
const MODES=[{id:'reading',fa:'مطالعه',en:'Reading',icon:'📖'},{id:'writing',fa:'نوشتن',en:'Writing',icon:'✎'},{id:'deep',fa:'کار عمیق',en:'Deep work',icon:'◈'},{id:'meditation',fa:'مدیتیشن',en:'Meditation',icon:'☼'}];
const SOUNDS=[{id:'library',fa:'کتابخانه شب',en:'Night library',icon:'📚'},{id:'rain',fa:'باران',en:'Rain',icon:'🌧️'},{id:'cafe',fa:'کافه دنج',en:'Cozy café',icon:'☕'},{id:'forest',fa:'جنگل',en:'Forest',icon:'🌿'},{id:'sea',fa:'دریا',en:'Sea',icon:'🌊'},{id:'quiet',fa:'سکوت',en:'Silence',icon:'◌'}];
const state=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return{}}};
const focus=()=>state().activeFocus||null;
let mode='reading',target='',ready=false,queued=false,watcher=null,seenTimer=null;
const todayKey=x=>{const d=new Date(x);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const completed=()=>Array.isArray(state().focusSessions)?state().focusSessions.filter(s=>s?.completed!==false):[];
function streak(sessions){const dates=new Set(sessions.map(s=>todayKey(s.endedAt||s.startedAt)).filter(Boolean));let count=0,d=new Date();d.setHours(12,0,0,0);if(!dates.has(todayKey(d.getTime())))d.setDate(d.getDate()-1);while(dates.has(todayKey(d.getTime()))){count++;d.setDate(d.getDate()-1)}return count}
function contextMarkup(){
 const s=state(),books=(Array.isArray(s.books)?s.books:[]),tasks=(Array.isArray(s.tasks)?s.tasks:[]);
 const options='<option value="">'+t('بدون اتصال به کتاب یا تسک','No linked book or task')+'</option>'+
 books.map(b=>'<option data-kind="book" data-id="'+esc(b.id)+'" value="book:'+esc(b.id)+'">📖 '+esc(b.title)+'</option>').join('')+
 tasks.filter(task=>!task.completed).slice(0,120).map(task=>'<option data-kind="task" data-id="'+esc(task.id)+'" value="task:'+esc(task.id)+'">☷ '+esc(task.text||task.title||t('تسک','Task'))+'</option>').join('');
 return '<label class="focus01-target-label">'+t('فعالیت این جلسه','Session activity')+'<select id="focus01-target" aria-label="'+t('انتخاب کتاب یا تسک واقعی','Choose a real book or task')+'">'+options+'</select></label><p>'+t('جلسه به این فعالیت مرتبط می‌شود؛ تکمیل تسک یا افزایش صفحات خودکار انجام نمی‌شود.','Focus time can be linked, but books and tasks are never automatically completed.')+'</p>';
}
function summaryMarkup(){
 const s=state(),sessions=completed(),now=todayKey(Date.now()),today=sessions.filter(x=>todayKey(x.endedAt||x.startedAt)===now),mins=today.reduce((n,x)=>n+Math.max(0,Number(x.durationMin)||0),0),completedCycles=today.length,all=sessions.reduce((n,x)=>n+Math.max(0,Number(x.durationMin)||0),0),a=s.activeFocus,p=s.focusPlanProgress;
 return '<div class="focus01-stats-row"><div><strong>'+num(completedCycles)+'</strong><small>'+t('جلسه امروز','Today’s sessions')+'</small></div><div><strong>'+num(mins)+'</strong><small>'+t('دقیقه تمرکز امروز','Focus min today')+'</small></div><div><strong>'+num(streak(sessions))+'</strong><small>'+t('روز متوالی','Day streak')+'</small></div><div><strong>'+num(all)+'</strong><small>'+t('دقیقه ثبت‌شده','All logged min')+'</small></div></div>'+
 (a?'<p class="focus01-status-line">'+t('جلسه فعال: ','Current session: ')+t(a.kind==='break'?'استراحت':'تمرکز',a.kind==='break'?'Break':'Focus')+' · '+num(a.sessionIndex||1)+' / '+num(a.sessionCount||1)+'</p>':
 p?'<p class="focus01-status-line">'+t('جلسه بعدی آماده است: ','Next session ready: ')+num(p.sessionIndex||1)+' / '+num(p.sessionCount||1)+'</p>':
 '<p class="focus01-status-line">'+t('با انتخاب زمان و فعالیت، یک جلسه تازه شروع کن.','Choose a duration and activity to begin.')+'</p>');
}
function historyMarkup(){
 const sessions=completed().slice().sort((a,b)=>(Number(b.endedAt)||0)-(Number(a.endedAt)||0)).slice(0,5);
 return sessions.length?'<ul>'+sessions.map(s=>{
  const label=MODES.find(m=>m.id===s.mode),kind=s.linkedKind==='book'?t('کتاب','Book'):s.linkedKind==='task'?t('تسک','Task'):'';
  return '<li><strong>'+num(s.durationMin)+' '+t('دقیقه','min')+'</strong><span>'+(label?t(label.fa,label.en):esc(s.tag||t('تمرکز','Focus')))+'</span><small>'+new Date(s.endedAt||s.startedAt).toLocaleString(en()?'en-US':'fa-IR')+(kind?' · '+kind:'')+'</small></li>'
 }).join('')+'</ul>':'<p class="focus01-empty">'+t('هنوز جلسه تکمیل‌شده‌ای ثبت نشده است.','No completed focus sessions yet.')+'</p>';
}
function create(){
 const panel=$('#panel-focus-pomodoro');if(!panel||!window.ElaraFeatureHubs||!$('#timer-start')||!$('#focus-duration'))return false;
 let root=$('#focus01-room');
 if(!root){
  root=document.createElement('div');root.id='focus01-room';root.dir='rtl';
  const head=panel.querySelector(':scope > .feature-subpage-head');head?head.insertAdjacentElement('afterend',root):panel.prepend(root);
  root.innerHTML='<section class="focus01-hero"><div><span>ELARA · FOCUS ROOM</span><h1>◉ '+t('اتاق تمرکز','Focus room')+'</h1><p>'+t('با تمرکز عمیق، مسیر رؤیاهایت را کوتاه‌تر کن.','Deep focus brings your goals closer.')+'</p></div></section>'+
  '<div class="focus01-layout"><main class="focus01-main"><section class="focus01-clock-scene" aria-label="'+t('نمای زمان‌سنج تمرکز','Focus timer display')+'">'+
  '<div class="focus01-dial" style="--focus01-progress:0"><div class="focus01-dial-inner"><strong id="focus01-time" dir="ltr">25:00</strong><span id="focus01-phase">'+t('آماده تمرکز','Ready to focus')+'</span><button type="button" class="focus01-dial-play" data-focus01-toggle aria-label="'+t('شروع یا توقف زمان‌سنج','Start or pause timer')+'">▶</button></div></div></section>'+
  '<section class="focus01-modes"><h2>✦ '+t('حالت تمرکز','Focus mode')+'</h2><div>'+MODES.map(m=>'<button type="button" data-focus01-mode="'+m.id+'" aria-pressed="'+(m.id===mode)+'"><span>'+m.icon+'</span><strong>'+t(m.fa,m.en)+'</strong></button>').join('')+'</div><select id="focus01-mode" hidden aria-label="'+t('حالت ذخیره‌شده جلسه','Stored focus mode')+'">'+MODES.map(m=>'<option value="'+m.id+'" '+(m.id===mode?'selected':'')+'>'+t(m.fa,m.en)+'</option>').join('')+'</select></section>'+
  '<section class="focus01-sounds"><header><h2>♫ '+t('صداهای محیط','Ambient sounds')+'</h2><button type="button" data-focus01-sound-toggle>'+t('پخش صدا','Play sound')+'</button></header><div class="focus01-sound-grid">'+SOUNDS.map(x=>'<button type="button" data-focus01-sound="'+x.id+'" aria-pressed="false"><span aria-hidden="true">'+x.icon+'</span><strong>'+t(x.fa,x.en)+'</strong></button>').join('')+'</div><label>'+t('تنظیم صدا','Volume')+' <input type="range" data-focus01-volume min="0" max="100" step="1" value="28" aria-label="'+t('حجم صدای محیط','Ambient volume')+'"></label><p>'+t('صدا فقط پس از انتخاب و پخش با کلیک شما فعال می‌شود.','Audio only starts after your explicit play or selection.')+'</p></section>'+
  '</main><aside class="focus01-sidebar"><section class="focus01-controls"><h2>⚙ '+t('تنظیمات پومودورو','Pomodoro settings')+'</h2><div id="focus01-engine-slot"></div><button class="focus01-start" type="button" data-focus01-toggle>▶ '+t('شروع جلسه تمرکز','Start focus session')+'</button></section>'+
  '<section class="focus01-current"><h2>▣ '+t('کار فعلی','Current activity')+'</h2><div id="focus01-context"></div></section>'+
  '<section class="focus01-today"><h2>◷ '+t('پیشرفت امروز','Today’s progress')+'</h2><div id="focus01-stats"></div></section>'+
  '<section class="focus01-shared"><h2>☷ '+t('اتاق مشترک','Shared focus room')+'</h2><p>'+t('برای تمرکز با دوستان، اتصال امن و همگام‌سازی چندکاربره لازم است.','A secure realtime service is required for shared sessions.')+'</p><button type="button" data-feature-route="focus-room">'+t('مشاهده وضعیت اتاق مشترک','Shared room status')+' ←</button></section>'+
  '</aside></div><section class="focus01-history"><header><h2>◷ '+t('جلسه‌های اخیر','Recent sessions')+'</h2></header><div id="focus01-history-content"></div></section>';
 }
 const slot=root.querySelector('#focus01-engine-slot'),card=panel.querySelector('.focus-card');
 if(card&&slot&&card.parentElement!==slot)slot.append(card);
 ready=true;render();
 return true;
}
function syncClock(){
 if(!ready)return;
 const fromEngine=$('#timer-display')?.textContent?.trim(),display=$('#focus01-time');if(display&&fromEngine&&display.textContent!==fromEngine)display.textContent=fromEngine;
 const s=state(),a=s.activeFocus,p=s.focusPlanProgress,
 sec=a?(a.status==='paused'?Number(a.remainingSec)||0:Math.max(0,Math.ceil((Number(a.endAt)-Date.now())/1000))):null,
 total=(a?.durationMin||p?.focusMin||Number($('#focus-duration')?.value)||25)*60,
 elapsed=a&&total>0?Math.max(0,Math.min(100,Math.round(100*(1-sec/total)))):0;
 const ring=$('.focus01-dial');if(ring)ring.style.setProperty('--focus01-progress',String(elapsed));
 const phase=$('#focus01-phase');
 if(phase)phase.textContent=a?(
 a.kind==='break'?(a.status==='paused'?t('استراحت در مکث','Break paused'):t('استراحت','Break')):(a.status==='paused'?t('تمرکز در مکث','Focus paused'):t('در حال تمرکز','Focusing'))
 ):p?t('جلسه بعدی آماده است','Next session ready'):t('آماده تمرکز','Ready to focus');
 const play=$('.focus01-dial-play');if(play){play.textContent=a?.status==='running'?'Ⅱ':'▶';play.setAttribute('aria-label',a?.status==='running'?t('مکث','Pause'):t('شروع یا ادامه','Start or resume'))}
 const start=$('.focus01-start');if(start)start.textContent=a?.status==='running'?t('Ⅱ مکث جلسه','Ⅱ Pause session'):a?.status==='paused'?t('▶ ادامه جلسه','▶ Resume session'):t('▶ شروع جلسه تمرکز','▶ Start focus session');
}
function soundUI(){
 if(!ready)return;const cfg=window.ElaraFocusAmbience?.read?.()||{mode:'quiet',volume:28};
 document.querySelectorAll('#focus01-room [data-focus01-sound]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus01Sound===cfg.mode)));
 const vol=$('#focus01-room [data-focus01-volume]');if(vol&&document.activeElement!==vol)vol.value=String(cfg.volume);
 const toggle=$('#focus01-room [data-focus01-sound-toggle]');if(toggle)toggle.textContent=window.ElaraFocusAmbience?.playing?t('توقف صدا','Stop sound'):t('پخش صدا','Play sound');
}
function render(){
 if(!ready)return;
 const s=state(),current=focus(),progress=s.focusPlanProgress;
 if(current?.mode&&MODES.some(m=>m.id===current.mode))mode=current.mode;
 else if(progress?.mode&&MODES.some(m=>m.id===progress.mode))mode=progress.mode;
 const form=$('#focus01-mode');if(form)form.value=mode;
 document.querySelectorAll('#focus01-room [data-focus01-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.focus01Mode===mode));b.disabled=!!current||!!progress});
 const targetSelect=$('#focus01-target'),previous=targetSelect?.value||target;
 const context=$('#focus01-context');if(context){
  context.innerHTML=contextMarkup();
  const select=$('#focus01-target'),linked=current||progress;
  const preferred=linked?.linkedKind&&linked?.linkedId?linked.linkedKind+':'+linked.linkedId:previous;
  if(select&&[...select.options].some(o=>o.value===preferred)){select.value=preferred;target=preferred}
  if(select)select.disabled=!!current||!!progress;
 }
 const stats=$('#focus01-stats');if(stats)stats.innerHTML=summaryMarkup();
 const history=$('#focus01-history-content');if(history)history.innerHTML=historyMarkup();
 syncClock();soundUI();
}
function begin(){
 if(create())return;
 const panel=$('#panel-focus-pomodoro');if(!panel)return;
 const observer=new MutationObserver(()=>{if(create())observer.disconnect()});
 observer.observe(panel,{childList:true,subtree:true});
}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;if(ready)render();else create()})}
function watchTimer(){
 const el=$('#timer-display');
 if(!el||seenTimer===el)return;
 seenTimer=el;watcher?.disconnect();watcher=new MutationObserver(syncClock);watcher.observe(el,{subtree:true,characterData:true,childList:true});syncClock();
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('#focus01-room [data-focus01-toggle]');
 if(button){e.preventDefault();$('#timer-start')?.click();syncClock();return}
 const choice=e.target.closest('#focus01-room [data-focus01-mode]');
 if(choice){if(focus()||state().focusPlanProgress)return;mode=choice.dataset.focus01Mode;const input=$('#focus01-mode');if(input)input.value=mode;schedule();return}
 const sound=e.target.closest('#focus01-room [data-focus01-sound]');
 if(sound){
  const original=[...document.querySelectorAll('#focus-ambience [data-ambience-mode]')].find(x=>x.dataset.ambienceMode===sound.dataset.focus01Sound);
  if(original){original.click();soundUI()}return
 }
 const toggle=e.target.closest('#focus01-room [data-focus01-sound-toggle]');
 if(toggle){if(window.ElaraFocusAmbience?.playing)window.ElaraFocusAmbience.stop();else await window.ElaraFocusAmbience?.start?.().catch(()=>{});soundUI();return}
});
document.addEventListener('input',e=>{
 const slider=e.target.closest('#focus01-room [data-focus01-volume]');
 if(slider){const canonical=$('#focus-ambience [data-ambience-volume]');if(canonical){canonical.value=slider.value;canonical.dispatchEvent(new Event('input',{bubbles:true}))}soundUI()}
});
document.addEventListener('change',e=>{if(e.target.matches('#focus01-target'))target=e.target.value});
for(const ev of ['elara:state-committed','elara:data-changed','elara:locale-changed','elara:hydrate','elara:open'])window.addEventListener(ev,()=>{schedule();watchTimer()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{begin();watchTimer()},{once:true});else{begin();watchTimer()}
window.ElaraFocusRoomFOCUS01={refresh:schedule,syncClock};
})();