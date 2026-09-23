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
const assetAvatar=(group,n)=>profileSystem()?.avatarPath?.(group,n)||'';
const bannerList=()=>profileSystem()?.BANNERS||[];
const frames=()=>profileSystem()?.FRAMES||[];
const icon=(name)=>window.ElaraIcons?.icon?.(name,{className:'elara-visual-icon'})||`<span class="elara-visual-icon" aria-hidden="true"></span>`;
let windowRoot=null,selectedPreview=null,showAll={avatar:false,frame:false,banner:false};
function language(){
 if($('panel-language'))return;
 const main=$('main'),panel=document.createElement('section');panel.id='panel-language';panel.className='panel hidden';
 panel.innerHTML=`<div class="elara-language-hero"><div><p>Elara · LANGUAGE JOURNEY</p><h1>هر واژه، یک قدم به دنیای بزرگ‌تر توست.</h1><p>مرور کن، کتاب بخوان و پیشرفت واقعی خودت را دنبال کن.</p></div></div><div class="approved-language-grid pass3-language-grid"><section class="elara-card pass3-language-block pass3-language-leitner"><header><h2>${icon('brain')} جعبهٔ لایتنر</h2><span class="muted">مرور هوشمند</span></header><div id="language-stat-row" class="lang-stat-row"></div><button class="primary-button pass3-leitner-source-cta" type="button" data-lang-leitner>شروع مرور</button></section><section class="elara-card pass3-language-block pass3-language-books"><header><h2>${icon('book')} کتاب‌های زبان</h2><div class="pass3-book-tabs" aria-label="وضعیت کتاب‌ها"><span>در حال مطالعه</span><span>خوانده‌شده</span></div></header><p class="muted">کتاب‌های این بخش مستقل از کتابخانهٔ عمومی هستند.</p><form id="language-book-form" class="inline-form"><input name="title" maxlength="180" required placeholder="نام کتاب زبان…" aria-label="نام کتاب زبان"><select name="shelf" aria-label="وضعیت کتاب"><option value="reading">در حال مطالعه</option><option value="finished">خوانده‌شده</option></select><button class="primary-button" type="submit">افزودن</button></form><div id="language-book-list" class="pass3-language-book-list"></div></section><section class="elara-card pass3-language-block pass3-language-report"><header><h2>${icon('chart')} گزارش یادگیری</h2></header><div id="language-reports"></div><p class="muted">گزارش از داده‌های واقعی همین حساب در این مرورگر تهیه می‌شود.</p></section><section class="elara-card pass3-language-block pass3-language-courses"><header><h2>${icon('course')} کلاس‌های آنلاین / کورس‌ها</h2></header><div class="pass3-coming-soon"><span>${icon('course')}</span><div><strong>کلاس‌ها در راه‌اند</strong><p class="muted">اتصال دوره‌ها و کلاس‌های واقعی هنوز Backend ندارد؛ رکورد ساختگی نمایش داده نمی‌شود.</p></div></div></section></div>`;
 main.prepend(panel);
 const words=$('panel-words');if(words)words.classList.add('approved-leitner-full-page');
 renderLanguage();
}
function booksKey(){return `elara_language_books_v1_${uid()}`}
function readBooks(){try{return safeList(JSON.parse(localStorage.getItem(booksKey())||'[]'))}catch{return[]}}
function renderLanguage(){
 if(!$('language-stat-row'))return;
 const state=data(),words=safeList(state.words),books=readBooks(),reading=books.filter(x=>x.shelf==='reading'),finished=books.filter(x=>x.shelf==='finished');
 $('language-stat-row').innerHTML=`<div>${icon('brain')}<strong>${words.length.toLocaleString('fa-IR')}</strong><small>واژه‌ها</small></div><div>${icon('book')}<strong>${reading.length.toLocaleString('fa-IR')}</strong><small>در حال مطالعه</small></div><div>${icon('check')}<strong>${finished.length.toLocaleString('fa-IR')}</strong><small>خوانده‌شده</small></div>`;
 $('language-book-list').innerHTML=books.length?books.map(b=>`<article class="pass3-language-book ${b.shelf==='finished'?'is-finished':'is-reading'}"><span class="pass3-book-cover">${icon('book')}</span><div class="pass3-book-copy"><strong>${esc(b.title)}</strong><small>${b.shelf==='finished'?'خوانده‌شده':'در حال مطالعه'}</small>${b.shelf==='finished'?'<span class="elara-track"><i style="width:100%"></i></span>':'<span class="pass3-book-status">پیشرفت عددی ثبت نشده</span>'}</div><div class="pass3-book-actions"><button class="quiet-button" type="button" data-language-book-toggle="${esc(b.id)}">${b.shelf==='finished'?'بازگردانی به مطالعه':'پایان مطالعه'}</button><button class="quiet-button" type="button" data-language-book-delete="${esc(b.id)}" aria-label="حذف کتاب ${esc(b.title)}">×</button></div></article>`).join(''):'<p class="empty-note">هنوز کتاب زبانی ثبت نکردی؛ اولین کتابت را اضافه کن.</p>';
 $('language-reports').innerHTML=`<div class="lang-stat-row"><div><strong>${words.length.toLocaleString('fa-IR')}</strong><small>واژهٔ ثبت‌شده</small></div><div><strong>${books.length.toLocaleString('fa-IR')}</strong><small>کل کتاب‌ها</small></div><div><strong>${finished.length.toLocaleString('fa-IR')}</strong><small>کتاب تمام‌شده</small></div></div><div id="pass3-language-chart" class="pass3-language-chart" aria-label="نمودار گزارش یادگیری"></div>`;
 window.dispatchEvent(new Event('elara:language-rendered'));
}
function refreshHome(){
 const stats=$('elara-stats');if(stats){const values=['flame','tasks','book3d','goals','spark'];[...stats.children].forEach((card,i)=>{const first=card.firstElementChild;if(first){first.className='elara-visual-icon';first.innerHTML=icon(values[i])}})}
 const headers=[['elara-home-tasks','tasks'],['elara-home-focus','focus'],['elara-home-habits','habits'],['elara-home-goals','goals'],['elara-home-missions','missions'],['elara-home-activity','activity'],['elara-home-social','friends'],['elara-home-ranks','ranking']];
 for(const [id,name] of headers){const h=$(id)?.closest('.elara-card')?.querySelector('header h2');if(h&&!h.querySelector('.elara-icon'))h.insertAdjacentHTML('afterbegin',icon(name)+' ')}
 const ranks=$('elara-home-ranks');if(ranks&&!ranks.children.length){ranks.innerHTML='<p class="muted">رنکینگ واقعی خودت و دوستانت در بخش رنکینگ دیده می‌شود.</p><button type="button" class="quiet-button" data-elara-tab="ranking">دیدن رنکینگ</button>'}
 const social=$('elara-home-social');if(social&&!social.children.length){social.innerHTML='<p class="muted">با دوستانت مسیر را جذاب‌تر کن.</p><button type="button" class="quiet-button" data-elara-tab="social">دیدن دوستان</button>'}
}
function wardrobeWindow(){
 if(windowRoot)return;windowRoot=document.createElement('div');windowRoot.className='approved-wardrobe';windowRoot.hidden=true;
 windowRoot.innerHTML=`<button type="button" class="approved-wardrobe-scrim" data-close-wardrobe aria-label="بستن کمد"></button><section class="approved-wardrobe-window" role="dialog" aria-modal="true" aria-labelledby="wardrobe-title" tabindex="-1"><header><div><h2 id="wardrobe-title">${icon('wardrobe')} کمد فضایی من</h2><p class="muted">آیتم قفل‌شده را می‌توانی ببینی و Preview کنی، اما تا رسیدن به سطح لازم قابل Equip نیست.</p></div><button class="quiet-button" type="button" data-close-wardrobe>×</button></header><div id="wardrobe-main"></div></section>`;document.body.append(windowRoot)
}
function item(category,id,label,src,required,chosen){
 const locked=level()<required,media=category==='banner'?`<span class="wardrobe-banner" style="background-image:url('${src}')"></span>`:`<span class="wardrobe-item-media"><span class="wardrobe-media-fallback">${icon(category==='frame'?'ranking':'user')}</span><img data-profile-asset loading="lazy" src="${src}" alt="${esc(label)}"></span>`;
 return `<button type="button" class="wardrobe-item ${locked?'is-locked':''}" data-wardrobe-item="${category}" data-wardrobe-id="${esc(id)}" data-required="${required}" aria-disabled="${locked}" aria-pressed="${chosen}" title="${locked?'نیازمند سطح '+required+' · Preview مجاز است':'انتخاب '+label}">${media}<small>${esc(label)} · سطح ${required}</small>${locked?`<span class="wardrobe-lock-mark">${icon('lock')}<em>قفل</em></span>`:''}</button>`
}
function previewView(){
 const system=profileSystem(),person=window.ElaraSocial?.me||window.ElaraAccount?.profile||{},base=system?.viewModel?.(person,{self:true});if(!base)return null;
 const view={...base};if(!selectedPreview)return view;
 if(selectedPreview.kind==='avatar'){view.avatarSrc=system.avatarPath(selectedPreview.group,selectedPreview.level);view.avatarGroup=selectedPreview.group;view.avatarLevel=selectedPreview.level}
 if(selectedPreview.kind==='frame'){const f=system.frameBy(selectedPreview.id);view.frame=f?.id||null;view.frameSrc=f?.path||'';view.frameLabel=f?.label||view.frameLabel}
 if(selectedPreview.kind==='banner'){const b=system.bannerBy(selectedPreview.id);view.banner=b?.id||null;view.bannerSrc=b?.path||view.bannerSrc;view.bannerLabel=b?.label||view.bannerLabel}
 return view
}
function drawWardrobe(){
 const host=$('wardrobe-main'),system=profileSystem();if(!host||!system)return;const p=wardrobe(),group=p.avatarGroup,curLvl=level(),view=previewView(),previewLabel=selectedPreview?.label||'ترکیب فعلی';
 const avatars=group?Array.from({length:showAll.avatar?10:4},(_,i)=>{const n=i+1;return item('avatar',group+':'+n,'آواتار '+n,system.avatarPath(group,n),n,group===p.avatarGroup&&n===p.avatarLevel)}).join(''):'';
 const frameItems=frames().slice(0,showAll.frame?4:3).map(f=>item('frame',f.id,f.label,f.path,f.required,p.frame===f.id)).join('');
 const bannerItems=bannerList().slice(0,showAll.banner?bannerList().length:2).map(b=>item('banner',b.id,b.label,b.path,b.required,p.banner===b.id)).join('');
 host.innerHTML=`<section class="pass4-wardrobe-preview" style="--wardrobe-preview-banner:url('${view?.bannerSrc||'assets/banner-moon.svg'}')"><div class="pass4-wardrobe-preview-copy"><span class="eyebrow">PREVIEW</span><strong>${esc(previewLabel)}</strong><small>Level ${curLvl} · ${esc(system.titleForLevel(curLvl))}</small>${selectedPreview?.locked?'<em>فقط Preview؛ این آیتم هنوز قابل Equip نیست.</em>':''}</div>${view?system.composition(view):''}</section><section class="wardrobe-section"><header><div><h3>${icon('user')} آواتار</h3><small>انتخاب گروه باید صریح باشد؛ هیچ گروهی حدس زده نمی‌شود.</small></div></header><div class="pass4-avatar-groups"><button class="quiet-button" type="button" data-wardrobe-group="female" aria-pressed="${group==='female'}">آواتارهای زنانه</button><button class="quiet-button" type="button" data-wardrobe-group="male" aria-pressed="${group==='male'}">آواتارهای مردانه</button></div>${group?`<div class="wardrobe-grid">${avatars}</div>${!showAll.avatar?'<button type="button" class="quiet-button" data-wardrobe-more="avatar">نمایش بیشتر</button>':''}`:'<div class="pass4-neutral-avatar">برای دیدن آواتارها ابتدا یکی از دو گروه را خودت انتخاب کن. هیچ انتخابی از نام، عکس یا اطلاعات Wellness استنباط نمی‌شود.</div>'}<p class="muted pass4-storage-note">آپلود عکس شخصی Level 3 هنوز پیاده‌سازی نشده و به Firebase Storage و Rules امن و تست‌شده نیاز دارد.</p></section><section class="wardrobe-section"><header><div><h3>${icon('ranking')} فریم‌ها</h3><small>Bronze: 1–3 · Silver: 4–6 · Gold: 7–9 · Diamond: 10</small></div></header><div class="wardrobe-grid">${frameItems}</div>${!showAll.frame?'<button type="button" class="quiet-button" data-wardrobe-more="frame">نمایش بیشتر</button>':''}</section><section class="wardrobe-section"><header><div><h3>${icon('home')} بنر پروفایل</h3><small>بنرهای محلی فعلی تا ورود Assetهای نهایی استفاده می‌شوند.</small></div></header><div class="wardrobe-grid">${bannerItems}</div>${!showAll.banner?'<button type="button" class="quiet-button" data-wardrobe-more="banner">نمایش بیشتر</button>':''}</section>`;
}
function showWardrobe(){wardrobeWindow();selectedPreview=null;showAll={avatar:false,frame:false,banner:false};drawWardrobe();windowRoot.hidden=false;windowRoot.querySelector('.approved-wardrobe-window')?.focus({preventScroll:true})}
function closeWardrobe(){if(windowRoot)windowRoot.hidden=true;selectedPreview=null}
window.ElaraWardrobeUI={open:showWardrobe,close:closeWardrobe,draw:drawWardrobe};
function inlineCreate(button){
 const kind=button.dataset.phase2Create,targetId=button.dataset.phase2Target,select=$(targetId);if(!['folder','tag'].includes(kind)||!select)return;
 let host=button.parentElement.querySelector('.phase2-inline-creator');if(host){host.remove();return}
 host=document.createElement('div');host.className='phase2-inline-creator';host.innerHTML=`<input maxlength="60" placeholder="نام ${kind==='folder'?'پوشه':'برچسب'}" aria-label="نام جدید" required><button type="button" class="primary-button" data-inline-save>افزودن</button><button type="button" class="quiet-button" data-inline-cancel>لغو</button><span class="muted" role="status"></span>`;
 button.insertAdjacentElement('afterend',host);host.querySelector('input').focus();
 const save=()=>{const value=host.querySelector('input').value.trim(),key=kind==='folder'?'folders':'tags';if(!value){host.querySelector('[role=status]').textContent='نام را بنویس.';return}const state=data();state[key]=safeList(state[key]);const match=state[key].find(n=>n.toLocaleLowerCase()===value.toLocaleLowerCase());const name=match||value.slice(0,60);if(!match){state[key].push(name);localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:state}));window.dispatchEvent(new Event('elara:data-changed'))}if(![...select.options].some(o=>o.value===name))select.add(new Option(name,name));select.value=name;host.remove();};
 host.querySelector('[data-inline-save]').addEventListener('click',save);host.querySelector('[data-inline-cancel]').addEventListener('click',()=>host.remove());host.querySelector('input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save()}if(e.key==='Escape')host.remove()});
}
function wire(){
 window.addEventListener('click',e=>{const create=e.target.closest('[data-phase2-create]');if(create){e.preventDefault();e.stopImmediatePropagation();inlineCreate(create)}},true);
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-approved-wardrobe]')){showWardrobe();return}
  if(event.target.closest('[data-close-wardrobe]')){closeWardrobe();return}
  if(event.target.closest('[data-lang-leitner]')){window.ElaraOpen?.('words');return}
  const group=event.target.closest('[data-wardrobe-group]');if(group){storeWardrobe({avatarGroup:group.dataset.wardrobeGroup});selectedPreview=null;drawWardrobe();return}
  const more=event.target.closest('[data-wardrobe-more]');if(more){showAll[more.dataset.wardrobeMore]=true;drawWardrobe();return}
  const itemButton=event.target.closest('[data-wardrobe-item]');if(itemButton){const system=profileSystem(),kind=itemButton.dataset.wardrobeItem,id=itemButton.dataset.wardrobeId,required=Number(itemButton.dataset.required||0),locked=level()<required;let preview={kind,id,label:itemButton.querySelector('small')?.textContent||id,locked};if(kind==='avatar'){const parts=id.split(':');preview={...preview,group:parts[0],level:Number(parts[1])};if(!locked&&system.canEquipAvatar(parts[0],Number(parts[1]),level()))storeWardrobe({avatarGroup:parts[0],avatarLevel:Number(parts[1])})}else if(kind==='frame'){if(!locked&&system.canEquipFrame(id,level()))storeWardrobe({frame:id})}else if(kind==='banner'){if(!locked&&system.canEquipBanner(id,level()))storeWardrobe({banner:id})}selectedPreview=preview;drawWardrobe();return}
  const toggle=event.target.closest('[data-language-book-toggle]'),del=event.target.closest('[data-language-book-delete]');if(toggle||del){const id=toggle?.dataset.languageBookToggle||del.dataset.languageBookDelete;let books=readBooks();books=del?books.filter(b=>b.id!==id):books.map(b=>b.id===id?{...b,shelf:b.shelf==='finished'?'reading':'finished'}:b);localStorage.setItem(booksKey(),JSON.stringify(books));renderLanguage()}
 },false);
 document.addEventListener('submit',e=>{if(e.target.id!=='language-book-form')return;e.preventDefault();const form=e.target,title=form.elements.title.value.trim();if(!title)return;const books=readBooks();books.push({id:crypto.randomUUID?.()||String(Date.now()),title:title.slice(0,180),shelf:form.elements.shelf.value});localStorage.setItem(booksKey(),JSON.stringify(books));form.reset();renderLanguage()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&windowRoot&&!windowRoot.hidden)closeWardrobe()});
 window.addEventListener('elara:open',e=>{if(e.detail?.tab==='language')renderLanguage();if(e.detail?.tab==='home')refreshHome()});
 for(const name of ['elara:data-changed','elara:hydrate','elara:social-updated','elara:account-ready','elara:wardrobe-changed'])window.addEventListener(name,()=>{renderLanguage();refreshHome()});
 language();refreshHome();
 if(location.hash==='#words')window.ElaraOpen?.('words',{history:'replace'})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();