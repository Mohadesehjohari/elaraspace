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
let currentUser=null,currentAdmin=null,deploymentBusy=false,deploymentPoll=null,aiState=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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


async function aiRequest(action,{method='GET',body=null}={}){
  if(!currentUser)throw new Error('حساب Admin وارد نشده است.');
  const token=await currentUser.getIdToken(),headers={Accept:'application/json',Authorization:'Bearer '+token},init={method,headers,cache:'no-store',credentials:'same-origin'};
  if(body!==null){headers['Content-Type']='application/json';init.body=JSON.stringify(body)}
  const response=await fetch('ai.php?action='+encodeURIComponent(action),init),raw=await response.text();let payload=null;
  try{payload=JSON.parse(raw)}catch{throw new Error('AI endpoint روی این هاست فعال نیست یا پاسخ JSON نداد.')}
  if(!response.ok||payload?.ok!==true)throw new Error(payload?.error||('AI HTTP '+response.status));
  return payload.data||{};
}
function renderAi(data){
  if(!data||typeof data!=='object')return;aiState=data;const settings=data.settings||{},models=Array.isArray(data.models)?data.models:[],keys=Array.isArray(data.keys)?data.keys:[];
  $('ai-stat-enabled').textContent=settings.enabled?'فعال':'خاموش';$('ai-stat-keys').textContent=keys.filter(x=>x.enabled).length.toLocaleString('fa-IR');$('ai-stat-models').textContent=models.length.toLocaleString('fa-IR');$('ai-stat-strategy').textContent=data.strategy||'—';
  $('ai-enabled').checked=settings.enabled===true;$('ai-display-name').value=settings.display_name||'Elara AI';$('ai-max-attempts').value=settings.max_attempts||3;$('ai-user-limit').value=settings.per_user_daily_limit||40;$('ai-temperature').value=settings.temperature??.8;$('ai-output-tokens').value=settings.max_output_tokens||1200;
  const options='<option value="">—</option>'+models.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name)+' · '+esc(m.technical_model_id)+'</option>').join('');
  $('ai-default-model').innerHTML=options;$('ai-fallback-model').innerHTML=options;$('ai-default-model').value=settings.default_model||'';$('ai-fallback-model').value=settings.fallback_model||'';
  $('ai-model-list').innerHTML=models.length?models.map(m=>'<div class="ai-row"><div><strong>'+esc(m.display_name)+'</strong><code>'+esc(m.technical_model_id)+'</code><small>'+(m.enabled?'فعال':'غیرفعال')+'</small></div><div class="ai-row-actions"><button type="button" class="secondary" data-ai-model-edit="'+esc(m.id)+'">ویرایش</button><button type="button" class="secondary danger" data-ai-model-delete="'+esc(m.id)+'">حذف</button></div></div>').join(''):'<p class="muted">مدلی ثبت نشده است.</p>';
  $('ai-key-list').innerHTML=keys.length?keys.map(k=>'<div class="ai-row"><div><strong>'+esc(k.alias)+'</strong><code>'+esc(k.hint)+'</code><small>اولویت '+Number(k.priority||10).toLocaleString('fa-IR')+' · امروز '+Number(k.usage_count||0).toLocaleString('fa-IR')+(k.cooldown_until?' · cooldown':'')+'</small></div><div class="ai-row-actions"><button type="button" class="secondary" data-ai-key-toggle="'+esc(k.id)+'" data-enabled="'+String(!k.enabled)+'">'+(k.enabled?'خاموش':'روشن')+'</button><button type="button" class="secondary danger" data-ai-key-delete="'+esc(k.id)+'">حذف</button></div></div>').join(''):'<p class="muted">هنوز Token امنی اضافه نشده است.</p>';
}
async function loadAiStatus(){try{renderAi(await aiRequest('status'));$('ai-status-message').textContent=''}catch(error){console.error(error);$('ai-status-message').textContent=error.message||'خواندن تنظیمات AI ناموفق بود.'}}
async function saveAiSettings(){
 const body={enabled:$('ai-enabled').checked,display_name:$('ai-display-name').value.trim(),default_model:$('ai-default-model').value,fallback_model:$('ai-fallback-model').value,max_attempts:Number($('ai-max-attempts').value||3),per_user_daily_limit:Number($('ai-user-limit').value||40),temperature:Number($('ai-temperature').value||.8),max_output_tokens:Number($('ai-output-tokens').value||1200)};
 $('ai-save-settings').disabled=true;try{renderAi(await aiRequest('settings-save',{method:'POST',body}));$('ai-status-message').textContent='✓ تنظیمات AI روی سرور ذخیره شد.'}catch(error){$('ai-status-message').textContent=error.message||'ذخیره AI ناموفق بود.'}finally{$('ai-save-settings').disabled=false}
}
async function addAiKey(event){event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;try{renderAi(await aiRequest('key-add',{method:'POST',body:{alias:$('ai-key-alias').value.trim(),token:$('ai-key-token').value,priority:Number($('ai-key-priority').value||10),daily_limit:Number($('ai-key-limit').value||0)}}));event.target.reset();$('ai-key-priority').value='10';$('ai-key-limit').value='0';toast('Token امن اضافه شد.')}catch(error){toast(error.message||'افزودن Token ناموفق بود.')}finally{button.disabled=false}}
async function saveAiModel(event){event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;try{renderAi(await aiRequest('model-save',{method:'POST',body:{id:$('ai-model-row-id').value,display_name:$('ai-model-display').value.trim(),technical_model_id:$('ai-model-technical').value.trim(),enabled:$('ai-model-enabled').checked}}));event.target.reset();$('ai-model-row-id').value='';$('ai-model-enabled').checked=true;toast('مدل ذخیره شد.')}catch(error){toast(error.message||'ذخیره مدل ناموفق بود.')}finally{button.disabled=false}}
async function testAi(){try{const data=await aiRequest('test',{method:'POST',body:{model_id:$('ai-default-model').value}});$('ai-status-message').textContent='✓ اتصال '+(data.model_display_name||'مدل')+' تأیید شد.'}catch(error){$('ai-status-message').textContent=error.message||'تست اتصال ناموفق بود.'}}

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
$('ai-refresh').addEventListener('click',()=>loadAiStatus());
$('ai-save-settings').addEventListener('click',()=>saveAiSettings());
$('ai-test').addEventListener('click',()=>testAi());
$('ai-key-form').addEventListener('submit',addAiKey);
$('ai-model-form').addEventListener('submit',saveAiModel);
$('ai-key-list').addEventListener('click',async e=>{const toggle=e.target.closest('[data-ai-key-toggle]'),del=e.target.closest('[data-ai-key-delete]');try{if(toggle)renderAi(await aiRequest('key-update',{method:'POST',body:{id:toggle.dataset.aiKeyToggle,enabled:toggle.dataset.enabled==='true'}}));if(del&&confirm('این Token حذف شود؟'))renderAi(await aiRequest('key-delete',{method:'POST',body:{id:del.dataset.aiKeyDelete}}))}catch(error){toast(error.message||'عملیات Token ناموفق بود.')}});
$('ai-model-list').addEventListener('click',async e=>{const edit=e.target.closest('[data-ai-model-edit]'),del=e.target.closest('[data-ai-model-delete]');if(edit){const m=(aiState?.models||[]).find(x=>x.id===edit.dataset.aiModelEdit);if(m){$('ai-model-row-id').value=m.id;$('ai-model-display').value=m.display_name||'';$('ai-model-technical').value=m.technical_model_id||'';$('ai-model-enabled').checked=m.enabled!==false;$('ai-model-display').focus()}}if(del&&confirm('این مدل حذف شود؟')){try{renderAi(await aiRequest('model-delete',{method:'POST',body:{id:del.dataset.aiModelDelete}}))}catch(error){toast(error.message||'حذف مدل ناموفق بود.')}}});
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('active',x===button));
  document.querySelectorAll('.panel').forEach(x=>x.classList.add('hidden'));
  $('panel-'+button.dataset.panel).classList.remove('hidden');
  if(button.dataset.panel==='deployment')void loadDeploymentStatus();
  if(button.dataset.panel==='ai')void loadAiStatus();
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
