/* Elara: conversational plan preview and atomic, user-confirmed apply. */
(()=>{'use strict';
const STORE='elara_space_v1',nameOf={task:'تسک',goal:'هدف',habit:'عادت',step:'ریزقدم',folder:'پوشه'};
let pending=null,busy=false,notice='',generation=0;
const tidy=(v,n=180)=>String(v??'').trim().slice(0,n);
const esc=v=>tidy(v,1600).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>window.ElaraAccount?.user?.uid||'';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const isoDate=v=>{if(!v)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const [y,m,d]=v.split('-').map(Number),day=new Date(Date.UTC(y,m-1,d,12));return y===day.getUTCFullYear()&&m===day.getUTCMonth()+1&&d===day.getUTCDate()};
const isoTime=v=>!v||/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const privateRow=r=>!!r&&!r.shared&&!r.collabSpaceId&&!r.collabOwnerUid&&!r.linkedTask&&!r.sourceManaged&&r.accountLinkVisibility!=='shared'&&!(r.sourceGroup&&r.sourceGroup!=='personal');
const status=message=>{const h=document.querySelector('.freedom-fox-overlay [data-f-ai-status],#panel-freedom [data-f-ai-status]');if(h){h.textContent=message;h.style.whiteSpace='pre-wrap'}};
function rawState(){const source=localStorage.getItem(STORE);if(!source)throw Error('داده‌های حساب هنوز بارگذاری نشده‌اند.');let data;try{data=JSON.parse(source)}catch{throw Error('داده‌های حساب معتبر نیستند.')}if(!data||data.version!==1||!['tasks','goals','habits','folders'].every(k=>Array.isArray(data[k])))throw Error('ساختار اطلاعات حساب کامل نیست.');return {source,data}}
const signed=()=>!!uid()&&window.ElaraAccount?.loaded&&document.body.classList.contains('cloud-ready')&&!document.body.classList.contains('cloud-offline');
const context=()=>{
  if(!signed())throw Error('اول وارد حسابت شو و منتظر همگام‌سازی Firebase بمان.');
  const {source,data}=rawState();
  const inventory=[],add=(kind,item,parent_id='')=>{
    if(!privateRow(item)||!item?.id)return;
    const title=tidy(kind==='goal'||kind==='habit'?item.title:item.text);
    if(!title)return;
    inventory.push({kind,id:tidy(item.id,128),parent_id,title,
      date:tidy(item.date,10),time:tidy(item.time,5),priority:String(item.priority||'4'),
      horizon:item.horizon||'short',description:kind==='goal'?tidy(item.description,500):'',
      folder:tidy(item.folder,60),completed:!!(kind==='step'?item.done:item.completed)});
  };
  data.tasks.slice(0,65).forEach(t=>add('task',t));
  for(const g of data.goals.slice(0,45)){add('goal',g);if(privateRow(g))(g.steps||[]).slice(0,25).forEach(step=>add('step',step,tidy(g.id,128)))}
  data.habits.slice(0,45).forEach(h=>add('habit',h));
  return {source,inventory:inventory.slice(0,235),folders:data.folders.slice(0,80)};
};
const planningIntent=text=>{
  const m=String(text||'').trim();
  return /برنامه[\s‌-]*(ریزی|بچین|بساز|بده|بنویس|بریز)|(?:یه|یک|برام|برای من)\s*برنامه|(?:هدف|تسک|عادت|ریزقدم|پوشه|کارهای روزانه|کارهای هفته|درس|تمرین).{0,85}(?:بساز|بچین|اضافه|حذف|ویرایش|تغییر|تنظیم|بنویس|بده|پیشنهاد|برنامه|بذار|قرار بده)|(?:بساز|بچین|اضافه|حذف|ویرایش|ثبت کن|بنویس|بذار|مرتب کن).{0,85}(?:تسک|هدف|عادت|ریزقدم|پوشه|برنامه|درس|تمرین)|برای (?:این )?(?:هفته|ماه|فردا|امروز) (?:برنامه|تسک|کار)|(?:هر روز|هر هفته).{0,60}(?:تمرین|مطالعه|کار|بذار)/i.test(m);
};
function operationDescription(item,index){
  const type=nameOf[item.kind]||item.kind;
  const action={create:'ساخت',update:'ویرایش',delete:'حذف',complete:'ثبت انجام'}[item.action]||item.action;
  let details=(index+1)+'. '+action+' '+type+' «'+tidy(item.title,180)+'»';
  if(item.kind==='task'||item.kind==='goal')details+=(item.folder?' | پوشه: '+item.folder:'')+(item.date?' | تاریخ: '+item.date:'')+(item.time?' | '+item.time:'')+(item.description?' | '+tidy(item.description,90):'');
  if(item.kind==='goal'&&item.steps?.length)details+='\n    ریزقدم‌ها: '+item.steps.map(s=>tidy(s.text,100)).join('، ');
  if(item.kind==='habit'||item.kind==='task'){
    const r=item.repeat;
    if(r)details+='\n    تکرار: '+({daily:'روزانه',weekly:'هفتگی',monthly:'ماهانه'}[r.frequency]||r.frequency)+
      (r.interval>1?' هر '+r.interval+' بار':'')+
      (r.weekdays?.length?' (روزهای '+r.weekdays.join('، ')+')':'')+
      (r.startDate?' از '+r.startDate:'')+(r.endDate?' تا '+r.endDate:'');
  }
  if(item.kind==='goal'&&item.action==='delete')details+=' (همه ریزقدم‌ها هم حذف می‌شوند)';
  return details;
}
function mount(host){
  const existing=host?.querySelector('[data-elara-plan]');
  existing?.remove();
  if(!host)return;
  if(!pending||pending.uid!==uid()){
    if(notice){
      const node=document.createElement('p');
      node.dataset.elaraPlan='1';node.setAttribute('role','status');
      node.textContent=notice;node.style.whiteSpace='pre-wrap';
      host.append(node);
    }
    return;
  }
  const section=document.createElement('section');
  section.dataset.elaraPlan='1';
  section.style.cssText='border:1px solid #a889f4;border-radius:14px;background:#15253f;margin:15px 0;padding:16px;line-height:1.9';
  const p=pending.proposal;
  section.innerHTML='<strong>📋 برنامه پیشنهادی الارا — هنوز چیزی ثبت نشده</strong>'+
    '<p style="white-space:pre-wrap">'+esc(p.explanation)+'</p>'+
    '<div style="white-space:pre-wrap;padding:10px;border-radius:9px;background:#0d1c35">'+
    esc(p.items.map(operationDescription).join('\n\n'))+'</div>'+
    '<p style="font-size:12px">تاریخ‌ها و تکرارها رو بررسی کن؛ برای تغییر برنامه می‌تونی دوباره با الارا گفتگو کنی. ثبت فقط بعد از تأیید تو انجام می‌شود.</p>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'+
    '<button type="button" class="freedom-neon-button" data-elara-plan-approve '+(busy?'disabled':'')+'>تأیید و ثبت همه</button>'+
    '<button type="button" class="quiet-button" data-elara-plan-reject '+(busy?'disabled':'')+'>رد پیشنهاد</button></div>';
  const thread=host.querySelector('.freedom-ai-thread');
  if(thread)thread.after(section);else host.prepend(section);
}
const refresh=()=>window.ElaraFreedomAI?.render?.();
const validRepeat=rule=>{
  if(!rule)return null;
  if(!['daily','weekly','monthly'].includes(rule.frequency)||!Number.isInteger(rule.interval)||rule.interval<1||rule.interval>30||
    !Array.isArray(rule.weekdays)||rule.weekdays.some(w=>!Number.isInteger(w)||w<0||w>6)||!isoDate(rule.startDate)||!isoDate(rule.endDate)||
    rule.frequency==='weekly'&&!rule.weekdays.length||rule.endDate&&rule.startDate&&rule.endDate<rule.startDate)
      throw Error('قانون تکرار یکی از کارها معتبر نیست.');
  if(typeof window.ElaraSchedule?.normalize!=='function')throw Error('ماژول زمان‌بندی سایت آماده نیست.');
  const normalized=window.ElaraSchedule.normalize({...rule,startDate:rule.startDate||today(),
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'},rule.startDate||today());
  if(!normalized)throw Error('قانون تکرار پشتیبانی نمی‌شود.');
  return normalized;
};
function planItemTarget(data,item){
  if(item.kind==='step'){
    const goal=data.goals.find(g=>String(g.id)===String(item.parent_id));
    return {parent:goal,row:goal?.steps?.find(x=>String(x.id)===String(item.id))};
  }
  const key={task:'tasks',goal:'goals',habit:'habits'}[item.kind];
  return {row:data[key]?.find(x=>String(x.id)===String(item.id)),parent:null};
}
function checkedOperations(data,items,inventory){
  if(!Array.isArray(items)||!items.length||items.length>12)throw Error('برنامه نامعتبر یا خالی است.');
  const copied=structuredClone(data);
  const folders=new Set(copied.folders);
  for(const item of items.filter(x=>x.kind==='folder')){
    if(item.action!=='create'||!tidy(item.title,60))throw Error('ساخت پوشه نامعتبر است.');
    if(!folders.has(item.title)){folders.add(item.title);copied.folders.push(tidy(item.title,60));}
  }
  const seen=new Set();
  for(const item of items.filter(x=>x.kind!=='folder')){
    if(!['task','goal','habit','step'].includes(item.kind)||!['create','update','delete','complete'].includes(item.action))
      throw Error('عملیات پشتیبانی نمی‌شود.');
    const {row,parent}=planItemTarget(copied,item);
    if(item.action!=='create'){
      const initially=inventory.find(x=>x.kind===item.kind&&x.id===item.id&&x.parent_id===tidy(item.parent_id,128));
      if(!initially||!row||!privateRow(row)||item.kind==='step'&&!privateRow(parent)||
        initially.title!==tidy(item.kind==='goal'||item.kind==='habit'?row.title:row.text))
        throw Error('یکی از موارد تغییر کرده یا خصوصی نیست؛ برنامه را دوباره تهیه کن.');
      const id=item.kind+':'+item.id;if(seen.has(id))throw Error('چند تغییر روی یک مورد مجاز نیست.');seen.add(id);
    }else if(item.kind==='step'&&(!parent||!privateRow(parent)||
      !inventory.some(x=>x.kind==='goal'&&x.id===item.parent_id))){
      throw Error('هدف ریزقدم در حساب تو پیدا نشد.');
    }
    if(['create','update'].includes(item.action)){
      if(!tidy(item.title)||!isoDate(item.date)||!isoTime(item.time)||
        !['1','2','3','4'].includes(String(item.priority)))
        throw Error('تاریخ، عنوان، ساعت یا اولویت نامعتبر است.');
      if(item.folder&&!folders.has(item.folder))throw Error('پوشه «'+item.folder+'» وجود ندارد.');
      if(item.kind==='goal'&&(item.action==='create'&&!Array.isArray(item.steps)||item.steps?.length>8||
          !['short','medium','long'].includes(item.horizon)||
          item.steps?.some(s=>!tidy(s.text)||!isoDate(s.date)||!isoTime(s.time))))
        throw Error('ساختار هدف یا ریزقدم‌های آن معتبر نیست.');
      if(item.kind==='habit'&&(item.date||item.time||item.folder))throw Error('برای عادت ساعت یا پوشه قابل ثبت نیست.');
    }
    const repetition=validRepeat(item.repeat);
    if(repetition&&!['task','habit'].includes(item.kind))throw Error('تکرار در این بخش پشتیبانی نمی‌شود.');
    const id=()=>crypto.randomUUID();
    const makeStep=(step,priority)=>({
      id:id(),text:tidy(step.text),date:tidy(step.date,10),time:tidy(step.time,5),
      priority:String(priority||'4'),done:false,dailyTarget:1,dailyProgress:{},
      recurrenceRule:null,occurrenceDone:[],skippedDates:[]
    });
    if(item.action==='create'){
      if(item.kind==='task')copied.tasks.unshift({
        id:id(),text:tidy(item.title),shortDescription:'',description:tidy(item.description,1000),
        date:tidy(item.date,10),time:tidy(item.time,5),priority:String(item.priority),
        list:'',folder:tidy(item.folder,60),tag:'',completed:false,doneAt:null,
        xpAwarded:false,createdAt:Date.now(),dailyTarget:1,dailyProgress:{},
        recurrenceRule:repetition,occurrenceDone:[],occurrenceRewardDays:[],
        skippedDates:[],occurrenceOverrides:{},sourceGroup:'personal'
      });
      if(item.kind==='goal')copied.goals.unshift({
        id:id(),title:tidy(item.title),description:tidy(item.description,1200),
        horizon:item.horizon,date:tidy(item.date,10),time:tidy(item.time,5),
        priority:String(item.priority),list:'',folder:tidy(item.folder,60),tag:'',
        dailyTarget:1,dailyProgress:{},recurrenceRule:null,skippedDates:[],
        steps:(item.steps||[]).map(step=>makeStep(step,item.priority))
      });
      if(item.kind==='habit')copied.habits.unshift({
        id:id(),title:tidy(item.title,120),days:[],rewardDays:[],
        dailyTarget:1,dailyProgress:{},recurrenceRule:repetition,
        skippedDates:[],occurrenceOverrides:{}
      });
      if(item.kind==='step'){
        parent.steps=Array.isArray(parent.steps)?parent.steps:[];
        parent.steps.push(makeStep({text:item.title,date:item.date,time:item.time},item.priority));
      }
    }else if(item.action==='update'){
      if(item.kind==='task'||item.kind==='step')row.text=tidy(item.title);
      else row.title=tidy(item.title,item.kind==='habit'?120:180);
      if(item.kind!=='habit'){
        row.date=tidy(item.date,10);row.time=tidy(item.time,5);row.priority=String(item.priority);
      }
      if(['task','goal'].includes(item.kind)){
        row.folder=tidy(item.folder,60);
      }
      if(item.kind==='task'&&item.description)row.description=tidy(item.description,1000);
      if(item.kind==='goal'){row.description=tidy(item.description,1200);row.horizon=item.horizon;}
      if(repetition)row.recurrenceRule=repetition;
    }else if(item.action==='delete'){
      if(item.kind==='step')parent.steps=parent.steps.filter(x=>x.id!==item.id);
      else copied[{task:'tasks',goal:'goals',habit:'habits'}[item.kind]]=
        copied[{task:'tasks',goal:'goals',habit:'habits'}[item.kind]].filter(x=>x.id!==item.id);
      if(item.kind==='task')copied.taskCompletionHistory=(copied.taskCompletionHistory||[]).filter(h=>h.taskId!==item.id);
    }else if(item.action==='complete'){
      if(item.kind==='goal'||item.kind==='folder'||item.kind==='step'&&(row.recurrenceRule||Number(row.dailyTarget||1)>1))
        throw Error('تکمیل این مورد از رابط اصلی سایت انجام می‌شود.');
      if(item.kind==='step')row.done=true;
      else if(item.kind==='task'){
        if(row.recurrenceRule||Number(row.dailyTarget||1)>1)throw Error('تسک تکراری را در بخش تسک‌ها تکمیل کن.');
        if(!row.completed){row.completed=true;row.doneAt=today();row.xpAwarded=true;
          copied.taskCompletionHistory=Array.isArray(copied.taskCompletionHistory)?copied.taskCompletionHistory:[];
          copied.taskCompletionHistory.push({key:row.id+':'+today(),taskId:row.id,date:today(),
            title:row.text,completedAt:Date.now()});copied.xp=Number(copied.xp||0)+15;}
      }else if(item.kind==='habit'){
        if(row.recurrenceRule||Number(row.dailyTarget||1)>1)throw Error('عادت تکراری را در بخش عادت‌ها انجام‌شده ثبت کن.');
        row.days=Array.isArray(row.days)?row.days:[];row.rewardDays=Array.isArray(row.rewardDays)?row.rewardDays:[];
        if(!row.days.includes(today()))row.days.push(today());
        if(!row.rewardDays.includes(today())){row.rewardDays.push(today());copied.xp=Number(copied.xp||0)+15;}
      }
    }
  }
  const serialized=JSON.stringify(copied);
  if(serialized.length>780000)throw Error('حجم داده‌ها بیشتر از سقف فعلی همگام‌سازی است.');
  return {data:copied,serialized};
}
async function approve(){
  if(!pending||busy)return;
  if(!signed()||pending.uid!==uid()){pending=null;refresh();status('حساب تغییر کرده است.');return}
  busy=true;refresh();
  try{
    const current=rawState();
    if(current.source!==pending.signature)throw Error('اطلاعات حساب از زمان ساخت پیشنهاد تغییر کرده؛ برنامه را دوباره بگیر.');
    const ready=checkedOperations(current.data,pending.proposal.items,pending.inventory);
    if(!window.confirm('آیا ثبت همه '+pending.proposal.items.length+' تغییر پیشنهادی در حساب تو تأیید می‌شود؟\n\n'+
      pending.proposal.items.map(operationDescription).join('\n').slice(0,3500)))return;
    if(!signed()||pending.uid!==uid()||rawState().source!==pending.signature)throw Error('حساب یا اطلاعات پیش از ثبت تغییر کرده است.');
    localStorage.setItem(STORE,ready.serialized);
    window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:ready.data}));
    window.dispatchEvent(new Event('elara:data-changed'));
    window.ElaraLinkedTasks?.syncAll?.();
    pending=null;notice='✓ تغییرات تأییدشده در سایت ثبت شد. منتظر نشان «✓ ذخیره شد» در Firebase بمان.';status(notice);
  }catch(error){status(error?.message||'ثبت برنامه ناموفق بود.');}
  finally{busy=false;refresh()}
}
async function propose(message,contextRows=[],force=false){
  const request=tidy(message,1400);
  if(!force&&!planningIntent(request))return false;
  if(!signed())return false;
  if(busy)return false;
  const startUid=uid(),requestGeneration=++generation;
  let state;
  try{state=context()}catch(e){if(force)status(e.message);return false}
  busy=true;
  if(force)status('الارا داره پیش‌نویس برنامه رو آماده می‌کنه…');
  try{
    const token=await window.ElaraAccount.user.getIdToken();
    const r=await fetch(String(window.ELARA_AI_API_URL||'').replace(/\/+$/,'')+'/ai/batch-plan',{
      method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json',
        Authorization:'Bearer '+token},
      body:JSON.stringify({message:request,inventory:state.inventory,folders:state.folders,
        local_date:today(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',
        context:contextRows.slice(-8).map(x=>({role:x.role,text:tidy(x.text,1500)})),
        allow_profile_context:window.ElaraFreedomAI?.mayPersonalize?.()===true,
        profile_context:window.ElaraFreedomAI?.profileContext?.()||{}})
    });
    const j=await r.json().catch(()=>null);
    if(!r.ok||j?.ok!==true)throw Error(j?.error||'تهیه پیش‌نویس ناموفق بود؛ کد جدید Worker را Deploy کن.');
    if(uid()!==startUid||generation!==requestGeneration)return false;
    const p=j.data?.proposal;
    if(!p||!Array.isArray(p.items))throw Error('پیشنهاد الارا معتبر نیست.');
    if(!p.items.length){if(force)status(p.question||'برای برنامه به جزئیات بیشتری نیاز دارم.');return false;}
    // Validate everything once in a dry run BEFORE showing a confirmation button.
    checkedOperations(rawState().data,p.items,state.inventory);
    notice='';
    pending={uid:startUid,signature:rawState().source,inventory:state.inventory,proposal:p};
    refresh();status('📋 الارا یک برنامه پیشنهادی آماده کرده؛ جزئیات رو بخون و تأیید یا رد کن.');
    return true;
  }catch(e){if(force)status(e.message||'خطا در برنامه‌ریزی');return false}
  finally{busy=false;refresh()}
}
document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-elara-plan-reject]')){
    pending=null;notice='پیشنهاد کنار گذاشته شد؛ هیچ تغییری ثبت نشد.';refresh();status(notice);return;
  }
  if(event.target.closest?.('[data-elara-plan-approve]')){void approve();return;}
});
window.addEventListener('elara:logout',()=>{generation++;pending=null;notice='';busy=false});
window.ElaraAIPlans={
  mount,consider:(message,rows)=>propose(message,rows,false),
  propose:(message,rows=[])=>propose(message,rows,true),
  invalidate:()=>{generation++;pending=null;notice='';},
  isPlanning:planningIntent
};
})();
