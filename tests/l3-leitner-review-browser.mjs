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
  assert.equal(await page.locator('#panel-words > .flashcard:visible, #panel-words > #word-list:visible').count(),0,'Dashboard must not expose review cards or word list @'+width);
  if(width===390||width===1440)await page.screenshot({path:dir+'/leitner-dashboard-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.locator('#panel-words .l2-start-review').click();
  await page.waitForSelector('body > #l3-review-scene [data-l3-card-slot] .flashcard',{timeout:10000});
  assert.equal(new URL(page.url()).searchParams.get('leitner'),'review','Review must have independent address @'+width);
  assert.equal(await page.locator('#l3-review-scene').evaluate(el=>getComputedStyle(el).position),'fixed','Review must be a full-screen view @'+width);
  assert.equal(await page.locator('#panel-words .flashcard').count(),0,'Old dashboard card must move to review scene @'+width);
  const background=await page.locator('#l3-review-scene').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(background,width<=700?/lightner_words_backgroud_mobile\.webp/:/lightner_words_backgroud_pc\.webp/,'Wrong L3 image at '+width+': '+background);
  assert.equal(await page.locator('#word-reveal:visible').count(),1,'Canonical reveal control not visible');
  const beforeWord=await page.locator('#flash-front').textContent();
  await page.locator('#word-reveal').click();
  assert.equal(await page.locator('#flash-back:not(.hidden)').count(),1,'Reveal meaning did not work');
  assert.equal(await page.locator('#word-remembered:visible').count(),1,'Canonical known button missing');
  assert.equal(await page.locator('#word-forgot:visible').count(),1,'Canonical forgot button missing');
  if(width===390||width===1440)await page.screenshot({path:dir+'/leitner-review-revealed-'+width+'.png',fullPage:false,animations:'disabled'});
  await page.locator('#word-remembered').click();
  await page.waitForFunction(front=>{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return s.words?.some(w=>w.front===front&&w.box===2&&w.due>'2020-01-01')},beforeWord,{timeout:10000});
  const scored=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('elara_space_v1')||'{}').words));
  await page.locator('[data-l3-prev]').click();
  assert.equal(await page.locator('#l3-review-scene #flash-front').textContent(),beforeWord,'Previous word was not re-asked');
  assert.equal(await page.locator('#l3-review-scene #flash-back.hidden').count(),1,'Previous word must hide its meaning and ask again');
  assert.equal(await page.locator('#l3-review-scene #word-remembered.hidden').count(),1,'Previous word answer buttons must reset');
  assert.equal(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('elara_space_v1')||'{}').words)),scored,'Revisiting alone must not mutate scoring');
  await page.locator('#word-reveal').click();
  await page.locator('#word-forgot').click();
  await page.waitForFunction(front=>{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return s.words?.some(w=>w.front===front&&w.box===1)},beforeWord,{timeout:10000});
  const voiceButtons=page.locator('.l3-voice-options [data-l3-voice]');
  assert.deepEqual(await voiceButtons.evaluateAll(nodes=>nodes.map(el=>el.dataset.l3Voice)),['en-US','en-GB'],'Both pronunciations must be offered');
  assert.equal(await page.locator('.l3-story-logo').count(),1,'Use the main Elara logo');
  assert.equal(await page.locator('.l3-story-notice').count(),0,'Decorative nonfunctional icon should be removed');
  await page.locator('[data-l3-focus]').click();
  assert.equal(await page.locator('[data-l3-focus]').getAttribute('aria-pressed'),'true','Focus mode must start');
  await page.waitForTimeout(1150);
  const timer=await page.locator('[data-l3-timer]').textContent();
  assert.match(timer,/^00:00:0[1-9]$/,'Focus timer should advance every second');
  await page.locator('[data-l3-pause]').click();
  assert.equal(await page.locator('[data-l3-focus]').getAttribute('aria-pressed'),'false','Focus mode must pause');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,'Review horizontal overflow '+width+': '+overflow);
  if(width===390||width===1440)await page.screenshot({path:dir+'/leitner-review-'+width+'.png',fullPage:true,animations:'disabled'});
  if(width===390||width===1440){
    assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+5),'Underlying app leaked beyond full-screen review');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('#l3-review-scene .l3-story-card-slot .flashcard',{timeout:20000});
    assert.equal(new URL(page.url()).searchParams.get('leitner'),'review','Direct review URL must restore after refresh');
  }
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#l3-review-scene'),null,{timeout:9000});
  assert.equal(new URL(page.url()).hash,'#words','Escape must return to dashboard route @'+width);
  assert.equal(await page.locator('#panel-words .flashcard').count(),1,'Review card must return to original canonical panel @'+width);
  if(width===390||width===1440){
   await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
   await page.waitForSelector('#panel-language .ui12-leitner-card, #panel-language .ui12-board',{timeout:9000});
   const reviewNow=page.locator('#panel-language [data-ui12-route="leitner-review"]');
   assert.equal(await reviewNow.count(),1,'Language landing review-now must point directly to story');
   await reviewNow.click();
   await page.waitForSelector('#l3-review-scene .l3-story-frame',{timeout:10000});
   assert.equal(new URL(page.url()).searchParams.get('leitner'),'review','Language review now did not navigate to story');
   assert.equal(await page.locator('.l3-voice-options [data-l3-voice]').count(),2,'Voice buttons must survive re-entry');
   const longWord='Unaccustomed';
   await page.locator('#flash-front').evaluate((el,word)=>{el.textContent=word},longWord);
   await page.waitForTimeout(40);
   const wordSize=await page.locator('#flash-front').evaluate(el=>({width:el.getBoundingClientRect().width,parent:el.parentElement.getBoundingClientRect().width,font:parseFloat(getComputedStyle(el).fontSize)}));
   assert.ok(wordSize.width<=wordSize.parent+2,'Long words must not overflow card '+JSON.stringify(wordSize));
   const heights=await page.locator('#l3-review-scene .l3-story-frame').evaluate(el=>({card:el.getBoundingClientRect().height,view:innerHeight}));
   assert.ok(heights.card<heights.view*.80,'Story card too tall relative to viewport: '+JSON.stringify(heights));
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!document.querySelector('#l3-review-scene'));
  }

  assert.deepEqual(errors.filter(e=>!/favicon|network/i.test(e)),[],'L3 runtime errors at '+width);
  console.log('L3_REVIEW_WIDTH_PASS '+width);
  await context.close();
 }
 console.log('L3_REVIEW_TEN_WIDTHS_CANONICAL_PASS');
}finally{await browser.close()}
