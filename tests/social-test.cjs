// Canonical social lifecycle contract. Firebase network is mocked; Firestore paths/transitions are asserted from real source.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const {setup}=require('./dom-check.cjs');
(async()=>{
 const {dom,w,errors}=await setup();
 const source=fs.readFileSync(path.resolve(__dirname,'../elara-social.js'),'utf8').replace(/^import .*;\n/gm,'');
 const rules=fs.readFileSync(path.resolve(__dirname,'../firestore.rules'),'utf8');
 const profiles=new Map([
  ['A',{username:'aren',name:'Aren',bio:'',xp:100,profilePublic:true}],
  ['B',{username:'behnam',name:'Behnam',bio:'',xp:90,profilePublic:true}],
  ['C',{username:'cyrus',name:'Cyrus',bio:'',xp:80,profilePublic:true}]
 ]);
 const usernames=new Map([...profiles].map(([uid,p])=>[p.username,{uid}]));
 const requests=new Map(),reads={friendRequests:0};let friendReadGate=null;
 const mockAuth={currentUser:{uid:'A',emailVerified:true}};
 const ref=(kind,id)=>({kind,id,path:kind+'/'+id});
 const snap=(id,data)=>({id,exists:()=>data!==undefined,data:()=>data,ref:ref('friendRequests',id)});
 const fsMock={
  doc:(_db,kind,...rest)=>ref(kind,rest.join('/')),
  collection:(_db,name)=>({name}),
  where:(field,_op,value)=>({field,value}),
  query:(col,...clauses)=>({name:col.name,clauses}),
  getDoc:async r=>{
   if(r.kind==='profiles')return snap(r.id,profiles.get(r.id));
   if(r.kind==='usernames')return snap(r.id,usernames.get(r.id));
   if(r.kind==='friendRequests'){reads.friendRequests++;return snap(r.id,requests.get(r.id))}
   return snap(r.id,undefined);
  },
  getDocs:async q=>{
   if(q.name==='activities')return {docs:[]};
   if(q.name!=='friendRequests')return {docs:[]};
   if(friendReadGate)await friendReadGate;
   const rows=[...requests].filter(([,data])=>q.clauses.every(c=>data[c.field]===c.value));
   return {docs:rows.map(([id,data])=>snap(id,data))};
  },
  setDoc:async(r,data)=>{
   if(r.kind!=='friendRequests')throw Error('unexpected set '+r.path);
   const reverse=[...requests.values()].find(x=>x.from===data.to&&x.to===data.from&&x.status!=='declined');
   if(reverse){const e=Error('crossed request denied');e.code='permission-denied';throw e}
   const existing=requests.get(r.id);
   if(existing&&existing.status!=='declined'){const e=Error('duplicate request denied');e.code='permission-denied';throw e}
   requests.set(r.id,{...data});
  },
  updateDoc:async(r,patch)=>{const current=requests.get(r.id);if(!current)throw Error('missing request '+r.id);requests.set(r.id,{...current,...patch})},
  deleteDoc:async r=>{requests.delete(r.id)}
 };
 w.__mockAuth=mockAuth;w.__fs=fsMock;
 w.eval(`(()=>{const getApp=()=>({}),getAuth=()=>window.__mockAuth,getFirestore=()=>({}),onAuthStateChanged=()=>{},updateProfile=async()=>{},serverTimestamp=()=>({}),runTransaction=async()=>{};const {doc,collection,where,query,getDoc,getDocs,setDoc,updateDoc,deleteDoc}=window.__fs;${source}\nwindow.__socialTest=(me,friends=[],reqs=[])=>{window.__mockAuth.currentUser=me?{uid:me.uid,emailVerified:true}:null;uid=me?.uid||null;state.me=me;state.friends=friends;state.requests=reqs;state.activities=[];state.error='';render()};window.__socialOps={addFriend,decide,refresh,cancelRequest,removeFriend};})()`);

 // Existing presentation contracts.
 for(let count=0;count<=4;count++){
  const people=Array.from({length:count},(_,i)=>({uid:'fixture-'+i,name:i===1?'<b>Literal name</b>':'Fixture '+i,username:'fixture_'+i,xp:i*10}));
  w.document.querySelector('[data-social-route="ranking"][data-social-view="ranking"]').click();w.__socialTest(people[0]||null,people.slice(1));
  assert.equal(w.document.querySelectorAll('#elara-ranking-page .social-podium-place').length,Math.min(count,3));
  assert.equal(w.document.querySelectorAll('#elara-ranking-page .social-reference-grid>section:nth-child(4) .social-row').length,count);
  if(count>1)assert.ok(w.document.querySelector('#elara-ranking-page .social-podium').textContent.includes('<b>Literal name</b>'));
  w.document.querySelector('[data-social-route="ranking"][data-social-view="friends"]').click();
  assert.equal(w.document.querySelector('[data-social-route="ranking"][data-social-view="friends"]').getAttribute('aria-selected'),'true');
 }

 // A refresh already in flight must be awaited before a new friendship mutation checks state.
 // This prevents a stale client from attempting a crossed A->C request while C->A already exists.
 requests.set('C_A',{from:'C',to:'A',status:'pending'});
 w.document.querySelector('[data-social-route="social"][data-social-view="friends"]').click();w.__socialTest({uid:'A',...profiles.get('A')});
 let releaseFriendReads;friendReadGate=new Promise(resolve=>{releaseFriendReads=resolve});
 const backgroundRefresh=w.__socialOps.refresh();await new Promise(resolve=>setTimeout(resolve,0));
 const crossedGuard=w.__socialOps.addFriend('cyrus');await new Promise(resolve=>setTimeout(resolve,0));
 releaseFriendReads();friendReadGate=null;await backgroundRefresh;
 await assert.rejects(()=>crossedGuard,/درخواست ورودی|درخواست فرستاده/,'queued refresh must complete before crossed-request guard');
 assert.equal(requests.has('A_C'),false,'serialized refresh must prevent a crossed write attempt');
 requests.delete('C_A');await w.__socialOps.refresh();

 // A sends first request to B. This is the regression: no getDoc() of the missing request path is allowed.
 w.document.querySelector('[data-social-route="social"][data-social-view="friends"]').click();w.__socialTest({uid:'A',...profiles.get('A')});
 reads.friendRequests=0;
 await w.__socialOps.addFriend('@BEHNAM');
 assert.equal(reads.friendRequests,0,'first-time send must not pre-read a missing friendRequests document');
 assert.deepEqual(requests.get('A_B'),{from:'A',to:'B',status:'pending'});
 assert.ok(w.ElaraSocial.requests.some(x=>x.id==='A_B'&&x.status==='pending'),'sender state must show pending request');
 w.document.querySelector('[data-social-route="social"][data-social-view="requests"]').click();
 assert.match(w.document.getElementById('elara-social-page').textContent,/در انتظار/,'sender UI must show pending state in Requests tab');

 // Refresh/persistence: receiver sees incoming request.
 w.__socialTest({uid:'B',...profiles.get('B')});
 await w.__socialOps.refresh();
 const incoming=w.ElaraSocial.requests.find(x=>x.id==='A_B');
 assert.ok(incoming&&incoming.to==='B'&&incoming.status==='pending','receiver must see persisted incoming request');
 assert.equal(w.document.querySelectorAll('[data-friend-action="accept"][data-request="A_B"]').length>=1,true);
 await assert.rejects(()=>w.__socialOps.addFriend('aren'),/درخواست ورودی|درخواست فرستاده/,'incoming request must replace Send Request, never create a crossed duplicate');
 assert.equal(requests.has('B_A'),false,'incoming request guard must prevent reverse duplicate');

 // Accept creates friendship for both views.
 await w.__socialOps.decide(incoming,'accepted');
 assert.equal(requests.get('A_B').status,'accepted');
 assert.ok(w.ElaraSocial.friends.some(x=>x.uid==='A'),'receiver friendship missing after accept');
 w.__socialTest({uid:'A',...profiles.get('A')});await w.__socialOps.refresh();
 assert.ok(w.ElaraSocial.friends.some(x=>x.uid==='B'),'sender friendship missing after refresh');

 // Duplicate request is blocked after friendship.
 await assert.rejects(()=>w.__socialOps.addFriend('behnam'),/قبلاً دوست شده‌اید/);
 assert.equal([...requests].filter(([,x])=>(x.from==='A'&&x.to==='B')||(x.from==='B'&&x.to==='A')).length,1);

 // Decline deletes the pending request rather than leaving a stale declined record.
 requests.set('C_B',{from:'C',to:'B',status:'pending'});
 w.__socialTest({uid:'B',...profiles.get('B')});await w.__socialOps.refresh();
 const decline=w.ElaraSocial.requests.find(x=>x.id==='C_B');await w.__socialOps.decide(decline,'declined');
 assert.equal(requests.has('C_B'),false,'decline must delete the request');

 // Self request is rejected before Firestore write.
 w.__socialTest({uid:'A',...profiles.get('A')});await assert.rejects(()=>w.__socialOps.addFriend('aren'),/خودت/);

 // Rules guard crossed duplicates and allow receiver to delete a pending incoming request.
 assert.match(rules,/!exists\(requestPath\(request\.resource\.data\.to, request\.resource\.data\.from\)\)/);
 assert.match(rules,/resource\.data\.to == request\.auth\.uid[\s\S]*resource\.data\.status == 'pending'/);
 assert.deepEqual(errors,[]);
 console.log('PASS: Firestore-backed friend send/persist/receiver/accept/decline/no-duplicate/self-guard lifecycle (network mocked; multi-account Firebase browser not verified)');
 dom.window.close();
})().catch(e=>{console.error(e);process.exit(1)});

