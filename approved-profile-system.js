/* Shared profile and wardrobe source of truth. Cosmetics stay UID-scoped and local until a real sync contract exists. */
(()=>{'use strict';
const PREFIX='elara_visual_wardrobe_';
const TITLES=['کادت فضا','دیده‌بان ستاره','کاوشگر ماه','مسافر مریخ','مهندس کهکشانی','فرمانده ناوگان','ناوبر کیهانی','ارباب ستاره‌ها','نگهبان کهکشان','اسطورهٔ کیهان'];
const FRAMES=Object.freeze([
 {id:'bronze',label:'برنزی',required:1,path:'assets/frames_bronze.png'},
 {id:'silver',label:'نقره‌ای',required:4,path:'assets/frames_silver.png'},
 {id:'gold',label:'طلایی',required:7,path:'assets/frames_gold.png'},
 {id:'diamond',label:'الماس',required:10,path:'assets/frames_diamond.png'}
].map(Object.freeze));
const BANNERS=Object.freeze([
 {id:'moon',label:'دریاچهٔ ماه',required:1,path:'assets/banner-moon.svg'},
 {id:'dream',label:'درخت رؤیا',required:4,path:'assets/banner-dream.svg'},
 {id:'castle',label:'قلعهٔ ستاره‌ها',required:8,path:'assets/banner-castle.svg'}
].map(Object.freeze));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentUid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
function currentXp(){try{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return Number(window.ElaraSocial?.me?.xp??s?.xp??0)||0}catch{return Number(window.ElaraSocial?.me?.xp||0)||0}}
const levelFromXp=xp=>window.ElaraLevels?.level?.(Number(xp)||0)||Math.min(10,1+Math.floor(Math.sqrt(Math.max(0,Number(xp)||0)/100)));
const titleForLevel=level=>TITLES[Math.min(10,Math.max(1,Number(level)||1))-1];
function avatarPath(group,level){return group==='male'?'assets/avatars-male-level'+level+'.png':group==='female'?'assets/avatars_female_level'+level+'.png':''}
function key(uid=currentUid()||'guest'){return PREFIX+String(uid||'guest')}
function normalizeGroup(value){return value==='male'||value==='female'?value:null}
function normalizeLevel(value){const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=10?n:null}
function frameBy(value){if(!value)return null;const raw=String(value),aliases={'برنزی':'bronze','نقره‌ای':'silver','طلایی':'gold','الماس':'diamond','frames_bronze.png':'bronze','frames_silver.png':'silver','frames_gold.png':'gold','frames_diamond.png':'diamond'};const id=aliases[raw]||raw.replace(/^assets\/frames_|^frames_/,'').replace(/\.png$/,'');return FRAMES.find(x=>x.id===id)||null}
function bannerBy(value){if(!value)return null;const raw=String(value),aliases={'دریاچهٔ ماه':'moon','درخت رؤیا':'dream','قلعهٔ ستاره‌ها':'castle','assets/banner-moon.svg':'moon','assets/banner-dream.svg':'dream','assets/banner-castle.svg':'castle'};const id=aliases[raw]||raw.replace(/^assets\/banner-/,'').replace(/\.svg$/,'');return BANNERS.find(x=>x.id===id)||null}
function normalizeWardrobe(value={}){const raw=value&&typeof value==='object'?value:{};return {avatarGroup:normalizeGroup(raw.avatarGroup),avatarLevel:normalizeLevel(raw.avatarLevel),frame:frameBy(raw.frame)?.id||null,banner:bannerBy(raw.banner)?.id||null}}
function readWardrobe(uid=currentUid()||'guest'){try{return normalizeWardrobe(JSON.parse(localStorage.getItem(key(uid))||'{}'))}catch{return normalizeWardrobe()}}
function writeWardrobe(patch={}){const uid=currentUid()||'guest',next=normalizeWardrobe({...readWardrobe(uid),...patch});localStorage.setItem(key(uid),JSON.stringify(next));window.dispatchEvent(new CustomEvent('elara:wardrobe-changed',{detail:{uid,wardrobe:next}}));return next}
function frameForLevel(level){const n=Math.min(10,Math.max(1,Number(level)||1));return n>=10?FRAMES[3]:n>=7?FRAMES[2]:n>=4?FRAMES[1]:FRAMES[0]}
const canEquipAvatar=(group,avatarLevel,userLevel)=>!!normalizeGroup(group)&&!!normalizeLevel(avatarLevel)&&Number(avatarLevel)<=Number(userLevel||0);
const canEquipFrame=(frame,userLevel)=>{const f=frameBy(frame);return !!f&&f.required<=Number(userLevel||0)};
const canEquipBanner=(banner,userLevel)=>{const b=bannerBy(banner);return !!b&&b.required<=Number(userLevel||0)};
function publicWardrobe(person={}){return normalizeWardrobe({avatarGroup:person.avatarGroup,avatarLevel:person.avatarLevel,frame:person.frame,banner:person.banner})}
function viewModel(person={},opts={}){
 const self=opts.self??(!!currentUid()&&person?.uid===currentUid()),xp=Number(person?.xp??(self?currentXp():0))||0,level=levelFromXp(xp);
 const w=self?readWardrobe():publicWardrobe(person),group=normalizeGroup(w.avatarGroup),avatarLevel=normalizeLevel(w.avatarLevel);
 const avatarAsset=group&&avatarLevel&&canEquipAvatar(group,avatarLevel,level)?avatarPath(group,avatarLevel):'',photo=String(person?.photoURL||(self?window.ElaraAccount?.user?.photoURL:'')||'');
 const frame=frameBy(w.frame),equippedFrame=frame&&canEquipFrame(frame.id,level)?frame:null,banner=bannerBy(w.banner),equippedBanner=banner&&canEquipBanner(banner.id,level)?banner:null;
 const name=String(person?.name||person?.displayName||person?.username||'پروفایل من'),username=String(person?.username||'');
 return {uid:person?.uid||currentUid()||'',self,name,username,bio:String(person?.bio||''),xp,level,title:titleForLevel(level),avatarGroup:group,avatarLevel,avatarSrc:avatarAsset||photo,avatarAssetSrc:avatarAsset,photoURL:photo,frame:equippedFrame?.id||null,frameSrc:equippedFrame?.path||'',frameLabel:equippedFrame?.label||'بدون فریم',banner:equippedBanner?.id||null,bannerSrc:equippedBanner?.path||BANNERS[0].path,bannerLabel:equippedBanner?.label||'پیش‌فرض',initial:(name.trim()[0]||'E').toUpperCase()};
}
function composition(view,opts={}){
 const v=view||viewModel({},{}),compact=opts.compact?' elara-profile-composition-compact':'',avatar=v.avatarSrc?'<img data-profile-asset class="elara-profile-avatar-img" src="'+esc(v.avatarSrc)+'" alt="آواتار '+esc(v.name)+'">':'',frame=v.frameSrc?'<img data-profile-asset class="elara-profile-frame-img" src="'+esc(v.frameSrc)+'" alt="">':'',tier=v.frame||'none';
 const lvl=Math.min(10,Math.max(1,Number(v.level)||1)),floor=(lvl-1)*(lvl-1)*100,ceil=lvl>=10?floor:lvl*lvl*100,progress=lvl>=10?100:Math.max(0,Math.min(100,((Number(v.xp)||0)-floor)/Math.max(1,ceil-floor)*100));
 const next=lvl>=10?'بالاترین سطح':(Math.max(0,ceil-(Number(v.xp)||0))).toLocaleString('fa-IR')+' XP تا سطح بعد';
 const frameChip=v.frame?'<span>'+esc(v.frameLabel)+'</span>':'',bannerChip=v.banner?'<span>'+esc(v.bannerLabel)+'</span>':'';
 return '<div class="elara-profile-composition'+compact+' frame-'+esc(tier)+'" style="--elara-profile-banner:url(\''+esc(v.bannerSrc)+'\')"><div class="elara-profile-avatar-shell"><span class="elara-profile-avatar-fallback">'+esc(v.initial)+'</span>'+avatar+frame+'</div><div class="elara-profile-composition-copy"><div class="elara-profile-identity-line"><div><strong>'+esc(v.name)+'</strong><small>'+(v.username?'@'+esc(v.username)+' · ':'')+esc(v.title)+'</small></div><span class="elara-profile-level-pill">Level '+lvl+'</span></div><div class="elara-profile-xp-row"><span>'+esc(next)+'</span><b>'+Number(v.xp||0).toLocaleString('fa-IR')+' XP</b></div><div class="elara-profile-xp-track" aria-label="پیشرفت سطح"><i style="width:'+progress.toFixed(2)+'%"></i></div><div class="elara-profile-chips">'+frameChip+bannerChip+'</div></div></div>';
}
async function openEditor(){
 const person=window.ElaraSocial?.me||window.ElaraAccount?.profile||{};if(!window.ElaraDialog?.open)throw Error('پنجرهٔ ویرایش پروفایل آماده نیست.');
 const form=document.createElement('form');form.className='pass4-profile-edit-form';form.id='elara-central-profile-form';
 const editView=viewModel(person,{self:true}),editPreview=editView?'<div class="pass5-profile-edit-preview">'+composition(editView,{compact:true})+'</div>':'';
 form.innerHTML=editPreview+'<label>نام نمایشی<input name="name" maxlength="60" required value="'+esc(person.name||'')+'"></label><label>نام کاربری<input name="username" maxlength="20" pattern="[a-z][a-z0-9_]{2,19}" required value="'+esc(person.username||'')+'"></label><label>Bio<textarea name="bio" maxlength="300" rows="4" placeholder="دربارهٔ خودت…">'+esc(person.bio||'')+'</textarea></label><label class="pass4-profile-public"><input name="profilePublic" type="checkbox" '+(person.profilePublic!==false?'checked':'')+'> پروفایل عمومی من برای کاربران واردشده قابل مشاهده باشد</label><div class="pass4-profile-edit-actions"><button class="primary-button" type="submit">ذخیره</button></div><p class="muted" role="status" data-profile-edit-status></p>';
 form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('[type=submit]'),status=form.querySelector('[data-profile-edit-status]');if(typeof window.ElaraSocial?.saveProfileValues!=='function'){status.textContent='سرویس پروفایل هنوز آماده نیست.';return}button.disabled=true;status.textContent='در حال ذخیره…';try{const result=await window.ElaraSocial.saveProfileValues({name:form.elements.name.value,username:form.elements.username.value,bio:form.elements.bio.value,profilePublic:form.elements.profilePublic.checked});if(result?.warnings?.length){status.textContent=result.warnings.join(' ');return}status.textContent='پروفایل ذخیره شد.';window.dispatchEvent(new Event('elara:profile-saved'));window.ElaraDialog.close()}catch(err){status.textContent=err?.code==='permission-denied'?'Firestore اجازهٔ این تغییر را نداد؛ Rules واقعی باید جداگانه منتشر و آزمون شوند.':(err?.message||String(err))}finally{button.disabled=false}});
 return window.ElaraDialog.open({title:'ویرایش پروفایل',content:form,wide:false,actions:[{label:'انصراف',value:false}]});
}
document.addEventListener('error',e=>{const img=e.target;if(img?.matches?.('img[data-profile-asset]'))img.hidden=true},true);
window.ElaraProfileSystem={PREFIX,TITLES,FRAMES,BANNERS,currentUid,key,readWardrobe,writeWardrobe,normalizeWardrobe,avatarPath,frameBy,bannerBy,frameForLevel,canEquipAvatar,canEquipFrame,canEquipBanner,publicWardrobe,viewModel,composition,openEditor,titleForLevel,levelFromXp};
})();