import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const date=new Date(),day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const yesterdayDate=new Date(date);yesterdayDate.setDate(yesterdayDate.getDate()-1);
const yesterday=[yesterdayDate.getFullYear(),String(yesterdayDate.getMonth()+1).padStart(2,'0'),String(yesterdayDate.getDate()).padStart(2,'0')].join('-');
const seed={version:1,theme:'dark',xp:0,tasks:[
  {id:'qa-multi',text:'تست شمارنده ۰ تا ۳',date:day,priority:'3',completed:false,dailyTarget:3,dailyProgress:{},occurrenceDone:[],occurrenceRewardDays:[],createdAt:1},
  {id:'qa-single',text:'تست یک ثانیه طلایی',date:day,priority:'1',completed:false,dailyTarget:1,dailyProgress:{},occurrenceDone:[],occurrenceRewardDays:[],createdAt:2},
  {id:'qa-previous',text:'تسک تکمیل دیروز',date:yesterday,priority:'4',completed:true,doneAt:yesterday,dailyTarget:3,dailyProgress:{[yesterday]:3},occurrenceDone:[],occurrenceRewardDays:[],createdAt:3}
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
  assert.equal(await row('qa-multi').count(),1,'completed task should remain in place past the first second');
  assert.equal(await row('qa-multi').evaluate(x=>x.classList.contains('just-completed-gold')),false,'gold should end after one second');
  assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="qa-multi"]').count(),0,'archive should wait a full three seconds');
  await page.waitForTimeout(2150);
  assert.equal(await row('qa-multi').count(),1,'today completed row must remain in main tasks');
  assert.ok(await row('qa-multi').evaluate(el=>el.classList.contains('done-today')),'today completed task lost golden checked state');
  assert.equal(await page.locator('#task-list>.astra-task-row').last().getAttribute('data-key'),'qa-multi','today completed task should sort below active rows');
  assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="qa-multi"]').count(),0,'today task was archived before midnight');
  await page.waitForFunction(()=>!!document.querySelector('#task-checked-archive [data-task-archive-id="qa-previous"]'));
  await page.locator('#task-checked-archive summary').click();
  const archive=await page.locator('#task-checked-archive [data-task-archive-id="qa-previous"]').evaluate(x=>{
   const row=x.getBoundingClientRect(),button=x.querySelector('.task-archive-undo').getBoundingClientRect(),img=x.querySelector('.elara-uploaded-check').getBoundingClientRect();
   return {height:row.height,buttonWidth:button.width,imageWidth:img.width,imageHeight:img.height}
  });
  assert.ok(archive.height<=110,'archive row too tall '+JSON.stringify(archive));
  assert.ok(archive.imageWidth>=archive.buttonWidth*.9,'uploaded tick does not fill check tile '+JSON.stringify(archive));
  assert.ok(archive.height>0,'archive must be measurable when expanded');
  const archiveRadius=await page.locator('#task-checked-archive .task-archive-row').first().evaluate(x=>parseFloat(getComputedStyle(x).borderTopLeftRadius));
  assert.ok(archiveRadius>=18,'archive corner radius is too sharp');
  await page.locator('#task-checked-archive [data-task-archive-id="qa-previous"] .task-archive-undo').click();
  await page.waitForFunction(day=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.id==='qa-previous')?.dailyProgress?.[day]===0,yesterday);
  assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="qa-previous"]').count(),0,'restored prior-day occurrence remained archived');
  await row('qa-multi').locator('.check-button').click();
  await page.waitForFunction(day=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.id==='qa-multi')?.dailyProgress?.[day]===0,day);
  assert.ok((await row('qa-multi').locator('.task-round-count').textContent()).includes('۰/۳'),'restore from today completed must reset to zero');

  const addMain=page.locator('#elara-task-add-main');
  if(width<=767){const box=await addMain.boundingBox();assert.ok(box&&box.width>=250&&box.height>=54,'mobile add-task button is too small');}
  await addMain.click();
  await page.waitForSelector('#task-form:not([hidden])');
  const composer=await page.evaluate(()=>{
   const form=document.querySelector('#task-form'),descriptions=form?.querySelector(':scope>.task-description-fields'),grid=form?.querySelector(':scope>.form-grid'),title=form?.querySelector(':scope>.form-row');
   return {isBefore:!!descriptions&&!!grid&&!!title&&!!(title.compareDocumentPosition(descriptions)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(descriptions.compareDocumentPosition(grid)&Node.DOCUMENT_POSITION_FOLLOWING),submitWidth:form?.querySelector('#task-submit')?.getBoundingClientRect().width||0};
  });
  assert.ok(composer.isBefore,'short/full descriptions should be between title and other settings');
  if(width<=767)assert.ok(composer.submitWidth>=250,'mobile form submit button too narrow');
  await page.locator('[data-composer-close]').click();
  const toolbar=await page.locator('#astra-task-toolbar').boundingBox();
  const filter=await page.locator('#elara-task-filter-quick [data-task-more-filter]').boundingBox();
  assert.ok(filter&&toolbar&&filter.y>=toolbar.y-2&&filter.y+filter.height<=toolbar.y+toolbar.height+3,'Filter button should be inside the compact toolbar');
  await page.locator('#elara-task-filter-quick [data-task-more-filter]').click();
  assert.ok(await page.locator('#panel-tasks .astra-task-filters[open]').isVisible(),'filters should open as a viewport overlay');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#panel-tasks .astra-task-filters[open]').count(),0,'Escape must close filters');
  assert.deepEqual(errors,[],'uncaught JS errors '+errors.join(','));
  console.log('TASK_COMPLETION_FEEDBACK_PASS '+width+'px '+JSON.stringify(archive));
  await context.close();
 }
}finally{await browser.close()}
