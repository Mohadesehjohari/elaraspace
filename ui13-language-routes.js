/* UI13: language-only destination panels. Shares canonical Tasks and authenticated Social services. */
(()=>{'use strict';
const leitnerStyle=document.createElement('link');leitnerStyle.rel='stylesheet';leitnerStyle.href='leitner-story-interactions-20261012.css';document.head.append(leitnerStyle);
const l5Style=document.createElement('link');l5Style.rel='stylesheet';l5Style.href='leitner-l5-fidelity-20261012.css?v=20261014-l6-redesign-v1';document.head.append(l5Style);
const l6Style=document.createElement('link');l6Style.rel='stylesheet';l6Style.href='leitner-dashboard-redesign-20261014.css?v=20261014-alien-banner-v2';document.head.append(l6Style);
const l5Script=document.createElement('script');l5Script.defer=true;l5Script.src='leitner-l5-fidelity-20261012.js?v=20261014-l6-redesign-v1';document.head.append(l5Script);
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const num=v=>Number(v||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');
const list=v=>Array.isArray(v)?v:[];
const routes=['language-tasks','language-channels','language-challenges'];
const icons={tasks:'<path d="M3 4h18v17H3z"/><path d="m7 12 3 3 7-7"/>',channels:'<circle cx="12" cy="12" r="2"/><path d="M6 6a9 9 0 0 0 0 12m12-12a9 9 0 0 1 0 12"/>',challenges:'<path d="M6 3h12v6c0 4-3 8-6 8s-6-4-6-8zM6 6H3v3l4 4m11-7h3v3l-4 4m-5 4v4m-4 0h8"/>'};
const ico=k=>'<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[k]+'</svg>';
const head=(kind,fa,en,description)=>{
 const panel=$('panel-language-'+kind);if(!panel)return null;
 if(!panel.querySelector('.ui13-subpage')){
  panel.innerHTML='<div class="ui13-subpage"><header class="ui13-subpage-head"><button type="button" class="ui13-back" data-ui13-back>→ '+tx('بازگشت به زبان','Back to Language')+'</button><div class="ui13-subpage-title">'+ico(kind)+'<div><small>ELARA · LANGUAGE</small><h1>'+tx(fa,en)+'</h1><p>'+description+'</p></div></div></header><div class="ui13-subpage-content" data-ui13-content="'+kind+'"></div></div>';
 }
 return panel.querySelector('[data-ui13-content="'+kind+'"]');
};
function taskRecords(){
 let s;try{s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{s={}}
 const d=window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA');
 const rows=list(s.tasks).filter(t=>t&&t.sourceGroup==='language').sort((a,b)=>Number(window.ElaraTasks?.taskDone?.(a,d)||false)-Number(window.ElaraTasks?.taskDone?.(b,d)||false));
 return {rows,d};
}
function renderTasks(){
 const host=head('tasks','تسک‌های زبان','Language tasks',tx('مدیریت همهٔ تسک‌های زبان با همان اطلاعات اصلی Tasks','Manage real language tasks with the canonical Tasks store'));if(!host)return;
 const {rows,d}=taskRecords(),done=rows.filter(t=>window.ElaraTasks?.taskDone?.(t,d)).length;
 host.innerHTML='<section class="ui13-surface"><header class="ui13-section-head"><h2>'+tx('فهرست کامل تسک‌ها','All language tasks')+'</h2><span>'+num(done)+' / '+num(rows.length)+' '+tx('انجام‌شده','completed')+'</span></header><div class="ui13-task-list">'+(rows.map(t=>{
  const complete=!!window.ElaraTasks?.taskDone?.(t,d);
  return '<div class="ui13-task-row'+(complete?' is-done':'')+'"><button type="button" data-section-task-toggle="'+esc(t.id)+'" aria-label="'+tx('تغییر وضعیت تسک','Toggle task')+'" aria-pressed="'+complete+'" '+(t.sourceCompletionLocked?'disabled':'')+'><span aria-hidden="true">'+(complete?'✓':'')+'</span></button><button type="button" data-section-task-detail="'+esc(t.id)+'" data-elara-ugc dir="auto">'+esc(t.text||t.title)+'</button><small>'+ (complete?tx('انجام‌شده','Done'):tx('در انتظار','Pending'))+'</small></div>'
 }).join('')||'<p class="ui13-empty">'+tx('هنوز تسک زبانی نداری.','No language tasks yet.')+'</p>')+'</div><div class="ui13-actions"><button class="ui13-primary" data-section-task-add="language" type="button">+ '+tx('افزودن تسک زبان','Add language task')+'</button><button class="ui13-secondary" data-ui13-canonical="tasks" type="button">'+tx('مرکز تسک‌ها','All Tasks')+'</button></div></section>';
}

/* Real language communities; use the Clubs and Friends challenge contracts, not demo rows. */
let epoch=0,channelMode='all',channelQuery='',challengeMode='all';
const pill=(value,label,active)=>'<button type="button" class="lr4-pill '+(active?'is-current':'')+'" aria-pressed="'+active+'" data-lr4-channel-filter="'+esc(value)+'">'+label+'</button>';
const mark=(kind)=>'<span class="lr4-icon lr4-icon-'+kind+'" aria-hidden="true">'+ico(kind==='channel'?'channels':kind==='challenge'?'challenges':'tasks')+'</span>';
const labelStatus=c=>c.status==='closed'?tx('بسته‌شده','Closed'):tx('فعال','Active');
const channelCard=(c,index)=>'<article class="lr4-channel-card lr4-scene-'+(index%4)+'"><div class="lr4-channel-art"><span class="lr4-channel-category">'+tx(c.ownerGroup==='mine'?'کانال من':'قابل مشاهده',c.ownerGroup==='mine'?'My channel':'Discover')+'</span><span class="lr4-channel-symbol">'+ico('channels')+'</span></div><div class="lr4-channel-info"><h3 data-elara-ugc dir="auto">'+esc(c.title||tx('باشگاه زبان','Language club'))+'</h3><p data-elara-ugc dir="auto">'+esc(String(c.bio||c.description||tx('فضایی برای یادگیری و گفت‌وگوی گروهی زبان','Language learning and conversation')).slice(0,145))+'</p><div class="lr4-channel-tags"><span>'+labelStatus(c)+'</span><span>'+num(c.memberCount||0)+' '+tx('عضو','members')+'</span></div><button type="button" class="lr4-outline" data-ui13-open-club="'+esc(c.id)+'" data-ui13-owned="'+(c.ownerGroup==='mine'?'1':'0')+'">'+tx(c.ownerGroup==='mine'?'ورود به باشگاه':'مشاهدهٔ باشگاه',c.ownerGroup==='mine'?'Open club':'View club')+' ←</button></div></article>';
const communityHeader=(kind,title,sub)=>'<section class="lr4-intro lr4-intro-'+kind+'"><span class="lr4-overline">ELARA / LANGUAGE / '+kind.toUpperCase()+'</span><h2>'+title+'</h2><p>'+sub+'</p></section>';
function channelSurface(host,rows,ready=true,notice=''){
 const joined=rows.filter(c=>c.ownerGroup==='mine'),discover=rows.filter(c=>c.ownerGroup==='public');
 const q=channelQuery.trim().toLocaleLowerCase();
 const visible=rows.filter(c=>(channelMode==='all'||channelMode===c.ownerGroup)&&(!q||String(c.title||'').toLocaleLowerCase().includes(q)||String(c.bio||'').toLocaleLowerCase().includes(q)));
 host.innerHTML='<div class="lr4-page lr4-channels">'+
 communityHeader('channels',tx('با هم، زبان را زندگی کنیم','Speak, learn and grow together'),tx('کانال‌ها و باشگاه‌های واقعی زبان، برای تمرین و همراهی با دوستان.','Real language clubs and communities to learn with others.'))+
 '<div class="lr4-summary lr4-summary-three"><article>'+mark('channel')+'<strong>'+(ready?num(rows.length):'—')+'</strong><span>'+tx('کانال قابل مشاهده','Visible channels')+'</span></article><article>'+mark('channel')+'<strong>'+(ready?num(joined.length):'—')+'</strong><span>'+tx('عضویت‌های من','My memberships')+'</span></article><article>'+mark('channel')+'<strong>'+(ready?num(discover.length):'—')+'</strong><span>'+tx('برای کشف','Discover')+'</span></article></div>'+
 '<div class="lr4-channel-layout"><main class="lr4-panel lr4-channel-main"><div class="lr4-panel-heading"><div><small>EXPLORE THE UNIVERSE</small><h2>'+tx('کانال‌های زبان','Language channels')+'</h2></div><button type="button" class="lr4-outline lr4-compact" data-ui13-create-club>＋ '+tx('ساخت باشگاه','Create club')+'</button></div>'+
 '<div class="lr4-filterbar"><div class="lr4-pills" role="group" aria-label="'+tx('فیلتر کانال‌ها','Channel filters')+'">'+pill('all',tx('همهٔ کانال‌ها','All'),channelMode==='all')+pill('mine',tx('کانال‌های من','My channels'),channelMode==='mine')+pill('public',tx('کشف کانال‌ها','Discover'),channelMode==='public')+'</div><label class="lr4-search"><span aria-hidden="true">⌕</span><input type="search" data-lr4-channel-search value="'+esc(channelQuery)+'" aria-label="'+tx('جست‌وجو در کانال‌ها','Search channels')+'" placeholder="'+tx('نام یا موضوع کانال…','Search channel name or topic…')+'"></label></div>'+
 (notice?'<p class="lr4-status" role="status">'+esc(notice)+'</p>':'')+
 '<div class="lr4-channel-grid">'+visible.map(channelCard).join('')+'</div>'+
 (!visible.length?'<div class="lr4-beautiful-empty"><img src="assets/ui/24-language-classes-icon.webp" alt=""><strong>'+tx(ready?'هنوز کانالی در این بخش نداری':'در حال آماده‌کردن کانال‌ها',ready?'No channels match this view':'Getting channels ready')+'</strong><p>'+tx('وقتی کانال واقعی در دسترس باشه، کارت‌های اون همین‌جا ظاهر می‌شن.','Authorized language clubs appear here automatically.')+'</p><button type="button" class="lr4-outline" data-ui13-retry>'+tx('تازه‌سازی','Refresh')+'</button></div>':'')+
 '</main><aside class="lr4-panel lr4-channel-side"><div class="lr4-panel-heading"><div><small>MY LEARNING SPACE</small><h2>'+tx('کانال‌های من','My channels')+'</h2></div></div>'+
 (joined.length?joined.slice(0,5).map(c=>'<button type="button" class="lr4-mini-club" data-ui13-open-club="'+esc(c.id)+'" data-ui13-owned="1"><span>✦</span><strong data-elara-ugc dir="auto">'+esc(c.title)+'</strong><small>'+num(c.memberCount||0)+' '+tx('عضو','members')+'</small>‹</button>').join(''):'<p class="lr4-sidebar-empty">'+tx('هنوز عضو باشگاه زبانی نشدی. از کارت‌های این صفحه باشگاه‌های واقعی رو ببین.','No joined language clubs yet. Explore available clubs here.')+'</p>')+
 '<section class="lr4-invite-card"><h3>✧ '+tx('گفت‌وگو را آغاز کن','Start a conversation')+'</h3><p>'+tx('با اعضای باشگاه‌های زبانی و دوستانت مسیر یادگیری بساز.','Find your learning companions in real clubs.')+'</p><button type="button" data-ui13-canonical="social">'+tx('دیدن دوستان','View friends')+' ←</button></section></aside></div></div>';
}
async function renderChannels(){
 const host=head('channels','کانال‌های زبان','Language channels',tx('یادگیری گروهی، تمرین و گفت‌وگوی واقعی','Real group learning, practice and conversation'));if(!host)return;
 const ticket=++epoch,service=window.ElaraSocial?.clubs,user=window.ElaraAccount?.user;
 channelSurface(host,[],false,tx('در حال دریافت کانال‌های واقعی…','Syncing real language clubs…'));
 if(!user?.uid||!service?.list){
  channelSurface(host,[],false,tx('برای نمایش کانال‌های واقعی، وارد حساب تأییدشده شو.','Sign in to see authorized language clubs.'));
  return
 }
 try{
  const result=await Promise.allSettled([service.list(),typeof service.discover==='function'?service.discover():[]]);
  if(ticket!==epoch||!host.isConnected)return;
  const mine=result[0].status==='fulfilled'?list(result[0].value):[];
  const publicRows=result[1].status==='fulfilled'?list(result[1].value):[];
  const seen=new Set(),rows=[];
  for(const [group,items] of [['mine',mine],['public',publicRows]])for(const club of items){
   if(club?.kind!=='language'||!club.id||seen.has(club.id))continue;
   seen.add(club.id);rows.push({...club,ownerGroup:group});
  }
  channelSurface(host,rows,true,result.some(r=>r.status==='rejected')?tx('بخشی از کانال‌ها فعلاً قابل دریافت نیست.','Some clubs could not be fetched.'): '');
 }catch(error){if(ticket===epoch)channelSurface(host,[],false,tx('دریافت کانال‌ها کامل نشد. برای تلاش دوباره تازه‌سازی کن.','Could not sync clubs. Try refreshing.'))}
}
const isLanguageChallenge=c=>['reading'].includes(c.targetKind)||(['task','general'].includes(c.targetKind)&&/زبان|لغت|واژه|language|english|vocab/i.test(c.targetText||''));
const challengeCard=(c,i)=>{
 const label=(c.status==='accepted'?tx('پذیرفته‌شده','Accepted'):c.status==='pending'?tx('در انتظار پاسخ','Pending'):tx('پایان یافته یا بسته‌شده','Closed'));
 const target=Math.max(1,Number(c.targetValue)||1);
 return '<article class="lr4-challenge-card"><div class="lr4-challenge-art lr4-scene-'+(i%4)+'"><span>'+tx('چالش واقعی دوستان','Real friend challenge')+'</span></div><div class="lr4-challenge-copy"><span class="lr4-overline">'+esc(c.targetKind||'reading').toUpperCase()+'</span><h3 data-elara-ugc dir="auto">'+esc(c.targetText||tx('چالش مطالعه','Reading challenge'))+'</h3><p>'+tx('مقدار هدف: ','Target: ')+num(target)+' · '+label+'</p><span class="lr4-channel-category">'+tx('براساس درخواست واقعی','Real request')+'</span><button class="lr4-outline" type="button" data-ui13-friend-challenges>'+tx('مشاهده و پاسخ','View and respond')+' ←</button></div></article>';
};
let challengesEpoch=0,challengeFilter='all',languageChallengeCache=null;
function paintChallenges(host,rows=null,info=''){
 const active=list(rows).filter(c=>c.status==='accepted'),pending=list(rows).filter(c=>c.status==='pending'),joined=list(rows).filter(isLanguageChallenge);
 const shown=list(rows).filter(isLanguageChallenge).filter(c=>challengeFilter==='all'||(challengeFilter==='active'&&c.status==='accepted')||(challengeFilter==='requests'&&c.status==='pending'));
 const stats=rows===null?['—','—','—']: [num(joined.length),num(active.filter(isLanguageChallenge).length),num(pending.filter(isLanguageChallenge).length)];
 host.innerHTML='<div class="lr4-page lr4-challenges">'+communityHeader('challenges',tx('باهم تمرین کن، فراتر برو','Challenge yourself, together'),tx('هدف‌های مطالعه و زبان را با دوستانت دنبال کن؛ نتیجه فقط براساس دادهٔ واقعی ثبت می‌شود.','Explore actual reading and language-related friend challenges.'))+
 '<div class="lr4-summary lr4-summary-three"><article>'+mark('challenge')+'<strong>'+stats[0]+'</strong><span>'+tx('چالش مرتبط','Related challenges')+'</span></article><article>'+mark('challenge')+'<strong>'+stats[1]+'</strong><span>'+tx('پذیرفته‌شده','Accepted')+'</span></article><article>'+mark('challenge')+'<strong>'+stats[2]+'</strong><span>'+tx('درخواست‌های باز','Pending')+'</span></article></div>'+
 '<div class="lr4-challenge-layout"><div class="lr4-panel"><div class="lr4-panel-heading"><div><small>CHALLENGE YOURSELF</small><h2>'+tx('چالش‌های زبان و مطالعه','Language & reading challenges')+'</h2></div><button type="button" class="lr4-outline" data-ui13-friend-challenges>'+tx('همهٔ چالش‌ها','All challenges')+' ←</button></div><div class="lr4-pills" role="group" aria-label="'+tx('فیلتر چالش‌ها','Challenge filters')+'">'+[['all',tx('همه','All')],['active',tx('پذیرفته‌شده','Accepted')],['requests',tx('درخواست‌ها','Requests')]].map(([key,v])=>'<button type="button" data-lr4-challenge-filter="'+key+'" aria-pressed="'+(challengeFilter===key)+'" class="lr4-pill '+(challengeFilter===key?'is-current':'')+'">'+v+'</button>').join('')+'</div>'+
 (info?'<p class="lr4-status" role="status">'+esc(info)+'</p>':'')+
 '<div class="lr4-challenge-grid">'+shown.map(challengeCard).join('')+'</div>'+
 (!shown.length?'<div class="lr4-beautiful-empty"><img src="assets/ui/11-challenges-icon.webp" alt=""><h3>'+tx('ماجراجویی بعدی منتظر توست','Your next challenge awaits')+'</h3><p>'+tx('هنوز درخواست مرتبط با مطالعه و زبان نداری. می‌تونی از بخش چالش‌های دوستان یک چالش واقعی ایجاد کنی.','There are no matching real challenges yet. Start one with a friend.')+'</p><button type="button" class="lr4-gradient" data-ui13-friend-challenges>'+tx('رفتن به چالش‌های دوستان','Open friend challenges')+' ←</button></div>':'')+'</div>'+
 '<aside class="lr4-panel lr4-leaderboard"><span class="lr4-overline">TOGETHER WE GROW</span><h2>'+tx('دوستان هم‌مسیر','Learning together')+'</h2><p>'+tx('رتبه‌بندی و امتیاز چالش‌های زبان تنها پس از فعال‌شدن داوری معتبر سرور نمایش داده می‌شود.','Language challenge winners and XP require verified server results.')+'</p><div class="lr4-challenge-scenic"></div><button type="button" class="lr4-gradient" data-ui13-friend-challenges>'+tx('ساخت چالش با دوست','Challenge a friend')+'</button></aside></div></div>';
}
async function renderChallenges(){
 const host=head('challenges','چالش‌های زبان','Language challenges',tx('چالش‌های واقعی مطالعه و یادگیری با دوستان','Real reading and language challenges with friends'));if(!host)return;
 const token=++challengesEpoch;
 paintChallenges(host,null,tx('در حال دریافت چالش‌های واقعی…','Loading real challenges…'));
 if(typeof window.ElaraSocial?.challenges?.list!=='function'){
  paintChallenges(host,null,tx('برای دیدن چالش‌ها، به حساب اجتماعی متصل شو.','Connect your account to load challenges.'));return;
 }
 try{
  const rows=list(await window.ElaraSocial.challenges.list());if(token!==challengesEpoch||!host.isConnected)return;
  languageChallengeCache=rows;paintChallenges(host,rows);
 }catch(e){if(token===challengesEpoch)paintChallenges(host,null,tx('دریافت چالش‌ها کامل نشد. بعداً دوباره تلاش کن.','Could not load challenges. Try again later.'))}
}

// L3: full-screen story destination, stable ?leitner=review#words deep link, canonical #words dashboard. Canonical word handlers stay in app.js.
const l3={total:0,history:[],preview:false,historyIndex:0,scene:null,flash:null,original:null,actions:null,forgot:null,known:null,focus:null,scrollY:0,swipeX:null,pointerX:null,pointerId:null,dragging:false,focusOn:false,focusMs:0,focusStarted:0,focusTicker:null,reportId:null,recordedMinutes:0,observer:null};
function l3Due(){let d;try{d=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{d={}}
 const today=window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA');
 return list(d.words).filter(w=>w&&(!w.due||String(w.due)<=today));}
function l3Build(){
 if(l3.scene)return l3.scene;
 const scene=document.createElement('main');scene.id='l3-review-scene';scene.className='l3-story-scene';scene.setAttribute('aria-label',tx('مرور واژه‌های لایتنر','Leitner word review'));
 scene.innerHTML='<div class="l3-story-container"><header class="l3-story-top"><button type="button" data-l3-exit class="l3-story-back" aria-label="'+tx('بازگشت به داشبورد','Back to dashboard')+'">←</button><div class="l3-story-brand"><img class="l3-story-logo" src="assets/ui/brand-elara-wordmark.webp" alt="Elara Space"></div></header><div class="l3-story-intro"><div><span class="l3-story-symbol" aria-hidden="true">▣</span><h1>'+tx('جعبه لایتنر','Leitner box')+'</h1></div><p>'+tx('مرور واژه‌ها به صورت مرحله‌ای و متمرکز','Focused, step-by-step vocabulary review')+'</p></div><div class="l3-story-progress" data-l3-segments aria-label="'+tx('پیشرفت مرور','Review progress')+'"></div><p class="l3-story-counter" data-l3-counter role="status"></p><div class="l3-story-meta"><button type="button" data-l3-focus aria-pressed="false" class="l3-focus-toggle">◎ '+tx('حالت تمرکز','Focus mode')+' <span class="l3-focus-indicator" aria-hidden="true"></span></button><div class="l3-study-clock" role="timer"><span>'+tx('زمان مطالعه','Study time')+'</span><b data-l3-timer>00:00:00</b><button type="button" data-l3-pause disabled aria-label="'+tx('مکث زمان مطالعه','Pause study timer')+'">Ⅱ</button></div></div><section class="l3-story-frame" data-l3-drag-surface><div class="l3-swipe-cue l3-swipe-no" aria-hidden="true">✕ '+tx('بلد نبودم','Did not know')+'</div><div class="l3-swipe-cue l3-swipe-yes" aria-hidden="true">✓ '+tx('بلدم','Knew it')+'</div><span class="l3-story-new">✦ '+tx('لغت جدید','New word')+'</span><div class="l3-story-card-slot" data-l3-card-slot></div><div class="l3-story-history" data-l3-history hidden><small>'+tx('کلمهٔ قبلی','Previous word')+'</small><strong data-l3-history-front dir="auto"></strong><p data-l3-history-back dir="auto"></p><button type="button" data-l3-current>'+tx('بازگشت به کلمه فعلی','Current word')+' →</button></div></section><div class="l3-story-actions"><button type="button" data-l3-prev disabled class="l3-prev-action"><span>←</span><b>'+tx('بازگشت به کلمه قبلی','Previous word')+'</b></button><div data-l3-forgot-slot></div><div data-l3-known-slot></div></div></div>';
 document.body.append(scene);l3.scene=scene;
 return scene;
}
function l3Sync(){
 const scene=l3.scene;if(!scene)return;
 const remaining=l3Due().length,done=Math.min(l3.total,Math.max(l3.history.length,l3.total-remaining)),total=Math.max(1,l3.total);
 const count=scene.querySelector('[data-l3-counter]');if(count)count.textContent=tx('کلمه ','Word ')+num(Math.min(l3.total,done+1))+' '+tx('از ','of ')+num(l3.total)+(remaining===0?' · '+tx('مرور امروز تمام شد','Review complete'):'');
 const seg=scene.querySelector('[data-l3-segments]');
 if(seg){const parts=Math.min(Math.max(l3.total,1),30);if(seg.children.length!==parts){seg.replaceChildren();for(let i=0;i<parts;i++)seg.append(document.createElement('i'))}
  [...seg.children].forEach((el,i)=>el.classList.toggle('is-done',i<Math.round(done/total*parts)))}
 const prev=scene.querySelector('[data-l3-prev]');if(prev)prev.disabled=!l3.history.length;
 const completed=scene.querySelector('.l3-story-frame');completed?.classList.toggle('l3-story-finished',remaining===0&&!l3.preview);
}
function l3Enter(push=true){
 if(l3.scene){if(push){const u=new URL(location.href);u.searchParams.set('leitner','review');u.hash='#words';history.pushState({l3:true},'',u)}return}
 const panel=$('panel-words');let flash=panel?.querySelector('.flashcard');if(!flash)return;
 const scene=l3Build();l3.total=l3Due().length;l3.history=[];l3.preview=false;l3.historyIndex=0;l3.scrollY=window.scrollY;l3.focusMs=0;l3.focusOn=false;l3.focusStarted=0;l3.reportId='leitner-focus-'+Date.now()+'-'+Math.random().toString(36).slice(2);l3.recordedMinutes=0;
 l3.focus=document.activeElement;l3.flash=flash;l3.original=flash.parentNode;
 l3.actions=flash.querySelector('.timer-actions');l3.forgot=$('word-forgot');l3.known=$('word-remembered');
 scene.querySelector('[data-l3-card-slot]').append(flash);
 const voices=document.createElement('div');voices.className='l3-voice-options';voices.innerHTML='<button type="button" data-l3-voice="en-US" aria-label="'+tx('تلفظ آمریکایی','American pronunciation')+'">🇺🇸 <span>US</span> ◖))</button><button type="button" data-l3-voice="en-GB" aria-label="'+tx('تلفظ بریتانیایی','British pronunciation')+'">🇬🇧 <span>UK</span> ◖))</button>';flash.querySelector('#flash-front')?.after(voices);
 l3.observer=new MutationObserver(l3FitWord);const front=flash.querySelector('#flash-front');if(front)l3.observer.observe(front,{childList:true,characterData:true,subtree:true});requestAnimationFrame(l3FitWord);
 scene.querySelector('[data-l3-forgot-slot]').append(l3.forgot);
 scene.querySelector('[data-l3-known-slot]').append(l3.known);
 document.documentElement.classList.add('l3-story-open');document.body.classList.add('l3-story-open');
 if(push){const u=new URL(location.href);u.searchParams.set('leitner','review');u.hash='#words';history.pushState({leitner:'review'},'',u)}
 l3Sync();requestAnimationFrame(()=>$('word-reveal')?.focus({preventScroll:true}));
}
function l3Exit(navigate=true){
 if(!l3.scene)return;
 l3StopFocus();l3.observer?.disconnect();l3.observer=null;l3.scene.querySelector('.l3-voice-options')?.remove();
 if(l3.actions){l3.actions.append(l3.forgot,l3.known)}
 if(l3.flash&&l3.original)l3.original.insertBefore(l3.flash,l3.original.querySelector('#word-list'));
 l3.scene.remove();l3.scene=null;l3.flash=null;l3.actions=null;l3.forgot=null;l3.known=null;l3.history=[];l3.preview=false;
 document.documentElement.classList.remove('l3-story-open');document.body.classList.remove('l3-story-open');
 if(navigate){const u=new URL(location.href);u.searchParams.delete('leitner');u.hash='#words';history.replaceState(null,'',u);window.ElaraOpen?.('words',{history:'replace'});renderLeitner()}
 window.scrollTo({top:l3.scrollY,behavior:'instant'});
 if(navigate)requestAnimationFrame(()=>document.querySelector('[data-l2-review]')?.focus({preventScroll:true}));
}
function l3Previous(){
 if(!l3.scene||!l3.history.length||!window.ElaraLeitnerRevisit)return;
 const last=l3.history[l3.history.length-1];
 if(!window.ElaraLeitnerRevisit(last.id))return;
 l3.history.pop();l3.preview=false;l3.scene.classList.remove('l3-preview');
 l3.scene.querySelector('[data-l3-history]').hidden=true;
 l3Sync();requestAnimationFrame(()=>{l3FitWord();document.getElementById('word-reveal')?.focus({preventScroll:true})});
}
function l3Current(){
 if(!l3.scene)return;l3.preview=false;l3.scene.classList.remove('l3-preview');
 l3.scene.querySelector('[data-l3-history]').hidden=true;document.getElementById('word-reveal')?.focus({preventScroll:true});
}
function l3FitWord(){
 if(!l3.scene)return;const front=document.getElementById('flash-front'),slot=l3.scene.querySelector('[data-l3-card-slot]');if(!front||!slot)return;
 const text=(front.textContent||'').trim(),width=Math.max(180,slot.clientWidth-20);
 const size=Math.min(82,Math.max(16,Math.floor(width/(Math.max(text.length,1)*.67))));
 front.style.fontSize=size+'px';front.style.whiteSpace='nowrap';
}
function l3Seconds(){return Math.floor((l3.focusMs+(l3.focusOn?Date.now()-l3.focusStarted:0))/1000)}
function l3Tick(){
 if(!l3.scene)return;const sec=l3Seconds(),clock=l3.scene.querySelector('[data-l3-timer]');
 if(clock)clock.textContent=[Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(x=>String(x).padStart(2,'0')).join(':');
}
function l3CommitFocus(){
 const minutes=Math.floor(l3Seconds()/60);if(minutes<=l3.recordedMinutes)return;
 const uid=window.ElaraAccount?.user?.uid;if(!uid)return;
 const key='elara_language_journal_v1_'+uid,day=window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA');
 let rows;try{rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows))rows=[]}catch{rows=[]}
 const record={id:l3.reportId,date:day,minutes,words:l3.history.length,note:'مرور واژه‌ها · حالت تمرکز لایتنر'};
 const existing=rows.findIndex(row=>row?.id===record.id);if(existing>=0)rows[existing]=record;else rows.push(record);
 try{localStorage.setItem(key,JSON.stringify(rows));l3.recordedMinutes=minutes;window.dispatchEvent(new CustomEvent('elara:language-journal-changed',{detail:{uid,record}}))}catch(error){console.warn('Leitner study time was not saved',error)}
}
function l3StopFocus(){
 if(!l3.focusOn)return;l3.focusMs+=Date.now()-l3.focusStarted;l3.focusOn=false;
 clearInterval(l3.focusTicker);l3.focusTicker=null;l3CommitFocus();l3Tick();
 l3.scene?.querySelector('[data-l3-focus]')?.setAttribute('aria-pressed','false');
 const pause=l3.scene?.querySelector('[data-l3-pause]');if(pause){pause.textContent='▶';pause.disabled=false}
}
function l3ToggleFocus(){
 if(l3.focusOn){l3StopFocus();return}
 l3.focusOn=true;l3.focusStarted=Date.now();l3.focusTicker=setInterval(l3Tick,1000);l3Tick();
 l3.scene?.querySelector('[data-l3-focus]')?.setAttribute('aria-pressed','true');
 const pause=l3.scene?.querySelector('[data-l3-pause]');if(pause){pause.textContent='Ⅱ';pause.disabled=false}
}
function l3Speak(lang){
 const front=document.getElementById('flash-front')?.textContent||'';if(!front||!('speechSynthesis' in window))return;
 speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(front);utter.lang=lang;utter.rate=.88;
 const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase()===lang.toLowerCase());if(voice)utter.voice=voice;
 speechSynthesis.speak(utter);
}
function l3ResetDrag(){if(!l3.scene)return;l3.scene.classList.remove('l3-drag-yes','l3-drag-no');l3.scene.style.setProperty('--l3-drag','0px');l3.dragging=false;l3.pointerId=null}
function l3Route(){
 if(location.hash==='#words'&&new URLSearchParams(location.search).get('leitner')==='review'){if(l3.scene)return;const panel=$('panel-words');if(panel?.querySelector('.flashcard'))l3Enter(false);}
 else if(l3.scene)l3Exit(false);
}

// L2: view-only dashboard for the canonical #panel-words and elara_space_v1.words.
// All word creation, scheduling, deletion, and persistence stay in app.js.
function renderLeitner(){
 const panel=$('panel-words');if(!panel)return;
 let host=panel.querySelector('[data-l2-leitner]');if(!host){
  host=document.createElement('div');host.className='l2-leitner-shell';host.dataset.l2Leitner='';
  panel.prepend(host);
 }
 let data;try{data=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{data={}}
 const words=list(data.words),today=window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA');
 const due=words.filter(w=>!w.due||w.due<=today);
 const boxes=[1,2,3,4,5].map(box=>words.filter(w=>Number(w.box||1)===box).length);
 const all=words.length;
 const card=(key,label,value,icon)=>'<div class="l2-stat l2-stat-'+key+'"><span aria-hidden="true">'+icon+'</span><div><small>'+label+'</small><strong>'+num(value)+'</strong></div></div>';
 host.innerHTML='<section class="l2-leitner-hero"><div class="l2-leitner-copy"><span class="l2-eyebrow">SPACED REPETITION · ELARA</span><h1>'+tx('جعبه لایتنر','Leitner box')+'</h1><p>'+tx('واژه‌هایت را در پنج جعبه مرور کن؛ هر موفقیت، فاصلهٔ مرور بعدی را بیشتر می‌کند.','Review your vocabulary in five boxes. Successful recalls increase the time until the next review.')+'</p><div class="l2-hero-actions"><button type="button" class="l2-start-review" data-l2-review '+(!due.length?'disabled':'')+'>'+tx(due.length?'شروع مرور امروز':'مرور امروز کامل است',due.length?'Start today’s review':'Today’s review is complete')+' <span aria-hidden="true">←</span></button><button type="button" class="l2-add-word" data-l2-add>＋ '+tx('افزودن واژه','Add vocabulary')+'</button></div></div></section>'+
 '<section class="l2-leitner-stats" aria-label="'+tx('آمار واقعی لایتنر','Real Leitner statistics')+'">'+
 card('all',tx('کل واژه‌ها','Total words'),all,'▣')+
 card('due',tx('آمادهٔ مرور','Ready to review'),due.length,'↻')+
 card('new',tx('جعبه اول','First box'),boxes[0],'+')+
 card('learned',tx('جعبه پنجم','Fifth box'),boxes[4],'★')+'</section>'+
 '<section class="l2-leitner-boxes"><header><div><span class="l2-eyebrow">YOUR LEARNING PATH</span><h2>'+tx('مسیر پیشرفت لایتنر','Your Leitner journey')+'</h2><p>'+tx('هر واژه بر اساس نتیجهٔ مرور در جعبهٔ مناسب قرار می‌گیرد.','Each word moves between boxes based on your actual reviews.')+'</p></div><strong>'+num(all)+' '+tx('واژه','words')+'</strong></header><div class="l2-five-boxes">'+
 boxes.map((count,i)=>'<article class="l2-stage l2-stage-'+(i+1)+'"><div class="l2-stage-orb">'+num(i+1)+'</div><h3>'+tx('جعبه ','Box ')+num(i+1)+'</h3><strong>'+num(count)+'</strong><small>'+tx('واژه','words')+'</small><div class="l2-stage-meter"><i style="width:'+(all?Math.min(100,Math.round(count/all*100)):0)+'%"></i></div></article>').join('')+'</div></section>'+
 '<section class="l2-leitner-bottom"><div><h2>'+tx('مرور مرحله‌به‌مرحله','Focused step-by-step review')+'</h2><p>'+tx('کلمات سررسیدشده را یکی‌یکی مرور کن. معنی را ببین و سپس پاسخ خودت را ثبت کن.','Review due words one by one, reveal the meaning, then record your answer.')+'</p></div><button type="button" data-l2-review '+(!due.length?'disabled':'')+'>'+tx(due.length?'ورود به مرور کلمات':'واژهٔ سررسیدشده‌ای نیست',due.length?'Enter word review':'No words due')+' <span aria-hidden="true">←</span></button></section>';
 const form=$('word-form');if(form){form.classList.add('l2-word-form');form.setAttribute('aria-label',tx('افزودن واژه به سیستم اصلی','Add word to canonical Leitner'))}
 const flash=panel.querySelector('.flashcard');if(flash)flash.classList.add('l2-canonical-review');
}
function renderActive(){
 const name=location.hash.replace(/^#/,'');
 if(name==='language-tasks')renderTasks();
 if(name==='words'){renderLeitner();l3Route()}
 if(name==='language-channels')void renderChannels();
 if(name==='language-challenges')renderChallenges();
}
document.addEventListener('click',event=>{
 const score=event.target.closest('#word-remembered,#word-forgot');
 if(!score||!l3.scene||l3.preview)return;
 const front=$('flash-front')?.textContent||'',back=$('flash-back')?.textContent||'';
 if(!front)return;
 l3.history.push({id:$('flash-front')?.dataset.wordId,front,back});requestAnimationFrame(l3Sync);
},{capture:true});
document.addEventListener('keydown',event=>{
 if(!l3.scene||document.querySelector('.elara-dialog-root:not([hidden])'))return;
 if(event.key==='Escape'){event.preventDefault();l3Exit();return}
 if(event.key==='ArrowLeft'&&l3.history.length){event.preventDefault();l3Previous()}
 if(event.key==='ArrowRight'&&l3.preview){event.preventDefault();l3Current()}
});
document.addEventListener('pointerdown',event=>{
 const frame=event.target.closest?.('#l3-review-scene [data-l3-drag-surface]');
 if(!frame||event.target.closest('button')||event.button!==0||!l3.scene)return;
 l3.pointerX=event.clientX;l3.pointerId=event.pointerId;l3.dragging=true;
},{passive:true});
document.addEventListener('pointermove',event=>{
 if(!l3.scene||!l3.dragging||l3.pointerId!==event.pointerId)return;
 const delta=Math.max(-240,Math.min(240,event.clientX-l3.pointerX));
 l3.scene.style.setProperty('--l3-drag',delta+'px');
 l3.scene.classList.toggle('l3-drag-yes',delta>22);l3.scene.classList.toggle('l3-drag-no',delta< -22);
},{passive:true});
document.addEventListener('pointerup',event=>{
 if(!l3.scene||!l3.dragging||l3.pointerId!==event.pointerId)return;
 const delta=event.clientX-l3.pointerX,ready=!document.getElementById('word-remembered')?.classList.contains('hidden');
 l3ResetDrag();
 if(ready&&Math.abs(delta)>=Math.min(130,Math.max(85,l3.scene.querySelector('[data-l3-drag-surface]').clientWidth*.22)))
  document.getElementById(delta>0?'word-remembered':'word-forgot')?.click();
},{passive:true});
document.addEventListener('pointercancel',l3ResetDrag);
document.addEventListener('visibilitychange',()=>{if(document.hidden)l3StopFocus()});
window.addEventListener('pagehide',l3StopFocus);
document.addEventListener('input',e=>{if(e.target.matches('[data-lr4-channel-search]')){const el=e.target;channelQuery=el.value;const host=document.querySelector('#panel-language-channels [data-ui13-content="channels"]');if(host){const list=host.querySelectorAll('.lr4-channel-card');for(const row of list){const match=!channelQuery||row.textContent.toLocaleLowerCase().includes(channelQuery.toLocaleLowerCase());row.hidden=!match}}}});
document.addEventListener('click',e=>{
 const exit=e.target.closest('[data-l3-exit]');if(exit){e.preventDefault();l3Exit();return}
 const prev=e.target.closest('[data-l3-prev]');if(prev){e.preventDefault();l3Previous();return}
 const current=e.target.closest('[data-l3-current]');if(current){e.preventDefault();l3Current();return}
 const focus=e.target.closest('[data-l3-focus],[data-l3-pause]');if(focus){e.preventDefault();l3ToggleFocus();return}
 const speak=e.target.closest('[data-l3-voice]');if(speak){e.preventDefault();l3Speak(speak.dataset.l3Voice);return}
 const review=e.target.closest('[data-l2-review]');if(review){e.preventDefault();if(review.disabled)return;l3Enter(true);return}
 const addWord=e.target.closest('[data-l2-add]');if(addWord){e.preventDefault();$('panel-words')?.classList.add('l2-adding-word');document.getElementById('word-form')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('word-front')?.focus({preventScroll:true});return}
 const back=e.target.closest('[data-ui13-back]');if(back){e.preventDefault();window.ElaraOpen?.('language',{history:'push'});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));return}
 const go=e.target.closest('[data-ui13-canonical]');if(go){e.preventDefault();window.ElaraOpen?.(go.dataset.ui13Canonical,{history:'push'});return}
 const channelFilter=e.target.closest('[data-lr4-channel-filter]');if(channelFilter){e.preventDefault();channelMode=channelFilter.dataset.lr4ChannelFilter;void renderChannels();return}
  const challengeFilterBtn=e.target.closest('[data-lr4-challenge-filter]');if(challengeFilterBtn){e.preventDefault();challengeFilter=challengeFilterBtn.dataset.lr4ChallengeFilter;const host=document.querySelector('#panel-language-challenges [data-ui13-content="challenges"]');if(host)paintChallenges(host,languageChallengeCache);return}
  const challengeJump=e.target.closest('[data-ui13-friend-challenges]');if(challengeJump){e.preventDefault();window.ElaraOpen?.('social',{history:'push'});window.ElaraSocialView?.navigateSocialTab?.('social','challenges');return}
  const retry=e.target.closest('[data-ui13-retry]');if(retry){e.preventDefault();void renderChannels();return}
 const club=e.target.closest('[data-ui13-open-club]');if(club){e.preventDefault();void window.ElaraSocialClubsUI?.openClub?.(club.dataset.ui13OpenClub,club.dataset.ui13Owned==='1');return}
 const create=e.target.closest('[data-ui13-create-club]');if(create){e.preventDefault();void window.ElaraSocialClubsUI?.createClub?.('language');return}
});
for(const event of ['elara:open','elara:state-committed','elara:data-changed','elara:locale-changed','elara:auth-changed'])window.addEventListener(event,()=>{if(event==='elara:open'||(location.hash==='#language-tasks'||location.hash==='#words'))renderActive()});
window.addEventListener('hashchange',()=>{renderActive();l3Route()});window.addEventListener('popstate',l3Route);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderActive,{once:true});else renderActive();
window.ElaraLanguageDestinations={renderTasks,renderChannels,renderChallenges,renderLeitner,l3Enter,l3Exit,routes};
})();