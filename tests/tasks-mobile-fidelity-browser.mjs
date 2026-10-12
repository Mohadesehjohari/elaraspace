/* Browser acceptance on the actual checked-out Elara app, not a visual mock.
 * QA data exists only in isolated browser localStorage, never Production. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const candidate=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const baseline=(process.env.ELARA_BASELINE_URL||'http://127.0.0.1:4174').replace(/\/$/,'');
const out='browser-artifacts/tasks-mobile-fidelity';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const cloud="window.ElaraAccount={user:{uid:'tasks-mobile-qa',emailVerified:true},profile:{uid:'tasks-mobile-qa',name:'QA',username:'tasks_mobile_qa',xp:0}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'tasks-mobile-qa',name:'QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const date=new Date();
const today=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const names=['مرور کتاب','تمرین زبان','ورزش صبحگاهی','آماده‌سازی گزارش','خرید روزانه','تمرین ریاضی'];
const taskSeed={
 version:1,theme:'dark',xp:0,habits:[],goals:[],books:[],words:[],folders:['کار'],tags:['مهم'],
 taskLists:['برنامه'],tasks:names.map((name,i)=>({
  id:'mobile-visual-qa-'+i,text:name,date:today,priority:String(i%4+1),sourceGroup:['language','personal','goal','habit','exercise','book'][i],
  folder:i%2?'کار':'',tag:i%2?'مهم':'',list:i%2?'برنامه':'',
  completed:false,shortDescription:'',description:'',
  recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{}
 }))
};
const reports={widths:[],baseline:null,created:false,errors:[]};

async function setup(width,base){
 const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.addInitScript(seed=>{if(sessionStorage.getItem('tasks-mobile-qa-seeded')==='1')return;sessionStorage.setItem('tasks-mobile-qa-seeded','1');localStorage.setItem('elara_space_v1',JSON.stringify(seed));localStorage.setItem('elara_locale_v1','fa')},taskSeed);
 await page.goto(base+'/?tasks-mobile-qa='+width+'#tasks',{waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>Boolean(window.ElaraOpen)&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
 await page.evaluate(()=>window.ElaraOpen('tasks',{history:'replace'}));
 await page.waitForFunction(()=>document.querySelectorAll('#panel-tasks #task-list>.astra-task-row').length>=4,null,{timeout:30000});
 return {page,context,errors};
}

async function measure(page,width){
 return page.evaluate((width)=>{
  const rows=[...document.querySelectorAll('#panel-tasks #task-list>.astra-task-row')];
  const rectangle=rows.map(x=>x.getBoundingClientRect());
  const title=rows[0]?.querySelector('.item-title');
  const metadata=rows[0]?.querySelector('.astra-task-core-meta>span');
  const hero=document.getElementById('astra-task-hero');
  const filter=document.querySelector('#panel-tasks .astra-task-filters');
  const chips=document.getElementById('astra-task-chips');
  const toolbar=document.getElementById('astra-task-toolbar');
  return {width,viewport:innerWidth,docWidth:document.documentElement.scrollWidth,
   rowHeights:rectangle.map(x=>Math.round(x.height)),averageHeight:Math.round(rectangle.reduce((s,x)=>s+x.height,0)/rectangle.length),
   titleFont:parseFloat(getComputedStyle(title).fontSize),titleWhiteSpace:getComputedStyle(title).whiteSpace,
   titleSamples:rows.map(row=>{let el=row.querySelector('.item-title');return {source:row.dataset.taskSource,value:getComputedStyle(el).whiteSpace,inlineStyle:el.getAttribute('style')||'',tag:el.tagName,cls:el.className}}),metaFont:metadata?parseFloat(getComputedStyle(metadata).fontSize):0,
   heroHeight:Math.round(hero.getBoundingClientRect().height),toolbarHeight:Math.round(toolbar.getBoundingClientRect().height),
   chipsWidth:Math.round(chips.getBoundingClientRect().width),
   filtersExpanded:Boolean(filter?.open),isRTL:getComputedStyle(rows[0]).direction==='rtl',
   firstTitle:title?.textContent?.trim()};
 },width);
}

async function modalShot(page,name) {
 await page.locator('#elara-task-add-main').click();
 await page.locator('#task-composer-shell:not([hidden]) #task-title').waitFor({timeout:10000});
 await page.screenshot({path:out+'/'+name+'.png',fullPage:false});
 const metrics=await page.evaluate(()=>{
  const dialog=document.getElementById('task-composer-shell');
  const windowEl=dialog.querySelector('.task-composer-window');
  const box=windowEl.getBoundingClientRect();
  return {visible:!dialog.hidden,scrollHeight:windowEl.scrollHeight,clientHeight:windowEl.clientHeight,
   box:{x:box.x,y:box.y,w:box.width,h:box.height},vp:{w:innerWidth,h:innerHeight},
   formIsOriginal:!!windowEl.querySelector('#task-form'),
   fields:['task-title','task-due','task-time','task-priority','task-folder','task-tag','task-list-name','task-source-group','task-daily-target-enabled','task-recurrence'].every(id=>Boolean(windowEl.querySelector('#'+id)))};
 });
 assert.ok(metrics.visible&&metrics.formIsOriginal&&metrics.fields,'real original composer was not opened');
 assert.ok(metrics.box.y>=-2&&metrics.box.y+metrics.box.h<=metrics.vp.h+2,'modal clips viewport: '+JSON.stringify(metrics));
 assert.ok(metrics.box.w<=metrics.vp.w+1,'modal wider than viewport');
 return metrics;
}

try {
 const old=await setup(390,baseline);
 reports.baseline=await measure(old.page,390);
 await old.page.screenshot({path:out+'/mobile-before-390.png',fullPage:false});
 await modalShot(old.page,'popup-before-390');
 await old.context.close();
 console.log('TASKS_BASELINE_390 '+JSON.stringify(reports.baseline));

 for(const width of [320,360,375,390,412,430,768,1024,1440]){
  const {page,context,errors}=await setup(width,candidate);
  const state=await measure(page,width);
  reports.widths.push(state);
  if(width===320){
   await page.screenshot({path:out+'/debug-after-320.png',fullPage:false});
   const debug=await page.evaluate(()=>{
    const row=document.querySelector('#task-list>.astra-task-row');
    const dims=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {cls:e.className,tag:e.tagName,x:r.x,y:r.y,w:r.width,h:r.height,display:s.display,minHeight:s.minHeight,margin:s.margin,padding:s.padding,order:s.order,position:s.position}};
    return {row:dims(row),nodes:[...row.children].map(dims)};
   });
   console.log('TASKS_DEBUG_320 '+JSON.stringify(debug));
  }
  assert.equal(state.isRTL,true,'RTL lost '+width);
  assert.ok(state.docWidth<=state.viewport+1,'horizontal overflow '+JSON.stringify(state));
  if(width<=430){
   assert.ok(state.averageHeight<=100,'rows too tall '+JSON.stringify(state));
   assert.ok(state.titleFont>=14,'title unreadable '+width);
   assert.ok(state.titleSamples.every(x=>x.value!=='nowrap'),'source-linked titles must wrap: '+JSON.stringify(state.titleSamples));
   assert.ok(state.metaFont<=12,'metadata too large '+width);
   assert.ok(state.heroHeight<=145,'hero too tall '+width);
   assert.equal(state.filtersExpanded,false,'advanced filters should start collapsed '+width);
  }
  if(width===390){
   await page.screenshot({path:out+'/mobile-after-390.png',fullPage:false});
   const modal=await modalShot(page,'popup-after-390');
   assert.ok(modal.clientHeight<=modal.scrollHeight,'modal scroll geometry');
   const input=page.locator('#task-title');
   assert.equal(await input.evaluate(el=>el.checkValidity()),false,'empty title validation');
   await input.fill('ثبت تسک توسط آزمون Chromium');
   await page.locator('#task-priority').selectOption('2');
   await page.locator('#task-folder').selectOption('کار');
   await page.locator('#task-tag').selectOption('مهم');
   await page.locator('#task-list-name').selectOption('برنامه');
   await page.locator('#task-due').fill(today);
   await page.locator('#task-time').fill('14:30');
   await page.locator('#task-daily-target-enabled').check();
   await page.locator('#task-daily-target').fill('2');
   await page.locator('#task-recurrence').check();
   await page.locator('#task-frequency').selectOption('daily');
   await page.locator('#task-interval').fill('2');
   await page.locator('#task-submit').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').tasks?.some(t=>t.text==='ثبت تسک توسط آزمون Chromium'),null,{timeout:12000});
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').tasks.find(t=>t.text==='ثبت تسک توسط آزمون Chromium'));
   assert.equal(String(stored.priority),'2');assert.equal(stored.folder,'کار');assert.equal(stored.tag,'مهم');assert.equal(stored.list,'برنامه');
   assert.equal(stored.time,'14:30');assert.equal(stored.dailyTarget,2);assert.equal(stored.recurrenceRule.interval,2);
   reports.created=true;
   // Reload in the same browser context; the canonical app must read its own stored task.
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>Boolean(window.ElaraOpen),null,{timeout:20000});
   const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').tasks.some(t=>t.text==='ثبت تسک توسط آزمون Chromium'));
   assert.ok(persisted,'new task lost on refresh');
  }
  if(width===360||width===1440)await page.screenshot({path:out+'/candidate-'+width+'.png',fullPage:false});
  reports.errors.push({width,errors});
  await context.close();
  console.log('TASKS_MOBILE_WIDTH_PASS '+JSON.stringify(state));
 }
 assert.ok(reports.widths.find(x=>x.width===390).averageHeight<reports.baseline.averageHeight,'mobile rows not shorter than baseline');
 assert.ok(reports.created,'canonical submission not exercised');
 console.log('TASKS_MOBILE_FIDELITY_BROWSER_PASS');
}finally{
 writeFileSync(out+'/metrics.json',JSON.stringify(reports,null,2));
 await browser.close();
}
