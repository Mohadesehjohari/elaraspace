/* UI12 first paint: slow owner assets may not expose the old Language markup. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const fakeCloud="window.ElaraAccount={user:{uid:'language-paint-qa',emailVerified:true},profile:{uid:'language-paint-qa',name:'QA'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const fakeSocial="window.ElaraSocial={me:{uid:'language-paint-qa',name:'QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
 for(const [width,mode] of [[390,'direct'],[1440,'navigate']]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:fakeCloud}));
  await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:fakeSocial}));
  // Force a visible gap after the fast Home boot but before the Language owner.
  await page.route('**/ui12-language-dashboard.js*',async route=>{await pause(2800);await route.continue()});
  await page.route('**/ui12-language-dashboard.css*',async route=>{await pause(1200);await route.continue()});
  await page.route('**/ui13-language.css*',async route=>{await pause(1600);await route.continue()});
  await page.addInitScript(()=>localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',language:'fa'})));
  await page.goto(base+'/?language-first-paint='+width+'#'+(mode==='direct'?'language':'home'),{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>typeof window.ElaraOpen==='function'&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
  if(mode==='navigate')await page.evaluate(()=>window.ElaraOpen('language',{history:'replace'}));
  await page.waitForSelector('#panel-language:not(.hidden)',{timeout:12000});
  const early=await page.evaluate(()=>{
   const panel=document.getElementById('panel-language');
   const old=[...panel.children].filter(el=>!el.matches('.elara-language-hero,.ui12-shortcuts,.ui12-board'));
   return {
    ready:panel.dataset.ui12PaintReady||'',
    placeholder:getComputedStyle(panel,'::before').content,
    exposed:old.filter(el=>{const style=getComputedStyle(el),rect=el.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.height>0}).map(el=>el.className||el.id),
    visibleChildren:[...panel.children].filter(el=>getComputedStyle(el).display!=='none').length
   }
  });
  assert.notEqual(early.ready,'true','UI12 should still be loading during forced delay '+width);
  assert.ok(early.placeholder.includes('زبان'),'Language loading state absent '+width+': '+JSON.stringify(early));
  assert.deepEqual(early.exposed,[],'Old Language content leaked during first paint '+width+': '+JSON.stringify(early));
  assert.equal(early.visibleChildren,0,'Language content was painted before owner ready '+width);
  await page.waitForFunction(()=>{
   const p=document.getElementById('panel-language');
   return p?.dataset.ui12PaintReady==='true'&&p.querySelectorAll(':scope > .ui12-board > .ui12-card').length===8&&
    getComputedStyle(p.querySelector(':scope > .ui12-board')).display!=='none';
  },null,{timeout:40000});
  const final=await page.evaluate(()=>{
   const panel=document.getElementById('panel-language');
   const old=[...panel.children].filter(el=>!el.matches('.elara-language-hero,.ui12-shortcuts,.ui12-board'));
   const visible=old.filter(el=>{const style=getComputedStyle(el),rect=el.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.height>0});
   return {ready:panel.dataset.ui12PaintReady,legacyVisible:visible.map(el=>el.className||el.id),
    shortcuts:panel.querySelectorAll(':scope > .ui12-shortcuts .ui12-shortcut').length,
    cards:panel.querySelectorAll(':scope > .ui12-board > .ui12-card').length,
    hero:getComputedStyle(panel.querySelector('.elara-language-hero')).backgroundImage};
  });
  assert.equal(final.ready,'true');
  assert.deepEqual(final.legacyVisible,[],'Legacy language nodes still visible after owner mount '+width);
  assert.equal(final.shortcuts,8,'Language navigation missing '+width);
  assert.equal(final.cards,8,'New Language cards missing '+width);
  assert.match(final.hero,/language_banner_main\.webp/,'New hero not styled '+width);
  assert.deepEqual(errors.filter(x=>/UI12 owner first paint|Language owner styles unavailable/.test(x)),[]);
  console.log('LANGUAGE_FIRST_PAINT_PASS '+JSON.stringify({width,mode,early,final}));
  await context.close();
 }
} finally { await browser.close() }
