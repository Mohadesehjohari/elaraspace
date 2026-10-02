import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:{uid:'me',emailVerified:true},profile:{uid:'me',name:'من',username:'me_user',xp:820,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub=[
"const a={uid:'me',name:'آرن',username:'aren',xp:820,streak:12};",
"const b={uid:'friend-1',name:'کیان',username:'kian',xp:1280,streak:7};",
"const c={uid:'friend-2',name:'مهسا',username:'mahsa',xp:946};",
"window.ElaraSocial={me:a,friends:[b,c],requests:[],activities:[],blocked:[],error:'',refresh:async()=>{},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},openProfile(){},openSelfProfile(){},dm:{list:async()=>[],messages:async()=>[],listen:()=>()=>{},send:async()=>{}}};",
"window.dispatchEvent(new Event('elara:social-updated'));"
].join('\n');
async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.goto(base+'/?social-streak='+Date.now()+'#ranking',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraSocialView&&document.querySelector('#elara-ranking-page .social-streak')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 const txt=await page.locator('#elara-ranking-page').innerText();
 assert.match(txt,/🔥\s*[۰-۹0-9]+/,width+': no streak rendered');
 assert.match(txt,/۱۲|12/,width+': own streak missing');
 assert.match(txt,/۷|7/,width+': friend streak missing');
 const mahsa=page.locator('#elara-ranking-page .social-row').filter({hasText:'مهسا'}).first();
 if(await mahsa.count())assert.equal(await mahsa.locator('.social-streak').count(),0,width+': missing/private streak must not be fabricated');
 const o=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(o.sw<=o.w+1,width+': social streak horizontal overflow '+JSON.stringify(o));
 await page.screenshot({path:'browser-artifacts/social-streak-'+width+'.png',fullPage:true});await page.close();
}
await run(390,844);await run(1440,1000);await browser.close();
console.log('SOCIAL_STREAK_UI_PASS real-only 390/1440');
