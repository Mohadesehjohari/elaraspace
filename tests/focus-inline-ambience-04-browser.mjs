import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
await mkdir('browser-artifacts/focus04',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'focus04-qa',emailVerified:true},profile:{uid:'focus04-qa',name:'QA'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'focus04-qa',name:'QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
try {
 for(const width of [320,390,430,768,1024,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<500?860:960}});
  const page=await context.newPage();
  await page.route('**/cloud.js*',req=>req.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',req=>req.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(()=>localStorage.setItem('elara_space_v1',JSON.stringify({version:1,theme:'dark',xp:0,tasks:[],books:[],focusSessions:[],activeFocus:null})));
  await page.goto(base+'/?focus04='+width+'#focus-pomodoro',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.ElaraFocusAmbience && !!document.querySelector('#panel-focus-pomodoro:not(.hidden) #focus-ambience .focus-ambience-modes') && !document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
  const d=await page.evaluate(()=>{
    const panel=document.querySelector('#panel-focus-pomodoro'),card=panel.querySelector('.focus-ref-ambience'),ambient=card.querySelector('#focus-ambience');
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,inside:!!ambient,modes:ambient.querySelectorAll('[data-ambience-mode]').length,
     legacyLinks:card.querySelectorAll('[data-feature-route="focus-ambience"]').length,
     garden:document.querySelectorAll('.focus-garden').length,
     colors:getComputedStyle(document.querySelector('#timer-display')).backgroundImage,
     play:getComputedStyle(document.querySelector('#timer-start')).backgroundImage,
     hiddenLegacy:getComputedStyle(document.querySelector('#panel-focus-ambience')).display,
     layout:getComputedStyle(ambient.querySelector('.focus-ambience-modes')).gridTemplateColumns,
     fullscreen:document.body.classList.contains('elara-focus-fullscreen')};
  });
  assert.equal(d.inside,true,'audio needs to live in Pomodoro card');
  assert.equal(d.modes,6,'six distinct sound choices should appear in Focus room');
  assert.equal(d.garden,0,'old garden UI must be removed');
  assert.equal(d.legacyLinks,0,'no obsolete view-all link');
  assert.equal(d.hiddenLegacy,'none','obsolete panel should not show');
  assert.equal(d.fullscreen,false,'setup remains nonfullscreen');
  assert.match(d.colors,/conic-gradient/);
  assert.doesNotMatch(d.colors,/rgb\(165, 72, 241\)|rgb\(103, 76, 255\)/,'violet ring color persists');
  assert.doesNotMatch(d.play,/rgb\(119, 99, 255\)|rgb\(78, 66, 239\)/,'violet play color persists');
  assert.ok(d.scroll<=d.width+2,'overflow '+JSON.stringify(d));
  if(width===390||width===1440){
    await page.screenshot({path:'browser-artifacts/focus04/'+width+'.png',fullPage:true});
    await page.locator('#focus-ambience [data-ambience-mode="rain"]').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_focus_ambience_v1')).mode==='rain');
    await page.locator('#focus-ambience [data-ambience-play]').click();
    await page.waitForFunction(()=>document.querySelector('#focus-ambience [data-ambience-play]')?.getAttribute('aria-pressed')==='true');
    await page.locator('#focus-ambience [data-ambience-volume]').fill('55');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_focus_ambience_v1')).volume),55,'volume persists');
    await page.locator('#focus-ambience [data-ambience-play]').click();
    await page.waitForFunction(()=>document.querySelector('#focus-ambience [data-ambience-play]')?.getAttribute('aria-pressed')==='false');
    await page.evaluate(()=>window.ElaraOpen('focus-ambience',{history:'push'}));
    await page.waitForFunction(()=>location.hash==='#focus-pomodoro',null,{timeout:15000});
    assert.ok(await page.locator('#focus-ambience').isVisible(),'legacy route must return to inline player');
  }
  console.log('FOCUS04_INLINE_AUDIO_AMBER_PASS',width);
  await context.close();
 }
} finally{await browser.close()}
console.log('FOCUS04_ALL_PASS');
