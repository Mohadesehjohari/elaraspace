// Historical data shapes sourced from redacted post-migration production audit:
// 1 active group with 3 members, 3 ready challenges (2 expired pending, 1
// accepted), 5 collabSpaces (task=2, habit=1, language-class=2).
// Fixture values are synthetic; no production credentials/data enter CI.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,serverTimestamp,Timestamp} from 'firebase/firestore';
const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'demo-elara-rules',firestore:{host,port:Number(port),rules}});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const alice=db('migratedAlice'),bob=db('migratedBob'),carol=db('migratedCarol'),eve=db('migratedOutsider');
const path=(db,s)=>doc(db,s);
const time=n=>Timestamp.fromMillis(n);
const now=Date.now();
const older=time(now-14*86400000),expired=time(now-120000),recent=time(now-90000);
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const root=ctx.firestore();
  for(const uid of ['migratedAlice','migratedBob','migratedCarol','migratedOutsider']){
   const username=uid.toLowerCase();
   await setDoc(path(root,'profiles/'+uid),{username,name:uid,bio:'',xp:420,profilePublic:true});
   await setDoc(path(root,'usernames/'+username),{uid});
  }
  for(const uid of ['migratedBob','migratedCarol']){
   await setDoc(path(root,'friendRequests/migratedAlice_'+uid),{from:'migratedAlice',to:uid,status:'accepted'});
  }
  const group='groups/production_shape_group';
  await setDoc(path(root,group),{owner:'migratedAlice',title:'Existing Group',status:'active',createdAt:older,updatedAt:recent,lastText:'Historical message',lastSender:'migratedBob'});
  for(const [uid,role] of [['migratedAlice','owner'],['migratedBob','member'],['migratedCarol','member']]){
   await setDoc(path(root,group+'/groupMembers/'+uid),{uid,role,joinedAt:older});
  }
  await setDoc(path(root,group+'/messages/old_001'),{sender:'migratedBob',text:'Historic message unchanged',createdAt:older});
  const common={from:'migratedAlice',to:'migratedBob',targetKind:'reading',targetText:'Read twenty pages',targetValue:20,mode:'now',attempt:1,createdAt:older,updatedAt:recent,expiresAt:expired};
  await setDoc(path(root,'challenges/historical_expired_one'),{...common,status:'pending',originId:'legacy-historical_01'});
  await setDoc(path(root,'challenges/historical_expired_two'),{...common,status:'pending',originId:'legacy-historical_02',to:'migratedCarol'});
  await setDoc(path(root,'challenges/historical_accepted'),{...common,status:'accepted',originId:'legacy-historical_03',respondedAt:time(now-13*86400000)});
  const kinds=['task','task','habit','language-class','language-class'];
  for(let i=0;i<kinds.length;i++){
   const sid='historical_collab_'+i;
   await setDoc(path(root,'collabSpaces/'+sid),{ownerUid:'migratedAlice',kind:kinds[i],title:'Existing shared item '+i,payloadJson:JSON.stringify({title:'Existing shared item '+i}),visibility:'private',createdAt:older,updatedAt:recent});
   await setDoc(path(root,'collabSpaces/'+sid+'/members/migratedAlice'),{uid:'migratedAlice',role:'owner',localEntityId:'historical-local-'+i,progressCompleted:0,progressTotal:1,progressPercent:0,joinedAt:older,updatedAt:recent});
  }
 });
 const group='groups/production_shape_group';
 await assertSucceeds(getDoc(path(alice,group)));
 await assertSucceeds(getDoc(path(bob,group)));
 await assertSucceeds(getDoc(path(carol,group)));
 await assertFails(getDoc(path(eve,group)));
 const oldMessage=await getDoc(path(bob,group+'/messages/old_001'));
 assert.equal(oldMessage.data().text,'Historic message unchanged');
 await assertSucceeds(setDoc(path(bob,group+'/messages/new_001'),{sender:'migratedBob',text:'Post-migration hello',createdAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(path(bob,group),{lastText:'Post-migration hello',lastSender:'migratedBob',updatedAt:serverTimestamp()}));
 for(const suffix of ['historical_expired_one','historical_expired_two','historical_accepted']){
  const docPath='challenges/'+suffix;
  const snap=await getDoc(path(alice,docPath));
  assert.equal(snap.exists(),true);
  assert.equal(snap.data().mode,'now');
  assert.equal(snap.data().attempt,1);
  assert.ok(snap.data().originId.startsWith('legacy-'));
  assert.equal(snap.data().createdAt.toMillis(),older.toMillis(),'Original creation timestamp must be preserved');
  assert.equal(snap.data().expiresAt.toMillis(),expired.toMillis(),'Original expiry never extended');
 }
 for(const suffix of ['historical_expired_one','historical_expired_two']){
  const snap=await getDoc(path(alice,'challenges/'+suffix));
  assert.equal(snap.data().status,'pending');
  assert.ok(snap.data().expiresAt.toMillis()<Date.now(),'Do not revive already-expired challenge');
  await assertFails(updateDoc(path(bob,'challenges/'+suffix),{status:'accepted',updatedAt:serverTimestamp(),respondedAt:serverTimestamp()}));
 }
 const accepted=await getDoc(path(bob,'challenges/historical_accepted'));
 assert.equal(accepted.data().status,'accepted');
 await assertSucceeds(setDoc(path(bob,'challenges/historical_accepted/quickMessages/reply01'),{uid:'migratedBob',text:'بزن بریم 🔥',createdAt:serverTimestamp()}));
 for(let i=0;i<5;i++){
  const sid='collabSpaces/historical_collab_'+i;
  const snap=await getDoc(path(alice,sid));assert.equal(snap.exists(),true);
  await assertFails(getDoc(path(eve,sid)));
 }
 console.log('MIGRATED_PRODUCTION_SHAPE_PASS group=1 members=3 challenges=3 expiredPending=2 accepted=1 collab=5 history=preserved');
}finally{await env.cleanup()}
