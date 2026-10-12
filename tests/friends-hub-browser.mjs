import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:{uid:'me',emailVerified:true},profile:{uid:'me',name:'من',username:'me_user',xp:820,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub=`
const me={uid:'me',name:'من',username:'me_user',xp:820,streak:12};
const friend={uid:'f1',name:'سینا',username:'sina',xp:600,streak:8};
const req={id:'r1',from:'f1',to:'me',status:'pending',person:friend};
window.ElaraSocial={me,friends:[friend],requests:[req],activities:[{id:'a1',uid:'f1',person:friend,type:'focus',durationMin:25,tag:'study',visibility:'friends',ms:Date.now()}],error:'',refresh:async()=>{},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},openProfile(){},openSelfProfile(){}};
window.ElaraSocial.dm={list:async()=>[{id:'f1__me',other:'f1',person:friend,lastText:'سلام 👊',updatedAt:Date.now()}],messages:async()=>[],listen:()=>()=>{},send:async()=>true};
window.ElaraSocial.groups={list:async()=>[{id:'g1',title:'گروه تست',role:'owner',lastText:'بزن بریم',updatedAt:Date.now()}],members:async()=>[],messages:async()=>[],listen:()=>()=>{},create:async()=>'',send:async()=>true,leave:async()=>true};
window.ElaraSocial.clubs={list:async()=>[{id:'c1',title:'کلاب تست',kind:'focus',visibility:'private',membershipMode:'invite',role:'member',restDay:5,status:'active'}],invites:async()=>[],discover:async()=>[],members:async()=>[],posts:async()=>[],contribution:async()=>({}),dailyReport:async()=>({}),joinRequests:async()=>[]};
window.dispatchEvent(new Event('elara:social-updated'));
`;
async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.goto(base+'/?friends-hub='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraSocialView&&window.ElaraSocialMessagingUI&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 const tabs=page.locator('#elara-social-page .social-tabs [role="tab"]');
 assert.equal(await tabs.count(),8,width+': F2 must expose eight Friends routes');
 const geometry=await page.evaluate(()=>{
  const nav=document.querySelector('#elara-social-page .social-tabs');
  const item=nav?.querySelector('[role="tab"]'),image=item?.querySelector('svg.social-tab-svg');
  const selected=nav?.querySelector('[aria-selected="true"]');
  if(!nav||!item||!image||!selected)return null;
  return {height:item.getBoundingClientRect().height,art:image.getBoundingClientRect().height,
   width:item.getBoundingClientRect().width,selectedBorder:getComputedStyle(selected).borderTopColor,
   navScrolls:nav.scrollWidth>nav.clientWidth};
 });
 assert.ok(geometry,width+': Friends nav geometry unavailable');
 assert.ok(geometry.height>=(width<=700?60:45)&&geometry.height<=(width<=700?74:56),width+': F2 tab height mismatch '+JSON.stringify(geometry));
 assert.ok(geometry.art<=30,width+': icons must be compact '+JSON.stringify(geometry));
 assert.ok(geometry.width>=(width<=700?54:100),width+': tab width must match compact reference '+JSON.stringify(geometry));

 assert.deepEqual(await tabs.evaluateAll(xs=>xs.map(x=>x.dataset.socialView)),['friends','chats','groups','clubs','activity','requests','ranking','challenges']);
 assert.equal(await page.locator('.friends-f2-kpis .friends-f2-kpi').count(),6,width+': six F2 KPIs required');
 const fidelity=await page.evaluate(()=>{
  const rect=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
  const tabs=[...document.querySelectorAll('#elara-social-page .social-tabs [role="tab"]')].filter(e=>getComputedStyle(e).display!=='none').length;
  return {tabs,kpis:getComputedStyle(document.querySelector('.friends-f2-kpis')).gridTemplateColumns.split(' ').length,
   friends:rect('.friends-f2-friends'),suggest:rect('.friends-f2-invite-card'),requests:rect('.friends-fidelity-requests'),
   ranking:rect('.friends-f2-ranking'),memberships:rect('.friends-fidelity-memberships'),activity:rect('.friends-f2-activities'),hero:rect('#panel-social > .elara-global-hero')};
 });
 assert.equal(fidelity.tabs,7,width+': Owner reference calls for seven visible destinations; Challenges remain available via Activities');
 if(width>=1440){
   assert.ok(fidelity.friends.left<fidelity.suggest.left&&fidelity.suggest.left<fidelity.requests.left,width+': physical columns must be Friends/Suggestions/Requests left-to-right '+JSON.stringify(fidelity));
   assert.ok(Math.abs(fidelity.friends.top-fidelity.requests.top)<4,width+': three primary cards must share a row');
   assert.ok(fidelity.activity.left<fidelity.memberships.left&&fidelity.memberships.left<fidelity.ranking.left,width+': lower desktop row must flow Activity → Memberships → Ranking left-to-right '+JSON.stringify(fidelity));
   assert.ok(Math.abs(fidelity.activity.top-fidelity.ranking.top)<4,width+': lower preview cards and podium must share one row');
 }
 if(width<=700){
   assert.equal(fidelity.kpis,3,width+': mobile six KPIs must form a 3x2 grid');
   assert.ok(fidelity.friends.top<fidelity.suggest.top,width+': Friends list must precede companion cards');
   assert.ok(fidelity.ranking.top>fidelity.activity.top,width+': mobile ranking must be last');
 }
 assert.ok(fidelity.ranking.height>=150,width+': scenic leaderboard must retain podium space');

 await page.waitForSelector('.friends-f2-friend',{timeout:10000});
 assert.equal(await page.locator('.friends-f2-friend').count(),1,width+': authenticated friend missing');
 await page.waitForFunction(()=>document.querySelector('[data-f2-club-count]')?.textContent.trim()!=='—',null,{timeout:8000});
 assert.equal(await page.locator('[data-f2-club-count]').innerText(),'۱',width+': membership count incorrect');
 const heroes=await page.evaluate(()=>{
  const p=document.querySelector('#panel-social');if(!p)return -1;
  return [...p.querySelectorAll('.elara-global-hero,.social-page-head')].filter(el=>{const style=getComputedStyle(el),r=el.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&r.height>40}).length
 });
 assert.equal(heroes,1,width+': F2 must show one visible hero');
 assert.equal(await page.locator('#panel-social > h1:visible').count(),0,width+': legacy Friends and Community header must not remain');
 const pageWidth=await page.evaluate(()=>({screen:innerWidth,content:document.documentElement.scrollWidth}));
 assert.ok(pageWidth.content<=pageWidth.screen+2,width+': F2 horizontal overflow '+JSON.stringify(pageWidth));
 if(width>=1440){
  const geometry=await page.evaluate(()=>{
   const root=document.querySelector('#elara-social-page .social-reference-grid');
   const kpi=document.querySelector('.friends-f2-kpis'),friend=document.querySelector('.friends-f2-friends');
   const grid=root.getBoundingClientRect(),metrics=kpi.getBoundingClientRect(),friends=friend.getBoundingClientRect();
   return {gridWidth:grid.width,kpiWidth:metrics.width,friendWidth:friends.width,columns:getComputedStyle(root).gridTemplateColumns.split(' ').length}
  });
  assert.equal(geometry.columns,12,width+': desktop F2 must use 12 explicit columns '+JSON.stringify(geometry));
  assert.ok(geometry.kpiWidth>=geometry.gridWidth*.92,width+': six KPIs must span desktop grid '+JSON.stringify(geometry));
  assert.ok(geometry.friendWidth<=geometry.gridWidth*.72,width+': Friends card should share first dashboard row '+JSON.stringify(geometry));
 }
 assert.equal(await page.locator('#elara-social-page .social-requests-standalone').isVisible(),true,width+': friend request preview missing');
 assert.equal(await page.locator('#elara-social-page .social-collab-requests').count(),0,width+': dashboard must not duplicate collaboration requests');
 assert.equal(await page.locator('[data-social-route="social"][data-social-view="friends"]').getAttribute('aria-selected'),'true');
 await page.waitForSelector('#elara-add-friend');
 assert.equal(await page.locator('.friends-f2-list').isVisible(),true,width+': Friends list missing on default tab');
 await page.locator('[data-social-route="social"][data-social-view="chats"]').click();
 await page.waitForSelector('.social-dm-section');
 assert.equal(await page.locator('.social-dm-section').isVisible(),true,width+': Chats tab did not mount DM');
 await page.locator('[data-social-route="social"][data-social-view="groups"]').click();
 await page.waitForSelector('.social-groups-section');
 assert.equal(await page.locator('.social-dm-section').count(),0,width+': DM section leaked into Groups tab');
 await page.locator('[data-social-route="social"][data-social-view="friends"]').click();
 await page.waitForSelector('#elara-add-friend');
 assert.equal(await page.locator('.friends-f2-list').isVisible(),true,width+': Friends list missing after tab switch');
 assert.equal(await page.locator('#elara-social-page .friends-fidelity-request-tabs button').count(),2,width+': incoming and outgoing request filters missing');
 assert.equal(await page.locator('#elara-social-page .social-requests-standalone [data-friend-action="decline"]').isVisible(),true,width+': incoming Request action missing');
 await page.locator('[data-f2-requests-mode="outgoing"]').click();
 assert.equal(await page.locator('[data-f2-requests-mode="outgoing"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-f2-requests-mode="incoming"]').click();
 await page.locator('[data-social-route="social"][data-social-view="activity"]').click();
 await page.waitForSelector('.social-friend-activity');
 assert.match(await page.locator('.social-friend-activity').innerText(),/Deep Work/,width+': Activity tab missing real activity copy');
 await page.locator('[data-social-route="social"][data-social-view="clubs"]').click();
 await page.waitForSelector('.social-clubs-section');
 assert.match(await page.locator('.social-clubs-section').innerText(),/کلاب تست/,width+': Clubs tab did not mount club service data');
 assert.equal(await page.locator('.social-clubs-section.club-f3').count(),1,width+': bespoke Clubs F3 dashboard is missing');
 assert.equal(await page.locator('.club-f3-podium .club-f3-rank').count(),1,width+': real accessible club must render in podium; do not add fake placeholders');
 assert.equal(await page.locator('.club-f3-podium').isVisible(),true,width+': club podium must be visible');
 assert.ok(await page.locator('.club-f3-tasks').isVisible(),width+': real club missions panel must render even when empty');
 await page.locator('[data-club-f3-search]').fill('not-an-existing-club');
 assert.equal(await page.locator('[data-club-f3-results] [data-club-tile]:visible').count(),0,width+': real club filter must hide mismatched rows');
 await page.locator('[data-club-f3-search]').fill('');
 assert.equal(await page.locator('[data-club-f3-results] [data-club-tile]:visible').count(),1,width+': club search should restore actual records');

 await page.locator('[data-social-route="social"][data-social-view="chats"]').click();
 await page.waitForSelector('.social-dm-section');
 assert.equal(await page.locator('.social-dm-section').isVisible(),true,width+': Chats did not remount after switching tabs');
 await page.evaluate(()=>window.ElaraI18n.set('en'));await page.waitForTimeout(120);
 const enLabels=await page.locator('#elara-social-page .social-tabs [role="tab"]').allTextContents();
 for(const label of ['Chats','Groups','My friends','Activity','Clubs','Requests','Ranking','Challenges'])assert.ok(enLabels.some(x=>x.includes(label)),width+': missing English tab '+label);
 await page.locator('[data-social-route="social"][data-social-view="requests"]').click();
 assert.match(await page.locator('#elara-social-page .social-requests-standalone').innerText(),/Friend requests/,width+': Requests tab not localized');
 assert.equal(new URL(page.url()).searchParams.get('friendsTab'),'requests',width+': missing URL tab');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ElaraSocialView&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 assert.equal(await page.locator('[data-social-route="social"][data-social-view="requests"]').getAttribute('aria-selected'),'true',width+': URL tab not restored');
 await page.locator('[data-social-route="social"][data-social-view="friends"]').click();
 await page.locator('[data-f2-search]').fill('not-a-real-name');
 assert.equal(await page.locator('.friends-f2-friend:visible').count(),0,width+': friend search failed');
 await page.locator('[data-f2-search]').fill('');
 assert.equal(await page.locator('.friends-f2-friend:visible').count(),1,width+': friend search reset failed');
 await page.locator('[data-f2-layout="list"]').click();
 assert.equal(await page.locator('.friends-f2-list').evaluate(el=>el.classList.contains('is-list')),true);

 await page.locator('[data-social-route="social"][data-social-view="friends"]').click();
 assert.match(await page.locator('.friends-f2-list').innerText(),/سینا/,width+': UGC/person name must not be translated');
 await page.evaluate(()=>window.ElaraOpen('ranking',{history:'replace'}));await page.waitForSelector('#elara-ranking-page:not(.hidden) .social-tabs');
 assert.equal(await page.locator('#elara-ranking-page .social-tabs [role="tab"]').count(),4,width+': Ranking must remain a separate four-tab surface');
 const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));
 assert.ok(overflow.sw<=overflow.w+2,width+': Friends Hub horizontal overflow '+JSON.stringify(overflow));
 await page.evaluate(()=>window.ElaraOpen('social',{history:'replace'}));await page.waitForTimeout(80);
 await page.screenshot({path:'browser-artifacts/friends-hub-'+width+'.png',fullPage:true});
 if(width===390){
  await page.evaluate(()=>{window.ElaraSocial.friends=[];window.ElaraSocial.requests=[];window.ElaraSocial.activities=[];window.dispatchEvent(new Event('elara:social-updated'))});
  await page.waitForSelector('.friends-f2-friends .social-empty');
  assert.match(await page.locator('.friends-f2-friends').innerText(),/No friends yet|هنوز دوستی نداری/,width+': zero-friends empty state should be truthful');
  await page.screenshot({path:'browser-artifacts/friends-f2-empty-390.png',fullPage:true});
 }
 await page.close();
}
for(const width of [320,360,375,390,412,430,768,1024,1440,1648])await run(width,width<800?844:1000);
await browser.close();
console.log('FRIENDS_F2_PASS nine widths single hero, six KPIs, service previews, navigation, search, Ranking isolation');
