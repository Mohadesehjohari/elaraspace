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
const auth=getAuth(app), db=getFirestore(app), $=id=>document.getElementById(id);
const layer=$('cloud-layer'), status=$('cloud-status'), retry=$('cloud-retry');
const empty=()=>({version:1,tasks:[],habits:[],goals:[],books:[],words:[],folders:[],tags:[],focusSessions:[],activeFocus:null,taskCompletionHistory:[],missionRewardClaims:[],xp:0,theme:'dark'});
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
    'unavailable':'اتصال به دیتابیس برقرار نیست. اینترنت را بررسی کن.'
  })[e.code] || (e.code ? e.code+': '+(e.message||'خطا') : (e.message||'خطایی رخ داد.'));
}
function locked(){loaded=false;document.body.classList.add('cloud-locked');document.body.classList.remove('cloud-ready');layer.hidden=false;}
function unlocked(){document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');layer.hidden=true;}
function clearAccount(){
  locked(); user=null;profile=null;lastPayload='';dirty=false;
  localStorage.removeItem('elara_space_v1');
  sessionStorage.removeItem('elara_pending_profile');
  window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:empty()}));
}
function form(mode='login'){
  locked();
  layer.replaceChildren();
  const wrap=document.createElement('div');wrap.className='cloud-card';
  const title=document.createElement('h2');title.textContent=mode==='register'?'Create an account':'Welcome to Elara ✦';
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
  wrap.append(title,sub,f,switcher);if(mode==='login')wrap.append(forgot);
  wrap.append(status,retry);layer.append(wrap); const msg=document.createElement('p');msg.id='cloud-form-message';msg.className='muted';wrap.append(msg);
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
  const out=btn('خروج',()=>signOut(auth),'quiet-button');wrap.append(h,p,check,resend,out,status,retry);layer.append(wrap);message('');
}
function btn(label,fn,klass='primary-button'){const b=document.createElement('button');b.type='button';b.className=klass;b.textContent=label;b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){notify(actionError(e));}finally{b.disabled=false;}});return b;}
async function reserveUsername(username,name){
  const claim=doc(db,'usernames',username),p=doc(db,'profiles',user.uid);
  await runTransaction(db,async tx=>{
    const c=await tx.get(claim), old=await tx.get(p);
    if(old.exists())return;
    if(c.exists())throw new Error('این نام کاربری قبلاً انتخاب شده. نام دیگری وارد کن.');
    tx.set(claim,{uid:user.uid});
    tx.set(p,{username,name:name.slice(0,60),bio:'',xp:0});
  });
  sessionStorage.removeItem('elara_pending_profile');
}
function chooseUsername(){
  locked();layer.replaceChildren();const wrap=document.createElement('div');wrap.className='cloud-card';
  const h=document.createElement('h2');h.textContent='پروفایلت رو بساز ✦';
  const p=document.createElement('p');p.className='muted';p.textContent='نام کاربری یکتا برای پیدا کردنت توسط دوست‌ها استفاده می‌شه.';
  const f=document.createElement('form');const pending=JSON.parse(sessionStorage.getItem('elara_pending_profile')||'{}');
  const name=document.createElement('input');name.placeholder='نام نمایشی';name.value=pending.name||user.displayName||'';name.required=true;name.maxLength=60;
  const uname=document.createElement('input');uname.placeholder='username';uname.value=pending.username||'';uname.required=true;uname.maxLength=20;uname.pattern='[a-z][a-z0-9_]{2,19}';
  const ok=document.createElement('button');ok.className='primary-button';ok.textContent='ثبت نام کاربری';f.append(name,uname,ok);
  f.addEventListener('submit',async e=>{e.preventDefault();ok.disabled=true;try{const v=safe(uname.value).toLowerCase();if(!usernameValid(v))throw new Error('نام کاربری باید ۳ تا ۲۰ نویسه انگلیسی باشد و با حرف شروع شود.');await reserveUsername(v,safe(name.value));await readyUser(user);}catch(err){message(actionError(err));}finally{ok.disabled=false;}});
  wrap.append(h,p,f,btn('خروج',()=>signOut(auth),'quiet-button'),status,retry);layer.append(wrap);message('');
}
async function readyUser(current){
  locked();user=current;
  const p=await getDoc(doc(db,'profiles',user.uid));
  if(!p.exists()){chooseUsername();return;}
  profile=p.data();
  const remote=await getDoc(doc(db,'private',user.uid,'app','main'));
  if(auth.currentUser?.uid!==current.uid) return;
  const content=remote.exists()?remote.data().payload:empty();
  // Never automatically import another account's (or the old guest's) local data.
  const old=localStorage.getItem('elara_space_v1');
  if(old && !sessionStorage.getItem('elara_backup_saved')){
    localStorage.setItem('elara_precloud_backup',old);
    sessionStorage.setItem('elara_backup_saved','1');
  }
  localStorage.setItem('elara_space_v1',JSON.stringify(content));
  window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:content}));
  lastPayload=JSON.stringify(content);dirty=false;loaded=true;
  renderAccount();unlocked();
  // Write an empty account document on first use. Its absence never imports old guest data.
  if(!remote.exists())await setDoc(doc(db,'private',user.uid,'app','main'),{payload:content,updatedAt:serverTimestamp()});
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
  $('cloud-sync').textContent='در حال ذخیره…';clearTimeout(timer);timer=setTimeout(flush,800);
});
window.addEventListener('pagehide',()=>{if(dirty)flush();});
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
async function decide(req,status){await updateDoc(doc(db,'friendRequests',req.id),{status});await refreshFriends();}
async function addFriend(username){
  const v=safe(username).toLowerCase();if(!usernameValid(v))throw new Error('نام کاربری معتبر نیست.');
  const claim=await getDoc(doc(db,'usernames',v));if(!claim.exists())throw new Error('چنین نام کاربری‌ای پیدا نشد.');
  const to=claim.data().uid;if(to===user.uid)throw new Error('این نام کاربری خودته.');
  const id=`${user.uid}_${to}`,ref=doc(db,'friendRequests',id),existing=await getDoc(ref);
  if(existing.exists())throw new Error('برای این کاربر قبلاً درخواست فرستادی.');
  await setDoc(ref,{from:user.uid,to,status:'pending'});await refreshFriends();
}
function renderAccount(){
  let section=$('cloud-social');if(!section){
    section=document.createElement('section');section.id='cloud-social';section.className='surface settings-card';
    section.innerHTML='<h2>حساب و دوستان واقعی ✦</h2><p class="muted" id="cloud-me"></p><p class="muted" id="cloud-sync"></p><div class="timer-actions"><button class="quiet-button" id="cloud-logout" type="button">خروج از حساب</button></div><h2>درخواست دوستی</h2><form id="cloud-friend-form" class="inline-form"><input id="cloud-friend-name" aria-label="نام کاربری دوست" required placeholder="نام کاربری دوست (مثلاً aren_01)"><button class="primary-button" type="submit">ارسال درخواست</button></form><div class="item-list" id="cloud-friends-list"></div><h2 style="margin-top:22px">رنکینگ دوستان</h2><p class="muted">امتیازها از فعالیت‌های ثبت‌شدهٔ هر حساب می‌آیند؛ این نسخه برای رقابت رسمی ضدتقلب نیست.</p><div class="item-list" id="cloud-ranking"></div><button id="cloud-refresh" class="quiet-button" type="button">به‌روزرسانی دوستان و رتبه‌ها</button>';
    $('panel-settings').append(section);
    $('cloud-logout').addEventListener('click',async()=>{await flush();await signOut(auth);});
    $('cloud-friend-form').addEventListener('submit',async event=>{event.preventDefault();const b=event.target.querySelector('button');b.disabled=true;try{await addFriend($('cloud-friend-name').value);event.target.reset();notify('درخواست دوستی ارسال شد.');}catch(e){notify(actionError(e));}finally{b.disabled=false;}});
    $('cloud-refresh').addEventListener('click',()=>refreshFriends().catch(e=>notify(actionError(e))));
  }
  $('cloud-me').textContent=`@${profile.username} · ${profile.name} · ${user.email}`;
  $('cloud-sync').textContent='✓ اطلاعات حساب بارگذاری شد';
  refreshFriends().catch(e=>notify(actionError(e)));
}
window.ElaraAccount={logout:async()=>{await flush();await signOut(auth);},sendPasswordReset:async()=>{if(!auth.currentUser?.email)throw new Error('ایمیل حساب در دسترس نیست.');await sendPasswordResetEmail(auth,auth.currentUser.email);return auth.currentUser.email;},getUser:()=>auth.currentUser};
onAuthStateChanged(auth,async current=>{
  clearTimeout(timer);locked();
  try{
    if(!current){clearAccount();form();return;}
    user=current;
    if(!current.emailVerified){verify();return;}
    await readyUser(current);
  }catch(e){locked();message('اتصال به حساب برقرار نشد: '+actionError(e));if(retry)retry.hidden=false;}
});
