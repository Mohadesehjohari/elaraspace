import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub=`window.ElaraAccount={user:{uid:'me'},profile:{uid:'me',name:'من',username:'me_user',xp:200,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`
const friend={uid:'friend-1',name:'سینا',username:'sina',xp:120};
let messages=[{id:'m1',sender:'friend-1',text:'سلام! آماده‌ای؟ 👊',ms:Date.now()-1000}],listener=null;
window.__sentDm=[];
window.ElaraSocial={me:{uid:'me',name:'من',username:'me_user',xp:200},friends:[friend],requests:[],activities:[],error:'',refresh:async()=>{},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},openProfile(){},openSelfProfile(){},dm:{
 list:async()=>[{id:'friend-1__me',other:'friend-1',person:friend,lastText:'سلام! آماده‌ای؟ 👊',lastSender:'friend-1',updatedAt:Date.now()}],
 messages:async()=>messages.slice(),
 listen:(other,cb)=>{listener=cb;cb(messages.slice());return()=>{listener=null}},
 send:async(other,text)=>{window.__sentDm.push({other,text});messages=[...messages,{id:'m2',sender:'me',text,ms:Date.now()}];listener?.(messages.slice());return'friend-1__me'}
}};
window.dispatchEvent(new Event('elara:social-updated'));
`;
async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.goto(base+'/?dm-ui='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraSocialMessagingUI&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 await page.locator('[data-social-route="social"][data-social-view="chats"]').click();
 await page.waitForSelector('.social-dm-section');
 assert.equal(await page.locator('.social-dm-row').count(),1,width+': recent DM row missing');
 assert.equal(await page.locator('.social-dm-friend').count(),1,width+': friend start-chat card missing');
 await page.locator('.social-dm-row').click();
 await page.waitForSelector('.social-chat-dialog');
 assert.match(await page.locator('.social-chat-messages').innerText(),/آماده‌ای/);
 const compose=page.locator('.social-chat-compose');
 await compose.locator('textarea[name="text"]').fill('بزن بریم 🔥');
 await compose.getByRole('button',{name:'ارسال'}).click();
 await page.waitForFunction(()=>window.__sentDm?.length===1);
 assert.deepEqual(await page.evaluate(()=>window.__sentDm[0]),{other:'friend-1',text:'بزن بریم 🔥'});
 await page.waitForFunction(()=>document.querySelector('.social-chat-messages')?.textContent.includes('بزن بریم'));
 const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));
 assert.ok(overflow.sw<=overflow.w+1,width+': DM UI horizontal overflow '+JSON.stringify(overflow));
 await page.screenshot({path:'browser-artifacts/friends-dm-'+width+'.png',fullPage:true});
 await page.locator('.elara-dialog-close').click();
 await page.close();
}
await run(390,844);await run(1440,1000);
await browser.close();
console.log('FRIENDS_DM_UI_PASS 390/1440 recent-list live-thread send');
