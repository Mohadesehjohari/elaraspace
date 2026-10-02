import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:null,profile:{name:'Banner QA',username:'banner_qa',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:{uid:'qa',name:'Banner QA',username:'banner_qa',xp:20},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
async function open(width,height){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<=700,isMobile:width<=700});
 const page=await context.newPage();
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.goto(base+'/?mobile-banner-copy='+Date.now()+'#home',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraMobileBannerCopy&&document.querySelector('#panel-home .ref-hero.elara-mobile-banner')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 return{page,context}
}
{
 const {page,context}=await open(390,844);const hero=page.locator('#panel-home .ref-hero');
 assert.equal(await hero.getAttribute('data-mobile-copy-state'),'visible','mobile banner copy must start visible');
 assert.ok(await page.locator('#panel-home .ref-hero .elara-mobile-banner-copy-target').count()>=2,'Home copy targets were not wired');
 assert.equal(await hero.evaluate(el=>getComputedStyle(el).touchAction),'pan-y','banner must preserve vertical touch scrolling');
 const collapsed=await page.evaluate(()=>ElaraMobileBannerCopy.collapseAll());assert.ok(collapsed>=1,'collapseAll did not collapse mobile banners');
 assert.equal(await hero.getAttribute('data-mobile-copy-state'),'collapsed');
 const opacity=Number(await page.locator('#panel-home .ref-hero .hero-copy').evaluate(el=>getComputedStyle(el).opacity));assert.ok(opacity<.1,'collapsed copy still covers artwork');
 const notCancelled=await hero.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,pointerType:'touch',clientX:100,clientY:100})));assert.equal(notCancelled,true,'long-press handler must not cancel native pointer scrolling');
 await page.waitForTimeout(720);assert.equal(await hero.getAttribute('data-mobile-copy-state'),'visible','long press did not reveal banner copy');
 await hero.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'touch',clientX:100,clientY:100})));
 for(const route of ['tasks','language','books','freedom']){await page.evaluate(r=>window.ElaraOpen(r,{history:'replace'}),route);await page.waitForTimeout(150);await page.evaluate(()=>ElaraMobileBannerCopy.refresh())}
 assert.equal(await page.locator('#panel-tasks .astra-task-hero.elara-mobile-banner').count(),1,'Tasks banner not wired');
 assert.equal(await page.locator('#panel-language .elara-language-hero.elara-mobile-banner').count(),1,'Language banner not wired');
 assert.equal(await page.locator('#panel-books .library-hero.elara-mobile-banner').count(),1,'Library banner not wired');
 assert.equal(await page.locator('#panel-freedom .freedom-hero.elara-mobile-banner').count(),1,'Freedom banner not wired');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,'mobile banner stage introduced horizontal overflow '+overflow);
 await page.screenshot({path:'browser-artifacts/mobile-banner-copy-390.png',fullPage:false});await context.close();
}
{
 const {page,context}=await open(1440,1000);const hero=page.locator('#panel-home .ref-hero');assert.equal(await hero.getAttribute('data-mobile-copy-state'),'desktop');assert.equal(await hero.evaluate(el=>el.classList.contains('is-copy-collapsed')),false,'desktop copy must stay persistent');assert.equal(await page.evaluate(()=>ElaraMobileBannerCopy.collapseAll()),0,'desktop collapseAll must be inert');await page.screenshot({path:'browser-artifacts/mobile-banner-copy-1440.png',fullPage:false});await context.close();
}
await browser.close();console.log('MOBILE_BANNER_COPY_PASS initial-visible auto-owner longpress-no-cancel routes home/tasks/language/books/freedom 390/1440');
