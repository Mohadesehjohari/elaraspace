/* Shared Social/Ranking view; all people come from the authenticated social service. */
(()=>{'use strict';
const $=id=>document.getElementById(id),arr=v=>Array.isArray(v)?v:[],fa=n=>Number(n||0).toLocaleString('fa-IR'),num=n=>Number(n||0).toLocaleString(tt('fa-IR','en-US')),tt=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=(text,art='friends-group-icon.webp')=>`<div class="social-empty"><img src="assets/ui/${art}" alt=""><p>${text}</p></div>`;
const imageButton=(file,label,attrs)=>`<button type="button" class="social-art-button" aria-label="${label}" ${attrs}><img src="assets/ui/${file}" alt=""></button>`;
function profileModel(p){return window.ElaraProfileSystem?.viewModel?.(p,{self:p.uid===window.ElaraSocial?.me?.uid})||null}
function avatarStack(p,model=profileModel(p),cls='social-avatar-stack'){return window.ElaraProfileSystem.avatarShell(model||{name:p.name},{className:cls+' social-profile-stack',imageClass:'social-portrait',frameClass:'social-profile-frame'})}
const presenceFor=p=>window.ElaraSocial?.presence?.state?.(p?.uid)||{online:false,lastSeen:0,known:false};
const person=p=>{const model=profileModel(p),shape=model?.shape||'circle',font=model?.nameFontCss||'inherit',presence=presenceFor(p);return `<button type="button" class="social-person" data-profile-shape="${esc(shape)}" style="--elara-name-font:${esc(font)}" data-open-profile="${esc(p.uid)}">${avatarStack(p,model)}${presence.online?'<i class="social-presence-dot" aria-label="'+tt('آنلاین','Online')+'"></i>':''}<span data-elara-ugc dir="auto"><strong>${esc(p.name||p.username||'کاربر')}</strong><small>${p.username?'@'+esc(p.username):''}</small></span></button>`};
const podiumPerson=(p,i)=>{const model=profileModel(p),shape=model?.shape||'circle',font=model?.nameFontCss||'inherit';return `<button type="button" class="social-podium-profile" data-profile-shape="${esc(shape)}" style="--elara-name-font:${esc(font)}" data-open-profile="${esc(p.uid)}">${avatarStack(p,model,'social-podium-avatar')}<span class="social-podium-rank" aria-label="${tt('رتبه','Rank')} ${i+1}">${i+1}</span><span class="social-podium-copy" data-elara-ugc dir="auto"><strong>${esc(p.name||p.username||'کاربر')}</strong><small>${p.username?'@'+esc(p.username):''}</small></span></button>`};
const section=(title,body,cls='')=>`<section class="elara-card social-section ${cls}"><header><h2>${title}</h2></header>${body}</section>`;
const socialStats=p=>`<span class="social-person-stats"><b>${fa(p.xp)} XP</b>${Number.isInteger(Number(p.streak))?`<small class="social-streak" aria-label="استریک ${fa(p.streak)} روز">🔥 ${fa(p.streak)}</small>`:''}</span>`;
const rankingTabs=[['ranking','رنکینگ','Ranking','ranking-tab-active.webp'],['friends','دوستان','Friends','friends-tab.webp'],['community','جامعه','Community','community-tab.webp'],['clubs','کلاب‌ها','Clubs','clubs-tab.webp']];
const socialTabs=[['friends','دوستان من','My friends','43-friends-icon.webp'],['chats','چت‌ها','Chats','44-private-chats-icon.webp'],['groups','گروه‌ها','Groups','45-groups-icon.webp'],['clubs','باشگاه‌ها','Clubs','46-clubs-icon..webp'],['challenges','چالش‌ها','Challenges','11-challenges-icon.webp'],['activity','فعالیت‌ها','Activity','47-friend-activity-icon..webp'],['requests','درخواست‌ها','Requests','48-friend-requests-icon.webp'],['ranking','رتبه‌بندی','Ranking','icon-ranking-trophy.webp']];
const initialView=(()=>{try{return new URL(location.href).searchParams.get('friendsTab')}catch{return null}})();
let selections={social:socialTabs.some(x=>x[0]===initialView)?initialView:'friends',ranking:'ranking'};
let friendFilter='',onlineFilter=false;
function render(){
 const s=window.ElaraSocial||{},friends=arr(s.friends),me=s.me,uid=me?.uid,ranked=[me,...friends].filter(Boolean).sort((a,b)=>Number(b.xp||0)-Number(a.xp||0)),pendingRequests=arr(s.requests).filter(r=>r.status==='pending'),incoming=pendingRequests.filter(r=>r.to===uid),outgoingRows=pendingRequests.filter(r=>r.from===uid);
 const requests=incoming.map(r=>`<div class="social-row social-request-row is-incoming" data-key="${esc(r.id)}">${person(r.person||{})}<span class="social-request-state">${tt('ورودی','Incoming')}</span><div class="social-request-actions">${imageButton('accept-request-button.webp',tt('قبول درخواست','Accept request'),`data-friend-action="accept" data-request="${esc(r.id)}"`)}${imageButton('decline-request-button.webp',tt('رد درخواست','Decline request'),`data-friend-action="decline" data-request="${esc(r.id)}"`)}</div></div>`).join('');
 const outgoing=outgoingRows.map(r=>`<div class="social-row social-request-row is-outgoing" data-key="${esc(r.id)}">${person(r.person||{})}<span class="social-request-state">${tt('ارسالی · در انتظار پاسخ','Outgoing · pending')}</span><div class="social-request-actions"><button type="button" class="quiet-button" data-profile-friend-action="cancel" data-request="${esc(r.id)}">${tt('لغو','Cancel')}</button></div></div>`).join('');
 const requestRows=requests+outgoing||empty(tt('فعلاً درخواست دوستی فعالی نداری.','No active friend requests right now.'));
 const requestCard=section('<span class="social-section-title"><img src="assets/ui/48-friend-requests-icon.webp" alt="">'+tt('درخواست‌های دوستی','Friend requests')+(pendingRequests.length?`<b class="social-count-badge">${fa(pendingRequests.length)}</b>`:'')+'</span>',requestRows,'social-requests social-requests-standalone');
 const collabRows=arr(window.ElaraCollab?.pendingInvites?.()),collabLabel=kind=>kind==='task'?tt('تسک مشترک','Shared task'):kind==='habit'?tt('عادت مشترک','Shared habit'):kind==='goal'?tt('هدف مشترک','Shared goal'):kind==='language-class'?tt('کلاس مشترک','Shared class'):tt('لایتنر مشترک','Shared Leitner item');
 const collabBody=collabRows.map(row=>`<div class="social-row collab-request-row" data-key="${esc(row.id)}">${person(row.sender||{uid:row.from,name:tt('دوست','Friend')})}<div class="collab-request-copy"><small>${collabLabel(row.kind)}</small><strong data-elara-ugc dir="auto">${esc(row.title||collabLabel(row.kind))}</strong></div><div class="social-request-actions"><button type="button" class="primary-button" data-collab-accept="${esc(row.id)}">${tt('قبول','Accept')}</button><button type="button" class="quiet-button danger" data-collab-decline="${esc(row.id)}">${tt('رد','Decline')}</button></div></div>`).join('')||empty(tt('درخواست مشترک جدیدی نداری.','No new shared requests.'),'43-friends-icon.webp');
 const collabCard=section('<span class="social-section-title">'+tt('درخواست‌های مشترک','Shared requests')+(collabRows.length?`<b class="social-count-badge">${fa(collabRows.length)}</b>`:'')+'</span>',collabBody,'social-collab-requests');
 const presenceCopy=p=>{const x=presenceFor(p);if(x.online)return tt('آنلاین','Online');if(x.known&&x.lastSeen)return tt('آخرین حضور: ','Last seen: ')+new Date(x.lastSeen).toLocaleString(tt('fa-IR','en-US'));return tt('وضعیت حضور نامشخص','Presence unknown')};
 const friendList=friends.map(p=>`<div class="social-row" data-key="${esc(p.uid)}">${person(p)}<small class="social-presence-copy">${esc(presenceCopy(p))}</small>${socialStats(p)}</div>`).join('')||empty('اینجا هنوز خلوتِ خلوتِه 😎 یه رفیق دعوت کن؛ رقابت و پیشرفت دوتایی خیلی باحال‌تره 👊');
 const podium=ranked.slice(0,3).map((p,i)=>`<article class="social-podium-place place-${i+1}">${podiumPerson(p,i)}${socialStats(p)}</article>`).join('')||empty('سکو فعلاً منتظر رفیق‌های توئه 🏆🔥 چند دوست اضافه کن تا رقابت واقعی شروع بشه.','icon-ranking-trophy.webp');
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
  const root=$('elara-'+route+'-page');if(!root)continue;root.dataset.socialTab=selections[route];root.classList.add('social-reference');root.classList.toggle('social-friends-page',route==='social');root.classList.toggle('social-ranking-page',route==='ranking');
  const tabs=route==='social'?socialTabs:rankingTabs,allowed=tabs.map(x=>x[0]);if(!allowed.includes(selections[route]))selections[route]=allowed[0];
  const tab=selections[route];let body='';
  if(tab==='ranking'){
    const myIndex=me?ranked.findIndex(p=>p.uid===uid):-1,myRank=myIndex>=0?myIndex+1:0,ahead=myIndex>0?ranked[myIndex-1]:null;
    const gap=ahead?Math.max(0,Number(ahead.xp||0)-Number(me?.xp||0)):0,progress=ahead&&Number(ahead.xp)>0?Math.max(8,Math.min(100,Math.round(Number(me?.xp||0)/Number(ahead.xp)*100))):100;
    const top=section('<span class="social-section-title"><img src="assets/ui/icon-ranking-trophy.webp" alt="">'+tt('۳ نفر برتر دوستان','Top 3 friends')+'</span>','<div class="social-podium">'+podium+'</div>','social-top-three');
    const mine=section('<span class="social-section-title"><img src="assets/ui/icon-ranking-trophy.webp" alt="">'+tt('رتبهٔ من بین دوستان','My rank among friends')+'</span>',me?`<div class="social-my-rank-shell">${person(me)}<div class="social-my-rank-line"><strong class="social-my-rank">${fa(myRank)}</strong><span>${fa(me.xp)} XP</span></div><div class="social-rank-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div><p class="social-rank-gap">${ahead?fa(gap)+' XP تا رتبهٔ بالاتر':'فعلاً بالاترین رتبهٔ این جمع برای توست.'}</p><blockquote>هر قدم، تو را قوی‌تر می‌کند.</blockquote></div>`:empty('وارد حسابت شو تا رتبهٔ واقعی خودت رو ببینی.','icon-ranking-trophy.webp'),'social-my-rank-card');
    const weekly=section('<span class="social-section-title"><img src="assets/ui/ranking-chart-icon.webp" alt="">رنکینگ این هفته</span>',empty(tt('رتبه‌بندی هفتگی هنوز در دسترس نیست.','Weekly ranking is not available yet.'),'ranking-chart-icon.webp'),'social-weekly');
    const friendRank=section('<span class="social-section-title"><img src="assets/ui/43-friends-icon.webp" alt="">رنکینگ دوستان</span>','<div class="social-rank-table">'+rankList+'</div>','social-friend-rank');
    const onlineFriends=friends.filter(p=>presenceFor(p).online),presenceVis=uid?(localStorage.getItem('elara_presence_visibility_'+uid)||'friends'):'friends';
    const online=section('<span class="social-section-title"><img src="assets/ui/online-status.webp" alt="">'+tt('دوستان آنلاین','Online friends')+'</span>',`<label class="social-presence-privacy">${tt('نمایش حضور من','My presence visibility')}<select data-presence-visibility ${!uid?'disabled':''}><option value="private" ${presenceVis==='private'?'selected':''}>${tt('خصوصی','Private')}</option><option value="friends" ${presenceVis==='friends'?'selected':''}>${tt('دوستان','Friends')}</option><option value="public" ${presenceVis==='public'?'selected':''}>${tt('عمومی','Public')}</option></select></label><div class="social-scroll">${onlineFriends.map(p=>`<div class="social-row" data-key="${esc(p.uid)}">${person(p)}<span class="social-online-label">● ${tt('آنلاین','Online')}</span></div>`).join('')||empty(tt('الان هیچ دوست تأییدشده‌ای با heartbeat تازه آنلاین نیست.','No accepted friend currently has a fresh presence heartbeat.'),'43-friends-icon.webp')}</div>`,'social-online');
    const clubs=section('<span class="social-section-title"><img src="assets/ui/clubs-tab.webp" alt="">کلاب‌ها و کافهٔ الارا</span>',`<div class="social-club-promo"><div><strong>با آدم‌های هم‌فکر مسیرت را ادامه بده.</strong><small>کلاب‌های واقعی حساب تو اینجا نمایش داده می‌شوند.</small></div><button type="button" data-social-view="clubs" data-social-route="ranking">رفتن به کلاب‌ها</button></div>`,'social-clubs');
    body=top+mine+weekly+friendRank+requestCard+online+clubs;
  }
  if(tab==='friends'){
    if(route==='ranking')body=section(tt('رنکینگ دوستان','Friends ranking'),rankList,'social-friend-rank ranking-friends-only')+section(tt('رتبهٔ من بین دوستان','My rank among friends'),me?person(me)+`<div class="social-my-rank-line"><strong class="social-my-rank">${fa(ranked.findIndex(p=>p.uid===uid)+1)}</strong><span>${fa(me.xp)} XP</span></div>`:empty(tt('هنوز رتبهٔ دوستی شکل نگرفته.','No friend ranking yet.'),'icon-ranking-trophy.webp'),'social-my-rank-card');
    else body=section(tt('دعوت و جستجوی دوست','Invite and find friends'),`<form id="elara-add-friend" class="social-invite"><label class="social-search-field"><span class="sr-only">${tt('نام کاربری دوست','Friend username')}</span><input id="elara-add-friend-name" aria-label="${tt('نام کاربری دوست','Friend username')}" required autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="@username"></label><button type="submit" class="social-art-button invite" aria-label="${tt('ارسال درخواست دوستی','Send friend request')}" ${!me?'disabled':''}><img src="assets/ui/invite-friend-button.webp" alt=""></button>${imageButton('search-button.webp',tt('جستجوی دوست','Search for a friend'),'data-profile-lookup')}</form><p id="elara-social-message" role="status">${esc(s.error||(!me?tt('برای ارسال درخواست وارد حساب شو.','Sign in to send a friend request.'):''))}</p>`,'social-friend-invite')+section(tt('دوستان من','My friends'),'<div class="social-scroll">'+friendList+'</div>','social-friends-list');
  }
  if(tab==='challenges'&&route==='social')body='<div class="social-hub-slot" data-social-slot="challenges" aria-live="polite"></div>';
  if(tab==='requests'&&route==='social')body='<p class="social-request-note">'+tt('درخواست‌های واقعی دوستی و همکاری در این صفحه نمایش داده می‌شوند.','Your actual friend and collaboration requests are shown below.')+'</p>';
  if(tab==='activity'&&route==='social')body=section(tt('فعالیت دوستان','Friend activity'),'<div class="social-scroll">'+activities+'</div>','social-friend-activity');
  if(tab==='chats'&&route==='social')body='<div class="social-hub-slot" data-social-slot="chats" aria-live="polite"></div>';
  if(tab==='groups'&&route==='social')body='<div class="social-hub-slot" data-social-slot="groups" aria-live="polite"></div>';
  if(tab==='community'&&route==='ranking')body=section(tt('فعالیت دوستان','Friend activity'),'<div class="social-scroll">'+activities+'</div>','social-community')+section(tt('همراهی در مسیر رشد','Growing together'),'<p>'+tt('فقط فعالیت‌هایی که دوستان با رضایت به اشتراک گذاشته‌اند نمایش داده می‌شوند.','Only activities friends chose to share are shown here.')+'</p>','social-community-note');
  if(tab==='clubs')body=route==='ranking'?section(tt('کلاب‌ها و کافهٔ الارا','Elara clubs and cafe'),empty(tt('فعلاً کلابی برای ورود نیست 🌝 به محض آماده‌شدن، همین‌جا پیداش می‌کنی.','No clubs are available yet. When real clubs are ready, they will appear here. 🌝'),'clubs-tab.webp'),'social-clubs'):'<div class="social-hub-slot" data-social-slot="clubs" aria-live="polite"></div>';
  if(route==='social'&&tab==='friends'){
   const online=friends.filter(p=>presenceFor(p).online).length;
   const latest=sharedActivities.filter(a=>Number(a.ms||0)>=Date.now()-604800000).length;
   const rank=me?ranked.findIndex(p=>p.uid===uid)+1:0;
   const stats=[[tt('دوستان من','My friends'),fa(friends.length),'👥'],[tt('آنلاین الآن','Online now'),fa(online),'🟢'],[tt('درخواست جدید','New requests'),fa(incoming.length),'💌'],[tt('باشگاه‌های عضو','Club membership'),tt('مشاهده','View'),'🛡️'],[tt('فعالیت این هفته','Weekly activity'),fa(latest),'🔥'],[tt('رتبه میان دوستان','Rank among friends'),rank?fa(rank):'—','🏆']];
   const cards='<section class="social-dashboard-stats" aria-label="'+tt('آمار دوستان','Friend statistics')+'">'+stats.map(row=>'<article class="social-dashboard-stat"><span aria-hidden="true">'+row[2]+'</span><strong>'+row[1]+'</strong><small>'+row[0]+'</small></article>').join('')+'</section>';
   const search='<div class="social-friends-tools"><input type="search" data-friends-filter aria-label="'+tt('جستجوی دوستان','Search friends')+'" placeholder="'+tt('جستجو در دوستان من…','Search friends…')+'" value="'+esc(friendFilter)+'"><label><input type="checkbox" data-friends-online-only '+(onlineFilter?'checked':'')+'>'+tt('فقط آنلاین','Online only')+'</label></div>';
   const extras=section(tt('فعالیت دوستان','Friend activity'),'<div class="social-scroll">'+activities+'</div>','social-dashboard-activity')+section(tt('افراد پیشنهادی','Suggested people'),empty(tt('پیشنهاد تأییدشده‌ای در دسترس نیست.','No verified suggestions are available.')),'social-dashboard-suggestions')+section(tt('گروه‌ها و باشگاه‌های من','My groups and clubs'),'<div class="social-dashboard-links"><button type="button" data-social-view="groups" data-social-route="social">'+tt('گروه‌های من','My groups')+'</button><button type="button" data-social-view="clubs" data-social-route="social">'+tt('باشگاه‌های من','My clubs')+'</button></div>','social-dashboard-communities')+section(tt('رتبه‌بندی دوستان','Friend ranking'),'<div class="social-rank-table">'+rankList+'</div><button class="quiet-button" type="button" data-social-hero-action="ranking">'+tt('مشاهده همه','View all')+'</button>','social-dashboard-ranking');
   body=cards+search+body+extras;
  }
  if(route==='social'&&tab==='friends'){const pos=body.indexOf('</section>');if(pos>=0)body=body.slice(0,pos+10)+requestCard+collabCard+body.slice(pos+10)}
  if(route==='social'&&tab==='requests')body=requestCard+collabCard+body;
  const heroText={friends:['دوستان الارا','Elara Friends','با همراهان هم‌مسیرت، دنیای بزرگ‌تری بساز.','Grow together with friends.'],chats:['گفتگوهایی فراتر از فاصله‌ها','Conversations beyond distance','با دوستانت در ارتباط بمان و ایده‌ها را به اشتراک بگذار.','Connect and share ideas.'],groups:['با آدم‌های هم‌مسیر دنیای بزرگ‌تری بساز','Build a bigger world together','گفتگو و یادگیری کنار گروه‌های واقعی.','Join real conversations.'],clubs:['باشگاه‌ها','Clubs','با همراهانت مسیر بزرگ‌تری بساز.','Grow together in clubs.'],challenges:['چالش‌ها، همراهی و رشد واقعی','Challenges and real growth','با دوستانت چالش‌های هیجان‌انگیز را تجربه کن.','Take on challenges together.'],activity:['فعالیت دوستان','Friend activity','فعالیت‌های واقعی به اشتراک‌گذاشته‌شده با اجازه.','Real activity shared with consent.'],requests:['درخواست‌ها','Requests','درخواست‌های دوستی و همکاریِ واقعی.','Actual friend and collaboration requests.'],ranking:['رتبه‌بندی','Ranking','بر پایهٔ داده‌های واقعی.','Based on real data.']};
  const ht=route==='ranking'?['رنکینگ و اجتماع','Ranking & Community','در کنار هم، قله‌ها نزدیک‌ترند.','Together we grow.']:(heroText[tab]||heroText.friends);
  const headingTitle=tt(ht[0],ht[1]);
  const heroActions={friends:['ranking','رفتن به رتبه‌بندی','View ranking'],chats:['new-message','پیام جدید','New message'],groups:['new-group','ایجاد گروه جدید','Create group'],clubs:['new-club','ساخت باشگاه','Create club'],challenges:['new-challenge','ایجاد چالش جدید','New challenge']};
  const action=route==='social'?heroActions[tab]:null,cta=action?'<button type="button" class="social-hero-cta" data-social-hero-action="'+action[0]+'">'+tt(action[1],action[2])+' <span aria-hidden="true">←</span></button>':'';
  window.ElaraDOM.patch(root,'<header class="social-page-head"><div class="social-head-copy"><small>ELARA · '+(route==='ranking'?'RANKING':'FRIENDS')+'</small><h1>'+headingTitle+'</h1><p>'+tt(ht[2],ht[3])+'</p>'+cta+'</div></header><div class="social-tabs" role="tablist" aria-label="'+headingTitle+'">'+tabs.map(([key,faLabel,enLabel,art])=>'<button type="button" role="tab" aria-selected="'+(tab===key)+'" data-social-view="'+key+'" data-social-route="'+route+'"><img src="assets/ui/'+art+'" alt=""><span class="social-tab-label">'+tt(faLabel,enLabel)+'</span></button>').join('')+'</div><div class="social-reference-grid" role="tabpanel">'+body+'</div>');
  if(route==='social')root.querySelectorAll('.social-friends-list .social-row').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(friendFilter.toLowerCase())||(onlineFilter&&!row.querySelector('.social-presence-dot')));
  const tabStrip=root.querySelector('.social-tabs');
  if(tabStrip){
   tabStrip.style.setProperty('display','flex','important');
   tabStrip.style.setProperty('flex-direction','row','important');
   tabStrip.style.setProperty('flex-wrap','nowrap','important');
   tabStrip.style.setProperty('overflow-x','auto','important');
   tabStrip.style.setProperty('overflow-y','hidden','important');
   tabStrip.style.setProperty('justify-content','flex-start','important');
   tabStrip.style.setProperty('white-space','nowrap','important');
  }
  root.querySelectorAll('[data-avatar-shell].social-podium-avatar').forEach(shell=>{
   const featured=!!shell.closest('.place-1'),mobile=window.matchMedia?.('(max-width:700px)').matches;
   const size=mobile?(featured?108:88):(featured?176:142);
   shell.style.setProperty('width',size+'px','important');
   shell.style.setProperty('height',size+'px','important');
   shell.style.setProperty('aspect-ratio','1','important');
  });
 }
 window.ElaraDOM.patch($('elara-home-activity'),arr(s.activities).length?activities: '<p class="ref-empty">اینجا فعلاً ساکته 👀 وقتی دوستات فعالیتی رو باهات share کنن، خبرها همین‌جا میاد 🔥</p>');setTimeout(()=>window.ElaraEngagementView?.scan?.(),0);
 if(!ranked.length)window.ElaraDOM.patch($('elara-home-ranks'),empty('تنهایی هم می‌شه ترکوند 😎 ولی با یه رفیق، رنکینگ خیلی جذاب‌تر می‌شه 👊','icon-ranking-trophy.webp'));
}
document.addEventListener('click',e=>{
 const action=e.target.closest('[data-social-hero-action]')?.dataset.socialHeroAction;
 if(action){
  if(action==='ranking')return void window.ElaraOpen?.('ranking');
  if(action==='new-group')return void window.ElaraSocialGroupsUI?.createGroup?.();
  if(action==='new-club')return void window.ElaraSocialClubsUI?.createClub?.();
  if(action==='new-challenge')return void window.ElaraSocialChallengesUI?.compose?.();
  if(action==='new-message'){selections.social='chats';try{const u=new URL(location.href);u.searchParams.set('friendsTab','chats');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}catch{}render();void(async()=>{await window.ElaraSocialMessagingUI?.mount?.();const first=window.ElaraSocial?.friends?.[0];if(first)await window.ElaraSocialMessagingUI?.openChat?.(first.uid)})();return}
 }
 const b=e.target.closest('[data-social-view]');
 if(b){
  if(b.dataset.socialRoute==='social'&&b.dataset.socialView==='ranking')return void window.ElaraOpen?.('ranking');
  selections[b.dataset.socialRoute]=b.dataset.socialView;
  if(b.dataset.socialRoute==='social')try{const url=new URL(location.href);url.searchParams.set('friendsTab',selections.social);history.replaceState(history.state,'',url.pathname+url.search+url.hash)}catch{}
  render();return
 }
 if(e.target.closest('[data-social-manage]')){selections.social='friends';window.ElaraOpen('social');render()}
});
function applyFriendFilter(){document.querySelectorAll('#elara-social-page .social-friends-list .social-row').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(friendFilter.toLowerCase())||(onlineFilter&&!row.querySelector('.social-presence-dot')))}
document.addEventListener('input',e=>{if(e.target.matches('[data-friends-filter]')){friendFilter=e.target.value;applyFriendFilter()}});
document.addEventListener('change',e=>{if(e.target.matches('[data-friends-online-only]')){onlineFilter=e.target.checked;applyFriendFilter()}});
document.addEventListener('change',async e=>{const select=e.target.closest('[data-presence-visibility]');if(!select)return;try{await window.ElaraSocial?.presence?.setVisibility?.(select.value)}catch(error){console.error('Presence privacy update:',error);render()}});
for(const event of ['elara:social-updated','elara:presence-updated','elara:collab-updated','elara:account-ready','elara:logout','elara:locale-changed'])window.addEventListener(event,render);
window.addEventListener('elara:open',e=>{if(['ranking','social'].includes(e.detail?.tab))render()});
window.ElaraSocialView={render};render();
})();
