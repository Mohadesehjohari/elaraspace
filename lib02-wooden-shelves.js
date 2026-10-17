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
const emit=s=>{window.ElaraCloudStorage.setItem('elara_space_v1',JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}));window.dispatchEvent(new Event('elara:data-changed'))};
function book(b){
 const p=progress(b),id=esc(b.id),title=esc(b.title||''),author=esc(b.author||t('نویسنده ثبت نشده','No author recorded'));
 const n=b.totalPages?fa(Math.min(b.currentPage||0,b.totalPages))+' / '+fa(b.totalPages):t('بدون تعداد صفحات','Page total not set');
 const menu='<details class="lib02-book-menu"><summary aria-label="'+t('عملیات کتاب','Book actions')+'">⋮</summary><div><button type="button" data-lib02-read="'+id+'">'+t('ثبت صفحات','Log pages')+'</button><button type="button" data-lib02-edit="'+id+'">'+t('ویرایش کتاب','Edit book')+'</button><button type="button" data-lib02-manage="'+id+'">'+t('جلد و قفسه اختصاصی','Cover & custom shelf')+'</button><button type="button" data-lib02-delete="'+id+'">'+t('حذف با تأیید','Delete with confirmation')+'</button></div></details>';
 return '<article class="lib02-book" data-lib02-book="'+id+'"><div class="lib02-book-cover"><img src="'+esc(cover(b))+'" alt="'+t('جلد ','Cover of ')+title+'" loading="lazy"></div><div class="lib02-book-info"><strong data-elara-ugc dir="auto">'+title+'</strong><small data-elara-ugc dir="auto">'+author+'</small><div class="lib02-book-progress" role="progressbar" aria-label="'+t('درصد مطالعه','Reading progress')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+p+'"><i style="width:'+p+'%"></i></div><small>'+fa(p)+'٪ · '+t('صفحه','Page')+' '+n+'</small>'+(b.customShelf?'<span class="lib02-custom" data-elara-ugc dir="auto">'+esc(b.customShelf)+'</span>':'')+
 '<div class="lib02-book-controls"><button type="button" data-lib02-read="'+id+'">'+t('ثبت مطالعه','Log reading')+'</button><select data-lib02-status="'+id+'" aria-label="'+t('وضعیت کتاب','Reading status for ')+title+'">'+statuses.map(x=>'<option value="'+x.id+'" '+(b.shelf===x.id?'selected':'')+'>'+t(x.fa,x.en)+'</option>').join('')+'</select></div></div>'+
 '<button type="button" class="lib02-bookmark" data-lib02-bookmark="'+id+'" aria-pressed="'+!!b.bookmarked+'" aria-label="'+t('نشان کتاب','Bookmark book')+'">'+(b.bookmarked?'◆':'◇')+'</button>'+menu+'</article>';
}
function shelf(info,bs){
 const names=bs.filter(b=>b.shelf===info.id);
 const rows=names.length?names.map(book).join(''):'<div class="lib02-empty"><span aria-hidden="true">✧</span><p>'+t('در این قفسه هنوز کتابی نیست.','No books on this shelf yet.')+'</p><button type="button" data-lib02-add>'+t('افزودن کتاب','Add a book')+'</button></div>';
 return '<section class="lib02-shelf" data-lib02-shelf="'+info.id+'"><div class="lib02-shelf-head"><h2>'+info.icon+' '+t(info.fa,info.en)+'</h2><span>'+fa(names.length)+' '+t('کتاب','books')+'</span></div><div class="lib02-wood"><div class="lib02-wood-row">'+rows+'</div><div class="lib02-wood-divider" aria-hidden="true"></div><div class="lib02-wood-base" aria-hidden="true"></div></div></section>';
}
/* All custom shelves use the same original wooden interior as canonical status shelves. */
function customCases(names,books){
 if(!names.length)return '<div class="lib06-no-custom"><span aria-hidden="true">✦</span><p>'+t('قفسه شخصی نداری. با «قفسه جدید» اولین قفسه را بساز.','No custom shelves yet. Create your first one with New shelf.')+'</p></div>';
 return '<div class="lib06-custom-grid">'+names.map(name=>{
  const owned=books.filter(b=>b.customShelf===name),attr=esc(name);
  const content=owned.length?owned.map(book).join(''):'<div class="lib02-empty"><span aria-hidden="true">✧</span><p>'+t('این قفسه هنوز کتابی ندارد.','This custom shelf has no books yet.')+'</p><button type="button" data-lib02-assign="'+attr+'">'+t('قرار دادن کتاب در قفسه','Put a book on this shelf')+'</button></div>';
  return '<section class="lib02-custom-case" data-lib02-custom-shelf="'+attr+'" aria-label="'+t('قفسه شخصی ','Custom shelf ')+attr+'">'+
   '<div class="lib02-shelf-head lib06-custom-head"><h3 data-elara-ugc dir="auto">▣ '+attr+'</h3><div class="lib06-case-tools"><span>'+fa(owned.length)+' '+t('کتاب','books')+'</span><button type="button" data-lib02-assign="'+attr+'" aria-label="'+t('افزودن کتاب به ','Add a book to ')+attr+'">＋</button><button type="button" data-lib02-rename="'+attr+'" aria-label="'+t('تغییر نام قفسه ','Rename shelf ')+attr+'">✎</button><button type="button" data-lib02-remove-shelf="'+attr+'" aria-label="'+t('حذف قفسه ','Delete shelf ')+attr+'">×</button></div></div>'+
   '<div class="lib02-wood"><div class="lib02-wood-row">'+content+'</div><div class="lib02-wood-divider" aria-hidden="true"></div><div class="lib02-wood-base" aria-hidden="true"></div></div></section>'
 }).join('')+'</div>';
}
function foldLegacyTools(){
 const panel=$('#panel-library-shelves');if(!panel||!$('#lib02-scene'))return;
 const targets=['.library-enhancement-tools','#book-form','.bookshelf-filter','#book-list','#book-empty'];
 const nodes=targets.map(x=>panel.querySelector(':scope > '+x)).filter(Boolean);
 if(!nodes.length)return;
 let disclosure=panel.querySelector(':scope > .lib06-legacy-tools');
 if(!disclosure){
  disclosure=document.createElement('details');disclosure.className='lib06-legacy-tools';
  disclosure.innerHTML='<summary>⚙ '+t('مدیریت و ویرایش کتاب‌ها','Book management and editing')+'</summary><div class="lib06-legacy-body"></div>';
  panel.append(disclosure);
 }
 const body=disclosure.querySelector('.lib06-legacy-body');
 nodes.forEach(node=>body.append(node));
}
function openBookManagement(){
 const details=$('#panel-library-shelves > .lib06-legacy-tools');if(details)details.open=true;
 const form=$('#book-form');form?.scrollIntoView({behavior:'smooth',block:'center'});$('#book-title')?.focus({preventScroll:true});
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
 host.innerHTML='<div class="lib02-actions"><button type="button" class="lib02-primary" data-lib02-add>＋ '+t('افزودن کتاب','Add book')+'</button><button type="button" data-lib02-new-shelf>▤ '+t('قفسه جدید','New custom shelf')+'</button><button type="button" data-lib02-library>← '+t('بازگشت به کتابخانه','Back to library')+'</button></div>'+
 '<div class="lib02-metrics">'+
 [[bs.length,t('کتاب در کتابخانه','Total books'),'▣'],[bs.filter(b=>b.shelf==='reading').length,t('در حال مطالعه','Reading'),'📖'],[bs.filter(b=>b.shelf==='want').length,t('خواهم خواند','To read'),'🔖'],[bs.filter(b=>b.shelf==='finished').length,t('خوانده‌ام','Finished'),'✓']].map(([n,label,ic])=>'<div><span>'+ic+'</span><strong>'+fa(n)+'</strong><small>'+label+'</small></div>').join('')+'</div>'+
 '<div class="lib02-mobile-picker" role="group" aria-label="'+t('انتخاب وضعیت مطالعه','Choose reading status')+'">'+statuses.map(x=>'<button type="button" aria-pressed="'+(x.id===selected)+'" data-lib02-picker="'+x.id+'">'+x.icon+' '+t(x.fa,x.en)+'</button>').join('')+'</div>'+
 '<div class="lib02-shelves" data-lib02-selected="'+selected+'">'+statuses.map(x=>shelf(x,bs)).join('')+'</div>'+
 '<section class="lib02-personal"><div class="lib06-personal-heading"><h2>✦ '+t('قفسه‌های اختصاصی من','My custom shelves')+'</h2><p>'+fa(custom.length)+' '+t('قفسه شخصی — هر قفسه با عنوان و کتاب‌های خودش نمایش داده می‌شود.','custom shelves — each has its own title and books.')+'</p></div>'+customCases(custom,bs)+'</section>'+
 '<div class="lib02-extras"><section><h2>◷ '+t('فعالیت‌های اخیر','Recent activity')+'</h2>'+latest(bs)+'</section><section><h2>❝ '+t('بریده اخیر','Recent passage')+'</h2>'+quote(s,bs)+'</section></div>';
 foldLegacyTools();
}
let legacyObserver=null;
function mount(){
 const panel=$('#panel-library-shelves');if(!panel||!window.ElaraFeatureHubs||!window.ElaraReading||!window.ElaraLibraryEnhancements)return;
 let root=$('#lib02-scene');
 if(!root){root=document.createElement('div');root.id='lib02-scene';root.dir='rtl';const header=panel.querySelector(':scope > .feature-subpage-head');if(header)header.insertAdjacentElement('afterend',root);else panel.prepend(root)}
 ready=true;render();foldLegacyTools();
 if(!legacyObserver){
  legacyObserver=new MutationObserver(()=>{
   if(panel.querySelector(':scope > .library-enhancement-tools,:scope > #book-form,:scope > #book-list,:scope > .bookshelf-filter'))foldLegacyTools();
  });
  legacyObserver.observe(panel,{childList:true});
 }
}
function schedule(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;if(ready)render();else mount()})}
function saveBooks(fn){const s=state(),all=Array.isArray(s.books)?s.books:[],books=all.slice();const changed=fn(books);if(changed===false)return;window.ElaraReading.commit(books)}
document.addEventListener('click',async event=>{
 const root=event.target.closest('#lib02-scene');if(!root)return;
 const pick=event.target.closest('[data-lib02-picker]');
 if(pick){selected=pick.dataset.lib02Picker;schedule();return}
 if(event.target.closest('[data-lib02-add]')){event.preventDefault();openBookManagement();return}
 if(event.target.closest('[data-lib02-new-shelf]')){event.preventDefault();await window.ElaraLibraryEnhancements.newShelf();schedule();return}
 if(event.target.closest('[data-lib02-library]')){event.preventDefault();window.ElaraOpen?.('books',{history:'push'});return}
 const read=event.target.closest('[data-lib02-read]');
 if(read){event.preventDefault();const match=[...document.querySelectorAll('#book-list [data-reading-book]')].find(x=>x.dataset.readingBook===read.dataset.lib02Read);match?.click();return}
 const edit=event.target.closest('[data-lib02-edit]');
 if(edit){event.preventDefault();const match=[...document.querySelectorAll('#book-list [data-edit-book]')].find(x=>x.dataset.editBook===edit.dataset.lib02Edit);match?.click();return}
 const manage=event.target.closest('[data-lib02-manage]');
 if(manage){event.preventDefault();await window.ElaraLibraryEnhancements.manageBook(manage.dataset.lib02Manage);return}
 const bm=event.target.closest('[data-lib02-bookmark]');
 if(bm){event.preventDefault();saveBooks(all=>{const i=all.findIndex(x=>x.id===bm.dataset.lib02Bookmark);if(i<0)return false;all[i]={...all[i],bookmarked:!all[i].bookmarked}});return}
 const assign=event.target.closest('[data-lib02-assign]');
 if(assign){
  event.preventDefault();const shelfName=assign.dataset.lib02Assign;
  const current=state();
  if(!Array.isArray(current.bookShelves)||!current.bookShelves.includes(shelfName))return;
  const books=normalized(current);
  if(!books.length){openBookManagement();return}
  const picker=document.createElement('div');picker.className='lib06-book-picker';
  const field=document.createElement('label');field.textContent=t('کتابی را برای این قفسه انتخاب کن','Choose a book for this shelf');
  const select=document.createElement('select');select.setAttribute('aria-label',field.textContent);
  books.forEach(b=>select.add(new Option(String(b.title||t('کتاب بدون عنوان','Untitled book')),String(b.id))));
  field.append(select);picker.append(field);
  const ok=await window.ElaraDialog?.open?.({title:t('قرار دادن کتاب در قفسه: ','Add a book to shelf: ')+shelfName,content:picker,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('افزودن','Add'),value:true,kind:'primary'}]});
  if(ok!==true)return;
  const latest=state();
  if(!latest.bookShelves?.includes(shelfName))return;
  const index=(latest.books||[]).findIndex(b=>String(b.id)===select.value);
  if(index<0)return;
  const updated=latest.books.slice();updated[index]={...updated[index],customShelf:shelfName};
  window.ElaraReading.commit(updated);schedule();return;
 }
 const removeShelf=event.target.closest('[data-lib02-remove-shelf]');
 if(removeShelf){
  event.preventDefault();
  const name=removeShelf.dataset.lib02RemoveShelf;
  if(!state().bookShelves?.includes(name))return;
  if(!await window.ElaraDialog.confirm(t('این قفسه حذف شود؟ کتاب‌ها در کتابخانه می‌مانند.','Delete shelf? The books remain in the library.'),{title:t('حذف قفسه','Delete shelf'),confirmText:t('حذف','Delete'),danger:true}))return;
  const fresh=state();if(!fresh.bookShelves?.includes(name))return;
  fresh.bookShelves=fresh.bookShelves.filter(x=>x!==name);
  fresh.books=(fresh.books||[]).map(x=>x.customShelf===name?{...x,customShelf:''}:x);
  window.ElaraLinkedTasks?.syncCoreState?.(fresh);
  emit(fresh);schedule();return;
 }
 const rename=event.target.closest('[data-lib02-rename]');
 if(rename){event.preventDefault();await window.ElaraLibraryEnhancements.renameShelf(rename.dataset.lib02Rename);schedule();return}
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