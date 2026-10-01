/* Approved visual phase on the existing Elara app; no changes to account, XP or task schemas. */
(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='elara_space_v1',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
const data=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'guest';
const safeList=a=>Array.isArray(a)?a:[];
const profileSystem=()=>window.ElaraProfileSystem;
const level=()=>profileSystem()?.levelFromXp?.(Number(window.ElaraSocial?.me?.xp??data().xp??0))||1;
const wardrobe=()=>profileSystem()?.readWardrobe?.()||{};
const storeWardrobe=patch=>profileSystem()?.writeWardrobe?.(patch)||wardrobe();
const assetAvatar=(group,n,shape=wardrobe().shape||'circle')=>profileSystem()?.avatarPath?.(group,n,shape)||'';
const bannerList=()=>profileSystem()?.BANNERS||[];
const frames=()=>profileSystem()?.FRAMES||[];
const icon=(name)=>window.ElaraIcons?.icon?.(name,{className:'elara-visual-icon'})||`<span class="elara-visual-icon" aria-hidden="true"></span>`;
let windowRoot=null,selectedPreview=null,showAll={avatar:false,frame:false,banner:false};
const pendingGuestLanguageIds=new Set();
const accountUid=()=>String(window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'');
function rawLanguageBooks(owner){try{return safeList(JSON.parse(localStorage.getItem(`elara_language_books_v1_${owner}`)||'[]'))}catch{return[]}}
function migratePendingGuestLanguageBooks(){
 const target=accountUid();if(!target||!pendingGuestLanguageIds.size)return false;
 const guest=rawLanguageBooks('guest'),moving=guest.filter(book=>pendingGuestLanguageIds.has(String(book?.id||'')));if(!moving.length){pendingGuestLanguageIds.clear();return false}
 const targetKey=`elara_language_books_v1_${target}`,current=rawLanguageBooks(target),byId=new Map(current.map(book=>[String(book?.id||''),book]));
 for(const book of moving)byId.set(String(book.id),book);
 try{
  localStorage.setItem(targetKey,JSON.stringify([...byId.values()]));
  localStorage.setItem('elara_language_books_v1_guest',JSON.stringify(guest.filter(book=>!pendingGuestLanguageIds.has(String(book?.id||'')))));
  pendingGuestLanguageIds.clear();return true
 }catch(error){console.error('Language books account migration:',error);return false}
}
function language(){
 if($('panel-language'))return;
 const main=$('main'),panel=document.createElement('section');panel.id='panel-language';panel.className='panel hidden';
 panel.innerHTML=`<div class="elara-language-hero"><div><p>Elara · LANGUAGE JOURNEY</p><h1>هر واژه، یک قدم به دنیای بزرگ‌تر توست.</h1><p>مرور کن، کتاب بخوان و پیشرفت واقعی خودت را دنبال کن.</p></div></div><div class="approved-language-grid pass3-language-grid"><section class="elara-card pass3-language-block pass3-language-leitner"><header><h2>${icon('brain')} جعبهٔ لایتنر</h2><span class="muted">مرور هوشمند</span></header><div id="language-stat-row" class="lang-stat-row"></div><button class="primary-button pass3-leitner-source-cta" type="button" data-lang-leitner>شروع مرور</button></section><section class="elara-card pass3-language-block pass3-language-books"><header><h2>${icon('book')} کتاب‌های زبان</h2><div class="pass3-book-tabs" aria-label="وضعیت کتاب‌ها"><span>در حال مطالعه</span><span>خوانده‌شده</span></div></header><p class="muted">کتاب‌های این بخش مستقل از کتابخانهٔ عمومی هستند.</p><form id="language-book-form" class="inline-form"><input name="title" maxlength="180" required placeholder="نام کتاب زبان…" aria-label="نام کتاب زبان"><select name="shelf" aria-label="وضعیت کتاب"><option value="reading">در حال مطالعه</option><option value="finished">خوانده‌شده</option></select><button class="primary-button" type="submit">افزودن</button></form><div id="language-book-list" class="pass3-language-book-list"></div></section><section class="elara-card pass3-language-block pass3-language-report"><header><h2>${icon('chart')} گزارش یادگیری</h2></header><div id="language-reports"></div><p class="muted">گزارش از داده‌های واقعی همین حساب در این مرورگر تهیه می‌شود.</p></section><section class="elara-card pass3-language-block pass3-language-courses"><header><h2>${icon('course')} کلاس‌های آنلاین / کورس‌ها</h2></header><div class="pass3-coming-soon"><span>${icon('course')}</span><div><strong>کلاس‌ها در راه‌اند</strong><p class="muted">اتصال دوره‌ها و کلاس‌های واقعی هنوز Backend ندارد؛ رکورد ساختگی نمایش داده نمی‌شود.</p></div></div></section></div>`;
 main.prepend(panel);
 const words=$('panel-words');if(words)words.classList.add('approved-leitner-full-page');
 renderLanguage();
}
function booksKey(owner=uid()){return `elara_language_books_v1_${owner}`}
function readBooks(owner=uid()){
 try{
  const raw=safeList(JSON.parse(localStorage.getItem(booksKey(owner))||'[]'));let dirty=false;
  const books=raw.map((book,index)=>{let next=book&&typeof book==='object'?{...book}:{title:String(book||'کتاب'),shelf:'reading'};if(!next.id){next.id=globalThis.crypto?.randomUUID?.()||('lang-'+Date.now().toString(36)+'-'+index);dirty=true}return window.ElaraReading?.normalize?window.ElaraReading.normalize(next):next});
  if(dirty)localStorage.setItem(booksKey(owner),JSON.stringify(books));
  return books
 }catch(error){console.error('Language books read:',error);return[]}
}
function writeBooks(books,owner=uid()){
 try{localStorage.setItem(booksKey(owner),JSON.stringify(safeList(books)));return true}
 catch(error){console.error('Language books write:',error);return false}
}
function languageBookOwner(id){
 const wanted=String(id||''),current=uid(),owners=[current,...(current==='guest'?[]:['guest'])];
 for(const owner of owners)if(readBooks(owner).some(book=>String(book.id)===wanted))return owner;
 return current
}
function normalizeLanguageBook(raw){
 const base={...raw,readingLogs:safeList(raw?.readingLogs),currentPage:Number(raw?.currentPage||0),totalPages:Number(raw?.totalPages||0)};
 return window.ElaraReading?.normalize?window.ElaraReading.normalize(base):base
}
function renderLanguage(){
 if(!$('language-stat-row'))return;
 const state=data(),words=safeList(state.words),books=readBooks(),reading=books.filter(x=>x.shelf==='reading'),finished=books.filter(x=>x.shelf==='finished');
 $('language-stat-row').innerHTML=`<div>${icon('brain')}<strong>${words.length.toLocaleString('fa-IR')}</strong><small>واژه‌ها</small></div><div>${icon('book')}<strong>${reading.length.toLocaleString('fa-IR')}</strong><small>در حال مطالعه</small></div><div>${icon('check')}<strong>${finished.length.toLocaleString('fa-IR')}</strong><small>خوانده‌شده</small></div>`;
 $('language-book-list').innerHTML=books.length?books.map(b=>{const pct=b.totalPages?Math.min(100,Math.round((b.currentPage||0)/b.totalPages*100)):0;return `<article class="pass3-language-book ${b.shelf==='finished'?'is-finished':'is-reading'}"><span class="pass3-book-cover">${icon('book')}</span><div class="pass3-book-copy"><strong>${esc(b.title)}</strong><small>${b.shelf==='finished'?'خوانده‌شده':'در حال مطالعه'}</small><span class="pass3-book-status">صفحه ${Number(b.currentPage||0).toLocaleString('fa-IR')} از ${b.totalPages?Number(b.totalPages).toLocaleString('fa-IR'):'—'} · ${pct.toLocaleString('fa-IR')}٪</span><span class="elara-track"><i style="width:${pct}%"></i></span></div><div class="pass3-book-actions"><button class="primary-button" type="button" data-language-reading="${esc(b.id)}">ثبت مطالعه</button><button class="quiet-button" type="button" data-language-book-delete="${esc(b.id)}" aria-label="حذف کتاب ${esc(b.title)}">×</button></div></article>`}).join(''):'<p class="empty-note">قفسه‌ت هنوز منتظر اولین ماجراجوییه 📚✨ یه کتاب اضافه کن و از همون چند صفحهٔ اول شروع کنیم.</p>';
 $('language-reports').innerHTML=`<div class="lang-stat-row"><div><strong>${words.length.toLocaleString('fa-IR')}</strong><small>واژهٔ ثبت‌شده</small></div><div><strong>${books.length.toLocaleString('fa-IR')}</strong><small>کل کتاب‌ها</small></div><div><strong>${finished.length.toLocaleString('fa-IR')}</strong><small>کتاب تمام‌شده</small></div></div><div id="pass3-language-chart" class="pass3-language-chart" aria-label="نمودار گزارش یادگیری"></div>`;
 window.dispatchEvent(new Event('elara:language-rendered'));
}
function refreshHome(){if(window.ElaraReferenceHome)return;
 const stats=$('elara-stats');if(stats){const values=['flame','tasks','book3d','goals','spark'];[...stats.children].forEach((card,i)=>{const first=card.firstElementChild;if(first){first.className='elara-visual-icon';first.innerHTML=icon(values[i])}})}
 const headers=[['elara-home-tasks','tasks'],['elara-home-focus','focus'],['elara-home-habits','habits'],['elara-home-goals','goals'],['elara-home-missions','missions'],['elara-home-activity','activity'],['elara-home-social','friends'],['elara-home-ranks','ranking']];
 for(const [id,name] of headers){const h=$(id)?.closest('.elara-card')?.querySelector('header h2');if(h&&!h.dataset.refHeadingOwner&&!h.querySelector('.elara-card-art')&&!h.querySelector('.elara-icon'))h.insertAdjacentHTML('afterbegin',icon(name)+' ')}
 const ranks=$('elara-home-ranks');if(ranks&&!ranks.children.length){ranks.innerHTML='<p class="muted">رنکینگ واقعی خودت و دوستانت در بخش رنکینگ دیده می‌شود.</p><button type="button" class="quiet-button" data-elara-tab="ranking">دیدن رنکینگ</button>'}
 const social=$('elara-home-social');if(social&&!social.children.length){social.innerHTML='<p class="muted">با دوستانت مسیر را جذاب‌تر کن.</p><button type="button" class="quiet-button" data-elara-tab="social">دیدن دوستان</button>'}
}
function wardrobeWindow(){
 if(windowRoot)return;windowRoot=document.createElement('div');windowRoot.className='approved-wardrobe';windowRoot.hidden=true;
 windowRoot.innerHTML=`<button type="button" class="approved-wardrobe-scrim" data-close-wardrobe aria-label="بستن کمد"></button><section class="approved-wardrobe-window" role="dialog" aria-modal="true" aria-labelledby="wardrobe-title" tabindex="-1"><header><button class="quiet-button" type="button" data-back-wardrobe aria-label="بازگشت">←</button><div><h2 id="wardrobe-title">${icon('wardrobe')} کمد فضایی من</h2><p class="muted">آیتم قفل‌شده را می‌توانی ببینی و Preview کنی، اما تا رسیدن به سطح لازم قابل Equip نیست.</p></div><button class="quiet-button" type="button" data-close-wardrobe>×</button></header><div id="wardrobe-main"></div></section>`;document.body.append(windowRoot)
}
function item(category,id,label,src,required,chosen){
 const locked=level()<required,media=category==='banner'?`<span class="wardrobe-banner" style="background-image:url('${src}')"></span>`:`<span class="wardrobe-item-media"><span class="wardrobe-media-fallback">${icon(category==='frame'?'ranking':'user')}</span><img data-profile-asset loading="lazy" src="${src}" alt="${esc(label)}"></span>`;
 return `<button type="button" class="wardrobe-item ${locked?'is-locked':''}" data-wardrobe-item="${category}" data-wardrobe-id="${esc(id)}" data-required="${required}" aria-disabled="${locked}" aria-pressed="${chosen}" title="${locked?'نیازمند سطح '+required+' · Preview مجاز است':'انتخاب '+label}">${media}<small>${esc(label)} · سطح ${required}</small>${locked?`<span class="wardrobe-lock-mark">${icon('lock')}<em>قفل</em></span>`:''}</button>`
}
function previewView(){
 const system=profileSystem(),person=window.ElaraSocial?.me||window.ElaraAccount?.profile||{},base=system?.viewModel?.(person,{self:true});if(!base)return null;
 const view={...base};if(!selectedPreview)return view;
 if(selectedPreview.kind==='avatar'){view.avatarSrc=system.avatarPath(selectedPreview.group,selectedPreview.level,wardrobe().shape||'circle');view.avatarGroup=selectedPreview.group;view.avatarLevel=selectedPreview.level;view.shape=wardrobe().shape||'circle'}
 if(selectedPreview.kind==='frame'){const f=system.frameBy(selectedPreview.id);view.frame=f?.id||null;view.frameSrc=f?system.frameVariantPath(f.id,wardrobe().shape||'circle'):'';view.frameLabel=f?.label||view.frameLabel;view.shape=wardrobe().shape||'circle'}
 if(selectedPreview.kind==='banner'){const b=system.bannerBy(selectedPreview.id);view.banner=b?.id||null;view.bannerSrc=b?.path||view.bannerSrc;view.bannerLabel=b?.label||view.bannerLabel}
 return view
}
function drawWardrobe(){
 const host=$('wardrobe-main'),system=profileSystem();if(!host||!system)return;const p=wardrobe(),group=p.avatarGroup,curLvl=level(),view=previewView(),previewLabel=selectedPreview?.label||'ترکیب فعلی';
 const avatars=group?Array.from({length:showAll.avatar?10:4},(_,i)=>{const n=i+1;return item('avatar',group+':'+n,'آواتار '+n,system.avatarPath(group,n,p.shape||'circle'),n,group===p.avatarGroup&&n===p.avatarLevel)}).join(''):'';
 const frameItems=frames().slice(0,showAll.frame?4:3).map(f=>item('frame',f.id,f.label,system.frameVariantPath(f.id,p.shape||'circle'),f.required,p.frame===f.id)).join('');
 const bannerItems=bannerList().slice(0,showAll.banner?bannerList().length:2).map(b=>item('banner',b.id,b.label,b.path,b.required,p.banner===b.id)).join('');
 host.innerHTML=`<section class="pass4-wardrobe-preview" style="--wardrobe-preview-banner:url('${view?.bannerSrc||'assets/banner-moon.svg'}')"><div class="pass4-wardrobe-preview-copy"><span class="eyebrow">PREVIEW</span><strong>${esc(previewLabel)}</strong><small>Level ${curLvl} · ${esc(system.titleForLevel(curLvl))}</small>${selectedPreview?.locked?'<em>فقط Preview؛ این آیتم هنوز قابل Equip نیست.</em>':''}</div>${view?system.composition(view):''}</section><section class="wardrobe-section"><header><div><h3>${icon('user')} آواتار</h3><small>فقط variant شکل فعال نمایش داده می‌شود؛ گروه آواتار را خودت انتخاب می‌کنی.</small></div></header><div class="profile-shape-switch"><button class="quiet-button" type="button" data-wardrobe-shape="circle" aria-pressed="${p.shape==='circle'}">Circle</button><button class="quiet-button" type="button" data-wardrobe-shape="square" aria-pressed="${p.shape==='square'}">Square</button></div><div class="pass4-avatar-groups"><button class="quiet-button" type="button" data-wardrobe-group="female" aria-pressed="${group==='female'}">آواتارهای زنانه</button><button class="quiet-button" type="button" data-wardrobe-group="male" aria-pressed="${group==='male'}">آواتارهای مردانه</button></div>${group?`<div class="wardrobe-grid">${avatars}</div>${!showAll.avatar?'<button type="button" class="quiet-button" data-wardrobe-more="avatar">نمایش بیشتر</button>':''}`:'<div class="pass4-neutral-avatar">برای دیدن آواتارها ابتدا یکی از دو گروه را خودت انتخاب کن. هیچ انتخابی از نام، عکس یا اطلاعات Wellness استنباط نمی‌شود.</div>'}<p class="muted pass4-storage-note">عکس شخصی از «ویرایش پروفایل» با crop امن Circle/Square قابل انتخاب است.</p></section><section class="wardrobe-section"><header><div><h3>${icon('ranking')} فریم‌ها</h3><small>Bronze: 1–3 · Silver: 4–6 · Gold: 7–9 · Diamond: 10</small></div></header><div class="wardrobe-grid">${frameItems}</div>${!showAll.frame?'<button type="button" class="quiet-button" data-wardrobe-more="frame">نمایش بیشتر</button>':''}</section><section class="wardrobe-section"><header><div><h3>${icon('home')} بنر پروفایل</h3><small>بنرهای محلی فعلی تا ورود Assetهای نهایی استفاده می‌شوند.</small></div></header><div class="wardrobe-grid">${bannerItems}</div>${!showAll.banner?'<button type="button" class="quiet-button" data-wardrobe-more="banner">نمایش بیشتر</button>':''}</section>`;
}
function showWardrobe(){wardrobeWindow();selectedPreview=null;showAll={avatar:false,frame:false,banner:false};drawWardrobe();windowRoot.style.zIndex=String(window.ElaraOverlayStack?.next?.()||100220);windowRoot.hidden=false;windowRoot.querySelector('.approved-wardrobe-window')?.focus({preventScroll:true})}
function closeWardrobe(){if(windowRoot)windowRoot.hidden=true;selectedPreview=null}
window.ElaraWardrobeUI={open:showWardrobe,close:closeWardrobe,draw:drawWardrobe};
function wire(){
 /* Task metadata creation is owned by phase2.js, which preserves the composer draft. */
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-approved-wardrobe]')){showWardrobe();return}
  if(event.target.closest('[data-close-wardrobe],[data-back-wardrobe]')){closeWardrobe();return}
  if(event.target.closest('[data-lang-leitner]')){window.ElaraOpen?.('words');return}
  const shape=event.target.closest('[data-wardrobe-shape]');if(shape){storeWardrobe({shape:shape.dataset.wardrobeShape});selectedPreview=null;drawWardrobe();return}
  const group=event.target.closest('[data-wardrobe-group]');if(group){storeWardrobe({avatarGroup:group.dataset.wardrobeGroup});selectedPreview=null;drawWardrobe();return}
  const more=event.target.closest('[data-wardrobe-more]');if(more){showAll[more.dataset.wardrobeMore]=true;drawWardrobe();return}
  const itemButton=event.target.closest('[data-wardrobe-item]');if(itemButton){const system=profileSystem(),kind=itemButton.dataset.wardrobeItem,id=itemButton.dataset.wardrobeId,required=Number(itemButton.dataset.required||0),locked=level()<required;let preview={kind,id,label:itemButton.querySelector('small')?.textContent||id,locked};if(kind==='avatar'){const parts=id.split(':');preview={...preview,group:parts[0],level:Number(parts[1])};if(!locked&&system.canEquipAvatar(parts[0],Number(parts[1]),level()))storeWardrobe({avatarGroup:parts[0],avatarLevel:Number(parts[1])})}else if(kind==='frame'){if(!locked&&system.canEquipFrame(id,level()))storeWardrobe({frame:id})}else if(kind==='banner'){if(!locked&&system.canEquipBanner(id,level()))storeWardrobe({banner:id})}selectedPreview=preview;drawWardrobe();return}
  const del=event.target.closest('[data-language-book-delete]');if(del){event.preventDefault();event.stopPropagation();const id=String(del.dataset.languageBookDelete||''),owner=languageBookOwner(id),books=readBooks(owner).filter(b=>String(b.id)!==id);pendingGuestLanguageIds.delete(id);if(writeBooks(books,owner))renderLanguage();return}
  const readButton=event.target.closest('[data-language-reading]');if(readButton){
   event.preventDefault();event.stopPropagation();
   const id=String(readButton.dataset.languageReading||''),owner=languageBookOwner(id),books=readBooks(owner),index=books.findIndex(b=>String(b.id)===id);if(index<0)return;
   const openReading=()=>{const activeOwner=languageBookOwner(id),fresh=readBooks(activeOwner),idx=fresh.findIndex(b=>String(b.id)===id);if(idx<0)return;const b=fresh[idx];if(!b.totalPages)return;const form=document.createElement('div');form.className='library-log-form';form.innerHTML='<p>صفحهٔ فعلی: '+Number(b.currentPage||0).toLocaleString('fa-IR')+' / '+Number(b.totalPages||0).toLocaleString('fa-IR')+'</p><label>روش ثبت<select name="mode"><option value="count">امروز X صفحه خواندم</option><option value="page">رسیدم به صفحه Y</option></select></label><label>تعداد / شماره صفحه<input name="pages" type="number" min="1" max="'+b.totalPages+'" required></label>';window.ElaraDialog.open({title:'گزارش مطالعه کتاب زبان',content:form,actions:[{label:'انصراف',value:false},{label:'ثبت',value:true,kind:'primary'}]}).then(ok=>{if(ok!==true)return;try{const next=window.ElaraReading.record(b,form.querySelector('[name=mode]').value,form.querySelector('[name=pages]').value),last=next.readingLogs[next.readingLogs.length-1],pct=window.ElaraReading.progress(next);fresh[idx]=next;if(!writeBooks(fresh,activeOwner))return;window.ElaraNotify?.push?.({type:'reading',title:'مطالعه زبان ثبت شد',message:'امروز '+last.pagesRead.toLocaleString('fa-IR')+' صفحه از «'+next.title+'» خوندی 📚🔥',dedupeKey:'language-reading:'+next.id+':'+last.timestamp});window.ElaraSocial?.publishActivity?.('reading',{pagesRead:last.pagesRead,percentAfter:pct,bookTitle:next.title,visibility:'friends'});renderLanguage()}catch(error){console.error('Language reading report:',error)}})};
   if(!books[index].totalPages){const setup=document.createElement('div');setup.className='library-add-book-dialog';setup.innerHTML='<p><strong>'+esc(books[index].title||'کتاب')+'</strong></p><p class="muted">برای ثبت مطالعه، یک‌بار تعداد کل صفحات را مشخص کن.</p><label>کل صفحات<input name="total" type="number" min="1" max="1000000" required></label><label>صفحه فعلی<input name="current" type="number" min="0" max="1000000" value="'+Number(books[index].currentPage||0)+'"></label>';window.ElaraDialog.open({title:'تعداد صفحات کتاب',content:setup,actions:[{label:'انصراف',value:false},{label:'ذخیره و ادامه',value:true,kind:'primary'}]}).then(ok=>{if(ok!==true)return;const total=Math.floor(Number(setup.querySelector('[name=total]').value)||0),current=Math.floor(Number(setup.querySelector('[name=current]').value)||0);if(total<1||current<0||current>total)return;books[index]=window.ElaraReading?.normalize?window.ElaraReading.normalize({...books[index],totalPages:total,currentPage:current,shelf:current>=total?'finished':'reading'}):{...books[index],totalPages:total,currentPage:current};if(!writeBooks(books,owner))return;renderLanguage();openReading()});return}
   openReading();return
  }
 /* Language book actions are handled during capture so nested cards/legacy owners
    cannot swallow Delete or Reading Report clicks before Elara sees them. */
 },true);
 document.addEventListener('submit',e=>{
  if(e.target.id!=='language-book-form')return;
  e.preventDefault();
  const form=e.target,title=form.elements.title.value.trim(),shelf=form.elements.shelf.value;
  if(!title)return;
  const details=document.createElement('form');
  details.className='library-add-book-dialog language-book-add-dialog';
  details.innerHTML='<p><strong>'+esc(title)+'</strong></p><p class="muted">تعداد صفحات را مشخص کن؛ بعد کتاب همان لحظه داخل «کتاب‌های زبان» ظاهر می‌شود.</p><label>کل صفحات<input name="total" type="number" min="1" max="1000000" required inputmode="numeric"></label><label>صفحه فعلی (اختیاری)<input name="current" type="number" min="0" max="1000000" value="0" inputmode="numeric"></label><label>تاریخ شروع (اختیاری)<input name="started" type="date"></label><p class="muted" role="status" data-language-book-error></p><button class="primary-button" type="submit">ذخیره کتاب</button>';
  details.addEventListener('submit',event=>{
   event.preventDefault();
   const error=details.querySelector('[data-language-book-error]'),total=Math.floor(Number(details.elements.total.value)||0),current=Math.floor(Number(details.elements.current.value)||0);
   if(total<1){error.textContent='تعداد کل صفحات را وارد کن 📚';details.elements.total.focus();return}
   if(current<0||current>total){error.textContent='صفحهٔ فعلی باید بین صفر و تعداد کل صفحات باشد.';details.elements.current.focus();return}
   const started=details.elements.started.value||null,owner=uid(),books=readBooks(owner),id=globalThis.crypto?.randomUUID?.()||('lang-'+Date.now().toString(36));
   const next=normalizeLanguageBook({id,title:title.slice(0,180),shelf:current>=total?'finished':shelf,totalPages:total,currentPage:current,startedAt:started?Date.parse(started+'T12:00:00'):null,finishedAt:current>=total?Date.now():null,lastReadAt:null,readingLogs:[]});
   books.push(next);
   if(owner==='guest')pendingGuestLanguageIds.add(String(id));
   if(!writeBooks(books,owner)){pendingGuestLanguageIds.delete(String(id));error.textContent='ذخیره انجام نشد؛ فضای ذخیره‌سازی مرورگر را بررسی کن.';return}
   form.reset();renderLanguage();window.ElaraNotify?.push?.({type:'book',title:'کتاب زبان اضافه شد',message:'«'+next.title+'» رفت توی قفسه‌ت 📚✨',dedupeKey:'language-book-added:'+next.id});window.ElaraDialog.close();
  });
  window.ElaraDialog.open({title:'افزودن کتاب زبان',content:details,actions:[{label:'انصراف',value:false}]});
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&windowRoot&&!windowRoot.hidden)closeWardrobe()});
 window.addEventListener('elara:open',e=>{if(e.detail?.tab==='language')renderLanguage();if(e.detail?.tab==='home')refreshHome()});
 for(const name of ['elara:data-changed','elara:hydrate','elara:social-updated','elara:wardrobe-changed'])window.addEventListener(name,()=>{renderLanguage();refreshHome()});
 window.addEventListener('elara:account-ready',()=>{migratePendingGuestLanguageBooks();renderLanguage();refreshHome()});
 language();refreshHome();
 if(location.hash==='#words')window.ElaraOpen?.('words',{history:'replace'})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
