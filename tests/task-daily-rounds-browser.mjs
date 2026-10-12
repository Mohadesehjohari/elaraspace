import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const nowDate=new Date();
const date=[nowDate.getFullYear(),String(nowDate.getMonth()+1).padStart(2,'0'),String(nowDate.getDate()).padStart(2,'0')].join('-');
const yesterday=new Date(nowDate);yesterday.setDate(yesterday.getDate()-1);
const start=[yesterday.getFullYear(),String(yesterday.getMonth()+1).padStart(2,'0'),String(yesterday.getDate()).padStart(2,'0')].join('-');
const task=(id,title,options={})=>({id,text:title,date,priority:'3',completed:false,dailyTarget:3,dailyProgress:{},occurrenceDone:[],occurrenceRewardDays:[],...options});
const seed={version:1,theme:'dark',xp:0,tasks:[
  task('qa-normal','تست نوبت‌های روزانه'),
  task('qa-recurring','تست نوبت‌های تکرارشونده',{date:start,dailyTarget:1,recurrenceRule:{frequency:'daily',interval:1,startDate:start,endDate:null},occurrenceOverrides:{[date]:{dailyTarget:3}}}),
  task('qa-goal','تست نوبت‌های هدف',{linkedTask:true,sourceManaged:true,sourceCompletionLocked:false,sourceType:'goal-step',sourceGroup:'goal',sourceParentId:'qa-parent',sourceId:'qa-step',xpAwarded:true})
],goals:[{id:'qa-parent',title:'هدف نمونه',steps:[{id:'qa-step',text:'تست نوبت‌های هدف',done:false,dailyTarget:3,dailyProgress:{}}]}],habits:[],taskLists:[],folders:[],tags:[],books:[],words:[],taskCompletionHistory:[]};
const page=await(await chromium.launch({headless:true})).newPage({viewport:{width:1280,height:900}});
await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraAccount={user:null,profile:{name:'QA',username:'qa',xp:0}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{}};"}));
await page.addInitScript(data=>localStorage.setItem('elara_space_v1',JSON.stringify(data)),seed);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const row=id=>page.locator('#task-list .astra-task-row[data-key="'+id+'"]');
const progress=async id=>page.evaluate(([taskId,day])=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));return s.tasks.find(t=>t.id===taskId)?.dailyProgress?.[day]??0},[id,date]);
try{
  await page.goto(base+'/#tasks',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraTasks&&document.querySelector('#task-list .astra-task-row[data-key="qa-normal"]'),null,{timeout:30000});
  for(const id of ['qa-normal','qa-recurring','qa-goal']){
    for(let n=1;n<=3;n++){
      assert.equal(await progress(id),n-1,id+' should begin with the previous round count');
      await row(id).locator('[data-phase2-action="toggle-task"]').click();
      await page.locator('.elara-task-decision [data-task-decision="done"]').click();
      await page.waitForFunction(([taskId,day,count])=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));return s.tasks.find(t=>t.id===taskId)?.dailyProgress?.[day]===count},[id,date,n],{timeout:10000});
      assert.equal(await progress(id),n,id+' must persist '+n+'/3');
      if(n<3){
        assert.ok((await row(id).locator('.task-round-count').textContent()).includes(String(n).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[+d])),id+' rendered counter did not advance');
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>document.querySelector('#task-list .astra-task-row[data-key="qa-normal"]')&&window.ElaraTasks);
        assert.equal(await progress(id),n,id+' reload erased round '+n);
      } else {
        await page.waitForFunction(taskId=>!!document.querySelector('#task-checked-archive [data-task-archive-id="'+taskId+'"]'),id);
      }
    }
  }
  assert.deepEqual(errors,[],'Uncaught JS errors: '+errors.join(';'));
  console.log('TASK_DAILY_ROUNDS_PASS: 0/3 → 1/3 → 2/3 → completed, persisting across reload, recurrence and linked goals');
}finally{await page.context().browser().close()}
