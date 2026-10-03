import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub=`window.ElaraAccount={user:{uid:'focus-plan-qa',emailVerified:true},profile:{uid:'focus-plan-qa',name:'Focus Plan QA',username:'focus_plan',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`window.__focusPlanPublished=[];window.ElaraSocial={me:{uid:'focus-plan-qa',name:'Focus Plan QA'},friends:[],requests:[],activities:[],refresh:async()=>{},activityVisibility:()=> 'friends',publishActivity:async function(type,detail){window.__focusPlanPublished.push({type,detail});return true}};window.dispatchEvent(new Event('elara:social-updated'));`;
function seed(){
 const now=Date.now();
 localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,theme:'dark',tasks:[],habits:[],goals:[],books:[],words:[],taskLists:[],folders:[],tags:[],focusSessions:[],taskCompletionHistory:[],missionRewardClaims:[],activeFocus:{id:'focus-chain-1',kind:'focus',durationMin:25,focusDurationMin:25,breakMin:1,sessionIndex:1,sessionCount:2,autoBreak:true,sequenceId:'seq-qa',tag:'deep',startedAt:now-26*60000,endAt:now-1000,remainingSec:0,status:'running'},focusPlanProgress:null}));
 localStorage.setItem('elara_privacy_local_v1_focus-plan-qa',JSON.stringify({focus:'friends'}));
 localStorage.setItem('elara_locale_v1','fa');
}
async function wire(page){await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));}
const page=await browser.newPage({viewport:{width:390,height:844}});await wire(page);await page.addInitScript(seed);
await page.goto(base+'/?pomodoro-sessions='+Date.now()+'#focus',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.ElaraI18n&&document.getElementById('focus-session-count')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return s.focusSessions?.length===1&&s.activeFocus?.kind==='break'},null,{timeout:8000});
let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));
assert.equal(state.xp,35,'focus completion should award exactly 15 XP');assert.equal(state.activeFocus.sessionIndex,1);assert.equal(state.activeFocus.sessionCount,2);assert.equal(state.activeFocus.breakMin,1);assert.equal(state.activeFocus.autoBreak,true);
assert.match(await page.locator('#focus-status').innerText(),/استراحت/,'auto break did not render');assert.equal(await page.locator('#focus-session-count').isDisabled(),true,'cycle controls must lock during an active chain');
await page.waitForFunction(()=>Array.isArray(window.__focusPlanPublished)&&window.__focusPlanPublished.length===1,null,{timeout:6000});
await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));s.activeFocus.endAt=Date.now()-10;s.activeFocus.remainingSec=0;localStorage.setItem('elara_space_v1',JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:s}))});
await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return !s.activeFocus&&s.focusPlanProgress?.sessionIndex===2},null,{timeout:5000});
state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.equal(state.xp,35,'break must never award XP');assert.equal(state.focusSessions.length,1,'break must not create focus history');assert.equal(await page.evaluate(()=>window.__focusPlanPublished.length),1,'break must not publish social activity');
assert.match(await page.locator('#focus-status').innerText(),/جلسهٔ ۲|جلسهٔ ۲ از ۲/);
await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('focus-session-count')&&!document.documentElement.hasAttribute('data-elara-booting'));
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').focusPlanProgress?.sessionIndex===2);
assert.match(await page.locator('#focus-status').innerText(),/جلسهٔ ۲/,'pending next session did not survive refresh');
await page.evaluate(()=>ElaraI18n.set('en'));await page.waitForTimeout(120);assert.match(await page.locator('#focus-status').innerText(),/Session 2 of 2 is ready/i);assert.match(await page.locator('.focus-cycle-config').innerText(),/Break \(minutes\)/i);
await page.locator('#timer-start').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.sessionIndex===2);
state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.equal(state.activeFocus.kind,'focus');assert.equal(state.activeFocus.sessionCount,2);assert.equal(state.focusPlanProgress,null);
const m=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(m.sw<=m.w+1,'390 pomodoro horizontal overflow '+JSON.stringify(m));
await page.screenshot({path:'browser-artifacts/pomodoro-sessions-390.png',fullPage:false});await page.close();

const desktop=await browser.newPage({viewport:{width:1440,height:1000}});await wire(desktop);await desktop.addInitScript(()=>{localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:0,theme:'light',tasks:[],habits:[],goals:[],books:[],words:[],taskLists:[],folders:[],tags:[],focusSessions:[],taskCompletionHistory:[],missionRewardClaims:[],activeFocus:null,focusPlanProgress:null}));localStorage.setItem('elara_locale_v1','en')});
await desktop.goto(base+'/?pomodoro-desktop='+Date.now()+'#focus',{waitUntil:'domcontentloaded',timeout:30000});await desktop.waitForFunction(()=>document.getElementById('focus-session-count')&&!document.documentElement.hasAttribute('data-elara-booting'));
const boxes=await Promise.all(['#focus-duration','#focus-break-duration','#focus-session-count'].map(s=>desktop.locator(s).boundingBox()));assert.ok(boxes.every(Boolean),'desktop pomodoro controls missing');
const dm=await desktop.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(dm.sw<=dm.w+1,'1440 pomodoro horizontal overflow '+JSON.stringify(dm));
await desktop.screenshot({path:'browser-artifacts/pomodoro-sessions-1440.png',fullPage:false});await desktop.close();await browser.close();
console.log('POMODORO_SESSIONS_PASS auto-break no-break-xp persistence next-session i18n 390/1440');
