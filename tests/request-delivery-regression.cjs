/* Two-account inbox/delivery regression with mocked Firestore, no credentials. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../account-link.js'),'utf8').replace(/^import .*?;\s*$/gm,'');
const records=new Map(),listeners=[],notifications=[],delivered=[];
const stamp=n=>({toMillis:()=>n,seconds:n});
const snapshot=(field,uid)=>({docs:[...records].filter(([,row])=>row[field]===uid).map(([id,row])=>({id,data:()=>({...row})}))});
const broadcast=()=>{for(const listener of listeners)listener.cb(snapshot(listener.field,listener.uid))};
function account(uid,peer){
 const auth={currentUser:{uid,emailVerified:true}},handlers=new Map(),timers=[];let payload=JSON.stringify({tasks:[{id:'task-'+uid,text:'Example task'}],habits:[],goals:[],languageClasses:[],words:[]});
 const emit=event=>(handlers.get(event.type)||[]).forEach(fn=>fn(event));
 const window={
  ElaraSocial:{friends:[{uid:peer,name:peer}]},
  ElaraAccount:{user:auth.currentUser,loaded:true},
  ElaraDialog:{confirm:async()=>true,open:async()=>false},
  ElaraNotify:{push:entry=>notifications.push({owner:uid,...entry})},
  ElaraLoadCollab:async()=>({shareEntity:async(kind,row,to)=>{delivered.push({owner:uid,to,kind,id:row.id})}}),
  addEventListener:(name,fn)=>handlers.set(name,[...(handlers.get(name)||[]),fn]),
  dispatchEvent:emit
 };
 const context={
  window,document:{documentElement:{lang:'fa'},visibilityState:'visible',addEventListener:()=>{}},
  localStorage:{getItem:()=>payload,setItem:(key,value)=>{payload=value}},
  getApp:()=>({}),getAuth:()=>auth,getFirestore:()=>({}),onAuthStateChanged:(instance,fn)=>fn(auth.currentUser),
  collection:(db,name)=>({name}),doc:(db,name,id)=>({name,id}),
  getDoc:async ref=>({exists:()=>records.has(ref.id),data:()=>records.get(ref.id)}),
  getDocs:async query=>snapshot(query.field,query.uid),
  setDoc:async(ref,data)=>{records.set(ref.id,{...data,createdAt:stamp(1),updatedAt:stamp(1)});broadcast()},
  updateDoc:async(ref,patch)=>{records.set(ref.id,{...records.get(ref.id),...patch,updatedAt:stamp(2)});broadcast()},
  query:(collection,where)=>where,where:(field,op,uid)=>({field,uid}),
  onSnapshot:(query,callback)=>{listeners.push({...query,cb:callback});callback(snapshot(query.field,query.uid));return()=>{}},
  serverTimestamp:()=>stamp(1),setTimeout:fn=>{timers.push(fn);return 1},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
  Event:class{constructor(type){this.type=type}},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  console
 };
 vm.runInNewContext(source,context,{filename:'account-link.js'});
 emit({type:'elara:account-ready'});
 return{api:window.ElaraAccountLink,timers,read:()=>JSON.parse(payload)};
}
(async()=>{
 const alice=account('alice','bob'),bob=account('bob','alice');
 await alice.api.request('bob');
 assert.equal(bob.api.status('alice'),'incoming','Recipient must see the incoming link invitation');
 assert.ok(bob.api.requests().some(row=>row.from==='alice'),'Incoming invitation must remain in inbox');
 assert.ok(notifications.some(n=>n.owner==='bob'&&n.title==='درخواست اتصال حساب'),'Recipient must receive a visible notification');
 await bob.api.accept('alice__bob');
 assert.equal(bob.api.status('alice'),'accepted');
 assert.equal(alice.api.status('bob'),'accepted');
 alice.api.setItemMode('task',['task-alice'],'shared');
 for(let i=0;i<20;i++){const job=alice.timers.shift();if(job)await job();await Promise.resolve()}
 assert.ok(delivered.some(x=>x.owner==='alice'&&x.to==='bob'&&x.id==='task-alice'),'Shared task must be delivered');
 alice.api.setItemMode('task',['task-alice'],'private');
 assert.equal(alice.read().tasks[0].accountLinkVisibility,'private');
 console.log('PASS: incoming request + notification + mutual acceptance + shared task + privacy');
})().catch(error=>{console.error(error);process.exitCode=1});
