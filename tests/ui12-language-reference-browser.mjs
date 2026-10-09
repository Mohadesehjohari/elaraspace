/* UI12 browser + evidence: run against checked-out branch and checked-out main. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const after=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const before=process.env.ELARA_BASELINE_URL||'http://127.0.0.1:4174';
const widths=[320,360,375,390,412,430,768,1440,1648];
const out='browser-artifacts/ui12';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const cloud="window.ElaraAccount={user:{uid:'ui12-me',email:'ui12@example.test',emailVerified:true},profile:{uid:'ui12-me',name:'QA',username:'ui12',profilePublic:true},logout:async()=>{}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'ui12-me',name:'QA',username:'ui12'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
function seed(mode){
 const d=new Date(),date=n=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
 const count=mode==='empty'?0:mode==='one'?1:13;
 const words=Array.from({length:count},(_,i)=>({id:'w'+i,front:'Word '+i,back:'ترجمه '+i,box:i%5+1,due:date(i%2===0?0:2)}));
 const tasks=Array.from({length:count},(_,i)=>({id:'t'+i,text:'تمرین زبان '+(i+1),priority:'4',date:date(0),sourceGroup:'language',completed:i%3===0,doneAt:i%3===0?date(0):null,occurrenceDone:[],recurrenceRule:null}));
 const classes=Array.from({length:count>1?6:count},(_,i)=>({id:'c'+i,title:'کلاس آزمایشی '+i,type:'offline',terms:1,sessionsPerTerm:10,durationMin:60,weekdays:[1,3],updatedAt:Date.now()-i*10000,sessionLogs:i%2?[{id:'s'+i,at:Date.now()}]:[]}));
 const languageBooks=Array.from({length:count>1?5:count},(_,i)=>({id:'lb'+i,title:'کتاب زبانی '+(i+1),shelf:'reading',totalPages:100,currentPage:i*17,readingLogs:i%2?[{date:date(0),pagesRead:8,fromPage:0,toPage:8,timestamp:Date.now()}]:[]}));
 const journal=Array.from({length:count>1?29:count},(_,i)=>({id:'j'+i,date:date(-i),minutes:(i%5+1)*9,words:i,note:''}));
 localStorage.setItem('elara_space_v1',JSON.stringify({version:1,tasks,words,languageClasses:classes,books:[],habits:[],goals:[],taskLists:[],folders:[],tags:[]}));
 localStorage.setItem('elara_language_books_v2',JSON.stringify(languageBooks));
 localStorage.setItem('elara_language_journal_v1_ui12-me',JSON.stringify(journal));
 localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',color:'blue',style:'default',language:'fa'}));
 localStorage.setItem('elara_locale_v1','fa');
}
async function setup(url,width,mode){
 const context=await browser.newContext({viewport:{width,height:width<=700?880:930},deviceScaleFactor:width<=700?2:1,isMobile:width<=700,hasTouch:width<=700});
 const page=await context.newPage();page.on('pageerror',e=>console.error('PAGE ERROR '+width+' '+e.message));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.addInitScript(seed,mode);
 await page.goto(url+'/?ui12='+width+'-'+mode+'#language',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.ElaraOpen&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
 await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
 return {page,context};
}
let passed=0;
for(const width of widths){
 const {page,context}=await setup(after,width,'many');
 try{
  await page.waitForSelector('#panel-language.ui12-language:not(.hidden) .ui12-board',{timeout:25000});
  const cells=page.locator('#panel-language .ui12-board > .ui12-card'),jumps=page.locator('#panel-language .ui12-shortcut');
  assert.equal(await cells.count(),8,'Eight language dashboard cards: '+width);
  assert.equal(await jumps.count(),8,'Eight language shortcuts: '+width);
  assert.match(await page.locator('#panel-language .ui12-hero').evaluate(el=>getComputedStyle(el).backgroundImage),/34-language-hero-banner\.webp/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,'Horizontal document overflow '+width+' '+overflow);
  const positions=await cells.evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.left,y:r.top,w:r.width,right:r.right}}));
  assert.ok(positions.every(r=>r.w>=90&&r.x>=-2&&r.right<=width+2),'Card outside viewport '+width+' '+JSON.stringify(positions));
  if(width>=390&&width<=430){
   assert.ok(Math.abs(positions.find(x=>x.id==='ui12-leitner').y-positions.find(x=>x.id==='ui12-tasks').y)<3,'First mobile row not paired');
   assert.ok(Math.abs(positions.find(x=>x.id==='ui12-books').y-positions.find(x=>x.id==='ui12-classes').y)<3,'Second mobile row not paired');
   assert.ok(Math.abs(positions.find(x=>x.id==='ui12-channels').y-positions.find(x=>x.id==='ui12-challenges').y)<3,'Third mobile row not paired');
  }
  if(width===430){
   const main=page.locator('.bottom-nav [data-elara-nav-kind="main"]');assert.equal(await main.count(),7,'Canonical seven mobile main nav changed');
   assert.equal(await page.locator('.bottom-nav [data-elara-tab="more"]').count(),0);
  }
  if(width>=1440)assert.ok(await page.locator('.sidebar').count()>0,'Desktop sidebar removed');
  assert.equal(await page.locator('#ui12-leitner .ui12-box').count(),5,'Leitner box counts');
  assert.equal(await page.locator('#ui12-books .ui12-book').count(),3,'Book preview must be capped at three');
  assert.equal(await page.locator('#ui12-tasks .ui12-task').count(),5,'Task preview must be capped at five');
  await page.screenshot({path:out+'/after-'+width+'.png',fullPage:true,animations:'disabled'});
  for(const id of ['overview','leitner','books','classes','channels','tasks','challenges','report']){
   await page.locator('[data-ui12-jump="'+id+'"]').click();
   assert.equal(await page.locator('[data-ui12-jump="'+id+'"]').getAttribute('class')?.includes('is-active'),true,'Shortcut '+id);
  }
  const value=await page.locator('#ui12-report .ui12-chart').innerHTML();
  await page.locator('#ui12-report [data-ui12-range="year"]').click();
  assert.notEqual(await page.locator('#ui12-report .ui12-chart').innerHTML(),value,'Report range did not update chart');
  await page.locator('#ui12-report [data-ui12-range="week"]').click();
  const old=await page.locator('#ui12-tasks .ui12-task [aria-pressed]').first().getAttribute('aria-pressed');
  await page.locator('#ui12-tasks .ui12-task [aria-pressed]').first().click();
  await page.waitForTimeout(150);
  const now=await page.locator('#ui12-tasks .ui12-task [aria-pressed]').first().getAttribute('aria-pressed');
  assert.notEqual(now,old,'Task completion must update canonical Tasks');
  const task=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(x=>x.id==='t1'));
  assert.ok(task,'Canonical task disappeared');
  await page.locator('#ui12-leitner [data-ui12-route="words"]').first().click();
  await page.waitForSelector('#panel-words:not(.hidden)');
  await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
  await page.locator('#ui12-books [data-ui12-route="language-books"]').first().click();
  await page.waitForSelector('#panel-language-books:not(.hidden)');
  await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
  await page.locator('#ui12-classes [data-ui12-new-class]').click();
  await page.waitForSelector('[data-language-class-form]',{timeout:10000});
  await page.keyboard.press('Escape');await page.waitForTimeout(70);
  console.log('UI12 PASS '+width);passed++;
 }catch(e){await page.screenshot({path:out+'/FAIL-'+width+'.png',fullPage:true}).catch(()=>{});throw e}
 finally{await context.close()}
}
for(const mode of ['empty','one']){
 const {page,context}=await setup(after,390,mode);
 try{
  await page.waitForSelector('#panel-language.ui12-language .ui12-board');
  const expected=mode==='empty'?0:1;
  assert.equal(await page.locator('#ui12-books .ui12-book').count(),expected,'Book fixtures '+mode);
  assert.equal(await page.locator('#ui12-leitner .ui12-box').count(),5);
  assert.equal(await page.locator('#ui12-channels .ui12-empty-state').count(),1);
  assert.equal(await page.locator('#ui12-challenges .ui12-empty-state').count(),1);
  if(mode==='empty')assert.equal(await page.locator('#ui12-report .ui12-chart').count(),0,'Zero data must not create chart');
  await page.screenshot({path:out+'/after-390-'+mode+'.png',fullPage:true});
 }finally{await context.close()}
}
for(const width of [390,1440]){
 try{const {page,context}=await setup(before,width,'many');await page.waitForTimeout(1400);await page.screenshot({path:out+'/before-'+width+'.png',fullPage:true});await context.close()}
 catch(e){console.warn('BASELINE screenshot unavailable: '+width+' '+e.message)}
}
await browser.close();
console.log('UI12_BROWSER_PASS '+passed+'/'+widths.length);
