import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const root=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
await mkdir('browser-artifacts/lib01',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'lib01-fixture',email:'qa@example.invalid',emailVerified:true},profile:{uid:'lib01-fixture',name:'QA',username:'library_fixture',profilePublic:true,xp:0}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'lib01-fixture',name:'QA',username:'library_fixture'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
function fixture(empty){
 return {version:1,theme:'dark',xp:0,habits:[],goals:[],tasks:[],taskLists:[],words:[],folders:[],tags:[],
  focusSessions:[],bookShelves:['رشد فردی'],bookClips:empty?[]:[{id:'clip-01',text:'یادگیری از گام‌های کوچک آغاز می‌شود.',page:18,bookId:'book-01',createdAt:1750000000000,visibility:'private'}],
  books:empty?[]:[
   {id:'book-01',title:'کتاب آزمایشی اول',author:'نویسنده اول',genre:'توسعه فردی',totalPages:200,currentPage:50,shelf:'reading',readingLogs:[],customShelf:'رشد فردی'},
   {id:'book-02',title:'کتاب آزمایشی دوم',author:'نویسنده دوم',totalPages:100,currentPage:100,shelf:'finished',readingLogs:[]},
   {id:'book-03',title:'کتاب آزمایشی سوم',author:'نویسنده اول',totalPages:300,currentPage:0,shelf:'want',readingLogs:[]}
  ]};
}
try{
 for(const width of [320,360,375,390,412,430,768,1024,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<=700?850:980},deviceScaleFactor:1});
  const page=await context.newPage();
  const empty=width===320;
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(x=>localStorage.setItem('elara_space_v1',JSON.stringify(x)),fixture(empty));
  await page.goto(root+'/?lib01='+width+'#books',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.ElaraLibraryDashboardLIB01&&!!document.querySelector('#panel-books #lib01-overview')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:32000});
  await page.evaluate(()=>window.ElaraOpen('books',{history:'replace'}));
  await page.waitForSelector('#panel-books:not(.hidden) #lib01-overview');
  const model=await page.evaluate(()=>{
   const panel=document.getElementById('panel-books'),hero=panel.querySelector(':scope > .elara-global-hero');
   const visibleHero=[...panel.querySelectorAll('.elara-global-hero,#library-hero')].filter(h=>getComputedStyle(h).display!=='none');
   return {nHeroes:visibleHero.length,image:getComputedStyle(hero).backgroundImage,viewport:innerWidth,scroll:document.documentElement.scrollWidth,
    tabs:panel.querySelectorAll('#lib01-overview .lib01-shortcuts button').length,
    status:panel.querySelector('.lib01-status')?.innerText||'',continuing:panel.querySelectorAll('.lib01-book').length,
    clips:panel.querySelectorAll('.lib01-clip').length};
  });
  assert.equal(model.nHeroes,1,width+': extra visible banner');
  assert.match(model.image,/librairy_banner_main\.webp/,width+': approved library asset not used');
  assert.equal(model.tabs,8,width+': incomplete eight library shortcuts');
  assert.ok(model.scroll<=model.viewport+2,width+': overflow '+JSON.stringify(model));
  assert.equal(model.continuing,empty?0:1,width+': continuing books must follow canonical status');
  assert.equal(model.clips,empty?0:1,width+': clips must come from canonical bookClips');
  assert.ok(model.status.includes(empty?'۰':'۳')||model.status.includes(empty?'0':'3'),'status counts incorrect');
  if(empty)assert.ok(await page.locator('.lib01-continue-card .lib01-empty').isVisible(),'empty account must show genuine empty state');
  if(width===390){
   await page.locator('[data-lib01-bookmark="book-01"]').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books.find(b=>b.id==='book-01').bookmarked===true);
   assert.equal(await page.locator('[data-lib01-bookmark="book-01"]').getAttribute('aria-pressed'),'true');
   await page.locator('#timer-display').evaluate(el=>{el.textContent='13:42'});
   await page.waitForFunction(()=>document.querySelector('#lib01-overview [data-lib01-timer]')?.textContent==='13:42');
   await page.locator('#lib01-overview [data-feature-route="library-shelves"]').first().click();
   await page.waitForSelector('#panel-library-shelves:not(.hidden) #book-form');
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books);
   assert.equal(stored.length,3,'dashboard changed book count');
   assert.equal(stored.find(x=>x.id==='book-01').currentPage,50,'dashboard modified reading progress');
   await page.evaluate(()=>window.ElaraOpen('books',{history:'replace'}));
   await page.waitForSelector('#panel-books:not(.hidden) #lib01-overview');
  }
  await page.screenshot({path:'browser-artifacts/lib01/library-'+width+'.png',fullPage:true,animations:'disabled'});
  console.log('LIB01_VIEWPORT_PASS '+JSON.stringify({width,...model}));
  await context.close();
 }
 console.log('LIB01_ALL_WIDTHS_PASS');
}finally{await browser.close()}
