/* Shared profile and wardrobe source of truth. Cosmetics stay UID-scoped and local until a real sync contract exists. */
(()=>{'use strict';
const PREFIX='elara_visual_wardrobe_',PRIVATE_PREFIX='elara_profile_private_v2_';
const SHAPES=Object.freeze(['circle','square']);
const NAME_FONTS=Object.freeze({default:'inherit',vazir:'Vazirmatn, Tahoma, sans-serif',classic:'Georgia, Times New Roman, serif',clean:'Arial, Tahoma, sans-serif',soft:'Trebuchet MS, Tahoma, sans-serif'});
const TITLES=['کادت فضا','دیده‌بان ستاره','کاوشگر ماه','مسافر مریخ','مهندس کهکشانی','فرمانده ناوگان','ناوبر کیهانی','ارباب ستاره‌ها','نگهبان کهکشان','اسطورهٔ کیهان'];
const FRAMES=Object.freeze([
 {id:'bronze',label:'برنزی',required:1,path:'assets/frames_bronze.png'},
 {id:'silver',label:'نقره‌ای',required:4,path:'assets/frames_silver.png'},
 {id:'gold',label:'طلایی',required:7,path:'assets/frames_gold.png'},
 {id:'diamond',label:'الماس',required:10,path:'assets/frames_diamond.png'}
].map(Object.freeze));
const BANNERS=Object.freeze([
 {id:'moon',label:'دریاچهٔ مهتاب',required:1,path:'assets/ui/banner1.webp'},
 {id:'dream',label:'درختِ رؤیا',required:4,path:'assets/ui/banner2.webp'},
 {id:'castle',label:'شهرِ ستاره‌ها',required:8,path:'assets/ui/banner3.webp'},
 {id:'dawn',label:'سپیدهٔ نو',required:10,path:'assets/ui/banner4.webp'}
].map(Object.freeze));
const PROFILE_THEMES=Object.freeze([
 {id:'dark',label:'Dark',path:'assets/ui/theme_dark.webp'},
 {id:'light',label:'Light',path:'assets/ui/theme_white.webp'},
 {id:'minimal',label:'Minimal',path:'assets/ui/theme_minimal.webp'},
 {id:'galaxy',label:'Galaxy',path:'assets/ui/theme_galaxy_purple.webp'},
 {id:'blue',label:'Blue',path:'assets/ui/theme_blue.webp'},
 {id:'pink',label:'Pink',path:'assets/ui/theme_pink.webp'},
 {id:'red',label:'Red',path:'assets/ui/theme_red.webp'},
 {id:'orange',label:'Orange',path:'assets/ui/theme_orange.webp'},
 {id:'forest',label:'Forest',path:'assets/ui/theme_forest_green.webp'},
 {id:'spring',label:'Spring',path:'assets/ui/theme_spring.webp'},
 {id:'city',label:'Midnight City',path:'assets/ui/city_theme.webp'}
].map(Object.freeze));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentUid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
function currentXp(){try{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return Number(window.ElaraSocial?.me?.xp??s?.xp??0)||0}catch{return Number(window.ElaraSocial?.me?.xp||0)||0}}
function fallbackLevelFromXp(xp){const value=Math.max(0,Number(xp)||0),threshold=l=>{const n=Math.max(1,Math.floor(Number(l)||1));if(n<=30)return(n-1)*70;const x=n-30;return 2030+70*x+25*x*x};let lo=1,hi=32;while(threshold(hi)<=value&&hi<100000)hi*=2;while(lo+1<hi){const mid=Math.floor((lo+hi)/2);if(threshold(mid)<=value)lo=mid;else hi=mid}return lo}
const levelFromXp=xp=>{const registry=window.ElaraLevels?.level;if(typeof registry==='function'){const n=Number(registry(Number(xp)||0));if(Number.isFinite(n)&&n>=1)return Math.floor(n)}return fallbackLevelFromXp(xp)};
const titleForLevel=level=>window.ElaraLevels?.titleForLevel?.(level)||TITLES[Math.min(10,Math.max(1,Number(level)||1))-1];
function avatarPath(group,level,shape='circle'){
 const g=normalizeGroup(group),n=normalizeLevel(level),mode=SHAPES.includes(shape)?shape:'circle';if(!g||!n)return '';
 const modern='assets/avatars/level-'+String(n).padStart(2,'0')+'-'+(g==='female'?'f':'m')+'-'+mode+'.png';
 return modern;
}
function key(uid=currentUid()||'guest'){return PREFIX+String(uid||'guest')}
function normalizeGroup(value){return value==='male'||value==='female'?value:null}
function normalizeLevel(value){const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=10?n:null}
function frameBy(value){if(!value)return null;const raw=String(value),aliases={'برنزی':'bronze','نقره‌ای':'silver','طلایی':'gold','الماس':'diamond','frames_bronze.png':'bronze','frames_silver.png':'silver','frames_gold.png':'gold','frames_diamond.png':'diamond'};const id=aliases[raw]||raw.replace(/^assets\/frames_|^frames_/,'').replace(/\.png$/,'');return FRAMES.find(x=>x.id===id)||null}
function bannerBy(value){if(!value)return null;const raw=String(value),aliases={'دریاچهٔ ماه':'moon','دریاچهٔ مهتاب':'moon','درخت رؤیا':'dream','درختِ رؤیا':'dream','قلعهٔ ستاره‌ها':'castle','شهرِ ستاره‌ها':'castle','سپیدهٔ نو':'dawn','بنر ۱':'moon','بنر ۲':'dream','بنر ۳':'castle','بنر ۴':'dawn','assets/banner-moon.svg':'moon','assets/banner-dream.svg':'dream','assets/banner-castle.svg':'castle','assets/ui/background-moonlit-mountains.webp':'moon','assets/ui/hero-landscape.webp':'dream','assets/ui/banner-running-moonlit-mountains.webp':'castle','assets/ui/banner1.webp':'moon','assets/ui/banner2.webp':'dream','assets/ui/banner3.webp':'castle','assets/ui/banner4.webp':'dawn'};const id=aliases[raw]||raw;return BANNERS.find(x=>x.id===id)||null}
function profileThemeBy(value){if(!value)return null;const id=String(value);return PROFILE_THEMES.find(x=>x.id===id)||null}
function cleanPhoto(value){const s=String(value||'');return /^data:image\/(?:webp|png|jpeg);base64,/i.test(s)&&s.length<1500000?s:''}
function normalizeWardrobe(value={}){const raw=value&&typeof value==='object'?value:{},shape=SHAPES.includes(raw.shape)?raw.shape:'circle',nameFont=Object.hasOwn(NAME_FONTS,raw.nameFont)?raw.nameFont:'default';return {avatarGroup:normalizeGroup(raw.avatarGroup),avatarLevel:normalizeLevel(raw.avatarLevel),frame:frameBy(raw.frame)?.id||null,banner:bannerBy(raw.banner)?.id||null,profileTheme:profileThemeBy(raw.profileTheme)?.id||null,shape,nameFont,photoMode:raw.photoMode==='upload'?'upload':'elara',photoCircle:cleanPhoto(raw.photoCircle),photoSquare:cleanPhoto(raw.photoSquare)}}
function readWardrobe(uid=currentUid()||'guest'){try{return normalizeWardrobe(JSON.parse(localStorage.getItem(key(uid))||'{}'))}catch{return normalizeWardrobe()}}
function writeWardrobe(patch={}){const uid=currentUid()||'guest',next=normalizeWardrobe({...readWardrobe(uid),...patch});localStorage.setItem(key(uid),JSON.stringify(next));window.dispatchEvent(new CustomEvent('elara:wardrobe-changed',{detail:{uid,wardrobe:next}}));return next}
function frameForLevel(level){const n=Math.min(10,Math.max(1,Number(level)||1));return n>=10?FRAMES[3]:n>=7?FRAMES[2]:n>=4?FRAMES[1]:FRAMES[0]}
function frameVariantPath(frame,shape='circle'){const f=frameBy(frame);if(!f)return '';const mode=SHAPES.includes(shape)?shape:'circle';return 'assets/frames/'+f.id+'-'+mode+'.png'}
const canEquipAvatar=(group,avatarLevel,userLevel)=>!!normalizeGroup(group)&&!!normalizeLevel(avatarLevel)&&Number(avatarLevel)<=Number(userLevel||0);
const canEquipFrame=(frame,userLevel)=>{const f=frameBy(frame);return !!f&&f.required<=Number(userLevel||0)};
const canEquipBanner=(banner,userLevel)=>{const b=bannerBy(banner);return !!b&&b.required<=Number(userLevel||0)};
function privateKey(uid=currentUid()||'guest'){return PRIVATE_PREFIX+String(uid||'guest')}
function readPrivate(uid=currentUid()||'guest'){try{const raw=JSON.parse(localStorage.getItem(privateKey(uid))||'{}');return {sex:['female','male','other'].includes(raw.sex)?raw.sex:'',periodEnabled:raw.periodEnabled!==false}}catch{return{sex:'',periodEnabled:true}}}
function writePrivate(patch={}){const uid=currentUid()||'guest',next={...readPrivate(uid),...patch};if(!['female','male','other'].includes(next.sex))next.sex='';next.periodEnabled=next.periodEnabled!==false;localStorage.setItem(privateKey(uid),JSON.stringify(next));window.dispatchEvent(new CustomEvent('elara:profile-private-changed',{detail:{uid,profile:next}}));return next}
function publicWardrobe(person={}){return normalizeWardrobe({avatarGroup:person.avatarGroup,avatarLevel:person.avatarLevel,frame:person.frame,banner:person.banner,profileTheme:person.profileTheme,shape:person.profileShape,nameFont:person.nameFont})}
function viewModel(person={},opts={}){
 const self=opts.self??(!!currentUid()&&person?.uid===currentUid()),xp=Number(person?.xp??(self?currentXp():0))||0,level=levelFromXp(xp);
 const w=self?readWardrobe():publicWardrobe(person),group=normalizeGroup(w.avatarGroup),avatarLevel=normalizeLevel(w.avatarLevel),shape=w.shape||'circle',nameFont=w.nameFont||'default';
 const avatarAsset=group&&avatarLevel&&canEquipAvatar(group,avatarLevel,level)?avatarPath(group,avatarLevel,shape):'',photo=String(person?.photoURL||(self?window.ElaraAccount?.user?.photoURL:'')||''),uploaded=self&&w.photoMode==='upload'?(shape==='square'?w.photoSquare:w.photoCircle):'';
 const frame=frameBy(w.frame),equippedFrame=frame&&canEquipFrame(frame.id,level)?frame:null,banner=bannerBy(w.banner),equippedBanner=banner&&canEquipBanner(banner.id,level)?banner:null,profileTheme=profileThemeBy(w.profileTheme);
 const name=String(person?.name||person?.displayName||person?.username||'پروفایل من'),username=String(person?.username||''),collection=self?window.ElaraCollection?.sync?.():null,rank=window.ElaraLevels?.rankForLevel?.(level)||null;
 const medals=self&&window.ElaraLevels?.medals?window.ElaraLevels.medals(window.ElaraCollection?.counts?.()||{},xp).filter(m=>m.earned):[];
 return {uid:person?.uid||currentUid()||'',self,name,username,bio:String(person?.bio||''),xp,level,title:titleForLevel(level),rankId:rank?.id||'',rankLabel:rank?.label||'',medals,collectionLevel:Number(collection?.level||person?.collectionLevel||0)||0,collectionScore:Number(collection?.score||0)||0,avatarGroup:group,avatarLevel,shape,nameFont,nameFontCss:NAME_FONTS[nameFont]||NAME_FONTS.default,photoMode:w.photoMode,avatarSrc:uploaded||avatarAsset||photo,avatarAssetSrc:avatarAsset,photoURL:photo,frame:equippedFrame?.id||null,frameSrc:equippedFrame?frameVariantPath(equippedFrame.id,shape):'',frameLabel:equippedFrame?.label||'بدون فریم',profileTheme:profileTheme?.id||null,profileThemeSrc:profileTheme?.path||'',profileThemeLabel:profileTheme?.label||'',banner:equippedBanner?.id||null,bannerSrc:equippedBanner?.path||BANNERS[0].path,bannerLabel:equippedBanner?.label||'پیش‌فرض',initial:(name.trim()[0]||'E').toUpperCase()};
}
function activeStatus(uid){
 const now=Date.now(),rows=Array.isArray(window.ElaraPage?.state?.stories)?window.ElaraPage.state.stories:[];
 return rows.find(row=>String(row?.uid||'')===String(uid||'')&&(!Number(row?.expiresMs)||Number(row.expiresMs)>now))||null;
}
function statusLabel(row,self=false){
 const en=document.documentElement.lang==='en',text=String(row?.text||'').trim().replace(/\s+/g,' ');
 if(text)return text.length>46?text.slice(0,45)+'…':text;
 if(row)return en?'Photo status':'استاتوس تصویری';
 return self?(en?'Add status':'استاتوس +'):'';
}
function statusBubble(v){
 const row=activeStatus(v.uid),label=statusLabel(row,!!v.self);if(!label)return '';
 const title=v.self?(document.documentElement.lang==='en'?'Open Page & Status':'باز کردن پیج و استاتوس'):(document.documentElement.lang==='en'?'Open status':'باز کردن استاتوس');
 const userText=!!String(row?.text||'').trim(),ugc=userText?' data-elara-ugc':'';
 return '<button type="button" class="elara-profile-status-bubble" data-profile-status-link data-profile-status-id="'+esc(row?.id||'')+'" aria-label="'+esc(title)+'"><span'+ugc+' dir="auto">'+esc(label)+'</span></button>';
}
/* One shape/size owner for every profile surface; frames never escape the shell. */
function avatarShell(v={},opts={}){
 const cls=opts.className||'elara-profile-avatar-shell',shape=v.shape==='square'?'square':'circle';
 const portrait=v.avatarSrc?'<img data-profile-asset data-avatar-image class="elara-profile-avatar-img '+esc(opts.imageClass||'')+'" src="'+esc(v.avatarSrc)+'" alt="">':'<span data-avatar-image class="elara-profile-avatar-fallback '+esc(opts.imageClass||'')+'">'+esc(v.initial||String(v.name||'E').slice(0,1))+'</span>';
 const frame=v.frameSrc?'<img data-profile-asset data-avatar-frame class="elara-profile-frame-img '+esc(opts.frameClass||'')+'" src="'+esc(v.frameSrc)+'" alt="">':'';
 return '<span data-avatar-shell data-profile-shape="'+shape+'" class="'+esc(cls)+(frame?' has-frame':'')+'">'+portrait+frame+(opts.extra||'')+'</span>';
}
function composition(view,opts={}){
 const v=view||viewModel({},{}),compact=opts.compact?' elara-profile-composition-compact':'',tier=v.frame||'none';
 const lvl=Math.max(1,Math.floor(Number(v.level)||1)),locale=document.documentElement.lang==='en'?'en-US':'fa-IR',p=window.ElaraLevels?.progress?.(Number(v.xp)||0);
 const progress=p?Number(p.percent)||0:0,next=p?Math.max(0,Number(p.max)-Number(v.xp||0)):0,nextLabel=(document.documentElement.lang==='en'?next.toLocaleString('en-US')+' XP to next level':next.toLocaleString('fa-IR')+' XP تا سطح بعد');
 const frameChip=v.frame?'<span>'+esc(v.frameLabel)+'</span>':'',bannerChip=v.banner?'<span>'+esc(v.bannerLabel)+'</span>':'',themeChip=v.profileTheme?'<span>'+esc(v.profileThemeLabel)+'</span>':'',collectionChip=v.collectionLevel?'<span class="elara-profile-collection-pill">Collection Lv. '+Number(v.collectionLevel).toLocaleString(locale)+'</span>':'',rankChip=v.rankLabel?'<span class="elara-profile-rank-pill" data-profile-rank="'+esc(v.rankId)+'">🏆 '+esc(v.rankLabel)+'</span>':'';
 const visibleMedals=Array.isArray(v.medals)?v.medals.slice(-8):[],hiddenMedals=Math.max(0,(v.medals?.length||0)-visibleMedals.length);
 const medalStrip=!opts.compact&&visibleMedals.length?'<div class="elara-profile-medals" aria-label="'+(document.documentElement.lang==='en'?'Earned medals':'مدال‌های کسب‌شده')+'">'+visibleMedals.map(m=>'<span class="elara-profile-medal" data-medal="'+esc(m.id)+'">✦ '+esc(m.label)+'</span>').join('')+(hiddenMedals?'<span class="elara-profile-medal-more">+'+hiddenMedals.toLocaleString(locale)+'</span>':'')+'</div>':'';
 const status=statusBubble(v),avatarView=!opts.compact&&v.avatarSrc?'<button type="button" class="elara-profile-avatar-view-hit" data-profile-avatar-view aria-label="'+esc(document.documentElement.lang==='en'?'View profile photo':'نمایش بزرگ عکس پروفایل')+'"></button>':'',pageCta=opts.profilePage&&!v.self&&v.uid?'<button type="button" class="elara-profile-page-entry" data-profile-page-link="'+esc(v.uid)+'" data-profile-page-name="'+esc(v.name)+'"><span aria-hidden="true">✦</span><strong>'+(document.documentElement.lang==='en'?'Open Page':'ورود به پیج')+'</strong><small>'+(document.documentElement.lang==='en'?'Posts · Status · Book clips':'پست‌ها · استاتوس · بریده‌های کتاب')+'</small></button>':'';
 return '<div class="elara-profile-composition'+compact+' frame-'+esc(tier)+' profile-shape-'+esc(v.shape||'circle')+'" data-profile-shape="'+esc(v.shape||'circle')+'" data-profile-uid="'+esc(v.uid||'')+'" data-profile-self="'+(v.self?'1':'0')+'" data-profile-theme="'+esc(v.profileTheme||'none')+'" style="--elara-profile-banner:url(\''+esc(v.bannerSrc)+'\');--elara-profile-theme:'+(v.profileThemeSrc?'url(\''+esc(v.profileThemeSrc)+'\')':'none')+';--elara-name-font:'+esc(v.nameFontCss||'inherit')+'">'+avatarShell(v,{extra:avatarView+status})+'<div class="elara-profile-composition-copy"><div class="elara-profile-identity-line"><div><strong class="elara-display-name">'+esc(v.name)+'</strong><small>'+(v.username?'@'+esc(v.username)+' · ':'')+esc(v.title)+'</small></div><span class="elara-profile-level-pill">Level '+lvl.toLocaleString(locale)+'</span></div><div class="elara-profile-xp-row"><span>'+esc(nextLabel)+'</span><b>'+Number(v.xp||0).toLocaleString(locale)+' XP</b></div><div class="elara-profile-xp-track" aria-label="'+(document.documentElement.lang==='en'?'Level progress':'پیشرفت سطح')+'"><i style="width:'+Math.max(0,Math.min(100,progress)).toFixed(2)+'%"></i></div><div class="elara-profile-chips">'+rankChip+collectionChip+frameChip+bannerChip+themeChip+'</div>'+medalStrip+pageCta+'</div></div>';
}
async function photoVariants(file){
 if(!file||!/^image\//.test(file.type))throw Error('فقط فایل تصویری قابل انتخاب است.');
 if(file.size>5*1024*1024)throw Error('حداکثر حجم عکس ۵ مگابایت است.');
 const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(Error('خواندن تصویر انجام نشد.'));fr.readAsDataURL(file)});
 const img=await new Promise((resolve,reject)=>{const x=new Image();x.onload=()=>resolve(x);x.onerror=()=>reject(Error('تصویر قابل پردازش نیست.'));x.src=data});
 const size=480,side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
 const make=circle=>{const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');g.clearRect(0,0,size,size);if(circle){g.save();g.beginPath();g.arc(size/2,size/2,size/2-2,0,Math.PI*2);g.clip()}g.drawImage(img,sx,sy,side,side,0,0,size,size);if(circle)g.restore();return c.toDataURL('image/webp',.82)};
 return {photoCircle:make(true),photoSquare:make(false)}
}
async function canonicalProfileService({retry=false}={}){
 if(window.ElaraSocial&&typeof window.ElaraSocial.saveProfileValues==='function')return window.ElaraSocial;
 if(typeof window.ElaraLoadSocial!=='function')throw Error('بارگذار سرویس پروفایل در boot.js آماده نشده است.');
 try{
   const api=await window.ElaraLoadSocial({retry});
   if(!api||typeof api.saveProfileValues!=='function')throw Error('ماژول Social بارگذاری شد اما سرویس canonical ذخیرهٔ پروفایل در دسترس نیست.');
   return api
 }catch(error){
   console.error('Elara profile persistence readiness:',error);
   throw error
 }
}
function profileServiceError(error){
 const message=String(error?.message||error||'خطای نامشخص').replace(/\s+/g,' ').slice(0,220);
 return 'بارگذاری سرویس پروفایل ناموفق بود: '+message+' برای تلاش دوباره «ذخیره تغییرات» را بزن.'
}
async function openEditor({galleryOpen=false}={}){
 const person=window.ElaraSocial?.me||window.ElaraAccount?.profile||{};if(!window.ElaraDialog?.open)throw Error('پنجرهٔ ویرایش پروفایل آماده نیست.');
 const form=document.createElement('form');form.className='pass4-profile-edit-form';form.id='elara-central-profile-form';
 const editView=viewModel(person,{self:true}),wardrobe=readWardrobe(),privateProfile=readPrivate(),userLevel=Math.max(1,Number(editView?.level)||1);let pendingPhotos=null,pendingAvatar=null;
 const editPreview=editView?'<div class="pass5-profile-edit-preview">'+composition(editView,{compact:true})+'</div>':'';
 form.innerHTML='<div class="pass4-profile-edit-actions pass4-profile-edit-actions-top"><button class="primary-button" type="submit">ذخیره تغییرات</button></div>'+editPreview+
 '<div class="profile-avatar-source-actions"><details class="profile-avatar-gallery" '+(galleryOpen?'open':'')+'><summary><span>گالری پروفایل</span><small>انتخاب آواتار آمادهٔ Elara</small></summary><div class="profile-avatar-gallery-body" data-profile-avatar-gallery-content></div></details><label class="profile-device-photo-button"><span>عکس از گالری دستگاه</span><small>PNG · JPG · WEBP</small><input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label></div>'+
 '<div class="profile-photo-controls sr-only" aria-hidden="true"><div class="profile-photo-mode"><label><input type="radio" name="photoMode" value="elara" '+(wardrobe.photoMode!=='upload'?'checked':'')+'> آواتار Elara</label><label><input type="radio" name="photoMode" value="upload" '+(wardrobe.photoMode==='upload'?'checked':'')+'> عکس آپلودی</label></div></div>'+
 '<label>نام نمایشی<input name="name" maxlength="60" required value="'+esc(person.name||'')+'"></label><label>نام کاربری<input name="username" maxlength="20" pattern="[a-z][a-z0-9_]{2,19}" required value="'+esc(person.username||'')+'"></label><label class="pass4-bio-field"><span><img class="pass4-bio-art" src="assets/ui/icon_bio_feather.webp" alt="" decoding="async">Bio</span><textarea name="bio" maxlength="300" rows="4" placeholder="دربارهٔ خودت…">'+esc(person.bio||'')+'</textarea></label><div class="profile-appearance-controls"><label>شکل تصویر<select name="shape"><option value="circle" '+(wardrobe.shape==='circle'?'selected':'')+'>Circle</option><option value="square" '+(wardrobe.shape==='square'?'selected':'')+'>Square</option></select></label><label>فونت نام<select name="nameFont">'+Object.entries(NAME_FONTS).map(([k])=>'<option value="'+k+'" '+(wardrobe.nameFont===k?'selected':'')+'>'+({default:'پیش‌فرض',vazir:'خوانا',classic:'Classic',clean:'Clean',soft:'Soft'}[k])+'</option>').join('')+'</select></label><label>اطلاعات پروفایل<select name="sex"><option value="" '+(!privateProfile.sex?'selected':'')+'>تکمیل نشده</option><option value="female" '+(privateProfile.sex==='female'?'selected':'')+'>زن</option><option value="male" '+(privateProfile.sex==='male'?'selected':'')+'>مرد</option><option value="other" '+(privateProfile.sex==='other'?'selected':'')+'>سایر / ترجیح می‌دهم نگویم</option></select></label></div><label class="pass4-profile-public"><input name="profilePublic" type="checkbox" '+(person.profilePublic!==false?'checked':'')+'> پروفایل عمومی من برای کاربران واردشده قابل مشاهده باشد</label><p class="muted" role="status" data-profile-edit-status></p>';
 const status=()=>form.querySelector('[data-profile-edit-status]'),galleryHost=()=>form.querySelector('[data-profile-avatar-gallery-content]'),saveButton=()=>form.querySelector('[type=submit]');
 let profileBusy=0,serviceFailed=false;
 const setBusy=delta=>{profileBusy=Math.max(0,profileBusy+delta);const button=saveButton();if(button)button.disabled=profileBusy>0};
 const prepareService=async({retry=false,quiet=false}={})=>{
   if(window.ElaraSocial&&typeof window.ElaraSocial.saveProfileValues==='function'){serviceFailed=false;return window.ElaraSocial}
   setBusy(1);if(!quiet)status().textContent='در حال آماده‌سازی سرویس پروفایل…';
   try{const api=await canonicalProfileService({retry});serviceFailed=false;if(!quiet&&status().textContent==='در حال آماده‌سازی سرویس پروفایل…')status().textContent='';return api}
   catch(error){serviceFailed=true;status().textContent=profileServiceError(error);throw error}
   finally{setBusy(-1)}
 };
 const galleryChoice=()=>pendingAvatar||((wardrobe.photoMode!=='upload'&&wardrobe.avatarGroup&&wardrobe.avatarLevel)?{group:wardrobe.avatarGroup,level:wardrobe.avatarLevel}:null);
 const setPreviewShape=shape=>{
   const root=form.querySelector('.elara-profile-composition'),shell=form.querySelector('[data-avatar-shell]');if(root){root.classList.toggle('profile-shape-circle',shape==='circle');root.classList.toggle('profile-shape-square',shape==='square');root.dataset.profileShape=shape}if(shell)shell.dataset.profileShape=shape;
   const frame=form.querySelector('[data-avatar-frame]');if(frame&&wardrobe.frame)frame.src=frameVariantPath(wardrobe.frame,shape)
 };
 const setPreviewAvatar=src=>{
   const shell=form.querySelector('[data-avatar-shell]');if(!shell||!src)return;let image=shell.querySelector('[data-avatar-image]');
   if(image?.tagName==='IMG'){image.hidden=false;image.src=src;return}
   const img=document.createElement('img');img.dataset.profileAsset='';img.dataset.avatarImage='';img.className='elara-profile-avatar-img';img.alt='';img.src=src;if(image)image.replaceWith(img);else shell.prepend(img)
 };
 const renderGallery=()=>{
   const host=galleryHost();if(!host)return;const shape=form.elements.shape.value||wardrobe.shape||'circle',chosen=galleryChoice();
   const group=(id,label)=>'<section class="profile-avatar-gallery-group"><header><strong>'+label+'</strong><small>سطح '+userLevel.toLocaleString('fa-IR')+'</small></header><div class="profile-avatar-gallery-grid">'+Array.from({length:10},(_,i)=>{const n=i+1,locked=!canEquipAvatar(id,n,userLevel),active=chosen?.group===id&&Number(chosen?.level)===n,src=avatarPath(id,n,shape);return '<button type="button" class="profile-avatar-gallery-item '+(locked?'is-locked ':'')+(active?'is-active':'')+'" data-profile-avatar-choice="'+id+':'+n+'" data-required="'+n+'" aria-pressed="'+active+'" '+(locked?'aria-disabled="true"':'')+'><img src="'+esc(src)+'" alt=""><span>Lv.'+n.toLocaleString('fa-IR')+'</span>'+(locked?'<em>قفل</em>':'')+'</button>'}).join('')+'</div></section>';
   host.innerHTML=group('female','آواتارهای زنانه')+group('male','آواتارهای مردانه')
 };
 renderGallery();setPreviewShape(form.elements.shape.value);
 form.addEventListener('click',e=>{
   const choice=e.target.closest('[data-profile-avatar-choice]');if(!choice)return;e.preventDefault();const [group,rawLevel]=choice.dataset.profileAvatarChoice.split(':'),avatarLevel=Number(rawLevel);
   if(!canEquipAvatar(group,avatarLevel,userLevel)){status().textContent='این آواتار از سطح '+avatarLevel.toLocaleString('fa-IR')+' باز می‌شود.';return}
   pendingAvatar={group,level:avatarLevel};pendingPhotos=null;form.elements.photoMode.value='elara';setPreviewAvatar(avatarPath(group,avatarLevel,form.elements.shape.value));renderGallery();status().textContent='آواتار انتخاب شد؛ برای ثبت نهایی «ذخیره تغییرات» را بزن.'
 });
 form.elements.photo.addEventListener('change',async()=>{try{pendingPhotos=await photoVariants(form.elements.photo.files?.[0]);pendingAvatar=null;form.elements.photoMode.value='upload';status().textContent='پیش‌نمایش عکس آماده شد؛ ذخیره را بزن.';setPreviewAvatar(form.elements.shape.value==='square'?pendingPhotos.photoSquare:pendingPhotos.photoCircle);renderGallery()}catch(error){pendingPhotos=null;status().textContent=error.message;form.elements.photo.value=''}});
 form.elements.shape.addEventListener('change',()=>{const shape=form.elements.shape.value;setPreviewShape(shape);if(pendingPhotos)setPreviewAvatar(shape==='square'?pendingPhotos.photoSquare:pendingPhotos.photoCircle);else{const choice=galleryChoice();if(choice)setPreviewAvatar(avatarPath(choice.group,choice.level,shape))}renderGallery()});
 form.addEventListener('submit',async e=>{
   e.preventDefault();setBusy(1);
   try{
     const social=await prepareService({retry:serviceFailed});
     status().textContent='در حال ذخیره…';
     const result=await social.saveProfileValues({name:form.elements.name.value,username:form.elements.username.value,bio:form.elements.bio.value,profilePublic:form.elements.profilePublic.checked});
     writeWardrobe({shape:form.elements.shape.value,nameFont:form.elements.nameFont.value,photoMode:form.elements.photoMode.value,...(pendingPhotos||{}),...(pendingAvatar?{avatarGroup:pendingAvatar.group,avatarLevel:pendingAvatar.level}:{})});
     writePrivate({sex:form.elements.sex.value});
     if(result?.warnings?.length){status().textContent=result.warnings.join(' ');return}
     status().textContent='پروفایل ذخیره شد.';window.dispatchEvent(new Event('elara:profile-saved'));window.ElaraDialog.close()
   }catch(err){
     if(serviceFailed)return;
     status().textContent=err?.code==='permission-denied'?'Firestore اجازهٔ این تغییر را نداد؛ Rules واقعی باید جداگانه منتشر و آزمون شوند.':(err?.message||String(err))
   }finally{setBusy(-1)}
 });
 const dialogPromise=window.ElaraDialog.open({title:'ویرایش پروفایل',content:form,wide:false,actions:[{label:'انصراف',value:false}]});
 void prepareService().catch(()=>{});
 return dialogPromise;
}
document.addEventListener('error',e=>{const img=e.target;if(img?.matches?.('img[data-profile-asset]'))img.hidden=true},true);
async function openAvatarViewer(trigger){const compositionRoot=trigger?.closest?.('.elara-profile-composition'),img=compositionRoot?.querySelector?.('.elara-profile-avatar-img');if(!img?.src||img.hidden)return false;const name=compositionRoot.querySelector('.elara-display-name')?.textContent?.trim()||'Elara',figure=document.createElement('figure');figure.className='profile-fullscreen-viewer';figure.innerHTML='<img src="'+esc(img.src)+'" alt="'+esc(name)+'"><figcaption data-elara-ugc dir="auto">'+esc(name)+'</figcaption>';await window.ElaraDialog?.open?.({title:document.documentElement.lang==='en'?'Profile photo':'عکس پروفایل',content:figure,wide:true,actions:[{label:document.documentElement.lang==='en'?'Close':'بستن',value:false}]});return true}
document.addEventListener('click',async e=>{const bubble=e.target.closest?.('[data-profile-status-link]');if(bubble){e.preventDefault();window.ElaraOpen?.('page',{history:'push'});return}const avatarButton=e.target.closest?.('[data-profile-avatar-view]');if(avatarButton){e.preventDefault();await openAvatarViewer(avatarButton);return}const pageButton=e.target.closest?.('[data-profile-page-link]');if(pageButton){e.preventDefault();const target=pageButton.dataset.profilePageLink,name=pageButton.dataset.profilePageName||'';if(!target||typeof window.ElaraPage?.viewUser!=='function')return;await window.ElaraPage.viewUser(target,{uid:target,name});window.ElaraDialog?.close?.();window.ElaraOpen?.('page',{history:'push'});}});
window.ElaraProfileSystem={PREFIX,PRIVATE_PREFIX,TITLES,FRAMES,BANNERS,PROFILE_THEMES,SHAPES,NAME_FONTS,currentUid,key,privateKey,readPrivate,writePrivate,readWardrobe,writeWardrobe,normalizeWardrobe,avatarPath,frameVariantPath,frameBy,bannerBy,profileThemeBy,frameForLevel,canEquipAvatar,canEquipFrame,canEquipBanner,publicWardrobe,viewModel,avatarShell,composition,openEditor,openAvatarViewer,photoVariants,titleForLevel,levelFromXp,activeStatus,statusLabel,canonicalProfileService};
})();