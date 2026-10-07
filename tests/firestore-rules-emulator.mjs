import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp,writeBatch} from 'firebase/firestore';

const projectId='demo-elara-rules';
const [host,portRaw]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(portRaw||8080),rules}});
console.log('FIRESTORE_RULES_E2E_START '+host+':'+String(portRaw||8080)+' project='+projectId);
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const alice=db('alice'),bob=db('bob'),eve=db('eve'),dave=db('dave'),regA=db('regA'),regB=db('regB'),legacyA=db('legacyA'),legacyB=db('legacyB');
const ref=(database,path)=>doc(database,path);
const nowPlus=ms=>Timestamp.fromMillis(Date.now()+ms);

try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const admin=ctx.firestore();
  const profiles=[
   ['alice',{username:'alice',name:'Alice',bio:'',xp:820,profilePublic:true}],
   ['bob',{username:'bob',name:'Bob',bio:'',xp:120,profilePublic:true}],
   ['eve',{username:'eve',name:'Eve',bio:'',xp:100,profilePublic:true}],
   ['dave',{username:'dave',name:'Dave',bio:'',xp:20,profilePublic:false}]
  ];
  for(const [uid,data] of profiles){await setDoc(ref(admin,'profiles/'+uid),data);await setDoc(ref(admin,'usernames/'+data.username),{uid})}
  await setDoc(ref(admin,'friendRequests/alice_bob'),{from:'alice',to:'bob',status:'accepted'});
  await setDoc(ref(admin,'activities/alice_private_001'),{uid:'alice',type:'task',eventKey:'alice_private_001',visibility:'private',category:'task',createdAt:Timestamp.now()});
  await setDoc(ref(admin,'activities/alice_friends_001'),{uid:'alice',type:'task',eventKey:'alice_friends_001',visibility:'friends',category:'task',createdAt:Timestamp.now()});
  await setDoc(ref(admin,'activities/alice_public_001'),{uid:'alice',type:'task',eventKey:'alice_public_001',visibility:'public',category:'task',createdAt:Timestamp.now()});
  await setDoc(ref(admin,'socialPosts/alice_private_post'),{uid:'alice',text:'private',visibility:'private',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
  await setDoc(ref(admin,'socialPosts/alice_friends_post'),{uid:'alice',text:'friends',visibility:'friends',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
  await setDoc(ref(admin,'socialPosts/alice_public_post'),{uid:'alice',text:'public',visibility:'public',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
  await setDoc(ref(admin,'socialStories/alice_friends_story'),{uid:'alice',text:'story',visibility:'friends',createdAt:Timestamp.now(),expiresAt:nowPlus(3600000)});
 });

 // Profile privacy: owner/friend/public paths are readable, unrelated private profile is not.
 await assertSucceeds(getDoc(ref(alice,'profiles/alice')));
 await assertSucceeds(getDoc(ref(bob,'profiles/alice')));
 await assertFails(getDoc(ref(eve,'profiles/dave')));

 // Username identity invariant: profile + claim are one atomic ownership record.
 const regABatch=writeBatch(regA);
 regABatch.set(ref(regA,'usernames/nova'),{uid:'regA'});
 regABatch.set(ref(regA,'profiles/regA'),{username:'nova',name:'Reg A',bio:'',xp:0,profilePublic:true});
 await assertSucceeds(regABatch.commit());

 // Duplicate registration cannot take the same canonical username.
 const regBBatch=writeBatch(regB);
 regBBatch.set(ref(regB,'usernames/nova'),{uid:'regB'});
 regBBatch.set(ref(regB,'profiles/regB'),{username:'nova',name:'Reg B',bio:'',xp:0,profilePublic:true});
 await assertFails(regBBatch.commit());
 const regBProfile=await assertSucceeds(getDoc(ref(regB,'profiles/regB')));
 if(regBProfile.exists())throw new Error('duplicate registration unexpectedly created profiles/regB');
 const novaClaim=await assertSucceeds(getDoc(ref(regA,'usernames/nova')));
 if(novaClaim.data()?.uid!=='regA')throw new Error('usernames/nova ownership changed unexpectedly');

 // Atomic rename: new claim + profile update + deletion of owned old claim.
 const renameBatch=writeBatch(regA);
 renameBatch.set(ref(regA,'usernames/nova2'),{uid:'regA'});
 renameBatch.update(ref(regA,'profiles/regA'),{username:'nova2'});
 renameBatch.delete(ref(regA,'usernames/nova'));
 await assertSucceeds(renameBatch.commit());
 const renamedProfile=await assertSucceeds(getDoc(ref(regA,'profiles/regA')));
 const renamedClaim=await assertSucceeds(getDoc(ref(regA,'usernames/nova2')));
 if(renamedProfile.data()?.username!=='nova2'||renamedClaim.data()?.uid!=='regA')throw new Error('atomic rename invariant failed');
 const oldNova=await assertSucceeds(getDoc(ref(regA,'usernames/nova')));
 if(oldNova.exists())throw new Error('owned old username claim remained after rename');

 // Legacy missing/conflicting claims are blocked from blind client repair.
 await env.withSecurityRulesDisabled(async ctx=>{
   const admin=ctx.firestore();
   await setDoc(ref(admin,'profiles/legacyA'),{username:'legacy_missing',name:'Legacy A',bio:'',xp:0,profilePublic:true});
   await setDoc(ref(admin,'profiles/legacyB'),{username:'legacy_conflict',name:'Legacy B',bio:'',xp:0,profilePublic:true});
   await setDoc(ref(admin,'usernames/legacy_conflict'),{uid:'legacyA'});
 });
 await assertFails(setDoc(ref(legacyA,'usernames/legacy_missing'),{uid:'legacyA'}));
 await assertFails(updateDoc(ref(legacyA,'profiles/legacyA'),{name:'Should stay blocked'}));
 await assertFails(setDoc(ref(legacyB,'usernames/legacy_conflict'),{uid:'legacyB'}));

 // B can rename away from a foreign stale claim without stealing/deleting it.
 const legacyRename=writeBatch(legacyB);
 legacyRename.set(ref(legacyB,'usernames/legacy_b_clean'),{uid:'legacyB'});
 legacyRename.update(ref(legacyB,'profiles/legacyB'),{username:'legacy_b_clean'});
 await assertSucceeds(legacyRename.commit());
 const foreignClaim=await assertSucceeds(getDoc(ref(legacyA,'usernames/legacy_conflict')));
 if(foreignClaim.data()?.uid!=='legacyA')throw new Error('rename stole/deleted another UID claim');

 await assertSucceeds(updateDoc(ref(regA,'profiles/regA'),{name:'Reg A Renamed'}));

 // Activity visibility: owner sees private, friend sees friends, outsider sees only public.
 await assertSucceeds(getDoc(ref(alice,'activities/alice_private_001')));
 await assertFails(getDoc(ref(bob,'activities/alice_private_001')));
 await assertSucceeds(getDoc(ref(bob,'activities/alice_friends_001')));
 await assertFails(getDoc(ref(eve,'activities/alice_friends_001')));
 await assertSucceeds(getDoc(ref(eve,'activities/alice_public_001')));
 await assertSucceeds(setDoc(ref(alice,'activities/alice_create_001'),{uid:'alice',type:'task',eventKey:'alice_create_001',visibility:'friends',category:'task',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(alice,'activities/alice_create_private_001'),{uid:'alice',type:'task',eventKey:'alice_create_private_001',visibility:'private',category:'task',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,'activities/spoof_alice_001'),{uid:'alice',type:'task',eventKey:'spoof_alice_001',visibility:'public',category:'task',createdAt:serverTimestamp()}));

 // Social streak stats are isolated from profiles and respect independent visibility.
 await assertSucceeds(setDoc(ref(alice,'socialStats/alice'),{streak:12,visibility:'private',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(alice,'socialStats/alice')));
 await assertFails(getDoc(ref(bob,'socialStats/alice')));
 await assertSucceeds(updateDoc(ref(alice,'socialStats/alice'),{visibility:'friends',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(bob,'socialStats/alice')));
 await assertFails(getDoc(ref(eve,'socialStats/alice')));
 await assertSucceeds(updateDoc(ref(alice,'socialStats/alice'),{visibility:'public',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(eve,'socialStats/alice')));
 await assertFails(setDoc(ref(eve,'socialStats/alice'),{streak:999,visibility:'public',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(alice,'socialStats/alice'),{streak:40000,updatedAt:serverTimestamp()}));

 // Friend request: sender can create pending, only recipient can accept.
 await assertSucceeds(setDoc(ref(eve,'friendRequests/eve_dave'),{from:'eve',to:'dave',status:'pending'}));
 await assertFails(updateDoc(ref(eve,'friendRequests/eve_dave'),{status:'accepted'}));
 await assertSucceeds(updateDoc(ref(dave,'friendRequests/eve_dave'),{status:'accepted'}));

 // DM requires an accepted friendship; outsiders cannot read/send.
 const convo='conversations/alice_bob_dm';
 await assertSucceeds(setDoc(ref(alice,convo),{kind:'dm',members:['alice','bob'],createdBy:'alice',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertSucceeds(getDoc(ref(bob,convo)));
 await assertFails(getDoc(ref(eve,convo)));
 await assertSucceeds(setDoc(ref(alice,convo+'/messages/m1'),{sender:'alice',text:'سلام 👋',createdAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(bob,convo+'/messages/m1')));
 await assertFails(setDoc(ref(eve,convo+'/messages/m2'),{sender:'eve',text:'nope',createdAt:serverTimestamp()}));

 // Group owner can add an accepted friend; outsider cannot read or send.
 const group='groups/night_owls';
 await assertSucceeds(setDoc(ref(alice,group),{owner:'alice',title:'Night Owls',status:'active',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertSucceeds(setDoc(ref(alice,group+'/groupMembers/alice'),{uid:'alice',role:'owner',joinedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(alice,group+'/groupMembers/bob'),{uid:'bob',role:'member',joinedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(bob,group)));
 await assertFails(getDoc(ref(eve,group)));
 await assertSucceeds(setDoc(ref(bob,group+'/messages/b1'),{sender:'bob',text:'کتاب امشب؟ 📚',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,group+'/messages/e1'),{sender:'eve',text:'outsider',createdAt:serverTimestamp()}));

 // Club creation is server-rule gated by profile XP (level gate input), not by UI.
 await assertSucceeds(setDoc(ref(alice,'clubs/alice_reading_club'),{owner:'alice',title:'Moon Readers',kind:'reading',visibility:'public',assistant1:'',assistant2:'',restDay:5,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,'clubs/eve_reading_club'),{owner:'eve',title:'Too Early',kind:'reading',visibility:'public',assistant1:'',assistant2:'',restDay:5,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));

 // Persistent collaboration: owner creates a private shared class, friend joins only after explicit acceptance.
 const collab='collabSpaces/collab_class_1',collabInvite='collabInvites/collab_class_1__bob';
 await assertSucceeds(setDoc(ref(alice,collab),{ownerUid:'alice',kind:'language-class',title:'English C1',payloadJson:JSON.stringify({title:'English C1',type:'online',terms:3,sessionsPerTerm:12,durationMin:60,weekdays:[0,2,4],studyTime:'18:00',studyHoursPerDay:2,linkUrl:''}),visibility:'private',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(alice,collab+'/members/alice'),{uid:'alice',role:'owner',localEntityId:'class-local-a',progressCompleted:4,progressTotal:36,progressPercent:11,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(alice,collab)));
 await assertFails(getDoc(ref(bob,collab)));
 await assertSucceeds(setDoc(ref(alice,collabInvite),{spaceId:'collab_class_1',from:'alice',to:'bob',kind:'language-class',title:'English C1',status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(bob,collabInvite)));
 await assertFails(getDoc(ref(eve,collabInvite)));
 await assertFails(setDoc(ref(eve,'collabInvites/collab_class_1__eve'),{spaceId:'collab_class_1',from:'eve',to:'bob',kind:'language-class',title:'spoof',status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(ref(bob,collabInvite),{status:'declined',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(eve,collabInvite),{status:'pending',updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(ref(alice,collabInvite),{status:'pending',updatedAt:serverTimestamp()}));
 const acceptBatch=writeBatch(bob);
 acceptBatch.update(ref(bob,collabInvite),{status:'accepted',updatedAt:serverTimestamp()});
 acceptBatch.set(ref(bob,collab+'/members/bob'),{uid:'bob',role:'member',localEntityId:'class-local-b',progressCompleted:0,progressTotal:36,progressPercent:0,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()});
 await assertSucceeds(acceptBatch.commit());
 await assertSucceeds(getDoc(ref(bob,collab)));
 await assertSucceeds(updateDoc(ref(bob,collab+'/members/bob'),{localEntityId:'class-local-b',progressCompleted:9,progressTotal:36,progressPercent:25,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(bob,collab),{title:'hijack',updatedAt:serverTimestamp()}));

 // Owner-created join link is persistent; any signed user with the token can explicitly join.
 const joinToken='joinTokenCollabClass1234567890';
 await assertSucceeds(setDoc(ref(alice,'collabLinks/'+joinToken),{spaceId:'collab_class_1',ownerUid:'alice',kind:'language-class',title:'English C1',active:true,createdAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(eve,'collabLinks/'+joinToken)));
 await assertSucceeds(setDoc(ref(eve,collab+'/members/eve'),{uid:'eve',role:'member',joinToken,localEntityId:'class-local-e',progressCompleted:0,progressTotal:36,progressPercent:0,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(eve,collab)));
 await assertFails(setDoc(ref(eve,collab+'/members/dave'),{uid:'dave',role:'member',joinToken,localEntityId:'spoof',progressCompleted:0,progressTotal:36,progressPercent:0,joinedAt:serverTimestamp(),updatedAt:serverTimestamp()}));

 // Direct challenge only between accepted friends; only recipient can accept.
 const challenge='challenges/alice_bob_challenge';
 await assertSucceeds(setDoc(ref(alice,challenge),{from:'alice',to:'bob',status:'pending',targetKind:'reading',targetText:'۵۰ صفحه بخون',targetValue:50,createdAt:serverTimestamp(),expiresAt:nowPlus(30000)}));
 await assertFails(updateDoc(ref(alice,challenge),{status:'accepted',respondedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(ref(bob,challenge),{status:'accepted',respondedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(alice,challenge+'/quickMessages/q1'),{uid:'alice',text:'بزن بریم 🔥',createdAt:serverTimestamp()}));
 await assertFails(getDoc(ref(eve,challenge)));

 // Page/Post privacy and engagement.
 await assertSucceeds(getDoc(ref(alice,'socialPosts/alice_private_post')));
 await assertFails(getDoc(ref(bob,'socialPosts/alice_private_post')));
 await assertSucceeds(getDoc(ref(bob,'socialPosts/alice_friends_post')));
 await assertFails(getDoc(ref(eve,'socialPosts/alice_friends_post')));
 await assertSucceeds(getDoc(ref(eve,'socialPosts/alice_public_post')));
 // Page media metadata is tied to the authenticated owner, document id and kind.
 await assertSucceeds(setDoc(ref(alice,'socialPosts/alice_media_post'),{uid:'alice',text:'',visibility:'friends',mediaPath:'pageMedia/alice/post/alice_media_post/abcdefgh.webp',mediaType:'image/webp',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref(alice,'socialPosts/alice_spoof_media'),{uid:'alice',text:'',visibility:'friends',mediaPath:'pageMedia/bob/post/alice_spoof_media/abcdefgh.webp',mediaType:'image/webp',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref(alice,'socialPosts/alice_bad_media_kind'),{uid:'alice',text:'',visibility:'friends',mediaPath:'pageMedia/alice/story/alice_bad_media_kind/abcdefgh.webp',mediaType:'image/webp',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(alice,'socialStories/alice_media_story'),{uid:'alice',text:'',visibility:'friends',mediaPath:'pageMedia/alice/story/alice_media_story/abcdefgh.png',mediaType:'image/png',createdAt:serverTimestamp(),expiresAt:nowPlus(3600000)}));
 await assertFails(setDoc(ref(alice,'socialStories/alice_media_spoof'),{uid:'alice',text:'',visibility:'friends',mediaPath:'pageMedia/alice/post/alice_media_spoof/abcdefgh.png',mediaType:'image/png',createdAt:serverTimestamp(),expiresAt:nowPlus(3600000)}));
 await assertSucceeds(setDoc(ref(bob,'socialPosts/alice_friends_post/likes/bob'),{uid:'bob',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,'socialPosts/alice_friends_post/likes/eve'),{uid:'eve',createdAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(bob,'activities/alice_friends_001/comments/bob_comment'),{uid:'bob',text:'دمت گرم 🔥',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,'activities/alice_friends_001/comments/eve_comment'),{uid:'eve',text:'outsider',createdAt:serverTimestamp()}));

 // Content reports are private, deduplicated by reporter+target, and only allowed for readable content owned by somebody else.
 const reportPath='contentReports/bob__post__alice_friends_post';
 await assertSucceeds(setDoc(ref(bob,reportPath),{reporter:'bob',targetUid:'alice',kind:'post',targetId:'alice_friends_post',reason:'spam',detail:'qa',createdAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(bob,reportPath)));
 await assertFails(getDoc(ref(alice,reportPath)));
 await assertFails(setDoc(ref(eve,'contentReports/eve__post__alice_friends_post'),{reporter:'eve',targetUid:'alice',kind:'post',targetId:'alice_friends_post',reason:'spam',detail:'no access',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(alice,'contentReports/alice__post__alice_public_post'),{reporter:'alice',targetUid:'alice',kind:'post',targetId:'alice_public_post',reason:'other',detail:'self',createdAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(bob,'contentReports/bob__story__alice_friends_story'),{reporter:'bob',targetUid:'alice',kind:'story',targetId:'alice_friends_story',reason:'privacy',detail:'story qa',createdAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(bob,reportPath),{reason:'other'}));

 // Block is private to the blocker and overrides public/friends social reads and new DM writes.
 await assertSucceeds(setDoc(ref(alice,'blocks/alice__bob'),{owner:'alice',target:'bob',targetName:'Bob',targetUsername:'bob',createdAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(alice,'blocks/alice__bob')));
 await assertFails(getDoc(ref(bob,'blocks/alice__bob')));
 await assertFails(getDoc(ref(bob,'profiles/alice')));
 await assertFails(getDoc(ref(bob,'socialStats/alice')));
 await assertFails(getDoc(ref(bob,'activities/alice_public_001')));
 await assertFails(getDoc(ref(bob,'socialPosts/alice_public_post')));
 await assertFails(setDoc(ref(bob,convo+'/messages/blocked_message'),{sender:'bob',text:'blocked DM',createdAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(bob,convo),{lastText:'blocked',lastSender:'bob',updatedAt:serverTimestamp()}));
 await assertSucceeds(deleteDoc(ref(alice,'blocks/alice__bob')));
 await assertSucceeds(getDoc(ref(bob,'profiles/alice')));
 await assertSucceeds(getDoc(ref(bob,'activities/alice_public_001')));
 await assertSucceeds(getDoc(ref(bob,'socialPosts/alice_public_post')));

 console.log('FIRESTORE_RULES_E2E_PASS username-identity profile social-stats activity friend-request dm group club collab challenge page engagement reports block-unblock alice/bob/eve');
}finally{
 await env.cleanup();
}
