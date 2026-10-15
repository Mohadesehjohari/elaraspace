(()=>{'use strict';
// Boot and the route-level fallback may both request this module. Bind only once.
if(window.ElaraSocialGroupsUI?.mount)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
let renderToken=0;
const api=()=>window.ElaraSocial?.groups,current=()=>window.ElaraSocial?.me||null,friends=()=>window.ElaraSocial?.friends||[];
function when(ms){if(!ms)return'';try{return new Date(ms).toLocaleTimeString(document.documentElement.lang==='en'?'en-US':'fa-IR',{hour:'2-digit',minute:'2-digit'})}catch{return''}}
function avatar(p){const src=window.ElaraProfileSystem?.viewModel?.(p,{self:p?.uid===current()?.uid})?.avatarSrc;return src?'<img src="'+esc(src)+'" alt="">':'<span>'+esc((p?.name||p?.username||'?').slice(0,1))+'</span>'}
function activeGroupsTab(root){return !!root?.querySelector('[data-social-view="groups"][aria-selected="true"]')}

let groupQuery='',groupFilter='all';
// Social updates can re-render the whole Friends page while Firestore is still loading.
// Share pending queries and give each attempt a finite deadline so tabs never hang.
const GROUP_LOAD_TIMEOUT_MS=8000;
let pendingGroupLoad=null,pendingGroupUid='',groupMountTimer=null;
// Avoid an immediate retry storm if Firebase rejects a missing-index/permission query.
let retryAllowedAt=0,lastLoadError='';
function groupData(service,force=false){
 const uid=String(current()?.uid||'');
 if(force||pendingGroupUid!==uid){pendingGroupLoad=null;pendingGroupUid=uid}
 if(!pendingGroupLoad){
  const task=Promise.resolve().then(()=>Promise.allSettled([service.list(),service.invites?.()||[]])).then(([groupsResult,invitesResult])=>{
   if(groupsResult.status==='rejected')throw groupsResult.reason;
   if(invitesResult.status==='rejected')console.warn('Elara group invites unavailable:',invitesResult.reason);
   return [groupsResult.value,invitesResult.status==='fulfilled'?invitesResult.value:[]];
  });
  pendingGroupLoad=task;
  void task.then(()=>{if(pendingGroupLoad===task)pendingGroupLoad=null},()=>{if(pendingGroupLoad===task)pendingGroupLoad=null});
 }
 return pendingGroupLoad;
}
function scheduleMount(delay=70){
 if(groupMountTimer!==null)return;
 groupMountTimer=setTimeout(()=>{groupMountTimer=null;void mount()},delay);
}

const icon=(kind)=>({
 search:'<circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 4.8 4.8"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="m9 18 6-6-6-6"/>',
 spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
 users:'<circle cx="8" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2m3-13a3 3 0 0 1 0 6m3 7v-2a5 5 0 0 0-4-5"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>'
 }[kind]||'');
const svg=kind=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icon(kind)+'</svg>';
const numerals=n=>Number(n||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');
function applyGroupFilters(section=document.querySelector('#elara-social-page .groups-r4')){
 if(!section)return;
 const q=groupQuery.trim().toLocaleLowerCase();
 let count=0;
 section.querySelectorAll('.g4-row[data-social-open-group]').forEach(row=>{
  const match=(!q||(row.dataset.groupSearch||'').toLocaleLowerCase().includes(q))
   &&(groupFilter==='all'||(groupFilter==='unread'&&row.dataset.groupUnread==='true')
   ||(groupFilter==='owned'&&row.dataset.groupRole==='owner')
   ||(groupFilter==='closed'&&row.dataset.groupStatus==='closed'));
  row.hidden=!match;if(match)count++;
 });
 section.querySelectorAll('[data-group-filter]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.groupFilter===groupFilter)));
 const empty=section.querySelector('[data-g4-no-results]');if(empty)empty.hidden=count!==0;
 const countEl=section.querySelector('[data-g4-results-count]');if(countEl)countEl.textContent=numerals(count);
}
function groupSyncMessage(section,copy){
 const existing=section.querySelector('.g4-availability-message');
 if(existing){existing.textContent=copy;return}
 let note=section.querySelector('.g4-sync-note');
 if(!note){
  note=document.createElement('div');
  note.className='g4-sync-note';note.setAttribute('role','status');
  note.innerHTML='<span data-g4-sync-copy></span><button type="button" class="g4-secondary" data-group-retry>'+t('تازه‌سازی','Refresh')+'</button>';
  (section.querySelector('.g4-main')||section).prepend(note);
 }
 note.querySelector('[data-g4-sync-copy]').textContent=copy;
}

async function mount(force=false){
 const root=document.getElementById('elara-social-page'),service=api();if(!root)return;
 if(!activeGroupsTab(root)){renderToken++;root.querySelector('.social-groups-section')?.remove();return}
 const grid=root.querySelector('.social-reference-grid');if(!grid)return;
 let section=root.querySelector('.social-groups-section');
 if(!section){section=document.createElement('section');section.className='elara-card social-section social-groups-section groups-r4';section.dataset.elaraI18n='off';grid.prepend(section)}
 section.classList.add('groups-r4');
 if(!service || typeof service.list!=='function'){
  renderToken++;section.dataset.g4Loading='false';
  section.dataset.g4Availability='waiting';
  groupSyncMessage(section,t('گروه‌هات همین‌جا نمایش داده می‌شن؛ منتظر اتصال حساب هستیم.','Your groups will appear here as soon as your account connects.'));
  return;
 }
 if(force){retryAllowedAt=0;lastLoadError=''}
 if(!force&&Date.now()<retryAllowedAt){
  section.dataset.g4Loading='false';
  section.dataset.g4Availability='waiting';
  groupSyncMessage(section,lastLoadError||t('گروه‌ها فعلاً همگام نشده‌اند؛ از دکمهٔ تازه‌سازی استفاده کن.','Groups are not synced yet. Refresh to retry.'));
  return;
 }
 if(!force&&section.dataset.g4Loading==='true')return;
 const token=++renderToken;
 section.dataset.g4Loading='true';
 const newBtn=extra=>'<button type="button" class="g4-primary" '+(extra?'data-g4-create':'data-social-create-group')+'>'+svg('plus')+'<span>'+t('گروه جدید','New group')+'</span></button>';
 section.dataset.g4Availability='syncing';
 groupSyncMessage(section,t('در حال دریافت گروه‌ها و دعوت‌های واقعی تو…','Syncing your real groups and invitations…'));
 let groups=[],invites=[],deadline=null;
 try{
  const timeout=new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('groups-load-timeout')),GROUP_LOAD_TIMEOUT_MS)});
  const results=await Promise.race([groupData(service,force),timeout]);
  groups=Array.isArray(results[0])?results[0]:[];
  invites=Array.isArray(results[1])?results[1]:[];
 }catch(error){
  // Do not reuse a Firestore promise that may never settle on a subsequent retry.
  if(String(error?.message||'')==='groups-load-timeout')pendingGroupLoad=null;
  if(token!==renderToken||!section.isConnected)return;
  section.dataset.g4Loading='false';
  section.dataset.g4Availability='waiting';
  const missingIndex=/COLLECTION_GROUP_ASC|requires (?:a |an )?index|failed-precondition|collection.group.*index/i.test(String(error?.message||''));
  console.warn('Elara groups sync:',missingIndex?'Missing membership index':error);
  retryAllowedAt=Date.now()+30000;
  lastLoadError=missingIndex?t('فهرست گروه‌ها هنوز همگام نشده؛ ایندکس عضویت باید در Firebase فعال شود.','The group list is waiting for its Firebase membership index.'):t('گروه‌ها فعلاً همگام نشده‌اند؛ طراحی صفحه آماده است و می‌توانی دوباره تلاش کنی.','Your groups have not synced yet. The page is ready; try refreshing.');
  groupSyncMessage(section,lastLoadError);
  return;
 }finally{
  if(deadline!==null)clearTimeout(deadline);
 }
 if(token!==renderToken||!section.isConnected||!activeGroupsTab(root))return;
 section.dataset.g4Loading='false';
 retryAllowedAt=0;lastLoadError='';
 section.dataset.g4Availability='ready';
 groups=[...groups].sort((a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0));
 const unread=groups.filter(g=>!!g.unread).length,own=groups.filter(g=>g.role==='owner').length;
 const inviteRows=invites.map(x=>'<article class="social-group-invite g4-invite"><span class="g4-invite-icon">'+svg('users')+'</span><div class="g4-invite-copy"><strong data-elara-ugc dir="auto">'+esc(x.group?.title||t('گروه جدید','New group'))+'</strong><small>'+t('دعوت به عضویت در گروه','Invitation to join a group')+'</small></div><div class="g4-invite-actions"><button type="button" data-group-invite-action="accepted" data-group-invite-id="'+esc(x.groupId)+'">'+t('پذیرش','Accept')+'</button><button type="button" data-group-invite-action="declined" data-group-invite-id="'+esc(x.groupId)+'">'+t('رد','Decline')+'</button></div></article>').join('');
 const cards=groups.map((g,i)=>{
  const name=esc(g.title||t('گروه بدون نام','Unnamed group')),last=esc(g.lastText||t('هنوز پیامی ردوبدل نشده؛ اولین نفر باش!','No messages yet — say hello!'));
  const role=g.role==='owner'?t('مدیر گروه','Group owner'):t('عضو گروه','Member');
  return '<button type="button" class="social-group-row g4-row '+(g.unread?'has-unread':'')+'" data-social-open-group="'+esc(g.id)+'" data-group-search="'+esc((g.title||'')+' '+(g.lastText||''))+'" data-group-unread="'+(g.unread?'true':'false')+'" data-group-role="'+esc(g.role||'member')+'" data-group-status="'+esc(g.status||'active')+'"><span class="social-group-icon g4-group-avatar g4-hue-'+(i%5)+'">'+svg('users')+'</span><span class="social-group-copy g4-row-copy"><strong data-elara-ugc dir="auto">'+name+'</strong><small data-elara-ugc dir="auto">'+last+'</small><span class="g4-row-meta">'+(g.status==='closed'?'<i class="g4-closed">'+t('بسته‌شده','Closed')+'</i>':'<i>'+role+'</i>')+'</span></span><span class="g4-row-end"><time>'+when(g.updatedAt)+'</time>'+(g.unread?'<b class="social-unread-badge" aria-label="'+t('پیام خوانده‌نشده','Unread message')+'"></b>':svg('arrow'))+'</span></button>';
 }).join('');
 const spotlight=groups[0];
 section.innerHTML=
  '<div class="g4-hero"><div class="g4-hero-content"><span class="g4-eyebrow">'+svg('spark')+' ELARA SPACE / '+t('حلقه‌های دوستی','SOCIAL CIRCLES')+'</span><h2>'+t('مسیرهای بزرگ، با هم شروع می‌شن.','Great journeys start together.')+'</h2><p>'+t('گفت‌وگو کن، کنار هم رشد کن و برای هر ماجراجویی، جمع خودت رو داشته باش.','Connect, grow together and make a space for every adventure.')+'</p><div class="g4-hero-actions">'+newBtn()+(invites.length?'<button type="button" class="g4-secondary" data-g4-scroll-invites>'+t('دیدن دعوت‌ها','View invites')+' <span>'+numerals(invites.length)+'</span></button>':'')+'</div></div><div class="g4-hero-orbit" aria-hidden="true"><span class="g4-orbit-core">'+svg('users')+'</span><i></i><i></i><i></i></div></div>'+
  '<div class="g4-stats" aria-label="'+t('آمار گروه‌های من','My group statistics')+'"><article><span class="g4-stat-icon">'+svg('users')+'</span><div><strong>'+numerals(groups.length)+'</strong><small>'+t('گروه‌های من','My groups')+'</small></div></article><article><span class="g4-stat-icon">'+svg('bell')+'</span><div><strong>'+numerals(unread)+'</strong><small>'+t('گروه با پیام جدید','Groups with unread messages')+'</small></div></article><article><span class="g4-stat-icon">'+svg('spark')+'</span><div><strong>'+numerals(own)+'</strong><small>'+t('گروه‌های ساختهٔ من','Groups I own')+'</small></div></article></div>'+
  '<div class="g4-layout"><div class="g4-main"><div class="g4-panel-heading"><div><span class="g4-kicker">'+t('گفت‌وگوهای تو','YOUR CONVERSATIONS')+'</span><h3>'+t('گروه‌های من','My groups')+'</h3></div><span class="g4-count">'+numerals(groups.length)+' '+t('گروه','groups')+'</span></div>'+
  '<label class="g4-search">'+svg('search')+'<input type="search" data-g4-search autocomplete="off" aria-label="'+t('جست‌وجو در گروه‌ها','Search groups')+'" placeholder="'+t('اسم گروه یا آخرین پیام را جست‌وجو کن…','Search groups or last messages…')+'" value="'+esc(groupQuery)+'"></label>'+
  '<div class="g4-filters" role="group" aria-label="'+t('فیلتر گروه‌ها','Group filters')+'">'+[['all',t('همه','All')],['unread',t('خوانده‌نشده','Unread')],['owned',t('ساخته‌های من','Owned')],['closed',t('بسته‌شده','Closed')]].map(([key,label])=>'<button type="button" data-group-filter="'+key+'" aria-pressed="'+(groupFilter===key?'true':'false')+'">'+label+'</button>').join('')+'</div>'+
  (groups.length?'<div class="social-groups-scroll g4-list" aria-live="polite">'+cards+'</div>':'<div class="g4-empty"><div class="g4-empty-art" aria-hidden="true">'+svg('users')+'</div><h4>'+t('هنوز گروهی نساختی','Your story starts here')+'</h4><p>'+t('دوست‌هات رو دور هم جمع کن و اولین گفت‌وگو رو شروع کن.','Bring your friends together and start the first conversation.')+'</p>'+newBtn(true)+'</div>')+
  (groups.length?'<p class="g4-no-results" data-g4-no-results hidden>'+t('گروهی با این فیلتر پیدا نشد.','No matching groups found.')+'</p>':'')+
  '<div class="g4-list-foot"><span>'+t('نمایش','Showing')+' <b data-g4-results-count>'+numerals(groups.length)+'</b> '+t('گروه','groups')+'</span><span class="g4-live"><i></i>'+t('متصل به گروه‌های واقعی شما','Your real groups')+'</span></div></div>'+
  '<aside class="g4-side"><section class="g4-side-card g4-invitations" id="g4-invitations"><div class="g4-side-heading"><span class="g4-side-icon">'+svg('bell')+'</span><div><span class="g4-kicker">'+t('دعوت‌ها','INVITATIONS')+'</span><h3>'+t('دعوت‌های گروهی','Group invites')+'</h3></div>'+(invites.length?'<b>'+numerals(invites.length)+'</b>':'')+'</div>'+(invites.length?'<div class="social-group-invites g4-invite-list">'+inviteRows+'</div>':'<div class="g4-invite-empty"><span>✧</span><strong>'+t('فعلاً دعوت تازه‌ای نداری','All caught up!')+'</strong><p>'+t('وقتی دوستی تو رو به گروهی دعوت کنه، همین‌جا می‌بینیش.','New group invitations will show up here.')+'</p></div>')+'</section>'+
  '<section class="g4-side-card g4-discover"><span class="g4-kicker">'+t('جایی برای باهم بودن','A SPACE TO BELONG')+'</span><h3>'+t('ماجراجویی بعدی، جمعی زیباتره','Better together')+'</h3><p>'+t('برای برنامه‌ریزی، یادگیری، هدف‌ها و لحظه‌های مشترک یک گروه بساز.','Create a place for plans, learning, goals, and the moments you share.')+'</p>'+newBtn(true)+'</section>'+
  (spotlight?'<section class="g4-side-card g4-recent"><span class="g4-kicker">'+t('آخرین گفت‌وگو','MOST RECENT')+'</span><h3>'+t('ادامه بده از جایی که بودی','Pick up where you left off')+'</h3><button type="button" class="g4-recent-link" data-social-open-group="'+esc(spotlight.id)+'"><span class="g4-recent-icon">'+svg('users')+'</span><span><strong data-elara-ugc dir="auto">'+esc(spotlight.title||t('گروه','Group'))+'</strong><small data-elara-ugc dir="auto">'+esc(spotlight.lastText||t('برای شروع گفت‌وگو ضربه بزن','Tap to start chatting'))+'</small></span>'+svg('arrow')+'</button></section>':'')+'</aside></div>';
 applyGroupFilters(section);
}

async function createGroup(){
 const service=api(),people=friends();if(!service)return;
 if(!people.length){const el=document.getElementById('toast');if(el){el.textContent=t('اول حداقل یک دوست اضافه کن.','Add at least one friend first.');el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),3200)}return}
 const wrap=document.createElement('div');wrap.className='social-group-create';wrap.dataset.elaraI18n='off';
 wrap.innerHTML='<label>'+t('اسم گروه','Group name')+'<input name="title" maxlength="80" autocomplete="off" placeholder="'+t('مثلاً تیم شب‌زنده‌دارها 🌚','e.g. Night Owls 🌚')+'"></label><fieldset><legend>'+t('دوست‌ها را انتخاب کن','Choose friends')+'</legend><div class="social-group-friend-picker">'+people.map(p=>'<label><input type="checkbox" value="'+esc(p.uid)+'"><span class="social-dm-avatar">'+avatar(p)+'</span><span><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+esc(p.username?'@'+p.username:'')+'</small></span></label>').join('')+'</div></fieldset><p class="social-group-create-status" role="status"></p>';
 const ok=await window.ElaraDialog.open({title:t('ساخت گروه','Create group'),content:wrap,wide:true,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('ساخت گروه','Create group'),value:true,kind:'primary'}]});if(ok!==true)return;
 const title=wrap.querySelector('input[name="title"]').value.trim(),members=[...wrap.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value),status=wrap.querySelector('.social-group-create-status');
 try{const id=await service.create(title,members);await mount();setTimeout(()=>openGroup(id),0)}catch(error){status.textContent=String(error?.message||error);await window.ElaraDialog.open({title:t('گروه ساخته نشد','Could not create group'),message:String(error?.message||error),actions:[{label:t('باشه','OK'),value:true,kind:'primary'}]})}
}
function renderMessages(host,messages){
 const me=current();host.innerHTML=(messages||[]).map(m=>'<div class="social-chat-message '+(m.sender===me?.uid?'is-me':'is-them')+'"><div><p data-elara-ugc dir="auto">'+esc(m.text||'')+'</p><time>'+when(m.ms)+'</time></div></div>').join('')||'<div class="social-chat-empty"><span>👥</span><p>'+t('گروه تازه‌ست؛ یکی یه سلام آتیشی بده 🔥','Fresh group — somebody drop a fiery hello 🔥')+'</p></div>';host.scrollTop=host.scrollHeight
}
async function openGroup(id){
 const service=api();if(!service)return;const rows=await service.list(),group=rows.find(x=>x.id===id)||{id,title:t('گروه','Group'),role:'member'};
 const wrap=document.createElement('div');wrap.className='social-chat-dialog social-group-chat-dialog';wrap.dataset.elaraI18n='off';
 wrap.innerHTML='<header class="social-chat-head social-group-chat-head"><span class="social-group-icon">👥</span><div><strong>'+esc(group.title)+'</strong><small data-group-member-count>'+t('گروه دوستان','Friends group')+'</small></div>'+(group.role==='owner'?'<div class="social-group-owner-actions"><button type="button" class="quiet-button" data-group-manage-invite>'+t('دعوت','Invite')+'</button><button type="button" class="quiet-button" data-group-rename>'+t('تغییر نام','Rename')+'</button><button type="button" class="quiet-button danger" data-group-close>'+t('بستن گروه','Close group')+'</button></div>':'')+'<button type="button" class="quiet-button" data-group-mute>'+(window.ElaraSocial?.isContextMuted?.('group',id)?t('رفع بی‌صدا','Unmute'):t('بی‌صدا','Mute'))+'</button><button type="button" class="quiet-button" data-group-report>'+t('گزارش','Report')+'</button></header><div class="social-group-members" aria-label="'+t('اعضای گروه','Group members')+'"></div><div class="social-chat-messages" aria-live="polite"></div><div class="social-group-quick"><button type="button" data-group-quick="بزن بریم 🔥">بزن بریم 🔥</button><button type="button" data-group-quick="ریز می‌بینمت 👀">ریز می‌بینمت 👀</button><button type="button" data-group-quick="کم نیار 😎">کم نیار 😎</button><button type="button" data-group-quick="آماده‌ام 👊">آماده‌ام 👊</button></div><form class="social-chat-compose" '+(group.status==='closed'?'hidden':'')+'><textarea name="text" maxlength="2000" rows="1" data-elara-ugc dir="auto" placeholder="'+t('پیامت را بنویس…','Write a message…')+'" required></textarea><button class="primary-button" type="submit">'+t('ارسال','Send')+'</button></form>'+(group.status==='closed'?'<p class="muted">'+t('این گروه توسط صاحبش بسته شده و فقط برای مرور باقی مانده است.','This group is closed by its owner and remains read-only.')+'</p>':'')+'<p class="social-chat-status" role="status"></p>';
 const messagesHost=wrap.querySelector('.social-chat-messages'),status=wrap.querySelector('.social-chat-status'),membersHost=wrap.querySelector('.social-group-members');
 let members=[];try{members=await service.members(id);membersHost.innerHTML=members.map(m=>'<span title="'+esc(m.role)+'"><span class="social-dm-avatar">'+avatar(m.person)+'</span>'+esc(m.person?.name||m.person?.username||t('عضو','Member'))+(group.role==='owner'&&m.role!=='owner'?'<button type="button" class="quiet-button danger" data-group-remove-member="'+esc(m.uid)+'">'+t('حذف','Remove')+'</button>':'')+'</span>').join('');wrap.querySelector('[data-group-member-count]').textContent=members.length.toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+' '+t('عضو','members')}catch(error){membersHost.textContent=String(error?.message||error)}
 try{renderMessages(messagesHost,await service.messages(id));void service.markRead?.(id)}catch(error){status.textContent=String(error?.message||error)}
 let stop=null;try{stop=service.listen(id,m=>{renderMessages(messagesHost,m);void service.markRead?.(id)},error=>status.textContent=String(error?.message||error))}catch(error){status.textContent=String(error?.message||error)}
 wrap.querySelector('.social-group-quick').addEventListener('click',e=>{const b=e.target.closest('[data-group-quick]');if(!b)return;wrap.querySelector('textarea').value=b.dataset.groupQuick;wrap.querySelector('textarea').focus()});
 wrap.addEventListener('click',async e=>{
  const remove=e.target.closest('[data-group-remove-member]');if(remove){if(await window.ElaraDialog.confirm(t('این عضو از گروه حذف شود؟','Remove this member from the group?'),{title:t('حذف عضو','Remove member'),danger:true,confirmText:t('حذف','Remove')})){try{await service.removeMember(id,remove.dataset.groupRemoveMember);remove.closest('span[title]')?.remove()}catch(error){status.textContent=String(error?.message||error)}}return}
  if(e.target.closest('[data-group-manage-invite]')){const existing=new Set((await service.members(id)).map(x=>x.uid)),choices=friends().filter(x=>!existing.has(x.uid));if(!choices.length){status.textContent=t('دوست تأییدشدهٔ دیگری برای دعوت نیست.','No other accepted friend is available to invite.');return}const box=document.createElement('div');box.innerHTML='<select name="friend">'+choices.map(x=>'<option value="'+esc(x.uid)+'">'+esc(x.name||x.username||x.uid)+'</option>').join('')+'</select>';const ok=await window.ElaraDialog.open({title:t('دعوت به گروه','Invite to group'),content:box,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('دعوت','Invite'),value:true,kind:'primary'}]});if(ok===true)try{await service.invite(id,box.querySelector('select').value);status.textContent=t('دعوت ارسال شد.','Invite sent.')}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-group-rename]')){const box=document.createElement('div');box.innerHTML='<input name="title" maxlength="80" value="'+esc(group.title)+'">';const ok=await window.ElaraDialog.open({title:t('تغییر نام گروه','Rename group'),content:box,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('ذخیره','Save'),value:true,kind:'primary'}]});if(ok===true)try{group.title=await service.rename(id,box.querySelector('input').value);wrap.querySelector('.social-group-chat-head strong').textContent=group.title}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-group-close]')){if(await window.ElaraDialog.confirm(t('گروه بسته شود؟ بعد از آن ارسال پیام جدید ممکن نیست.','Close this group? New messages will no longer be allowed.'),{title:t('بستن گروه','Close group'),danger:true,confirmText:t('بستن','Close')}))try{await service.close(id);window.ElaraDialog.close()}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-group-mute]')){const muted=window.ElaraSocial?.isContextMuted?.('group',id);try{if(muted)await window.ElaraSocial?.unmuteContext?.('group',id);else await window.ElaraSocial?.muteContext?.('group',id);e.target.textContent=muted?t('بی‌صدا','Mute'):t('رفع بی‌صدا','Unmute')}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-group-report]')){const ok=await window.ElaraDialog.confirm(t('این گروه برای بررسی گزارش شود؟','Report this group for review?'),{title:t('گزارش گروه','Report group'),danger:true,confirmText:t('ارسال گزارش','Send report')});if(ok)try{await window.ElaraSocial?.reportUser?.(group.owner,'group',id,'other');status.textContent=t('گزارش ثبت شد.','Report submitted.')}catch(error){status.textContent=String(error?.message||error)}}
 });
 wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const input=e.currentTarget.elements.text,value=input.value.trim();if(!value)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;status.textContent=t('در حال ارسال…','Sending…');try{await service.send(id,value);input.value='';status.textContent=''}catch(error){status.textContent=String(error?.message||error)}finally{btn.disabled=false}});
 const actions=[{label:t('بستن','Close'),value:false}];if(group.role!=='owner')actions.unshift({label:t('خروج از گروه','Leave group'),value:'leave',kind:'danger'});
 try{const result=await window.ElaraDialog.open({title:t('گفتگوی گروهی','Group chat'),content:wrap,wide:true,actions});if(result==='leave'&&await window.ElaraDialog.confirm(t('از این گروه خارج شوی؟','Leave this group?'),{title:t('خروج از گروه','Leave group'),danger:true,confirmText:t('خروج','Leave')})){await service.leave(id)}}finally{try{stop?.()}catch{};setTimeout(mount,0)}
}
document.addEventListener('input',e=>{if(e.target.matches('.groups-r4 [data-g4-search]')){groupQuery=e.target.value;applyGroupFilters()}});
document.addEventListener('click',e=>{if(e.target.closest('.groups-r4 [data-g4-create]')){e.preventDefault();void createGroup();return}const filter=e.target.closest('.groups-r4 [data-group-filter]');if(filter){groupFilter=filter.dataset.groupFilter;applyGroupFilters();return}if(e.target.closest('.groups-r4 [data-group-retry]')){void mount(true);return}if(e.target.closest('.groups-r4 [data-g4-scroll-invites]')){document.getElementById('g4-invitations')?.scrollIntoView({behavior:'smooth',block:'center'})}});
document.addEventListener('click',async e=>{if(e.target.closest('[data-social-create-group]')){e.preventDefault();void createGroup();return}const invite=e.target.closest('[data-group-invite-action]');if(invite){e.preventDefault();const rows=await api()?.invites?.()||[],item=rows.find(x=>x.groupId===invite.dataset.groupInviteId);if(item)try{await api().decideInvite(item,invite.dataset.groupInviteAction);await mount()}catch(error){const el=document.getElementById('toast');if(el)el.textContent=String(error?.message||error)}return}const row=e.target.closest('[data-social-open-group]');if(row){e.preventDefault();void openGroup(row.dataset.socialOpenGroup);return}if(e.target.closest('[data-social-view]'))scheduleMount(40)});
for(const event of ['elara:social-updated','elara:social-ready','elara:social-failed','elara:locale-changed','elara:social-tab-changed'])window.addEventListener(event,()=>scheduleMount(40));
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='social')scheduleMount(80)});
window.addEventListener('hashchange',()=>scheduleMount(120));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scheduleMount(220),{once:true});else scheduleMount(220);
window.ElaraSocialGroupsUI={mount,createGroup,openGroup};
})();