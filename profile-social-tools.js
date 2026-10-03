/* Private viewer-side profile tools. Public pairing remains backend/consent gated. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const slots=Object.freeze({
 companion:{fa:'همراه',en:'Companion',max:1},
 lover:{fa:'لاور',en:'Lover',max:1},
 family:{fa:'خانواده',en:'Family',max:8},
 bro:{fa:'داش',en:'Bro',max:6},
 sis:{fa:'سیسی',en:'Sis',max:6},
 friend:{fa:'دوست',en:'Friend',max:20},
 buddy:{fa:'رفیق',en:'Buddy',max:12}
});
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'guest';
const key=()=> 'elara_profile_relations_v1_'+uid(),chatKey=()=> 'elara_hidden_chats_v1_'+uid();
function read(){try{const v=JSON.parse(localStorage.getItem(key())||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}}
function write(value){localStorage.setItem(key(),JSON.stringify(value));window.dispatchEvent(new Event('elara:profile-relations-changed'));return value}
function get(target){return read()[String(target)]||null}
function save(target,patch){
 target=String(target||'');if(!target)throw Error(tx('پروفایل مقصد مشخص نیست.','Target profile is missing.'));
 const data=read(),old=data[target]||{},next={...old,...patch,updatedAt:Date.now()};
 if(next.slot&&!slots[next.slot])next.slot='';
 if(next.slot&&next.slot!==old.slot){const cfg=slots[next.slot],used=Object.entries(data).filter(([id,v])=>id!==target&&v?.slot===next.slot).length;if(used>=cfg.max)throw Error(tx('ظرفیت «'+cfg.fa+'» پر شده؛ حداکثر '+cfg.max+' نفر.','The '+cfg.en+' slot is full; maximum '+cfg.max+'.'))}
 next.nickname=String(next.nickname||'').trim().slice(0,40);
 if(!next.nickname&&!next.slot)delete data[target];else data[target]=next;
 write(data);return data[target]||null
}
function hiddenChats(){try{const v=JSON.parse(localStorage.getItem(chatKey())||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}}
function hideChat(target,at=Date.now()){const data=hiddenChats();data[String(target)]=Number(at)||Date.now();localStorage.setItem(chatKey(),JSON.stringify(data));window.dispatchEvent(new CustomEvent('elara:chat-hidden',{detail:{target:String(target),at:data[String(target)]}}));return data[String(target)]}
function hiddenAt(target){return Number(hiddenChats()[String(target)]||0)}
function clearHidden(target){const data=hiddenChats();delete data[String(target)];localStorage.setItem(chatKey(),JSON.stringify(data))}
function targetFrom(root){return root?.querySelector?.('.elara-profile-composition[data-profile-self="0"]')?.dataset.profileUid||window.ElaraSocial?.profileView?.uid||''}
function decorate(root=document){
 const dialog=root.matches?.('.elara-profile-dialog')?root:root.querySelector?.('.elara-profile-dialog');if(!dialog)return;
 const target=targetFrom(dialog);if(!target||target===uid())return;
 let more=dialog.querySelector('[data-profile-more-menu]');if(!more){more=document.createElement('button');more.type='button';more.className='profile-more-button';more.dataset.profileMoreMenu=target;more.setAttribute('aria-label',tx('گزینه‌های پروفایل','Profile options'));more.textContent='⋯';dialog.prepend(more)}else more.dataset.profileMoreMenu=target;
 let note=dialog.querySelector('.profile-private-relation');const meta=get(target);
 if(!note){note=document.createElement('div');note.className='profile-private-relation';const card=dialog.querySelector('.pass4-public-profile-card');card?.querySelector('.pass4-public-profile-summary')?.insertAdjacentElement('afterend',note)}
 if(note){if(meta){const cfg=slots[meta.slot];note.hidden=false;note.innerHTML=(meta.nickname?'<span><small>'+tx('لقب خصوصی','Private nickname')+'</small><strong data-elara-ugc dir="auto">'+esc(meta.nickname)+'</strong></span>':'')+(cfg?'<span><small>'+tx('جایگاه','Relationship')+'</small><strong>'+esc(tx(cfg.fa,cfg.en))+'</strong></span>':'')+'<em>'+tx('فقط برای خودت؛ عمومی نشده','Private to you; not published')+'</em>'}else{note.hidden=true;note.innerHTML=''}}
}
async function editRelation(target){
 const current=get(target)||{},form=document.createElement('form');form.className='profile-relation-editor';form.innerHTML=
  '<label>'+tx('لقب خصوصی','Private nickname')+'<input name="nickname" maxlength="40" value="'+esc(current.nickname||'')+'" placeholder="'+tx('هر اسمی که خودت می‌خوای…','Any nickname you like…')+'"></label>'+
  '<label>'+tx('جایگاه','Relationship slot')+'<select name="slot"><option value="">'+tx('بدون جایگاه','No slot')+'</option>'+Object.entries(slots).map(([id,c])=>'<option value="'+id+'" '+(current.slot===id?'selected':'')+'>'+esc(tx(c.fa,c.en))+' · '+tx('حداکثر','max')+' '+c.max+'</option>').join('')+'</select></label>'+
  '<div class="profile-public-pair-gate"><label><input type="checkbox" disabled> '+tx('نمایش این رابطه در پروفایل عمومی','Show this relationship publicly')+'</label><small>'+tx('نمایش عمومی Lover/Companion فقط بعد از رضایت دوطرفه و Rules واقعی فعال می‌شود.','Public Lover/Companion pairing activates only after mutual consent and real Rules.')+'</small></div><p role="status"></p>';
 const ok=await window.ElaraDialog.open({title:tx('لقب و جایگاه','Nickname & relationship'),content:form,actions:[{label:tx('لغو','Cancel'),value:false},{label:tx('ذخیره','Save'),value:true,kind:'primary'}]});
 if(ok!==true)return;try{save(target,{nickname:form.elements.nickname.value,slot:form.elements.slot.value});decorate(document)}catch(error){const p=form.querySelector('[role=status]');if(p)p.textContent=error.message}
}
async function menu(target){
 const person=window.ElaraSocial?.profileView||window.ElaraSocial?.friends?.find(x=>x.uid===target)||{uid:target};
 const wrap=document.createElement('div');wrap.className='profile-more-actions';wrap.innerHTML=
  '<button type="button" data-profile-more-action="relation">'+tx('لقب و جایگاه','Nickname & relationship')+'</button>'+
  '<button type="button" data-profile-more-action="hide-chat">'+tx('حذف چت از لیست من','Remove chat from my list')+'</button>'+
  '<button type="button" class="danger" data-profile-more-action="block">'+tx('بلاک کردن','Block')+'</button>'+
  '<p>'+tx('حذف چت فعلاً فقط لیست همین دستگاه را پاک می‌کند؛ تاریخچهٔ سروری بدون قرارداد retention حذف نمی‌شود.','Chat removal currently hides it on this device only; server history is not deleted without a retention contract.')+'</p>';
 wrap.onclick=async e=>{
  const b=e.target.closest('[data-profile-more-action]');if(!b)return;
  if(b.dataset.profileMoreAction==='relation'){window.ElaraDialog.close();setTimeout(()=>void editRelation(target),0);return}
  if(b.dataset.profileMoreAction==='hide-chat'){if(await window.ElaraDialog.confirm(tx('این گفتگو از لیست تو پنهان شود؟ پیام جدید دوباره آن را نشان می‌دهد.','Hide this chat from your list? A new message will show it again.'),{title:tx('حذف از لیست','Remove from list'),confirmText:tx('حذف','Remove'),danger:true})){hideChat(target);window.ElaraDialog.close()}return}
  if(b.dataset.profileMoreAction==='block'){if(await window.ElaraDialog.confirm(tx('این کاربر بلاک شود؟','Block this user?'),{title:tx('بلاک کاربر','Block user'),confirmText:tx('بلاک','Block'),danger:true})){await window.ElaraSocial?.blockUser?.(target,person);window.ElaraDialog.close()}return}
 };
 await window.ElaraDialog.open({title:tx('گزینه‌های پروفایل','Profile options'),content:wrap,actions:[{label:tx('بستن','Close'),value:false}]})
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-profile-more-menu]');if(b){e.preventDefault();e.stopPropagation();void menu(b.dataset.profileMoreMenu)}});
const observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1){if(n.matches?.('.elara-profile-dialog')||n.querySelector?.('.elara-profile-dialog'))queueMicrotask(()=>decorate(n))}});
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('elara:profile-relations-changed',()=>decorate(document));
window.ElaraProfileRelations={slots,read,get,save,hiddenChats,hiddenAt,hideChat,clearHidden,decorate};
})();