import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const publicSite=base.startsWith('https:');
await mkdir('browser-artifacts/lib06',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'lib06-case-qa',emailVerified:true},profile:{uid:'lib06-case-qa',name:'Library QA',username:'lib06',profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'lib06-case-qa',name:'Library QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const seed=()=>({version:1,theme:'dark',xp:0,tasks:[],habits:[],goals:[],words:[],folders:[],tags:[],taskLists:[],focusSessions:[],bookClips:[],
 bookShelves:['رشد فردی','داستان‌ها'],
 books:[
 {id:'lib06-reading',title:'عادت‌های اتمی',author:'James Clear',shelf:'reading',totalPages:320,currentPage:70,customShelf:'رشد فردی',readingLogs:[]},
 {id:'lib06-want',title:'تلماسه',author:'Frank Herbert',shelf:'want',totalPages:500,currentPage:0,readingLogs:[]},
 {id:'lib06-finished',title:'انسان خردمند',author:'Yuval Noah Harari',shelf:'finished',totalPages:320,currentPage:320,customShelf:'داستان‌ها',readingLogs:[]}
 ]});
async function open(width){
 const page=await browser.newPage({viewport:{width,height:width<500?860:960}});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.addInitScript(fixture=>{
  if(!sessionStorage.getItem('lib06_fixture')){localStorage.setItem('elara_space_v1',JSON.stringify(fixture));sessionStorage.setItem('lib06_fixture','yes')}
 },seed());
 await page.goto(base+'/?lib06='+width+'#library-shelves',{waitUntil:'domcontentloaded',timeout:40000});
 await page.waitForFunction(()=>!!window.ElaraLibraryShelvesLIB02 && !!window.ElaraLibraryEnhancements&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
 for(let attempt=0;attempt<3;attempt++){
  await page.evaluate(()=>window.ElaraOpen('library-shelves',{history:'replace'}));
  try{await page.locator('#panel-library-shelves:not(.hidden) #lib02-scene .lib02-custom-case').first().waitFor({timeout:11000});break}
  catch(e){if(attempt===2)throw e}
 }
 return page;
}
try {
 for(const width of [320,390,430,768,1024,1440,1648]){
  const page=await open(width);
  const values=await page.evaluate(()=>{
   const panel=document.getElementById('panel-library-shelves'),custom=[...panel.querySelectorAll('.lib02-custom-case')];
   const bg=custom.map(c=>getComputedStyle(c.querySelector('.lib02-wood')).backgroundImage);
   const title=custom.map(c=>c.querySelector('.lib06-custom-head h3')?.innerText);
   const layout=getComputedStyle(panel.querySelector('.lib06-custom-grid')).gridTemplateColumns;
   return {w:innerWidth,scroll:document.documentElement.scrollWidth,custom:custom.length,title,bg,
   layout,canonical:panel.querySelectorAll('.lib02-shelves [data-lib02-shelf]').length,
   editor:!!panel.querySelector('.lib06-legacy-tools #book-form'),oldTags:panel.querySelectorAll('.lib02-personal-chip').length,
   collapsed:!panel.querySelector('.lib06-legacy-tools').open,
   shelfBooks:custom.map(c=>c.querySelectorAll('[data-lib02-book]').length)};
  });
  assert.equal(values.custom,2,'Custom shelves must be physical boxes '+width);
  assert.equal(values.canonical,3,'Canonical statuses still render '+width);
  assert.ok(values.title.some(x=>x.includes('رشد فردی')),'Custom title missing '+width);
  assert.deepEqual(values.shelfBooks,[1,1],'custom shelf contents from saved books '+width);
  assert.equal(values.editor,true,'canonical editor still available '+width);
  assert.equal(values.collapsed,true,'old duplicate book UI should be collapsed '+width);
  assert.equal(values.oldTags,0,'obsolete chips still present '+width);
  assert.equal(await page.locator('#lib02-scene .lib02-hero').count(),0,'duplicate old shelf hero must not return '+width);
  for(const bg of values.bg){
   assert.match(bg,/Cinematic(?:%20|\s)Gothic(?:%20|\s)Library(?:%20|\s)Alcove\.webp/,'original wooden image missing '+width);
   assert.doesNotMatch(bg,/library-card-background\.webp/,'purple older image visible '+width);
  }
  assert.ok(values.scroll<=values.w+2,'horizontal overflow '+width+' '+JSON.stringify(values));
  if(width<701)assert.equal(values.layout.split(' ').length,1,'mobile custom shelf must have one column');
  if(width>=1151)assert.equal(values.layout.split(' ').length,3,'desktop custom shelves must support three-column layout');
  if(width===390||width===1440)await page.screenshot({path:'browser-artifacts/lib06/'+(publicSite?'live':'candidate')+'-custom-'+width+'.png',fullPage:true});
  if(width===390){
   await page.locator('[data-lib02-new-shelf]').click();
   await page.locator('.elara-dialog-field input').fill('شب‌های آرام');
   await page.getByRole('button',{name:'ساختن'}).click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).bookShelves.includes('شب‌های آرام'));
   const newCard=page.locator('.lib02-custom-case[data-lib02-custom-shelf="شب‌های آرام"]');
   await newCard.waitFor();
   assert.ok(await newCard.isVisible(),'newly created shelf must be visible on phone');
   assert.match(await newCard.locator('.lib02-wood').evaluate(el=>getComputedStyle(el).backgroundImage),/Cinematic/);
   await newCard.locator('[data-lib02-assign]').first().click();
   await page.locator('.lib06-book-picker select').selectOption('lib06-want');
   await page.getByRole('button',{name:'افزودن',exact:true}).click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books.find(x=>x.id==='lib06-want')?.customShelf==='شب‌های آرام');
   assert.equal(await newCard.locator('[data-lib02-book="lib06-want"]').count(),1,'assigned book must render on correct shelf');
   await newCard.locator('[data-lib02-rename]').click();
   await page.locator('.elara-dialog-field input').fill('قفسه من');
   await page.getByRole('button',{name:'ذخیره'}).click();
   await page.waitForFunction(()=>{
    const s=JSON.parse(localStorage.getItem('elara_space_v1'));
    return s.bookShelves.includes('قفسه من')&&s.books.find(b=>b.id==='lib06-want')?.customShelf==='قفسه من';
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!document.querySelector('.lib02-custom-case[data-lib02-custom-shelf="قفسه من"] [data-lib02-book="lib06-want"]'),null,{timeout:30000});
   assert.equal(await page.locator('.lib02-custom-case[data-lib02-custom-shelf="قفسه من"]').count(),1,'renamed shelf must survive refresh');
   const removal=page.locator('.lib02-custom-case[data-lib02-custom-shelf="قفسه من"] [data-lib02-remove-shelf]');
   await removal.click();
   await page.getByRole('button',{name:'حذف',exact:true}).click();
   await page.waitForFunction(()=>{
    const q=JSON.parse(localStorage.getItem('elara_space_v1'));
    return !q.bookShelves.includes('قفسه من')&&q.books.some(x=>x.id==='lib06-want'&&!x.customShelf);
   });
   assert.equal(await page.locator('.lib02-custom-case[data-lib02-custom-shelf="قفسه من"]').count(),0,'deleted custom case persists');
   assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books)).some(x=>x.id==='lib06-want'),'deletion must never remove actual book');
   console.log('LIB06_DELETE_SHELF_KEEP_BOOK_PASS');

   console.log('LIB06_CREATE_ASSIGN_RENAME_RELOAD_PASS');
   const old=page.locator('#panel-library-shelves .lib06-legacy-tools');
   await old.locator('summary').click();
   assert.ok(await page.locator('#panel-library-shelves #book-form').isVisible(),'underlying add editor must be accessible');
  }
  if(width===1440){
   await page.evaluate(()=>window.ElaraOpen('books',{history:'push'}));
   await page.locator('#panel-books:not(.hidden) #lib01-overview').waitFor();
   const palette=await page.locator('#lib01-overview .lib01-focus-dial').evaluate(el=>{
     const ring=getComputedStyle(el).backgroundImage;
     const button=getComputedStyle(el.querySelector('button')).backgroundImage;
     return {ring,button};
   });
   assert.doesNotMatch(palette.ring,/#8656fa|#2a9bff|134, 86, 250|42, 155, 255/i,'purple focus dial persists in library');
   assert.doesNotMatch(palette.button,/#ab6dff|#4c28dd|171, 109, 255|76, 40, 221/i,'purple focus play button persists in library');
   assert.equal(await page.locator('#lib01-overview [data-lib01-route="library-clips"]').count(),1,'duplicate clips tab');
   assert.equal(await page.locator('#lib01-overview [data-lib01-route="library-shelves"]').count(),1,'duplicate shelves tab');
   for(const route of ['library-clips','library-search','library-reports']){
    await page.evaluate(x=>window.ElaraOpen(x,{history:'push'}),route);
    await page.locator('#panel-'+route+':not(.hidden)').waitFor();
    const style=await page.locator('#panel-'+route).evaluate(p=>{
     const h=p.querySelector('.feature-subpage-head'),card=p.querySelector('.elara-card,.surface');
     return {hero:h&&getComputedStyle(h).backgroundImage,card:card&&getComputedStyle(card).backgroundImage,
       amber:getComputedStyle(p).getPropertyValue('--lib06-amber').trim()};
    });
    assert.equal(style.amber,'#f2c47d','warm library theme missing '+route);
    assert.match(style.hero||'',/librairy_banner_main\.webp/,'consistent hero artwork missing '+route);
   }
   console.log('LIB06_LIBRARY_TABS_UNIFIED_PASS');
  }
  console.log('LIB06_CUSTOM_BOOKCASE_LAYOUT_PASS',width,values.custom);
  await page.close();
 }
} finally{await browser.close()}
console.log('LIB06_REFERENCE_FINAL_PASS');
