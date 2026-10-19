/* Elara task assistant: preview first; no model response can directly modify a user's data. */
(()=>{'use strict';
const STORE='elara_space_v1';
const tidy=(v,n=180)=>String(v??'').trim().slice(0,n);
const dateOK=s=>!s||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00').getTime()));
const timeOK=s=>!s||/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const ownTask=t=>!(t?.linkedTask||t?.sourceManaged||t?.collabSpaceId||t?.shared||(t?.sourceGroup&&t.sourceGroup!=='personal'));
const getState=()=>{let state;try{state=JSON.parse(localStorage.getItem(STORE)||'{}')}catch{throw Error('داده‌های تسک‌ها خوانده نشد.')}if(!state||!Array.isArray(state.tasks))throw Error('لیست تسک‌های این حساب آماده نیست.');return state;};
const session=()=>window.ElaraAccount?.user?.uid||'';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const status=(msg,failed=false)=>{const node=document.querySelector('#panel-freedom [data-f-ai-status]');if(node){node.textContent=msg;node.dataset.error=failed?'true':'false';}return msg;};
const taskSnapshot=()=>getState().tasks.slice(0,100).map(t=>({id:tidy(t.id,100),title:tidy(t.text,180),date:tidy(t.date,10),time:tidy(t.time,5),completed:!!t.completed,restricted:!ownTask(t)}));
const endpoint=()=>{const base=String(window.ELARA_AI_API_URL||'').trim().replace(/\/+$/,'');if(!base)throw Error('اجرای دستورات فعلاً فقط با Cloudflare Worker قابل استفاده است.');return base+'/ai/task-plan';};
async function promptUser(text,danger=false){
  if(typeof window.ElaraDialog?.confirm==='function')return await window.ElaraDialog.confirm(text,{title:danger?'تأیید حذف تسک':'تأیید تغییر در تسک‌ها',confirmText:danger?'بله، حذف شود':'تأیید و اجرا',danger});
  return window.confirm(text);
}
function persist(state){
  localStorage.setItem(STORE,JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:state}));
  window.dispatchEvent(new Event('elara:data-changed'));
}
function titleOf(plan,original){
  return tidy(plan.title||original?.text);
}
function preview(plan,original){
  if(plan.action==='create')return 'تسک جدید: «'+plan.title+'»'+(plan.date?' | تاریخ: '+plan.date:'')+(plan.time?' | ساعت: '+plan.time:'')+' | اولویت: '+plan.priority+'\nاین تسک در حساب تو ساخته شود؟';
  if(plan.action==='delete')return 'تسک «'+original.text+'» حذف شود؟\nاین عمل قابل برگشت خودکار نیست.';
  if(plan.action==='complete')return 'تسک «'+original.text+'» انجام‌شده علامت بخورد؟';
  if(plan.action==='update')return 'تسک «'+original.text+'» به «'+titleOf(plan,original)+'» تغییر کند؟\n'+(plan.date?'تاریخ: '+plan.date+'\n':'')+(plan.time?'ساعت: '+plan.time+'\n':'')+'اولویت: '+plan.priority;
  return 'دستور نامشخص است.';
}
function validate(plan,original){
  if(!plan||!['create','delete','update','complete','list','clarify'].includes(plan.action))throw Error('دستور ناشناخته است.');
  if(plan.action==='create'||plan.action==='update'){
    if(!titleOf(plan,original)||!dateOK(plan.date)||!timeOK(plan.time)||!['1','2','3','4'].includes(String(plan.priority)))throw Error('اطلاعات تسک پیشنهادی معتبر نیست.');
  }
  if(['delete','update','complete'].includes(plan.action)&&(!original||!ownTask(original)))throw Error('این تسک دیگر موجود نیست یا مدیریت آن توسط AI مجاز نیست.');
}
let busy=false;
async function run(message){
  if(busy)return;
  const startedUid=session();
  if(!startedUid||!document.body.classList.contains('cloud-ready')){status('ابتدا با حساب خودت وارد شو و صبر کن تسک‌ها همگام شوند.',true);return;}
  const command=tidy(message,1000);
  if(!command){status('دستور را در کادر گفت‌وگو بنویس؛ مثلاً «فردا تسک مطالعه بساز».',true);return;}
  busy=true;
  try{
    status('الارا در حال بررسی تسک‌ها و آماده‌کردن پیشنهاد است…');
    const before=taskSnapshot(),user=window.ElaraAccount.user;
    const response=await fetch(endpoint(),{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+await user.getIdToken(),'Accept':'application/json'},
      cache:'no-store',body:JSON.stringify({message:command,tasks:before,local_date:today(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'})
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok||payload?.ok!==true)throw Error(payload?.error||'دریافت پیشنهاد از الارا ناموفق بود.');
    if(session()!==startedUid)throw Error('حساب کاربری در این فاصله تغییر کرده است.');
    const plan=payload.data?.plan;
    const state=getState(),original=state.tasks.find(t=>String(t.id)===String(plan?.id));
    validate(plan,original);
    if(plan.action==='clarify'){status(plan.message||'دستور را دقیق‌تر بنویس.');return;}
    if(plan.action==='list'){
      const rows=state.tasks.filter(ownTask).slice(0,10);
      status(rows.length?'تسک‌های تو:\n'+rows.map(t=>'• '+tidy(t.text,180)+(t.date?' ('+t.date+')':'')).join('\n'):'هنوز تسک شخصی‌ای برای نمایش نداری.');
      return;
    }
    // Check the exact task ID still refers to the same item initially shown to the model.
    const initiallySent=before.find(t=>t.id===plan.id);
    if(plan.action!=='create'&&(!initiallySent||initiallySent.title!==tidy(original.text,180)))throw Error('تسک در این فاصله تغییر کرده؛ دوباره درخواست بده.');
    const ok=await promptUser(preview(plan,original),plan.action==='delete');
    if(!ok){status('این تغییر لغو شد؛ چیزی در تسک‌ها تغییر نکرد.');return;}
    if(session()!==startedUid||!document.body.classList.contains('cloud-ready'))throw Error('حساب یا اتصال تسک‌ها تغییر کرده است.');
    const latest=getState(),current=latest.tasks.find(t=>String(t.id)===String(plan.id));
    if(plan.action!=='create'&&(!current||!ownTask(current)||current.text!==original.text))throw Error('تسک تغییر کرده است؛ لطفاً دوباره درخواست بده.');
    if(plan.action==='create'){
      if(latest.tasks.length>=9999)throw Error('ظرفیت فهرست تسک‌ها تکمیل شده است.');
      const date=tidy(plan.date,10),time=tidy(plan.time,5),title=tidy(plan.title,180);
      latest.tasks.unshift({id:crypto.randomUUID(),text:title,shortDescription:'',description:'',date,time,priority:String(plan.priority),list:'',folder:'',tag:'',completed:false,doneAt:null,xpAwarded:false,createdAt:Date.now(),recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{},sourceGroup:'personal'});
      persist(latest);status('✓ تسک «'+title+'» داخل سایت ثبت شد و برای همگام‌سازی ابری ارسال شد.');
    }else if(plan.action==='delete'){
      latest.tasks=latest.tasks.filter(t=>String(t.id)!==String(plan.id));
      latest.taskCompletionHistory=(latest.taskCompletionHistory||[]).filter(h=>String(h.taskId)!==String(plan.id));
      persist(latest);status('✓ تسک «'+original.text+'» از لیست تو حذف شد.');
    }else if(plan.action==='update'){
      const updated={...current,text:tidy(plan.title,180),date:tidy(plan.date,10),time:tidy(plan.time,5),priority:String(plan.priority)};
      latest.tasks=latest.tasks.map(t=>String(t.id)===String(plan.id)?updated:t);
      persist(latest);status('✓ تسک «'+updated.text+'» ویرایش شد.');
    }else if(plan.action==='complete'){
      if(current.completed){status('این تسک قبلاً انجام‌شده بوده است.');return;}
      if(current.recurrenceRule)throw Error('تکمیل تسک‌های تکرارشونده در نسخه فعلی از طریق دستیار پشتیبانی نمی‌شود.');
      if(typeof window.ElaraTasks?.taskAction!=='function')throw Error('ماژول اصلی تکمیل تسک هنوز آماده نیست.');
      await window.ElaraTasks.taskAction('commit-task',String(current.id),today());
      if(!getState().tasks.find(t=>String(t.id)===String(current.id))?.completed)throw Error('تکمیل تسک تأیید نشد؛ از صفحه تسک‌ها وضعیت را بررسی کن.');
      status('✓ تسک «'+current.text+'» انجام‌شده ثبت شد.');
    }
  }catch(error){status(error?.message||'در اجرای دستور خطایی رخ داد.',true);}
  finally{busy=false;}
}
window.ElaraAITaskActions={run};
})();
