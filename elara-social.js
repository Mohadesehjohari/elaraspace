/* Firestore-backed profiles, friendships and opt-in activity summaries. No synthetic social data. */
import {getApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,updateProfile} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDoc,collection,collectionGroup,getDocs,query,where,orderBy,limit,onSnapshot,addDoc,updateDoc,setDoc,deleteDoc,serverTimestamp,runTransaction,writeBatch,Timestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=name=>window.ElaraIcons?.icon?.(name)||'<span class="elara-icon" aria-hidden="true"></span>';
const state={me:null,friends:[],requests:[],activities:[],blocked:[],error:'',profileView:null};window.ElaraSocial=state;
const lv=x=>window.ElaraLevels?.level(x)||1,title=x=>window.ElaraLevels?.title(x)||'جوینده';
let uid=null,baseline=null,refreshChain=Promise.resolve(),generation=0,lastSocialStats='';
const usernameValid=s=>/^[a-z][a-z0-9_]{2,19}$/.test(s),normalizeUsername=value=>String(value||'').trim().replace(/^@/,'').toLowerCase();
function identityIntegrityError(code,message){const error=new Error(message);error.name='ElaraIdentityIntegrityError';error.identityCode=code;return error}
async function assertProfileUsernameClaim(ownerUid,profileData){
 const username=normalizeUsername(profileData?.username);if(!usernameValid(username))throw identityIntegrityError('profile-username-invalid','نام کاربری پروفایل نامعتبر است.');
 const claim=await getDoc(doc(db,'usernames',username));if(!claim.exists())throw identityIntegrityError('profile-claim-missing','شاخص @'+username+' وجود ندارد؛ نتیجهٔ هویتی قابل اعتماد نیست.');
 if(String(claim.data()?.uid||'')!==String(ownerUid))throw identityIntegrityError('profile-claim-owner-mismatch','شاخص @'+username+' به حساب دیگری اشاره می‌کند؛ عملیات هویتی متوقف شد.');
 return username
}
async function resolveUsernameIdentity(value){
 const username=normalizeUsername(value);if(!usernameValid(username))throw Error('نام کاربری معتبر وارد کن.');
 const claim=await getDoc(doc(db,'usernames',username));if(!claim.exists())throw Error('این نام کاربری پیدا نشد.');
 const claimedUid=String(claim.data()?.uid||'');if(!claimedUid)throw identityIntegrityError('claim-uid-missing','شاخص نام کاربری شناسهٔ مالک معتبر ندارد.');
 let profileSnap;try{profileSnap=await getDoc(doc(db,'profiles',claimedUid))}catch(error){if(error?.code==='permission-denied')throw identityIntegrityError('profile-verification-denied','برای امنیت، مالک این نام کاربری قابل تأیید نبود.');throw error}
 if(!profileSnap.exists())throw identityIntegrityError('claim-profile-missing','این شاخص به پروفایل موجودی اشاره نمی‌کند.');
 const profileData=profileSnap.data(),canonical=normalizeUsername(profileData?.username);
 if(canonical!==username)throw identityIntegrityError('claim-profile-mismatch','شاخص @'+username+' با نام کاربری canonical پروفایل مقصد همخوان نیست؛ پروفایل باز نشد.');
 return {uid:claimedUid,username,profile:profileData,self:claimedUid===uid}
}
function avatar(name){return `<span class="elara-social-avatar" aria-hidden="true">${esc((name||'E').trim().slice(0,1).toUpperCase())}</span>`}
function profile(p){return `<button type="button" class="elara-social-info elara-profile-link" data-open-profile="${esc(p.uid||'')}"><strong>${esc(p.name||p.username||'کاربر')}</strong><small>@${esc(p.username||'')} · ${esc(title(p.xp))} · Lv.${lv(p.xp)}</small></button>`}
function inform(value){state.error=value;window.dispatchEvent(new Event('elara:social-updated'))}
function socialError(context,error){console.error('Elara social '+context+':',error);if(error?.code==='permission-denied')return 'اجازهٔ انجام این عملیات در Firestore داده نشد. Rules منتشرشده را بررسی کن.';return error?.message||String(error)||'خطای نامشخص اجتماعی'}
function relationWith(other){return state.requests.find(r=>r.other===other&&r.status!=='declined')||null}
function localStreak(){
 let data={};try{data=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')||{}}catch{}
 const dates=new Set(),iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 for(const row of Array.isArray(data.taskCompletionHistory)?data.taskCompletionHistory:[])if(row?.date)dates.add(row.date);
 for(const habit of Array.isArray(data.habits)?data.habits:[])for(const day of Array.isArray(habit?.days)?habit.days:[])dates.add(day);
 const d=new Date();d.setHours(12,0,0,0);if(!dates.has(iso(d)))d.setDate(d.getDate()-1);let n=0;
 while(n<36500&&dates.has(iso(d))){n++;d.setDate(d.getDate()-1)}return n
}
async function syncSocialStats(){
 if(!uid||!auth.currentUser?.emailVerified)return false;
 const streak=localStreak(),visibility=activityVisibility(uid,'streak'),payloadKey=streak+'|'+visibility;
 if(state.me)state.me.streak=streak;
 if(payloadKey===lastSocialStats)return true;
 try{await setDoc(doc(db,'socialStats',uid),{streak,visibility,updatedAt:serverTimestamp()});lastSocialStats=payloadKey;return true}
 catch(error){console.warn('Social streak sync unavailable:',error.code||error.message);return false}
}
async function visibleSocialStats(other){
 try{const snap=await getDoc(doc(db,'socialStats',String(other)));if(!snap.exists())return null;const d=snap.data()||{},n=Number(d.streak);return Number.isInteger(n)&&n>=0&&n<=36500?{streak:n,visibility:d.visibility||'private'}:null}catch(error){if(error?.code!=='permission-denied')console.warn('Social stats unavailable:',other,error.code||error.message);return null}
}
async function obtain(){const user=auth.currentUser;if(!user?.emailVerified)return false;const result=await getDoc(doc(db,'profiles',user.uid));if(!result.exists())return false;await assertProfileUsernameClaim(user.uid,result.data());state.me={uid:user.uid,...result.data(),streak:localStreak()};uid=user.uid;return true}
async function refreshPass(){if(!(await obtain()))return;const mine=uid,gen=++generation;try{
 const [incoming,outgoing,blockedSnaps]=await Promise.all([
  getDocs(query(collection(db,'friendRequests'),where('to','==',mine))),
  getDocs(query(collection(db,'friendRequests'),where('from','==',mine))),
  getDocs(query(collection(db,'blocks'),where('owner','==',mine)))
 ]);
 if(auth.currentUser?.uid!==mine)return;
 state.blocked=blockedSnaps.docs.map(s=>({id:s.id,...s.data()}));const blockedIds=new Set(state.blocked.map(x=>x.target));
 const entries=new Map([...incoming.docs,...outgoing.docs].map(s=>[s.id,{id:s.id,...s.data()}]));
 const enriched=[];for(const request of entries.values()){const other=request.from===mine?request.to:request.from;if(blockedIds.has(other))continue;try{const p=await getDoc(doc(db,'profiles',other));if(p.exists())enriched.push({...request,other,person:{uid:other,...p.data()}})}catch(error){console.warn('Profile unavailable:',other,error.code||error.message)}}
 if(auth.currentUser?.uid!==mine)return;
 state.requests=enriched;state.friends=enriched.filter(r=>r.status==='accepted').map(r=>r.person).filter((p,i,a)=>a.findIndex(v=>v.uid===p.uid)===i);
 await syncSocialStats();
 state.friends=await Promise.all(state.friends.map(async person=>{const stats=await visibleSocialStats(person.uid);return stats?{...person,...stats}:person}));
 const recent=[];for(const friend of state.friends.slice(0,12)){const docs=await getDocs(query(collection(db,'activities'),where('uid','==',friend.uid)));for(const event of docs.docs){const a=event.data();if(a.visibility!=='friends'&&a.visibility!=='public')continue;recent.push({id:event.id,person:friend,...a,ms:a.createdAt?.toMillis?.()||0})}}
 if(auth.currentUser?.uid!==mine)return;state.activities=recent.sort((a,b)=>b.ms-a.ms).slice(0,30);state.error='';if(gen===generation)render();
 }catch(error){console.error('Elara friends:',error);state.error=error.code==='permission-denied'?'قوانین اجتماعی/پروفایل باید در Firestore Rules منتشر شوند.':error.message||'خطا در دریافت اطلاعات دوستان';render()}}
async function refresh(){
 const run=()=>refreshPass();
 const pending=refreshChain.then(run,run);
 refreshChain=pending.catch(()=>{});
 return pending
}
window.ElaraSocial.refresh=refresh;

const dmId=other=>[String(uid||''),String(other||'')].sort().join('__');
function blockedByMe(other){return !!uid&&state.blocked.some(x=>x.target===other)}
function acceptedFriend(other){return !!uid&&!blockedByMe(other)&&state.friends.some(p=>p.uid===other)}
async function ensureDm(other){
 if(!uid||!auth.currentUser?.emailVerified)throw Error('ابتدا وارد حساب تأییدشده شو.');
 if(!acceptedFriend(other))throw Error('گفتگوی خصوصی فقط بین دوستان تأییدشده فعال است.');
 const id=dmId(other),ref=doc(db,'conversations',id),snap=await getDoc(ref);
 if(!snap.exists()){
  const members=[uid,other].sort();
  await setDoc(ref,{kind:'dm',members,createdBy:uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''});
 }
 return id;
}
async function listDms(){
 if(!uid)return[];
 const snaps=await getDocs(query(collection(db,'conversations'),where('members','array-contains',uid)));
 const rows=[];for(const item of snaps.docs){const data=item.data();if(data.kind!=='dm'||!Array.isArray(data.members))continue;const other=data.members.find(x=>x!==uid);if(!other||blockedByMe(other))continue;let person=state.friends.find(p=>p.uid===other);if(!person){try{const p=await getDoc(doc(db,'profiles',other));if(p.exists())person={uid:other,...p.data()}}catch{}}
  rows.push({id:item.id,other,person:person||{uid:other,name:'دوست'},lastText:String(data.lastText||''),lastSender:String(data.lastSender||''),updatedAt:data.updatedAt?.toMillis?.()||0})
 }
 return rows.sort((a,b)=>b.updatedAt-a.updatedAt);
}
async function getDmMessages(other){
 const cid=await ensureDm(other),snaps=await getDocs(query(collection(db,'conversations',cid,'messages'),orderBy('createdAt','desc'),limit(100)));
 return snaps.docs.map(x=>({id:x.id,...x.data(),ms:x.data().createdAt?.toMillis?.()||0})).reverse();
}
function listenDm(other,callback,errorCallback){
 if(!acceptedFriend(other))throw Error('گفتگو فقط برای دوستان تأییدشده است.');
 const cid=dmId(other),q=query(collection(db,'conversations',cid,'messages'),orderBy('createdAt','desc'),limit(100));
 return onSnapshot(q,snap=>callback(snap.docs.map(x=>({id:x.id,...x.data(),ms:x.data().createdAt?.toMillis?.()||0})).reverse()),error=>{console.error('Elara DM listener:',error);errorCallback?.(error)});
}
async function sendDm(other,value){
 const text=String(value||'').trim();if(!text)throw Error('پیام خالی ارسال نمی‌شود.');if(text.length>2000)throw Error('پیام باید حداکثر ۲۰۰۰ نویسه باشد.');
 const cid=await ensureDm(other),messages=collection(db,'conversations',cid,'messages');
 await addDoc(messages,{sender:uid,text,createdAt:serverTimestamp()});
 await updateDoc(doc(db,'conversations',cid),{lastText:text.slice(0,280),lastSender:uid,updatedAt:serverTimestamp()});
 window.ElaraNotify?.push?.({type:'social',title:'پیام ارسال شد',message:'پیامت رفت 🚀',dedupeKey:'dm-sent:'+cid+':'+Date.now()});
 return cid;
}
window.ElaraSocial.dm={id:dmId,ensure:ensureDm,list:listDms,messages:getDmMessages,listen:listenDm,send:sendDm};

const groupFriendIds=()=>new Set(state.friends.map(p=>p.uid));
async function createGroup(title,members=[]){
 if(!uid||!auth.currentUser?.emailVerified)throw Error('ابتدا وارد حساب تأییدشده شو.');
 const clean=String(title||'').trim().slice(0,80);if(clean.length<2)throw Error('اسم گروه حداقل ۲ نویسه باشد.');
 const accepted=groupFriendIds(),chosen=[...new Set((Array.isArray(members)?members:[]).map(String).filter(x=>x&&accepted.has(x)&&x!==uid))].slice(0,24);
 if(!chosen.length)throw Error('برای ساخت گروه حداقل یک دوست انتخاب کن.');
 const ref=doc(collection(db,'groups')),batch=writeBatch(db),stamp=serverTimestamp();
 batch.set(ref,{owner:uid,title:clean,createdAt:stamp,updatedAt:stamp,lastText:'',lastSender:''});
 batch.set(doc(ref,'groupMembers',uid),{uid,role:'owner',joinedAt:stamp});
 for(const member of chosen)batch.set(doc(ref,'groupMembers',member),{uid:member,role:'member',joinedAt:stamp});
 await batch.commit();return ref.id;
}
async function listGroups(){
 if(!uid)return[];
 const memberships=await getDocs(query(collectionGroup(db,'groupMembers'),where('uid','==',uid))),rows=[];
 for(const membership of memberships.docs){
  const ref=membership.ref.parent.parent;if(!ref)continue;
  try{const snap=await getDoc(ref);if(!snap.exists())continue;const d=snap.data()||{};rows.push({id:ref.id,title:String(d.title||'گروه'),owner:String(d.owner||''),lastText:String(d.lastText||''),lastSender:String(d.lastSender||''),updatedAt:d.updatedAt?.toMillis?.()||0,role:membership.data()?.role||'member'})}catch(error){console.warn('Elara group unavailable:',ref.id,error)}
 }
 return rows.sort((a,b)=>b.updatedAt-a.updatedAt);
}
async function getGroupMembers(groupId){
 const snaps=await getDocs(collection(db,'groups',String(groupId),'groupMembers')),rows=[];
 for(const row of snaps.docs){const d=row.data()||{},memberUid=String(d.uid||row.id);let p=memberUid===uid?state.me:state.friends.find(x=>x.uid===memberUid);if(!p){try{const ps=await getDoc(doc(db,'profiles',memberUid));if(ps.exists())p={uid:memberUid,...ps.data()}}catch{}}
  rows.push({uid:memberUid,role:d.role||'member',person:p||{uid:memberUid,name:'عضو گروه'}})
 }
 return rows;
}
async function getGroupMessages(groupId){
 const snaps=await getDocs(query(collection(db,'groups',String(groupId),'messages'),orderBy('createdAt','desc'),limit(100)));
 return snaps.docs.map(x=>({id:x.id,...x.data(),ms:x.data().createdAt?.toMillis?.()||0})).reverse();
}
function listenGroup(groupId,callback,errorCallback){
 const q=query(collection(db,'groups',String(groupId),'messages'),orderBy('createdAt','desc'),limit(100));
 return onSnapshot(q,snap=>callback(snap.docs.map(x=>({id:x.id,...x.data(),ms:x.data().createdAt?.toMillis?.()||0})).reverse()),error=>{console.error('Elara group listener:',error);errorCallback?.(error)});
}
async function sendGroup(groupId,value){
 if(!uid||!auth.currentUser?.emailVerified)throw Error('حساب تأییدشده لازم است.');
 const text=String(value||'').trim();if(!text)throw Error('پیام خالی ارسال نمی‌شود.');if(text.length>2000)throw Error('پیام باید حداکثر ۲۰۰۰ نویسه باشد.');
 const gid=String(groupId),messages=collection(db,'groups',gid,'messages');await addDoc(messages,{sender:uid,text,createdAt:serverTimestamp()});
 await updateDoc(doc(db,'groups',gid),{lastText:text.slice(0,280),lastSender:uid,updatedAt:serverTimestamp()});
 window.ElaraNotify?.push?.({type:'social',title:'پیام گروه ارسال شد',message:'رفت تو گروه 🚀',dedupeKey:'group-sent:'+gid+':'+Date.now()});return gid;
}
async function leaveGroup(groupId){
 if(!uid)throw Error('حساب در دسترس نیست.');const gid=String(groupId),group=await getDoc(doc(db,'groups',gid));if(!group.exists())throw Error('گروه پیدا نشد.');
 if(group.data()?.owner===uid)throw Error('سازندهٔ گروه فعلاً باید مالکیت را نگه دارد.');
 await deleteDoc(doc(db,'groups',gid,'groupMembers',uid));return true;
}
window.ElaraSocial.groups={create:createGroup,list:listGroups,members:getGroupMembers,messages:getGroupMessages,listen:listenGroup,send:sendGroup,leave:leaveGroup};

const CLUB_KINDS=new Set(['reading','fitness','focus','general']);
const clubMemberships=async()=>{
 if(!uid)return[];
 const snaps=await getDocs(query(collectionGroup(db,'clubMembers'),where('uid','==',uid))),rows=[];
 for(const membership of snaps.docs){const ref=membership.ref.parent.parent;if(!ref)continue;try{const snap=await getDoc(ref);if(!snap.exists())continue;const d=snap.data()||{};rows.push({id:ref.id,...d,role:membership.data()?.role||'member',updatedAt:d.updatedAt?.toMillis?.()||0})}catch(error){console.warn('Elara club unavailable:',ref.id,error)}}
 return rows.sort((a,b)=>b.updatedAt-a.updatedAt)
};
async function createClub(spec={}){
 if(!uid||!auth.currentUser?.emailVerified)throw Error('ابتدا وارد حساب تأییدشده شو.');
 const userLevel=window.ElaraLevels?.level?.(Number(state.me?.xp)||0)||1;if(userLevel<6)throw Error('ساخت باشگاه از Level 6 فعال می‌شود.');
 const title=String(spec.title||'').trim().slice(0,80),kind=CLUB_KINDS.has(spec.kind)?spec.kind:'general',visibility=spec.visibility==='public'?'public':'private',restDay=Math.max(0,Math.min(6,Math.floor(Number(spec.restDay)||0)));
 if(title.length<2)throw Error('اسم باشگاه حداقل ۲ نویسه باشد.');
 const ref=doc(collection(db,'clubs')),batch=writeBatch(db),stamp=serverTimestamp();
 batch.set(ref,{owner:uid,title,kind,visibility,assistant1:'',assistant2:'',restDay,createdAt:stamp,updatedAt:stamp});
 batch.set(doc(ref,'clubMembers',uid),{uid,role:'owner',joinedAt:stamp});
 await batch.commit();return ref.id
}
async function clubMembers(clubId){
 const snaps=await getDocs(collection(db,'clubs',String(clubId),'clubMembers')),rows=[];
 for(const row of snaps.docs){const d=row.data()||{},memberUid=String(d.uid||row.id);let person=memberUid===uid?state.me:state.friends.find(x=>x.uid===memberUid);if(!person){try{const ps=await getDoc(doc(db,'profiles',memberUid));if(ps.exists())person={uid:memberUid,...ps.data()}}catch{}}
  rows.push({uid:memberUid,role:d.role||'member',joinedAt:d.joinedAt?.toMillis?.()||0,person:person||{uid:memberUid,name:'عضو باشگاه'}})
 }
 return rows
}
async function inviteClub(clubId,other){
 if(!uid)throw Error('حساب در دسترس نیست.');const to=String(other||'');if(!state.friends.some(x=>x.uid===to))throw Error('دعوت باشگاه فقط برای دوست تأییدشده است.');
 const ref=doc(db,'clubs',String(clubId),'clubInvites',to),existing=await getDoc(ref);if(existing.exists())throw Error('برای این دوست قبلاً دعوت ثبت شده است.');
 await setDoc(ref,{from:uid,to,status:'pending',createdAt:serverTimestamp()});return to
}
async function listClubInvites(){
 if(!uid)return[];const snaps=await getDocs(query(collectionGroup(db,'clubInvites'),where('to','==',uid))),rows=[];
 for(const row of snaps.docs){const d=row.data()||{};if(d.status!=='pending')continue;const clubRef=row.ref.parent.parent;if(!clubRef)continue;try{const club=await getDoc(clubRef);if(club.exists())rows.push({id:row.id,clubId:clubRef.id,...d,club:{id:clubRef.id,...club.data()}})}catch{}}
 return rows
}
async function decideClubInvite(invite,status){
 if(!uid||invite?.to!==uid||!['accepted','declined'].includes(status))throw Error('دعوت باشگاه معتبر نیست.');
 const inviteRef=doc(db,'clubs',String(invite.clubId),'clubInvites',uid);
 if(status==='declined'){await updateDoc(inviteRef,{status});return true}
 const batch=writeBatch(db),stamp=serverTimestamp();batch.update(inviteRef,{status:'accepted'});batch.set(doc(db,'clubs',String(invite.clubId),'clubMembers',uid),{uid,role:'member',joinedAt:stamp});await batch.commit();return true
}
async function setClubAssistant(clubId,memberUid,enabled=true){
 const gid=String(clubId),target=String(memberUid),clubRef=doc(db,'clubs',gid),snap=await getDoc(clubRef);if(!snap.exists())throw Error('باشگاه پیدا نشد.');const data=snap.data()||{};if(data.owner!==uid)throw Error('فقط صاحب باشگاه می‌تواند دستیار تعیین کند.');if(target===uid)throw Error('صاحب باشگاه از قبل مدیر است.');
 const memberRef=doc(db,'clubs',gid,'clubMembers',target),member=await getDoc(memberRef);if(!member.exists())throw Error('این کاربر عضو باشگاه نیست.');
 let a1=String(data.assistant1||''),a2=String(data.assistant2||'');
 if(enabled){if(a1===target||a2===target)return true;if(!a1)a1=target;else if(!a2)a2=target;else throw Error('حداکثر دو دستیار مجاز است.')}
 else{if(a1===target)a1='';if(a2===target)a2=''}
 const batch=writeBatch(db),stamp=serverTimestamp();batch.update(clubRef,{assistant1:a1,assistant2:a2,updatedAt:stamp});batch.update(memberRef,{role:enabled?'assistant':'member'});await batch.commit();return true
}
async function createClubPost(clubId,spec={}){
 const kind=spec.kind==='poll'?'poll':'mission',title=String(spec.title||'').trim().slice(0,120),body=String(spec.body||'').trim().slice(0,1200),cadence=['none','daily','weekly','monthly'].includes(spec.cadence)?spec.cadence:'none',options=kind==='poll'?[...new Set((Array.isArray(spec.options)?spec.options:[]).map(x=>String(x||'').trim().slice(0,100)).filter(Boolean))].slice(0,6):[];
 if(title.length<2)throw Error('عنوان حداقل ۲ نویسه باشد.');if(kind==='poll'&&options.length<2)throw Error('نظرسنجی حداقل دو گزینه لازم دارد.');
 const gid=String(clubId),club=await getDoc(doc(db,'clubs',gid));if(!club.exists())throw Error('باشگاه پیدا نشد.');const domain=String(club.data()?.kind||'general');
 const ref=await addDoc(collection(db,'clubs',gid,'clubPosts'),{uid,kind,domain,title,body,cadence,options,createdAt:serverTimestamp()});return ref.id
}
async function listClubPosts(clubId){
 const snaps=await getDocs(query(collection(db,'clubs',String(clubId),'clubPosts'),orderBy('createdAt','desc'),limit(60)));
 return snaps.docs.map(x=>({id:x.id,...x.data(),ms:x.data().createdAt?.toMillis?.()||0}))
}
async function voteClubPoll(clubId,postId,option){
 const gid=String(clubId),pid=String(postId),voteRef=doc(db,'clubs',gid,'clubPosts',pid,'votes',uid),snap=await getDoc(voteRef);
 if(snap.exists())await updateDoc(voteRef,{option:String(option||'')});else await setDoc(voteRef,{uid,option:String(option||''),createdAt:serverTimestamp()});return true
}

window.ElaraSocial.clubs={kinds:[...CLUB_KINDS],create:createClub,list:clubMemberships,members:clubMembers,invite:inviteClub,invites:listClubInvites,decideInvite:decideClubInvite,setAssistant:setClubAssistant,createPost:createClubPost,posts:listClubPosts,vote:voteClubPoll};

const CHALLENGE_KINDS=new Set(['task','habit','reading','exercise','focus','general']);
const CHALLENGE_QUICK=Object.freeze(['بزن بریم 🔥','حواسم بهت هست 👀','ریز می‌بینمت 😎','کم نیار 👊','تا آخرش هستم 🤝','امروز مال ماست ⚡']);
function challengePerson(other){return state.friends.find(p=>p.uid===other)||{uid:other,name:'دوست'}}
async function createChallenge(other,spec={}){
 if(!uid||!auth.currentUser?.emailVerified)throw Error('ابتدا وارد حساب تأییدشده شو.');
 const to=String(other||'');if(!acceptedFriend(to))throw Error('چالش فقط بین دوستان تأییدشده فعال است.');
 const targetKind=CHALLENGE_KINDS.has(spec.targetKind)?spec.targetKind:'general',targetText=String(spec.targetText||'').trim().slice(0,120),targetValue=Math.max(1,Math.min(1000000,Math.floor(Number(spec.targetValue)||1)));
 if(targetText.length<2)throw Error('هدف چالش را واضح بنویس.');
 const ref=await addDoc(collection(db,'challenges'),{from:uid,to,status:'pending',targetKind,targetText,targetValue,createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+30000)});
 return ref.id
}
async function listChallenges(){
 if(!uid)return[];
 const [incoming,outgoing]=await Promise.all([
  getDocs(query(collection(db,'challenges'),where('to','==',uid))),
  getDocs(query(collection(db,'challenges'),where('from','==',uid)))
 ]);
 const map=new Map([...incoming.docs,...outgoing.docs].map(x=>[x.id,{id:x.id,...x.data()}])),now=Date.now();
 return [...map.values()].map(c=>{const other=c.from===uid?c.to:c.from;return {...c,other,person:challengePerson(other),expired:c.status==='pending'&&((c.expiresAt?.toMillis?.()||0)<=now),ms:c.createdAt?.toMillis?.()||0}}).sort((a,b)=>b.ms-a.ms)
}
async function respondChallenge(challenge,status){
 if(!['accepted','declined'].includes(status))throw Error('پاسخ چالش معتبر نیست.');
 if(!challenge||challenge.to!==uid||challenge.status!=='pending')throw Error('این درخواست قابل پاسخ نیست.');
 const expires=challenge.expiresAt?.toMillis?.()||0;if(expires&&Date.now()>=expires)throw Error('زمان این درخواست چالش تمام شده.');
 await updateDoc(doc(db,'challenges',String(challenge.id)),{status,respondedAt:serverTimestamp()});return true
}
async function cancelChallenge(challenge){
 if(!challenge||challenge.from!==uid||challenge.status!=='pending')throw Error('این درخواست قابل لغو نیست.');
 await deleteDoc(doc(db,'challenges',String(challenge.id)));return true
}
async function challengeQuick(challengeId,value){
 const text=String(value||'').trim();if(!CHALLENGE_QUICK.includes(text))throw Error('فقط پیام‌های سریع آماده مجازند.');
 const ref=doc(db,'challenges',String(challengeId)),snap=await getDoc(ref);if(!snap.exists())throw Error('چالش پیدا نشد.');
 const data=snap.data()||{};if(data.status!=='accepted'||![data.from,data.to].includes(uid))throw Error('پیام سریع فقط در چالش پذیرفته‌شده فعال است.');
 await addDoc(collection(ref,'quickMessages'),{uid,text,createdAt:serverTimestamp()});return true
}
async function listChallengeQuick(challengeId){
 const snaps=await getDocs(query(collection(db,'challenges',String(challengeId),'quickMessages'),orderBy('createdAt','desc'),limit(40)));
 return snaps.docs.map(x=>({id:x.id,...x.data(),ms:x.data().createdAt?.toMillis?.()||0})).reverse()
}
window.ElaraSocial.challenges={kinds:[...CHALLENGE_KINDS],quick:[...CHALLENGE_QUICK],create:createChallenge,list:listChallenges,respond:respondChallenge,cancel:cancelChallenge,sendQuick:challengeQuick,quickMessages:listChallengeQuick};




async function changeCanonicalUsername(value){
 const nextUsername=normalizeUsername(value);if(!usernameValid(nextUsername))throw Error('نام کاربری باید ۳ تا ۲۰ نویسهٔ انگلیسی و با حرف شروع شود.');
 const profileRef=doc(db,'profiles',uid);let oldUsername='';
 await runTransaction(db,async tx=>{
   const own=await tx.get(profileRef);if(!own.exists())throw Error('پروفایل پیدا نشد.');
   oldUsername=normalizeUsername(own.data()?.username);if(!usernameValid(oldUsername))throw identityIntegrityError('old-profile-username-invalid','نام کاربری قبلی پروفایل نامعتبر است.');
   if(oldUsername===nextUsername){
     const sameClaim=await tx.get(doc(db,'usernames',nextUsername));
     if(!sameClaim.exists()||String(sameClaim.data()?.uid||'')!==uid)throw identityIntegrityError('same-username-claim-invalid','شاخص نام کاربری فعلی با حساب همخوان نیست.');
     return;
   }
   const newClaimRef=doc(db,'usernames',nextUsername),oldClaimRef=doc(db,'usernames',oldUsername);
   const newClaim=await tx.get(newClaimRef),oldClaim=await tx.get(oldClaimRef);
   if(newClaim.exists()&&String(newClaim.data()?.uid||'')!==uid)throw Error('این نام کاربری قبلاً انتخاب شده است.');
   if(!newClaim.exists())tx.set(newClaimRef,{uid});
   tx.update(profileRef,{username:nextUsername});
   if(oldClaim.exists()&&String(oldClaim.data()?.uid||'')===uid)tx.delete(oldClaimRef);
 });
 const [profileAfter,newClaimAfter,oldClaimAfter]=await Promise.all([
   getDoc(profileRef),getDoc(doc(db,'usernames',nextUsername)),oldUsername&&oldUsername!==nextUsername?getDoc(doc(db,'usernames',oldUsername)):Promise.resolve(null)
 ]);
 if(!profileAfter.exists()||normalizeUsername(profileAfter.data()?.username)!==nextUsername)throw identityIntegrityError('rename-profile-verify-failed','تغییر نام کاربری در پروفایل تأیید نشد.');
 if(!newClaimAfter.exists()||String(newClaimAfter.data()?.uid||'')!==uid)throw identityIntegrityError('rename-claim-verify-failed','شاخص نام کاربری جدید بعد از تغییر قابل تأیید نیست.');
 if(oldClaimAfter?.exists?.()&&String(oldClaimAfter.data()?.uid||'')===uid)throw identityIntegrityError('rename-old-claim-stale','شاخص نام کاربری قبلی هنوز به این حساب متصل است.');
 return nextUsername
}

async function addFriend(value){
 if(!state.me||uid!==auth.currentUser?.uid){if(!(await obtain()))throw Error('ابتدا وارد حساب تأییدشده شو.')}
 const identity=await resolveUsernameIdentity(value),username=identity.username,to=identity.uid;if(to===uid)throw Error('نمی‌توانی برای خودت درخواست دوستی بفرستی.');
 // Refresh the two participant-scoped queries before the guard so stale cached social
 // state cannot create a crossed request when an incoming request already exists.
 await refresh();
 const active=state.requests.find(r=>r.other===to&&r.status!=='declined');if(active)throw Error(active.status==='accepted'?'قبلاً دوست شده‌اید.':active.to===uid?'این کاربر برایت درخواست فرستاده؛ همان درخواست را قبول یا رد کن.':'درخواست قبلی هنوز در انتظار است.');
 const request={id:uid+'_'+to,from:uid,to,status:'pending',other:to,person:{uid:to,username,name:username}};
 try{
   // Do not pre-read a possibly missing friendRequests document. The participant-only
   // Firestore get rule cannot authorize a missing resource; direct setDoc lets create
   // rules validate first-time requests and update rules handle legacy declined docs.
   await setDoc(doc(db,'friendRequests',request.id),{from:uid,to,status:'pending'});
   state.requests=[...state.requests.filter(r=>r.id!==request.id),request];render();
   await refresh();return to;
 }catch(error){
   socialError('send-friend-request',error);
   await refresh();
   const relation=state.requests.find(r=>r.other===to&&r.status!=='declined');
   if(relation)throw Error(relation.status==='accepted'?'قبلاً دوست شده‌اید.':relation.to===uid?'درخواست ورودی از این کاربر وجود دارد.':'درخواست قبلی هنوز در انتظار است.');
   const stale=state.requests.find(r=>r.id===request.id&&r.from===uid&&r.status==='declined');
   if(stale){
     try{
       await updateDoc(doc(db,'friendRequests',request.id),{status:'pending'});
       await refresh();return to;
     }catch(retryError){socialError('retry-declined-friend-request',retryError);throw retryError}
   }
   throw error;
 }
}
async function cancelRequest(request){if(request.from!==uid||request.status!=='pending')throw Error('درخواست قابل لغو نیست.');await deleteDoc(doc(db,'friendRequests',request.id));await refresh()}
async function removeFriend(request){if(request.status!=='accepted'||(request.from!==uid&&request.to!==uid))throw Error('دوستی معتبر نیست.');await deleteDoc(doc(db,'friendRequests',request.id));await refresh()}
async function blockUser(target,person={}){
 if(!uid||!auth.currentUser?.emailVerified)throw Error('ابتدا وارد حساب تأییدشده شو.');
 target=String(target||'');if(!target||target===uid)throw Error('این حساب قابل مسدودکردن نیست.');
 const relation=relationWith(target),known=person?.uid===target?person:(state.friends.find(p=>p.uid===target)||state.profileView||{});
 const batch=writeBatch(db),blockRef=doc(db,'blocks',uid+'__'+target);
 batch.set(blockRef,{owner:uid,target,targetName:String(known.name||'').slice(0,60),targetUsername:String(known.username||'').replace(/^@/,'').slice(0,20),createdAt:serverTimestamp()});
 if(relation?.id)batch.delete(doc(db,'friendRequests',relation.id));
 await batch.commit();state.profileView=null;await refresh();return true
}
async function unblockUser(target){
 if(!uid)throw Error('ابتدا وارد حساب شو.');target=String(target||'');if(!target)return false;
 await deleteDoc(doc(db,'blocks',uid+'__'+target));await refresh();return true
}
window.ElaraSocial.blockUser=blockUser;window.ElaraSocial.unblockUser=unblockUser;
async function decide(request,status){if(request.to!==uid||request.status!=='pending')throw Error('درخواست معتبر نیست.');if(status==='declined'){try{await deleteDoc(doc(db,'friendRequests',request.id))}catch(error){console.error('Elara social decline-delete:',error);if(error?.code!=='permission-denied')throw error;await updateDoc(doc(db,'friendRequests',request.id),{status:'declined'})}}else if(status==='accepted'){await updateDoc(doc(db,'friendRequests',request.id),{status:'accepted'});window.ElaraNotify?.push?.({type:'friend',title:'دوستی تأیید شد',message:'حالا می‌توانید پیشرفت‌های مجاز را با هم ببینید.',dedupeKey:'friend-accepted:'+request.id})}else throw Error('وضعیت درخواست نامعتبر است.');await refresh()}

async function profileUidFromUsername(value){return (await resolveUsernameIdentity(value)).uid}
function profileSummary(person){
 const system=window.ElaraProfileSystem,view=system?.viewModel?.(person,{self:person?.uid===uid});
 if(view&&system?.composition)return '<div class="pass4-public-profile-summary">'+system.composition(view,{profilePage:person?.uid!==uid})+'</div>';
 return '<div class="elara-public-head">'+avatar(person.name)+'<div><h2>'+esc(person.name||person.username||'کاربر')+'</h2><p>@'+esc(person.username||'')+' · '+esc(title(person.xp))+' · Level '+lv(person.xp)+'</p></div><strong>'+Number(person.xp||0).toLocaleString('fa-IR')+' XP</strong></div>';
}
function renderProfile(person=state.profileView){
 const root=$('elara-profile-page');if(!root||!person)return;
 const self=person.uid===uid,relation=self?null:relationWith(person.uid),isFriend=relation?.status==='accepted',isBlocked=!self&&blockedByMe(person.uid),publicAllowed=person.profilePublic!==false||isFriend;
 const summary=profileSummary(person),view=window.ElaraProfileSystem?.viewModel?.(person,{self});
 if(self){
  root.innerHTML='<div class="pass4-profile-grid"><section class="elara-card wide pass4-public-profile-card">'+summary+'<p class="elara-profile-bio">'+esc(person.bio||'هنوز Bio ثبت نشده است.')+'</p><div class="pass4-profile-facts"><span>Level '+(view?.level||lv(person.xp))+'</span><span>'+esc(view?.title||title(person.xp))+'</span><span>'+Number(person.xp||0).toLocaleString('fa-IR')+' XP</span></div><div class="timer-actions"><button type="button" class="primary-button" data-profile-edit>ویرایش پروفایل</button><button type="button" class="quiet-button" data-approved-wardrobe>کمد</button></div></section></div>';
  return;
 }
 const blockAction=isBlocked?'<button type="button" class="quiet-button" data-profile-unblock="'+esc(person.uid)+'">رفع مسدودیت</button>':'<button type="button" class="quiet-button danger-outline" data-profile-block="'+esc(person.uid)+'">مسدودکردن</button>';
 if(!publicAllowed){root.innerHTML='<section class="elara-card pass4-public-profile-card">'+summary+'<p class="muted">این کاربر نمایش عمومی پروفایلش را محدود کرده است.</p><div class="timer-actions">'+blockAction+'</div></section>';return}
 let actions='';
 if(isBlocked)actions=blockAction;
 else if(isFriend)actions='<button type="button" class="quiet-button danger-outline" data-profile-friend-action="remove" data-request="'+esc(relation.id)+'">حذف از دوستان</button><button type="button" class="primary-button" data-profile-challenge="'+esc(person.uid)+'">دعوت به چالش ⚡</button>'+blockAction;
 else if(relation?.status==='pending'&&relation.from===uid)actions='<button type="button" class="quiet-button" data-profile-friend-action="cancel" data-request="'+esc(relation.id)+'">لغو درخواست دوستی</button>'+blockAction;
 else if(relation?.status==='pending'&&relation.to===uid)actions='<button type="button" class="primary-button" data-profile-friend-action="accept" data-request="'+esc(relation.id)+'">قبول درخواست</button><button type="button" class="quiet-button" data-profile-friend-action="decline" data-request="'+esc(relation.id)+'">رد</button>'+blockAction;
 else actions='<button type="button" class="primary-button" data-profile-add-friend="'+esc(person.username||'')+'">ارسال درخواست دوستی</button>'+blockAction;
 root.innerHTML='<div class="pass4-profile-grid"><section class="elara-card wide pass4-public-profile-card">'+summary+'<p class="elara-profile-bio">'+esc(person.bio||'هنوز Bio ثبت نشده است.')+'</p><div class="pass4-profile-facts"><span>Level '+(view?.level||lv(person.xp))+'</span><span>'+esc(view?.title||title(person.xp))+'</span><span>'+Number(person.xp||0).toLocaleString('fa-IR')+' XP</span></div><div class="timer-actions">'+actions+'</div></section><section class="elara-card"><h2>وضعیت اجتماعی</h2><p>'+(isFriend?'دوستت':relation?.status==='pending'?'درخواست دوستی در جریان است':'هنوز دوست نیستید')+'</p><p class="muted">اطلاعات Task، Habit، Goal و Wellness در پروفایل عمومی نمایش داده نمی‌شوند.</p></section></div>';
}
async function presentProfile(person){
 const stage=$('elara-profile-page');if(!stage)throw Error('محل نمایش پروفایل آماده نیست.');
 state.profileView=person;renderProfile(person);
 const card=document.createElement('div');card.className='elara-profile-dialog';
 while(stage.firstChild)card.append(stage.firstChild);
 const self=person.uid===uid;
 await window.ElaraDialog.open({title:self?'حساب کاربری من':'پروفایل کاربر',content:card,wide:false,actions:[{label:'بستن',value:true,kind:'primary'}]});
 state.profileView=null;
}
async function openProfile(targetUid){
 if(!uid)throw Error('ابتدا وارد حساب شو.');
 if(targetUid===uid){window.ElaraPrivateDrawer?.open?.('account');return state.me}
 const snap=await getDoc(doc(db,'profiles',targetUid));if(!snap.exists())throw Error('پروفایل پیدا نشد.');
 const person={uid:targetUid,...snap.data()};await presentProfile(person);return person;
}
async function openSelfProfile(){if(!(await obtain()))throw Error('پروفایل حساب بارگذاری نشده.');window.ElaraPrivateDrawer?.open?.('account');return state.me}
async function openProfileByUsername(value){
 const identity=await resolveUsernameIdentity(value);
 if(identity.self){await openSelfProfile();return state.me}
 return openProfile(identity.uid)
}
window.ElaraSocial.openProfile=openProfile;
window.ElaraSocial.openSelfProfile=()=>openSelfProfile().catch(e=>inform(e.message||String(e)));
window.ElaraSocial.openProfileByUsername=openProfileByUsername;
window.ElaraSocial.profileUidFromUsername=profileUidFromUsername;
window.ElaraSocial.changeCanonicalUsername=changeCanonicalUsername;

async function saveProfileValues(values={}){
 if(!uid||!auth.currentUser)throw Error('ابتدا وارد حساب شو.');
 const name=String(values.name??state.me?.name??'').trim().slice(0,60);
 const bio=String(values.bio??state.me?.bio??'').trim().slice(0,300);
 const username=String(values.username??state.me?.username??'').trim().toLowerCase();
 const profilePublic=values.profilePublic!==false;
 if(!name)throw Error('نام نمایشی نمی‌تواند خالی باشد.');
 if(!usernameValid(username))throw Error('نام کاربری باید ۳ تا ۲۰ نویسهٔ انگلیسی و با حرف شروع شود.');
 const profileRef=doc(db,'profiles',uid),before=state.me||{},warnings=[],applied={};
 const storedBefore=await getDoc(profileRef);if(!storedBefore.exists())throw Error('پروفایل پیدا نشد.');
 const storedUsername=normalizeUsername(storedBefore.data()?.username);
 if(username===storedUsername)await assertProfileUsernameClaim(uid,storedBefore.data());
 if(username!==storedUsername){
   try{applied.username=await changeCanonicalUsername(username)}
   catch(error){if(error.code==='permission-denied')warnings.push('تغییر نام کاربری بعد از انتشار Firestore Rules جدید فعال می‌شود.');else throw error}
 }
 try{await updateDoc(profileRef,{name});await updateProfile(auth.currentUser,{displayName:name});applied.name=name}
 catch(error){if(error.code==='permission-denied')warnings.push('ذخیرهٔ نام نمایشی به Firestore Rules منتشرشده نیاز دارد.');else throw error}
 try{await updateDoc(profileRef,{bio});applied.bio=bio}
 catch(error){if(error.code==='permission-denied')warnings.push('ذخیرهٔ بیوگرافی به Firestore Rules منتشرشده نیاز دارد.');else throw error}
 if(profilePublic!==(before.profilePublic!==false)){
   try{await updateDoc(profileRef,{profilePublic});applied.profilePublic=profilePublic}
   catch(error){if(error.code==='permission-denied')warnings.push('تنظیم حریم خصوصی بعد از انتشار Firestore Rules جدید فعال می‌شود.');else throw error}
 }
 if(state.me)state.me={...state.me,...applied};
 await refresh();
 window.dispatchEvent(new Event('elara:profile-saved'));
 return {warnings,profile:state.me};
}
window.ElaraSocial.saveProfileValues=saveProfileValues;
async function saveMyProfile(){
 return saveProfileValues({
   name:$('elara-profile-edit-name')?.value,
   bio:$('elara-profile-edit-bio')?.value,
   username:$('elara-profile-edit-username')?.value,
   profilePublic:$('elara-profile-public')?.checked!==false
 });
}

function render(){
 window.ElaraSocialView?.render();
 if(state.profileView){const refreshed=state.profileView.uid===uid?state.me:state.friends.find(x=>x.uid===state.profileView.uid)||state.profileView;state.profileView=refreshed;renderProfile(refreshed)}
 window.dispatchEvent(new Event('elara:social-updated'));
}

const ACTIVITY_CATEGORY={task:'task',habit:'habit',goal:'goal',mission:'mission',reading:'reading',book:'reading',book_clip:'reading',language:'language',exercise:'exercise',focus:'focus',streak:'streak',ranking:'ranking'};
function activityVisibility(owner=uid,category='activity'){
 if(!owner)return 'private';
 const wanted=ACTIVITY_CATEGORY[category]||category;
 if(owner===uid&&wanted!=='activity'){
  const api=window.ElaraPrivacyLocal?.visibility?.(wanted);if(['private','friends','public'].includes(api))return api;
  try{const local=JSON.parse(localStorage.getItem('elara_privacy_local_v1_'+owner)||'{}');if(['private','friends','public'].includes(local?.[wanted]))return local[wanted]}catch{}
 }
 const explicit=localStorage.getItem('elara_activity_visibility_'+owner);
 if(['private','friends','public'].includes(explicit))return explicit;
 return localStorage.getItem('elara_share_activity_'+owner)==='no'?'private':'friends';
}
async function publish(type,detail={}){
 if(!uid||!auth.currentUser?.emailVerified)return false;
 const category=String(detail.category||ACTIVITY_CATEGORY[type]||type||'activity'),configured=activityVisibility(uid,category),visibility=['private','friends','public'].includes(detail.visibility)?detail.visibility:configured;
 if(visibility==='private')return false;
 const id=uid+'_'+crypto.randomUUID();
 const safe={uid,type:String(type||'activity').slice(0,32),eventKey:id,visibility,category:category.slice(0,32),createdAt:serverTimestamp()};
 if(type==='reading'){safe.pagesRead=Math.max(0,Math.min(10000,Math.round(Number(detail.pagesRead)||0)));safe.percentAfter=Math.max(0,Math.min(100,Math.round(Number(detail.percentAfter)||0)));safe.bookTitle=String(detail.bookTitle||'').slice(0,140)}
 if(type==='book_clip'){safe.bookTitle=String(detail.bookTitle||'').slice(0,140);safe.excerpt=String(detail.excerpt||'').slice(0,280)}
 if(type==='focus'){safe.durationMin=Math.max(1,Math.min(180,Math.round(Number(detail.durationMin)||1)));safe.tag=String(detail.tag||'').trim().slice(0,60)}
 try{await setDoc(doc(db,'activities',id),safe);return true}catch(error){console.warn('Activity sharing failed:',error);inform('ثبت فعالیت برای دوستان ناموفق بود: '+(error.code||error.message));return false}
}
window.ElaraSocial.publishActivity=publish;window.ElaraSocial.activityVisibility=activityVisibility;
function changed(){if(!uid||!state.me)return;let now;try{now=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return}if(!baseline){baseline=now;return}const day=new Date(),date=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`,beforeTasks=new Map((baseline.tasks||[]).map(x=>[x.id,x]));for(const task of now.tasks||[]){const before=beforeTasks.get(task.id);const completedNow=task.recurrenceRule?(task.occurrenceDone||[]).includes(date):task.completed;const completedBefore=task.recurrenceRule?(before?.occurrenceDone||[]).includes(date):before?.completed;if(completedNow&&!completedBefore)void publish('task')}const beforeHabits=new Map((baseline.habits||[]).map(x=>[x.id,x]));for(const habit of now.habits||[])if((habit.days||[]).includes(date)&&!(beforeHabits.get(habit.id)?.days||[]).includes(date))void publish('habit');baseline=now}
window.addEventListener('elara:hydrate',e=>{baseline=e.detail||{};lastSocialStats='';setTimeout(refresh,500)});
window.addEventListener('elara:data-changed',()=>{changed();void syncSocialStats().then(()=>window.ElaraSocialView?.render?.())});
window.addEventListener('elara:privacy-local-changed',e=>{if(!e.detail?.category||e.detail.category==='streak'){lastSocialStats='';void syncSocialStats().then(()=>refresh())}});
document.addEventListener('click',async e=>{
 const open=e.target.closest('[data-open-profile]');if(open?.dataset.openProfile){try{await openProfile(open.dataset.openProfile)}catch(error){inform(error.message||String(error))}return}
 if(e.target.closest('[data-profile-lookup]')){try{await openProfileByUsername($('elara-add-friend-name')?.value)}catch(error){inform(error.message||String(error))}return}
 const add=e.target.closest('[data-profile-add-friend]');if(add){add.disabled=true;try{const target=await addFriend(add.dataset.profileAddFriend);await openProfile(target)}catch(error){inform(socialError('profile-add-friend',error))}finally{add.disabled=false}return}
 const block=e.target.closest('[data-profile-block]');if(block){const target=block.dataset.profileBlock,person=state.profileView||state.friends.find(p=>p.uid===target)||{};if(await window.ElaraDialog.confirm('با مسدودکردن، دوستی/درخواست فعلی حذف می‌شود و این کاربر دیگر نمی‌تواند پروفایل، فعالیت‌ها یا پست‌های تو را ببیند یا پیام خصوصی جدید بفرستد.',{title:'مسدودکردن کاربر',confirmText:'مسدودکردن',danger:true})){block.disabled=true;try{await blockUser(target,person);window.ElaraDialog.close()}catch(error){inform(socialError('block-user',error))}finally{block.disabled=false}}return}
 const unblock=e.target.closest('[data-profile-unblock]');if(unblock){unblock.disabled=true;try{await unblockUser(unblock.dataset.profileUnblock);window.ElaraDialog.close()}catch(error){inform(socialError('unblock-user',error))}finally{unblock.disabled=false}return}
 const action=e.target.closest('[data-profile-friend-action]');if(action){const req=state.requests.find(r=>r.id===action.dataset.request);if(!req)return;action.disabled=true;try{if(action.dataset.profileFriendAction==='remove')await removeFriend(req);else if(action.dataset.profileFriendAction==='cancel')await cancelRequest(req);else await decide(req,action.dataset.profileFriendAction==='accept'?'accepted':'declined');if(state.profileView?.uid&&state.profileView.uid!==uid){try{await openProfile(state.profileView.uid)}catch{window.ElaraOpen?.('social')}}}catch(error){inform(socialError('profile-friend-action',error))}finally{action.disabled=false}return}
 if(e.target.id==='elara-delete-activity'){const b=e.target;b.disabled=true;try{if(!uid)throw Error('وارد حساب نشده‌ای.');const docs=await getDocs(query(collection(db,'activities'),where('uid','==',uid)));for(const a of docs.docs)await deleteDoc(a.ref);$('elara-delete-activity-status').textContent='فعالیت‌های قبلی پاک شدند.';await refresh()}catch(error){$('elara-delete-activity-status').textContent=error.message||String(error)}finally{b.disabled=false}}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='elara-profile-form'){e.preventDefault();const b=e.target.querySelector('[type=submit]');b.disabled=true;const status=$('elara-profile-save-status');try{const warnings=await saveMyProfile();if(status)status.textContent=warnings.length?'✓ نام و Bio ذخیره شد. '+warnings.join(' '):'✓ پروفایل ذخیره شد.'}catch(error){if(status)status.textContent=error.message||String(error)}finally{b.disabled=false}return}
 if(e.target.id!=='elara-add-friend')return;e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;try{await addFriend($('elara-add-friend-name').value);e.target.reset();$('elara-social-message').textContent='درخواست فرستاده شد.'}catch(error){$('elara-social-message').textContent=socialError('friend-form',error)}finally{button.disabled=false}
});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-friend-action],[data-social-refresh]');if(!b)return;if(b.hasAttribute('data-social-refresh')){void refresh();return}const req=state.requests.find(r=>r.id===b.dataset.request);if(!req)return;b.disabled=true;try{await decide(req,b.dataset.friendAction==='accept'?'accepted':'declined')}catch(error){inform(socialError('friend-action',error))}finally{b.disabled=false}});
onAuthStateChanged(auth,async user=>{uid=null;state.me=null;state.friends=[];state.requests=[];state.activities=[];state.blocked=[];state.profileView=null;baseline=null;if(!user){render();return}if(user.emailVerified){try{if(await obtain()){baseline=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');await refresh()}}catch(error){console.error('Social auth:',error)}}});
window.addEventListener('elara:account-ready',()=>{if(auth.currentUser?.emailVerified)refresh().catch(error=>inform(socialError('account-ready-refresh',error)))})
