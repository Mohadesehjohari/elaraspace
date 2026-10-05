import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const base='http://127.0.0.1:4173',out='browser-artifacts/direct-reference';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1672,height:941},deviceScaleFactor:1});
const page=await context.newPage();
const errors=[],badConsole=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')badConsole.push(m.text())});
await page.addInitScript(()=>{
 const d=new Date(),pad=n=>String(n).padStart(2,'0'),today=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
 const y=new Date(d);y.setDate(y.getDate()-1);const yesterday=`${y.getFullYear()}-${pad(y.getMonth()+1)}-${pad(y.getDate())}`;
 localStorage.setItem('elara_space_v1',JSON.stringify({
  version:1,xp:1240,taskLists:['ریاضی','کار'],folders:['درس'],tags:['مهم'],
  taskCompletionHistory:[
   {taskId:'done-1',date:today,key:'done-1:'+today},{taskId:'old',date:yesterday,key:'old:'+yesterday}
  ],
  tasks:[
   {id:'t1',text:'دانلود ریاضی معین کرمی',date:today,priority:'2',list:'ریاضی',folder:'درس',tag:'مهم',completed:false,createdAt:1},
   {id:'t2',text:'دانلود خلاصه‌نویسی',date:today,priority:'4',completed:false,createdAt:2},
   {id:'t3',text:'دانلود انیمیشن و سریال',date:today,priority:'4',completed:false,createdAt:3},
   {id:'h-task',text:'تمرین عادت',date:today,priority:'3',sourceGroup:'habit',sourceLabel:'عادت',completed:false,createdAt:4},
   {id:'lang-task',text:'تمرین زبان',date:today,priority:'4',sourceGroup:'language',sourceLabel:'زبان',completed:false,createdAt:5},
   {id:'sport-task',text:'تمرین ورزشی',date:today,priority:'3',sourceGroup:'exercise',sourceLabel:'ورزش',completed:true,doneAt:today,createdAt:6},
   {id:'old',text:'خرید لنتوری',date:yesterday,priority:'4',completed:true,doneAt:yesterday,createdAt:0}
  ],
  habits:[
   {id:'h1',title:'مطالعه',days:[today]},
   {id:'h2',title:'ورزش صبحگاهی',days:[]},
   {id:'h3',title:'آب',days:[today]},
   {id:'h4',title:'خواب',days:[]}
  ],
  goals:[
   {id:'g1',title:'تسلط بر زبان انگلیسی',steps:[{id:'s1',text:'تمرین امروز',done:true}]},
   {id:'g2',title:'مطالعه ۲۴ کتاب در سال',steps:[{id:'s2',text:'کتاب ماه',done:false}]},
   {id:'g3',title:'تناسب اندام و سلامتی',steps:[{id:'s3',text:'تمرین',done:false}]}
  ]
 }));
 localStorage.setItem('elara_locale_v1','fa');
});
await page.goto(base+'/#home',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.ElaraNavigation&&window.ElaraReferenceHome&&typeof window.ElaraOpen==='function',null,{timeout:30000});
await page.addStyleTag({content:'#cloud-layer{display:none!important}body:not(.cloud-ready) .shell,body.cloud-locked .shell,body:not(.cloud-ready) .bottom-nav{visibility:visible!important}*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');ElaraNavigation.render();ElaraReferenceHome.render();ElaraOpen('home',{history:'replace'})});
await page.waitForTimeout(350);

const rect=async s=>{const b=await page.locator(s).first().boundingBox();assert.ok(b,'missing '+s);return b};
const near=(a,b,t,label)=>assert.ok(Math.abs(a-b)<=t,`${label}: ${a} vs ${b}`);
const visible=async s=>page.locator(s).first().isVisible();

const evidence={viewport:{width:1672,height:941},home:{},tasks:{}};
const sidebar=await rect('.sidebar'),header=await rect('.topbar'),search=await rect('#ref-header-search'),hero=await rect('#panel-home .ref-hero');
assert.ok(sidebar.width>=225&&sidebar.width<=240,'sidebar width '+sidebar.width);
assert.ok(header.height>=58&&header.height<=68,'header height '+header.height);
assert.ok(search.width>=420&&search.width<=490,'search width '+search.width);
assert.ok(hero.height>=188&&hero.height<=204,'home hero height '+hero.height);
assert.equal(await visible('#panel-home .ref-hero-continue'),true,'continue CTA missing');
assert.equal(await page.locator('#panel-home .ref-quick-card').count(),6,'quick access count');
assert.equal(await visible('#ref-header-account'),true,'profile missing');
assert.equal(await visible('#ref-header-notifications'),true,'bell missing');
assert.equal(await page.locator('.topbar [aria-label="تنظیمات"]:visible').count(),0,'gear/settings exposed in header');

const four=await Promise.all(['#ref-streak-card','.ref-tasks','.ref-wellness-card','.ref-goals'].map(rect));
assert.ok(Math.max(...four.map(x=>x.y))-Math.min(...four.map(x=>x.y))<=3,'main four not aligned');
for(const b of four)assert.ok(b.height>=244&&b.height<=258,'main card height '+b.height);
const bottom=await Promise.all(['.ref-ranks','.ref-habits','.ref-achievements'].map(rect));
assert.ok(Math.max(...bottom.map(x=>x.y))-Math.min(...bottom.map(x=>x.y))<=3,'bottom row not aligned');
assert.ok(bottom[1].width>bottom[0].width&&bottom[1].width>bottom[2].width,'habits is not wider middle card');
assert.equal(await visible('.ref-missions'),false,'missions should not duplicate reference Home');
assert.equal(await visible('.ref-activity'),false,'friend activity should not duplicate reference Home');
evidence.home={sidebar,header,search,hero,four,bottom,quickCount:6};
await page.screenshot({path:out+'/direct-home-1672x941.png',fullPage:false});

await page.evaluate(()=>ElaraOpen('tasks',{history:'replace'}));
await page.waitForFunction(()=>location.hash==='#tasks');
await page.waitForTimeout(250);
const taskHero=await rect('#astra-task-hero'),toolbar=await rect('#astra-task-toolbar'),cta=await rect('#elara-task-add-main'),row=await rect('#task-list>.astra-task-row'),check=await rect('#task-list>.astra-task-row .check-button');
assert.ok(taskHero.height>=115&&taskHero.height<=130,'task streak banner height '+taskHero.height);
assert.ok(toolbar.height>=50&&toolbar.height<=72,'task toolbar height '+toolbar.height);
assert.ok(cta.width>=200&&cta.width<=225,'CTA width '+cta.width);
assert.ok(cta.height>=48&&cta.height<=53,'CTA height '+cta.height);
assert.match(await page.locator('#elara-task-add-main').innerText(),/افزودن کار/);
assert.ok(row.height>=68&&row.height<=78,'task row height '+row.height);
near(check.width,check.height,1,'task checkbox square');
assert.ok((await page.locator('#task-list>.astra-task-row').count())>=5,'task rows missing');
assert.equal(await visible('#task-checked-archive'),true,'completed container missing');
assert.match(await page.locator('#task-checked-archive h2').innerText(),/کارهای تیک‌خورده/);
const colors=await page.locator('#task-list>.astra-task-row').evaluateAll(rows=>rows.map(r=>({source:r.dataset.taskSource,border:getComputedStyle(r).borderInlineStartColor})));
assert.ok(new Set(colors.map(x=>x.border)).size>=3,'category accents not distinct');
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'horizontal overflow');
evidence.tasks={taskHero,toolbar,cta,row,check,rowCount:await page.locator('#task-list>.astra-task-row').count(),colors};
await page.screenshot({path:out+'/direct-tasks-1672x941.png',fullPage:false});

// Interaction smoke: canonical add form, filter, completion, profile, notifications.
await page.locator('#elara-task-add-main').click();
assert.equal(await visible('#task-form'),true,'add form did not open');
await page.locator('#task-title').fill('QA reference add');
await page.locator('#task-submit').click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.some(t=>t.text==='QA reference add'));
const first=page.locator('#task-list>.astra-task-row').first().locator('.check-button:not([disabled])');
if(await first.count()){const before=await first.getAttribute('aria-pressed');await first.click();await page.waitForTimeout(80);assert.notEqual(await first.getAttribute('aria-pressed'),before,'task completion did not toggle')}
await page.evaluate(()=>ElaraOpen('home',{history:'replace'}));await page.waitForTimeout(120);
await page.locator('#ref-header-account').click();await page.waitForTimeout(80);assert.ok(await page.locator('.elara-private-drawer:not(.hidden)').count(),'profile drawer did not open');
await page.keyboard.press('Escape');await page.waitForTimeout(60);
assert.deepEqual(errors,[],'page errors');
assert.deepEqual(badConsole.filter(x=>!/Firebase|network|social startup/i.test(x)),[],'console errors');
writeFileSync(out+'/direct-reference-metrics.json',JSON.stringify(evidence,null,2));
await context.close();await browser.close();
console.log('PASS direct-reference visual QA 1672x941');
