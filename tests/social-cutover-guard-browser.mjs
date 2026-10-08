import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
const guardedSha=process.env.ELARA_GUARDED_MAIN_SHA||'';
const sourceAt=path=>guardedSha?execFileSync('git',['show',guardedSha+':'+path],{encoding:'utf8'}):null;

// Run the actual guarded production service source in Chromium with a fail-closed
// Firestore transport spy. No network write is permitted by any gated entrypoint.
const source=(sourceAt('elara-social.js')||await fs.readFile(new URL('../elara-social.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
const prelude=`
window.__cutoverWrites=0;
const getApp=()=>({}),getAuth=()=>({currentUser:{uid:'a',emailVerified:true}}),onAuthStateChanged=()=>{},updateProfile=async()=>{};
const getFirestore=()=>({}),doc=(...args)=>({path:args.join('/')}),collection=(...args)=>({path:args.join('/')}),collectionGroup=(...args)=>({path:args.join('/')});
const getDoc=async()=>({exists:()=>false}),getDocs=async()=>({docs:[]}),query=(...a)=>a,where=(...a)=>a,orderBy=(...a)=>a,limit=(...a)=>a,onSnapshot=()=>()=>{};
const addDoc=async()=>{window.__cutoverWrites++;return {id:'bad'};};
const updateDoc=async()=>{window.__cutoverWrites++};
const setDoc=async()=>{window.__cutoverWrites++};
const deleteDoc=async()=>{window.__cutoverWrites++};
const serverTimestamp=()=>({}),runTransaction=async()=>{window.__cutoverWrites++};
const writeBatch=()=>({set(){window.__cutoverWrites++},update(){window.__cutoverWrites++},delete(){window.__cutoverWrites++},commit:async()=>{window.__cutoverWrites++}});
const Timestamp={fromMillis:ms=>({ms})};
`;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<main id="elara-social-page"><div class="social-reference-grid"></div></main><div id="toast" class="toast hidden"></div>');
 await page.addScriptTag({content:prelude+source});
 const operations=await page.evaluate(async()=>{
  const s=window.ElaraSocial,fixture={id:'fake',from:'a',to:'b',status:'pending'};
  const calls=[
   ['group.create',()=>s.groups.create('Legacy',['b'])],
   ['group.send',()=>s.groups.send('gid','Hi')],
   ['group.leave',()=>s.groups.leave('gid')],
   ['club.create',()=>s.clubs.create({title:'Legacy club'})],
   ['club.invite',()=>s.clubs.invite('cid','b')],
   ['club.decide',()=>s.clubs.decideInvite({clubId:'cid'},'accepted')],
   ['club.assistant',()=>s.clubs.setAssistant('cid','b',true)],
   ['club.post',()=>s.clubs.createPost('cid',{title:'test'})],
   ['club.vote',()=>s.clubs.vote('cid','pid','yes')],
   ['challenge.create',()=>s.challenges.create('b',{targetText:'Read books'})],
   ['challenge.respond',()=>s.challenges.respond(fixture,'accepted')],
   ['challenge.cancel',()=>s.challenges.cancel(fixture)],
   ['challenge.quick',()=>s.challenges.sendQuick('cid','بزن بریم 🔥')]
  ];
  const results=[];
  for(const [name,fn] of calls){
   try{await fn();results.push({name,blocked:false})}
   catch(e){results.push({name,blocked:e.message===s.socialCutover.message,reason:e.message})}
  }
  return {results,writes:window.__cutoverWrites,readers:['dm','groups','clubs','challenges'].every(k=>!!s[k]),friend:typeof s.blockUser==='function',profile:typeof s.saveProfileValues==='function'}
 });
 assert.equal(operations.results.length,13);
 assert.ok(operations.results.every(x=>x.blocked),JSON.stringify(operations.results));
 assert.equal(operations.writes,0,'Guard must reject before any Firestore mutation');
 assert.ok(operations.readers&&operations.friend&&operations.profile,'Non-cutover APIs missing');
 await page.close();

 // Actual shipped UI components must display the Persian maintenance notice and
 // disable old mutation buttons while keeping read-only lists accessible.
 const ui=await browser.newPage({viewport:{width:390,height:844}});
 await ui.setContent('<main id="elara-social-page"><button data-social-view="groups" aria-selected="true"></button><button data-social-view="friends" aria-selected="true"></button><button data-social-view="clubs" aria-selected="true"></button><div class="social-reference-grid"></div></main><div id="toast" class="toast hidden"></div>');
 await ui.evaluate(()=>{const msg='بخش اجتماعی در حال ارتقاست؛ چند دقیقه دیگر دوباره امتحان کن.';window.ElaraSocial={me:{uid:'a',xp:820},friends:[{uid:'b',name:'Bob'}],socialCutover:{active:true,message:msg},groups:{list:async()=>[],members:async()=>[],messages:async()=>[],listen:()=>()=>{}},clubs:{list:async()=>[],invites:async()=>[],members:async()=>[],posts:async()=>[]},challenges:{list:async()=>[],kinds:['task'],quick:[]}};window.ElaraLevels={level:()=>8};window.ElaraDialog={open:async()=>false};window.ElaraProfileSystem={viewModel:()=>({})};});
 for(const script of ['social-groups-ui.js','social-clubs-ui.js','social-challenges-ui.js']){
  await ui.addScriptTag({content:sourceAt(script)||await fs.readFile(new URL('../'+script,import.meta.url),'utf8')});
 }
 await ui.evaluate(()=>Promise.all([window.ElaraSocialGroupsUI.mount(),window.ElaraSocialClubsUI.mount(),window.ElaraSocialChallengesUI.mount()]));
 const result=await ui.evaluate(()=>({
  notices:[...document.querySelectorAll('.social-cutover-notice')].map(x=>x.textContent),
  disabled:[...document.querySelectorAll('[data-social-create-group],[data-club-create],[data-challenge-create]')].map(b=>b.disabled),
  overflow:document.documentElement.scrollWidth>innerWidth+2
 }));
 assert.equal(result.notices.length,3,'Maintenance must appear for all three old features');
 assert.ok(result.notices.every(s=>s.includes('در حال ارتقا')));
 assert.equal(result.disabled.length,3);
 assert.ok(result.disabled.every(Boolean),'All create actions must be disabled in UI');
 assert.equal(result.overflow,false,'guard must not cause mobile overflow');
 await ui.close();
 console.log('SOCIAL_CUTOVER_GUARD_BROWSER_PASS blocked=13 writes=0 notices=3 reader-apis=preserved');
}finally{await browser.close()}
