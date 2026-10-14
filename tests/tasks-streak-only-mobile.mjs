import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const url=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const today=new Date(),date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
const seed={version:1,theme:'dark',xp:0,goals:[],habits:[],books:[],words:[],folders:[],tags:[],taskLists:[],tasks:[{id:'hero-streak-qa',text:'بررسی استریک',date,priority:'3',completed:false,recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[]}]};
try{
 for(const width of [320,360,390,430]){
  const context=await browser.newContext({viewport:{width,height:860},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraAccount={user:null,profile:{name:'QA',username:'qa',xp:0}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{}};"}));
  await page.addInitScript(s=>localStorage.setItem('elara_space_v1',JSON.stringify(s)),seed);
  await page.goto(url+'/?streak-hero-qa='+width+'#tasks',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraStreakCalendar&&document.querySelectorAll('#panel-tasks #astra-task-hero .task-streak-days>i').length===7,null,{timeout:35000});
  const info=await page.evaluate(()=>{
   const panel=document.getElementById('panel-tasks'),hero=panel.querySelector('#astra-task-hero'),summary=hero.querySelector('.task-streak-summary');
   const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
   return {documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,
    legacyBanner:!!document.getElementById('elara-task-mobile-banner'),
    duplicate:panel.querySelectorAll(':scope>.elara-generated-hero').length,
    hero:rect(hero),summary:rect(summary),
    dayCount:hero.querySelectorAll('.task-streak-days>i').length,
    background:getComputedStyle(hero).backgroundImage};
  });
  assert.equal(info.legacyBanner,false,'old standalone hero still exists '+width);
  assert.equal(info.duplicate,0,'extra generated banner still exists '+width);
  assert.ok(info.hero.h>=160&&info.hero.h<=200,'streak card not enlarged correctly '+width+' '+JSON.stringify(info));
  assert.equal(info.dayCount,7,'seven streak days missing');
  assert.ok(!info.background.includes('task-header-banner-bg.webp'),'banner wallpaper still appears behind streak');
  assert.ok(info.summary.bottom<=info.hero.bottom+2&&info.summary.y>=info.hero.y-2,'streak content extends outside card '+JSON.stringify(info));
  assert.ok(info.documentWidth<=width+2,'horizontal page overflow '+JSON.stringify(info));
  await page.locator('#astra-task-hero .task-streak-summary').click();
  assert.ok(await page.locator('#elara-streak-calendar').isVisible(),'streak should open purple calendar');
  assert.deepEqual(errors,[],'uncaught exceptions: '+errors.join(';'));
  console.log('TASKS_STREAK_HERO_PASS '+width+'px '+JSON.stringify({heroHeight:info.hero.h,days:info.dayCount}));
  await context.close();
 }
}finally{await browser.close()}
