/* Elara Space — Edit Profile visual surface. No shared navigation or Social persistence overrides. */
(function () {
 'use strict';
 const P=()=>window.ElaraProfileSystem;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const themes=[
  {id:'classic',label:'Classic',theme:'dark',image:'assets/ui/banner1.webp'},
  {id:'minimal',label:'Minimal',theme:'minimal',image:'assets/ui/banner2.webp'},
  {id:'nebula',label:'Nebula',theme:'galaxy',image:'assets/ui/banner3.webp'},
  {id:'forest',label:'Forest',theme:'forest',image:'assets/ui/theme_forest_green.webp'}
 ];
 const colors=[['blue','#078cff'],['violet','#ad18f7'],['pink','#fd39b3'],['sunset','#ff8740'],['mint','#03d99e'],['aurora','linear-gradient(135deg,#57eaff,#ef55c7,#ffac6b)']];
 const extraKey=uid=>'elara_profile_edit_extras_v1_'+uid;
 const safeLocal=uid=>{try{const v=JSON.parse(localStorage.getItem(extraKey(uid))||'{}');return {color:colors.some(c=>c[0]===v.color)?v.color:'blue',title:String(v.title||'').slice(0,50),customBanner:/^data:image\/(?:webp|png|jpeg);base64,/i.test(v.customBanner||'')&&v.customBanner.length<1000000?v.customBanner:''}}catch{return {color:'blue',title:'',customBanner:''}}};
 const fileData=async(file,maxWidth,maxHeight,maxBytes)=>{
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('تصویر باید PNG، JPG یا WEBP و حداکثر ۵ مگابایت باشد.');
  const url=URL.createObjectURL(file);
  try{
   const img=await new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>fail(Error('تصویر باز نشد.'));i.src=url});
   const scale=Math.min(maxWidth/img.naturalWidth,maxHeight/img.naturalHeight,1);
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   const result=canvas.toDataURL('image/webp',.74);
   if(result.length>maxBytes)throw Error('تصویر فشرده‌شده برای ذخیره روی این دستگاه بزرگ است. تصویر کوچک‌تری انتخاب کن.');
   return result
  }finally{URL.revokeObjectURL(url)}
 };
 const displayDate=value=>{
  const d=value?.toDate?.()||(value?.seconds?new Date(value.seconds*1000):value?new Date(value):null);
  if(!d||Number.isNaN(d.getTime()))return 'نامشخص';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d)
 };
 const initials=name=>String(name||'E').trim().slice(0,1)||'E';
 const styleColor=c=>colors.find(x=>x[0]===c)?.[1]||colors[0][1];
 const strip=x=>String(x??'').trim();
 const draftFrom=(person,wardrobe,extras)=>({
  name:String(person.name||person.displayName||''),username:String(person.username||''),
  bio:String(person.bio||''),profilePublic:person.profilePublic!==false,
  frame:wardrobe.frame||'',banner:wardrobe.banner||'moon',photoMode:wardrobe.photoMode,
  photoCircle:wardrobe.photoCircle||'',photoSquare:wardrobe.photoSquare||'',
  avatarGroup:wardrobe.avatarGroup||'',avatarLevel:wardrobe.avatarLevel||null,
  shape:wardrobe.shape||'circle',nameFont:wardrobe.nameFont||'default',
  theme:themes.find(t=>t.theme===wardrobe.profileTheme)?.id||'classic',
  themeTouched:false,color:extras.color,title:extras.title,customBanner:extras.customBanner
 });
 function bannerSource(d){
  if(d.customBanner)return d.customBanner;
  return P().BANNERS.find(b=>b.id===d.banner)?.path||P().BANNERS[0].path
 }
 function avatarSource(d,person){
  if(d.photoMode==='upload')return d.shape==='square'?d.photoSquare||person.photoURL||'':d.photoCircle||person.photoURL||'';
  if(d.avatarGroup&&d.avatarLevel)return P().avatarPath(d.avatarGroup,d.avatarLevel,d.shape);
  return person.photoURL||window.ElaraAccount?.user?.photoURL||''
 }
 function imgMarkup(src,name,cssClass){
  return src?'<img class="'+cssClass+'" src="'+esc(src)+'" alt="'+esc(name)+'">':'<span class="pe-fallback">'+esc(initials(name))+'</span>'
 }
 let host=null,closing=null;
 async function stylesheet(){
  if(document.getElementById('elara-profile-edit-redesign-css'))return;
  await new Promise((done,fail)=>{
   const link=document.createElement('link');link.rel='stylesheet';link.id='elara-profile-edit-redesign-css';link.href='profile-edit-redesign.css?v=20261010-1';
   link.onload=done;link.onerror=()=>{link.remove();fail(Error('استایل صفحهٔ ویرایش پروفایل بارگذاری نشد.'))};document.head.append(link)
  })
 }
 async function open({galleryOpen=false}={}){
  if(host){host.querySelector('.pe-screen')?.focus();return}
  const uid=P()?.currentUid?.();
  if(!uid)throw Error('برای ویرایش پروفایل ابتدا وارد حساب شوید.');
  await stylesheet();
  const initial=window.ElaraSocial?.me||window.ElaraAccount?.profile||{};
  if(initial.uid&&initial.uid!==uid)throw Error('شناسهٔ پروفایل با حساب واردشده همخوان نیست.');
  const person={...initial,uid},savedWardrobe=P().readWardrobe(uid),savedExtras=safeLocal(uid);
  const base=()=>draftFrom(person,savedWardrobe,savedExtras);
  let draft=base(),busy=false,serviceFailed=false,service=null,previewActive=false;
  const model=P().viewModel(person,{self:true});
  const earned=Array.isArray(model.medals)?model.medals:[];
  const level=model.level;
  const shell=document.createElement('div');shell.className='pe-shell';shell.id='elara-profile-edit-screen';
  shell.innerHTML='<div class="pe-screen" role="region" aria-label="ویرایش پروفایل" tabindex="-1">'+
   '<header class="pe-heading"><div class="pe-heading-main"><span class="pe-heading-icon" aria-hidden="true">✦</span><div><h1>ویرایش پروفایل</h1><p>✨ هویت دیجیتالی خود را در Elara بسازید</p></div></div><button type="button" class="pe-outline pe-back" data-pe-action="close">بازگشت ←</button><button type="button" class="pe-outline pe-header-preview" data-pe-action="preview">◉ پیش‌نمایش</button></header>'+
   '<div class="pe-layout"><form class="pe-editor" id="elara-central-profile-form" novalidate>'+
   '<section class="pe-panel pe-identity">'+
    '<div class="pe-banner" data-pe-banner><button class="pe-change-banner" type="button" data-pe-action="banners">▧ تغییر بنر</button></div>'+
    '<div class="pe-banner-options" data-pe-banner-options hidden><div class="pe-options-head"><strong>انتخاب بنر Elara</strong><span>تصاویر بازشده مطابق سطح کاربر</span></div><div class="pe-banner-choices" data-pe-banners></div><label class="pe-file-choice">افزودن بنر از دستگاه (فقط ذخیره محلی)<input name="bannerFile" type="file" accept="image/png,image/jpeg,image/webp"></label></div>'+
    '<div class="pe-identity-fields"><div class="pe-avatar-area"><div class="pe-avatar" data-pe-avatar></div><button type="button" class="pe-camera" data-pe-action="avatars" aria-label="تغییر آواتار">▣</button></div>'+
     '<div class="pe-name-grid"><label class="pe-field">نام نمایشی<input name="name" autocomplete="nickname" maxlength="60" required></label><label class="pe-field">نام کاربری<div class="pe-username-row"><input name="username" dir="ltr" autocomplete="username" maxlength="20" required spellcheck="false"><button type="button" class="pe-copy" data-pe-action="copy" aria-label="کپی نام کاربری">▢</button></div><small class="pe-username-state" data-pe-username-state></small></label></div>'+
     '<label class="pe-field pe-bio-field">دربارهٔ من<textarea name="bio" maxlength="300" rows="3" placeholder="در جستجوی نسخه‌ای بهتر از خودم…"></textarea><span class="pe-counter" data-pe-count="bio"></span></label>'+
    '</div>'+
    '<div class="pe-avatar-options" data-pe-avatar-options hidden><div class="pe-options-head"><strong>آواتارهای Elara</strong><span>آواتارهای قفل‌شده قابل انتخاب نیستند</span></div><div class="pe-avatar-choices" data-pe-avatars></div><label class="pe-file-choice">انتخاب عکس از دستگاه (فقط ذخیره محلی)<input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp"></label></div>'+
    '<div class="pe-info-grid"><div class="pe-info"><span class="pe-info-icon">▦</span><div><small>تاریخ عضویت</small><strong data-pe-created></strong></div></div><div class="pe-info"><span class="pe-info-icon">☆</span><div><small>سطح کاربر</small><strong data-pe-level></strong></div></div></div>'+
    '<div class="pe-badges"><strong>نشان‌ها</strong><div data-pe-badges></div></div>'+
   '</section>'+
   '<section class="pe-custom-grid"><div class="pe-panel pe-color-panel"><h2>رنگ تم پروفایل</h2><div class="pe-colors" data-pe-colors></div></div>'+
   '<div class="pe-panel pe-template-panel"><div class="pe-panel-title"><h2>قالب پروفایل</h2><small>انتخاب سبک بنر پروفایل</small></div><div class="pe-templates" data-pe-templates></div></div></section>'+
   '<section class="pe-panel pe-frames"><h2>حاشیه آواتار</h2><div class="pe-frames-list" data-pe-frames></div></section>'+
   '<section class="pe-panel pe-title-field"><label class="pe-field">عنوان زیر نام<input name="title" maxlength="50" placeholder="مثلاً عاشق یادگیری و سفر ✨"></label><span class="pe-counter" data-pe-count="title"></span></section>'+
   '<label class="pe-privacy"><input name="profilePublic" type="checkbox"> نمایش پروفایل برای کاربران واردشده</label>'+
   '<p class="pe-storage-note">نام، نام کاربری و Bio از مسیر اصلی Firebase ذخیره می‌شوند؛ قالب، رنگ، قاب، عنوان و تصاویر انتخابی فعلاً فقط روی همین دستگاه ذخیره می‌شوند.</p>'+
   '<p class="pe-status" role="status" aria-live="polite" data-pe-status></p>'+
   '<div class="pe-actions"><button type="button" class="pe-reset" data-pe-action="reset">↻ بازنشانی تغییرات</button><button type="button" class="pe-outline pe-public-preview" data-pe-action="preview">◉ پیش‌نمایش در صفحه عمومی</button><button type="submit" class="pe-save" data-pe-save>ذخیره تغییرات ✓</button></div>'+
   '</form>'+
   '<aside class="pe-preview-outer" id="pe-preview-area"><div class="pe-preview"><header><h2>پیش‌نمایش پروفایل</h2><small>نمایش زندهٔ تغییرات شما</small></header><div class="pe-preview-card" data-pe-preview></div></div></aside>'+
   '</div></div>';
  document.body.append(shell);host=shell;
  const q=sel=>shell.querySelector(sel), qa=sel=>[...shell.querySelectorAll(sel)],status=message=>{q('[data-pe-status]').textContent=message},input=name=>q('[name="'+name+'"]');
  const date=displayDate(person.createdAt||person.joinedAt||person.created||window.ElaraAccount?.user?.metadata?.creationTime);
  q('[data-pe-created]').textContent=date;
  q('[data-pe-level]').textContent=model.title+' · '+Number(level).toLocaleString('fa-IR');
  q('[data-pe-badges]').innerHTML=earned.length?earned.map(m=>'<span class="pe-medal" title="'+esc(m.label)+'">✦ '+esc(m.label)+'</span>').join(''):'<span class="pe-badges-empty">هنوز نشانی کسب نشده است</span>';
  q('[data-pe-banners]').innerHTML=P().BANNERS.map(b=>'<button type="button" class="pe-banner-tile" data-pe-banner-id="'+esc(b.id)+'" '+(level<b.required?'disabled':'')+'><img src="'+esc(b.path)+'" alt=""><span>'+esc(b.label)+(level<b.required?' · سطح '+b.required:'')+'</span></button>').join('');
  q('[data-pe-avatars]').innerHTML=['female','male'].map(g=>Array.from({length:10},(_,i)=>{const n=i+1;return '<button type="button" class="pe-avatar-tile" data-pe-avatar-id="'+g+':'+n+'" '+(level<n?'disabled':'')+'><img src="'+esc(P().avatarPath(g,n))+'" alt=""><small>Lv. '+n+'</small></button>'}).join('')).join('');
  q('[data-pe-colors]').innerHTML=colors.map(c=>'<button type="button" data-pe-color="'+c[0]+'" title="'+c[0]+'" aria-label="'+c[0]+'" style="background:'+c[1]+'"></button>').join('');
  q('[data-pe-templates]').innerHTML=themes.map(t=>'<button type="button" class="pe-template" data-pe-template="'+t.id+'"><img src="'+esc(t.image)+'" alt=""><span>'+t.label+'</span></button>').join('');
  q('[data-pe-frames]').innerHTML='<button type="button" class="pe-frame pe-frame-none" data-pe-frame="" aria-label="بدون حاشیه">╱</button>'+P().FRAMES.map(f=>'<button type="button" class="pe-frame" data-pe-frame="'+f.id+'" '+(level<f.required?'disabled title="از سطح '+f.required+'"':'')+' aria-label="'+esc(f.label)+'"><img src="'+esc(P().frameVariantPath(f.id))+'" alt=""></button>').join('');
  const dirty=()=>JSON.stringify(draft)!==JSON.stringify(base());
  const avatarHtml=(className)=>imgMarkup(avatarSource(draft,person),draft.name,className);
  function redraw(){
   q('.pe-screen').style.setProperty('--pe-accent',styleColor(draft.color));
   q('[data-pe-banner]').style.backgroundImage='linear-gradient(0deg,#050d25a6,transparent 48%),url("'+bannerSource(draft).replace(/"/g,'%22')+'")';
   q('[data-pe-avatar]').innerHTML=avatarHtml('pe-portrait')+(draft.frame?'<img class="pe-avatar-frame" src="'+esc(P().frameVariantPath(draft.frame,draft.shape))+'" alt="">':'');
   q('[data-pe-avatar]').dataset.shape=draft.shape;
   q('[data-pe-count="bio"]').textContent=draft.bio.length+'/300 ✎';
   q('[data-pe-count="title"]').textContent=draft.title.length+'/50 ✎';
   const valid=/^[a-z][a-z0-9_]{2,19}$/.test(draft.username.toLowerCase());
   q('[data-pe-username-state]').textContent=valid?'✓ فرمت معتبر؛ یکتا بودن هنگام ذخیره بررسی می‌شود.':'نام کاربری: ۳ تا ۲۰ حرف کوچک، عدد یا _ و شروع با حرف';
   q('[data-pe-username-state]').dataset.valid=String(valid);
   qa('[data-pe-color]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.peColor===draft.color)));
   qa('[data-pe-template]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.peTemplate===draft.theme)));
   qa('[data-pe-frame]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.peFrame===draft.frame)));
   qa('[data-pe-banner-id]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.peBannerId===draft.banner&&!draft.customBanner)));
   qa('[data-pe-avatar-id]').forEach(el=>el.setAttribute('aria-pressed',String(draft.photoMode!=='upload'&&el.dataset.peAvatarId===draft.avatarGroup+':'+draft.avatarLevel)));
   const levelText=Number(level).toLocaleString('fa-IR');
   const friends=window.ElaraSocial?.friends;
   const stats='<span><strong>'+levelText+'</strong><small>سطح</small></span><span><strong>'+Number(model.xp).toLocaleString('fa-IR')+'</strong><small>XP</small></span>'+(Array.isArray(friends)?'<span><strong>'+friends.length.toLocaleString('fa-IR')+'</strong><small>دوستان</small></span>':'')+'<span><strong>'+earned.length.toLocaleString('fa-IR')+'</strong><small>نشان‌ها</small></span>';
   q('[data-pe-preview]').innerHTML='<div class="pe-preview-banner" style="background-image:url(&quot;'+esc(bannerSource(draft)).replace(/&quot;/g,'&quot;')+'&quot;)"></div>'+
    '<div class="pe-preview-avatar" data-shape="'+esc(draft.shape)+'">'+avatarHtml('pe-preview-portrait')+(draft.frame?'<img src="'+esc(P().frameVariantPath(draft.frame,draft.shape))+'" class="pe-preview-frame" alt="">':'')+'</div>'+
    '<div class="pe-preview-body" data-template="'+esc(draft.theme)+'"><h3 dir="auto">'+esc(draft.name||'نام نمایشی')+'</h3><p class="pe-preview-user" dir="ltr">@'+esc(draft.username||'username')+'</p><p class="pe-preview-title" dir="auto">'+esc(draft.title||model.title)+'</p><div class="pe-preview-bio" dir="auto">'+esc(draft.bio||'هنوز متنی وارد نشده است.')+'</div><div class="pe-preview-stats">'+stats+'</div><div class="pe-preview-medals">'+(earned.length?earned.slice(0,6).map(m=>'<span title="'+esc(m.label)+'">✦</span>').join(''):'')+'</div></div>';
  }
  function syncFields(){
   ['name','username','bio','title'].forEach(k=>{input(k).value=draft[k]});
   input('profilePublic').checked=draft.profilePublic;
   redraw()
  }
  function restore(){draft=base();syncFields();status('تغییرات ذخیره‌نشده بازنشانی شدند.')}
  syncFields();
  if(galleryOpen)q('[data-pe-avatar-options]').hidden=false;
  const keydown=e=>{if(e.key==='Escape'&&host===shell){e.preventDefault();close()}};
  document.addEventListener('keydown',keydown);
  function close(){if(host!==shell)return;document.removeEventListener('keydown',keydown);shell.remove();host=null}
  closing=close;
  function showPreview(){
   previewActive=!previewActive;
   shell.classList.toggle('pe-mobile-preview-visible',previewActive);
   q('#pe-preview-area').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function prepare(retry=false){
   if(service)return service;
   const b=q('[data-pe-save]');b.disabled=true;
   try{
    status('در حال آماده‌سازی سرویس ذخیرهٔ پروفایل…');
    service=await P().canonicalProfileService({retry});
    serviceFailed=false;status('');return service
   }catch(error){serviceFailed=true;status('سرویس Firebase آماده نشد: '+String(error?.message||error)+'؛ برای تلاش دوباره ذخیره را انتخاب کنید.');throw error}
   finally{b.disabled=busy}
  }
  void prepare().catch(()=>{});
  shell.addEventListener('input',e=>{
   if(!e.target.name||!Object.hasOwn(draft,e.target.name))return;
   draft[e.target.name]=e.target.type==='checkbox'?e.target.checked:e.target.value;
   redraw()
  });
  shell.addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button)return;
   const action=button.dataset.peAction;
   if(action==='close'){close();return}
   if(action==='reset'){restore();return}
   if(action==='preview'){showPreview();return}
   if(action==='banners'){q('[data-pe-banner-options]').hidden=!q('[data-pe-banner-options]').hidden;return}
   if(action==='avatars'){q('[data-pe-avatar-options]').hidden=!q('[data-pe-avatar-options]').hidden;return}
   if(action==='copy'){if(navigator.clipboard?.writeText)navigator.clipboard.writeText('@'+draft.username).then(()=>status('نام کاربری کپی شد.')).catch(()=>status('کپی نام کاربری مجاز نبود.'));return}
   if(button.hasAttribute('data-pe-color'))draft.color=button.dataset.peColor;
   else if(button.hasAttribute('data-pe-template')){draft.theme=button.dataset.peTemplate;draft.themeTouched=true}
   else if(button.hasAttribute('data-pe-frame'))draft.frame=button.dataset.peFrame;
   else if(button.hasAttribute('data-pe-banner-id')){draft.banner=button.dataset.peBannerId;draft.customBanner='';q('[data-pe-banner-options]').hidden=true}
   else if(button.hasAttribute('data-pe-avatar-id')){const [g,n]=button.dataset.peAvatarId.split(':');draft.avatarGroup=g;draft.avatarLevel=Number(n);draft.photoMode='elara';q('[data-pe-avatar-options]').hidden=true}
   else return;
   redraw()
  });
  input('avatarFile').addEventListener('change',async e=>{
   try{
    const file=e.target.files?.[0];if(!file)return;
    const photos=await P().photoVariants(file);
    draft.photoCircle=photos.photoCircle;draft.photoSquare=photos.photoSquare;draft.photoMode='upload';
    q('[data-pe-avatar-options]').hidden=true;redraw();
    status('عکس روی همین دستگاه آماده شده است؛ برای نگه‌داشتن آن ذخیره را انتخاب کنید.')
   }catch(error){status(error.message||String(error))}
   finally{e.target.value=''}
  });
  input('bannerFile').addEventListener('change',async e=>{
   try{
    const file=e.target.files?.[0];if(!file)return;
    draft.customBanner=await fileData(file,1200,450,900000);
    q('[data-pe-banner-options]').hidden=true;redraw();
    status('بنر روی همین دستگاه آماده شده است؛ این تصویر به Firebase آپلود نمی‌شود.')
   }catch(error){status(error.message||String(error))}
   finally{e.target.value=''}
  });
  q('form').addEventListener('submit',async e=>{
   e.preventDefault();
   if(busy)return;
   if(!strip(draft.name)){status('نام نمایشی الزامی است.');input('name').focus();return}
   draft.username=strip(draft.username).replace(/^@/,'').toLowerCase();
   if(!/^[a-z][a-z0-9_]{2,19}$/.test(draft.username)){status('فرمت نام کاربری معتبر نیست.');input('username').focus();return}
   busy=true;q('[data-pe-save]').disabled=true;qa('button').filter(x=>x!==q('[data-pe-save]')).forEach(x=>{x.disabled=x.disabled||false});
   try{
    const api=await prepare(serviceFailed);
    status('در حال ذخیرهٔ اطلاعات اصلی در Firebase…');
    const result=await api.saveProfileValues({name:strip(draft.name),username:draft.username,bio:draft.bio,profilePublic:draft.profilePublic});
    if(result?.warnings?.length){status('بخشی از اطلاعات در Firebase ذخیره نشد: '+result.warnings.join(' ')+' تنظیمات ظاهر ثبت نشدند.');return}
    const nextWardrobe={frame:draft.frame||null,banner:draft.banner,photoMode:draft.photoMode,avatarGroup:draft.avatarGroup||null,avatarLevel:draft.avatarLevel||null,photoCircle:draft.photoCircle,photoSquare:draft.photoSquare,shape:draft.shape,nameFont:draft.nameFont};
    if(draft.themeTouched)nextWardrobe.profileTheme=themes.find(t=>t.id===draft.theme)?.theme||null;
    try{
     P().writeWardrobe(nextWardrobe);
     localStorage.setItem(extraKey(uid),JSON.stringify({color:draft.color,title:draft.title,customBanner:draft.customBanner}));
    }catch(err){status('اطلاعات اصلی در Firebase ذخیره شد، اما ذخیرهٔ ظاهر روی دستگاه ناموفق بود: '+String(err.message||err));return}
    person.name=draft.name;person.username=draft.username;person.bio=draft.bio;person.profilePublic=draft.profilePublic;
    Object.assign(savedWardrobe,P().readWardrobe(uid));Object.assign(savedExtras,safeLocal(uid));
    draft=base();syncFields();
    status('اطلاعات اصلی در Firebase ذخیره شد. تغییرات ظاهری فقط در همین مرورگر ذخیره شده‌اند.');
    window.dispatchEvent(new Event('elara:profile-saved'))
   }catch(error){
    status(error?.code==='permission-denied'?'Firebase اجازهٔ ذخیره نداد؛ Rules و دسترسی حساب را بررسی کنید.':String(error?.message||error))
   }finally{busy=false;q('[data-pe-save]').disabled=false}
  });
  q('.pe-screen').focus({preventScroll:true})
 }
 window.ElaraProfileEdit={open,close:()=>closing?.()};
})();