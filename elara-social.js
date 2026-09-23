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
function relationWith(other){return state.requests.find(r=>r.other===other&&r.status!=='declined')||null}
async function obtain(){const user=auth.currentUser;if(!user?.emailVerified)return false;const result=await getDoc(doc(db,'profiles',user.uid));if(!result.exists())return false;state.me={uid:user.uid,...result.data()};uid=user.uid;return true}
async function refresh(){if(busy){rerun=true;return}if(!(await obtain()))return;busy=true;const mine=uid,gen=++generation;try{
 const [incoming,outgoing]=await Promise.all(['to','from'].map(field=>getDocs(query(collection(db,'friendRequests'),where(field,'==',mine)))));
 if(auth.currentUser?.uid!==mine)return;
 const entries=new Map([...incoming.docs,...outgoing.docs].map(s=>[s.id,{id:s.id,...s.data()}]));
 const enriched=[];for(const request of entries.values()){const other=request.from===mine?request.to:request.from;try{const p=await getDoc(doc(db,'profiles',other));if(p.exists())enriched.push({...request,other,person:{uid:other,...p.data()}})}catch(error){console.warn('Profile unavailable:',other,error.code||error.message)}}
 if(auth.currentUser?.uid!==mine)return;
 state.requests=enriched;state.friends=enriched.filter(r=>r.status==='accepted').map(r=>r.person).filter((p,i,a)=>a.findIndex(v=>v.uid===p.uid)===i);
 const recent=[];for(const friend of state.friends.slice(0,12)){const docs=await getDocs(query(collection(db,'activities'),where('uid','==',friend.uid)));for(const event of docs.docs){const a=event.data();recent.push({id:event.id,person:friend,...a,ms:a.createdAt?.toMillis?.()||0})}}
 if(auth.currentUser?.uid!==mine)return;state.activities=recent.sort((a,b)=>b.ms-a.ms).slice(0,30);state.error='';if(gen===generation)render();
 }catch(error){console.error('Elara friends:',error);state.error=error.code==='permission-denied'?'قوانین اجتماعی/پروفایل باید در Firestore Rules منتشر شوند.':error.message||'خطا در دریافت اطلاعات دوستان';render()}finally{busy=false;if(rerun){rerun=false;void refresh()}}}
window.ElaraSocial.refresh=refresh;

async function addFriend(value){if(!state.me)throw Error('ابتدا وارد حساب شو.');const username=String(value||'').trim().replace(/^@/,'').toLowerCase();if(!usernameValid(username))throw Error('نام کاربری انگلیسی معتبر وارد کن.');const claim=await getDoc(doc(db,'usernames',username));if(!claim.exists())throw Error('این نام کاربری پیدا نشد.');const to=claim.data().uid;if(to===uid)throw Error('نمی‌توانی خودت را به دوستانت اضافه کنی.');const active=state.requests.find(r=>r.other===to&&r.status!=='declined');if(active)throw Error(active.status==='accepted'?'قبلاً دوست شده‌اید.':'یک درخواست برای این کاربر در جریان است.');const ref=doc(db,'friendRequests',uid+'_'+to),existing=await getDoc(ref);if(existing.exists())await updateDoc(ref,{status:'pending'});else await setDoc(ref,{from:uid,to,status:'pending'});await refresh();return to}
async function cancelRequest(request){if(request.from!==uid||request.status!=='pending')throw Error('درخواست قابل لغو نیست.');await deleteDoc(doc(db,'friendRequests',request.id));await refresh()}
async function removeFriend(request){if(request.status!=='accepted'||(request.from!==uid&&request.to!==uid))throw Error('دوستی معتبر نیست.');await deleteDoc(doc(db,'friendRequests',request.id));await refresh()}
async function decide(request,status){if(request.to!==uid||request.status!=='pending')throw Error('درخواست معتبر نیست.');await updateDoc(doc(db,'friendRequests',request.id),{status});await refresh()}

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

function render(){if(!$('elara-social-page'))return;const incoming=state.requests.filter(r=>r.to===uid&&r.status==='pending'),outgoing=state.requests.filter(r=>r.from===uid&&r.status==='pending');
 const requests=incoming.map(r=>`<div class="elara-item">${avatar(r.person.name)}${profile(r.person)}<button type="button" class="primary-button" data-friend-action="accept" data-request="${esc(r.id)}">قبول</button><button type="button" class="quiet-button" data-friend-action="decline" data-request="${esc(r.id)}">رد</button></div>`).join('')||'<p class="muted">درخواست دریافتی نداری.</p>';
 const friends=state.friends.map(p=>{const rel=relationWith(p.uid);return `<div class="elara-item">${avatar(p.name)}${profile(p)}<span class="muted">${Number(p.xp||0).toLocaleString('fa-IR')} XP</span><button type="button" class="mini-button danger" data-profile-friend-action="remove" data-request="${esc(rel?.id||'')}">حذف</button></div>`}).join('')||'<p class="muted">هنوز دوستی اینجا نیست؛ یک درخواست دوستی بفرست.</p>';
 const activities=state.activities.map(a=>`<div class="elara-item">${avatar(a.person.name)}${profile(a.person)}<span class="elara-social-info"><small>${a.type==='task'?'یک کار را تکمیل کرد':'یک عادت روزانه را انجام داد'} · ${a.ms?new Date(a.ms).toLocaleString('fa-IR'):'همین حالا'}</small></span></div>`).join('')||'<p class="muted">هنوز فعالیت اشتراک‌گذاری‌شده‌ای ثبت نشده است.</p>';
 $('elara-social-page').innerHTML=`<div class="elara-stats"><div class="elara-stat"><strong>${state.friends.length}</strong><small>دوستت</small></div><div class="elara-stat"><strong>${incoming.length}</strong><small>درخواست دوستی</small></div><div class="elara-stat"><strong>${outgoing.length}</strong><small>درخواست فرستاده شده</small></div></div><div class="elara-social-grid"><section class="elara-card wide"><h2>پیداکردن کاربر</h2><form class="inline-form" id="elara-add-friend"><input id="elara-add-friend-name" required pattern="[a-z][a-z0-9_]{2,19}" placeholder="username" aria-label="نام کاربری انگلیسی دوست"><button type="submit" class="primary-button">ارسال درخواست</button><button type="button" class="quiet-button" data-profile-lookup>مشاهده پروفایل</button><button type="button" class="quiet-button" data-social-refresh>به‌روزرسانی</button></form><p id="elara-social-message" class="elara-message">${esc(state.error)}</p></section><section class="elara-card"><h2>درخواست‌های دوستی</h2>${requests}</section><section class="elara-card"><h2>دوستان من</h2>${friends}</section><section class="elara-card wide"><h2>فعالیت واقعی دوستان</h2><p class="muted">فقط خلاصهٔ فعالیت‌هایی که دوستت با رضایت به اشتراک گذاشته؛ عنوان خصوصی کارها نمایش داده نمی‌شود.</p>${activities}</section></div>`;
 const self=state.me?{...state.me,xp:Number(state.me.xp)||0}:null,ranking=[self,...state.friends].filter(Boolean).sort((a,b)=>(Number(b.xp)||0)-(Number(a.xp)||0));
 const lines=ranking.map((p,i)=>`<div class="elara-rank-line pass3-rank-line ${p.uid===uid?'is-self':''} ${i<3?'is-top-'+(i+1):''}"><b class="pass3-rank-number">${i+1}</b>${avatar(p.name)}${profile(p)}<span class="pass3-rank-xp">${Number(p.xp||0).toLocaleString('fa-IR')} XP</span></div>`).join('');
 $('elara-ranking-page').innerHTML=`<div class="elara-social-grid pass3-ranking-grid"><section class="elara-card wide pass3-ranking-card"><header><div><h2>${ico('ranking')} رنکینگ این هفته</h2><p class="muted">رتبه فقط از XP واقعی خودت و دوستات ساخته می‌شود.</p></div><button type="button" class="quiet-button" data-social-refresh>به‌روزرسانی</button></header><div class="pass3-ranking-list">${lines||'<div class="pass3-empty-state">هنوز دادهٔ رتبه‌بندی برای این حساب آماده نیست.</div>'}</div></section><section class="elara-card pass3-social-entry"><h2>${ico('friends')} دوستان و درخواست‌ها</h2><p class="muted">دوست‌ها، درخواست‌های دوستی و فعالیت‌های به‌اشتراک‌گذاشته‌شده را ببین.</p><button type="button" class="primary-button" data-elara-tab="social">رفتن به اجتماع</button></section><section class="elara-card pass3-coming-card"><h2>${ico('spark')} باشگاه‌ها، جهانی و کافه</h2><p class="muted">باشگاه‌ها، رنکینگ جهانی و کافه به Backend و قرارداد حریم خصوصی مستقل نیاز دارند.</p><span class="pass3-soon-pill">در راه</span></section><section class="elara-card wide"><h2>لقب‌های مسیر (۱۰ سطح)</h2><div class="elara-title-grid">${window.ElaraLevels?.titles.map((t,i)=>`<span class="elara-title-pill">${i+1>lv(self?.xp)?ico('lock'):ico('spark')} ${i+1} · ${esc(t)}</span>`).join('')||''}</div></section></div>`;
 $('elara-home-activity').innerHTML=state.activities.slice(0,4).map(a=>`<div class="elara-item">${avatar(a.person.name)}${profile(a.person)}<span class="elara-social-info"><small>${a.type==='task'?'یک کار را تکمیل کرد':'یک عادت را انجام داد'}</small></span></div>`).join('')||'<p class="muted">دوستانت باید اشتراک‌گذاری خلاصه فعالیت را فعال کنند.</p>';
 $('elara-home-social').innerHTML=`<div class="pass3-home-friend-list">${state.friends.slice(0,3).map(p=>`<div class="pass3-home-friend">${avatar(p.name)}<div><strong>${esc(p.name||p.username||'دوستت')}</strong><small>${Number(p.xp||0).toLocaleString('fa-IR')} XP</small></div></div>`).join('')||'<p class="muted">هنوز دوستی اینجا نیست.</p>'}</div><p class="muted">${incoming.length?incoming.length.toLocaleString('fa-IR')+' درخواست دوستی تازه':'درخواست تازه‌ای نداری'}</p><button type="button" data-elara-tab="social" class="primary-button">دوستان و درخواست‌ها</button>`;
 $('elara-home-ranks').innerHTML=lines||'<p class="muted">هنوز رتبه‌ای ثبت نشده است.</p>';
 if(state.profileView){const refreshed=state.profileView.uid===uid?state.me:state.friends.find(x=>x.uid===state.profileView.uid)||state.profileView;state.profileView=refreshed;renderProfile(refreshed)}
 window.dispatchEvent(new Event('elara:social-updated'));
}
async function publish(type){if(!uid||localStorage.getItem('elara_share_activity_'+uid)!=='yes'||!auth.currentUser?.emailVerified)return;const id=uid+'_'+crypto.randomUUID();try{await setDoc(doc(db,'activities',id),{uid,type,eventKey:id,createdAt:serverTimestamp()})}catch(error){console.warn('Activity sharing failed:',error);inform('ثبت فعالیت برای دوستان ناموفق بود: '+(error.code||error.message))}}
function changed(){if(!uid||!state.me)return;let now;try{now=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return}if(!baseline){baseline=now;return}const day=new Date(),date=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`,beforeTasks=new Map((baseline.tasks||[]).map(x=>[x.id,x]));for(const task of now.tasks||[]){const before=beforeTasks.get(task.id);const completedNow=task.recurrenceRule?(task.occurrenceDone||[]).includes(date):task.completed;const completedBefore=task.recurrenceRule?(before?.occurrenceDone||[]).includes(date):before?.completed;if(completedNow&&!completedBefore)void publish('task')}const beforeHabits=new Map((baseline.habits||[]).map(x=>[x.id,x]));for(const habit of now.habits||[])if((habit.days||[]).includes(date)&&!(beforeHabits.get(habit.id)?.days||[]).includes(date))void publish('habit');baseline=now}
window.addEventListener('elara:hydrate',e=>{baseline=e.detail||{};setTimeout(refresh,500)});window.addEventListener('elara:data-changed',changed);
document.addEventListener('click',async e=>{
 const open=e.target.closest('[data-open-profile]');if(open?.dataset.openProfile){try{await openProfile(open.dataset.openProfile)}catch(error){inform(error.message||String(error))}return}
 if(e.target.closest('[data-profile-lookup]')){try{await openProfileByUsername($('elara-add-friend-name')?.value)}catch(error){inform(error.message||String(error))}return}
 const add=e.target.closest('[data-profile-add-friend]');if(add){add.disabled=true;try{const target=await addFriend(add.dataset.profileAddFriend);await openProfile(target)}catch(error){inform(error.message||String(error))}finally{add.disabled=false}return}
 const action=e.target.closest('[data-profile-friend-action]');if(action){const req=state.requests.find(r=>r.id===action.dataset.request);if(!req)return;action.disabled=true;try{if(action.dataset.profileFriendAction==='remove')await removeFriend(req);else if(action.dataset.profileFriendAction==='cancel')await cancelRequest(req);else await decide(req,action.dataset.profileFriendAction==='accept'?'accepted':'declined');if(state.profileView?.uid&&state.profileView.uid!==uid){try{await openProfile(state.profileView.uid)}catch{window.ElaraOpen?.('social')}}}catch(error){inform(error.message||String(error))}finally{action.disabled=false}return}
 if(e.target.id==='elara-delete-activity'){const b=e.target;b.disabled=true;try{if(!uid)throw Error('وارد حساب نشده‌ای.');const docs=await getDocs(query(collection(db,'activities'),where('uid','==',uid)));for(const a of docs.docs)await deleteDoc(a.ref);$('elara-delete-activity-status').textContent='فعالیت‌های قبلی پاک شدند.';await refresh()}catch(error){$('elara-delete-activity-status').textContent=error.message||String(error)}finally{b.disabled=false}}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='elara-profile-form'){e.preventDefault();const b=e.target.querySelector('[type=submit]');b.disabled=true;const status=$('elara-profile-save-status');try{const warnings=await saveMyProfile();if(status)status.textContent=warnings.length?'✓ نام و Bio ذخیره شد. '+warnings.join(' '):'✓ پروفایل ذخیره شد.'}catch(error){if(status)status.textContent=error.message||String(error)}finally{b.disabled=false}return}
 if(e.target.id!=='elara-add-friend')return;e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;try{await addFriend($('elara-add-friend-name').value);e.target.reset();$('elara-social-message').textContent='درخواست فرستاده شد.'}catch(error){$('elara-social-message').textContent=error.message||String(error)}finally{button.disabled=false}
});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-friend-action],[data-social-refresh]');if(!b)return;if(b.hasAttribute('data-social-refresh')){void refresh();return}const req=state.requests.find(r=>r.id===b.dataset.request);if(!req)return;b.disabled=true;try{await decide(req,b.dataset.friendAction==='accept'?'accepted':'declined')}catch(error){inform(error.message||String(error))}finally{b.disabled=false}});
onAuthStateChanged(auth,async user=>{uid=null;state.me=null;state.friends=[];state.requests=[];state.activities=[];state.profileView=null;baseline=null;if(!user){render();return}if(user.emailVerified){try{if(await obtain()){baseline=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');await refresh()}}catch(error){console.error('Social auth:',error)}}});