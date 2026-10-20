import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workerSrc=readFileSync('cloudflare/elara-ai-worker.js','utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(workerSrc).toString('base64'))).default;
const records=new Map(),env={
  AI_MASTER_KEY:'ab'.repeat(32),
  AI_CONFIG:{
    async get(key){return records.get(key)||null},
    async put(key,value){records.set(key,value)},
    async delete(key){records.delete(key)}
  }
};
let proposal={action:'create',kind:'goal',title:'آلمانی B1',horizon:'medium',date:'2026-12-30',
  priority:'2',description:'روزی یک ساعت',steps:[{text:'۱۰ درس خواندن'},{text:'تمرین گفتار'}]};
let providerCalls=0,firestoreWrites=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
  const addr=String(url);
  if(addr.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?')){
    const {idToken}=JSON.parse(opts.body);
    if(!['owner','member'].includes(idToken))return new Response('{}',{status:401});
    return new Response(JSON.stringify({users:[{localId:idToken,emailVerified:true}]}));
  }
  if(addr.endsWith('/documents/admins/owner'))
    return new Response(JSON.stringify({fields:{enabled:{booleanValue:true},role:{stringValue:'owner'}}}));
  if(addr.includes('generativelanguage.googleapis.com/')&&addr.includes(':generateContent')){
    providerCalls++;
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(proposal)}]}}]}));
  }
  if(addr.startsWith('https://firestore.googleapis.com/'))firestoreWrites++;
  throw Error('Unexpected '+addr);
};
async function req(path,identity,body){
  const response=await worker.fetch(new Request('https://worker.test'+path,{method:'POST',headers:{
    Authorization:'Bearer '+identity,Origin:'https://mohadesehjohari.github.io','Content-Type':'application/json'
  },body:JSON.stringify(body)}),env);
  return {status:response.status,data:await response.json()};
}
const inventory=[
  {kind:'task',id:'task-1',title:'تمرین',date:'2026-10-20',priority:'3'},
  {kind:'task',id:'linked',title:'تسک اشتراکی',restricted:true},
  {kind:'goal',id:'goal-1',title:'یادگیری فرانسه',horizon:'long',priority:'2'},
  {kind:'goal',id:'collab',title:'هدف مشترک',restricted:true},
  {kind:'habit',id:'habit-1',title:'پیاده‌روی'},
  {kind:'step',id:'step-1',parent_id:'goal-1',title:'واژگان'},
  {kind:'step',id:'step-shared',parent_id:'collab',title:'گام مشترک'}
];
const send=(text='درخواست آزمایشی')=>req('/ai/action-plan','member',{
  message:text,inventory,local_date:'2026-10-20',timezone:'Asia/Tehran'
});
try{
  let r=await req('/admin/ai?action=key-add','owner',{alias:'test',token:'AIzaTESTVALUEonlyforunitTEST000000000000'});
  assert.equal(r.status,200,JSON.stringify(r.data));
  r=await req('/admin/ai?action=settings-save','owner',{enabled:true,default_model:'model_elara_swift',per_user_daily_limit:50,max_attempts:2});
  assert.equal(r.status,200);
  r=await send('هدف آلمانی بساز');
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.deepEqual(r.data.data.plan.steps.map(s=>s.text),['۱۰ درس خواندن','تمرین گفتار']);
  assert.equal(r.data.data.plan.horizon,'medium');
  proposal={action:'create',kind:'habit',title:'مطالعه',weekdays:[0,2,4]};
  r=await send('عادت مطالعه روزهای یکشنبه و سه‌شنبه و پنجشنبه');
  assert.equal(r.status,200);
  assert.deepEqual(r.data.data.plan.weekdays,[0,2,4]);
  proposal={action:'create',kind:'step',parent_id:'goal-1',title:'شنیدن فایل فرانسوی'};
  r=await send('یک ریزقدم اضافه کن');
  assert.equal(r.status,200);
  assert.equal(r.data.data.plan.parent_id,'goal-1');
  proposal={action:'delete',kind:'goal',id:'goal-1'};
  r=await send('هدف فرانسه را حذف کن');
  assert.equal(r.status,200);
  assert.equal(r.data.data.plan.title,'یادگیری فرانسه');
  proposal={action:'update',kind:'task',id:'task-1',title:'تمرین جدید'};
  r=await send('عنوان تمرین را تغییر بده');
  assert.equal(r.status,200);
  assert.equal(r.data.data.plan.date,'2026-10-20','Existing date must be preserved');
  proposal={action:'delete',kind:'goal',id:'invented'};
  r=await send();
  assert.equal(r.status,422,'Invented ID rejected');
  proposal={action:'delete',kind:'goal',id:'collab'};
  r=await send();
  assert.equal(r.status,403,'Shared goal rejected');
  proposal={action:'delete',kind:'step',id:'step-shared'};
  r=await send();
  assert.equal(r.status,403,'Step of shared goal rejected');
  proposal={action:'create',kind:'step',parent_id:'invented',title:'گام نامعلوم'};
  r=await send();
  assert.equal(r.status,422,'Invented parent rejected');
  proposal={action:'create',kind:'goal',title:'هدف',date:'2026-02-31',steps:[]};
  r=await send();
  assert.equal(r.status,422,'Invalid calendar date rejected');
  proposal={action:'clarify',message:'اسم هدف رو بگو'};
  r=await send();
  assert.equal(r.status,200);
  assert.equal(r.data.data.plan.kind,'','Clarification without type is allowed');
  r=await req('/ai/action-plan','invalid',{message:'هدف بساز',inventory});
  assert.equal(r.status,401);
  assert.equal(firestoreWrites,0,'Planning must not mutate Firestore');
  assert.ok(providerCalls>=9);
  console.log('PASS: goals, habits, substeps, safety, ownership, date validation and no Firebase writes');
}finally{globalThis.fetch=originalFetch}
