import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const live=base.startsWith('https:');
await mkdir('browser-artifacts/focus03',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'focus03-qa',emailVerified:true},profile:{uid:'focus03-qa',name:'Focus QA',username:'focus03'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'focus03-qa',name:'Focus QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
function seeded(){
 const now=Date.now();
 const session=(id,durationMin,endedAt)=>({id,startedAt:endedAt-durationMin*60000,endedAt,durationMin,completed:true});
 return {version:1,theme:'dark',xp:0,tasks:[{id:'task-real-01',text:'Read the real book',completed:false}],habits:[],goals:[],books:[],words:[],taskLists:[],folders:[],tags:[],
 focusSessions:[session('f1',25,now-3600000),session('f2',45,now-10000),session('yesterday',20,now-86400000)],
 activeFocus:null,focusPlanProgress:null};
}
try{
 for(const width of [320,390,430,768,1024,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<=430?860:950}});
  const page=await context.newPage();
  await page.route('**/cloud.js*',req=>req.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',req=>req.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(fixture=>{localStorage.setItem('elara_space_v1',JSON.stringify(fixture))},seeded());
  await page.goto(base+'/?focus03='+width+'#focus-pomodoro',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!document.querySelector('#panel-focus-pomodoro:not(.hidden) .focus-ref-side') &&
    !!document.querySelector('#panel-focus-pomodoro .focus-card > .elara-focus-mode-options') &&
    !document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
  await page.evaluate(()=>window.ElaraOpen('focus-pomodoro',{history:'replace'}));
  const details=await page.evaluate(()=>{
    const panel=document.querySelector('#panel-focus-pomodoro'),timer=panel.querySelector('#timer-display'),
     play=panel.querySelector('#timer-start'),card=panel.querySelector('.focus-card'),
     x=timer.getBoundingClientRect(),b=play.getBoundingClientRect();
    return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,
     image:getComputedStyle(panel).backgroundImage,ring:getComputedStyle(timer).backgroundImage,
     timerBox:{x:x.x,y:x.y,w:x.width,h:x.height,bottom:x.bottom},
     playBox:{x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom},
     modeCount:card.querySelectorAll('.elara-focus-mode-options button').length,
     stats:getComputedStyle(card.querySelector('.focus-ref-side')).display,
     fullscreen:document.body.classList.contains('elara-focus-fullscreen'),
     timerText:timer.textContent?.trim(),
     completed:panel.querySelector('[data-focus-completed]')?.textContent,
     total:panel.querySelector('[data-focus-minutes]')?.textContent,
     average:panel.querySelector('[data-focus-average]')?.textContent,
     control:play.id,columns:getComputedStyle(card).gridTemplateColumns,
     view:panel.dataset.focusView};
  });
  console.log('FOCUS03_GEOMETRY',width,JSON.stringify(details));
  assert.equal(details.fullscreen,false,'setup must not open immersive');
  assert.notEqual(details.view,'immersive','must remain setup/non-fullscreen');
  assert.match(details.image,/bg_focus_room\.webp/,'approved scene');
  assert.match(details.ring,/conic-gradient/,'full spectrum ring');
  assert.match(details.ring,/rgb\(255, 222, 141\)|#ffde8d|rgb\(81, 217, 253\)|#51d9fd/i,'ring palette');
  assert.equal(details.control,'timer-start','play is canonical timer control');
  assert.equal(details.modeCount,4,'four study modes');
  assert.ok(details.timerBox.w>=250 && details.timerBox.w<=420,'ring size '+JSON.stringify(details));
  assert.ok(Math.abs(details.timerBox.x+details.timerBox.w/2-details.playBox.x-details.playBox.w/2)<18,'play must be centered on ring '+JSON.stringify(details));
  assert.ok(details.playBox.y>details.timerBox.bottom-110 && details.playBox.y<details.timerBox.bottom+35,'play must overlap ring lower edge '+JSON.stringify(details));
  assert.ok(details.scroll<=details.viewport+1,'horizontal overflow '+JSON.stringify(details));
  assert.match(details.completed,/۲|2/,'real session count');
  assert.match(details.total,/۷۰|70/,'real minutes');
  assert.match(details.average,/۳۵|35/,'real average');
  if(width===390||width===1440){
    await page.screenshot({path:'browser-artifacts/focus03/'+(live?'live':'candidate')+'-setup-'+width+'.png',fullPage:true});
    await page.locator('#focus-ref-task-select').selectOption('task-real-01');
    assert.match(await page.locator('[data-focus-task-name]').innerText(),/Read the real book/);
  }
  if(width===390 || width===1440){
   await page.locator('#timer-start').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').activeFocus?.status==='running');
   await page.waitForFunction(()=>document.body.classList.contains('elara-focus-fullscreen'));
   await page.locator('#elara-focus-exit').click();
   assert.equal(await page.evaluate(()=>document.body.classList.contains('elara-focus-fullscreen')),false);
   assert.equal(await page.locator('#panel-focus-pomodoro #timer-start').getAttribute('data-focus-running'),'true');
   await page.locator('#timer-start').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').activeFocus?.status==='paused');
   assert.equal(await page.evaluate(()=>document.body.classList.contains('elara-focus-fullscreen')),false,'pause should not reopen immersive');
   console.log('FOCUS03_CANONICAL_PLAY_PAUSE_PASS',width);
  }
  console.log('FOCUS03_LAYOUT_PASS',width,JSON.stringify({dial:details.timerBox.w,play:details.playBox.w,scroll:details.scroll}));
  await context.close();
 }
}finally{await browser.close()}
console.log('FOCUS03_REFERENCE_PASS responsive vivid ring + canonical actions + real metrics');
