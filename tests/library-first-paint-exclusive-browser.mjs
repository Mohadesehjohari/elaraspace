/* LIB-01 first paint integration: the old Books DOM must never be visible. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const cloud="window.ElaraAccount={user:{uid:'lib01-paint',emailVerified:true},profile:{uid:'lib01-paint',name:'QA'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'lib01-paint',name:'QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const inspect=()=>{const p=document.getElementById('panel-books');const kids=[...p.children];return{
 ready:p.dataset.lib01PaintReady||'',error:p.dataset.lib01PaintError||'',
 owner:!!p.querySelector(':scope > #lib01-overview .lib01-grid'),
 hero:!!p.querySelector(':scope > .elara-global-hero'),
 old: kids.filter(n=>!n.matches('#lib01-overview,.elara-global-hero')).filter(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.height>0}).map(n=>n.id||n.className),
 oldControls: ['#book-form','.bookshelf-filter','#book-list','#library-hero','.library-clips','.feature-hub-launchers'].filter(sel=>[...p.querySelectorAll(':scope > '+sel)].some(n=>getComputedStyle(n).display!=='none')),
 loading:getComputedStyle(p,'::before').content,
 };};
try{
 for(const [width,caseName] of [[390,'delay-owner'],[1440,'delay-global-banner']]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  if(caseName==='delay-owner')await page.route('**/lib01-library-dashboard.js*',async r=>{await sleep(2500);await r.continue()});
  else{
   await page.route('**/global-page-banner-20261009.js*',async r=>{await sleep(4200);await r.continue()});
   await page.route('**/feature-hubs-2026.js*',async r=>{await sleep(4800);await r.continue()});
  }
  await page.goto(base+'/?lib01-first-paint='+caseName+'#books',{waitUntil:caseName==='delay-owner'?'commit':'domcontentloaded',timeout:45000});
  if(caseName==='delay-owner'){
   await page.waitForFunction(()=>!!document.querySelector('#panel-books > #book-form'),null,{timeout:12000});
   // Simulate an already visible route while its deferred owner JavaScript is delayed.
   await page.evaluate(()=>{document.documentElement.removeAttribute('data-elara-booting');document.getElementById('panel-books').classList.remove('hidden')});
   const early=await page.evaluate(inspect);
   assert.equal(early.ready,'','Owner must still be pending before the delayed script returns');
   assert.deepEqual(early.old,[],'Original form/clip components flashed before owner mount: '+JSON.stringify(early));
   assert.deepEqual(early.oldControls,[],'Old Library controls exposed during first paint');
   assert.ok(early.loading.includes('کتابخانه'),'New-only loading state must be visible');
  }
  await page.waitForFunction(()=>document.querySelector('#panel-books')?.dataset.lib01PaintReady==='true',null,{timeout:35000});
  await page.waitForFunction(()=>typeof window.ElaraOpen==='function',null,{timeout:35000});
  await page.evaluate(()=>window.ElaraOpen('books',{history:'replace'}));
  const after=await page.evaluate(inspect);
  assert.equal(after.ready,'true','Canonical LIB-01 not ready: '+JSON.stringify(after));
  assert.equal(after.owner,true,'New real-data cards are missing');
  assert.equal(after.hero,true,'Only owner hero must display');
  assert.deepEqual(after.old,[],'Duplicate Books legacy DOM is still visible: '+JSON.stringify(after));
  assert.deepEqual(after.oldControls,[],'Old Books form/list is exposed: '+JSON.stringify(after));
  assert.equal(await page.locator('#panel-books #lib01-overview .lib01-shortcuts button').count(),6);
  await page.waitForFunction(()=>!!document.querySelector('#panel-library-shelves #lib02-scene'),null,{timeout:35000});
  await page.evaluate(()=>window.ElaraOpen('library-shelves',{history:'replace'}));
  await page.waitForSelector('#panel-library-shelves:not(.hidden) #lib02-scene');
  assert.equal(await page.locator('#book-form').count(),1,'Canonical book editor must be preserved, not deleted');
  assert.ok(errors.filter(x=>/LIB-01 owner mount/.test(x)).length===0,'Unexpected owner render exception');
  console.log('LIB01_FIRST_PAINT_PASS '+JSON.stringify({width,caseName,early:caseName==='delay-owner',after}));
  await context.close();
 }
}finally{await browser.close()}
