import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:{uid:'me'},profile:{uid:'me',name:'آرین',username:'me',xp:1420,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub=`
const me={uid:'me',name:'آرین',username:'me',xp:1420,streak:12};
const friends=[{uid:'f1',name:'کیان',username:'kian',xp:1280,streak:9,avatarGroup:'male',avatarLevel:1,frame:'bronze',profileShape:'square'},{uid:'f2',name:'مهسا',username:'mahsa',xp:946,streak:7,avatarGroup:'female',avatarLevel:1,frame:'bronze',profileShape:'circle'},{uid:'f3',name:'سینا',username:'sina',xp:892,streak:5}];
const activityTypes=['reading','habit','task','goal','mission','exercise','streak','ranking','focus','book'];
const activities=Array.from({length:20},(_,i)=>({id:'a'+i,uid:friends[i%friends.length].uid,person:friends[i%friends.length],type:activityTypes[i%activityTypes.length],pagesRead:12+i,durationMin:25,tag:'study',visibility:'friends',ms:Date.now()-i*60000}));
window.ElaraSocial={me,friends,activities,error:'',requests:[{id:'r1',from:'f2',to:'me',status:'pending',person:friends[1]}],refresh:async()=>{},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},openProfile(){},openSelfProfile(){},dm:{list:async()=>[],messages:async()=>[],listen:()=>()=>{},send:async()=>{}},groups:{list:async()=>[]}};
window.dispatchEvent(new Event('elara:social-updated'));`;
async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.goto(base+'/?social-layout='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraSocialView&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 await page.locator('#elara-social-page [data-social-view="activity"]').click();
 await page.waitForSelector('#elara-social-page .social-friend-activity .social-scroll');
 const activity=page.locator('#elara-social-page .social-friend-activity .social-scroll');
 const metrics=await activity.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight,overflow:getComputedStyle(el).overflowY,touch:getComputedStyle(el).touchAction}));
 assert.ok(metrics.client<=312,width+': friend activity box grew too tall '+JSON.stringify(metrics));
 assert.ok(metrics.scroll>metrics.client,width+': friend activity does not internally scroll '+JSON.stringify(metrics));
 assert.ok(['auto','scroll'].includes(metrics.overflow),width+': friend activity overflowY '+metrics.overflow);
 await activity.evaluate(el=>{el.scrollTop=el.scrollHeight});assert.ok(await activity.evaluate(el=>el.scrollTop>0),width+': wheel/touch scroll target did not move');
 const faTone=await activity.innerText();for(const token of ['مأموریت','تمرین','استریک','رنکینگ','Deep Work'])assert.match(faTone,new RegExp(token),width+': missing friendly activity tone '+token);
 await page.evaluate(()=>window.ElaraI18n.set('en'));await page.waitForTimeout(100);const enTone=await activity.innerText();assert.match(enTone,/crushed a mission/i,width+': mission tone did not localize');assert.match(enTone,/wrapped a workout/i,width+': exercise tone did not localize');assert.match(enTone,/kept the streak alive/i,width+': streak tone did not localize');assert.equal(/مأموریت|تمرین|استریک|رنکینگ|دقیقه|صفحه|کتاب|عادت|هدف|کار/.test(enTone),false,width+': English activity UI kept Persian system copy');await page.evaluate(()=>window.ElaraI18n.set('fa'));await page.waitForTimeout(80);
 await page.waitForSelector('#elara-social-page .social-requests-standalone [data-friend-action="decline"]');
 const decline=page.locator('#elara-social-page .social-requests-standalone [data-friend-action="decline"]').first();assert.equal(await decline.isVisible(),true,width+': standalone decline missing');
 const dstyle=await decline.evaluate(el=>{const s=getComputedStyle(el);return{bg:s.backgroundColor,bgi:s.backgroundImage,border:s.borderColor}});assert.ok(dstyle.bgi!=='none'||/rgb\((?:1[0-9]{2}|[7-9][0-9])/.test(dstyle.bg),width+': decline is not visibly red '+JSON.stringify(dstyle));
 await page.locator('#elara-social-page [data-social-view="friends"]').click();await page.waitForSelector('#elara-social-page #elara-add-friend');
 const input=page.locator('#elara-social-page .social-invite input'),invite=page.locator('#elara-social-page .social-art-button.invite'),search=page.locator('#elara-social-page [data-profile-lookup]');
 const boxes=await Promise.all([input.boundingBox(),invite.boundingBox(),search.boundingBox()]);
 assert.ok(boxes.every(Boolean),width+': invite/search geometry missing');
 if(width<=700){assert.ok(boxes[0].width>width*.48,width+': mobile search field too narrow');assert.ok(boxes[1].width>=42&&boxes[2].width>=42&&boxes[1].height>=40&&boxes[2].height>=40,width+': mobile invite/search icon controls lost usable hit targets '+JSON.stringify(boxes))}
 else{assert.ok(boxes[0].height>=48&&boxes[1].width>=52&&boxes[2].width>=52,width+': desktop invite/search controls too small '+JSON.stringify(boxes))}
 const friendTabRects=await page.locator('#elara-social-page .social-tabs [role="tab"]').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));
 assert.ok(friendTabRects.every(r=>r.w>0&&r.h>0),'Friends controls must be measured while visible');
 const friendTabsStyle=await page.locator('#elara-social-page .social-tabs').evaluate(el=>{const s=getComputedStyle(el);return{display:s.display,direction:s.flexDirection,wrap:s.flexWrap,overflow:s.overflowX,client:el.clientWidth,scroll:el.scrollWidth}});
 assert.equal(friendTabsStyle.display,'flex',width+': Friends destinations must use horizontal flex strip');
 assert.equal(friendTabsStyle.direction,'row',width+': Friends destinations must use one row direction');
 assert.equal(friendTabsStyle.wrap,'nowrap',width+': Friends destinations must not wrap');
 assert.equal(friendTabsStyle.overflow,'auto',width+': Friends destinations must scroll horizontally when needed');
 assert.ok(friendTabsStyle.scroll>=friendTabsStyle.client,width+': Friends strip geometry missing horizontal scroll surface');
 await page.screenshot({path:'browser-artifacts/friends-layout-'+width+'.png',fullPage:true});
 await page.evaluate(()=>window.ElaraOpen('ranking',{history:'replace'}));await page.waitForFunction(()=>document.querySelector('#elara-ranking-page:not(.hidden) .social-tabs'));
 assert.equal(await page.locator('#elara-ranking-page .social-tabs [role="tab"]').count(),4,width+': ranking must keep four tabs');
 assert.equal(await page.locator('#elara-social-page .social-tabs [role="tab"]').count(),5,width+': Friends Hub must expose five navigation tabs; requests stay standalone');

 const tabs=await page.locator('#elara-ranking-page .social-tabs [role="tab"]').all();for(const tab of tabs){const b=await tab.boundingBox(),img=await tab.locator('img').boundingBox(),label=await tab.locator('.social-tab-label').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})),style=await tab.evaluate(el=>{const s=getComputedStyle(el);return{border:parseFloat(s.borderTopWidth),bg:s.backgroundColor,bgi:s.backgroundImage}}),minHeight=width<=700?52:60,minArt=width<=700?42:50;assert.ok(b&&b.height>=minHeight&&b.height<80,width+': ranking artwork button geometry drifted '+JSON.stringify(b));assert.ok(img&&img.height>=minArt,width+': ranking artwork too small');assert.ok(label.w<=2&&label.h<=2,width+': duplicated ranking label must stay visually hidden');assert.equal(style.border,0,width+': ranking tab rectangular border returned');assert.ok(style.bg==='rgba(0, 0, 0, 0)'||style.bg==='transparent',width+': ranking tab background returned '+style.bg);assert.equal(style.bgi,'none',width+': ranking tab background image returned')}
 const first=await page.locator('#elara-ranking-page .social-podium-place.place-1 .social-podium-avatar').boundingBox(),other=await page.locator('#elara-ranking-page .social-podium-place.place-2 .social-podium-avatar').boundingBox();assert.ok(first&&other&&first.width>other.width,width+': first-place frame must be larger');
 const stacks=await page.locator('#elara-ranking-page [data-avatar-shell]').evaluateAll(xs=>xs.map(x=>{const a=x.getBoundingClientRect(),p=x.querySelector('[data-avatar-image]')?.getBoundingClientRect(),f=x.querySelector('[data-avatar-frame]')?.getBoundingClientRect(),s=getComputedStyle(x);return{a:{x:a.x,y:a.y,w:a.width,h:a.height},p:p?{x:p.x,y:p.y,w:p.width,h:p.height}:null,f:f?{x:f.x,y:f.y,w:f.width,h:f.height}:null,shape:x.dataset.profileShape,src:x.querySelector('[data-avatar-frame]')?.getAttribute('src'),className:x.className,style:x.getAttribute('style'),computed:{width:s.width,height:s.height,minWidth:s.minWidth,minHeight:s.minHeight}}}));
 assert.ok(stacks.some(s=>s.shape==='square'&&s.src.endsWith('-square.png')),'equipped square frame must reach podium and ranking');
 for(const s of stacks){assert.ok(Math.abs(s.a.w-s.a.h)<=1,'avatar shell must be square '+JSON.stringify(s));if(s.f){assert.ok(Math.abs(s.a.x-s.f.x)<=1&&Math.abs(s.a.y-s.f.y)<=1&&Math.abs(s.a.w-s.f.w)<=1&&Math.abs(s.a.h-s.f.h)<=1,'frame must stay inside its shell '+JSON.stringify(s));assert.ok(Math.abs((s.p.x+s.p.w/2)-(s.f.x+s.f.w/2))<=1&&Math.abs((s.p.y+s.p.h/2)-(s.f.y+s.f.h/2))<=1,'avatar/frame must be concentric '+JSON.stringify(s))}}
 const grid=await page.locator('#elara-ranking-page .social-reference-grid').boundingBox(),podium=await page.locator('#elara-ranking-page .social-top-three').boundingBox(),mine=await page.locator('#elara-ranking-page .social-my-rank-card').boundingBox();
 if(width<=700){assert.ok(Math.abs(podium.width-grid.width)<=2&&Math.abs(mine.width-grid.width)<=2,'mobile podium and my rank must be full width')}else{assert.ok(Math.abs(podium.y-mine.y)<=2,'desktop podium and my rank must share first row')}
 assert.equal(await page.locator('.social-weekly .social-row').count(),0,'weekly ranking must not reuse lifetime XP');
 const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(overflow.sw<=overflow.w+1,width+': social/ranking horizontal overflow '+JSON.stringify(overflow));
 await page.screenshot({path:'browser-artifacts/social-layout-'+width+'.png',fullPage:true});
 await page.close();
}
await run(390,844);await run(430,932);await run(1440,1000);await run(1648,1000);await run(1920,1080);await browser.close();
console.log('SOCIAL_LAYOUT_PASS activity-scroll decline-red invite-search ranking-tabs-podium 390/1440');
