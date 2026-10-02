import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub=`window.ElaraAccount={user:null,profile:{name:'Challenge QA',username:'challenge_qa',bio:'',xp:820,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`
const now=Date.now();
window.__challengeState={rows:[
 {id:'incoming',from:'B',to:'A',status:'pending',targetKind:'reading',targetText:'۳۰ صفحه بخونیم',targetValue:30,expiresAtMs:now+30000,other:'B',person:{uid:'B',name:'کیان'},ms:now},
 {id:'accepted',from:'A',to:'C',status:'accepted',targetKind:'focus',targetText:'یک ساعت تمرکز',targetValue:60,expiresAtMs:now+30000,other:'C',person:{uid:'C',name:'مهسا'},ms:now-1000}
],quick:[],created:[]};
window.ElaraSocial={me:{uid:'A',name:'آرین',username:'aren',xp:820},friends:[{uid:'B',name:'کیان',username:'kian',xp:600},{uid:'C',name:'مهسا',username:'mahsa',xp:500}],requests:[],activities:[],refresh:async()=>{},saveProfileValues:async v=>({profile:v,warnings:[]}),openProfile(){},openSelfProfile(){}};
window.ElaraSocial.challenges={
 kinds:['task','habit','reading','exercise','focus','general'],
 quick:['بزن بریم 🔥','حواسم بهت هست 👀','ریز می‌بینمت 😎','کم نیار 👊','تا آخرش هستم 🤝','امروز مال ماست ⚡'],
 list:async()=>window.__challengeState.rows.map(x=>({...x,expiresAt:{toMillis:()=>x.expiresAtMs},expired:x.status==='pending'&&x.expiresAtMs<=Date.now()})),
 create:async(to,spec)=>{const row={id:'new-'+Date.now(),from:'A',to,status:'pending',...spec,expiresAtMs:Date.now()+30000,other:to,person:window.ElaraSocial.friends.find(x=>x.uid===to),ms:Date.now()};window.__challengeState.rows.unshift(row);window.__challengeState.created.push(row);return row.id},
 respond:async(c,status)=>{const row=window.__challengeState.rows.find(x=>x.id===c.id);row.status=status;return true},
 cancel:async c=>{window.__challengeState.rows=window.__challengeState.rows.filter(x=>x.id!==c.id);return true},
 sendQuick:async(id,text)=>{window.__challengeState.quick.push({id,text});return true}
};
window.dispatchEvent(new Event('elara:social-updated'));
`;
function seed(){localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:820,theme:'dark',tasks:[],habits:[],goals:[],books:[],words:[],folders:[],tags:[],taskLists:[],focusSessions:[],taskCompletionHistory:[],missionRewardClaims:[]}))}
async function wire(page){await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));await page.addInitScript(seed)}
async function open(width,height){const page=await browser.newPage({viewport:{width,height}});await wire(page);await page.goto(base+'/?challenge-stage12='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.ElaraSocialChallengesUI&&window.ElaraSocial?.challenges&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});const tab=page.locator('[data-social-route="social"][data-social-view="friends"]');if(await tab.count())await tab.click();await page.waitForSelector('.social-challenges-section');return page}

const page=await open(390,844);
assert.match(await page.locator('.social-challenges-section').innerText(),/چالش دوستانه/);
assert.equal(await page.locator('[data-challenge-expiry]').count(),1,'pending challenge countdown missing');
await page.locator('[data-challenge-action="accepted"]').click();
await page.waitForFunction(()=>window.__challengeState.rows.find(x=>x.id==='incoming').status==='accepted');
await page.waitForTimeout(80);
assert.equal(await page.locator('[data-challenge-quick]').count()>0,true,'accepted challenge quick chat missing');
await page.locator('[data-challenge-quick]').first().click();
await page.waitForFunction(()=>window.__challengeState.quick.length===1);

await page.locator('[data-challenge-create]').click();
await page.locator('.social-challenge-create select[name="friend"]').selectOption('B');
await page.locator('.social-challenge-create select[name="kind"]').selectOption('reading');
await page.locator('.social-challenge-create input[name="text"]').fill('امروز ۴۰ صفحه کتاب');
await page.locator('.social-challenge-create input[name="value"]').fill('40');
await page.getByRole('button',{name:'بفرست ⚡'}).click();
await page.waitForFunction(()=>window.__challengeState.created.some(x=>x.targetValue===40&&x.to==='B'));
await page.waitForTimeout(80);
const outgoing=page.locator('[data-challenge-cancel]').first();assert.equal(await outgoing.count(),1,'outgoing cancel action missing');
await outgoing.click();
await page.waitForTimeout(80);

const mobile=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(mobile.scroll<=mobile.w+2,'390 challenge horizontal overflow '+JSON.stringify(mobile));
await page.screenshot({path:'browser-artifacts/challenge-stage12-390.png',fullPage:true});await page.close();

const desktop=await open(1440,1000);const dm=await desktop.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dm.scroll<=dm.w+2,'1440 challenge horizontal overflow '+JSON.stringify(dm));await desktop.screenshot({path:'browser-artifacts/challenge-stage12-1440.png',fullPage:true});await desktop.close();
await browser.close();
console.log('CHALLENGE_STAGE12_PASS create accept cancel countdown quick-chat 390/1440');
