import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,serverTimestamp,Timestamp} from 'firebase/firestore';
import {ref,uploadBytes,getBytes,deleteObject} from 'firebase/storage';

const projectId='demo-elara-rules';
const [fh,fp]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8080').split(':');
const [sh,sp]=(process.env.FIREBASE_STORAGE_EMULATOR_HOST||'127.0.0.1:9199').split(':');
const [firestoreRules,storageRules]=await Promise.all([
 fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8'),
 fs.readFile(new URL('../storage.rules',import.meta.url),'utf8')
]);
const env=await initializeTestEnvironment({projectId,
 firestore:{host:fh,port:Number(fp||8080),rules:firestoreRules},
 storage:{host:sh,port:Number(sp||9199),rules:storageRules}
});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const store=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).storage();
const image=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const meta={contentType:'image/png'};
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const admin=ctx.firestore(),now=Timestamp.now();
  await setDoc(doc(admin,'profiles/alice'),{username:'alice',name:'Alice',bio:'',xp:100,profilePublic:true});
  await setDoc(doc(admin,'profiles/bob'),{username:'bob',name:'Bob',bio:'',xp:100,profilePublic:true});
  await setDoc(doc(admin,'profiles/eve'),{username:'eve',name:'Eve',bio:'',xp:100,profilePublic:true});
  await setDoc(doc(admin,'friendRequests/alice_bob'),{from:'alice',to:'bob',status:'accepted'});
  await setDoc(doc(admin,'socialPosts/post_public'),{uid:'alice',text:'public',visibility:'public',createdAt:now,updatedAt:now});
  await setDoc(doc(admin,'socialPosts/post_friends'),{uid:'alice',text:'friends',visibility:'friends',createdAt:now,updatedAt:now});
  await setDoc(doc(admin,'socialPosts/post_private'),{uid:'alice',text:'private',visibility:'private',createdAt:now,updatedAt:now});
  await setDoc(doc(admin,'socialStories/story_friends'),{uid:'alice',text:'story',visibility:'friends',createdAt:now,expiresAt:Timestamp.fromMillis(Date.now()+3600000)});
  await setDoc(doc(admin,'socialStories/story_expired'),{uid:'alice',text:'old',visibility:'public',createdAt:now,expiresAt:Timestamp.fromMillis(Date.now()-1000)});
  await setDoc(doc(admin,'clubs/public_club'),{owner:'alice',title:'Public Club',kind:'reading',visibility:'public',membershipMode:'invite',assistant1:'',assistant2:'',restDay:5,bio:'',rulesText:'',language:'fa',avatarPath:'',bannerPath:'',memberLimit:50,memberCount:2,lastMembershipUid:'bob',lastMembershipAction:'join',currentBookTitle:'',status:'active',createdAt:now,updatedAt:now});
  await setDoc(doc(admin,'clubs/public_club/clubMembers/alice'),{uid:'alice',role:'owner',joinedAt:now});
  await setDoc(doc(admin,'clubs/public_club/clubMembers/bob'),{uid:'bob',role:'member',joinedAt:now});
  await setDoc(doc(admin,'clubs/private_club'),{owner:'alice',title:'Private Club',kind:'reading',visibility:'private',membershipMode:'invite',assistant1:'',assistant2:'',restDay:5,bio:'',rulesText:'',language:'fa',avatarPath:'',bannerPath:'',memberLimit:50,memberCount:2,lastMembershipUid:'bob',lastMembershipAction:'join',currentBookTitle:'',status:'active',createdAt:now,updatedAt:now});
  await setDoc(doc(admin,'clubs/private_club/clubMembers/alice'),{uid:'alice',role:'owner',joinedAt:now});
  await setDoc(doc(admin,'clubs/private_club/clubMembers/bob'),{uid:'bob',role:'member',joinedAt:now});
 });
 const a=store('alice'),b=store('bob'),e=store('eve');
 const pub=ref(a,'pageMedia/alice/post/post_public/abcdefgh.png'),friends=ref(a,'pageMedia/alice/post/post_friends/abcdefgh.png'),priv=ref(a,'pageMedia/alice/post/post_private/abcdefgh.png'),story=ref(a,'pageMedia/alice/story/story_friends/abcdefgh.png'),expired=ref(a,'pageMedia/alice/story/story_expired/abcdefgh.png');
 await assertSucceeds(uploadBytes(pub,image,meta));
 await assertSucceeds(uploadBytes(friends,image,meta));
 await assertSucceeds(uploadBytes(priv,image,meta));
 await assertSucceeds(uploadBytes(story,image,meta));
 await assertSucceeds(uploadBytes(expired,image,meta));
 await assertFails(uploadBytes(ref(e,'pageMedia/alice/post/post_public/spoofimg.png'),image,meta));
 await assertFails(uploadBytes(ref(a,'pageMedia/alice/post/post_public/badimage1.txt'),image,{contentType:'text/plain'}));
 await assertSucceeds(getBytes(ref(a,'pageMedia/alice/post/post_private/abcdefgh.png')));
 await assertSucceeds(getBytes(ref(b,'pageMedia/alice/post/post_friends/abcdefgh.png')));
 await assertFails(getBytes(ref(e,'pageMedia/alice/post/post_friends/abcdefgh.png')));
 await assertSucceeds(getBytes(ref(e,'pageMedia/alice/post/post_public/abcdefgh.png')));
 await assertSucceeds(getBytes(ref(b,'pageMedia/alice/story/story_friends/abcdefgh.png')));
 await assertFails(getBytes(ref(e,'pageMedia/alice/story/story_expired/abcdefgh.png')));
 await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'blocks/alice__bob'),{owner:'alice',target:'bob',targetName:'Bob',targetUsername:'bob',createdAt:Timestamp.now()})});
 await assertFails(getBytes(ref(b,'pageMedia/alice/post/post_public/abcdefgh.png')));
 await assertSucceeds(deleteObject(ref(a,'pageMedia/alice/post/post_public/abcdefgh.png')));
 await assertFails(deleteObject(ref(b,'pageMedia/alice/post/post_friends/abcdefgh.png')));
 const clubPublic=ref(a,'clubMedia/public_club/avatar/alice/clubavatar01.png'),clubPrivate=ref(a,'clubMedia/private_club/banner/alice/clubbanner01.png');
 await assertSucceeds(uploadBytes(clubPublic,image,meta));
 await assertSucceeds(uploadBytes(clubPrivate,image,meta));
 await assertFails(uploadBytes(ref(a,'clubMedia/public_club/avatar/alice/clubavatar02.png'),image,{contentType:'application/pdf'}));
 await assertFails(uploadBytes(ref(a,'clubMedia/public_club/banner/alice/clubbanner02.png'),new Uint8Array(5*1024*1024),meta));
 await assertFails(uploadBytes(ref(a,'unrelated/social/file012345.png'),image,meta));
 await assertFails(uploadBytes(ref(b,'clubMedia/public_club/avatar/bob/memberfile01.png'),image,meta));
 await assertSucceeds(getBytes(ref(e,'clubMedia/public_club/avatar/alice/clubavatar01.png')));
 await assertSucceeds(getBytes(ref(b,'clubMedia/private_club/banner/alice/clubbanner01.png')));
 await assertFails(getBytes(ref(e,'clubMedia/private_club/banner/alice/clubbanner01.png')));
 await assertSucceeds(deleteObject(ref(a,'clubMedia/public_club/avatar/alice/clubavatar01.png')));
 await assertFails(deleteObject(ref(b,'clubMedia/private_club/banner/alice/clubbanner01.png')));
 console.log('STORAGE_RULES_E2E_PASS page-media club-media owner-write public-member-private block delete');
}finally{await env.cleanup()}
