/* Reference-owned Freedom page; shared bars/navigation remain untouched. */
(()=>{'use strict';
const $=s=>document.querySelector(s),A='assets/ui/',E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const art={hero:'freedom_banner.webp',notes:'free_notes.webp',ideas:'Ideas.webp',insp:'Inspirations.webp',vision:'Vision_Board.webp',reflect:'my_reflection.webp',dream:'banner_dream_tree.webp',moon:'banner_moon_lake.webp',city:'banner_city_of_stars.webp'};
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'local',key=()=>'elara_freedom_v1_'+uid();
const normalize=d=>{d=d&&typeof d==='object'?d:{};for(const k of ['notes','dreams','ideas','inspirations','reflections'])if(!Array.isArray(d[k]))d[k]=[];if(!d.quote||typeof d.quote!=='object')d.quote={text:'فکر کوچکی امروز، می‌تونه آغاز یک دنیای بزرگ باشه.',author:'Elara'};return d};
const read=()=>{try{return normalize(JSON.parse(localStorage.getItem(key())||'{}'))}catch{return normalize({})}};
const save=d=>{localStorage.setItem(key(),JSON.stringify(normalize(d)));window.dispatchEvent(new CustomEvent('elara:freedom-changed'))};
const space=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return{}}};
const img=(file,cls='')=>'<img class="'+cls+'" src="'+A+file+'" alt="" decoding="async">',fa=n=>Number(n||0).toLocaleString('fa-IR');
const firstLine=v=>String(v||'').split(/\r?\n/).map(x=>x.trim()).find(Boolean)||'';
const topic=(x,fallback='یادداشت')=>String(x?.title||'').trim()||firstLine(x?.text||x?.description)||fallback;
function streak(s){const set=new Set;for(const h of s.taskCompletionHistory||[])if(h?.date)set.add(h.date);for(const h of s.habits||[])for(const d of h.days||[])set.add(d);let x=new Date;x.setHours(12,0,0,0);const k=()=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');if(!set.has(k()))x.setDate(x.getDate()-1);let n=0;while(set.has(k())){n++;x.setDate(x.getDate()-1)}return n}
function feature(k,t,sub,file){return '<button type="button" class="freedom-feature freedom-'+k+'" data-freedom-jump="'+k+'">'+img(file)+'<span><b>'+t+'</b><small>'+sub+'</small></span><i aria-hidden="true">‹</i></button>'}
function mount(){const p=$('#panel-freedom');if(!p)return;p.classList.add('freedom-reference-page');p.innerHTML='<div class="freedom-root">'+
'<section class="freedom-hero">'+img(art.hero,'freedom-hero-art')+'<div class="freedom-hero-copy"><em>دنیای بزرگ‌تر · ELARA</em><h1>آزادی</h1><b>جایی برای فکرهای بزرگ</b><p>اینجا می‌تونی بنویسی، خیال‌پردازی کنی و نسخه‌ی بهتر خودت رو بسازی.</p></div></section>'+
'<section class="freedom-summary"><article><div class="freedom-avatar">✦</div><div><b data-f-name>Elara</b><small data-f-level>سطح ۱</small><span><i data-f-xpbar></i></span><small data-f-xp>۰ XP</small></div></article><article>'+img('streak-flame.webp')+'<div><small>رکورد فعالیت</small><b><span data-f-streak>۰</span> روز</b></div></article></section>'+
'<section class="freedom-features" id="freedom-features">'+feature('vision','تابلوی رویاها','آینده دلخواهت را تصور کن',art.vision)+feature('notes','یادداشت‌های آزاد','بنویس، بدون محدودیت',art.notes)+feature('inspiration','الهام‌ها','آنچه تو را به حرکت در می‌آورد',art.insp)+feature('ideas','ایده‌ها','فکرهای جدید را ثبت کن',art.ideas)+feature('reflection','بازتاب‌های من','با خودت گفت‌وگو کن',art.reflect)+'</section>'+
'<section class="freedom-card freedom-today"><header><h2>کارهای امروز</h2><button type="button" data-elara-tab="tasks">مشاهده همه ←</button></header><div data-f-tasks></div></section>'+
'<div class="freedom-main"><section class="freedom-card freedom-compose"><header><h2>چه چیزی در ذهنت است؟</h2><small>یادداشت آزاد</small></header><form data-f-form><input class="freedom-note-topic" name="title" maxlength="100" placeholder="موضوع (اختیاری)"><textarea name="text" maxlength="1400" placeholder="هر فکری، هر ایده‌ای، هر احساسی... اینجا جای توست."></textarea><div class="freedom-compose-actions"><label class="freedom-upload-button">افزودن تصویر<input data-f-image type="file" accept="image/png,image/jpeg,image/webp"></label><button class="freedom-neon-button" type="submit">ثبت یادداشت</button></div><div class="freedom-compose-preview" data-f-image-preview hidden></div></form></section>'+
'<section class="freedom-card freedom-quote"><header><h2>نقل‌قول الهام‌بخش</h2><button type="button" data-f-quote-edit>ویرایش</button></header>'+img(art.moon)+'<blockquote data-f-quote></blockquote></section></div>'+
'<div class="freedom-bottom"><section class="freedom-card freedom-notes"><header><h2>آخرین یادداشت‌ها</h2><button type="button" data-f-more>همه</button></header><div data-f-notes></div></section>'+
'<section class="freedom-card freedom-dreams-card"><header><h2>رویای من</h2><button type="button" class="freedom-compact-add" data-f-dream>+ رویای جدید</button></header><div class="freedom-dreams" data-f-dreams></div></section>'+
'<section class="freedom-card freedom-road freedom-ai-card"><header><h2>Elara AI</h2><span>AI</span></header><div data-f-ai-host><p>وقتی AI امن سایت از پنل مدیر فعال شود، می‌توانی همین‌جا با Elara گفتگو کنی.</p></div></section></div></div>';render();bind()}
function render(){
 const p=$('#panel-freedom');if(!p?.classList.contains('freedom-reference-page'))return;const s=space(),d=read(),me=window.ElaraSocial?.me||window.ElaraAccount?.profile||{},xp=Number(s.xp||me.xp||0),lv=window.ElaraLevels?.level?.(xp)||1;
 p.querySelector('[data-f-name]').textContent=me.name||'Elara';p.querySelector('[data-f-level]').textContent='سطح '+fa(lv);p.querySelector('[data-f-xp]').textContent=fa(xp)+' XP';p.querySelector('[data-f-xpbar]').style.width=Math.min(100,(xp%1000)/10)+'%';p.querySelector('[data-f-streak]').textContent=fa(streak(s));
 const tasks=(s.tasks||[]).filter(t=>!t.completed).slice(0,4);p.querySelector('[data-f-tasks]').innerHTML=tasks.length?tasks.map(t=>'<button type="button" class="freedom-task" data-elara-tab="tasks"><i></i><span dir="auto">'+E(t.text||t.title||'تسک')+'</span></button>').join(''):'<p class="freedom-empty">امروز تسکی اینجا نداری ✨</p>';
 const host=p.querySelector('[data-f-notes]'),notes=(d.notes||[]).slice().sort((a,b)=>(b.updatedAt||b.at||0)-(a.updatedAt||a.at||0)).slice(0,3);
 host.innerHTML=notes.length?notes.map(n=>'<article class="freedom-note" data-f-note-open="'+E(n.id)+'" tabindex="0">'+(n.image?'<img src="'+E(n.image)+'" alt="">':img(art.notes))+'<div><b dir="auto">'+E(topic(n))+'</b><small>'+new Date(n.updatedAt||n.at||Date.now()).toLocaleDateString('fa-IR')+'</small></div><button type="button" data-f-del="'+E(n.id)+'" aria-label="حذف یادداشت">×</button></article>').join(''):'<p class="freedom-empty">هنوز چیزی ننوشتی؛ اولین فکر رو ثبت کن ✨</p>';
 const dreams=(d.dreams||[]).slice().sort((a,b)=>(b.updatedAt||b.at||0)-(a.updatedAt||a.at||0)).slice(0,4),dh=p.querySelector('[data-f-dreams]');
 dh.innerHTML=dreams.length?dreams.map(x=>'<button type="button" class="freedom-dream-tile '+(x.image?'has-image':'topic-only')+'" data-f-dream-open="'+E(x.id)+'">'+(x.image?'<img src="'+E(x.image)+'" alt="">':'')+'<span dir="auto">'+E(topic(x,'رویای من'))+'</span></button>').join(''):'<button type="button" class="freedom-dream-empty" data-f-dream>'+img(art.dream)+'<span>+ رویای جدید</span></button>';
 const quote=p.querySelector('[data-f-quote]');if(quote)quote.innerHTML=E(d.quote.text||'')+(d.quote.author?'<cite>— '+E(d.quote.author)+'</cite>':'');
 window.dispatchEvent(new CustomEvent('elara:freedom-rendered',{detail:{data:d}}));
}
function bind(){const p=$('#panel-freedom');
 p.addEventListener('submit',e=>{if(!e.target.matches('[data-f-form]'))return;if(window.ElaraFreedomEnhancements)return;e.preventDefault();const text=e.target.elements.text?.value.trim()||'',title=e.target.elements.title?.value.trim()||'';if(!text&&!title)return;const d=read();d.notes.unshift({id:(crypto.randomUUID?.()||Date.now().toString(36)),title,text,at:Date.now()});save(d);e.target.reset();render()});
 p.addEventListener('click',e=>{
  const del=e.target.closest('[data-f-del]');if(del){e.preventDefault();e.stopPropagation();const d=read();d.notes=d.notes.filter(n=>n.id!==del.dataset.fDel);save(d);render();return}
  if(e.target.closest('[data-f-more]')){e.preventDefault();window.ElaraFreedomEnhancements?.allNotes?.();return}
  if(e.target.closest('[data-f-dream]')){window.ElaraFreedomEnhancements?.dream?.();return}
  if(e.target.closest('[data-f-quote-edit]')){window.ElaraFreedomEnhancements?.quote?.();return}
  const dream=e.target.closest('[data-f-dream-open]');if(dream){window.ElaraFreedomEnhancements?.dreamDetail?.(dream.dataset.fDreamOpen);return}
  const jump=e.target.closest('[data-freedom-jump]')?.dataset.freedomJump;if(jump)window.ElaraFreedomEnhancements?.open?.(jump);
 });
}
function setup(){mount();for(const n of ['elara:open','elara:data-changed','elara:hydrate','elara:account-ready','elara:social-updated','elara:freedom-changed'])window.addEventListener(n,e=>{if(n!=='elara:open'||e.detail?.tab==='freedom')setTimeout(()=>$('#panel-freedom .freedom-root')?render():mount(),0)})}
window.ElaraFreedom={mount,render,read,save,topic};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',setup,{once:true}):setup();
})();