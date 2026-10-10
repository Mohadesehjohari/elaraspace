/* Dedicated Friends chat UI. All persisted data and mutations go through ElaraSocial. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const api=()=>window.ElaraSocial?.dm, me=()=>window.ElaraSocial?.me||null;
const friends=()=>window.ElaraSocial?.friends||[], friendBy=id=>friends().find(p=>p.uid===id)||null;
let renderToken=0,threadToken=0,activeOther='',stopListening=null,dmSearch='',dmFilter='all';
const owner=()=>me()?.uid||window.ElaraAccount?.user?.uid||'guest';
const draftKey=other=>'elara_dm_draft_v1_'+owner()+'_'+String(other);
function readDraft(other){try{return String(localStorage.getItem(draftKey(other))||'').slice(0,2000)}catch{return''}}
function writeDraft(other,value){try{const v=String(value||'').slice(0,2000);if(v)localStorage.setItem(draftKey(other),v);else localStorage.removeItem(draftKey(other));return v}catch{return''}}
function friendAvatar(p){const src=window.ElaraProfileSystem?.viewModel?.(p,{self:false})?.avatarSrc;return src?'<img src="'+esc(src)+'" alt="">':'<span>'+esc((p?.name||p?.username||'?').slice(0,1))+'</span>'}
function when(ms){if(!ms)return'';try{return new Date(ms).toLocaleTimeString(document.documentElement.lang==='en'?'en-US':'fa-IR',{hour:'2-digit',minute:'2-digit'})}catch{return''}}
function liveState(other){return window.ElaraSocial?.presence?.state?.(other)||{online:false,known:false,lastSeen:0}}
function liveLabel(other){const p=liveState(other);return p.online?t('آنلاین','Online'):p.known&&p.lastSeen?t('آخرین حضور: ','Last seen: ')+when(p.lastSeen):t('وضعیت حضور نامشخص','Presence unknown')}
function avatarMarkup(p){return '<span class="social-dm-avatar">'+friendAvatar(p)+'</span>'}
function active(){return !!document.querySelector('#elara-social-page [data-social-view="chats"][aria-selected="true"]')}
function stop(){threadToken++;if(stopListening){try{stopListening()}catch{}stopListening=null}}
function layout(){return document.querySelector('#elara-social-page .social-dm-section')}
function filterRows(section){
 if(!section)return;
 section.querySelectorAll('.social-dm-row,.social-dm-friend,.social-dm-group-row').forEach(row=>{
  const query=row.textContent.toLocaleLowerCase().includes(dmSearch.toLocaleLowerCase());
  const unread=!!row.classList.contains('has-unread');
  row.hidden=!query||(dmFilter==='unread'&&!unread);
 });
}
function renderMessages(host,rows,other){
 if(!host||host.dataset.other!==other)return;
 const nearBottom=host.scrollHeight-host.scrollTop-host.clientHeight<100;
 host.innerHTML=(rows||[]).map(m=>'<div class="social-chat-message '+(m.sender===me()?.uid?'is-me':'is-them')+'"><div><p data-elara-ugc dir="auto">'+esc(m.text||'')+'</p><time>'+esc(when(m.ms))+'</time></div></div>').join('')||'<div class="social-chat-empty"><span>✦</span><p>'+t('هنوز پیامی نیست؛ اولین پیام را بفرست.','No messages yet. Send the first one.')+'</p></div>';
 if(nearBottom||!host.dataset.filled)host.scrollTop=host.scrollHeight;
 host.dataset.filled='yes';
}
async function mount(){
 const root=document.getElementById('elara-social-page'),dm=api();if(!root||!dm)return;
 if(!active()){stop();root.querySelector('.social-dm-section')?.remove();return}
 const grid=root.querySelector('.social-reference-grid');if(!grid)return;
 let section=root.querySelector('.social-dm-section');
 if(!section){section=document.createElement('section');section.className='elara-card social-section social-dm-section';section.dataset.elaraI18n='off';grid.prepend(section)}
 const ticket=++renderToken;
 section.innerHTML='<header class="social-dm-top"><div><small>ELARA · CHATS</small><h2>'+t('گفتگوهای من','My conversations')+'</h2><p>'+t('پیام خصوصی فقط بین دوستان تأییدشده فعال است.','Private messaging is for accepted friends only.')+'</p></div></header><p role="status" class="social-dm-loading">'+t('در حال بارگذاری گفتگوها…','Loading conversations…')+'</p>';
 if(!me()){section.innerHTML+='<p class="social-empty-copy">'+t('برای گفتگو وارد حساب تأییدشده شو.','Sign in with a verified account.')+'</p>';return}
 let dms=[],groups=[];
 try{
  dms=await dm.list();
  if(window.ElaraSocial?.groups?.list)try{groups=await window.ElaraSocial.groups.list()}catch(error){console.warn('Groups list in chats:',error?.code||error)}
 }catch(error){if(ticket!==renderToken)return;section.querySelector('.social-dm-loading').textContent=t('دریافت گفتگوها ممکن نشد: ','Conversations could not load: ')+String(error?.message||error);return}
 if(ticket!==renderToken||!section.isConnected||!active())return;
 const visible=dms.filter(row=>{const hidden=Number(window.ElaraProfileRelations?.hiddenAt?.(row.other)||0);if(!hidden)return true;if(Number(row.updatedAt||0)>hidden){window.ElaraProfileRelations?.clearHidden?.(row.other);return true}return false});
 const recent=visible.map(row=>{
  const p=row.person||friendBy(row.other)||{uid:row.other,name:t('دوست','Friend')};
  const online=liveState(row.other).online;
  return '<button type="button" class="social-dm-row '+(row.unread?'has-unread ':'')+(activeOther===row.other?'is-active':'')+'" data-social-open-dm="'+esc(row.other)+'">'+avatarMarkup(p)+'<span class="social-dm-copy"><strong>'+esc(p.name||p.username||t('دوست','Friend'))+(online?'<i class="social-presence-dot" aria-label="'+t('آنلاین','Online')+'"></i>':'')+'</strong><small data-elara-ugc dir="auto">'+esc(row.lastText||t('گفتگو را شروع کن','Start a conversation'))+'</small></span><span class="social-dm-row-meta"><time>'+esc(when(row.updatedAt))+'</time>'+(row.unread?'<b class="social-unread-badge" aria-label="'+t('خوانده‌نشده','Unread')+'">●</b>':'')+'</span></button>';
 }).join('');
 const starts=friends().filter(p=>!visible.some(row=>row.other===p.uid)).map(p=>'<button type="button" class="social-dm-friend" data-social-open-dm="'+esc(p.uid)+'">'+avatarMarkup(p)+'<span><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+t('شروع گفتگو','Start chat')+'</small></span></button>').join('');
 const groupRows=groups.map(g=>'<button type="button" class="social-dm-group-row '+(g.unread?'has-unread':'')+'" data-social-open-group="'+esc(g.id)+'"><span class="social-group-icon">👥</span><span class="social-dm-copy"><strong>'+esc(g.title||t('گروه','Group'))+'</strong><small data-elara-ugc dir="auto">'+esc(g.lastText||t('گفتگوی گروهی','Group chat'))+'</small></span><time>'+esc(when(g.updatedAt))+'</time></button>').join('');
 section.innerHTML='<header class="social-dm-top"><div><small>ELARA · CHATS</small><h2>'+t('گفتگوهای من','My conversations')+'</h2><p>'+t('گفتگوهای خصوصی و گروه‌های مجاز حساب تو.','Your authorized private and group conversations.')+'</p></div></header>'+
 '<div class="social-dm-layout"><aside class="social-dm-recents"><div class="social-dm-tools"><input data-dm-search type="search" aria-label="'+t('جستجوی گفتگو','Search chats')+'" placeholder="'+t('جستجو در گفتگوها…','Search conversations…')+'" value="'+esc(dmSearch)+'"><select data-dm-filter aria-label="'+t('فیلتر گفتگو','Conversation filter')+'"><option value="all" '+(dmFilter==='all'?'selected':'')+'>'+t('همه','All')+'</option><option value="unread" '+(dmFilter==='unread'?'selected':'')+'>'+t('خوانده‌نشده','Unread')+'</option></select></div><h3>'+t('گفتگوها','Conversations')+'</h3><div class="social-dm-scroll">'+(recent||'<p class="ref-empty">'+t('هنوز گفتگویی نداری.','No conversations yet.')+'</p>')+'</div><div class="social-dm-start"><h3>'+t('شروع گفتگو','Start a chat')+'</h3><div class="social-dm-friends">'+(starts||'<p class="ref-empty">'+t('گفتگوهای جدیدی برای شروع نیست.','No new conversations to start.')+'</p>')+'</div></div>'+(groups.length?'<div class="social-dm-groups"><h3>'+t('گروه‌ها','Groups')+'</h3>'+groupRows+'</div>':'')+'</aside><div class="social-dm-thread-slot" data-social-dm-slot><div class="social-chat-empty"><span>✦</span><p>'+t('یک گفتگو را انتخاب کن.','Select a conversation.')+'</p></div></div><aside class="social-dm-profile-slot" data-dm-profile-slot hidden></aside></div>';
 filterRows(section);
 if(activeOther)void openChat(activeOther);
}
async function openChat(other){
 const section=layout(),dm=api(),p=friendBy(other),slot=section?.querySelector('[data-social-dm-slot]');
 if(!section||!slot||!dm||!p){return}
 stop();activeOther=other;const ticket=threadToken;
 section.classList.add('has-active-thread');
 section.querySelectorAll('[data-social-open-dm]').forEach(b=>b.classList.toggle('is-active',b.dataset.socialOpenDm===other));
 slot.innerHTML='<p role="status" class="social-dm-loading">'+t('در حال باز کردن گفتگو…','Opening conversation…')+'</p>';
 const profile=section.querySelector('[data-dm-profile-slot]');if(profile){profile.hidden=true;profile.innerHTML=''}
 const wrap=document.createElement('div');wrap.className='social-chat-dialog social-inline-chat';wrap.dataset.elaraI18n='off';
 const presence=liveState(other);
 wrap.innerHTML='<header class="social-chat-head"><button type="button" class="social-chat-back" data-dm-back aria-label="'+t('بازگشت به فهرست','Back to chats')+'">←</button>'+avatarMarkup(p)+'<div class="social-chat-contact"><strong data-elara-ugc dir="auto">'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small class="social-chat-presence" data-presence-other="'+esc(other)+'">'+(presence.online?'<i class="social-presence-dot"></i>':'')+esc(liveLabel(other))+'</small></div><div class="social-chat-head-actions"><button type="button" class="quiet-button" data-dm-profile-toggle aria-expanded="false">'+t('اطلاعات','Info')+'</button><button type="button" class="quiet-button" data-dm-mute>'+(window.ElaraSocial?.isMuted?.(other)?t('رفع بی‌صدا','Unmute'):t('بی‌صدا','Mute'))+'</button><button type="button" class="quiet-button" data-dm-report>'+t('گزارش','Report')+'</button><button type="button" class="quiet-button danger" data-dm-block>'+t('مسدود','Block')+'</button></div></header><div class="social-chat-messages" data-other="'+esc(other)+'" aria-live="polite"></div><form class="social-chat-compose"><button type="button" class="social-chat-emoji" data-dm-emoji aria-label="'+t('درج ایموجی','Insert emoji')+'">☺</button><textarea name="text" maxlength="2000" rows="1" data-elara-ugc dir="auto" placeholder="'+t('پیام خود را بنویسید…','Write a message…')+'" required></textarea><button class="primary-button" type="submit">'+t('ارسال','Send')+'</button></form><p class="social-chat-status" role="status"></p>';
 slot.replaceChildren(wrap);
 const messagesHost=wrap.querySelector('.social-chat-messages'),status=wrap.querySelector('.social-chat-status'),field=wrap.querySelector('textarea[name="text"]');
 field.value=readDraft(other);field.addEventListener('input',()=>writeDraft(other,field.value));
 try{
  const initial=await dm.messages(other);
  if(ticket!==threadToken||!wrap.isConnected)return;
  renderMessages(messagesHost,initial,other);
  void dm.markRead?.(other).then(()=>section.querySelector('[data-social-open-dm="'+CSS.escape(other)+'"]')?.classList.remove('has-unread')).catch(()=>{});
 }catch(error){if(ticket===threadToken)status.textContent=String(error?.message||error);return}
 try{stopListening=dm.listen(other,m=>{if(ticket!==threadToken||!wrap.isConnected)return;renderMessages(messagesHost,m,other);void dm.markRead?.(other).catch(()=>{})},error=>{if(ticket===threadToken)status.textContent=String(error?.message||error)})}
 catch(error){status.textContent=String(error?.message||error)}
 wrap.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();const text=field.value.trim();if(!text)return;
  const button=e.currentTarget.querySelector('[type="submit"]');button.disabled=true;status.textContent=t('در حال ارسال…','Sending…');
  try{await dm.send(other,text);field.value='';writeDraft(other,'');window.ElaraProfileRelations?.clearHidden?.(other);status.textContent='';field.focus()}
  catch(error){status.textContent=t('ارسال تأیید نشد؛ پیش از تلاش دوباره گفتگو را بررسی کن. ','Send was not confirmed; check the thread before retrying. ')+String(error?.message||error)}
  finally{button.disabled=false}
 });
 wrap.addEventListener('click',async e=>{
  if(e.target.closest('[data-dm-back]')){stop();activeOther='';section.classList.remove('has-active-thread');section.querySelector('[data-dm-profile-slot]')?.setAttribute('hidden','');slot.innerHTML='<div class="social-chat-empty">'+t('یک گفتگو را انتخاب کن.','Select a chat.')+'</div>';section.querySelectorAll('[data-social-open-dm]').forEach(b=>b.classList.remove('is-active'));return}
  if(e.target.closest('[data-dm-profile-toggle]')){if(!profile)return;profile.hidden=!profile.hidden;wrap.querySelector('[data-dm-profile-toggle]').setAttribute('aria-expanded',String(!profile.hidden));section.classList.toggle('has-profile-panel',!profile.hidden);if(!profile.hidden)profile.innerHTML='<div class="social-dm-profile-cover"></div>'+avatarMarkup(p)+'<h3 data-elara-ugc dir="auto">'+esc(p.name||p.username||t('دوست','Friend'))+'</h3><p>'+esc(p.username?'@'+p.username:t('دوست تأییدشده','Accepted friend'))+'</p><p class="social-dm-profile-presence">'+esc(liveLabel(other))+'</p><button type="button" data-open-profile="'+esc(other)+'" class="quiet-button">'+t('مشاهده پروفایل','View profile')+'</button>';return}
  if(e.target.closest('[data-dm-emoji]')){const at=field.selectionStart;field.setRangeText('✨',at,field.selectionEnd,'end');writeDraft(other,field.value);field.focus();return}
  if(e.target.closest('[data-dm-mute]')){const muted=window.ElaraSocial?.isMuted?.(other);try{if(muted)await window.ElaraSocial.unmuteUser(other);else await window.ElaraSocial.muteUser(other);e.target.textContent=muted?t('بی‌صدا','Mute'):t('رفع بی‌صدا','Unmute')}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-dm-report]')){const ok=await window.ElaraDialog?.confirm?.(t('این گفتگو گزارش شود؟','Report this conversation?'),{title:t('گزارش','Report'),confirmText:t('ارسال گزارش','Report'),danger:true});if(ok)try{await window.ElaraSocial.reportUser(other,'dm',dm.id?.(other)||'','other');status.textContent=t('گزارش ثبت شد.','Report submitted.')}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-dm-block]')){const ok=await window.ElaraDialog?.confirm?.(t('این کاربر مسدود شود؟','Block this user?'),{title:t('مسدودکردن','Block user'),danger:true,confirmText:t('مسدود','Block')});if(ok)try{await window.ElaraSocial.blockUser(other,p);stop();activeOther='';await mount()}catch(error){status.textContent=String(error?.message||error)}}
 });
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-social-open-dm]');if(b){e.preventDefault();void openChat(b.dataset.socialOpenDm);return}
 if(e.target.closest('[data-social-view]'))setTimeout(mount,40);
});
document.addEventListener('input',e=>{if(e.target.matches('[data-dm-search]')){dmSearch=e.target.value;filterRows(layout())}});
document.addEventListener('change',e=>{if(e.target.matches('[data-dm-filter]')){dmFilter=e.target.value;filterRows(layout())}});
for(const event of ['elara:social-updated','elara:chat-hidden','elara:locale-changed'])window.addEventListener(event,()=>setTimeout(mount,50));
window.addEventListener('elara:presence-updated',()=>{document.querySelectorAll('#elara-social-page [data-presence-other]').forEach(el=>{const other=el.dataset.presenceOther;el.textContent=liveLabel(other);if(liveState(other).online)el.insertAdjacentHTML('afterbegin','<i class="social-presence-dot"></i>')})});
window.addEventListener('hashchange',()=>setTimeout(mount,140));
const observer=new MutationObserver(()=>{if(document.getElementById('elara-social-page')){observer.disconnect();setTimeout(mount,40)}});
if(!document.getElementById('elara-social-page'))observer.observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,200),{once:true});else setTimeout(mount,200);
window.ElaraSocialMessagingUI={mount,openChat};
})();