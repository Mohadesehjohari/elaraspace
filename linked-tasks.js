/* Elara cross-feature task links: canonical Tasks representations for Goals, Library, Language and Exercise. */
(()=>{'use strict';
const KEY='elara_space_v1';
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(new Date(String(v)+'T12:00:00').getTime());
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const makeId=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const safe=(v,n=180)=>String(v??'').trim().slice(0,n);
const META={
 'goal-step':{group:'goal',label:'هدف',priority:'3',locked:false},
 'book':{group:'book',label:'کتابخانه',priority:'3',locked:false},
 'language-review':{group:'language',label:'زبان',priority:'3',locked:false},
 'language-log':{group:'language',label:'زبان',priority:'3',locked:true},
 'exercise':{group:'exercise',label:'ورزش',priority:'3',locked:true}
};
let syncing=false;
function ensure(s){if(!s||typeof s!=='object'||Array.isArray(s))s={};for(const k of ['tasks','goals','books','words','taskCompletionHistory','linkedTaskDismissals'])if(!Array.isArray(s[k]))s[k]=[];return s}
function readCore(){try{return ensure(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return ensure({})}}
function keyOf(type,id,parent=''){return `${type}:${parent||''}:${id||''}`}
function taskKey(t){return keyOf(t?.sourceType,t?.sourceId,t?.sourceParentId)}
function completionKey(taskId,date){return String(taskId||'')+':'+String(date||'')}
function history(state){state.taskCompletionHistory=Array.isArray(state.taskCompletionHistory)?state.taskCompletionHistory:[];return state.taskCompletionHistory}
function recordHistory(state,task,date){if(!validDate(date))return;const list=history(state),key=completionKey(task.id,date);if(!list.some(x=>x?.key===key))list.push({key,taskId:task.id,date,title:safe(task.text,180),completedAt:Date.now()});state.taskCompletionHistory=list.slice(-20000)}
function removeHistory(state,task,date){if(!validDate(date))return;const key=completionKey(task.id,date);state.taskCompletionHistory=history(state).filter(x=>x?.key!==key)}
function setCompleted(state,task,value,date=''){
 const before=!!task.completed,oldDate=task.doneAt;
 task.completed=!!value;task.xpAwarded=true;
 if(task.completed){if(validDate(date))task.doneAt=date;else if(!validDate(task.doneAt))task.doneAt=null;if(validDate(task.doneAt))recordHistory(state,task,task.doneAt)}
 else{task.doneAt=null;if(validDate(oldDate))removeHistory(state,task,oldDate)}
 return before!==task.completed||oldDate!==task.doneAt;
}
function upsert(state,spec){
 ensure(state);const meta=META[spec.sourceType];if(!meta||!spec.sourceId)return {task:null,changed:false};
 const sourceId=safe(spec.sourceId,128),sourceParentId=safe(spec.sourceParentId,128),wanted=keyOf(spec.sourceType,sourceId,sourceParentId);
 if(state.linkedTaskDismissals.includes(wanted))return {task:null,changed:false,dismissed:true};
 let task=state.tasks.find(t=>t?.linkedTask&&taskKey(t)===wanted),changed=false;
 if(!task){task={id:makeId(),text:safe(spec.title)||meta.label,shortDescription:'',description:'',date:'',time:'',priority:meta.priority,list:'',folder:'',tag:'',completed:false,doneAt:null,xpAwarded:true,createdAt:Date.now(),recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{},dailyTarget:1,dailyProgress:{},linkedTask:true,sourceType:spec.sourceType,sourceId,sourceParentId,sourceGroup:meta.group,sourceLabel:meta.label,sourceManaged:true,sourceCompletionLocked:!!meta.locked,sourceOwner:safe(spec.sourceOwner,128)};state.tasks.unshift(task);changed=true}
 const set=(k,v)=>{if(v!==undefined&&task[k]!==v){task[k]=v;changed=true}};
 set('linkedTask',true);set('sourceType',spec.sourceType);set('sourceId',sourceId);set('sourceParentId',sourceParentId);set('sourceGroup',meta.group);set('sourceLabel',meta.label);set('sourceManaged',true);set('sourceCompletionLocked',!!meta.locked);set('xpAwarded',true);
 if(spec.sourceOwner!==undefined)set('sourceOwner',safe(spec.sourceOwner,128));
 if(!task.sourceUserEdited){
  if(spec.title!==undefined)set('text',safe(spec.title)||meta.label);
  if(spec.shortDescription!==undefined)set('shortDescription',safe(spec.shortDescription,280));
  if(spec.date!==undefined)set('date',validDate(spec.date)?spec.date:'');
  if(spec.priority!==undefined)set('priority',String(spec.priority));
  if(spec.dailyTarget!==undefined)set('dailyTarget',Math.max(1,Math.min(24,Math.round(Number(spec.dailyTarget)||1))));
 }
 if(spec.completed!==undefined)changed=setCompleted(state,task,!!spec.completed,spec.completedDate||spec.date||'')||changed;
 return {task,changed};
}
function dismissTask(state,task){ensure(state);if(!task?.linkedTask)return false;const key=taskKey(task);if(!key)return false;if(!state.linkedTaskDismissals.includes(key))state.linkedTaskDismissals.push(key);return true}
function syncSourcesFromTasks(state){
 ensure(state);let changed=false;
 for(const task of state.tasks){
  if(!task?.linkedTask)continue;
  if(task.sourceType==='goal-step'){
   const goal=state.goals.find(g=>String(g?.id)===String(task.sourceParentId)),step=goal?.steps?.find(s=>String(s?.id)===String(task.sourceId));
   if(step&&!!step.done!==!!task.completed){step.done=!!task.completed;changed=true}
  }else if(task.sourceType==='book'){
   const book=state.books.find(b=>String(b?.id)===String(task.sourceId));
   if(book){const next=task.completed?'finished':(book.shelf==='finished'?'reading':book.shelf);if(next!==book.shelf){book.shelf=next;book.finishedAt=task.completed?Date.now():null;if(task.completed&&book.totalPages)book.currentPage=book.totalPages;changed=true}}
  }
 }
 return changed;
}
function syncCoreState(input){
 const state=ensure(input),originalCount=state.tasks.length,seen=new Set();state.tasks=state.tasks.filter(t=>{if(!t?.linkedTask)return true;const key=taskKey(t);if(seen.has(key))return false;seen.add(key);return true});const goalKeys=new Set(),bookKeys=new Set();let changed=originalCount!==state.tasks.length;
 for(const goal of state.goals){
  for(const step of Array.isArray(goal?.steps)?goal.steps:[]){
   if(!step?.id)continue;goalKeys.add(keyOf('goal-step',step.id,goal.id));
   changed=upsert(state,{sourceType:'goal-step',sourceId:step.id,sourceParentId:goal.id,title:step.text||'قدم هدف',shortDescription:`قدم از هدف «${goal.title||'هدف'}»`,completed:!!step.done}).changed||changed;
  }
 }
 for(const book of state.books){
  if(!book?.id)continue;bookKeys.add(keyOf('book',book.id,''));
  changed=upsert(state,{sourceType:'book',sourceId:book.id,title:`مطالعه کتاب: ${book.title||'کتاب'}`,shortDescription:'ایجادشده از کتابخانه',completed:book.shelf==='finished'}).changed||changed;
 }
 const before=state.tasks.length;
 state.tasks=state.tasks.filter(t=>!(t?.linkedTask&&t.sourceType==='goal-step'&&!goalKeys.has(taskKey(t)))&&!(t?.linkedTask&&t.sourceType==='book'&&!bookKeys.has(taskKey(t))));
 if(state.tasks.length!==before)changed=true;
 if(!state.words.length){const n=state.tasks.length;state.tasks=state.tasks.filter(t=>!(t.linkedTask&&t.sourceType==='language-review'));changed=changed||n!==state.tasks.length}
 const day=today(),pending=state.words.filter(w=>validDate(w?.due)&&w.due<=day),lang=state.tasks.find(t=>t?.linkedTask&&t.sourceType==='language-review'&&t.sourceId===day);
 if(pending.length||lang){
  changed=upsert(state,{sourceType:'language-review',sourceId:day,title:'مرور واژه‌های زبان',shortDescription:pending.length?`${pending.length.toLocaleString('fa-IR')} واژه برای مرور`:'مرور امروز کامل شد',date:day,completed:pending.length===0?true:undefined,completedDate:pending.length===0?day:''}).changed||changed;
 }
 return changed;
}
function syncWorkoutRowsInState(input,rows,owner=''){
 const state=ensure(input),valid=new Set();let changed=false;
 for(const row of Array.isArray(rows)?rows:[]){
  if(!row?.id||!validDate(row.date))continue;const id=String(row.id);valid.add(id);
  const type=row.type==='ورزش دیگر'?(row.customType||'ورزش دیگر'):(row.type||'تمرین'),minutes=Math.max(0,Number(row.minutes)||0);
  changed=upsert(state,{sourceType:'exercise',sourceId:id,sourceOwner:owner,title:`${type}${minutes?' · '+minutes.toLocaleString('fa-IR')+' دقیقه':''}`,shortDescription:'ثبت‌شده از بخش ورزش',date:row.date,completed:true,completedDate:row.date}).changed||changed;
 }
 if(owner){const before=state.tasks.length;state.tasks=state.tasks.filter(t=>!(t?.linkedTask&&t.sourceType==='exercise'&&t.sourceOwner===owner&&!valid.has(String(t.sourceId))));if(state.tasks.length!==before)changed=true}
 return changed;
}
function currentUid(){return String(window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'')}
function syncLanguageJournalState(state){
 const uid=currentUid();if(!uid)return false;let rows=[];try{rows=JSON.parse(localStorage.getItem('elara_language_journal_v1_'+uid)||'[]');if(!Array.isArray(rows))rows=[]}catch{rows=[]}
 const valid=new Set();let changed=false;
 for(const row of rows){if(!row?.id||!validDate(row.date))continue;const id=String(row.id);valid.add(id);const minutes=Math.max(1,Number(row.minutes)||1),words=Math.max(0,Number(row.words)||0);
  changed=upsert(state,{sourceType:'language-log',sourceId:id,sourceOwner:uid,title:`تمرین زبان · ${minutes.toLocaleString('fa-IR')} دقیقه`,shortDescription:row.note||`${words.toLocaleString('fa-IR')} واژه تمرین شد`,date:row.date,completed:true,completedDate:row.date}).changed||changed;
 }
 const before=state.tasks.length;state.tasks=state.tasks.filter(t=>!(t?.linkedTask&&t.sourceType==='language-log'&&t.sourceOwner===uid&&!valid.has(String(t.sourceId))));if(before!==state.tasks.length)changed=true;
 return changed;
}
function syncWellnessState(state){
 const uid=currentUid();if(!uid)return false;let data={};try{data=JSON.parse(localStorage.getItem('elara_private_wellness_v1_'+uid)||'{}')||{}}catch{}
 return syncWorkoutRowsInState(state,data.workouts||[],uid);
}
function commit(state){
 localStorage.setItem(KEY,JSON.stringify(state));
 window.dispatchEvent(new CustomEvent('elara:linked-state',{detail:state}));
 window.dispatchEvent(new Event('elara:data-changed'));
}
function syncAll({fromTasks=false}={}){
 if(syncing)return false;syncing=true;
 try{const state=readCore();let changed=false;if(fromTasks)changed=syncSourcesFromTasks(state)||changed;changed=syncCoreState(state)||changed;changed=syncLanguageJournalState(state)||changed;changed=syncWellnessState(state)||changed;if(changed)commit(state);return changed}
 finally{syncing=false}
}
function stateCommitted(event){
 if(syncing)return;syncing=true;
 try{const state=ensure(event?.detail&&typeof event.detail==='object'?event.detail:readCore());let changed=false;changed=syncCoreState(state)||changed;changed=syncLanguageJournalState(state)||changed;changed=syncWellnessState(state)||changed;if(changed){localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent('elara:linked-state',{detail:state}));window.dispatchEvent(new Event('elara:data-changed'))}}
 finally{syncing=false}
}
window.ElaraLinkedTasks={META,today,upsert,dismissTask,syncCoreState,syncLanguageJournalState,syncWorkoutRowsInState,syncSourcesFromTasks,syncAll};
window.addEventListener('elara:state-committed',stateCommitted);
window.addEventListener('elara:data-changed',()=>syncAll());
window.addEventListener('elara:wellness-saved',()=>syncAll());
window.addEventListener('elara:language-journal-changed',()=>syncAll());
window.addEventListener('elara:account-ready',()=>syncAll());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>syncAll(),{once:true});else queueMicrotask(()=>syncAll());
})();
