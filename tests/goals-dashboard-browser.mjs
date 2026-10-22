/* Run with: ELARA_TEST_URL=http://127.0.0.1:4173 node tests/goals-dashboard-browser.mjs */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const cloudStub="window.ElaraAccount={user:null,profile:{name:'QA',username:'goal_qa',xp:1}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'))";
const socialStub="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true,groups:{list:async()=>[]},dm:{list:async()=>[]}}";
function seed(){localStorage.setItem('elara_space_v1',JSON.stringify({version:1,theme:'dark',xp:1,tasks:[],habits:[],goals:[{id:'g1',title:'یادگیری زبان',horizon:'short',priority:'2',steps:[{id:'s1',text:'گام یک',done:true},{id:'s2',text:'گام دو',done:false}]},{id:'g2',title:'پروژه',horizon:'long',priority:'1',steps:[{id:'s3',text:'گام سه',done:false}]}],books:[],words:[],folders:[],tags:[],taskLists:[],taskCompletionHistory:[],missionRewardClaims:[]}));localStorage.setItem('elara_locale_v1','fa')}
try{
 for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:width===390?844:950}});
  const page=await ctx.newPage();
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
  await page.addInitScript(seed);
  await page.goto(base+'/?goals-dashboard-qa='+Date.now()+'#goals',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#goal-list>.goal-item .goal-card-header');
  const n=()=>page.locator('#goal-list>.goal-item').count();
  assert.equal(await n(),2);
  assert.equal((await page.locator('[data-goal-stat="steps"]').textContent()).trim(),'۱ / ۳');
  assert.equal((await page.locator('[data-goal-stat="percent"]').textContent()).trim(),'۳۳٪');
  assert.equal(await page.locator('#goal-list [data-action="edit-goal"]').count(),2);
  const startingSteps=await page.locator('#goal-list [data-entity-id="g1"] .goal-step-item').evaluateAll(items=>items.map(el=>el.dataset.goalStepId));
  assert.deepEqual(startingSteps,['s2','s1'],'unfinished goal steps must precede completed ones without transition');
  await page.evaluate(()=>{window.__goalSounds=[];const original=ElaraAudio.cue;ElaraAudio.cue=function(type){window.__goalSounds.push(type);return original(type)}});
  assert.equal(await page.locator('#goal-list [data-entity-drag="goal"]').count(),2);
  // Every goal must start collapsed. User clicks alone should expand/collapse it.
  assert.equal(await page.locator('#goal-list>.goal-item.goal-card-open').count(),0);
  const toggle=page.locator('#goal-list>.goal-item').first().locator('[data-goal-toggle]');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#goal-list>.goal-item').first().locator('.goal-card-content').isVisible(),false);
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  // Normal-state glow should exist before hover/open, including on collapsed cards.
  const glow=await page.locator('#goal-list>.goal-item').last().evaluate(row=>getComputedStyle(row).boxShadow);
  assert.notEqual(glow,'none','Collapsed goal card must have persistent neon glow');
  await page.locator('#goal-list [data-action="toggle-step"][data-id="s2"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-goal-stat="percent"]')?.textContent?.trim()==='۶۷٪');
  assert.ok((await page.evaluate(()=>window.__goalSounds)).includes('goal'),'ticking a goal step must trigger an immediate dedicated sound');
  const order=await page.locator('#goal-list>.goal-item').evaluateAll(items=>items.map(el=>el.dataset.entityId));
  assert.deepEqual(order,['g2','g1'],'completed goal must move to bottom immediately');
  await page.locator('[data-goal-filter="horizon"]').selectOption('short');
  const visible=()=>page.locator('#goal-list>.goal-item').evaluateAll(a=>a.filter(x=>getComputedStyle(x).display!=='none').length);
  assert.equal(await visible(),1);
  await page.locator('[data-goal-filter="horizon"]').selectOption('all');
  await page.locator('[data-goal-search]').fill('پروژه');
  assert.equal(await visible(),1);
  await page.locator('[data-goal-search]').fill('');
  assert.equal(await page.locator('#goal-form').isVisible(),false);
  await page.locator('[data-goal-create]').click();
  assert.equal(await page.locator('#goal-form').isVisible(),true);
  await page.locator('#goal-title').fill('هدف جدید');
  await page.locator('#goal-form button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#goal-list>.goal-item').length===3);
  assert.equal(await page.locator('#goal-form').isVisible(),false);
  if(width===390){
   const size=await page.locator('#panel-goals').evaluate(x=>({w:x.clientWidth,scroll:x.scrollWidth}));
   assert.ok(size.scroll<=size.w+2,'mobile horizontal overflow '+JSON.stringify(size));
  }
  await ctx.close();
 }
 console.log('GOALS_DASHBOARD_PASS');
}finally{await browser.close()}