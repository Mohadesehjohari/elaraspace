import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try {
 for(const width of [390,768,1440]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // FOCUS-03 is deliberately slow; users must never see the original legacy timer.
  await page.route('**/focus-setup-reference-03.js*',async route=>{
    await new Promise(resolve=>setTimeout(resolve,1900));
    await route.continue();
  });
  await page.goto(base+'/?focus-owner-qa='+width+'#focus-pomodoro',{waitUntil:'commit',timeout:45000});
  await page.waitForFunction(()=>!!document.querySelector('#panel-focus-pomodoro > .focus-card #timer-display'),null,{timeout:12000});
  const initial=await page.evaluate(()=>{
    const panel=document.getElementById('panel-focus-pomodoro');
    panel.classList.remove('hidden');
    return {
      parent:document.querySelector('#timer-display')?.closest('.panel')?.id,
      count:document.querySelectorAll('#timer-display').length,
      sourceCount:document.querySelectorAll('#panel-focus .focus-card').length,
      libraryLegacy:!!document.querySelector('#ref-library-focus .focus-card'),
      ownerReady:panel.dataset.focusRefReady||'',
      prematureVisible:getComputedStyle(panel.querySelector(':scope > .focus-card')).visibility,
      sourceText:document.querySelector('#panel-focus')?.textContent||''
    };
  });
  assert.equal(initial.parent,'panel-focus-pomodoro','Canonical timer must start in the new route');
  assert.equal(initial.count,1,'Exactly one real focus timer is allowed');
  assert.equal(initial.sourceCount,0,'Legacy focus timer was created at startup');
  assert.equal(initial.libraryLegacy,false,'Timer was moved through Library');
  assert.equal(initial.prematureVisible,'hidden','Incomplete/legacy timer flashed before owner hydration');
  assert.ok(!initial.sourceText.includes('زمان‌سنج پومودورو ۲۵ دقیقه‌ای'),'Obsolete Pomodoro splash text returned');
  await page.waitForFunction(()=>document.querySelector('#panel-focus-pomodoro[data-focus-ref-ready="true"] .focus-ref-side')&&
    !!document.querySelector('#panel-focus-pomodoro .focus-card .focus-config')&&
    !document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
  const final=await page.evaluate(()=>{
    const p=document.getElementById('panel-focus-pomodoro'),card=p.querySelector(':scope > .focus-card');
    return {
      parent:document.getElementById('timer-display').closest('.panel')?.id,
      oldCount:document.querySelectorAll('#panel-focus .focus-card,#ref-library-focus .focus-card').length,
      oneTimer:document.querySelectorAll('#timer-display').length,
      cardVisible:getComputedStyle(card).visibility,
      modes:p.querySelectorAll('.elara-focus-mode-options button').length,
      controls:['timer-start','timer-reset','focus-duration'].every(id=>!!document.getElementById(id)),
      ownerReady:p.dataset.focusRefReady
    };
  });
  assert.equal(final.parent,'panel-focus-pomodoro');
  assert.equal(final.oldCount,0,'Timer returned to a legacy container');
  assert.equal(final.oneTimer,1);
  assert.equal(final.cardVisible,'visible','New Pomodoro owner never became visible');
  assert.equal(final.modes,4);
  assert.equal(final.controls,true,'Canonical timer buttons or duration selector missing');
  assert.equal(final.ownerReady,'true');
  assert.deepEqual(errors,[],'Unexpected JavaScript runtime error');
  console.log('FOCUS_OWNER_FIRST_PAINT_PASS '+JSON.stringify({width,initial,final}));
  await context.close();
 }
}finally{await browser.close()}
console.log('FOCUS_OWNER_FIRST_PAINT_ALL_PASS');
