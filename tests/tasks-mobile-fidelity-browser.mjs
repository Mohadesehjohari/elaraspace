/* TASKS-MOBILE-FIDELITY: independent Chromium before/after geometry and task persistence gate.
   All test records live in isolated browser storage; no production user data is touched. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const beforeUrl=(process.env.TASKS_BEFORE_URL||'http://127.0.0.1:4174').replace(/\/$/,'');
const afterUrl=(process.env.TASKS_AFTER_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const widths=[320,360,375,390,412,430,768,1024,1440];
const dir='browser-artifacts/tasks-mobile-fidelity';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.ELARA_CHROMIUM_EXECUTABLE?{executablePath:process.env.ELARA_CHROMIUM_EXECUTABLE}:{})});
const cloudStub="window.ElaraAccount={user:null,profile:{name:'QA',username:'tasks_qa',xp:0,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true,groups:{list:async()=>[]},dm:{list:async()=>[]}};window.dispatchEvent(new Event('elara:social-updated'));";
const results={before:{},after:{}};

async function render(stage,url,width){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error.message||error)));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.addInitScript(()=>{
  if(sessionStorage.getItem('elara_tasks_mobile_qa_seeded')==='1')return;
  sessionStorage.setItem('elara_tasks_mobile_qa_seeded','1');
  const d=new Date();const day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const tasks=[
   ['مطالعه ریاضی','',2],['مرور زبان','language',3],['کتاب خواندن','book',4],
   ['تمرین ورزشی','exercise',3],['آماده‌سازی ارائه','',1],['مرتب کردن میز','habit',4],
   ['مرور یادداشت‌ها','language',2],['پاسخ به پیام‌ها','',4],
   ['خرید لوازم','',3],['برنامه‌ریزی هفتگی','goal',2]
  ].map(([text,sourceGroup,priority],i)=>({
   id:'tasks-mobile-fixture-'+i,text,sourceGroup,priority:String(priority),
   date:day,folder:'روزمره',list:'کارهای مهم',tag:'روزانه',
   completed:false,createdAt:100+i
  }));
  localStorage.setItem('elara_space_v1',JSON.stringify({
    version:1,theme:'dark',xp:0,
    taskLists:['کارهای مهم'],folders:['روزمره'],tags:['روزانه'],
    tasks,habits:[],goals:[],words:[],books:[],
    taskCompletionHistory:[],linkedTaskDismissals:[]
  }));
  localStorage.setItem('elara_task_view_mode','list');
 });
 await page.goto(url+'/#tasks',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#task-list .astra-task-row').first().waitFor({state:'visible',timeout:20000});
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting'),{timeout:15000}).catch(()=>{});
 await page.evaluate(()=>document.fonts.ready.then(()=>true));
 if(stage==='after')await page.waitForFunction(()=>[...document.styleSheets].some(s=>s.href?.includes('tasks-mobile-fidelity-20261012.css')),{timeout:12000});
 const geo=await page.evaluate(()=>{
   const rows=[...document.querySelectorAll('#task-list .astra-task-row')];
   const rects=rows.map(el=>el.getBoundingClientRect());
   const navbar=document.querySelector('.bottom-nav');
   const cutoff=navbar?.getBoundingClientRect().top||innerHeight;
   return {
    viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
    averageRowHeight:rects.reduce((a,b)=>a+b.height,0)/Math.max(1,rects.length),
    minRowHeight:Math.min(...rects.map(x=>x.height)),
    maxRowHeight:Math.max(...rects.map(x=>x.height)),
    visibleAboveNav:rects.filter(x=>x.top>=0&&x.bottom<=cutoff).length,
    rows:rects.length,
    fontSize:getComputedStyle(rows[0]?.querySelector('.item-title')).fontSize,
    metadataSize:getComputedStyle(rows[0]?.querySelector('.astra-task-core-meta>span')).fontSize,
    toolbarWidth:document.querySelector('#astra-task-toolbar')?.getBoundingClientRect().width,
    hasBottomNav:!!navbar&&getComputedStyle(navbar).display!=='none'
   };
 });
 if(stage==='after')assert.ok(geo.documentWidth<=geo.viewport+2,`${stage} ${width}px horizontal page overflow: ${geo.documentWidth}`);
 if(width<=700){
   assert.ok(geo.rows>=8,'Test setup did not render tasks');
   assert.ok(geo.hasBottomNav,'Mobile bottom navigation was lost');
 }
 if(stage==='after'&&width<=850){
   assert.ok(geo.averageRowHeight<102,`mobile task rows too tall: ${width}px ${geo.averageRowHeight}px`);
   assert.ok(parseFloat(geo.fontSize)>=15,'Mobile task title too small');
   assert.ok(parseFloat(geo.metadataSize)<=12,'Mobile task metadata too big');
 }
 await page.screenshot({path:`${dir}/${stage}-tasks-${width}.png`,fullPage:false});
 if([320,390,768].includes(width)){
   const add=page.locator('#elara-task-add-main');
   await add.click();
   const modal=page.locator('#task-composer-shell:not([hidden])');
   await modal.waitFor({state:'visible',timeout:5000});
   assert.ok(await page.locator('#task-title').isVisible(),'Task title missing from composer');
   assert.ok(await page.locator('#task-list-name').count(),'Real task list control missing');
   assert.ok(await page.locator('#task-recurrence').count(),'Scheduled repeat control missing');
   assert.ok(await page.locator('#task-daily-target-enabled').count(),'Daily repeat control missing');
   const modalBox=await modal.locator('.task-composer-window').boundingBox();
   assert.ok(modalBox&&modalBox.x>=-1&&modalBox.x+modalBox.width<=width+1,'Dialog overflows viewport width');
   assert.ok(modalBox.y>=-1&&modalBox.y+modalBox.height<=901,'Dialog overflows viewport height');
   await page.screenshot({path:`${dir}/${stage}-popup-${width}.png`,fullPage:false});
   await modal.locator('[data-composer-close]').click();
   assert.ok(await modal.isHidden(),'Popup close failed');
   if(stage==='after'){
   await add.click();
   await modal.waitFor({state:'visible',timeout:5000});
   const title=`Chromium QA ${stage} ${width}`;
   await page.locator('#task-title').fill(title);
   await page.locator('#task-priority').selectOption('2');
   await page.locator('#task-folder').selectOption('روزمره');
   await page.locator('#task-tag').selectOption('روزانه');
   await page.locator('#task-list-name').selectOption('کارهای مهم');
   await page.locator('#task-time').fill('15:45');
   await page.locator('#task-due').fill(await page.evaluate(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}));
   await page.locator('#task-submit').click();
   await page.waitForFunction(title=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}').tasks?.some(t=>t.text===title)}catch{return false}},title,{timeout:10000});
   const saved=await page.evaluate(title=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.text===title),title);
   assert.equal(String(saved.priority),'2','Priority persistence');
   assert.equal(saved.folder,'روزمره','Folder persistence');
   assert.equal(saved.tag,'روزانه','Tag persistence');
   assert.equal(saved.list,'کارهای مهم','List persistence');
   assert.equal(saved.time,'15:45','Time persistence');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#task-list .astra-task-row').first().waitFor({state:'visible',timeout:20000});
   const afterReload=await page.evaluate(title=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.some(t=>t.text===title),title);
   assert.ok(afterReload,'New task missing after reload');
   }
 }
 if(stage==='after')assert.deepEqual(errors,[],`${stage} ${width}px JavaScript page errors: ${errors.join('; ')}`);
 await page.close();
 return geo;
}
try{
 for(const [stage,url] of [['before',beforeUrl],['after',afterUrl]]){
  for(const width of widths){
   results[stage][width]=await render(stage,url,width);
   console.log(`TASKS ${stage} ${width}: height=${results[stage][width].averageRowHeight.toFixed(1)} visible=${results[stage][width].visibleAboveNav}`);
  }
 }
 for(const width of [320,360,375,390,412,430,768]){
  const prev=results.before[width],next=results.after[width];
  assert.ok(next.averageRowHeight+7<prev.averageRowHeight,`Task row height not materially reduced at ${width}`);
  assert.ok(next.visibleAboveNav>=prev.visibleAboveNav,`Fewer tasks visible after redesign at ${width}`);
 }
 await writeFile(`${dir}/measurements.json`,JSON.stringify(results,null,2));
 console.log('TASKS-MOBILE-FIDELITY PASS: nine widths, baseline comparison, modal, storage, refresh');
}finally{await browser.close()}
