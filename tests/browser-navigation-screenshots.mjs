import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='browser-artifacts';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const mobileRoutes=['exercise','language','tasks','home','ranking','books','freedom'];
const desktopRoutes=['home','tasks','language','books','exercise','ranking','freedom'];
const measurements=[];
async function ready(page,{seed=false}={}){
 if(seed)await page.addInitScript(()=>{const d=new Date(),iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`,today=iso(d);localStorage.setItem('elara_space_v1',JSON.stringify({xp:420,tasks:[{id:'t1',text:'مطالعه',priority:1,date:today,completed:false},{id:'t2',text:'تمرین',priority:2,date:today,completed:false},{id:'t3',text:'مرور زبان',priority:3,date:today,completed:false}],habits:[{id:'h1',title:'کتاب',days:[today]},{id:'h2',title:'حرکت',days:[]}],goals:[{id:'g1',title:'هدف نمونه تست',steps:[{text:'گام',done:true}]}],taskCompletionHistory:[{taskId:'old',date:today,key:'old:'+today}]}))});
 await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraNavigation&&window.ElaraReferenceHome&&typeof window.ElaraOpen==='function'&&document.querySelector('.ref-home-grid'),null,{timeout:30000});
 await page.addStyleTag({content:'#cloud-layer{display:none!important}body:not(.cloud-ready) .shell,body.cloud-locked .shell,body:not(.cloud-ready) .bottom-nav{visibility:visible!important}*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
 await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');const layer=document.getElementById('cloud-layer');if(layer){layer.hidden=true;layer.setAttribute('hidden','')}window.ElaraNavigation.render();window.ElaraReferenceHome.render();window.ElaraOpen('home',{history:'replace'})});
 await page.waitForTimeout(350);
}
async function visible(locator){const b=await locator.boundingBox();return !!b&&b.width>0&&b.height>0}
async function bounds(page,selector){return page.locator(selector).evaluate(el=>{const x=el.getBoundingClientRect();return {x:Math.round(x.x),y:Math.round(x.y),width:Math.round(x.width),height:Math.round(x.height)}})}
async function pageMetrics(page){return page.evaluate(()=>({innerHeight,scrollHeight:document.documentElement.scrollHeight,scrollRemaining:Math.max(0,document.documentElement.scrollHeight-innerHeight),scrollWidth:document.documentElement.scrollWidth}))}
async function assetsOk(page){return page.evaluate(async()=>{const urls=['assets/ui/hero-landscape.webp','assets/ui/missions-rocket.webp','assets/ui/streak-flame.webp'];const rows=[];for(const url of urls){const r=await fetch(url,{cache:'no-store'});rows.push({url,ok:r.ok,status:r.status,type:r.headers.get('content-type')})}return rows})}
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
 assert.equal(await visible(page.locator('#ref-desktop-streak')),true,'Desktop compact streak missing');
 assert.equal(await visible(page.locator('#ref-streak-card')),false,'Mobile streak row must stay hidden on desktop');
 const assetRows=await assetsOk(page);assert.ok(assetRows.every(x=>x.ok),'Artwork request failed: '+JSON.stringify(assetRows));
 assert.ok((await page.locator('.ref-hero').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('hero-landscape.webp'),'Hero WebP not connected');
 assert.equal(await page.locator('#ref-desktop-streak .ref-streak-flame').evaluate(img=>img.complete&&img.naturalWidth>0),true,'Desktop flame failed');
 assert.equal(await page.locator('.ref-missions .ref-missions-art').evaluate(img=>img.complete&&img.naturalWidth>0),true,'Mission rocket failed');
 const sidebar=await bounds(page,'.sidebar'),tasks=await bounds(page,'.ref-tasks'),habits=await bounds(page,'.ref-habits'),wellness=await bounds(page,'.ref-wellness-card'),hero=await bounds(page,'.ref-hero');
 const heroCopy=await bounds(page,'.ref-hero .hero-copy'),heroQuote=await bounds(page,'.ref-hero-quote');
 assert.ok(sidebar.x<=1&&sidebar.width>=210&&sidebar.width<=240,'Desktop sidebar wrong position/width');
 assert.ok(Math.abs(tasks.y-habits.y)<=3&&Math.abs(tasks.y-wellness.y)<=3,'Desktop first-row cards misaligned');
 assert.ok(tasks.x<habits.x&&habits.x<wellness.x,'Desktop card order not left to right');
 assert.ok(hero.width>width-290,'Desktop hero not using available width');
 assert.ok(heroCopy.x<heroQuote.x,'Desktop hero heading must be left of quote as in reference');
 assert.equal(await visible(page.locator('#elara-stats')),false,'Legacy five-stat row must not appear on reference Home');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,'Horizontal overflow '+overflow);
 measurements.push({mode:'empty',viewport:width,header:await bounds(page,'.topbar'),sidebar,hero,desktopStreak:await bounds(page,'#ref-desktop-streak'),tasks,habits,wellness,metrics:await pageMetrics(page),overflow});
 await page.screenshot({path:out+'/after-desktop-'+width+'-viewport.png',fullPage:false});
 await page.screenshot({path:out+'/after-desktop-'+width+'-full.png',fullPage:true});
 if(width===1440){await page.locator('.sidebar [data-elara-tab="books"]').click();await page.waitForFunction(()=>location.hash==='#books');assert.equal(await page.locator('.sidebar [data-elara-tab="books"]').getAttribute('aria-current'),'page');assert.equal(await visible(page.locator('#ref-library-focus .focus-card')),true,'Operational library timer missing');await page.screenshot({path:out+'/after-desktop-library-active.png'});await ready(page);await page.locator('#ref-header-account').click();await page.waitForFunction(()=>!document.querySelector('.elara-private-drawer')?.classList.contains('hidden'));await page.screenshot({path:out+'/after-desktop-drawer-open.png'});await page.locator('.elara-private-drawer [data-approved-wardrobe]').first().click();await page.waitForFunction(()=>!document.querySelector('.approved-wardrobe')?.hidden);await page.screenshot({path:out+'/after-desktop-drawer-popup.png'});await page.locator('.approved-wardrobe-window [data-close-wardrobe]').click();await page.waitForFunction(()=>document.querySelector('.approved-wardrobe')?.hidden);assert.equal(await page.locator('.elara-private-drawer').evaluate(el=>!el.classList.contains('hidden')),true,'Drawer closed after popup');await page.screenshot({path:out+'/after-desktop-drawer-restored.png'});}
 await page.close();
}
for(const width of [320,375,390,430]){
 const page=await browser.newPage({viewport:{width,height:659},deviceScaleFactor:1});await ready(page);
 assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).display),'none');
 assert.deepEqual(await page.locator('.bottom-nav [data-elara-tab]').evaluateAll(n=>n.map(x=>x.dataset.elaraTab)),mobileRoutes);
 for(const route of mobileRoutes)assert.equal(await visible(page.locator('.bottom-nav [data-elara-tab="'+route+'"]')),true,'mobile route hidden: '+route);
 assert.equal(await page.locator('.bottom-nav [data-elara-tab="home"]').getAttribute('aria-current'),'page');
 assert.equal(await visible(page.locator('#elara-account-menu-trigger')),true,'Mobile hamburger hidden');
 assert.equal(await page.locator('#ref-mobile-brand').count(),1,'Duplicate mobile brand');
 assert.equal(await page.locator('.topbar-leading').evaluate(el=>getComputedStyle(el,'::before').content),'none','Legacy pseudo brand must be removed');
 assert.equal(await visible(page.locator('.topbar .elara-profile')),false,'Legacy mobile profile control duplicated');
 assert.equal(await visible(page.locator('#ref-streak-card')),true,'Mobile streak missing');
 assert.equal(await visible(page.locator('.ref-hero-quote')),true,'Mobile Hero quote missing');
 const mobileHeroCopy=await bounds(page,'.ref-hero .hero-copy'),mobileHeroQuote=await bounds(page,'.ref-hero-quote');assert.ok(mobileHeroCopy.x<mobileHeroQuote.x,'Mobile Hero title/quote composition must match reference');
 assert.equal(await visible(page.locator('.ref-wellness-card')),true,'Mobile Wellness summary missing');
 assert.equal(await visible(page.locator('.ref-tasks')),true);assert.equal(await visible(page.locator('.ref-habits')),true);
 assert.equal(await visible(page.locator('.ref-goals')),false,'Goals preview must be removed only from Mobile Home');
 assert.equal(await page.locator('#ref-streak-card .ref-streak-flame').evaluate(img=>img.complete&&img.naturalWidth>0),true,'Mobile flame failed');
 assert.equal(await page.locator('.ref-missions .ref-missions-art').evaluate(img=>img.complete&&img.naturalWidth>0),true,'Mobile rocket failed');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,'Mobile horizontal overflow '+width+': '+overflow);
 const mobileMeasure={mode:'empty',viewport:width,header:await bounds(page,'.topbar'),hero:await bounds(page,'.ref-hero'),streak:await bounds(page,'#ref-streak-card'),tasks:await bounds(page,'.ref-tasks'),habits:await bounds(page,'.ref-habits'),wellness:await bounds(page,'.ref-wellness-card'),missions:await bounds(page,'.ref-missions'),ranks:await bounds(page,'.ref-ranks'),friends:await bounds(page,'.ref-activity'),bottomNav:await bounds(page,'.bottom-nav'),metrics:await pageMetrics(page),overflow};measurements.push(mobileMeasure);
 await page.screenshot({path:out+'/after-mobile-'+width+'-viewport.png',fullPage:false});await page.screenshot({path:out+'/after-mobile-'+width+'-full.png',fullPage:true});await page.close();
}
const dataPage=await browser.newPage({viewport:{width:390,height:659},deviceScaleFactor:1});await ready(dataPage);await dataPage.evaluate(()=>{const d=new Date(),iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`,today=iso(d);localStorage.setItem('elara_space_v1',JSON.stringify({xp:420,tasks:[{id:'t1',text:'مطالعه',priority:1,date:today,completed:false},{id:'t2',text:'تمرین',priority:2,date:today,completed:false},{id:'t3',text:'مرور زبان',priority:3,date:today,completed:false}],habits:[{id:'h1',title:'کتاب',days:[today]},{id:'h2',title:'حرکت',days:[]}],goals:[{id:'g1',title:'هدف نمونه تست',steps:[{text:'گام',done:true}]}],taskCompletionHistory:[{taskId:'old',date:today,key:'old:'+today}]}));window.dispatchEvent(new Event('elara:data-changed'));window.ElaraReferenceHome.render()});await dataPage.waitForTimeout(250);const dataRows=await dataPage.locator('.ref-task-row').count();assert.ok(dataRows>0&&dataRows<=2,'Mobile data preview must be capped without deleting data');const topbarDom=await dataPage.locator('.topbar').evaluate(el=>({html:el.innerHTML,children:[...el.children].map(x=>({tag:x.tagName,id:x.id,cls:x.className,text:(x.innerText||'').trim().replace(/\\s+/g,' '),display:getComputedStyle(x).display,visibility:getComputedStyle(x).visibility,width:Math.round(x.getBoundingClientRect().width)}))}));measurements.push({mode:'seeded-data',viewport:390,header:await bounds(dataPage,'.topbar'),hero:await bounds(dataPage,'.ref-hero'),streak:await bounds(dataPage,'#ref-streak-card'),tasks:await bounds(dataPage,'.ref-tasks'),habits:await bounds(dataPage,'.ref-habits'),wellness:await bounds(dataPage,'.ref-wellness-card'),missions:await bounds(dataPage,'.ref-missions'),ranks:await bounds(dataPage,'.ref-ranks'),friends:await bounds(dataPage,'.ref-activity'),bottomNav:await bounds(dataPage,'.bottom-nav'),metrics:await pageMetrics(dataPage),topbar:topbarDom});await dataPage.screenshot({path:out+'/after-mobile-390-data-viewport.png',fullPage:false});await dataPage.screenshot({path:out+'/after-mobile-390-data-full.png',fullPage:true});await dataPage.close();
writeFileSync(out+'/geometry.json',JSON.stringify(measurements,null,2));await browser.close();
console.log('PASS: real Chromium artwork/Home at desktop 1440/1648/1920, mobile 320/375/390/430, empty + seeded 390, Library focus, Drawer/popup and screenshots.');
