/* Shared Social/Ranking view; all people come from the authenticated social service. */
(()=>{'use strict';
const $=id=>document.getElementById(id),arr=v=>Array.isArray(v)?v:[],fa=n=>Number(n||0).toLocaleString('fa-IR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=(text,art='friends-group-icon.webp')=>`<div class="social-empty"><img src="assets/ui/${art}" alt=""><p>${text}</p></div>`;
const imageButton=(file,label,attrs)=>`<button type="button" class="social-art-button" aria-label="${label}" ${attrs}><img src="assets/ui/${file}" alt=""></button>`;
function profileModel(p){return window.ElaraProfileSystem?.viewModel?.(p,{self:p.uid===window.ElaraSocial?.me?.uid})||null}
function portrait(p,model=profileModel(p)){return model?.avatarSrc?`<img class="social-portrait" src="${esc(model.avatarSrc)}" alt="">`:`<span class="social-portrait initials">${esc((p.name||p.username||'؟').slice(0,1))}</span>`}
const person=p=>{const model=profileModel(p),shape=model?.shape||'circle',font=model?.nameFontCss||'inherit';return `<button type="button" class="social-person" data-profile-shape="${esc(shape)}" style="--elara-name-font:${esc(font)}" data-open-profile="${esc(p.uid)}">${portrait(p,model)}<span><strong>${esc(p.name||p.username||'کاربر')}</strong><small>${p.username?'@'+esc(p.username):''}</small></span></button>`};
const section=(title,body,cls='')=>`<section class="elara-card social-section ${cls}"><header><h2>${title}</h2></header>${body}</section>`;
const socialStats=p=>`<span class="social-person-stats"><b>${fa(p.xp)} XP</b>${Number.isInteger(Number(p.streak))?`<small class="social-streak" aria-label="استریک ${fa(p.streak)} روز">🔥 ${fa(p.streak)}</small>`:''}</span>`;
const rankingTabs=[['ranking','رنکینگ','ranking-tab-active.webp'],['friends','دوستان','friends-tab.webp'],['community','جامعه','community-tab.webp'],['clubs','کلاب‌ها','clubs-tab.webp']];
const socialTabs=[['friends','دوستان','friends-tab.webp'],['community','فعالیت دوستان','friends-group-icon.webp'],['clubs','گروه‌ها','clubs-tab.webp']];
let selections={social:'friends',ranking:'ranking'};
function render(){
 const s=window.ElaraSocial||{},friends=arr(s.friends),me=s.me,uid=me?.uid,ranked=[me,...friends].filter(Boolean).sort((a,b)=>Number(b.xp||0)-Number(a.xp||0)),incoming=arr(s.requests).filter(r=>r.to===uid&&r.status==='pending');
 const requests=incoming.map(r=>`<div class="social-row" data-key="${esc(r.id)}">${person(r.person||{})}${imageButton('accept-request-button.webp','قبول درخواست',`data-friend-action="accept" data-request="${esc(r.id)}"`)}${imageButton('decline-request-button.webp','رد درخواست',`data-friend-action="decline" data-request="${esc(r.id)}"`)}</div>`).join('')||empty('فعلاً کسی در نزده 😄 وقتی یه درخواست تازه بیاد، همین‌جا پیداش می‌کنی.');
 const outgoing=arr(s.requests).filter(r=>r.from===uid&&r.status==='pending').map(r=>`<div class="social-row">${person(r.person||{})}<span>در انتظار پاسخ</span><button type="button" class="quiet-button" data-profile-friend-action="cancel" data-request="${esc(r.id)}">لغو</button></div>`).join('');
 const friendList=friends.map(p=>`<div class="social-row" data-key="${esc(p.uid)}">${person(p)}${socialStats(p)}</div>`).join('')||empty('اینجا هنوز خلوتِ خلوتِه 😎 یه رفیق دعوت کن؛ رقابت و پیشرفت دوتایی خیلی باحال‌تره 👊');
 const podium=ranked.slice(0,3).map((p,i)=>`<article class="social-podium-place place-${i+1}"><div class="social-podium-avatar">${person(p)}<img class="social-rank-frame" src="assets/ui/artwork-rank-frame-${i+1}.webp" alt="رتبه ${i+1}"></div>${socialStats(p)}</article>`).join('')||empty('سکو فعلاً منتظر رفیق‌های توئه 🏆🔥 چند دوست اضافه کن تا رقابت واقعی شروع بشه.','icon-ranking-trophy.webp');
 const rankList=ranked.map((p,i)=>`<div class="social-row ${p.uid===uid?'is-me':''}" data-key="${esc(p.uid)}"><b>${fa(i+1)}</b>${person(p)}${socialStats(p)}</div>`).join('')||empty('هنوز رتبه‌ای شکل نگرفته 👀 با چند فعالیت واقعی، جدول کم‌کم جون می‌گیره.','ranking-chart-icon.webp');
 const sharedActivities=arr(s.activities).filter(a=>a.visibility==='friends'||a.visibility==='public');
 const activityCopy=a=>{
   const name=esc(a.person?.name||a.person?.username||'دوستت');
   if(a.type==='reading'){const pages=Math.max(0,Number(a.pagesRead)||0);return pages?name+' امروز '+fa(pages)+' صفحه جلو رفت 📚🔥':name+' امروز مطالعه‌شو جلو برد 😎📚'}
   if(a.type==='book_clip')return name+' یه بریده از «'+esc(a.bookTitle||'کتابش')+'» گذاشت 👀📖 '+esc(a.excerpt||'');
   if(a.type==='task')return name+' یه قدم دیگه به هدفش نزدیک شد ⚡🫡';
   if(a.type==='habit')return name+' عادت امروز رو کامل کرد 🤝🔥';
   if(a.type==='book')return name+' یه کتاب رو به پایان رسوند 😎📖';
   return name+' امروز یه قدم جلو رفت 👊🔥';
 };
 const engage=a=>a.id?`<div class="social-engagement-bar" data-engagement-kind="activity" data-engagement-id="${esc(a.id)}"><button type="button" data-engagement-like aria-pressed="false"><span data-engagement-heart>♡</span><span data-engagement-like-count>0</span></button><button type="button" data-engagement-comment>💬 <span data-engagement-comment-count>0</span></button></div>`:'';
 const activities=sharedActivities.map(a=>`<div class="social-row social-activity-row">${person(a.person||{})}<div class="social-activity-copy"><span>${activityCopy(a)}${a.ms?'<small>'+new Date(a.ms).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+'</small>':''}</span>${engage(a)}</div></div>`).join('')||empty('فعلاً اینجا آرومه 👀 وقتی دوستات چیزی رو با اجازه به اشتراک بذارن، خبرهای باحال‌شون همین‌جا میاد 🔥');
 for(const route of ['social','ranking']){
  const root=$('elara-'+route+'-page');if(!root)continue;root.classList.add('social-reference');root.classList.toggle('social-friends-page',route==='social');root.classList.toggle('social-ranking-page',route==='ranking');
  const tabs=route==='social'?socialTabs:rankingTabs,allowed=tabs.map(x=>x[0]);if(!allowed.includes(selections[route]))selections[route]=allowed[0];
  const tab=selections[route];let body='';
  if(tab==='ranking'){
    const top=section('۳ نفر برتر این هفته','<div class="social-podium">'+podium+'</div>','social-top-three');
    const mine=section('رتبهٔ من در این جمع',me?person(me)+`<div class="social-my-rank-line"><strong class="social-my-rank">${fa(ranked.findIndex(p=>p.uid===uid)+1)}</strong><span>${fa(me.xp)} XP</span></div><p class="muted">هر قدم، تو را قوی‌تر می‌کند.</p>`:empty('وارد حسابت شو تا رتبهٔ واقعی خودت رو ببینی 🏆','icon-ranking-trophy.webp'),'social-my-rank-card');
    const weekly=section('رنکینگ این هفته',empty('این هفته هنوز دادهٔ رتبه‌بندی مستقلی نرسیده؛ به محض رسیدن، جدول واقعی همین‌جا میاد ⚡','ranking-chart-icon.webp'),'social-weekly');
    const friendRank=section('رنکینگ دوستان',rankList,'social-friend-rank');
    const requestCard=section('درخواست‌های دوستی',requests+outgoing,'social-requests');
    const online=section('دوستان آنلاین',empty('وضعیت آنلاین واقعی هنوز وصل نیست؛ فعلاً چیزی الکی نشونت نمی‌دیم 😎'),'social-online');
    const clubs=section('کلاب‌ها و کافهٔ الارا',empty('کلاب‌ها فعلاً ساکتن 🌚 وقتی کلاب واقعی آماده باشه، اینجا پیداش می‌کنی.','clubs-tab.webp'),'social-clubs');
    body=top+mine+weekly+friendRank+'<div class="social-side-stack">'+requestCard+online+'</div>'+clubs;
  }
  if(tab==='friends'){
    if(route==='ranking')body=section('رنکینگ دوستان',rankList,'social-friend-rank ranking-friends-only')+section('رتبهٔ من بین دوستان',me?person(me)+`<div class="social-my-rank-line"><strong class="social-my-rank">${fa(ranked.findIndex(p=>p.uid===uid)+1)}</strong><span>${fa(me.xp)} XP</span></div>`:empty('هنوز رتبهٔ دوستی شکل نگرفته.','icon-ranking-trophy.webp'),'social-my-rank-card');
    else body=section('دعوت و جستجوی دوست',`<form id="elara-add-friend" class="social-invite"><label class="social-search-field"><span class="sr-only">نام کاربری دوست</span><input id="elara-add-friend-name" aria-label="نام کاربری دوست" required autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="@username"></label><button type="submit" class="social-art-button invite" aria-label="ارسال درخواست دوستی" ${!me?'disabled':''}><img src="assets/ui/invite-friend-button.webp" alt=""></button>${imageButton('search-button.webp','جستجوی دوست','data-profile-lookup')}</form><p id="elara-social-message" role="status">${esc(s.error||(!me?'برای ارسال درخواست وارد حساب شو.':''))}</p>`,'social-friend-invite')+section('دوستان من','<div class="social-scroll">'+friendList+'</div>','social-friends-list')+section('درخواست‌های دوستی',requests+outgoing,'social-requests')+section('فعالیت دوستان','<div class="social-scroll">'+activities+'</div>','social-friend-activity');
  }
  if(tab==='community')body=section('فعالیت دوستان',activities,'social-community')+section('همراهی در مسیر رشد','<p>فقط فعالیت‌هایی که دوستان با رضایت به اشتراک گذاشته‌اند نمایش داده می‌شوند.</p>');
  if(tab==='clubs')body=section('کلاب‌ها و کافهٔ الارا',empty('فعلاً کلابی برای ورود نیست 🌝 به محض آماده‌شدن، همین‌جا پیداش می‌کنی.','clubs-tab.webp'),'social-clubs');
  const heading=route==='ranking'?{k:'ELARA · TOGETHER',title:'رنکینگ و اجتماع',sub:'در کنار هم، قله‌ها نزدیک‌ترند.'}:{k:'ELARA · FRIENDS',title:'دوستان',sub:'آدم‌های مسیرت، گفتگوها و فعالیت‌هایی که با هم به اشتراک می‌گذارید.'};window.ElaraDOM.patch(root,`<header class="social-page-head"><div><small>${heading.k}</small><h1>${heading.title}</h1><p>${heading.sub}</p></div><div class="social-head-art" aria-hidden="true"></div></header><div class="social-tabs" role="tablist" aria-label="${heading.title}">${tabs.map(([key,label,art])=>`<button type="button" role="tab" aria-selected="${tab===key}" data-social-view="${key}" data-social-route="${route}"><img src="assets/ui/${art}" alt="">${label}</button>`).join('')}</div><div class="social-reference-grid" role="tabpanel">${body}</div>`);
 }
 window.ElaraDOM.patch($('elara-home-activity'),arr(s.activities).length?activities: '<p class="ref-empty">اینجا فعلاً ساکته 👀 وقتی دوستات فعالیتی رو باهات share کنن، خبرها همین‌جا میاد 🔥</p>');setTimeout(()=>window.ElaraEngagementView?.scan?.(),0);
 if(!ranked.length)window.ElaraDOM.patch($('elara-home-ranks'),empty('تنهایی هم می‌شه ترکوند 😎 ولی با یه رفیق، رنکینگ خیلی جذاب‌تر می‌شه 👊','icon-ranking-trophy.webp'));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-social-view]');if(b){selections[b.dataset.socialRoute]=b.dataset.socialView;render()}if(e.target.closest('[data-social-manage]')){selections.social='friends';window.ElaraOpen('social');render()}});
for(const event of ['elara:social-updated','elara:account-ready','elara:logout'])window.addEventListener(event,render);
window.addEventListener('elara:open',e=>{if(['ranking','social'].includes(e.detail?.tab))render()});
window.ElaraSocialView={render};render();
})();
