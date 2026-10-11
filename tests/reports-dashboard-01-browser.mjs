import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const origin=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const dateOffset=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const today=dateOffset(0),lastWeek=dateOffset(-15),now=Date.now();
const auth="window.ElaraAccount={user:{uid:'reports-fixture-01',email:'qa@example.invalid'},profile:{name:'QA',username:'qa'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.querySelector('#cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'reports-fixture-01',name:'QA',username:'qa'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const records=[
 {key:'task-1:'+today,taskId:'task-1',date:today,title:'تسک تستی امروز',completedAt:now-60000},
 {key:'task-1:'+today,taskId:'task-1',date:today,title:'تسک تستی تکراری',completedAt:now-60000},
 {key:'task-2:'+lastWeek,taskId:'task-2',date:lastWeek,title:'تسک قدیمی',completedAt:now-15*86400000}
];
const fixture={
 version:1,theme:'dark',xp:0,habits:[],goals:[],words:[],tasks:[
 {id:'task-1',text:'تسک تستی امروز',date:today,completed:true,doneAt:today,createdAt:now-100000},
 {id:'task-2',text:'تسک قدیمی',date:lastWeek,completed:true,doneAt:lastWeek,createdAt:now-15*86400000}
 ],taskCompletionHistory:records,focusSessions:[
 {id:'focus-done',completed:true,endedAt:now-4200000,startedAt:now-6000000,durationMin:25},
 {id:'focus-not-done',completed:false,endedAt:now-2400000,startedAt:now-3000000,durationMin:180}
 ],books:[{id:'book-1',title:'کتاب آزمایشی',shelf:'reading',totalPages:100,currentPage:8,readingLogs:[{date:today,timestamp:now-200000,fromPage:0,toPage:8,pagesRead:8}]}],folders:[],tags:[],taskLists:[]
};
const history=[{type:'wordsReviewed',value:1,date:today,at:now-50000,id:''},{type:'wordsReviewed',value:1,date:today,at:now-50000,id:''}];
await mkdir('browser-artifacts/reports01',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,360,375,390,412,430,768,1024,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<701?850:980},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(({fixture,history})=>{
   localStorage.setItem('elara_space_v1',JSON.stringify(fixture));
   localStorage.setItem('elara_report_history_v1_reports-fixture-01',JSON.stringify(history));
  },{fixture,history});
  await page.goto(origin+'/?reports01='+width+'#reports',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.ElaraReportsDashboard&&document.querySelector('#panel-reports #elara-reports-overview .elara-reports-kpis')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:40000});
  await page.evaluate(()=>window.ElaraOpen('reports',{history:'replace'}));
  await page.waitForSelector('#panel-reports:not(.hidden) .elara-reports-main');
  const stats=await page.evaluate(()=>{const p=document.getElementById('panel-reports'),d=window.ElaraReportsDashboard.data(),hero=p.querySelector('.elara-reports-hero'),styles=hero&&getComputedStyle(hero);return{
   kpis:p.querySelectorAll('.elara-reports-kpi').length,sections:p.querySelectorAll('.elara-reports-section').length,hero:p.querySelectorAll('.elara-reports-hero').length,
   background:styles?.backgroundImage||'',hiddenLegacy:p.querySelectorAll('.feature-hub-launchers[data-hub-kind="reports"]').length,
   scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
   taskCount:d.agg.tasks,focusMinutes:d.agg.focus,words:d.agg.words,reading:d.agg.reading,books:d.agg.books,days:d.n,auth:d.historyAvailable,hasReal:d.current.length>0
  }});
  assert.equal(stats.kpis,6,width+': exactly six KPI');
  assert.equal(stats.sections,6,width+': exactly six section routes');
  assert.equal(stats.hero,1,width+': only one Reports hero');
  assert.match(stats.background,/39-reports-hero-banner\.webp/,width+': real banner asset');
  assert.equal(stats.hiddenLegacy,0,width+': remove legacy Reports launcher shortcuts');
  assert.equal(stats.taskCount,2,width+': deduped completions');
  assert.equal(stats.focusMinutes,25,width+': only completed focus');
  assert.equal(stats.words,1,width+': duplicate review not counted');
  assert.equal(stats.reading,8,width+': canonical reading log');
  assert.equal(stats.books,1,width+': active book');
  assert.ok(stats.scroll<=stats.viewport+4,width+': document horizontal overflow '+JSON.stringify(stats));
  assert.equal(await page.locator('#panel-reports .elara-reports-periods button').count(),4);
  await page.locator('#panel-reports [data-reports-days="7"]').click();
  assert.equal(await page.evaluate(()=>window.ElaraReportsDashboard.data().agg.tasks),1,width+': weekly filter did not narrow completions');
  await page.locator('#panel-reports [data-reports-days="365"]').click();
  assert.equal(await page.evaluate(()=>window.ElaraReportsDashboard.data().n),365,width+': annual filter');
  await page.locator('#panel-reports [data-reports-days="90"]').click();
  assert.equal(await page.evaluate(()=>window.ElaraReportsDashboard.data().n),90,width+': quarterly filter');
  await page.locator('#panel-reports [data-reports-days="30"]').click();
  assert.equal(await page.evaluate(()=>window.ElaraReportsDashboard.data().n),30,width+': monthly filter');
  await page.locator('#panel-reports [data-reports-route="reports-today"]').first().click();
  await page.waitForSelector('#panel-reports-today:not(.hidden) .elara-reports-detail-head');
  await page.locator('#panel-reports-today [data-reports-route="reports"]').first().click();
  await page.waitForSelector('#panel-reports:not(.hidden) .elara-reports-kpis');
  await page.evaluate(()=>window.ElaraOpen('home',{history:'replace'}));
  await page.waitForSelector('#panel-home:not(.hidden) .ref-hero-actions');
  assert.equal(await page.locator('#panel-home .ref-hero-reports').count(),1,width+': do not duplicate home Reports CTA');
  assert.equal(await page.locator('#panel-home .ref-hero-continue').count(),1,width+': home Continue CTA preserved');
  await page.locator('#panel-home .ref-hero-reports').click();
  await page.waitForSelector('#panel-reports:not(.hidden) .elara-reports-kpis');
  if(width<=700)assert.equal(await page.locator('.bottom-nav [data-elara-nav-kind="main"]').count(),7,width+': seven mobile destinations preserved');
  if([390,1440,1648].includes(width))await page.screenshot({path:'browser-artifacts/reports01/reports-'+width+'.png',fullPage:true});
  assert.ok(!errors.some(x=>/reports-dashboard-01/.test(x)),width+': Reports module JavaScript exception '+errors.join(' | '));
  console.log('REPORTS01_PASS width='+width+' '+JSON.stringify(stats));
  await context.close();
 }
 // A second account cannot read device history belonging to the first.
 const context=await browser.newContext({viewport:{width:390,height:850}});
 const page=await context.newPage();
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth.replaceAll('reports-fixture-01','reports-fixture-02')}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social.replaceAll('reports-fixture-01','reports-fixture-02')}));
 await page.addInitScript(hist=>localStorage.setItem('elara_report_history_v1_reports-fixture-01',JSON.stringify(hist)),history);
 await page.goto(origin+'/?reports01=private#reports',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ElaraReportsDashboard&&window.ElaraAccount?.user?.uid==='reports-fixture-02',null,{timeout:30000});
 assert.equal(await page.evaluate(()=>window.ElaraReportsDashboard.data().agg.words),0,'cross-account review history leaked');
 console.log('REPORTS01_PRIVATE_HISTORY_PASS');
 await context.close();
}finally{await browser.close()}
