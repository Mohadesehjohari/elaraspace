/* LIB-01: real-data library overview. Canonical books, clips, task actions and Pomodoro remain owned by existing modules. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>document.documentElement.lang==='en'?'en':'fa';
const t=(fa,en)=>lang()==='en'?en:fa;
const num=n=>Number(n||0).toLocaleString(lang()==='en'?'en-US':'fa-IR');
const nav=(route,label,icon,active=false)=>'<button type="button" class="lib01-tab'+(active?' is-current':'')+'" data-lib01-route="'+route+'"><span aria-hidden="true">'+icon+'</span>'+label+'</button>';
const state=()=>{try{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return s&&typeof s==='object'?s:{}}catch{return{}}};
const books=s=>Array.isArray(s.books)?s.books.map(b=>window.ElaraReading?.normalize?.(b)||b):[];
const clips=s=>Array.isArray(s.bookClips)?s.bookClips:[];
const pct=b=>window.ElaraReading?.progress?.(b)||0;
const cover=b=>b.coverData||b.coverUrl||'assets/ui/icon-library-open-book.webp';
const empty=(text,route,label)=>'<div class="lib01-empty"><span aria-hidden="true">✦</span><p>'+text+'</p>'+(route?'<button type="button" data-lib01-route="'+route+'">'+label+' ←</button>':'')+'</div>';
function hero(panel){
 const h=panel.querySelector(':scope > .elara-global-hero');
 if(!h)return;
 h.classList.add('lib01-hero');
 if(!h.querySelector('.lib01-hero-body'))h.innerHTML='<div class="lib01-hero-body"><span class="lib01-kicker">ELARA · LIBRARY</span><h1>📖 '+t('کتابخانه','Library')+'</h1><p>'+t('جایی برای ساختن نسخه‌ای عمیق‌تر از خودت','A quiet place for a more thoughtful you')+'</p></div><blockquote>'+t('«کتاب‌ها سفرهای کوچکی هستند به جهان‌های ممکن.»','“A book is a small journey into new worlds.”')+'</blockquote>';
}
function toolbar(){
 return '<nav class="lib01-shortcuts" aria-label="'+t('مسیرهای کتابخانه','Library shortcuts')+'">'+
 nav('books',t('نمای کلی','Overview'),'⌂',true)+
 nav('library-shelves',t('کتاب‌های من','My books'),'▣')+
 nav('library-search',t('جست‌وجو','Search'),'⌕')+
 nav('library-clips',t('بریده‌های من','My clips'),'❝')+
 '<button type="button" class="lib01-tab" data-lib01-route="library-clips"><span aria-hidden="true">❞</span>'+t('نقل‌قول‌ها','Quotes')+'</button>'+
 nav('library-shelves',t('قفسه‌ها','Shelves'),'▤')+
 '<button type="button" class="lib01-tab" data-lib01-explore="authors"><span aria-hidden="true">♙</span>'+t('نویسندگان','Authors')+'</button>'+
 '<button type="button" class="lib01-tab" data-lib01-explore="genres"><span aria-hidden="true">◇</span>'+t('ژانرها','Genres')+'</button></nav>'+
 '<button type="button" class="lib01-add" data-lib01-add>＋ '+t('ثبت کتاب جدید','Add book')+'</button>';
}
function statusCard(s,bs){
 const withTotal=bs.filter(b=>Number(b.totalPages)>0),total=withTotal.reduce((n,b)=>n+Number(b.totalPages),0),
 read=withTotal.reduce((n,b)=>n+Math.min(Number(b.currentPage)||0,Number(b.totalPages)),0),
 progress=total?Math.round(read/total*100):0;
 const reading=bs.filter(b=>b.shelf==='reading').length,finished=bs.filter(b=>b.shelf==='finished').length;
 return '<section class="lib01-card lib01-status"><header><h2>◉ '+t('وضعیت مطالعه','Reading status')+'</h2></header><div class="lib01-status-main"><div class="lib01-ring" role="progressbar" aria-label="'+t('پیشرفت صفحات ثبت‌شده','Progress of tracked book pages')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'" style="--lib01-progress:'+progress+'"><strong>'+num(progress)+'٪</strong><small>'+t('پیشرفت صفحات','Page progress')+'</small></div><dl><div><dt>'+t('همه کتاب‌ها','Total books')+'</dt><dd>'+num(bs.length)+'</dd></div><div><dt>'+t('در حال مطالعه','Reading')+'</dt><dd>'+num(reading)+'</dd></div><div><dt>'+t('خوانده‌شده','Finished')+'</dt><dd>'+num(finished)+'</dd></div><div><dt>'+t('صفحات ثبت‌شده','Tracked pages')+'</dt><dd>'+num(read)+'</dd></div></dl></div><footer><button type="button" data-lib01-route="library-reports">'+t('مشاهده گزارش کامل','Full reading report')+' ←</button></footer></section>';
}
function taskCard(s){
 const day=window.ElaraSchedule?.today?.()||new Date().toISOString().slice(0,10);
 const tasks=(Array.isArray(s.tasks)?s.tasks:[]).filter(x=>x?.sourceGroup==='book'&&window.ElaraSchedule?.taskDue?.(x,day)!==false).slice(0,5);
 const rows=tasks.map(a=>{
 const done=!!window.ElaraTasks?.taskDone?.(a,day);
 return '<li><button type="button" class="lib01-task-check" data-section-task-toggle="'+esc(a.id)+'" aria-pressed="'+done+'" aria-label="'+(done?t('بازگرداندن تسک','Undo task'):t('تکمیل تسک','Complete task'))+'" '+(a.sourceCompletionLocked?'disabled':'')+'>'+(done?'✓':'')+'</button><button type="button" class="lib01-task-title'+(done?' is-done':'')+'" data-section-task-detail="'+esc(a.id)+'" data-elara-ugc dir="auto">'+esc(a.text||a.title||t('تسک کتابخانه','Library task'))+'</button></li>'
 }).join('');
 return '<section class="lib01-card lib01-tasks"><header><h2>☷ '+t('تسک‌های کتابخانه','Library tasks')+'</h2><button type="button" data-section-task-add="book" aria-label="'+t('افزودن تسک کتابخانه','Add library task')+'">＋</button></header>'+(tasks.length?'<ul>'+rows+'</ul>':empty(t('هنوز تسک مربوط به کتابخانه نداری.','No library tasks yet.')))+'<footer><button type="button" data-section-task-add="book">'+t('افزودن تسک','Add task')+' ＋</button></footer></section>';
}
function bookCard(b){
 const progress=pct(b);
 return '<article class="lib01-book"><img loading="lazy" src="'+esc(cover(b))+'" alt="'+esc(t('جلد ','Cover of ')+b.title)+'"><div><strong data-elara-ugc dir="auto">'+esc(b.title)+'</strong><small data-elara-ugc dir="auto">'+esc(b.author||t('نویسنده ثبت نشده','No author recorded'))+'</small><div class="lib01-progress" role="progressbar" aria-label="'+esc(b.title)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><i style="width:'+progress+'%"></i></div><small>'+num(progress)+'٪ · '+t('صفحه','Page')+' '+num(b.currentPage)+' / '+(b.totalPages?num(b.totalPages):'—')+'</small><button type="button" class="lib01-continue" data-reading-book="'+esc(b.id)+'">'+t('ادامه مطالعه','Continue reading')+'</button></div><button type="button" class="lib01-bookmark" data-lib01-bookmark="'+esc(b.id)+'" aria-pressed="'+!!b.bookmarked+'" aria-label="'+esc((b.bookmarked?t('برداشتن نشان ','Remove bookmark from '):t('نشان‌کردن ','Bookmark '))+b.title)+'">'+(b.bookmarked?'◆':'◇')+'</button></article>';
}
function continueCard(bs){
 const reading=bs.filter(b=>b.shelf==='reading').sort((a,b)=>Number(b.lastReadAt||0)-Number(a.lastReadAt||0)).slice(0,4);
 return '<section class="lib01-card lib01-continue-card"><header><h2>📖 '+t('ادامه مطالعه','Continue reading')+'</h2><button type="button" data-lib01-route="library-shelves">'+t('مشاهده همه','View all')+' ←</button></header>'+(reading.length?'<div class="lib01-book-grid">'+reading.map(bookCard).join('')+'</div>':empty(t('کتابی در وضعیت «در حال مطالعه» ثبت نشده است.','You have no books in progress. Starting one will show it here.'),'library-shelves',t('رفتن به کتاب‌ها','Go to books')))+'</section>';
}
function clipsCard(s,bs){
 const list=clips(s).slice().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,3).filter(c=>String(c.text||'').trim());
 const cards=list.map((c,i)=>{
 const b=bs.find(x=>x.id===c.bookId);
 return '<article class="lib01-clip paper-'+i+'"><blockquote dir="auto" data-elara-ugc>“'+esc(String(c.text).slice(0,360))+'”</blockquote><p><span data-elara-ugc dir="auto">'+esc(b?.title||t('بریده شخصی','Personal clip'))+'</span>'+((c.page!==null&&c.page!==undefined&&c.page!=='')?' · '+t('ص','p.')+' '+num(c.page):'')+'</p><button type="button" data-library-open-clip="'+esc(c.id)+'">'+t('مشاهده / ویرایش','View / edit')+' ↗</button></article>';
 }).join('');
 return '<section class="lib01-card lib01-clips"><header><h2>❝ '+t('بریده‌های اخیر','Recent clips')+'</h2><button type="button" data-lib01-route="library-clips">'+t('مشاهده همه','View all')+' ←</button></header>'+(cards?'<div class="lib01-clips-grid">'+cards+'</div>':empty(t('هنوز بریده‌ای ثبت نکرده‌ای.','Save a passage from a book to see it here.'),'library-clips',t('افزودن بریده','Add a clip')))+'</section>';
}
function reportCard(bs){
 const s=window.ElaraReading?.summary?.(bs)||{today:0,week:0,month:0};
 return '<section class="lib01-card lib01-report"><header><h2>▥ '+t('گزارش مطالعه','Reading report')+'</h2><button type="button" data-lib01-route="library-reports">'+t('جزئیات','Details')+' ←</button></header><div class="lib01-report-metrics"><div><strong>'+num(s.today)+'</strong><small>'+t('صفحه امروز','Pages today')+'</small></div><div><strong>'+num(s.week)+'</strong><small>'+t('این هفته','This week')+'</small></div><div><strong>'+num(s.month)+'</strong><small>'+t('این ماه','This month')+'</small></div></div>'+(window.ElaraReading?.chart?.(bs)||'')+'<p class="lib01-data-note">'+t('نمودار فقط از تاریخچه واقعی صفحات خوانده‌شده ساخته شده است.','Chart uses recorded reading logs, not estimates.')+'</p></section>';
}
function focusCard(){
 const timer=$('#timer-display')?.textContent?.trim()||'25:00';
 return '<section class="lib01-card lib01-focus"><header><h2>✹ '+t('اتاق تمرکز','Focus room')+'</h2><button type="button" data-lib01-route="focus-pomodoro">'+t('ورود به اتاق','Enter room')+' ↗</button></header><div class="lib01-focus-scene"><div class="lib01-focus-dial"><strong data-lib01-timer>'+esc(timer)+'</strong><small>'+t('پومودورو','Pomodoro')+'</small><button type="button" data-lib01-route="focus-pomodoro" aria-label="'+t('باز کردن پومودورو','Open Pomodoro')+'">▶</button></div></div><div class="lib01-focus-modes"><span>📖 '+t('مطالعه','Reading')+'</span><span>✎ '+t('نوشتن','Writing')+'</span><span>◈ '+t('کار عمیق','Deep work')+'</span><span>☼ '+t('مدیتیشن','Meditation')+'</span></div><p class="lib01-data-note">'+t('تنظیم و شروع تایمر در اتاق تمرکز انجام می‌شود.','Configure and start your actual timer in the focus room.')+'</p></section>';
}
function shelvesCard(s,bs){
 const shelves=Array.isArray(s.bookShelves)?s.bookShelves:[];
 return '<section class="lib01-card lib01-shelves"><div><h2>▤ '+t('قفسه‌های من','My shelves')+'</h2><p>'+t('کتاب‌های تو در سه وضعیت مطالعه و ','Your books in three reading states and ')+num(shelves.length)+t(' قفسه شخصی',' custom shelves')+'</p><button type="button" data-lib01-route="library-shelves">'+t('باز کردن قفسه‌ها','Open shelves')+' ←</button></div></section>';
}
function render(){
 const panel=$('#panel-books'),root=panel?.querySelector(':scope > #lib01-overview');
 if(!root)return;
 const s=state(),bs=books(s);
 hero(panel);
 root.innerHTML='<div class="lib01-actions">'+toolbar()+'</div><div class="lib01-grid">'+
 '<div class="lib01-col lib01-col-focus">'+focusCard()+reportCard(bs)+'</div>'+
 '<div class="lib01-col lib01-col-reading">'+continueCard(bs)+clipsCard(s,bs)+'</div>'+
 '<div class="lib01-col lib01-col-status">'+statusCard(s,bs)+taskCard(s)+'</div>'+
 '</div><div class="lib01-bottom">'+shelvesCard(s,bs)+'<section class="lib01-card lib01-challenge"><h2>✦ '+t('چالش مطالعه','Reading challenge')+'</h2><p>'+t('گام بعدی خودت را با تسک‌ها و مطالعه واقعی بساز.','Build your next milestone with real tasks and reading.')+'</p><button type="button" data-lib01-route="library-reports">'+t('گزارش پیشرفت','Progress report')+' ←</button></section></div>';
 const h=panel.querySelector(':scope > .elara-global-hero');
 if(h)h.setAttribute('aria-label',t('بنر اصلی کتابخانه','Main library banner'));
}
let watching=null,queued=false,ready=false;
function mount(){
 const p=$('#panel-books');
 if(!p||!window.ElaraReading||!window.ElaraFeatureHubs||!p.querySelector(':scope > .elara-global-hero'))return false;
 let root=p.querySelector(':scope > #lib01-overview');
 if(!root){root=document.createElement('div');root.id='lib01-overview';root.className='lib01-overview';root.dir='rtl';const h=p.querySelector(':scope > .elara-global-hero');h.insertAdjacentElement('afterend',root)}
 if(watching){watching.disconnect();watching=null}
 ready=true;render();
 return true;
}
function schedule(){
 if(queued)return;queued=true;
 queueMicrotask(()=>{queued=false;if(ready)render();else mount()});
}
function begin(){
 if(mount())return;
 const p=$('#panel-books');if(!p)return;
 watching=new MutationObserver(()=>{if(mount())watching?.disconnect()});
 watching.observe(p,{childList:true});
}
document.addEventListener('click',e=>{
 const route=e.target.closest('#lib01-overview [data-lib01-route]');
 if(route){e.preventDefault();window.ElaraOpen?.(route.dataset.lib01Route,{history:'push'});return}
 const add=e.target.closest('#lib01-overview [data-lib01-add]');
 if(add){e.preventDefault();window.ElaraOpen?.('library-shelves',{history:'push'});setTimeout(()=>$('#book-title')?.focus(),150);return}
 const bookmark=e.target.closest('#lib01-overview [data-lib01-bookmark]');
 if(bookmark){
  e.preventDefault();const s=state(),bs=Array.isArray(s.books)?s.books:[],i=bs.findIndex(b=>String(b.id)===bookmark.dataset.lib01Bookmark);
  if(i!==-1){s.books=bs.slice();s.books[i]={...bs[i],bookmarked:!bs[i].bookmarked};window.ElaraReading?.commit?.(s.books)}
  return;
 }
 const explorer=e.target.closest('#lib01-overview [data-lib01-explore]');
 if(explorer){e.preventDefault();void explore(explorer.dataset.lib01Explore)}
});
async function explore(kind){
 const bs=books(state()),field=kind==='authors'?'author':'genre',
 unique=[...new Set(bs.map(b=>String(b[field]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,lang()));
 const container=document.createElement('div');container.className='lib01-explore';
 container.innerHTML=unique.length?unique.map(name=>{
  const matching=bs.filter(b=>String(b[field]||'').trim()===name);
  return '<section><h3 data-elara-ugc dir="auto">'+esc(name)+'</h3><p>'+num(matching.length)+' '+t('کتاب','books')+'</p><div>'+matching.map(b=>'<button type="button" data-reading-book="'+esc(b.id)+'" data-elara-ugc dir="auto">'+esc(b.title)+'</button>').join('')+'</div></section>';
 }).join(''):empty(t('برای کتاب‌های فعلی هنوز این اطلاعات ثبت نشده است.','No matching metadata has been recorded for your books.'),'library-shelves',t('ویرایش اطلاعات کتاب','Edit book details')).replace('data-lib01-route','data-feature-route');
 await window.ElaraDialog?.open?.({title:kind==='authors'?t('نویسندگان کتاب‌های من','My authors'):t('ژانرهای کتاب‌های من','My genres'),content:container,actions:[{label:t('بستن','Close'),value:false}]});
}
const syncTimer=()=>{
 const text=$('#timer-display')?.textContent?.trim();
 if(text)document.querySelectorAll('#lib01-overview [data-lib01-timer]').forEach(n=>{if(n.textContent!==text)n.textContent=text});
};
let timerObserved=false;
function watchTimer(){
 if(timerObserved)return;
 const timer=$('#timer-display');if(!timer)return;
 timerObserved=true;new MutationObserver(syncTimer).observe(timer,{subtree:true,characterData:true,childList:true});
}
for(const ev of ['elara:state-committed','elara:data-changed','elara:locale-changed','elara:open','elara:hydrate'])window.addEventListener(ev,()=>{schedule();watchTimer()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{begin();watchTimer()},{once:true});else{begin();watchTimer()}
window.ElaraLibraryDashboardLIB01={refresh:schedule};
})();