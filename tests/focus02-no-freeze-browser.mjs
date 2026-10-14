import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  // Intentionally withhold the feature header that used to trigger endless mounts.
  await page.route('**/feature-hubs-2026.js*',async route=>{await new Promise(resolve=>setTimeout(resolve,3700));await route.continue()});
  await page.goto(base+'/?focus02-deadlock='+width+'#home',{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!document.querySelector('#panel-home.ref-home .elara-dashboard-grid[data-structure-ready="true"]'),null,{timeout:15000});
  const first=await page.evaluate(()=>{
   const root=document.querySelector('#panel-focus-pomodoro');
   return {count:root?.querySelectorAll('.elara-focus-mode-options').length,
    expand:!!root?.querySelector('#elara-focus-expand'),
    mounted:!!root?.querySelector('.elara-focus-view-actions')?.isConnected,
    panel:!!document.querySelector('#panel-home.ref-home'),boot:document.documentElement.hasAttribute('data-elara-booting')};
  });
  assert.equal(first.count,1,'Mode controls duplicated during deferred header mount');
  assert.equal(first.expand,true,'Fullscreen control is not in DOM');
  assert.equal(first.mounted,true,'Controls are detached and will cause observer recursion');
  assert.equal(first.panel,true,'Home missing');
  assert.equal(first.boot,false,'Old boot skeleton remained');
  await page.evaluate(()=>{
   const root=document.getElementById('panel-focus-pomodoro');
   for(let i=0;i<15;i++){const div=document.createElement('div');root.append(div);div.remove()}
  });
  await page.waitForTimeout(600);
  const after=await page.evaluate(()=>({
    modes:document.querySelectorAll('#panel-focus-pomodoro .elara-focus-mode-options').length,
    expand:document.querySelectorAll('#panel-focus-pomodoro #elara-focus-expand').length,
    responsive:true
  }));
  assert.equal(after.modes,1,'MutationObserver recreated the mode controls');
  assert.equal(after.expand,1,'Fullscreen button duplicated');
  assert.deepEqual(errors,[],'Runtime JS errors');
  console.log('FOCUS02_NO_FREEZE_PASS '+JSON.stringify({width,first,after}));
  await page.close();
 }
}finally{await browser.close()}
console.log('FOCUS02_NO_FREEZE_ALL_PASS');
