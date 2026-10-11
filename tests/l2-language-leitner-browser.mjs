/* L2 candidate-only Chromium gate: no production account records are touched. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const origin=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const widths=[320,360,375,390,412,430,768,1440,1648];
const dir='browser-artifacts/language-l2';mkdirSync(dir,{recursive:true});
const cloud="window.ElaraAccount={user:{uid:'l2-fixture',email:'l2@example.invalid',emailVerified:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'l2-fixture',name:'Fixture'},friends:[],clubs:{list:async()=>[],discover:async()=>[]},refresh:async()=>{}};";
const fixture={version:1,words:[1,2,3,4,5].map((box,i)=>({id:'l2-'+i,front:'l2 word '+i,back:'l2 meaning '+i,box,due:'2020-01-01'})),languageClasses:[],tasks:[],books:[],habits:[],goals:[],folders:[],tags:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:width<=430?2:1,isMobile:width<=700,hasTouch:width<=700});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/cloud.js*',x=>x.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',x=>x.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(data=>{if(!localStorage.getItem('elara_space_v1'))localStorage.setItem('elara_space_v1',JSON.stringify(data));if(!localStorage.getItem('elara_preferences_v2'))localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',language:'fa'}))},fixture);
  await page.goto(origin+'/?l2='+width+'#words',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraOpen&&window.ElaraLanguageDestinations?.renderLeitner,null,{timeout:35000});
  await page.evaluate(()=>ElaraOpen('words',{history:'replace'}));
  await page.waitForSelector('#panel-words:not(.hidden) .l2-leitner-shell',{timeout:18000});
  assert.equal(await page.locator('#panel-words .l2-stage').count(),5,'L2 five stages missing at '+width);
  assert.equal(await page.locator('#panel-words .l2-stat').count(),4,'L2 canonical stats missing at '+width);
  assert.equal(await page.locator('#panel-words .l2-start-review:not([disabled])').count(),1,'L2 due CTA missing');
  const data=await page.evaluate(()=>({due:document.querySelector('.l2-stat-due strong')?.textContent,all:document.querySelector('.l2-stat-all strong')?.textContent,hero:getComputedStyle(document.querySelector('.l2-leitner-hero')).backgroundImage,overflow:document.documentElement.scrollWidth-innerWidth}));
  assert.equal(data.due,Number(5).toLocaleString('fa-IR'),'L2 due count not canonical');
  assert.equal(data.all,Number(5).toLocaleString('fa-IR'),'L2 word total not canonical');
  assert.match(data.hero,/lightner\.webp/,'L2 must use repository artwork');
  assert.ok(data.overflow<=2,'Horizontal overflow at '+width+': '+JSON.stringify(data));
  if(width===390){
   await page.locator('#panel-words [data-l2-add]').first().click();
   assert.equal(await page.evaluate(()=>document.activeElement?.id),'word-front','Add CTA not connected to canonical form');
   await page.locator('#word-front').fill('browser-added');
   await page.locator('#word-back').fill('مورد آزمایش');
   await page.locator('#word-form button[type=submit]').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').words?.some(w=>w.front==='browser-added'),null,{timeout:10000});
   await page.waitForFunction(()=>document.querySelector('.l2-stat-all strong')?.textContent===Number(6).toLocaleString('fa-IR'),null,{timeout:10000});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForSelector('#panel-words:not(.hidden) .l2-leitner-shell',{timeout:35000});
   assert.equal(await page.locator('.l2-stat-all strong').textContent(),Number(6).toLocaleString('fa-IR'),'L2 did not preserve canonical count after refresh');
  }
  if(width===390||width===1440)await page.screenshot({path:dir+'/leitner-'+width+'.png',fullPage:true,animations:'disabled'});
  assert.deepEqual(errors.filter(x=>!/favicon|network/i.test(x)),[],'L2 browser runtime errors at '+width);
  await context.close();
  console.log('L2_LEITNER_WIDTH_PASS '+width);
 }
 console.log('L2_LEITNER_NINE_WIDTHS_CANONICAL_PASS');
}finally{await browser.close()}
