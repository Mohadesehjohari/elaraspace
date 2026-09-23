/* Elara Visual Fidelity Pass 3: reference-match composition using existing data/services only. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>window.ElaraIcons?.icon?.(name)||'<span class="elara-icon" aria-hidden="true"></span>';
const read=()=>{try{const v=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const arr=v=>Array.isArray(v)?v:[];
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const fmt=n=>Number(n||0).toLocaleString('fa-IR',{maximumFractionDigits:1});
const taskDone=(x,day=today())=>x?.recurrenceRule?arr(x.occurrenceDone).includes(day):!!x?.completed;
const goalPct=x=>{const steps=arr(x?.steps);return steps.length?Math.round(steps.filter(s=>s?.done).length/steps.length*100):0};
const habitPct=(x,day=today())=>arr(x?.days).includes(day)?100:0;
function activityDates(data=read()){const set=new Set();for(const h of arr(data.taskCompletionHistory))if(h?.date)set.add(h.date);for(const h of arr(data.habits))for(const d of arr(h?.days))set.add(d);return set}
function streakCount(data=read()){const active=activityDates(data),d=new Date();d.setHours(12,0,0,0);let key=iso(d);if(!active.has(key)){d.setDate(d.getDate()-1);key=iso(d)}let count=0;while(active.has(key)){count++;d.setDate(d.getDate()-1);key=iso(d)}return count}
const priority=n=>{const p=Math.min(4,Math.max(1,Number(n)||4));return {n:p,label:'P'+p,cls:'p'+p}};
const HOME_ORDER=['elara-home-tasks','elara-home-habits','elara-home-missions','elara-home-goals','elara-home-ranks','elara-home-social','elara-home-activity','elara-home-freedom'];
function metaTask(x){return [x?.dueDate||x?.date,x?.dueTime||x?.time,x?.folder,arr(x?.tags).slice(0,2).map(t=>'#'+t).join(' ')].filter(Boolean).join(' · ')}
function homeModel(data=read()){
 const day=today(),tasks=arr(data.tasks),habits=arr(data.habits),goals=arr(data.goals),missions=window.ElaraMissions?.snapshot?.()||[];
 return {day,tasks:tasks.slice(0,6),habits:habits.slice(0,5),goals:goals.slice(0,5),missions:arr(missions).slice(0,3)};
}
function journalRows(){
 const id=uid();if(!id)return[];try{const rows=JSON.parse(localStorage.getItem('elara_language_journal_v1_'+id)||'[]');return arr(rows).filter(r=>r&&typeof r.date==='string'&&Number.isFinite(Number(r.minutes))&&Number(r.minutes)>=0)}catch{return[]}
}
function journalSeries(){
 const rows=journalRows(),dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);return iso(d)});
 return dates.map(date=>({date,minutes:rows.filter(r=>r.date===date).reduce((n,r)=>n+Number(r.minutes||0),0)}));
}
function ensureFocusInsideTasks(){
 const taskCard=$('elara-home-tasks')?.closest('.elara-card'),focusCard=$('elara-home-focus')?.closest('.elara-card');
 if(taskCard&&focusCard&&taskCard!==focusCard&&!taskCard.contains(focusCard)){focusCard.classList.add('pass3-focus-subcard');taskCard.append(focusCard)}
 if(focusCard)focusCard.classList.add('pass3-focus-subcard');
}
function taskRow(x){
 const p=priority(x.priority),done=taskDone(x),meta=metaTask(x);
 return `<button type="button" class="pass3-task-row ${done?'is-done':''}" data-elara-tab="tasks"><span class="pass3-task-check" aria-hidden="true">${done?icon('check'):'<i></i>'}</span><span class="pass3-task-copy"><strong>${esc(x.text||x.title||'بدون عنوان')}</strong>${meta?`<small>${esc(meta)}</small>`:''}</span><b class="pass3-priority ${p.cls}">${p.label}</b></button>`;
}
function renderHome(){
 const panel=$('panel-home'),grid=panel?.querySelector('.elara-dashboard-grid');if(!panel||!grid)return;
 panel.classList.add('pass3-home');
 const hero=panel.querySelector('.elara-hero');if(hero){hero.classList.add('pass3-home-hero');const kicker=hero.querySelector('.elara-kicker');if(kicker)kicker.textContent='ELARA · YOUR PERSONAL COSMOS';const copy=hero.querySelector('.hero-copy>p:not(.elara-kicker)');if(copy)copy.textContent='امروز فقط یک قدم روشن بردار؛ بقیهٔ مسیر خودش شکل می‌گیرد.'}
 ensureFocusInsideTasks();
 for(const id of HOME_ORDER){const card=$(id)?.closest('.elara-card');if(card)grid.append(card)}
 const model=homeModel(),tasksHost=$('elara-home-tasks'),stats=$('elara-stats');if(stats?.firstElementChild?.querySelector('strong'))stats.firstElementChild.querySelector('strong').textContent=fmt(streakCount());
 if(tasksHost){tasksHost.innerHTML=model.tasks.length?model.tasks.map(taskRow).join(''):'<div class="pass3-empty-state">برای امروز کاری ثبت نشده؛ از صفحهٔ تسک‌ها یک قدم کوچک اضافه کن.</div>';tasksHost.closest('.elara-card')?.classList.add('pass3-primary-card','pass3-tasks-card')}
 const habits=$('elara-home-habits');
 if(habits){
   const wellness=[...habits.querySelectorAll('[data-wellness-home]')];
   habits.querySelectorAll('[data-wellness-home]').forEach(x=>x.remove());
   const done=model.habits.filter(h=>habitPct(h)===100).length,total=model.habits.length,pct=total?Math.round(done/total*100):0;
   habits.innerHTML=`<div class="pass3-card-progress"><span><strong>${fmt(done)} از ${fmt(total)}</strong><small>عادت انجام‌شده</small></span><b>${fmt(pct)}٪</b><span class="elara-track"><i style="width:${pct}%"></i></span></div>`+(model.habits.length?model.habits.map((h,i)=>`<div class="pass3-habit-row" data-pass3-habit><span>${icon(['book','workout','habits','goals','spark'][i%5])}</span><div><strong>${esc(h.title||h.name||'عادت')}</strong><span class="elara-track"><i style="width:${habitPct(h)}%"></i></span></div><b>${fmt(habitPct(h))}٪</b></div>`).join(''):'<div class="pass3-empty-state">هنوز عادت شخصی ثبت نشده است.</div>');
   wellness.forEach(x=>habits.append(x));habits.closest('.elara-card')?.classList.add('pass3-primary-card','pass3-habits-card');
 }
 const missions=$('elara-home-missions');
 if(missions){missions.innerHTML=model.missions.length?model.missions.map(m=>{const amount=Math.min(Number(m.amount)||0,Number(m.target)||0),target=Math.max(1,Number(m.target)||1),pct=Math.round(amount/target*100);return `<div class="pass3-mission-row ${m.completed?'is-done':''}"><span>${icon('missions')}</span><div><strong>${esc(m.name||'مأموریت')}</strong><small>${fmt(amount)} / ${fmt(target)}</small><span class="elara-track"><i style="width:${pct}%"></i></span></div><b>+${fmt(m.rewardXp||0)} XP${m.claimed?' · دریافت‌شده':''}</b></div>`}).join(''):'<div class="pass3-empty-state">مأموریت فعالی برای نمایش نیست.</div>';missions.closest('.elara-card')?.classList.add('pass3-compact-card','pass3-missions-card')}
 const goals=$('elara-home-goals');
 if(goals){goals.innerHTML=model.goals.length?model.goals.map(g=>{const pct=goalPct(g);return `<div class="pass3-goal-row"><span>${icon('goals')}</span><div><strong>${esc(g.title||g.name||'هدف')}</strong><span class="elara-track"><i style="width:${pct}%"></i></span></div><b>${fmt(pct)}٪</b></div>`}).join(''):'<div class="pass3-empty-state">هنوز هدفی ثبت نشده است.</div>';goals.closest('.elara-card')?.classList.add('pass3-compact-card','pass3-goals-card')}
 for(const [id,cls] of [['elara-home-ranks','pass3-ranking-home'],['elara-home-social','pass3-friends-home'],['elara-home-activity','pass3-secondary-card'],['elara-home-freedom','pass3-secondary-card']])$(id)?.closest('.elara-card')?.classList.add(cls);
 const focus=$('elara-home-focus');if(focus){const timer=focus.querySelector('#elara-mirror-timer');if(timer)timer.closest('.elara-focus-ring')?.classList.add('pass3-focus-timer');const cta=focus.querySelector('[data-elara-tab="focus"],[data-approved-focus]');if(cta){cta.classList.add('pass3-focus-cta');cta.textContent='شروع تمرکز'}}
}
function renderLanguageChart(){
 const host=$('pass3-language-chart');if(!host)return;const series=journalSeries(),max=Math.max(1,...series.map(x=>x.minutes));
 if(!series.some(x=>x.minutes>0)){host.innerHTML='<div class="pass3-empty-state">هنوز گزارش مطالعه‌ای برای نمودار ثبت نشده است.</div>';return}
 host.innerHTML=`<div class="pass3-mini-chart">${series.map(x=>`<div title="${esc(x.date)} · ${fmt(x.minutes)} دقیقه"><i style="height:${Math.max(4,Math.round(x.minutes/max*100))}%"></i><small>${new Date(x.date+'T12:00:00').toLocaleDateString('fa-IR',{weekday:'narrow'})}</small></div>`).join('')}</div>`;
}
function renderLanguage(){
 const panel=$('panel-language');if(!panel)return;panel.classList.add('pass3-language');
 const hero=panel.querySelector('.elara-language-hero');hero?.classList.add('pass3-language-hero');
 const cards=[...panel.querySelectorAll('.approved-language-grid>.elara-card')];cards.forEach((c,i)=>c.dataset.languageBlock=['leitner','books','report','courses'][i]||'extra');
 const courses=cards.find(c=>c.dataset.languageBlock==='courses');courses?.classList.add('pass3-course-card');
 renderLanguageChart();
}
function socialPolish(){
 $('elara-ranking-page')?.classList.add('pass3-ranking-page');$('elara-social-page')?.classList.add('pass3-social-page');
 const homeRanks=$('elara-home-ranks');if(homeRanks)homeRanks.querySelectorAll('.elara-rank-line').forEach((r,i)=>r.classList.add('pass3-rank-line',i<3?'is-top-'+(i+1):''));
}
function apply(){renderHome();renderLanguage();socialPolish()}
function setup(){
 apply();
 document.addEventListener('click',e=>{if(e.target.closest('[data-wellness-home]')){e.preventDefault();window.ElaraOpen?.('exercise')}} ,true);
 for(const name of ['elara:open','elara:data-changed','elara:hydrate','elara:social-updated','elara:language-rendered','elara:account-ready','elara:privacy-local-changed'])window.addEventListener(name,()=>setTimeout(apply,0));
}
window.ElaraVisualPass3Test={taskDone,goalPct,habitPct,priority,metaTask,homeModel,journalSeries,ensureFocusInsideTasks,activityDates,streakCount,HOME_ORDER};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();