// Additional new-client modes and realtime backing-store contracts under strict
// Firestore Rules. Comprehensive identity/friend/club/collab/page cases are
// separately executed by firestore-rules-emulator.mjs in the same CI gate.
import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'demo-elara-rules',firestore:{host,port:Number(port),rules}});
const d=(db,s)=>doc(db,s),db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const target=db('modeTarget'),online=db('modeOnline'),inbox=db('modeInbox'),outsider=db('modeOutsider');
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const root=ctx.firestore();
  for(const uid of ['modeTarget','modeOnline','modeInbox','modeOutsider']){
   await setDoc(d(root,'profiles/'+uid),{username:uid.toLowerCase(),name:uid,bio:'',xp:820,profilePublic:true});
   await setDoc(d(root,'usernames/'+uid.toLowerCase()),{uid});
  }
  for(const uid of ['modeOnline','modeInbox']){
   await setDoc(d(root,'friendRequests/'+uid+'_modeTarget'),{from:uid,to:'modeTarget',status:'accepted'});
  }
 });
 for(const [uid,context,mode] of [['modeOnline',online,'online'],['modeInbox',inbox,'inbox']]){
  const id='strict_'+mode,expiresAt=mode==='online'?Timestamp.fromMillis(Date.now()+24*3600*1000):null;
  const body={from:uid,to:'modeTarget',status:'pending',targetKind:'reading',targetText:'Read tonight',targetValue:25,mode,attempt:1,originId:id,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),expiresAt};
  await assertFails(setDoc(d(context,'challenges/'+id+'_no_rate'),body));
  const batch=writeBatch(context);
  batch.set(d(context,'challengeRateLimits/'+uid),{uid,lastAt:serverTimestamp()});
  batch.set(d(context,'challenges/'+id),body);
  await assertSucceeds(batch.commit());
  const snap=await getDoc(d(target,'challenges/'+id));
  if(!snap.exists()||snap.data().mode!==mode)throw Error('New client challenge mode not readable '+mode);
  await assertFails(getDoc(d(outsider,'challenges/'+id)));
  await assertSucceeds(updateDoc(d(target,'challenges/'+id),{status:'accepted',respondedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 }
 // Friend realtime backing collections: duplicate request forbidden to avoid
 // forged notification/relationship states; recipient's accepted state persists.
 await assertSucceeds(setDoc(d(outsider,'friendRequests/modeOutsider_modeTarget'),{from:'modeOutsider',to:'modeTarget',status:'pending'}));
 await assertFails(updateDoc(d(outsider,'friendRequests/modeOutsider_modeTarget'),{status:'accepted'}));
 await assertSucceeds(updateDoc(d(target,'friendRequests/modeOutsider_modeTarget'),{status:'accepted'}));
 // New DM lastReadAt is bound to the authenticated member, not outsider.
 const dm='conversations/modeTarget_modeOutsider';
 await assertSucceeds(setDoc(d(target,dm),{kind:'dm',members:['modeOutsider','modeTarget'],createdBy:'modeTarget',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertSucceeds(setDoc(d(outsider,dm+'/reads/modeOutsider'),{uid:'modeOutsider',lastReadAt:serverTimestamp()}));
 await assertFails(getDoc(d(target,dm+'/reads/modeOutsider')));
 console.log('STRICT_NEW_CLIENT_EXTRA_PASS online inbox rate-atomic friend realtime DM receipts');
}finally{await env.cleanup()}
