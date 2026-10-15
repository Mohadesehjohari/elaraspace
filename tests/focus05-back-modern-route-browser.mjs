import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const live=base.startsWith('https:');
await mkdir('browser-artifacts/focus05',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'focus05-qa',emailVerified:true},profile:{uid:'focus05-qa',name:'Focus QA',username:'focus05'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'focus05-qa',name:'Focus QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
try {
 for(const width of [320,390,430,768,1024,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<500?860:960}});
  const page=await context.newPage();
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(()=>localStorage.setItem('elara_space_v1',JSON.stringify({version:1,theme:'dark',xp:0,books:[],tasks:[],focusSessions:[],activeFocus:null})));
  await page.goto(base+'/?focus05='+width+'#focus',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.ElaraFocusBack&&!!window.ElaraFeatureHubs?.refresh&&
    !!document.querySelector('#panel-focus-pomodoro:not(.hidden) .feature-back') &&
    !document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:40000});
  const state=await page.evaluate(()=>{
   const p=document.querySelector('#panel-focus-pomodoro'),ret=p.querySelector('.feature-back');
   return {hash:location.hash,
    oldVisible:!document.querySelector('#panel-focus').classList.contains('hidden'),
    legacyNodes:document.querySelector('#panel-focus').children.length,
    legacyCards:document.querySelectorAll('#panel-focus .feature-launcher-card').length,
    back:ret?.dataset.featureRoute,
    timer:!!p.querySelector('#timer-display'),side:!!p.querySelector('.focus-ref-side'),
    viewport:innerWidth,scroll:document.documentElement.scrollWidth};
  });
  assert.equal(state.hash,'#focus-pomodoro','legacy #focus must go directly to new Pomodoro '+width);
  assert.equal(state.oldVisible,false,'obsolete hub must never become visible '+width);
  assert.equal(state.legacyCards,0,'obsolete hub launcher cards must be deleted '+width);
  assert.equal(state.legacyNodes,0,'old focus hero/empty task structure must be removed '+width);
  assert.equal(state.back,'home','default Pomodoro return target must be home');
  assert.ok(state.timer&&state.side,'modern reference Pomodoro must stay intact '+width);
  assert.ok(state.scroll<=state.viewport+2,'horizontal overflow '+JSON.stringify(state));
  if(width===390||width===1440)await page.screenshot({path:'browser-artifacts/focus05/'+(live?'live':'candidate')+'-'+width+'.png',fullPage:true});
  await page.locator('#panel-focus-pomodoro .feature-back').click();
  await page.waitForFunction(()=>location.hash==='#home' && !!document.querySelector('#panel-home:not(.hidden)'),null,{timeout:15000});
  assert.equal(await page.locator('#panel-focus:not(.hidden)').count(),0);
  // Enter from the canonical library, return to the library instead of the former focus hub.
  await page.evaluate(()=>window.ElaraOpen('books',{history:'push'}));
  await page.waitForFunction(()=>location.hash==='#books');
  await page.evaluate(()=>window.ElaraOpen('focus',{history:'push'}));
  await page.waitForFunction(()=>location.hash==='#focus-pomodoro'&&!!document.querySelector('#panel-focus-pomodoro:not(.hidden)'));
  assert.equal(await page.evaluate(()=>window.ElaraFocusReturnRoute()),'books','previous library route not preserved');
  await page.locator('#panel-focus-pomodoro .feature-back').click();
  await page.waitForFunction(()=>location.hash==='#books'&&!!document.querySelector('#panel-books:not(.hidden)'));
  // Top global back control must also bypass the retired #focus page.
  await page.evaluate(()=>window.ElaraOpen('focus-pomodoro',{history:'push'}));
  await page.locator('#elara-back-button').click();
  await page.waitForFunction(()=>location.hash==='#books'&&!!document.querySelector('#panel-books:not(.hidden)'));
  // Native back from a valid canonical route should work normally.
  await page.evaluate(()=>window.ElaraOpen('home',{history:'replace'}));
  await page.evaluate(()=>window.ElaraOpen('focus',{history:'push'}));
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>location.hash==='#home'&&!!document.querySelector('#panel-home:not(.hidden)'));
  // Raw old bookmark via browser hashchange must never show previous focus landing.
  await page.evaluate(()=>{location.hash='#focus'});
  await page.waitForFunction(()=>location.hash==='#focus-pomodoro'&&!!document.querySelector('#panel-focus-pomodoro:not(.hidden)'));
  assert.equal(await page.locator('#panel-focus .feature-launcher-card').count(),0);
  console.log('FOCUS05_NO_OLD_RETURN_PASS',width);
  await context.close();
 }
}finally{await browser.close()}
console.log('FOCUS05_BACK_ROUTING_ALL_PASS');
