import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts/language-four',{recursive:true});
const browser=await chromium.launch({headless:true});
const now=Date.now();
const bookFixture=[
 {id:'book-a',title:'Study Book Alpha',shelf:'reading',totalPages:200,currentPage:80,readingLogs:[{date:new Date(now).toLocaleDateString('en-CA'),pagesRead:12,timestamp:now}]},
 {id:'book-b',title:'Study Book Beta',shelf:'finished',totalPages:100,currentPage:100,readingLogs:[]}
];
const state={version:1,tasks:[],words:[{id:'a',front:'hello',back:'سلام',box:1,due:'2020-01-01'},{id:'b',front:'world',back:'جهان',box:5,due:'2020-01-01'}],books:[],languageClasses:[],habits:[],goals:[],folders:[],tags:[]};
const cloud="window.ElaraAccount={user:{uid:'ui13-qa',emailVerified:true},profile:{uid:'ui13-qa',name:'Test'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'ui13-qa',name:'Test'},friends:[{uid:'friend-1',name:'friend'}],clubs:{list:async()=>[{id:'club-1',title:'English Club Alpha',kind:'language',role:'owner',memberCount:6,bio:'تمرین انگلیسی',status:'active'}],discover:async()=>[{id:'club-2',title:'Deutsch Club Beta',kind:'language',memberCount:9,bio:'مکالمه آلمانی',status:'active'}]},challenges:{list:async()=>[{id:'challenge-1',targetKind:'reading',targetText:'ده صفحه کتاب زبان',targetValue:10,status:'accepted',from:'ui13-qa',to:'friend-1'}]},refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:920},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(({state,bookFixture})=>{localStorage.setItem('elara_space_v1',JSON.stringify(state));localStorage.setItem('elara_language_books_v2',JSON.stringify(bookFixture));localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',language:'fa'}))},{state,bookFixture});
  await page.goto(origin+'/?language-four='+Date.now()+'#language',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.ElaraOpen&&window.ElaraLanguageReferenceV4&&window.ElaraLanguageDestinations&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
  const open=async(route,selector)=>{
   await page.evaluate(route=>window.ElaraOpen(route,{history:'replace'}),route);
   await page.waitForSelector('#panel-'+route+':not(.hidden) '+selector,{timeout:15000});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=2,width+' '+route+' horizontal overflow '+overflow);
   await page.screenshot({path:'browser-artifacts/language-four/'+route+'-'+width+'.png',fullPage:true,animations:'disabled'});
  };
  await open('language-books','.lr4-books-shell');
  assert.equal(await page.locator('#panel-language-books .lr4-stat').count(),4,'Book KPIs');
  assert.equal(await page.locator('#panel-language-books #language-book-list .pass3-language-book').count(),2,'Canonical books');
  assert.equal(await page.locator('#panel-language-books #language-book-form:visible').count(),1,'Canonical add form remains usable');
  await page.locator('[data-lr4-book-filter="finished"]').click();
  assert.equal(await page.locator('#panel-language-books #language-book-list .pass3-language-book:visible').count(),1,'Book filter');
  await page.locator('[data-lr4-book-filter="all"]').click();
  await page.locator('[data-lr4-book-query]').fill('Alpha');
  assert.equal(await page.locator('#panel-language-books #language-book-list .pass3-language-book:visible').count(),1,'Book search');
  await page.locator('[data-lr4-book-query]').fill('');
  await open('language-reports','.lr4-report-shell');
  assert.equal(await page.locator('#panel-language-reports .lr4-stat').count(),4,'Report KPI count');
  assert.equal(await page.locator('#panel-language-reports .lr4-bar-item').count(),7,'Seven-day data chart');
  assert.equal(await page.locator('#panel-language-reports .lr4-donut').count(),1,'Actual vocabulary donut');
  await page.locator('[data-lr4-report-range]').selectOption('14');
  assert.equal(await page.locator('#panel-language-reports .lr4-bar-item').count(),14,'14-day report control');
  await open('language-channels','.lr4-page.lr4-channels');
  await page.waitForFunction(()=>document.querySelectorAll('#panel-language-channels .lr4-channel-card').length===2,null,{timeout:12000});
  assert.equal(await page.locator('#panel-language-channels .lr4-channel-card').count(),2,'Real clubs');
  await page.locator('[data-lr4-channel-filter="mine"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#panel-language-channels .lr4-channel-card').length===1);
  await page.locator('[data-lr4-channel-filter="all"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#panel-language-channels .lr4-channel-card').length===2);
  await page.locator('[data-lr4-channel-search]').fill('Deutsch');
  assert.equal(await page.locator('#panel-language-channels .lr4-channel-card:visible').count(),1,'Club search');
  await open('language-challenges','.lr4-page.lr4-challenges');
  await page.waitForSelector('#panel-language-challenges .lr4-challenge-card',{timeout:12000});
  assert.equal(await page.locator('#panel-language-challenges .lr4-challenge-card').count(),1,'Real challenge');
  await page.locator('[data-lr4-challenge-filter="requests"]').click();
  assert.equal(await page.locator('#panel-language-challenges .lr4-challenge-card').count(),0,'Requests filter');
  await page.locator('[data-lr4-challenge-filter="all"]').click();
  assert.equal(await page.locator('#panel-language-challenges .lr4-challenge-card').count(),1,'Restore challenges');
  assert.deepEqual(errors.filter(s=>!/favicon|network/i.test(s)),[],width+' browser errors');
  console.log('LANGUAGE_FOUR_RESPONSIVE_PASS',width);
  await page.close();
 }
}finally{await browser.close()}
console.log('LANGUAGE_FOUR_PASS real books, logged reading, reports, channels, challenges, responsive routes');