/* Elara Store v1: real repo assets only. Economy is intentionally non-authoritative until a server ledger exists. */
(()=>{'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>document.documentElement.lang==='en'?'en':'fa',tx=(fa,en)=>lang()==='en'?en:fa;
let category='all',query='',sort='default',filterOpen=false;
let checkedKinds=new Set(['avatar','banner','frame','profileTheme']);
const tabs=[
 ['all','همه','All','▦'],['avatars','آواتار','Avatars','♙'],['backgrounds','بک‌گراند','Backgrounds','▧'],
 ['frames','فریم پروفایل','Profile frames','▣'],['themes','تم‌ها','Themes','⬡'],
 ['icons','آیکون‌ها','Icons','✧'],['stickers','استیکرها','Stickers','❀'],['special','پکیج‌های ویژه','Special picks','✦']
];
const extraCats=[
 ['owned','دارایی‌های من','My wardrobe'],['banners','بنرها','Banners'],['profiles','اسکین / پروفایل','Skins / Profiles'],
 ['status','استاتوس','Status'],['page','پیج','Page'],['seasonal','فصلی','Seasonal'],
 ['events','ایونت‌ها','Events'],['elite','الایت','Elite'],['tokens','توکن‌ها','Tokens']
];
const cats=[...tabs,...extraCats,['featured','منتخب','Featured']];
const kindTitles={avatar:['آواتار','Avatar'],banner:['بک‌گراند','Background'],frame:['فریم پروفایل','Profile frame'],profileTheme:['تم پروفایل','Profile theme'],current:['دارایی‌های من','Wardrobe']};
const kinds=['avatar','banner','frame','profileTheme'];
const kindLabel=k=>tx(...(kindTitles[k]||[k,k]));
function wishKey(){return 'elara-store-wishlist-browser-v1'}
function wishList(){try{const value=JSON.parse(window.ElaraCloudStorage.getItem(wishKey())||'[]');return Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,250):[]}catch{return[]}}
function hasWish(kind,id){return wishList().includes(kind+':'+id)}
function setWish(kind,id){const key=kind+':'+id;const items=new Set(wishList());items.has(key)?items.delete(key):items.add(key);try{window.ElaraCloudStorage.setItem(wishKey(),JSON.stringify([...items]))}catch{};render()}
const themeAssets=()=>system()?.PROFILE_THEMES||[];
const seasonalFamilies=['Colorways','Animals / Masks','Suit','Zombie','Street / Gang','Mafia','Mommy / Daddy','Birds','Technology','Leather','Prison','Doctor','Engineering','Scientist','Marine','Mermaid','Princess','Blogger','Librarian','Gaming','Minecraft-inspired','Original tactical / shooter'];
function system(){return window.ElaraProfileSystem}
function level(){const s=system();return Number(s?.viewModel?.(window.ElaraSocial?.me||window.ElaraAccount?.profile||{},{self:true})?.level||1)}
function wardrobe(){return system()?.readWardrobe?.()||{shape:'circle'}}
function art(src,label){return '<img class="store-art" src="'+esc(src)+'" alt="'+esc(label)+'" loading="lazy" decoding="async">'}
function locked(required){return level()<Number(required||1)}
function product({kind,id,label,sub,src,required=1,equipped=false,action='equip',badge=''}) {
 const isLocked=locked(required),notForEquip=kind==='current'||action==='gated';
 const disabled=isLocked||notForEquip,liked=hasWish(kind,id);
 const reason=equipped?tx('انتخاب‌شده','Equipped'):isLocked?tx('قفل سطح '+required,'Level '+required+' locked'):notForEquip?tx('فقط پیش‌نمایش','Preview only'):tx('قابل انتخاب','Available to equip');
 return '<article class="store-product '+(equipped?'is-equipped ':'')+(disabled?'is-locked':'')+'" data-store-kind="'+esc(kind)+'" data-store-id="'+esc(id)+'" data-store-label="'+esc(label)+'" data-store-sub="'+esc(sub||'')+'" data-store-src="'+esc(src||'')+'" data-store-required="'+Number(required||1)+'" data-store-status="'+esc(reason)+'">'+
 '<div class="store-product-media">'+
 '<button type="button" class="store-product-preview" data-store-preview aria-label="'+esc(tx('پیش‌نمایش ','Preview ')+label)+'">'+(src?art(src,label):'<span class="store-product-fallback">✦</span>')+'</button>'+
 '<button type="button" class="store-heart" data-store-wish aria-label="'+esc(liked?tx('حذف از علاقه‌مندی','Remove favorite'):tx('افزودن به علاقه‌مندی','Add favorite'))+'" aria-pressed="'+liked+'">'+(liked?'♥':'♡')+'</button>'+
 (badge?'<em>'+esc(badge)+'</em>':'')+'</div>'+
 '<div class="store-product-copy"><strong title="'+esc(label)+'">'+esc(label)+'</strong><small>'+esc(kindLabel(kind))+'</small><span>'+esc(reason)+'</span></div>'+
 '<div class="store-card-actions"><button type="button" class="store-card-preview" data-store-preview>'+tx('نمایش','Preview')+'</button>'+
 '<button type="button" data-store-equip="'+esc(kind)+'" data-store-id="'+esc(id)+'" '+(disabled?'disabled':'')+'>'+esc(equipped?tx('انتخاب شده','Equipped'):isLocked?tx('قفل سطح','Locked'):notForEquip?tx('فعلاً غیرفعال','Unavailable'):tx('انتخاب','Equip'))+'</button></div>'+
 '</article>';
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
 if(category==='all')return profileProducts()+bannerProducts()+frameProducts()+themeProducts();
 if(category==='avatars'||category==='profiles')return profileProducts();
 if(category==='backgrounds'||category==='banners')return bannerProducts();
 if(category==='frames')return frameProducts();
 if(category==='themes')return themeProducts();
 if(category==='special'||category==='featured')return featured();
 if(category==='owned')return owned();
 if(category==='seasonal')return seasonal();
 if(['icons','stickers'].includes(category))return '<p class="store-empty">'+tx('هنوز آیتم تأییدشده‌ای در این دسته منتشر نشده است.','No approved assets have been published in this category yet.')+'</p>';
 if(['status','page'].includes(category))return assetPending(category);
 if(['events','elite','tokens'].includes(category))return gatedSection(category);
 return '';
}
function filterCounts(){
 const s=system();return {avatar:s?20:0,banner:s?.BANNERS?.length||0,frame:s?.FRAMES?.length||0,profileTheme:s?.PROFILE_THEMES?.length||0}
}
function filtersHtml(){
 const counts=filterCounts();
 return '<aside id="store-filter-panel" class="store-filter-panel '+(filterOpen?'is-open':'')+'" aria-label="'+tx('فیلترهای فروشگاه','Store filters')+'">'+
 '<header class="store-filter-heading"><strong>☷ '+tx('فیلترها','Filters')+'</strong><button class="store-reset" type="button" data-store-reset>'+tx('پاک کردن همه','Clear all')+'</button><button type="button" class="store-filter-close" data-store-filter-close aria-label="'+tx('بستن فیلتر','Close filters')+'">✕</button></header>'+
 '<fieldset><legend>'+tx('دسته‌بندی','Categories')+'</legend>'+kinds.map(kind=>'<label class="store-filter-option"><span><input type="checkbox" data-store-filter-kind="'+kind+'" '+(checkedKinds.has(kind)?'checked':'')+'>'+esc(kindLabel(kind))+'</span><em>'+Number(counts[kind]).toLocaleString(lang()==='en'?'en-US':'fa-IR')+'</em></label>').join('')+'</fieldset>'+
 '<p class="store-filter-note">'+tx('فیلتر سبک، رنگ و قیمت تنها پس از ثبت اطلاعات معتبر هر آیتم فعال خواهد شد.','Style, color and price filters will become available when verified item metadata exists.')+'</p>'+
 '<button type="button" class="store-filter-apply" data-store-filter-close>'+tx('نمایش نتایج','Show results')+'</button></aside>';
}
function isWideCategory(){return ['seasonal','status','page','events','elite','tokens'].includes(category)}
function render(){
 const host=$('#panel-store');if(!host)return;host.classList.add('store-panel');
 const safeQuery=esc(query),options=[['default',tx('ترتیب کاتالوگ','Catalog order')],['name',tx('نام محصول','Name')],['level',tx('سطح: کم به زیاد','Level: low to high')],['level-desc',tx('سطح: زیاد به کم','Level: high to low')]];
 const activeFilter=kinds.length-checkedKinds.size;
 host.innerHTML='<section class="store-hero" data-elara-page-hero="store"><div class="store-hero-content"><small>ELARA · COSMETIC STORE</small>'+
 '<h1>'+tx('فروشگاه الارا','Elara Store')+'</h1><p>'+tx('آواتارها، بک‌گراندها، فریم‌ها و آیتم‌های خاص برای ساختن دنیای شخصی شما','Avatars, backgrounds, frames and special items for your personal universe')+'</p>'+
 '<button class="store-hero-cta" type="button" data-store-category="special">'+tx('آیتم‌های خاص ✨','Special items ✨')+'</button></div></section>'+
 '<nav class="store-tabs" aria-label="'+tx('دسته‌های فروشگاه','Store categories')+'">'+tabs.map(([key,fa,en,icon])=>'<button type="button" data-store-category="'+key+'" class="'+(category===key?'active':'')+'" aria-pressed="'+(category===key)+'"><span class="store-tab-icon" aria-hidden="true">'+icon+'</span>'+tx(fa,en)+'</button>').join('')+
 '<details class="store-more"><summary>'+tx('بیشتر ▾','More ▾')+'</summary><div>'+extraCats.map(([key,fa,en])=>'<button type="button" data-store-category="'+key+'" class="'+(category===key?'active':'')+'">'+tx(fa,en)+'</button>').join('')+'</div></details></nav>'+
 '<div class="store-main">'+filtersHtml()+'<div class="store-results">'+
 '<div class="store-toolbar"><button type="button" class="store-filter-open" data-store-filter-open aria-expanded="'+filterOpen+'">'+tx('☷ فیلترها','☷ Filters')+(activeFilter?' ('+activeFilter+')':'')+'</button>'+
 '<label class="store-toolbar-search"><span aria-hidden="true">⌕</span><input data-store-search type="search" placeholder="'+tx('جستجو در آیتم‌ها…','Search items…')+'" aria-label="'+tx('جستجوی محصولات','Search products')+'" value="'+safeQuery+'"></label>'+
 '<select data-store-sort aria-label="'+tx('مرتب‌سازی','Sort')+'">'+options.map(([key,label])=>'<option value="'+key+'" '+(sort===key?'selected':'')+'>'+label+'</option>').join('')+'</select>'+
 '<span class="store-count" aria-live="polite"></span></div>'+
 '<section class="store-catalog '+(isWideCategory()?'store-catalog-wide':'')+'" aria-label="'+tx('محصولات واقعی','Real products')+'">'+body()+'</section></div></div>'+
 '<aside class="store-policy-note">'+tx('فروشگاه فعلاً فقط پیش‌نمایش و انتخاب آیتم‌های واقعی را ارائه می‌دهد. پرداخت، توکن و خرید اشتراکی بدون Backend معتبر فعال نیستند. علاقه‌مندی‌ها فقط روی همین مرورگر ذخیره می‌شوند.','The store currently supports preview and equip of real assets only. Payments, tokens and subscriptions require a verified backend. Favorites are stored privately in this browser only.')+'</aside>';
 if($('#page-title'))$('#page-title').textContent=tx('فروشگاه','Store');
 applyFilters()
}
function applyFilters(){
 const host=$('#panel-store');if(!host)return;
 const grid=host.querySelector('.store-catalog');if(!grid)return;
 const cards=[...grid.querySelectorAll('.store-product')],term=query.trim().toLocaleLowerCase();
 for(const card of cards){
  const kind=card.dataset.storeKind,words=(card.dataset.storeLabel+' '+card.dataset.storeSub+' '+kindLabel(kind)).toLocaleLowerCase();
  const matches=words.includes(term)&&(category!=='all'||checkedKinds.has(kind))&&(category==='all'?checkedKinds.has(kind):true);
  card.style.display=matches?'':'none';
 }
 const visible=cards.filter(c=>c.style.display!=='none');
 if(sort!=='default'){
  const sorted=visible.slice().sort((a,b)=>sort==='name'?a.dataset.storeLabel.localeCompare(b.dataset.storeLabel,lang()==='en'?'en':'fa'):sort==='level-desc'?Number(b.dataset.storeRequired)-Number(a.dataset.storeRequired):Number(a.dataset.storeRequired)-Number(b.dataset.storeRequired));
  sorted.forEach(card=>grid.append(card));
 }
 const count=host.querySelector('.store-count');
 if(count)count.textContent=cards.length?visible.length.toLocaleString(lang()==='en'?'en-US':'fa-IR')+' '+tx('آیتم','items'):'';
 let empty=grid.querySelector('[data-store-no-results]');
 if(!visible.length&&cards.length&&!empty){empty=document.createElement('p');empty.className='store-empty';empty.dataset.storeNoResults='';grid.append(empty)}
 if(empty){empty.textContent=tx('موردی مطابق جستجو و فیلترها پیدا نشد.','No items match these filters.');empty.hidden=!!visible.length;empty.style.display=visible.length?'none':''}
}
let previewFocus=null;
function showPreview(card){
 if(!card)return;previewFocus=document.activeElement;
 let dialog=document.getElementById('store-preview-dialog');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='store-preview-dialog';dialog.className='store-preview-dialog';dialog.addEventListener('close',()=>previewFocus?.focus?.());document.body.append(dialog)}
 const kind=card.dataset.storeKind,id=card.dataset.storeId,name=card.dataset.storeLabel,sub=card.dataset.storeSub,src=card.dataset.storeSrc,status=card.dataset.storeStatus,required=Number(card.dataset.storeRequired)||1;
 const canEquip=kind!=='current'&&!locked(required)&&['avatar','banner','frame','profileTheme'].includes(kind);
 dialog.innerHTML='<header><h2>'+esc(name)+'</h2><button type="button" class="store-preview-close" data-store-preview-close aria-label="'+tx('بستن','Close')+'">✕</button></header>'+
 (src?'<img src="'+esc(src)+'" alt="'+esc(name)+'">':'')+
 '<p>'+esc(sub)+'<br>'+esc(status)+(required>1?' · Level '+required:'')+'</p>'+
 '<button type="button" class="store-preview-equip" data-store-equip="'+esc(kind)+'" data-store-id="'+esc(id)+'" '+(canEquip?'':'disabled')+'>'+tx(canEquip?'انتخاب آیتم':'انتخاب فعلاً مجاز نیست',canEquip?'Equip item':'Cannot equip yet')+'</button>';
 if(!dialog.open)dialog.showModal();
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
 const button=e.target.closest('[data-store-category]');
 if(button){category=button.dataset.storeCategory;checkedKinds=new Set(kinds);query='';sort='default';filterOpen=false;render();return}
 const wish=e.target.closest('[data-store-wish]');
 if(wish){const card=wish.closest('.store-product');if(card)setWish(card.dataset.storeKind,card.dataset.storeId);return}
 const preview=e.target.closest('[data-store-preview]');
 if(preview){showPreview(preview.closest('.store-product'));return}
 if(e.target.closest('[data-store-preview-close]')){document.getElementById('store-preview-dialog')?.close();return}
 const equipButton=e.target.closest('[data-store-equip]');
 if(equipButton){document.getElementById('store-preview-dialog')?.close();equip(equipButton.dataset.storeEquip,equipButton.dataset.storeId);return}
 if(e.target.closest('[data-store-filter-open]')){filterOpen=true;const panel=$('#store-filter-panel');panel?.classList.add('is-open');$('#panel-store .store-filter-open')?.setAttribute('aria-expanded','true');panel?.querySelector('[data-store-filter-close]')?.focus();return}
 if(e.target.closest('[data-store-filter-close]')){filterOpen=false;$('#store-filter-panel')?.classList.remove('is-open');$('#panel-store .store-filter-open')?.setAttribute('aria-expanded','false');$('#panel-store .store-filter-open')?.focus();return}
 if(e.target.closest('[data-store-reset]')){checkedKinds=new Set(kinds);query='';sort='default';category='all';filterOpen=false;render();return}
});
document.addEventListener('input',e=>{
 if(e.target.matches('[data-store-search]')){query=e.target.value;applyFilters()}
});
document.addEventListener('change',e=>{
 if(e.target.matches('[data-store-sort]')){sort=e.target.value;render()}
 if(e.target.matches('[data-store-filter-kind]')){
  const kind=e.target.dataset.storeFilterKind;checkedKinds.has(kind)?checkedKinds.delete(kind):checkedKinds.add(kind);
  category='all';const wasOpen=filterOpen;render();if(wasOpen)$('#store-filter-panel [data-store-filter-kind="'+kind+'"]')?.focus();
 }
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&filterOpen){filterOpen=false;$('#store-filter-panel')?.classList.remove('is-open');$('#panel-store .store-filter-open')?.setAttribute('aria-expanded','false');$('#panel-store .store-filter-open')?.focus()}
});

for(const ev of ['elara:wardrobe-changed','elara:locale-changed','elara:account-ready'])window.addEventListener(ev,()=>{if(location.hash==='#store')setTimeout(render,0)});
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='store')render()});
const start=()=>{if(location.hash==='#store')render()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ElaraStore={render,get category(){return category},setCategory:value=>{if(cats.some(x=>x[0]===value)){category=value;checkedKinds=new Set(kinds);render()}}};
})();