import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
await mkdir('browser-artifacts/lib02',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'lib02-fixture',email:'qa@example.invalid',emailVerified:true},profile:{uid:'lib02-fixture',name:'QA',username:'library_fixture',profilePublic:true,xp:0}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'lib02-fixture',name:'QA',username:'library_fixture'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const model=(empty=false)=>({version:1,xp:0,theme:'dark',tasks:[],habits:[],goals:[],words:[],folders:[],tags:[],taskLists:[],focusSessions:[],bookShelves:empty?[]:['رشد فردی'],bookClips:empty?[]:[{id:'real-clip',bookId:'book-reading',text:'آرام و پیوسته پیش برو.',page:23,visibility:'private',createdAt:1750000000000}],books:empty?[]:[
 {id:'book-reading',title:'کتاب در حال مطالعه',author:'نویسنده نخست',totalPages:200,currentPage:45,shelf:'reading',customShelf:'رشد فردی',readingLogs:[]},
 {id:'book-want',title:'کتاب برای آینده',author:'نویسنده دوم',totalPages:350,currentPage:0,shelf:'want',readingLogs:[]},
 {id:'book-finished',title:'کتاب پایان‌یافته',totalPages:100,currentPage:100,shelf:'finished',readingLogs:[]}
]});
try{
 for(const width of [320,360,375,390,412,430,768,1024,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<=700?844:980}});
  const page=await context.newPage(),empty=width===320;
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(data=>localStorage.setItem('elara_space_v1',JSON.stringify(data)),model(empty));
  await page.goto(base+'/?lib02='+width+'#library-shelves',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.ElaraLibraryShelvesLIB02&&!!window.ElaraLibraryEnhancements&&!!window.ElaraFeatureHubs&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
  await page.evaluate(()=>window.ElaraOpen('library-shelves',{history:'replace'}));
  await page.waitForSelector('#panel-library-shelves:not(.hidden) #lib02-scene .lib02-hero');
  const m=await page.evaluate(()=>{
   const p=document.getElementById('panel-library-shelves'),sc=p.querySelector('#lib02-scene');
   const shelf=[...sc.querySelectorAll('.lib02-shelf')].map(x=>({status:x.dataset.lib02Shelf,count:x.querySelectorAll('[data-lib02-book]').length,visible:getComputedStyle(x).display!=='none'}));
   const hero=sc.querySelector('.lib02-hero'),style=getComputedStyle(hero);
   return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,hero:style.backgroundImage,
    shelf,legacyForm:!!p.querySelector('#book-form'),legacyList:!!p.querySelector('#book-list'),legacyShelfTools:!!p.querySelector('.library-enhancement-tools'),
    note:sc.querySelector('.lib02-extras')?.innerText||'',custom:sc.querySelectorAll('[data-lib02-custom]').length};
  });
  assert.ok(m.scroll<=m.viewport+2,width+': horizontal overflow '+JSON.stringify(m));
  assert.match(m.hero,/librairy_banner_main\.webp/,width+': owner library artwork missing');
  assert.equal(m.shelf.length,3,width+': must preserve all reading statuses');
  assert.ok(m.legacyForm&&m.legacyList&&m.legacyShelfTools,width+': canonical actions missing');
  assert.deepEqual(m.shelf.map(x=>x.count),empty?[0,0,0]:[1,1,1],width+': fixture statuses mismatch');
  if(width<=700)assert.deepEqual(m.shelf.filter(x=>x.visible).map(x=>x.status),['reading'],width+': mobile must have one full-width shelf');
  else assert.equal(m.shelf.filter(x=>x.visible).length,3,width+': desktop requires three distinct bookcases');
  if(empty)assert.equal(m.custom,0,'No custom shelves must not invent books');
  else assert.ok(m.note.includes('آرام')||m.note.includes('Steadily'),'Only recorded clip should appear');
  if(width===390){
   await page.locator('[data-lib02-picker="want"]').click();
   await page.waitForFunction(()=>document.querySelector('.lib02-shelves')?.dataset.lib02Selected==='want');
   assert.ok(await page.locator('[data-lib02-shelf="want"] [data-lib02-book="book-want"]').isVisible(),'Want shelf did not open');
   await page.locator('[data-lib02-shelf="want"] [data-lib02-status="book-want"]').selectOption('reading');
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books.some(b=>b.id==='book-want'&&b.shelf==='reading'));
   await page.locator('[data-lib02-picker="reading"]').click();
   await page.locator('[data-lib02-bookmark="book-reading"]').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books.find(b=>b.id==='book-reading')?.bookmarked===true);
   const reading=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books);
   assert.equal(reading.length,3,'Status change or bookmark deleted books');
   assert.equal(reading.find(x=>x.id==='book-reading').currentPage,45,'Book case changed page count');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!document.querySelector('#panel-library-shelves:not(.hidden) #lib02-scene [data-lib02-bookmark="book-reading"]'),null,{timeout:30000});
   assert.equal(await page.locator('[data-lib02-bookmark="book-reading"]').getAttribute('aria-pressed'),'true','Bookmark did not survive refresh');
   await page.locator('[data-lib02-new-shelf]').click();
   await page.locator('.elara-dialog-field input').fill('قفسه تست دوم');
   await page.getByRole('button',{name:'ساختن'}).click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).bookShelves.includes('قفسه تست دوم'));
   assert.ok(await page.locator('[data-lib02-custom="قفسه تست دوم"]').isVisible(),'Custom shelf not synced');
  }
  await page.screenshot({path:'browser-artifacts/lib02/shelves-'+width+'.png',fullPage:true,animations:'disabled'});
  console.log('LIB02_WIDTH_PASS '+JSON.stringify({width,...m}));
  await context.close();
 }
 console.log('LIB02_ALL_WIDTHS_PASS');
}finally{await browser.close()}
