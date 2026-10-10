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
function renderActive(){
 const name=location.hash.replace(/^#/,'');
 if(name==='language-tasks')renderTasks();
 if(name==='language-channels')void renderChannels();
 if(name==='language-challenges')renderChallenges();
}
document.addEventListener('click',e=>{
 const back=e.target.closest('[data-ui13-back]');if(back){e.preventDefault();window.ElaraOpen?.('language',{history:'push'});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));return}
 const go=e.target.closest('[data-ui13-canonical]');if(go){e.preventDefault();window.ElaraOpen?.(go.dataset.ui13Canonical,{history:'push'});return}
 const retry=e.target.closest('[data-ui13-retry]');if(retry){e.preventDefault();void renderChannels();return}
 const club=e.target.closest('[data-ui13-open-club]');if(club){e.preventDefault();void window.ElaraSocialClubsUI?.openClub?.(club.dataset.ui13OpenClub,club.dataset.ui13Owned==='1');return}
 const create=e.target.closest('[data-ui13-create-club]');if(create){e.preventDefault();void window.ElaraSocialClubsUI?.createClub?.('language');return}
});
for(const event of ['elara:open','elara:state-committed','elara:data-changed','elara:locale-changed','elara:auth-changed'])window.addEventListener(event,()=>{if(event==='elara:open'||location.hash==='#language-tasks')renderActive()});
window.addEventListener('hashchange',renderActive);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderActive,{once:true});else renderActive();
window.ElaraLanguageDestinations={renderTasks,renderChannels,renderChallenges,routes};
})();