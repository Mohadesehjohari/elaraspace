// Bridge legacy-client emulator. Payloads transcribed from elara-social.js at
// production 57914b90966e929e760a71a48ec25dd5d5e6c329 (do not use candidate JS).
// Runs against committed firestore.rules using Firebase Rules Unit Testing.
import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,getDoc,deleteDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'demo-elara-rules',firestore:{host,port:Number(port),rules}});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const a=db('legacyowner'),b=db('legacyfriend'),x=db('legacyoutsider');
const d=(database,path)=>doc(database,path);
const plus=ms=>Timestamp.fromMillis(Date.now()+ms);
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const admin=ctx.firestore();
  for(const [uid,xp] of [['legacyowner',820],['legacyfriend',130],['legacyoutsider',10]]){
   await setDoc(d(admin,'profiles/'+uid),{username:uid,name:uid,bio:'',xp,profilePublic:true});
   await setDoc(d(admin,'usernames/'+uid),{uid});
  }
  // Accepted friendship is a prerequisite to legacy DM and group/club invite.
  await setDoc(d(admin,'friendRequests/legacyowner_legacyfriend'),{from:'legacyowner',to:'legacyfriend',status:'accepted'});
 });
 // Production profile editor and canonical username claim remain writable for owner.
 await assertSucceeds(updateDoc(d(a,'profiles/legacyowner'),{name:'Legacy owner'}));
 const rename=writeBatch(a);
 rename.set(d(a,'usernames/legacyowner2'),{uid:'legacyowner'});
 rename.update(d(a,'profiles/legacyowner'),{username:'legacyowner2'});
 rename.delete(d(a,'usernames/legacyowner'));
 await assertSucceeds(rename.commit());
 await assertFails(setDoc(d(b,'usernames/legacyowner2'),{uid:'legacyfriend'}));
 // Production friend lifecycle uses status-only request documents.
 await assertSucceeds(setDoc(d(a,'friendRequests/legacyowner_legacyoutsider'),{from:'legacyowner',to:'legacyoutsider',status:'pending'}));
 await assertSucceeds(updateDoc(d(x,'friendRequests/legacyowner_legacyoutsider'),{status:'accepted'}));
 await assertSucceeds(deleteDoc(d(a,'friendRequests/legacyowner_legacyoutsider')));
 // Production ensureDm/sendDm.
 const dm='conversations/legacyowner_legacyfriend_dm';
 await assertSucceeds(setDoc(d(a,dm),{kind:'dm',members:['legacyfriend','legacyowner'],createdBy:'legacyowner',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertSucceeds(setDoc(d(a,dm+'/messages/m1'),{sender:'legacyowner',text:'hi',createdAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(d(a,dm),{lastText:'hi',lastSender:'legacyowner',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(d(b,dm+'/messages/m1')));
 // Production createGroup creates parent+owner+accepted friend in one batch WITHOUT status.
 const group='groups/legacy_group';
 const groupCreate=writeBatch(a);
 groupCreate.set(d(a,group),{owner:'legacyowner',title:'Legacy Group',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''});
 groupCreate.set(d(a,group+'/groupMembers/legacyowner'),{uid:'legacyowner',role:'owner',joinedAt:serverTimestamp()});
 groupCreate.set(d(a,group+'/groupMembers/legacyfriend'),{uid:'legacyfriend',role:'member',joinedAt:serverTimestamp()});
 await assertSucceeds(groupCreate.commit());
 await assertSucceeds(getDoc(d(b,group)));
 await assertSucceeds(setDoc(d(a,group+'/messages/m1'),{sender:'legacyowner',text:'legacy group message',createdAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(d(a,group),{lastText:'legacy group message',lastSender:'legacyowner',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(d(x,group)));
 // Production createClub exact legacy shape and atomic owner membership.
 const club='clubs/legacy_club';
 const createClub=writeBatch(a);
 createClub.set(d(a,club),{owner:'legacyowner',title:'Legacy Club',kind:'reading',visibility:'public',assistant1:'',assistant2:'',restDay:5,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 createClub.set(d(a,club+'/clubMembers/legacyowner'),{uid:'legacyowner',role:'owner',joinedAt:serverTimestamp()});
 await assertSucceeds(createClub.commit());
 await assertSucceeds(updateDoc(d(a,club),{title:'Legacy Club Renamed',updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(d(a,club+'/clubInvites/legacyfriend'),{from:'legacyowner',to:'legacyfriend',status:'pending',createdAt:serverTimestamp()}));
 const accepted=writeBatch(b);
 accepted.update(d(b,club+'/clubInvites/legacyfriend'),{status:'accepted'});
 accepted.set(d(b,club+'/clubMembers/legacyfriend'),{uid:'legacyfriend',role:'member',joinedAt:serverTimestamp()});
 await assertSucceeds(accepted.commit());
 await assertSucceeds(setDoc(d(a,club+'/clubPosts/post1'),{uid:'legacyowner',kind:'mission',domain:'reading',title:'Read daily',body:'Read books',cadence:'daily',options:[],createdAt:serverTimestamp()}));
 // Production challenge: addDoc with no mode/attempt/originId/updatedAt or rate document.
 const challenge='challenges/legacy_challenge';
 await assertSucceeds(setDoc(d(a,challenge),{from:'legacyowner',to:'legacyfriend',status:'pending',targetKind:'reading',targetText:'Read 10 pages',targetValue:10,createdAt:serverTimestamp(),expiresAt:plus(30000)}));
 await assertSucceeds(updateDoc(d(b,challenge),{status:'accepted',respondedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(d(a,challenge)));
 const decline='challenges/legacy_decline';
 await assertSucceeds(setDoc(d(a,decline),{from:'legacyowner',to:'legacyfriend',status:'pending',targetKind:'reading',targetText:'Read 20 pages',targetValue:20,createdAt:serverTimestamp(),expiresAt:plus(30000)}));
 await assertSucceeds(updateDoc(d(b,decline),{status:'declined',respondedAt:serverTimestamp()}));
 // Page/Social production allows user-owned friends activity and public post.
 await assertSucceeds(setDoc(d(a,'activities/legacyowner_activity'),{uid:'legacyowner',type:'task',eventKey:'legacyowner_activity',category:'task',visibility:'friends',createdAt:serverTimestamp()}));
 await assertSucceeds(setDoc(d(a,'socialPosts/legacyowner_post'),{uid:'legacyowner',text:'legacy post',visibility:'public',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(d(x,'socialPosts/legacyowner_post')));
 console.log('OLD_CLIENT_BRIDGE_PASS');
}finally{await env.cleanup()}
