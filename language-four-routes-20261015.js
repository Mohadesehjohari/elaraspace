/* Language Books & Reports visual ownership. Source of truth stays with ApprovedVisual. */
(()=>{'use strict';
if(window.ElaraLanguageReferenceV4)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const fmt=n=>Number(n||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');
const arr=v=>Array.isArray(v)?v:[];
const data=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')||{}}catch{return{}}};
const books=()=>{try{return arr(JSON.parse(localStorage.getItem('elara_language_books_v2')||'[]'))}catch{return[]}};
const dateKey=at=>{const date=new Date(at);if(!Number.isFinite(date.getTime()))return'';return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')};
const today=()=>dateKey(Date.now());
const dateOffset=n=>{const day=new Date();day.setDate(day.getDate()+n);return dateKey(day)};
let filter='all',bookQuery='',reportDays=7;
function bookMetrics(rows){
 const reading=rows.filter(b=>b.shelf!=='finished');
 const completed=rows.filter(b=>b.shelf==='finished');
 const since=dateOffset(-6);
 const logs=rows.flatMap(b=>arr(b.readingLogs).map(log=>({date:String(log.date||dateKey(log.timestamp||log.at||'')),pages:Math.max(0,Number(log.pagesRead)||0)})));
 const recent=logs.filter(l=>l.date>=since&&l.date<=today()).reduce((n,l)=>n+l.pages,0);
 return {reading:reading.length,completed:completed.length,recent,logs}
}
const stat=(sym,n,label,cls)=>'<article class="lr4-stat lr4-stat-'+cls+'"><div class="lr4-stat-symbol" aria-hidden="true">'+sym+'</div><div><strong>'+fmt(n)+'</strong><small>'+label+'</small></div></article>';
function titleSection(kind,fa,en,detail){
 return '<div class="lr4-route-hero lr4-route-hero-'+kind+'"><button type="button" class="lr4-back" data-feature-route="language">← '+tx('بازگشت به زبان','Back to language')+'</button><div class="lr4-route-hero-copy"><small>ELARA SPACE · LANGUAGE</small><h1>'+tx(fa,en)+'</h1><p>'+detail+'</p></div></div>';
}
function setupBooks(){
 const root=$('panel-language-books');
 if(!root||root.querySelector('.lr4-books-shell'))return;
 const source=root.querySelector('[data-language-block="books"]'),form=$('language-book-form'),bookList=$('language-book-list');
 if(!source||!form||!bookList)return;
 root.classList.add('lr4-owner','lr4-books-route');
 const wrap=document.createElement('div');wrap.className='lr4-books-shell';wrap.dataset.elaraI18n='off';
 wrap.innerHTML=titleSection('books','کتاب‌های زبان','Language books',tx('داستان‌ها و کتاب‌ها، یک سفر تازه برای یادگیری زبان.','Grow your language skills through every book you read.'))+
 '<div class="lr4-book-stats" data-lr4-book-stats></div>'+
 '<div class="lr4-books-layout"><section class="lr4-books-main lr4-panel"><div class="lr4-panel-heading"><div><small>MY LANGUAGE LIBRARY</small><h2>'+tx('کتاب‌های من','My language books')+'</h2></div><span data-lr4-book-count class="lr4-count"></span></div>'+
 '<div class="lr4-book-toolbar"><div class="lr4-pills" role="group" aria-label="'+tx('وضعیت کتاب‌ها','Book filters')+'">'+[['all',tx('همهٔ کتاب‌ها','All books')],['reading',tx('در حال مطالعه','Reading')],['finished',tx('خوانده‌شده','Finished')]].map(([key,label])=>'<button type="button" data-lr4-book-filter="'+key+'" class="lr4-pill '+(filter===key?'is-current':'')+'" aria-pressed="'+(filter===key)+'">'+label+'</button>').join('')+'</div><label class="lr4-book-search"><span aria-hidden="true">⌕</span><input type="search" data-lr4-book-query aria-label="'+tx('جست‌وجوی کتاب','Search books')+'" placeholder="'+tx('نام کتاب را جست‌وجو کن…','Find a book…')+'"></label></div><div class="lr4-book-list-home"></div><p class="lr4-filter-empty" data-lr4-book-empty hidden>'+tx('کتابی با این جست‌وجو پیدا نشد.','No books match this search.')+'</p></section>'+
 '<aside class="lr4-books-side"><section class="lr4-panel lr4-book-form-panel"><div class="lr4-panel-heading"><div><small>NEW ADVENTURE</small><h2>＋ '+tx('افزودن کتاب','Add a book')+'</h2></div></div><p>'+tx('کتاب جدیدت رو به قفسه اضافه کن و پیشرفتت رو ثبت کن.','Add a real book and track your reading.')+'</p><div class="lr4-form-home"></div></section><section class="lr4-panel lr4-book-week"><div class="lr4-panel-heading"><div><small>YOUR PROGRESS</small><h2>'+tx('مطالعهٔ این هفته','This week’s reading')+'</h2></div></div><div data-lr4-mini-chart></div><button type="button" class="lr4-outline" data-feature-route="language-reports">'+tx('مشاهدهٔ گزارش کامل','See full report')+' ←</button></section></aside></div>';
 source.classList.add('lr4-original-source');
 source.after(wrap);
 wrap.querySelector('.lr4-book-list-home').append(bookList);
 wrap.querySelector('.lr4-form-home').append(form);
}
function weekValues(logs,days=7){
 return Array.from({length:days},(_,i)=>{const date=dateOffset(i-days+1);return {date,pages:logs.filter(l=>l.date===date).reduce((n,l)=>n+l.pages,0)}});
}
function barsMarkup(rows){
 const max=Math.max(1,...rows.map(x=>x.pages));
 return '<div class="lr4-bars" role="img" aria-label="'+tx('صفحات خوانده‌شده در روزهای اخیر','Pages read on recent days')+'">'+rows.map(r=>'<div class="lr4-bar-item"><span title="'+fmt(r.pages)+' '+tx('صفحه','pages')+'" style="height:'+(r.pages?Math.max(8,Math.round(r.pages/max*100)):3)+'%" class="'+(r.pages?'has-data':'')+'"></span><small>'+esc(r.date.slice(5))+'</small></div>').join('')+'</div>';
}
function syncBooks(){
 setupBooks();
 const root=$('panel-language-books'),shell=root?.querySelector('.lr4-books-shell');if(!shell)return;
 const rows=books(),m=bookMetrics(rows),list=$('language-book-list');
 shell.querySelector('[data-lr4-book-stats]').innerHTML=
 stat('▣',rows.length,tx('کل کتاب‌ها','Total books'),'purple')+
 stat('▤',m.reading,tx('در حال مطالعه','Reading'),'blue')+
 stat('✓',m.completed,tx('خوانده‌شده','Finished'),'green')+
 stat('▥',m.recent,tx('صفحات این هفته','Pages this week'),'gold');
 shell.querySelector('[data-lr4-book-count]').textContent=fmt(rows.length)+' '+tx('کتاب','books');
 shell.querySelector('[data-lr4-mini-chart]').innerHTML='<div class="lr4-week-number"><strong>'+fmt(m.recent)+'</strong><span>'+tx('صفحه خوانده‌شده در ۷ روز گذشته','pages in the past 7 days')+'</span></div>'+barsMarkup(weekValues(m.logs));
 // The source owns click handlers for reading/deleting; decorate, never replace its cards.
 const byId=new Map(rows.map(b=>[String(b.id),b]));
 let count=0;
 list.querySelectorAll('.pass3-language-book').forEach(card=>{
  const id=card.querySelector('[data-language-reading]')?.dataset.languageReading;
  const b=byId.get(String(id||'')),name=String(b?.title||'');
  const visible=(filter==='all'||(filter==='finished'?(b?.shelf==='finished'):(b?.shelf!=='finished')))&&(!bookQuery||name.toLocaleLowerCase().includes(bookQuery.toLocaleLowerCase()));
  card.hidden=!visible;if(visible)count++;
  const cover=card.querySelector('.pass3-book-cover');
  const coverSrc=String(b?.coverData||b?.coverUrl||'');
  if(cover&&coverSrc&&(/^(https:\/\/|data:image\/(?:png|jpe?g|webp);base64,)/i.test(coverSrc))&&!cover.querySelector('img')){
   const img=document.createElement('img');img.src=coverSrc;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';cover.replaceChildren(img)
  }
 });
 const empty=shell.querySelector('[data-lr4-book-empty]');if(empty)empty.hidden=count>0||rows.length===0;
}
function paintReports(){
 const root=$('panel-language-reports');if(!root)return;
 let shell=root.querySelector('.lr4-report-shell');
 if(!shell){root.classList.add('lr4-owner','lr4-report-route');shell=document.createElement('section');shell.className='lr4-report-shell';shell.dataset.elaraI18n='off';
 shell.innerHTML='<div class="lr4-report-title"><button type="button" class="lr4-back" data-feature-route="language">← '+tx('بازگشت','Back')+'</button><span>LANGUAGE · REPORT</span><h1>'+tx('گزارش پیشرفت زبان','Language progress report')+'</h1><p>'+tx('مرور، یادگیری واژه‌ها و مطالعهٔ واقعی ثبت‌شدهٔ تو','Your actual vocabulary and reading progress')+'</p></div><div class="lr4-book-stats" data-lr4-report-stats></div>'+
 '<div class="lr4-report-main lr4-panel"><div class="lr4-panel-heading"><div><small>LEARNING TRENDS</small><h2>'+tx('روند مطالعه','Reading trends')+'</h2></div><select aria-label="'+tx('بازهٔ گزارش','Report period')+'" data-lr4-report-range><option value="7">'+tx('۷ روز اخیر','Last 7 days')+'</option><option value="14">'+tx('۱۴ روز اخیر','Last 14 days')+'</option></select></div><p class="lr4-report-legend">'+tx('صفحات واقعی ثبت‌شده در هر روز','Actual pages logged each day')+'</p><div data-lr4-report-bars></div></div>'+
 '<div class="lr4-report-bottom"><section class="lr4-panel"><div class="lr4-panel-heading"><div><small>VOCABULARY JOURNEY</small><h2>'+tx('وضعیت واژه‌ها','Vocabulary status')+'</h2></div></div><div data-lr4-report-donut></div></section><section class="lr4-panel"><div class="lr4-panel-heading"><div><small>KEEP GROWING</small><h2>'+tx('جعبه‌های لایتنر','Leitner boxes')+'</h2></div></div><div data-lr4-report-boxes></div><button type="button" class="lr4-outline" data-feature-route="words">'+tx('بازکردن لایتنر','Open Leitner')+' ←</button></section><section class="lr4-panel"><div class="lr4-panel-heading"><div><small>YOUR REAL BOOKS</small><h2>'+tx('کتاب‌های فعال','Active books')+'</h2></div></div><div data-lr4-report-books></div><button type="button" class="lr4-outline" data-feature-route="language-books">'+tx('دیدن همهٔ کتاب‌ها','All books')+' ←</button></section></div>';
 const h=root.querySelector('.feature-subpage-head');(h||root.firstElementChild)?.insertAdjacentElement('afterend',shell);
 root.querySelector('[data-language-block="report"]')?.classList.add('lr4-original-source');
 }
 const b=books(),m=bookMetrics(b),words=arr(data().words),byBox=[1,2,3,4,5].map(i=>words.filter(w=>Number(w.box||1)===i).length);
 const mastered=byBox[4],due=words.filter(w=>!w.due||String(w.due)<=today()).length;
 const totals=weekValues(m.logs,reportDays),pages=totals.reduce((n,row)=>n+row.pages,0);
 shell.querySelector('[data-lr4-report-stats]').innerHTML=
 stat('▣',words.length,tx('واژهٔ ثبت‌شده','Total words'),'purple')+
 stat('▥',pages,tx('صفحات این بازه','Pages in period'),'blue')+
 stat('◎',due,tx('آمادهٔ مرور','Due for review'),'green')+
 stat('✓',m.completed,tx('کتاب‌های تمام‌شده','Finished books'),'gold');
 shell.querySelector('[data-lr4-report-bars]').innerHTML=barsMarkup(totals)+(totals.some(x=>x.pages)?'':'<p class="lr4-empty-note">'+tx('در این بازه مطالعه‌ای ثبت نشده است.','No reading sessions were logged in this period.')+'</p>');
 const pct=words.length?Math.round(mastered/words.length*100):0;
 shell.querySelector('[data-lr4-report-donut]').innerHTML='<div class="lr4-donut-wrap"><div class="lr4-donut" style="--lr4-value:'+pct+'"><span><b>'+fmt(words.length)+'</b><small>'+tx('واژه','words')+'</small></span></div><div><strong>'+fmt(mastered)+'</strong><p>'+tx('واژه در جعبهٔ پنجم','words in box five')+'</p><strong>'+fmt(pct)+'٪</strong><p>'+tx('نسبت واژه‌های ماندگار','mastered share')+'</p></div></div>';
 shell.querySelector('[data-lr4-report-boxes]').innerHTML='<div class="lr4-box-list">'+byBox.map((n,i)=>'<div class="lr4-box-row"><span>'+tx('جعبه ','Box ')+fmt(i+1)+'</span><div class="lr4-box-track"><i style="width:'+(words.length?Math.round(n/words.length*100):0)+'%"></i></div><b>'+fmt(n)+'</b></div>').join('')+'</div>';
 const active=b.filter(x=>x.shelf!=='finished').slice(0,4);
 shell.querySelector('[data-lr4-report-books]').innerHTML=active.length?active.map(book=>{
 const pct=Number(book.totalPages)>0?Math.max(0,Math.min(100,Math.round(Number(book.currentPage||0)/Number(book.totalPages)*100))):0;
 return '<div class="lr4-report-book"><strong data-elara-ugc dir="auto">'+esc(book.title||'')+'</strong><span class="lr4-box-track"><i style="width:'+pct+'%"></i></span><small>'+fmt(pct)+'٪</small></div>';
 }).join(''):'<p class="lr4-empty-note">'+tx('کتاب فعالی ثبت نشده است.','No active books added yet.')+'</p>';
 const selector=shell.querySelector('[data-lr4-report-range]');if(selector)selector.value=String(reportDays);
}
let frame=null;
function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=null;syncBooks();paintReports()})}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-lr4-book-filter]');if(button){e.preventDefault();filter=button.dataset.lr4BookFilter;const shell=$('panel-language-books')?.querySelector('.lr4-books-shell');shell?.querySelectorAll('[data-lr4-book-filter]').forEach(el=>{el.classList.toggle('is-current',el.dataset.lr4BookFilter===filter);el.setAttribute('aria-pressed',String(el.dataset.lr4BookFilter===filter))});syncBooks()}
});
document.addEventListener('input',e=>{if(e.target.matches('[data-lr4-book-query]')){bookQuery=e.target.value;syncBooks()}});
document.addEventListener('change',e=>{if(e.target.matches('[data-lr4-report-range]')){reportDays=Number(e.target.value)===14?14:7;paintReports()}});
for(const event of ['elara:open','elara:language-rendered','elara:data-changed','elara:account-ready','elara:locale-changed'])window.addEventListener(event,schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.ElaraLanguageReferenceV4={render:schedule};
})();