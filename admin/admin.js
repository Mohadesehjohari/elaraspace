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
let currentUser=null,currentAdmin=null,deploymentBusy=false,deploymentPoll=null;

function authErrorMessage(error){
  console.error('Elara admin auth:',error);
  return ({
    'auth/invalid-credential':'ایمیل یا رمز عبور اشتباه است.',
    'auth/invalid-email':'فرمت ایمیل درست نیست.',
    'auth/user-disabled':'این حساب غیرفعال شده است.',
    'auth/too-many-requests':'تلاش‌های زیادی انجام شده؛ چند دقیقه صبر کن و دوباره امتحان کن.',
    'auth/operation-not-allowed':'ورود ایمیل/رمز در Firebase فعال نیست.',
    'auth/unauthorized-domain':'دامنهٔ فعلی در Firebase Authentication مجاز نشده است.',
    'auth/network-request-failed':'ارتباط این دستگاه با Firebase Auth برقرار نشد. VPN/Proxy/DNS یا تنظیمات شبکهٔ همین دستگاه را بررسی کن.'
  })[error?.code] || (error?.code ? error.code+': '+(error.message||'خطا') : (error?.message||'خطای ورود'));
}

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
  void refreshOverview();void loadSiteSettings();void loadDeploymentStatus();
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
  const button=$('save-site-settings');button.disabled=true;$('system-status').textContent='در حال اعمال Maintenance روی Production…';
  const maintenanceEnabled=$('maintenance-enabled').checked;
  const maintenanceMessage=$('maintenance-message').value.trim().slice(0,240);
  try{
    const deployment=await deploymentRequest('maintenance',{method:'POST',body:{enabled:maintenanceEnabled,message:maintenanceMessage}});
    renderDeployment(deployment);
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


function canDeploy(){return !!currentAdmin&&['owner','admin'].includes(currentAdmin.role)}
function shortSha(value){const s=String(value||'');return /^[0-9a-f]{40}$/i.test(s)?s.slice(0,12):'—'}
function fmtServerTime(value){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('fa-IR')}
function deploymentStateLabel(value){return ({not_installed:'نصب اولیه لازم است',up_to_date:'به‌روز',update_available:'آپدیت موجود است',updating:'در حال به‌روزرسانی',failed:'ناموفق',rolled_back:'Rollback شد'})[value]||String(value||'نامشخص')}
function setDeploymentControls(){
  const allowed=canDeploy()&&!deploymentBusy;
  for(const id of ['deploy-check','deploy-apply','deploy-rollback']){const el=$(id);if(el)el.disabled=!allowed}
  const refresh=$('deploy-refresh-status');if(refresh)refresh.disabled=deploymentBusy;
}
async function deploymentRequest(action,{method='GET',body=null}={}){
  if(!currentUser)throw new Error('حساب Admin وارد نشده است.');
  const token=await currentUser.getIdToken();
  const headers={Accept:'application/json',Authorization:'Bearer '+token};
  const init={method,headers,cache:'no-store',credentials:'same-origin'};
  if(body!==null){headers['Content-Type']='application/json';init.body=JSON.stringify(body)}
  const response=await fetch('deploy.php?action='+encodeURIComponent(action),init);
  const text=await response.text();let payload=null;
  try{payload=JSON.parse(text)}catch{throw new Error('Deployment endpoint روی این هاست فعال نیست یا پاسخ JSON نداد.')}
  if(!response.ok||payload?.ok!==true)throw new Error(payload?.error||('Deployment HTTP '+response.status));
  return payload.data||{};
}
function renderDeployment(data){
  if(!data||typeof data!=='object')return;
  if($('deploy-current-sha'))$('deploy-current-sha').textContent=shortSha(data.current_sha);
  if($('deploy-latest-sha'))$('deploy-latest-sha').textContent=shortSha(data.latest_sha);
  if($('deploy-last-time'))$('deploy-last-time').textContent=fmtServerTime(data.last_deploy_at);
  if($('deploy-status')){$('deploy-status').textContent=deploymentStateLabel(data.status);$('deploy-status').dataset.state=String(data.status||'')}
  if($('deploy-phase'))$('deploy-phase').textContent='phase: '+String(data.phase||'idle');
  if(typeof data.maintenance_enabled==='boolean'){$('stat-maintenance').textContent=data.maintenance_enabled?'فعال':'خاموش';$('maintenance-enabled').checked=data.maintenance_enabled}
  const audit=$('deployment-audit');
  if(audit){
    const rows=Array.isArray(data.audit)?data.audit:[];
    audit.textContent=rows.length?rows.map(row=>[row.finishedAt||row.startedAt||'',row.action||'',row.status||'',row.fromSHA?String(row.fromSHA).slice(0,12):'-','→',row.toSHA?String(row.toSHA).slice(0,12):'-',row.adminUid||'',row.rollbackStatus||''].join(' | ')).join('\n'):'هنوز رویدادی ثبت نشده است.';
  }
  if($('deployment-status-message')&&data.error)$('deployment-status-message').textContent='آخرین خطا: '+data.error;
  setDeploymentControls();
}
async function loadDeploymentStatus(silent=false){
  try{const data=await deploymentRequest('status');renderDeployment(data);return data}
  catch(error){console.error('Elara deployment status:',error);if(!silent&&$('deployment-status-message'))$('deployment-status-message').textContent=error.message||'خواندن وضعیت Deployment ناموفق بود.';setDeploymentControls();return null}
}
async function checkDeployment(){
  if(!canDeploy())throw new Error('این نقش اجازهٔ Deploy ندارد.');
  const data=await deploymentRequest('check',{method:'POST'});renderDeployment(data);$('deployment-status-message').textContent=data.status==='up_to_date'?'Production با main همگام است.':'نسخهٔ جدید main برای Deploy موجود است.';
}
async function runDeploymentAction(action){
  if(deploymentBusy)return;
  if(!canDeploy())throw new Error('فقط owner/admin اجازهٔ Production Deploy دارند.');
  deploymentBusy=true;setDeploymentControls();
  $('deployment-status-message').textContent=action==='deploy'?'Update شروع شد؛ وضعیت واقعی از سرور خوانده می‌شود…':'Rollback شروع شد…';
  clearInterval(deploymentPoll);deploymentPoll=setInterval(()=>void loadDeploymentStatus(true),1500);
  try{
    const data=await deploymentRequest(action,{method:'POST'});renderDeployment(data);
    $('deployment-status-message').textContent=action==='deploy'?'✓ Update با موفقیت کامل شد.':'✓ Rollback با موفقیت کامل شد.';
  }finally{
    clearInterval(deploymentPoll);deploymentPoll=null;deploymentBusy=false;setDeploymentControls();void loadDeploymentStatus(true);
  }
}

$('admin-password-toggle').addEventListener('click',()=>{
  const input=$('admin-password'),button=$('admin-password-toggle'),show=input.type==='password';
  input.type=show?'text':'password';button.textContent=show?'🙈':'👁';
  button.setAttribute('aria-label',show?'پنهان کردن رمز عبور':'نمایش رمز عبور');
  button.setAttribute('aria-pressed',String(show));input.focus({preventScroll:true});
});
$('admin-login').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{await signInWithEmailAndPassword(auth,$('admin-email').value.trim(),$('admin-password').value);}
  catch(error){toast(authErrorMessage(error));button.disabled=false;}
});
$('admin-reset-password').addEventListener('click',async()=>{
  const email=$('admin-email').value.trim();if(!email){toast('اول ایمیل را وارد کن.');return}
  try{await sendPasswordResetEmail(auth,email);toast('اگر حساب وجود داشته باشد، لینک بازیابی ارسال می‌شود. پوشه Spam را هم بررسی کن.');}
  catch(error){toast(authErrorMessage(error));}
});
$('gate-signout').addEventListener('click',()=>signOut(auth));
$('admin-signout').addEventListener('click',()=>signOut(auth));
$('refresh-overview').addEventListener('click',()=>refreshOverview());
$('save-site-settings').addEventListener('click',()=>saveSiteSettings());
$('deploy-refresh-status').addEventListener('click',()=>loadDeploymentStatus());
$('deploy-check').addEventListener('click',()=>{checkDeployment().catch(error=>{console.error(error);$('deployment-status-message').textContent=error.message||'Check Update ناموفق بود.'})});
$('deploy-apply').addEventListener('click',()=>{runDeploymentAction('deploy').catch(error=>{console.error(error);$('deployment-status-message').textContent=error.message||'Deploy ناموفق بود.'})});
$('deploy-rollback').addEventListener('click',()=>{runDeploymentAction('rollback').catch(error=>{console.error(error);$('deployment-status-message').textContent=error.message||'Rollback ناموفق بود.'})});
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('active',x===button));
  document.querySelectorAll('.panel').forEach(x=>x.classList.add('hidden'));
  $('panel-'+button.dataset.panel).classList.remove('hidden');
  if(button.dataset.panel==='deployment')void loadDeploymentStatus();
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
    openApp();setDeploymentControls();
  }catch(error){console.error(error);gate(error.message||'بررسی دسترسی مدیر ناموفق بود.',{denied:true});}
});
