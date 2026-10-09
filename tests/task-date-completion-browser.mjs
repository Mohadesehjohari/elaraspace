import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const pad=n=>String(n).padStart(2,'0'),iso=d=>pad(d.getFullYear())+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const d=new Date(),now=iso(d),offset=n=>{const x=new Date(d);x.setDate(x.getDate()+n);return iso(x)};
const past=offset(-1),future=offset(1);
const stubCloud="window.ElaraAccount={user:null,profile:{name:'Fidelity QA',username:'qa',xp:0}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const stubSocial="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const mk=(id,date,props={})=>({id,text:id,date,priority:'4',completed:false,createdAt:1,...props});
const seeded={version:1,theme:'dark',xp:0,taskCompletionHistory:[],folders:[],tags:[],taskLists:[],books:[],words:[],habits:[],
 goals:[{id:'goal',title:'هدف',steps:[{id:'step',text:'قدم هدف',done:false,occurrenceDone:[]}]}],
 tasks:[mk('past',past),mk('today',now),mk('future',future),
 mk('repeat',past,{recurrenceRule:{frequency:'daily',interval:1,startDate:past,endDate:null},occurrenceDone:[],occurrenceRewardDays:[]}),
 mk('shared',now,{collabSpaceId:'shared-space',sourceGroup:'personal'}),
 mk('goal-task',now,{linkedTask:true,sourceManaged:true,sourceCompletionLocked:false,sourceType:'goal-step',sourceGroup:'goal',sourceId:'step',sourceParentId:'goal',xpAwarded:true})]};
const page=await browser.newPage({viewport:{width:1440,height:950}});
await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:stubCloud}));
await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:stubSocial}));
await page.addInitScript(data=>{if(!localStorage.getItem('elara_space_v1'))localStorage.setItem('elara_space_v1',JSON.stringify(data))},seeded);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(base+'/#tasks',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&!!document.querySelector('#task-occurrence-date'),null,{timeout:30000});
 const select=async date=>{await page.locator('#task-occurrence-date').fill(date);await page.waitForTimeout(140)};
 const data=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));
 async function toggle(id,date){
  await select(date);
  const box=page.locator('#task-list .astra-task-row[data-key="'+id+'"] .check-button').first();
  assert.equal(await box.isDisabled(),false,id+' checkbox disabled on '+date);
  await box.click();
  await page.waitForFunction(id=>!!document.querySelector('#task-checked-archive [data-task-archive-id="'+id+'"]'),id);
  assert.equal(await page.locator('#task-list .astra-task-row[data-key="'+id+'"]').count(),0,'completed active row not removed');
  assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="'+id+'"] strong').evaluate(el=>getComputedStyle(el).textDecorationLine),'none','strikethrough in archive');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.querySelector('#task-occurrence-date')&& !document.documentElement.hasAttribute('data-elara-booting'));
  await select(date);
  assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="'+id+'"]').count(),1,'completion not persistent');
  await page.locator('#task-checked-archive [data-task-archive-id="'+id+'"] .task-archive-undo').click();
  await page.waitForFunction(id=>!!document.querySelector('#task-list .astra-task-row[data-key="'+id+'"]'),id);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.querySelector('#task-occurrence-date')&&!document.documentElement.hasAttribute('data-elara-booting'));
  await select(date);
  assert.equal(await page.locator('#task-list .astra-task-row[data-key="'+id+'"]').count(),1,'undo not persistent');
 }
 for(const [id,date] of [['past',past],['today',now],['future',future],['repeat',past],['repeat',now],['repeat',future],['shared',now],['goal-task',now]])await toggle(id,date);
 const after=await data();
 assert.equal(after.tasks.find(t=>t.id==='repeat').occurrenceDone.length,0,'recurring undo leaked an occurrence');
 assert.equal(after.goals[0].steps[0].done,false,'linked goal undo failed');
 assert.ok(!errors.length,'page errors: '+errors.join(';'));
 console.log('TASK_DATE_COMPLETION_PASS all dates, recurrence, linked goal/shared, reload/undo, no strikethrough');
} finally {await browser.close()}
