import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
await mkdir('browser-artifacts/focus02',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'focus02-qa',emailVerified:true},profile:{uid:'focus02-qa',name:'Focus 02',username:'focus_02',xp:0}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'focus02-qa',name:'Focus 02'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const fixture=()=>({version:1,theme:'dark',xp:0,habits:[],goals:[],tasks:[],taskLists:[],books:[],words:[],folders:[],tags:[],focusSessions:[],activeFocus:null,focusPlanProgress:null});
async function pageFor(width,hash){
 const ctx=await browser.newContext({viewport:{width,height:width<=700?844:960}});
 const p=await ctx.newPage();
 await p.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
 await p.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await p.addInitScript(x=>localStorage.setItem('elara_space_v1',JSON.stringify(x)),fixture());
 p.on('pageerror',error=>console.log('FOCUS02_PAGEERROR width='+width+' '+error.message));
 await p.goto(base+'/?focus02='+width+'#'+hash,{waitUntil:'domcontentloaded',timeout:40000});
 try{
  await p.waitForFunction(()=>!!window.ElaraFocusJourney&&!!window.ElaraFeatureHubs&&!!document.querySelector('#panel-focus-pomodoro .focus-v2-enter')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:12000});
 }catch(err){
  console.log('FOCUS02_BOOT_DIAGNOSTIC '+JSON.stringify(await p.evaluate(()=>({
   url:location.href,ready:document.readyState,booting:document.documentElement.hasAttribute('data-elara-booting'),
   journey:!!window.ElaraFocusJourney,hubs:!!window.ElaraFeatureHubs,open:!!window.ElaraOpen,
   card:!!document.querySelector('#panel-focus-pomodoro .focus-card'),
   enters:document.querySelectorAll('.focus-v2-enter').length,
   statuses:document.querySelector('#focus-status')?.textContent,
   modal:!!document.querySelector('#elara-focus-immersive'),
   cloud:document.body.className,
   scripts:[...document.scripts].filter(x=>/focus-two-stage/.test(x.src)).map(x=>x.src)
  }))));
  throw err;
 }
 await p.evaluate(route=>window.ElaraOpen(route,{history:'replace'}),hash);
 return [ctx,p];
}
try{
 for(const width of [320,360,390,430,768,1024,1440,1648]){
  const [ctx,page]=await pageFor(width,'focus-pomodoro');
  const preview=page.locator('#panel-focus-pomodoro:not(.hidden) .focus-v2-enter');
  await preview.waitFor({state:'visible'});
  assert.equal(await page.locator('#elara-focus-immersive').isHidden(),true,'pre-start view must be ordinary, not immersive');
  assert.match(await page.locator('#panel-focus-pomodoro').evaluate(e=>getComputedStyle(e).backgroundImage),/bg_focus_room\.webp/);
  assert.ok(await page.locator('#focus-duration').count(),'canonical duration must exist');
  const pre=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(pre.scroll<=pre.width+1,'preview overflow '+JSON.stringify(pre));
  await preview.click();
  await page.waitForFunction(()=>!!JSON.parse(localStorage.getItem('elara_space_v1')||'{}').activeFocus,null,{timeout:5000});
  assert.equal(await page.locator('#elara-focus-immersive').isVisible(),true,'start must open immersive view');
  const model=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,route:location.hash,
    kind:JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.kind,
    overlayTime:document.querySelector('[data-focus-v2-time]')?.textContent,
    baseTime:document.querySelector('#timer-display')?.textContent,
    stats:Array.from(document.querySelectorAll('.focus-v2-metrics strong')).map(x=>x.textContent)}));
  assert.equal(model.route,'#focus-pomodoro','immersive must stay on the same canonical route');
  assert.equal(model.kind,'focus','canonical timer not running');
  assert.equal(model.overlayTime,model.baseTime,'immersive time diverged from canonical timer');
  assert.ok(model.scroll<=model.width+1,'immersive horizontal overflow '+JSON.stringify(model));
  assert.equal(await page.locator('#elara-focus-immersive .focus-v2-setting').count(),3,'immersive should have only essential settings');
  assert.equal(await page.locator('#elara-focus-immersive .focus-v2-mode').count(),4,'four visual modes in immersive scene');
  await page.locator('#elara-focus-immersive .focus-v2-pause').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.status==='paused');
  await page.locator('#elara-focus-immersive .focus-v2-pause').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.status==='running');
  await page.locator('[data-focus-v2-exit]').click();
  assert.equal(await page.locator('#elara-focus-immersive').isHidden(),true,'exit must close overlay only');
  assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus)),'exit must not stop session');
  if(width===390||width===1440) {
    await page.locator('.focus-v2-enter').click();
    await page.screenshot({path:'browser-artifacts/focus02/'+(base.startsWith('https:')?'live':'candidate')+'-immersive-'+width+'.png',fullPage:true});
    await page.locator('[data-focus-v2-exit]').click();
    await page.screenshot({path:'browser-artifacts/focus02/'+(base.startsWith('https:')?'live':'candidate')+'-preview-'+width+'.png',fullPage:true});
  }
  await ctx.close();
  console.log('FOCUS02_PREVIEW_IMMERSIVE_PASS '+width);
 }
 for(const width of [390,1440]){
  const [ctx,page]=await pageFor(width,'books');
  await page.waitForSelector('#panel-books #lib01-overview [data-focus-v2-inline-start]');
  const start=page.locator('#panel-books #lib01-overview [data-focus-v2-inline-start]');
  await start.click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').activeFocus?.status==='running');
  assert.equal(new URL(page.url()).hash,'#books','inline library start must not navigate');
  assert.equal(await page.locator('#elara-focus-immersive').isHidden(),true,'inline library start must not open fullscreen');
  await start.click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').activeFocus?.status==='paused');
  assert.equal(new URL(page.url()).hash,'#books','inline pause must not navigate');
  await page.locator('#panel-books #lib01-overview [data-lib01-route="focus-pomodoro"]').first().click();
  assert.equal(new URL(page.url()).hash,'#focus-pomodoro','room entry should navigate to non-full setup');
  assert.equal(await page.locator('#elara-focus-immersive').isHidden(),true,'room entry cannot force fullscreen');
  await page.locator('#panel-focus-pomodoro .focus-v2-enter').click();
  assert.equal(await page.locator('#elara-focus-immersive').isVisible(),true,'open an existing session fullscreen without creating another');
  const session=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus);
  assert.equal(session.status,'paused','opening fullscreen must not implicitly resume paused session');
  await ctx.close();
  console.log('FOCUS02_LIBRARY_INLINE_PASS '+width);
 }
}finally{await browser.close()}
console.log('FOCUS02_TWO_STAGE_PASS inline library start; non-full route; immersive scene; canonical pause/resume; 8 widths');
