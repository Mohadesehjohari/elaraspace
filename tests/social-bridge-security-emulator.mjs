// Critical Bridge adversarial tests. No mocked authorization: real emulator rules.
// The final legacy-bypass assertion MUST fail if backward compatibility circumvents new rate limiting.
import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,getDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'demo-elara-rules',firestore:{host,port:Number(port),rules}});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const a=db('bridgeAlice'),b=db('bridgeBob'),e=db('bridgeEve');
const d=(db,path)=>doc(db,path);
const expiry=()=>Timestamp.fromMillis(Date.now()+30000);
const legacy=(from,to)=>({from,to,status:'pending',targetKind:'reading',targetText:'Read twenty pages',targetValue:20,createdAt:serverTimestamp(),expiresAt:expiry()});
const modern=(from,to,originId)=>({...legacy(from,to),mode:'now',attempt:1,originId,updatedAt:serverTimestamp()});
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const admin=ctx.firestore();
  for(const uid of ['bridgeAlice','bridgeBob','bridgeEve']){
   await setDoc(d(admin,'profiles/'+uid),{username:uid.toLowerCase(),name:uid,bio:'',xp:820,profilePublic:true});
   await setDoc(d(admin,'usernames/'+uid.toLowerCase()),{uid});
  }
  await setDoc(d(admin,'friendRequests/bridgeAlice_bridgeBob'),{from:'bridgeAlice',to:'bridgeBob',status:'accepted'});
 });
 // Production schema still accepted without a rate document.
 await assertSucceeds(setDoc(d(a,'challenges/legacy_valid'),legacy('bridgeAlice','bridgeBob')));
 // Old/new hybrid must not be silently accepted on legacy path.
 await assertFails(setDoc(d(a,'challenges/mixed_schema'),{...legacy('bridgeAlice','bridgeBob'),mode:'now',attempt:1}));
 // New client must atomically create/update challengeRateLimits.
 await assertFails(setDoc(d(b,'challenges/new_missing_rate'),modern('bridgeBob','bridgeAlice','new_missing_rate')));
 const modernBatch=writeBatch(b);
 modernBatch.set(d(b,'challengeRateLimits/bridgeBob'),{uid:'bridgeBob',lastAt:serverTimestamp()});
 modernBatch.set(d(b,'challenges/new_good'),modern('bridgeBob','bridgeAlice','new_good'));
 await assertSucceeds(modernBatch.commit());
 const rapid=writeBatch(b);
 rapid.update(d(b,'challengeRateLimits/bridgeBob'),{lastAt:serverTimestamp()});
 rapid.set(d(b,'challenges/new_rapid'),modern('bridgeBob','bridgeAlice','new_rapid'));
 await assertFails(rapid.commit());
 await assertFails(setDoc(d(e,'challenges/non_friend'),legacy('bridgeEve','bridgeAlice')));
 await assertFails(setDoc(d(e,'challengeRateLimits/bridgeBob'),{uid:'bridgeBob',lastAt:serverTimestamp()}));
 // Block and mute protect the legacy contract too.
 await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(d(ctx.firestore(),'blocks/bridgeAlice__bridgeBob'),{owner:'bridgeAlice',target:'bridgeBob',targetName:'',targetUsername:'',createdAt:Timestamp.now()});
 });
 await assertFails(setDoc(d(b,'challenges/legacy_blocked'),legacy('bridgeBob','bridgeAlice')));
 await env.withSecurityRulesDisabled(async ctx=>{
  const admin=ctx.firestore();
  await import('firebase/firestore').then(async({deleteDoc})=>deleteDoc(d(admin,'blocks/bridgeAlice__bridgeBob')));
  await setDoc(d(admin,'socialMutes/bridgeAlice__bridgeBob'),{owner:'bridgeAlice',target:'bridgeBob',createdAt:Timestamp.now()});
 });
 await assertFails(setDoc(d(b,'challenges/legacy_muted'),legacy('bridgeBob','bridgeAlice')));
 // SECURITY REQUIREMENT: a malicious NEW client sending a second legacy-shaped challenge
 // must NOT bypass the new 10-second rate gate. As Rules cannot distinguish an old
 // browser from an adversary with the same signed UID/payload, this probes the policy hole.
 // Never replace assertFails with assertSucceeds merely to green the CI.
 await assertFails(setDoc(d(a,'challenges/legacy_rate_bypass_probe'),legacy('bridgeAlice','bridgeBob')));
 console.log('BRIDGE_SECURITY_PASS');
}finally{await env.cleanup()}
