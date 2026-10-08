// Strict Social Closure adversarial matrix with real Firebase Rules Emulator.
// Every denial uses assertFails, not mocks. No Bridge legacy clauses loaded.
import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'demo-elara-rules',firestore:{host,port:Number(port),rules}});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const a=db('strictAlice'),b=db('strictBob'),eve=db('strictEve'),mallory=db('strictMallory'),guest=env.unauthenticatedContext().firestore();
const d=(db,path)=>doc(db,path);
const club='clubs/strict_private_club',group='groups/strict_group';
const modern=(from,to,originId)=>({from,to,status:'pending',targetKind:'reading',targetText:'Read ten pages',targetValue:10,mode:'now',attempt:1,originId,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+30000)});
const old=(from,to)=>({from,to,status:'pending',targetKind:'reading',targetText:'Read ten pages',targetValue:10,createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+30000)});
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const root=ctx.firestore();
  for(const [uid,xp] of [['strictAlice',820],['strictBob',820],['strictEve',820],['strictMallory',100]]){
   await setDoc(d(root,'profiles/'+uid),{username:uid.toLowerCase(),name:uid,bio:'',xp,profilePublic:true});
   await setDoc(d(root,'usernames/'+uid.toLowerCase()),{uid});
  }
  await setDoc(d(root,'friendRequests/strictAlice_strictBob'),{from:'strictAlice',to:'strictBob',status:'accepted'});
  await setDoc(d(root,group),{owner:'strictAlice',title:'Private team',status:'active',createdAt:Timestamp.now(),updatedAt:Timestamp.now(),lastText:'',lastSender:''});
  for(const [uid,role] of [['strictAlice','owner'],['strictBob','member']]){
   await setDoc(d(root,group+'/groupMembers/'+uid),{uid,role,joinedAt:Timestamp.now()});
  }
  await setDoc(d(root,'conversations/strict_dm'),{kind:'dm',members:['strictAlice','strictBob'],createdBy:'strictAlice',createdAt:Timestamp.now(),updatedAt:Timestamp.now(),lastText:'',lastSender:''});
  await setDoc(d(root,club),{owner:'strictAlice',title:'Private Club',kind:'reading',visibility:'private',membershipMode:'invite',assistant1:'strictBob',assistant2:'',restDay:5,bio:'',rulesText:'',language:'fa',avatarPath:'',bannerPath:'',memberLimit:50,memberCount:3,lastMembershipUid:'strictEve',lastMembershipAction:'join',currentBookTitle:'',status:'active',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
  for(const [uid,role] of [['strictAlice','owner'],['strictBob','assistant'],['strictEve','member']]){
   await setDoc(d(root,club+'/clubMembers/'+uid),{uid,role,joinedAt:Timestamp.now()});
  }
  await setDoc(d(root,'collabSpaces/strict_collab'),{ownerUid:'strictAlice',kind:'task',title:'private',payloadJson:'{}',visibility:'private',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
  await setDoc(d(root,'collabSpaces/strict_collab/members/strictAlice'),{uid:'strictAlice',role:'owner',localEntityId:'a',progressCompleted:0,progressTotal:1,progressPercent:0,joinedAt:Timestamp.now(),updatedAt:Timestamp.now()});
 });
 // Identity, authentication, and private messaging.
 await assertFails(setDoc(d(guest,'groups/anonymous'),{owner:'anonymous',title:'Unauth',status:'active',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertFails(setDoc(d(mallory,'usernames/strictalice'),{uid:'strictMallory'}));
 await assertFails(updateDoc(d(mallory,'profiles/strictAlice'),{username:'strictmallory'}));
 await assertFails(getDoc(d(mallory,'conversations/strict_dm')));
 await assertFails(setDoc(d(mallory,'conversations/strict_dm/messages/spoof'),{sender:'strictMallory',text:'outsider',createdAt:serverTimestamp()}));
 await assertFails(updateDoc(d(mallory,'conversations/strict_dm'),{lastText:'hacked',lastSender:'strictMallory',updatedAt:serverTimestamp()}));
 // Group outsider and data injection.
 await assertFails(getDoc(d(mallory,group)));
 await assertFails(setDoc(d(mallory,group+'/messages/spam'),{sender:'strictMallory',text:'spoof',createdAt:serverTimestamp()}));
 await assertFails(setDoc(d(mallory,group+'/groupMembers/strictMallory'),{uid:'strictMallory',role:'member',joinedAt:serverTimestamp()}));
 await assertFails(setDoc(d(a,'groups/strict_extra'),{owner:'strictAlice',title:'Extra',status:'active',injected:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 // Club privacy, no forged joins, no privilege escalation and no third assistant.
 await assertFails(getDoc(d(mallory,club)));
 await assertFails(setDoc(d(mallory,club+'/clubMembers/strictMallory'),{uid:'strictMallory',role:'member',joinedAt:serverTimestamp()}));
 await assertFails(updateDoc(d(eve,club+'/clubMembers/strictEve'),{role:'assistant'}));
 await assertFails(updateDoc(d(eve,club+'/clubMembers/strictEve'),{role:'owner'}));
 await assertFails(updateDoc(d(b,club+'/clubMembers/strictBob'),{role:'owner'}));
 await assertFails(updateDoc(d(b,club),{owner:'strictBob',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(d(a,club),{assistant3:'strictEve',updatedAt:serverTimestamp()}));
 const base={owner:'strictMallory',title:'Level Five Club',kind:'reading',visibility:'public',membershipMode:'invite',assistant1:'',assistant2:'',restDay:5,bio:'',rulesText:'',language:'fa',avatarPath:'',bannerPath:'',memberLimit:50,memberCount:1,lastMembershipUid:'strictMallory',lastMembershipAction:'create',currentBookTitle:'',status:'active',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 await assertFails(setDoc(d(mallory,'clubs/level_five_bad'),base));
 await assertFails(setDoc(d(b,'clubs/forged_owner'),{...base,owner:'strictAlice',lastMembershipUid:'strictAlice'}));
 await assertFails(setDoc(d(a,'clubs/arbitrary_extra'),{...base,owner:'strictAlice',lastMembershipUid:'strictAlice',arbitraryAdmin:true}));
 await env.withSecurityRulesDisabled(async ctx=>{await setDoc(d(ctx.firestore(),club+'/clubBans/strictMallory'),{uid:'strictMallory',by:'strictAlice',createdAt:Timestamp.now()})});
 await assertFails(setDoc(d(mallory,club+'/clubJoinRequests/strictMallory'),{uid:'strictMallory',status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 // Collaboration forgery, invite acceptance.
 await assertFails(setDoc(d(mallory,'collabSpaces/strict_collab/members/strictMallory'),{uid:'strictMallory',role:'member',localEntityId:'bad',progressCompleted:0,progressTotal:1,progressPercent:0,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertFails(setDoc(d(mallory,'collabInvites/strict_collab__strictMallory'),{spaceId:'strict_collab',from:'strictMallory',to:'strictBob',kind:'task',title:'Spoof',status:'accepted',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 // Challenge new-only, no legacy payload ambiguity or rate-bypass.
 await assertFails(setDoc(d(a,'challenges/legacy_denied'),old('strictAlice','strictBob')));
 await assertFails(setDoc(d(a,'challenges/mixed_schema'),{...old('strictAlice','strictBob'),mode:'now',attempt:1}));
 await assertFails(setDoc(d(a,'challenges/missing_rate'),modern('strictAlice','strictBob','missing_rate')));
 await assertFails(setDoc(d(mallory,'challenges/not_friends'),modern('strictMallory','strictAlice','not_friends')));
 await assertFails(setDoc(d(mallory,'challengeRateLimits/strictAlice'),{uid:'strictAlice',lastAt:serverTimestamp()}));
 const rate=writeBatch(a);
 rate.set(d(a,'challengeRateLimits/strictAlice'),{uid:'strictAlice',lastAt:serverTimestamp()});
 rate.set(d(a,'challenges/first_good'),modern('strictAlice','strictBob','first_good'));
 await assertSucceeds(rate.commit());
 const rapid=writeBatch(a);
 rapid.update(d(a,'challengeRateLimits/strictAlice'),{lastAt:serverTimestamp()});
 rapid.set(d(a,'challenges/rapid_second'),modern('strictAlice','strictBob','rapid_second'));
 await assertFails(rapid.commit());
 await assertSucceeds(setDoc(d(b,'blocks/strictBob__strictAlice'),{owner:'strictBob',target:'strictAlice',targetName:'',targetUsername:'',createdAt:serverTimestamp()}));
 await assertFails(setDoc(d(a,'challenges/blocked_legacy'),old('strictAlice','strictBob')));
 await assertFails(setDoc(d(a,'challenges/blocked_new'),modern('strictAlice','strictBob','blocked_new')));
 await assertSucceeds(deleteDoc(d(b,'blocks/strictBob__strictAlice')));
 await assertSucceeds(setDoc(d(b,'socialMutes/strictBob__strictAlice'),{owner:'strictBob',target:'strictAlice',createdAt:serverTimestamp()}));
 await assertFails(setDoc(d(a,'challenges/muted_new'),modern('strictAlice','strictBob','muted_new')));
 // Social report immutability.
 await assertSucceeds(setDoc(d(b,'socialReports/security_report'),{reporter:'strictBob',target:'strictAlice',context:'profile',contextId:'',reason:'spam',createdAt:serverTimestamp()}));
 await assertFails(updateDoc(d(b,'socialReports/security_report'),{reason:'edited'}));
 await assertFails(deleteDoc(d(b,'socialReports/security_report')));
 console.log('STRICT_SOCIAL_SECURITY_PASS authenticated role-privacy collab schema challenge rate-limit block mute report');
}finally{await env.cleanup()}
