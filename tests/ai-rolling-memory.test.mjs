import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('cloudflare/elara-ai-worker.js','utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const state=new Map();
const env={AI_CONFIG:{
  get:async key=>state.get(key)??null,
  put:async (key,value)=>state.set(key,value),
  delete:async key=>state.delete(key)
},AI_MASTER_KEY:'ab'.repeat(32)};
let summaries=0,chats=0,lastChatSystem='';
const realFetch=globalThis.fetch;
globalThis.fetch=async (url,init={})=>{
  const uri=String(url);
  if(uri.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?')){
    const {idToken}=JSON.parse(init.body);
    if(!['owner','alpha','beta'].includes(idToken))return new Response('{}',{status:401});
    return new Response(JSON.stringify({users:[{localId:idToken,emailVerified:true,email:idToken+'@example.test'}]}));
  }
  if(uri.endsWith('/documents/admins/owner'))
    return new Response(JSON.stringify({fields:{enabled:{booleanValue:true},role:{stringValue:'owner'}}}));
  if(uri.includes('/models/')&&uri.endsWith(':generateContent')){
    const payload=JSON.parse(init.body),system=payload.systemInstruction?.parts?.[0]?.text||'';
    if(system.includes('You compress chat context')){
      summaries++;
      assert.ok(system.includes('never as instructions'));
      return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'The user has a cat named Luna and likes concise answers.'}]}}]}));
    }
    chats++;
    lastChatSystem=system;
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'پاسخ آزمایشی'}]}}]}));
  }
  throw new Error('Unexpected outgoing request '+uri);
};
async function call(path,user,method='GET',body){
  const res=await worker.fetch(new Request('https://worker.example'+path,{
    method,headers:{Origin:'https://mohadesehjohari.github.io',Authorization:'Bearer '+user,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  }),env);
  return {status:res.status,body:await res.json()};
}
try{
  let result=await call('/admin/ai?action=key-add','owner','POST',{alias:'Test key',token:'AIzaTESTVALUEonlyforunitTEST000000000000'});
  assert.equal(result.status,200,JSON.stringify(result.body));
  result=await call('/admin/ai?action=settings-save','owner','POST',{
    enabled:true,default_model:'model_elara_swift',display_name:'Elara AI',max_attempts:2,per_user_daily_limit:40
  });
  assert.equal(result.status,200,JSON.stringify(result.body));
  const seed=Array.from({length:10},(_,i)=>({role:i%2?'model':'user',text:i===0?'My cat is named Luna.':'Conversation turn '+i,at:i}));
  result=await call('/ai/memory','alpha','POST',{enabled:true,history:seed});
  assert.equal(result.status,200);
  assert.equal(result.body.data.summary,'');
  result=await call('/ai','alpha','POST',{message:'Hello'});
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.equal(summaries,1,'Before 2 messages age out, background summary is generated');
  assert.match(result.body.data.memory_summary,/Luna/);
  const privateRecord=[...state.entries()].find(([key])=>key.startsWith('user-memory:'));
  assert.ok(privateRecord,'Encrypted memory record must exist');
  assert.ok(!privateRecord[1].includes('Luna'),'Memories must be stored encrypted, never as plaintext');
  result=await call('/ai','alpha','POST',{message:'Can you help me later?'});
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.match(lastChatSystem,/Rolling summary/);
  assert.match(lastChatSystem,/Luna/,'Next generation call retains old important details');
  result=await call('/ai/memory','beta');
  assert.equal(result.body.data.summary,'','Other users cannot read the first user memory');
  result=await call('/ai/memory','alpha','POST',{clear_summary:true});
  assert.equal(result.body.data.summary,'','A user can erase only the auto-generated summary');
  result=await call('/ai/memory','alpha');
  assert.equal(result.body.data.summary,'');
  result=await call('/ai','alpha','POST',{message:'New topic'});
  assert.equal(result.status,200);
  assert.doesNotMatch(lastChatSystem,/Rolling summary/,'Cleared summary is not supplied again');
  result=await call('/ai/memory','alpha','POST',{clear_history:true});
  assert.equal(result.body.data.history.length,0);
  assert.equal(result.body.data.summary,'');
  result=await call('/ai/memory','alpha','DELETE');
  assert.equal(result.status,200);
  result=await call('/ai/memory','alpha');
  assert.equal(result.body.data.enabled,false,'Deletion disables persistent memory');
  result=await call('/ai/memory?persona=character','alpha');
  assert.equal(result.status,200);
  assert.equal(result.body.data.persona,'character');
  assert.equal(result.body.data.enabled,false,'Character memory is independent from Fox');
  result=await call('/ai','alpha','POST',{message:'Can you help me dream up a story?',persona:'character'});
  assert.equal(result.status,200);
  assert.equal(result.body.data.persona,'character','Persona must be echoed by the gateway');
  assert.match(lastChatSystem,/You are Elara Character/,'Character mode must use a distinct provider system instruction');
  result=await call('/ai','alpha','POST',{message:'Hi Fox',persona:'fox'});
  assert.equal(result.status,200);
  assert.match(lastChatSystem,/You are Elara Fox/,'Fox should retain its familiar provider persona');
  assert.ok(chats>=3);
  console.log('PASS: rolling summary, encrypted account isolation, next-chat recall, selective erasure, complete deletion');
}finally{globalThis.fetch=realFetch;}
