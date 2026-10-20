/*
 * Elara user-confirmed AI action executor.
 * Gemini supplies only a draft; this script authorizes exact private entities
 * against the currently signed-in user's canonical Elara state.
 */
(()=>{'use strict';
const STORE='elara_space_v1';
const kinds={task:'تسک',goal:'هدف',habit:'عادت',step:'ریزقدم'};
const fields={task:'tasks',goal:'goals',habit:'habits'};
const safe=(v,n=180)=>String(v??'').trim().slice(0,n);
const session=()=>window.ElaraAccount?.user?.uid||'';
const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const validDate=v=>{if(!v)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const [y,m,d]=v.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d,12));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d};
const validTime=v=>!v||/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const allowed=e=>!!e&&!e.shared&&!e.collabSpaceId&&!e.collabOwnerUid&&!e.sourceManaged&&!e.linkedTask&&!['shared'].includes(e.accountLinkVisibility)&&!(e.sourceGroup&&e.sourceGroup!=='personal');
const status=(message,failed=false)=>{
  const n=document.querySelector('.freedom-fox-overlay [data-f-ai-status],#panel-freedom [data-f-ai-status]');
  if(n){n.textContent=message;n.style.whiteSpace='pre-wrap';n.dataset.error=failed?'true':'false';}
};
function getState(){
  let state;try{state=JSON.parse(localStorage.getItem(STORE)||'null')}catch{}
  if(!state||state.version!==1||!['tasks','goals','habits'].every(k=>Array.isArray(state[k])))
    throw Error('داده‌های حساب آماده نیستند؛ دوباره وارد شو.');
  return state;
}
function inventoryOf(state){
  const inventory=[];
  const add=(kind,e,parentId='')=>{
    if(!e||!safe(e.id,128)||!safe(kind==='task'?e.text:kind==='step'?e.text:e.title))return;
    inventory.push({
      kind,id:safe(e.id,128),parent_id:safe(parentId,128),
      title:safe(kind==='task'||kind==='step'?e.text:e.title),
      date:safe(e.date,10),time:safe(e.time,5),
      priority:String(e.priority||'4'),horizon:e.horizon||'short',
      description:kind==='goal'?safe(e.description,500):'',
      restricted:!allowed(e),completed:!!(kind==='step'?e.done:e.completed)
    });
  };
  state.tasks.slice(0,80).forEach(t=>add('task',t));
  const goals=state.goals.slice(0,50);
  goals.forEach(g=>add('goal',g));
  state.habits.slice(0,50).forEach(h=>add('habit',h));
  for(const g of goals)for(const step of (g.steps||[]).slice(0,55)){
    if(inventory.length>=235)break;
    add('step',{...step,shared:!allowed(g)},g.id);
  }
  return inventory;
}
const endpoint=()=>{
  const base=String(window.ELARA_AI_API_URL||'').trim().replace(/\/+$/,'');
  if(!base)throw Error('درگاه Cloudflare فعال نیست.');
  return base+'/ai/action-plan';
};
const locate=(state,plan)=>{
  if(plan?.kind==='step'){
    const parent=state.goals.find(g=>String(g.id)===String(plan.parent_id));
    return {parent,row:parent?.steps?.find(s=>String(s.id)===String(plan.id))};
  }
  const arr=state[fields[plan?.kind]];
  return {parent:null,row:arr?.find(x=>String(x.id)===String(plan?.id))};
};
const label=(kind,e)=>safe(kind==='task'||kind==='step'?e?.text:e?.title);
function assertPlan(plan,state,before){
  if(!plan||!Object.hasOwn(kinds,plan.kind)||!['create','update','delete','complete','list','clarify'].includes(plan.action))
    throw Error('پیشنهاد نامعتبر دریافت شد.');
  const {parent,row}=locate(state,plan);
  if(plan.action==='create'){
    if(!safe(plan.title)||!validDate(plan.date)||!validTime(plan.time)||!['1','2','3','4'].includes(String(plan.priority)))
      throw Error('جزئیات ساخت معتبر نیست.');
    if(plan.kind==='step'&&(!parent||!allowed(parent)||!before.some(x=>x.kind==='goal'&&x.id===plan.parent_id&&!x.restricted)))
      throw Error('هدف والد برای ریزقدم در دسترس نیست.');
    if(plan.kind==='goal'){
      if(!['short','medium','long'].includes(plan.horizon)||!Array.isArray(plan.steps)||plan.steps.length>8||
        plan.steps.some(s=>!safe(s.text)||!validDate(s.date)||!validTime(s.time)))
        throw Error('ریزقدم‌ها یا مشخصات هدف معتبر نیستند.');
    }
    if(plan.kind==='habit'&&(!Array.isArray(plan.weekdays)||plan.weekdays.some(n=>!Number.isInteger(n)||n<0||n>6)))
      throw Error('روزهای عادت معتبر نیستند.');
  }else if(!['list','clarify'].includes(plan.action)){
    const initial=before.find(x=>x.kind===plan.kind&&x.id===plan.id&&x.parent_id===safe(plan.parent_id,128));
    if(!initial||initial.restricted||!row||!allowed(row)||plan.kind==='step'&&!allowed(parent)||
      initial.title!==label(plan.kind,row)||!initial.title)
      throw Error('مورد انتخاب‌شده تغییر کرده؛ لطفاً دوباره دستور بده.');
    if(plan.action==='update'&&(!safe(plan.title)||!validDate(plan.date)||!validTime(plan.time)||
      !['1','2','3','4'].includes(String(plan.priority))||
      plan.kind==='goal'&&!['short','medium','long'].includes(plan.horizon)))
      throw Error('جزئیات ویرایش معتبر نیست.');
    if(plan.action==='complete'&&plan.kind==='goal')throw Error('برای تکمیل هدف باید ریزقدم‌هایش انجام شوند.');
  }
  return {row,parent};
}
function formatProposal(plan,row,parent){
  const name=kinds[plan.kind];
  if(plan.action==='delete')
    return 'حذف '+name+' «'+label(plan.kind,row)+'»؟'+
    (plan.kind==='goal'?'\nاین هدف '+(row.steps?.length||0)+' ریزقدم هم دارد و آن‌ها نیز حذف می‌شوند.':'')+
    '\nاین حذف برگشت خودکار ندارد.';
  if(plan.action==='complete')return 'تأیید ثبت انجام‌شدن '+name+' «'+label(plan.kind,row)+'»؟';
  const heading=plan.action==='create'?'افزودن '+name:'ویرایش '+name+' «'+label(plan.kind,row)+'»';
  return heading+'\nعنوان جدید: '+plan.title+
    (plan.kind==='step'?'\nزیرمجموعه هدف: '+(parent?.title||''):'')+
    (plan.kind==='goal'?'\nبازه هدف: '+({short:'کوتاه',medium:'میانه',long:'بلند'}[plan.horizon]):'')+
    (plan.kind==='goal'&&plan.description?'\nتوضیح: '+plan.description:'')+
    (plan.date?'\nتاریخ: '+plan.date:'')+
    (plan.time?'\nساعت: '+plan.time:'')+
    (plan.kind==='habit'&&plan.weekdays?.length?'\nروزهای هفته: '+plan.weekdays.join('، '):'')+
    (plan.kind==='goal'&&plan.action==='create'&&plan.steps?.length?'\nریزقدم‌ها:\n'+plan.steps.map((s,i)=>(i+1)+'. '+s.text).join('\n'):'')+
    '\nبعد از تأیید در حساب تو ذخیره شود؟';
}
async function ask(text,deleteAction=false){
  if(window.ElaraDialog?.confirm)return await window.ElaraDialog.confirm(text,{
    title:deleteAction?'تأیید حذف دائمی':'تأیید دستور الارا',
    confirmText:deleteAction?'بله، حذف شود':'تأیید و اجرا',danger:deleteAction
  });
  return window.confirm(text);
}
function commit(state){
  const raw=JSON.stringify(state);
  if(raw.length>780000)throw Error('داده‌ها از ظرفیت فعلی همگام‌سازی بزرگ‌تر هستند؛ تغییری ثبت نشد.');
  localStorage.setItem(STORE,raw);
  window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:state}));
  window.dispatchEvent(new Event('elara:data-changed'));
}
function newStep(step,priority){
  return {id:crypto.randomUUID(),text:safe(step.text),date:safe(step.date,10),time:safe(step.time,5),
    priority:String(priority||'4'),list:'',folder:'',tag:'',dailyTarget:1,dailyProgress:{},
    recurrenceRule:null,occurrenceDone:[],skippedDates:[],done:false};
}
function applyDraft(state,plan){
  const kind=plan.kind,coll=fields[kind];
  if(plan.action==='create'){
    if(kind==='task')state.tasks.unshift({
      id:crypto.randomUUID(),text:safe(plan.title),shortDescription:'',description:'',
      date:safe(plan.date,10),time:safe(plan.time,5),priority:String(plan.priority),
      list:'',folder:'',tag:'',completed:false,doneAt:null,xpAwarded:false,
      createdAt:Date.now(),dailyTarget:1,dailyProgress:{},recurrenceRule:null,occurrenceDone:[],
      occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{},sourceGroup:'personal'
    });
    if(kind==='habit'){
      const days=Array.isArray(plan.weekdays)?plan.weekdays:[];
      const rule=days.length?{frequency:'weekly',interval:1,weekdays:days,startDate:localDate(),
        endDate:null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}:null;
      state.habits.unshift({id:crypto.randomUUID(),title:safe(plan.title,120),days:[],rewardDays:[],
        dailyTarget:1,dailyProgress:{},recurrenceRule:rule,skippedDates:[],occurrenceOverrides:{}});
    }
    if(kind==='goal')state.goals.unshift({
      id:crypto.randomUUID(),title:safe(plan.title),description:safe(plan.description,1200),
      horizon:plan.horizon,date:safe(plan.date,10),time:safe(plan.time,5),
      priority:String(plan.priority),list:'',folder:'',tag:'',dailyTarget:1,dailyProgress:{},
      recurrenceRule:null,skippedDates:[],
      steps:(plan.steps||[]).map(s=>newStep(s,plan.priority))
    });
    if(kind==='step'){
      const parent=state.goals.find(x=>String(x.id)===String(plan.parent_id));
      parent.steps=Array.isArray(parent.steps)?parent.steps:[];
      parent.steps.push(newStep({text:plan.title,date:plan.date,time:plan.time},plan.priority));
    }
  }else{
    const {row,parent}=locate(state,plan);
    if(plan.action==='delete'){
      if(kind==='step')parent.steps=parent.steps.filter(x=>String(x.id)!==String(plan.id));
      else state[coll]=state[coll].filter(x=>String(x.id)!==String(plan.id));
      if(kind==='task')state.taskCompletionHistory=(state.taskCompletionHistory||[]).filter(h=>String(h.taskId)!==String(plan.id));
    }
    if(plan.action==='update'){
      if(kind==='task'||kind==='step')row.text=safe(plan.title);
      else row.title=safe(plan.title,kind==='habit'?120:180);
      if(kind!=='habit'){
        row.date=safe(plan.date,10);row.time=safe(plan.time,5);row.priority=String(plan.priority);
      }
      if(kind==='goal'){row.description=safe(plan.description,1200);row.horizon=plan.horizon;}
    }
    if(plan.action==='complete'&&kind==='step'){
      if(row.recurrenceRule||Number(row.dailyTarget||1)>1)throw Error('ریزقدم تکرارشونده را از بخش هدف‌ها تکمیل کن.');
      if(row.done)throw Error('این ریزقدم قبلاً انجام شده است.');
      row.done=true;
    }
  }
}
function listItems(state,kind){
  const all=kind==='step'?state.goals.flatMap(g=>allowed(g)?(g.steps||[]).filter(allowed).map(s=>({title:s.text,goal:g.title})):[]):(state[fields[kind]]||[]).filter(allowed).map(s=>({title:label(kind,s)}));
  const items=all.slice(0,12);
  return all.length?'موارد '+kinds[kind]+' ('+all.length+' مورد):\n'+
    items.map((x,i)=>(i+1)+'. '+x.title+(x.goal?' — '+x.goal:'')).join('\n'):'هنوز '+kinds[kind]+' شخصی‌ای نداری.';
}
let busy=false;
async function run(message){
  if(busy)return;
  const uid=session(),signed=window.ElaraAccount?.user;
  if(!uid||!window.ElaraAccount?.loaded||!document.body.classList.contains('cloud-ready')||
    document.body.classList.contains('cloud-offline')){
    status('اول وارد حساب شو و منتظر همگام‌سازی Firebase بمان.',true);return;
  }
  const command=safe(message,1000);
  if(command.length<2){status('دستور رو بنویس؛ مثلاً «هدف مطالعه آلمانی با سه ریزقدم بساز».',true);return;}
  busy=true;
  try{
    status('الارا در حال آماده‌کردن پیشنهاد برای مدیریت سایت است…');
    const initial=getState(),inventory=inventoryOf(initial);
    const response=await fetch(endpoint(),{
      method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json',
        'Authorization':'Bearer '+await signed.getIdToken()},
      body:JSON.stringify({message:command,inventory,local_date:localDate(),
        timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'})
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok||payload?.ok!==true)throw Error(payload?.error||'پیشنهاد الارا دریافت نشد. کد Worker باید به‌روز شود.');
    if(session()!==uid)throw Error('حساب کاربری تغییر کرده است.');
    const plan=payload.data?.plan;
    const current=getState(),{row,parent}=assertPlan(plan,current,inventory);
    if(plan.action==='clarify'){status(plan.message||'دستور رو دقیق‌تر بگو.');return;}
    if(plan.action==='list'){status(listItems(current,plan.kind));return;}
    if(!await ask(formatProposal(plan,row,parent),plan.action==='delete')){
      status('دستور لغو شد؛ هیچ تغییری انجام نشد.');return;
    }
    if(session()!==uid||!window.ElaraAccount?.loaded||
      !document.body.classList.contains('cloud-ready')||document.body.classList.contains('cloud-offline'))
      throw Error('حساب یا اتصال ابری تغییر کرده است؛ دوباره امتحان کن.');
    const newest=getState();
    const verified=assertPlan(plan,newest,inventory);
    if(plan.action!=='create'){
      if(!row||!verified.row||JSON.stringify(verified.row)!==JSON.stringify(row)||
         plan.kind==='step'&&JSON.stringify(verified.parent)!==JSON.stringify(parent))
        throw Error('این مورد در فاصله تأیید تغییر کرده؛ درخواست رو تکرار کن.');
    }else if(plan.kind==='step'&&JSON.stringify(verified.parent)!==JSON.stringify(parent))
      throw Error('هدف والد تغییر کرده؛ دوباره درخواست بده.');
    if(plan.action==='complete'&&['task','habit'].includes(plan.kind)){
      const item=verified.row;
      if(plan.kind==='task'){
        if(item.completed||item.recurrenceRule||Number(item.dailyTarget||1)>1)
          throw Error('تسک انجام‌شده یا تکرارشونده را از بخش تسک‌ها مدیریت کن.');
        if(typeof window.ElaraTasks?.taskAction!=='function')
          throw Error('سیستم اصلی تسک هنوز آماده نیست.');
        await window.ElaraTasks.taskAction('commit-task',String(plan.id),localDate());
      }else{
        if(item.days?.includes(localDate()))throw Error('این عادت امروز قبلاً ثبت شده است.');
        if(item.recurrenceRule||Number(item.dailyTarget||1)>1)
          throw Error('عادت زمان‌بندی‌شده را از بخش عادت‌ها ثبت کن.');
        if(typeof window.ElaraTasks?.habitAction!=='function')
          throw Error('سیستم عادت‌ها هنوز آماده نیست.');
        await window.ElaraTasks.habitAction('toggle-habit',String(plan.id),localDate());
      }
    }else{
      applyDraft(newest,plan);
      commit(newest);
      if(['goal','step'].includes(plan.kind))window.ElaraLinkedTasks?.syncAll?.();
    }
    status('✓ '+kinds[plan.kind]+' در حساب تو '+({
      create:'ساخته شد',delete:'حذف شد',update:'ویرایش شد',complete:'انجام‌شده ثبت شد'
    }[plan.action])+'. منتظر وضعیت «✓ ذخیره شد» در Firebase بمان.');
  }catch(e){status(e?.message||'خطای اجرای دستور',true);}
  finally{busy=false;}
}
window.ElaraAIActions={run};
})();
