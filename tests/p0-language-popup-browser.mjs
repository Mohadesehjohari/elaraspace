import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const cloudStub=`window.ElaraAccount={user:null,profile:{name:'QA',username:'qa_user',bio:'',xp:20,profilePublic:true},sendPasswordReset:async()=>{},changePassword:async()=>{},logout:async()=>{}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`window.ElaraSocial={me:null,friends:[],requests:[],activities:[],saveProfileValues:async values=>({profile:values,warnings:[]}),publishActivity:async()=>true,refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));`;

function seed(){
 if(sessionStorage.getItem('p0-seeded')==='1')return;
 sessionStorage.setItem('p0-seeded','1');
 const d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,tasks:[{id:'p0-task',text:'P0 Task',date,priority:'1',completed:false,shortDescription:'',description:'',recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{}}],habits:[],goals:[],books:[],words:[],folders:[],tags:[],taskLists:[]}));
 localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',color:'violet',style:'default',language:'fa'}));
 localStorage.setItem('elara_locale_v1','fa');
 localStorage.removeItem('elara_language_books_v2');
 for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith('elara_language_books_v2_migrated_'))localStorage.removeItem(k)}
}
async function stub(page){
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
}
async function waitBoot(page){await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&window.ElaraOpen&&window.ElaraDialog,null,{timeout:15000})}
async function withinViewport(page,selector,label){
 const box=await page.locator(selector).first().boundingBox();assert.ok(box,label+' missing');
 const vh=await page.evaluate(()=>innerHeight);
 assert.ok(box.y>=-1&&box.y+box.height<=vh+1,label+' outside viewport '+JSON.stringify({box,vh}));
 return box;
}
async function topmost(page,selector,label){
 const loc=page.locator(selector).last(),box=await loc.boundingBox();assert.ok(box,label+' missing');
 const hit=await page.evaluate(({x,y,selector})=>!!document.elementFromPoint(x,y)?.closest(selector),{x:box.x+Math.min(box.width/2,80),y:Math.max(1,Math.min(innerHeight-1,box.y+Math.min(box.height/2,70))),selector});
 assert.equal(hit,true,label+' is not topmost');
}

// P0-3: mobile nav must exist before late JS hydration and must hydrate the same nodes.
for(const width of [320,375,390,430]){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();await page.addInitScript(seed);await stub(page);
 await page.route('**/approved-navigation-extension.js*',async route=>{await new Promise(r=>setTimeout(r,1800));await route.continue()});
 await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.classList.contains('cloud-ready'),null,{timeout:5000});
 await page.waitForTimeout(150);
 const items=page.locator('.bottom-nav [data-elara-tab]');
 assert.equal(await items.count(),8,width+': fallback nav missing destinations');
 assert.equal(await page.locator('.bottom-nav').isVisible(),true,width+': fallback nav hidden');
 await items.evaluateAll(xs=>xs.forEach((x,i)=>x.dataset.qaFallback=String(i)));
 const before=await items.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return{route:x.dataset.elaraTab,left:r.left,right:r.right,center:r.left+r.width/2}}));
 assert.equal(before.every(r=>r.left>=-1&&r.right<=width+1),true,width+': fallback nav overflow');
 await page.locator('.bottom-nav [data-elara-tab="language"]').click();
 assert.equal(await page.evaluate(()=>location.hash),'#language',width+': fallback route href failed');
 await waitBoot(page);await page.waitForTimeout(150);
 const afterItems=page.locator('.bottom-nav [data-elara-tab]');
 assert.equal(await afterItems.count(),8,width+': hydrated nav lost routes');
 assert.equal(await afterItems.evaluateAll(xs=>xs.every((x,i)=>x.dataset.qaFallback===String(i))),true,width+': nav replaced fallback nodes instead of hydrating');
 const after=await afterItems.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return{route:x.dataset.elaraTab,left:r.left,right:r.right,center:r.left+r.width/2}}));
 assert.equal(after.every(r=>r.left>=-1&&r.right<=width+1),true,width+': hydrated nav overflow');
 assert.ok(Math.max(...after.map((r,i)=>Math.abs(r.center-before[i].center)))<=8,width+': nav hydration caused geometry jump');
 assert.equal(await page.locator('#panel-language:not(.hidden)').count(),1,width+': delayed direct Language route was lost');
 await page.reload({waitUntil:'domcontentloaded'});await waitBoot(page);await page.waitForTimeout(180);
 assert.equal(await page.locator('#panel-language:not(.hidden)').count(),1,width+': direct reload #language failed');
 await context.close();
}

// P0-1, P0-2, P0-4, P0-5 on a real 390 mobile user path.
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const page=await context.newPage(),errors=[];await page.addInitScript(seed);await stub(page);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text())});
await page.goto(base+'/#language',{waitUntil:'domcontentloaded'});await waitBoot(page);await page.waitForTimeout(350);
assert.equal(await page.locator('#panel-language:not(.hidden)').count(),1,'Language direct load failed');

// Language: add -> render -> refresh -> report -> refresh -> delete -> refresh.
await page.locator('#language-book-form [name=title]').fill('QA Language Book');await page.locator('#language-book-form').evaluate(form=>form.requestSubmit());
await page.locator('#elara-dialog-root .language-book-add-dialog [name=total]').fill('200');await page.locator('#elara-dialog-root .language-book-add-dialog [name=current]').fill('10');await page.locator('#elara-dialog-root .language-book-add-dialog [type=submit]').click();await page.waitForTimeout(100);
let row=page.locator('.pass3-language-book').filter({hasText:'QA Language Book'}).first();
if(!await row.isVisible()){
 const diag=await page.evaluate(()=>({storage:JSON.parse(localStorage.getItem('elara_language_books_v2')||'[]'),read:window.ElaraLanguageBooks?.read?.()||null,listCount:document.querySelectorAll('#language-book-list').length,listHTML:document.querySelector('#language-book-list')?.innerHTML||'',listText:document.querySelector('#language-book-list')?.innerText||'',panelHidden:document.querySelector('#panel-language')?.classList.contains('hidden'),trace:window.__elaraLanguageRenderTrace||[],visualScripts:[...document.scripts].map(s=>s.src).filter(src=>src.includes('approved-visual.js')),errors:window.__elaraOptionalFailures||[]}));
 throw new Error('book saved but did not render: '+JSON.stringify(diag));
}
let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_language_books_v2')||'[]'));assert.equal(stored.some(x=>x.title==='QA Language Book'&&Number(x.totalPages)===200&&Number(x.currentPage)===10),true,'canonical storage missing added book');
await page.reload({waitUntil:'domcontentloaded'});await waitBoot(page);await page.waitForTimeout(350);row=page.locator('.pass3-language-book').filter({hasText:'QA Language Book'}).first();assert.equal(await row.isVisible(),true,'book vanished after refresh');
await row.locator('[data-language-reading]').click();await page.waitForTimeout(60);
assert.equal(await page.locator('#elara-dialog-root .library-log-form').count(),1,'reading click opened duplicate/missing reports');await withinViewport(page,'#elara-dialog-root .elara-dialog-panel','reading report');await topmost(page,'#elara-dialog-root .elara-dialog-panel','reading report');
await page.locator('#elara-dialog-root .library-log-form [name=mode]').selectOption('count');await page.locator('#elara-dialog-root .library-log-form [name=pages]').fill('5');await page.locator('#elara-dialog-root .elara-dialog-layer').last().locator('.elara-dialog-actions .primary-button').click();await page.waitForTimeout(100);
row=page.locator('.pass3-language-book').filter({hasText:'QA Language Book'}).first();assert.match(await row.innerText(),/15|۱۵/,'reading progress did not become 15');
await page.reload({waitUntil:'domcontentloaded'});await waitBoot(page);await page.waitForTimeout(350);row=page.locator('.pass3-language-book').filter({hasText:'QA Language Book'}).first();assert.match(await row.innerText(),/15|۱۵/,'reading progress vanished after refresh');
await row.locator('[data-language-book-delete]').click();await page.waitForTimeout(100);assert.equal(await page.locator('.pass3-language-book').filter({hasText:'QA Language Book'}).count(),0,'delete did not remove DOM row');stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_language_books_v2')||'[]'));assert.equal(stored.some(x=>x.title==='QA Language Book'),false,'delete did not remove canonical row');
await page.reload({waitUntil:'domcontentloaded'});await waitBoot(page);await page.waitForTimeout(350);assert.equal(await page.locator('.pass3-language-book').filter({hasText:'QA Language Book'}).count(),0,'deleted book returned after refresh');

// Settings main list via real hamburger -> Privacy.
await page.locator('#elara-account-menu-trigger').click();await page.waitForTimeout(60);
assert.equal(await page.locator('.drawer-menu').isVisible(),true,'Settings main list missing');
const menuButtons=page.locator('.drawer-menu>button');assert.ok(await menuButtons.count()>=8,'Settings list is incomplete');
const menuLayout=await page.locator('.drawer-menu').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns,buttons:[...el.children].filter(x=>x.matches('button')).map(x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})}));
assert.equal(menuLayout.columns.trim().split(/\s+/).length,1,'Settings mobile menu is not one column: '+menuLayout.columns);
assert.equal(menuLayout.buttons.every((r,i,a)=>r.width>=300&&(!i||r.y>a[i-1].y)),true,'Settings rows are squeezed or not vertically ordered: '+JSON.stringify(menuLayout.buttons));
await page.locator('.drawer-menu [data-drawer-nav="privacy"]').click();await page.waitForTimeout(60);await withinViewport(page,'.elara-private-drawer-panel','Privacy');await topmost(page,'.elara-private-drawer-panel','Privacy');
assert.equal(await page.locator('[data-drawer-section="privacy"] [data-drawer-nav="home"]').isVisible(),true,'Privacy Back missing');

// Privacy -> Back -> Wardrobe. Wardrobe must be above Settings.
await page.locator('[data-drawer-section="privacy"] [data-drawer-nav="home"]').click();await page.waitForTimeout(40);await page.locator('.drawer-menu [data-approved-wardrobe]').click();await page.waitForTimeout(70);
await withinViewport(page,'.approved-wardrobe-window','Wardrobe');await topmost(page,'.approved-wardrobe-window','Wardrobe');
let z=await page.evaluate(()=>({drawer:Number(getComputedStyle(document.querySelector('.elara-private-drawer')).zIndex),wardrobe:Number(getComputedStyle(document.querySelector('.approved-wardrobe')).zIndex)}));assert.ok(z.wardrobe>z.drawer,'Wardrobe below Settings '+JSON.stringify(z));
await page.locator('.approved-wardrobe [data-back-wardrobe]').click();await page.waitForTimeout(30);

// Account -> Edit Profile via real clicks. Save visible, dialog above Settings.
await page.locator('.drawer-menu [data-drawer-nav="account"]').click();await page.waitForTimeout(50);await page.locator('[data-drawer-section="account"] [data-profile-edit]').click();await page.waitForTimeout(80);
await withinViewport(page,'#elara-dialog-root .elara-dialog-panel','Profile editor');await topmost(page,'#elara-dialog-root .elara-dialog-panel','Profile editor');
assert.equal(await page.locator('#elara-central-profile-form .pass4-profile-edit-actions-top [type=submit]').isVisible(),true,'Profile Save is not immediately visible');
z=await page.evaluate(()=>({drawer:Number(getComputedStyle(document.querySelector('.elara-private-drawer')).zIndex),dialog:Number(getComputedStyle(document.querySelector('#elara-dialog-root')).zIndex)}));assert.ok(z.dialog>z.drawer,'Profile dialog below Settings '+JSON.stringify(z));

// A second ElaraDialog must stack above the profile editor, then Back returns to parent.
await page.evaluate(()=>ElaraDialog.open({title:'Nested P0',message:'Nested'}));await page.waitForTimeout(50);
assert.equal(await page.locator('#elara-dialog-root .elara-dialog-layer').count(),2,'nested dialog replaced parent');
const layers=page.locator('#elara-dialog-root .elara-dialog-layer'),z0=Number(await layers.nth(0).evaluate(el=>getComputedStyle(el).zIndex)),z1=Number(await layers.nth(1).evaluate(el=>getComputedStyle(el).zIndex));assert.ok(z1>z0,'nested dialog is not above parent');await topmost(page,'#elara-dialog-root .elara-dialog-layer:last-child .elara-dialog-panel','nested dialog');
await page.locator('#elara-dialog-root .elara-dialog-layer').last().locator('.elara-dialog-back').click();await page.waitForTimeout(30);assert.equal(await page.locator('#elara-dialog-root .elara-dialog-layer').count(),1,'Back did not return to profile editor');await page.locator('#elara-dialog-root .elara-dialog-back').click();await page.waitForTimeout(30);

// Close Settings; Bell -> Notifications must be topmost and inside viewport.
await page.locator('.elara-private-drawer [data-drawer-close]').click();await page.waitForTimeout(50);await page.locator('.bottom-nav [data-elara-tab="home"]').click();await page.waitForTimeout(180);
const bell=page.locator('#ref-header-notifications,[data-notification-bell]').first();assert.equal(await bell.isVisible(),true,'Bell missing');await bell.click();await page.waitForTimeout(60);await withinViewport(page,'.elara-notification-window','Notifications');await topmost(page,'.elara-notification-window','Notifications');await page.locator('.elara-notification-window [data-notification-back]').click();await page.waitForTimeout(30);

// Task kebab mobile: topmost and real delete fixture.
await page.locator('.bottom-nav [data-elara-tab="tasks"]').click();await page.waitForTimeout(160);
let kebab=page.locator('.astra-task-more').first(),summary=kebab.locator('summary');assert.equal(await summary.isVisible(),true,'390 task kebab hidden');await summary.click();await page.waitForTimeout(40);
let menu=kebab.locator('.item-actions');assert.equal(await menu.isVisible(),true,'390 task menu hidden');assert.equal(await menu.locator('[data-phase2-action="edit-task"]').isVisible(),true,'390 Edit missing');assert.equal(await menu.locator('[data-phase2-action="delete-task"]').isVisible(),true,'390 Delete missing');await topmost(page,'.astra-task-more[open] .item-actions','390 task menu');
await menu.locator('[data-phase2-action="delete-task"]').click();await page.waitForTimeout(40);const danger=page.locator('#elara-dialog-root .elara-dialog-danger').last();if(await danger.count()){await danger.click();await page.waitForTimeout(80)}
stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}'));assert.equal((stored.tasks||[]).some(t=>t.id==='p0-task'),false,'390 task delete did not persist');

assert.deepEqual(errors,[],'runtime errors: '+errors.join(' | '));
await context.close();

// Task kebab desktop 1440, including real delete.
const desktop=await browser.newContext({viewport:{width:1440,height:1000}}),dp=await desktop.newPage();await dp.addInitScript(seed);await stub(dp);await dp.goto(base+'/#tasks',{waitUntil:'domcontentloaded'});await waitBoot(dp);await dp.waitForTimeout(250);if(await dp.locator('#panel-tasks.hidden').count())await dp.evaluate(()=>ElaraOpen('tasks',{history:'replace'}));await dp.waitForTimeout(100);
kebab=dp.locator('.astra-task-more').first();summary=kebab.locator('summary');assert.equal(await summary.isVisible(),true,'1440 task kebab hidden');await summary.click();await dp.waitForTimeout(40);menu=kebab.locator('.item-actions');assert.equal(await menu.isVisible(),true,'1440 task menu hidden');assert.equal(await menu.locator('[data-phase2-action="edit-task"]').isVisible(),true,'1440 Edit missing');assert.equal(await menu.locator('[data-phase2-action="delete-task"]').isVisible(),true,'1440 Delete missing');await topmost(dp,'.astra-task-more[open] .item-actions','1440 task menu');await menu.locator('[data-phase2-action="delete-task"]').click();await dp.waitForTimeout(40);const dd=dp.locator('#elara-dialog-root .elara-dialog-danger').last();if(await dd.count()){await dd.click();await dp.waitForTimeout(80)}const ds=await dp.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}'));assert.equal((ds.tasks||[]).some(t=>t.id==='p0-task'),false,'1440 task delete did not persist');await desktop.close();

await browser.close();console.log('P0 language/nav/popup/task/settings regression PASS');
