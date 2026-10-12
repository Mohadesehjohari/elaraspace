/* Ranking Gold 2026 · isolated view using only canonical authenticated social data. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const fa = value => Number(value || 0).toLocaleString('fa-IR');
 const tx = (persian, english) => document.documentElement.lang === 'en' ? english : persian;
 const file = name => 'assets/ui/' + name;
 const item = (cls, title, icon, content, note = '') =>
   '<section class="rg-card ' + cls + '" aria-label="' + esc(title) + '"><header class="rg-card-head"><span class="rg-card-icon" aria-hidden="true">' + icon + '</span><div><h2>' + title + '</h2>' + (note ? '<small>' + note + '</small>' : '') + '</div></header>' + content + '</section>';
 let active = 'all';
 const tabs = [
   ['all','همه','All','♛'],['season','فصلی','Season','🏆'],
   ['friends','دوستان','Friends','♧'],['clubs','باشگاه‌ها','Clubs','⬡'],
   ['books','مطالعه','Reading','▣'],['language','زبان','Language','文'],['focus','تمرکز','Focus','◎']
 ];
 function avatar(p, cls) {
   if (!p) return '<span class="rg-avatar rg-avatar-empty" aria-hidden="true">✦</span>';
   try {
     const api = window.ElaraProfileSystem;
     if (api?.avatarShell && api?.viewModel) {
       const model = api.viewModel(p, {self:p.uid === window.ElaraSocial?.me?.uid});
       return api.avatarShell(model || {name:p.name || p.username || 'کاربر'},
         {className:'rg-avatar ' + (cls || ''),imageClass:'rg-portrait',frameClass:'rg-frame'});
     }
   } catch(error) { console.warn('Ranking avatar fallback',error); }
   return '<span class="rg-avatar rg-avatar-empty">' + esc((p.name || p.username || '؟').slice(0,1)) + '</span>';
 }
 const name = p => esc(p?.name || p?.username || tx('کاربر','User'));
 const empty = (message, icon='✧') => '<div class="rg-empty"><span aria-hidden="true">' + icon + '</span><p>' + message + '</p></div>';
 function person(p) {
   return '<button type="button" class="rg-person" data-open-profile="' + esc(p.uid) + '">' + avatar(p,'rg-row-avatar') +
     '<span class="rg-person-copy" dir="auto"><b>' + name(p) + '</b><small>' + (p.username ? '@'+esc(p.username) : tx('عضو الارا','Elara member')) + '</small></span></button>';
 }
 function podiumPlace(p, rank) {
   const medal = ['','♛','Ⅱ','Ⅲ'][rank];
   return '<div class="rg-podium-place rg-place-'+rank+'">' +
      '<div class="rg-podium-portrait"><span class="rg-crown" aria-hidden="true">'+medal+'</span>' +
       (p ? '<button type="button" data-open-profile="'+esc(p.uid)+'" aria-label="'+name(p)+'">'+avatar(p,'rg-podium-avatar')+'</button>' : avatar(null)) +
      '</div><div class="rg-podium-base"><strong class="rg-podium-number">'+fa(rank)+'</strong>' +
      '<b>'+ (p ? name(p) : tx('جایگاه خالی','Open place')) + '</b>' +
      '<small>' + (p ? fa(p.xp)+' XP' : tx('هنوز شرکت‌کننده‌ای نیست','No participant yet')) + '</small></div></div>';
 }
 function rows(ranked, me) {
   if (!ranked.length) return empty(tx('هنوز داده معتبری برای رتبه‌بندی دوستان دریافت نشده است.','No verified friends ranking data is available.'),'🏆');
   return '<div class="rg-table" role="table" aria-label="'+tx('امتیاز واقعی دوستان','Actual friends XP')+'">' +
     '<div class="rg-table-head" role="row"><span>'+tx('رتبه','Rank')+'</span><span>'+tx('کاربر','User')+'</span><span>'+tx('عنوان','Title')+'</span><span>'+tx('امتیاز XP','XP')+'</span><span>'+tx('تغییر','Change')+'</span></div>' +
     ranked.map((p,i) => '<div class="rg-table-row'+(p.uid === me?.uid?' rg-is-me':'')+'" role="row">' +
       '<span class="rg-rank-number rg-rank-'+(i+1)+'">'+(i<3?['♛','Ⅱ','Ⅲ'][i]:fa(i+1))+'</span>' +
       person(p) + '<span class="rg-title">'+esc(p.title || tx('ثبت نشده','Not set'))+'</span>' +
       '<strong class="rg-xp">'+fa(p.xp)+' XP</strong><span class="rg-change" title="'+tx('تغییر رتبه در داده موجود نیست','Rank movement unavailable')+'">—</span></div>').join('')+'</div>';
 }
 function rankSummary(ranked, me) {
   if (!me || !Number.isFinite(Number(me.xp))) return empty(tx('برای نمایش رتبه واقعی وارد حساب کاربری شو.','Sign in to see your verified rank.'),'♛');
   const idx=ranked.findIndex(p=>p.uid===me.uid);
   if(idx<0) return empty(tx('رتبه‌ات هنوز از سرویس دوستان دریافت نشده است.','Your rank is not loaded yet.'),'♛');
   const above=idx>0?ranked[idx-1]:null;
   const progress=above && Number(above.xp)>0?Math.max(0,Math.min(100,Math.round(Number(me.xp)/Number(above.xp)*100))):100;
   const gap=above?Math.max(0,Number(above.xp)-Number(me.xp)):0;
   return '<div class="rg-self-grid"><div class="rg-self-user">'+person(me)+'</div>' +
     '<div class="rg-self-position"><small>'+tx('رتبه بین دوستان','Friends rank')+'</small><strong>'+fa(idx+1)+'</strong><span>'+tx('از','of')+' '+fa(ranked.length)+' '+tx('نفر','people')+'</span></div></div>'+
     '<div class="rg-progress-meta"><strong>'+fa(me.xp)+' XP</strong><span>'+tx('تا نفر بالاتر','Progress to next rank')+'</span></div>' +
     '<div class="rg-progress" role="progressbar" aria-label="'+tx('پیشرفت تا رتبه بعدی','Progress to next rank')+'" aria-valuenow="'+progress+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+progress+'%"></i></div>' +
     '<p class="rg-progress-note">'+(above ? fa(gap)+' XP '+tx('تا رسیدن به نفر بالاتر','to the next place') : tx('تو فعلاً صدرنشین این جمع هستی!','You lead this group!'))+'</p>' +
     '<div class="rg-motivation"><span>↗</span><p><strong>'+tx('هر قدم، یک جایگاه بهتر','Every step counts')+'</strong><small>'+tx('XP واقعی تو با فعالیت‌های الارا تغییر می‌کند.','Your actual Elara XP updates with activity.')+'</small></p></div>';
 }
 function rewards() {
   const tiers=[['♛',tx('رتبه‌های برتر','Top ranks')],['◇',tx('نشان‌های ویژه','Special badges')],['✧',tx('پاداش مشارکت','Participation')]];
   return '<div class="rg-reward-art" aria-hidden="true"><span>♛</span><span>✧</span><span>🏆</span></div>'+
     '<div class="rg-reward-grid">'+tiers.map((p,i)=>'<div class="rg-reward-tier rg-tier-'+i+'"><span>'+p[0]+'</span><b>'+p[1]+'</b><small>'+tx('اعلام نشده','Not announced')+'</small></div>').join('')+'</div>'+
     '<p class="rg-disclaimer">'+tx('فهرست جوایز و قوانین رسمی فصل هنوز در داده‌های محصول موجود نیست؛ این موارد وعده جایزه نیستند.','Official seasonal rewards have not been provided; these are not reward promises.')+'</p>';
 }
 function ensureHero() {
   const panel=$('panel-ranking');if(!panel)return;
   let hero=panel.querySelector(':scope > [data-elara-page-hero="ranking"]');
   if(!hero){hero=document.createElement('section');panel.prepend(hero)}
   hero.className='elara-global-hero ranking-gold-hero';
   hero.dataset.elaraPageHero='ranking';
   hero.style.setProperty('--elara-page-art','url("'+file('ranking_banner_main.webp')+'?v=20261012-gold1")');
   if(!hero.querySelector('.rg-hero-copy')){
     hero.innerHTML='<div class="rg-hero-copy"><span class="rg-hero-kicker">ELARA SPACE · RANKING</span>' +
       '<h1>'+tx('تلاش امروز، جایگاه فردایت.','Your effort, your next summit.')+'</h1>' +
       '<p>'+tx('رقابت کن، رشد کن، الهام‌بخش باش.','Compete. Grow. Inspire.')+'</p>' +
       '<button type="button" class="rg-hero-cta" data-rg-about aria-expanded="false">'+tx('درباره رتبه‌بندی','About ranking')+' <span>‹</span></button>' +
       '<p class="rg-hero-about" hidden>'+tx('رتبه‌های فعلی بر پایه XP واقعی دوستان‌اند. داده فصلی مستقل و جوایز رسمی هنوز منتشر نشده‌اند.','Current rankings use actual friends XP. Seasonal standings and rewards are not yet available.')+'</p></div>';
   }
   if(panel.firstElementChild!==hero)panel.prepend(hero);
 }
 function render(root) {
   if(!root)root=$('elara-ranking-page');if(!root)return;
   const s=window.ElaraSocial||{}, me=s.me || null;
   const seen=new Set(), ranked=[];
   for (const p of [me,...(Array.isArray(s.friends)?s.friends:[])]) {
     if(!p || !p.uid || seen.has(p.uid) || p.xp===null || p.xp===undefined || p.xp==='' || !Number.isFinite(Number(p.xp)))continue;
     seen.add(p.uid);ranked.push(p);
   }
   ranked.sort((a,b)=>Number(b.xp)-Number(a.xp) || String(a.uid).localeCompare(String(b.uid)));
   const podium=item('rg-podium-card','قهرمانان رقابت','🏆',
      '<div class="rg-podium-kicker">'+tx('سکوی واقعی دوستان · امتیاز کل XP، نه فصل','Verified friends podium · all-time XP, not seasonal XP')+'</div>' +
      '<div class="rg-podium">' + podiumPlace(ranked[1],2)+podiumPlace(ranked[0],1)+podiumPlace(ranked[2],3)+'</div>' +
      (!ranked.length?'<div class="rg-podium-warning">'+tx('برای دیدن قهرمانان، ابتدا وارد حساب شو و دوستان واقعی اضافه کن.','Sign in and add real friends to see competitors.')+'</div>':''),'');
   const mine=item('rg-my-card','رتبه من','♙',rankSummary(ranked,me),tx('بر اساس XP واقعی دوستان','Based on actual friends XP'));
   const prize=item('rg-rewards-card','جوایز این فصل','🎁',rewards(),tx('پس از اعلام رسمی فعال می‌شود','Awaiting official announcement'));
   const leaderboard=item('rg-leaderboard-card','جدول رتبه‌بندی برترین‌ها','🏆',rows(ranked,me),
     tx('امتیاز کل دوستان · تغییر رتبه موجود نیست','Friends lifetime XP · rank movement unavailable'));
   const clubs=item('rg-clubs-card','رتبه‌بندی باشگاه‌ها','⬡',
     empty(tx('جدول امتیاز معتبر باشگاه‌ها هنوز در دسترس نیست.','A verified clubs leaderboard is not yet available.'),'⬡')+
     '<button type="button" class="rg-secondary-action" data-rg-route="social">'+tx('رفتن به دوستان و باشگاه‌ها','Explore friends and clubs')+' ←</button>');
   const friends=item('rg-friends-card','رتبه‌بندی دوستان','♧',
     ranked.length?'<div class="rg-friends-list">'+ranked.slice(0,5).map((p,i)=>'<div class="rg-friend-item"><span class="rg-small-medal">'+(i<3?['♛','Ⅱ','Ⅲ'][i]:fa(i+1))+'</span>'+person(p)+'<strong>'+fa(p.xp)+' XP</strong></div>').join('')+'</div>':
       empty(tx('هنوز دوست دارای امتیاز معتبر در این جمع نیست.','No friends with verified XP yet.'),'♧'));
   const clock=item('rg-countdown-card','زمان باقی‌مانده فصل','⌛',
     '<div class="rg-countdown-body"><span>⌛</span><div><strong>'+tx('زمان‌بندی اعلام نشده','Not scheduled yet')+'</strong><p>'+tx('تا زمانی که پایان فصل از منبع رسمی ثبت نشود، شمارش معکوس ساختگی نمایش نمی‌دهیم.','The official season end date is not provided, so no countdown is fabricated.')+'</p></div></div>');
   const weekEvents=Array.isArray(s.activities)&&me?.uid?s.activities.filter(a=>a.person?.uid===me.uid&&Number(a.ms)>=Date.now()-7*86400000).length:null;
   const goal=item('rg-weekly-card','هدف هفتگی رقابتی','◎',
     '<div class="rg-weekly-number">'+(weekEvents===null?'—':fa(weekEvents))+' <small>'+tx('فعالیت قابل‌مشاهده در ۷ روز گذشته','visible activities in last 7 days')+'</small></div>' +
     '<div class="rg-progress rg-progress-unknown" aria-label="'+tx('هدف عددی تعیین نشده','No numeric goal set')+'"><i></i></div>' +
     '<p class="rg-progress-note">'+tx('هدف عددی هفتگی هنوز تعریف نشده؛ درصد پیشرفت قابل محاسبه نیست.','No weekly target is defined; progress cannot yet be calculated.')+'</p>'+
     '<button type="button" class="rg-secondary-action" data-rg-route="tasks">'+tx('شروع فعالیت امروز','Start today’s activity')+' ←</button>');
   const season=item('rg-season-card','رقابت فصلی','♛',
     empty(tx('داده معتبر امتیاز فصل، تاریخ پایان و رده‌بندی فصلی هنوز در این حساب موجود نیست. رتبه دوستان از XP کل نمایش داده می‌شود.','Seasonal XP, end date and seasonal standings are not available; friends ranking uses lifetime XP.'),'✦'));
   const categoryMessage={books:['مطالعه','Reading'],language:['زبان','Language'],focus:['تمرکز','Focus']};
   let cards='';
   if(active==='all')cards=podium+mine+prize+leaderboard+clubs+friends+clock+goal;
   else if(active==='friends')cards=podium+mine+leaderboard+friends;
   else if(active==='season')cards=season+prize+clock+goal;
   else if(active==='clubs')cards=clubs;
   else {
     const label=categoryMessage[active]||['رقابت','Ranking'];
     cards=item('rg-season-card',tx(label[0],label[1]),'✦',empty(tx('رتبه‌بندی معتبر این دسته هنوز به سرویس رتبه‌بندی متصل نشده است.','Verified rankings for this category are not yet available.'),'✧'));
   }
   root.classList.add('ranking-gold');
   root.innerHTML='<nav class="rg-tabs" role="tablist" aria-label="'+tx('دسته‌های رتبه‌بندی','Ranking categories')+'">'+
     tabs.map(t=>'<button role="tab" type="button" data-rg-filter="'+t[0]+'" aria-selected="'+(active===t[0])+'" class="'+(active===t[0]?'is-active':'')+'"><span aria-hidden="true">'+t[3]+'</span>'+tx(t[1],t[2])+'</button>').join('')+
     '</nav><div class="rg-grid" role="tabpanel">'+cards+'</div><p class="rg-data-footnote">'+
     tx('داده‌های رتبه‌بندی از حساب واقعی و دوستان تأییدشده می‌آیند. هیچ شرکت‌کننده یا امتیازی شبیه‌سازی نشده است.','Ranking data comes from verified account and friends; no synthetic competitors or scores.')+'</p>';
   ensureHero();
 }
 document.addEventListener('click',event=>{
   const filter=event.target.closest('[data-rg-filter]');
   if(filter){active=filter.dataset.rgFilter;render();return}
   const route=event.target.closest('[data-rg-route]');
   if(route){window.ElaraOpen?.(route.dataset.rgRoute);return}
   const about=event.target.closest('[data-rg-about]');
   if(about){const note=about.parentElement.querySelector('.rg-hero-about');if(note){note.hidden=!note.hidden;about.setAttribute('aria-expanded',String(!note.hidden))}}
 });
 window.ElaraRankingGold={render};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>render(),{once:true});else render();
})();
