import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('elara-ai-actions.js','utf8');
const base=()=>({version:1,tasks:[],goals:[],habits:[],taskCompletionHistory:[],xp:0});
let state=base(),confirmed=true,plan={},counter=0,afterFetch=null;
const KEY='elara_space_v1',events=[],view={textContent:'',style:{},dataset:{}};
const localStorage={
  getItem:key=>key===KEY?JSON.stringify(state):null,
  setItem:(key,raw)=>{assert.equal(key,KEY);state=JSON.parse(raw)}
};
let uid='member-1';
const user={get uid(){return uid},async getIdToken(){return 'member-token'}};
const window={
  ElaraAccount:{user,get loaded(){return true}},
  ELARA_AI_API_URL:'https://example.workers.dev',
  ElaraDialog:{async confirm(){return confirmed}},
  ElaraLinkedTasks:{syncAll:()=>events.push('linked-sync')},
  ElaraTasks:{
    async taskAction(kind,id){assert.equal(kind,'commit-task');state.tasks.find(x=>x.id===id).completed=true},
    async habitAction(kind,id){assert.equal(kind,'toggle-habit');
      const row=state.habits.find(x=>x.id===id);row.days=[...new Set([...(row.days||[]),'2026-10-20'])]}
  },
  dispatchEvent:ev=>events.push(ev.type)
};
const document={
  body:{classList:{contains:x=>x==='cloud-ready'}},
  querySelector:()=>view
};
const fetch=async(url,req)=>{
  assert.equal(url,'https://example.workers.dev/ai/action-plan');
  assert.match(req.headers.Authorization,/Bearer/);
  const args=JSON.parse(req.body);
  assert.ok(Array.isArray(args.inventory));
  if(afterFetch){afterFetch();afterFetch=null}
  return {ok:true,status:200,async json(){return {ok:true,data:{plan}}}};
};
vm.runInNewContext(source,{
  window,document,localStorage,fetch,Intl,Date,
  crypto:{randomUUID:()=>('created-'+(++counter))},
  CustomEvent:class{constructor(type,extra){this.type=type;this.detail=extra.detail}},
  Event:class{constructor(type){this.type=type}},
  console
});
const run=message=>window.ElaraAIActions.run(message);
plan={action:'create',kind:'goal',title:'آلمانی',date:'',time:'',priority:'3',
  description:'تمرین هر روز',horizon:'medium',steps:[{text:'گوش‌دادن'},{text:'خواندن'}]};
await run('هدف جدید بساز');
assert.equal(state.goals.length,1);
assert.equal(state.goals[0].steps.length,2);
assert.equal(state.goals[0].horizon,'medium');
assert.ok(events.includes('elara:data-changed'),'Cloud sync must be signaled only upon committed change');
const goalId=state.goals[0].id;
plan={action:'update',kind:'goal',id:goalId,title:'آلمانی B1',date:'2026-11-30',time:'09:30',priority:'2',
  horizon:'long',description:'پیشرفته'};
await run('هدف ویرایش کن');
assert.equal(state.goals[0].title,'آلمانی B1');
assert.equal(state.goals[0].steps.length,2,'Updating must retain steps');
plan={action:'create',kind:'habit',title:'مطالعه',date:'',time:'',priority:'4',weekdays:[1,3,5]};
await run('عادت بساز');
assert.equal(state.habits.length,1);
assert.deepEqual([...state.habits[0].recurrenceRule.weekdays],[1,3,5]);
const habitId=state.habits[0].id;
plan={action:'delete',kind:'habit',id:habitId,title:'مطالعه'};
confirmed=false;
await run('عادت را حذف کن');
assert.equal(state.habits.length,1,'Cancel must not change account');
confirmed=true;
await run('عادت را حذف کن');
assert.equal(state.habits.length,0);
plan={action:'create',kind:'goal',title:'ناامن',priority:'4',date:'2026-02-31',time:'',description:'',horizon:'short',steps:[]};
await run('تاریخ نامعتبر');
assert.equal(state.goals.length,1,'Invalid date must not be written');
state.goals.push({id:'shared',title:'گروهی',collabSpaceId:'collab-1',steps:[]});
plan={action:'delete',kind:'goal',id:'shared'};
await run('هدف مشترک حذف شود');
assert.equal(state.goals.some(g=>g.id==='shared'),true,'Shared goals must not be removed');
plan={action:'delete',kind:'goal',id:goalId};
afterFetch=()=>{uid='other-user'};
await run('حساب را تغییر بده');
assert.equal(state.goals.some(g=>g.id===goalId),true,'Account switching must cancel pending action');
console.log('PASS: confirmed goal/step/habit changes, persistence and cancellation, shared-data protections');
