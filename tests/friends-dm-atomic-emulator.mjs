// Friends DM/Presence security regression: run against a local Firestore Rules Emulator.
// FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node tests/friends-dm-atomic-emulator.mjs
// No writes to production, no rules changes, no mock Firebase permissions.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,serverTimestamp,setDoc,updateDoc,writeBatch} from 'firebase/firestore';

const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({
 projectId:'demo-elara-friends-dm-atomic',
 firestore:{host,port:Number(port),rules},
});
const aliceId='friendsAtomicAlice',bobId='friendsAtomicBob',eveId='friendsAtomicEve';
const alice=env.authenticatedContext(aliceId,{email:'alice@example.test'}).firestore();
const bob=env.authenticatedContext(bobId,{email:'bob@example.test'}).firestore();
const eve=env.authenticatedContext(eveId,{email:'eve@example.test'}).firestore();
const conversation='friendsAtomicAlice__friendsAtomicBob';
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{
  const admin=context.firestore();
  for(const uid of [aliceId,bobId,eveId]){
   await setDoc(doc(admin,'profiles',uid),{uid,name:uid,username:uid.toLowerCase(),xp:100,profilePublic:true});
  }
  await setDoc(doc(admin,'friendRequests',aliceId+'_'+bobId),{from:aliceId,to:bobId,status:'accepted'});
 });
 const summary={kind:'dm',members:[aliceId,bobId].sort(),createdBy:aliceId,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''};
 await assertSucceeds(setDoc(doc(alice,'conversations',conversation),summary));
 await assertFails(getDoc(doc(eve,'conversations',conversation)));
 await assertSucceeds(getDoc(doc(bob,'conversations',conversation)));

 const batch=writeBatch(alice);
 const msgRef=doc(collection(alice,'conversations',conversation,'messages'));
 batch.set(msgRef,{sender:aliceId,text:'Atomic hello',createdAt:serverTimestamp()});
 batch.update(doc(alice,'conversations',conversation),{lastText:'Atomic hello',lastSender:aliceId,updatedAt:serverTimestamp()});
 await assertSucceeds(batch.commit());

 const recipientMessage=await assertSucceeds(getDoc(doc(bob,'conversations',conversation,'messages',msgRef.id)));
 assert.equal(recipientMessage.data()?.text,'Atomic hello','recipient reads a real committed message');
 const summarySnap=await assertSucceeds(getDoc(doc(bob,'conversations',conversation)));
 assert.equal(summarySnap.data()?.lastText,'Atomic hello','conversation preview is committed atomically');
 await assertSucceeds(setDoc(doc(bob,'conversations',conversation,'reads',bobId),{uid:bobId,lastReadAt:serverTimestamp()}));
 await assertFails(getDoc(doc(eve,'conversations',conversation,'messages',msgRef.id)));
 await assertFails(getDoc(doc(eve,'conversations',conversation,'reads',bobId)));

 const forged=writeBatch(eve);
 forged.set(doc(collection(eve,'conversations',conversation,'messages')),{sender:eveId,text:'spoof',createdAt:serverTimestamp()});
 forged.update(doc(eve,'conversations',conversation),{lastText:'spoof',lastSender:eveId,updatedAt:serverTimestamp()});
 await assertFails(forged.commit());

 // Fresh 90-second heartbeat visibility is account-scoped, not an invented online flag.
 const presence=doc(alice,'presence',aliceId);
 await assertSucceeds(setDoc(presence,{uid:aliceId,visibility:'friends',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(doc(bob,'presence',aliceId)));
 await assertFails(getDoc(doc(eve,'presence',aliceId)));
 await assertSucceeds(updateDoc(presence,{visibility:'private',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(bob,'presence',aliceId)));
 console.log('FRIENDS_DM_ATOMIC_RULES_PASS two authenticated contexts, atomic send/read/unread, outsider reject, private Presence');
}finally{
 await env.cleanup();
}
