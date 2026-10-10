/* UI12: Language-only reference dashboard. Canonical Tasks, Leitner, classes and books stay unchanged. */
(()=>{'use strict';
const $=id=>document.getElementById(id),list=v=>Array.isArray(v)?v:[],esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const en=()=>document.documentElement.lang==='en',tx=(fa,english)=>en()?english:fa;
const num=n=>Number(n||0).toLocaleString(en()?'en-US':'fa-IR'),pct=n=>Math.max(0,Math.min(100,Math.round(Number(n)||0)));
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),today=()=>window.ElaraSchedule?.today?.()||date(new Date());
const dateOffset=(n,origin=new Date())=>{const d=new Date(origin);d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return date(d)};
const state=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return{}}};
const account=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
const books=()=>list(window.ElaraLanguageBooks?.read?.());
const journal=()=>{const id=account();if(!id)return[];try{return list(JSON.parse(localStorage.getItem('elara_language_journal_v1_'+id)||'[]')).filter(r=>r&&typeof r.date==='string'&&/^20\d\d-\d\d-\d\d$/.test(r.date)&&Number.isInteger(r.minutes)&&r.minutes>0&&r.minutes<=1440)}catch{return[]}};
const classes=()=>list(state().languageClasses);
const words=()=>list(state().words);
const validImg=v=>/^data:image\/(?:png|webp|jpeg);base64,/i.test(String(v||''))&&String(v).length<=360000||/^https:\/\/covers\.openlibrary\.org\//i.test(String(v||''))?String(v):'';
let range='week',queued=false,started=false;
const route=r=>{if(r==='tasks'){window.ElaraOpen?.('tasks',{history:'push'});return}window.ElaraOpen?.(r,{history:'push'})};
function languageTasks(s,day){
 const api=window.ElaraTasks, due=t=>window.ElaraSchedule?.taskDue?.(t,day)!==false;
 return list(s.tasks).filter(t=>t?.sourceGroup==='language'&&due(t)).sort((a,b)=>Number(api?.taskDone?.(a,day)||false)-Number(api?.taskDone?.(b,day)||false)||(Number(a.priority)||4)-(Number(b.priority)||4));
}
function metrics(){
 const s=state(),day=today(),w=list(s.words),b=books(),c=list(s.languageClasses),j=journal(),tasks=languageTasks(s,day),due=w.filter(x=>!x.due||x.due<=day);
 const completed=tasks.filter(x=>window.ElaraTasks?.taskDone?.(x,day)).length;
 const sessionCount=c.reduce((n,x)=>n+list(x.sessionLogs).length,0);
 const pages=b.reduce((n,x)=>n+list(x.readingLogs).reduce((sum,l)=>sum+Math.max(0,Number(l.pagesRead)||0),0),0);
 const todayMinutes=j.filter(x=>x.date===day).reduce((n,x)=>n+x.minutes,0);
 const logged=new Set(j.map(x=>x.date));let cursor=logged.has(day)?0:-1,streak=0;
 while(logged.has(dateOffset(cursor))){streak++;cursor--}
 return {s,day,w,b,c,j,tasks,due,completed,sessionCount,pages,todayMinutes,streak};
}
const button=(routeName,label,cl='')=>'<button type="button" class="'+cl+'" data-ui12-route="'+routeName+'">'+label+'</button>';
function hero(host,m){
 const el=host.querySelector('.elara-language-hero');if(!el)return;
 el.classList.add('ui12-hero');el.setAttribute('dir',en()?'ltr':'rtl');
 el.innerHTML='<div class="language-hero-copy ui12-hero-copy"><small>'+tx('زبان — Elara Space','LANGUAGE — ELARA SPACE')+'</small><h1>'+tx('با زبان‌ها، جهان بزرگ‌تر می‌شود.','Languages make the world bigger.')+'</h1><p>'+tx('کلمات، پلی به انسان‌ها، فرهنگ‌ها و فرصت‌های تازه هستند.','Words connect us to people, cultures and new possibilities.')+'</p>'+button('continue',tx('سفر زبانت را ادامه بده','Continue your language journey')+' <span aria-hidden="true">◀</span>','ui12-primary')+'</div>';
 const latestBook=m.b.reduce((n,b)=>Math.max(n,Number(b.lastReadAt)||0),0);
 const latestClass=m.c.reduce((n,c)=>Math.max(n,Number(c.updatedAt)||0),0);
 const lastJournal=Math.max(0,...m.j.map(j=>Date.parse(j.date+'T12:00:00')||0));
 el.querySelector('[data-ui12-route=continue]').dataset.ui12Route=m.due.length?'words':latestBook>=latestClass&&latestBook>=lastJournal&&latestBook>0?'language-books':latestClass>=lastJournal&&m.c.length?'language-courses':lastJournal>0?'language-reports':m.w.length?'words':m.b.length?'language-books':m.c.length?'language-courses':'words';
}
/* All icons are real repository artwork; icons do not represent created user records. */
const shortcutArt={
 overview:'nav-home-active.webp',leitner:'22-leitner-box-icon.webp',
 books:'23-language-books-icon.webp',classes:'24-language-classes-icon.webp',
 channels:'nav-language-active.webp',tasks:'icon-tasks-check-alpha.webp',
 challenges:'11-challenges-icon.webp',report:'25-study-report-icon.webp',
 stats:'25-study-report-icon.webp'
};
const ui13Paths={"overview":"<path d=\"m3 11 9-8 9 8v10H3z\"/><path d=\"M9 21v-7h6v7\"/>","leitner":"<path d=\"m3 8 9-5 9 5-9 5z\"/><path d=\"m3 13 9 5 9-5\"/><path d=\"m3 18 9 5 9-5\"/>","books":"<path d=\"M12 7c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V6c-4-1-7-1-10 1z\"/><path d=\"M12 7v14\"/>","classes":"<circle cx=\"9\" cy=\"8\" r=\"3\"/><circle cx=\"18\" cy=\"9\" r=\"2\"/><path d=\"M2 21v-3c0-3 3-5 7-5s7 2 7 5v3z\"/><path d=\"M17 14c3 0 5 2 5 5v2h-4\"/>","channels":"<circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M7.7 7.7a6 6 0 0 0 0 8.6m8.6-8.6a6 6 0 0 1 0 8.6M4.2 4.2a11 11 0 0 0 0 15.6m15.6-15.6a11 11 0 0 1 0 15.6\"/>","tasks":"<rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\"/><path d=\"m7 12 3 3 7-7\"/>","challenges":"<path d=\"M6 3h12v7c0 4-3 7-6 7s-6-3-6-7z\"/><path d=\"M6 6H3v3c0 2 1 3 4 4m11-7h3v3c0 2-1 3-4 4M12 17v4m-4 0h8\"/>","report":"<path d=\"M4 20V11h4v9zm6 0V4h4v16zm6 0V8h4v12z\"/>","stats":"<path d=\"M4 20V11h4v9zm6 0V4h4v16zm6 0V8h4v12z\"/>"};
const ui13Icon=id=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(ui13Paths[id]||ui13Paths.overview)+'</svg>';
const shortcuts=[
 ['overview','نمای کلی','Overview'],['leitner','لایتنر','Leitner'],['books','کتاب‌های زبان','Language books'],['classes','کلاس‌ها','Classes'],
 ['channels','کانال‌ها','Channels'],['tasks','تسک‌های زبان','Language tasks'],['challenges','چالش‌ها','Challenges'],['report','گزارش زبان','Language report']
];
function card(id,title,extra='',action=''){
 return '<section id="ui12-'+id+'" class="ui12-card ui12-'+id+'" aria-labelledby="ui12-title-'+id+'"><header class="ui12-card-head"><h2 id="ui12-title-'+id+'"><span class="ui12-card-icon" aria-hidden="true">'+ui13Icon(id)+'</span>'+title+'</h2>'+(action?button(action,tx('مشاهده همه ←','View all →'),'ui12-link'):'')+'</header><div class="ui12-card-body" data-ui12-body="'+id+'"></div></section>';
}
function mount(host){
 if(host.querySelector('.ui12-board'))return;
 const jump=document.createElement('nav');jump.className='ui12-shortcuts';jump.setAttribute('aria-label',tx('بخش‌های زبان','Language sections'));
 jump.innerHTML=shortcuts.map(([id,fa,english],i)=>'<button type="button" data-ui12-jump="'+id+'" class="ui12-shortcut '+(!i?'is-active':'')+'"><span aria-hidden="true">'+ui13Icon(id)+'</span><strong>'+tx(fa,english)+'</strong></button>').join('');
 const board=document.createElement('div');board.className='ui12-board';board.innerHTML=
  card('leitner',tx('لایتنر امروز','Today’s Leitner'),'▱','words')+
  card('tasks',tx('تسک‌های زبان امروز','Today’s language tasks'),'☑','language-tasks')+
  card('books',tx('کتاب‌های زبان','Language books'),'▣','language-books')+
  card('stats',tx('آمار سریع زبان','Language quick stats'),'▥')+
  card('classes',tx('کلاس‌های زبان','Language classes'),'♙','language-courses')+
  card('channels',tx('کانال‌های زبان','Language channels'),'◉','language-channels')+
  card('challenges',tx('چالش‌های زبان','Language challenges'),'🏆','language-challenges')+
  card('report',tx('گزارش زبان','Language report'),'▥','language-reports');
 const heroEl=host.querySelector('.elara-language-hero');if(heroEl){heroEl.after(jump);jump.after(board)}else host.prepend(jump,board);
 host.classList.add('ui12-language');
}
function renderLeitner(m){
 const boxes=[1,2,3,4,5].map(n=>m.w.filter(x=>Number(x.box||1)===n).length);
 $('ui12-leitner').querySelector('[data-ui12-body]').innerHTML=
  '<div class="ui12-leitner-art"><p>'+tx('پنج جعبه، یک مسیر یادگیری','Five boxes, one learning journey')+'</p><div class="ui12-boxes" aria-label="'+tx('تعداد واقعی واژه‌ها در هر یک از پنج جعبه','Real word counts in each of five boxes')+'">'+boxes.map((count,i)=>'<div class="ui12-box ui12-box-'+(i+1)+'" title="'+tx('جعبه ','Box ')+num(i+1)+': '+num(count)+'"><b>'+num(count)+'</b><small>'+tx('جعبه ','Box ')+num(i+1)+'</small></div>').join('')+'</div>'+
  button('words',tx(m.due.length?'مرور کردن حالا':'رفتن به جعبه لایتنر',m.due.length?'Review now':'Open Leitner'),'ui12-gold')+'</div>'+
  '<div class="ui12-leitner-meta"><span><b>'+num(m.w.length)+'</b>'+tx('کل کلمات','Total words')+'</span><span><b>'+num(m.due.length)+'</b>'+tx('در انتظار مرور','Due to review')+'</span><span><b>'+num(boxes[4])+'</b>'+tx('جعبه پنجم','In box five')+'</span></div>';
}
function renderTasks(m){
 const done=m.completed,total=m.tasks.length;
 const rows=m.tasks.slice(0,5).map(t=>{
 const complete=!!window.ElaraTasks?.taskDone?.(t,m.day);
 return '<div class="ui12-task '+(complete?'is-done':'')+'"><button type="button" data-section-task-toggle="'+esc(t.id)+'" aria-pressed="'+complete+'" aria-label="'+esc(tx('تغییر وضعیت تسک','Toggle task'))+'" '+(t.sourceCompletionLocked?'disabled':'')+'><span aria-hidden="true">'+(complete?'✓':'')+'</span></button><button type="button" data-section-task-detail="'+esc(t.id)+'" dir="auto" data-elara-ugc>'+esc(t.text||'')+'</button></div>'
 }).join('');
 $('ui12-tasks').querySelector('[data-ui12-body]').innerHTML=
  '<p class="ui12-progress-label">'+tx('انجام شده','Completed')+' <b>'+num(done)+' / '+num(total)+'</b></p><div class="ui12-track"><i style="width:'+(total?pct(done/total*100):0)+'%"></i></div>'+
  '<div class="ui12-task-list">'+(rows||'<p class="ui12-empty">'+tx('برای امروز تسک زبانی نداری.','No language tasks today.')+'</p>')+'</div>'+
  (total>5?'<p class="ui12-more-count">'+tx('و ','And ')+num(total-5)+tx(' تسک دیگر',' more tasks')+'</p>':'')+
  '<button type="button" class="ui12-primary ui12-add" data-section-task-add="language">+ '+tx('افزودن تسک زبان','Add language task')+'</button>';
}
function renderBooks(m){
 const rows=m.b.slice(0,3).map(b=>{
 const cover=validImg(b.coverData)||validImg(b.coverUrl),progress=b.totalPages?pct((Number(b.currentPage)||0)/b.totalPages*100):0;
 return '<article class="ui12-book"><div class="ui12-book-cover">'+(cover?'<img src="'+esc(cover)+'" alt="" loading="eager" decoding="async">':'<img src="assets/ui/23-language-books-icon.webp" alt="" loading="eager" decoding="async">')+'</div><strong data-elara-ugc dir="auto" title="'+esc(b.title)+'">'+esc(b.title)+'</strong><small>'+esc(b.language||tx('کتاب زبان','Language book'))+'</small><div class="ui12-track" role="progressbar" aria-valuenow="'+progress+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+progress+'%"></i></div><span>'+num(progress)+'٪</span></article>';
 }).join('');
 const html=m.b.length?'<div class="ui12-book-grid">'+rows+'</div>':empty('23-language-books-icon.webp',tx('هنوز کتاب زبانی ثبت نکردی.','No language books yet.'),tx('افزودن کتاب','Add a book'),'language-books');
 const body=$('ui12-books').querySelector('[data-ui12-body]');
 if(body.innerHTML!==html)body.innerHTML=html;
}
function stat(label,value,emoji){return '<div class="ui12-stat"><span aria-hidden="true">'+emoji+'</span><div><b>'+num(value)+'</b><small>'+label+'</small></div></div>'}
function renderStats(m){
 $('ui12-stats').querySelector('[data-ui12-body]').innerHTML=
  stat(tx('روز متوالی ثبت مطالعه','Consecutive logged days'),m.streak,'🔥')+
  stat(tx('کل کلمات','Total words'),m.w.length,'📖')+
  stat(tx('در انتظار مرور','Due for review'),m.due.length,'◷')+
  stat(tx('دقیقه مطالعه امروز','Minutes studied today'),m.todayMinutes,'⏱');
}
function empty(art,msg,cta,routeName){
 return '<div class="ui12-empty-state"><img src="assets/ui/'+art+'" alt="" loading="lazy"><p>'+msg+'</p>'+(routeName?button(routeName,cta,'ui12-outline'):'')+'</div>';
}
function renderClasses(m){
 const rows=m.c.slice().sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0)).slice(0,4).map(c=>{
 const total=Math.max(1,Number(c.terms)||1)*Math.max(1,Number(c.sessionsPerTerm)||1),done=list(c.sessionLogs).length;
 return '<button class="ui12-class-row" type="button" data-ui12-route="language-courses"><span class="ui12-class-avatar" aria-hidden="true">♙</span><span><strong data-elara-ugc dir="auto">'+esc(c.title)+'</strong><small>'+tx(c.collabSpaceId?'مشترک':'شخصی',c.collabSpaceId?'Shared':'Personal')+' · '+num(done)+' / '+num(total)+' '+tx('جلسه','sessions')+'</small></span><span aria-hidden="true">‹</span></button>';
 }).join('');
 $('ui12-classes').querySelector('[data-ui12-body]').innerHTML=rows||'<p class="ui12-empty">'+tx('هنوز کلاس زبانی ثبت نشده است.','No language classes yet.')+'</p>';
 $('ui12-classes').querySelector('[data-ui12-body]').insertAdjacentHTML('beforeend','<button type="button" class="ui12-primary ui12-add" data-ui12-new-class>+ '+tx('ایجاد کلاس جدید','Create class')+'</button>');
}
function renderUnavailable(){
 $('ui12-channels').querySelector('[data-ui12-body]').innerHTML=empty('24-language-classes-icon.webp',tx('کانال زبان هنوز به سیستم واقعی متصل نیست. هیچ عضو یا کانال ساختگی نمایش داده نمی‌شود.','Language channels are not connected to a real service yet. No fabricated members or channels.'),'','');
 $('ui12-challenges').querySelector('[data-ui12-body]').innerHTML=empty('11-challenges-icon.webp',tx('چالش زبان هنوز پشتیبانی داده‌ای مستقل ندارد.','Language challenges do not have a dedicated data source yet.'),'','');
}
function bucketRows(rows,kind){
 const now=new Date(),out=[];
 if(kind==='week'||kind==='month'){
  const count=kind==='week'?7:30;
  for(let i=count-1;i>=0;i--){const d=dateOffset(-i);out.push({label:new Date(d+'T12:00:00').toLocaleDateString(en()?'en-US':'fa-IR',{day:'numeric'}),minutes:rows.filter(r=>r.date===d).reduce((a,r)=>a+r.minutes,0)})}
 }else if(kind==='quarter'){
  for(let i=12;i>=0;i--){const start=dateOffset(-i*7-6),end=dateOffset(-i*7);out.push({label:new Date(end+'T12:00:00').toLocaleDateString(en()?'en-US':'fa-IR',{month:'short',day:'numeric'}),minutes:rows.filter(r=>r.date>=start&&r.date<=end).reduce((a,r)=>a+r.minutes,0)})}
 }else{
  for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),ym=date(d).slice(0,7);out.push({label:d.toLocaleDateString(en()?'en-US':'fa-IR',{month:'short'}),minutes:rows.filter(r=>r.date.slice(0,7)===ym).reduce((a,r)=>a+r.minutes,0)})}
 }
 return out;
}
function renderReport(m){
 const options=[['week','هفته','Week'],['month','ماه','Month'],['quarter','۳ ماه','3 months'],['year','سال','Year']];
 const chart=bucketRows(m.j,range),max=Math.max(1,...chart.map(x=>x.minutes)),hasData=chart.some(x=>x.minutes>0);
 const nav='<div class="ui12-range" aria-label="'+tx('بازه گزارش','Report range')+'">'+options.map(([key,fa,english])=>'<button type="button" data-ui12-range="'+key+'" aria-pressed="'+(range===key)+'" class="'+(range===key?'active':'')+'">'+tx(fa,english)+'</button>').join('')+'</div>';
 const bars=hasData?'<div class="ui12-chart" role="img" aria-label="'+esc(tx('نمودار زمان مطالعه واقعی به دقیقه','Actual study minutes chart'))+'">'+chart.map((x,i)=>'<div class="ui12-chart-column" title="'+esc(x.label+' · '+num(x.minutes)+' '+tx('دقیقه','minutes'))+'"><span>'+num(x.minutes)+'</span><i style="height:'+(x.minutes/max*100)+'%"></i><small>'+(range==='month'&&i%4!==0?'':esc(x.label))+'</small></div>').join('')+'</div>':'<p class="ui12-report-empty">'+tx('هنوز زمان مطالعه ثبت نشده؛ پس نمودار خالی است. از گزارش زبان زمان مطالعه‌ات را ثبت کن.','No study time has been logged for this period. Log a session in Language report to see your chart.')+'</p>';
 $('ui12-report').querySelector('[data-ui12-body]').innerHTML=nav+bars+'<div class="ui12-report-totals">'+stat(tx('کلمات','Words'),m.w.length,'📖')+stat(tx('جلسات کلاس','Class sessions'),m.sessionCount,'♙')+stat(tx('صفحات خوانده‌شده','Pages read'),m.pages,'▤')+'</div>';
}
function render(){
 const host=$('panel-language');if(!host||!host.querySelector('.elara-language-hero'))return;
 mount(host);const m=metrics();hero(host,m);
 const nav=host.querySelector('.ui12-shortcuts');if(nav)nav.setAttribute('aria-label',tx('بخش‌های زبان','Language sections'));
 renderLeitner(m);renderTasks(m);renderBooks(m);renderStats(m);renderClasses(m);renderUnavailable();renderReport(m);
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
function init(){
 if(started)return;started=true;
 document.addEventListener('click',e=>{
 const jump=e.target.closest('[data-ui12-jump]');if(jump&&jump.closest('#panel-language')){e.preventDefault();const id=jump.dataset.ui12Jump;document.querySelectorAll('#panel-language .ui12-shortcut').forEach(el=>el.classList.toggle('is-active',el===jump));const routes={leitner:'words',books:'language-books',classes:'language-courses',channels:'language-channels',tasks:'language-tasks',challenges:'language-challenges',report:'language-reports'};if(id==='overview')document.querySelector('#panel-language .ui12-hero')?.scrollIntoView({block:'start'});else route(routes[id]);return}
 const open=e.target.closest('[data-ui12-route]');if(open&&open.closest('#panel-language')){e.preventDefault();route(open.dataset.ui12Route);return}
 const create=e.target.closest('[data-ui12-new-class]');if(create&&create.closest('#panel-language')){e.preventDefault();if(window.ElaraLanguageClasses?.openEditor)void window.ElaraLanguageClasses.openEditor({});else route('language-courses');return}
 const button=e.target.closest('[data-ui12-range]');if(button&&button.closest('#panel-language')){e.preventDefault();range=button.dataset.ui12Range;renderReport(metrics())}
 });
 for(const event of ['elara:open','elara:data-changed','elara:state-committed','elara:hydrate','elara:locale-changed','elara:language-rendered','elara:language-journal-changed','elara:account-ready','elara:auth-changed','elara:logout'])window.addEventListener(event,schedule);
 window.addEventListener('storage',schedule);
 schedule();setTimeout(schedule,500);
 window.ElaraLanguageUI12={refresh:render,metrics,bucketRows};
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();