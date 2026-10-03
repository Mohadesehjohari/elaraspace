import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173',browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:null,profile:{name:'Mission QA',username:'mission_qa',xp:0,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true};window.dispatchEvent(new Event('elara:social-updated'));";
function seed(){localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:0,theme:'dark',tasks:[{id:'t1',text:'QA task',completed:false,priority:'4'}],taskCompletionHistory:[],habits:[],goals:[],books:[],words:[],focusSessions:[],missionRewardClaims:[],folders:[],tags:[],taskLists:[]}));localStorage.setItem('elara_locale_v1','fa');localStorage.removeItem('elara_mission_haptics_v1');localStorage.removeItem('elara_mission_sound_v1');Object.defineProperty(navigator,'vibrate',{configurable:true,value:p=>{window.__vibes=(window.__vibes||0)+1;window.__vibePattern=p;return true}})}
async function open(width,height){const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));await page.addInitScript(seed);await page.goto(base+'/?mission='+Date.now()+'#home',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.ElaraMissionCelebration&&window.ElaraMissions&&window.ElaraNotify&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});await page.waitForTimeout(150);return{page,context}}
for(const [width,height] of [[390,844],[1440,1000]]){
 const {page,context}=await open(width,height);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1')),d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');s.taskCompletionHistory=[{key:'t1:'+day,taskId:'t1',date:day,title:'QA task',completedAt:Date.now()}];localStorage.setItem('elara_space_v1',JSON.stringify(s));ElaraMissions.render()});
 await page.waitForSelector('[data-mission-celebration]');
 const first=await page.locator('[data-mission-celebration]').innerText();assert.match(first,/ماموریت کامل شد/);assert.match(first,/اولین قدم امروز/);assert.match(first,/بعدی:/);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.ok(state.missionRewardClaims.some(x=>String(x).includes('first-task')),'mission claim missing');assert.equal(state.xp,20,'mission XP was not awarded exactly once');
 assert.ok((await page.evaluate(()=>ElaraNotify.read())).some(x=>String(x.dedupeKey).includes('first-task')),'mission notification missing');
 assert.equal(await page.evaluate(()=>window.__vibes||0),0,'mission vibration must be opt-in');
 const box=await page.locator('[data-mission-celebration]').boundingBox();assert.ok(box&&box.width<=Math.min(width-18,430)+4,'celebration overflow');
 await page.locator('[data-mission-celebration-close]').click();await page.waitForFunction(()=>!document.querySelector('[data-mission-celebration]'));
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));ElaraMissions.render();window.__afterRepeat={xp:JSON.parse(localStorage.getItem('elara_space_v1')).xp,claims:JSON.parse(localStorage.getItem('elara_space_v1')).missionRewardClaims.length}});
 await page.waitForTimeout(180);assert.equal(await page.locator('[data-mission-celebration]').count(),0,'refresh/re-render duplicated celebration');const repeat=await page.evaluate(()=>window.__afterRepeat);assert.equal(repeat.xp,20,'re-render duplicated mission XP');
 await context.close();
}
await browser.close();console.log('MISSION_CELEBRATION_PASS real-claim next-mission dismiss dedupe opt-in-haptics 390/1440');
