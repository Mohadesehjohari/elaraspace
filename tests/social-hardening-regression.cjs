/* Regression coverage for first-time DM, invite delivery, group consent and per-user alerts.
 * All Firestore calls are mocked; use firestore-rules-emulator for real rules tests. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../elara-social.js'),'utf8');
function extract(open,next){
 const a=src.indexOf(open),b=src.indexOf(next,a+open.length);
 assert.ok(a>=0&&b>a,'function source exists: '+open);
 return src.slice(a,b);
}
function callable(text,name,mocks){
 const keys=Object.keys(mocks);
 return new Function(...keys,text+';return '+name+';')(...keys.map(k=>mocks[k]));
}
(async()=>{
 // Missing conversations cannot be read by an unauthorized nonexistent-doc
 // get rule. A safe create-first approach must succeed without that read.
 let conversation=null,absentReads=0,attempts=0;
 const dm=callable(extract('async function ensureDm(other){','async function listDms(){'),'ensureDm',{
  uid:'alice',auth:{currentUser:{emailVerified:true}},acceptedFriend:()=>true,
  dmId:()=> 'alice__bob',db:{},doc:()=>({}),
  getDoc:async()=>{if(!conversation){absentReads++;throw Error('forbidden missing-doc read')}return{exists:()=>true,data:()=>conversation}},
  setDoc:async(_,body)=>{attempts++;if(conversation){const error=Error('already exists');error.code='permission-denied';throw error}conversation=body},
  serverTimestamp:()=>({seconds:1})
 });
 assert.equal(await dm('bob'),'alice__bob');
 assert.equal(await dm('bob'),'alice__bob');
 assert.equal(absentReads,0);
 assert.equal(attempts,2);

 // First group invite creates the request directly. A get on the absent
 // invite is denied by Firestore participant-scoped get rules.
 let inviteReads=0,writes=0;
 const invite=callable(extract('async function inviteGroup(groupId,target){','async function listGroupInvites(){'),'inviteGroup',{
  uid:'alice',db:{},state:{friends:[{uid:'bob'}]},doc:(...v)=>({path:v.join('/')}),
  getDoc:async r=>{
   if(r.path.includes('groupInvites')){inviteReads++;throw Error('forbidden missing invite read')}
   if(r.path.includes('groupMembers'))return{exists:()=>false};
   return{exists:()=>true,data:()=>({owner:'alice',status:'active'})};
  },
  setDoc:async(_,body)=>{assert.equal(body.status,'pending');writes++},
  updateDoc:async()=>{},serverTimestamp:()=>({seconds:1})
 });
 assert.equal(await invite('group1','bob'),'bob');
 assert.equal(inviteReads,0);assert.equal(writes,1);

 // Group creation requests consent rather than silently adding people as
 // members; the owner is the only initial member.
 const calls=[];let createdGroupRef;
 const group=callable(extract('async function createGroup(title,members=[]){','async function listGroups(){'),'createGroup',{
  uid:'alice',auth:{currentUser:{emailVerified:true}},
  groupFriendIds:()=>new Set(['bob','carol']),db:{},
  doc:(...args)=>{if(args.length===1){createdGroupRef={id:'group1'};return createdGroupRef}return{id:args.at(-1)}},
  collection:()=>({}),writeBatch:()=>({
   set:(ref,body)=>calls.push(['set',ref.id,body.role||'group']),
   commit:async()=>calls.push(['commit'])
  }),
  serverTimestamp:()=>({seconds:1}),
  inviteGroup:async(id,uid)=>{calls.push(['invite',id,uid]);return uid},
  window:{ElaraNotify:{push:()=>{}}},console
 });
 assert.equal(await group('Study Group',['bob','carol']),'group1');
 assert.deepEqual(calls.filter(x=>x[0]==='set').map(x=>x[1]),['group1','alice']);
 assert.equal(calls.filter(x=>x[0]==='invite').length,2);
 assert.ok(calls.indexOf(calls.find(x=>x[0]==='commit'))<calls.findIndex(x=>x[0]==='invite'));

 // Notifications are scoped by identity to prevent a shared browser from
 // revealing private friend messages or connection requests across accounts.
 const memory=new Map(),session={uid:'alice'},window={
  ElaraAccount:{user:session},addEventListener:()=>{},dispatchEvent:()=>{},
  ElaraI18n:{t:(fa)=>fa}
 };
 const context={
  window,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
  document:{readyState:'loading',documentElement:{lang:'fa'},addEventListener:()=>{},querySelectorAll:()=>[]},
  crypto:{randomUUID:()=> 'test-id'},CustomEvent:class{constructor(type,detail){this.type=type;this.detail=detail}},
  console
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../notifications.js'),'utf8'),context);
 window.ElaraNotify.push({type:'friend',title:'Private for Alice'});
 assert.equal(window.ElaraNotify.read().length,1);
 session.uid='bob';
 assert.equal(window.ElaraNotify.read().length,0);
 window.ElaraNotify.push({type:'friend',title:'Private for Bob'});
 assert.equal(window.ElaraNotify.read().length,1);
 session.uid='alice';
 assert.equal(window.ElaraNotify.read().length,1);
 assert.equal(window.ElaraNotify.read()[0].title,'Private for Alice');
 assert.ok(memory.has('elara_notifications_v1__alice')&&memory.has('elara_notifications_v1__bob'));
 console.log('PASS social hardening: DM create-first, invite create-first, group consent, account-scoped notifications');
})().catch(err=>{console.error(err);process.exitCode=1});
