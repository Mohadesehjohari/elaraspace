import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const original=readFileSync('cloudflare/elara-ai-worker.js','utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'))).default;
const records=new Map();
const env={
  AI_MASTER_KEY:'ab'.repeat(32),
  AI_CONFIG:{
    async get(key){return records.get(key)||null},
    async put(key,value){records.set(key,value)},
    async delete(key){records.delete(key)}
  }
};
let modelPlan={action:'create',title:'مطالعه زبان',date:'2026-10-20',time:'09:00',priority:'3'};
let providerCount=0,firebaseWrites=0;
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init={})=>{
  const addr=String(url);
  if(addr.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?')){
    const {idToken}=JSON.parse(init.body);
    if(idToken!=='owner'&&idToken!=='member')return new Response('{}',{status:401});
    return new Response(JSON.stringify({users:[{localId:idToken,emailVerified:true}]}));
  }
  if(addr.endsWith('/documents/admins/owner')){
    return new Response(JSON.stringify({fields:{enabled:{booleanValue:true},role:{stringValue:'owner'}}}));
  }
  if(addr.includes('generativelanguage.googleapis.com/')&&addr.includes(':generateContent')){
    providerCount++;
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(modelPlan)}]}}]}));
  }
  if(addr.startsWith('https://firestore.googleapis.com/'))firebaseWrites++;
  throw new Error('Unexpected endpoint '+addr);
};
const request=async(path,identity,body)=>{
  const response=await worker.fetch(new Request('https://worker.example'+path,{method:'POST',headers:{
    Authorization:'Bearer '+identity,Origin:'https://mohadesehjohari.github.io','Content-Type':'application/json'
  },body:JSON.stringify(body)}),env);
  return {status:response.status,body:await response.json()};
};
try{
  let r=await request('/admin/ai?action=key-add','owner',{alias:'safe-test',token:'AIzaTESTVALUEonlyforunitTEST000000000000'});
  assert.equal(r.status,200,JSON.stringify(r.body));
  r=await request('/admin/ai?action=settings-save','owner',{enabled:true,display_name:'Elara AI',default_model:'model_elara_swift',per_user_daily_limit:20,max_attempts:2});
  assert.equal(r.status,200);
  const tasks=[{id:'personal-123',title:'خرید',date:'2026-10-19',time:'',restricted:false},
    {id:'shared-123',title:'کار مشترک',date:'',time:'',restricted:true}];
  r=await request('/ai/task-plan','member',{message:'فردا ساعت ۹ مطالعه زبان بساز',tasks,local_date:'2026-10-19',timezone:'Asia/Tehran'});
  assert.equal(r.status,200,JSON.stringify(r.body));
  assert.deepEqual(r.body.data.plan,{action:'create',title:'مطالعه زبان',date:'2026-10-20',time:'09:00',priority:'3'});
  modelPlan={action:'delete',id:'personal-123'};
  r=await request('/ai/task-plan','member',{message:'تسک خرید را حذف کن',tasks,local_date:'2026-10-19'});
  assert.equal(r.status,200);
  assert.deepEqual(r.body.data.plan,{action:'delete',id:'personal-123',title:'خرید'});
  modelPlan={action:'delete',id:'unknown'};
  r=await request('/ai/task-plan','member',{message:'پاک کن',tasks});
  assert.equal(r.status,422,'Hallucinated IDs must be rejected');
  modelPlan={action:'delete',id:'shared-123'};
  r=await request('/ai/task-plan','member',{message:'تسک مشترک را حذف کن',tasks});
  assert.equal(r.status,403,'Shared/linked tasks must not be auto-managed');
  modelPlan={action:'clarify',message:'کدام تسک مد نظرته؟'};
  r=await request('/ai/task-plan','member',{message:'یکی را حذف کن',tasks});
  assert.equal(r.status,200);
  assert.equal(r.body.data.plan.action,'clarify');
  r=await request('/ai/task-plan','bad-user',{message:'تسک بساز',tasks});
  assert.equal(r.status,401);
  assert.equal(firebaseWrites,0,'Gemini must never write tasks to Firestore directly');
  assert.ok(providerCount>=5);
  console.log('PASS: AI task plans authenticated, IDs validated, restricted items rejected, no writes without browser confirmation');
}finally{globalThis.fetch=realFetch;}
