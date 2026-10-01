import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text())});
await page.addInitScript(()=>{
 localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,tasks:[],habits:[],goals:[],books:[],words:[],folders:[],tags:[]}));
 localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',color:'violet',style:'default',language:'fa'}));
 localStorage.setItem('elara_locale_v1','fa');
 localStorage.removeItem('elara_language_books_v2');
 for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith('elara_language_books_v2_migrated_'))localStorage.removeItem(k)}
});
const cloudStub=`window.ElaraAccount={user:null,profile:{name:'QA',username:'qa_user',xp:20},sendPasswordReset:async()=>{},changePassword:async()=>{},logout:async()=>{}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`window.ElaraSocial={me:null,friends:[],requests:[],activities:[],saveProfileValues:async values=>({profile:values,warnings:[]}),publishActivity:async()=>true,refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));`;
await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&window.ElaraDialog&&window.ElaraOpen,null,{timeout:12000});
await page.waitForTimeout(1200);
const readyDiag=await page.evaluate(()=>({panelLanguage:!!document.querySelector('#panel-language'),languageForm:!!document.querySelector('#language-book-form'),optional:window.__elaraOptionalFailures||[],wardrobe:!!window.ElaraWardrobeUI,visualScripts:[...document.scripts].map(s=>s.src).filter(x=>x.includes('approved-visual'))}));
assert.equal(readyDiag.panelLanguage,true,'Language panel was not created: '+JSON.stringify(readyDiag)+' errors='+errors.join(' | '));
assert.equal(readyDiag.languageForm,true,'Language form was not created: '+JSON.stringify(readyDiag));
const languageNav=page.locator('.bottom-nav [data-elara-tab="language"]').first();
assert.equal(await languageNav.isVisible(),true,'language nav is not visible on mobile');
await languageNav.click();
await page.waitForFunction(()=>document.querySelector('#language-book-form')&&document.querySelector('#panel-language')&&!document.querySelector('#panel-language').classList.contains('hidden'),null,{timeout:5000});
await page.waitForTimeout(250);

// Add while unauthenticated.
await page.locator('#language-book-form [name=title]').fill('P0 language book');
await page.locator('#language-book-form').evaluate(form=>form.requestSubmit());
await page.locator('#elara-dialog-root .language-book-add-dialog [name=total]').fill('200');
await page.locator('#elara-dialog-root .language-book-add-dialog [name=current]').fill('10');
await page.locator('#elara-dialog-root .language-book-add-dialog [type=submit]').click();
await page.waitForTimeout(80);
let row=page.locator('.pass3-language-book').filter({hasText:'P0 language book'}).first();
if(!await row.isVisible()){
 const addDiag=await page.evaluate(()=>({v2:localStorage.getItem('elara_language_books_v2'),legacyGuest:localStorage.getItem('elara_language_books_v1_guest'),accountUid:window.ElaraAccount?.user?.uid||null,socialUid:window.ElaraSocial?.me?.uid||null,dialogDepth:window.ElaraDialog?.depth?.(),dialogText:document.querySelector('#elara-dialog-root')?.innerText||'',listText:document.querySelector('#language-book-list')?.innerText||''}));
 throw new Error('book did not enter shelf immediately: '+JSON.stringify(addDiag)+' runtime='+errors.join(' | '));
}

// Auth arrives after creation. Book must remain visible in the same canonical store.
await page.evaluate(()=>{window.ElaraAccount={...window.ElaraAccount,user:{uid:'qa-owner'}};window.dispatchEvent(new Event('elara:account-ready'))});
await page.waitForTimeout(100);
row=page.locator('.pass3-language-book').filter({hasText:'P0 language book'}).first();
assert.equal(await row.isVisible(),true,'book vanished after account-ready');
const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_language_books_v2')||'[]'));
const owned=persisted.find(x=>x.title==='P0 language book');
assert.ok(owned,'book missing from canonical v2 storage');
assert.equal(owned.ownerUid,'qa-owner','anonymous book was not claimed by authenticated owner');

// Reading report must open and persist.
await row.locator('[data-language-reading]').click();
await page.waitForTimeout(40);
assert.equal(await page.locator('#elara-dialog-root .library-log-form').isVisible(),true,'reading report did not open');
await page.locator('#elara-dialog-root .library-log-form [name=mode]').selectOption('count');
await page.locator('#elara-dialog-root .library-log-form [name=pages]').fill('5');
await page.locator('#elara-dialog-root .elara-dialog-layer').last().locator('.elara-dialog-actions .primary-button').click();
await page.waitForTimeout(80);
row=page.locator('.pass3-language-book').filter({hasText:'P0 language book'}).first();
assert.match(await row.innerText(),/15|۱۵/,'reading report did not persist page 15');

// Delete must actually remove canonical row.
await row.locator('[data-language-book-delete]').click();
await page.waitForTimeout(80);
assert.equal(await page.locator('.pass3-language-book').filter({hasText:'P0 language book'}).count(),0,'delete did not remove visible row');
const afterDelete=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_language_books_v2')||'[]'));
assert.equal(afterDelete.some(x=>x.title==='P0 language book'),false,'delete did not remove canonical row');

// Settings subpages and profile editor must be centered in the mobile viewport.
await page.evaluate(()=>ElaraPrivateDrawer.open('privacy'));
await page.waitForTimeout(80);
async function assertCentered(selector,label){
 const box=await page.locator(selector).boundingBox();assert.ok(box,label+' missing');
 const vh=await page.evaluate(()=>innerHeight),center=box.y+box.height/2;
 assert.ok(Math.abs(center-vh/2)<=16,label+' not centered: '+JSON.stringify({box,vh,center}));
}
await assertCentered('.elara-private-drawer-panel','privacy panel');
await page.evaluate(()=>ElaraPrivateDrawer.open('account'));
await page.waitForTimeout(60);
await assertCentered('.elara-private-drawer-panel','account panel');
await page.evaluate(()=>ElaraProfileSystem.openEditor());
await page.waitForTimeout(80);
await assertCentered('#elara-dialog-root .elara-dialog-panel','profile editor dialog');

assert.deepEqual(errors,[],'runtime errors: '+errors.join(' | '));
await browser.close();
console.log('P0 language/popup browser regression PASS');
