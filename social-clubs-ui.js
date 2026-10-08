(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const api=()=>window.ElaraSocial?.clubs,current=()=>window.ElaraSocial?.me||null,friends=()=>window.ElaraSocial?.friends||[];
const kindLabel=k=>({reading:t('کتاب‌خوانی','Reading'),fitness:t('ورزشی','Fitness'),focus:t('تمرکز','Focus'),general:t('عمومی','General')})[k]||t('عمومی','General');
const roleLabel=r=>({owner:t('صاحب','Owner'),assistant:t('دستیار','Assistant'),member:t('عضو','Member')})[r]||t('عضو','Member');
function xpValue(){
 const socialXp=Number(current()?.xp),accountXp=Number(window.ElaraAccount?.profile?.xp);
 let localXp=NaN;try{localXp=Number(JSON.parse(localStorage.getItem('elara_space_v1')||'{}')?.xp)}catch{}
 return [socialXp,accountXp,localXp].find(Number.isFinite)??0
}
function level(){
 const xp=xpValue(),registry=window.ElaraLevels;
 if(registry?.level)return registry.level(xp);
 return Math.max(1,Math.floor(xp/70)+1)
}
function canCreateClub(){
 const threshold=window.ElaraLevels?.threshold?.(6)??350;
 return xpValue()>=threshold
}
const isClubsTab=root=>!!root?.querySelector('[data-social-view="clubs"][aria-selected="true"]');
let token=0;
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),3300)}
function avatar(p){const src=window.ElaraProfileSystem?.viewModel?.(p,{self:p?.uid===current()?.uid})?.avatarSrc;return src?'<img src="'+esc(src)+'" alt="">':'<span>'+esc((p?.name||p?.username||'?').slice(0,1))+'</span>'}
async function mount(){
 const root=document.getElementById('elara-social-page'),service=api();if(!root||!service)return;
 if(!isClubsTab(root)){root.querySelector('.social-clubs-section')?.remove();return}
 const grid=root.querySelector('.social-reference-grid');if(!grid)return;
 let section=root.querySelector('.social-clubs-section');if(!section){section=document.createElement('section');section.className='elara-card social-section social-clubs-section';section.dataset.elaraI18n='off';const groups=root.querySelector('.social-groups-section');groups?groups.insertAdjacentElement('afterend',section):grid.append(section)}
 const mine=++token,userLevel=level(),createAllowed=canCreateClub();section.innerHTML='<header class="social-clubs-head"><div><small>ELARA · CLUBS</small><h2>'+t('باشگاه‌ها','Clubs')+'</h2><p>'+t('ماموریت، نظرسنجی و مسیر مشترک؛ جدا از چت گروهی.','Structured missions, polls and shared progress — separate from group chat.')+'</p></div><button type="button" class="primary-button" data-club-create '+(!createAllowed?'disabled':'')+'>'+t('ساخت باشگاه','Create club')+'</button></header>'+(!createAllowed?'<p class="social-club-lock">'+t('ساخت باشگاه از Level 6 باز می‌شود. الان Level ','Club creation unlocks at Level 6. You are Level ')+userLevel+'</p>':'')+'<div class="social-club-invites" data-club-invites></div><div class="social-clubs-grid" data-club-list><p class="muted">'+t('در حال بارگذاری…','Loading…')+'</p></div>';
 let clubs=[],invites=[];try{[clubs,invites]=await Promise.all([service.list(),service.invites()])}catch(error){if(mine===token)section.querySelector('[data-club-list]').innerHTML='<p class="ref-empty">'+esc(error?.message||error)+'</p>';return}
 if(mine!==token||!section.isConnected)return;
 const inviteHost=section.querySelector('[data-club-invites]');inviteHost.innerHTML=invites.length?'<h3>'+t('دعوت‌های باشگاه','Club invites')+'</h3>'+invites.map(x=>'<article class="social-club-invite"><div><strong>'+esc(x.club?.title||t('باشگاه','Club'))+'</strong><small>'+kindLabel(x.club?.kind)+'</small></div><div><button type="button" class="primary-button" data-club-invite-action="accepted" data-club-id="'+esc(x.clubId)+'">'+t('قبول','Accept')+'</button><button type="button" class="quiet-button danger" data-club-invite-action="declined" data-club-id="'+esc(x.clubId)+'">'+t('رد','Decline')+'</button></div></article>').join(''):'';
 const list=section.querySelector('[data-club-list]');list.innerHTML=clubs.map(c=>'<button type="button" class="social-club-card" data-club-open="'+esc(c.id)+'"><span class="social-club-kind">'+({reading:'📚',fitness:'⚡',focus:'🎯',general:'🚀'}[c.kind]||'🚀')+'</span><span><strong>'+esc(c.title||t('باشگاه','Club'))+'</strong><small>'+kindLabel(c.kind)+' · '+roleLabel(c.role)+' · '+(c.visibility==='public'?t('عمومی','Public'):t('خصوصی','Private'))+'</small></span><b>›</b></button>').join('')||'<p class="ref-empty">'+t('هنوز عضو باشگاهی نیستی.','You are not in a club yet.')+'</p>'
 section.insertAdjacentHTML('afterbegin','<p class="social-cutover-notice" role="status">بخش اجتماعی در حال ارتقاست؛ چند دقیقه دیگر دوباره امتحان کن.</p>');
 section.querySelectorAll('[data-club-create],[data-club-invite-action]').forEach(button=>{button.disabled=true;button.title='در حال ارتقا';});
}
async function createClub(){
 if(window.ElaraSocial?.socialCutover?.active){toast(window.ElaraSocial.socialCutover.message);return}
 const service=api();if(!service)return;if(!canCreateClub()){toast(t('ساخت باشگاه از Level 6 باز می‌شود.','Club creation unlocks at Level 6.'));return}
 const wrap=document.createElement('div');wrap.className='social-club-create';wrap.dataset.elaraI18n='off';wrap.innerHTML='<label>'+t('نام باشگاه','Club name')+'<input name="title" maxlength="80" required placeholder="'+t('مثلاً کتاب‌بازهای شب 🌚','e.g. Night Readers 🌚')+'"></label><label>'+t('نوع باشگاه','Club type')+'<select name="kind"><option value="reading">'+t('کتاب‌خوانی','Reading')+'</option><option value="fitness">'+t('ورزشی','Fitness')+'</option><option value="focus">'+t('تمرکز','Focus')+'</option><option value="general">'+t('عمومی','General')+'</option></select></label><label>'+t('نمایش','Visibility')+'<select name="visibility"><option value="private">'+t('خصوصی','Private')+'</option><option value="public">'+t('عمومی','Public')+'</option></select></label><label>'+t('روز استراحت هفتگی','Weekly rest day')+'<select name="restDay">'+[0,1,2,3,4,5,6].map((n,i)=>'<option value="'+n+'">'+[t('یکشنبه','Sunday'),t('دوشنبه','Monday'),t('سه‌شنبه','Tuesday'),t('چهارشنبه','Wednesday'),t('پنجشنبه','Thursday'),t('جمعه','Friday'),t('شنبه','Saturday')][i]+'</option>').join('')+'</select></label>';
 const ok=await window.ElaraDialog.open({title:t('ساخت باشگاه','Create club'),content:wrap,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('ساختن','Create'),value:true,kind:'primary'}]});if(ok!==true)return;
 try{const id=await service.create({title:wrap.querySelector('[name="title"]').value,kind:wrap.querySelector('[name="kind"]').value,visibility:wrap.querySelector('[name="visibility"]').value,restDay:Number(wrap.querySelector('[name="restDay"]').value)});await mount();setTimeout(()=>openClub(id),50)}catch(error){await window.ElaraDialog.open({title:t('باشگاه ساخته نشد','Could not create club'),message:String(error?.message||error),actions:[{label:t('باشه','OK'),value:true,kind:'primary'}]})}
}
function memberMarkup(m,club){
 const self=m.uid===current()?.uid,canManage=club.role==='owner'&&m.role!=='owner',isAssistant=m.role==='assistant';
 return '<article class="social-club-member"><span class="social-dm-avatar">'+avatar(m.person)+'</span><span><strong>'+esc(m.person?.name||m.person?.username||t('عضو','Member'))+'</strong><small>'+roleLabel(m.role)+(self?' · '+t('شما','You'):'')+'</small></span>'+(canManage?'<button type="button" class="quiet-button" data-club-assistant="'+esc(m.uid)+'" data-enabled="'+(isAssistant?'0':'1')+'">'+(isAssistant?t('برداشتن دستیار','Remove assistant'):t('دستیار کن','Make assistant'))+'</button>':'')+'</article>'
}
function postMarkup(p){
 const icon=p.kind==='poll'?'📊':'🎯',cad=p.cadence&&p.cadence!=='none'?' · '+({daily:t('روزانه','Daily'),weekly:t('هفتگی','Weekly'),monthly:t('ماهانه','Monthly')})[p.cadence]:'';
 return '<article class="social-club-post" data-club-post="'+esc(p.id)+'"><header><span>'+icon+'</span><div><strong data-elara-ugc dir="auto">'+esc(p.title)+'</strong><small>'+ (p.kind==='poll'?t('نظرسنجی','Poll'):t('ماموریت','Mission'))+cad+'</small></div></header>'+(p.body?'<p data-elara-ugc dir="auto">'+esc(p.body)+'</p>':'')+(p.kind==='poll'?'<div class="social-club-poll">'+(p.options||[]).map(o=>'<button type="button" data-club-vote="'+esc(o)+'" data-post-id="'+esc(p.id)+'">'+esc(o)+'</button>').join('')+'</div>':'')+'</article>'
}
async function openClub(id){
 const service=api();if(!service)return;let club=(await service.list()).find(x=>x.id===id);if(!club)return;
 const wrap=document.createElement('div');wrap.className='social-club-dashboard';wrap.dataset.elaraI18n='off';
 async function paint(){
  club=(await service.list()).find(x=>x.id===id)||club;const [members,posts]=await Promise.all([service.members(id),service.posts(id)]),manager=club.role==='owner'||club.role==='assistant';
  wrap.innerHTML='<header class="social-club-dashboard-head"><span class="social-club-kind"><img src="assets/ui/14-clubs-management-icon.webp" alt="" width="46" height="46" loading="lazy" decoding="async"></span><div><h3>'+esc(club.title)+'</h3><p>'+kindLabel(club.kind)+' · '+roleLabel(club.role)+' · '+t('روز استراحت: ','Rest day: ')+Number(club.restDay??0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+'</p></div></header>'+(club.role==='owner'?'<section class="social-club-owner-tools"><h4>'+t('مدیریت صاحب باشگاه','Owner controls')+'</h4><div class="social-club-invite-tool"><select name="invite"><option value="">'+t('یک دوست را انتخاب کن','Choose a friend')+'</option>'+friends().filter(f=>!members.some(m=>m.uid===f.uid)).map(f=>'<option value="'+esc(f.uid)+'">'+esc(f.name||f.username||f.uid)+'</option>').join('')+'</select><button type="button" class="primary-button" data-club-send-invite>'+t('دعوت','Invite')+'</button></div></section>':'')+'<section><h4>'+t('اعضا','Members')+'</h4><div class="social-club-members">'+members.map(m=>memberMarkup(m,club)).join('')+'</div></section>'+(manager?'<section class="social-club-compose"><h4>'+t('ماموریت / نظرسنجی جدید','New mission / poll')+'</h4><div class="social-club-compose-grid"><select name="postKind"><option value="mission">'+t('ماموریت','Mission')+'</option><option value="poll">'+t('نظرسنجی','Poll')+'</option></select><select name="cadence"><option value="none">'+t('بدون تکرار','No cadence')+'</option><option value="daily">'+t('روزانه','Daily')+'</option><option value="weekly">'+t('هفتگی','Weekly')+'</option><option value="monthly">'+t('ماهانه','Monthly')+'</option></select><input name="postTitle" maxlength="120" placeholder="'+t('عنوان…','Title…')+'"><textarea name="postBody" maxlength="1200" rows="2" placeholder="'+t('توضیح…','Details…')+'"></textarea><input name="options" placeholder="'+t('برای نظرسنجی: گزینه‌ها را با | جدا کن','For polls: separate options with |')+'"><button type="button" class="primary-button" data-club-create-post>'+t('ارسال','Publish')+'</button></div></section>':'')+'<section><h4>'+t('تابلوی باشگاه','Club board')+'</h4><div class="social-club-posts">'+(posts.map(postMarkup).join('')||'<p class="ref-empty">'+t('هنوز ماموریت یا نظرسنجی‌ای نیست.','No missions or polls yet.')+'</p>')+'</div></section><p class="social-club-status" role="status"></p>';
  if(window.ElaraSocial?.socialCutover?.active){wrap.insertAdjacentHTML('afterbegin','<p class="social-cutover-notice" role="status">بخش اجتماعی در حال ارتقاست؛ چند دقیقه دیگر دوباره امتحان کن.</p>');wrap.querySelectorAll('[data-club-send-invite],[data-club-assistant],[data-club-create-post],[data-club-vote]').forEach(button=>{button.disabled=true;button.title='در حال ارتقا';});}
 }
 wrap.addEventListener('click',async e=>{
  const status=()=>wrap.querySelector('.social-club-status');
  if(e.target.closest('[data-club-send-invite]')){const to=wrap.querySelector('select[name=invite]')?.value;if(!to)return;try{await service.invite(id,to);status().textContent=t('دعوت فرستاده شد 👊','Invite sent 👊')}catch(error){status().textContent=String(error?.message||error)}}
  const assist=e.target.closest('[data-club-assistant]');if(assist){try{await service.setAssistant(id,assist.dataset.clubAssistant,assist.dataset.enabled==='1');await paint()}catch(error){status().textContent=String(error?.message||error)}}
  if(e.target.closest('[data-club-create-post]')){const kind=wrap.querySelector('[name=postKind]').value,title=wrap.querySelector('[name=postTitle]').value,body=wrap.querySelector('[name=postBody]').value,cadence=wrap.querySelector('[name=cadence]').value,options=wrap.querySelector('[name=options]').value.split('|').map(x=>x.trim()).filter(Boolean);try{await service.createPost(id,{kind,title,body,cadence,options});await paint()}catch(error){status().textContent=String(error?.message||error)}}
  const vote=e.target.closest('[data-club-vote]');if(vote){try{await service.vote(id,vote.dataset.postId,vote.dataset.clubVote);status().textContent=t('رأی ثبت شد 🤝','Vote saved 🤝')}catch(error){status().textContent=String(error?.message||error)}}
 });
 await paint();await window.ElaraDialog.open({title:t('داشبورد باشگاه','Club dashboard'),content:wrap,wide:true,actions:[{label:t('بستن','Close'),value:false}]});setTimeout(mount,30)
}
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-club-create]')){e.preventDefault();void createClub();return}
 const card=e.target.closest('[data-club-open]');if(card){e.preventDefault();void openClub(card.dataset.clubOpen);return}
 const action=e.target.closest('[data-club-invite-action]');if(action){e.preventDefault();const invites=await api()?.invites?.()||[],invite=invites.find(x=>x.clubId===action.dataset.clubId);if(!invite)return;try{await api().decideInvite(invite,action.dataset.clubInviteAction);toast(action.dataset.clubInviteAction==='accepted'?t('به باشگاه اضافه شدی 🔥','Joined the club 🔥'):t('دعوت رد شد.','Invite declined.'));await mount()}catch(error){toast(String(error?.message||error))}return}
 if(e.target.closest('[data-social-view]'))setTimeout(mount,80)
});
for(const event of ['elara:social-updated','elara:locale-changed','elara:levels-ready'])window.addEventListener(event,()=>setTimeout(mount,80));
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='social')setTimeout(mount,120)});
window.addEventListener('hashchange',()=>setTimeout(mount,140));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,260),{once:true});else setTimeout(mount,260);
window.ElaraSocialClubsUI={mount,createClub,openClub,level,canCreateClub,xpValue};
})();