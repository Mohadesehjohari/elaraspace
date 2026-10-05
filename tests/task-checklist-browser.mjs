import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:null,profile:{name:'Checklist QA',username:'check_qa',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true,groups:{list:async()=>[]},dm:{list:async()=>[]}};window.dispatchEvent(new Event('elara:social-updated'));";
const pageStub="window.ElaraPage={state:{posts:[],stories:[],loading:false,error:''},refresh:async()=>window.ElaraPage.state};window.dispatchEvent(new Event('elara:page-updated'));";
const engagementStub="window.ElaraEngagement={load:async()=>({likes:0,liked:false,comments:[],commentCount:0})};window.dispatchEvent(new Event('elara:engagement-ready'));";
function seed(){if(localStorage.getItem('elara_task_checklist_qa_seeded')==='1')return;const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,theme:'dark',taskLists:[],folders:[],tags:[],linkedTaskDismissals:[],taskCompletionHistory:[],habits:[{id:'h1',title:'عادت تست',days:[],rewardDays:[]}],goals:[{id:'g1',title:'هدف تست',steps:[{id:'s1',text:'قدم هدف تست',done:false}]}],words:[],books:[],tasks:[{id:'t1',text:'خرید هفتگی',date:day,priority:'4',completed:false,createdAt:1}]}));localStorage.setItem('elara_locale_v1','fa');localStorage.setItem('elara_task_checklist_qa_seeded','1')}
async function open(width,height){const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));await page.route('**/elara-page.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:pageStub}));await page.route('**/social-engagement.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:engagementStub}));await page.addInitScript(seed);await page.goto(base+'/?checklist='+Date.now()+'#tasks',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.ElaraTaskChecklist&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});await page.waitForSelector('#task-list>.astra-task-row[data-key="t1"]');return{page,context}}
for(const [width,height] of [[390,844],[1440,1000]]){
 const {page,context}=await open(width,height);
 await page.waitForSelector('#task-list .astra-task-row.source-habit .check-button:not([disabled])');
 await page.locator('#task-list .astra-task-row.source-habit .check-button').click();
 await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));const day=new Date().toISOString().slice(0,10);return s.habits?.find(x=>x.id==='h1')?.days?.includes(day)});
 await page.locator('#task-list .astra-task-row.source-goal .check-button').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).goals?.find(x=>x.id==='g1')?.steps?.find(x=>x.id==='s1')?.done===true);
 assert.equal(await page.locator('#task-list .astra-task-row.source-habit .check-button').getAttribute('aria-pressed'),'true','Habit linked row did not remain tickable in Tasks');
 assert.equal(await page.locator('#task-list .astra-task-row.source-goal .check-button').getAttribute('aria-pressed'),'true','Goal linked row did not remain tickable in Tasks');
 await page.locator('[data-phase2-action="edit-task"][data-id="t1"]').click();
 await page.waitForSelector('[data-task-checklist-editor]');
 const input=page.locator('[data-task-checklist-new]');
 for(const item of ['نان','شیر','میوه']){await input.fill(item);await page.locator('[data-task-checklist-add]').click()}
 assert.equal(await page.locator('.task-checklist-row').count(),3,'checklist add failed');
 await page.locator('.task-checklist-row').nth(1).locator('[data-check-action="toggle"]').click();
 await page.locator('.task-checklist-row').nth(2).locator('[data-check-action="up"]').click();
 await page.locator('.task-checklist-row').nth(0).locator('[data-check-text]').fill('نان سبوس‌دار');
 await page.locator('.elara-dialog-actions .primary-button').click();
 await page.waitForFunction(()=>{const t=JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(x=>x.id==='t1');return Array.isArray(t?.checklist)&&t.checklist.length===3});
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(x=>x.id==='t1').checklist);
 assert.deepEqual(state.map(x=>x.text),['نان سبوس‌دار','میوه','شیر']);
 assert.equal(state[2].done,true,'checked item state did not persist');
 await page.waitForFunction(()=>document.querySelector('#task-list>.astra-task-row[data-key="t1"] .task-checklist-progress'));
 const progress=await page.locator('#task-list>.astra-task-row[data-key="t1"] .task-checklist-progress').innerText();assert.match(progress,/۱|1/);assert.match(progress,/۳|3/);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ElaraTaskChecklist&&!document.documentElement.hasAttribute('data-elara-booting'));await page.waitForSelector('#task-list>.astra-task-row[data-key="t1"]');
 await page.locator('[data-phase2-action="edit-task"][data-id="t1"]').click();await page.waitForSelector('[data-task-checklist-editor]');
 assert.equal(await page.locator('.task-checklist-row').count(),3,'checklist lost after refresh');
 assert.equal(await page.locator('.task-checklist-row').nth(0).locator('[data-check-text]').inputValue(),'نان سبوس‌دار');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,'checklist horizontal overflow '+width+' '+overflow);
 await context.close();
}
await browser.close();console.log('TASK_CHECKLIST_PASS add toggle edit reorder persist refresh 390/1440');
