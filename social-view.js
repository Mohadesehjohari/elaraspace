/* Shared Social/Ranking view; all people come from the authenticated social service. */
(()=>{'use strict';
const $=id=>document.getElementById(id),arr=v=>Array.isArray(v)?v:[],fa=n=>Number(n||0).toLocaleString('fa-IR'),num=n=>Number(n||0).toLocaleString(tt('fa-IR','en-US')),tt=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=(text,art='friends-group-icon.webp')=>`<div class="social-empty"><img src="assets/ui/${art}" alt=""><p>${text}</p></div>`;
const imageButton=(file,label,attrs)=>`<button type="button" class="social-art-button" aria-label="${label}" ${attrs}><img src="assets/ui/${file}" alt=""></button>`;
function profileModel(p){return window.ElaraProfileSystem?.viewModel?.(p,{self:p.uid===window.ElaraSocial?.me?.uid})||null}
function portrait(p,model=profileModel(p)){return model?.avatarSrc?`<img class="social-portrait" src="${esc(model.avatarSrc)}" alt="">`:`<span class="social-portrait initials">${esc((p.name||p.username||'؟').slice(0,1))}</span>`}
const person=p=>{const model=profileModel(p),shape=model?.shape||'circle',font=model?.nameFontCss||'inherit';return `<button type="button" class="social-person" data-profile-shape="${esc(shape)}" style="--elara-name-font:${esc(font)}" data-open-profile="${esc(p.uid)}">${portrait(p,model)}<span data-elara-ugc dir="auto"><strong>${esc(p.name||p.username||'کاربر')}</strong><small>${p.username?'@'+esc(p.username):''}</small></span></button>`};
const section=(title,body,cls='')=>`<section class="elara-card social-section ${cls}"><header><h2>${title}</h2></header>${body}</section>`;
const socialStats=p=>`<span class="social-person-stats"><b>${fa(p.xp)} XP</b>${Number.isInteger(Number(p.streak))?`<small class="social-streak" aria-label="استریک ${fa(p.streak)} روز">🔥 ${fa(p.streak)}</small>`:''}</span>`;
const rankingTabs=[['ranking','رنکینگ','Ranking','ranking-tab-active.webp'],['friends','دوستان','Friends','friends-tab.webp'],['community','جامعه','Community','community-tab.webp'],['clubs','کلاب‌ها','Clubs','clubs-tab.webp']];
const socialTabs=[['friends','دوستان','Friends','friends-tab.webp'],['chats','گفتگوها','Chats','friends-group-icon.webp'],['groups','گروه‌ها','Groups','clubs-tab.webp'],['clubs','کلاب‌ها','Clubs','clubs-tab.webp'],['activity','فعالیت','Activity','ranking-chart-icon.webp'],['requests','درخواست‌ها','Requests','invite-friend-button.webp']];
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
   const rawName=a.person?.name||a.person?.username||tt('دوستت','Your friend'),name=esc(rawName);
   if(a.type==='reading'){const pages=Math.max(0,Number(a.pagesRead)||0);return pages?tt(name+' امروز '+num(pages)+' صفحه جلو رفت 📚🔥',name+' moved '+num(pages)+' pages forward today 📚🔥'):tt(name+' امروز مطالعه‌شو جلو برد 😎📚',name+' made reading progress today 😎📚')}
   if(a.type==='book_clip'){const title=esc(a.bookTitle||tt('کتابش','their book')),excerpt=esc(a.excerpt||'');return tt(name+' یه بریده از «'+title+'» گذاشت 👀📖'+(excerpt?' '+excerpt:''),name+' shared a clip from “'+title+'” 👀📖'+(excerpt?' '+excerpt:''))}
   if(a.type==='task')return tt(name+' یه کار رو جمع کرد؛ یه قدم جلوتر ⚡🫡',name+' checked off a task — one step closer ⚡🫡');
   if(a.type==='habit')return tt(name+' عادت امروز رو زد به هدف 🤝🔥',name+' nailed today’s habit 🤝🔥');
   if(a.type==='goal')return tt(name+' به یه مرحله از هدفش رسید ⚡👊',name+' hit a goal milestone ⚡👊');
   if(a.type==='mission')return tt(name+' یه مأموریت رو ترکوند 🚀🔥',name+' crushed a mission 🚀🔥');
   if(a.type==='book')return tt(name+' یه کتاب رو به پایان رسوند 😎📖',name+' finished a book 😎📖');
   if(a.type==='exercise')return tt(name+' تمرینشو جمع کرد؛ بدن روشن، مود بهتر 🔥👊',name+' wrapped a workout — strong move 🔥👊');
   if(a.type==='streak')return tt(name+' استریکش رو نگه داشت 🔥🤝',name+' kept the streak alive 🔥🤝');
   if(a.type==='ranking')return tt(name+' توی رنکینگ یه پله بالا رفت 🏆⚡',name+' climbed the ranking 🏆⚡');
   if(a.type==='language')return tt(name+' یه قدم تو زبان جلو رفت 🧠⚡',name+' made language progress 🧠⚡');
   if(a.type==='focus'){const minutes=Math.max(1,Math.min(180,Number(a.durationMin)||1)),tag=String(a.tag||'').trim();return tt(name+' '+num(minutes)+' دقیقه Deep Work زد 🧠⚡'+(tag?' · #'+esc(tag):''),name+' did '+num(minutes)+' min of Deep Work 🧠⚡'+(tag?' · #'+esc(tag):''))}
   return tt(name+' امروز یه قدم جلو رفت 👊🔥',name+' moved one step forward today 👊🔥');
 };
 const engage=a=>a.id?`<div class="social-engagement-bar" data-engagement-kind="activity" data-engagement-id="${esc(a.id)}"><button type="button" data-engagement-like aria-pressed="false"><span data-engagement-heart>♡</span><span data-engagement-like-count>0</span></button><button type="button" data-engagement-comment>💬 <span data-engagement-comment-count>0</span></button></div>`:'';
 const activities=sharedActivities.map(a=>`<div class="social-row social-activity-row">${person(a.person||{})}<div class="social-activity-copy"><span data-elara-i18n="off">${activityCopy(a)}${a.ms?'<small>'+new Date(a.ms).toLocaleString(tt('fa-IR','en-US'))+'</small>':''}</span>${engage(a)}</div></div>`).join('')||empty('فعلاً اینجا آرومه 👀 وقتی دوستات چیزی رو با اجازه به اشتراک بذارن، خبرهای باحال‌شون همین‌جا میاد 🔥');
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
    if(route==='ranking')body=section(tt('رنکینگ دوستان','Friends ranking'),rankList,'social-friend-rank ranking-friends-only')+section(tt('رتبهٔ من بین دوستان','My rank among friends'),me?person(me)+`<div class="social-my-rank-line"><strong class="social-my-rank">${fa(ranked.findIndex(p=>p.uid===uid)+1)}</strong><span>${fa(me.xp)} XP</span></div>`:empty(tt('هنوز رتبهٔ دوستی شکل نگرفته.','No friend ranking yet.'),'icon-ranking-trophy.webp'),'social-my-rank-card');
    else body=section(tt('دعوت و جستجوی دوست','Invite and find friends'),`<form id="elara-add-friend" class="social-invite"><label class="social-search-field"><span class="sr-only">${tt('نام کاربری دوست','Friend username')}</span><input id="elara-add-friend-name" aria-label="${tt('نام کاربری دوست','Friend username')}" required autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="@username"></label><button type="submit" class="social-art-button invite" aria-label="${tt('ارسال درخواست دوستی','Send friend request')}" ${!me?'disabled':''}><img src="assets/ui/invite-friend-button.webp" alt=""></button>${imageButton('search-button.webp',tt('جستجوی دوست','Search for a friend'),'data-profile-lookup')}</form><p id="elara-social-message" role="status">${esc(s.error||(!me?tt('برای ارسال درخواست وارد حساب شو.','Sign in to send a friend request.'):''))}</p>`,'social-friend-invite')+section(tt('دوستان من','My friends'),'<div class="social-scroll">'+friendList+'</div>','social-friends-list');
  }
  if(tab==='requests'&&route==='social')body=section(tt('درخواست‌های دوستی','Friend requests'),requests+outgoing,'social-requests');
  if(tab==='activity'&&route==='social')body=section(tt('فعالیت دوستان','Friend activity'),'<div class="social-scroll">'+activities+'</div>','social-friend-activity');
  if(tab==='chats'&&route==='social')body='<div class="social-hub-slot" data-social-slot="chats" aria-live="polite"></div>';
  if(tab==='groups'&&route==='social')body='<div class="social-hub-slot" data-social-slot="groups" aria-live="polite"></div>';
  if(tab==='community'&&route==='ranking')body=section(tt('فعالیت دوستان','Friend activity'),activities,'social-community')+section(tt('همراهی در مسیر رشد','Growing together'),'<p>'+tt('فقط فعالیت‌هایی که دوستان با رضایت به اشتراک گذاشته‌اند نمایش داده می‌شوند.','Only activities friends chose to share are shown here.')+'</p>');
  if(tab==='clubs')body=route==='ranking'?section(tt('کلاب‌ها و کافهٔ الارا','Elara clubs and cafe'),empty(tt('فعلاً کلابی برای ورود نیست 🌝 به محض آماده‌شدن، همین‌جا پیداش می‌کنی.','No clubs are available yet. When real clubs are ready, they will appear here. 🌝'),'clubs-tab.webp'),'social-clubs'):'<div class="social-hub-slot" data-social-slot="clubs" aria-live="polite"></div>';
  const heading=route==='ranking'?{k:'ELARA · TOGETHER',faTitle:'رنکینگ و اجتماع',enTitle:'Ranking & Community',faSub:'در کنار هم، قله‌ها نزدیک‌ترند.',enSub:'Together, the next summit feels closer.'}:{k:'ELARA · FRIENDS',faTitle:'دوستان',enTitle:'Friends',faSub:'گفتگو، گروه، درخواست‌ها و فعالیت‌های واقعی دوستانت؛ جدا از رنکینگ.',enSub:'Chats, groups, requests and real friend activity — separate from Ranking.'};const headingTitle=tt(heading.faTitle,heading.enTitle);window.ElaraDOM.patch(root,`<header class="social-page-head"><div><small>${heading.k}</small><h1>${headingTitle}</h1><p>${tt(heading.faSub,heading.enSub)}</p></div><div class="social-head-art" aria-hidden="true"></div></header><div class="social-tabs" role="tablist" aria-label="${headingTitle}">${tabs.map(([key,faLabel,enLabel,art])=>`<button type="button" role="tab" aria-selected="${tab===key}" data-social-view="${key}" data-social-route="${route}"><img src="assets/ui/${art}" alt="">${tt(faLabel,enLabel)}</button>`).join('')}</div><div class="social-reference-grid" role="tabpanel">${body}</div>`);
 }
 window.ElaraDOM.patch($('elara-home-activity'),arr(s.activities).length?activities: '<p class="ref-empty">اینجا فعلاً ساکته 👀 وقتی دوستات فعالیتی رو باهات share کنن، خبرها همین‌جا میاد 🔥</p>');setTimeout(()=>window.ElaraEngagementView?.scan?.(),0);
 if(!ranked.length)window.ElaraDOM.patch($('elara-home-ranks'),empty('تنهایی هم می‌شه ترکوند 😎 ولی با یه رفیق، رنکینگ خیلی جذاب‌تر می‌شه 👊','icon-ranking-trophy.webp'));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-social-view]');if(b){selections[b.dataset.socialRoute]=b.dataset.socialView;render()}if(e.target.closest('[data-social-manage]')){selections.social='friends';window.ElaraOpen('social');render()}});
for(const event of ['elara:social-updated','elara:account-ready','elara:logout','elara:locale-changed'])window.addEventListener(event,render);
window.addEventListener('elara:open',e=>{if(['ranking','social'].includes(e.detail?.tab))render()});
window.ElaraSocialView={render};render();
})();
