/* UI13 owner release: run full production click/return smoke against cache-busted release v2. */
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

  // L1: verify actual published Classes markup and its canonical empty-account state.
  await page.evaluate(()=>ElaraOpen('language-courses',{history:'replace'}));
  await page.waitForSelector('#panel-language-courses:not(.hidden) .l1-class-stats',{timeout:15000});
  assert.equal(await page.locator('#panel-language-courses .l1-class-stat').count(),4,'L1 class metrics unavailable on live site');
  assert.equal(await page.locator('#panel-language-courses .l1-main-cta:visible').count(),1,'L1 create-class CTA unavailable on live site');
  assert.equal(await page.locator('#panel-language-courses .l1-empty-cta:visible').count(),1,'L1 personal empty-state CTA unavailable');
  assert.equal(await page.locator('#panel-language-courses .l1-shared-cta:visible').count(),1,'L1 shared empty-state CTA unavailable');
  const liveClassBg=await page.locator('#panel-language-courses .l1-class-hero').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(liveClassBg,/language_banner_main\.webp/,'L1 real repository hero not loaded');
  const liveClassOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(liveClassOverflow<=2,'L1 production classes horizontal overflow '+width+': '+liveClassOverflow);
  await page.screenshot({path:out+'/live-classes-'+width+'.png',fullPage:true,animations:'disabled'});

  // Isolated fixture against the REAL published GitHub Pages app, not a local server.
  await page.locator('#panel-language-courses .l1-main-cta').click();
  await page.waitForSelector('#elara-dialog-root .lf-class-editor',{timeout:15000});
  // Assert the actual deployed modal, rather than a committed CSS file.
  const ownerModal=page.locator('#elara-dialog-root .lf3-class-editor');
  assert.equal(await ownerModal.count(),1,'STALE PRODUCTION: current class popup design is missing @'+width);
  assert.equal(await ownerModal.getAttribute('data-class-design-version'),'popup-v3','STALE PRODUCTION: class popup v3 not published');
  const visual=await ownerModal.evaluate(form=>{
    const panel=form.closest('.elara-dialog-panel'),head=form.querySelector('.lf3-hero'),cover=form.querySelector('.lf-editor-cover'),footer=panel.querySelector('.elara-dialog-actions');
    return {headerArt:getComputedStyle(head).backgroundImage,bookArt:getComputedStyle(cover).backgroundImage,
      plus:getComputedStyle(cover,'::after').content,footerGrid:getComputedStyle(footer).gridTemplateAreas,
      shareInFooter:!!footer.querySelector('.lf3-share-field'),overflow:panel.scrollWidth-panel.clientWidth};
  });
  assert.match(visual.headerArt,/Alien(?:%20| )Moonlit(?:%20| )Shoreline/,'Reference cosmic background not applied');
  assert.match(visual.bookArt,/icon-library-open-book/,'Reference glowing blue book not applied');
  assert.ok(visual.plus.includes('+'),'Reference book plus icon missing');
  assert.equal(visual.shareInFooter,true,'Real share control not in footer');
  assert.ok(visual.footerGrid.includes('save')&&visual.footerGrid.includes('cancel'),'Reference modal action grid not applied');
  assert.ok(visual.overflow<=2,'Class popup horizontal overflow @'+width);
  await page.screenshot({path:out+'/live-classes-popup-new-'+width+'.png',animations:'disabled'});
  const popup=page.locator('#elara-dialog-root .lf-class-editor');
  const save=page.locator('#elara-dialog-root .elara-dialog-actions .primary-button').last();
  await save.click();
  assert.equal(await popup.count(),1,'Live invalid Save closed the class Popup @'+width);
  assert.equal(await popup.locator('.lf-editor-error:not([hidden])').count(),1,'Missing live inline form validation @'+width);
  await popup.locator('input[name="title"]').fill('Live QA isolated class');
  await popup.locator('input[name="weekday"]').first().check();
  await save.click();
  await page.waitForFunction(()=>!document.querySelector('#elara-dialog-root .lf-class-editor'),null,{timeout:12000});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').languageClasses?.some(x=>x.title==='Live QA isolated class'),null,{timeout:12000});
  assert.equal(await page.locator('.language-personal-classes .language-class-card').count(),1,'Live class did not render after Save @'+width);
  await page.screenshot({path:out+'/live-classes-personal-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.locator('.language-personal-classes [data-class-edit]').first().click();
  await page.waitForSelector('#elara-dialog-root .lf-class-editor',{timeout:12000});
  assert.equal(await popup.locator('input[name="title"]').inputValue(),'Live QA isolated class','Live Edit did not restore saved title @'+width);
  await page.screenshot({path:out+'/live-classes-popup-edit-'+width+'.png',animations:'disabled'});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#elara-dialog-root .lf-class-editor'),null,{timeout:12000});
  for(const type of ['online','offline','linked']){
    await page.locator('[data-lf-class-filter="'+type+'"]').click();
    assert.equal(await page.locator('[data-lf-class-filter="'+type+'"]').getAttribute('aria-pressed'),'true','Live type filter not active: '+type);
  }
  await page.locator('[data-lf-class-filter="all"]').click();
  console.log('LANG_FIDELITY_LIVE_POPUP_PASS '+width+' true origin + isolated fixture create/invalid/edit/filters');

  await page.locator('#panel-language-courses [data-class-back]').click();
  await page.waitForSelector('#panel-language:not(.hidden)');

  // L2: direct production Chromium dashboard check with isolated local storage fixtures.
  await page.evaluate(()=>ElaraOpen('words',{history:'replace'}));
  await page.waitForSelector('#panel-words:not(.hidden) [data-l2-leitner]',{timeout:20000});
  assert.equal(await page.locator('#panel-words .l2-stage').count(),5,'Live L2 five boxes missing @'+width);
  assert.equal(await page.locator('#panel-words .l2-stat').count(),4,'Live L2 statistics missing @'+width);
  assert.equal(await page.locator('#panel-words .l2-leitner-hero').evaluate(el=>getComputedStyle(el).backgroundImage.includes('lightner.webp')),true,'Live L2 artwork missing @'+width);
  await page.screenshot({path:out+'/live-leitner-dashboard-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.locator('#panel-words [data-l2-add]').first().click();
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'word-front','Live L2 add CTA not connected to canonical form');
  await page.locator('#word-front').fill('live leitner '+width);
  await page.locator('#word-back').fill('معنی آزمایشی');
  await page.locator('#word-form button[type=submit]').click();
  await page.waitForFunction(w=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').words?.some(x=>x.front==='live leitner '+w),width,{timeout:12000});
  await page.waitForFunction(()=>document.querySelector('.l2-stat-all strong')?.textContent===Number(1).toLocaleString('fa-IR'),null,{timeout:12000});
  await page.locator('#panel-words [data-l2-review]').first().click();
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'word-reveal','Live L2 review button did not reach canonical flashcard');
  await page.screenshot({path:out+'/live-leitner-review-connected-'+width+'.png',animations:'disabled'});
  console.log('L2_LIVE_LEITNER_PASS '+width+' canonical add and review routing');

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
