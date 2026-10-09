/* Persistent collaboration for Tasks, Habits, Goals, Language Classes and Leitner words.
   Firestore owns consent/membership; local entities remain usable offline. */
import {getApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,updateDoc,collection,getDocs,query,where,onSnapshot,serverTimestamp,writeBatch} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const auth=getAuth(getApp()),db=getFirestore(getApp()),STORE='elara_space_v1';
const KINDS=new Set(['task','habit','goal','language-class','leitner-word']);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const id=()=>crypto.randomUUID?.()||('collab-'+Date.now().toString(36)+Math.random().toString(36).slice(2,10));
const me=()=>auth.currentUser?.uid||window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'';
const friends=()=>Array.isArray(window.ElaraSocial?.friends)?window.ElaraSocial.friends:[];
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Math.round(Number(n)||0)));
const kindLabel=kind=>kind==='task'?tx('تسک مشترک','Shared task'):kind==='habit'?tx('عادت مشترک','Shared habit'):kind==='goal'?tx('هدف مشترک','Shared goal'):kind==='language-class'?tx('کلاس مشترک','Shared class'):tx('واژهٔ مشترک لایتنر','Shared Leitner word');

function readLocal(){try{const s=JSON.parse(localStorage.getItem(STORE)||'{}')||{};for(const k of ['tasks','habits','goals','languageClasses','words'])if(!Array.isArray(s[k]))s[k]=[];return s}catch{return{tasks:[],habits:[],goals:[],languageClasses:[],words:[]}}}
function writeLocal(s){localStorage.setItem(STORE,JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}));window.dispatchEvent(new Event('elara:data-changed'));window.dispatchEvent(new Event('elara:collab-local-changed'))}
function cleanRule(r){if(!r||typeof r!=='object')return null;return{frequency:['daily','weekly','monthly'].includes(r.frequency)?r.frequency:'weekly',interval:clamp(r.interval||1,1,365),weekdays:Array.isArray(r.weekdays)?r.weekdays.map(Number).filter(x=>x>=0&&x<=6).slice(0,7):[],startDate:String(r.startDate||'').slice(0,10),endDate:r.endDate?String(r.endDate).slice(0,10):null,timezone:String(r.timezone||'').slice(0,80)}}
const cleanDates=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>String(x||'')).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))].slice(-366);
function cleanDailyProgress(value){const out={};if(!value||typeof value!=='object')return out;for(const [date,count] of Object.entries(value).slice(-366)){if(/^\d{4}-\d{2}-\d{2}$/.test(date))out[date]=clamp(count,0,24)}return out}
function payloadFor(kind,e={}){
 if(kind==='task')return{text:String(e.text||e.title||'').slice(0,180),shortDescription:String(e.shortDescription||'').slice(0,280),description:String(e.description||'').slice(0,1800),date:String(e.date||'').slice(0,10),time:String(e.time||'').slice(0,5),priority:String(e.priority||'4').slice(0,1),list:String(e.list||'').slice(0,80),folder:String(e.folder||'').slice(0,80),tag:String(e.tag||'').slice(0,80),dailyTarget:clamp(e.dailyTarget||1,1,24),recurrenceRule:cleanRule(e.recurrenceRule),sourceGroup:String(e.sourceGroup||'personal').slice(0,32),checklist:(Array.isArray(e.checklist)?e.checklist:[]).slice(0,30).map((x,i)=>({id:String(x.id||i).slice(0,100),text:String(x.text||x.title||'').slice(0,240),description:String(x.description||'').slice(0,600),done:false,order:i})).filter(x=>x.text)};
 if(kind==='habit')return{title:String(e.title||'').slice(0,120),dailyTarget:clamp(e.dailyTarget||1,1,24),recurrenceRule:cleanRule(e.recurrenceRule)};
 if(kind==='goal')return{title:String(e.title||'').slice(0,180),description:String(e.description||'').slice(0,1200),horizon:['short','medium','long'].includes(e.horizon)?e.horizon:'short',date:String(e.date||'').slice(0,10),time:String(e.time||'').slice(0,5),priority:['1','2','3','4'].includes(String(e.priority))?String(e.priority):'4',list:String(e.list||'').slice(0,60),folder:String(e.folder||'').slice(0,60),tag:String(e.tag||'').slice(0,60),dailyTarget:clamp(e.dailyTarget||1,1,24),dailyProgress:cleanDailyProgress(e.dailyProgress),recurrenceRule:cleanRule(e.recurrenceRule),skippedDates:cleanDates(e.skippedDates),steps:(Array.isArray(e.steps)?e.steps:[]).slice(0,120).map((s,i)=>({id:String(s.id||i).slice(0,100),text:String(s.text||s.title||'').slice(0,180),done:!!s.done,date:String(s.date||'').slice(0,10),time:String(s.time||'').slice(0,5),priority:['1','2','3','4'].includes(String(s.priority))?String(s.priority):'4',list:String(s.list||'').slice(0,60),folder:String(s.folder||'').slice(0,60),tag:String(s.tag||'').slice(0,60),dailyTarget:clamp(s.dailyTarget||1,1,24),dailyProgress:cleanDailyProgress(s.dailyProgress),recurrenceRule:cleanRule(s.recurrenceRule),occurrenceDone:cleanDates(s.occurrenceDone),skippedDates:cleanDates(s.skippedDates)})).filter(s=>s.text)};
 if(kind==='language-class')return{title:String(e.title||'').slice(0,120),type:['offline','online','linked'].includes(e.type)?e.type:'offline',terms:clamp(e.terms||1,1,40),sessionsPerTerm:clamp(e.sessionsPerTerm||1,1,100),durationMin:clamp(e.durationMin||60,10,480),weekdays:(Array.isArray(e.weekdays)?e.weekdays:[]).map(Number).filter(x=>x>=0&&x<=6).slice(0,7),studyTime:String(e.studyTime||'').slice(0,5),studyHoursPerDay:Math.max(.25,Math.min(16,Number(e.studyHoursPerDay)||1)),linkUrl:String(e.linkUrl||'').slice(0,1000)};
 return{front:String(e.front||'').slice(0,120),back:String(e.back||'').slice(0,240)}
}
function entityTitle(kind,e){return String(kind==='task'?(e.text||e.title):kind==='habit'?e.title:kind==='goal'?e.title:kind==='language-class'?e.title:e.front||'').trim().slice(0,120)||kindLabel(kind)}
function localArray(s,kind){return kind==='task'?s.tasks:kind==='habit'?s.habits:kind==='goal'?s.goals:kind==='language-class'?s.languageClasses:s.words}
function findLocal(kind,entityId){const s=readLocal();return localArray(s,kind).find(x=>String(x.id)===String(entityId))||null}
function progressFor(kind,e={}){
 const day=today();
 if(kind==='task'){const total=clamp(e.dailyTarget||1,1,24),explicit=Number(e.dailyProgress?.[day]);let completed=Number.isFinite(explicit)?clamp(explicit,0,total):0;if(!completed){if(e.recurrenceRule&&Array.isArray(e.occurrenceDone)&&e.occurrenceDone.includes(day))completed=total;else if(!e.recurrenceRule&&e.completed)completed=total}return{completed,total,percent:Math.round(completed/total*100)}}
 if(kind==='habit'){const total=clamp(e.dailyTarget||1,1,24),explicit=Number(e.dailyProgress?.[day]);let completed=Number.isFinite(explicit)?clamp(explicit,0,total):0;if(!completed&&Array.isArray(e.days)&&e.days.includes(day))completed=total;return{completed,total,percent:Math.round(completed/total*100)}}
 if(kind==='goal'){const steps=Array.isArray(e.steps)?e.steps:[],total=Math.max(1,steps.length),completed=steps.filter(step=>{if(step?.recurrenceRule)return Array.isArray(step.occurrenceDone)&&step.occurrenceDone.includes(day);if(clamp(step?.dailyTarget||1,1,24)>1)return Number(step?.dailyProgress?.[day]||0)>=clamp(step.dailyTarget,1,24);return !!step?.done}).length;return{completed,total,percent:Math.round(completed/total*100)}}
 if(kind==='language-class'){const total=Math.max(1,clamp(e.terms||1,1,40)*clamp(e.sessionsPerTerm||1,1,100)),completed=Math.min(total,Array.isArray(e.sessionLogs)?e.sessionLogs.length:clamp(e.completedSessions||0,0,total));return{completed,total,percent:Math.round(completed/total*100)}}
 const total=5,completed=clamp(e.box||1,1,5);return{completed,total,percent:Math.round(completed/total*100)}
}
function markLocal(kind,entityId,spaceId,role='owner',ownerUid=me()){
 const s=readLocal(),row=localArray(s,kind).find(x=>String(x.id)===String(entityId));if(!row)return null;
 row.collabSpaceId=String(spaceId);row.collabRole=role;row.collabOwnerUid=String(ownerUid||'');row.shared=true;writeLocal(s);return row
}
function materialize(space){
 const kind=space.kind;if(!KINDS.has(kind))throw Error(tx('نوع مورد مشترک پشتیبانی نمی‌شود.','Unsupported shared item.'));
 let payload={};try{payload=JSON.parse(space.payloadJson||'{}')||{}}catch{throw Error(tx('دادهٔ مورد مشترک خراب است.','Shared item payload is invalid.'))}
 const s=readLocal(),arr=localArray(s,kind),found=arr.find(x=>x.collabSpaceId===space.id);if(found)return found.id;
 const localId='shared-'+String(space.id).slice(0,72)+'-'+Math.random().toString(36).slice(2,6),common={id:localId,collabSpaceId:space.id,collabRole:'member',collabOwnerUid:space.ownerUid,shared:true};
 let row;
 if(kind==='task')row={...common,text:String(payload.text||space.title||'تسک مشترک'),shortDescription:payload.shortDescription||'',description:payload.description||'',date:payload.date||'',time:payload.time||'',priority:payload.priority||'4',list:payload.list||'',folder:payload.folder||'',tag:payload.tag||'',dailyTarget:clamp(payload.dailyTarget||1,1,24),dailyProgress:{},recurrenceRule:cleanRule(payload.recurrenceRule),sourceGroup:payload.sourceGroup||'personal',checklist:Array.isArray(payload.checklist)?payload.checklist:[],completed:false,doneAt:null,xpAwarded:false,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{},createdAt:Date.now()};
 else if(kind==='habit')row={...common,title:String(payload.title||space.title||'عادت مشترک'),dailyTarget:clamp(payload.dailyTarget||1,1,24),dailyProgress:{},recurrenceRule:cleanRule(payload.recurrenceRule),days:[],rewardDays:[],skippedDates:[],occurrenceOverrides:{}};
 else if(kind==='goal')row={...common,title:String(payload.title||space.title||'هدف مشترک'),description:String(payload.description||''),horizon:['short','medium','long'].includes(payload.horizon)?payload.horizon:'short',date:String(payload.date||''),time:String(payload.time||''),priority:['1','2','3','4'].includes(String(payload.priority))?String(payload.priority):'4',list:String(payload.list||''),folder:String(payload.folder||''),tag:String(payload.tag||''),dailyTarget:clamp(payload.dailyTarget||1,1,24),dailyProgress:cleanDailyProgress(payload.dailyProgress),recurrenceRule:cleanRule(payload.recurrenceRule),skippedDates:cleanDates(payload.skippedDates),steps:(Array.isArray(payload.steps)?payload.steps:[]).map((step,index)=>({id:String(step.id||('shared-step-'+index)),text:String(step.text||''),done:!!step.done,date:String(step.date||''),time:String(step.time||''),priority:['1','2','3','4'].includes(String(step.priority))?String(step.priority):'4',list:String(step.list||''),folder:String(step.folder||''),tag:String(step.tag||''),dailyTarget:clamp(step.dailyTarget||1,1,24),dailyProgress:cleanDailyProgress(step.dailyProgress),recurrenceRule:cleanRule(step.recurrenceRule),occurrenceDone:cleanDates(step.occurrenceDone),skippedDates:cleanDates(step.skippedDates)})).filter(step=>step.text)};
 else if(kind==='language-class')row={...common,title:String(payload.title||space.title||'کلاس مشترک'),type:['offline','online','linked'].includes(payload.type)?payload.type:'offline',terms:clamp(payload.terms||1,1,40),sessionsPerTerm:clamp(payload.sessionsPerTerm||1,1,100),durationMin:clamp(payload.durationMin||60,10,480),weekdays:Array.isArray(payload.weekdays)?payload.weekdays:[],studyTime:String(payload.studyTime||''),studyHoursPerDay:Math.max(.25,Math.min(16,Number(payload.studyHoursPerDay)||1)),linkUrl:String(payload.linkUrl||''),createdAt:Date.now(),updatedAt:Date.now(),sessionLogs:[]};
 else row={...common,front:String(payload.front||space.title||'واژه'),back:String(payload.back||''),box:1,due:today()};
 arr.unshift(row);writeLocal(s);window.ElaraLinkedTasks?.syncAll?.();window.ElaraLanguageClasses?.render?.();window.ElaraTasks?.render?.();return row.id
}
function requireUser(){const uid=me();if(!uid||!auth.currentUser?.emailVerified)throw Error(tx('برای اشتراک، حساب تأییدشده لازم است.','A verified account is required for sharing.'));return uid}
async function createSpace(kind,entity){
 if(!KINDS.has(kind))throw Error(tx('این نوع هنوز قابل اشتراک نیست.','This type is not shareable yet.'));
 const uid=requireUser(),existing=entity?.collabSpaceId;if(existing)return String(existing);
 const payload=payloadFor(kind,entity),payloadJson=JSON.stringify(payload);if(payloadJson.length>12000)throw Error(tx('محتوای این مورد برای اشتراک خیلی بزرگ است.','This item is too large to share.'));
 const ref=doc(collection(db,'collabSpaces')),title=entityTitle(kind,entity),progress=progressFor(kind,entity);
 await setDoc(ref,{ownerUid:uid,kind,title,payloadJson,visibility:'private',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 await setDoc(doc(ref,'members',uid),{uid,role:'owner',localEntityId:String(entity.id||''),progressCompleted:progress.completed,progressTotal:progress.total,progressPercent:progress.percent,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()});
 markLocal(kind,entity.id,ref.id,'owner',uid);return ref.id
}
async function pickFriend(title=tx('انتخاب دوست','Choose a friend')){
 const rows=friends();if(!rows.length){await window.ElaraDialog?.alert?.(tx('اول باید حداقل یک دوست تأییدشده داشته باشی.','You need at least one accepted friend first.'),{title});return null}
 const box=document.createElement('div');box.className='collab-friend-picker';box.innerHTML=rows.map((p,i)=>'<label><input type="radio" name="friend" value="'+esc(p.uid)+'" '+(i===0?'checked':'')+'><span><strong data-elara-ugc dir="auto">'+esc(p.name||p.username||tx('دوست','Friend'))+'</strong><small>'+esc(p.username?'@'+p.username:'')+'</small></span></label>').join('');
 const ok=await window.ElaraDialog.open({title,content:box,actions:[{label:tx('انصراف','Cancel'),value:false},{label:tx('ادامه','Continue'),value:true,kind:'primary'}]});if(ok!==true)return null;return box.querySelector('[name=friend]:checked')?.value||null
}
// Trusted relationship is independent from short-lived share links and
// invitation approval. It ONLY routes individual items explicitly shared.
const pairId=(a,b)=>[String(a),String(b)].sort().join('__');
async function activeTrustedLink(peerUid){
 const uid=requireUser(),peer=String(peerUid||'');if(!peer||peer===uid)return null;
 try{
  const snap=await getDoc(doc(db,'accountLinks',pairId(uid,peer)));
  return snap.exists()&&snap.data().status==='active'?{id:snap.id,...snap.data()}:null;
 }catch(error){if(error?.code==='permission-denied')return null;throw error}
}
async function listTrustedAccounts(){
 const uid=requireUser(),snap=await getDocs(query(collection(db,'accountLinks'),where('participants','array-contains',uid)));
 return snap.docs.map(x=>({id:x.id,...x.data()})).filter(x=>x.uidA===uid||x.uidB===uid);
}
async function requestTrustedAccount(peerUid){
 const uid=requireUser(),peer=String(peerUid||'');if(!peer||peer===uid)throw Error(tx('حساب دوم معتبر نیست.','Invalid linked account.'));
 if(!friends().some(x=>x.uid===peer))throw Error(tx('ابتدا باید دو حساب دوست تأییدشده باشند.','The two accounts must first be accepted friends.'));
 const ref=doc(db,'accountLinks',pairId(uid,peer)),snapshot=await getDoc(ref);
 if(snapshot.exists()){
  const link=snapshot.data();
  if(link.status==='active'||link.status==='pending')return snapshot.id;
  await updateDoc(ref,{status:'pending',requestedBy:uid,updatedAt:serverTimestamp()});
  return snapshot.id;
 }
 const [uidA,uidB]=[uid,peer].sort();
 await setDoc(ref,{uidA,uidB,participants:[uidA,uidB],requestedBy:uid,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 return ref.id;
}
async function acceptTrustedAccount(linkId){
 const uid=requireUser(),ref=doc(db,'accountLinks',String(linkId)),snap=await getDoc(ref);
 if(!snap.exists()||snap.data().status!=='pending'||snap.data().requestedBy===uid||![snap.data().uidA,snap.data().uidB].includes(uid))throw Error(tx('درخواست پیوند معتبر نیست.','No valid trust request.'));
 await updateDoc(ref,{status:'active',updatedAt:serverTimestamp()});
 return true;
}
async function disconnectTrustedAccount(linkId){
 const uid=requireUser(),ref=doc(db,'accountLinks',String(linkId)),snap=await getDoc(ref);
 if(!snap.exists()||![snap.data().uidA,snap.data().uidB].includes(uid))throw Error(tx('این پیوند متعلق به حساب تو نیست.','This link is not yours.'));
 if(snap.data().status!=='revoked')await updateDoc(ref,{status:'revoked',updatedAt:serverTimestamp()});
 return true;
}
async function openTrustedAccounts(){
 await window.ElaraLoadSocial?.().catch(()=>{});
 const uid=requireUser(),links=await listTrustedAccounts(),list=friends(),holder=document.createElement('section');
 holder.className='collab-trusted-accounts';holder.dir='rtl';
 const peerName=peer=>esc(list.find(x=>x.uid===peer)?.name||list.find(x=>x.uid===peer)?.username||peer.slice(0,10));
 holder.innerHTML='<p>'+tx('با تأیید یک‌بارهٔ دو حساب، فقط مواردی که صریحاً با هم به اشتراک می‌گذارید خودکار منتقل می‌شوند.','One-time mutual consent; only explicitly shared items are delivered automatically.')+'</p>'
 +'<label>'+tx('درخواست پیوند به دوست','Link to friend')+'<select data-trusted-peer><option value="">'+tx('انتخاب دوست','Choose friend')+'</option>'+list.map(p=>'<option value="'+esc(p.uid)+'">'+esc(p.name||p.username||p.uid.slice(0,10))+'</option>').join('')+'</select></label>'
 +'<button type="button" class="primary-button" data-trusted-request>'+tx('ارسال درخواست یک‌باره','Send one-time request')+'</button>'
 +'<div>'+links.map(l=>{const peer=l.uidA===uid?l.uidB:l.uidA,recipient=l.requestedBy!==uid,action=l.status==='pending'&&recipient?'<button type="button" data-trusted-accept="'+esc(l.id)+'">'+tx('تأیید پیوند','Accept link')+'</button>':l.status!=='revoked'?'<button type="button" data-trusted-disconnect="'+esc(l.id)+'">'+tx('قطع ارتباط','Disconnect')+'</button>':'';
 return '<article><strong>'+peerName(peer)+'</strong><small>'+esc(l.status==='active'?tx('پیوند فعال','Trusted'):l.status==='pending'?tx('منتظر رضایت متقابل','Awaiting consent'):tx('قطع‌شده','Disconnected'))+'</small>'+action+'</article>'}).join('')+'</div>';
 holder.addEventListener('click',async e=>{
  const btn=e.target.closest('button');if(!btn)return;
  btn.disabled=true;
  try{
   if(btn.hasAttribute('data-trusted-request'))await requestTrustedAccount(holder.querySelector('[data-trusted-peer]')?.value);
   else if(btn.dataset.trustedAccept)await acceptTrustedAccount(btn.dataset.trustedAccept);
   else if(btn.dataset.trustedDisconnect)await disconnectTrustedAccount(btn.dataset.trustedDisconnect);
   window.ElaraNotify?.push?.({type:'social',title:tx('وضعیت پیوند به‌روزرسانی شد','Account link updated'),message:tx('برای دیدن وضعیت تازه دوباره پنجره را باز کنید.','Reopen to see the latest state.')});
  }catch(err){await window.ElaraDialog.alert(err.message||String(err))}
  finally{btn.disabled=false}
 });
 await window.ElaraDialog.open({title:tx('حساب‌های مورداعتماد','Trusted accounts'),content:holder,wide:true,actions:[{label:tx('بستن','Close'),value:false}]});
 return links;
}
async function deliverToTrustedAccount(spaceId,kind,peerUid,link){
 const uid=requireUser(),ref=doc(db,'trustedDeliveries',String(spaceId)+'__'+String(peerUid)),snapshot=await getDoc(ref);
 if(snapshot.exists()){
  if(snapshot.data().linkId!==link.id)await updateDoc(ref,{linkId:link.id,updatedAt:serverTimestamp()});
  return ref.id;
 }
 await setDoc(ref,{spaceId:String(spaceId),from:uid,to:String(peerUid),kind,linkId:link.id,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 return ref.id;
}
let trustedDeliveryUnsub=null,trustedDeliveryUid='',trustedInFlight=new Set();
function stopTrustedDeliveryFeed(){
 trustedDeliveryUnsub?.();trustedDeliveryUnsub=null;trustedDeliveryUid='';trustedInFlight.clear()
}
async function materializeTrustedDelivery(entry,uid){
 if(auth.currentUser?.uid!==uid||!auth.currentUser?.emailVerified)return;
 const key=String(entry.id);if(trustedInFlight.has(key))return;trustedInFlight.add(key);
 try{
  const data=entry.data();if(data.to!==uid)return;
  const member=doc(db,'collabSpaces',data.spaceId,'members',uid);
  const existsMember=await getDoc(member);
  if(!existsMember.exists()){
   const snapshot=await getDoc(doc(db,'accountLinks',data.linkId));
   if(!snapshot.exists()||snapshot.data().status!=='active')return;
   await setDoc(member,{uid,role:'member',trustedLinkId:data.linkId,localEntityId:'',progressCompleted:0,progressTotal:1,progressPercent:0,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()});
  }
  const snap=await getDoc(doc(db,'collabSpaces',data.spaceId));
  if(!snap.exists()||snap.data().kind!==data.kind)return;
  const space={id:snap.id,...snap.data()},localId=materialize(space);
  const progress=progressFor(space.kind,findLocal(space.kind,localId)||{});
  await updateDoc(member,{localEntityId:String(localId),progressCompleted:progress.completed,progressTotal:progress.total,progressPercent:progress.percent,updatedAt:serverTimestamp()});
  window.dispatchEvent(new Event('elara:collab-updated'));
 }catch(error){if(!['permission-denied','unavailable','not-found'].includes(error?.code))console.warn('Elara trusted delivery:',error)}
 finally{trustedInFlight.delete(key)}
}
function startTrustedDeliveryFeed(uid=me()){
 if(!uid||!auth.currentUser?.emailVerified)return;
 if(trustedDeliveryUid===uid&&trustedDeliveryUnsub)return;
 stopTrustedDeliveryFeed();trustedDeliveryUid=uid;
 trustedDeliveryUnsub=onSnapshot(query(collection(db,'trustedDeliveries'),where('to','==',uid)),snapshot=>{
  if(auth.currentUser?.uid!==uid)return;
  for(const entry of snapshot.docs)void materializeTrustedDelivery(entry,uid);
 },error=>{if(trustedDeliveryUid===uid)console.warn('Elara trusted delivery feed:',error?.code||error?.message)});
}

async function invite(spaceId,friendUid){
 const uid=requireUser(),friend=String(friendUid||'');if(!friend||friend===uid)throw Error(tx('دوست معتبر انتخاب نشده.','Choose a valid friend.'));
 const spaceSnap=await getDoc(doc(db,'collabSpaces',String(spaceId)));if(!spaceSnap.exists())throw Error(tx('فضای مشترک پیدا نشد.','Shared space not found.'));const space={id:spaceSnap.id,...spaceSnap.data()};
 const inviteId=space.id+'__'+friend,inviteRef=doc(db,'collabInvites',inviteId),payload={spaceId:space.id,from:uid,to:friend,kind:space.kind,title:String(space.title||kindLabel(space.kind)).slice(0,120),status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 try{
  // First-time collab invites must not pre-read a missing participant-scoped document.
  // Firestore cannot authorize resource.data on a document that does not exist yet.
  await setDoc(inviteRef,payload);
 }catch(error){
  if(error?.code!=='permission-denied')throw error;
  let existing=null;
  try{const snap=await getDoc(inviteRef);if(snap.exists())existing=snap.data()}catch{}
  if(!existing)throw error;
  if(existing.status==='accepted'){window.ElaraNotify?.push?.({type:'social',title:tx('قبلاً عضو شده','Already joined'),message:space.title||kindLabel(space.kind),dedupeKey:'collab-already:'+inviteId});return inviteId}
  if(existing.status==='pending')return inviteId;
  if(existing.status==='declined')await updateDoc(inviteRef,{status:'pending',updatedAt:serverTimestamp()});else throw error
 }
 window.ElaraNotify?.push?.({type:'social',title:tx('دعوت مشترک ارسال شد','Shared invite sent'),message:space.title||kindLabel(space.kind),dedupeKey:'collab-out:'+inviteId+':'+Date.now()});return inviteId
}
async function shareEntity(kind,entity,friendUid=null){
 const spaceId=await createSpace(kind,entity),target=friendUid||await pickFriend(kind==='language-class'?tx('انتخاب همکلاسی','Choose classmate'):tx('این مورد با کدام دوست مشترک باشد؟','Share with which friend?'));if(!target)return spaceId;
 const trusted=await activeTrustedLink(target);
 if(trusted){await deliverToTrustedAccount(spaceId,kind,target,trusted);return spaceId}
 await invite(spaceId,target);return spaceId
}
async function acceptInvite(inviteId){
 const uid=requireUser(),ref=doc(db,'collabInvites',String(inviteId)),snap=await getDoc(ref);if(!snap.exists())throw Error(tx('دعوت پیدا نشد.','Invite not found.'));const d=snap.data();if(d.to!==uid)throw Error(tx('این دعوت برای حساب دیگری است.','This invite belongs to another account.'));
 const memberRef=doc(db,'collabSpaces',d.spaceId,'members',uid);
 if(d.status==='declined')throw Error(tx('این دعوت رد شده و باید فرستنده دوباره آن را ارسال کند.','This invite was declined; the sender must retry it.'));
 if(d.status==='pending'){
  const memberBefore=await getDoc(memberRef);
  if(!memberBefore.exists()){
   const batch=writeBatch(db);batch.update(ref,{status:'accepted',updatedAt:serverTimestamp()});batch.set(memberRef,{uid,role:'member',localEntityId:'',progressCompleted:0,progressTotal:1,progressPercent:0,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()});await batch.commit()
  }else await updateDoc(ref,{status:'accepted',updatedAt:serverTimestamp()})
 }else if(d.status!=='accepted')throw Error(tx('وضعیت این دعوت معتبر نیست.','This invite state is invalid.'));
 const spaceSnap=await getDoc(doc(db,'collabSpaces',d.spaceId));if(!spaceSnap.exists())throw Error(tx('فضای مشترک حذف شده است.','The shared space was removed.'));const space={id:spaceSnap.id,...spaceSnap.data()},existing=localArray(readLocal(),space.kind).find(x=>x.collabSpaceId===space.id),localEntityId=existing?.id||materialize(space),entity=findLocal(space.kind,localEntityId),progress=progressFor(space.kind,entity||{});
 const memberAfter=await getDoc(memberRef);if(!memberAfter.exists())throw Error(tx('عضویت مشترک ثبت نشده است.','Collaboration membership was not created.'));
 await updateDoc(memberRef,{localEntityId:String(localEntityId),progressCompleted:progress.completed,progressTotal:progress.total,progressPercent:progress.percent,updatedAt:serverTimestamp()});
 inbox=inbox.filter(x=>x.id!==String(inviteId));window.ElaraNotify?.resolveByMeta?.('collab-invite',inviteId);window.dispatchEvent(new CustomEvent('elara:collab-inbox',{detail:{count:inbox.length}}));window.dispatchEvent(new Event('elara:collab-updated'));window.ElaraSocialView?.render?.();return localEntityId
}
async function declineInvite(inviteId){
 const uid=requireUser(),ref=doc(db,'collabInvites',String(inviteId)),snap=await getDoc(ref);if(!snap.exists())return false;const d=snap.data();if(d.to!==uid)return false;if(d.status==='declined')return true;if(d.status==='accepted')return false;if(d.status!=='pending')return false;await updateDoc(ref,{status:'declined',updatedAt:serverTimestamp()});inbox=inbox.filter(x=>x.id!==String(inviteId));window.ElaraNotify?.resolveByMeta?.('collab-invite',inviteId);window.dispatchEvent(new CustomEvent('elara:collab-inbox',{detail:{count:inbox.length}}));window.dispatchEvent(new Event('elara:collab-updated'));window.ElaraSocialView?.render?.();return true
}
function randomToken(){return (crypto.randomUUID?.()||id()).replace(/-/g,'')+Math.random().toString(36).slice(2,10)}
async function createShareLink(spaceId){
 const uid=requireUser(),spaceSnap=await getDoc(doc(db,'collabSpaces',String(spaceId)));if(!spaceSnap.exists()||spaceSnap.data().ownerUid!==uid)throw Error(tx('فقط سازنده می‌تواند لینک عضویت بسازد.','Only the owner can create a join link.'));
 const token=randomToken().slice(0,72),space=spaceSnap.data();await setDoc(doc(db,'collabLinks',token),{spaceId:String(spaceId),ownerUid:uid,kind:space.kind,title:String(space.title||'').slice(0,120),active:true,createdAt:serverTimestamp()});
 const url=new URL(location.href);url.searchParams.set('elaraJoin',token);url.hash=space.kind==='language-class'?'#language-courses':'#home';return url.toString()
}
function copiedBubble(anchor){
 const bubble=document.createElement('div');bubble.textContent=tx('کپی شد ✓','Copied ✓');bubble.setAttribute('role','status');Object.assign(bubble.style,{position:'fixed',zIndex:'2147483647',pointerEvents:'none',padding:'7px 11px',borderRadius:'10px',background:'rgba(20,20,24,.92)',color:'#fff',font:'600 12px/1.2 system-ui,sans-serif',boxShadow:'0 6px 22px rgba(0,0,0,.22)',opacity:'0',transform:'translateY(4px)',transition:'opacity .14s ease,transform .14s ease'});const x=Number(anchor?.clientX),y=Number(anchor?.clientY);bubble.style.left=Math.min(innerWidth-90,Math.max(8,Number.isFinite(x)&&x>0?x+12:innerWidth/2-40))+'px';bubble.style.top=Math.min(innerHeight-40,Math.max(8,Number.isFinite(y)&&y>0?y+14:innerHeight/2))+'px';document.body.append(bubble);requestAnimationFrame(()=>{bubble.style.opacity='1';bubble.style.transform='translateY(0)'});setTimeout(()=>{bubble.style.opacity='0';bubble.style.transform='translateY(-3px)';setTimeout(()=>bubble.remove(),180)},1100)
}
async function copyShareLink(spaceId,anchor=null){
 copiedBubble(anchor);const url=await createShareLink(spaceId);try{await navigator.clipboard.writeText(url);window.ElaraNotify?.push?.({type:'social',title:tx('لینک کپی شد','Link copied'),message:tx('هرکس لینک را باز کند می‌تواند عضو شود.','Anyone opening the link can join.'),dedupeKey:'collab-link:'+spaceId+':'+Date.now()})}catch{const box=document.createElement('div');box.className='collab-link-box';box.innerHTML='<input readonly dir="ltr" value="'+esc(url)+'">';await window.ElaraDialog.open({title:tx('لینک اشتراک','Share link'),content:box,actions:[{label:tx('بستن','Close'),value:false}]})}return url
}
async function joinLink(token){
 const uid=requireUser(),linkSnap=await getDoc(doc(db,'collabLinks',String(token)));if(!linkSnap.exists()||linkSnap.data().active!==true)throw Error(tx('این لینک معتبر نیست یا غیرفعال شده.','This join link is invalid or inactive.'));const link=linkSnap.data(),memberRef=doc(db,'collabSpaces',link.spaceId,'members',uid),existing=await getDoc(memberRef);
 if(!existing.exists())await setDoc(memberRef,{uid,role:'member',joinToken:String(token),localEntityId:'',progressCompleted:0,progressTotal:1,progressPercent:0,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()});
 const spaceSnap=await getDoc(doc(db,'collabSpaces',link.spaceId));if(!spaceSnap.exists())throw Error(tx('فضای مشترک پیدا نشد.','Shared space not found.'));const space={id:spaceSnap.id,...spaceSnap.data()},localEntityId=materialize(space),entity=findLocal(space.kind,localEntityId),progress=progressFor(space.kind,entity||{});
 await updateDoc(memberRef,{localEntityId:String(localEntityId),progressCompleted:progress.completed,progressTotal:progress.total,progressPercent:progress.percent,updatedAt:serverTimestamp()});return localEntityId
}
async function memberRows(spaceId){
 const uid=requireUser(),snaps=await getDocs(collection(db,'collabSpaces',String(spaceId),'members')),rows=[];
 for(const item of snaps.docs){const d=item.data(),memberUid=item.id;let person=memberUid===uid?window.ElaraSocial?.me:friends().find(x=>x.uid===memberUid);if(!person){try{const p=await getDoc(doc(db,'profiles',memberUid));if(p.exists())person={uid:memberUid,...p.data()}}catch{}}
  rows.push({uid:memberUid,role:d.role||'member',name:person?.name||person?.username||tx('همکلاسی','Classmate'),username:person?.username||'',percent:clamp(d.progressPercent||0,0,100),completed:Math.max(0,Number(d.progressCompleted)||0),total:Math.max(1,Number(d.progressTotal)||1)})
 }return rows.sort((a,b)=>b.percent-a.percent)
}
async function openSpace(spaceId){
 const spaceSnap=await getDoc(doc(db,'collabSpaces',String(spaceId)));if(!spaceSnap.exists())throw Error(tx('فضای مشترک پیدا نشد.','Shared space not found.'));const space={id:spaceSnap.id,...spaceSnap.data()},rows=await memberRows(space.id),owner=space.ownerUid===me();
 const box=document.createElement('section');box.className='collab-space-dialog';box.innerHTML='<header><small>'+esc(kindLabel(space.kind))+'</small><h3 data-elara-ugc dir="auto">'+esc(space.title||kindLabel(space.kind))+'</h3><p>'+tx('این همکاری تاریخ انقضا ندارد و تا وقتی اعضا بخواهند فعال می‌ماند.','This collaboration has no timer and stays active until members leave.')+'</p></header><div class="collab-member-list">'+rows.map(r=>'<article><div><strong data-elara-ugc dir="auto">'+esc(r.name)+'</strong><small>'+esc(r.username?'@'+r.username:(r.role==='owner'?tx('سازنده','Owner'):tx('عضو','Member')))+'</small></div><div class="collab-progress"><span><i style="width:'+r.percent+'%"></i></span><b>'+r.percent.toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+'٪</b></div></article>').join('')+'</div>'+(owner?'<footer><button type="button" class="quiet-button" data-collab-invite-more>'+tx('دعوت دوست','Invite friend')+'</button><button type="button" class="primary-button" data-collab-copy-link>'+tx('کپی لینک عضویت','Copy join link')+'</button></footer>':'');
 box.addEventListener('click',async e=>{if(e.target.closest('[data-collab-invite-more]')){const friend=await pickFriend(tx('دعوت دوست','Invite friend'));if(friend)await invite(space.id,friend)}if(e.target.closest('[data-collab-copy-link]'))await copyShareLink(space.id,e)});
 await window.ElaraDialog.open({title:tx('فضای مشترک','Shared space'),content:box,wide:true,actions:[{label:tx('بستن','Close'),value:false}]});return rows
}
let inbox=[],inviteRealtimeUid='',inviteRealtimeUnsub=null,inviteSeen=new Set(),inviteRealtimeChain=Promise.resolve();
async function enrichInvites(rows){
 const result=[];
 for(const row of rows){
  let sender=friends().find(x=>x.uid===row.from)||null;
  if(!sender&&row.from)try{const p=await getDoc(doc(db,'profiles',String(row.from)));if(p.exists())sender={uid:row.from,...p.data()}}catch(error){console.warn('Collab sender profile unavailable:',row.from,error.code||error.message)}
  result.push({...row,sender:sender||{uid:row.from,name:tx('دوست','Friend'),username:''}})
 }
 return result
}
async function applyInboxRows(rows,sourceUid=me()){
 if(!sourceUid||sourceUid!==me()||auth.currentUser?.uid!==sourceUid)return[];
 const pending=(await enrichInvites(rows.filter(x=>x.status==='pending'))).sort((a,b)=>String(b.id).localeCompare(String(a.id)));
 inbox=pending;const pendingIds=new Set(pending.map(row=>row.id));for(const seen of [...inviteSeen])if(!pendingIds.has(seen))inviteSeen.delete(seen);
 for(const row of pending){
  if(inviteSeen.has(row.id))continue;inviteSeen.add(row.id);if(window.ElaraSocial?.isMuted?.(row.from))continue;
  const who=String(row.sender?.name||row.sender?.username||tx('دوست','Friend')),username=row.sender?.username?' · @'+row.sender.username:'';
  window.ElaraNotify?.push?.({type:'social',title:tx('درخواست مشترک جدید','New shared request'),message:who+username+' · '+kindLabel(row.kind)+' · '+String(row.title||kindLabel(row.kind)),dedupeKey:'collab-in:'+row.id,reopen:true,meta:{kind:'collab-invite',inviteId:row.id,collabKind:row.kind,from:row.from,to:row.to}})
 }
 window.dispatchEvent(new CustomEvent('elara:collab-inbox',{detail:{count:pending.length,rows:pending.map(x=>({id:x.id,kind:x.kind,title:x.title,from:x.from,to:x.to,status:x.status}))}}));
 window.dispatchEvent(new Event('elara:collab-updated'));window.ElaraSocialView?.render?.();return pending
}
function queueInviteRows(rows,sourceUid){
 const run=()=>applyInboxRows(rows,sourceUid),pending=inviteRealtimeChain.then(run,run);inviteRealtimeChain=pending.catch(()=>{});return pending
}
function stopInviteRealtime(){try{inviteRealtimeUnsub?.()}catch{}inviteRealtimeUnsub=null;inviteRealtimeUid='';inviteSeen=new Set();inbox=[];window.dispatchEvent(new Event('elara:collab-updated'))}
function startInviteRealtime(sourceUid=me()){
 if(!sourceUid||!auth.currentUser?.emailVerified)return;
 if(inviteRealtimeUid===sourceUid&&inviteRealtimeUnsub)return;
 stopInviteRealtime();inviteRealtimeUid=sourceUid;
 inviteRealtimeUnsub=onSnapshot(query(collection(db,'collabInvites'),where('to','==',sourceUid)),snap=>{
  if(inviteRealtimeUid!==sourceUid||auth.currentUser?.uid!==sourceUid)return;
  void queueInviteRows(snap.docs.map(x=>({id:x.id,...x.data()})),sourceUid)
 },error=>{if(inviteRealtimeUid===sourceUid)console.error('Elara collab invite realtime:',error)});
}
async function refreshInvites(){
 const uid=me();if(!uid||!auth.currentUser?.emailVerified){inbox=[];window.dispatchEvent(new Event('elara:collab-updated'));return[]}
 try{const snaps=await getDocs(query(collection(db,'collabInvites'),where('to','==',uid)));return await applyInboxRows(snaps.docs.map(x=>({id:x.id,...x.data()})),uid)}catch(error){console.warn('Elara collab inbox unavailable:',error.code||error.message);return[]}
}
async function openInbox(){
 await refreshInvites();const box=document.createElement('section');box.className='collab-inbox-dialog';box.innerHTML='<button type="button" class="primary-button" data-collab-trusted-launcher>'+tx('اتصال حساب‌های مورداعتماد','Trusted account links')+'</button>'+(inbox.length?inbox.map(row=>'<article data-collab-invite-row="'+esc(row.id)+'"><div><small>'+esc(kindLabel(row.kind))+'</small><strong data-elara-ugc dir="auto">'+esc(row.title||kindLabel(row.kind))+'</strong><span data-elara-ugc dir="auto">'+esc(row.sender?.name||row.sender?.username||tx('دوست','Friend'))+(row.sender?.username?' · @'+esc(row.sender.username):'')+'</span></div><footer><button type="button" class="quiet-button danger" data-collab-decline="'+esc(row.id)+'">'+tx('رد','Decline')+'</button><button type="button" class="primary-button" data-collab-accept="'+esc(row.id)+'">'+tx('قبول','Accept')+'</button></footer></article>').join(''):'<p class="muted">'+tx('درخواست مشترک جدیدی نداری.','No new shared requests.')+'</p>');
 await window.ElaraDialog.open({title:tx('درخواست‌های مشترک','Shared requests'),content:box,wide:true,actions:[{label:tx('بستن','Close'),value:false}]})
}
function mountInbox(){window.ElaraSocialView?.render?.()}
function mountWordShareControl(){
 const form=document.getElementById('word-form');if(!form)return;let host=form.querySelector('[data-collab-word-add]');
 if(!host){host=document.createElement('label');host.className='word-share-on-add';host.dataset.collabWordAdd='';host.innerHTML='<span>🤝 '+tx('افزودن به لایتنر','Add to Leitner')+'</span><select id="word-share-friend" aria-label="'+tx('لایتنر مقصد','Target Leitner')+'"></select>';form.append(host)}
 const select=host.querySelector('select'),current=select.value,rows=friends(),locale=document.documentElement.lang==='en'?'en':'fa';
 const renderKey=locale+'|'+JSON.stringify(rows.map(p=>[String(p.uid||''),String(p.name||''),String(p.username||'')]));
 if(host.dataset.collabRenderKey===renderKey)return;
 host.dataset.collabRenderKey=renderKey;
 select.innerHTML='<option value="">'+tx('فقط لایتنر من','My Leitner only')+'</option>'+rows.map(p=>'<option value="'+esc(p.uid)+'">'+tx('من + ','Me + ')+esc(p.name||p.username||tx('دوست','Friend'))+'</option>').join('');
 if(rows.some(p=>p.uid===current))select.value=current
}
let syncTimer=null,progressCache=new Map();
async function syncProgress(){
 const uid=me();if(!uid||!auth.currentUser?.emailVerified)return;const s=readLocal(),sets=[['task',s.tasks],['habit',s.habits],['goal',s.goals],['language-class',s.languageClasses],['leitner-word',s.words]];
 for(const [kind,rows] of sets)for(const row of rows){if(!row?.collabSpaceId)continue;const p=progressFor(kind,row),key=row.collabSpaceId+'|'+p.completed+'|'+p.total+'|'+p.percent;if(progressCache.get(row.collabSpaceId)===key)continue;try{await updateDoc(doc(db,'collabSpaces',String(row.collabSpaceId),'members',uid),{localEntityId:String(row.id||''),progressCompleted:p.completed,progressTotal:p.total,progressPercent:p.percent,updatedAt:serverTimestamp()});progressCache.set(row.collabSpaceId,key)}catch(error){if(error?.code!=='permission-denied'&&error?.code!=='not-found')console.warn('Elara collab progress:',error.code||error.message)}}
}
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>void syncProgress(),700)}
async function handleJoinFromUrl(){
 const url=new URL(location.href),token=url.searchParams.get('elaraJoin');if(!token||!auth.currentUser?.emailVerified)return;
 try{const ok=await window.ElaraDialog.confirm(tx('به این فضای مشترک اضافه شوی؟','Join this shared space?'),{title:tx('دعوت همکاری','Collaboration invite'),confirmText:tx('عضو می‌شوم','Join')});if(ok){await joinLink(token);window.ElaraNotify?.push?.({type:'social',title:tx('عضویت انجام شد 🤝','Joined 🤝'),message:tx('مورد مشترک به فضای تو اضافه شد.','The shared item was added to your space.'),dedupeKey:'collab-join:'+token})}}catch(error){await window.ElaraDialog.alert(error.message||String(error),{title:tx('عضویت انجام نشد','Could not join')})}finally{url.searchParams.delete('elaraJoin');history.replaceState(history.state,'',url.pathname+(url.searchParams.toString()?'?'+url.searchParams.toString():'')+url.hash)}
}
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-collab-inbox-launcher]')){void openInbox();return}
 if(e.target.closest('[data-collab-trusted-launcher]')){void openTrustedAccounts();return}
 const accept=e.target.closest('[data-collab-accept]'),decline=e.target.closest('[data-collab-decline]');if(!accept&&!decline)return;
 const button=accept||decline;button.disabled=true;
 try{if(accept)await acceptInvite(accept.dataset.collabAccept);else await declineInvite(decline.dataset.collabDecline)}
 catch(error){console.error('Elara collab action:',error);await window.ElaraDialog?.alert?.(error.message||String(error))}
 finally{button.disabled=false}
});
for(const ev of ['elara:data-changed','elara:state-committed','elara:collab-local-changed'])window.addEventListener(ev,scheduleSync);
onAuthStateChanged(auth,user=>{stopInviteRealtime();stopTrustedDeliveryFeed();if(user?.emailVerified){startInviteRealtime(user.uid);startTrustedDeliveryFeed(user.uid);setTimeout(()=>{void handleJoinFromUrl();mountWordShareControl();scheduleSync()},100)}});
window.addEventListener('elara:account-ready',()=>{const user=auth.currentUser;if(user?.emailVerified){startInviteRealtime(user.uid);startTrustedDeliveryFeed(user.uid);setTimeout(()=>{void handleJoinFromUrl();mountWordShareControl();scheduleSync()},100)}});
window.addEventListener('elara:social-updated',()=>{mountWordShareControl()});
window.addEventListener('elara:logout',()=>{stopInviteRealtime();stopTrustedDeliveryFeed()});
setTimeout(()=>{const user=auth.currentUser;if(user?.emailVerified){startInviteRealtime(user.uid);startTrustedDeliveryFeed(user.uid)}void handleJoinFromUrl();mountWordShareControl();scheduleSync()},800);

window.ElaraCollab={kinds:[...KINDS],shareEntity,createSpace,invite,acceptInvite,declineInvite,openInbox,refreshInvites,startInviteRealtime,stopInviteRealtime,pendingInvites:()=>inbox.slice(),openSpace,memberRows,createShareLink,copyShareLink,joinLink,requestTrustedAccount,acceptTrustedAccount,disconnectTrustedAccount,listTrustedAccounts,openTrustedAccounts,activeTrustedLink,startTrustedDeliveryFeed,stopTrustedDeliveryFeed,progressFor,findLocal};
