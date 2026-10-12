/* UI13: language-only destination panels. Shares canonical Tasks and authenticated Social services. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const num=v=>Number(v||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');
const list=v=>Array.isArray(v)?v:[];
const routes=['language-tasks','language-channels','language-challenges'];
const icons={tasks:'<path d="M3 4h18v17H3z"/><path d="m7 12 3 3 7-7"/>',channels:'<circle cx="12" cy="12" r="2"/><path d="M6 6a9 9 0 0 0 0 12m12-12a9 9 0 0 1 0 12"/>',challenges:'<path d="M6 3h12v6c0 4-3 8-6 8s-6-4-6-8zM6 6H3v3l4 4m11-7h3v3l-4 4m-5 4v4m-4 0h8"/>'};
const ico=k=>'<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[k]+'</svg>';
const head=(kind,fa,en,description)=>{
 const panel=$('panel-language-'+kind);if(!panel)return null;
 if(!panel.querySelector('.ui13-subpage')){
  panel.innerHTML='<div class="ui13-subpage"><header class="ui13-subpage-head"><button type="button" class="ui13-back" data-ui13-back>→ '+tx('بازگشت به زبان','Back to Language')+'</button><div class="ui13-subpage-title">'+ico(kind)+'<div><small>ELARA · LANGUAGE</small><h1>'+tx(fa,en)+'</h1><p>'+description+'</p></div></div></header><div class="ui13-subpage-content" data-ui13-content="'+kind+'"></div></div>';
 }
 return panel.querySelector('[data-ui13-content="'+kind+'"]');
};
function taskRecords(){
 let s;try{s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{s={}}
 const d=window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA');
 const rows=list(s.tasks).filter(t=>t&&t.sourceGroup==='language').sort((a,b)=>Number(window.ElaraTasks?.taskDone?.(a,d)||false)-Number(window.ElaraTasks?.taskDone?.(b,d)||false));
 return {rows,d};
}
function renderTasks(){
 const host=head('tasks','تسک‌های زبان','Language tasks',tx('مدیریت همهٔ تسک‌های زبان با همان اطلاعات اصلی Tasks','Manage real language tasks with the canonical Tasks store'));if(!host)return;
 const {rows,d}=taskRecords(),done=rows.filter(t=>window.ElaraTasks?.taskDone?.(t,d)).length;
 host.innerHTML='<section class="ui13-surface"><header class="ui13-section-head"><h2>'+tx('فهرست کامل تسک‌ها','All language tasks')+'</h2><span>'+num(done)+' / '+num(rows.length)+' '+tx('انجام‌شده','completed')+'</span></header><div class="ui13-task-list">'+(rows.map(t=>{
  const complete=!!window.ElaraTasks?.taskDone?.(t,d);
  return '<div class="ui13-task-row'+(complete?' is-done':'')+'"><button type="button" data-section-task-toggle="'+esc(t.id)+'" aria-label="'+tx('تغییر وضعیت تسک','Toggle task')+'" aria-pressed="'+complete+'" '+(t.sourceCompletionLocked?'disabled':'')+'><span aria-hidden="true">'+(complete?'✓':'')+'</span></button><button type="button" data-section-task-detail="'+esc(t.id)+'" data-elara-ugc dir="auto">'+esc(t.text||t.title)+'</button><small>'+ (complete?tx('انجام‌شده','Done'):tx('در انتظار','Pending'))+'</small></div>'
 }).join('')||'<p class="ui13-empty">'+tx('هنوز تسک زبانی نداری.','No language tasks yet.')+'</p>')+'</div><div class="ui13-actions"><button class="ui13-primary" data-section-task-add="language" type="button">+ '+tx('افزودن تسک زبان','Add language task')+'</button><button class="ui13-secondary" data-ui13-canonical="tasks" type="button">'+tx('مرکز تسک‌ها','All Tasks')+'</button></div></section>';
}
let epoch=0;
async function renderChannels(){
 const host=head('channels','کانال‌های زبان','Language channels',tx('باشگاه‌های زبان واقعی در سیستم اجتماعی Elara؛ زیرساخت کانال مستقل هنوز منتشر نشده است.','Existing real language clubs in Elara Social; standalone channel backend is not released.'));if(!host)return;
 const ticket=++epoch;
 const service=window.ElaraSocial?.clubs,user=window.ElaraAccount?.user;
 if(!user?.uid||!service?.list){host.innerHTML='<section class="ui13-surface"><p class="ui13-empty">'+tx('برای مشاهدهٔ باشگاه‌های زبان واقعی وارد حساب شو.','Sign in to see your real language clubs.')+'</p></section>';return}
 host.innerHTML='<section class="ui13-surface"><p class="ui13-empty" role="status">'+tx('در حال خواندن عضویت‌های واقعی…','Loading authorized memberships…')+'</p></section>';
 try{
  const mine=list(await service.list()),publicRows=typeof service.discover==='function'?list(await service.discover()):[];
  if(ticket!==epoch||!host.isConnected)return;
  const seen=new Set();const rows=[];
  for(const [group,arr] of [['mine',mine],['public',publicRows]])for(const club of arr){
   if(club?.kind!=='language'||!club?.id||seen.has(club.id))continue;
   seen.add(club.id);rows.push({...club,ownerGroup:group})
  }
  host.innerHTML='<section class="ui13-surface"><header class="ui13-section-head"><h2>'+tx('باشگاه‌های زبان واقعی','Real language clubs')+'</h2><span>'+num(rows.length)+'</span></header><p class="ui13-note">'+tx('این موارد در Backend واقعی Club ذخیره شده‌اند؛ کانال گفت‌وگوی مستقل هنوز فعال نیست.','These records are backed by the existing Clubs service; standalone language channels are not enabled.')+'</p><div class="ui13-club-list">'+(rows.map(c=>'<button type="button" class="ui13-club-row" data-ui13-open-club="'+esc(c.id)+'" data-ui13-owned="'+(c.ownerGroup==='mine'?'1':'0')+'"><span aria-hidden="true">'+ico('channels')+'</span><span><strong data-elara-ugc dir="auto">'+esc(c.title)+'</strong><small>'+tx(c.ownerGroup==='mine'?'باشگاه عضو شده':'باشگاه عمومی',c.ownerGroup==='mine'?'Joined club':'Public club')+' · '+num(c.memberCount||0)+' '+tx('عضو','members')+'</small></span><span aria-hidden="true">‹</span></button>').join('')||'<p class="ui13-empty">'+tx('هنوز باشگاه زبان قابل‌مشاهده‌ای نداری.','No authorized language clubs to show yet.')+'</p>')+'</div><div class="ui13-actions"><button class="ui13-primary" type="button" data-ui13-create-club>'+tx('ساخت باشگاه زبان واقعی','Create real language club')+'</button><button class="ui13-secondary" type="button" data-ui13-canonical="social">'+tx('رفتن به دوستان','Go to Friends')+'</button></div></section>';
 }catch(error){
  if(ticket!==epoch)return;
  host.innerHTML='<section class="ui13-surface"><p class="ui13-empty" role="alert">'+tx('نمایش داده‌های کانال ممکن نیست؛ عضویت و دسترسی را بررسی کن.','Cannot load clubs; check account permissions.')+'</p><p class="ui13-note">'+esc(error?.code||error?.message||'')+'</p><button class="ui13-secondary" data-ui13-retry type="button">'+tx('تلاش دوباره','Try again')+'</button></section>';
 }
}
function renderChallenges(){
 const host=head('challenges','چالش‌های زبان','Language challenges',tx('فضای اختصاصی چالش زبان؛ پشتیبانی نتیجهٔ معتبر سروری هنوز فعال نشده است.','Language-specific challenges need verified server-side results and are not yet available.'));if(!host)return;
 host.innerHTML='<section class="ui13-surface ui13-challenge-empty"><img src="assets/ui/11-challenges-icon.webp" width="120" height="120" loading="eager" alt=""><h2>'+tx('چالش زبان مستقل در دست آماده‌سازی است','Dedicated language challenges are being prepared')+'</h2><p>'+tx('چالش‌های دوستانهٔ واقعی در Elara وجود دارند، اما هنوز نوع هدف زبان و داوری نتیجهٔ معتبر برای آن‌ها منتشر نشده است؛ این بخش شرکت‌کننده، امتیاز یا پیشرفت جعلی نمی‌سازد.','Real friend challenges exist, but language-specific targets and server-verified results are not published yet. No invented participants, scores or progress are shown.')+'</p><button class="ui13-primary" type="button" data-ui13-canonical="social">'+tx('مشاهدهٔ چالش‌های واقعی دوستان','See real friend challenges')+'</button></section>';
}

// L3: full-screen story destination, stable ?leitner=review#words deep link, canonical #words dashboard. Canonical word handlers stay in app.js.
const l3={total:0,history:[],preview:false,historyIndex:0,scene:null,flash:null,original:null,actions:null,forgot:null,known:null,focus:null,scrollY:0,swipeX:null};
function l3Due(){let d;try{d=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{d={}}
 const today=window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA');
 return list(d.words).filter(w=>w&&(!w.due||String(w.due)<=today));}
function l3Build(){
 if(l3.scene)return l3.scene;
 const scene=document.createElement('main');scene.id='l3-review-scene';scene.className='l3-story-scene';scene.setAttribute('aria-label',tx('مرور واژه‌های لایتنر','Leitner word review'));
 scene.innerHTML='<div class="l3-story-container"><header class="l3-story-top"><button type="button" data-l3-exit class="l3-story-back" aria-label="'+tx('بازگشت به داشبورد','Back to dashboard')+'">←</button><div class="l3-story-brand"><img class="l3-story-logo" src="assets/ui/logo.webp" alt="Elara Space"></div><span class="l3-story-notice" aria-hidden="true">✦</span></header><div class="l3-story-intro"><div><span class="l3-story-symbol" aria-hidden="true">▣</span><h1>'+tx('جعبه لایتنر','Leitner box')+'</h1></div><p>'+tx('مرور واژه‌ها به صورت مرحله‌ای و متمرکز','Focused, step-by-step vocabulary review')+'</p></div><div class="l3-story-progress" data-l3-segments aria-label="'+tx('پیشرفت مرور','Review progress')+'"></div><p class="l3-story-counter" data-l3-counter role="status"></p><div class="l3-story-meta"><span>◎ '+tx('حالت تمرکز','Focus mode')+'</span><span>▱ '+tx('جعبه‌های لایتنر','Leitner boxes')+'</span></div><section class="l3-story-frame"><button class="l3-story-speak" type="button" data-l3-speak aria-label="'+tx('تلفظ کلمه','Pronounce word')+'">♫</button><span class="l3-story-new" data-l3-label>✦ '+tx('لغت جدید','New word')+'</span><div class="l3-story-card-slot" data-l3-card-slot></div><div class="l3-story-history" data-l3-history hidden><small>'+tx('کلمهٔ قبلی · فقط برای مشاهده','Previous word · read only')+'</small><strong data-l3-history-front dir="auto"></strong><p data-l3-history-back dir="auto"></p><button type="button" data-l3-current>'+tx('بازگشت به کلمه فعلی','Current word')+' →</button></div></section><div class="l3-story-actions"><button type="button" data-l3-prev disabled class="l3-prev-action"><span>←</span><b>'+tx('بازگشت به کلمه قبلی','Previous word')+'</b></button><div data-l3-forgot-slot></div><div data-l3-known-slot></div></div></div>';
 document.body.append(scene);l3.scene=scene;
 return scene;
}
function l3Sync(){
 const scene=l3.scene;if(!scene)return;
 const remaining=l3Due().length,done=Math.min(l3.total,Math.max(l3.history.length,l3.total-remaining)),total=Math.max(1,l3.total);
 const count=scene.querySelector('[data-l3-counter]');if(count)count.textContent=tx('کلمه ','Word ')+num(Math.min(l3.total,done+1))+' '+tx('از ','of ')+num(l3.total)+(remaining===0?' · '+tx('مرور امروز تمام شد','Review complete'):'');
 const seg=scene.querySelector('[data-l3-segments]');
 if(seg){const parts=Math.min(Math.max(l3.total,1),30);if(seg.children.length!==parts){seg.replaceChildren();for(let i=0;i<parts;i++)seg.append(document.createElement('i'))}
  [...seg.children].forEach((el,i)=>el.classList.toggle('is-done',i<Math.round(done/total*parts)))}
 const prev=scene.querySelector('[data-l3-prev]');if(prev)prev.disabled=!l3.history.length;
 const active=l3Due()[0],label=scene.querySelector('[data-l3-label]');if(label)label.textContent=active?('✦ '+(Number(active.box||1)===1?tx('لغت جدید','New word'):tx('جعبه ','Box ')+num(active.box))):tx('مرور کامل شد','Review complete');
 const completed=scene.querySelector('.l3-story-frame');completed?.classList.toggle('l3-story-finished',remaining===0&&!l3.preview);
}
function l3Enter(push=true){
 if(l3.scene){if(push){const u=new URL(location.href);u.searchParams.set('leitner','review');u.hash='#words';history.pushState({l3:true},'',u)}return}
 const panel=$('panel-words');let flash=panel?.querySelector('.flashcard');if(!flash)return;
 const scene=l3Build();l3.total=l3Due().length;l3.history=[];l3.preview=false;l3.historyIndex=0;l3.scrollY=window.scrollY;
 l3.focus=document.activeElement;l3.flash=flash;l3.original=flash.parentNode;
 l3.actions=flash.querySelector('.timer-actions');l3.forgot=$('word-forgot');l3.known=$('word-remembered');l3.forgotText=l3.forgot?.textContent;if(l3.forgot)l3.forgot.textContent=tx('بلد نبودم','Did not know');
 scene.querySelector('[data-l3-card-slot]').append(flash);
 scene.querySelector('[data-l3-forgot-slot]').append(l3.forgot);
 scene.querySelector('[data-l3-known-slot]').append(l3.known);
 document.documentElement.classList.add('l3-story-open');document.body.classList.add('l3-story-open');
 if(push){const u=new URL(location.href);u.searchParams.set('leitner','review');u.hash='#words';history.pushState({leitner:'review'},'',u)}
 l3Sync();requestAnimationFrame(()=>$('word-reveal')?.focus({preventScroll:true}));
}
function l3Exit(navigate=true){
 if(!l3.scene)return;
 if(l3.actions){if(l3.forgot&&l3.forgotText!=null)l3.forgot.textContent=l3.forgotText;l3.actions.append(l3.forgot,l3.known)}
 if(l3.flash&&l3.original)l3.original.insertBefore(l3.flash,l3.original.querySelector('#word-list'));
 l3.scene.remove();l3.scene=null;l3.flash=null;l3.actions=null;l3.forgot=null;l3.known=null;l3.history=[];l3.preview=false;
 document.documentElement.classList.remove('l3-story-open');document.body.classList.remove('l3-story-open');
 if(navigate){const u=new URL(location.href);u.searchParams.delete('leitner');u.hash='#words';history.replaceState(null,'',u);window.ElaraOpen?.('words',{history:'replace'});renderLeitner()}
 window.scrollTo({top:l3.scrollY,behavior:'instant'});
 if(navigate)requestAnimationFrame(()=>document.querySelector('[data-l2-review]')?.focus({preventScroll:true}));
}
function l3Previous(){
 if(!l3.scene||!l3.history.length)return;
 l3.historyIndex=l3.preview?Math.max(0,l3.historyIndex-1):l3.history.length-1;l3.preview=true;
 const item=l3.history[l3.historyIndex],card=l3.scene.querySelector('[data-l3-history]');
 card.querySelector('[data-l3-history-front]').textContent=item.front;card.querySelector('[data-l3-history-back]').textContent=item.back;
 card.hidden=false;l3.scene.classList.add('l3-preview');l3.scene.querySelector('[data-l3-current]')?.focus({preventScroll:true});
}
function l3Current(){
 if(!l3.scene)return;l3.preview=false;l3.scene.classList.remove('l3-preview');
 l3.scene.querySelector('[data-l3-history]').hidden=true;$('word-reveal')?.focus({preventScroll:true});
}
function l3Route(){
 if(location.hash==='#words'&&new URLSearchParams(location.search).get('leitner')==='review'){if(l3.scene)return;const panel=$('panel-words');if(panel?.querySelector('.flashcard'))l3Enter(false);}
 else if(l3.scene)l3Exit(false);
}

// L2: view-only dashboard for the canonical #panel-words and elara_space_v1.words.
// All word creation, scheduling, deletion, and persistence stay in app.js.
function renderLeitner(){
 const panel=$('panel-words');if(!panel)return;
 let host=panel.querySelector('[data-l2-leitner]');if(!host){
  host=document.createElement('div');host.className='l2-leitner-shell';host.dataset.l2Leitner='';
  panel.prepend(host);
 }
 let data;try{data=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{data={}}
 const words=list(data.words),today=window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA');
 const due=words.filter(w=>!w.due||w.due<=today);
 const boxes=[1,2,3,4,5].map(box=>words.filter(w=>Number(w.box||1)===box).length);
 const all=words.length;
 const card=(key,label,value,icon)=>'<div class="l2-stat l2-stat-'+key+'"><span aria-hidden="true">'+icon+'</span><div><small>'+label+'</small><strong>'+num(value)+'</strong></div></div>';
 host.innerHTML='<section class="l2-leitner-hero"><div class="l2-leitner-copy"><span class="l2-eyebrow">SPACED REPETITION · ELARA</span><h1>'+tx('جعبه لایتنر','Leitner box')+'</h1><p>'+tx('واژه‌هایت را در پنج جعبه مرور کن؛ هر موفقیت، فاصلهٔ مرور بعدی را بیشتر می‌کند.','Review your vocabulary in five boxes. Successful recalls increase the time until the next review.')+'</p><div class="l2-hero-actions"><button type="button" class="l2-start-review" data-l2-review '+(!due.length?'disabled':'')+'>'+tx(due.length?'شروع مرور امروز':'مرور امروز کامل است',due.length?'Start today’s review':'Today’s review is complete')+' <span aria-hidden="true">←</span></button><button type="button" class="l2-add-word" data-l2-add>＋ '+tx('افزودن واژه','Add vocabulary')+'</button></div></div></section>'+
 '<section class="l2-leitner-stats" aria-label="'+tx('آمار واقعی لایتنر','Real Leitner statistics')+'">'+
 card('all',tx('کل واژه‌ها','Total words'),all,'▣')+
 card('due',tx('آمادهٔ مرور','Ready to review'),due.length,'↻')+
 card('new',tx('جعبه اول','First box'),boxes[0],'+')+
 card('learned',tx('جعبه پنجم','Fifth box'),boxes[4],'★')+'</section>'+
 '<section class="l2-leitner-boxes"><header><div><span class="l2-eyebrow">YOUR LEARNING PATH</span><h2>'+tx('مسیر پیشرفت لایتنر','Your Leitner journey')+'</h2><p>'+tx('هر واژه بر اساس نتیجهٔ مرور در جعبهٔ مناسب قرار می‌گیرد.','Each word moves between boxes based on your actual reviews.')+'</p></div><strong>'+num(all)+' '+tx('واژه','words')+'</strong></header><div class="l2-five-boxes">'+
 boxes.map((count,i)=>'<article class="l2-stage l2-stage-'+(i+1)+'"><div class="l2-stage-orb">'+num(i+1)+'</div><h3>'+tx('جعبه ','Box ')+num(i+1)+'</h3><strong>'+num(count)+'</strong><small>'+tx('واژه','words')+'</small><div class="l2-stage-meter"><i style="width:'+(all?Math.min(100,Math.round(count/all*100)):0)+'%"></i></div></article>').join('')+'</div></section>'+
 '<section class="l2-leitner-recent"><header><div><span class="l2-eyebrow">RECENT VOCABULARY</span><h2>'+tx('آخرین واژه‌های اضافه‌شده','Recently added words')+'</h2></div><span>'+num(Math.min(words.length,4))+' '+tx('واژه','words')+'</span></header><div class="l2-recent-list">'+(words.slice(-4).reverse().map(w=>'<div class="l2-recent-row"><span class="l2-recent-icon" aria-hidden="true">▣</span><strong dir="auto">'+esc(w.front)+'</strong><small>'+tx('جعبه ','Box ')+num(w.box||1)+'</small></div>').join('')||'<p class="l2-recent-empty">'+tx('هنوز واژه‌ای اضافه نکرده‌ای.','No words added yet.')+'</p>')+'</div></section>';
 const form=$('word-form');if(form){form.classList.add('l2-word-form');form.setAttribute('aria-label',tx('افزودن واژه به سیستم اصلی','Add word to canonical Leitner'))}
 const flash=panel.querySelector('.flashcard');if(flash)flash.classList.add('l2-canonical-review');
}
function renderActive(){
 const name=location.hash.replace(/^#/,'');
 if(name==='language-tasks')renderTasks();
 if(name==='words'){renderLeitner();l3Route()}
 if(name==='language-channels')void renderChannels();
 if(name==='language-challenges')renderChallenges();
}
document.addEventListener('click',event=>{
 const score=event.target.closest('#word-remembered,#word-forgot');
 if(!score||!l3.scene||l3.preview)return;
 const front=$('flash-front')?.textContent||'',back=$('flash-back')?.textContent||'';
 if(!front)return;
 l3.history.push({front,back});requestAnimationFrame(l3Sync);
},{capture:true});
document.addEventListener('keydown',event=>{
 if(!l3.scene||document.querySelector('.elara-dialog-root:not([hidden])'))return;
 if(event.key==='Escape'){event.preventDefault();l3Exit();return}
 if(event.key==='ArrowLeft'&&l3.history.length){event.preventDefault();l3Previous()}
 if(event.key==='ArrowRight'&&l3.preview){event.preventDefault();l3Current()}
});
document.addEventListener('touchstart',event=>{if(l3.scene)l3.swipeX=event.touches[0]?.clientX??null},{passive:true});
document.addEventListener('touchend',event=>{if(!l3.scene||l3.swipeX==null)return;const delta=(event.changedTouches[0]?.clientX??l3.swipeX)-l3.swipeX;l3.swipeX=null;if(delta>95)l3Previous();else if(delta< -95&&l3.preview)l3Current()},{passive:true});
document.addEventListener('click',e=>{
 const exit=e.target.closest('[data-l3-exit]');if(exit){e.preventDefault();l3Exit();return}
 const prev=e.target.closest('[data-l3-prev]');if(prev){e.preventDefault();l3Previous();return}
 const current=e.target.closest('[data-l3-current]');if(current){e.preventDefault();l3Current();return}
 const speak=e.target.closest('[data-l3-speak]');if(speak){e.preventDefault();if('speechSynthesis' in window){window.speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(l3.preview?l3.history[l3.historyIndex]?.front||'':$('flash-front')?.textContent||'');utter.lang='en-US';utter.rate=.87;window.speechSynthesis.speak(utter)}return}
 const review=e.target.closest('[data-l2-review]');if(review){e.preventDefault();if(review.disabled)return;l3Enter(true);return}
 const addWord=e.target.closest('[data-l2-add]');if(addWord){e.preventDefault();$('panel-words')?.classList.add('l2-adding-word');document.getElementById('word-form')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('word-front')?.focus({preventScroll:true});return}
 const back=e.target.closest('[data-ui13-back]');if(back){e.preventDefault();window.ElaraOpen?.('language',{history:'push'});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));return}
 const go=e.target.closest('[data-ui13-canonical]');if(go){e.preventDefault();window.ElaraOpen?.(go.dataset.ui13Canonical,{history:'push'});return}
 const retry=e.target.closest('[data-ui13-retry]');if(retry){e.preventDefault();void renderChannels();return}
 const club=e.target.closest('[data-ui13-open-club]');if(club){e.preventDefault();void window.ElaraSocialClubsUI?.openClub?.(club.dataset.ui13OpenClub,club.dataset.ui13Owned==='1');return}
 const create=e.target.closest('[data-ui13-create-club]');if(create){e.preventDefault();void window.ElaraSocialClubsUI?.createClub?.('language');return}
});
for(const event of ['elara:open','elara:state-committed','elara:data-changed','elara:locale-changed','elara:auth-changed'])window.addEventListener(event,()=>{if(event==='elara:open'||(location.hash==='#language-tasks'||location.hash==='#words'))renderActive()});
window.addEventListener('hashchange',()=>{renderActive();l3Route()});window.addEventListener('popstate',l3Route);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderActive,{once:true});else renderActive();
window.ElaraLanguageDestinations={renderTasks,renderChannels,renderChallenges,renderLeitner,l3Enter,l3Exit,routes};
})();