/* Canonical notification center: Bell opens this popup, Settings remains independent. */
(()=>{'use strict';
const KEY='elara_notifications_v1',MAX=120,arr=v=>Array.isArray(v)?v:[],esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>crypto?.randomUUID?.()||'n-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function read(){try{return arr(JSON.parse(localStorage.getItem(KEY)||'[]')).filter(x=>x&&typeof x==='object')}catch{return[]}}
function write(rows){localStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX)));syncBadge();window.dispatchEvent(new CustomEvent('elara:notifications-changed',{detail:{unread:unreadCount()}}))}
function unreadCount(){return read().filter(x=>x.read!==true&&x.unread!==false).length+incoming().length}
function incoming(){const me=window.ElaraSocial?.me?.uid;return arr(window.ElaraSocial?.requests).filter(r=>r.to===me&&r.status==='pending')}
function push(input={}){
 const type=String(input.type||'system'),key=String(input.dedupeKey||''),rows=read();
 if(key&&rows.some(x=>x.dedupeKey===key))return rows.find(x=>x.dedupeKey===key);
 const row={id:id(),type,title:String(input.title||'Elara'),message:String(input.message||''),createdAt:Number(input.createdAt||Date.now()),read:false,visibility:String(input.visibility||'private'),dedupeKey:key,meta:input.meta&&typeof input.meta==='object'?input.meta:{}};
 write([...rows,row]);return row;
}
function mark(idValue){write(read().map(x=>x.id===idValue?{...x,read:true,unread:false}:x))}
function markAll(){write(read().map(x=>({...x,read:true,unread:false})))}
function clearRead(){write(read().filter(x=>x.read!==true))}
function iconFor(type){return ({friend:'👊',reading:'📚',book:'📖',goal:'⚡',task:'✅',habit:'🔥',ranking:'🏆',system:'✦'})[type]||'✦'}
function combined(){
 const requests=incoming().map(r=>({id:'friend:'+r.id,type:'friend',title:'درخواست دوستی',message:(r.person?.name||r.person?.username||'یک کاربر')+' می‌خواهد همراهت باشد.',createdAt:Number(r.createdAt||Date.now()),read:false,requestId:r.id}));
 return [...requests,...read()].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
}
function root(){
 let host=document.getElementById('elara-notification-popover');if(host)return host;
 host=document.createElement('div');host.id='elara-notification-popover';host.className='elara-notification-popover hidden';
 host.innerHTML='<button class="elara-notification-scrim" type="button" data-notification-close aria-label="بستن اعلان‌ها"></button><section class="elara-notification-window" role="dialog" aria-modal="true" aria-label="اعلان‌ها"><header><div><small>ELARA</small><h2>اعلان‌ها</h2></div><button type="button" data-notification-close aria-label="بستن">×</button></header><div class="elara-notification-actions"><button type="button" data-notification-mark-all>خواندن همه</button><button type="button" data-notification-clear-read>پاک‌کردن خوانده‌شده‌ها</button></div><div class="elara-notification-list"></div></section>';
 document.body.append(host);return host
}
function render(){
 const host=root(),list=host.querySelector('.elara-notification-list'),rows=combined();
 list.innerHTML=rows.length?rows.map(x=>`<article class="elara-notification-row ${x.read===true?'is-read':'is-unread'}" data-notification-id="${esc(x.id)}" ${x.requestId?`data-notification-request="${esc(x.requestId)}"`:''}><span class="elara-notification-glyph" aria-hidden="true">${iconFor(x.type)}</span><div><strong>${esc(x.title||'Elara')}</strong><p>${esc(x.message||'')}</p><small>${new Date(Number(x.createdAt||Date.now())).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')}</small></div>${x.requestId?'<button type="button" data-notification-open-friends>مشاهده</button>':x.read===true?'':'<button type="button" data-notification-read>خواندم</button>'}</article>`).join(''):'<p class="elara-notification-empty">اعلان تازه‌ای نداری.</p>';
 syncBadge()
}
let launcher=null;
function open(button){launcher=button||document.getElementById('ref-header-notifications');const host=root();render();host.classList.remove('hidden');document.body.classList.add('elara-notifications-open');host.querySelector('.elara-notification-window [data-notification-close]')?.focus({preventScroll:true})}
function close(){const host=document.getElementById('elara-notification-popover');if(!host)return;host.classList.add('hidden');document.body.classList.remove('elara-notifications-open');launcher?.focus?.({preventScroll:true});launcher=null}
function syncBadge(){const n=unreadCount();document.querySelectorAll('#ref-header-notifications,[data-notification-bell]').forEach(b=>{b.dataset.unreadCount=String(n);b.setAttribute('aria-label',n?`اعلان‌ها، ${n} خوانده‌نشده`:'اعلان‌ها')})}
document.addEventListener('click',e=>{
 const bell=e.target.closest('#ref-header-notifications,[data-notification-bell]');if(bell){e.preventDefault();e.stopPropagation();open(bell);return}
 if(e.target.closest('[data-notification-close]')){close();return}
 if(e.target.closest('[data-notification-mark-all]')){markAll();render();return}
 if(e.target.closest('[data-notification-clear-read]')){clearRead();render();return}
 const row=e.target.closest('[data-notification-id]');
 if(row&&e.target.closest('[data-notification-read]')){mark(row.dataset.notificationId);render();return}
 if(row?.dataset.notificationRequest&&e.target.closest('[data-notification-open-friends]')){close();window.ElaraOpen?.('social');setTimeout(()=>document.querySelector('[data-social-view="friends"][data-social-route="social"]')?.click(),80)}
});
document.addEventListener('keydown',e=>{const host=document.getElementById('elara-notification-popover');if(e.key==='Escape'&&host&&!host.classList.contains('hidden')){e.preventDefault();close()}},true);
for(const evt of ['elara:social-updated','elara:account-ready','elara:logout','elara:notifications-changed'])window.addEventListener(evt,syncBadge);
window.ElaraNotify={read,push,mark,markAll,clearRead,unreadCount,open,close,render,syncBadge};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncBadge,{once:true});else syncBadge();
})();