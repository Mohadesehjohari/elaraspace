/* Reference composition checkpoint 2026-09-23. Reuses existing data, routes and timer. */
(()=>{'use strict';
const $=id=>document.getElementById(id),icon=n=>window.ElaraIcons?.icon?.(n)||'<span class="elara-icon" aria-hidden="true"></span>';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>Array.isArray(v)?v:[];
const read=()=>{try{const d=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return d&&typeof d==='object'?d:{}}catch{return{}}};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date()),fa=v=>Number(v||0).toLocaleString('fa-IR');
const card=id=>$(id)?.closest('.elara-card');
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
const UI_ASSETS={hero:'assets/ui/hero-landscape.webp',mission:'assets/ui/missions-rocket.webp',flame:'assets/ui/streak-flame.webp',friends:'assets/ui/friends-tab.webp',friendsGroup:'assets/ui/friends-group-icon.webp',tasks:'assets/ui/nav-tasks-default.webp',taskCheck:'assets/ui/icon-tasks-check-alpha.webp',habits:'assets/ui/icon-habits-sprout.webp',wellness:'assets/ui/icon-wellness-heartbeat.webp',water:'assets/ui/icon-wellness-water.webp',exercise:'assets/ui/icon-exercise-running-shoe.webp',sleep:'assets/ui/icon-night-crescent-moon.webp',library:'assets/ui/icon-library-open-book.webp',freedom:'assets/ui/icon-freedom-lotus.webp',ranking:'assets/ui/icon-ranking-trophy.webp',themeDefault:'assets/ui/icon-mode-night-default.webp',themeActive:'assets/ui/icon-mode-night-active.webp',notificationRead:'assets/ui/icon-notifications-read.webp',notificationUnread:'assets/ui/icon-notifications-unread.webp',brandWordmark:'assets/ui/brand-elara-wordmark.webp',achievement:'assets/ui/icon-reward-star.webp',banner:'assets/ui/banner-running-moonlit-mountains.webp',viewAll:'assets/ui/button-view-all.webp'};

const habitArt=h=>/آب|water/i.test(h.title)?UI_ASSETS.water:/خواب|sleep/i.test(h.title)?UI_ASSETS.sleep:/ورزش|تمرین|exercise/i.test(h.title)?UI_ASSETS.exercise:/مدیتیشن|آرامش|meditat/i.test(h.title)?UI_ASSETS.freedom:/مطالعه|کتاب|read/i.test(h.title)?UI_ASSETS.library:UI_ASSETS.habits;
const art=(src,cls,alt='')=>`<img class="${cls}" src="${src}" alt="${esc(alt)}" decoding="async" loading="eager">`;
function syncThemeArtwork(theme=$('theme-toggle')){
 if(!theme)return;const active=darkModeActive(),src=active?UI_ASSETS.themeActive:UI_ASSETS.themeDefault;
 let img=theme.querySelector('.ref-theme-art');if(!img){theme.innerHTML=art(src,'ref-header-art ref-theme-art','');img=theme.querySelector('.ref-theme-art')}
 if(img&&img.getAttribute('src')!==src)img.setAttribute('src',src);
 theme.dataset.elaraThemeArtwork=active?'active':'default';
}
function installViewAllArtwork(){
 const specs=[
  ['.ref-tasks','tasks','مشاهده همهٔ تسک‌ها'],
  ['.ref-habits','habits','مشاهده همهٔ عادت‌ها'],
  ['.ref-wellness-card','exercise','مشاهده همهٔ سلامت و ورزش'],
  ['.ref-goals','goals','مشاهده همهٔ هدف‌ها'],
  ['.ref-ranks','ranking','مشاهده همهٔ رنکینگ'],
  ['.ref-missions','missions','مشاهده همهٔ مأموریت‌ها'],
  ['.ref-theme-strip','appearance','مشاهده همهٔ تم‌ها']
 ];
 for(const [selector,route,label] of specs){
  const root=document.querySelector('#panel-home '+selector);if(!root)continue;const header=root.querySelector(':scope > header');if(!header)continue;
  let button=[...header.querySelectorAll('button')].find(b=>b.classList.contains('ref-view-all-button')||b.matches('[data-drawer-appearance]')||/(همه|مشاهده)/.test((b.getAttribute('aria-label')||b.textContent||'').trim()));
  if(!button){button=document.createElement('button');button.type='button';header.append(button);if(route==='appearance')button.dataset.drawerAppearance='1';else button.dataset.elaraTab=route}
  button.setAttribute('aria-label',button.getAttribute('aria-label')||label);button.classList.add('ref-view-all-button');button.dataset.viewAllArtwork='uploaded';
  if(!button.querySelector('.ref-view-all-art'))button.innerHTML=art(UI_ASSETS.viewAll,'ref-view-all-art','');
 }
}
const NOTIF='elara_notifications_v1';
function unreadNotifications(){try{return arr(JSON.parse(localStorage.getItem(NOTIF)||'[]')).filter(x=>x&&(x.unread===true||x.read===false||x.status==='unread')).length}catch{return 0}}
const darkModeActive=()=>document.body.classList.contains('dark')||document.body.classList.contains('amoled');
const isMobile=()=>matchMedia('(max-width:700px)').matches;
const selected=()=>window.ElaraHomeDay||today();
const done=(t,d=selected())=>t?.recurrenceRule?arr(t.occurrenceDone).includes(d):!!t?.completed;
const due=(t,d=selected())=>window.ElaraSchedule.taskDue(t,d);
function activityDates(){const s=read(),dates=new Set();for(const row of arr(s.taskCompletionHistory))if(row?.date)dates.add(row.date);for(const h of arr(s.habits))for(const d of arr(h.days))dates.add(d);return dates}
function streak(){const dates=activityDates(),d=new Date();d.setHours(12,0,0,0);if(!dates.has(iso(d)))d.setDate(d.getDate()-1);let n=0;while(dates.has(iso(d))){n++;d.setDate(d.getDate()-1)}return n}

function localSearch(q){
 const query=String(q||'').trim().toLocaleLowerCase();if(!query)return[];
 const data=read(),results=[];const add=(route,label,detail,searchText)=>{if(String(searchText||'').toLocaleLowerCase().includes(query))results.push({route,label,detail})};
 const routes=[['home','خانه','داشبورد'],['tasks','تسک‌ها','کارها'],['language','زبان','واژه لایتنر'],['books','کتابخانه','کتاب'],['exercise','ورزش','سلامت آب خواب تمرین'],['ranking','رنکینگ','رتبه'],['freedom','آزادی','ایده'],['reports','گزارش‌ها','گزارش'],['social','دوستان','دوست درخواست']];
 for(const [route,label,terms] of routes)add(route,label,'بخش برنامه',label+' '+terms);
 for(const t of arr(data.tasks))add('tasks',t.text||t.title||'تسک','تسک',`${t.text||''} ${t.shortDescription||''} ${t.description||''} ${t.folder||''} ${t.tag||''}`);
 for(const h of arr(data.habits))add('habits',h.title||h.name||'عادت','عادت شخصی',h.title||h.name||'');
 for(const g of arr(data.goals))add('goals',g.title||g.name||'هدف','هدف',`${g.title||g.name||''} ${arr(g.steps).map(s=>s.text||'').join(' ')}`);
 for(const b of arr(data.books))add('books',b.title||'کتاب','کتابخانه',b.title||'');
 for(const w of arr(data.words))add('language',w.front||'واژه',w.back||'واژه',`${w.front||''} ${w.back||''}`);
 return results.slice(0,12);
}

function element(tag,cls,id){const e=document.createElement(tag);e.className=cls;if(id)e.id=id;return e}
function ownHeading(root,key,html){
 const h=root?.querySelector(':scope > header h2');if(!h)return;
 if(h.dataset.refHeadingOwner===key)return;
 h.innerHTML=html;h.dataset.refHeadingOwner=key;
}
function homeStructure(){
 const panel=$('panel-home'),grid=panel?.querySelector('.elara-dashboard-grid');if(!panel||!grid)return;
 panel.classList.add('ref-home');grid.classList.add('ref-home-grid');const firstStructure=!grid.dataset.structureReady;grid.dataset.structureReady='true';
 for(const id of ['elara-home-focus','elara-home-books','elara-home-freedom']){const c=card(id);if(c)c.hidden=true}
 const tasks=card('elara-home-tasks'),habits=card('elara-home-habits'),missions=card('elara-home-missions'),goals=card('elara-home-goals'),ranks=card('elara-home-ranks'),activity=card('elara-home-activity'),social=card('elara-home-social');
 let wellness=$('ref-wellness-card');if(!wellness){wellness=element('section','elara-card ref-card ref-wellness-card','ref-wellness-card');wellness.innerHTML=`<header><h2>${art(UI_ASSETS.wellness,'elara-card-art ref-wellness-heading-art','')} سلامت / ورزش</h2><button type="button" class="elara-link" data-elara-tab="exercise">همه ←</button></header><div id="ref-wellness-data"></div>`}
 let side=$('ref-right-stack');
 let theme=$('ref-theme-strip');if(!theme){theme=element('section','elara-card ref-theme-strip','ref-theme-strip');theme.innerHTML=`<header><h2>${icon('spark')} جهان‌های تم</h2><button type="button" class="elara-link" data-drawer-appearance>مشاهده همه ←</button></header><div class="ref-theme-options">${['violet','blue','pink','green','orange','black'].map((c,i)=>`<button type="button" class="ref-theme-option" data-ref-theme="${c}" aria-label="انتخاب تم ${['یاسی','آبی','صورتی','سبز','نارنجی','تیره'][i]}"><i></i><small>${['یاسی','آبی','صورتی','سبز','نارنجی','تیره'][i]}</small></button>`).join('')}</div>`}
 for(const c of [tasks,habits,wellness,missions,goals,ranks,activity])if(c){c.hidden=false;grid.append(c)}
 side?.remove();
 if(social){social.hidden=true;grid.append(social)}
 grid.append(theme);
 // Reassert the exact named-area DOM contract on every reference render. Old visual passes may
 // mutate the tree after first boot; the reference owner must repair that without rebuilding cards.
 for(const c of [tasks,habits,wellness,missions,goals,ranks,activity,theme])if(c&&c.parentElement!==grid)grid.append(c);
 const extra=card('elara-home-books');if(extra){extra.hidden=true;grid.append(extra)}
 for(const [c,name] of [[tasks,'tasks'],[habits,'habits'],[missions,'missions'],[goals,'goals'],[ranks,'ranks'],[activity,'activity']])if(c){c.classList.add('ref-card','ref-'+name)}
 ownHeading(tasks,'tasks',`${art(UI_ASSETS.tasks,'elara-card-art ref-tasks-heading-art','')} کارهای امروز`);
 ownHeading(habits,'habits',`${art(UI_ASSETS.habits,'elara-card-art ref-habits-heading-art','')} عادت‌های امروز`);
 ownHeading(wellness,'wellness',`${art(UI_ASSETS.wellness,'elara-card-art ref-wellness-heading-art','')} سلامت / ورزش`);
 ownHeading(missions,'missions',`${art(UI_ASSETS.mission,'ref-art-icon ref-missions-art','')} مأموریت‌های امروز`);
 ownHeading(goals,'goals',`${icon('goals')} اهداف من`);
 ownHeading(ranks,'ranks',`${art(UI_ASSETS.ranking,'elara-card-art ref-ranking-heading-art','')} رنکینگ دوستان`);
 if(activity){const header=activity.querySelector('header');ownHeading(activity,'activity',`${art(UI_ASSETS.friendsGroup,'elara-card-art ref-friends-heading-art','')} فعالیت دوستان`);if(header){let open=header.querySelector('[data-ref-friends-open]')||header.querySelector('[data-elara-tab="social"]');if(!open){open=document.createElement('button');open.type='button';header.append(open)}open.className='elara-link ref-friends-open';open.dataset.refFriendsOpen='1';open.dataset.elaraTab='social';open.setAttribute('aria-label','باز کردن فهرست دوستان');open.innerHTML='<span>همه ←</span>'}}
 const stats=$('elara-stats');if(stats)stats.hidden=true;
 let streakCard=$('ref-streak-card');if(!streakCard){streakCard=element('section','ref-streak-card','ref-streak-card');const hero=panel.querySelector('.elara-hero');hero?.insertAdjacentElement('afterend',streakCard)}
 const hero=panel.querySelector('.elara-hero');if(hero){hero.classList.add('ref-hero');const heading=hero.querySelector('.hero-copy h1');if(heading)heading.textContent='قدم‌های کوچک، آینده‌های بزرگ می‌سازند.';let quote=$('ref-hero-quote');if(!quote){quote=element('aside','ref-hero-quote','ref-hero-quote');quote.innerHTML='<strong>امروز بهتر از دیروز!</strong><span>همیشه ممکن است.</span>';hero.append(quote)}let desktopStreak=$('ref-desktop-streak');if(!desktopStreak){desktopStreak=element('div','ref-desktop-streak','ref-desktop-streak');desktopStreak.setAttribute('aria-label','استریک روزانه');hero.append(desktopStreak)}}
 installViewAllArtwork();
}
function libraryFocus(){
 const books=$('panel-books'),source=$('panel-focus'),timer=source?.querySelector('.focus-card')||books?.querySelector('.focus-card');if(!books||!timer)return;
 let section=$('ref-library-focus');if(!section){section=element('section','elara-card ref-library-focus','ref-library-focus');section.innerHTML=`<header><h2>${art(UI_ASSETS.library,'elara-card-art ref-library-heading-art','')} فضای تمرکز و پومودورو</h2><span class="muted">جلسه‌ها و زمان‌سنج فعلی</span></header>`;books.append(section)}
 if(timer.parentElement!==section)section.append(timer);
 const heading=source?.querySelector('.section-heading');if(heading)heading.hidden=true;
}
function renderTasks(){const host=$('elara-home-tasks');if(!host)return;const s=read(),compact=isMobile(),limit=5,items=arr(s.tasks).filter(t=>due(t)).map(t=>window.ElaraTasks?.taskView(t,selected())||t).sort((a,b)=>Number(!!a.linkedTask)-Number(!!b.linkedTask)||(Number(a.priority)||4)-(Number(b.priority)||4)).slice(0,limit),all=arr(s.tasks).filter(t=>due(t)),completed=all.filter(t=>done(t)).length;
 const empty='برای این روز کاری برنامه‌ریزی نشده است.',footer='';
 window.ElaraDOM.patch(host,`<div class="ref-card-count">${fa(completed)} / ${fa(all.length)} انجام‌شده</div><div class="ref-task-list">${items.length?items.map(t=>`<div data-key="${esc(t.id)}" class="ref-task-row ${done(t)?'done':''}"><button type="button" data-ref-task="${esc(t.id)}" aria-label="تکمیل ${esc(t.text||t.title||'کار')}" class="ref-task-check" ${selected()>today()?'disabled':''} aria-pressed="${done(t)}">${done(t)?art(UI_ASSETS.taskCheck,'ref-task-check-art',''):''}</button><strong title="${esc(t.text||t.title||'')}">${esc(t.text||t.title||'بدون عنوان')}</strong><span class="ref-priority p${Math.min(4,Math.max(1,Number(t.priority)||4))}">P${Math.min(4,Math.max(1,Number(t.priority)||4))}</span></div>`).join(''):`<p class="ref-empty">${empty}</p>`}</div>${footer}`)}
function renderHabits(){const host=$('elara-home-habits');if(!host)return;const all=arr(read().habits).filter(h=>window.ElaraSchedule.habitDue(h,selected())).map(h=>window.ElaraTasks?.habitView(h,selected())||h),compact=isMobile(),s=all.slice(0,5),d=selected(),n=all.filter(h=>arr(h.days).includes(d)).length;
 const empty='برای این روز عادتی برنامه‌ریزی نشده است.',footer='';
 window.ElaraDOM.patch(host,`<div class="ref-card-count">${fa(n)} / ${fa(all.length)} انجام‌شده</div><div class="ref-habit-list">${s.length?s.map(h=>{const p=arr(h.days).includes(d)?100:0;return `<button type="button" class="ref-habit-row" data-ref-habit="${esc(h.id)}" ${selected()>today()?'disabled':''} aria-pressed="${p===100}"><span class="ref-habit-mark ${p?'done':''}" aria-pressed="${!!p}">${p?art(UI_ASSETS.taskCheck,'ref-task-check-art',''):''}</span><span class="ref-habit-copy"><strong>${esc(h.title||h.name||'عادت')}</strong><span class="elara-track"><i style="width:${p}%"></i></span></span><b>${fa(p)}٪</b></button>`}).join(''):`<p class="ref-empty">${empty}</p>`}</div>${footer}`)}
function renderGoals(){
 const host=$('elara-home-goals');if(!host)return;const goals=arr(read().goals);
 if(!goals.length){host.innerHTML='<p class="ref-empty">هنوز هدفی ثبت نشده است.</p>';return}
 const wrap=element('div','ref-goals-scroll');
 for(const g of goals){
  const steps=arr(g.steps),p=steps.length?Math.round(steps.filter(s=>s.done).length/steps.length*100):0,step=steps.find(s=>!s.done)||steps[0];
  const row=element('div','ref-goal-row');row.dataset.key=String(g.id);
  const check=element(step?'button':'span','ref-goal-step'+(step?'':' ref-goal-step-empty'));
  if(step){check.type='button';check.dataset.homeGoal=String(g.id||'');check.dataset.goalId=String(g.id||'');check.dataset.homeGoalStep=String(step.id||'');check.setAttribute('aria-label','تغییر وضعیت '+String(step.text||'قدم'));check.setAttribute('aria-pressed',String(!!step.done));if(step.done)check.innerHTML=art(UI_ASSETS.taskCheck,'ref-goal-check-art','')}
  const main=element('button','ref-goal-main');main.type='button';main.dataset.elaraTab='goals';main.innerHTML='<strong>'+esc(g.title||g.name||'هدف')+'</strong><i class="elara-track"><i style="width:'+p+'%"></i></i>';
  const pct=element('b','');pct.textContent=fa(p)+'٪';row.append(check,main,pct);wrap.append(row);
 }
 window.ElaraDOM.patch(host,wrap.outerHTML)
}
function renderMissions(){const host=$('elara-home-missions');if(!host)return;const compact=isMobile(),ms=arr(window.ElaraMissions?.snapshot?.()).slice(0,3);window.ElaraDOM.patch(host,ms.length?ms.map(m=>`<div class="ref-mission-row"><span class="ref-mission-check" aria-hidden="true">${m.completed?art(UI_ASSETS.taskCheck,'ref-mission-check-art','انجام‌شده'):'<i></i>'}</span><div><strong>${esc(m.name||'مأموریت')}</strong><small>${compact?'':esc(m.detail||'')+(m.detail?' · ':'')}${fa(m.amount)} / ${fa(m.target)}</small></div><b class="ref-mission-reward">${art(UI_ASSETS.achievement,'ref-reward-star','')}+${fa(m.rewardXp)} XP</b></div>`).join(''):'<p class="ref-empty">مأموریتی برای نمایش نیست.</p>')}
function wellness(){const target=$('ref-wellness-data');if(!target)return;const u=uid();let s={};if(u)try{s=JSON.parse(localStorage.getItem('elara_private_wellness_v1_'+u)||'{}')||{}}catch{};
 const privateAllowed=window.ElaraPrivacyLocal?.wellnessHomeVisible?.()!==false;
 if(!privateAllowed){target.innerHTML='<p class="ref-empty">نمایش خلاصه سلامت در تنظیمات حریم خصوصی غیرفعال است.</p><button type="button" class="ref-card-link" data-elara-tab="exercise">ورود به ورزش</button>';return}
 const day=selected(),weight=day===today()?Number(s.weight):(()=>{try{return arr(JSON.parse(localStorage.getItem('elara_report_history_v1_'+u)||'[]')).filter(x=>x.type==='weight'&&x.date<=day).sort((a,b)=>b.date.localeCompare(a.date)||b.at-a.at)[0]?.value||0}catch{return 0}})(),water=Number(s.water?.[day]||0),goal=Math.max(1,Number(s.goal)||2000),sleep=arr(s.sleep).filter(x=>x.date===day).reduce((n,x)=>{const a=Date.parse(day+'T'+x.bed+':00'),b=Date.parse(day+'T'+x.wake+':00');return n+(Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.min(1440,Math.round(((b<=a?b+86400000:b)-a)/60000))):0)},0),workout=arr(s.workouts).filter(x=>x.date===day).reduce((n,x)=>n+(Number(x.minutes)||0),0);
 const cells=[['water','آب',u?`${fa(water)} / ${fa(goal)}`:'—','میلی‌لیتر','wellness-water',UI_ASSETS.water],['sleep','خواب',sleep?fa(Math.round(sleep/6)/10):'—','ساعت','wellness-sleep',UI_ASSETS.sleep],['workout','تمرین',workout?fa(workout):'—','دقیقه','wellness-workouts',UI_ASSETS.exercise],['goals','وزن',weight>0?fa(weight):'—','کیلوگرم','wellness-water',null]];
 window.ElaraDOM.patch(target,`<div class="ref-wellness-summaries">${cells.map(([ic,label,value,unit,section,asset])=>`<button type="button" data-ref-exercise="${section}" class="ref-wellness-cell"><span>${asset?art(asset,'elara-wellness-art',''):icon(ic)}</span><small>${label}</small><strong>${value}</strong><small>${unit}</small></button>`).join('')}</div><button class="ref-wellness-banner" type="button" data-elara-tab="exercise" aria-label="باز کردن ورزش و سلامت"><img class="ref-wellness-banner-art" src="${UI_ASSETS.banner}" alt="" decoding="async" loading="eager"><span class="ref-wellness-banner-copy"><strong>بدن سالم، ذهن قوی‌تر</strong><small>ثبت و مدیریت در بخش ورزش ←</small></span></button>`);
}
function streakView(){const root=$('ref-streak-card');if(!root)return;const n=streak(),dates=activityDates(),d=new Date(selected()+'T12:00:00');const days=Array.from({length:7},(_,i)=>{const v=new Date(d);v.setDate(v.getDate()-3+i);const key=iso(v);return `<button type="button" data-home-date="${key}" aria-pressed="${key===selected()}" aria-label="${v.toLocaleDateString('fa-IR',{dateStyle:'full'})}" class="ref-streak-day ${dates.has(key)?'done':''} ${key===selected()?'today':''}"><span class="ref-day-mark">${key===today()?art(UI_ASSETS.flame,'ref-day-flame','امروز'):dates.has(key)?art(UI_ASSETS.taskCheck,'ref-day-check','فعالیت ثبت شده'):'<i></i>'}</span><b>${v.toLocaleDateString('fa-IR',{weekday:'narrow'})}</b><strong>${v.toLocaleDateString('fa-IR',{day:'numeric'})}</strong></button>`}).join('');window.ElaraDOM.patch(root,`<div class="ref-streak-summary">${art(UI_ASSETS.flame,'ref-streak-flame','')}<strong>${fa(n)}</strong><small>روز متوالی<span>به مسیرت ادامه بده!</span></small></div><div class="ref-streak-days">${days}</div><div class="ref-day-tools"><button type="button" data-home-calendar>تقویم</button><button type="button" data-home-date="${today()}">امروز</button><small>${d.toLocaleDateString('fa-IR',{month:'long',day:'numeric'})}</small></div>`);
 for(const [cls,label] of [['.ref-tasks','کارهای'],['.ref-habits','عادت‌های']]){const h=document.querySelector(cls+' > header h2');if(h){const text=label+(selected()===today()?' امروز':' '+d.toLocaleDateString('fa-IR',{month:'short',day:'numeric'}));let node=[...h.childNodes].find(n=>n.nodeType===3);if(!node){node=document.createTextNode('');h.append(node)}if(node.nodeValue!==text)node.nodeValue=text}}
}
function accountHeader(){const bar=document.querySelector('.topbar'),actions=bar?.querySelector('.topbar-actions'),leading=bar?.querySelector('.topbar-leading');if(!bar||!actions)return;bar.classList.add('ref-topbar');document.querySelectorAll('.elara-toolbar').forEach(x=>x.remove());if(leading&&!leading.querySelector('.ref-mobile-brand')){const brand=element('a','ref-mobile-brand','ref-mobile-brand');brand.href='#home';brand.setAttribute('aria-label','Elara Space');brand.innerHTML='<img class="elara-brand-wordmark" src="assets/ui/brand-elara-wordmark.webp" alt="Elara"><span class="sr-only">Elara Space</span>';leading.append(brand)}
 let account=$('ref-header-account');if(!account){account=element('button','ref-header-account','ref-header-account');account.type='button';account.setAttribute('aria-label','حساب و تنظیمات');account.addEventListener('click',()=>window.ElaraPrivateDrawer?.open?.('home'));bar.prepend(account)}
 const me=window.ElaraSocial?.me||window.ElaraAccount?.profile||{},v=window.ElaraProfileSystem?.viewModel?.(me,{self:true})||{},xp=Number(v.xp??me.xp??read().xp)||0,level=v.level||window.ElaraLevels?.level?.(xp)||1,avatar=v.avatarSrc||window.ElaraAccount?.user?.photoURL||'',name=String(v.name||me.name||'حساب من');
 account.classList.toggle('ref-account-brand-duplicate',name.trim().toLocaleLowerCase()==='elara');const frame=String(v.frameSrc||'');window.ElaraDOM.patch(account,`<span class="ref-account-avatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(name.trim()[0]||'E')}${frame?`<img class="ref-account-equipped-frame" data-src="${esc(frame)}" src="${esc(frame)}" alt="">`:''}</span><span class="ref-account-copy"><strong>${esc(name)}</strong><small>سطح ${fa(level)} · ${fa(xp)} XP</small><span class="ref-xp-track"><i style="width:${Math.min(100,(xp%1000)/10)}%"></i></span></span>`);
 let search=$('ref-header-search');if(!search){search=element('div','ref-header-search','ref-header-search');search.innerHTML=`<label for="ref-search-input" class="sr-only">جستجو در Elara</label><input id="ref-search-input" type="search" autocomplete="off" placeholder="جستجو در Elara…"><div class="ref-search-results" id="ref-search-results" hidden></div>`;bar.insertBefore(search,actions);const input=$('ref-search-input'),results=$('ref-search-results');input.addEventListener('input',()=>{const q=input.value.trim(),rows=localSearch(q);results.hidden=!q;results.innerHTML=q?(rows.length?rows.map(r=>`<button type="button" data-ref-search-route="${esc(r.route)}"><strong>${esc(r.label)}</strong><small>${esc(r.detail)}</small></button>`).join(''):'<p class="muted">نتیجه‌ای پیدا نشد.</p>'):''});input.addEventListener('keydown',e=>{if(e.key==='Escape'){results.hidden=true;input.blur()}if(e.key==='Enter'){e.preventDefault();results.querySelector('button')?.click()}});results.addEventListener('click',e=>{const b=e.target.closest('[data-ref-search-route]');if(!b)return;const q=input.value.trim();results.hidden=true;window.ElaraOpen?.(b.dataset.refSearchRoute);if(b.dataset.refSearchRoute==='tasks')setTimeout(()=>{const field=$('task-search');if(field){field.value=q;field.dispatchEvent(new Event('input',{bubbles:true}))}},0)});document.addEventListener('click',e=>{if(!search.contains(e.target))results.hidden=true})}
 const sidebar=document.querySelector('.sidebar');let sideBanner=$('ref-sidebar-banner');if(sidebar&&!sideBanner){sideBanner=element('aside','ref-sidebar-banner','ref-sidebar-banner');sideBanner.innerHTML='<img src="assets/ui/icon-reward-star.webp" alt=""><strong>هر روز<br>نسخه‌ای بهتر از تو</strong><span>— Elara</span>';sideBanner.style.backgroundImage='linear-gradient(180deg,#05142b22,#05142bdd),url("assets/ui/background-moonlit-mountains.webp")';sidebar.append(sideBanner)}
 const theme=$('theme-toggle');if(theme){theme.classList.add('ref-theme-art-control');syncThemeArtwork(theme)}
 let notify=$('ref-header-notifications');if(!notify){notify=element('button','icon-button ref-header-notifications','ref-header-notifications');notify.type='button';notify.setAttribute('aria-label','اعلان‌ها');notify.addEventListener('click',()=>window.ElaraPrivateDrawer?.open?.('notifications'));actions.append(notify)}const unread=unreadNotifications();notify.dataset.unreadCount=String(unread);window.ElaraDOM.patch(notify,art(unread>0?UI_ASSETS.notificationUnread:UI_ASSETS.notificationRead,'ref-header-art ref-notification-art',''));
 let edit=$('ref-header-edit');if(!edit){edit=element('button','icon-button ref-header-edit','ref-header-edit');edit.type='button';edit.setAttribute('aria-label','ویرایش پروفایل');edit.innerHTML=icon('edit');edit.addEventListener('click',()=>window.ElaraProfileSystem?.openEditor?.());actions.append(edit)}
}
function renderDynamic(kind='all'){accountHeader();if(kind==='task'){renderTasks();renderMissions();streakView();return}if(kind==='habit'){renderHabits();renderMissions();streakView();return}if(kind==='goal'){renderGoals();return}renderTasks();renderHabits();renderGoals();renderMissions();wellness();streakView()}
function render(){homeStructure();libraryFocus();renderDynamic();accountHeader();const p=$('panel-home');if(p){const h=p.querySelector('.hero-copy h1');if(h)h.textContent='قدم‌های کوچک، آینده‌های بزرگ می‌سازند.'}}
let scheduled=false,dynamicScheduled=false,pendingDynamic=new Set(),localMutationKind=null;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})}function scheduleDynamic(event){const kind=localMutationKind||window.ElaraDataChangeHint||event?.detail?.kind||'all';pendingDynamic.add(kind);if(dynamicScheduled)return;dynamicScheduled=true;requestAnimationFrame(()=>{dynamicScheduled=false;const kinds=[...pendingDynamic];pendingDynamic.clear();if(kinds.includes('all')||kinds.length>1)renderDynamic('all');else renderDynamic(kinds[0])})}
function actions(e){
 const date=e.target.closest('[data-home-date]');if(date){window.ElaraHomeDay=date.dataset.homeDate;render();return}if(e.target.closest('[data-home-calendar]')){window.ElaraCalendar?.open(selected(),d=>{window.ElaraHomeDay=d;render()});return}
 const task=e.target.closest('[data-ref-task]');if(task){const target=document.querySelector(`#task-list [data-action="toggle-task"][data-id="${CSS.escape(task.dataset.refTask)}"]`);if(target){localMutationKind='task';target.click();queueMicrotask(()=>{localMutationKind=null})}else window.ElaraOpen?.('tasks');return}
 const habit=e.target.closest('[data-ref-habit]');if(habit){const target=document.querySelector(`#habit-list [data-action="toggle-habit"][data-id="${CSS.escape(habit.dataset.refHabit)}"]`);if(target){localMutationKind='habit';target.click();queueMicrotask(()=>{localMutationKind=null})}else window.ElaraOpen?.('habits');return}
 const exercise=e.target.closest('[data-ref-exercise]');if(exercise){window.ElaraOpen?.('exercise');setTimeout(()=>document.querySelector('.'+exercise.dataset.refExercise)?.scrollIntoView({block:'start',behavior:'smooth'}),120);return}
 const color=e.target.closest('[data-ref-theme]');if(color){document.querySelector(`#elara-settings [data-color="${CSS.escape(color.dataset.refTheme)}"]`)?.click();schedule();return}
 if(e.target.closest('[data-drawer-appearance]')){window.ElaraPrivateDrawer?.open?.('appearance');return}
 const friends=e.target.closest('[data-ref-friends-open]');if(friends){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.ElaraOpen?.('social');return}
 const focus=e.target.closest('[data-elara-tab="focus"]');if(focus){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.ElaraOpen?.('books');setTimeout(()=>document.querySelector('#ref-library-focus')?.scrollIntoView({block:'start'}),70)}
}
function init(){render();document.addEventListener('click',actions,true);for(const name of ['elara:data-changed','elara:linked-state','elara:wellness-saved','elara:privacy-local-changed'])window.addEventListener(name,scheduleDynamic);for(const name of ['elara:open','elara:hydrate','elara:account-ready','elara:wardrobe-changed','elara:profile-saved','elara:notifications-changed'])window.addEventListener(name,schedule);window.addEventListener('elara:theme-changed',()=>syncThemeArtwork());window.addEventListener('storage',scheduleDynamic);window.addEventListener('hashchange',()=>{if(location.hash==='#focus')window.ElaraOpen?.('books');schedule()});setTimeout(render,220)}
window.ElaraReferenceHome={render,homeStructure,libraryFocus,localSearch};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

