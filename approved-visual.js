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
let windowRoot=null,selectedPreview=null,showAll={avatar:false,frame:false,banner:false},wardrobeTab='banner',browseGroup=null,wardrobeOwnerUid=null,wardrobeOverflow=null;
const LANGUAGE_BOOKS_KEY='elara_language_books_v2';
const LANGUAGE_BOOKS_MIGRATION='elara_language_books_v2_migrated_';
const currentLanguageUid=()=>String(window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'').trim();
function canonicalLanguageRows(){
 try{const rows=JSON.parse(localStorage.getItem(LANGUAGE_BOOKS_KEY)||'[]');return safeList(rows).filter(row=>row&&typeof row==='object')}
 catch(error){console.error('Language books v2 read:',error);return[]}
}
function storeCanonicalLanguageRows(rows){
 try{localStorage.setItem(LANGUAGE_BOOKS_KEY,JSON.stringify(safeList(rows)));return true}
 catch(error){console.error('Language books v2 write:',error);return false}
}
function ensureLanguageBookId(book,index=0){
 const next=book&&typeof book==='object'?{...book}:{title:String(book||'کتاب'),shelf:'reading'};
 if(!next.id)next.id=globalThis.crypto?.randomUUID?.()||('lang-'+Date.now().toString(36)+'-'+index);
 return next
}
function migrateLegacyLanguageOwner(owner){
 const legacyOwner=String(owner||'guest'),marker=LANGUAGE_BOOKS_MIGRATION+legacyOwner;
 if(localStorage.getItem(marker)==='1')return false;
 let legacy=[];try{legacy=safeList(JSON.parse(localStorage.getItem('elara_language_books_v1_'+legacyOwner)||'[]'))}catch{}
 if(!legacy.length){localStorage.setItem(marker,'1');return false}
 const rows=canonicalLanguageRows(),seen=new Set(rows.map(x=>String(x.id||'')));let changed=false;
 legacy.forEach((raw,index)=>{const next=ensureLanguageBookId(raw,index),id=String(next.id);if(seen.has(id))return;seen.add(id);const {ownerUid,...clean}=next;rows.push(clean);changed=true});
 if(changed&&!storeCanonicalLanguageRows(rows))return false;
 localStorage.setItem(marker,'1');try{localStorage.removeItem('elara_language_books_v1_'+legacyOwner)}catch{};return changed
}
function prepareLanguageBooks(){
 migrateLegacyLanguageOwner('guest');
 const account=currentLanguageUid();if(account)migrateLegacyLanguageOwner(account);
 const rows=canonicalLanguageRows();let dirty=false;
 const clean=rows.map((raw,index)=>{const withId=ensureLanguageBookId(raw,index),{ownerUid,...next}=withId;if(ownerUid!==undefined||next.id!==raw.id)dirty=true;return next});
 if(dirty)storeCanonicalLanguageRows(clean);
 return clean
}
function readBooks(){return prepareLanguageBooks().map(normalizeLanguageBook)}
function writeBooks(books){
 const clean=safeList(books).map((raw,index)=>{const withId=ensureLanguageBookId(raw,index),{ownerUid,...next}=withId;return next});
 return storeCanonicalLanguageRows(clean)
}
function language(){
 if($('panel-language'))return;
 const main=$('main'),panel=document.createElement('section');panel.id='panel-language';panel.className='panel hidden pass3-language';
 panel.innerHTML=`<div class="elara-language-hero"><div class="language-hero-copy"><p>Elara · LANGUAGE JOURNEY</p><h1>هر واژه، یک قدم به سوی دنیای بزرگ‌تر توست.</h1><p>با داستان‌ها، مرور هوشمند و مطالعهٔ واقعی زبان را زندگی کن.</p></div><blockquote>«زبان، مرزها را به دوستی تبدیل می‌کند.»<small>— Elara</small></blockquote></div><div class="approved-language-grid pass3-language-grid"><section class="elara-card pass3-language-block pass3-language-leitner" data-language-block="leitner"><header><div><h2><img class="pass3-language-head-art" src="assets/ui/icon_brain.webp" width="52" height="52" alt="" decoding="async"> جعبهٔ لایتنر</h2><span class="muted">مرور هوشمند · یادگیری ماندگار</span></div><button class="language-card-all" type="button" data-lang-leitner>همه <span aria-hidden="true">‹</span></button></header><div id="language-stat-row" class="lang-stat-row language-leitner-stats"></div><button class="primary-button pass3-leitner-source-cta" type="button" data-lang-review>شروع مرور امروز <img src="assets/ui/book.webp" alt="" aria-hidden="true"></button></section><section class="elara-card pass3-language-block pass3-language-books" data-language-block="books"><header><div><h2><img class="pass3-language-head-art" src="assets/ui/book.webp" width="48" height="48" alt="" decoding="async"> کتاب‌های زبان</h2><span class="muted">با داستان‌ها زبان را زندگی کن</span></div><div class="pass3-book-tabs" aria-label="وضعیت کتاب‌ها"><span>در حال مطالعه</span><span>خوانده‌شده</span></div></header><form id="language-book-form" class="inline-form"><input name="title" maxlength="180" required placeholder="نام کتاب زبان…" aria-label="نام کتاب زبان"><select name="shelf" aria-label="وضعیت کتاب"><option value="reading">در حال مطالعه</option><option value="finished">خوانده‌شده</option></select><button class="primary-button" type="submit">افزودن</button></form><div id="language-book-list" class="pass3-language-book-list"></div></section><section class="elara-card pass3-language-block pass3-language-report" data-language-block="report"><header><div><h2>${icon('chart')} گزارش مطالعه</h2><span class="muted">پیشرفت واقعی تو</span></div></header><div id="language-reports"></div><p class="muted">گزارش از داده‌های واقعی همین حساب تهیه می‌شود.</p></section><section class="elara-card pass3-language-block pass3-language-courses" data-language-block="courses"><header><div><h2>${icon('course')} کلاس‌های آنلاین / دوره‌ها</h2><span class="muted">مسیرهای یادگیری</span></div></header><div class="pass3-coming-soon"><span>${icon('course')}</span><div><strong>دوره‌های واقعی در راه‌اند</strong><p class="muted">تا اتصال Backend دوره‌ها، دادهٔ ساختگی نمایش داده نمی‌شود.</p></div></div></section></div>`;
 main.prepend(panel);
 const words=$('panel-words');if(words)words.classList.add('approved-leitner-full-page');
 renderLanguage();
}
function normalizeLanguageBook(raw){
 const base={...raw,readingLogs:safeList(raw?.readingLogs),currentPage:Number(raw?.currentPage||0),totalPages:Number(raw?.totalPages||0)};
 return window.ElaraReading?.normalize?window.ElaraReading.normalize(base):base
}
function deleteLanguageBook(id){
 const wanted=String(id||'');if(!wanted)return false;
 const books=readBooks(),next=books.filter(b=>String(b.id)!==wanted);
 if(next.length===books.length)return false;
 
 if(!writeBooks(next))return false;
 renderLanguage();return true
}
function openLanguageReading(id){
 const wanted=String(id||'');if(!wanted)return;
 const books=readBooks(),index=books.findIndex(b=>String(b.id)===wanted);if(index<0)return;
 const openReading=()=>{
  const fresh=readBooks(),idx=fresh.findIndex(b=>String(b.id)===wanted);if(idx<0)return;
  const b=fresh[idx];if(!b.totalPages)return;
  const form=document.createElement('div');form.className='library-log-form';
  form.innerHTML='<p>صفحهٔ فعلی: '+Number(b.currentPage||0).toLocaleString('fa-IR')+' / '+Number(b.totalPages||0).toLocaleString('fa-IR')+'</p><label>روش ثبت<select name="mode"><option value="count">امروز X صفحه خواندم</option><option value="page">رسیدم به صفحه Y</option></select></label><label>تعداد / شماره صفحه<input name="pages" type="number" min="1" max="'+b.totalPages+'" required></label>';
  window.ElaraDialog.open({title:'گزارش مطالعه کتاب زبان',content:form,actions:[{label:'انصراف',value:false},{label:'ثبت',value:true,kind:'primary'}]}).then(ok=>{
   if(ok!==true)return;
   try{
    const next=window.ElaraReading.record(b,form.querySelector('[name=mode]').value,form.querySelector('[name=pages]').value),last=next.readingLogs[next.readingLogs.length-1],pct=window.ElaraReading.progress(next);
    fresh[idx]=next;if(!writeBooks(fresh))return;
    window.ElaraNotify?.push?.({type:'reading',title:'مطالعه زبان ثبت شد',message:'امروز '+last.pagesRead.toLocaleString('fa-IR')+' صفحه از «'+next.title+'» خوندی 📚🔥',dedupeKey:'language-reading:'+next.id+':'+last.timestamp});
    window.ElaraSocial?.publishActivity?.('reading',{category:'language',pagesRead:last.pagesRead,percentAfter:pct,bookTitle:next.title});renderLanguage()
   }catch(error){console.error('Language reading report:',error)}
  })
 };
 if(!books[index].totalPages){
  const setup=document.createElement('div');setup.className='library-add-book-dialog';
  setup.innerHTML='<p><strong>'+esc(books[index].title||'کتاب')+'</strong></p><p class="muted">برای ثبت مطالعه، یک‌بار تعداد کل صفحات را مشخص کن.</p><label>کل صفحات<input name="total" type="number" min="1" max="1000000" required></label><label>صفحه فعلی<input name="current" type="number" min="0" max="1000000" value="'+Number(books[index].currentPage||0)+'"></label>';
  window.ElaraDialog.open({title:'تعداد صفحات کتاب',content:setup,actions:[{label:'انصراف',value:false},{label:'ذخیره و ادامه',value:true,kind:'primary'}]}).then(ok=>{
   if(ok!==true)return;
   const total=Math.floor(Number(setup.querySelector('[name=total]').value)||0),current=Math.floor(Number(setup.querySelector('[name=current]').value)||0);if(total<1||current<0||current>total)return;
   books[index]=window.ElaraReading?.normalize?window.ElaraReading.normalize({...books[index],totalPages:total,currentPage:current,shelf:current>=total?'finished':'reading'}):{...books[index],totalPages:total,currentPage:current};
   if(!writeBooks(books))return;renderLanguage();openReading()
  });return
 }
 openReading()
}
function bindLanguageBookActions(){
 const list=$('language-book-list');if(!list)return;
 list.querySelectorAll('[data-language-book-delete]').forEach(button=>{
  button.onclick=event=>{event.preventDefault();event.stopPropagation();deleteLanguageBook(button.dataset.languageBookDelete)}
 });
 list.querySelectorAll('[data-language-reading]').forEach(button=>{
  button.onclick=event=>{event.preventDefault();event.stopPropagation();openLanguageReading(button.dataset.languageReading)}
 });
}
function renderLanguage(){
 const bookList=$('language-book-list'),reports=$('language-reports');if(!bookList||!reports)return;
 const state=data(),words=safeList(state.words),books=readBooks(),reading=books.filter(x=>x.shelf==='reading'),finished=books.filter(x=>x.shelf==='finished');
 const trace=window.__elaraLanguageRenderTrace||(window.__elaraLanguageRenderTrace=[]);trace.push({at:Date.now(),count:books.length,titles:books.map(x=>x.title),storage:canonicalLanguageRows().map(x=>x.title),stack:(new Error().stack||'').split('\n').slice(1,6)});if(trace.length>24)trace.splice(0,trace.length-24);
 const todayKey=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(),dueWords=words.filter(w=>!w.due||String(w.due)<=todayKey),newWords=words.filter(w=>Number(w.box||1)<=1),reviewAgain=dueWords.filter(w=>Number(w.box||1)>1),mastered=words.filter(w=>Number(w.box||1)>=5);const statRow=$('language-stat-row');if(statRow)statRow.innerHTML=`<div><img class="pass3-language-stat-art" src="assets/ui/book.webp" width="44" height="44" alt="" loading="lazy" decoding="async"><strong>${dueWords.length.toLocaleString('fa-IR')}</strong><small>کارت امروز</small></div><div><img class="pass3-language-stat-art" src="assets/ui/ready_to_review.webp" width="44" height="44" alt="" loading="lazy" decoding="async"><strong>${reviewAgain.length.toLocaleString('fa-IR')}</strong><small>آماده مرور</small></div><div><img class="pass3-language-stat-art" src="assets/ui/new_words.webp" width="44" height="44" alt="" loading="lazy" decoding="async"><strong>${newWords.length.toLocaleString('fa-IR')}</strong><small>واژه جدید</small></div><div><img class="pass3-language-stat-art" src="assets/ui/review_again.webp" width="44" height="44" alt="" loading="lazy" decoding="async"><strong>${mastered.length.toLocaleString('fa-IR')}</strong><small>ماندگار</small></div>`;
 bookList.innerHTML=books.length?books.map(b=>{const pct=b.totalPages?Math.min(100,Math.round((b.currentPage||0)/b.totalPages*100)):0;return `<article class="pass3-language-book ${b.shelf==='finished'?'is-finished':'is-reading'}"><span class="pass3-book-cover">${icon('book')}</span><div class="pass3-book-copy"><strong data-elara-ugc dir="auto">${esc(b.title)}</strong><small>${b.shelf==='finished'?'خوانده‌شده':'در حال مطالعه'}</small><span class="pass3-book-status">صفحه ${Number(b.currentPage||0).toLocaleString('fa-IR')} از ${b.totalPages?Number(b.totalPages).toLocaleString('fa-IR'):'—'} · ${pct.toLocaleString('fa-IR')}٪</span><span class="elara-track"><i style="width:${pct}%"></i></span></div><div class="pass3-book-actions"><button class="primary-button" type="button" data-language-reading="${esc(b.id)}">ثبت مطالعه</button><button class="quiet-button" type="button" data-language-book-delete="${esc(b.id)}" aria-label="حذف کتاب ${esc(b.title)}">×</button></div></article>`}).join(''):'<p class="empty-note">قفسه‌ت هنوز منتظر اولین ماجراجوییه 📚✨ یه کتاب اضافه کن و از همون چند صفحهٔ اول شروع کنیم.</p>';
 reports.innerHTML=`<div class="lang-stat-row"><div><strong>${words.length.toLocaleString('fa-IR')}</strong><small>واژهٔ ثبت‌شده</small></div><div><strong>${books.length.toLocaleString('fa-IR')}</strong><small>کل کتاب‌ها</small></div><div><strong>${finished.length.toLocaleString('fa-IR')}</strong><small>کتاب تمام‌شده</small></div></div><div id="pass3-language-chart" class="pass3-language-chart" aria-label="نمودار گزارش یادگیری"></div>`;
 bindLanguageBookActions();
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
 if(!document.getElementById('elara-wardrobe-reference-css')){const link=document.createElement('link');link.id='elara-wardrobe-reference-css';link.rel='stylesheet';link.href='wardrobe-reference.css?v=p3-20261011';document.head.append(link)}
 if(windowRoot)return;windowRoot=document.createElement('div');windowRoot.className='approved-wardrobe';windowRoot.hidden=true;
 windowRoot.innerHTML=`<button type="button" class="approved-wardrobe-scrim" data-close-wardrobe aria-label="بستن کمد"></button><section class="approved-wardrobe-window" role="dialog" aria-modal="true" aria-labelledby="wardrobe-title" tabindex="-1"><header><button class="quiet-button" type="button" data-back-wardrobe aria-label="بازگشت">←</button><div><h2 id="wardrobe-title"><img class="wardrobe-title-art" src="assets/ui/icon_wardrobe_hanger.webp" alt="" decoding="async"> کمد فضایی من</h2><p class="muted">انتخاب و تجهیز آواتار، بنر، قاب و آیتم‌های شخصی‌سازی. پیش‌نمایش، انتخاب را ذخیره نمی‌کند.</p></div><button class="quiet-button" type="button" data-close-wardrobe>×</button></header><div id="wardrobe-main"></div></section>`;document.body.append(windowRoot)
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
 const host=$('wardrobe-main'),system=profileSystem();if(!host||!system)return;if(wardrobeOwnerUid&&uid()!==wardrobeOwnerUid){closeWardrobe(true);return}
 const tabs=[['character','کاراکتر سه‌بعدی','user'],['avatar','آواتار','user'],['banner','بنر پروفایل','home'],['frame','فریم','ranking'],['badge','نشان','ranking'],['effect','افکت','spark']];
 if(wardrobeTab==='character'){
   windowRoot.classList.add('is-character-tab');
   host.innerHTML='<nav class="wardrobe-p3-tabs" aria-label="دسته‌بندی کمد">'+tabs.map(([id,label,ico])=>'<button type="button" data-wardrobe-tab="'+id+'" aria-current="'+(id===wardrobeTab?'true':'false')+'">'+icon(ico)+esc(label)+'</button>').join('')+'</nav>'+
     '<div class="elara-character-wardrobe" dir="rtl"><div class="elara-character-wardrobe-stage" data-elara-wardrobe-avatar-slot></div>'+
     '<section class="elara-character-wardrobe-items" aria-label="ظاهر سه‌بعدی"><h3>ظاهر کاراکتر</h3><div data-elara-wardrobe-looks><p class="muted">در حال آماده‌سازی کمد کاراکتر…</p></div></section></div>';
   const slot=host.querySelector('[data-elara-wardrobe-avatar-slot]'),stage=window.ElaraPrivateDrawer?.ensureAvatarStage?.();
   if(stage&&slot){slot.append(stage);stage.classList.add('is-wardrobe-stage');window.dispatchEvent(new Event('elara:avatar-stage-ready'));}
   const controls=host.querySelector('[data-elara-wardrobe-looks]');
   if(window.ElaraLiveVRM?.current?.stage===stage)window.ElaraLiveVRM.current.renderWardrobeControls?.(controls);
   else if(controls)controls.innerHTML='<p class="muted">در حال بارگذاری کاراکتر سه‌بعدی… اگر مدل مناسب این حساب موجود نباشد، نسخهٔ آزمایشی نمایش داده می‌شود.</p>';
   return;
 }
 windowRoot.classList.remove('is-character-tab');
 window.ElaraPrivateDrawer?.restoreAvatarStage?.();
 const p=wardrobe(),group=browseGroup,curLvl=level(),view=previewView();
 const make=(kind,id,label,src,required,equipped)=>({kind,id,label,src,required,locked:curLvl<required,equipped});
 const avatarItems=group?Array.from({length:10},(_,i)=>{const n=i+1;return make('avatar',group+':'+n,'آواتار '+n,system.avatarPath(group,n,p.shape||'circle'),n,p.photoMode!=='upload'&&group===p.avatarGroup&&n===p.avatarLevel)}):[];
 const frameItems=frames().map(f=>make('frame',f.id,f.label,system.frameVariantPath(f.id,p.shape||'circle'),f.required,p.frame===f.id));
 const bannerItems=bannerList().map(b=>make('banner',b.id,b.label,b.path,b.required,p.banner===b.id));
 const inventory={avatar:avatarItems,frame:frameItems,banner:bannerItems};
 const items=inventory[wardrobeTab]||[],sel=selectedPreview,active=items.find(x=>x.id===sel?.id&&x.kind===sel?.kind)||null;
 const photo=(x)=>x.kind==='banner'?'<img src="'+esc(x.src)+'" alt="" loading="lazy" decoding="async">':'<img src="'+esc(x.src)+'" alt="" loading="lazy" decoding="async">';
 const list=items.slice(0,showAll[wardrobeTab]?items.length:6);
 const cards=list.map(x=>'<button type="button" class="wardrobe-p3-tile'+(active?.id===x.id?' is-selected':'')+(x.equipped?' is-equipped':'')+'" data-wardrobe-item="'+x.kind+'" data-wardrobe-id="'+esc(x.id)+'" aria-pressed="'+(active?.id===x.id)+'" aria-label="'+esc(x.label+(x.locked?' قفل؛ سطح '+x.required:'') )+'"><span class="wardrobe-p3-image">'+photo(x)+'</span><span class="wardrobe-p3-tile-info"><b>'+esc(x.label)+'</b><small>'+ (x.locked?'🔒 سطح '+x.required:x.equipped?'✓ مجهز':'سطح '+x.required)+'</small></span></button>').join('');
 const itemPreview=active||items.find(x=>x.equipped)||items[0]||null;
 const itemStatus=itemPreview?(itemPreview.locked?'قفل تا سطح '+itemPreview.required:itemPreview.equipped?'مجهز':'قابل تجهیز'):'انتخاب نشده';
 const detail=itemPreview?'<img class="wardrobe-p3-selected-art" src="'+esc(itemPreview.src)+'" alt="'+esc(itemPreview.label)+'" loading="lazy"><div class="wardrobe-p3-detail-heading"><strong>'+esc(itemPreview.label)+'</strong><small>سطح '+itemPreview.required+' · '+itemStatus+'</small></div><p>این آیتم از مجموعهٔ واقعی Elara است. برای دیدن روی پروفایل، کارت را انتخاب کن؛ تجهیز تنها با دکمهٔ تأیید انجام می‌شود.</p>':'<p>برای دیدن جزئیات، یک آیتم انتخاب کن.</p>';
 const equippedSelected=!!active&&active.equipped;
 const enableEquip=!!active&&!active.locked&&!equippedSelected;
 host.innerHTML='<section class="wardrobe-p3-hero">'+(view?system.composition(view):'<p>در حال بارگذاری پروفایل…</p>')+'<span class="wardrobe-p3-hero-caption">'+(sel?'در حال پیش‌نمایش آیتم':'پیش‌نمایش مجهزشده')+'</span></section>'+
 '<nav class="wardrobe-p3-tabs" aria-label="دسته‌بندی کمد">'+tabs.map(([id,label,ico])=>'<button type="button" data-wardrobe-tab="'+id+'" aria-current="'+(id===wardrobeTab?'true':'false')+'">'+icon(ico)+esc(label)+'</button>').join('')+'</nav>'+
 '<div class="wardrobe-p3-layout"><section class="wardrobe-p3-catalog"><h3>'+esc(tabs.find(x=>x[0]===wardrobeTab)?.[1]||'آیتم‌ها')+'</h3>'+
 (wardrobeTab==='avatar'?'<div class="wardrobe-p3-groups"><button type="button" data-wardrobe-group="female" aria-pressed="'+(group==='female')+'">گروه آواتار ۱</button><button type="button" data-wardrobe-group="male" aria-pressed="'+(group==='male')+'">گروه آواتار ۲</button></div>':'')+
 ((wardrobeTab==='badge'||wardrobeTab==='effect')?'<p class="wardrobe-p3-empty">هنوز قرارداد تجهیز امن و پایدار برای این دسته وجود ندارد. فعلاً هیچ گزینه‌ای قابل تجهیز نیست.</p>':items.length?'<div class="wardrobe-p3-grid">'+cards+'</div>'+(!showAll[wardrobeTab]&&items.length>6?'<button type="button" class="wardrobe-p3-more" data-wardrobe-more="'+wardrobeTab+'">نمایش بیشتر</button>':''):'<p class="wardrobe-p3-empty">ابتدا گروه آواتار را انتخاب کن. از اطلاعات حساب، گروهی حدس زده نمی‌شود.</p>')+'</section>'+
 '<aside class="wardrobe-p3-detail" aria-live="polite"><h3>جزئیات آیتم انتخاب‌شده</h3>'+detail+
 '<div class="wardrobe-p3-detail-actions"><button type="button" data-wardrobe-preview '+(!itemPreview?'disabled':'')+'>پیش‌نمایش</button><button type="button" data-wardrobe-clear '+(!equippedSelected?'disabled':'')+'>برداشتن تجهیز</button></div></aside></div>'+
 '<footer class="wardrobe-p3-footer"><p>تجهیز در همین مرورگر و مخصوص حساب فعال ذخیره می‌شود؛ آپلود ابری فعال نیست.</p><button type="button" class="wardrobe-p3-equip" data-wardrobe-equip '+(!enableEquip?'disabled':'')+'>'+(active?.locked?'آیتم قفل است':equippedSelected?'مجهز است':'تجهیز این آیتم')+'</button></footer>';
}
function showWardrobe(tab='banner'){
 wardrobeWindow();const wasClosed=windowRoot.hidden;
 if(wasClosed)wardrobeOverflow={body:document.body.style.overflow,html:document.documentElement.style.overflow};
 wardrobeOwnerUid=uid();
 selectedPreview=null;wardrobeTab=tab==='character'?'character':'banner';browseGroup=wardrobe().avatarGroup||null;
 showAll={avatar:false,frame:false,banner:false};
 drawWardrobe();window.ElaraOverlayStack?.next?.(windowRoot);windowRoot.hidden=false;
 if(wasClosed&&!history.state?.elaraWardrobe)history.pushState({...history.state,elaraWardrobe:true},'',location.href);
 windowRoot.querySelector('.approved-wardrobe-window')?.focus({preventScroll:true})
}
function closeWardrobe(fromHistory=false){
 if(!windowRoot||windowRoot.hidden)return;
 if(!fromHistory&&history.state?.elaraWardrobe){history.back();return}
 window.ElaraPrivateDrawer?.restoreAvatarStage?.();windowRoot.classList.remove('is-character-tab');
 windowRoot.hidden=true;selectedPreview=null;wardrobeOwnerUid=null;
 if(wardrobeOverflow){document.body.style.overflow=wardrobeOverflow.body;document.documentElement.style.overflow=wardrobeOverflow.html;wardrobeOverflow=null}
}
window.addEventListener('popstate',()=>{if(windowRoot&&!windowRoot.hidden&&!history.state?.elaraWardrobe)closeWardrobe(true)});
window.addEventListener('elara:account-ready',()=>{if(windowRoot&&!windowRoot.hidden&&uid()!==wardrobeOwnerUid){
 if(history.state?.elaraWardrobe)history.replaceState({...history.state,elaraWardrobe:false},'',location.href);
 closeWardrobe(true)
}});
window.ElaraWardrobeUI={open:showWardrobe,close:closeWardrobe,draw:drawWardrobe};
window.addEventListener('elara:live-avatar-mounted',()=>{
 const host=windowRoot?.querySelector('[data-elara-wardrobe-looks]');
 if(!windowRoot?.hidden&&wardrobeTab==='character'&&host)window.ElaraLiveVRM?.current?.renderWardrobeControls?.(host);
});
function wire(){
 /* Task metadata creation is owned by phase2.js, which preserves the composer draft. */
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-approved-wardrobe]')){showWardrobe();return}
  if(event.target.closest('[data-close-wardrobe],[data-back-wardrobe]')){closeWardrobe();return}
  if(event.target.closest('[data-lang-leitner]')){window.ElaraOpen?.('words');return}
  if(event.target.closest('[data-lang-review]')){window.ElaraOpen?.('words');return}
  const tab=event.target.closest('[data-wardrobe-tab]');if(tab){wardrobeTab=tab.dataset.wardrobeTab;selectedPreview=null;drawWardrobe();return}
  const group=event.target.closest('[data-wardrobe-group]');if(group){browseGroup=group.dataset.wardrobeGroup;selectedPreview=null;drawWardrobe();return}
  const more=event.target.closest('[data-wardrobe-more]');if(more){showAll[more.dataset.wardrobeMore]=true;drawWardrobe();return}
  const itemButton=event.target.closest('[data-wardrobe-item]');if(itemButton){
   const kind=itemButton.dataset.wardrobeItem,id=itemButton.dataset.wardrobeId,required=Number(itemButton.querySelector('small')?.textContent.match(/\\d+/)?.[0]||0);
   selectedPreview={kind,id,label:itemButton.querySelector('b')?.textContent||id,locked:level()<required};
   if(kind==='avatar'){const [group,n]=id.split(':');selectedPreview.group=group;selectedPreview.level=Number(n);selectedPreview.locked=level()<Number(n)}
   else if(kind==='frame')selectedPreview.locked=level()<Number(profileSystem()?.frameBy(id)?.required||0);
   else if(kind==='banner')selectedPreview.locked=level()<Number(profileSystem()?.bannerBy(id)?.required||0);
   drawWardrobe();return
  }
  const equip=event.target.closest('[data-wardrobe-equip]');if(equip&&selectedPreview){
   const q=selectedPreview,sys=profileSystem(),lv=level();let patch=null;
   if(q.kind==='avatar'&&sys.canEquipAvatar(q.group,q.level,lv))patch={avatarGroup:q.group,avatarLevel:q.level,photoMode:'elara'};
   if(q.kind==='frame'&&sys.canEquipFrame(q.id,lv))patch={frame:q.id};
   if(q.kind==='banner'&&sys.canEquipBanner(q.id,lv))patch={banner:q.id};
   if(patch){storeWardrobe(patch);selectedPreview=null;drawWardrobe();window.dispatchEvent(new Event('elara:profile-appearance-changed'))}
   return
  }
  const clear=event.target.closest('[data-wardrobe-clear]');if(clear&&selectedPreview){
   const q=selectedPreview,sys=profileSystem(),current=wardrobe();let patch=null;
   if(q.kind==='frame'&&current.frame===q.id)patch={frame:null};
   if(q.kind==='avatar'&&current.avatarGroup===q.group&&Number(current.avatarLevel)===q.level)patch={avatarGroup:null,avatarLevel:null};
   if(q.kind==='banner'&&current.banner===q.id)patch={banner:null};
   if(patch){storeWardrobe(patch);selectedPreview=null;drawWardrobe()}return
  }
  if(event.target.closest('[data-wardrobe-preview]')){windowRoot?.querySelector('.wardrobe-p3-hero')?.scrollIntoView({behavior:'smooth',block:'start'});return}
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
   const started=details.elements.started.value||null,books=readBooks(),id=globalThis.crypto?.randomUUID?.()||('lang-'+Date.now().toString(36));
   const next=normalizeLanguageBook({id,title:title.slice(0,180),shelf:current>=total?'finished':shelf,totalPages:total,currentPage:current,startedAt:started?Date.parse(started+'T12:00:00'):null,finishedAt:current>=total?Date.now():null,lastReadAt:null,readingLogs:[]});
   books.push(next);
   if(!writeBooks(books)){error.textContent='ذخیره انجام نشد؛ فضای ذخیره‌سازی مرورگر را بررسی کن.';return}
   const addTrace=window.__elaraLanguageAddTrace||(window.__elaraLanguageAddTrace=[]);addTrace.push({stage:'stored',at:Date.now(),rows:canonicalLanguageRows().map(x=>x.title)});
   renderLanguage();addTrace.push({stage:'rendered',at:Date.now(),html:$('language-book-list')?.innerHTML||''});
   form.reset();addTrace.push({stage:'reset',at:Date.now()});
   window.ElaraNotify?.push?.({type:'book',title:'کتاب زبان اضافه شد',message:'«'+next.title+'» رفت توی قفسه‌ت 📚✨',dedupeKey:'language-book-added:'+next.id});window.ElaraDialog.close();
  });
  window.ElaraDialog.open({title:'افزودن کتاب زبان',content:details,actions:[{label:'انصراف',value:false}]});
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&windowRoot&&!windowRoot.hidden)closeWardrobe()});
 window.addEventListener('elara:open',e=>{if(e.detail?.tab==='language')renderLanguage();if(e.detail?.tab==='home')refreshHome()});
 for(const name of ['elara:data-changed','elara:hydrate','elara:wardrobe-changed'])window.addEventListener(name,()=>{renderLanguage();refreshHome()});
 window.addEventListener('elara:social-updated',()=>{prepareLanguageBooks();renderLanguage();refreshHome()});
 window.addEventListener('elara:account-ready',()=>{prepareLanguageBooks();renderLanguage();refreshHome()});
 window.ElaraLanguageBooks={read:()=>readBooks(),write:books=>writeBooks(books),prepare:()=>prepareLanguageBooks(),render:()=>renderLanguage()};
 language();refreshHome();
 if(window.__elaraPendingRoute==='language'||location.hash==='#language'){window.__elaraPendingRoute=null;window.ElaraOpen?.('language',{history:'replace'})}
 if(location.hash==='#words')window.ElaraOpen?.('words',{history:'replace'})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
