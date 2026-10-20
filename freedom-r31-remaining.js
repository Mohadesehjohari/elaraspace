/* Freedom R31 — replace the three leftover empty standalone pages with real, data-backed dashboards.
 * Keeps the four R30 pages and existing private record editors intact.
 */
(()=>{'use strict';
const panel=()=>document.getElementById('panel-freedom'),assets='assets/ui/';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image=f=>assets+encodeURIComponent(f);
const validImage=x=>{const v=String(x||'');return /^(data:image\/(png|webp|jpeg);base64,|assets\/ui\/|https?:\/\/)/i.test(v)?v:''};
const identity=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'local';
const data=()=>window.ElaraFreedomEnhancements?.read?.()||{};
const save=d=>{const key='elara_freedom_v1_'+identity();try{localStorage.setItem(key,JSON.stringify(d))}catch{return false}window.dispatchEvent(new Event('elara:freedom-changed'));return true};
const when=x=>new Date(x?.updatedAt||x?.at||x?.createdAt||Date.now()).toLocaleDateString('fa-IR');
const fa=n=>Number(n||0).toLocaleString('fa-IR');
const identifier=()=>crypto.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);
const excerpt=x=>String(x?.text||x?.body||'').trim().slice(0,180);
const title=x=>String(x?.title||x?.text||x?.body||'').trim().split(/\r?\n/)[0].slice(0,90)||'بدون عنوان';
const sorted=x=>(Array.isArray(x)?x:[]).slice().sort((a,b)=>Number(b.updatedAt||b.at||b.createdAt||0)-Number(a.updatedAt||a.at||a.createdAt||0));
const groups={
 art:{title:'الهام‌های آفرینش',lead:'آثار هنری، طرح‌ها و جرقه‌های خلاقانه‌ات را در آتلیه شخصی خودت گردآوری کن.',hero:'banner_dream_tree.webp',badge:'◈',art:'Celestial Crystal Spellbook Icon.webp'},
 experiences:{title:'بازتاب‌های من',lead:'سفرها، لحظه‌ها و درس‌های واقعی زندگی‌ات را به داستان‌های ماندگار تبدیل کن.',hero:'banner_city_of_stars.webp',badge:'✦',art:'my_reflection.webp'},
 gallery:{title:'تابلوی رؤیاها',lead:'تمام تصاویر خصوصی ذخیره‌شده در آزادی، در یک مجموعه مرتب و قابل جستجو.',hero:'freedom_banner.webp',badge:'▧',art:'Vision_Board.webp'}
};
const artCats=['همه آثار','نقاشی','طراحی','عکاسی','نویسندگی','موسیقی','دستی‌سازه','دیگر'];
const experienceCats=['همه تجربه‌ها','سفر','یادگیری','زندگی روزمره','موفقیت','چالش','روابط','خاطره'];
const galleryCats=['همه تصاویر','هنر','تجربه','ایده','رؤیا','الهام','یادداشت','خاطره'];
let current='',artFilter=artCats[0],experienceFilter=experienceCats[0],galleryFilter=galleryCats[0],galleryQuery='',editExperience='',refreshQueued=false;
const button=(label,attr,cls='')=>'<button type="button" '+attr+' class="'+cls+'">'+label+'</button>';
const artPicture=(x,fallback)=>'<img loading="lazy" src="'+esc(validImage(x?.image)||image(fallback))+'" alt="'+esc(title(x))+'">';
const panelCard=(heading,body,cls='')=>'<section class="r31-panel '+cls+'"><h2>'+heading+'</h2>'+body+'</section>';
const empty=(label,icon='✧')=>'<div class="r31-empty"><span>'+icon+'</span><p>'+label+'</p></div>';
const hero=kind=>{
 const cfg=groups[kind];
 return '<header class="r31-hero r31-hero-'+kind+'" style="--r31-hero:url(&quot;'+image(cfg.hero)+'&quot;)"><div class="r31-hero-copy"><span>'+cfg.badge+' ELARA · FREEDOM</span><h1>'+cfg.title+'</h1><p>'+cfg.lead+'</p></div><button class="r31-back" type="button" data-r31-back>← بازگشت به آزادی</button></header>';
};
const nav=(all,chosen,attr)=>'<nav class="r31-tabs" aria-label="دسته‌بندی">'+all.map(x=>'<button type="button" '+attr+'="'+esc(x)+'" aria-pressed="'+(chosen===x)+'" class="'+(chosen===x?'selected':'')+'">'+esc(x)+'</button>').join('')+'</nav>';
function arts(){
 const all=sorted(data().artworks),selected=artFilter===artCats[0]?all:all.filter(x=>(x.category||'دیگر')===artFilter);
 const cover=all.find(x=>x.image)||all[0],categoryCounts=artCats.slice(1).map(x=>({title:x,count:all.filter(y=>(y.category||'دیگر')===x).length}));
 const featured=cover?'<div class="r31-feature-cover">'+artPicture(cover,groups.art.art)+'<div><b dir="auto">'+esc(title(cover))+'</b><p dir="auto">'+esc(excerpt(cover))+'</p>'+button('ویرایش اثر ←','data-r31-edit-art="'+esc(cover.id)+'"')+'</div></div>':empty('هنوز اثری ثبت نشده. نخستین اثر هنری یا خلاقانه خودت را اضافه کن.','🎨');
 const cards=selected.length?selected.map(x=>'<article class="r31-art-item">'+artPicture(x,groups.art.art)+'<div><strong dir="auto">'+esc(title(x))+'</strong><small>'+esc(x.category||'دیگر')+' · '+when(x)+'</small><p dir="auto">'+esc(excerpt(x))+'</p>'+button('مشاهده و ویرایش','data-r31-edit-art="'+esc(x.id)+'"')+'</div></article>').join(''):empty('در این دسته هنوز اثری ذخیره نکرده‌ای.','✦');
 return nav(artCats,artFilter,'data-r31-art-filter')+
 '<div class="r31-art-top">'+panelCard('✦ آتلیه خصوصی تو','<p class="r31-muted">هر اثر در فضای خصوصی خودت نگهداری می‌شود. می‌توانی تصویر، عنوان و توضیح آن را اضافه کنی.</p><div class="r31-art-actions">'+button('＋ افزودن اثر جدید','data-r31-new-art','r31-primary')+button('ورود به تابلوی رؤیاها','data-r31-jump="gallery"')+'</div><div class="r31-art-metrics"><div><b>'+fa(all.length)+'</b><small>اثر ثبت‌شده</small></div><div><b>'+fa(all.filter(x=>x.image).length)+'</b><small>تصویر</small></div><div><b>'+fa(categoryCounts.filter(x=>x.count).length)+'</b><small>دسته فعال</small></div></div>','r31-art-studio')+
 panelCard('★ اثر منتخب تو',featured,'r31-art-featured')+'</div>'+
 '<div class="r31-art-bottom">'+panelCard('◈ دسته‌بندی آثار','<div class="r31-cat-grid">'+categoryCounts.map(x=>button(esc(x.title)+' <span>'+fa(x.count)+'</span>','data-r31-art-filter="'+esc(x.title)+'"')).join('')+'</div>')+
 panelCard('▤ مجموعه آثار','<div class="r31-art-grid">'+cards+'</div>','r31-art-list')+'</div>';
}
function experiences(){
 const all=sorted(data().experiences),selected=experienceFilter===experienceCats[0]?all:all.filter(x=>(x.category||'زندگی روزمره')===experienceFilter);
 const allDates=new Set(all.map(x=>new Date(x.at||x.updatedAt||Date.now()).getFullYear()));
 const recent=selected.length?selected.map(x=>'<article class="r31-experience-row"><div class="r31-experience-art">'+artPicture(x,groups.experiences.art)+'</div><div class="r31-experience-copy"><span class="r31-experience-category">'+esc(x.category||'زندگی روزمره')+' · '+when(x)+'</span><strong dir="auto">'+esc(title(x))+'</strong><p dir="auto">'+esc(excerpt(x))+'</p>'+button('مشاهده و ویرایش ←','data-r31-edit-experience="'+esc(x.id)+'"')+'</div></article>').join(''):empty('هنوز تجربه‌ای در این دسته ثبت نشده. هر تجربه کوچک هم ارزش نوشتن دارد.','✧');
 const byCategory=experienceCats.slice(1).map(c=>({name:c,count:all.filter(x=>(x.category||'زندگی روزمره')===c).length}));
 return nav(experienceCats,experienceFilter,'data-r31-experience-filter')+
 '<div class="r31-exp-top">'+panelCard('✎ تجربه جدید','<form data-r31-experience-form><label>عنوان<input name="title" maxlength="110" required placeholder="مثلاً روزی که چیز تازه‌ای یاد گرفتم…"></label><label>داستان تجربه<textarea name="text" maxlength="2400" required placeholder="چه اتفاقی افتاد؟ چه حسی داشتی و چه چیزی یاد گرفتی؟"></textarea></label><div class="r31-exp-fields"><label>دسته‌بندی<select name="category">'+experienceCats.slice(1).map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><label>تاریخ<input type="date" name="date"></label></div><div class="r31-actions">'+button('افزودن تصویر در ویرایشگر','data-r31-edit-photo')+'<button class="r31-primary" type="submit">✦ '+(editExperience?'ذخیره تغییرات':'ثبت تجربه')+'</button></div><p class="r31-muted" data-r31-feedback aria-live="polite"></p></form>','r31-exp-compose')+
 panelCard('✦ مسیر تجربه‌های تو','<div class="r31-stats"><div><b>'+fa(all.length)+'</b><small>تجربه</small></div><div><b>'+fa(allDates.size)+'</b><small>سال ثبت‌شده</small></div><div><b>'+fa(all.filter(x=>x.image).length)+'</b><small>تصویر ثبت‌شده</small></div></div><img class="r31-journey-art" src="'+image('banner_new_dawn.webp')+'" alt="منظره آرامش‌بخش در مسیر زندگی"><p class="r31-muted">این آمار فقط از خاطرات و تجربه‌های واقعی خودت محاسبه شده است.</p>','r31-exp-overview')+'</div>'+
 '<div class="r31-exp-bottom">'+panelCard('◈ مسیرهای زندگی','<div class="r31-cat-grid">'+byCategory.map(x=>button(esc(x.name)+' <span>'+fa(x.count)+'</span>','data-r31-experience-filter="'+esc(x.name)+'"')).join('')+'</div>')+
 panelCard('◷ بازتاب‌های تازه زندگی','<div class="r31-timeline">'+recent+'</div>','r31-exp-feed')+'</div>';
}
function galleryItems(){
 const d=data(),rows=[];
 const defs=[['artworks','هنر','art'],['experiences','تجربه','experiences'],['ideas','ایده','ideas'],['dreams','رؤیا','vision'],['inspirations','الهام','inspiration'],['notes','یادداشت','notes'],['reflections','یادداشت','reflection']];
 for(const [field,category,kind] of defs)for(const x of d[field]||[]){const picture=validImage(x.image);if(picture)rows.push({...x,sourceType:category,kind,displayPicture:picture})}
 let notes=[];try{notes=JSON.parse(localStorage.getItem('elara_space_v1')||'{}').diaryEntries||[]}catch{}
 for(const x of notes){let picture=validImage(x.backgroundImage);if(!picture&&x.themeId){const map={night:'Celestial Mirror Lake at Night.webp',paper:'Sunlit Botanical Shadows on Parchment.webp',lavender:'Lavender Moonrise Over Misty Meadows.webp',forest:'Misty Mountain Lake at Dawn.webp'};if(map[x.themeId])picture=image(map[x.themeId])}
 if(picture)rows.push({...x,sourceType:'خاطره',kind:'diary',displayPicture:picture})}
 return rows.sort((a,b)=>Number(b.updatedAt||b.at||0)-Number(a.updatedAt||a.at||0));
}
function gallery(){
 const all=galleryItems(),filtered=all.filter(x=>(galleryFilter===galleryCats[0]||x.sourceType===galleryFilter)&&(!galleryQuery||[title(x),excerpt(x),x.sourceType].join(' ').toLowerCase().includes(galleryQuery.toLowerCase())));
 const images=filtered.length?filtered.map(x=>'<button type="button" class="r31-gallery-photo" data-r31-picture="'+esc(x.id)+'" data-r31-source="'+esc(x.kind)+'">'+
 '<img src="'+esc(x.displayPicture)+'" loading="lazy" alt="'+esc(title(x))+'"><span><b dir="auto">'+esc(title(x))+'</b><small>'+esc(x.sourceType)+'</small></span></button>').join(''):empty(all.length?'نتیجه‌ای برای جستجو یا این دسته پیدا نشد.':'هنوز تصویری ذخیره نکرده‌ای. برای شروع یک اثر هنری تصویری اضافه کن.','▧');
 return nav(galleryCats,galleryFilter,'data-r31-gallery-filter')+
 '<div class="r31-gallery-stats"><div><b>'+fa(all.length)+'</b><small>تصویر خصوصی</small></div><div><b>'+fa(new Set(all.map(x=>x.sourceType)).size)+'</b><small>دسته دارای تصویر</small></div><label>⌕ <input data-r31-gallery-search type="search" maxlength="100" placeholder="جستجوی تصویر، عنوان یا دسته…" value="'+esc(galleryQuery)+'"></label>'+button('＋ افزودن تصویر','data-r31-new-art','r31-primary')+'</div>'+
 panelCard('▧ تابلوی تصویرهای تو','<p class="r31-muted">این صفحه تصاویر ثبت‌شده در ایده‌ها، آثار، رؤیاها، تجربه‌ها و خاطرات را از اطلاعات خصوصی خودت گردآوری می‌کند.</p><div class="r31-gallery-grid">'+images+'</div>','r31-gallery-body');
}
const render=()=>{if(!current)return;const host=panel()?.querySelector('.r31-shell [data-r31-content]');if(host)host.innerHTML=current==='art'?arts():current==='experiences'?experiences():gallery()};
function open(kind,fromHistory=false){
 if(!groups[kind])return;const p=panel();if(!p)return;
 current=kind;artFilter=artCats[0];experienceFilter=experienceCats[0];galleryFilter=galleryCats[0];galleryQuery='';editExperience='';
 p.classList.add('freedom-subpage-open');p.querySelector('.freedom-subpage-shell')?.remove();
 const s=document.createElement('section');s.className='freedom-subpage-shell r31-shell';s.dataset.freedomView=kind;s.setAttribute('dir','rtl');s.innerHTML='<div class="freedom-back-toolbar"><button type="button" data-r31-back aria-label="بازگشت به صفحه اصلی آزادی">→ بازگشت به آزادی</button></div>'+hero(kind)+'<div class="r31-content" data-r31-content></div>';p.append(s);render();
 if(!fromHistory)history.pushState({...history.state,elaraFreedomView:kind},'',location.href);
 s.scrollIntoView({block:'start',behavior:'auto'});
}
function close(pop=false){
 current='';panel()?.querySelector('.r31-shell')?.remove();panel()?.classList.remove('freedom-subpage-open');
 if(!pop&&history.state?.elaraFreedomView)history.back();
}
function edit(kind,id){if(kind==='diary')return window.ElaraFreedomMediaDiary?.openDiary?.(id);
 return window.ElaraFreedomEnhancements?.edit?.(kind,id)}
const reRender=()=>{if(refreshQueued)return;refreshQueued=true;queueMicrotask(()=>{refreshQueued=false;if(current)render()})};
function wire(){
 const enh=window.ElaraFreedomEnhancements;if(!enh||enh.__r31)return;
 const oldOpen=enh.open;enh.open=(kind,fromHistory=false)=>groups[kind]?open(kind,fromHistory):oldOpen(kind,fromHistory);
 enh.__r31=true;
}
wire();
window.addEventListener('elara:account-ready',wire);
for(const event of ['elara:freedom-changed','elara:data-changed','elara:state-committed'])window.addEventListener(event,reRender);
document.addEventListener('click',e=>{
 const container=panel()?.querySelector('.r31-shell');if(!container||!container.contains(e.target))return;
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-r31-back')){e.preventDefault();close();return}
 if(b.dataset.r31ArtFilter!==undefined){artFilter=b.dataset.r31ArtFilter;render();return}
 if(b.dataset.r31ExperienceFilter!==undefined){experienceFilter=b.dataset.r31ExperienceFilter;render();return}
 if(b.dataset.r31GalleryFilter!==undefined){galleryFilter=b.dataset.r31GalleryFilter;render();return}
 if(b.dataset.r31Jump){open(b.dataset.r31Jump);return}
 if(b.hasAttribute('data-r31-new-art')){window.ElaraFreedomEnhancements?.entry?.('art');return}
 if(b.dataset.r31EditArt){edit('art',b.dataset.r31EditArt);return}
 if(b.dataset.r31EditExperience){editExperience=b.dataset.r31EditExperience;const item=(data().experiences||[]).find(x=>x.id===editExperience);if(item){const f=container.querySelector('[data-r31-experience-form]');f.elements.title.value=item.title||'';f.elements.text.value=item.text||'';f.elements.category.value=item.category||'زندگی روزمره';f.elements.date.value=item.date||'';f.querySelector('[type=submit]').textContent='ذخیره تغییرات';f.scrollIntoView({block:'center',behavior:'smooth'});}return}
 if(b.hasAttribute('data-r31-edit-photo')){if(editExperience)edit('experiences',editExperience);else window.ElaraFreedomEnhancements?.entry?.('experiences');return}
 if(b.dataset.r31Picture){const x=galleryItems().find(x=>x.id===b.dataset.r31Picture&&x.kind===b.dataset.r31Source);if(x)edit(x.kind,x.id);return}
},false);
document.addEventListener('submit',e=>{
 if(!e.target.matches('[data-r31-experience-form]')||!panel()?.contains(e.target))return;
 e.preventDefault();
 const f=e.target,titleText=f.elements.title.value.trim(),body=f.elements.text.value.trim();if(!titleText||!body)return;
 const d=data();if(!Array.isArray(d.experiences))d.experiences=[];
 const existing=editExperience&&d.experiences.find(x=>x.id===editExperience),now=Date.now();
 if(existing)Object.assign(existing,{title:titleText,text:body,category:f.elements.category.value,date:f.elements.date.value,updatedAt:now});
 else d.experiences.unshift({id:identifier(),title:titleText,text:body,category:f.elements.category.value,date:f.elements.date.value,at:now,updatedAt:now,image:'',visibility:'private'});
 if(!save(d)){f.querySelector('[data-r31-feedback]').textContent='ذخیره‌سازی ممکن نیست؛ فضای ذخیره‌سازی مرورگر را بررسی کن.';return}
 editExperience='';render();
},true);
document.addEventListener('input',e=>{
 if(!e.target.matches('[data-r31-gallery-search]')||!panel()?.contains(e.target))return;
 const input=e.target;galleryQuery=input.value;
 const caret=input.selectionStart;
 render();const next=panel()?.querySelector('.r31-shell [data-r31-gallery-search]');if(next){next.focus();next.setSelectionRange(caret,caret)}
});
window.addEventListener('popstate',()=>{if(current&&!history.state?.elaraFreedomView)close(true)});
window.ElaraFreedomR31={open,render,get active(){return current}};
})();