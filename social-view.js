/* Shared Social/Ranking view; all people come from the authenticated social service. */
(()=>{'use strict';
const $=id=>document.getElementById(id),arr=v=>Array.isArray(v)?v:[],fa=n=>Number(n||0).toLocaleString('fa-IR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=(text,art='friends-group-icon.webp')=>`<div class="social-empty"><img src="assets/ui/${art}" alt=""><p>${text}</p></div>`;
const imageButton=(file,label,attrs)=>`<button type="button" class="social-art-button" aria-label="${label}" ${attrs}><img src="assets/ui/${file}" alt=""></button>`;
function portrait(p){const model=window.ElaraProfileSystem?.viewModel?.(p,{self:p.uid===window.ElaraSocial?.me?.uid});return model?.avatarSrc?`<img class="social-portrait" src="${esc(model.avatarSrc)}" alt="">`:`<span class="social-portrait initials">${esc((p.name||p.username||'؟').slice(0,1))}</span>`}
const person=p=>`<button type="button" class="social-person" data-open-profile="${esc(p.uid)}">${portrait(p)}<span><strong>${esc(p.name||p.username||'کاربر')}</strong><small>${p.username?'@'+esc(p.username):''}</small></span></button>`;
const section=(title,body,cls='')=>`<section class="elara-card social-section ${cls}"><header><h2>${title}</h2></header>${body}</section>`;
const tabs=[['ranking','رنکینگ','ranking-tab-active.webp'],['friends','دوستان','friends-tab.webp'],['community','جامعه','community-tab.webp'],['clubs','کلاب‌ها','clubs-tab.webp']];
let selections={social:'ranking',ranking:'ranking'};
function render(){
 const s=window.ElaraSocial||{},friends=arr(s.friends),me=s.me,uid=me?.uid,ranked=[me,...friends].filter(Boolean).sort((a,b)=>Number(b.xp||0)-Number(a.xp||0)),incoming=arr(s.requests).filter(r=>r.to===uid&&r.status==='pending');
 const requests=incoming.map(r=>`<div class="social-row" data-key="${esc(r.id)}">${person(r.person||{})}${imageButton('accept-request-button.webp','قبول درخواست',`data-friend-action="accept" data-request="${esc(r.id)}"`)}${imageButton('decline-request-button.webp','رد درخواست',`data-friend-action="decline" data-request="${esc(r.id)}"`)}</div>`).join('')||empty('درخواست دوستی تازه‌ای نداری.');
 const outgoing=arr(s.requests).filter(r=>r.from===uid&&r.status==='pending').map(r=>`<div class="social-row">${person(r.person||{})}<span>در انتظار پاسخ</span><button type="button" class="quiet-button" data-profile-friend-action="cancel" data-request="${esc(r.id)}">لغو</button></div>`).join('');
 const friendList=friends.map(p=>`<div class="social-row" data-key="${esc(p.uid)}">${person(p)}<b>${fa(p.xp)} XP</b></div>`).join('')||empty('مسیر رشد با یک همراه، زیباتر است. اولین دوستت را دعوت کن.');
 const podium=ranked.slice(0,3).map((p,i)=>`<article class="social-podium-place place-${i+1}"><div class="social-podium-avatar">${person(p)}<img class="social-rank-frame" src="assets/ui/artwork-rank-frame-${i+1}.webp" alt="رتبه ${i+1}"></div><b>${fa(p.xp)} XP</b></article>`).join('')||empty('سکوی برترین‌ها منتظر اولین همراه‌هاست.','icon-ranking-trophy.webp');
 const rankList=ranked.map((p,i)=>`<div class="social-row ${p.uid===uid?'is-me':''}" data-key="${esc(p.uid)}"><b>${fa(i+1)}</b>${person(p)}<b>${fa(p.xp)} XP</b></div>`).join('')||empty('هنوز داده‌ای برای رتبه‌بندی دریافت نشده است.','ranking-chart-icon.webp');
 const sharedActivities=arr(s.activities).filter(a=>a.visibility==='friends'||a.visibility==='public');
 const activityCopy=a=>{
   const name=esc(a.person?.name||a.person?.username||'دوستت');
   if(a.type==='reading'){const pages=Math.max(0,Number(a.pagesRead)||0);return pages?name+' امروز '+fa(pages)+' صفحه جلو رفت 📚🔥':name+' امروز مطالعه‌شو جلو برد 😎📚'}
   if(a.type==='task')return name+' یه قدم دیگه به هدفش نزدیک شد ⚡🫡';
   if(a.type==='habit')return name+' عادت امروز رو کامل کرد 🤝🔥';
   if(a.type==='book')return name+' یه کتاب رو به پایان رسوند 😎📖';
   return name+' امروز یه قدم جلو رفت 👊🔥';
 };
 const activities=sharedActivities.map(a=>`<div class="social-row">${person(a.person||{})}<span>${activityCopy(a)}${a.ms?'<small>'+new Date(a.ms).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+'</small>':''}</span></div>`).join('')||empty('فعالیت‌هایی که دوستان با اجازه به اشتراک می‌گذارند، اینجا دیده می‌شوند.');
 for(const route of ['social','ranking']){
  const root=$('elara-'+route+'-page');if(!root)continue;root.classList.add('social-reference');
  const tab=selections[route];let body='';
  if(tab==='ranking'){
    const top=section('۳ نفر برتر این هفته','<div class="social-podium">'+podium+'</div>','social-top-three');
    const mine=section('رتبهٔ من در این جمع',me?person(me)+`<div class="social-my-rank-line"><strong class="social-my-rank">${fa(ranked.findIndex(p=>p.uid===uid)+1)}</strong><span>${fa(me.xp)} XP</span></div><p class="muted">هر قدم، تو را قوی‌تر می‌کند.</p>`:empty('پس از ورود، رتبهٔ واقعی‌ات اینجا نمایش داده می‌شود.','icon-ranking-trophy.webp'),'social-my-rank-card');
    const weekly=section('رنکینگ این هفته',empty('دادهٔ XP هفتگی مستقل هنوز از سرویس دریافت نشده است.','ranking-chart-icon.webp'),'social-weekly');
    const friendRank=section('رنکینگ دوستان',rankList,'social-friend-rank');
    const requestCard=section('درخواست‌های دوستی',requests+outgoing,'social-requests');
    const online=section('دوستان آنلاین',empty('Presence واقعی هنوز در دسترس نیست؛ وضعیت ساختگی نمایش داده نمی‌شود.'),'social-online');
    const clubs=section('کلاب‌ها و کافهٔ الارا',empty('هنوز کلاب فعالی برای نمایش وجود ندارد.','clubs-tab.webp'),'social-clubs');
    body=top+mine+weekly+friendRank+'<div class="social-side-stack">'+requestCard+online+'</div>'+clubs;
  }
  if(tab==='friends')body=section('دعوت یک همراه',route==='social'?`<form id="elara-add-friend" class="social-invite"><label class="social-search-field"><span class="sr-only">نام کاربری دوست</span><input id="elara-add-friend-name" aria-label="نام کاربری دوست" required autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="@username"></label><button type="submit" class="social-art-button invite" aria-label="ارسال درخواست دوستی" ${!me?'disabled':''}><img src="assets/ui/invite-friend-button.webp" alt=""></button>${imageButton('search-button.webp','جستجوی دوست','data-profile-lookup')}</form><p id="elara-social-message" role="status">${esc(s.error||(!me?'برای ارسال درخواست وارد حساب شو.':''))}</p>`:'<button type="button" class="primary-button" data-social-manage>مدیریت دوستان</button>')+section('دوستان من',friendList)+section('درخواست‌های دوستی',requests+outgoing)+section('دوستان آنلاین',empty('وضعیت آنلاین دوستان در دسترس نیست.'));
  if(tab==='community')body=section('فعالیت دوستان',activities,'social-community')+section('همراهی در مسیر رشد','<p>فقط فعالیت‌هایی که دوستان با رضایت به اشتراک گذاشته‌اند نمایش داده می‌شوند.</p>');
  if(tab==='clubs')body=section('کلاب‌ها و کافهٔ الارا',empty('هنوز کلاب فعالی برای پیوستن وجود ندارد.','clubs-tab.webp'),'social-clubs');
  window.ElaraDOM.patch(root,`<header class="social-page-head"><div><small>ELARA · TOGETHER</small><h1>رنکینگ و اجتماع</h1><p>در کنار هم، قله‌ها نزدیک‌ترند.</p></div><div class="social-head-art" aria-hidden="true"></div></header><div class="social-tabs" role="tablist" aria-label="رنکینگ و اجتماع">${tabs.map(([key,label,art])=>`<button type="button" role="tab" aria-selected="${tab===key}" data-social-view="${key}" data-social-route="${route}"><img src="assets/ui/${art}" alt="">${label}</button>`).join('')}</div><div class="social-reference-grid" role="tabpanel">${body}</div>`);
 }
 window.ElaraDOM.patch($('elara-home-activity'),arr(s.activities).length?activities: '<p class="ref-empty">هنوز فعالیتی از دوستانت به اشتراک گذاشته نشده است.</p>');
 if(!ranked.length)window.ElaraDOM.patch($('elara-home-ranks'),empty('برای دیدن رتبه‌ها، دوستانت را اضافه کن.','icon-ranking-trophy.webp'));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-social-view]');if(b){selections[b.dataset.socialRoute]=b.dataset.socialView;render()}if(e.target.closest('[data-social-manage]')){selections.social='friends';window.ElaraOpen('social');render()}});
for(const event of ['elara:social-updated','elara:account-ready','elara:logout'])window.addEventListener(event,render);
window.addEventListener('elara:open',e=>{if(['ranking','social'].includes(e.detail?.tab))render()});
window.ElaraSocialView={render};render();
})();
