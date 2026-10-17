/* Explicit, revocable friendship-wide sharing of newly created supported items.
 * Both accounts retain their own Firebase Auth identity and private storage.
 * Item delivery reuses the existing invitation/membership security model. */
import {getApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,collection,doc,getDoc,setDoc,updateDoc,query,where,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const auth=getAuth(getApp()),db=getFirestore(getApp()),STORE='elara_space_v1';
const sets=[['task','tasks'],['habit','habits'],['goal','goals'],['language-class','languageClasses'],['leitner-word','words']];
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
function itemRows(s){return sets.flatMap(([kind,key])=>(Array.isArray(s[key])?s[key]:[]).filter(row=>row&&row.id!=null&&row.collabRole!=='member'&&!row.sourceManaged).map(row=>({kind,row,key:kind+'|'+String(row.id)})))}
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
    if(seen.has(item.key))continue;
    try{
     const collaboration=await window.ElaraLoadCollab?.();
     if(!collaboration?.shareEntity)throw Error('Collaboration module not ready');
     // The recipient's accepted link is consent for automatically accepting this invitation.
     await collaboration.shareEntity(item.kind,item.row,partner);
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
window.ElaraAccountLink={status,requests,request,accept,decline,disconnect,activeWith:uid=>active().some(row=>other(row)===uid)};
