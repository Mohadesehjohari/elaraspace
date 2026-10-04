const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','linked-tasks.js'),'utf8');
const store=new Map(),listeners={};
const context={
  console,Date,Math,JSON,String,Number,Array,Object,Set,Map,Intl,
  crypto:{randomUUID:()=>Math.random().toString(36).slice(2)},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  document:{readyState:'loading',addEventListener:()=>{}},
  queueMicrotask:fn=>fn(),
  CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail}},
  Event:class{constructor(type){this.type=type}},
  window:{addEventListener:(n,f)=>{(listeners[n]??=[]).push(f)},dispatchEvent:()=>{},ElaraAccount:null,ElaraSocial:null}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context);
const api=context.window.ElaraLinkedTasks,day=api.today();
const state={
  xp:0,
  tasks:[],
  habits:[{id:'h1',title:'آب خوردن',days:[],rewardDays:[]}],
  goals:[{id:'g1',title:'هدف من',steps:[{id:'s1',text:'قدم اول',done:false}]}],
  books:[{id:'b1',title:'کتاب تست',shelf:'reading'}],
  words:[{id:'w1',front:'hello',back:'سلام',due:day}],
  taskCompletionHistory:[]
};
assert.equal(api.syncCoreState(state),true);
assert.equal(state.tasks.filter(t=>t.linkedTask).length,4);
const gt=state.tasks.find(t=>t.sourceType==='goal-step');
assert.equal(gt.sourceGroup,'goal');
gt.completed=true;
api.syncSourcesFromTasks(state);
assert.equal(state.goals[0].steps[0].done,true);
const ht=state.tasks.find(t=>t.sourceType==='habit');
assert.equal(ht.sourceGroup,'habit');assert.equal(ht.date,day);assert.equal(ht.completed,false);
ht.completed=true;ht.doneAt=day;api.syncSourcesFromTasks(state);
assert.equal(state.habits[0].days.includes(day),true);assert.equal(state.xp,15);
ht.completed=false;ht.doneAt=null;api.syncSourcesFromTasks(state);
assert.equal(state.habits[0].days.includes(day),false);assert.equal(state.xp,15,'Habit undo must not award twice');
ht.dailyTarget=2;ht.dailyProgress={[day]:1};
state.habits[0].days.push(day);api.syncCoreState(state);
assert.equal(ht.completed,true);assert.equal(ht.dailyProgress[day],2,'source completion must update turn projection');
state.habits[0].days=[];api.syncCoreState(state);
assert.equal(ht.completed,false);assert.equal(ht.dailyProgress[day],0,'source undo must clear projected completion');
const bt=state.tasks.find(t=>t.sourceType==='book');
bt.completed=true;
api.syncSourcesFromTasks(state);
assert.equal(state.books[0].shelf,'finished');
api.syncWorkoutRowsInState(state,[{id:'x1',type:'دویدن',minutes:30,date:day}],'u1');
const xt=state.tasks.find(t=>t.sourceType==='exercise');
assert.equal(xt.completed,true);
assert.equal(xt.sourceGroup,'exercise');
const reviewTask=state.tasks.find(t=>t.sourceType==='language-review'&&t.sourceId===day);
assert.equal(reviewTask.sourceCompletionLocked,false);
reviewTask.completed=true;reviewTask.doneAt=day;
api.syncCoreState(state);
assert.equal(reviewTask.completed,true,'manual Language review completion must survive sync while words remain due');
reviewTask.completed=false;reviewTask.doneAt=null;
api.syncCoreState(state);
assert.equal(reviewTask.completed,false,'manual Language review reopen must remain possible while words remain due');
state.words[0].due='2999-01-01';
api.syncCoreState(state);
const lt=state.tasks.find(t=>t.sourceType==='language-review'&&t.sourceId===day);
assert.equal(lt.completed,true);
api.syncWorkoutRowsInState(state,[],'u1');
assert.equal(state.tasks.some(t=>t.sourceType==='exercise'),false);
context.window.ElaraAccount={user:{uid:'u1'}};
context.localStorage.setItem('elara_language_journal_v1_u1',JSON.stringify([{id:'l1',date:day,minutes:25,words:8,note:'تمرین شنیداری'}]));
assert.equal(api.syncLanguageJournalState(state),true);
const logTask=state.tasks.find(t=>t.sourceType==='language-log');
assert.equal(logTask.sourceGroup,'language');
assert.equal(logTask.completed,true);
context.localStorage.setItem('elara_language_journal_v1_u1','[]');
api.syncLanguageJournalState(state);
assert.equal(state.tasks.some(t=>t.sourceType==='language-log'),false);
console.log('linked tasks contract: PASS');