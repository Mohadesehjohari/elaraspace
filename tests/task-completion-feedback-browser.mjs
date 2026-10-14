import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const date=new Date(),day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const seed={version:1,theme:'dark',xp:0,tasks:[
  {id:'qa-multi',text:'تست شمارنده ۰ تا ۳',date:day,priority:'3',completed:false,dailyTarget:3,dailyProgress:{},occurrenceDone:[],occurrenceRewardDays:[],createdAt:1},
  {id:'qa-single',text:'تست یک ثانیه طلایی',date:day,priority:'1',completed:false,dailyTarget:1,dailyProgress:{},occurrenceDone:[],occurrenceRewardDays:[],createdAt:2}
],habits:[],goals:[],books:[],words:[],taskLists:['لیست آزمایشی'],folders:['پوشه آزمایشی'],taskListDetails:{'لیست آزمایشی':{folder:'پوشه آزمایشی',description:'QA'}},tags:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraAccount={user:null,profile:{name:'QA',username:'qa',xp:0}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{}};"}));
  await page.addInitScript(data=>{if(sessionStorage.getItem('elara-task-feedback-seeded'))return;sessionStorage.setItem('elara-task-feedback-seeded','yes');localStorage.setItem('elara_space_v1',JSON.stringify(data))},seed);
  await page.goto(base+'/?completion-qa='+width+'#tasks',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraTasks&&document.querySelector('#task-list .astra-task-row[data-key="qa-multi"]'),null,{timeout:30000});
  const row=id=>page.locator('#task-list .astra-task-row[data-key="'+id+'"]');
  const count=()=>page.evaluate(date=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.id==='qa-multi')?.dailyProgress?.[date]||0,day);
  assert.equal(await count(),0,'must start at 0/3');
  for(let n=1;n<=2;n++){
   await row('qa-multi').locator('.check-button').click();
   await page.locator('.elara-task-decision [data-task-decision="done"]').click();
   await page.waitForFunction(([d,n])=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.id==='qa-multi')?.dailyProgress?.[d]===n,[day,n],{timeout:10000});
   assert.equal(await count(),n,'daily count did not advance');
   assert.match((await row('qa-multi').locator('.task-round-count').textContent()).replace(/[\u06f0-\u06f9]/g,ch=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch))),new RegExp('^'+n+'/3$'),'visible count stayed at zero');
   assert.ok(await row('qa-multi').evaluate(x=>x.classList.contains('just-completed-gold')),'gold flash absent');
   await page.waitForTimeout(1200);
  }
  await row('qa-multi').locator('.check-button').click();
  await page.locator('.elara-task-decision [data-task-decision="done"]').click();
  await page.waitForFunction(d=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.id==='qa-multi')?.dailyProgress?.[d]===3,day);
  assert.ok(await row('qa-multi').isVisible(),'completed row must remain visible immediately');
  assert.ok(await row('qa-multi').evaluate(x=>x.classList.contains('just-completed-gold')),'complete row must glow gold first');
  assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="qa-multi"]').count(),0,'archive moved too soon');
  await page.waitForTimeout(1200);
  assert.equal(await row('qa-multi').count(),0,'completed row did not move after one second');
  assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="qa-multi"]').count(),1,'completed task did not reach archive');
  await page.locator('#task-checked-archive [data-task-archive-id="qa-multi"] .task-archive-undo').click();
  await page.waitForFunction(day=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.id==='qa-multi')?.dailyProgress?.[day]===0,day);
  assert.ok((await row('qa-multi').locator('.task-round-count').textContent()).includes('۰/۳'),'restore from completed must reset to zero');
  const archive=await page.locator('#task-checked-archive [data-task-archive-id="qa-multi"]').evaluate(x=>{
   const row=x.getBoundingClientRect(),button=x.querySelector('.task-archive-undo').getBoundingClientRect(),img=x.querySelector('.elara-uploaded-check').getBoundingClientRect();
   return {height:row.height,buttonWidth:button.width,imageWidth:img.width,imageHeight:img.height}
  });
  assert.ok(archive.height<=110,'archive row too tall '+JSON.stringify(archive));
  assert.ok(archive.imageWidth>=archive.buttonWidth*.9,'uploaded tick does not fill check tile '+JSON.stringify(archive));
  const toolbar=await page.locator('#astra-task-toolbar').boundingBox();
  const filter=await page.locator('#elara-task-page-actions [data-task-more-filter]').boundingBox();
  assert.ok(filter&&toolbar&&filter.y<=toolbar.y+1,'Filter button should appear above toolbar');
  assert.deepEqual(errors,[],'uncaught JS errors '+errors.join(','));
  console.log('TASK_COMPLETION_FEEDBACK_PASS '+width+'px '+JSON.stringify(archive));
  await context.close();
 }
}finally{await browser.close()}
