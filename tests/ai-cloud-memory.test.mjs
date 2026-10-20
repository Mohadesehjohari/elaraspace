import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('cloudflare/elara-ai-worker.js','utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const records=new Map();
const kv={
  async get(key){return records.get(key)??null},
  async put(key,value){records.set(key,value)},
  async delete(key){records.delete(key)}
};
const env={AI_CONFIG:kv,AI_MASTER_KEY:'ab'.repeat(32)};
const realFetch=globalThis.fetch;
globalThis.fetch=async (url,init)=>{
  const target=String(url);
  if(!target.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?'))throw new Error('Unexpected network call: '+target);
  const token=JSON.parse(init.body).idToken;
  if(!['user-alpha','user-beta'].includes(token))return new Response('{}',{status:401});
  return new Response(JSON.stringify({users:[{localId:token,emailVerified:true,email:token+'@example.org'}]}),{status:200});
};
async function call(user,method='GET',body,persona='fox'){
  const res=await worker.fetch(new Request('https://worker.example/ai/memory?persona='+persona,{
    method,headers:{Origin:'https://mohadesehjohari.github.io',Authorization:'Bearer '+user,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  }),env);
  return {status:res.status,body:await res.json()};
}
try{
  let r=await call('user-alpha');
  assert.equal(r.status,200);
  assert.equal(r.body.data.enabled,false);
  r=await call('user-alpha','POST',{enabled:true,history:[{role:'user',text:'My cat is Luna',at:1}]});
  assert.equal(r.status,200);
  assert.equal(r.body.data.enabled,true);
  assert.equal(r.body.data.history.length,1);
  r=await call('user-alpha','POST',{note:'My cat is Luna'});
  assert.equal(r.status,200);
  assert.equal(r.body.data.notes.length,1);
  assert.equal(r.body.data.notes[0].text,'My cat is Luna');
  const raw=[...records.entries()].find(([k])=>k.startsWith('user-memory:v1:'));
  assert.ok(raw);
  assert.equal(raw[1].includes('My cat is Luna'),false,'Cloud KV must not store private notes in plaintext');
  r=await call('user-alpha','GET',undefined,'character');
  assert.equal(r.status,200);
  assert.equal(r.body.data.enabled,false,'Character memory must be independently opt in');
  r=await call('user-alpha','POST',{enabled:true,history:[{role:'user',text:'Character-only story',at:10}]},'character');
  assert.equal(r.status,200);
  assert.equal(r.body.data.history[0].text,'Character-only story');
  r=await call('user-alpha','POST',{note:'Only in character memory',persona:'character'},'character');
  assert.equal(r.status,200);
  assert.equal(r.body.data.notes.length,1);
  r=await call('user-alpha');
  assert.equal(r.body.data.notes.length,1,'Fox retains its original independent memory');
  assert.equal(r.body.data.notes[0].text,'My cat is Luna');
  r=await call('user-alpha','DELETE',undefined,'character');
  assert.equal(r.status,200);
  r=await call('user-alpha');
  assert.equal(r.body.data.notes.length,1,'Deleting character memory must NOT remove Fox memory');
  r=await call('user-beta');
  assert.equal(r.body.data.enabled,false,'Users must have separate private memory');
  assert.equal(r.body.data.notes.length,0,'User B must not read A notes');
  r=await call('user-alpha','POST',{clear_history:true});
  assert.equal(r.body.data.history.length,0);
  assert.equal(r.body.data.notes.length,1,'Clearing chat should preserve pinned facts');
  r=await call('user-alpha','DELETE');
  assert.equal(r.status,200);
  assert.equal(r.body.data.enabled,false);
  r=await call('user-alpha');
  assert.equal(r.body.data.notes.length,0);
  assert.equal(r.body.data.history.length,0);
  const denied=await call('invalid-token');
  assert.equal(denied.status,401);
  console.log('PASS: opt-in encrypted per-user memory, cross-account isolation, clearing and deletion');
}finally{
  globalThis.fetch=realFetch;
}
