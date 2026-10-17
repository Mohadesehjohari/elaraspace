'use strict';
// Regression tests for synchronous memory adapter + asynchronous Firestore KV.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../elara-cloud-storage.js'),'utf8');
 const nativeRows=new Map([
  ['elara_private_wellness_v1_A','{"water":6}'],
  ['elara_private_wellness_v1_B','{"water":99}'],
  ['elara_locale_v1','en'],
  ['elara_space_v1','{"tasks":[{"text":"legacy guest task"}]}']
 ]);
 let nativeWrites=0;
 const native={
  get length(){return nativeRows.size},
  key:i=>[...nativeRows.keys()][i]??null,
  getItem:key=>nativeRows.get(key)??null,
  setItem:(key,value)=>{nativeWrites++;nativeRows.set(key,String(value))},
  removeItem:key=>nativeRows.delete(key)
 };
 const events=[];
 const window={localStorage:native,dispatchEvent:e=>events.push(e.type)};
 const ctx={window,Event:class Event{constructor(type){this.type=type}},setTimeout:(fn)=>setTimeout(fn,1e6),clearTimeout};
 vm.runInNewContext(source,ctx,{filename:'elara-cloud-storage.js'});
 const store=window.ElaraCloudStorage;
 store.setItem('elara_early_v1','ephemeral');
 assert.equal(nativeWrites,0,'initial guest state must not persist to localStorage');

 const cloud=new Map([['elara_existing_A','server data'],['elara_private_wellness_v1_A','{"water":8}']]);
 let failNext=false;
 const api={
  list:async()=>[...cloud.entries()].map(([key,value])=>({key,value})),
  write:async(key,value)=>{if(failNext){failNext=false;throw Object.assign(Error('offline'),{code:'unavailable'})}cloud.set(key,value)},
  remove:async key=>cloud.delete(key)
 };
 await store.connect('A',api);
 assert.equal(store.inspect().connected,true);
 assert.equal(store.getItem('elara_early_v1'),null,'guest data must not enter an account');
 assert.equal(store.getItem('elara_private_wellness_v1_A'),'{"water":8}','server copy must win');
 assert.equal(store.getItem('elara_locale_v1'),'en','per-device cosmetic preferences can migrate');
 assert.equal(nativeRows.has('elara_locale_v1'),false,'migrated value removed only after server write');
 assert.equal(nativeRows.has('elara_private_wellness_v1_B'),true,'another account must never be imported or deleted');
 assert.equal(nativeRows.has('elara_space_v1'),true,'unknown old guest core data must not be auto-imported');
 assert.equal(nativeWrites,0,'no app data is ever written to native storage');

 store.setItem('elara_cloud_feature_A','saved');
 await store.flush();
 assert.equal(cloud.get('elara_cloud_feature_A'),'saved');
 store.removeItem('elara_cloud_feature_A');
 await store.flush();
 assert.equal(cloud.has('elara_cloud_feature_A'),false);

 store.setItem('elara_space_v1','x'.repeat(700000));
 assert.equal(store.getItem('elara_space_v1').length,700000,'main data may reach configured cloud size');
 assert.throws(()=>store.setItem('elara_too_large','x'.repeat(350001)),/حجم/);

 store.setItem('elara_flaky_A','retry');
 failNext=true;
 await assert.rejects(()=>store.flush(),/offline/);
 assert.equal(store.inspect().pending,1,'failed uploads must remain queued');
 await store.flush();
 assert.equal(cloud.get('elara_flaky_A'),'retry');
 await store.disconnect();
 assert.equal(store.getItem('elara_flaky_A'),null,'signed-out account data must be cleared');

 const cloudB=new Map([['elara_existing_B','another account']]);
 await store.connect('B',{
  list:async()=>[...cloudB.entries()].map(([key,value])=>({key,value})),
  write:async(k,v)=>cloudB.set(k,v),
  remove:async k=>cloudB.delete(k)
 });
 assert.equal(store.getItem('elara_existing_A'),null);
 assert.equal(store.getItem('elara_existing_B'),'another account');
 assert.equal(store.getItem('elara_private_wellness_v1_B'),'{"water":99}','B legacy data migrates only when B signs in');
 assert.equal(nativeRows.has('elara_private_wellness_v1_B'),false);
 await store.disconnect();
 assert.ok(events.includes('elara:cloud-storage-ready'));
 console.log('CLOUD_STORAGE_CONTRACT_PASS: owner-isolated Firestore KV, no native writes, safe migration, server wins, error retry');
})().catch(error=>{console.error(error);process.exitCode=1});
