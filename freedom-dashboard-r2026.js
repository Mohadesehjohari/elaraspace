/* Freedom R26: reference-aligned private dashboard. Uses the existing canonical stores and editors. */
(()=>{'use strict';
const P=()=>document.getElementById('panel-freedom'),A='assets/ui/';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>window.ElaraFreedom?.read?.()||{};
const space=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return{}}};
const topic=(x,f='بدون عنوان')=>String(x?.title||'').trim()||String(x?.text||x?.body||'').trim().split('\n')[0].slice(0,70)||f;
const when=v=>v?new Date(v).toLocaleDateString('fa-IR'):'';
let filter='همه',root=null,refreshQueued=false;
const cards=[
 ['gallery','تابلوی رؤیاها','قاب‌های خیال تو','Vision_Board.webp'],
 ['inspiration','تالار الهام','نور برای ادامه راه','Inspirations.webp'],
 ['vision','باغ رؤیاها','نقشه فردای تو','Plans & Dreams.webp'],
 ['experiences','بازتاب‌های من','آینه لحظه‌های زندگی','my_reflection.webp'],
 ['art','الهام‌های آفرینش','رنگی از خیال تو','Celestial Crystal Spellbook Icon.webp'],
 ['ideas','جرقه‌های من','ستاره‌های اندیشه','Ideas.webp'],
 ['diary','دفتر نجواها','قصه‌های دل و روزها','free_notes.webp']
];
function tile([kind,title,sub,art]){
 return '<button type="button" class="fd-tile '+(kind==='diary'?'is-selected':'')+'" data-fd-open="'+kind+'" aria-label="'+esc(title)+'">'+
 '<span class="fd-tile-image"><img src="'+A+encodeURIComponent(art)+'" alt="" loading="lazy"></span>'+
 '<strong>'+title+'</strong><small>'+sub+'</small></button>';
}
function install(){
 const p=P(),r=p?.querySelector('.freedom-root');if(!r)return;
 const hero=p.querySelector('.freedom-hero');
 if(hero&&!hero.dataset.fdHero){
  hero.dataset.fdHero='true';
  const image=hero.querySelector('.freedom-hero-art');if(image)image.src=A+'freedom_banner.webp';
  const copy=hero.querySelector('.freedom-hero-copy');
  if(copy)copy.innerHTML='<div class="fd-hero-label"><span class="fd-compass" aria-hidden="true">✦</span><h1>آزادی</h1></div>'+
  '<p>جایی برای فکر کردن، احساس کردن و ساختن دنیایی بهتر از خودت.</p>'+
  '<small>«محدودیت‌ها فقط در ذهن ما زندگی می‌کنند»</small>';
 }
 if(r.querySelector('.fd-dashboard')){root=r;return}
 root=r;p.classList.add('freedom-r26-page');
 const markup='<section class="fd-dashboard" dir="rtl" aria-label="داشبورد آزادی">'+
 '<div class="fd-features" aria-label="بخش‌های آزادی">'+cards.map(tile).join('')+'</div><p class="fd-swipe-cue">← برای دیدن بخش‌های بیشتر، کارت‌ها را به چپ بکش</p>'+
 '<div class="fd-main">'+
 '<div class="fd-right">'+
  '<section class="fd-panel fd-inspiration"><header><h2>☀ الهام امروز</h2><button type="button" data-fd-quote-edit>ویرایش</button></header><blockquote data-fd-quote></blockquote></section>'+
  '<section class="fd-panel fd-music"><header><h2>♫ موسیقی آرامش‌بخش</h2><button type="button" data-fd-music>مشاهده همه ←</button></header><div data-fd-song></div></section>'+
 '</div>'+
 '<section class="fd-panel fd-dreams"><header><h2>✧ باغ رؤیاها</h2><button type="button" data-fd-more-dreams>مشاهده همه ←</button></header>'+
 '<div class="fd-dream-art"><img src="'+A+'banner_city_of_stars.webp" alt=""><span>«از هر رؤیا، دری به فردا باز می‌شود.»</span></div>'+
 '<div class="fd-dream-list" data-fd-dream-list></div>'+
 '<button type="button" class="fd-wide-button" data-fd-new-dream>+ اضافه کردن رؤیای جدید</button></section>'+
 '<section class="fd-panel fd-diary"><header><h2>▣ دفتر خاطرات</h2><button type="button" class="fd-action" data-fd-new-diary>+ نوشتن یادداشت جدید</button></header>'+
 '<div class="fd-filters" role="group" aria-label="فیلتر خاطرات">'+['همه','روزانه','شکرگزاری','ایده‌ها','نیازها'].map(x=>'<button type="button" data-fd-filter="'+x+'" class="'+(x===filter?'is-active':'')+'">'+x+'</button>').join('')+'</div>'+
 '<div class="fd-diary-list" data-fd-diary-list></div><button type="button" class="fd-footer-link" data-fd-new-diary>ثبت یا مدیریت خاطرات ←</button></section>'+
 '</div>'+
 '<section class="fd-community"><div class="fd-community-copy"><h2>♧ جامعه آزادی</h2><p>ایده‌ها و تجربه‌هایت را فقط در صورت تمایل با دیگران به اشتراک بگذار.</p></div><button type="button" class="fd-action" data-fd-community>ورود به جامعه ←</button></section>'+
 '<details class="fd-more"><summary>سایر امکانات آزادی: یادداشت آزاد و Elara AI</summary><div class="fd-more-inside" data-fd-advanced></div></details>'+
 '</section>';
 r.insertAdjacentHTML('afterbegin',markup);
 const advanced=r.querySelector('[data-fd-advanced]');
 const compose=r.querySelector('.freedom-compose'),ai=r.querySelector('.freedom-ai-card');
 if(compose)advanced.append(compose);if(ai)advanced.append(ai);
 render();
}
function renderDiary(r){
 const host=r.querySelector('[data-fd-diary-list]');if(!host)return;
 let rows=window.ElaraFreedomMediaDiary?.diaryRows?.()||[];
 if(filter!=='همه')rows=rows.filter(x=>(x.tags||[]).some(t=>String(t).toLowerCase().includes(filter==='روزانه'?'روز':filter)));
 host.innerHTML=rows.length?rows.slice(0,5).map(x=>{
  const title=topic(x,'خاطره خصوصی'),body=String(x.body||'');
  return '<article class="fd-diary-entry"><img src="'+A+'free_notes.webp" alt="" loading="lazy">'+
  '<button type="button" class="fd-diary-copy" data-fd-diary-id="'+esc(x.id)+'"><strong dir="auto">'+esc(title)+'</strong>'+
  '<small dir="auto">'+esc(body.slice(0,110))+(body.length>110?'…':'')+'</small></button>'+
  '<div class="fd-diary-meta"><time>'+esc(when(x.updatedAt||x.createdAt))+'</time><span>'+esc((x.tags||[])[0]||'خصوصی')+'</span></div>'+
  '<button type="button" class="fd-diary-menu" data-fd-diary-id="'+esc(x.id)+'" aria-label="نمایش، ویرایش یا حذف خاطره">⋮</button></article>';
 }).join(''):'<p class="fd-empty">در این دسته هنوز خاطره‌ای ثبت نکرده‌ای. با دکمهٔ بالا خاطرهٔ تازه بنویس.</p>';
 r.querySelectorAll('[data-fd-filter]').forEach(b=>{b.classList.toggle('is-active',b.dataset.fdFilter===filter);b.setAttribute('aria-pressed',String(b.dataset.fdFilter===filter))});
}
function renderDreams(r,d){
 const host=r.querySelector('[data-fd-dream-list]');if(!host)return;
 const rows=(d.dreams||[]).slice().sort((a,b)=>(b.updatedAt||b.at||0)-(a.updatedAt||a.at||0));
 host.innerHTML=rows.length?rows.slice(0,4).map(x=>
 '<button type="button" class="fd-dream-row" data-fd-dream-id="'+esc(x.id)+'"><span class="fd-ring" aria-hidden="true"></span>'+
 '<span class="fd-dream-text"><b dir="auto">'+esc(topic(x,'رویای من'))+'</b><small>'+esc(x.category||'پیشرفت ثبت نشده')+'</small></span>'+
 '<span class="fd-dream-date">'+esc(x.target||'نمایش جزئیات ←')+'</span></button>').join(''):
 '<p class="fd-empty">هنوز رؤیایی ثبت نکرده‌ای؛ اولین رؤیایت را با همان سیستم موجود ثبت کن.</p>';
}
function renderMusic(r){
 const host=r.querySelector('[data-fd-song]');if(!host)return;
 const song=space().profileSong;
 if(!song?.previewUrl&&!song?.localAudioKey){host.innerHTML='<div class="fd-music-empty"><img src="'+A+'04-study-music-ambience-icon.webp" alt=""><p>هنوز آهنگی انتخاب نکرده‌ای. آهنگ‌های واقعی را در جستجوی Apple Preview پیدا کن.</p><button type="button" data-fd-music>جستجوی موسیقی</button></div>';return}
 if(song.localAudioKey){host.innerHTML='<div class="fd-playing"><img src="'+A+'04-study-music-ambience-icon.webp" alt=""><div><strong dir="auto">'+esc(song.title||'فایل صوتی من')+'</strong><small>آپلود خصوصی · همین مرورگر</small><small>پخش پس از انتخاب شما</small></div><audio controls preload="none" data-elara-audio-channel="profile" aria-label="پخش موسیقی آپلودشده"></audio></div>';void window.ElaraFreedomMusicR27?.attachLocalAudio?.(host,song);return}
 host.innerHTML='<div class="fd-playing"><img src="'+esc(song.artwork||A+'04-study-music-ambience-icon.webp')+'" alt="">'+
 '<div><strong dir="auto">'+esc(song.title||'آهنگ پروفایل')+'</strong><small dir="auto">'+esc(song.artist||'')+'</small><small>Apple Preview · پخش فقط با انتخاب شما</small></div>'+
 '<audio controls preload="none" data-elara-audio-channel="profile" src="'+esc(song.previewUrl)+'" aria-label="پخش پیش‌نمایش موسیقی"></audio></div>';
}
function render(){
 const p=P(),r=p?.querySelector('.fd-dashboard');if(!r)return;
 const d=read();renderDiary(r);renderDreams(r,d);renderMusic(r);
 const q=r.querySelector('[data-fd-quote]');if(q)q.innerHTML='<p>'+esc(d.quote?.text||'هر روز فرصت تازه‌ای برای نوشتن داستان توست.')+'</p>'+
 (d.quote?.author?'<cite>— '+esc(d.quote.author)+'</cite>':'');
}
function refresh(){if(refreshQueued)return;refreshQueued=true;queueMicrotask(()=>{refreshQueued=false;install();render()})}
async function gallery(){
 const d=read(),items=[...(d.notes||[]),...(d.dreams||[]),...(d.ideas||[]),...(d.artworks||[]),...(d.experiences||[])].filter(x=>x.image);
 const box=document.createElement('section');box.className='fd-gallery-dialog';
 box.innerHTML=items.length?'<div class="fd-gallery-grid">'+items.map(x=>'<figure><img src="'+esc(x.image)+'" alt="'+esc(topic(x,'تصویر من'))+'"><figcaption>'+esc(topic(x,'تصویر من'))+'</figcaption></figure>').join('')+'</div>':
 '<div class="fd-empty">گالری هنوز تصویری ندارد. تصویرهایی که به یادداشت‌ها، ایده‌ها، آثار یا رؤیاهای خودت اضافه کنی اینجا دیده می‌شوند. هیچ تصویری عمومی نمی‌شود.</div>';
 if(!window.ElaraDialog?.open)return;
 await window.ElaraDialog.open({title:'گالری شخصی · فقط برای خودت',content:box,wide:true,actions:[{label:'بستن',value:false}]});
}
async function openSection(kind){
 const enhancement=window.ElaraFreedomEnhancements,media=window.ElaraFreedomMediaDiary;
 if(cards.some(row=>row[0]===kind))return enhancement?.open?.(kind);
}
function stopAudio(){P()?.querySelectorAll('.fd-dashboard audio').forEach(a=>{try{a.pause()}catch{}})}
document.addEventListener('click',e=>{
 const p=P();if(!p?.contains(e.target))return;const b=e.target.closest('button');if(!b)return;
 const kind=b.dataset.fdOpen;if(kind){e.preventDefault();void openSection(kind);return}
 if(b.dataset.fdFilter){filter=b.dataset.fdFilter;render();return}
 if(b.hasAttribute('data-fd-new-diary')){void window.ElaraFreedomMediaDiary?.openDiary?.();return}
 if(b.dataset.fdDiaryId){void window.ElaraFreedomMediaDiary?.openDiary?.(b.dataset.fdDiaryId);return}
 if(b.hasAttribute('data-fd-music')){void window.ElaraFreedomMediaDiary?.openMusic?.();return}
 if(b.hasAttribute('data-fd-new-dream')){void window.ElaraFreedomEnhancements?.dream?.();return}
 if(b.hasAttribute('data-fd-more-dreams')){void openSection('vision');return}
 if(b.dataset.fdDreamId){void window.ElaraFreedomEnhancements?.dreamDetail?.(b.dataset.fdDreamId);return}
 if(b.hasAttribute('data-fd-quote-edit')){void window.ElaraFreedomEnhancements?.quote?.();return}
 if(b.hasAttribute('data-fd-community')){location.hash='#social';return}
});
window.addEventListener('elara:open',e=>{if(e.detail?.tab!=='freedom')stopAudio();else refresh()});
window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#freedom'))stopAudio()});
for(const event of ['elara:freedom-rendered','elara:freedom-changed','elara:data-changed','elara:state-committed','elara:hydrate','elara:account-ready'])window.addEventListener(event,refresh);
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',refresh,{once:true}):refresh();
window.ElaraFreedomDashboardR26={refresh,openSection};
})();