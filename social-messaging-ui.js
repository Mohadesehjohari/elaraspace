(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
let renderToken=0,activeOther='',stopActive=null,dmFilter='';
function api(){return window.ElaraSocial?.dm}
function current(){return window.ElaraSocial?.me||null}
const owner=()=>current()?.uid||window.ElaraAccount?.user?.uid||'guest';
const draftKey=other=>'elara_dm_draft_v1_'+owner()+'_'+String(other);
const readDraft=other=>{try{return String(localStorage.getItem(draftKey(other))||'').slice(0,2000)}catch{return''}};
const writeDraft=(other,value)=>{try{const text=String(value||'').slice(0,2000);if(text)localStorage.setItem(draftKey(other),text);else localStorage.removeItem(draftKey(other));return text}catch{return''}};
function friendBy(uid){return (window.ElaraSocial?.friends||[]).find(x=>x.uid===uid)||null}
function avatar(p){const model=window.ElaraProfileSystem?.viewModel?.(p,{self:false});const src=model?.avatarSrc;return src?'<img src="'+esc(src)+'" alt="">':'<span>'+esc((p?.name||p?.username||'?').slice(0,1))+'</span>'}
function when(ms){if(!ms)return'';try{return new Date(ms).toLocaleTimeString(document.documentElement.lang==='en'?'en-US':'fa-IR',{hour:'2-digit',minute:'2-digit'})}catch{return''}}
async function mount(){
 const root=document.getElementById('elara-social-page');if(!root||!api())return;
 const selected=root.querySelector('[data-social-view="chats"][aria-selected="true"]');if(!selected){try{stopActive?.()}catch{};stopActive=null;root.classList.remove('social-dm-chat-open');root.querySelector('.social-dm-section')?.remove();return}
 const grid=root.querySelector('.social-reference-grid');if(!grid)return;
 let section=root.querySelector('.social-dm-section');if(!section){section=document.createElement('section');section.className='elara-card social-section social-dm-section';section.dataset.elaraI18n='off';grid.prepend(section)}
 const token=++renderToken,me=current(),friends=window.ElaraSocial?.friends||[];
 section.innerHTML='<header><div><small>ELARA · CHAT</small><h2>'+t('گفتگوها','Chats')+'</h2><p>'+t('پیام خصوصی فقط با دوستان تأییدشده.','Private messages are available only with accepted friends.')+'</p></div></header><div class="social-dm-loading">'+t('در حال بارگذاری گفتگوها…','Loading chats…')+'</div>';
 if(!me){section.innerHTML+='<p class="social-empty-copy">'+t('برای گفتگو وارد حساب تأییدشده شو.','Sign in with a verified account to chat.')+'</p>';return}
 let dms=[];try{dms=await api().list()}catch(error){if(token!==renderToken)return;section.querySelector('.social-dm-loading').textContent=t('گفتگوها بارگذاری نشدند.','Chats could not be loaded.')+' '+String(error?.message||'');return}
 if(token!==renderToken||!section.isConnected)return;
 const visibleDms=dms.filter(row=>{const hidden=Number(window.ElaraProfileRelations?.hiddenAt?.(row.other)||0);if(!hidden)return true;if(Number(row.updatedAt||0)>hidden){window.ElaraProfileRelations?.clearHidden?.(row.other);return true}return false});
 const rows=visibleDms.map(row=>{const p=row.person||friendBy(row.other)||{uid:row.other,name:t('دوست','Friend')};return '<button type="button" class="social-dm-row '+(row.unread?'has-unread':'')+'" data-social-open-dm="'+esc(row.other)+'"><span class="social-dm-avatar">'+avatar(p)+'</span><span class="social-dm-copy"><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+esc(row.lastText||t('گفتگو را شروع کن','Start a conversation'))+'</small></span>'+(row.unread?'<b class="social-unread-badge" aria-label="'+t('خوانده‌نشده','Unread')+'">•</b>':'')+'<time>'+when(row.updatedAt)+'</time></button>'}).join('');
 const starts=friends.map(p=>'<button type="button" class="social-dm-friend" data-social-open-dm="'+esc(p.uid)+'"><span class="social-dm-avatar">'+avatar(p)+'</span><span><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+t('پیام بده','Message')+'</small></span></button>').join('');
 section.innerHTML='<div class="social-dm-layout"><div class="social-dm-recents"><header class="social-dm-list-head"><h2>'+t('گفت‌وگوهای من','My conversations')+'</h2><button type="button" class="primary-button" data-dm-new>'+t('پیام جدید','New message')+'</button></header><label class="sr-only" for="social-dm-filter">'+t('جست‌وجوی گفتگو','Search conversations')+'</label><input id="social-dm-filter" data-dm-filter type="search" placeholder="'+t('جست‌وجوی گفتگو…','Search chats…')+'" value="'+esc(dmFilter)+'"><div class="social-dm-scroll">'+(rows||'<p class="ref-empty">'+t('هنوز گفتگویی نداری.','No conversations yet.')+'</p>')+'</div><div class="social-dm-start"><h3>'+t('دوستان برای شروع گفتگو','Friends to message')+'</h3><div class="social-dm-friends">'+(starts||'<p class="ref-empty">'+t('اول یک دوست اضافه کن.','Add a friend first.')+'</p>')+'</div></div></div><div class="social-dm-conversation" aria-live="polite"><div class="social-chat-empty">'+t('یک گفتگو را انتخاب کن.','Select a conversation.')+'</div></div></div>';
 filterRows(section);
 if(activeOther)void openChat(activeOther);

}
function renderMessages(host,messages,other){
 const me=current(),p=friendBy(other)||{uid:other,name:t('دوست','Friend')};
 host.innerHTML=(messages||[]).map(m=>'<div class="social-chat-message '+(m.sender===me?.uid?'is-me':'is-them')+'"><div><p data-elara-ugc dir="auto">'+esc(m.text||'')+'</p><time>'+when(m.ms)+'</time></div></div>').join('')||'<div class="social-chat-empty"><span>👋</span><p>'+t('اولین پیام را بفرست؛ یک سلام ساده کافیه 😎','Send the first message — a simple hello is enough 😎')+'</p></div>';
 host.scrollTop=host.scrollHeight;
 return p;
}
function filterRows(section){const q=dmFilter.trim().toLocaleLowerCase();for(const row of section.querySelectorAll('.social-dm-row'))row.hidden=!!q&&!row.textContent.toLocaleLowerCase().includes(q)}
async function openChat(other){
 const dm=api(),root=document.getElementById('elara-social-page');if(!dm||!root||!other)return;
 activeOther=other;
 if(!root.querySelector('[data-social-view="chats"][aria-selected="true"]')){
  root.querySelector('[data-social-view="chats"][data-social-route="social"]')?.click();return;
 }
 const host=root.querySelector('.social-dm-conversation');if(!host){setTimeout(()=>openChat(other),80);return}
 try{stopActive?.()}catch{};stopActive=null;
 const p=friendBy(other)||{uid:other,name:t('دوست','Friend')},presence=window.ElaraSocial?.presence?.state?.(other),online=presence?.online===true;
 host.innerHTML='<div class="social-chat-dialog" data-dm-current="'+esc(other)+'"><header class="social-chat-head"><button type="button" class="social-dm-back" data-dm-back aria-label="'+t('بازگشت به گفتگوها','Back to conversations')+'">←</button><span class="social-dm-avatar">'+avatar(p)+'</span><div class="social-chat-ident"><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+ (online?t('● آنلاین','● Online'):presence?.known?t('آخرین حضور ثبت شده','Last seen available'):t('وضعیت حضور نامشخص','Presence unavailable'))+'</small></div><div class="social-chat-head-actions"><button type="button" class="quiet-button" data-dm-info aria-expanded="false">'+t('اطلاعات','Info')+'</button><button type="button" class="quiet-button" data-dm-mute>'+ (window.ElaraSocial?.isMuted?.(other)?t('رفع بی‌صدا','Unmute'):t('بی‌صدا','Mute')) +'</button></div></header><div class="social-chat-body"><div class="social-chat-messages" aria-live="polite"></div><aside class="social-chat-profile" hidden><div class="social-dm-avatar">'+avatar(p)+'</div><h3>'+esc(p.name||p.username||t('دوست','Friend'))+'</h3><p dir="auto">'+(p.username?'@'+esc(p.username):'')+'</p><button type="button" class="quiet-button" data-dm-open-profile="'+esc(other)+'">'+t('نمایش پروفایل','View profile')+'</button><div class="social-chat-safety"><button type="button" class="quiet-button" data-dm-report>'+t('گزارش','Report')+'</button><button type="button" class="quiet-button danger" data-dm-block>'+t('مسدودکردن','Block')+'</button></div></aside></div><form class="social-chat-compose"><button type="button" class="quiet-button" data-dm-emoji aria-label="'+t('افزودن ایموجی','Add emoji')+'">☺</button><button type="button" class="quiet-button" disabled title="'+t('ارسال فایل و تصویر هنوز به ذخیره‌سازی امن متصل نیست.','Secure attachments are not yet available.')+'">📎</button><textarea name="text" maxlength="2000" rows="1" dir="auto" placeholder="'+t('پیامت را بنویس…','Write a message…')+'" required></textarea><button class="primary-button" type="submit">'+t('ارسال','Send')+'</button></form><p class="social-chat-status" role="status"></p></div>';
 root.classList.add('social-dm-chat-open');
 root.querySelectorAll('.social-dm-row').forEach(row=>row.classList.toggle('is-selected',row.dataset.socialOpenDm===other));
 const wrap=host.querySelector('.social-chat-dialog'),messagesHost=wrap.querySelector('.social-chat-messages'),status=wrap.querySelector('.social-chat-status'),input=wrap.querySelector('textarea[name="text"]');
 input.value=readDraft(other);input.addEventListener('input',()=>writeDraft(other,input.value));
 try{renderMessages(messagesHost,await dm.messages(other),other);void dm.markRead?.(other).catch?.(()=>{})}catch(error){status.textContent=String(error?.message||error)}
 if(!wrap.isConnected||activeOther!==other)return;
 try{stopActive=dm.listen(other,m=>{if(activeOther!==other||!wrap.isConnected)return;renderMessages(messagesHost,m,other);void dm.markRead?.(other).catch?.(()=>{})},error=>status.textContent=String(error?.message||error))}catch(error){status.textContent=String(error?.message||error)}
 wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const field=e.currentTarget.elements.text,text=field.value.trim();if(!text)return;const btn=e.currentTarget.querySelector('[type="submit"]');btn.disabled=true;status.textContent=t('در حال ارسال…','Sending…');try{await dm.send(other,text);field.value='';writeDraft(other,'');window.ElaraProfileRelations?.clearHidden?.(other);status.textContent='';field.focus()}catch(error){status.textContent=String(error?.message||error)}finally{btn.disabled=false}});
 wrap.addEventListener('click',async e=>{
  if(e.target.closest('[data-dm-back]')){activeOther='';root.classList.remove('social-dm-chat-open');try{stopActive?.()}catch{};stopActive=null;host.innerHTML='<div class="social-chat-empty">'+t('یک گفتگو را انتخاب کن.','Select a conversation.')+'</div>';return}
  const info=e.target.closest('[data-dm-info]');if(info){const pane=wrap.querySelector('.social-chat-profile');pane.hidden=!pane.hidden;wrap.classList.toggle('has-info',!pane.hidden);info.setAttribute('aria-expanded',String(!pane.hidden));return}
  if(e.target.closest('[data-dm-open-profile]')){try{await window.ElaraSocial?.openProfile?.(other)}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-dm-emoji]')){const at=input.selectionStart||0;input.setRangeText('✨',at,input.selectionEnd||at,'end');writeDraft(other,input.value);input.focus();return}
  if(e.target.closest('[data-dm-mute]')){const muted=window.ElaraSocial?.isMuted?.(other);try{if(muted)await window.ElaraSocial?.unmuteUser?.(other);else await window.ElaraSocial?.muteUser?.(other);e.target.textContent=muted?t('بی‌صدا','Mute'):t('رفع بی‌صدا','Unmute')}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-dm-report]')){const ok=await window.ElaraDialog.confirm(t('این گفتگو/کاربر برای بررسی گزارش شود؟','Report this conversation?'),{title:t('گزارش','Report'),confirmText:t('ارسال گزارش','Report'),danger:true});if(ok)try{await window.ElaraSocial?.reportUser?.(other,'dm',dm.id?.(other)||'','other');status.textContent=t('گزارش ثبت شد.','Report submitted.')}catch(error){status.textContent=String(error?.message||error)}return}
  if(e.target.closest('[data-dm-block]')){const ok=await window.ElaraDialog.confirm(t('این کاربر مسدود شود؟','Block this user?'),{title:t('مسدودکردن','Block'),confirmText:t('مسدود','Block'),danger:true});if(ok)try{await window.ElaraSocial?.blockUser?.(other,p);activeOther='';root.classList.remove('social-dm-chat-open');window.ElaraDialog.close();void mount()}catch(error){status.textContent=String(error?.message||error)}}
 });
}

document.addEventListener('click',e=>{const btn=e.target.closest('[data-social-open-dm]');if(btn){e.preventDefault();void openChat(btn.dataset.socialOpenDm);return}if(e.target.closest('[data-dm-new]')){document.querySelector('.social-dm-start')?.scrollIntoView({behavior:'smooth',block:'nearest'});return}if(e.target.closest('[data-social-view]'))setTimeout(mount,40)});
document.addEventListener('input',e=>{if(e.target.matches('[data-dm-filter]')){dmFilter=e.target.value;const root=document.querySelector('.social-dm-section');if(root)filterRows(root)}});
window.addEventListener('elara:social-updated',()=>setTimeout(mount,0));window.addEventListener('elara:chat-hidden',()=>setTimeout(mount,0));window.addEventListener('elara:locale-changed',()=>setTimeout(mount,0));window.addEventListener('hashchange',()=>setTimeout(mount,120));
const socialObserver=new MutationObserver(()=>{if(document.getElementById('elara-social-page')){socialObserver.disconnect();setTimeout(mount,20)}});if(!document.getElementById('elara-social-page'))socialObserver.observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,200),{once:true});else setTimeout(mount,200);
window.ElaraSocialMessagingUI={mount,openChat};
})();