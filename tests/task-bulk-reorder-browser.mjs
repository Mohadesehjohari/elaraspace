import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const cloudStub="window.ElaraAccount={user:null,profile:{name:'Task QA',username:'task_qa',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true,groups:{list:async()=>[]},dm:{list:async()=>[]}};window.dispatchEvent(new Event('elara:social-updated'));";
const pageStub="window.ElaraPage={state:{posts:[],stories:[],loading:false,error:''},refresh:async()=>window.ElaraPage.state};window.dispatchEvent(new Event('elara:page-updated'));";
const engagementStub="window.ElaraEngagement={load:async()=>({likes:0,liked:false,comments:[],commentCount:0})};window.dispatchEvent(new Event('elara:engagement-ready'));";
function seed(){
 const d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,theme:'dark',taskLists:['بعداً'],folders:['آرشیو'],tags:[],linkedTaskDismissals:[],taskCompletionHistory:[],habits:[],goals:[],words:[],books:[{id:'book-source',title:'کتاب منبع',shelf:'reading',totalPages:100,currentPage:10,readingLogs:[]}],tasks:[
  {id:'t1',text:'تسک یک',date:day,priority:'4',completed:false,createdAt:1},
  {id:'t2',text:'تسک دو',date:day,priority:'4',completed:false,createdAt:2},
  {id:'t3',text:'تسک سه',date:day,priority:'4',completed:false,createdAt:3},
  {id:'t4',text:'مطالعه کتاب منبع',date:day,priority:'4',completed:false,createdAt:4,linkedTask:true,sourceType:'book',sourceId:'book-source',sourceGroup:'book',sourceLabel:'کتابخانه',sourceManaged:true},
  {id:'t5',text:'تسک تیک‌خورده دیروز',date:(()=>{const x=new Date(day+'T12:00:00');x.setDate(x.getDate()-1);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`})(),priority:'4',completed:true,doneAt:(()=>{const x=new Date(day+'T12:00:00');x.setDate(x.getDate()-1);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`})(),xpAwarded:true,createdAt:5}
 ]}));localStorage.setItem('elara_locale_v1','fa')
}
async function wire(page){await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));await page.route('**/elara-page.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:pageStub}));await page.route('**/social-engagement.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:engagementStub}));await page.addInitScript(seed)}
async function open(width,height,touch=false){const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});const page=await context.newPage();page.on('pageerror',e=>console.log('TASK_BULK_PAGEERROR '+e.message));await wire(page);await page.goto(base+'/?task-bulk-stage9='+Date.now()+'#tasks',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.ElaraTaskBulk&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});await page.waitForTimeout(300);const diag=await page.evaluate(()=>({owner:!!window.ElaraTaskBulk,route:location.hash,rows:document.querySelectorAll('#task-list>.astra-task-row').length,stateTasks:JSON.parse(localStorage.getItem('elara_space_v1')||'{}').tasks?.map(x=>x.id),optional:window.__elaraOptionalFailures||[],panelHidden:document.getElementById('panel-tasks')?.classList.contains('hidden'),taskHtml:document.getElementById('task-list')?.innerHTML.slice(0,300)}));console.log('TASK_BULK_BOOT '+JSON.stringify(diag));assert.ok(diag.rows>=4,'Task bulk fixture did not render four rows: '+JSON.stringify(diag));return{page,context}}
{
 const {page,context}=await open(1440,1000,false);
 const ids=async()=>page.locator('#task-list>.astra-task-row').evaluateAll(rows=>rows.map(r=>r.dataset.key));
 assert.deepEqual((await ids()).slice(0,3),['t1','t2','t3'],'initial task order');
 assert.equal((await ids()).includes('t5'),false,'completed past one-off stayed in active task list');
 assert.equal(await page.locator('#task-checked-archive [data-task-archive-id="t5"]').count(),1,'completed past one-off missing from checked archive');
 assert.match(await page.locator('#task-checked-archive').innerText(),/تسک تیک‌خورده دیروز/,'checked archive lost task title');
 const row1=page.locator('#task-list>.astra-task-row[data-key="t1"] .item-content'),row2=page.locator('#task-list>.astra-task-row[data-key="t2"] .item-content');
 await row1.dispatchEvent('contextmenu',{button:2});await page.waitForTimeout(40);
 assert.equal(await page.locator('#panel-tasks').evaluate(el=>el.classList.contains('task-selection-mode')),true,'desktop right-click did not enter task selection mode');
 assert.equal(await page.locator('#task-list>.astra-task-row[data-key="t1"]').getAttribute('aria-selected'),'true','right-clicked task not selected');
 await row2.dispatchEvent('click');await page.waitForTimeout(40);
 assert.equal(await page.locator('#task-list>.astra-task-row[data-key="t2"]').getAttribute('aria-selected'),'true','clicking next task did not toggle selection');
 assert.equal(await page.locator('#task-list>.astra-task-row[aria-selected="true"]').count(),2,'right-click selection count mismatch');
 await page.locator('[data-task-bulk="cancel"]').click();await page.waitForTimeout(30);
 assert.equal(await page.locator('#task-bulk-toolbar').isHidden(),true,'bulk Cancel did not leave selection mode');
 const kebabs=page.locator('#task-list .astra-task-more');
 await kebabs.nth(0).locator('summary').click();await page.waitForTimeout(40);
 assert.equal(await kebabs.nth(0).getAttribute('open'),'','first task menu did not open');
 assert.equal(await kebabs.nth(0).locator('summary').getAttribute('aria-expanded'),'true','first task menu aria-expanded mismatch');
 await kebabs.nth(1).locator('summary').click();await page.waitForTimeout(40);
 assert.equal(await kebabs.nth(0).getAttribute('open'),null,'opening second task menu did not close first');
 assert.equal(await kebabs.nth(1).getAttribute('open'),'','second task menu did not open');
 await page.waitForTimeout(3150);
 assert.equal(await kebabs.nth(1).getAttribute('open'),null,'idle task menu did not auto-close after three seconds');
 assert.equal(await kebabs.nth(1).locator('summary').getAttribute('aria-expanded'),'false','idle task menu aria-expanded did not reset');
 const h=await page.locator('[data-task-drag="t1"]').boundingBox(),target=await page.locator('#task-list>.astra-task-row[data-key="t3"]').boundingBox();assert.ok(h&&target);
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height*.78,{steps:8});await page.mouse.up();
 await page.waitForFunction(()=>Number.isFinite(JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(x=>x.id==='t1')?.manualOrder));
 let order=await ids();assert.ok(order.indexOf('t1')>order.indexOf('t3'),'pointer drag did not move t1 after t3: '+order.join(','));
 const handle=page.locator('[data-task-drag="t1"]');await handle.focus();await page.keyboard.down('Alt');await page.keyboard.press('ArrowUp');await page.keyboard.up('Alt');await page.waitForTimeout(100);order=await ids();assert.ok(order.indexOf('t1')<order.indexOf('t3'),'keyboard reorder did not move t1 upward: '+order.join(','));
 assert.equal(await page.locator('#task-selection-toggle,[data-task-select],.task-select-control').count(),0,'manual task selection controls must not be rendered');
 const trashHandle=page.locator('[data-task-drag="t3"]'),trashStart=await trashHandle.boundingBox();assert.ok(trashStart,'desktop trash drag handle missing');
 await page.mouse.move(trashStart.x+trashStart.width/2,trashStart.y+trashStart.height/2);await page.mouse.down();await page.waitForSelector('#task-trash-drop:not([hidden])');const trashBox=await page.locator('#task-trash-drop').boundingBox();assert.ok(trashBox,'desktop trash drop target missing');await page.mouse.move(trashBox.x+trashBox.width/2,trashBox.y+trashBox.height/2,{steps:8});assert.equal(await page.locator('#task-trash-drop').evaluate(el=>el.classList.contains('is-over')),true,'desktop drag never entered trash target');await page.mouse.up();await page.waitForSelector('.elara-dialog-layer');await page.locator('.elara-dialog-layer:last-child .elara-dialog-actions .elara-dialog-danger').click();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('elara_space_v1')).tasks.some(x=>x.id==='t3'));assert.equal(await page.locator('#task-list>.astra-task-row[data-key="t3"]').count(),0,'desktop trash drop did not delete t3');

 const hold1=page.locator('#task-list>.astra-task-row[data-key="t1"] .task-summary-button'),holdBox=await hold1.boundingBox();assert.ok(holdBox);
 await hold1.dispatchEvent('pointerdown',{pointerType:'mouse',pointerId:81,isPrimary:true,button:0,clientX:holdBox.x+20,clientY:holdBox.y+15});await page.waitForTimeout(620);await hold1.dispatchEvent('pointerup',{pointerType:'mouse',pointerId:81,isPrimary:true,button:0,clientX:holdBox.x+20,clientY:holdBox.y+15});
 await page.waitForFunction(()=>document.getElementById('panel-tasks')?.classList.contains('task-selection-mode'));
 await page.locator('#task-list>.astra-task-row[data-key="t2"] .item-content').click({position:{x:8,y:8}});assert.equal(await page.locator('[data-task-selected-count]').innerText(),'۲');
 await page.locator('[data-task-bulk="move"]').click();await page.waitForSelector('.task-bulk-move');await page.locator('.task-bulk-move select[name="list"]').selectOption('بعداً');await page.locator('.task-bulk-move select[name="folder"]').selectOption('آرشیو');await page.locator('.elara-dialog-actions .primary-button').click();
 await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));return ['t1','t2'].every(id=>{const t=s.tasks.find(x=>x.id===id);return t?.list==='بعداً'&&t?.folder==='آرشیو'})});
 await page.locator('#task-list>.astra-task-row[data-key="t1"] .item-content').dispatchEvent('contextmenu',{button:2});await page.locator('[data-task-bulk="duplicate"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.some(x=>x.text==='تسک یک (کپی)'));let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));const copy=state.tasks.find(x=>x.text==='تسک یک (کپی)');assert.equal(copy.completed,false);assert.equal(copy.linkedTask,undefined);
 await page.locator('#task-list>.astra-task-row[data-key="t4"] .item-content').dispatchEvent('contextmenu',{button:2});await page.locator('[data-task-bulk="delete"]').click();await page.waitForSelector('.elara-dialog-layer');await page.locator('.elara-dialog-actions .elara-dialog-danger').click();
 await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('elara_space_v1')).tasks.some(x=>x.id==='t4'));state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.ok((state.linkedTaskDismissals||[]).length>=1,'linked bulk delete did not persist dismissal');
 const m=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(m.sw<=m.w+1,'desktop task bulk overflow '+JSON.stringify(m));await page.screenshot({path:'browser-artifacts/task-bulk-1440.png',fullPage:true});await context.close();
}
{
 const {page,context}=await open(390,844,true);const title=page.locator('#task-list>.astra-task-row[data-key="t2"] .task-summary-button'),box=await title.boundingBox();assert.ok(box);
 await title.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:41,isPrimary:true,clientX:box.x+20,clientY:box.y+20});await page.waitForTimeout(650);await title.dispatchEvent('pointerup',{pointerType:'touch',pointerId:41,isPrimary:true,clientX:box.x+20,clientY:box.y+20});
 await page.waitForFunction(()=>document.getElementById('panel-tasks')?.classList.contains('task-selection-mode'));assert.equal(await page.locator('#task-list>.astra-task-row[data-key="t2"]').getAttribute('aria-selected'),'true','mobile long press did not select task');
 await page.locator('[data-task-bulk="all"]').click();assert.equal(await page.evaluate(()=>window.ElaraTaskBulk.selected.size)>=4,true,'mobile select all failed');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#task-bulk-toolbar').isHidden(),true,'Escape did not cancel selection');
 const touchHandle=page.locator('[data-task-drag="t1"]'),touchBox=await touchHandle.boundingBox();assert.ok(touchBox,'mobile drag handle missing');const touchId=77;
 await touchHandle.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:touchId,isPrimary:true,button:0,clientX:touchBox.x+touchBox.width/2,clientY:touchBox.y+touchBox.height/2});await page.waitForTimeout(230);await page.waitForSelector('#task-trash-drop:not([hidden])');const touchTrash=await page.locator('#task-trash-drop').boundingBox();assert.ok(touchTrash,'mobile trash target missing');await touchHandle.dispatchEvent('pointermove',{pointerType:'touch',pointerId:touchId,isPrimary:true,buttons:1,clientX:touchTrash.x+touchTrash.width/2,clientY:touchTrash.y+touchTrash.height/2});assert.equal(await page.locator('#task-trash-drop').evaluate(el=>el.classList.contains('is-over')),true,'touch drag never entered trash target');await touchHandle.dispatchEvent('pointerup',{pointerType:'touch',pointerId:touchId,isPrimary:true,button:0,clientX:touchTrash.x+touchTrash.width/2,clientY:touchTrash.y+touchTrash.height/2});await page.waitForSelector('.elara-dialog-layer');await page.locator('.elara-dialog-layer:last-child .elara-dialog-actions .elara-dialog-danger').click();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('elara_space_v1')).tasks.some(x=>x.id==='t1'));assert.equal(await page.locator('#task-list>.astra-task-row[data-key="t1"]').count(),0,'touch trash drop did not delete t1');

 const m=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(m.sw<=m.w+1,'mobile task bulk overflow '+JSON.stringify(m));await page.screenshot({path:'browser-artifacts/task-bulk-390.png',fullPage:true});await context.close();
}
{
 const {page,context}=await open(1440,1000,false);
 await page.locator('#task-list>.astra-task-row[data-key="t1"] .item-content').dispatchEvent('contextmenu',{button:2});
 await page.locator('[data-task-bulk="delete-scope"]').click();
 await page.waitForSelector('.elara-dialog-layer');
 await page.locator('.elara-dialog-actions .elara-dialog-danger').click();
 await page.waitForFunction(()=>document.querySelectorAll('.elara-dialog-layer').length>0);
 await page.locator('.elara-dialog-layer:last-child .elara-dialog-actions .elara-dialog-danger').click();
 await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));return ['t1','t2','t3','t4'].every(id=>!s.tasks.some(x=>x.id===id))});
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));
 assert.ok((state.linkedTaskDismissals||[]).length>=1,'delete-scope did not preserve linked-source dismissal');
 assert.deepEqual(state.tasks.map(x=>x.id),['t5'],'delete-scope must preserve completed archived tasks outside the current view');
 assert.equal(await page.locator('#task-list>.astra-task-row').count(),0,'delete-scope left visible tasks behind');
 await context.close();
}
await browser.close();console.log('TASK_BULK_STAGE9_PASS pointer+touch trash-drop pointer+keyboard reorder bulk move duplicate linked-delete longpress 390/1440');
