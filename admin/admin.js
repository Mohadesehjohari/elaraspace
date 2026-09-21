import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp,collection,getCountFromServer,addDoc} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const firebaseConfig={
  apiKey:'AIzaSyBpCsIvc3A8sLrdvUiaGDQjMH6qE9lUTGo',
  authDomain:'elara-ab1aa.firebaseapp.com',
  projectId:'elara-ab1aa',
  storageBucket:'elara-ab1aa.firebasestorage.app',
  messagingSenderId:'233944066611',
  appId:'1:233944066611:web:1be816fd2dc053cea01146'
};
const app=initializeApp(firebaseConfig,'elara-admin');
const auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
let currentUser=null,currentAdmin=null;

function toast(message){
  const el=$('toast');el.textContent=message;el.classList.remove('hidden');
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),4500);
}
function gate(message,{login=false,denied=false}={}){
  $('gate').classList.remove('hidden');$('admin-app').classList.add('hidden');
  $('gate-message').textContent=message;
  $('admin-login').classList.toggle('hidden',!login);
  $('denied-actions').classList.toggle('hidden',!denied);
}
function openApp(){
  $('gate').classList.add('hidden');$('admin-app').classList.remove('hidden');
  $('admin-role').textContent=currentAdmin.role.toUpperCase();
  $('stat-role').textContent=currentAdmin.role;
  $('admin-identity').textContent=currentUser.email||currentUser.uid;
  void refreshOverview();void loadSiteSettings();
}
async function resolveAdmin(user){
  if(!user.emailVerified)throw new Error('ایمیل این حساب هنوز تأیید نشده است.');
  const snap=await getDoc(doc(db,'admins',user.uid));
  if(!snap.exists())return null;
  const value=snap.data();
  if(value.enabled!==true||!['owner','admin','moderator'].includes(value.role))return null;
  return value;
}
async function refreshOverview(){
  $('stat-users').textContent='…';
  try{
    const count=await getCountFromServer(collection(db,'profiles'));
    $('stat-users').textContent=Number(count.data().count||0).toLocaleString('fa-IR');
  }catch(error){console.error(error);$('stat-users').textContent='خطا';toast('شمارش کاربران ناموفق بود. Rules را بررسی کن.');}
}
async function loadSiteSettings(){
  try{
    const snap=await getDoc(doc(db,'publicSettings','site'));
    const value=snap.exists()?snap.data():{};
    $('maintenance-enabled').checked=value.maintenanceEnabled===true;
    $('maintenance-message').value=value.maintenanceMessage||'Elara در حال به‌روزرسانی است. لطفاً کمی بعد دوباره تلاش کنید.';
    $('stat-maintenance').textContent=value.maintenanceEnabled===true?'فعال':'خاموش';
  }catch(error){console.error(error);toast('خواندن تنظیمات سایت ناموفق بود.');}
}
async function saveSiteSettings(){
  const button=$('save-site-settings');button.disabled=true;$('system-status').textContent='در حال ذخیره…';
  const maintenanceEnabled=$('maintenance-enabled').checked;
  const maintenanceMessage=$('maintenance-message').value.trim().slice(0,240);
  try{
    await setDoc(doc(db,'publicSettings','site'),{
      maintenanceEnabled,maintenanceMessage,
      updatedAt:serverTimestamp(),updatedBy:currentUser.uid
    },{merge:true});
    await addDoc(collection(db,'adminAudit'),{
      uid:currentUser.uid,
      role:currentAdmin.role,
      action:'site_settings_update',
      target:'publicSettings/site',
      meta:{maintenanceEnabled},
      createdAt:serverTimestamp()
    });
    $('stat-maintenance').textContent=maintenanceEnabled?'فعال':'خاموش';
    $('system-status').textContent='✓ ذخیره شد و در Audit Log ثبت شد.';
    toast('تنظیمات سایت ذخیره شد.');
  }catch(error){console.error(error);$('system-status').textContent='ذخیره ناموفق بود.';toast(error.message||'خطا در ذخیره تنظیمات');}
  finally{button.disabled=false;}
}

$('admin-login').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{await signInWithEmailAndPassword(auth,$('admin-email').value.trim(),$('admin-password').value);}
  catch(error){console.error(error);toast('ورود ناموفق بود. ایمیل، رمز و دسترسی مدیر را بررسی کن.');button.disabled=false;}
});
$('admin-reset-password').addEventListener('click',async()=>{
  const email=$('admin-email').value.trim();if(!email){toast('اول ایمیل را وارد کن.');return}
  try{await sendPasswordResetEmail(auth,email);toast('اگر حساب وجود داشته باشد، لینک بازیابی ارسال می‌شود. پوشه Spam را هم بررسی کن.');}
  catch(error){console.error(error);toast('ارسال لینک بازیابی ناموفق بود.');}
});
$('gate-signout').addEventListener('click',()=>signOut(auth));
$('admin-signout').addEventListener('click',()=>signOut(auth));
$('refresh-overview').addEventListener('click',()=>refreshOverview());
$('save-site-settings').addEventListener('click',()=>saveSiteSettings());
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('active',x===button));
  document.querySelectorAll('.panel').forEach(x=>x.classList.add('hidden'));
  $('panel-'+button.dataset.panel).classList.remove('hidden');
}));

onAuthStateChanged(auth,async user=>{
  currentUser=user;currentAdmin=null;
  if(!user){gate('برای ورود به پنل مدیریت از حساب مدیر استفاده کن.',{login:true});return}
  gate('در حال بررسی نقش مدیر…');
  try{
    currentAdmin=await resolveAdmin(user);
    if(!currentAdmin){
      gate('این حساب مجوز ورود به Admin را ندارد. سند admins/{UID} باید از محیط مورد اعتماد برای این حساب ایجاد شده باشد.',{denied:true});
      return;
    }
    openApp();
  }catch(error){console.error(error);gate(error.message||'بررسی دسترسی مدیر ناموفق بود.',{denied:true});}
});
