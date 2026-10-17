import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../mission-celebration.js',import.meta.url),'utf8');
const listeners=new Map(),requests=[];
let enabled=true;
const win={
 addEventListener(name,cb){listeners.set(name,cb)},
 ElaraMissions:{snapshot:()=>[{key:'next-one',name:'Next goal',completed:false}]},
 ElaraFoxRewards:{
  show(key,payload){requests.push({key,payload});return true},
  get options(){return {visible:true,celebrations:enabled}},
  get active(){return false}
 }
};
const doc={
 documentElement:{lang:'fa',hasAttribute:()=>false},
 addEventListener(){},
 querySelector(){return null}
};
const prefs={getItem:()=>null};
vm.runInNewContext(code,{window:win,document:doc,localStorage:prefs,queueMicrotask,setTimeout,clearTimeout,console,Intl});
assert.equal(typeof win.ElaraMissionCelebration.enqueue,'function');
const emit=detail=>listeners.get('elara:mission-claimed')({detail});
// Claim events emitted synchronously by rpg.js after one saved state must batch into one celebration.
emit({key:'first-task:2026-10-17',name:'First daily task',rewardXp:20});
emit({key:'three-tasks:2026-10-17',name:'Three daily tasks',rewardXp:35});
await Promise.resolve();
assert.equal(requests.length,1,'claims in same microtask should not trigger two modal dialogs');
assert.equal(requests[0].payload.kind,'mission');
assert.equal(requests[0].payload.image,'celebrate');
assert.ok(requests[0].payload.description.includes('First daily task'));
assert.ok(requests[0].payload.description.includes('Three daily tasks'));
assert.ok(requests[0].payload.tags.some(x=>x.includes('۵۵')||x.includes('55')),'must use confirmed claimed XP total');
assert.equal(requests[0].payload.go,'missions');
assert.equal(requests[0].payload.primary,'دیدن مأموریت‌ها');
enabled=false;
emit({key:'book',name:'Finished book',rewardXp:40});
await Promise.resolve();
assert.equal(requests.length,1,'disabled celebrations must be silent');
console.log('FOX_MISSION_BATCH_PASS grouped confirmed rewards, CTA, opt-out');
