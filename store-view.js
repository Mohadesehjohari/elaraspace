/* Elara Store v1: real repo assets only. Economy is intentionally non-authoritative until a server ledger exists. */
(()=>{'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>document.documentElement.lang==='en'?'en':'fa',tx=(fa,en)=>lang()==='en'?en:fa;
let category='featured';
const cats=[
 ['featured','ویژه','Featured'],['themes','تم‌ها','Themes'],['profiles','اسکین / پروفایل','Skins / Profiles'],['frames','قاب‌ها','Frames'],['banners','بنرها','Banners'],
 ['status','استاتوس','Status'],['page','پیج','Page'],['seasonal','سیزنی','Seasonal'],['owned','دارایی‌های من','Owned'],['events','ایونت‌ها','Events'],['elite','الایت','Elite'],['tokens','توکن','Tokens']
];
const themeAssets=()=>system()?.PROFILE_THEMES||[];
const seasonalFamilies=['Colorways','Animals / Masks','Suit','Zombie','Street / Gang','Mafia','Mommy / Daddy','Birds','Technology','Leather','Prison','Doctor','Engineering','Scientist','Marine','Mermaid','Princess','Blogger','Librarian','Gaming','Minecraft-inspired','Original tactical / shooter'];
function system(){return window.ElaraProfileSystem}
function level(){const s=system();return Number(s?.viewModel?.(window.ElaraSocial?.me||window.ElaraAccount?.profile||{},{self:true})?.level||1)}
function wardrobe(){return system()?.readWardrobe?.()||{shape:'circle'}}
function art(src,label){return '<img class="store-art" src="'+esc(src)+'" alt="'+esc(label)+'" loading="lazy" decoding="async">'}
function locked(required){return level()<Number(required||1)}
function product({kind,id,label,sub,src,required=1,equipped=false,action='equip',badge=''}) {
 const isLocked=locked(required),disabled=isLocked||action==='gated';
 return '<article class="store-product '+(equipped?'is-equipped ':'')+(disabled?'is-locked':'')+'" data-store-kind="'+esc(kind)+'" data-store-id="'+esc(id)+'">'+
  '<div class="store-product-media">'+(src?art(src,label):'<span class="store-product-fallback">✦</span>')+(badge?'<em>'+esc(badge)+'</em>':'')+'</div>'+
  '<div class="store-product-copy"><strong>'+esc(label)+'</strong><small>'+esc(sub||'')+'</small>'+(required>1?'<span>Level '+required+'</span>':'')+'</div>'+
  (action==='gated'?'<button type="button" disabled>'+tx('نیازمند Backend','Backend required')+'</button>':
   '<button type="button" data-store-equip="'+esc(kind)+'" data-store-id="'+esc(id)+'" '+(isLocked?'disabled':'')+'>'+(equipped?tx('انتخاب شده','Equipped'):tx('انتخاب','Equip'))+'</button>')+
 '</article>'
}
function frameProducts(){
 const s=system(),w=wardrobe();return (s?.FRAMES||[]).map(f=>product({kind:'frame',id:f.id,label:f.label,sub:tx('قاب پروفایل هماهنگ با شکل آواتار','Profile frame synced to avatar shape'),src:s.frameVariantPath(f.id,w.shape||'circle'),required:f.required,equipped:w.frame===f.id})).join('')
}
function bannerProducts(){
 const s=system(),w=wardrobe();return (s?.BANNERS||[]).map(b=>product({kind:'banner',id:b.id,label:b.label,sub:tx('بنر واقعی موجود در کمد','Real banner already in the wardrobe'),src:b.path,required:b.required,equipped:w.banner===b.id})).join('')
}
function profileProducts(){
 const s=system(),w=wardrobe(),shape=w.shape||'circle';if(!s)return'';
 const rows=[];for(const group of ['female','male'])for(let n=1;n<=10;n++)rows.push(product({kind:'avatar',id:group+':'+n,label:(group==='female'?tx('آواتار زنانه ','Female avatar '):tx('آواتار مردانه ','Male avatar '))+n,sub:tx('دارایی واقعی Elara · '+shape,'Real Elara asset · '+shape),src:s.avatarPath(group,n,shape),required:n,equipped:w.avatarGroup===group&&Number(w.avatarLevel)===n}));
 return rows.join('')
}
function themeProducts(){const w=wardrobe();return themeAssets().map(item=>product({kind:'profileTheme',id:item.id,label:item.label,sub:tx('تم کانتینر و نام پروفایل با Asset واقعی مخزن','Profile container and name theme using a real repository asset'),src:item.path,equipped:w.profileTheme===item.id})).join('')}
function owned(){
 const s=system(),w=wardrobe(),v=s?.viewModel?.(window.ElaraSocial?.me||window.ElaraAccount?.profile||{},{self:true});
 if(!s||!v)return '<p class="store-empty">'+tx('پروفایل هنوز آماده نیست.','Profile is not ready yet.')+'</p>';
 const rows=[];
 if(v.avatarSrc)rows.push(product({kind:'current',id:'avatar',label:tx('آواتار فعلی','Current avatar'),sub:tx('انتخاب فعلی پروفایل','Current profile selection'),src:v.avatarSrc,equipped:true}));
 if(v.frameSrc)rows.push(product({kind:'current',id:'frame',label:v.frameLabel,sub:tx('قاب مجهز','Equipped frame'),src:v.frameSrc,equipped:true}));
 if(v.bannerSrc)rows.push(product({kind:'current',id:'banner',label:v.bannerLabel,sub:tx('بنر مجهز','Equipped banner'),src:v.bannerSrc,equipped:true}));
 if(v.profileThemeSrc)rows.push(product({kind:'current',id:'profileTheme',label:v.profileThemeLabel,sub:tx('تم پروفایل مجهز','Equipped profile theme'),src:v.profileThemeSrc,equipped:true}));
 return rows.join('')
}
function featured(){
 const s=system(),w=wardrobe(),rows=[];
 const banner=(s?.BANNERS||[]).find(x=>!locked(x.required))||(s?.BANNERS||[])[0],frame=(s?.FRAMES||[]).findLast?.(x=>!locked(x.required))||(s?.FRAMES||[])[0];
 if(banner)rows.push(product({kind:'banner',id:banner.id,label:banner.label,sub:tx('انتخاب ویژهٔ این سطح','Featured for your current level'),src:banner.path,required:banner.required,equipped:w.banner===banner.id,badge:tx('ویژه','Featured')}));
 if(frame)rows.push(product({kind:'frame',id:frame.id,label:frame.label,sub:tx('قاب قابل استفادهٔ فعلی','Available frame for your level'),src:s.frameVariantPath(frame.id,w.shape||'circle'),required:frame.required,equipped:w.frame===frame.id,badge:tx('منتخب','Pick')}));
 rows.push(product({kind:'profileTheme',id:'galaxy',label:'Galaxy',sub:tx('تم پروفایل قابل تجهیز','Equippable profile theme'),src:'assets/ui/theme_galaxy_purple.webp',equipped:w.profileTheme==='galaxy',badge:tx('تم','Theme')}));
 return rows.join('')
}
function gatedSection(kind){
 if(kind==='tokens')return '<section class="store-gated-hero"><span>TOKEN LEDGER</span><h2>'+tx('توکن‌ها واقعی خواهند بود، نه عدد ساختگی','Tokens will be real, never a fake balance')+'</h2><p>'+tx('خرید و موجودی بعد از ledger سروری، تراکنش idempotent و receipt verification فعال می‌شود. موجودی فعلی عمداً «—» است.','Purchases and balance activate only after a server ledger, idempotent transactions and receipt verification. The current balance is intentionally “—”.')+'</p><strong>— TOKEN</strong></section>';
 if(kind==='elite')return '<section class="store-gated-hero"><span>ELARA ELITE</span><h2>'+tx('الایت ماهانه','Monthly Elite')+'</h2><p>'+tx('پروفایل‌ها و cosmeticهای ویژهٔ هر ماه بعد از entitlement و expiry واقعی فعال می‌شوند؛ هیچ مزیت XP/Rank فروشی وجود ندارد.','Monthly profile cosmetics activate after real entitlement and expiry; Elite never sells XP/Rank advantage.')+'</p><button disabled>'+tx('Economy backend در حال آماده‌سازی','Economy backend required')+'</button></section>';
 return '<section class="store-gated-hero"><span>EVENTS</span><h2>'+tx('فعلاً ایونت زنده‌ای منتشر نشده','No live event is published yet')+'</h2><p>'+tx('ایونت واقعی باید زمان، eligibility، reward و claim idempotent داشته باشد. این صفحه event ساختگی نشان نمی‌دهد.','A real event needs timing, eligibility, rewards and idempotent claiming. This page never fabricates events.')+'</p></section>'
}
function assetPending(kind){
 const copy=kind==='status'
  ?[tx('آیتم‌های استاتوس','Status cosmetics'),tx('رنگ، قاب و Theme استاتوس بعد از ورود Assetهای تأییدشده اینجا قرار می‌گیرند. فعلاً آیتم ساختگی نمایش داده نمی‌شود.','Status colors, frames and themes appear here after approved assets are added. No fake item is shown now.')]
  :[tx('آیتم‌های پیج','Page cosmetics'),tx('Avatar، Banner و ظاهر مستقل Page بعد از Asset و ownership واقعی از همین دسته مدیریت می‌شوند.','Independent Page avatars, banners and cosmetics will live here after real assets and ownership are available.')];
 return '<section class="store-gated-hero"><span>'+esc(kind==='status'?'STATUS COSMETICS':'PAGE COSMETICS')+'</span><h2>'+copy[0]+'</h2><p>'+copy[1]+'</p><button type="button" disabled>'+tx('در انتظار Asset تأییدشده','Approved assets required')+'</button></section>'
}
function seasonal(){
 return '<section class="store-seasonal-plan"><header><span>SEASONAL ROTATION</span><h2>'+tx('خانواده‌های تم برای Dropهای فصلی','Theme families for seasonal drops')+'</h2><p>'+tx('فقط asset واقعی که بعداً آپلود و تأیید شود وارد Catalog می‌شود. نام/Asset برندهای ثالث بدون مجوز استفاده نمی‌شود.','Only uploaded, approved assets enter the catalog. Third-party brand names/assets are not used without permission.')+'</p></header><div>'+seasonalFamilies.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></section>'
}
function body(){
 if(category==='featured')return featured();
 if(category==='themes')return themeProducts();
 if(category==='profiles')return profileProducts();
 if(category==='frames')return frameProducts();
 if(category==='banners')return bannerProducts();
 if(category==='owned')return owned();
 if(category==='seasonal')return seasonal();
 if(['status','page'].includes(category))return assetPending(category);
 if(['events','elite','tokens'].includes(category))return gatedSection(category);
 return ''
}
function render(){
 const host=$('#panel-store');if(!host)return;host.classList.add('store-panel');
 host.innerHTML='<section class="store-hero"><div><small>ELARA · COSMETIC STORE</small><h1>'+tx('فروشگاه الارا','Elara Store')+'</h1><p>'+tx('پروفایل، قاب، بنر و تم‌های واقعی؛ آیتم‌های اقتصادی تا Backend واقعی قفل می‌مانند.','Real profile cosmetics, frames, banners and themes; economy features stay gated until the backend is real.')+'</p></div><div class="store-hero-badge"><span>'+tx('سطح','Level')+'</span><strong>'+level().toLocaleString(lang()==='en'?'en-US':'fa-IR')+'</strong></div></section>'+
 '<nav class="store-tabs" aria-label="'+tx('دسته‌های فروشگاه','Store categories')+'">'+cats.map(([id,fa,en])=>'<button type="button" data-store-category="'+id+'" class="'+(id===category?'active':'')+'">'+tx(fa,en)+'</button>').join('')+'</nav>'+
 '<section class="store-catalog '+(['seasonal','status','page','events','elite','tokens'].includes(category)?'store-catalog-wide':'')+'">'+body()+'</section>'+
 '<aside class="store-policy-note">'+tx('فاز فعلی Catalog/Preview/Equip است. خرید پولی، Token، Elite و entitlement بدون سرور واقعی فعال نمی‌شوند.','This phase is Catalog/Preview/Equip. Payments, Tokens, Elite and entitlements stay disabled without a real server ledger.')+'</aside>';
 if($('#page-title'))$('#page-title').textContent=tx('فروشگاه','Store')
}
function equip(kind,id){
 const s=system();if(!s)return;
 if(kind==='frame'){const f=s.frameBy(id);if(!f||!s.canEquipFrame(id,level()))return;s.writeWardrobe({frame:id})}
 else if(kind==='banner'){const b=s.bannerBy(id);if(!b||!s.canEquipBanner(id,level()))return;s.writeWardrobe({banner:id})}
 else if(kind==='avatar'){const [group,nRaw]=String(id).split(':'),n=Number(nRaw);if(!s.canEquipAvatar(group,n,level()))return;s.writeWardrobe({avatarGroup:group,avatarLevel:n,photoMode:'elara'})}
 else if(kind==='profileTheme'){const theme=s.profileThemeBy?.(id);if(!theme)return;s.writeWardrobe({profileTheme:theme.id})}
 render()
}
document.addEventListener('click',e=>{
 const cat=e.target.closest('[data-store-category]');if(cat){category=cat.dataset.storeCategory;render();return}
 const eq=e.target.closest('[data-store-equip]');if(eq){equip(eq.dataset.storeEquip,eq.dataset.storeId);return}
});
for(const ev of ['elara:wardrobe-changed','elara:locale-changed','elara:account-ready'])window.addEventListener(ev,()=>{if(location.hash==='#store')setTimeout(render,0)});
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='store')render()});
const start=()=>{if(location.hash==='#store')render()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ElaraStore={render,get category(){return category},setCategory:value=>{if(cats.some(x=>x[0]===value)){category=value;render()}}};
})();