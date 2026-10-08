import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173',browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:null,profile:{name:'Collection QA',username:'collection_qa',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true};window.dispatchEvent(new Event('elara:social-updated'));";
function seed(){const d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,theme:'dark',folders:['آرشیو'],taskLists:['بعداً'],tags:[],books:[],words:[],habits:[],goals:[],taskCompletionHistory:[],missionRewardClaims:[],tasks:[{id:'f1',text:'داخل پوشه',folder:'آرشیو',list:'',date,priority:'2',completed:false,createdAt:1},{id:'l1',text:'داخل لیست',folder:'',list:'بعداً',date,priority:'3',completed:false,createdAt:2},{id:'other',text:'بیرون مجموعه',folder:'',list:'',date,priority:'4',completed:false,createdAt:3}]}));localStorage.setItem('elara_locale_v1','fa')}
async function open(width,height){const page=await browser.newPage({viewport:{width,height}});await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));await page.addInitScript(seed);await page.goto(base+'/?collections='+Date.now()+'#home',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ElaraTaskCollections&&window.ElaraPrivateDrawer&&!document.documentElement.hasAttribute('data-elara-booting'));return page}
for(const [width,height] of [[390,844],[1440,1000]]){
 const page=await open(width,height);
 await page.evaluate(()=>ElaraPrivateDrawer.open('folders'));await page.waitForSelector('[data-open-task-collection="folder"][data-collection-name="آرشیو"]');
 assert.equal(await page.locator('[data-open-task-collection="list"][data-collection-name="بعداً"]').count(),1,'list card missing in drawer');
 await page.locator('[data-open-task-collection="folder"][data-collection-name="آرشیو"]').click();
 await page.waitForSelector('#elara-task-collection-page:not(.hidden)');
 assert.equal(await page.locator('[data-collection-task]').count(),1,'folder page leaked unrelated tasks');
 assert.match(await page.locator('[data-collection-title]').innerText(),/آرشیو/);
 const form=page.locator('[data-collection-add]');await form.locator('input[name="title"]').fill('تسک تازه پوشه');await form.locator('select[name="priority"]').selectOption('1');await form.locator('button[type="submit"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.some(t=>t.text==='تسک تازه پوشه'&&t.folder==='آرشیو'&&t.priority==='1'));
 assert.equal(await page.locator('[data-collection-task]').count(),2,'folder add did not render');
 await page.locator('[data-collection-task="f1"] [data-collection-action="toggle"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.id==='f1')?.completed===true);
 await page.locator('[data-collection-task="f1"] [data-collection-action="edit"]').click();await page.waitForFunction(()=>location.hash==='#tasks'&&document.getElementById('elara-task-collection-page')?.hidden===true);await page.waitForSelector('.elara-dialog-layer .task-detail-form');await page.locator('.elara-dialog-layer [data-detail="text"]').fill('ویرایش‌شده');await page.getByRole('button',{name:'ذخیره تغییرات'}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.id==='f1')?.text==='ویرایش‌شده');
 await page.evaluate(()=>ElaraTaskCollections.open('folder','آرشیو'));await page.waitForSelector('#elara-task-collection-page:not(.hidden)');await page.locator('[data-collection-back]').click();await page.waitForFunction(()=>document.getElementById('elara-task-collection-page')?.hidden===true);
 await page.evaluate(()=>ElaraTaskCollections.open('list','بعداً'));await page.waitForSelector('#elara-task-collection-page:not(.hidden)');
 assert.equal(await page.locator('[data-collection-task]').count(),1,'list page leaked unrelated tasks');
 await page.locator('[data-collection-task="l1"] [data-collection-action="delete"]').click();await page.waitForSelector('.elara-dialog-layer');await page.getByRole('button',{name:'حذف'}).last().click();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('elara_space_v1')).tasks.some(t=>t.id==='l1'));
 assert.equal(await page.locator('[data-collection-task="l1"]').count(),0,'deleted list task remained');
 const metrics=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(metrics.sw<=metrics.w+1,'collection horizontal overflow '+width+' '+JSON.stringify(metrics));
 await page.screenshot({path:'browser-artifacts/task-collection-'+width+'.png',fullPage:true});await page.close()
}
await browser.close();console.log('TASK_COLLECTIONS_PASS folder/list add toggle edit delete back 390/1440');