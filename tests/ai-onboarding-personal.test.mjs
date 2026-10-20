import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=(await import('data:text/javascript;base64,'+Buffer.from(readFileSync('cloudflare/elara-ai-worker.js','utf8')).toString('base64'))).default;
const kv=new Map(),env={AI_CONFIG:{get:async k=>kv.get(k)||null,put:async(k,v)=>{kv.set(k,v)},delete:async k=>{kv.delete(k)}},AI_MASTER_KEY:'ab'.repeat(32)};
const captured=[];
const old=globalThis.fetch;
globalThis.fetch=async(url,opt={})=>{
 const endpoint=String(url);
 if(endpoint.startsWith('https://identitytoolkit.googleapis.com/')){
   if(JSON.parse(opt.body).idToken!=='owner'&&JSON.parse(opt.body).idToken!=='member')return new Response('{}',{status:401});
   return new Response(JSON.stringify({users:[{localId:JSON.parse(opt.body).idToken,emailVerified:true}]}));
 }
 if(endpoint.endsWith('/documents/admins/owner'))return new Response(JSON.stringify({fields:{enabled:{booleanValue:true},role:{stringValue:'owner'}}}));
 if(endpoint.includes('generativelanguage.googleapis.com/')&&endpoint.includes(':generateContent')){
   captured.push(JSON.parse(opt.body).systemInstruction?.parts?.[0]?.text||'');
   return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'سلام! خوش اومدی.'}]}}]}));
 }
 throw Error('Unexpected outbound '+endpoint);
};
async function send(path,as,body){
 const response=await worker.fetch(new Request('https://example.workers.dev'+path,{method:'POST',
 headers:{Origin:'https://mohadesehjohari.github.io',Authorization:'Bearer '+as,'Content-Type':'application/json'},
 body:JSON.stringify(body)}),env);
 return {status:response.status,body:await response.json()};
}
const profile={name:'سارا',bio:'من روباه عاشق کتابم! 🦊',tasks:[{title:'مطالعه',date:'2026-10-24'}],goals:[{title:'آلمانی'}]};
try{
 let r=await send('/admin/ai?action=key-add','owner',{alias:'test',token:'AIzaTESTVALUEonlyforunitTEST000000000000'});
 assert.equal(r.status,200,JSON.stringify(r.body));
 r=await send('/admin/ai?action=settings-save','owner',{enabled:true,default_model:'model_elara_swift',per_user_daily_limit:50,max_attempts:2});
 assert.equal(r.status,200);
 r=await send('/ai','member',{message:'سلام',first_message:true,profile_context:profile,allow_profile_context:false});
 assert.equal(r.status,200,JSON.stringify(r.body));
 assert.match(captured.at(-1),/سارا/);
 assert.doesNotMatch(captured.at(-1),/روباه عاشق کتابم/,'Private bio must not be shared without permission');
 assert.doesNotMatch(captured.at(-1),/آلمانی/,'Goals must not be shared without consent');
 assert.match(captured.at(-1),/FIRST sent message/,'Friendly first greeting instruction');
 r=await send('/ai','member',{message:'به نظرت چه برنامه‌ای داشته باشم؟',first_message:false,
   history:[{role:'user',text:'سلام'}],allow_profile_context:true,profile_context:profile});
 assert.equal(r.status,200,JSON.stringify(r.body));
 assert.match(captured.at(-1),/روباه عاشق کتابم/);
 assert.match(captured.at(-1),/آلمانی/);
 assert.match(captured.at(-1),/tentative observations/);
 assert.match(captured.at(-1),/NOT their first message/);
 r=await send('/ai','member',{message:'برنامه کاراکتر',persona:'character',first_message:true,allow_profile_context:false,profile_context:profile});
 assert.equal(r.body.data.persona,'character');
 assert.match(captured.at(-1),/You are Elara Character/);
 console.log('PASS: friendly first user name, explicit personal data consent, no sensitive personality guesses and independent Fox/Character modes');
}finally{globalThis.fetch=old}
