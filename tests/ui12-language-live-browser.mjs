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
  assert.equal(await page.locator('#panel-language .ui12-shortcut svg').count(),8,'Production eight semantic SVG icons missing');
  const hit=await page.locator('#panel-language .ui12-hero').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(hit,/language_banner_main\.webp/,'Production Hero asset mismatch');
  if(width===390){
   assert.equal(await page.locator('.bottom-nav [data-elara-nav-kind]').count(),7,'Original 7-button dock modified on production');
  }else{
   assert.ok(await page.locator('.sidebar').count()>0,'Original desktop sidebar missing');
  }
  await page.screenshot({path:out+'/live-language-'+width+'.png',fullPage:true,animations:'disabled'});
  // Full-page screenshots may leave Chromium's scroll position near the bottom.
  // Restore a user-reachable document position before testing a physical click beneath the fixed topbar.
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(120);
  await page.locator('#panel-language [data-ui12-jump="channels"]').evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.waitForTimeout(100);
  if(width===1440){const hit=await page.locator('#panel-language [data-ui12-jump="channels"]').evaluate(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,p=document.elementFromPoint(x,y);return{rect:{x:r.x,y:r.y,width:r.width,height:r.height},scrollY:window.scrollY,viewport:innerHeight,hitTag:p?.tagName,hitId:p?.id,hitClass:p?.className,hitParent:p?.parentElement?.id,topbar:document.querySelector('.topbar')?.getBoundingClientRect().bottom}});console.log('UI13_DESKTOP_SHORTCUT_HITTEST '+JSON.stringify(hit));}
  await page.locator('#panel-language [data-ui12-jump="channels"]').click();await page.waitForSelector('#panel-language-channels:not(.hidden) .ui13-subpage');
  await page.locator('#panel-language-channels [data-ui13-back]').click();await page.waitForSelector('#panel-language:not(.hidden)');
  await page.locator('#panel-language [data-ui12-jump="tasks"]').evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.waitForTimeout(100);
  await page.locator('#panel-language [data-ui12-jump="tasks"]').click();await page.waitForSelector('#panel-language-tasks:not(.hidden) .ui13-subpage');
  await page.locator('#panel-language-tasks [data-ui13-back]').click();await page.waitForSelector('#panel-language:not(.hidden)');
  await page.evaluate(()=>ElaraOpen('home',{history:'replace'}));
  await page.waitForSelector('#panel-home:not(.hidden)');
  assert.equal(await page.locator('#panel-language.hidden').count(),1,'Language must become hidden on Home');
  assert.equal(await page.locator('#panel-language').evaluate(el=>getComputedStyle(el).display),'none','Language dashboard leaked into Home layout');
  await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
  await page.waitForSelector('#panel-language.ui12-language:not(.hidden) .ui12-board');
  console.log('UI12_LIVE_LANGUAGE_PASS '+width+' viewport 8 shortcuts/cards, original nav, honest empty data, decoded WebP, overflow='+overflow+' pageErrors='+JSON.stringify(errors));
  await context.close();
 }
 console.log('UI12_LIVE_DESKTOP_MOBILE_PASS');
}finally{await browser.close()}
