import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=readFileSync('cloudflare/elara-ai-worker.js','utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'))).default;
const records=new Map(),env={
 AI_MASTER_KEY:'ab'.repeat(32),
 AI_CONFIG:{async get(k){return records.get(k)||null},
   async put(k,v){records.set(k,v)},async delete(k){records.delete(k)}}
};
let output={explanation:'برای تمرین‌های زبان برنامه آماده کردم.',items:[
 {action:'create',kind:'task',title:'تمرین لغت',date:'2026-10-21',time:'09:00',priority:'2',
  folder:'آلمانی',description:'روزانه ۲۰ دقیقه',repeat:{frequency:'daily',interval:1,weekdays:[],startDate:'2026-10-21',endDate:''}},
 {action:'create',kind:'folder',title:'آلمانی'},
 {action:'create',kind:'goal',title:'یادگیری آلمانی',horizon:'medium',folder:'آلمانی',
  steps:[{text:'درس اول'},{text:'گفتار'}]}
]};
let firebaseMutations=0,geminiRequests=0;
const original=globalThis.fetch;
globalThis.fetch=async(url,opt={})=>{
 const address=String(url);
 if(address.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?')){
   const idToken=JSON.parse(opt.body).idToken;
   if(!['owner','user'].includes(idToken))return new Response('{}',{status:401});
   return new Response(JSON.stringify({users:[{localId:idToken,emailVerified:true}]}));
 }
 if(address.endsWith('/documents/admins/owner'))
   return new Response(JSON.stringify({fields:{enabled:{booleanValue:true},role:{stringValue:'owner'}}}));
 if(address.includes('generativelanguage.googleapis.com/')&&address.endsWith(':generateContent')){
   geminiRequests++;
   return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(output)}]}}]}));
 }
 if(address.startsWith('https://firestore.googleapis.com/'))firebaseMutations++;
 throw Error('Unknown outbound request '+address);
};
const fetchWorker=async(identity,body={})=>{
 const response=await worker.fetch(new Request('https://sample.workers.dev/ai/batch-plan',{
   method:'POST',headers:{Origin:'https://mohadesehjohari.github.io',Authorization:'Bearer '+identity,
     'Content-Type':'application/json'},body:JSON.stringify({message:'برای زبان یه برنامه بساز',
     local_date:'2026-10-20',timezone:'Asia/Tehran',inventory:[
       {kind:'goal',id:'goal-1',title:'هدف شخصی'},
       {kind:'goal',id:'goal-shared',title:'هدف مشترک',restricted:true},
       {kind:'task',id:'task-1',title:'تسک قدیمی'}
     ],folders:['شخصی'],...body})
 }),env);
 return {status:response.status,data:await response.json()};
};
try {
 let answer=await worker.fetch(new Request('https://sample.workers.dev/admin/ai?action=key-add',{
    method:'POST',headers:{Origin:'https://mohadesehjohari.github.io',Authorization:'Bearer owner',
    'Content-Type':'application/json'},body:JSON.stringify({alias:'test',token:'AIzaTESTVALUEonlyforunitTEST000000000000'})}),env);
 assert.equal(answer.status,200);
 answer=await worker.fetch(new Request('https://sample.workers.dev/admin/ai?action=settings-save',{
    method:'POST',headers:{Origin:'https://mohadesehjohari.github.io',Authorization:'Bearer owner',
    'Content-Type':'application/json'},body:JSON.stringify({enabled:true,default_model:'model_elara_swift',per_user_daily_limit:70,max_attempts:2})}),env);
 assert.equal(answer.status,200);
 let r=await fetchWorker('user');
 assert.equal(r.status,200,JSON.stringify(r.data));
 assert.equal(r.data.data.proposal.items[0].kind,'folder','New folder planned before dependent tasks');
 assert.equal(r.data.data.proposal.items[1].repeat.frequency,'daily');
 assert.equal(r.data.data.proposal.items[2].steps.length,2);
 output={explanation:'',items:[{kind:'task',action:'delete',id:'invented'}]};
 r=await fetchWorker('user');assert.equal(r.status,422,'Made-up ID rejected');
 output={explanation:'',items:[{kind:'goal',action:'delete',id:'goal-shared'}]};
 r=await fetchWorker('user');assert.equal(r.status,422,'Shared target rejected');
 output={explanation:'',items:[{kind:'task',action:'create',title:'اشتباه',date:'2026-02-31'}]};
 r=await fetchWorker('user');assert.equal(r.status,422,'Invalid date rejected');
 output={explanation:'',items:[{kind:'task',action:'create',title:'روزانه',repeat:{frequency:'weekly',interval:1,weekdays:[]}}]};
 r=await fetchWorker('user');assert.equal(r.status,422,'Weekly repeat requires specific weekdays');
 output={explanation:'لطفا تاریخ رو بگو',question:'چه تاریخی؟',items:[]};
 r=await fetchWorker('user');assert.equal(r.status,200);assert.equal(r.data.data.proposal.items.length,0);
 r=await fetchWorker('bad-token');assert.equal(r.status,401,'Unauthenticated plan denied');
 assert.equal(firebaseMutations,0,'Server never writes user data');
 assert.ok(geminiRequests>=5);
 console.log('PASS: multi-step folder-first, schedule, goal steps, date and privacy validation with no writes');
}finally{globalThis.fetch=original}
