// Live GUARDED production client unguarded write contracts versus strict
// candidate Firestore Rules. Recreates payloads from production main 9da35c0.
// Also run tests/social-cutover-guard-browser.mjs against the exact main parent
// to show incompatible actions are refused before reaching Firestore.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'demo-elara-rules',firestore:{host,port:Number(port),rules}});
const d=(db,s)=>doc(db,s),db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const a=db('guardedAlice'),b=db('guardedBob'),eve=db('guardedEve');
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const root=ctx.firestore();
  for(const uid of ['guardedAlice','guardedBob','guardedEve']){
   const username=uid.toLowerCase();
   await setDoc(d(root,'profiles/'+uid),{username,name:uid,bio:'',xp:400,profilePublic:true});
   await setDoc(d(root,'usernames/'+username),{uid});
  }
 });
 // Current Guard leaves profile edits and canonical username claim transaction enabled.
 await assertSucceeds(updateDoc(d(a,'profiles/guardedAlice'),{name:'Verified Alice',bio:'Good to go',profilePublic:true}));
 const rename=writeBatch(a);
 rename.set(d(a,'usernames/guardedalice_v2'),{uid:'guardedAlice'});
 rename.update(d(a,'profiles/guardedAlice'),{username:'guardedalice_v2'});
 rename.delete(d(a,'usernames/guardedalice'));
 await assertSucceeds(rename.commit());
 const ownProfile=await getDoc(d(a,'profiles/guardedAlice'));
 assert.equal(ownProfile.data().username,'guardedalice_v2');
 await assertSucceeds(getDoc(d(b,'profiles/guardedAlice'))); // public search
 await assertFails(setDoc(d(b,'usernames/guardedalice_v2'),{uid:'guardedBob'}));
 // Current production friendRequest lifecycle (sender/recipient).
 await assertSucceeds(setDoc(d(a,'friendRequests/guardedAlice_guardedBob'),{from:'guardedAlice',to:'guardedBob',status:'pending'}));
 await assertFails(updateDoc(d(a,'friendRequests/guardedAlice_guardedBob'),{status:'accepted'}));
 await assertSucceeds(updateDoc(d(b,'friendRequests/guardedAlice_guardedBob'),{status:'accepted'}));
 // Current DM writer uses kind/members/createdBy and message+parent update.
 const convo='conversations/guardedAlice_guardedBob_dm';
 await assertSucceeds(setDoc(d(a,convo),{kind:'dm',members:['guardedAlice','guardedBob'],createdBy:'guardedAlice',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertSucceeds(setDoc(d(a,convo+'/messages/m1'),{sender:'guardedAlice',text:'Hello from guarded production',createdAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(d(a,convo),{lastText:'Hello from guarded production',lastSender:'guardedAlice',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(d(b,convo+'/messages/m1')));
 await assertFails(getDoc(d(eve,convo+'/messages/m1')));
 // Existing social activity, Page post and legacy streak sync remain writable.
 await assertSucceeds(setDoc(d(a,'activities/guardedAlice_task_event'),{uid:'guardedAlice',type:'task',eventKey:'guardedAlice_task_event',visibility:'friends',category:'task',createdAt:serverTimestamp()}));
 await assertSucceeds(setDoc(d(a,'socialPosts/guarded_post_001'),{uid:'guardedAlice',text:'existing page post',visibility:'public',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(d(eve,'socialPosts/guarded_post_001')));
 await assertSucceeds(setDoc(d(a,'socialStats/guardedAlice'),{streak:3,visibility:'friends',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(d(b,'socialStats/guardedAlice')));
 // Strict Rules disallow legacy schemas; Guard must suppress these before network calls.
 await assertFails(setDoc(d(a,'groups/guarded_illegal_legacy'),{owner:'guardedAlice',title:'Old Group',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertFails(setDoc(d(a,'clubs/guarded_illegal_legacy'),{owner:'guardedAlice',title:'Old Club',kind:'reading',visibility:'public',assistant1:'',assistant2:'',restDay:5,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertFails(setDoc(d(a,'challenges/guarded_illegal_legacy'),{from:'guardedAlice',to:'guardedBob',status:'pending',targetKind:'reading',targetText:'Read books',targetValue:10,createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+30000)}));
 console.log('GUARDED_OLD_CLIENT_STRICT_PASS profile username search friend dm page stats allowed; incompatible group club challenge denied');
}finally{await env.cleanup()}
