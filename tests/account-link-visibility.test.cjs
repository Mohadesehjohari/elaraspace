/* Standalone Node regression: account-link visibility never exposes older records by default. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../account-link.js'),'utf8').replace(/^import .*?;\s*$/gm,'');
const me={uid:'user-a',emailVerified:true},auth={currentUser:me};
const data={tasks:[{id:'old-task',text:'Old task'}],habits:[{id:'old-habit',title:'Old habit'}],goals:[],languageClasses:[],words:[]};
const store=new Map([['elara_space_v1',JSON.stringify(data)]]);
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,value)=>store.set(k,value)};
const callbacks={};
const window={
 ElaraSocial:{friends:[{uid:'user-b',name:'Friend B'}]},
 ElaraAccount:{user:me,loaded:true},
 addEventListener:(name,cb)=>{callbacks[name]=cb},
 dispatchEvent:()=>{}
};
const linked={id:'user-a__user-b',from:'user-a',to:'user-b',status:'accepted'};
const context={
 window,localStorage,document:{documentElement:{lang:'fa'},addEventListener:()=>{}},
 getApp:()=>({}),getAuth:()=>auth,getFirestore:()=>({}),
 collection:()=>({}),doc:()=>({}),getDoc:async()=>({}),setDoc:async()=>{},updateDoc:async()=>{},
 query:(_,condition)=>({condition}),where:(key,comparison,value)=>({key,value}),
 onSnapshot:(spec,callback)=>{callback({docs:spec.condition.key==='from'?[{id:linked.id,data:()=>linked}]:[]});return()=>{}},
 serverTimestamp:()=>Date.now(),onAuthStateChanged:(_,callback)=>callback(me),
 setTimeout:()=>0,clearTimeout:()=>{},Event:class{},CustomEvent:class{},
 console
};
vm.runInNewContext(src,context,{filename:'account-link.js'});
const api=window.ElaraAccountLink;
const read=()=>JSON.parse(store.get('elara_space_v1'));
assert.equal(api.status('user-b'),'accepted');
api.setDefaultMode('shared');
assert.equal(read().accountLinkDefaultMode,'shared');
assert.equal(read().tasks[0].accountLinkVisibility,'private','Existing task remains private');
assert.equal(read().habits[0].accountLinkVisibility,'private','Existing habit remains private');
assert.ok(read().accountLinkSeen[linked.id].includes('task|old-task'),'Existing task is in initial delivery baseline');
let state=read();state.tasks.push({id:'new-task',text:'New task'});localStorage.setItem('elara_space_v1',JSON.stringify(state));
api.setItemMode('task',['old-task'],'shared');
assert.equal(read().tasks[0].accountLinkVisibility,'shared');
assert.ok(!read().accountLinkSeen[linked.id].includes('task|old-task'),'Opted-in old item is queued');
api.setItemMode('task',['old-task'],'private');
assert.equal(read().tasks[0].accountLinkVisibility,'private');
assert.ok(read().accountLinkSeen[linked.id].includes('task|old-task'),'Private item is blocked');
api.setItemMode('habit',['old-habit'],'shared');
assert.equal(read().habits[0].accountLinkVisibility,'shared');
window.ElaraSocial.friends=[];
assert.throws(()=>api.setItemMode('task',['new-task'],'shared'),/دوست|friend/i);
console.log('Account sharing visibility regressions passed.');
