/* FOCUS-03: reference-faithful setup. Presentation only; canonical timer stays in phase2.js. */
(()=>{'use strict';
const panel=()=>document.getElementById('panel-focus-pomodoro');
const $=s=>document.querySelector(s);
const tr=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||fa;
const read=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return {}}};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):min));
let ready=false;
function addMarkup(){
 const p=panel(),card=p?.querySelector(':scope > .focus-card');
 if(!card||!document.getElementById('timer-display'))return false;
 if(!card.querySelector(':scope > .focus-config'))return false;
 if(!card.querySelector(':scope > .focus-ref-side')){
  const aside=document.createElement('aside');aside.className='focus-ref-side';
  aside.innerHTML='<section class="focus-ref-glass focus-ref-stats"><header><h2>✦ '+tr('آمار امروز','Today’s stats')+'</h2></header><div class="focus-ref-stats-body"><div class="focus-ref-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div><strong data-focus-completed>۰</strong><small>'+tr('جلسه تکمیل‌شده','sessions completed')+'</small></div></div><dl><div><dt>◷ '+tr('زمان تمرکز','Focus time')+'</dt><dd data-focus-minutes>۰</dd></div><div><dt>▤ '+tr('جلسه‌ها','Sessions')+'</dt><dd data-focus-session-number>۰</dd></div><div><dt>◎ '+tr('میانگین هر جلسه','Average session')+'</dt><dd data-focus-average>—</dd></div></dl></div></section><section class="focus-ref-glass focus-ref-task"><header><h2>▣ '+tr('کار فعلی','Current task')+'</h2></header><label for="focus-ref-task-select">'+tr('از تسک‌های واقعی خود انتخاب کن','Choose from your real tasks')+'</label><select id="focus-ref-task-select" aria-label="'+tr('کار فعلی','Current task')+'"><option value="">'+tr('هنوز کاری انتخاب نشده','No task selected')+'</option></select><p class="focus-ref-task-name" data-focus-task-name>'+tr('برای این جلسه هنوز کاری انتخاب نشده است.','No task selected for this session.')+'</p><button type="button" class="focus-ref-task-open" data-feature-route="tasks">'+tr('مدیریت تسک‌ها','Manage tasks')+' ↗</button></section>';
  card.append(aside);
 }
 const settings=card.querySelector(':scope > .focus-config');
 if(settings&&!settings.querySelector('.focus-ref-settings-title')){
  const title=document.createElement('h2');title.className='focus-ref-settings-title';title.textContent='⚙ '+tr('تنظیمات پومودورو','Pomodoro settings');settings.prepend(title);
 }
 const modes=p.querySelector(':scope > .elara-focus-mode-options');
 if(modes&&modes.parentElement!==card)card.append(modes);
 const hint=card.querySelector(':scope > .muted');
 if(hint)hint.classList.add('focus-ref-hint');
 if(!p.querySelector(':scope > .focus-ref-bottom')){
  const bottom=document.createElement('div');bottom.className='focus-ref-bottom';
  const ambience=document.createElement('section');ambience.className='focus-ref-glass focus-ref-ambience';
  ambience.innerHTML='<header><h2>♫ '+tr('صداهای محیط','Ambient sounds')+'</h2><button type="button" data-feature-route="focus-ambience">'+tr('مشاهده همه','View all')+' ←</button></header><div class="focus-ref-ambience-main"><img src="assets/ui/04-study-music-ambience-icon.webp" alt="" width="96" height="96" loading="lazy"><div><strong>'+tr('فضای آرام مطالعه','Calm study ambience')+'</strong><small>'+tr('صداها و فضای تمرکز را از بخش محیط انتخاب کن','Choose your atmosphere in the ambience room')+'</small></div></div><button class="focus-ref-ambience-link" type="button" data-feature-route="focus-ambience">'+tr('ورود به صداهای محیط','Open ambience')+' ↗</button>';
  const history=p.querySelector(':scope > .focus-history-card');
  const goals=document.createElement('section');goals.className='focus-ref-glass focus-ref-goals';
  goals.innerHTML='<header><h2>◎ '+tr('هدف جلسه','Session goal')+'</h2></header><div class="focus-ref-goal-reading"><strong data-focus-goal-caption>۰ / ۱</strong><span>'+tr('جلسات تکمیل‌شده امروز از تعداد تنظیم‌شده','Today’s completions vs selected session count')+'</span></div><div class="focus-ref-goal-track"><span data-focus-goal-bar></span></div><p>'+tr('با شروع جلسه، پیشرفت از داده‌های واقعی محاسبه می‌شود.','Progress comes from your real session history.')+'</p>';
  bottom.append(ambience);if(history)bottom.append(history);bottom.append(goals);p.append(bottom);
 }
 p.dataset.focusRefReady='true';ready=true;return true;
}
function updateTasks(s){
 const select=$('#focus-ref-task-select');if(!select)return;
 const tasks=Array.isArray(s.tasks)?s.tasks.filter(t=>t&&t.id&&t.text&&!t.completed).slice(0,80):[];
 const signature=tasks.map(t=>String(t.id)+':'+t.text).join('|');
 if(select.dataset.signature!==signature){
  const current=select.value||localStorage.getItem('elara_focus_current_task_id')||'';
  select.replaceChildren(new Option(tr('هنوز کاری انتخاب نشده','No task selected'),''));
  for(const task of tasks)select.add(new Option(String(task.text).slice(0,90),String(task.id)));
  select.dataset.signature=signature;select.value=tasks.some(t=>String(t.id)===current)?current:'';
 }
 const selected=tasks.find(t=>String(t.id)===select.value);
 const txt=$('[data-focus-task-name]');
 if(txt)txt.textContent=selected?String(selected.text):tr('برای این جلسه هنوز کاری انتخاب نشده است.','No task selected for this session.');
}
function update(){
 const p=panel();if(!p||!ready)return;
 const s=read(),active=s.activeFocus;
 const play=$('#timer-start');if(play){
  play.dataset.focusRunning=String(active?.status==='running');
  play.setAttribute('aria-label',active?.status==='running'?tr('مکث تایمر','Pause timer'):active?.status==='paused'?tr('ادامه تایمر','Resume timer'):tr('شروع جلسه تمرکز','Start focus session'));
  play.setAttribute('title',play.getAttribute('aria-label'));
 }
 const timer=$('#timer-display');
 if(timer){
  let fraction=0;
  if(active){
   const sec=active.status==='running'?Math.max(0,(Number(active.endAt)-Date.now())/1000):Math.max(0,Number(active.remainingSec)||0);
   const total=clamp(active.durationMin,1,180)*60;
   fraction=Math.max(0,Math.min(1,1-sec/total));
  }
  timer.style.setProperty('--focus-elapsed',fraction.toFixed(5));
 }
 const rows=Array.isArray(s.focusSessions)?s.focusSessions.filter(x=>x?.completed&&Number.isFinite(Number(x.endedAt))&&new Date(Number(x.endedAt)).toDateString()===new Date().toDateString()):[];
 const minutes=rows.reduce((sum,x)=>sum+clamp(x.durationMin,0,180),0),count=rows.length;
 const lang=document.documentElement.lang?.startsWith('en')?'en-US':'fa-IR';
 const num=n=>Math.round(n).toLocaleString(lang);
 const goal=clamp(active?.sessionCount||s.focusPlanProgress?.sessionCount||$('#focus-session-count')?.value||1,1,8);
 const percentage=Math.max(0,Math.min(100,Math.round(count/goal*100)));
 const set=(sel,value)=>{const el=$(sel);if(el&&el.textContent!==value)el.textContent=value};
 set('[data-focus-completed]',num(count));set('[data-focus-minutes]',num(minutes)+' '+tr('دقیقه','min'));set('[data-focus-session-number]',num(count));
 set('[data-focus-average]',count?num(minutes/count)+' '+tr('دقیقه','min'):'—');
 const progress=$('.focus-ref-progress');if(progress){progress.style.setProperty('--focus-today-progress',percentage+'%');progress.setAttribute('aria-valuenow',String(percentage))}
 set('[data-focus-goal-caption]',num(count)+' / '+num(goal));
 const goalBar=$('[data-focus-goal-bar]');if(goalBar)goalBar.style.width=percentage+'%';
 updateTasks(s);
}
function init(){
 if(!addMarkup())return;
 update();
}
document.addEventListener('change',e=>{
 if(e.target?.id==='focus-ref-task-select'){localStorage.setItem('elara_focus_current_task_id',e.target.value);update();return}
 if(e.target?.id==='focus-session-count')update();
});
document.addEventListener('click',e=>{
 const button=e.target.closest('#panel-focus-pomodoro .focus-ref-task-open,#panel-focus-pomodoro [data-feature-route="focus-ambience"]');
 if(button){e.preventDefault();window.ElaraOpen?.(button.dataset.featureRoute,{history:'push'})}
},true);
for(const ev of ['elara:state-committed','elara:data-changed','elara:hydrate','elara:locale-changed','elara:open'])
 window.addEventListener(ev,()=>setTimeout(init,0));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
new MutationObserver(()=>{
 const p=panel();
 if(p&&!p.dataset.focusRefReady&&p.querySelector(':scope > .focus-card > .focus-config'))init();
 else if(p&&p.querySelector(':scope > .elara-focus-mode-options'))init();
}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(!panel()?.classList.contains('hidden'))update()},1000);
window.ElaraFocusReference03={refresh:init};
})();
