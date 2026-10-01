import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub=`window.ElaraAccount={user:null,profile:{name:'Library QA',username:'library_qa',bio:'',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`window.ElaraSocial={me:{uid:'qa',name:'Library QA'},friends:[],requests:[],activities:[],refresh:async()=>{},activityVisibility:()=> 'friends',publishActivity:async function(type,detail){(window.__published||(window.__published=[])).push({type,detail});return true}};window.dispatchEvent(new Event('elara:social-updated'));`;
const seed=()=>localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,theme:'dark',tasks:[],habits:[],goals:[],words:[],folders:[],tags:[],taskLists:[],focusSessions:[],taskCompletionHistory:[],missionRewardClaims:[],bookShelves:[],bookClips:[],books:[{id:'qa-book',title:'کتاب آزمایشی',author:'نویسنده تست',totalPages:200,currentPage:40,shelf:'reading',readingLogs:[]}]}));
async function wire(page){
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.route('https://openlibrary.org/search.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({docs:[{key:'/works/OL-QA',title:'Imported Moon Book',author_name:['QA Author'],cover_i:12345,number_of_pages_median:321,first_publish_year:2020}]})}));
 await page.addInitScript(seed);
}
async function open(width,height){
 const page=await browser.newPage({viewport:{width,height}});await wire(page);
 await page.goto(base+'/?library-stage4='+Date.now()+'#books',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraLibraryEnhancements&&document.querySelector('#library-clips')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 return page;
}
const page=await open(390,844);
assert.equal(await page.locator('.library-enhancement-tools').count(),1,'library enhancement toolbar missing');
await page.locator('[data-library-new-shelf]').click();
await page.locator('.elara-dialog-field input').fill('شب‌های بارانی');
await page.getByRole('button',{name:'ساختن'}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).bookShelves.includes('شب‌های بارانی'));
assert.equal(await page.locator('[data-library-shelf-filter="شب‌های بارانی"]').count(),1,'custom shelf chip missing');
await page.locator('[data-library-shelf-filter=""]').click();

await page.locator('[data-library-manage-book="qa-book"]').click();
await page.locator('.library-manage-book select[name="customShelf"]').selectOption('شب‌های بارانی');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZVxkAAAAASUVORK5CYII=','base64');
await page.locator('.library-manage-book input[name="cover"]').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});
await page.waitForFunction(()=>document.querySelector('[data-library-cover-preview]')?.src.startsWith('data:image/'));
await page.getByRole('button',{name:'ذخیره'}).click();
await page.waitForFunction(()=>{const b=JSON.parse(localStorage.getItem('elara_space_v1')).books.find(x=>x.id==='qa-book');return b?.customShelf==='شب‌های بارانی'&&String(b.coverData||'').startsWith('data:image/')});
assert.ok((await page.locator('[data-key="qa-book"] .library-cover img').getAttribute('src')).startsWith('data:image/'),'uploaded cover not rendered');

const clipForm=page.locator('[data-library-clip-form]');
await clipForm.locator('select[name="bookId"]').selectOption('qa-book');
await clipForm.locator('input[name="page"]').fill('42');
await clipForm.locator('textarea[name="text"]').fill('این جمله را می‌خواهم نگه دارم.');
await clipForm.locator('select[name="visibility"]').selectOption('friends');
await clipForm.locator('input[name="image"]').setInputFiles({name:'clip.png',mimeType:'image/png',buffer:png});
await page.waitForFunction(()=>document.querySelector('[data-library-clip-preview] img')?.src.startsWith('data:image/'));
await clipForm.locator('[data-library-remove-clip-image]').click();
assert.equal(await page.locator('[data-library-clip-preview] img').count(),0,'clip image remove failed');
await clipForm.getByRole('button',{name:'ثبت بریده'}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).bookClips.length===1);
const clip=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).bookClips[0]);
assert.equal(clip.page,42);assert.equal(clip.visibility,'friends');assert.equal(clip.imageData,'');
assert.equal(await page.locator('.library-clip-card').count(),1,'clip card missing');
assert.equal((await page.evaluate(()=>window.__published||[])).some(x=>x.type==='book_clip'),true,'friend clip was not published through social service');

await page.locator('[data-library-search-books]').click();
await page.locator('[data-library-online-search] input[name="q"]').fill('moon');
await page.locator('[data-library-online-search]').getByRole('button',{name:'جستجو'}).click();
await page.waitForSelector('[data-library-import="0"]');
await page.locator('[data-library-import="0"]').click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books.some(b=>b.title==='Imported Moon Book'));
const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books.find(b=>b.title==='Imported Moon Book'));
assert.equal(imported.totalPages,321);assert.match(imported.coverUrl,/^https:\/\/covers\.openlibrary\.org\//);

await page.evaluate(()=>window.ElaraI18n.set('en'));
await page.waitForTimeout(120);
assert.match(await page.locator('.library-enhancement-tools').innerText(),/My shelves/i,'library extension did not localize to English');
const m=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(m.scroll<=m.w+1,'390 library horizontal overflow '+JSON.stringify(m));
await page.screenshot({path:'browser-artifacts/library-stage4-390.png',fullPage:true});
await page.close();

const desktop=await open(1440,1000);
const dm=await desktop.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dm.scroll<=dm.w+1,'1440 library horizontal overflow '+JSON.stringify(dm));
await desktop.screenshot({path:'browser-artifacts/library-stage4-1440.png',fullPage:true});
await desktop.close();
await browser.close();
console.log('LIBRARY_STAGE4_PASS shelves cover clip image-remove metadata-import i18n 390/1440');
