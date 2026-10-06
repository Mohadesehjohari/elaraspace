/* Canonical notification center: Bell opens this popup, Settings remains independent. */
(()=>{'use strict';
const KEY='elara_notifications_v1',MAX=120,arr=v=>Array.isArray(v)?v:[],esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>crypto?.randomUUID?.()||'n-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const tt=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
function read(){try{return arr(JSON.parse(localStorage.getItem(KEY)||'[]')).filter(x=>x&&typeof x==='object')}catch{return[]}}
function write(rows){localStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX)));syncBadge();window.dispatchEvent(new CustomEvent('elara:notifications-changed',{detail:{unread:unreadCount()}}))}
function unreadCount(){return read().filter(x=>x.read!==true&&x.unread!==false).length}
function push(input={}){
 const type=String(input.type||'system'),key=String(input.dedupeKey||''),rows=read(),existing=key?rows.find(x=>x.dedupeKey===key):null;
 if(existing){
  if(input.reopen===true&&(existing.read===true||existing.unread===false||existing.meta?.resolved===true)){
   const next=rows.map(x=>x.id===existing.id?{...x,title:String(input.title||x.title||'Elara'),message:String(input.message||x.message||''),createdAt:Number(input.createdAt||Date.now()),read:false,unread:true,meta:{...(x.meta||{}),...(input.meta&&typeof input.meta==='object'?input.meta:{}),resolved:false}}:x);write(next);return next.find(x=>x.id===existing.id)
  }
  return existing
 }
 const row={id:id(),type,title:String(input.title||'Elara'),message:String(input.message||''),createdAt:Number(input.createdAt||Date.now()),read:false,visibility:String(input.visibility||'private'),dedupeKey:key,meta:input.meta&&typeof input.meta==='object'?input.meta:{}};
 write([...rows,row]);return row;
}
function mark(idValue){write(read().map(x=>x.id===idValue?{...x,read:true,unread:false}:x))}
function resolveByMeta(kind,targetId){write(read().map(x=>x.meta?.kind===kind&&(String(x.meta?.requestId||x.meta?.inviteId||'')===String(targetId))?{...x,read:true,unread:false,meta:{...(x.meta||{}),resolved:true}}:x))}
function markAll(){write(read().map(x=>({...x,read:true,unread:false})))}
function clearRead(){write(read().filter(x=>x.read!==true))}
function iconFor(type){return ({friend:'👊',reading:'📚',book:'📖',goal:'⚡',task:'✅',habit:'🔥',focus:'🧠',ranking:'🏆',system:'✦'})[type]||'✦'}
function combined(){return read().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))}
function localizeRoot(host){
 if(!host)return host;const panel=host.querySelector('.elara-notification-window');
 host.querySelector('.elara-notification-scrim')?.setAttribute('aria-label',tt('بستن اعلان‌ها','Close notifications'));
 panel?.setAttribute('aria-label',tt('اعلان‌ها','Notifications'));host.querySelector('[data-notification-back]')?.setAttribute('aria-label',tt('بازگشت','Back'));
 const title=host.querySelector('.elara-notification-window h2');if(title)title.textContent=tt('اعلان‌ها','Notifications');
 const close=host.querySelector('.elara-notification-window [data-notification-close]');if(close)close.setAttribute('aria-label',tt('بستن','Close'));
 const all=host.querySelector('[data-notification-mark-all]');if(all)all.textContent=tt('خواندن همه','Mark all read');
 const clear=host.querySelector('[data-notification-clear-read]');if(clear)clear.textContent=tt('پاک‌کردن خوانده‌شده‌ها','Clear read');
 return host
}
function root(){
 let host=document.getElementById('elara-notification-popover');if(host)return localizeRoot(host);
 host=document.createElement('div');host.id='elara-notification-popover';host.className='elara-notification-popover hidden';
 host.innerHTML='<button class="elara-notification-scrim" type="button" data-notification-close></button><section class="elara-notification-window" role="dialog" aria-modal="true" tabindex="-1"><header><button type="button" data-notification-back>←</button><div><small>ELARA</small><h2></h2></div><button type="button" data-notification-close>×</button></header><div class="elara-notification-actions"><button type="button" data-notification-mark-all></button><button type="button" data-notification-clear-read></button></div><div class="elara-notification-list"></div></section>';
 document.body.append(host);return localizeRoot(host)
}
function render(){
 const host=root(),list=host.querySelector('.elara-notification-list'),rows=combined();
 list.innerHTML=rows.length?rows.map(x=>{const kind=x.meta?.kind,resolved=x.meta?.resolved===true;let action='';
  if(!resolved&&kind==='friend-request'&&x.meta?.requestId)action=`<div class="elara-notification-inline-actions"><button type="button" class="primary-button" data-notification-friend-accept>${tt('قبول','Accept')}</button><button type="button" class="quiet-button danger" data-notification-friend-decline>${tt('رد','Decline')}</button></div>`;
  else if(!resolved&&kind==='collab-invite'&&x.meta?.inviteId)action=`<div class="elara-notification-inline-actions"><button type="button" class="primary-button" data-notification-collab-accept>${tt('قبول','Accept')}</button><button type="button" class="quiet-button danger" data-notification-collab-decline>${tt('رد','Decline')}</button></div>`;
  else if(x.read!==true)action=`<button type="button" data-notification-read>${tt('خواندم','Mark read')}</button>`;
  return `<article class="elara-notification-row ${x.read===true?'is-read':'is-unread'} ${resolved?'is-resolved':''}" data-notification-id="${esc(x.id)}"><span class="elara-notification-glyph" aria-hidden="true">${iconFor(x.type)}</span><div><strong>${esc(x.title||'Elara')}</strong><p>${esc(x.message||'')}</p><small>${new Date(Number(x.createdAt||Date.now())).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')}</small></div>${action}</article>`
 }).join(''):`<p class="elara-notification-empty">${tt('اعلان تازه‌ای نداری.','No new notifications.')}</p>`;
 syncBadge()
}
let launcher=null;
function open(button){launcher=button||document.getElementById('ref-header-notifications');const host=root();syncBadge();render();window.ElaraOverlayStack?.next?.(host);host.classList.remove('hidden');document.body.classList.add('elara-notifications-open');host.querySelector('.elara-notification-window [data-notification-close]')?.focus({preventScroll:true})}
function close(){const host=document.getElementById('elara-notification-popover');if(!host)return;host.classList.add('hidden');document.body.classList.remove('elara-notifications-open');launcher?.focus?.({preventScroll:true});launcher=null}
function syncBadge(){const n=unreadCount();document.querySelectorAll('#ref-header-notifications,[data-notification-bell]').forEach(b=>{b.dataset.unreadCount=String(n);b.setAttribute('aria-label',n?(document.documentElement.lang==='en'?`${n} unread notifications`:`اعلان‌ها، ${n} خوانده‌نشده`):tt('اعلان‌ها','Notifications'));const img=b.querySelector('.ref-notification-art'),src=n>0?'assets/ui/icon-notifications-unread.webp':'assets/ui/icon-notifications-read.webp';if(img&&img.getAttribute('src')!==src)img.setAttribute('src',src)})}
function notificationFocusables(){
 const host=document.getElementById('elara-notification-popover');if(!host||host.classList.contains('hidden'))return[];
 return [...host.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null)
}
function trapNotificationKey(e){
 const host=document.getElementById('elara-notification-popover');if(!host||host.classList.contains('hidden'))return;
 const dialog=document.getElementById('elara-dialog-root');if(dialog&&!dialog.hidden&&!dialog.classList.contains('hidden'))return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return}
 if(e.key!=='Tab')return;
 const items=notificationFocusables(),panel=host.querySelector('.elara-notification-window');if(!items.length){e.preventDefault();panel?.focus?.({preventScroll:true});return}
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus({preventScroll:true})}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus({preventScroll:true})}
}
document.addEventListener('click',async e=>{
 const bell=e.target.closest('#ref-header-notifications,[data-notification-bell]');if(bell){e.preventDefault();e.stopImmediatePropagation();window.ElaraPrivateDrawer?.close?.();open(bell);return}
 if(e.target.closest('[data-notification-close],[data-notification-back]')){close();return}
 if(e.target.closest('[data-notification-mark-all]')){markAll();render();return}
 if(e.target.closest('[data-notification-clear-read]')){clearRead();render();return}
 const row=e.target.closest('[data-notification-id]');if(!row)return;
 if(e.target.closest('[data-notification-read]')){mark(row.dataset.notificationId);render();return}
 const item=read().find(x=>x.id===row.dataset.notificationId);if(!item)return;
 const requestId=String(item.meta?.requestId||''),inviteId=String(item.meta?.inviteId||'');
 if(requestId&&(e.target.closest('[data-notification-friend-accept]')||e.target.closest('[data-notification-friend-decline]'))){
  const request=window.ElaraSocial?.requests?.find?.(x=>String(x.id)===requestId);if(!request)return;
  const status=e.target.closest('[data-notification-friend-accept]')?'accepted':'declined';
  try{await window.ElaraSocial?.decide?.(request,status);resolveByMeta('friend-request',requestId);render()}catch(error){console.error('Notification friend action:',error)}
  return
 }
 if(inviteId&&(e.target.closest('[data-notification-collab-accept]')||e.target.closest('[data-notification-collab-decline]'))){
  try{if(e.target.closest('[data-notification-collab-accept]'))await window.ElaraCollab?.acceptInvite?.(inviteId);else await window.ElaraCollab?.declineInvite?.(inviteId);resolveByMeta('collab-invite',inviteId);render()}catch(error){console.error('Notification collab action:',error)}
 }
});
document.addEventListener('keydown',trapNotificationKey,true);
for(const evt of ['elara:social-updated','elara:account-ready','elara:logout','elara:notifications-changed'])window.addEventListener(evt,syncBadge);
window.addEventListener('elara:locale-changed',()=>{const host=document.getElementById('elara-notification-popover');if(host)render();else syncBadge()});
window.ElaraNotify={read,push,mark,markAll,clearRead,resolveByMeta,unreadCount,open,close,render,syncBadge};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncBadge,{once:true});else syncBadge();
})();