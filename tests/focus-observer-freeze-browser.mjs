import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?focus-observer-regression='+width+'#home',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!document.querySelector('#panel-home .elara-dashboard-grid[data-structure-ready="true"]'),null,{timeout:18000});
  const initial=await page.evaluate(()=>({
   home:!!document.querySelector('#panel-home .elara-hero'),
   timerCount:document.querySelectorAll('#timer-display').length,
   focusReady:document.querySelector('#panel-focus-pomodoro')?.dataset.focusRefReady||''
  }));
  assert.equal(initial.home,true,'New Home owner not mounted');
  assert.equal(initial.timerCount,1,'Canonical timer missing or duplicated');
  const stage=await page.evaluate(()=>{
   const p=document.querySelector('#panel-focus-pomodoro');
   const txt=p?.querySelector('[data-focus-task-name]');
   if(txt)txt.textContent='Checking observer idempotency';
   window.ElaraFocusReference03?.refresh?.();
   window.dispatchEvent(new Event('elara:data-changed'));
   return {changed:!!txt,ready:p?.dataset.focusRefReady||''};
  });
  await page.waitForTimeout(1000);
  // An infinite observer/microtask loop prevents this evaluation from completing.
  const after=await page.evaluate(()=>({
   home:!!document.querySelector('#panel-home.ref-home .elara-hero'),
   focusReady:document.querySelector('#panel-focus-pomodoro')?.dataset.focusRefReady||'',
   booting:document.documentElement.hasAttribute('data-elara-booting'),
   errors:window.__elaraHomeError||''
  }));
  assert.equal(after.home,true,'Home disappeared after Focus DOM update');
  assert.equal(after.booting,false,'Boot skeleton remained after Home built');
  assert.equal(after.focusReady,'true','Focus controls did not settle');
  assert.deepEqual(errors,[],'Client runtime errors');
  console.log('FOCUS_OBSERVER_STABLE_PASS '+JSON.stringify({width,initial,stage,after}));
  await page.close();
 }
}finally{await browser.close()}
console.log('FOCUS_OBSERVER_ALL_PASS');
