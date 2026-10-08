/* Owner-uploaded WebP artwork on the actual reference Home dashboard.
   Decorative art never replaces task, goal, habit, book or social data. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const arr=x=>Array.isArray(x)?x:[];
const local=()=>{try{const v=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset=name=>'assets/ui/'+name+'.webp';
const tiles=[
  {key:'language',route:'language',title:'یادگیری زبان',icon:'✦',img:'language-learning-background'},
  {key:'library',route:'books',title:'کتابخانه',icon:'▤',img:'library-card-background'},
  {key:'friends',route:'social',title:'دوستان',icon:'♧',img:'friends-card-bg'},
  {key:'focus',route:'focus',title:'تمرکز',icon:'◷',img:null}
];
function image(root,cls,src,w,h){let img=root.querySelector(':scope > img.'+cls);if(!img){img=document.createElement('img');img.className=cls;img.src=asset(src);img.width=w;img.height=h;img.decoding='async';img.alt='';img.setAttribute('aria-hidden','true');img.loading=cls==='owner-home-hero-image'?'eager':'lazy';if(cls==='owner-home-hero-image')img.fetchPriority='high';root.prepend(img)}return img}
function makeSummary(){
 const panel=$('panel-home'),quick=$('ref-quick-access');if(!panel||!quick)return null;
 let wrap=$('owner-home-summaries');if(!wrap){wrap=document.createElement('section');wrap.id='owner-home-summaries';wrap.className='owner-home-summaries';wrap.setAttribute('aria-label','خلاصه‌های اصلی');quick.insertAdjacentElement('beforebegin',wrap)}
 if(wrap.dataset.ownerSummaryMounted)return wrap;
 wrap.dataset.ownerSummaryMounted='1';
 wrap.innerHTML='<header class="owner-home-summary-head"><h2>نگاهی به جهان تو</h2><small>خلاصهٔ واقعی، ورود سریع به بخش‌ها</small></header><div class="owner-home-summary-grid">'+tiles.map(t=>'<button type="button" class="owner-home-tile owner-home-'+t.key+'" data-elara-tab="'+t.route+'">'+(t.key==='focus'?'<img class="owner-home-focus-art" src="'+asset('pomodoro-icon')+'" alt="" width="56" height="56" loading="lazy">':'<span class="owner-home-tile-art" aria-hidden="true"></span>')+'<span class="owner-home-tile-copy"><strong>'+t.title+'</strong><small data-owner-summary="'+t.key+'">—</small></span><span class="owner-home-tile-arrow" aria-hidden="true">‹</span></button>').join('')+'</div>';
 return wrap;
}
function refreshData(){
 const wrap=$('owner-home-summaries');if(!wrap)return;const data=local();
 const words=arr(data.words);const books=arr(data.books);const reading=books.find(b=>['reading','in-progress','current'].includes(String(b.shelf||b.status||'').toLowerCase()));
 const friends=window.ElaraSocial?.friends;const socialLoaded=Array.isArray(friends);
 const focus=String($('focus-status')?.textContent||'').trim();
 const counts={
  language:words.length?words.length.toLocaleString('fa-IR')+' واژهٔ ثبت‌شده':'هنوز واژه‌ای ثبت نشده',
  library:reading?'در حال خواندن: '+String(reading.title||'کتاب بدون عنوان').slice(0,55):books.length?books.length.toLocaleString('fa-IR')+' کتاب ثبت‌شده':'هنوز کتابی ثبت نشده',
  friends:socialLoaded?friends.length?friends.length.toLocaleString('fa-IR')+' دوست':'هنوز دوستی ثبت نشده':'با ورود به حساب، دوستانت نمایش داده می‌شوند',
  focus:focus||'ورود به تایمر پومودورو'
 };
 for(const [key,value] of Object.entries(counts)){const node=wrap.querySelector('[data-owner-summary="'+key+'"]');if(node&&node.textContent!==value)node.textContent=value}
}
function decorate(){
 const panel=$('panel-home');if(!panel)return;
 panel.classList.add('owner-art-home');
 const hero=panel.querySelector('.elara-hero');if(hero){hero.classList.add('owner-home-hero');image(hero,'owner-home-hero-image','homebanner1',1600,900)}
 const streak=$('ref-streak-card');if(streak)streak.classList.add('owner-home-streak');
 const rank=$('elara-home-ranks')?.closest('.ref-ranks');if(rank)rank.classList.add('owner-home-ranking');
 const tasks=$('elara-home-tasks')?.closest('.elara-card');if(tasks)tasks.classList.add('owner-home-tasks');
 const goals=$('elara-home-goals')?.closest('.elara-card');if(goals){goals.classList.add('owner-home-goals');const title=goals.querySelector(':scope > header h2');if(title&&!title.querySelector('.owner-home-goal-icon')){const icon=document.createElement('img');icon.className='owner-home-goal-icon';icon.src=asset('my-goals-icon');icon.width=36;icon.height=36;icon.loading='lazy';icon.alt='';title.prepend(icon)}}
 const wellness=$('ref-wellness-card');if(wellness)wellness.classList.add('owner-home-wellness');
 const daily=panel.querySelector('.owner-home-daily');if(!daily){
  const node=document.createElement('aside');node.className='owner-home-daily';node.innerHTML='<span>امروز، یک قدم رو به جلو</span><strong>با برنامهٔ واقعی خودت پیش برو</strong>';const grid=panel.querySelector('.ref-home-grid');if(grid)grid.insertAdjacentElement('afterend',node);
 }
 makeSummary();refreshData();
 document.getElementById('ref-home-quote-card')?.remove();
}
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decorate()})}
for(const event of ['elara:open','elara:hydrate','elara:data-changed','elara:social-updated','elara:account-ready','elara:profile-saved','elara:locale-changed'])addEventListener(event,schedule);
const start=()=>{schedule();const root=$('panel-home');if(root){const observer=new MutationObserver(records=>{if(records.some(m=>m.addedNodes.length||m.removedNodes.length))schedule()});observer.observe(root,{childList:true,subtree:true})}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ElaraOwnerHomeArtwork={refresh:schedule,assets:Object.freeze({hero:asset('homebanner1'),tasks:asset('tasks-card-background'),goals:asset('goals-target-background'),daily:asset('daily-banner-bg'),streak:asset('daily-streak-background'),wellness:asset('health-fitness-card-background'),language:asset('language-learning-background'),library:asset('library-card-background'),friends:asset('friends-card-bg'),ranking:asset('friends-ranking-bg'),focus:asset('pomodoro-icon')})};
})();
