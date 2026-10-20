import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const js=readFileSync('elara-ai-plans.js','utf8');
let data={version:1,tasks:[],goals:[],habits:[],folders:[],xp:0,taskCompletionHistory:[]};
let uid='owner',allowed=true,pendingModel=null,confirmCalls=0,requests=0;
let writes=0,chatRenders=0,changed=0,clickListener=null,alertMessage='';
const user={get uid(){return uid},async getIdToken(){return 'safe-test-token'}};
const fakeWindow={
  ElaraAccount:{user,loaded:true},ELARA_AI_API_URL:'https://worker.example',
  ElaraFreedomAI:{render(){chatRenders++}},
  ElaraSchedule:{normalize(rule){return {...rule}}},
  ElaraLinkedTasks:{syncAll(){}},
  confirm(){confirmCalls++;return allowed},
  // VM tests simulate browser lifecycle listeners without a real DOM.
  addEventListener(){},
  dispatchEvent(e){if(e.type==='elara:data-changed')changed++}
};
const localStorage={
  getItem(key){assert.equal(key,'elara_space_v1');return JSON.stringify(data)},
  setItem(key,value){assert.equal(key,'elara_space_v1');data=JSON.parse(value);writes++}
};
const document={
 body:{classList:{contains(name){return name==='cloud-ready'}}},
 querySelector(){return {textContent:'',style:{}}},
 addEventListener(name,fn){if(name==='click')clickListener=fn}
};
let id=0;
const mockFetch=async(url,req)=>{
 requests++;assert.equal(url,'https://worker.example/ai/batch-plan');
 const body=JSON.parse(req.body);
 assert.ok(body.inventory.every(i=>i.kind!=='task'||i.id!=='shared-1'));
 return {ok:true,async json(){return {ok:true,data:{proposal:pendingModel}}}};
};
vm.runInNewContext(js,{window:fakeWindow,localStorage,document,fetch:mockFetch,
 crypto:{randomUUID:()=>('test-'+(++id))},Intl,Date,structuredClone,console,
 CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail}},
 Event:class{constructor(type){this.type=type}}
});
const ai=fakeWindow.ElaraAIPlans;
const approve=async()=>{
 clickListener({target:{closest:s=>s==='[data-elara-plan-approve]'?{}:null}});
 await new Promise(resolve=>setImmediate(resolve));
};
assert.equal(ai.isPlanning('برای زبان یه برنامه با هدف و تسک بساز'),true);
assert.equal(ai.isPlanning('سلام حالت چطوره؟'),false);
pendingModel={explanation:'تمرین زبان',items:[
 {action:'create',kind:'task',title:'مطالعه',date:'2026-10-21',time:'09:00',priority:'2',
  folder:'زبان',description:'تمرین زبان',repeat:{frequency:'daily',interval:1,weekdays:[],startDate:'2026-10-21',endDate:''}},
 {action:'create',kind:'folder',title:'زبان'},
 {action:'create',kind:'goal',title:'سطح B1',date:'2026-12-01',time:'',priority:'3',folder:'زبان',
  horizon:'medium',description:'برنامه ترم',steps:[{text:'درس اول',date:'',time:''}]}
]};
assert.equal(await ai.propose('برنامه زبان',[]),true);
assert.equal(writes,0,'Planning alone must not write to storage');
await approve();
assert.equal(writes,1,'Explicit confirmation should persist exactly once');
assert.deepEqual([...data.folders],['زبان']);
assert.equal(data.tasks[0].folder,'زبان');
assert.equal(data.tasks[0].recurrenceRule.frequency,'daily');
assert.equal(data.goals[0].steps.length,1);
assert.equal(changed,1,'Cloud synchronization requested after confirmed change');
assert.equal(confirmCalls,1,'Approval confirmation required');
pendingModel={explanation:'ساده',items:[{action:'create',kind:'folder',title:'خصوصی'}]};
allowed=false;
assert.equal(await ai.propose('یه پوشه بساز'),true);
await approve();
assert.equal(writes,1,'Declined action must not write');
allowed=true;
data.tasks.push({id:'shared-1',text:'خصوصی گروه',shared:true});
pendingModel={explanation:'حذف اشتراکی',items:[{action:'delete',kind:'task',id:'shared-1',title:'خصوصی گروه'}]};
assert.equal(await ai.propose('تسک رو حذف کن'),false,'Shared task must not be executable');
assert.equal(writes,1,'Forbidden operation must not modify storage');
pendingModel={explanation:'یه عادت',items:[{action:'create',kind:'habit',title:'حرکت صبحگاهی',date:'',time:'',priority:'4',
  folder:'',repeat:{frequency:'weekly',interval:1,weekdays:[0,2,4],startDate:'2026-10-20',endDate:''}}]};
assert.equal(await ai.propose('عادت بساز'),true);
await approve();
assert.equal(data.habits.length,1);
assert.deepEqual([...data.habits[0].recurrenceRule.weekdays],[0,2,4]);
assert.equal(writes,2);
console.log('PASS: natural conversation draft, folder and recurrence save only after approval; rejects shared data');
