import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:{uid:'me'},profile:{uid:'me',name:'آرین',username:'me',xp:1420,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub=`
const me={uid:'me',name:'آرین',username:'me',xp:1420,streak:12};
const friends=[{uid:'f1',name:'کیان',username:'kian',xp:1280,streak:9},{uid:'f2',name:'مهسا',username:'mahsa',xp:946,streak:7},{uid:'f3',name:'سینا',username:'sina',xp:892,streak:5}];
const activityTypes=['reading','habit','task','goal','mission','exercise','streak','ranking','focus','book'];
const activities=Array.from({length:20},(_,i)=>({id:'a'+i,uid:friends[i%friends.length].uid,person:friends[i%friends.length],type:activityTypes[i%activityTypes.length],pagesRead:12+i,durationMin:25,tag:'study',visibility:'friends',ms:Date.now()-i*60000}));
window.ElaraSocial={me,friends,activities,error:'',requests:[{id:'r1',from:'f2',to:'me',status:'pending',person:friends[1]}],refresh:async()=>{},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},openProfile(){},openSelfProfile(){},dm:{list:async()=>[],messages:async()=>[],listen:()=>()=>{},send:async()=>{}},groups:{list:async()=>[]}};
window.dispatchEvent(new Event('elara:social-updated'));`;
async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.goto(base+'/?social-layout='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraSocialView&&document.querySelector('#elara-social-page .social-friend-activity .social-scroll')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 const activity=page.locator('#elara-social-page .social-friend-activity .social-scroll');
 const metrics=await activity.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight,overflow:getComputedStyle(el).overflowY,touch:getComputedStyle(el).touchAction}));
 assert.ok(metrics.client<=312,width+': friend activity box grew too tall '+JSON.stringify(metrics));
 assert.ok(metrics.scroll>metrics.client,width+': friend activity does not internally scroll '+JSON.stringify(metrics));
 assert.ok(['auto','scroll'].includes(metrics.overflow),width+': friend activity overflowY '+metrics.overflow);
 await activity.evaluate(el=>{el.scrollTop=el.scrollHeight});assert.ok(await activity.evaluate(el=>el.scrollTop>0),width+': wheel/touch scroll target did not move');
 const faTone=await activity.innerText();for(const token of ['مأموریت','تمرین','استریک','رنکینگ','Deep Work'])assert.match(faTone,new RegExp(token),width+': missing friendly activity tone '+token);
 await page.evaluate(()=>window.ElaraI18n.set('en'));await page.waitForTimeout(100);const enTone=await activity.innerText();assert.match(enTone,/crushed a mission/i,width+': mission tone did not localize');assert.match(enTone,/wrapped a workout/i,width+': exercise tone did not localize');assert.match(enTone,/kept the streak alive/i,width+': streak tone did not localize');assert.equal(/[\u0600-\u06ff]/.test(enTone.replace(/آرین|کیان|مهسا|سینا/g,'')),false,width+': English activity UI kept Persian system copy');await page.evaluate(()=>window.ElaraI18n.set('fa'));await page.waitForTimeout(80);
 const decline=page.locator('#elara-social-page [data-friend-action="decline"]').first();assert.equal(await decline.isVisible(),true,width+': decline missing');
 const dstyle=await decline.evaluate(el=>{const s=getComputedStyle(el);return{bg:s.backgroundColor,bgi:s.backgroundImage,border:s.borderColor}});assert.ok(dstyle.bgi!=='none'||/rgb\((?:1[0-9]{2}|[7-9][0-9])/.test(dstyle.bg),width+': decline is not visibly red '+JSON.stringify(dstyle));
 const input=page.locator('#elara-social-page .social-invite input'),invite=page.locator('#elara-social-page .social-art-button.invite'),search=page.locator('#elara-social-page [data-profile-lookup]');
 const boxes=await Promise.all([input.boundingBox(),invite.boundingBox(),search.boundingBox()]);
 assert.ok(boxes.every(Boolean),width+': invite/search geometry missing');
 if(width<=700){assert.ok(boxes[0].width>width*.72,width+': mobile search field too narrow');assert.ok(boxes[1].width>width*.34&&boxes[2].width>width*.34,width+': mobile invite/search actions too small')}
 else{assert.ok(boxes[0].height>=54&&boxes[1].width>=165&&boxes[2].width>=62,width+': desktop invite/search controls too small '+JSON.stringify(boxes))}
 await page.evaluate(()=>window.ElaraOpen('ranking',{history:'replace'}));await page.waitForFunction(()=>document.querySelector('#elara-ranking-page:not(.hidden) .social-tabs'));
 assert.equal(await page.locator('#elara-ranking-page .social-tabs [role="tab"]').count(),4,width+': ranking must keep four tabs');
 assert.equal(await page.locator('#elara-social-page .social-tabs [role="tab"]').count(),3,width+': friends must remain distinct from ranking tabs');
 const tabs=await page.locator('#elara-ranking-page .social-tabs [role="tab"]').all();for(const tab of tabs){const b=await tab.boundingBox();assert.ok(b&&b.height>=width<=700?48:56,width+': ranking tab too small')}
 const first=await page.locator('#elara-ranking-page .social-podium-place.place-1 .social-podium-avatar').boundingBox(),other=await page.locator('#elara-ranking-page .social-podium-place.place-2 .social-podium-avatar').boundingBox();assert.ok(first&&other&&first.width>other.width,width+': first-place frame must be larger');
 const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(overflow.sw<=overflow.w+1,width+': social/ranking horizontal overflow '+JSON.stringify(overflow));
 await page.screenshot({path:'browser-artifacts/social-layout-'+width+'.png',fullPage:true});
 await page.close();
}
await run(390,844);await run(1440,1000);await browser.close();
console.log('SOCIAL_LAYOUT_PASS activity-scroll decline-red invite-search ranking-tabs-podium 390/1440');
