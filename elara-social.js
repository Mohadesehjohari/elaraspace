/* Firestore-backed profiles, friendships and opt-in activity summaries. No synthetic social data. */
import {getApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,updateProfile} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDoc,collection,getDocs,query,where,updateDoc,setDoc,deleteDoc,serverTimestamp,runTransaction} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=name=>window.ElaraIcons?.icon?.(name)||'<span class="elara-icon" aria-hidden="true"></span>';
const state={me:null,friends:[],requests:[],activities:[],error:'',profileView:null};window.ElaraSocial=state;
const lv=x=>window.ElaraLevels?.level(x)||1,title=x=>window.ElaraLevels?.title(x)||'جوینده';
let uid=null,baseline=null,busy=false,rerun=false,generation=0;
const usernameValid=s=>/^[a-z][a-z0-9_]{2,19}$/.test(s);
function avatar(name){return `<span class="elara-social-avatar" aria-hidden="true">${esc((name||'E').trim().slice(0,1).toUpperCase())}</span>`}
function profile(p){return `<button type="button" class="elara-social-info elara-profile-link" data-open-profile="${esc(p.uid||'')}"><strong>${esc(p.name||p.username||'کاربر')}</strong><small>@${esc(p.username||'')} · ${esc(title(p.xp))} · Lv.${lv(p.xp)}</small></button>`}
function inform(value){state.error=value;window.dispatchEvent(new Event('elara:social-updated'))}
function socialError(context,error){console.error('Elara social '+context+':',error);if(error?.code==='permission-denied')return 'اجازهٔ انجام این عملیات در Firestore داده نشد. Rules منتشرشده را بررسی کن.';return error?.message||String(error)||'خطای نامشخص اجتماعی'}
function relationWith(other){return state.requests.find(r=>r.other===other&&r.status!=='declined')||null}
async function obtain(){const user=auth.currentUser;if(!user?.emailVerified)return false;const result=await getDoc(doc(db,'profiles',user.uid));if(!result.exists())return false;state.me={uid:user.uid,...result.data()};uid=user.uid;return true}
async function refresh(){if(busy){rerun=true;return}if(!(await obtain()))return;busy=true;const mine=uid,gen=++generation;try{
 const [incoming,outgoing]=await Promise.all(['to','from'].map(field=>getDocs(query(collection(db,'friendRequests'),where(field,'==',mine)))));
 if(auth.currentUser?.uid!==mine)return;
 const entries=new Map([...incoming.docs,...outgoing.docs].map(s=>[s.id,{id:s.id,...s.data()}]));
 const enriched=[];for(const request of entries.values()){const other=request.from===mine?request.to:request.from;try{const p=await getDoc(doc(db,'profiles',other));if(p.exists())enriched.push({...request,other,person:{uid:other,...p.data()}})}catch(error){console.warn('Profile unavailable:',other,error.code||error.message)}}
 if(auth.currentUser?.uid!==mine)return;
 state.requests=enriched;state.friends=enriched.filter(r=>r.status==='accepted').map(r=>r.person).filter((p,i,a)=>a.findIndex(v=>v.uid===p.uid)===i);
 const recent=[];for(const friend of state.friends.slice(0,12)){const docs=await getDocs(query(collection(db,'activities'),where('uid','==',friend.uid)));for(const event of docs.docs){const a=event.data();if(a.visibility!=='friends'&&a.visibility!=='public')continue;recent.push({id:event.id,person:friend,...a,ms:a.createdAt?.toMillis?.()||0})}}
 if(auth.currentUser?.uid!==mine)return;state.activities=recent.sort((a,b)=>b.ms-a.ms).slice(0,30);state.error='';if(gen===generation)render();
 }catch(error){console.error('Elara friends:',error);state.error=error.code==='permission-denied'?'قوانین اجتماعی/پروفایل باید در Firestore Rules منتشر شوند.':error.message||'خطا در دریافت اطلاعات دوستان';render()}finally{busy=false;if(rerun){rerun=false;void refresh()}}}
window.ElaraSocial.refresh=refresh;

async function addFriend(value){
 if(!state.me||uid!==auth.currentUser?.uid){if(!(await obtain()))throw Error('ابتدا وارد حساب تأییدشده شو.')}
 const username=String(value||'').trim().replace(/^@/,'').toLowerCase();if(!usernameValid(username))throw Error('نام کاربری انگلیسی معتبر وارد کن.');
 const claim=await getDoc(doc(db,'usernames',username));if(!claim.exists())throw Error('این نام کاربری پیدا نشد.');
 const to=claim.data().uid;if(!to)throw Error('شناسهٔ حساب مقصد معتبر نیست.');if(to===uid)throw Error('نمی‌توانی برای خودت درخواست دوستی بفرستی.');
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
async function decide(request,status){if(request.to!==uid||request.status!=='pending')throw Error('درخواست معتبر نیست.');if(status==='declined'){try{await deleteDoc(doc(db,'friendRequests',request.id))}catch(error){console.error('Elara social decline-delete:',error);if(error?.code!=='permission-denied')throw error;await updateDoc(doc(db,'friendRequests',request.id),{status:'declined'})}}else if(status==='accepted'){await updateDoc(doc(db,'friendRequests',request.id),{status:'accepted'});window.ElaraNotify?.push?.({type:'friend',title:'دوستی تأیید شد',message:'حالا می‌توانید پیشرفت‌های مجاز را با هم ببینید.',dedupeKey:'friend-accepted:'+request.id})}else throw Error('وضعیت درخواست نامعتبر است.');await refresh()}

async function profileUidFromUsername(value){const username=String(value||'').trim().replace(/^@/,'').toLowerCase();if(!usernameValid(username))throw Error('نام کاربری معتبر وارد کن.');const claim=await getDoc(doc(db,'usernames',username));if(!claim.exists())throw Error('این نام کاربری پیدا نشد.');return claim.data().uid}
function profileSummary(person){
 const system=window.ElaraProfileSystem,view=system?.viewModel?.(person,{self:person?.uid===uid});
 if(view&&system?.composition)return '<div class="pass4-public-profile-summary">'+system.composition(view)+'</div>';
 return '<div class="elara-public-head">'+avatar(person.name)+'<div><h2>'+esc(person.name||person.username||'کاربر')+'</h2><p>@'+esc(person.username||'')+' · '+esc(title(person.xp))+' · Level '+lv(person.xp)+'</p></div><strong>'+Number(person.xp||0).toLocaleString('fa-IR')+' XP</strong></div>';
}
function renderProfile(person=state.profileView){
 const root=$('elara-profile-page');if(!root||!person)return;
 const self=person.uid===uid,relation=self?null:relationWith(person.uid),isFriend=relation?.status==='accepted',publicAllowed=person.profilePublic!==false||isFriend;
 const summary=profileSummary(person),view=window.ElaraProfileSystem?.viewModel?.(person,{self});
 if(self){
  root.innerHTML='<div class="pass4-profile-grid"><section class="elara-card wide pass4-public-profile-card">'+summary+'<p class="elara-profile-bio">'+esc(person.bio||'هنوز Bio ثبت نشده است.')+'</p><div class="pass4-profile-facts"><span>Level '+(view?.level||lv(person.xp))+'</span><span>'+esc(view?.title||title(person.xp))+'</span><span>'+Number(person.xp||0).toLocaleString('fa-IR')+' XP</span></div><div class="timer-actions"><button type="button" class="primary-button" data-profile-edit>ویرایش پروفایل</button><button type="button" class="quiet-button" data-approved-wardrobe>کمد</button></div></section></div>';
  return;
 }
 if(!publicAllowed){root.innerHTML='<section class="elara-card pass4-public-profile-card">'+summary+'<p class="muted">این کاربر نمایش عمومی پروفایلش را محدود کرده است.</p></section>';return}
 let actions='';
 if(isFriend)actions='<button type="button" class="quiet-button danger-outline" data-profile-friend-action="remove" data-request="'+esc(relation.id)+'">حذف از دوستان</button><button type="button" class="primary-button" disabled title="Challenge در گام بعد با Rule سروری فعال می‌شود">دعوت به چالش · به‌زودی</button>';
 else if(relation?.status==='pending'&&relation.from===uid)actions='<button type="button" class="quiet-button" data-profile-friend-action="cancel" data-request="'+esc(relation.id)+'">لغو درخواست دوستی</button>';
 else if(relation?.status==='pending'&&relation.to===uid)actions='<button type="button" class="primary-button" data-profile-friend-action="accept" data-request="'+esc(relation.id)+'">قبول درخواست</button><button type="button" class="quiet-button" data-profile-friend-action="decline" data-request="'+esc(relation.id)+'">رد</button>';
 else actions='<button type="button" class="primary-button" data-profile-add-friend="'+esc(person.username||'')+'">ارسال درخواست دوستی</button>';
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
async function openProfileByUsername(value){return openProfile(await profileUidFromUsername(value))}
window.ElaraSocial.openProfile=openProfile;
window.ElaraSocial.openSelfProfile=()=>openSelfProfile().catch(e=>inform(e.message||String(e)));
window.ElaraSocial.openProfileByUsername=openProfileByUsername;

async function saveProfileValues(values={}){
 if(!uid||!auth.currentUser)throw Error('ابتدا وارد حساب شو.');
 const name=String(values.name??state.me?.name??'').trim().slice(0,60);
 const bio=String(values.bio??state.me?.bio??'').trim().slice(0,300);
 const username=String(values.username??state.me?.username??'').trim().toLowerCase();
 const profilePublic=values.profilePublic!==false;
 if(!name)throw Error('نام نمایشی نمی‌تواند خالی باشد.');
 if(!usernameValid(username))throw Error('نام کاربری باید ۳ تا ۲۰ نویسهٔ انگلیسی و با حرف شروع شود.');
 const profileRef=doc(db,'profiles',uid),before=state.me||{},warnings=[],applied={};
 try{await updateDoc(profileRef,{name});await updateProfile(auth.currentUser,{displayName:name});applied.name=name}
 catch(error){if(error.code==='permission-denied')warnings.push('ذخیرهٔ نام نمایشی به Firestore Rules منتشرشده نیاز دارد.');else throw error}
 try{await updateDoc(profileRef,{bio});applied.bio=bio}
 catch(error){if(error.code==='permission-denied')warnings.push('ذخیرهٔ بیوگرافی به Firestore Rules منتشرشده نیاز دارد.');else throw error}
 if(username!==before.username){
   try{await runTransaction(db,async tx=>{const own=await tx.get(profileRef);if(!own.exists())throw Error('پروفایل پیدا نشد.');const oldUsername=own.data().username,newClaim=doc(db,'usernames',username),claim=await tx.get(newClaim);if(claim.exists()&&claim.data().uid!==uid)throw Error('این نام کاربری قبلاً انتخاب شده است.');tx.set(newClaim,{uid});tx.update(profileRef,{username});if(oldUsername&&oldUsername!==username)tx.delete(doc(db,'usernames',oldUsername));});applied.username=username}
   catch(error){if(error.code==='permission-denied')warnings.push('تغییر نام کاربری بعد از انتشار Firestore Rules جدید فعال می‌شود.');else throw error}
 }
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

const ACTIVITY_CATEGORY={task:'task',habit:'habit',goal:'goal',mission:'mission',reading:'reading',book:'reading',book_clip:'reading',language:'language',exercise:'exercise',streak:'streak',ranking:'ranking'};
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
 try{await setDoc(doc(db,'activities',id),safe);return true}catch(error){console.warn('Activity sharing failed:',error);inform('ثبت فعالیت برای دوستان ناموفق بود: '+(error.code||error.message));return false}
}
window.ElaraSocial.publishActivity=publish;window.ElaraSocial.activityVisibility=activityVisibility;
function changed(){if(!uid||!state.me)return;let now;try{now=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return}if(!baseline){baseline=now;return}const day=new Date(),date=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`,beforeTasks=new Map((baseline.tasks||[]).map(x=>[x.id,x]));for(const task of now.tasks||[]){const before=beforeTasks.get(task.id);const completedNow=task.recurrenceRule?(task.occurrenceDone||[]).includes(date):task.completed;const completedBefore=task.recurrenceRule?(before?.occurrenceDone||[]).includes(date):before?.completed;if(completedNow&&!completedBefore)void publish('task')}const beforeHabits=new Map((baseline.habits||[]).map(x=>[x.id,x]));for(const habit of now.habits||[])if((habit.days||[]).includes(date)&&!(beforeHabits.get(habit.id)?.days||[]).includes(date))void publish('habit');baseline=now}
window.addEventListener('elara:hydrate',e=>{baseline=e.detail||{};setTimeout(refresh,500)});window.addEventListener('elara:data-changed',changed);
document.addEventListener('click',async e=>{
 const open=e.target.closest('[data-open-profile]');if(open?.dataset.openProfile){try{await openProfile(open.dataset.openProfile)}catch(error){inform(error.message||String(error))}return}
 if(e.target.closest('[data-profile-lookup]')){try{await openProfileByUsername($('elara-add-friend-name')?.value)}catch(error){inform(error.message||String(error))}return}
 const add=e.target.closest('[data-profile-add-friend]');if(add){add.disabled=true;try{const target=await addFriend(add.dataset.profileAddFriend);await openProfile(target)}catch(error){inform(socialError('profile-add-friend',error))}finally{add.disabled=false}return}
 const action=e.target.closest('[data-profile-friend-action]');if(action){const req=state.requests.find(r=>r.id===action.dataset.request);if(!req)return;action.disabled=true;try{if(action.dataset.profileFriendAction==='remove')await removeFriend(req);else if(action.dataset.profileFriendAction==='cancel')await cancelRequest(req);else await decide(req,action.dataset.profileFriendAction==='accept'?'accepted':'declined');if(state.profileView?.uid&&state.profileView.uid!==uid){try{await openProfile(state.profileView.uid)}catch{window.ElaraOpen?.('social')}}}catch(error){inform(socialError('profile-friend-action',error))}finally{action.disabled=false}return}
 if(e.target.id==='elara-delete-activity'){const b=e.target;b.disabled=true;try{if(!uid)throw Error('وارد حساب نشده‌ای.');const docs=await getDocs(query(collection(db,'activities'),where('uid','==',uid)));for(const a of docs.docs)await deleteDoc(a.ref);$('elara-delete-activity-status').textContent='فعالیت‌های قبلی پاک شدند.';await refresh()}catch(error){$('elara-delete-activity-status').textContent=error.message||String(error)}finally{b.disabled=false}}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='elara-profile-form'){e.preventDefault();const b=e.target.querySelector('[type=submit]');b.disabled=true;const status=$('elara-profile-save-status');try{const warnings=await saveMyProfile();if(status)status.textContent=warnings.length?'✓ نام و Bio ذخیره شد. '+warnings.join(' '):'✓ پروفایل ذخیره شد.'}catch(error){if(status)status.textContent=error.message||String(error)}finally{b.disabled=false}return}
 if(e.target.id!=='elara-add-friend')return;e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;try{await addFriend($('elara-add-friend-name').value);e.target.reset();$('elara-social-message').textContent='درخواست فرستاده شد.'}catch(error){$('elara-social-message').textContent=socialError('friend-form',error)}finally{button.disabled=false}
});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-friend-action],[data-social-refresh]');if(!b)return;if(b.hasAttribute('data-social-refresh')){void refresh();return}const req=state.requests.find(r=>r.id===b.dataset.request);if(!req)return;b.disabled=true;try{await decide(req,b.dataset.friendAction==='accept'?'accepted':'declined')}catch(error){inform(socialError('friend-action',error))}finally{b.disabled=false}});
onAuthStateChanged(auth,async user=>{uid=null;state.me=null;state.friends=[];state.requests=[];state.activities=[];state.profileView=null;baseline=null;if(!user){render();return}if(user.emailVerified){try{if(await obtain()){baseline=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');await refresh()}}catch(error){console.error('Social auth:',error)}}});
window.addEventListener('elara:account-ready',()=>{if(auth.currentUser?.emailVerified)refresh().catch(error=>inform(socialError('account-ready-refresh',error)))})
