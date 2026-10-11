import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
await mkdir('browser-artifacts/focus01',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'focus01-fixture',email:'qa@example.invalid',emailVerified:true},profile:{uid:'focus01-fixture',name:'QA',username:'focus_qa',profilePublic:true,xp:0}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'focus01-fixture',name:'QA',username:'focus_qa'},friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const fixture=(empty=false)=>({version:1,theme:'dark',xp:0,focusSessions:[],activeFocus:null,focusPlanProgress:null,
 tasks:empty?[]:[{id:'focus-task',text:'نوشتن گزارش',date:new Date().toISOString().slice(0,10),completed:false}],
 books:empty?[]:[{id:'focus-book',title:'کتاب واقعی نمونه تست',author:'نویسنده',shelf:'reading',totalPages:200,currentPage:70,readingLogs:[]}],
 tags:[],folders:[],goals:[],habits:[],words:[],taskLists:[],bookShelves:[],bookClips:[]});
try{
 for(const width of [320,360,375,390,412,430,768,1024,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<=700?844:1000}});
  const page=await context.newPage(),empty=width===320;
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(s=>{if(!sessionStorage.getItem('elara_focus01_seeded')){localStorage.setItem('elara_space_v1',JSON.stringify(s));sessionStorage.setItem('elara_focus01_seeded','yes')}},fixture(empty));
  await page.goto(base+'/?focus01='+width+'#focus-pomodoro',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.ElaraFocusRoomFOCUS01&&!!window.ElaraFocusAmbience&&!!document.querySelector('#focus01-room #focus01-engine-slot #timer-start')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
  await page.evaluate(()=>window.ElaraOpen('focus-pomodoro',{history:'replace'}));
  await page.waitForSelector('#panel-focus-pomodoro:not(.hidden) #focus01-room');
  const meta=await page.evaluate(()=>{
   const p=document.getElementById('panel-focus-pomodoro'),r=p.querySelector('#focus01-room');
   return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,hero:getComputedStyle(r.querySelector('.focus01-hero')).backgroundImage,
     timerOwners:document.querySelectorAll('#timer-start').length,timerInScene:!!r.querySelector('#focus01-engine-slot #timer-start'),
     modes:r.querySelectorAll('[data-focus01-mode]').length,ambient:r.querySelectorAll('[data-focus01-sound]').length,
     books:[...r.querySelectorAll('#focus01-target option[data-kind="book"]')].length,tasks:[...r.querySelectorAll('#focus01-target option[data-kind="task"]')].length};
  });
  assert.ok(meta.scroll<=meta.viewport+2,width+': horizontal overflow '+JSON.stringify(meta));
  assert.match(meta.hero,/librairy_banner_main\.webp/,width+': reference hero missing');
  assert.equal(meta.timerOwners,1,width+': duplicated operational Pomodoro engine');
  assert.ok(meta.timerInScene,width+': canonical timer not in dedicated page');
  assert.equal(meta.modes,4,width+': four focus modes not available');
  assert.ok(meta.ambient>=6,width+': authentic WebAudio sound choices missing');
  assert.equal(meta.books,empty?0:1,width+': real linked books mismatch');
  assert.equal(meta.tasks,empty?0:1,width+': real linked tasks mismatch');
  if(empty)assert.ok(await page.locator('#focus01-history-content .focus01-empty').isVisible(),'empty history must not be fabricated');
  if(width===390){
   await page.locator('#focus01-target').selectOption('book:focus-book');
   await page.locator('#focus-duration').fill('1');
   await page.locator('#focus-break-duration').fill('1');
   await page.locator('#focus-session-count').fill('2');
   await page.locator('#focus-auto-break').check();
   await page.locator('[data-focus01-sound="sea"]').click();
   assert.equal(await page.evaluate(()=>ElaraFocusAmbience.read().mode),'sea','Sea sound must use central ambience engine');
   assert.equal(await page.evaluate(()=>ElaraFocusAmbience.playing),false,'Audio must not autoplay without a play action');
   await page.locator('.focus01-start').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.status==='running');
   let data=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));
   assert.equal(data.activeFocus.mode,'reading','Mode not stored in canonical timer');
   assert.equal(data.activeFocus.linkedKind,'book','Canonical session book association missing');
   assert.equal(data.activeFocus.linkedId,'focus-book');
   assert.equal(data.activeFocus.sessionCount,2);
   await page.locator('.focus01-dial-play').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.status==='paused');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#panel-focus-pomodoro:not(.hidden) #focus01-room #timer-start')&&JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.status==='paused',null,{timeout:30000});
   data=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));
   assert.equal(data.activeFocus.mode,'reading','Mode lost after refresh');
   assert.equal(data.activeFocus.linkedId,'focus-book','Book lost after refresh');
   await page.locator('.focus01-dial-play').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.status==='running');
   await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('elara_space_v1'));s.activeFocus.endAt=Date.now()-5;s.activeFocus.remainingSec=0;
    localStorage.setItem('elara_space_v1',JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:s}));
   });
   await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));return s.focusSessions?.length===1&&s.activeFocus?.kind==='break'},null,{timeout:7000});
   data=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));
   assert.equal(data.xp,15,'Only completed focus awards XP');
   assert.equal(data.focusSessions[0].mode,'reading','History mode missing');
   assert.equal(data.focusSessions[0].linkedId,'focus-book','History book association missing');
   assert.equal(data.activeFocus.linkedId,'focus-book','Break context lost');
   assert.equal(data.books[0].currentPage,70,'Pomodoro must not increase book pages');
   assert.equal(data.tasks[0].completed,false,'Pomodoro must not complete any task');
   await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('elara_space_v1'));s.activeFocus.endAt=Date.now()-10;s.activeFocus.remainingSec=0;
    localStorage.setItem('elara_space_v1',JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:s}));
   });
   await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('elara_space_v1'));return !s.activeFocus&&s.focusPlanProgress?.sessionIndex===2},null,{timeout:7000});
   data=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));
   assert.equal(data.xp,15,'Break must never award XP');
   assert.equal(data.focusPlanProgress.linkedId,'focus-book','FocusPlanProgress lost associated book');
   assert.equal(data.focusPlanProgress.mode,'reading','FocusPlanProgress lost focus mode');
   await page.locator('.focus01-start').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')).activeFocus?.sessionIndex===2);
   data=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));
   assert.equal(data.activeFocus.linkedId,'focus-book','Second session did not preserve linked book');
   assert.equal(data.activeFocus.mode,'reading','Second session did not preserve mode');
  }
  await page.screenshot({path:'browser-artifacts/focus01/focus-room-'+width+'.png',fullPage:true,animations:'disabled'});
  console.log('FOCUS01_WIDTH_PASS '+JSON.stringify({width,...meta}));
  await context.close();
 }
 console.log('FOCUS01_ALL_WIDTHS_PASS');
}finally{await browser.close()}
