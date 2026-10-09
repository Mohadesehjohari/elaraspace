// END-HEAD CI anchor: this P0 suite is required to run with validate/reference on the same commit.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const sha=process.env.GITHUB_SHA||'local',out=`browser-artifacts/${sha}/p0`;mkdirSync(out,{recursive:true});

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const stage=name=>console.log('[P0-STAGE] '+name);
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
 page.__p0Errors=[];
 page.on('pageerror',e=>page.__p0Errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))page.__p0Errors.push('console: '+m.text())});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
}
async function waitBoot(page){
 try{return await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&window.ElaraOpen&&window.ElaraDialog,null,{timeout:15000})}
 catch(error){
  const diag=await page.evaluate(()=>({booting:document.documentElement.hasAttribute('data-elara-booting'),ready:document.readyState,hash:location.hash,open:typeof window.ElaraOpen,dialog:typeof window.ElaraDialog,levels:window.ElaraLevels?{version:window.ElaraLevels.VERSION,level820:window.ElaraLevels.level?.(820),level68030:window.ElaraLevels.level?.(68030),threshold80:window.ElaraLevels.threshold?.(80),source:String(window.ElaraLevels.level||'').slice(0,220)}:null,scripts:[...document.scripts].slice(-12).map(s=>s.src||'[inline]')}));
  console.error('[P0-BOOT-DIAG] '+JSON.stringify({diag,errors:page.__p0Errors||[]}));
  await page.screenshot({path:`${out}/boot-timeout-${Date.now()}.png`,fullPage:false}).catch(()=>{});
  throw error
 }
}
async function withinViewport(page,selector,label){
 const box=await page.locator(selector).first().boundingBox();assert.ok(box,label+' missing');
 const vh=await page.evaluate(()=>innerHeight);
 assert.ok(box.y>=-1&&box.y+box.height<=vh+1,label+' outside viewport '+JSON.stringify({box,vh}));
 return box;
}
async function topmost(page,selector,label){
 const loc=page.locator(selector).last(),box=await loc.boundingBox();assert.ok(box,label+' missing');
 const vh=await page.evaluate(()=>innerHeight),hit=await page.evaluate(({x,y,selector})=>!!document.elementFromPoint(x,y)?.closest(selector),{x:box.x+Math.min(box.width/2,80),y:Math.max(1,Math.min(vh-1,box.y+Math.min(box.height/2,70))),selector});
 assert.equal(hit,true,label+' is not topmost');
}

// P0 UI11/UI12 navigation contract: preserve the owner's current seven routes.
// Language remains available via ElaraOpen and deep linking, not as an eighth bottom-nav item.
for(const width of [320,360,375,390,412,430]){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(12000);
 await page.addInitScript(seed);await stub(page);
 stage('nav-'+width+':start');
 await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
 await waitBoot(page);await page.waitForTimeout(160);
 const nav=page.locator('.bottom-nav [data-elara-nav-kind]');
 const expected=['blog','books','social','home','tasks','freedom','page'];
 assert.equal(await nav.count(),7,width+': current original seven-button mobile menu missing');
 assert.deepEqual(await nav.evaluateAll(xs=>xs.map(x=>x.dataset.elaraTab)),expected,width+': original seven-button mobile routes were changed');
 assert.equal(await page.locator('.bottom-nav [data-elara-tab="more"]').count(),0,width+': menu overflow replacement not allowed');
 assert.equal(await page.locator('.bottom-nav').isVisible(),true,width+': original mobile menu is not visible after hydration');
 const rects=await nav.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}}));
 assert.equal(rects.every(x=>x.left>=-2&&x.right<=width+2&&x.width>25),true,width+': original nav overflows screen '+JSON.stringify(rects));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),width+': boot layout has horizontal overflow');
 await page.evaluate(()=>window.ElaraOpen('language',{history:'push'}));
 await page.waitForSelector('#panel-language:not(.hidden)');
 await page.reload({waitUntil:'domcontentloaded'});await waitBoot(page);
 await page.waitForSelector('#panel-language:not(.hidden)');
 await page.screenshot({path:out+'/nav-'+width+'.png',fullPage:false});
 stage('nav-'+width+':pass');await context.close();
}

// P0-1, P0-2, P0-4, P0-5 on a real 390 mobile user path.
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(12000);await page.addInitScript(seed);await stub(page);
stage('mobile390:start');
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text())});
await page.goto(base+'/#language',{waitUntil:'domcontentloaded'});await waitBoot(page);await page.waitForTimeout(350);
assert.equal(await page.locator('#panel-language:not(.hidden)').count(),1,'Language direct load failed');
await page.evaluate(()=>window.ElaraOpen('exercise',{history:'push'}));await page.waitForTimeout(90);
assert.equal(await page.locator('#panel-exercise .wellness-heading img[src*="green_heart.webp"]').count(),1,'Exercise heading must use green_heart.webp');
await page.locator('.bottom-nav [data-elara-tab="home"]').click();await page.waitForTimeout(60);
assert.equal(await page.locator('#panel-home .ref-wellness-cell').nth(3).locator('img[src*="apple.webp"]').count(),1,'Home weight cell must use apple.webp');
await page.evaluate(()=>window.ElaraOpen('language',{history:'push'}));await page.waitForTimeout(70);
assert.equal(await page.locator('#panel-language:not(.hidden)').count(),1,'Language route was not restored after asset checks');

assert.match(await page.locator('.elara-language-hero').evaluate(el=>getComputedStyle(el).backgroundImage),/34-language-hero-banner\.webp/,'uploaded Language banner is not active');
const ui12=await page.locator('#panel-language.ui12-language .ui12-board').count()>0;
if(ui12){
 const shortcuts=page.locator('#panel-language .ui12-shortcut'),cards=page.locator('#panel-language .ui12-board>.ui12-card');
 assert.equal(await shortcuts.count(),8,'UI12 Language shortcuts must all remain available');
 assert.equal(await cards.count(),8,'UI12 Language cards must all remain available');
 const geometry=await cards.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return{id:x.id,x:r.x,w:r.width,right:r.right}}));
 assert.equal(geometry.every(g=>g.w>=90&&g.x>=-2&&g.right<=innerWidth+2),true,'UI12 card overflow: '+JSON.stringify(geometry));
}else{
 const languageLaunchers=page.locator('#panel-language .feature-hub-launchers[data-hub-kind="language"] .feature-launcher-card');
 assert.equal(await languageLaunchers.count(),4,'Language must expose four clean launcher cards');
 const languageGeometry=await languageLaunchers.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect(),img=x.querySelector('.feature-launcher-art')?.getBoundingClientRect();return{y:r.y,h:r.height,imgH:img?.height||0}}));
 assert.equal(Math.max(...languageGeometry.slice(0,2).map(x=>x.y))-Math.min(...languageGeometry.slice(0,2).map(x=>x.y))<=2,true,'Language first launcher row must align: '+JSON.stringify(languageGeometry));
 assert.ok(languageGeometry[2].y>languageGeometry[0].y+40,'Language second launcher row failed: '+JSON.stringify(languageGeometry));
 assert.equal(languageGeometry.every(x=>x.h>=160&&x.h<=184&&x.imgH>=100),true,'Language launcher size drifted: '+JSON.stringify(languageGeometry));
}
assert.equal(await page.locator('#panel-language [data-language-block="leitner"]').count(),0,'Full Leitner UI must not stay embedded on the Language hub');
const langOverflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));assert.ok(langOverflow<=2,'Language mobile horizontal overflow '+langOverflow);

const leitnerLaunch=ui12?page.locator('#ui12-leitner [data-ui12-route="words"]').first():page.locator('#panel-language [data-feature-route="words"]');assert.equal(await leitnerLaunch.count(),1,'Language Leitner navigation missing');await leitnerLaunch.click();await page.waitForTimeout(80);assert.equal(await page.locator('#panel-words:not(.hidden)').count(),1,'Leitner launcher must open the full Leitner page');
const leitnerStats=page.locator('#panel-words [data-language-block="leitner"] .language-leitner-stats>div');
assert.equal(await leitnerStats.count(),4,'Dedicated Leitner route must preserve the original four live stat tiles');
const leitnerRows=await leitnerStats.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));
assert.equal(Math.max(...leitnerRows.map(x=>x.y))-Math.min(...leitnerRows.map(x=>x.y))<=2,true,'Leitner stats must remain horizontal like the original design: '+JSON.stringify(leitnerRows));
const leitnerArt=page.locator('#panel-words [data-language-block="leitner"] .pass3-language-stat-art');assert.equal(await leitnerArt.count(),4,'Dedicated Leitner route lost its original artwork');assert.equal(await leitnerArt.evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0)),true,'Dedicated Leitner artwork failed to decode');
await page.evaluate(()=>window.ElaraOpen('language',{history:'replace'}));await page.waitForTimeout(70);
await page.screenshot({path:`${out}/language-390.png`,fullPage:false});

stage('language:start');
// Language: add -> render -> refresh -> report -> refresh -> delete -> refresh.
await page.evaluate(()=>window.ElaraOpen('language-books',{history:'push'}));await page.waitForSelector('#panel-language-books:not(.hidden) #language-book-form');
await page.locator('#language-book-form [name=title]').fill('QA Language Book');await page.locator('#language-book-form').evaluate(form=>form.requestSubmit());
await page.locator('#elara-dialog-root .language-book-add-dialog [name=total]').fill('200');await page.locator('#elara-dialog-root .language-book-add-dialog [name=current]').fill('10');await page.locator('#elara-dialog-root .language-book-add-dialog [type=submit]').click();await page.waitForTimeout(100);
let row=page.locator('.pass3-language-book').filter({hasText:'QA Language Book'}).first();
if(!await row.isVisible()){
 const diag=await page.evaluate(()=>({storage:JSON.parse(localStorage.getItem('elara_language_books_v2')||'[]'),read:window.ElaraLanguageBooks?.read?.()||null,listCount:document.querySelectorAll('#language-book-list').length,listHTML:document.querySelector('#language-book-list')?.innerHTML||'',listText:document.querySelector('#language-book-list')?.innerText||'',panelHidden:document.querySelector('#panel-language')?.classList.contains('hidden'),trace:window.__elaraLanguageRenderTrace||[],addTrace:window.__elaraLanguageAddTrace||[],visualScripts:[...document.scripts].map(s=>s.src).filter(src=>src.includes('approved-visual.js')),optional:window.__elaraOptionalFailures||[]}));
 throw new Error('book saved but did not render: '+JSON.stringify(diag)+' pageErrors='+errors.join(' | '));
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

stage('language:pass');
stage('language-task:start');
const reviewFixture=await page.evaluate(()=>{
 const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}'),d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 s.words=[{id:'p0-review-word',front:'hello',back:'سلام',due:day,box:1}];localStorage.setItem('elara_space_v1',JSON.stringify(s));window.ElaraLinkedTasks.syncAll();
 const next=JSON.parse(localStorage.getItem('elara_space_v1')||'{}'),task=next.tasks.find(t=>t.sourceType==='language-review'&&t.sourceId===day);
 return {id:task?.id||'',locked:task?.sourceCompletionLocked,completed:task?.completed,due:next.words[0]?.due};
});
assert.ok(reviewFixture.id,'Language review linked Task was not created');assert.equal(reviewFixture.locked,false,'Language review Task must be directly checkable in Tasks');assert.equal(reviewFixture.completed,false,'Language review Task should start pending while a word is due');
await page.evaluate(()=>window.ElaraOpen('tasks',{history:'replace'}));
const reviewCheck=page.locator(`#task-list .check-button[data-id="${reviewFixture.id}"]`);await reviewCheck.waitFor({state:'visible',timeout:10000});assert.equal(await reviewCheck.isVisible(),true,'Language review Task checkbox is not visible');await reviewCheck.click();await page.waitForTimeout(100);assert.equal(await reviewCheck.getAttribute('aria-pressed'),'true','Language review Task did not toggle complete');
const reviewAfter=await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return{task:s.tasks.find(t=>t.id===id),word:s.words.find(w=>w.id==='p0-review-word'),xp:s.xp}},reviewFixture.id);
assert.equal(reviewAfter.task?.completed,true,'Language review completion did not persist');assert.equal(reviewAfter.word?.due,reviewFixture.due,'Checking the Task must not silently review/change the Leitner word');assert.equal(reviewAfter.xp,20,'Checking a source-linked Language task must not grant duplicate XP');
await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');s.words=[];localStorage.setItem('elara_space_v1',JSON.stringify(s));window.ElaraLinkedTasks.syncAll()});await page.waitForTimeout(60);
stage('language-task:pass');stage('settings:start');
// Settings main list via real hamburger -> Privacy.
await page.locator('#elara-account-menu-trigger').click();await page.waitForTimeout(60);
assert.equal(await page.locator('.drawer-menu').isVisible(),true,'Settings main list missing');
const settingsBox=await withinViewport(page,'.elara-private-drawer-panel','Settings home'),settingsVp=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
assert.ok(Math.abs(settingsBox.x+settingsBox.width/2-settingsVp.w/2)<=3&&Math.abs(settingsBox.y+settingsBox.height/2-settingsVp.h/2)<=Math.max(10,settingsVp.h*.03),'Settings home is not centered '+JSON.stringify({settingsBox,settingsVp}));
await page.screenshot({path:`${out}/settings-home-390.png`,fullPage:false});
const menuButtons=page.locator('.drawer-menu>button');assert.equal(await menuButtons.count(),5,'Profile home must stay focused and keep account settings behind the gear');
const settingsOrder=await menuButtons.evaluateAll(xs=>xs.map(x=>x.dataset.drawerNav||(x.hasAttribute('data-approved-wardrobe')?'wardrobe':x.dataset.drawerAction||'')));
assert.deepEqual(settingsOrder,['account','blocked','wardrobe','store','reports'],'Profile home destinations drifted');
const settingsIcons=await menuButtons.evaluateAll(xs=>xs.map(x=>{const host=x.querySelector(':scope > .elara-icon');const svg=host?.querySelector('svg'),mark=svg?.querySelector('path,rect,circle,line,polyline,polygon,ellipse');const r=host?.getBoundingClientRect();return{hasHost:!!host,hasSvg:!!svg,hasMark:!!mark,w:r?.width||0,h:r?.height||0,color:host?getComputedStyle(host).color:''}}));
assert.equal(settingsIcons.every(x=>x.hasHost&&x.hasSvg&&x.hasMark&&x.w>=24&&x.h>=24),true,'Profile menu contains blank icon placeholders: '+JSON.stringify(settingsIcons));
const menuLayout=await page.locator('.drawer-menu').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns,buttons:[...el.children].filter(x=>x.matches('button')).map(x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})}));
assert.equal(menuLayout.columns.trim().split(/\s+/).length,1,'Profile mobile menu is not one column: '+menuLayout.columns);
assert.equal(menuLayout.buttons.every((r,i,a)=>r.width>=300&&(!i||r.y>a[i-1].y)),true,'Profile rows are squeezed or not vertically ordered: '+JSON.stringify(menuLayout.buttons));
await page.locator('.drawer-settings-gear').click();await page.waitForTimeout(80);
assert.equal(await page.locator('[data-drawer-section="settings"]:not(.hidden)').count(),1,'Profile gear did not open dedicated Settings page');
for(const route of ['security','privacy','blocked','language','calendar','help','appearance','folders'])assert.equal(await page.locator('[data-drawer-section="settings"] [data-drawer-nav="'+route+'"]').count(),1,'Profile Settings missing '+route);
assert.equal(await page.locator('[data-drawer-section="settings"] [data-approved-wardrobe]').count(),1,'Profile Settings missing Wardrobe');
assert.equal(await page.locator('[data-drawer-section="settings"] [data-drawer-action="store"]').count(),1,'Profile Settings missing Store');
assert.equal(await page.locator('[data-drawer-section="settings"] [data-drawer-action="logout"]').count(),1,'Profile Settings missing Logout');
assert.equal(await page.locator('[data-drawer-section="settings"] [data-drawer-nav="notifications"]').count(),0,'Notifications must stay on the Bell, not inside Profile Settings');
await page.locator('[data-drawer-section="settings"] [data-drawer-nav="appearance"]').click();await page.waitForTimeout(100);
const themeImgs=page.locator('[data-drawer-section="appearance"] img.pass4-theme-art,[data-drawer-section="appearance"] img.pass4-accent-art');
assert.equal(await themeImgs.count(),16,'Appearance must render 8 mode/style + 8 accent uploaded previews');
await page.waitForFunction(()=>{const xs=[...document.querySelectorAll('[data-drawer-section="appearance"] img.pass4-theme-art,[data-drawer-section="appearance"] img.pass4-accent-art')];return xs.length===16&&xs.every(x=>x.complete)},{},{timeout:15000});
const themeDecode=await themeImgs.evaluateAll(async xs=>{await Promise.all(xs.map(x=>typeof x.decode==='function'?x.decode().catch(()=>{}):Promise.resolve()));return xs.map(x=>({src:x.currentSrc||x.src,complete:x.complete,naturalWidth:x.naturalWidth}))});
assert.equal(themeDecode.every(x=>x.complete&&x.naturalWidth>0),true,'One or more uploaded theme previews failed to decode: '+JSON.stringify(themeDecode.filter(x=>!x.complete||!x.naturalWidth)));
await page.screenshot({path:`${out}/appearance-themes-390.png`,fullPage:false});
await page.locator('[data-drawer-section="appearance"] [data-drawer-nav="home"]').click();await page.waitForTimeout(40);
await page.locator('.drawer-settings-gear').click();await page.waitForTimeout(40);await page.locator('[data-drawer-section="settings"] [data-drawer-nav="privacy"]').click();await page.waitForTimeout(60);await withinViewport(page,'.elara-private-drawer-panel','Privacy');await topmost(page,'.elara-private-drawer-panel','Privacy');
assert.equal(await page.locator('[data-drawer-section="privacy"] [data-drawer-nav="home"]').isVisible(),true,'Privacy Back missing');

stage('settings-privacy:pass');stage('settings-account:start');
await page.locator('[data-drawer-section="privacy"] [data-drawer-nav="home"]').click();await page.waitForTimeout(40);
await page.locator('.drawer-settings-gear').click();await page.waitForTimeout(40);await page.locator('[data-drawer-section="settings"] [data-drawer-nav="security"]').click();await page.waitForTimeout(50);await withinViewport(page,'.elara-private-drawer-panel','Account security');
assert.equal(await page.locator('[data-drawer-section="security"] #drawer-password-form').isVisible(),true,'Account security page missing password form');
assert.equal(await page.locator('[data-drawer-section="security"] [data-drawer-nav="home"]').isVisible(),true,'Account Back missing');
await page.locator('[data-drawer-section="security"] [data-drawer-nav="home"]').click();await page.waitForTimeout(35);
stage('settings-account:pass');stage('wardrobe:start');
// Settings -> Wardrobe. Wardrobe must be above Settings.
await page.locator('.drawer-menu [data-approved-wardrobe]').click();await page.waitForTimeout(70);
await withinViewport(page,'.approved-wardrobe-window','Wardrobe');await topmost(page,'.approved-wardrobe-window','Wardrobe');
let z=await page.evaluate(()=>({drawer:Number(getComputedStyle(document.querySelector('.elara-private-drawer')).zIndex),wardrobe:Number(getComputedStyle(document.querySelector('.approved-wardrobe')).zIndex)}));assert.ok(z.wardrobe>z.drawer,'Wardrobe below Settings '+JSON.stringify(z));
await page.waitForFunction(()=>{const x=document.querySelector('.approved-wardrobe .wardrobe-title-art');return !!x&&x.complete&&x.naturalWidth>0},{timeout:3000});assert.equal(await page.locator('.approved-wardrobe .wardrobe-title-art').evaluate(x=>x.complete&&x.naturalWidth>0),true,'Wardrobe hanger artwork failed to load');
const moreBanners=page.locator('.approved-wardrobe [data-wardrobe-more="banner"]');if(await moreBanners.count())await moreBanners.click();await page.waitForTimeout(60);
const wardrobeBanners=page.locator('.approved-wardrobe [data-wardrobe-item="banner"]');assert.equal(await wardrobeBanners.count(),4,'Wardrobe must expose four uploaded banners');
const bannerBackgrounds=await wardrobeBanners.evaluateAll(xs=>xs.map(x=>getComputedStyle(x.querySelector('.wardrobe-banner')).backgroundImage));
for(const name of ['banner1.webp','banner2.webp','banner3.webp','banner4.webp'])assert.ok(bannerBackgrounds.some(x=>x.includes(name)),'Wardrobe missing '+name);
await page.screenshot({path:`${out}/wardrobe-banners-390.png`,fullPage:false});
await page.locator('.approved-wardrobe [data-back-wardrobe]').click();await page.waitForTimeout(30);

stage('wardrobe:pass');stage('profile:start');
// Account -> Edit Profile via real clicks. Save visible, dialog above Settings.
await page.locator('.drawer-menu [data-drawer-nav="account"]').click();await page.waitForTimeout(50);await page.locator('[data-drawer-section="account"] [data-profile-edit]').click();await page.waitForTimeout(80);
await withinViewport(page,'#elara-dialog-root .elara-dialog-panel','Profile editor');await topmost(page,'#elara-dialog-root .elara-dialog-panel','Profile editor');
assert.equal(await page.locator('#elara-central-profile-form .pass4-profile-edit-actions-top [type=submit]').isVisible(),true,'Profile Save is not immediately visible');
const photoOverlay=page.locator('#elara-central-profile-form .elara-profile-avatar-shell .profile-upload-overlay');assert.equal(await photoOverlay.isVisible(),true,'Profile change-photo control must sit on the profile image');assert.equal((await photoOverlay.innerText()).trim(),'تغییر عکس','Profile image control label mismatch');
await page.screenshot({path:`${out}/profile-editor-390.png`,fullPage:false});
z=await page.evaluate(()=>({drawer:Number(getComputedStyle(document.querySelector('.elara-private-drawer')).zIndex),dialog:Number(getComputedStyle(document.querySelector('#elara-dialog-root')).zIndex)}));assert.ok(z.dialog>z.drawer,'Profile dialog below Settings '+JSON.stringify(z));

stage('profile:pass');stage('nested-dialog:start');
// A second ElaraDialog must stack above the profile editor, then Back returns to parent.
await page.evaluate(()=>{void ElaraDialog.open({title:'Nested P0',message:'Nested'})});await page.waitForTimeout(50);
assert.equal(await page.locator('#elara-dialog-root .elara-dialog-layer').count(),2,'nested dialog replaced parent');
const layers=page.locator('#elara-dialog-root .elara-dialog-layer'),z0=Number(await layers.nth(0).evaluate(el=>getComputedStyle(el).zIndex)),z1=Number(await layers.nth(1).evaluate(el=>getComputedStyle(el).zIndex));assert.ok(z1>z0,'nested dialog is not above parent');await topmost(page,'#elara-dialog-root .elara-dialog-layer:last-child .elara-dialog-panel','nested dialog');
await page.locator('#elara-dialog-root .elara-dialog-layer').last().locator('.elara-dialog-back').click();await page.waitForTimeout(30);assert.equal(await page.locator('#elara-dialog-root .elara-dialog-layer').count(),1,'Back did not return to profile editor');await page.locator('#elara-dialog-root .elara-dialog-back').click();await page.waitForTimeout(30);

stage('nested-dialog:pass');stage('notifications:start');
// Close Settings; Bell -> Notifications must be topmost and inside viewport.
await page.locator('[data-drawer-section="account"] [data-drawer-nav="home"]').click();await page.waitForTimeout(30);await page.locator('.elara-private-drawer [data-drawer-close]').click();await page.waitForTimeout(50);assert.equal(await page.locator('.elara-private-drawer:not(.hidden)').count(),0,'Settings drawer remained open after explicit Close');assert.equal(await page.evaluate(()=>document.body.classList.contains('elara-private-drawer-open')),false,'Settings body scroll lock remained after Close');await page.locator('.bottom-nav [data-elara-tab="home"]').click();await page.waitForTimeout(180);
const bell=page.locator('#ref-header-notifications,[data-notification-bell]').first();assert.equal(await bell.isVisible(),true,'Bell missing');await bell.click();await page.waitForTimeout(60);await withinViewport(page,'.elara-notification-window','Notifications');await topmost(page,'.elara-notification-window','Notifications');await page.locator('.elara-notification-window [data-notification-back]').click();await page.waitForTimeout(30);
assert.equal(await page.locator('.elara-private-drawer:not(.hidden)').count(),0,'Bell/notification flow reopened Settings drawer');
assert.equal(await page.locator('#elara-notification-popover:not(.hidden)').count(),0,'Notifications remained open after Back');

stage('notifications:pass');stage('task-mobile:start');
// A closed full-screen drawer must not remain in the pointer hit-test path.
const taskNav=page.locator('.bottom-nav [data-elara-tab="tasks"]'),taskNavBox=await taskNav.boundingBox();assert.ok(taskNavBox,'Tasks nav has no box');
const blocker=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);return {tag:el?.tagName||'',classes:String(el?.className||''),drawer:!!el?.closest?.('.elara-private-drawer')}},{x:taskNavBox.x+taskNavBox.width/2,y:taskNavBox.y+taskNavBox.height/2});
assert.equal(blocker.drawer,false,'closed Settings drawer still intercepts mobile nav: '+JSON.stringify(blocker));
// Task kebab mobile: topmost and real delete fixture.
await taskNav.click();await page.waitForTimeout(160);
let kebab=page.locator('.astra-task-more').first(),summary=kebab.locator('summary');assert.equal(await summary.isVisible(),true,'390 task kebab hidden');await summary.click();await page.waitForTimeout(40);
let menu=kebab.locator('.item-actions');assert.equal(await menu.isVisible(),true,'390 task menu hidden');assert.equal(await menu.locator('[data-phase2-action="edit-task"]').isVisible(),true,'390 Edit missing');assert.equal(await menu.locator('[data-phase2-action="delete-task"]').isVisible(),true,'390 Delete missing');await topmost(page,'.astra-task-more[open] .item-actions','390 task menu');
await menu.locator('[data-phase2-action="delete-task"]').click();await page.waitForTimeout(40);const danger=page.locator('#elara-dialog-root .elara-dialog-danger').last();if(await danger.count()){await danger.click();await page.waitForTimeout(80)}
stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}'));assert.equal((stored.tasks||[]).some(t=>t.id==='p0-task'),false,'390 task delete did not persist');

stage('task-mobile:pass');assert.deepEqual(errors,[],'runtime errors: '+errors.join(' | '));
await context.close();

// Task kebab desktop 1440, including real delete.
stage('desktop-task:start');
const desktop=await browser.newContext({viewport:{width:1440,height:1000}}),dp=await desktop.newPage();dp.setDefaultTimeout(8000);dp.setDefaultNavigationTimeout(12000);await dp.addInitScript(seed);await stub(dp);await dp.goto(base+'/#tasks',{waitUntil:'domcontentloaded'});await waitBoot(dp);await dp.waitForTimeout(250);if(await dp.locator('#panel-tasks.hidden').count())await dp.evaluate(()=>ElaraOpen('tasks',{history:'replace'}));await dp.waitForTimeout(100);
kebab=dp.locator('.astra-task-more').first();summary=kebab.locator('summary');assert.equal(await summary.isVisible(),true,'1440 task kebab hidden');await summary.click();await dp.waitForTimeout(40);menu=kebab.locator('.item-actions');assert.equal(await menu.isVisible(),true,'1440 task menu hidden');assert.equal(await menu.locator('[data-phase2-action="edit-task"]').isVisible(),true,'1440 Edit missing');assert.equal(await menu.locator('[data-phase2-action="delete-task"]').isVisible(),true,'1440 Delete missing');await topmost(dp,'.astra-task-more[open] .item-actions','1440 task menu');await menu.locator('[data-phase2-action="delete-task"]').click();await dp.waitForTimeout(40);const dd=dp.locator('#elara-dialog-root .elara-dialog-danger').last();if(await dd.count()){await dd.click();await dp.waitForTimeout(80)}const ds=await dp.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}'));assert.equal((ds.tasks||[]).some(t=>t.id==='p0-task'),false,'1440 task delete did not persist');stage('desktop-task:pass');await desktop.close();

stage('all:pass');await browser.close();console.log('P0 language/nav/popup/task/settings regression PASS');
