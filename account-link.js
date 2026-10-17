/* Explicit, revocable friendship-wide sharing of newly created supported items.
 * Both accounts retain their own Firebase Auth identity and private storage.
 * Item delivery reuses the existing invitation/membership security model. */
import {getApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,collection,doc,getDoc,setDoc,updateDoc,query,where,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const auth=getAuth(getApp()),db=getFirestore(getApp()),STORE='elara_space_v1';
const sets=[['task','tasks'],['habit','habits'],['goal','goals'],['language-class','languageClasses'],['leitner-word','words']];
const kindTitles={'task':['تسک‌ها','Tasks'],'habit':['عادت‌ها','Habits'],'goal':['هدف‌ها','Goals'],'language-class':['کلاس‌های زبان','Language classes'],'leitner-word':['واژه‌های لایتنر','Leitner words']};
const safeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ownItem=row=>row&&row.id!=null&&row.collabRole!=='member'&&!row.sourceManaged;
const defaultMode=()=>read().accountLinkDefaultMode==='shared'?'shared':'private';
const itemMode=(row,state)=>['private','shared'].includes(row?.accountLinkVisibility)?row.accountLinkVisibility:state?.accountLinkDefaultMode==='shared'?'shared':'private';
const language=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const ownUid=()=>auth.currentUser?.uid||'';
const friendRows=()=>Array.isArray(window.ElaraSocial?.friends)?window.ElaraSocial.friends:[];
const isFriend=uid=>friendRows().some(friend=>friend.uid===uid);
const other=row=>row.from===ownUid()?row.to:row.from;
let activeUid='',accountReady=false,links=new Map(),unsubs=[],inbound=[],outbound=[],syncTimer=null,syncing=false,accepting=new Set(),lastInbox=[];
function read(){try{const value=JSON.parse(localStorage.getItem(STORE)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return{}}}
function write(value){localStorage.setItem(STORE,JSON.stringify(value));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:value}));window.dispatchEvent(new Event('elara:data-changed'))}
function verified(){if(!auth.currentUser?.emailVerified||!ownUid())throw Error(language('ابتدا وارد حساب تأییدشده شو.','Sign in to a verified account first.'));return ownUid()}
function active(){
 const found=new Map();for(const row of links.values())if(row.status==='accepted'&&isFriend(other(row))&&!found.has(other(row)))found.set(other(row),row);
 return [...found.values()];
}
function status(friendUid){const rows=[...links.values()].filter(x=>other(x)===friendUid);if(rows.some(x=>x.status==='accepted'&&isFriend(friendUid)))return'accepted';if(rows.some(x=>x.status==='pending'&&x.to===ownUid()))return'incoming';if(rows.some(x=>x.status==='pending'&&x.from===ownUid()))return'outgoing';return'none'}
function requests(){return [...links.values()].filter(row=>row.status==='pending')}
function announce(){window.dispatchEvent(new Event('elara:account-links-updated'));scheduleSync();void acceptLinkedInvites(lastInbox)}
function reconcile(){
 if(!activeUid||auth.currentUser?.uid!==activeUid)return;
 const all=new Map();for(const row of [...inbound,...outbound])all.set(row.id,row);
 links=all;announce();
}
function stop(){
 for(const f of unsubs)try{f()}catch{}unsubs=[];links.clear();inbound=[];outbound=[];clearTimeout(syncTimer);syncTimer=null;accepting.clear();lastInbox=[];
 window.dispatchEvent(new Event('elara:account-links-updated'));
}
function watch(uid){
 if(uid===activeUid&&unsubs.length)return;stop();activeUid=uid;
 const rows=(field,save)=>onSnapshot(query(collection(db,'accountLinks'),where(field,'==',uid)),snap=>{if(activeUid!==uid)return;save(snap.docs.map(d=>({id:d.id,...d.data()})));reconcile()},error=>console.warn('Account link listener:',error.code||error.message));
 unsubs.push(rows('from',values=>{outbound=values}),rows('to',values=>{inbound=values}));
}
function linkRef(row){return doc(db,'accountLinks',row.id)}
async function request(friendUid){
 const uid=verified();const target=String(friendUid||'');
 if(!target||target===uid||!isFriend(target))throw Error(language('این حساب در فهرست دوستان تأییدشده نیست.','Choose an accepted friend.'));
 if(active().some(row=>other(row)!==target))throw Error(language('اول اتصال فعال فعلی را قطع کن؛ هر حساب در هر زمان به یک دوست متصل می‌شود.','Disconnect your current linked account first.'));
 if(status(target)==='accepted')return true;
 if(status(target)==='incoming')throw Error(language('دعوت این دوست در بخش درخواست‌ها منتظر تأیید توست.','This friend already sent you an invitation.'));
 const existing=[...links.values()].find(row=>row.from===uid&&row.to===target);
 const confirmed=await window.ElaraDialog.confirm(language('پس از پذیرش دوست، موارد جدید (تسک، عادت، هدف، کلاس زبان و واژهٔ لایتنر) به‌صورت خودکار به حساب او فرستاده می‌شوند؛ موارد قبلی خصوصی می‌مانند. ادامه می‌دهی؟','After your friend accepts, NEW tasks, habits, goals, language classes, and Leitner words will be shared automatically. Existing content stays private. Continue?'),{title:language('اتصال دو حساب','Link accounts'),confirmText:language('ارسال درخواست','Send request')});
 if(!confirmed)return false;
 if(existing?.status==='pending')return true;
 if(existing&&['declined','revoked'].includes(existing.status)){
  await updateDoc(linkRef(existing),{status:'pending',updatedAt:serverTimestamp()});
 }else{
  await setDoc(doc(db,'accountLinks',uid+'__'+target),{from:uid,to:target,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 }
 return true;
}
async function accept(linkId){
 const uid=verified(),row=links.get(String(linkId));
 if(!row||row.to!==uid||row.status!=='pending'||!isFriend(row.from))throw Error(language('این درخواست قابل تأیید نیست.','This link request cannot be accepted.'));
 if(active().some(otherRow=>other(otherRow)!==row.from))throw Error(language('برای اتصال به دوست جدید، اول اتصال قبلی را قطع کن.','Unlink your current friend first.'));
 const confirmed=await window.ElaraDialog.confirm(language('با تأیید این درخواست، هر مورد جدیدی که تو یا این دوست در بخش‌های پشتیبانی‌شده بسازید به حساب دیگری ارسال می‌شود. هر زمان می‌توانی اتصال را قطع کنی. موارد قبلی خصوصی می‌مانند.','Once linked, new supported items from either account will appear in the other. You can unlink anytime. Older items stay private.'),{title:language('تأیید اتصال دوطرفه','Approve two-way sharing'),confirmText:language('تأیید اتصال','Approve link')});
 if(!confirmed)return false;
 await updateDoc(linkRef(row),{status:'accepted',updatedAt:serverTimestamp()});
 return true;
}
async function decline(linkId){
 const uid=verified(),row=links.get(String(linkId));
 if(!row||row.to!==uid||row.status!=='pending')return false;
 await updateDoc(linkRef(row),{status:'declined',updatedAt:serverTimestamp()});return true;
}
async function disconnect(friendUid){
 const uid=verified(),row=[...links.values()].find(x=>other(x)===String(friendUid)&&x.status==='accepted');
 if(!row||(row.from!==uid&&row.to!==uid))return false;
 const confirmed=await window.ElaraDialog.confirm(language('ارسال خودکار موارد جدید به این دوست متوقف شود؟ نسخه‌های قبلاً اشتراک‌گذاری‌شده از حساب‌ها پاک نمی‌شوند.','Stop sharing new items with this friend? Previously shared copies remain in both accounts.'),{title:language('قطع اتصال حساب‌ها','Unlink accounts'),confirmText:language('قطع اتصال','Unlink'),danger:true});
 if(!confirmed)return false;
 await updateDoc(linkRef(row),{status:'revoked',updatedAt:serverTimestamp()});return true;
}
function itemRows(s){return sets.flatMap(([kind,key])=>(Array.isArray(s[key])?s[key]:[]).filter(ownItem).map(row=>({kind,row,key:kind+'|'+String(row.id)})))}

function setDefaultMode(mode){
 if(!['private','shared'].includes(mode))throw Error(language('حالت اشتراک نامعتبر است.','Invalid sharing mode.'));
 if(mode==='shared'&&!active().length)throw Error(language('ابتدا حساب یک دوست را متصل کن.','Link with a friend first.'));
 const s=read(),old=s.accountLinkDefaultMode==='shared'?'shared':'private';
 if(mode===old)return true;
 // Existing records keep their OLD visibility. A new default is NEVER retroactive.
 for(const {row} of itemRows(s))if(!['private','shared'].includes(row.accountLinkVisibility))row.accountLinkVisibility=old;
 s.accountLinkDefaultMode=mode;write(s);return true;
}
function setItemMode(kind,ids,mode){
 if(!sets.some(x=>x[0]===kind)||!['private','shared'].includes(mode))throw Error(language('نوع یا حالت اشتراک نامعتبر است.','Invalid selection.'));
 if(mode==='shared'&&!active().length)throw Error(language('اول به یک دوست متصل شو.','Link with a friend before sharing.'));
 const s=read(),field=sets.find(x=>x[0]===kind)[1],set=new Set((Array.isArray(ids)?ids:[]).map(String));
 const found=(Array.isArray(s[field])?s[field]:[]).filter(row=>ownItem(row)&&set.has(String(row.id)));
 if(!found.length)return 0;
 s.accountLinkSeen=s.accountLinkSeen&&typeof s.accountLinkSeen==='object'&&!Array.isArray(s.accountLinkSeen)?s.accountLinkSeen:{};
 for(const row of found){
  const old=itemMode(row,s);row.accountLinkVisibility=mode;
  if(old===mode)continue;
  const key=kind+'|'+String(row.id);
  for(const link of active()){
   const seen=Array.isArray(s.accountLinkSeen[link.id])?s.accountLinkSeen[link.id]:[];
   s.accountLinkSeen[link.id]=mode==='shared'?seen.filter(x=>x!==key):[...new Set([...seen,key])].slice(-20000);
  }
 }
 write(s);scheduleSync();return found.length;
}
async function openManager(){
 verified();const s=read(),items=itemRows(s),host=document.createElement('section');
 host.className='account-share-manager';host.dataset.elaraI18n='off';
 const peers=active().map(link=>friendRows().find(p=>p.uid===other(link))?.name||friendRows().find(p=>p.uid===other(link))?.username||other(link)).join('، ');
 host.innerHTML='<p class="account-share-note">'+(peers?language('دوست متصل: ','Connected friend: ')+safeHtml(peers)+' · ':'')+
 language('فقط موارد «مشترک» به حساب دوست می‌روند. «فقط من» جلوی ارسال بعدی را می‌گیرد، اما مواردی را که قبلاً ارسال شده‌اند از حساب دوست پاک نمی‌کند.','Only items marked Shared are delivered. Only me stops future deliveries but does not delete previously delivered copies.')+'</p>'+
 '<label class="account-share-default">'+language('حالت پیش‌فرض برای موارد جدید','Default for NEW items')+' <select data-share-default><option value="private">'+language('🔒 فقط من','🔒 Only me')+'</option><option value="shared" '+(!active().length?'disabled':'')+'>'+language('🤝 مشترک','🤝 Shared')+'</option></select></label>'+
 '<div class="account-share-actions"><button type="button" data-share-all>'+language('انتخاب همهٔ موارد','Select everything')+'</button><button type="button" data-share-clear>'+language('لغو انتخاب','Clear selection')+'</button><button type="button" data-share-mode="shared" '+(!active().length?'disabled':'')+'>'+language('🤝 مشترک کردن','🤝 Share selected')+'</button><button type="button" data-share-mode="private">'+language('🔒 فقط برای من','🔒 Only me')+'</button></div><p data-share-status role="status"></p>'+
 sets.map(([kind])=>'<section class="account-share-group" data-share-group="'+kind+'"><header><strong>'+language(...kindTitles[kind])+'</strong><button type="button" data-share-group-all="'+kind+'">'+language('انتخاب همه','Select all')+'</button></header><div class="account-share-items">'+
 items.filter(x=>x.kind===kind).map(({row})=>'<label><input type="checkbox" data-share-item data-kind="'+kind+'" value="'+safeHtml(row.id)+'"><span dir="auto">'+safeHtml(String(kind==='task'?row.text:kind==='leitner-word'?row.front:row.title||'').slice(0,160))+'</span><small>'+ (itemMode(row,s)==='shared'?language('🤝 مشترک','🤝 Shared'):language('🔒 فقط من','🔒 Only me'))+'</small></label>').join('')+'</div></section>').join('');
 host.querySelector('[data-share-default]').value=defaultMode();
 host.addEventListener('change',event=>{
  if(!event.target.matches('[data-share-default]'))return;
  try{setDefaultMode(event.target.value);host.querySelector('[data-share-status]').textContent=language('پیش‌فرض موارد جدید ذخیره شد.','New-item default saved.')}
  catch(err){event.target.value=defaultMode();host.querySelector('[data-share-status]').textContent=err.message}
 });
 host.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-share-all'))host.querySelectorAll('[data-share-item]').forEach(x=>x.checked=true);
  if(b.hasAttribute('data-share-clear'))host.querySelectorAll('[data-share-item]').forEach(x=>x.checked=false);
  if(b.hasAttribute('data-share-group-all')){
   const boxes=[...host.querySelectorAll('[data-share-group="'+b.dataset.shareGroupAll+'"] [data-share-item]')],all=boxes.every(x=>x.checked);boxes.forEach(x=>x.checked=!all);
  }
  if(b.hasAttribute('data-share-mode')){
   const mode=b.dataset.shareMode,boxes=[...host.querySelectorAll('[data-share-item]:checked')],groups=new Map();
   for(const x of boxes){if(!groups.has(x.dataset.kind))groups.set(x.dataset.kind,[]);groups.get(x.dataset.kind).push(x.value)}
   if(!boxes.length){host.querySelector('[data-share-status]').textContent=language('چیزی انتخاب نشده است.','Select at least one item.');return}
   try{
    for(const [kind,ids] of groups)setItemMode(kind,ids,mode);
    for(const x of boxes){x.closest('label').querySelector('small').textContent=mode==='shared'?language('🤝 مشترک','🤝 Shared'):language('🔒 فقط من','🔒 Only me');x.checked=false}
    host.querySelector('[data-share-status]').textContent=language(boxes.length+' مورد تنظیم شد.',boxes.length+' items updated.');
   }catch(err){host.querySelector('[data-share-status]').textContent=err.message}
  }
 });
 await window.ElaraDialog.open({title:language('مدیریت اشتراک تسک‌ها و موارد','Shared or private items'),content:host,wide:true,actions:[{label:language('بستن','Close'),value:false}]});
}

function saveSeen(linkId,key=null){
 const s=read();s.accountLinkSeen=s.accountLinkSeen&&typeof s.accountLinkSeen==='object'&&!Array.isArray(s.accountLinkSeen)?s.accountLinkSeen:{};
 if(!Array.isArray(s.accountLinkSeen[linkId])){
  // At the moment of first acceptance, all existing items remain private.
  s.accountLinkSeen[linkId]=itemRows(s).map(x=>x.key).slice(-20000);
 }else if(key&&!s.accountLinkSeen[linkId].includes(key))s.accountLinkSeen[linkId]=[...s.accountLinkSeen[linkId],key].slice(-20000);
 else return;
 write(s);
}
function scheduleSync(){if(!accountReady||!activeUid)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>void syncNew(),900)}
async function syncNew(){
 if(syncing||!accountReady||!activeUid||ownUid()!==activeUid)return;
 if(!auth.currentUser?.emailVerified)return;
 const current=active();if(!current.length)return;
 syncing=true;
 try{
  for(const link of current){
   let s=read();
   if(!Array.isArray(s.accountLinkSeen?.[link.id])){saveSeen(link.id);continue}
   const seen=new Set(s.accountLinkSeen[link.id]),partner=other(link);
   for(const item of itemRows(s)){
    if(!active().some(x=>x.id===link.id)||ownUid()!==activeUid)break;
    if(seen.has(item.key)||itemMode(item.row,s)!=='shared')continue;
    try{
     // A queued item may have been switched to private since the scan.
     const freshState=read(),fresh=itemRows(freshState).find(x=>x.key===item.key);
     if(!fresh||itemMode(fresh.row,freshState)!=='shared')continue;
     const collaboration=await window.ElaraLoadCollab?.();
     if(!collaboration?.shareEntity)throw Error('Collaboration module not ready');
     // The recipient's accepted link is consent for automatically accepting this invitation.
     await collaboration.shareEntity(item.kind,fresh.row,partner);
     saveSeen(link.id,item.key);seen.add(item.key);
    }catch(error){
     console.warn('Account link delivery:',error.code||error.message);
     // Do not mark failed transfers as delivered; a later state change retries them.
     break;
    }
   }
  }
 }finally{syncing=false}
}
async function acceptLinkedInvites(rows){
 if(!accountReady||!activeUid||ownUid()!==activeUid)return;
 const allowed=new Map(active().map(link=>[other(link),link]));
 const pending=window.ElaraCollab?.pendingInvites?.()||rows;
 for(const row of (Array.isArray(pending)?pending:[])){
  const link=allowed.get(row.from);
  if(row.to!==activeUid||!link||row.status!=='pending'||accepting.has(row.id))continue;
  // Do not silently approve invitations created before the two-way link was accepted.
  if(typeof row.createdAt?.toMillis!=='function'||typeof link.updatedAt?.toMillis!=='function'||row.createdAt.toMillis()<link.updatedAt.toMillis())continue;
  if(!sets.some(([kind])=>kind===row.kind))continue;
  accepting.add(row.id);
  try{
   const api=await window.ElaraLoadCollab?.();
   if(!active().some(link=>other(link)===row.from))continue;
   await api.acceptInvite(row.id);
  }catch(error){console.warn('Automatic linked item receipt:',error.code||error.message)}
  finally{accepting.delete(row.id)}
 }
}
document.addEventListener('click',async event=>{
 const open=event.target.closest('[data-account-share-manager]');if(open){event.preventDefault();event.stopImmediatePropagation();void openManager().catch(error=>window.ElaraDialog?.alert?.(error.message||String(error)));return}
 const button=event.target.closest('[data-account-link-action]');if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(button.disabled)return;button.disabled=true;
 try{
  const action=button.dataset.accountLinkAction,uid=button.dataset.accountLinkUid,linkId=button.dataset.accountLinkId;
  if(action==='request')await request(uid);
  else if(action==='accept')await accept(linkId);
  else if(action==='decline')await decline(linkId);
  else if(action==='unlink')await disconnect(uid);
 }catch(error){await window.ElaraDialog?.alert?.(error.message||String(error),{title:language('اتصال حساب','Account link')})}
 finally{button.disabled=false}
},true);
window.addEventListener('elara:collab-inbox',event=>{lastInbox=window.ElaraCollab?.pendingInvites?.()||event.detail?.rows||[];void acceptLinkedInvites(lastInbox)});
window.addEventListener('elara:data-changed',scheduleSync);
window.addEventListener('elara:state-committed',scheduleSync);
window.addEventListener('elara:social-updated',announce);
window.addEventListener('elara:account-ready',()=>{accountReady=true;const user=auth.currentUser;if(user?.emailVerified)watch(user.uid);scheduleSync();void acceptLinkedInvites(lastInbox)});
window.addEventListener('elara:logout',()=>{accountReady=false;activeUid='';stop()});
onAuthStateChanged(auth,user=>{
 if(!user?.emailVerified){accountReady=false;activeUid='';stop();return}
 watch(user.uid);
 // The account-ready event runs only after cloud.js hydrates this UID.
 if(window.ElaraAccount?.loaded===true&&window.ElaraAccount?.user?.uid===user.uid)accountReady=true;
 scheduleSync();
});
window.ElaraAccountLink={status,requests,request,accept,decline,disconnect,openManager,setItemMode,setDefaultMode,defaultMode,activeWith:uid=>active().some(row=>other(row)===uid)};
