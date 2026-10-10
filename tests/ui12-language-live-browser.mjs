/* UI12: post-deployment Chromium smoke against the actual GitHub Pages origin.
   Browser fixtures are local only: cloud.js and social are replaced in this test context.
   Exact live byte comparison is a separate GitHub Actions gate, not inferred here. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const root='https://mohadesehjohari.github.io/elaraspace/';
const out='browser-artifacts/ui12-live';mkdirSync(out,{recursive:true});
const cloud="window.ElaraAccount={user:{uid:'ui12-live-fixture',email:'test@example.invalid',emailVerified:true},profile:{uid:'ui12-live-fixture',name:'Visual QA',username:'fixture',profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'ui12-live-fixture',name:'Visual QA',username:'fixture'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const browser=await chromium.launch({headless:true});
try{
 const raw=await browser.newPage();
 await raw.goto(root+'?ui12-live-no-stub='+Date.now(),{waitUntil:'domcontentloaded'});
 const initial=await raw.evaluate(()=>({host:location.host,boot:!!document.querySelector('script[src*="boot.js"]'),title:document.title}));
 assert.equal(initial.host,'mohadesehjohari.github.io','Incorrect live origin');
 assert.equal(initial.boot,true,'Production boot.js not loaded from real Pages');
 console.log('UI12_LIVE_UNSTUBBED_DOCUMENT_PASS '+JSON.stringify(initial));
 await raw.close();
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?880:900},deviceScaleFactor:width===390?2:1,isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',x=>x.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',x=>x.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(()=>{localStorage.setItem('elara_space_v1',JSON.stringify({version:1,tasks:[],words:[],languageClasses:[],books:[],habits:[],goals:[],folders:[],tags:[],taskLists:[]}));localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',language:'fa'}))});
  await page.goto(root+'?ui12-live-width='+width+'#language',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>window.ElaraOpen&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
  await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
  await page.waitForSelector('#panel-language.ui12-language:not(.hidden) .ui12-board',{timeout:20000});
  assert.equal(await page.locator('#panel-language .ui12-shortcut').count(),8,'Production 8 language shortcuts missing');
  assert.equal(await page.locator('#panel-language .ui12-card').count(),8,'Production 8 real-data cards missing');
  assert.equal(await page.locator('#ui12-channels .ui12-empty-state').count(),1,'Do not render imaginary channels');
  assert.equal(await page.locator('#ui12-challenges .ui12-empty-state').count(),1,'Do not render imaginary challenges');
  assert.equal(await page.locator('#ui12-report .ui12-chart').count(),0,'Empty records must produce honest chart empty state');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,'Production horizontal overflow '+width+': '+overflow);
  const icons=await page.locator('#panel-language .ui12-shortcut img').evaluateAll(async xs=>{await Promise.all(xs.map(x=>x.decode().catch(()=>{})));return xs.map(x=>({src:x.getAttribute('src'),loaded:x.naturalWidth>0}))});
  assert.ok(icons.every(x=>x.loaded),'Production icon WebP decode failed: '+JSON.stringify(icons));
  const hit=await page.locator('#panel-language .ui12-hero').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(hit,/34-language-hero-banner\.webp/,'Production Hero asset mismatch');
  if(width===390){
   assert.equal(await page.locator('.bottom-nav [data-elara-nav-kind]').count(),7,'Original 7-button dock modified on production');
  }else{
   assert.ok(await page.locator('.sidebar').count()>0,'Original desktop sidebar missing');
  }
  await page.screenshot({path:out+'/live-language-'+width+'.png',fullPage:true,animations:'disabled'});
  console.log('UI12_LIVE_LANGUAGE_PASS '+width+' viewport 8 shortcuts/cards, original nav, honest empty data, decoded WebP, overflow='+overflow+' pageErrors='+JSON.stringify(errors));
  await context.close();
 }
 console.log('UI12_LIVE_DESKTOP_MOBILE_PASS');
}finally{await browser.close()}
