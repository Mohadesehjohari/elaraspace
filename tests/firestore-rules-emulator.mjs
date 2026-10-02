import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp} from 'firebase/firestore';

const projectId='demo-elara-rules';
const [host,portRaw]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(portRaw||8080),rules}});
console.log('FIRESTORE_RULES_E2E_START '+host+':'+String(portRaw||8080)+' project='+projectId);
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const alice=db('alice'),bob=db('bob'),eve=db('eve'),dave=db('dave');
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
  for(const [uid,data] of profiles)await setDoc(ref(admin,'profiles/'+uid),data);
  await setDoc(ref(admin,'friendRequests/alice_bob'),{from:'alice',to:'bob',status:'accepted'});
  await setDoc(ref(admin,'activities/alice_private_001'),{uid:'alice',type:'task',eventKey:'alice_private_001',visibility:'private',category:'task',createdAt:Timestamp.now()});
  await setDoc(ref(admin,'activities/alice_friends_001'),{uid:'alice',type:'task',eventKey:'alice_friends_001',visibility:'friends',category:'task',createdAt:Timestamp.now()});
  await setDoc(ref(admin,'activities/alice_public_001'),{uid:'alice',type:'task',eventKey:'alice_public_001',visibility:'public',category:'task',createdAt:Timestamp.now()});
  await setDoc(ref(admin,'socialPosts/alice_private_post'),{uid:'alice',text:'private',visibility:'private',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
  await setDoc(ref(admin,'socialPosts/alice_friends_post'),{uid:'alice',text:'friends',visibility:'friends',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
  await setDoc(ref(admin,'socialPosts/alice_public_post'),{uid:'alice',text:'public',visibility:'public',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
 });

 // Profile privacy: owner/friend/public paths are readable, unrelated private profile is not.
 await assertSucceeds(getDoc(ref(alice,'profiles/alice')));
 await assertSucceeds(getDoc(ref(bob,'profiles/alice')));
 await assertFails(getDoc(ref(eve,'profiles/dave')));

 // Activity visibility: owner sees private, friend sees friends, outsider sees only public.
 await assertSucceeds(getDoc(ref(alice,'activities/alice_private_001')));
 await assertFails(getDoc(ref(bob,'activities/alice_private_001')));
 await assertSucceeds(getDoc(ref(bob,'activities/alice_friends_001')));
 await assertFails(getDoc(ref(eve,'activities/alice_friends_001')));
 await assertSucceeds(getDoc(ref(eve,'activities/alice_public_001')));
 await assertSucceeds(setDoc(ref(alice,'activities/alice_create_001'),{uid:'alice',type:'task',eventKey:'alice_create_001',visibility:'friends',category:'task',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(alice,'activities/alice_create_private_001'),{uid:'alice',type:'task',eventKey:'alice_create_private_001',visibility:'private',category:'task',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,'activities/spoof_alice_001'),{uid:'alice',type:'task',eventKey:'spoof_alice_001',visibility:'public',category:'task',createdAt:serverTimestamp()}));

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
 await assertSucceeds(setDoc(ref(alice,group),{owner:'alice',title:'Night Owls',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'',lastSender:''}));
 await assertSucceeds(setDoc(ref(alice,group+'/groupMembers/alice'),{uid:'alice',role:'owner',joinedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(alice,group+'/groupMembers/bob'),{uid:'bob',role:'member',joinedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref(bob,group)));
 await assertFails(getDoc(ref(eve,group)));
 await assertSucceeds(setDoc(ref(bob,group+'/messages/b1'),{sender:'bob',text:'کتاب امشب؟ 📚',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,group+'/messages/e1'),{sender:'eve',text:'outsider',createdAt:serverTimestamp()}));

 // Club creation is server-rule gated by profile XP (level gate input), not by UI.
 await assertSucceeds(setDoc(ref(alice,'clubs/alice_reading_club'),{owner:'alice',title:'Moon Readers',kind:'reading',visibility:'public',assistant1:'',assistant2:'',restDay:5,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,'clubs/eve_reading_club'),{owner:'eve',title:'Too Early',kind:'reading',visibility:'public',assistant1:'',assistant2:'',restDay:5,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));

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
 await assertSucceeds(setDoc(ref(bob,'socialPosts/alice_friends_post/likes/bob'),{uid:'bob',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,'socialPosts/alice_friends_post/likes/eve'),{uid:'eve',createdAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(bob,'activities/alice_friends_001/comments/bob_comment'),{uid:'bob',text:'دمت گرم 🔥',createdAt:serverTimestamp()}));
 await assertFails(setDoc(ref(eve,'activities/alice_friends_001/comments/eve_comment'),{uid:'eve',text:'outsider',createdAt:serverTimestamp()}));

 console.log('FIRESTORE_RULES_E2E_PASS profile activity friend-request dm group club challenge page engagement alice/bob/eve');
}finally{
 await env.cleanup();
}
