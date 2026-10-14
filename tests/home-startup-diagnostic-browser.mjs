import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const page=await browser.newPage({viewport:{width:1440,height:900}});
const events=[];
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')events.push(['console',m.text().slice(0,260)])});
page.on('pageerror',e=>events.push(['pageerror',e.message.slice(0,350)]));
page.on('requestfailed',r=>events.push(['requestfailed',r.url().split('/').pop(),r.failure()?.errorText]));
page.on('response',r=>{if(r.status()>=400)events.push(['response',r.status(),r.url().split('/').pop()])});
const state=async label=>page.evaluate(label=>({
 label,readyState:document.readyState,
 hash:location.hash,
 scripts:[...document.scripts].filter(s=>s.src).length,
 panels:[...document.querySelectorAll('[id^="panel-"]')].length,
 home:!!document.getElementById('panel-home'),
 grid:document.querySelector('#panel-home .elara-dashboard-grid')?.dataset.structureReady||'missing',
 hero:!!document.querySelector('#panel-home .elara-hero'),
 homeTasks:!!document.querySelector('#elara-home-tasks'),
 booting:document.documentElement.hasAttribute('data-elara-booting'),
 stage:window.__elaraBootStage,
 design:typeof window.ElaraOpen,
 reference:typeof window.ElaraReferenceHome?.render,
 nav:typeof window.ElaraNavigation?.render,
 errors:window.__elaraOptionalFailures||[],
 bootError:window.__elaraHomeError||'',
 main:!!document.getElementById('main'),
 cloudLayer:document.querySelector('#cloud-layer')?.hidden
}),label);
try{
 await page.goto(base+'/?diagnose=home#home',{waitUntil:'commit',timeout:15000});
 for (const [tag,ms] of [['T1',1000],['T3',2000],['T8',5000],['T16',8000]]) {
   await page.waitForTimeout(ms);
   console.log('HOME_DIAGNOSTIC '+JSON.stringify(await state(tag)));
   console.log('HOME_EVENTS '+tag+' '+JSON.stringify(events.slice(-12)));
 }
 const final=await state('final');
 assert.equal(final.home,true,'elara-design did not build #panel-home');
 assert.equal(final.grid,'true','reference Home did not compose dashboard');
 assert.equal(final.booting,false,'skeleton still showing despite built dashboard');
}finally {await browser.close()}
console.log('HOME_DIAGNOSTIC_PASS');
