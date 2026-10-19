/* Elara online phase: real accounts, private data, username reservations, and friends. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendEmailVerification,sendPasswordResetEmail,updateProfile,updatePassword,reauthenticateWithCredential,EmailAuthProvider} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,updateDoc,serverTimestamp,runTransaction,collection,query,where,getDocs,deleteDoc} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const app = initializeApp({
  apiKey:'AIzaSyBpCsIvc3A8sLrdvUiaGDQjMH6qE9lUTGo',
  authDomain:'elara-ab1aa.firebaseapp.com',
  projectId:'elara-ab1aa', storageBucket:'elara-ab1aa.firebasestorage.app',
  messagingSenderId:'233944066611', appId:'1:233944066611:web:1be816fd2dc053cea01146'
});
// Use the Firebase SDK default transport with automatic long-polling detection when needed.
const auth=getAuth(app), db=getFirestore(app), $=id=>document.getElementById(id);
const layer=$('cloud-layer'), status=$('cloud-status'), retry=$('cloud-retry');
const empty=()=>({version:1,tasks:[],pinnedFriendIds:[],accountLinkSeen:{},accountLinkDefaultMode:'private',habits:[],goals:[],books:[],bookShelves:[],bookClips:[],words:[],taskLists:[],folders:[],tags:[],linkedTaskDismissals:[],focusSessions:[],activeFocus:null,focusPlanProgress:null,taskCompletionHistory:[],missionRewardClaims:[],xp:0,theme:'dark'});
const safe=s=>String(s??'').trim();
const usernameValid=s=>/^[a-z][a-z0-9_]{2,19}$/.test(s);
let user=null, profile=null, loaded=false, saving=false, dirty=false, timer=null, lastPayload='';
function message(s){status.textContent=s;}
function notify(s){const t=$('toast');if(!t)return;t.textContent=s;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),4500);}
function actionError(e){
  console.error('Elara account:',e);
  return ({
    'auth/email-already-in-use':'این ایمیل از قبل ثبت شده. از ورود استفاده کن.',
    'auth/invalid-credential':'ایمیل یا رمز اشتباه است.',
    'auth/weak-password':'رمز عبور باید حداقل ۶ نویسه باشد.',
    'auth/invalid-email':'فرمت ایمیل درست نیست.',
    'auth/user-disabled':'این حساب غیرفعال شده است.',
    'auth/too-many-requests':'تلاش‌های زیادی انجام شده؛ چند دقیقه صبر کن و دوباره امتحان کن.',
    'auth/operation-not-allowed':'ورود ایمیل/رمز در Firebase فعال نیست.',
    'auth/unauthorized-domain':'این دامنه در Firebase Authentication مجاز نشده است.',
    'auth/network-request-failed':'ارتباط مرورگر با Firebase Auth برقرار نشد. VPN/Proxy/DNS یا تنظیمات شبکهٔ همین دستگاه را بررسی کن.',
    'permission-denied':'دسترسی Firestore رد شد. قوانین firestore.rules باید در پروژه اعمال شوند.',
    'unavailable':'اتصال به Cloud Firestore برقرار نشد. اگر با تلاش دوباره رفع نشد، دسترسی مرورگر به firestore.googleapis.com و تنظیمات VPN، Proxy و افزونه‌های مسدودکننده را بررسی کن.'
  })[e.code] || (e.code ? e.code+': '+(e.message||'خطا') : (e.message||'خطایی رخ داد.'));
}
function locked(){
  loaded=false;
  if(window.__elaraLocalFallbackActive===true){
    document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready','cloud-offline');
    if(layer){layer.hidden=true;layer.inert=true;layer.style.pointerEvents='none';layer.setAttribute('aria-hidden','true')}
    return;
  }
  document.body.classList.add('cloud-locked');document.body.classList.remove('cloud-ready','cloud-offline');
  if(layer){layer.hidden=false;layer.inert=false;layer.style.pointerEvents='';layer.removeAttribute('aria-hidden')}
}
function unlocked(){
  window.__elaraLocalFallbackActive=false;
  document.body.classList.remove('cloud-locked','cloud-offline');document.body.classList.add('cloud-ready');
  if(layer){layer.hidden=true;layer.inert=true;layer.style.pointerEvents='';layer.removeAttribute('aria-hidden')}
}
function clearAccount(){
  locked(); user=null;profile=null;lastPayload='';dirty=false;
  localStorage.removeItem('elara_space_v1');
  window.ElaraPrivateState?.reset?.();
  window.ElaraPrivateChatMemory?.reset?.();
  sessionStorage.removeItem('elara_pending_profile');
  window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:empty()}));
}
function form(mode='login'){
  locked();
  layer.replaceChildren();
  const wrap=document.createElement('div');wrap.className='cloud-card cloud-auth-card';
  const intro=document.createElement('div');intro.className='cloud-login-intro';intro.setAttribute('aria-hidden','true');intro.innerHTML='<span class="cloud-comet c1"></span><span class="cloud-comet c2"></span><span class="cloud-comet c3"></span><span class="cloud-comet c4"></span><div class="cloud-logo-reveal"><img src="assets/logo.svg" alt=""><b>ELARA SPACE</b></div>';
  const title=document.createElement('h2');title.textContent=mode==='register'?'Create an account':'Welcome to Elara';
  const sub=document.createElement('p');sub.className='muted';sub.textContent=mode==='register'?'حساب اختصاصی و دوستان واقعی':'برای نمایش اطلاعات خصوصی خودت وارد شو.';
  const f=document.createElement('form');f.id='cloud-form';
  const inp=(name,placeholder,type='text',required=true)=>{const el=document.createElement('input');el.name=name;el.placeholder=placeholder;el.type=type;el.required=required;el.autocomplete=name==='password'?'current-password':name==='email'?'email':'off';el.maxLength=name==='username'?20:120;return el;};
  const passwordField=(name,placeholder,autocomplete)=>{
    const wrap=document.createElement('div');wrap.className='password-field';
    const input=inp(name,placeholder,'password');input.autocomplete=autocomplete;
    const toggle=document.createElement('button');toggle.type='button';toggle.className='password-toggle';toggle.setAttribute('aria-label','نمایش رمز عبور');toggle.setAttribute('aria-pressed','false');
    const eye=hidden=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/>'+(hidden?'<path d="m4 4 16 16"/>':'')+'</svg>';
    toggle.innerHTML=eye(false);
    toggle.addEventListener('click',()=>{const show=input.type==='password';input.type=show?'text':'password';toggle.innerHTML=eye(show);toggle.setAttribute('aria-label',show?'پنهان کردن رمز عبور':'نمایش رمز عبور');toggle.setAttribute('aria-pressed',String(show));input.focus({preventScroll:true});});
    wrap.append(input,toggle);return {wrap,input};
  };
  const email=inp('email','Email','email');f.append(email);
  const passField=passwordField('password','Password',mode==='register'?'new-password':'current-password');const pass=passField.input;pass.minLength=6;f.append(passField.wrap);
  if(mode==='register'){
    const confField=passwordField('confirm','Confirm password','new-password');f.append(confField.wrap);
    const uname=inp('username','Username (a-z, 0-9, _)');uname.pattern='[a-z][a-z0-9_]{2,19}';uname.autocomplete='username';f.append(uname);
    f.append(inp('name','Display name'));
  }
  const send=document.createElement('button');send.type='submit';send.className='primary-button';send.textContent=mode==='register'?'ثبت‌نام و ارسال لینک تأیید ایمیل':'ورود';f.append(send);
  const switcher=document.createElement('button');switcher.type='button';switcher.className='quiet-button';switcher.textContent=mode==='register'?'حساب دارم · ورود':'حساب ندارم · ثبت‌نام';switcher.addEventListener('click',()=>form(mode==='register'?'login':'register'));
  const forgot=document.createElement('button');forgot.type='button';forgot.className='mini-button';forgot.textContent='فراموشی رمز';forgot.addEventListener('click',async()=>{try{if(!email.value)throw new Error('اول ایمیلت را وارد کن.');await sendPasswordResetEmail(auth,email.value.trim());message('اگر این ایمیل ثبت شده باشد، لینک بازیابی ارسال می‌شود.');}catch(e){message(actionError(e));}});
  wrap.append(intro,title,sub,f,switcher);if(mode==='login')wrap.append(forgot);
  wrap.append(status,retry);wrap.dataset.elaraAccountGateReady=mode;layer.append(wrap);window.dispatchEvent(new Event('elara:account-gate-ready')); const msg=document.createElement('p');msg.id='cloud-form-message';msg.className='muted';wrap.append(msg);
  f.addEventListener('submit',async e=>{
    e.preventDefault();send.disabled=true;msg.textContent='در حال بررسی…';
    try{
      if(mode==='register'){
        if(pass.value!==f.elements.confirm.value)throw new Error('تکرار رمز عبور یکسان نیست.');
        const username=safe(f.elements.username.value).toLowerCase();
        if(!usernameValid(username))throw new Error('نام کاربری باید ۳ تا ۲۰ حرف انگلیسی کوچک، عدد یا زیرخط باشد و با حرف شروع شود.');
        // A signed-out browser cannot read username claims; the transaction reserves the name after email verification.
        sessionStorage.setItem('elara_pending_profile',JSON.stringify({username,name:safe(f.elements.name.value).slice(0,60)}));
        const result=await createUserWithEmailAndPassword(auth,email.value.trim(),pass.value);
        await updateProfile(result.user,{displayName:safe(f.elements.name.value).slice(0,60)});
        await sendEmailVerification(result.user);
        message('لینک تأیید ایمیل ارسال شد. صندوق ایمیل و Spam را بررسی کن.');
      }else await signInWithEmailAndPassword(auth,email.value.trim(),pass.value);
    }catch(err){msg.textContent=actionError(err);send.disabled=false;}
  });
}
function verify(){
  locked();layer.replaceChildren();const wrap=document.createElement('div');wrap.className='cloud-card';
  const h=document.createElement('h2');h.textContent='تأیید ایمیل ✉';
  const p=document.createElement('p');p.className='muted';p.textContent='لینک تأیید رو در ایمیلت باز کن؛ بعد روی «بررسی دوباره» بزن.';
  const check=btn('ایمیلم رو تأیید کردم',async()=>{try{await user.reload();if(user.emailVerified)await readyUser(user);else message('ایمیل هنوز تأیید نشده است.');}catch(e){message(actionError(e));}});
  const resend=btn('ارسال دوبارهٔ لینک',async()=>{try{await sendEmailVerification(user);message('لینک جدید فرستاده شد.');}catch(e){message(actionError(e));}},'quiet-button');
  const out=btn('خروج',()=>signOut(auth),'quiet-button');wrap.append(h,p,check,resend,out,status,retry);wrap.dataset.elaraAccountGateReady='verify';layer.append(wrap);message('');window.dispatchEvent(new Event('elara:account-gate-ready'));
}
function btn(label,fn,klass='primary-button'){const b=document.createElement('button');b.type='button';b.className=klass;b.textContent=label;b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){notify(actionError(e));}finally{b.disabled=false;}});return b;}
const normalizeUsername=value=>safe(value).replace(/^@/,'').toLowerCase();
function identityIntegrityError(code,message){const error=new Error(message);error.name='ElaraIdentityIntegrityError';error.identityCode=code;return error}
async function validateOwnUsernameInvariant(current,profileSnap){
  if(!current?.uid||!profileSnap?.exists?.())throw identityIntegrityError('profile-missing','پروفایل حساب پیدا نشد.');
  const canonical=normalizeUsername(profileSnap.data()?.username);
  if(!usernameValid(canonical))throw identityIntegrityError('profile-username-invalid','نام کاربری ذخیره‌شدهٔ این حساب نامعتبر است و نیاز به بررسی مالک دارد.');
  const claimSnap=await getDoc(doc(db,'usernames',canonical));
  if(!claimSnap.exists())throw identityIntegrityError('claim-missing','شاخص نام کاربری این حساب ناقص است. برای جلوگیری از تصاحب اشتباه، ابتدا ممیزی هویت انجام شود.');
  if(String(claimSnap.data()?.uid||'')!==current.uid)throw identityIntegrityError('claim-owner-mismatch','مالک شاخص نام کاربری با این حساب یکسان نیست. تغییر خودکار انجام نشد.');
  return canonical;
}
async function resolveCanonicalUsername(value){
  const username=normalizeUsername(value);if(!usernameValid(username))throw new Error('نام کاربری معتبر نیست.');
  const claimSnap=await getDoc(doc(db,'usernames',username));if(!claimSnap.exists())throw new Error('چنین نام کاربری‌ای پیدا نشد.');
  const claimedUid=String(claimSnap.data()?.uid||'');if(!claimedUid)throw identityIntegrityError('claim-uid-missing','شاخص نام کاربری خراب است و شناسهٔ مالک ندارد.');
  const profileSnap=await getDoc(doc(db,'profiles',claimedUid));if(!profileSnap.exists())throw identityIntegrityError('claim-profile-missing','شاخص نام کاربری به پروفایل موجودی اشاره نمی‌کند.');
  if(normalizeUsername(profileSnap.data()?.username)!==username)throw identityIntegrityError('claim-profile-mismatch','شاخص نام کاربری با پروفایل مقصد همخوان نیست؛ برای امنیت، این نتیجه استفاده نشد.');
  return {uid:claimedUid,username,profile:profileSnap.data()};
}
async function reserveUsername(username,name){
  username=normalizeUsername(username);if(!usernameValid(username))throw new Error('نام کاربری معتبر نیست.');
  const claim=doc(db,'usernames',username),p=doc(db,'profiles',user.uid);
  await runTransaction(db,async tx=>{
    const c=await tx.get(claim),old=await tx.get(p);
    if(!old.exists()){
      if(c.exists()){
        if(String(c.data()?.uid||'')!==user.uid)throw new Error('این نام کاربری قبلاً انتخاب شده. نام دیگری وارد کن.');
        throw identityIntegrityError('claim-without-profile','شاخص @'+username+' از قبل به این حساب اشاره می‌کند اما پروفایل وجود ندارد. برای جلوگیری از duplicate legacy، ساخت خودکار متوقف شد.');
      }
      tx.set(claim,{uid:user.uid});
      tx.set(p,{username,name:name.slice(0,60),bio:'',xp:0});
      return;
    }
    const existing=normalizeUsername(old.data()?.username);
    if(!usernameValid(existing))throw identityIntegrityError('existing-profile-invalid','پروفایل موجود نام کاربری معتبر ندارد و نیاز به بررسی مالک دارد.');
    if(existing!==username)throw identityIntegrityError('existing-profile-different-username','این حساب قبلاً نام کاربری @'+existing+' دارد؛ ساخت پروفایل دوم متوقف شد.');
    if(!c.exists())throw identityIntegrityError('existing-profile-claim-missing','پروفایل موجود است اما شاخص @'+existing+' وجود ندارد. ترمیم خودکار انجام نشد تا ابتدا duplicateهای قدیمی ممیزی شوند.');
    if(String(c.data()?.uid||'')!==user.uid)throw identityIntegrityError('existing-profile-claim-conflict','پروفایل موجود و شاخص @'+existing+' مالک‌های متفاوت دارند. هیچ claimی بازنویسی نشد.');
  });
  sessionStorage.removeItem('elara_pending_profile');
}
function showIdentityRepair(error){
  locked();layer.replaceChildren();const wrap=document.createElement('div');wrap.className='cloud-card identity-repair-card';wrap.dataset.elaraAccountGateReady='identity-repair';
  const h=document.createElement('h2');h.textContent='نیاز به بررسی هویت حساب';
  const p=document.createElement('p');p.textContent=error?.message||'نام کاربری و شاخص مالکیت حساب با هم سازگار نیستند.';
  const note=document.createElement('p');note.className='muted';note.textContent='برای جلوگیری از تصاحب یا بازشدن پروفایل اشتباه، هیچ claim یا پروفایلی خودکار بازنویسی نشد.';
  const code=document.createElement('small');code.className='muted';code.textContent='Identity check: '+String(error?.identityCode||'integrity-error');
  const actions=document.createElement('div');actions.className='timer-actions';
  actions.append(btn('بررسی دوباره',async()=>{if(auth.currentUser)await readyUser(auth.currentUser)}),btn('خروج',()=>signOut(auth),'quiet-button'));
  wrap.append(h,p,note,code,actions);layer.append(wrap);message('');window.dispatchEvent(new Event('elara:account-gate-ready'));
}
function chooseUsername(){
  locked();layer.replaceChildren();const wrap=document.createElement('div');wrap.className='cloud-card';
  const h=document.createElement('h2');h.textContent='پروفایلت رو بساز';
  const p=document.createElement('p');p.className='muted';p.textContent='نام کاربری یکتا برای پیدا کردنت توسط دوست‌ها استفاده می‌شه.';
  const f=document.createElement('form');const pending=JSON.parse(sessionStorage.getItem('elara_pending_profile')||'{}');
  const name=document.createElement('input');name.placeholder='نام نمایشی';name.value=pending.name||user.displayName||'';name.required=true;name.maxLength=60;
  const uname=document.createElement('input');uname.placeholder='username';uname.value=pending.username||'';uname.required=true;uname.maxLength=20;uname.pattern='[a-z][a-z0-9_]{2,19}';
  const ok=document.createElement('button');ok.className='primary-button';ok.textContent='ثبت نام کاربری';f.append(name,uname,ok);
  f.addEventListener('submit',async e=>{e.preventDefault();ok.disabled=true;try{const v=safe(uname.value).toLowerCase();if(!usernameValid(v))throw new Error('نام کاربری باید ۳ تا ۲۰ نویسه انگلیسی باشد و با حرف شروع شود.');await reserveUsername(v,safe(name.value));await readyUser(user);}catch(err){message(actionError(err));}finally{ok.disabled=false;}});
  wrap.append(h,p,f,btn('خروج',()=>signOut(auth),'quiet-button'),status,retry);wrap.dataset.elaraAccountGateReady='profile';layer.append(wrap);message('');window.dispatchEvent(new Event('elara:account-gate-ready'));
}
async function readyUser(current){
  locked();user=current;
  message('در حال دریافت پروفایل حساب…');
  const p=await getDoc(doc(db,'profiles',user.uid));
  if(!p.exists()){chooseUsername();return;}
  await validateOwnUsernameInvariant(current,p);
  profile=p.data();
  message('در حال دریافت اطلاعات شخصی از Firestore…');
  const remote=await getDoc(doc(db,'private',user.uid,'app','main'));
  if(auth.currentUser?.uid!==current.uid) return;
  const content=remote.exists()?remote.data().payload:empty();
  // Trial mode uses ephemeral RAM; the verified per-user Firestore record is authoritative.
  // Do not alter the legacy on-disk snapshot: old un-synced data might still need recovery.
  const privateTrial=window.ElaraPrivateState?.requested===true;
  if(privateTrial&&!window.ElaraPrivateState?.supported)throw new Error('حالت ذخیره‌سازی سروری در این مرورگر آماده نیست. از حالت عادی استفاده کن.');
  if(privateTrial){
    if(!remote.exists())await setDoc(doc(db,'private',current.uid,'app','main'),{payload:content,updatedAt:serverTimestamp()});
    if(auth.currentUser?.uid!==current.uid)return;
    window.ElaraPrivateState.activate(current.uid);
  }
  // Never automatically import another account's (or the old guest's) local data.
  const old=privateTrial?null:localStorage.getItem('elara_space_v1');
  if(old && !sessionStorage.getItem('elara_backup_saved')){
    localStorage.setItem('elara_precloud_backup',old);
    sessionStorage.setItem('elara_backup_saved','1');
  }
  localStorage.setItem('elara_space_v1',JSON.stringify(content));
  window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:content}));
  lastPayload=JSON.stringify(content);dirty=false;loaded=true;
  renderAccount();unlocked();
  window.dispatchEvent(new Event('elara:account-ready'));
  // Write an empty account document on first use. Its absence never imports old guest data.
  if(!remote.exists()&&!privateTrial)await setDoc(doc(db,'private',user.uid,'app','main'),{payload:content,updatedAt:serverTimestamp()});
}
async function flush(){
  if(!loaded||!user||!dirty||saving)return;
  saving=true;dirty=false;
  const snapshot=lastPayload, currentUid=user.uid;
  try{
    const payload=JSON.parse(snapshot);
    if(JSON.stringify(payload).length>800000)throw new Error('حجم اطلاعات از ظرفیت این نسخه بیشتر شده؛ ابتدا از داده‌ها بکاپ بگیر.');
    await setDoc(doc(db,'private',currentUid,'app','main'),{payload,updatedAt:serverTimestamp()});
    await updateDoc(doc(db,'profiles',currentUid),{xp:Math.min(9999999,Math.max(0,Math.floor(+payload.xp||0)))});
    if(user?.uid===currentUid) $('cloud-sync').textContent='✓ ذخیره شد';
  }catch(e){dirty=true;if($('cloud-sync'))$('cloud-sync').textContent='⚠ ذخیرهٔ ابری ناموفق بود: '+actionError(e);}
  finally{saving=false;if(dirty&&user?.uid===currentUid)timer=setTimeout(flush,4000);}
}
window.addEventListener('elara:data-changed',()=>{
  if(!loaded||!user)return;
  lastPayload=localStorage.getItem('elara_space_v1')||JSON.stringify(empty());dirty=true;
  $('cloud-sync').textContent='در حال ذخیره…';clearTimeout(timer);
  timer=setTimeout(flush,window.ElaraPrivateState?.requested?250:800);
});
window.addEventListener('pagehide',()=>{if(dirty)void flush();});
// In RAM-only trial, warn before closing a tab while an update has not
// reached Firestore. A forced close or network outage can still lose drafts.
window.addEventListener('beforeunload',event=>{
  if(window.ElaraPrivateState?.requested&&(dirty||saving)){
    event.preventDefault();event.returnValue='';
  }
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&window.ElaraPrivateState?.requested&&dirty)void flush();
});
async function refreshFriends(){
  if(!loaded||!user)return;const ownUid=user.uid;
  const incoming=await getDocs(query(collection(db,'friendRequests'),where('to','==',user.uid)));
  const outgoing=await getDocs(query(collection(db,'friendRequests'),where('from','==',user.uid)));
  if(user?.uid!==ownUid)return;
  const all=new Map([...incoming.docs,...outgoing.docs].map(d=>[d.id,{id:d.id,...d.data()}]));
  const list=$('cloud-friends-list');list.replaceChildren();
  const friends=[];
  for(const req of all.values()){
    const other=req.from===user.uid?req.to:req.from;
    const p=await getDoc(doc(db,'profiles',other));if(user?.uid!==ownUid)return;if(!p.exists())continue;
    const pp=p.data();if(req.status==='accepted')friends.push({...pp,uid:other});
    const li=document.createElement('div');li.className='item';
    const txt=document.createElement('span');txt.className='item-content';txt.textContent=`@${pp.username} · ${req.status==='accepted'?'دوست':req.status==='declined'?'رد شده':req.to===user.uid?'درخواست دریافتی':'در انتظار پذیرش'}`;
    li.append(txt);
    if(req.status==='pending'&&req.to===user.uid){
      li.append(btn('قبول',()=>decide(req,'accepted'),'primary-button'),btn('رد',()=>decide(req,'declined'),'quiet-button'));
    }
    if(req.status==='pending'&&req.from===user.uid)li.append(btn('لغو',async()=>{await deleteDoc(doc(db,'friendRequests',req.id));await refreshFriends();},'quiet-button'));
    list.append(li);
  }
  if(!all.size)list.textContent='هنوز دوستی یا درخواستی نداری.';
  const rank=$('cloud-ranking');rank.replaceChildren();
  const own={...profile,uid:user.uid};
  for(const [i,p] of [own,...friends].sort((a,b)=>(Number(b.xp)||0)-(Number(a.xp)||0)).entries()){
    const el=document.createElement('div');el.className='item';el.textContent=`${i+1}. @${p.username} · ${Number(p.xp)||0} XP`;rank.append(el);
  }
}
async function decide(req,status){if(status==='declined'){try{await deleteDoc(doc(db,'friendRequests',req.id))}catch(error){console.error('Elara cloud decline-delete:',error);if(error?.code!=='permission-denied')throw error;await updateDoc(doc(db,'friendRequests',req.id),{status:'declined'})}}else await updateDoc(doc(db,'friendRequests',req.id),{status:'accepted'});await refreshFriends();}
async function addFriend(username){
  const identity=await resolveCanonicalUsername(username),to=identity.uid;if(to===user.uid)throw new Error('این نام کاربری خودته.');
  const id=`${user.uid}_${to}`,ref=doc(db,'friendRequests',id);
  try{await setDoc(ref,{from:user.uid,to,status:'pending'});await refreshFriends()}
  catch(error){console.error('Elara cloud friend request:',error);await refreshFriends().catch(()=>{});throw error}
}
function renderAccount(){
  let section=$('cloud-social');if(!section){
    section=document.createElement('section');section.id='cloud-social';section.className='surface settings-card';
    section.innerHTML='<h2>حساب و دوستان واقعی</h2><p class="muted" id="cloud-me"></p><p class="muted" id="cloud-sync"></p><div class="timer-actions"><button class="quiet-button" id="cloud-logout" type="button">خروج از حساب</button></div><h2>درخواست دوستی</h2><form id="cloud-friend-form" class="inline-form"><input id="cloud-friend-name" aria-label="نام کاربری دوست" required placeholder="نام کاربری دوست (مثلاً aren_01)"><button class="primary-button" type="submit">ارسال درخواست</button></form><div class="item-list" id="cloud-friends-list"></div><h2 style="margin-top:22px">رنکینگ دوستان</h2><p class="muted">امتیازها از فعالیت‌های ثبت‌شدهٔ هر حساب می‌آیند؛ این نسخه برای رقابت رسمی ضدتقلب نیست.</p><div class="item-list" id="cloud-ranking"></div><button id="cloud-refresh" class="quiet-button" type="button">به‌روزرسانی دوستان و رتبه‌ها</button>';
    $('panel-settings').append(section);
    $('cloud-logout').addEventListener('click',async()=>{await flush();await signOut(auth);});
    $('cloud-friend-form').addEventListener('submit',async event=>{event.preventDefault();const b=event.target.querySelector('button');b.disabled=true;try{await addFriend($('cloud-friend-name').value);event.target.reset();notify('درخواست دوستی ارسال شد.');}catch(e){notify(actionError(e));}finally{b.disabled=false;}});
    $('cloud-refresh').addEventListener('click',()=>refreshFriends().catch(e=>notify(actionError(e))));
  }
  $('cloud-me').textContent=`@${profile.username} · ${profile.name} · ${user.email}`;
  $('cloud-sync').textContent='✓ اطلاعات حساب بارگذاری شد';
  refreshFriends().catch(e=>notify(actionError(e)));
}
async function listPublishedContent(collectionName){
  const snapshot=await getDocs(query(collection(db,collectionName),where('status','==','published')));
  return snapshot.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>{
    const am=a.updatedAt?.toMillis?.()||a.updatedAt?.seconds*1000||0,bm=b.updatedAt?.toMillis?.()||b.updatedAt?.seconds*1000||0;
    return bm-am;
  });
}
window.ElaraPublicContent={
  listBlogArticles:()=>listPublishedContent('blogArticles'),
  listSitePages:()=>listPublishedContent('sitePages')
};
// Keep the account drawer's canonical snapshot current after profile edits.
window.addEventListener('elara:profile-saved',event=>{
  const detail=event.detail||{};
  if(!user?.uid||detail.uid!==user.uid||!detail.profile)return;
  profile={...profile,...detail.profile};
  const header=$('cloud-me');
  if(header)header.textContent='@'+(profile.username||'')+' · '+(profile.name||'')+' · '+(user.email||'');
});

/*
 * Per-account legacy recovery. All writes target the signed-in Firebase UID;
 * Firestore is authoritative and all existing records win conflicts.
 * Never auto-import an unidentified browser backup (it might belong to
 * another signed-in user who used the same device).
 */
const RECOVERY_FIELDS=Object.freeze([
  'tasks','habits','goals','languageClasses','books','bookClips','words',
  'focusSessions','taskCompletionHistory','missionRewardClaims',
  'linkedTaskDismissals','taskLists','folders','tags','bookShelves'
]);
const RECOVERY_NAMES=Object.freeze({
  tasks:'تسک‌ها',habits:'عادت‌ها',goals:'هدف‌ها',languageClasses:'کلاس‌های زبان',
  books:'کتاب‌ها',bookClips:'یادداشت کتاب‌ها',words:'واژه‌ها',
  focusSessions:'جلسات تمرکز',taskCompletionHistory:'سوابق انجام تسک‌ها',
  missionRewardClaims:'پاداش‌ها',linkedTaskDismissals:'اتصال‌های ردشده',
  taskLists:'لیست‌ها',folders:'پوشه‌ها',tags:'برچسب‌ها',bookShelves:'قفسه‌ها'
});
const RECOVERY_KEYS=['elara_precloud_backup','elara_space_v1'];
function recoveryUID(){
  const current=auth.currentUser;
  if(!loaded||!current?.uid||user?.uid!==current.uid||!document.body.classList.contains('cloud-ready'))
    throw new Error('اول وارد حساب خودت شو و منتظر بارگذاری کامل اطلاعات بمان.');
  return current.uid;
}
function readLegacyCopy(key){
  if(!RECOVERY_KEYS.includes(key))throw new Error('منبع بکاپ نامعتبر است.');
  const raw=typeof window.ElaraPrivateState?.readDiskSnapshot==='function'?window.ElaraPrivateState.readDiskSnapshot(key):localStorage.getItem(key);
  if(!raw)return null;
  if(raw.length>1200000)throw new Error('حجم نسخهٔ قدیمی زیاد است؛ بازیابی آن نیاز به بررسی جداگانه دارد.');
  let content;
  try{content=JSON.parse(raw)}catch{throw new Error('نسخهٔ ذخیره‌شده در مرورگر معتبر نیست.')}
  if(!content||typeof content!=='object'||Array.isArray(content)||content.version!==1)
    throw new Error('فرمت نسخهٔ قدیمی الارا پشتیبانی نمی‌شود.');
  for(const field of RECOVERY_FIELDS)if(content[field]!=null&&!Array.isArray(content[field]))
    throw new Error('ساختار '+RECOVERY_NAMES[field]+' در بکاپ قدیمی معتبر نیست.');
  return content;
}
function recoveryKeyOf(field,row){
  if(typeof row==='string')return row.trim().slice(0,250);
  if(!row||typeof row!=='object'||Array.isArray(row))return '';
  return String(field==='taskCompletionHistory'?(row.key||row.id||''):row.id||'').trim().slice(0,250);
}
function safeLegacyRow(field,row){
  if(typeof row==='string')return !!row.trim()&&row.length<=250;
  if(!row||typeof row!=='object'||Array.isArray(row)||!recoveryKeyOf(field,row))return false;
  // Only migrate private personal data; shared and linked records are managed elsewhere.
  if(row.collabSpaceId||row.shared||row.sourceManaged||row.linkedTask)return false;
  return JSON.stringify(row).length<=24000;
}
function mergedRecovery(remote,old){
  const output=structuredClone(remote&&typeof remote==='object'&&!Array.isArray(remote)?remote:empty());
  const added={},allChanges=[];
  for(const field of RECOVERY_FIELDS){
    const current=Array.isArray(output[field])?output[field].slice():[];
    const source=Array.isArray(old[field])?old[field]:[];
    const seen=new Set(current.map(row=>recoveryKeyOf(field,row)).filter(Boolean));
    let count=0;
    for(const row of source){
      const k=recoveryKeyOf(field,row);
      if(!k||seen.has(k)||!safeLegacyRow(field,row))continue;
      seen.add(k);current.push(structuredClone(row));count++;
    }
    if(count){output[field]=current;allChanges.push(field);added[field]=count;}
  }
  // Never overwrite XP, settings, profile, privacy, cloud metadata or existing items.
  output.version=1;
  if(JSON.stringify(output).length>780000)throw new Error('نتیجه از محدودیت فعلی Firebase الارا بزرگ‌تر است؛ هیچ تغییری اعمال نشد.');
  return {data:output,added,changed:allChanges.length>0};
}
function countRecoveryDifferences(remote,old){
  const added=mergedRecovery(remote,old).added;
  return Object.entries(added).map(([k,v])=>RECOVERY_NAMES[k]+': '+v+' مورد').join('، ');
}
async function recoveryStatus(){
  const uid=recoveryUID();
  const snapshot=await getDoc(doc(db,'private',uid,'app','main'));
  if(auth.currentUser?.uid!==uid)throw new Error('حساب در حین بررسی تغییر کرد.');
  const cloud=snapshot.exists()?snapshot.data()?.payload:empty();
  const sources=[];
  for(const key of RECOVERY_KEYS){
    try{
      const old=readLegacyCopy(key);
      sources.push({key,exists:!!old,details:old?countRecoveryDifferences(cloud,old):'',counts:old?{tasks:old.tasks?.length||0,goals:old.goals?.length||0,habits:old.habits?.length||0}:null});
    }catch(e){sources.push({key,exists:true,error:e.message});}
  }
  return {uid,cloudExists:snapshot.exists(),counts:{
    tasks:cloud.tasks?.length||0,goals:cloud.goals?.length||0,habits:cloud.habits?.length||0
  },sources};
}
function saveJSONDownload(filename,data){
  const json=typeof data==='string'?data:JSON.stringify(data,null,2);
  const blob=new Blob([json],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=href;a.download=filename;a.hidden=true;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),60000);
}
async function backupCloudData(){
  const uid=recoveryUID();
  if(dirty||saving)throw new Error('تغییرات هنوز در حال ذخیره‌اند. منتظر «✓ ذخیره شد» بمان.');
  const remote=await getDoc(doc(db,'private',uid,'app','main'));
  if(auth.currentUser?.uid!==uid)throw new Error('حساب تغییر کرد.');
  if(!remote.exists())throw new Error('هنوز اطلاعات سروری برای این حساب وجود ندارد.');
  const payload=remote.data()?.payload;
  if(!payload||typeof payload!=='object')throw new Error('ساختار بکاپ ابری قابل خواندن نیست.');
  saveJSONDownload('elara-cloud-backup-'+new Date().toISOString().slice(0,10)+'.json',payload);
  return true;
}
function backupLegacyData(source){
  recoveryUID();
  const data=readLegacyCopy(source);
  if(!data)throw new Error('برای این گزینه نسخهٔ قدیمی ذخیره نشده است.');
  saveJSONDownload('elara-old-browser-backup-'+source+'-'+new Date().toISOString().slice(0,10)+'.json',data);
  return true;
}
async function recoverFromBrowser(source){
  const uid=recoveryUID();
  if(dirty||saving)throw new Error('اول صبر کن تغییرات فعلی در Firebase ذخیره شوند.');
  const old=readLegacyCopy(source);
  if(!old)throw new Error('نسخهٔ قدیمی در این مرورگر پیدا نشد.');
  const ref=doc(db,'private',uid,'app','main');
  const result=await runTransaction(db,async tx=>{
    const latest=await tx.get(ref);
    const original=latest.exists()?latest.data()?.payload:empty();
    const m=mergedRecovery(original,old);
    if(m.changed)tx.set(ref,{payload:m.data,updatedAt:serverTimestamp()});
    return {count:Object.values(m.added).reduce((a,b)=>a+b,0),details:m.added,expected:m.data};
  });
  const check=await getDoc(ref);
  if(!check.exists()||JSON.stringify(check.data().payload)!==JSON.stringify(result.expected))
    throw new Error('تغییرات در Firebase ثبت شد اما تأیید نهایی کامل نیست؛ بدون تکرار عملیات، صفحه را تازه کن.');
  if(auth.currentUser?.uid!==uid)throw new Error('حساب حین انتقال تغییر کرده است؛ وضعیت سرور را دوباره بررسی کن.');
  const json=JSON.stringify(result.expected);
  localStorage.setItem('elara_space_v1',json);
  window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:result.expected}));
  lastPayload=json;dirty=false;loaded=true;
  if($('cloud-sync'))$('cloud-sync').textContent='✓ انتقال در Firebase تأیید شد';
  return result;
}
async function openRecoveryPanel(){
  recoveryUID();
  const existing=document.getElementById('elara-cloud-recovery-dialog');
  if(existing){existing.showModal?.();return;}
  const dialog=document.createElement('dialog');
  dialog.id='elara-cloud-recovery-dialog';dialog.dir='rtl';
  dialog.style.cssText='max-width:min(94vw,590px);max-height:90vh;overflow:auto;border:1px solid #6476a2;border-radius:17px;background:#101d36;color:#e9f1ff;padding:22px;line-height:1.9;box-shadow:0 12px 50px #0008';
  dialog.innerHTML='<h2 style="margin:0 0 10px">انتقال امن اطلاعات به فضای ابری</h2>'+
    '<p>اطلاعات حساب در Firebase ذخیره می‌شوند. نسخه‌های قدیمی همین دستگاه را بررسی می‌کنیم و فقط مواردی را که در حساب ابری وجود ندارند، پس از تأیید اضافه می‌کنیم.</p>'+
    '<p style="font-size:13px">اگر قبلاً چند نفر با این مرورگر وارد شده‌اند، ممکن است بکاپ محلی مال شخص دیگری باشد. فقط داده‌های متعلق به حساب خودت را منتقل کن.</p>'+
    '<p data-recovery-report role="status" style="white-space:pre-wrap;border:1px solid #42547a;padding:10px;border-radius:9px">در حال بررسی…</p>'+
    '<label style="display:block;margin:10px 0">منبع نسخه قدیمی <select data-recovery-source style="width:100%;padding:8px;margin-top:5px;background:#17294c;color:inherit;border-radius:7px"><option value="elara_precloud_backup">بکاپ قدیمی مرورگر</option><option value="elara_space_v1">نسخه محلی دستگاه</option></select></label>'+
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:14px 0">'+
    '<button type="button" data-recovery="check" class="quiet-button">بررسی دوباره</button>'+
    '<button type="button" data-recovery="cloud-export" class="primary-button">۱. دانلود بکاپ ابری</button>'+
    '<button type="button" data-recovery="local-export" class="quiet-button">۲. دانلود بکاپ قدیمی دستگاه</button>'+
    '<button type="button" data-recovery="import" class="primary-button">۳. انتقال موارد جاافتاده</button>'+
    '<button type="button" data-recovery="close" class="quiet-button">بستن</button></div>'+
    '<p style="font-size:12px">انتقال خودکار نیست. موارد مشترک در Firebase دست‌نخورده می‌مانند. بعد از تأیید انتقال، می‌توان حالت ذخیره موقت مرورگر را جداگانه آزمایش کرد.</p>';
  const report=dialog.querySelector('[data-recovery-report]');
  let busy=false,backedUpCloud=false;
  const reportError=e=>{report.textContent=e?.message||String(e);report.style.borderColor='#d77191';};
  const scan=async()=>{
    const s=await recoveryStatus();
    const name=x=>x.key==='elara_precloud_backup'?'بکاپ قدیمی':'نسخه محلی';
    report.textContent='حساب ابری: '+s.counts.tasks+' تسک، '+s.counts.goals+' هدف، '+s.counts.habits+' عادت'+
      '\n'+s.sources.map(x=>name(x)+': '+(x.error?'خطا: '+x.error:!x.exists?'پیدا نشد':x.details?'موارد جاافتاده: '+x.details:'مورد جاافتاده‌ای در فهرست‌های اصلی پیدا نشد')).join('\n');
    report.style.borderColor='#42547a';
  };
  dialog.addEventListener('click',async e=>{
    const action=e.target.closest('[data-recovery]')?.dataset.recovery;
    if(!action||busy)return;
    if(action==='close'){dialog.close();return;}
    busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
      const source=dialog.querySelector('[data-recovery-source]').value;
      if(action==='check')await scan();
      if(action==='cloud-export'){await backupCloudData();backedUpCloud=true;report.textContent='دانلود بکاپ ابری درخواست شد. فایل دانلودشده را در جای امن نگه دار.';}
      if(action==='local-export'){backupLegacyData(source);report.textContent='دانلود بکاپ قدیمی دستگاه درخواست شد.';}
      if(action==='import'){
        if(!backedUpCloud)throw new Error('برای جلوگیری از ازدست‌رفتن داده‌ها، ابتدا دکمه دانلود بکاپ ابری را بزن.');
        const s=await recoveryStatus(),selected=s.sources.find(x=>x.key===source);
        if(!selected?.exists||selected.error)throw new Error(selected?.error||'نسخهٔ قدیمی پیدا نشد.');
        if(!selected.details){report.textContent='مورد جاافتاده‌ای برای انتقال وجود ندارد؛ داده‌های حساب از قبل در Firebase هستند.';return;}
        if(!window.confirm('تأیید می‌کنی که نسخه قدیمی این مرورگر متعلق به همین حساب است؟ در صورت اشتباه، داده‌های یک فرد دیگر ممکن است وارد حساب فعلی شوند.'))return;
        if(!window.confirm('فقط موارد جاافتاده اضافه می‌شوند و رکوردهای موجود حذف یا جایگزین نمی‌شوند. انتقال را انجام دهیم؟'))return;
        const result=await recoverFromBrowser(source);
        await scan();
        report.textContent='✓ انتقال و خواندن مجدد Firebase تأیید شد. '+result.count+' مورد به حساب اضافه شد.\n'+report.textContent;
      }
    }catch(err){reportError(err)}
    finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  });
  dialog.addEventListener('close',()=>dialog.remove());
  document.body.appendChild(dialog);dialog.showModal();
  await scan().catch(reportError);
}

window.ElaraAccount={
  get user(){return auth.currentUser},
  get profile(){return profile},
  get loaded(){return loaded},
  openDataMigration:openRecoveryPanel,
  inspectDataMigration:recoveryStatus,
  downloadCloudBackup:backupCloudData,

  errorMessage:actionError,
  getUser:()=>auth.currentUser,
  logout:async()=>{await flush();await signOut(auth);},
  sendPasswordReset:async()=>{if(!auth.currentUser?.email)throw new Error('ایمیل حساب در دسترس نیست.');await sendPasswordResetEmail(auth,auth.currentUser.email);return auth.currentUser.email;},
  changePassword:async(currentPassword,newPassword)=>{
    const current=auth.currentUser;if(!current?.email)throw new Error('برای تغییر رمز دوباره وارد حساب شو.');
    const next=String(newPassword||'');if(next.length<6)throw new Error('رمز جدید باید حداقل ۶ نویسه باشد.');
    const credential=EmailAuthProvider.credential(current.email,String(currentPassword||''));
    await reauthenticateWithCredential(current,credential);
    await updatePassword(current,next);
    return true;
  }
};
onAuthStateChanged(auth,async current=>{
  clearTimeout(timer);locked();
  try{
    if(!current){clearAccount();form();return;}
    user=current;
    if(!current.emailVerified){verify();return;}
    await readyUser(current);
  }catch(e){
    if(e?.name==='ElaraIdentityIntegrityError'){showIdentityRepair(e);return}
    locked();message('اتصال به حساب برقرار نشد: '+actionError(e));if(retry)retry.hidden=false;
  }
});
