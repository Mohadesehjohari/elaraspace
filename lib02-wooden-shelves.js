/* LIB-02 — a dedicated wooden shelves view over canonical Elara books. No new book storage. */
(()=>{'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const en=()=>document.documentElement.lang==='en';
const t=(fa,english)=>en()?english:fa,fa=n=>Number(n||0).toLocaleString(en()?'en-US':'fa-IR');
const statuses=[{id:'reading',fa:'در حال مطالعه',en:'Reading',icon:'📖'},{id:'want',fa:'خواهم خواند',en:'To read',icon:'🔖'},{id:'finished',fa:'خوانده‌ام',en:'Finished',icon:'✓'}];
let selected='reading',pending=false,ready=false;
const state=()=>window.ElaraLibraryEnhancements?.read?.()||{};
const normalized=s=>(Array.isArray(s.books)?s.books:[]).map(x=>window.ElaraReading?.normalize?.(x)||x);
const progress=b=>window.ElaraReading?.progress?.(b)||0;
const cover=b=>b.coverData||b.coverUrl||'assets/ui/icon-library-open-book.webp';
const emit=s=>{localStorage.setItem('elara_space_v1',JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}));window.dispatchEvent(new Event('elara:data-changed'))};
function book(b){
 const p=progress(b),id=esc(b.id),title=esc(b.title||''),author=esc(b.author||t('نویسنده ثبت نشده','No author recorded'));
 const n=b.totalPages?fa(Math.min(b.currentPage||0,b.totalPages))+' / '+fa(b.totalPages):t('بدون تعداد صفحات','Page total not set');
 const menu='<details class="lib02-book-menu"><summary aria-label="'+t('عملیات کتاب','Book actions')+'">⋮</summary><div><button type="button" data-reading-book="'+id+'">'+t('ثبت صفحات','Log pages')+'</button><button type="button" data-edit-book="'+id+'">'+t('ویرایش کتاب','Edit book')+'</button><button type="button" data-library-manage-book="'+id+'">'+t('جلد و قفسه اختصاصی','Cover & custom shelf')+'</button><button type="button" data-lib02-delete="'+id+'">'+t('حذف با تأیید','Delete with confirmation')+'</button></div></details>';
 return '<article class="lib02-book" data-lib02-book="'+id+'"><div class="lib02-book-cover"><img src="'+esc(cover(b))+'" alt="'+t('جلد ','Cover of ')+title+'" loading="lazy"></div><div class="lib02-book-info"><strong data-elara-ugc dir="auto">'+title+'</strong><small data-elara-ugc dir="auto">'+author+'</small><div class="lib02-book-progress" role="progressbar" aria-label="'+t('درصد مطالعه','Reading progress')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+p+'"><i style="width:'+p+'%"></i></div><small>'+fa(p)+'٪ · '+t('صفحه','Page')+' '+n+'</small>'+(b.customShelf?'<span class="lib02-custom" data-elara-ugc dir="auto">'+esc(b.customShelf)+'</span>':'')+
 '<div class="lib02-book-controls"><button type="button" data-reading-book="'+id+'">'+t('ثبت مطالعه','Log reading')+'</button><select data-lib02-status="'+id+'" aria-label="'+t('وضعیت کتاب','Reading status for ')+title+'">'+statuses.map(x=>'<option value="'+x.id+'" '+(b.shelf===x.id?'selected':'')+'>'+t(x.fa,x.en)+'</option>').join('')+'</select></div></div>'+
 '<button type="button" class="lib02-bookmark" data-lib02-bookmark="'+id+'" aria-pressed="'+!!b.bookmarked+'" aria-label="'+t('نشان کتاب','Bookmark book')+'">'+(b.bookmarked?'◆':'◇')+'</button>'+menu+'</article>';
}
function shelf(info,bs){
 const names=bs.filter(b=>b.shelf===info.id);
 const rows=names.length?names.map(book).join(''):'<div class="lib02-empty"><span aria-hidden="true">✧</span><p>'+t('در این قفسه هنوز کتابی نیست.','No books on this shelf yet.')+'</p><button type="button" data-lib02-add>'+t('افزودن کتاب','Add a book')+'</button></div>';
 return '<section class="lib02-shelf" data-lib02-shelf="'+info.id+'"><div class="lib02-shelf-head"><h2>'+info.icon+' '+t(info.fa,info.en)+'</h2><span>'+fa(names.length)+' '+t('کتاب','books')+'</span></div><div class="lib02-wood"><div class="lib02-wood-row">'+rows+'</div><div class="lib02-wood-divider" aria-hidden="true"></div><div class="lib02-wood-base" aria-hidden="true"></div></div></section>';
}
function latest(bs){
 const history=bs.flatMap(b=>(Array.isArray(b.readingLogs)?b.readingLogs:[]).map(x=>({...x,book:b}))).sort((a,b)=>Number(b.timestamp||0)-Number(a.timestamp||0)).slice(0,4);
 return history.length?'<ul>'+history.map(x=>'<li><span>'+esc(x.book.title)+'</span><small>'+fa(x.pagesRead)+' '+t('صفحه','pages')+' · '+esc(x.date||'')+'</small></li>').join('')+'</ul>':'<p class="lib02-note">'+t('تاریخچه مطالعه پس از ثبت صفحات واقعی نمایش داده می‌شود.','Actual reading activity appears after you log pages.')+'</p>';
}
function quote(s,bs){
 const c=(Array.isArray(s.bookClips)?s.bookClips:[]).slice().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).find(x=>String(x.text||'').trim());
 if(!c)return '<p class="lib02-note">'+t('هنوز بریده‌ای برای نمایش نداری.','No saved passage to display yet.')+'</p>';
 const b=bs.find(x=>x.id===c.bookId);
 return '<blockquote dir="auto" data-elara-ugc>“'+esc(String(c.text).slice(0,380))+'”</blockquote><small data-elara-ugc dir="auto">'+esc(b?.title||t('بریده شخصی','Personal clip'))+'</small>';
}
function render(){
 const host=$('#lib02-scene'),panel=$('#panel-library-shelves');if(!host||!panel)return;
 const s=state(),bs=normalized(s),custom=Array.isArray(s.bookShelves)?s.bookShelves:[];
 host.innerHTML='<section class="lib02-hero"><div><span>ELARA · PERSONAL SHELVES</span><h1>▣ '+t('قفسه‌ها','Bookshelves')+'</h1><p>'+t('کتاب‌هایت را روی قفسه‌های خودت ببین؛ هر جلد، بخشی از مسیر توست.','Every book has a place in your journey.')+'</p></div></section>'+
 '<div class="lib02-actions"><button type="button" class="lib02-primary" data-lib02-add>＋ '+t('افزودن کتاب','Add book')+'</button><button type="button" data-lib02-new-shelf>▤ '+t('قفسه جدید','New custom shelf')+'</button><button type="button" data-lib02-library>← '+t('بازگشت به کتابخانه','Back to library')+'</button></div>'+
 '<div class="lib02-metrics">'+
 [[bs.length,t('کتاب در کتابخانه','Total books'),'▣'],[bs.filter(b=>b.shelf==='reading').length,t('در حال مطالعه','Reading'),'📖'],[bs.filter(b=>b.shelf==='want').length,t('خواهم خواند','To read'),'🔖'],[bs.filter(b=>b.shelf==='finished').length,t('خوانده‌ام','Finished'),'✓']].map(([n,label,ic])=>'<div><span>'+ic+'</span><strong>'+fa(n)+'</strong><small>'+label+'</small></div>').join('')+'</div>'+
 '<div class="lib02-mobile-picker" role="group" aria-label="'+t('انتخاب وضعیت مطالعه','Choose reading status')+'">'+statuses.map(x=>'<button type="button" aria-pressed="'+(x.id===selected)+'" data-lib02-picker="'+x.id+'">'+x.icon+' '+t(x.fa,x.en)+'</button>').join('')+'</div>'+
 '<div class="lib02-shelves" data-lib02-selected="'+selected+'">'+statuses.map(x=>shelf(x,bs)).join('')+'</div>'+
 '<section class="lib02-personal"><div><h2>✦ '+t('قفسه‌های اختصاصی من','My custom shelves')+'</h2><p>'+fa(custom.length)+' '+t('قفسه شخصی — وضعیت مطالعه از قفسه شخصی جداست.','custom shelves — independent of reading status.')+'</p></div><div class="lib02-personal-tags">'+(custom.length?custom.map(n=>'<button type="button" data-lib02-custom="'+esc(n)+'">'+esc(n)+' <small>'+fa(bs.filter(b=>b.customShelf===n).length)+'</small></button>').join(''):'<span class="lib02-note">'+t('قفسه اختصاصی نداری. از دکمه «قفسه جدید» استفاده کن.','No custom shelves yet.')+'</span>')+'</div></section>'+
 '<div class="lib02-extras"><section><h2>◷ '+t('فعالیت‌های اخیر','Recent activity')+'</h2>'+latest(bs)+'</section><section><h2>❝ '+t('بریده اخیر','Recent passage')+'</h2>'+quote(s,bs)+'</section></div>';
}
function mount(){
 const panel=$('#panel-library-shelves');if(!panel||!window.ElaraFeatureHubs||!window.ElaraReading||!window.ElaraLibraryEnhancements)return;
 let root=$('#lib02-scene');
 if(!root){root=document.createElement('div');root.id='lib02-scene';root.dir='rtl';const header=panel.querySelector(':scope > .feature-subpage-head');if(header)header.insertAdjacentElement('afterend',root);else panel.prepend(root)}
 ready=true;render();
}
function schedule(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;if(ready)render();else mount()})}
function saveBooks(fn){const s=state(),all=Array.isArray(s.books)?s.books:[],books=all.slice();const changed=fn(books);if(changed===false)return;window.ElaraReading.commit(books)}
document.addEventListener('click',async event=>{
 const root=event.target.closest('#lib02-scene');if(!root)return;
 const pick=event.target.closest('[data-lib02-picker]');
 if(pick){selected=pick.dataset.lib02Picker;schedule();return}
 if(event.target.closest('[data-lib02-add]')){event.preventDefault();const form=$('#book-form');form?.scrollIntoView({behavior:'smooth',block:'center'});$('#book-title')?.focus({preventScroll:true});return}
 if(event.target.closest('[data-lib02-new-shelf]')){event.preventDefault();await window.ElaraLibraryEnhancements.newShelf();schedule();return}
 if(event.target.closest('[data-lib02-library]')){event.preventDefault();window.ElaraOpen?.('books',{history:'push'});return}
 const bm=event.target.closest('[data-lib02-bookmark]');
 if(bm){event.preventDefault();saveBooks(all=>{const i=all.findIndex(x=>x.id===bm.dataset.lib02Bookmark);if(i<0)return false;all[i]={...all[i],bookmarked:!all[i].bookmarked}});return}
 const custom=event.target.closest('[data-lib02-custom]');
 if(custom){event.preventDefault();const query=custom.dataset.lib02Custom;
 const matching=normalized(state()).filter(b=>b.customShelf===query);
 const box=document.createElement('div');box.className='lib02-custom-dialog';
 box.innerHTML=matching.length?matching.map(b=>'<button type="button" data-reading-book="'+esc(b.id)+'">'+esc(b.title)+'</button>').join(''):'<p>'+t('در این قفسه کتابی ثبت نشده.','No books in this custom shelf yet.')+'</p>';
 await window.ElaraDialog?.open?.({title:query,content:box,actions:[{label:t('بستن','Close'),value:false}]});return}
 const del=event.target.closest('[data-lib02-delete]');
 if(del){event.preventDefault();if(await window.ElaraDialog?.confirm?.(t('این کتاب حذف شود؟','Delete this book?'),{title:t('حذف کتاب','Delete book'),danger:true,confirmText:t('حذف','Delete')}))saveBooks(all=>{const i=all.findIndex(x=>x.id===del.dataset.lib02Delete);if(i<0)return false;all.splice(i,1)});}
});
document.addEventListener('change',e=>{
 const el=e.target.closest('#lib02-scene [data-lib02-status]');if(!el)return;
 const values=new Set(['want','reading','finished']);if(!values.has(el.value))return;
 saveBooks(all=>{const i=all.findIndex(b=>b.id===el.dataset.lib02Status);if(i<0)return false;all[i]={...all[i],shelf:el.value}});
});
for(const event of ['elara:state-committed','elara:data-changed','elara:locale-changed','elara:hydrate','elara:open'])window.addEventListener(event,schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();setTimeout(mount,1300)},{once:true});else{mount();setTimeout(mount,1300)}
window.ElaraLibraryShelvesLIB02={refresh:schedule};
})();