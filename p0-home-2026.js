/* Elara P0 2026-09-23: real Home structure, local search, topbar and navigation hardening. */
(()=>{'use strict';
const KEY='elara_space_v1',$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>Array.isArray(v)?v:[];
const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const fa=n=>Number(n||0).toLocaleString('fa-IR');
const icon=name=>window.ElaraIcons?.icon?.(name)||'<span class="elara-icon" aria-hidden="true"></span>';
const taskDone=(t,day=today())=>t?.recurrenceRule?arr(t.occurrenceDone).includes(day):!!t?.completed;
function recurrenceDue(t,day=today()){
  const r=t?.recurrenceRule;if(!r||!arr(r.weekdays).length)return false;
  const d=new Date(day+'T12:00:00');if(Number.isNaN(d.valueOf()))return false;
  if(r.startDate&&day<r.startDate||r.endDate&&day>r.endDate)return false;
  return r.weekdays.map(Number).includes(d.getDay())&&!arr(t.skippedDates).includes(day);
}
function activityDates(data=read()){
  const set=new Set();
  for(const h of arr(data.taskCompletionHistory))if(h?.date)set.add(h.date);
  for(const h of arr(data.habits))for(const d of arr(h?.days))set.add(d);
  return set;
}
function streak(data=read()){
  const active=activityDates(data),d=new Date();d.setHours(12,0,0,0);
  let key=iso(d);if(!active.has(key)){d.setDate(d.getDate()-1);key=iso(d)}
  let n=0;while(active.has(key)){n++;d.setDate(d.getDate()-1);key=iso(d)}return n;
}
function compactTasks(data=read()){
  const day=today();
  return arr(data.tasks).filter(t=>!taskDone(t,day)&&(t.date===day||recurrenceDue(t,day)||!t.date&&!t.recurrenceRule))
    .sort((a,b)=>Number(a.priority||4)-Number(b.priority||4)||(a.time||'99:99').localeCompare(b.time||'99:99')||Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,5);
}
function priority(t){const p=Math.max(1,Math.min(4,Number(t?.priority)||4));return `P${p}`}
function goalPct(g){const steps=arr(g?.steps);return steps.length?Math.round(steps.filter(s=>s?.done).length/steps.length*100):0}
function cardFor(id){return $(id)?.closest('.elara-card')||null}
function ensureCard(id,title,iconName,route){
  let host=$(id);if(host)return host.closest('.elara-card');
  const grid=$('panel-home')?.querySelector('.elara-dashboard-grid');if(!grid)return null;
  const card=document.createElement('section');card.className='elara-card p0-home-card';
  card.innerHTML=`<header><h2>${icon(iconName)} ${esc(title)}</h2><button type="button" class="elara-link" data-elara-tab="${route}">مشاهده همه</button></header><div id="${id}"></div>`;
  grid.append(card);return card;
}
function makeIndependentFocus(){
  const focus=cardFor('elara-home-focus'),tasks=cardFor('elara-home-tasks'),grid=$('panel-home')?.querySelector('.elara-dashboard-grid');
  if(!focus||!grid)return;
  if(tasks?.contains(focus)){focus.classList.remove('pass3-focus-subcard','pass2-inline-focus');grid.insertBefore(focus,tasks.nextSibling)}
  focus.classList.add('p0-focus-card');
}
function structure(){
  const panel=$('panel-home'),grid=panel?.querySelector('.elara-dashboard-grid');if(!panel||!grid)return;
  panel.classList.add('p0-home');
  makeIndependentFocus();
  const books=ensureCard('elara-home-books','کتابخانهٔ من','book','books');
  const order=['elara-home-tasks','elara-home-focus','elara-home-habits','elara-home-goals','elara-home-missions','elara-home-books','elara-home-ranks','elara-home-social'];
  for(const id of order){const card=cardFor(id);if(card){card.classList.add('p0-home-card','p0-'+id.replace('elara-home-',''));grid.append(card)}}
  for(const id of ['elara-home-activity','elara-home-freedom']){const card=cardFor(id);if(card)card.hidden=true}
  if(books)books.classList.add('p0-books');
}
function renderHero(){
  const hero=$('panel-home')?.querySelector('.elara-hero');if(!hero)return;
  let chip=$('p0-streak-chip');if(!chip){chip=document.createElement('span');chip.id='p0-streak-chip';chip.className='p0-streak-chip';hero.querySelector('.hero-copy')?.append(chip)}
  chip.innerHTML=`${icon('spark')}<b>${fa(streak())}</b><span>روز تداوم</span>`;
}
function renderTasks(){
  const host=$('elara-home-tasks');if(!host)return;const data=read(),items=compactTasks(data),day=today();
  const total=arr(data.tasks).filter(t=>t.date===day||recurrenceDue(t,day)).length;
  host.innerHTML=`<div class="p0-card-summary"><strong>${fa(items.length)} کار نزدیک</strong><small>${total?fa(total)+' مورد برای امروز':'کار زمان‌بندی‌شده‌ای برای امروز نیست'}</small></div>
  <div class="p0-task-list">${items.length?items.map(t=>`<div class="p0-task-row"><button type="button" class="p0-check" data-p0-task-toggle="${esc(t.id)}" aria-label="تکمیل ${esc(t.text||t.title||'تسک')}"></button><div><strong>${esc(t.text||t.title||'بدون عنوان')}</strong><small>${[t.time,t.folder,t.tag&&'#'+t.tag].filter(Boolean).map(esc).join(' · ')}</small></div><b class="p0-priority p${Number(t.priority)||4}">${priority(t)}</b></div>`).join(''):'<div class="p0-empty">برای امروز کاری ثبت نشده؛ یک قدم کوچک اضافه کن.</div>'}</div>
  <form class="p0-quick-task" data-p0-quick-task><input name="title" maxlength="180" autocomplete="off" placeholder="افزودن سریع تسک امروز…" aria-label="افزودن سریع تسک"><button type="submit" class="primary-button">+ افزودن</button></form>`;
}
function renderFocus(){
  const host=$('elara-home-focus');if(!host)return;
  const timer=$('timer-display')?.textContent||'25:00',status=$('focus-status')?.textContent||'آمادهٔ تمرکز';
  host.innerHTML=`<div class="p0-focus-wrap"><div class="p0-focus-copy"><span>${esc(status)}</span><strong id="p0-focus-timer">${esc(timer)}</strong></div><div class="p0-focus-actions"><button type="button" class="primary-button" data-p0-focus-toggle>${esc($('timer-start')?.textContent||'شروع')}</button><button type="button" class="quiet-button" data-approved-focus>جزئیات و تاریخچه</button></div></div>`;
}
function renderHabits(){
  const host=$('elara-home-habits');if(!host)return;const hs=arr(read().habits),day=today(),top=hs.slice(0,4),done=hs.filter(h=>arr(h.days).includes(day)).length,pct=hs.length?Math.round(done/hs.length*100):0;
  host.innerHTML=`<div class="p0-card-summary"><strong>${fa(done)} از ${fa(hs.length)}</strong><small>عادت انجام‌شده · ${fa(pct)}٪</small><span class="elara-track"><i style="width:${pct}%"></i></span></div>${top.length?`<div class="p0-compact-list">${top.map(h=>`<button type="button" class="p0-habit-row ${arr(h.days).includes(day)?'is-done':''}" data-p0-habit-toggle="${esc(h.id)}"><span>${arr(h.days).includes(day)?'✓':'○'}</span><strong>${esc(h.title||h.name||'عادت')}</strong></button>`).join('')}</div>`:'<div class="p0-empty">هنوز عادت شخصی ثبت نشده است.</div>'}<button type="button" class="quiet-button p0-add-link" data-elara-tab="habits">+ افزودن یا مدیریت عادت‌ها</button>`;
}
function renderGoals(){
  const host=$('elara-home-goals');if(!host)return;const gs=arr(read().goals).slice(0,4);
  host.innerHTML=gs.length?`<div class="p0-compact-list">${gs.map(g=>{const p=goalPct(g);return `<button type="button" class="p0-goal-row" data-elara-tab="goals"><div><strong>${esc(g.title||g.name||'هدف')}</strong><small>${fa(p)}٪ پیشرفت</small></div><span class="elara-track"><i style="width:${p}%"></i></span></button>`}).join('')}</div><button type="button" class="quiet-button p0-add-link" data-elara-tab="goals">+ افزودن یا مدیریت هدف‌ها</button>`:'<div class="p0-empty">هنوز هدفی ثبت نشده است.</div><button type="button" class="quiet-button p0-add-link" data-elara-tab="goals">+ اولین هدف</button>';
}
function renderMissions(){
  const host=$('elara-home-missions');if(!host)return;const ms=arr(window.ElaraMissions?.snapshot?.()).slice(0,3);
  host.innerHTML=ms.length?ms.map(m=>{const target=Math.max(1,Number(m.target)||1),amount=Math.min(Number(m.amount)||0,target),pct=Math.round(amount/target*100);return `<div class="p0-mission-row ${m.completed?'is-done':''}"><span>${icon('missions')}</span><div><strong>${esc(m.name||'مأموریت')}</strong><small>${esc(m.detail||'')} · ${fa(amount)} / ${fa(target)}</small><span class="elara-track"><i style="width:${pct}%"></i></span></div><b>+${fa(m.rewardXp)} XP</b></div>`}).join(''):'<div class="p0-empty">مأموریتی برای نمایش نیست.</div>';
}
function renderBooks(){
  const host=$('elara-home-books');if(!host)return;const books=arr(read().books),reading=books.filter(b=>b.shelf==='reading').slice(0,3);
  host.innerHTML=reading.length?`<div class="p0-book-list">${reading.map(b=>`<button type="button" data-elara-tab="books"><span>${icon('book')}</span><div><strong>${esc(b.title||'کتاب')}</strong><small>در حال مطالعه · درصد پیشرفت در داده‌های فعلی ثبت نمی‌شود</small></div></button>`).join('')}</div>`:'<div class="p0-empty">کتابی در قفسهٔ «در حال مطالعه» نیست.</div>';
}
function render(){structure();renderHero();renderTasks();renderFocus();renderHabits();renderGoals();renderMissions();renderBooks()}
const searchableRoutes=[['home','خانه','داشبورد'],['tasks','تسک‌ها','کارها'],['language','زبان','لایتنر واژه'],['books','کتابخانه','کتاب'],['exercise','ورزش','سلامت آب خواب تمرین'],['ranking','رنکینگ','رتبه'],['freedom','آزادی','ایده'],['reports','گزارش‌ها','گزارش'],['social','دوستان','دوست درخواست']];
function localSearch(q){
  const query=String(q||'').trim().toLocaleLowerCase();if(!query)return[];
  const data=read(),results=[];const add=(route,label,detail,searchText)=>{if(String(searchText||'').toLocaleLowerCase().includes(query))results.push({route,label,detail})};
  for(const [route,label,terms] of searchableRoutes)add(route,label,'بخش برنامه',label+' '+terms);
  for(const t of arr(data.tasks))add('tasks',t.text||t.title||'تسک','تسک',`${t.text||''} ${t.shortDescription||''} ${t.description||''} ${t.folder||''} ${t.tag||''}`);
  for(const h of arr(data.habits))add('habits',h.title||h.name||'عادت','عادت شخصی',h.title||h.name||'');
  for(const g of arr(data.goals))add('goals',g.title||g.name||'هدف','هدف',`${g.title||g.name||''} ${arr(g.steps).map(s=>s.text||'').join(' ')}`);
  for(const b of arr(data.books))add('books',b.title||'کتاب','کتابخانه',b.title||'');
  for(const w of arr(data.words))add('language',w.front||'واژه',w.back||'واژه',`${w.front||''} ${w.back||''}`);
  return results.slice(0,12);
}
function ensureSearch(){
  if($('p0-search-button'))return;const actions=document.querySelector('.topbar-actions');if(!actions)return;
  const btn=document.createElement('button');btn.id='p0-search-button';btn.type='button';btn.className='icon-button p0-search-button';btn.setAttribute('aria-label','جستجو');btn.innerHTML=icon('search');
  const panel=document.createElement('div');panel.id='p0-search-panel';panel.className='p0-search-panel';panel.hidden=true;
  panel.innerHTML=`<button type="button" class="p0-search-scrim" data-p0-search-close aria-label="بستن جستجو"></button><section class="p0-search-box" role="search"><header><strong>جستجو در Elara</strong><button type="button" class="quiet-button" data-p0-search-close>بستن</button></header><div class="p0-search-field">${icon('search')}<input id="p0-search-input" type="search" autocomplete="off" enterkeyhint="search" placeholder="تسک، عادت، هدف، کتاب، واژه یا بخش…"><button type="button" data-p0-search-clear aria-label="پاک کردن">×</button></div><div id="p0-search-results" class="p0-search-results"><p class="muted">جستجو روی داده‌های محلی و بخش‌های موجود برنامه انجام می‌شود. جستجوی کاربران از این پنل انجام نمی‌شود.</p></div></section>`;
  document.body.append(panel);actions.prepend(btn);const input=$('p0-search-input'),results=$('p0-search-results');
  const draw=()=>{const rows=localSearch(input.value);results.innerHTML=input.value.trim()?(rows.length?rows.map((r,i)=>`<button type="button" data-p0-search-route="${r.route}" data-p0-search-index="${i}"><strong>${esc(r.label)}</strong><small>${esc(r.detail)}</small></button>`).join(''):'<p class="muted">نتیجه‌ای پیدا نشد.</p>'):'<p class="muted">جستجو روی داده‌های محلی و بخش‌های موجود برنامه انجام می‌شود. جستجوی کاربران از این پنل انجام نمی‌شود.</p>'};
  const open=()=>{panel.hidden=false;document.body.classList.add('p0-search-open');setTimeout(()=>input.focus({preventScroll:true}),0);draw()};const close=()=>{panel.hidden=true;document.body.classList.remove('p0-search-open');btn.focus({preventScroll:true})};
  btn.addEventListener('click',open);panel.addEventListener('click',e=>{if(e.target.closest('[data-p0-search-close]')){close();return}if(e.target.closest('[data-p0-search-clear]')){input.value='';draw();input.focus();return}const hit=e.target.closest('[data-p0-search-route]');if(hit){const q=input.value.trim(),route=hit.dataset.p0SearchRoute;close();window.ElaraOpen?.(route);if(route==='tasks'&&q)setTimeout(()=>{const field=$('task-search');if(field){field.value=q;field.dispatchEvent(new Event('input',{bubbles:true}))}},0)}});input.addEventListener('input',draw);input.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='Enter'){e.preventDefault();results.querySelector('[data-p0-search-route]')?.click()}});
}
function cleanTopbar(){
  document.querySelectorAll('.elara-lang-shortcut,.elara-mode-shortcut').forEach(x=>x.remove());
  const leading=document.querySelector('.topbar-leading');if(leading&&!leading.querySelector('.p0-brand-lockup')){const lock=document.createElement('span');lock.className='p0-brand-lockup';lock.innerHTML='<img src="assets/logo.svg" alt="" width="28" height="28"><b>Elara</b>';leading.prepend(lock);lock.querySelector('img')?.addEventListener('error',e=>{e.currentTarget.hidden=true;lock.classList.add('asset-fallback')},{once:true})}
}
function handleActions(e){
  const t=e.target.closest('[data-p0-task-toggle]');if(t){document.querySelector(`#task-list [data-action="toggle-task"][data-id="${CSS.escape(t.dataset.p0TaskToggle)}"]`)?.click();return}
  const h=e.target.closest('[data-p0-habit-toggle]');if(h){document.querySelector(`#habit-list [data-action="toggle-habit"][data-id="${CSS.escape(h.dataset.p0HabitToggle)}"]`)?.click();return}
  if(e.target.closest('[data-p0-focus-toggle]')){$('timer-start')?.click();setTimeout(renderFocus,0)}
}
function quickTask(e){const form=e.target.closest('[data-p0-quick-task]');if(!form)return;e.preventDefault();const title=form.elements.title.value.trim();if(!title)return;const titleField=$('task-title'),due=$('task-due'),priority=$('task-priority'),taskForm=$('task-form');if(!titleField||!taskForm)return;titleField.value=title;if(due)due.value=today();if(priority)priority.value='4';taskForm.requestSubmit();form.reset();setTimeout(render,0)}
function watchTimer(){const timer=$('timer-display');if(!timer)return;new MutationObserver(()=>{const mirror=$('p0-focus-timer');if(mirror)mirror.textContent=timer.textContent||'25:00'}).observe(timer,{childList:true,subtree:true,characterData:true})}
function init(){cleanTopbar();ensureSearch();render();watchTimer();document.addEventListener('click',handleActions);document.addEventListener('submit',quickTask);for(const name of ['elara:data-changed','elara:hydrate','elara:account-ready','elara:social-updated','elara:open'])window.addEventListener(name,()=>requestAnimationFrame(render));window.addEventListener('storage',()=>requestAnimationFrame(render));setTimeout(cleanTopbar,250);setTimeout(cleanTopbar,1000)}
window.ElaraP0HomeTest={streak,compactTasks,recurrenceDue,localSearch,activityDates};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();