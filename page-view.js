(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const num=n=>Number(n||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');
let officialPages=[],officialLoading=false;
const officialLocale=()=>document.documentElement.lang==='en'?'en':'fa';
async function loadOfficialPages(){
 if(officialLoading||!window.ElaraPublicContent?.listSitePages)return;
 officialLoading=true;
 try{officialPages=await window.ElaraPublicContent.listSitePages();render()}
 catch(error){console.error('Elara official pages:',error)}
 finally{officialLoading=false}
}
async function openOfficialPage(id){
 const row=officialPages.find(x=>x.id===id);if(!row)return;
 const article=document.createElement('article');article.className='page-official-detail';article.dataset.elaraI18n='off';
 const paragraphs=String(row.body||'').split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean);
 article.innerHTML='<header><small>ELARA · OFFICIAL</small><h2>'+esc(row.title||row.slug||row.id)+'</h2><p>'+esc(row.excerpt||'')+'</p></header><div>'+paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>';
 await window.ElaraDialog.open({title:t('صفحهٔ رسمی الارا','Official Elara page'),content:article,wide:true,actions:[{label:t('بستن','Close'),value:false}]});
}

function ago(ms){const d=Math.max(0,Date.now()-(Number(ms)||Date.now())),m=Math.floor(d/60000);if(m<1)return t('الان','now');if(m<60)return num(m)+' '+t('دقیقه پیش','min ago');const h=Math.floor(m/60);if(h<24)return num(h)+' '+t('ساعت پیش','h ago');return num(Math.floor(h/24))+' '+t('روز پیش','d ago')}
function avatar(p){const model=window.ElaraProfileSystem?.viewModel?.(p,{self:p?.uid===window.ElaraAccount?.user?.uid});const src=model?.avatarSrc;return src?'<img src="'+esc(src)+'" alt="">':'<span>'+esc((p?.name||p?.username||'?').slice(0,1))+'</span>'}
function vis(v){return v==='private'?t('خصوصی','Private'):v==='public'?t('عمومی','Public'):t('دوستان','Friends')}
function mediaMarkup(row,kind='post'){return row?.mediaUrl?'<figure class="page-media page-'+kind+'-media"><img src="'+esc(row.mediaUrl)+'" alt=""></figure>':''}
function engage(id){return id?'<div class="social-engagement-bar page-engagement" data-engagement-kind="post" data-engagement-id="'+esc(id)+'"><button type="button" data-engagement-like aria-pressed="false"><span data-engagement-heart>♡</span><span data-engagement-like-count>0</span></button><button type="button" data-engagement-comment>💬 <span data-engagement-comment-count>0</span></button></div>':''}
function postActions(p,uid){
 if(p.uid===uid)return '<div class="page-post-actions"><button type="button" data-page-edit-post="'+esc(p.id)+'">'+t('ویرایش','Edit')+'</button><button type="button" class="danger" data-page-delete-post="'+esc(p.id)+'">'+t('حذف','Delete')+'</button></div>';
 return '<div class="page-post-actions"><button type="button" data-page-report-post="'+esc(p.id)+'">'+t('گزارش','Report')+'</button><button type="button" class="danger-outline" data-page-block-post="'+esc(p.id)+'">'+t('مسدود','Block')+'</button></div>'
}
function reasonOptions(){return [['spam',t('اسپم','Spam')],['harassment',t('آزار و اذیت','Harassment')],['hate',t('نفرت‌پراکنی','Hate')],['sexual',t('محتوای جنسی','Sexual content')],['violence',t('خشونت','Violence')],['privacy',t('نقض حریم خصوصی','Privacy')],['other',t('سایر','Other')]].map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')}
async function editPost(row){
 const form=document.createElement('form');form.className='page-edit-form';form.innerHTML='<label>'+t('متن پست','Post text')+'<textarea name="text" maxlength="4000" data-elara-ugc dir="auto" required>'+esc(row.text||'')+'</textarea></label><label>'+t('نمایش','Visibility')+'<select name="visibility"><option value="friends" '+(row.visibility==='friends'?'selected':'')+'>'+t('دوستان','Friends')+'</option><option value="public" '+(row.visibility==='public'?'selected':'')+'>'+t('عمومی','Public')+'</option><option value="private" '+(row.visibility==='private'?'selected':'')+'>'+t('خصوصی','Private')+'</option></select></label>';
 const ok=await window.ElaraDialog.open({title:t('ویرایش پست','Edit post'),content:form,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('ذخیره تغییرات','Save changes'),value:true,kind:'primary'}]});if(ok!==true)return;
 await window.ElaraPage?.editPost?.(row.id,form.elements.text.value,form.elements.visibility.value)
}
async function report(kind,row){
 const form=document.createElement('form');form.className='page-report-form';form.innerHTML='<label>'+t('دلیل گزارش','Report reason')+'<select name="reason">'+reasonOptions()+'</select></label><label>'+t('توضیح اختیاری','Optional details')+'<textarea name="detail" maxlength="500" data-elara-ugc dir="auto" placeholder="'+t('اگر لازم است توضیح کوتاهی بنویس…','Add a short note if needed…')+'"></textarea></label><p class="muted">'+t('گزارش برای بررسی ثبت می‌شود و به صاحب محتوا نمایش داده نمی‌شود.','Your report is private and is not shown to the content owner.')+'</p>';
 const ok=await window.ElaraDialog.open({title:t('گزارش محتوا','Report content'),content:form,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('ثبت گزارش','Submit report'),value:true,kind:'danger'}]});if(ok!==true)return;
 const result=await window.ElaraPage?.reportContent?.(kind,row.id,form.elements.reason.value,form.elements.detail.value);
 await window.ElaraDialog.alert(result==='existing'?t('این محتوا را قبلاً گزارش کرده‌ای.','You already reported this content.'):t('گزارش ثبت شد. ممنون که کمک می‌کنی فضا سالم بماند.','Report submitted. Thanks for helping keep the space safe.'),{title:t('گزارش','Report')})
}
async function block(row){
 if(!row?.uid)return;const ok=await window.ElaraDialog.confirm(t('این کاربر مسدود شود؟ دوستی و دسترسی اجتماعی بین شما قطع می‌شود.','Block this user? Your friendship and social access will be removed.'),{title:t('مسدودکردن کاربر','Block user'),danger:true,confirmText:t('مسدودکردن','Block')});if(!ok)return;
 await window.ElaraSocial?.blockUser?.(row.uid,row.person||{});await window.ElaraPage?.refresh?.();render()
}
function injectFriendsCta(){const head=document.querySelector('#elara-social-page .social-page-head');if(!head||head.querySelector('[data-elara-page-cta]'))return;const b=document.createElement('button');b.type='button';b.className='quiet-button social-page-cta';b.dataset.elaraPageCta='';b.dataset.elaraTab='page';b.textContent=t('پیج و استاتوس','Page & Status');head.append(b)}

/* Release 1 uses canonical Social/Profile models; no sample users or secondary persistence. */
function ensurePageFidelityStyle(){
 if(document.getElementById('elara-page-fidelity-r3'))return;
 const link=document.createElement('link');link.id='elara-page-fidelity-r2';link.rel='stylesheet';link.href='page-fidelity-release2.css?v=20261012-r2';
 document.head.append(link)
 const previous=document.getElementById('elara-page-fidelity-r1');
 if(!previous){const old=document.createElement('link');old.id='elara-page-fidelity-r1';old.rel='stylesheet';old.href='page-fidelity-release1.css?v=20261012-r1';document.head.insertBefore(old,link)}
 const next=document.createElement('link');next.id='elara-page-fidelity-r3';next.rel='stylesheet';next.href='page-fidelity-release3.css?v=20261012-r3';document.head.append(next)
}
function pageAccount(uid){
 const profile=window.ElaraAccount?.profile||{},social=window.ElaraSocial?.me||{};
 return {...social,...profile,name:(profile.name&&profile.name!=='Elara'?profile.name:social.name)||window.ElaraAccount?.user?.displayName||'',uid:uid||profile.uid||social.uid||''}
}

/* Page-only cosmetics. These are intentionally UID-local until Page Storage is available.
   Never silently write to the private Profile editor or to a shared Firestore document. */
const PAGE_ART=[
 ['default','assets/ui/38-my-page-hero-banner.webp','نمای اصلی پیج'],
 ['moon','assets/ui/banner_moon_lake.webp','دریاچهٔ ماه'],
 ['dream','assets/ui/banner_dream_tree.webp','درخت رؤیا'],
 ['castle','assets/ui/banner_city_of_stars.webp','شهر ستاره‌ها'],
 ['dawn','assets/ui/banner_new_dawn.webp','سپیدهٔ نو']
];
const pageKey=uid=>'elara_social_page_settings_v1_'+String(uid);
function pageSettings(uid){
 if(!uid)return {name:'',bio:'',cover:'default'};
 try{
  const p=JSON.parse(localStorage.getItem(pageKey(uid))||'{}');
  return {name:typeof p.name==='string'?p.name.trim().slice(0,60):'',
    bio:typeof p.bio==='string'?p.bio.trim().slice(0,320):'',
    cover:PAGE_ART.some(([id])=>id===p.cover)?p.cover:'default'};
 }catch{return {name:'',bio:'',cover:'default'}}
}
function pageCover(uid){
 const cover=pageSettings(uid).cover;
 return PAGE_ART.find(([id])=>id===cover)?.[1]||PAGE_ART[0][1]
}
async function openPageSettings(){
 const uid=window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid;
 if(!uid||!window.ElaraAccount?.user){await window.ElaraDialog?.alert?.(t('برای ویرایش صفحه ابتدا وارد حساب شو.','Sign in to edit your Page.'));return}
 const person=pageAccount(uid),p=pageSettings(uid);
 const form=document.createElement('form');
 form.className='page-settings-form';form.dataset.elaraI18n='off';
 form.innerHTML='<p class="page-settings-intro">'+t('تنظیمات صفحه اجتماعی تو — جدا از تنظیمات پروفایل شخصی.','Social Page settings — separate from private Profile settings.')+'</p>'+
  '<label>'+t('نام نمایشی صفحه','Page display name')+'<input type="text" name="name" maxlength="60" placeholder="'+esc(person.name||t('نام صفحه','Page name'))+'" value="'+esc(p.name)+'" autocomplete="off" dir="auto"></label>'+
  '<label>'+t('معرفی صفحه','Page bio')+'<textarea name="bio" rows="3" maxlength="320" data-elara-ugc dir="auto" placeholder="'+t('درباره صفحه‌ات بنویس…','Describe your Page…')+'">'+esc(p.bio)+'</textarea></label>'+
  '<fieldset><legend>'+t('تصویر کاور صفحه','Page cover artwork')+'</legend><div class="page-settings-covers">'+PAGE_ART.map(([id,url,label])=>'<label class="page-settings-cover"><input type="radio" name="cover" value="'+id+'" '+(p.cover===id?'checked':'')+'><img src="'+url+'" alt="" loading="lazy"><span>'+label+'</span></label>').join('')+'</div></fieldset>'+
  '<p class="page-settings-storage">'+t('نام، معرفی و کاور این صفحه فعلاً فقط روی همین دستگاه و همین حساب ذخیره می‌شوند و به سایر کاربران یا دستگاه‌ها همگام‌سازی نمی‌شوند. آواتار و XP از حساب واقعی گرفته می‌شوند.','These Page settings are stored only on this device for this account; they are not shared or synced. Avatar and XP come from your real account.')+'</p>';
 const result=await window.ElaraDialog.open({title:t('تنظیمات صفحه من','My Page settings'),content:form,wide:true,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('ذخیره صفحه','Save Page'),value:true,kind:'primary'}]});
 if(result!==true)return;
 if(uid!==(window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid))return void window.ElaraDialog.alert(t('حساب تغییر کرد؛ تنظیمات ذخیره نشد.','Account changed; nothing was saved.'));
 const name=String(form.elements.name.value||'').trim().slice(0,60);
 const bio=String(form.elements.bio.value||'').trim().slice(0,320);
 const cover=PAGE_ART.some(([id])=>id===form.elements.cover.value)?form.elements.cover.value:'default';
 try{localStorage.setItem(pageKey(uid),JSON.stringify({name,bio,cover}));render()}
 catch(error){await window.ElaraDialog.alert(t('فضای ذخیره مرورگر کافی نیست.','Browser storage is unavailable.'),{title:t('خطای ذخیره','Save error')})}
}
let pageContentTab='all',pageStoryExpanded=false;
function pageTab(root,tab='all'){
 pageContentTab=['all','posts','statuses'].includes(tab)?tab:'all';
 root.querySelectorAll('[data-page-content]').forEach(b=>{const active=b.dataset.pageContent===pageContentTab;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 const stories=root.querySelector('.page-stories'),feed=root.querySelector('.page-feed'),compose=root.querySelector('.page-compose-grid');
 if(stories)stories.hidden=pageContentTab==='posts';
 if(feed)feed.hidden=pageContentTab==='statuses';
 if(compose){
  const post=compose.querySelector('[data-page-post-form]'),status=compose.querySelector('[data-page-story-form]');
  if(post)post.hidden=pageContentTab==='statuses';
  if(status)status.hidden=pageContentTab==='posts'||!pageStoryExpanded;
 }
}


/* R3 sidebar derives only from content the current user can already access.
   Private book clips stay on the owner's device, visible only on their own page. */
function pageLibraryClips(uid){
 if(!uid||uid!==window.ElaraAccount?.user?.uid)return [];
 try{
  const raw=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');
  const books=Array.isArray(raw.books)?raw.books:[],clips=Array.isArray(raw.bookClips)?raw.bookClips:[];
  return clips.filter(x=>x&&String(x.text||'').trim()).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,3).map(c=>{
   const book=books.find(b=>String(b.id)===String(c.bookId));
   return {text:String(c.text).slice(0,210),title:String(book?.title||t('بریده شخصی','Personal clip')).slice(0,85),
     author:String(book?.author||'').slice(0,72),page:c.page!=null?String(c.page).slice(0,8):''}
  })
 }catch{return []}
}
function pageRecentTags(state){
 const threshold=Date.now()-86400000,counts=new Map();
 for(const post of state.posts||[]){
  const stamp=Number(post.createdMs)||0;if(!stamp||stamp<threshold||stamp>Date.now()+60000)continue;
  const tags=new Set([...String(post.text||'').matchAll(/#([\p{L}\p{N}_]{2,32})/gu)].map(m=>m[1].toLocaleLowerCase()));
  for(const tag of tags)counts.set(tag,(counts.get(tag)||0)+1)
 }
 return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5)
}
function pageSidebar(state,uid){
 const bookRows=pageLibraryClips(uid),tags=pageRecentTags(state);
 const clips=bookRows.map(row=>'<article class="page-side-clip"><img src="assets/ui/icon-library-open-book.webp" alt="" loading="lazy"><div><p data-elara-ugc dir="auto">«'+esc(row.text)+'»</p><small data-elara-ugc dir="auto">'+esc(row.title)+(row.page?' · '+t('صفحه','Page')+' '+esc(row.page):'')+'</small>'+(row.author?'<small data-elara-ugc dir="auto">'+esc(row.author)+'</small>':'')+'</div></article>').join('');
 const topics=tags.map(([tag,count])=>'<li><span class="page-topic-hash" dir="auto">#'+esc(tag)+'</span><small>'+num(count)+' '+t('پست در فید','posts in your feed')+'</small></li>').join('');
 const empty=(fa,en)=>'<p class="page-side-empty">'+t(fa,en)+'</p>';
 return '<aside class="page-social-aside" aria-label="'+t('اطلاعات کناری صفحه','Page sidebar')+'">'+
  '<section class="page-side-card page-side-books"><header><h2>📖 '+t('بریده‌های کتاب من','My book clips')+'</h2><button type="button" data-page-library-open>'+t('مشاهده همه','View all')+' ←</button></header><div class="page-side-body">'+
   (clips||empty('هنوز بریده‌ای در کتابخانه این دستگاه ثبت نشده است.','No book clips saved on this device yet.'))+
   '</div><footer>'+t('این بریده‌ها خصوصی و مخصوص همین دستگاه‌اند.','Private clips on this device only.')+'</footer></section>'+
  '<section class="page-side-card page-side-topics"><header><h2>🔥 '+t('موضوعات امروز فید','Today’s feed topics')+'</h2></header><div class="page-side-body">'+(topics?'<ol class="page-topic-list">'+topics+'</ol>':empty('هنوز هشتگ معتبری در پست‌های ۲۴ ساعت اخیر فید تو نیست.','No hashtags in visible posts from the past 24 hours.'))+'</div><footer>'+t('فقط از پست‌هایی که مجاز به دیدنشان هستی.','Based only on posts you can view.')+'</footer></section>'+
  '<section class="page-side-card page-side-friends"><header><h2>✨ '+t('پیدا کردن دوستان','Find friends')+'</h2><button type="button" data-page-friends-open>'+t('مشاهده همه','Open')+' ←</button></header><div class="page-side-body">'+
   empty('پیشنهاد خودکار کاربران فعال نیست؛ در بخش دوستان می‌توانی با نام کاربری دقیق افراد را پیدا کنی.','Automatic people suggestions are unavailable. Find people by their exact username in Friends.')+
   '<button type="button" class="page-find-friends" data-page-friends-open>'+t('جست‌وجوی دوست','Find a friend')+' ↗</button></div></section>'+
 '</aside>'
}
function enhancePageR3(root,state,uid,viewingOther){
 const compose=root.querySelector('.page-compose-grid'),feed=root.querySelector('.page-feed');
 if(!feed)return;
 if(!viewingOther&&compose){
  const post=compose.querySelector('[data-page-post-form]'),status=compose.querySelector('[data-page-story-form]');
  const person=pageAccount(uid);
  if(post){
   post.classList.add('page-composer-post','is-collapsed');
   const lead=document.createElement('div');lead.className='page-composer-lead';
   lead.innerHTML='<span class="page-composer-avatar">'+avatar(person)+'</span><button type="button" data-page-write-post class="page-composer-write">'+t('امروز چه در ذهن تو می‌گذرد؟','What’s on your mind today?')+'</button>';
   post.insertBefore(lead,post.querySelector('textarea'));
   const h=post.querySelector('h2');if(h)h.textContent=t('نوشتن پست','Write a post');
   const area=post.querySelector('textarea');if(area)area.placeholder=t('امروز چه در ذهن تو می‌گذرد؟','What’s on your mind today?');
   const controls=post.querySelector('.page-media-picker');
   if(controls)controls.insertAdjacentHTML('afterbegin','<div class="page-composer-extras"><button type="button" disabled title="'+t('آپلود عکس هنوز فعال نیست','Image uploading is unavailable')+'">▧ '+t('تصویر (به‌زودی)','Image (soon)')+'</button><button type="button" data-page-add-story>☺ '+t('وضعیت','Status')+'</button></div>');
  }
  if(status){
   status.classList.add('page-composer-status');
   status.hidden=!pageStoryExpanded||pageContentTab==='posts';
  }
  const actions=root.querySelector('.page-id-actions');
  if(actions)actions.insertAdjacentHTML('afterbegin','<button type="button" class="page-create-post" data-page-write-post>＋ '+t('نوشتن پست','Write post')+'</button>');
 }
 const grid=document.createElement('div');grid.className='page-social-grid';
 const content=document.createElement('div');content.className='page-social-main';
 if(compose)content.append(compose);
 const cards=[...feed.querySelectorAll(':scope > .page-post')];
 if(cards.length){
  const list=document.createElement('div');list.className='page-post-grid';
  cards.forEach(card=>list.append(card));feed.append(list)
 }
 content.append(feed);grid.append(content);
 if(!viewingOther)grid.insertAdjacentHTML('beforeend',pageSidebar(state,uid));
 root.append(grid);
 const tabs=root.querySelector('.page-content-tabs');
 if(tabs){
  tabs.insertAdjacentHTML('beforeend','<button type="button" data-page-jump="library-clips">❝ '+t('بریده کتاب','Book clips')+'</button><button type="button" data-page-jump="blog">▤ '+t('وبلاگ','Blog')+'</button>');
 }
 pageTab(root,pageContentTab)
}

function socialPageIdentity(state,uid,viewingOther,target){
 const person=viewingOther?target:pageAccount(uid);
 if(!person||!person.uid)return '';
 const identity=window.ElaraProfileSystem?.viewModel?.(person,{self:!viewingOther})||{};
 const saved=!viewingOther?pageSettings(uid):null;
 const name=String(saved?.name||person.name||person.displayName||person.username||identity.name||t('حساب من','My account'));
 const bio=person.profilePublic===false&&viewingOther?'':String(saved?.bio||person.bio||identity.bio||'');
 const hasXp=Number.isFinite(Number(person.xp))&&person.xp!==undefined&&person.xp!==null;
 const p=hasXp?window.ElaraLevels?.progress?.(Number(person.xp)||0):null;
 const progress=p&&Number.isFinite(Number(p.percent))?Math.max(0,Math.min(100,Number(p.percent))):null;
 const portrait=identity.avatarSrc?'<img src="'+esc(identity.avatarSrc)+'" alt="">':'<span>'+esc(identity.initial||name.slice(0,1))+'</span>';
 const frame=identity.frameSrc?'<img class="page-id-frame" src="'+esc(identity.frameSrc)+'" alt="">':'';
 const pagePosts=(state.posts||[]).filter(row=>row.uid===person.uid).length;
 const stats=state.loading||state.error?'':('<span><strong>'+num(pagePosts)+'</strong><small>'+t('پست‌های قابل‌نمایش','Visible posts')+'</small></span>')+(!viewingOther&&Array.isArray(window.ElaraSocial?.friends)?'<span><strong>'+num(window.ElaraSocial.friends.length)+'</strong><small>'+t('دوستان','Friends')+'</small></span>':'');
 return '<section class="page-id-shell" aria-label="'+t('اطلاعات صفحه','Page identity')+'">'+
  '<div class="page-id-avatar-wrap"><span class="page-id-ring">'+portrait+'</span>'+frame+
  (!viewingOther?'<button type="button" class="page-id-edit-avatar" data-page-edit-profile aria-label="'+t('تنظیمات صفحه من','Edit Page settings')+'">✎</button>':'')+'</div>'+
  '<div class="page-id-person"><div class="page-id-name-row"><h2 data-elara-ugc dir="auto">'+esc(name)+'</h2>'+(hasXp&&identity.title?'<span class="page-id-rank">'+esc(identity.title)+'</span>':'')+'</div>'+
  '<div class="page-id-meta">'+(person.username?'<span dir="ltr">@'+esc(person.username)+'</span>':'')+
  (hasXp?'<span>'+t('سطح','Level')+' '+num(identity.level||1)+'</span><span class="page-id-xp"><b>'+num(person.xp)+' XP</b>'+(progress!==null?'<span class="page-id-xp-track" aria-label="'+t('پیشرفت سطح','Level progress')+'"><i style="width:'+progress.toFixed(2)+'%"></i></span>':'')+'</span>':'')+'</div>'+
  (bio?'<p class="page-id-bio" data-elara-ugc dir="auto">'+esc(bio)+'</p>':!viewingOther?'<p class="page-id-bio is-empty">'+t('معرفی صفحه‌ات را از تنظیمات صفحه اضافه کن.','Add a Page bio in Page settings.')+'</p>':'')+'</div>'+
  '<div class="page-id-actions">'+(!viewingOther?'<button type="button" class="page-id-edit" data-page-edit-profile>✎ '+t('ویرایش صفحه','Edit Page')+'</button>':'')+
  (stats?'<div class="page-id-stats">'+stats+'</div>':'')+'</div></section>'
}
function enhancePageFidelity(root,state,uid,viewingOther,target){
 ensurePageFidelityStyle();
 const panel=document.getElementById('panel-page'),newHero=root.querySelector('.page-hero');
 if(panel&&newHero){
  let hero=[...panel.children].find(node=>node!==root&&node.matches?.('[data-elara-page-hero="page"],.page-hero'));
  if(hero&&hero!==newHero){hero.innerHTML=newHero.innerHTML;newHero.remove()}
  else{hero=newHero;panel.insertBefore(hero,root)}
  hero.classList.add('page-hero','elara-global-hero');
  hero.classList.toggle('is-target-page',viewingOther);
  hero.dataset.elaraPageHero='page';
  hero.classList.remove('elara-secondary-hero-duplicate');
  hero.removeAttribute('aria-hidden');
  const person=viewingOther?target:pageAccount(uid);
  const model=window.ElaraProfileSystem?.viewModel?.(person||{},{self:!viewingOther});
  const cover=!viewingOther&&uid?pageCover(uid):'';
  if(cover)hero.style.setProperty('--elara-page-cover','url("'+cover+'")');
  else hero.style.removeProperty('--elara-page-cover');
  const note=hero.querySelector('.page-hero-note');
  if(note)note.innerHTML=viewingOther?'':'<button type="button" class="page-cover-edit" data-page-edit-cover>✎ '+t('ویرایش کاور','Edit cover')+'</button>';
  window.ElaraGlobalBanners?.refresh?.();
 }
 // Back must remain clickable below the sticky app header and clear of the cover/avatar overlap.
 const backButton=panel?.querySelector(':scope > .page-hero [data-page-back-feed]');
 if(backButton)root.prepend(backButton);
 const identity=socialPageIdentity(state,uid,viewingOther,target);
 if(identity)root.insertAdjacentHTML('afterbegin',identity);
 const strip=root.querySelector('.page-story-strip');
 if(strip&&!viewingOther){
  strip.querySelector('.ref-empty')?.remove();
  strip.insertAdjacentHTML('afterbegin','<button type="button" class="page-story page-story-add" data-page-add-story aria-label="'+t('افزودن وضعیت','Add status')+'"><span class="page-story-ring"><span aria-hidden="true">+</span></span><strong>'+t('افزودن وضعیت','Add status')+'</strong></button>');
 }
 const stories=root.querySelector('.page-stories'),compose=root.querySelector('.page-compose-grid');
 if(stories&&compose)root.insertBefore(stories,compose);
 // Tabs operate on the genuine loaded status/post sections; no fabricated feeds.
 const tabs=document.createElement('nav');tabs.className='page-content-tabs';tabs.setAttribute('aria-label',t('بخش‌های صفحه','Page sections'));
 tabs.innerHTML=[['all',t('همه','All')],['posts',t('پست‌ها','Posts')],['statuses',t('وضعیت‌ها','Statuses')]].map(([id,label])=>'<button type="button" data-page-content="'+id+'" aria-pressed="false">'+label+'</button>').join('');
 root.insertBefore(tabs,compose||root.querySelector('.page-feed'));
 pageTab(root,pageContentTab)
}

function render(){
 const root=document.getElementById('elara-page-view');if(!root)return;root.dataset.elaraI18n='off';
 const api=window.ElaraPage,state=api?.state||{posts:[],stories:[],loading:false,error:'',targetUid:'',targetPerson:null},uid=window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid,target=state.targetUid?state.targetPerson:null,viewingOther=!!target&&target.uid!==uid,targetName=String(target?.name||target?.username||t('کاربر','User'));
 const stories=(state.stories||[]).map(s=>'<button type="button" class="page-story" data-page-story="'+esc(s.id)+'"><span class="page-story-ring">'+avatar(s.person)+'</span><strong data-elara-ugc dir="auto">'+esc(s.person?.name||s.person?.username||t('دوست','Friend'))+'</strong><small>'+ago(s.createdMs)+'</small></button>').join('');
 const posts=(state.posts||[]).map(p=>'<article class="page-post" data-page-post-id="'+esc(p.id)+'"><header><span class="page-post-avatar">'+avatar(p.person)+'</span><div><strong data-elara-ugc dir="auto">'+esc(p.person?.name||p.person?.username||t('دوست','Friend'))+'</strong><small>'+ago(p.createdMs)+' · '+vis(p.visibility)+'</small></div>'+postActions(p,uid)+'</header>'+mediaMarkup(p,'post')+(p.text?'<p data-elara-ugc dir="auto">'+esc(p.text)+'</p>':'')+engage(p.id)+'</article>').join('');
 const back=viewingOther?'<button type="button" class="quiet-button page-target-back" data-page-back-feed>← '+t('برگشت به پیج من','Back to my Page')+'</button>':'',heroTitle=viewingOther?t('پیج ','')+'<span data-elara-ugc dir="auto">'+esc(targetName)+'</span>':t('پیج من','My Page'),heroCopy=viewingOther?t('پست‌ها و استاتوس‌هایی که این کاربر با تو به اشتراک گذاشته.','Posts and statuses this person shares with you.'):t('جایی برای پست‌ها و استاتوس‌های تو و دوستات.','A space for your posts and your friends’ statuses.');
 const compose=viewingOther?'':'<section class="page-compose-grid"><form class="elara-card page-story-compose" data-page-story-form><h2><img class="page-story-art" src="assets/ui/12-stories-status-icon.webp" alt="" width="44" height="44" loading="lazy" decoding="async">'+t('استاتوس ۲۴ ساعته','24-hour status')+'</h2><textarea name="text" maxlength="1000" data-elara-ugc dir="auto" placeholder="'+t('الان چه حسی داری؟','What’s your vibe right now?')+'"></textarea><div class="page-media-picker"><span class="page-media-deferred" role="status">'+t('بخش تصاویر در فاز بعد فعال می‌شود','Images will be available in the next phase')+'</span><input type="file" name="media" accept="image/jpeg,image/png,image/webp" data-page-media-input disabled hidden><button type="button" class="page-media-remove hidden" data-page-media-remove>'+t('حذف تصویر','Remove image')+'</button><div data-page-media-preview></div></div><div><select name="visibility"><option value="friends">'+t('دوستان','Friends')+'</option><option value="public">'+t('عمومی','Public')+'</option><option value="private">'+t('خصوصی','Private')+'</option></select><button class="primary-button" type="submit">'+t('گذاشتن استاتوس','Post status')+'</button></div></form><form class="elara-card page-post-compose" data-page-post-form><h2>'+t('پست جدید','New post')+'</h2><textarea name="text" maxlength="4000" data-elara-ugc dir="auto" placeholder="'+t('چی می‌خوای با دوستات به اشتراک بذاری؟','What do you want to share?')+'"></textarea><div class="page-media-picker"><span class="page-media-deferred" role="status">'+t('بخش تصاویر در فاز بعد فعال می‌شود','Images will be available in the next phase')+'</span><input type="file" name="media" accept="image/jpeg,image/png,image/webp" data-page-media-input disabled hidden><button type="button" class="page-media-remove hidden" data-page-media-remove>'+t('حذف تصویر','Remove image')+'</button><div data-page-media-preview></div></div><div><select name="visibility"><option value="friends">'+t('دوستان','Friends')+'</option><option value="public">'+t('عمومی','Public')+'</option><option value="private">'+t('خصوصی','Private')+'</option></select><button class="primary-button" type="submit">'+t('انتشار پست','Publish post')+'</button></div></form></section>';
 const storyTitle=viewingOther?t('استاتوس‌های ','Statuses from ')+'<span data-elara-ugc dir="auto">'+esc(targetName)+'</span>':t('استاتوس‌ها','Statuses'),feedTitle=viewingOther?t('پست‌های ','Posts from ')+'<span data-elara-ugc dir="auto">'+esc(targetName)+'</span>':t('پست‌های من و دوستان','Posts from you & friends');
 root.innerHTML='<section class="page-hero '+(viewingOther?'is-target-page':'')+'"><div><small>ELARA · PAGE</small><h1>'+heroTitle+'</h1><p>'+heroCopy+'</p>'+back+'</div><div class="page-hero-note">'+(viewingOther?t('Privacy هر پست و استاتوس همچنان اعمال می‌شود.','Each post and status still follows its privacy setting.'):t('انتشار متن فعال است؛ بخش تصاویر در فاز بعد فعال می‌شود.','Text posts are available; images are coming in the next phase.'))+'</div></section>'+compose+'<section class="elara-card page-stories"><header><h2>'+storyTitle+'</h2><small>'+t('بعد از ۲۴ ساعت برای دیگران نمایش داده نمی‌شوند.','They disappear for others after 24 hours.')+'</small></header><div class="page-story-strip">'+(stories||'<p class="ref-empty">'+t('استاتوسی برای نمایش نیست.','No statuses to show.')+'</p>')+'</div></section><section class="page-feed"><header><h2>'+feedTitle+'</h2><button type="button" class="quiet-button" data-page-refresh>'+t('تازه‌سازی','Refresh')+'</button></header>'+(state.loading?'<p class="ref-empty">'+t('در حال بارگذاری…','Loading…')+'</p>':state.error?'<p class="ref-empty">'+esc(state.error)+'</p>':posts||'<p class="ref-empty">'+t('هنوز پستی نیست.','No posts yet.')+'</p>')+'</section>';
  enhancePageFidelity(root,state,uid,viewingOther,target);
  enhancePageR3(root,state,uid,viewingOther);
  if(!viewingOther){
    const pages=officialPages.filter(row=>(row.locale==='en'?'en':'fa')===officialLocale());
    if(pages.length){
      const section=document.createElement('section');section.className='elara-card page-official-content';section.dataset.elaraI18n='off';
      section.innerHTML='<header><div><small>ELARA · OFFICIAL</small><h2>'+t('صفحه‌های رسمی الارا','Official Elara pages')+'</h2></div><span>'+num(pages.length)+'</span></header><div class="page-official-grid">'+pages.map(row=>'<article><div><strong>'+esc(row.title||row.slug||row.id)+'</strong><p>'+esc(row.excerpt||'')+'</p></div><button type="button" class="quiet-button" data-official-page-open="'+esc(row.id)+'">'+t('باز کردن','Open')+'</button></article>').join('')+'</div>';
      root.append(section);
    }
  }
}
function clearMediaPreview(form){const url=form.dataset.mediaPreviewUrl;if(url)URL.revokeObjectURL(url);delete form.dataset.mediaPreviewUrl;form.elements.media.value='';form.querySelector('[data-page-media-preview]').innerHTML='';form.querySelector('[data-page-media-remove]').classList.add('hidden')}
async function submit(form,kind){const api=window.ElaraPage;if(!api)return;const button=form.querySelector('button[type=submit]'),file=form.elements.media?.files?.[0]||null;button.disabled=true;try{if(!String(form.elements.text.value||'').trim()&&!file)throw Error(t('متن یا تصویر اضافه کن.','Add text or an image.'));if(kind==='story')await api.createStory(form.elements.text.value,form.elements.visibility.value,file);else await api.createPost(form.elements.text.value,form.elements.visibility.value,file);clearMediaPreview(form);form.reset()}catch(error){await window.ElaraDialog?.alert?.(String(error?.message||error),{title:t('انتشار انجام نشد','Could not publish')})}finally{button.disabled=false;if(kind==='story')pageStoryExpanded=false;render()}}
document.addEventListener('change',e=>{if(!e.target.matches('[data-page-media-input]'))return;e.target.value='';return; // No media requests while Firebase Storage is unavailable.
const form=e.target.form,file=e.target.files?.[0];if(!form||!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>=5*1024*1024){e.target.value='';void window.ElaraDialog?.alert?.(t('فقط JPEG، PNG یا WebP کمتر از ۵ مگابایت مجاز است.','Use JPEG, PNG or WebP under 5 MB.'),{title:t('تصویر نامعتبر','Invalid image')});return}const prev=form.dataset.mediaPreviewUrl;if(prev)URL.revokeObjectURL(prev);const url=URL.createObjectURL(file);form.dataset.mediaPreviewUrl=url;form.querySelector('[data-page-media-preview]').innerHTML='<img src="'+esc(url)+'" alt="">';form.querySelector('[data-page-media-remove]').classList.remove('hidden')});
document.addEventListener('submit',e=>{if(e.target.matches('[data-page-story-form]')){e.preventDefault();void submit(e.target,'story')}else if(e.target.matches('[data-page-post-form]')){e.preventDefault();void submit(e.target,'post')}});
document.addEventListener('click',async e=>{
 const addStory=e.target.closest('[data-page-add-story]');
 if(addStory){pageStoryExpanded=true;pageContentTab='all';render();const field=document.querySelector('#panel-page [data-page-story-form] textarea');field?.closest('form')?.scrollIntoView({behavior:'smooth',block:'center'});field?.focus({preventScroll:true});return}
 const writePost=e.target.closest('[data-page-write-post]');
 if(writePost){const form=document.querySelector('#panel-page [data-page-post-form]');form?.classList.remove('is-collapsed');const field=form?.querySelector('textarea');field?.scrollIntoView({behavior:'smooth',block:'center'});field?.focus({preventScroll:true});return}
 const library=e.target.closest('[data-page-library-open],[data-page-jump="library-clips"]');
 if(library){window.ElaraOpen?.('library-clips');return}
 const blog=e.target.closest('[data-page-jump="blog"]');
 if(blog){window.ElaraOpen?.('blog');return}
 const friends=e.target.closest('[data-page-friends-open]');
 if(friends){window.ElaraOpen?.('social');return}
 const editProfile=e.target.closest('[data-page-edit-profile],[data-page-edit-cover]');
 if(editProfile){e.preventDefault();await openPageSettings();return}
 const tabButton=e.target.closest('[data-page-content]');
 if(tabButton){pageTab(document.getElementById('elara-page-view'),tabButton.dataset.pageContent);return}
 const official=e.target.closest('[data-official-page-open]');if(official){await openOfficialPage(official.dataset.officialPageOpen);return}
 if(e.target.closest('[data-page-refresh]')){await window.ElaraPage?.refresh?.();return}
 if(e.target.closest('[data-page-back-feed]')){await window.ElaraPage?.clearTarget?.();render();return}
 const removeMedia=e.target.closest('[data-page-media-remove]');if(removeMedia){clearMediaPreview(removeMedia.closest('form'));return}
 const del=e.target.closest('[data-page-delete-post]');if(del){if(await window.ElaraDialog.confirm(t('این پست حذف شود؟','Delete this post?'),{title:t('حذف پست','Delete post'),danger:true,confirmText:t('حذف','Delete')}))await window.ElaraPage?.deletePost?.(del.dataset.pageDeletePost);return}
 const edit=e.target.closest('[data-page-edit-post]');if(edit){const row=window.ElaraPage?.state?.posts?.find(x=>x.id===edit.dataset.pageEditPost);if(row)await editPost(row);return}
 const reportPost=e.target.closest('[data-page-report-post]');if(reportPost){const row=window.ElaraPage?.state?.posts?.find(x=>x.id===reportPost.dataset.pageReportPost);if(row)await report('post',row);return}
 const blockPost=e.target.closest('[data-page-block-post]');if(blockPost){const row=window.ElaraPage?.state?.posts?.find(x=>x.id===blockPost.dataset.pageBlockPost);if(row)await block(row);return}
 const story=e.target.closest('[data-page-story]');if(story){const row=window.ElaraPage?.state?.stories?.find(x=>x.id===story.dataset.pageStory);if(!row)return;const box=document.createElement('article');box.className='page-story-detail';box.dataset.elaraI18n='off';box.innerHTML='<span class="page-story-ring">'+avatar(row.person)+'</span><h3>'+esc(row.person?.name||t('دوست','Friend'))+'</h3>'+mediaMarkup(row,'story')+(row.text?'<p data-elara-ugc dir="auto">'+esc(row.text)+'</p>':'')+'<small>'+ago(row.createdMs)+' · '+vis(row.visibility)+'</small>';if(row.uid===(window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid)){const d=document.createElement('button');d.type='button';d.className='page-story-delete danger';d.textContent=t('حذف استاتوس','Delete status');d.onclick=async()=>{await window.ElaraPage?.deleteStory?.(row.id);window.ElaraDialog.close()};box.append(d)}else{const actions=document.createElement('div');actions.className='page-story-moderation';actions.innerHTML='<button type="button" data-page-report-story>'+t('گزارش','Report')+'</button><button type="button" class="danger-outline" data-page-block-story>'+t('مسدود','Block')+'</button>';actions.querySelector('[data-page-report-story]').onclick=async()=>{window.ElaraDialog.close();await report('story',row)};actions.querySelector('[data-page-block-story]').onclick=async()=>{window.ElaraDialog.close();await block(row)};box.append(actions)}await window.ElaraDialog.open({title:t('استاتوس','Status'),content:box,actions:[{label:t('بستن','Close'),value:false}]})}
});
for(const ev of ['elara:page-updated','elara:locale-changed'])window.addEventListener(ev,()=>setTimeout(()=>{render();void loadOfficialPages()},0));
window.addEventListener('elara:account-ready',()=>setTimeout(()=>void loadOfficialPages(),0));
for(const ev of ['elara:profile-saved','elara:wardrobe-changed'])window.addEventListener(ev,()=>setTimeout(render,0));
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='page'){render();void window.ElaraPage?.refresh?.();void loadOfficialPages()}if(e.detail?.tab==='social')setTimeout(injectFriendsCta,40)});
new MutationObserver(()=>injectFriendsCta()).observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{render();injectFriendsCta();void loadOfficialPages()},{once:true});else{render();injectFriendsCta();void loadOfficialPages()}
window.ElaraPageView={render,reloadOfficial:loadOfficialPages};
})();