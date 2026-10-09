import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../elara-collab.js',import.meta.url),'utf8');
const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const socialUI=readFileSync(new URL('../social-view.js',import.meta.url),'utf8');
assert.match(socialUI,/data-collab-trusted-launcher/,'Trusted link must be reachable from Friends even with zero invitations');
const cut=(from,to)=>{const a=source.indexOf(from),b=source.indexOf(to,a+from.length);assert.ok(a>=0&&b>a,'missing '+from);return source.slice(a,b)};
const share=cut('async function shareEntity(kind,entity,friendUid=null){','async function acceptInvite(inviteId)');
let didInvite=0,didDeliver=0,didCreate=0;
const shared=runInNewContext(share+';shareEntity',{
 createSpace:async()=>{didCreate++;return 's1'},pickFriend:async()=>null,tx:(fa,en)=>en,
 activeTrustedLink:async()=>({id:'link'}),deliverToTrustedAccount:async()=>{didDeliver++},
 invite:async()=>{didInvite++}
});
await shared('task',{id:'one'},'friend');
assert.equal(didDeliver,1,'trusted share was not automatically delivered');
assert.equal(didInvite,0,'trusted share incorrectly showed per-item invitation');
const normal=runInNewContext(share+';shareEntity',{
 createSpace:async()=>{didCreate++;return 's2'},pickFriend:async()=>null,tx:(fa,en)=>en,
 activeTrustedLink:async()=>null,deliverToTrustedAccount:async()=>{didDeliver++},
 invite:async()=>{didInvite++}
});
await normal('goal',{id:'two'},'normalFriend');
assert.equal(didInvite,1,'normal friends lost per-item invite flow');
assert.equal(didDeliver,1,'non-trusted friend received automatic content');
// A private item never enters this path unless shareEntity was explicitly invoked.
assert.equal(didCreate,2,'implicit unrequested sharing was introduced');

const materializer=cut('async function materializeTrustedDelivery(entry,uid){','function startTrustedDeliveryFeed(uid=me()){');
const link={status:'active'},space={kind:'task',ownerUid:'alice',title:'Shared task'};
let localCount=0,memberWriteCount=0,memberUpdateCount=0;
let memberExists=false,localId='';
const auth={currentUser:{uid:'bob',emailVerified:true}};
const doc=(db,...parts)=>parts.join('/');
const getDoc=async ref=>{
 if(ref==='collabSpaces/space1/members/bob')return{exists:()=>memberExists};
 if(ref==='accountLinks/alice__bob')return{exists:()=>true,data:()=>link};
 if(ref==='collabSpaces/space1')return{exists:()=>true,id:'space1',data:()=>space};
 throw Error('unexpected document '+ref)
};
const setDoc=async ref=>{assert.equal(ref,'collabSpaces/space1/members/bob');memberWriteCount++;memberExists=true};
const updateDoc=async ref=>{assert.equal(ref,'collabSpaces/space1/members/bob');memberUpdateCount++};
const materialize=space=>{if(!localId){localId='shared-'+space.id;localCount++}return localId};
const ctx={auth,doc,db:{},getDoc,setDoc,updateDoc,serverTimestamp:()=>new Date(),materialize,findLocal:()=>({text:'Shared task'}),progressFor:()=>({completed:0,total:1,percent:0}),window:{dispatchEvent:()=>{}},Event,console,trustedInFlight:new Set()};
const receive=runInNewContext(materializer+';materializeTrustedDelivery',ctx);
const entry={id:'space1__bob',data:()=>({spaceId:'space1',linkId:'alice__bob',to:'bob',kind:'task'})};
await Promise.all([receive(entry,'bob'),receive(entry,'bob')]);
await receive(entry,'bob'); // reconnect snapshot, no duplicate local item or membership
assert.equal(memberWriteCount,1,'duplicate Firestore membership on double event');
assert.equal(localCount,1,'local materialization duplicated shared canonical item');
assert.equal(memberUpdateCount,2,'existing shared membership lost progress synchronization');
// After disconnect, a NEW delivery may not create recipient membership.
memberExists=false;localId='';link.status='revoked';
await receive(entry,'bob');
assert.equal(memberWriteCount,1,'disconnected account received new item');
assert.equal(localCount,1,'disconnected account materialized private shared item');
assert.match(rules,/match \/accountLinks\/\{linkId\}/);
assert.match(rules,/match \/trustedDeliveries\/\{deliveryId\}/);
assert.match(rules,/trustedAccountLinkActive\(request\.resource\.data\.trustedLinkId/);
console.log('TRUSTED_CLIENT_AUTO_DELIVERY_PASS explicit five-kind route, normal invites, concurrent snapshot dedupe, reconnect, disconnect');
