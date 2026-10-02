(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const api=()=>window.ElaraSocial?.challenges,current=()=>window.ElaraSocial?.me||null,friends=()=>window.ElaraSocial?.friends||[];
const isFriendsTab=root=>!!root?.querySelector('[data-social-view="friends"][aria-selected="true"]');
let token=0,lastRows=[];
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),3000)}
function expiresMs(c){return c.expiresAt?.toMillis?.()||Number(c.expiresAtMs)||0}
function secondsLeft(c){const ms=expiresMs(c);return ms?Math.max(0,Math.ceil((ms-Date.now())/1000)):0}
function kindLabel(k){return({task:t('تسک','Task'),habit:t('عادت','Habit'),reading:t('مطالعه','Reading'),exercise:t('ورزش','Exercise'),focus:t('تمرکز','Focus'),general:t('آزاد','Open')})[k]||t('آزاد','Open')}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function localState(){try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')||{}}catch{return{}}}
function localWellness(){const uid=current()?.uid;if(!uid)return{};try{return JSON.parse(localStorage.getItem('elara_private_wellness_v1_'+uid)||'{}')||{}}catch{return{}}}
function sameLocalDay(ms,day=today()){const d=new Date(Number(ms)||0);if(!Number.isFinite(d.getTime()))return false;return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`===day}
function selfProgress(kind){const s=localState(),day=today();
 if(kind==='task')return (Array.isArray(s.taskCompletionHistory)?s.taskCompletionHistory:[]).filter(x=>x?.date===day).length;
 if(kind==='habit')return (Array.isArray(s.habits)?s.habits:[]).filter(x=>Array.isArray(x?.days)&&x.days.includes(day)).length;
 if(kind==='reading')return (Array.isArray(s.books)?s.books:[]).flatMap(b=>Array.isArray(b?.readingLogs)?b.readingLogs:[]).filter(x=>x?.date===day).reduce((n,x)=>n+Math.max(0,Number(x.pagesRead)||0),0);
 if(kind==='focus')return (Array.isArray(s.focusSessions)?s.focusSessions:[]).filter(x=>x?.completed!==false&&sameLocalDay(x?.endedAt||x?.startedAt,day)).reduce((n,x)=>n+Math.max(0,Number(x.durationMin)||0),0);
 if(kind==='exercise')return (Array.isArray(localWellness().workouts)?localWellness().workouts:[]).filter(x=>x?.date===day).reduce((n,x)=>n+Math.max(0,Number(x.minutes)||0),0);
 return null
}
function progressMarkup(c){if(c.status!=='accepted'||c.targetKind==='general')return'';const value=selfProgress(c.targetKind),target=Math.max(1,Number(c.targetValue)||1),pct=Math.max(0,Math.min(100,Math.round((value/target)*100))),fmt=n=>Number(n||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');return '<div class="challenge-progress" data-challenge-progress data-progress-kind="'+esc(c.targetKind)+'" data-progress-value="'+value+'" data-progress-target="'+target+'"><div><span>'+t('پیشرفت من','My progress')+'</span><b>'+fmt(value)+' / '+fmt(target)+'</b></div><div class="challenge-progress-track" role="progressbar" aria-label="'+t('پیشرفت من','My progress')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><i style="width:'+pct+'%"></i></div><small>'+t('از داده‌های واقعی همین حساب؛ برنده نهایی هنوز نیازمند تأیید سمت سرور است.','From this account’s real data; final winner still requires server verification.')+'</small></div>'}
function relationLabel(c){if(c.status==='accepted')return t('پذیرفته‌شده','Accepted');if(c.status==='declined')return t('ردشده','Declined');if(c.expired||secondsLeft(c)<=0)return t('منقضی','Expired');return c.to===current()?.uid?t('درخواست برای تو','Incoming request'):t('در انتظار دوستت','Waiting')}
function card(c){
 const incoming=c.to===current()?.uid,p=c.person||friends().find(x=>x.uid===c.other)||{},pending=c.status==='pending'&&!c.expired&&secondsLeft(c)>0;
 let actions='';
 if(pending&&incoming)actions='<button type="button" class="primary-button" data-challenge-action="accepted" data-challenge-id="'+esc(c.id)+'">'+t('قبول 🔥','Accept 🔥')+'</button><button type="button" class="quiet-button danger" data-challenge-action="declined" data-challenge-id="'+esc(c.id)+'">'+t('رد','Decline')+'</button>';
 else if(pending&&!incoming)actions='<button type="button" class="quiet-button" data-challenge-cancel="'+esc(c.id)+'">'+t('لغو','Cancel')+'</button>';
 else if(c.status==='accepted')actions='<div class="challenge-quick">'+(api()?.quick||[]).map(q=>'<button type="button" data-challenge-quick="'+esc(q)+'" data-challenge-id="'+esc(c.id)+'">'+esc(q)+'</button>').join('')+'</div>';
 return '<article class="social-challenge-card" data-challenge-card="'+esc(c.id)+'"><header><span>⚡</span><div><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+kindLabel(c.targetKind)+' · '+relationLabel(c)+'</small></div>'+(pending?'<b data-challenge-expiry="'+expiresMs(c)+'">'+secondsLeft(c)+'s</b>':'')+'</header><p data-elara-ugc dir="auto">'+esc(c.targetText||'')+'</p><small>'+t('هدف: ','Target: ')+Number(c.targetValue||1).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+'</small>'+progressMarkup(c)+'<footer>'+actions+'</footer></article>'
}
async function mount(){
 const root=document.getElementById('elara-social-page'),service=api();if(!root||!service)return;
 if(!isFriendsTab(root)){root.querySelector('.social-challenges-section')?.remove();return}
 const grid=root.querySelector('.social-reference-grid');if(!grid)return;
 let section=root.querySelector('.social-challenges-section');if(!section){section=document.createElement('section');section.className='elara-card social-section social-challenges-section';section.dataset.elaraI18n='off';const clubs=root.querySelector('.social-clubs-section');clubs?clubs.insertAdjacentElement('afterend',section):grid.append(section)}
 const mine=++token;section.innerHTML='<header class="social-challenges-head"><div><small>ELARA · CHALLENGES</small><h2>'+t('چالش دوستانه','Friend challenges')+'</h2><p>'+t('یه هدف مشخص کن؛ درخواست فقط ۳۰ ثانیه وقت داره 😎⚡','Pick a target; challenge requests expire in 30 seconds 😎⚡')+'</p></div><button type="button" class="primary-button" data-challenge-create '+(!friends().length?'disabled':'')+'>'+t('چالش جدید','New challenge')+'</button></header><div class="social-challenges-grid" data-challenge-list><p class="muted">'+t('در حال بارگذاری…','Loading…')+'</p></div>';
 try{lastRows=await service.list()}catch(error){if(mine===token)section.querySelector('[data-challenge-list]').innerHTML='<p class="ref-empty">'+esc(error?.message||error)+'</p>';return}
 if(mine!==token||!section.isConnected)return;
 const visible=lastRows.filter(c=>c.status!=='declined').slice(0,12);section.querySelector('[data-challenge-list]').innerHTML=visible.map(card).join('')||'<p class="ref-empty">'+t('فعلاً چالشی نداری. یکی رو به مبارزه دعوت کن 👀','No challenges yet. Call out a friend 👀')+'</p>'
}
async function compose(target=''){
 const service=api();if(!service||!friends().length)return;
 const wrap=document.createElement('div');wrap.className='social-challenge-create';wrap.dataset.elaraI18n='off';
 wrap.innerHTML='<label>'+t('دوست','Friend')+'<select name="friend">'+friends().map(f=>'<option value="'+esc(f.uid)+'" '+(f.uid===target?'selected':'')+'>'+esc(f.name||f.username||f.uid)+'</option>').join('')+'</select></label><label>'+t('نوع هدف','Target type')+'<select name="kind"><option value="task">'+t('تسک','Task')+'</option><option value="habit">'+t('عادت','Habit')+'</option><option value="reading">'+t('مطالعه','Reading')+'</option><option value="exercise">'+t('ورزش','Exercise')+'</option><option value="focus">'+t('تمرکز','Focus')+'</option><option value="general">'+t('آزاد','Open')+'</option></select></label><label class="wide">'+t('هدف چالش','Challenge goal')+'<input name="text" maxlength="120" required placeholder="'+t('مثلاً امروز ۳۰ صفحه کتاب بخونیم 🔥','e.g. Read 30 pages today 🔥')+'"></label><label>'+t('مقدار هدف','Target amount')+'<input name="value" type="number" min="1" max="1000000" value="1"></label><p class="muted wide">'+t('نتیجه و برد هنوز خودکار ثبت نمی‌شود تا progress سمت سرور قابل‌اعتماد شود.','Wins are not auto-recorded yet until progress is server-verifiable.')+'</p>';
 const ok=await window.ElaraDialog.open({title:t('درخواست چالش','Challenge request'),content:wrap,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('بفرست ⚡','Send ⚡'),value:true,kind:'primary'}]});if(ok!==true)return;
 try{await service.create(wrap.querySelector('[name="friend"]').value,{targetKind:wrap.querySelector('[name="kind"]').value,targetText:wrap.querySelector('[name="text"]').value,targetValue:Number(wrap.querySelector('[name="value"]').value)});toast(t('درخواست چالش رفت؛ ۳۰ ثانیه وقت داره 🔥','Challenge sent; 30 seconds to accept 🔥'));await mount()}catch(error){toast(String(error?.message||error))}
}
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-challenge-create]')){e.preventDefault();void compose();return}
 const profile=e.target.closest('[data-profile-challenge]');if(profile){e.preventDefault();window.ElaraDialog?.close?.();setTimeout(()=>compose(profile.dataset.profileChallenge),60);return}
 const action=e.target.closest('[data-challenge-action]');if(action){e.preventDefault();const c=lastRows.find(x=>x.id===action.dataset.challengeId);if(!c)return;try{await api().respond(c,action.dataset.challengeAction);toast(action.dataset.challengeAction==='accepted'?t('قبول شد؛ بزن بریم 🔥','Accepted — game on 🔥'):t('رد شد.','Declined.'));await mount()}catch(error){toast(String(error?.message||error))}return}
 const cancel=e.target.closest('[data-challenge-cancel]');if(cancel){e.preventDefault();const c=lastRows.find(x=>x.id===cancel.dataset.challengeCancel);if(!c)return;try{await api().cancel(c);toast(t('درخواست لغو شد.','Challenge cancelled.'));await mount()}catch(error){toast(String(error?.message||error))}return}
 const quick=e.target.closest('[data-challenge-quick]');if(quick){e.preventDefault();try{await api().sendQuick(quick.dataset.challengeId,quick.dataset.challengeQuick);toast(t('پیام سریع رفت 😎','Quick message sent 😎'))}catch(error){toast(String(error?.message||error))}return}
 if(e.target.closest('[data-social-view]'))setTimeout(mount,90)
});
setInterval(()=>{document.querySelectorAll('[data-challenge-expiry]').forEach(el=>{const left=Math.max(0,Math.ceil((Number(el.dataset.challengeExpiry)-Date.now())/1000));el.textContent=left+'s';if(left<=0){el.closest('.social-challenge-card')?.classList.add('is-expired')}})},1000);
for(const event of ['elara:social-updated','elara:locale-changed','elara:state-committed','elara:wellness-saved'])window.addEventListener(event,()=>setTimeout(mount,90));
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='social')setTimeout(mount,120)});
window.addEventListener('hashchange',()=>setTimeout(mount,140));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,300),{once:true});else setTimeout(mount,300);
window.ElaraSocialChallengesUI={mount,compose,selfProgress};
})();