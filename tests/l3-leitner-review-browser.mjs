/* L3: real Chromium scene verification; all records are local browser fixtures. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const origin=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const dir='browser-artifacts/language-l3';mkdirSync(dir,{recursive:true});
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
const cloud="window.ElaraAccount={user:{uid:'l3-fixture',email:'l3@example.invalid',emailVerified:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'l3-fixture',name:'Fixture'},friends:[],refresh:async()=>{}};";
const fixture={version:1,words:[{id:'l3-1',front:'Abandon',back:'رها کردن',box:1,due:'2020-01-01'},{id:'l3-2',front:'Serene',back:'آرام',box:1,due:'2020-01-01'}],languageClasses:[],tasks:[],books:[],habits:[],goals:[],folders:[],tags:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:width<=430?844:900},deviceScaleFactor:width<=430?2:1,isMobile:width<=700,hasTouch:width<=700});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(data=>{if(!localStorage.getItem('elara_space_v1'))localStorage.setItem('elara_space_v1',JSON.stringify(data));localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',language:'fa'}))},fixture);
  await page.goto(origin+'/?l3='+width+'#words',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraOpen&&window.ElaraLanguageDestinations?.renderLeitner,null,{timeout:35000});
  await page.evaluate(()=>ElaraOpen('words',{history:'replace'}));
  await page.waitForSelector('#panel-words:not(.hidden) .l2-start-review:not([disabled])');
  await page.locator('#panel-words .l2-start-review').click();
  await page.waitForSelector('#panel-words.l3-review-active [data-l3-toolbar]',{timeout:10000});
  const background=await page.locator('#panel-words').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(background,width<=700?/lightner_words_backgroud_mobile\.webp/:/lightner_words_backgroud_pc\.webp/,'Wrong L3 image at '+width+': '+background);
  assert.equal(await page.locator('#word-reveal:visible').count(),1,'Canonical reveal control not visible');
  const beforeWord=await page.locator('#flash-front').textContent();
  await page.locator('#word-reveal').click();
  assert.equal(await page.locator('#flash-back:not(.hidden)').count(),1,'Reveal meaning did not work');
  assert.equal(await page.locator('#word-remembered:visible').count(),1,'Canonical known button missing');
  await page.locator('#word-remembered').click();
  await page.waitForFunction(front=>{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return s.words?.some(w=>w.front===front&&w.box===2&&w.due>'2020-01-01')},beforeWord,{timeout:10000});
  const scored=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('elara_space_v1')||'{}').words));
  await page.locator('[data-l3-prev]').click();
  assert.equal(await page.locator('#panel-words.l3-history-open [data-l3-history-front]').textContent(),beforeWord,'Previous word history does not match');
  assert.equal(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('elara_space_v1')||'{}').words)),scored,'Read-only previous word mutated scoring');
  await page.locator('[data-l3-current]').click();
  assert.equal(await page.locator('#panel-words.l3-history-open').count(),0,'Return to current word failed');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,'Review horizontal overflow '+width+': '+overflow);
  if(width===390||width===1440)await page.screenshot({path:dir+'/leitner-review-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#panel-words.l3-review-active'),null,{timeout:9000});
  assert.deepEqual(errors.filter(e=>!/favicon|network/i.test(e)),[],'L3 runtime errors at '+width);
  console.log('L3_REVIEW_WIDTH_PASS '+width);
  await context.close();
 }
 console.log('L3_REVIEW_TEN_WIDTHS_CANONICAL_PASS');
}finally{await browser.close()}
