(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
let renderToken=0;
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
 const selected=root.querySelector('[data-social-view="chats"][aria-selected="true"]');if(!selected){root.querySelector('.social-dm-section')?.remove();return}
 const grid=root.querySelector('.social-reference-grid');if(!grid)return;
 let section=root.querySelector('.social-dm-section');if(!section){section=document.createElement('section');section.className='elara-card social-section social-dm-section';section.dataset.elaraI18n='off';grid.prepend(section)}
 const token=++renderToken,me=current(),friends=window.ElaraSocial?.friends||[];
 section.innerHTML='<header><div><small>ELARA · CHAT</small><h2>'+t('گفتگوها','Chats')+'</h2><p>'+t('پیام خصوصی فقط با دوستان تأییدشده.','Private messages are available only with accepted friends.')+'</p></div></header><div class="social-dm-loading">'+t('در حال بارگذاری گفتگوها…','Loading chats…')+'</div>';
 if(!me){section.innerHTML+='<p class="social-empty-copy">'+t('برای گفتگو وارد حساب تأییدشده شو.','Sign in with a verified account to chat.')+'</p>';return}
 let dms=[];try{dms=await api().list()}catch(error){if(token!==renderToken)return;section.querySelector('.social-dm-loading').textContent=t('گفتگوها بارگذاری نشدند.','Chats could not be loaded.')+' '+String(error?.message||'');return}
 if(token!==renderToken||!section.isConnected)return;
 const visibleDms=dms.filter(row=>{const hidden=Number(window.ElaraProfileRelations?.hiddenAt?.(row.other)||0);if(!hidden)return true;if(Number(row.updatedAt||0)>hidden){window.ElaraProfileRelations?.clearHidden?.(row.other);return true}return false});
 const rows=visibleDms.map(row=>{const p=row.person||friendBy(row.other)||{uid:row.other,name:t('دوست','Friend')};return '<button type="button" class="social-dm-row" data-social-open-dm="'+esc(row.other)+'"><span class="social-dm-avatar">'+avatar(p)+'</span><span class="social-dm-copy"><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+esc(row.lastText||t('گفتگو را شروع کن','Start a conversation'))+'</small></span><time>'+when(row.updatedAt)+'</time></button>'}).join('');
 const starts=friends.map(p=>'<button type="button" class="social-dm-friend" data-social-open-dm="'+esc(p.uid)+'"><span class="social-dm-avatar">'+avatar(p)+'</span><span><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+t('پیام بده','Message')+'</small></span></button>').join('');
 section.innerHTML='<header><div><small>ELARA · CHAT</small><h2>'+t('گفتگوها','Chats')+'</h2><p>'+t('پیام خصوصی فقط با دوستان تأییدشده.','Private messages are available only with accepted friends.')+'</p></div></header><div class="social-dm-layout"><div class="social-dm-recents"><h3>'+t('پیام‌های اخیر','Recent messages')+'</h3><div class="social-dm-scroll">'+(rows||'<p class="ref-empty">'+t('هنوز گفتگویی نداری.','No conversations yet.')+'</p>')+'</div></div><div class="social-dm-start"><h3>'+t('شروع گفتگو','Start a chat')+'</h3><div class="social-dm-friends">'+(starts||'<p class="ref-empty">'+t('اول یک دوست اضافه کن.','Add a friend first.')+'</p>')+'</div></div></div>';
}
function renderMessages(host,messages,other){
 const me=current(),p=friendBy(other)||{uid:other,name:t('دوست','Friend')};
 host.innerHTML=(messages||[]).map(m=>'<div class="social-chat-message '+(m.sender===me?.uid?'is-me':'is-them')+'"><div><p data-elara-ugc dir="auto">'+esc(m.text||'')+'</p><time>'+when(m.ms)+'</time></div></div>').join('')||'<div class="social-chat-empty"><span>👋</span><p>'+t('اولین پیام را بفرست؛ یک سلام ساده کافیه 😎','Send the first message — a simple hello is enough 😎')+'</p></div>';
 host.scrollTop=host.scrollHeight;
 return p;
}
async function openChat(other){
 const dm=api();if(!dm)return;const p=friendBy(other)||{uid:other,name:t('دوست','Friend')};
 const wrap=document.createElement('div');wrap.className='social-chat-dialog';wrap.dataset.elaraI18n='off';
 wrap.innerHTML='<header class="social-chat-head"><span class="social-dm-avatar">'+avatar(p)+'</span><div><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+esc(p.username?'@'+p.username:t('دوست الارا','Elara friend'))+'</small></div></header><div class="social-chat-messages" aria-live="polite"></div><form class="social-chat-compose"><textarea name="text" maxlength="2000" rows="1" data-elara-ugc dir="auto" placeholder="'+t('پیامت را بنویس…','Write a message…')+'" required></textarea><button class="primary-button" type="submit">'+t('ارسال','Send')+'</button></form><p class="social-chat-status" role="status"></p>';
 const messagesHost=wrap.querySelector('.social-chat-messages'),status=wrap.querySelector('.social-chat-status'),input=wrap.querySelector('textarea[name="text"]');input.value=readDraft(other);input.addEventListener('input',()=>writeDraft(other,input.value));
 try{renderMessages(messagesHost,await dm.messages(other),other)}catch(error){status.textContent=String(error?.message||error)}
 let stop=null;try{stop=dm.listen(other,m=>renderMessages(messagesHost,m,other),error=>status.textContent=String(error?.message||error))}catch(error){status.textContent=String(error?.message||error)}
 wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const field=e.currentTarget.elements.text,text=field.value.trim();if(!text)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;status.textContent=t('در حال ارسال…','Sending…');try{await dm.send(other,text);field.value='';writeDraft(other,'');window.ElaraProfileRelations?.clearHidden?.(other);status.textContent='';field.focus()}catch(error){status.textContent=String(error?.message||error)}finally{btn.disabled=false}});
 try{await window.ElaraDialog.open({title:t('گفتگو','Chat'),content:wrap,wide:true,actions:[{label:t('بستن','Close'),value:false}]})}finally{try{stop?.()}catch{};setTimeout(mount,0)}
}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-social-open-dm]');if(btn){e.preventDefault();void openChat(btn.dataset.socialOpenDm);return}if(e.target.closest('[data-social-view]'))setTimeout(mount,40)});
window.addEventListener('elara:social-updated',()=>setTimeout(mount,0));window.addEventListener('elara:chat-hidden',()=>setTimeout(mount,0));window.addEventListener('elara:locale-changed',()=>setTimeout(mount,0));window.addEventListener('hashchange',()=>setTimeout(mount,120));
const socialObserver=new MutationObserver(()=>{if(document.getElementById('elara-social-page')){socialObserver.disconnect();setTimeout(mount,20)}});if(!document.getElementById('elara-social-page'))socialObserver.observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,200),{once:true});else setTimeout(mount,200);
window.ElaraSocialMessagingUI={mount,openChat};
})();