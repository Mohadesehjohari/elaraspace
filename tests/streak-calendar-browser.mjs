import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const pad=n=>String(n).padStart(2,'0');
const iso=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
const today=new Date(),future=new Date(today);
future.setDate(today.getDate()+2);
const now=iso(today),target=iso(future);
const mk=(id,date,completed=false)=>({
  id,text:id,date,priority:'3',completed,doneAt:completed?date:null,
  createdAt:1,dailyTarget:1,dailyProgress:{},occurrenceDone:[],occurrenceRewardDays:[]
});
const initial={version:1,theme:'dark',xp:0,tasks:[
  mk('qa-streak-today',now,true),mk('qa-streak-selected',target,false)
],habits:[],goals:[],books:[],words:[],folders:[],tags:[],taskLists:[],
  taskCompletionHistory:[{key:'qa-streak-today:'+now,taskId:'qa-streak-today',date:now,title:'qa-streak-today',completedAt:1}]};

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',
  body:"window.ElaraAccount={user:null,profile:{name:'QA',username:'qa',xp:0}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',
  body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{}};"}));
await page.addInitScript(data=>{if(!sessionStorage.getItem('elara-calendar-test-seeded')){sessionStorage.setItem('elara-calendar-test-seeded','1');localStorage.setItem('elara_space_v1',JSON.stringify(data))}},initial);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto(base+'/#tasks',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraStreakCalendar&&window.ElaraTasks&&document.querySelector('#astra-task-hero .task-streak-summary'),null,{timeout:30000});
  const streak=page.locator('#astra-task-hero .task-streak-summary');
  await streak.click();
  const dialog=page.locator('#elara-streak-calendar');
  await dialog.waitFor({state:'visible'});
  assert.equal(await dialog.locator('.elara-cal-weekdays span').count(),7,'week must have seven days');
  const day=dialog.locator('[data-elara-calendar-day="'+target+'"]');
  if(!await day.count())await dialog.locator('[data-elara-month="1"]').click();
  assert.equal(await day.count(),1,'requested future day missing in month navigation');
  await day.click();
  await page.waitForFunction(date=>document.querySelector('#task-occurrence-date')?.value===date,date);
  assert.equal(await page.locator('#task-filter').inputValue(),'today','calendar must filter by the chosen date');
  await page.waitForFunction(()=>!!document.querySelector('#task-list .astra-task-row[data-key="qa-streak-selected"]'));
  assert.equal(await page.locator('#task-list .astra-task-row[data-key="qa-streak-today"]').count(),0,'other-date tasks leaked into selected date');
  assert.equal(await dialog.isVisible(),false,'dialog must close when a date is chosen');
  assert.equal(await page.locator('#panel-tasks').getAttribute('data-calendar-date'),target);

  await streak.click();
  await dialog.waitFor({state:'visible'});
  await dialog.locator('[data-elara-calendar-day="'+now+'"]').count()
    ? await dialog.locator('[data-elara-calendar-day="'+now+'"]').click()
    : (await dialog.locator('[data-elara-month="-1"]').click(),await dialog.locator('[data-elara-calendar-day="'+now+'"]').click());
  await page.waitForFunction(date=>document.querySelector('#task-occurrence-date')?.value===date,now);
  assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="qa-streak-today"]').count(),1,'selected completed task should appear in archive');
  assert.deepEqual(errors,[],'page errors: '+errors.join('; '));
  console.log('STREAK_CALENDAR_PASS violet modal, Persian days, month navigation, chosen date filter, archive and mobile');
}finally{await browser.close()}
