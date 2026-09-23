import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='browser-artifacts';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const mobileRoutes=['exercise','language','tasks','home','ranking','books','freedom'];
const desktopRoutes=['home','tasks','language','books','exercise','ranking','freedom'];
const measurements=[];
async function ready(page){
 await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraNavigation&&window.ElaraReferenceHome&&typeof window.ElaraOpen==='function'&&document.querySelector('.ref-home-grid'),null,{timeout:30000});
 await page.addStyleTag({content:'#cloud-layer{display:none!important}body:not(.cloud-ready) .shell,body.cloud-locked .shell,body:not(.cloud-ready) .bottom-nav{visibility:visible!important}*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
 await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');const layer=document.getElementById('cloud-layer');if(layer){layer.hidden=true;layer.setAttribute('hidden','')}window.ElaraNavigation.render();window.ElaraReferenceHome.render();window.ElaraOpen('home',{history:'replace'})});
 await page.waitForTimeout(350);
}
async function visible(locator){const b=await locator.boundingBox();return !!b&&b.width>0&&b.height>0}
async function bounds(page,selector){return page.locator(selector).evaluate(el=>{const x=el.getBoundingClientRect();return {x:Math.round(x.x),y:Math.round(x.y),width:Math.round(x.width),height:Math.round(x.height)}})}
for(const width of [1440,1648,1920]){
 const page=await browser.newPage({viewport:{width,height:width===1648?928:1000},deviceScaleFactor:1});await ready(page);
 assert.deepEqual(await page.locator('.sidebar .elara-sidebar-primary [data-elara-tab]').evaluateAll(n=>n.map(x=>x.dataset.elaraTab)),desktopRoutes);
 for(const route of desktopRoutes)assert.equal(await visible(page.locator('.sidebar .elara-sidebar-primary [data-elara-tab="'+route+'"]')),true,'desktop route hidden: '+route);
 assert.equal(await visible(page.locator('.sidebar .elara-sidebar-secondary [data-elara-tab="reports"]')),true);
 assert.equal(await visible(page.locator('.bottom-nav')),false,'Bottom Nav must be hidden on desktop');
 assert.equal(await visible(page.locator('#ref-header-search input')),true,'Desktop typed search missing');
 assert.equal(await visible(page.locator('#ref-header-account')),true,'Desktop account opener missing');
 assert.equal(await visible(page.locator('.topbar .elara-profile')),false,'Legacy profile control must stay visually hidden');
 assert.equal(await visible(page.locator('#elara-account-menu-trigger')),false,'Desktop hamburger must be hidden');
 assert.equal(await visible(page.locator('#ref-library-focus')),false,'Library timer must not show in Home');
 const sidebar=await bounds(page,'.sidebar'),tasks=await bounds(page,'.ref-tasks'),habits=await bounds(page,'.ref-habits'),wellness=await bounds(page,'.ref-wellness-card'),hero=await bounds(page,'.ref-hero');
 const heroCopy=await bounds(page,'.ref-hero .hero-copy'),heroQuote=await bounds(page,'.ref-hero-quote');
 assert.ok(sidebar.x<=1&&sidebar.width>=210&&sidebar.width<=240,'Desktop sidebar wrong position/width');
 assert.ok(Math.abs(tasks.y-habits.y)<=3&&Math.abs(tasks.y-wellness.y)<=3,'Desktop first-row cards misaligned');
 assert.ok(tasks.x<habits.x&&habits.x<wellness.x,'Desktop card order not left to right');
 assert.ok(hero.width>width-290,'Desktop hero not using available width');
 assert.ok(heroCopy.x<heroQuote.x,'Desktop hero heading must be left of quote as in reference');
 assert.equal(await visible(page.locator('#elara-stats')),false,'Legacy five-stat row must not appear on reference Home');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,'Horizontal overflow '+overflow);
 measurements.push({viewport:width,sidebar,hero,tasks,habits,wellness,overflow});
 await page.screenshot({path:out+'/after-desktop-'+width+'-full.png',fullPage:true});
 if(width===1440){await page.locator('.sidebar [data-elara-tab="books"]').click();await page.waitForFunction(()=>location.hash==='#books');assert.equal(await page.locator('.sidebar [data-elara-tab="books"]').getAttribute('aria-current'),'page');assert.equal(await visible(page.locator('#ref-library-focus .focus-card')),true,'Operational library timer missing');await page.screenshot({path:out+'/after-desktop-library-active.png'});await ready(page);await page.locator('#ref-header-account').click();await page.waitForFunction(()=>!document.querySelector('.elara-private-drawer')?.classList.contains('hidden'));await page.screenshot({path:out+'/after-desktop-drawer-open.png'});await page.locator('.elara-private-drawer [data-approved-wardrobe]').first().click();await page.waitForFunction(()=>!document.querySelector('.approved-wardrobe')?.hidden);await page.screenshot({path:out+'/after-desktop-drawer-popup.png'});await page.locator('.approved-wardrobe-window [data-close-wardrobe]').click();await page.waitForFunction(()=>document.querySelector('.approved-wardrobe')?.hidden);assert.equal(await page.locator('.elara-private-drawer').evaluate(el=>!el.classList.contains('hidden')),true,'Drawer closed after popup');await page.screenshot({path:out+'/after-desktop-drawer-restored.png'});}
 await page.close();
}
for(const width of [320,375,390,430]){
 const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});await ready(page);
 assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).display),'none');
 assert.deepEqual(await page.locator('.bottom-nav [data-elara-tab]').evaluateAll(n=>n.map(x=>x.dataset.elaraTab)),mobileRoutes);
 for(const route of mobileRoutes)assert.equal(await visible(page.locator('.bottom-nav [data-elara-tab="'+route+'"]')),true,'mobile route hidden: '+route);
 assert.equal(await page.locator('.bottom-nav [data-elara-tab="home"]').getAttribute('aria-current'),'page');
 assert.equal(await visible(page.locator('#elara-account-menu-trigger')),true,'Mobile hamburger hidden');
 assert.equal(await page.locator('#ref-mobile-brand').count(),1,'Duplicate mobile brand');
 console.log('MOBILE_TOPBAR_DOM',width,await page.locator('.topbar').evaluate(el=>el.innerHTML));
 assert.equal(await visible(page.locator('.topbar .elara-profile')),false,'Legacy mobile profile control duplicated');
 assert.equal(await visible(page.locator('#ref-streak-card')),true,'Mobile streak missing');
 assert.equal(await visible(page.locator('.ref-wellness-card')),true,'Mobile Wellness summary missing');
 assert.equal(await visible(page.locator('.ref-tasks')),true);assert.equal(await visible(page.locator('.ref-habits')),true);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,'Mobile horizontal overflow '+width+': '+overflow);
 measurements.push({viewport:width,hero:await bounds(page,'.ref-hero'),streak:await bounds(page,'#ref-streak-card'),tasks:await bounds(page,'.ref-tasks'),habits:await bounds(page,'.ref-habits'),wellness:await bounds(page,'.ref-wellness-card'),overflow});
 await page.screenshot({path:out+'/after-mobile-'+width+'-full.png',fullPage:true});await page.close();
}
writeFileSync(out+'/geometry.json',JSON.stringify(measurements,null,2));await browser.close();
console.log('PASS: real Chromium shell/Home 1440/1648/1920, mobile 320/375/390/430, Library focus, Drawer/popup and screenshots.');
