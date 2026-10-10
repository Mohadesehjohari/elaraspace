// New Social Closure client exercised against the actual Bridge Firestore Rules.
// Baseline multi-UID tests include identity, friend, DM, club, collab all 5 kinds,
// presence, privacy, block, reports, and new Challenge Now.
await import('./firestore-rules-emulator.mjs');
import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,getDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'demo-elara-rules',firestore:{host,port:Number(port),rules}});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const a=db('newAlice'),b=db('newBob'),e=db('newEve'),d=(db,path)=>doc(db,path);
async function seed(){
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const admin=ctx.firestore();
  for(const uid of ['newAlice','newBob','newEve']){
   const username=uid.toLowerCase();
   await setDoc(d(admin,'profiles/'+uid),{username,name:uid,bio:'',xp:820,profilePublic:true});
   await setDoc(d(admin,'usernames/'+username),{uid});
  }
  await setDoc(d(admin,'friendRequests/newAlice_newBob'),{from:'newAlice',to:'newBob',status:'accepted'});
 });
}
const payload=(mode,id)=>({from:'newAlice',to:'newBob',status:'pending',targetKind:'reading',targetText:'Read twenty pages',targetValue:20,mode,attempt:1,originId:id,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),expiresAt:mode==='inbox'?null:Timestamp.fromMillis(Date.now()+(mode==='now'?30000:86400000))});
try{
 await seed();
 // New group status, explicit invite, membership acceptance, per-user read receipts.
 const group='groups/new_bridge_group';
 const create=writeBatch(a);
 create.set(d(a,group),{owner:'newAlice',title:'New Bridge Group',status:'active',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''});
 create.set(d(a,group+'/groupMembers/newAlice'),{uid:'newAlice',role:'owner',joinedAt:serverTimestamp()});
 await assertSucceeds(create.commit());
 await assertSucceeds(setDoc(d(a,group+'/groupInvites/newBob'),{from:'newAlice',to:'newBob',status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 const accept=writeBatch(b);
 accept.update(d(b,group+'/groupInvites/newBob'),{status:'accepted',updatedAt:serverTimestamp()});
 accept.set(d(b,group+'/groupMembers/newBob'),{uid:'newBob',role:'member',joinedAt:serverTimestamp()});
 await assertSucceeds(accept.commit());
 await assertSucceeds(setDoc(d(b,group+'/reads/newBob'),{uid:'newBob',lastReadAt:serverTimestamp()}));
 await assertFails(getDoc(d(e,group)));
 await assertFails(setDoc(d(e,group+'/reads/newEve'),{uid:'newEve',lastReadAt:serverTimestamp()}));
 // DM per-user read tracking.
 const convo='conversations/new_bridge_dm';
 await assertSucceeds(setDoc(d(a,convo),{kind:'dm',members:['newAlice','newBob'],createdBy:'newAlice',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertSucceeds(setDoc(d(b,convo+'/reads/newBob'),{uid:'newBob',lastReadAt:serverTimestamp()}));
 await assertFails(getDoc(d(e,convo+'/reads/newBob')));
 // Each new challenge mode must atomically write the sender's rate record.
 for(const mode of ['now','online','inbox']){
  await seed();
  const batch=writeBatch(a),id='new_'+mode;
  batch.set(d(a,'challengeRateLimits/newAlice'),{uid:'newAlice',lastAt:serverTimestamp()});
  batch.set(d(a,'challenges/'+id),payload(mode,id));
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(d(b,'challenges/'+id)));
 }
 console.log('NEW_CLIENT_BRIDGE_PASS');
}finally{await env.cleanup()}
