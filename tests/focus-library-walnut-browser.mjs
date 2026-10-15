import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'focus-walnut-qa',emailVerified:true},profile:{uid:'focus-walnut-qa',name:'Focus QA'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'focus-walnut-qa',name:'Focus QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
try {
  for (const width of [320,390,430,768,1024,1440]) {
    const context=await browser.newContext({viewport:{width,height:width<=430?860:960}});
    const page=await context.newPage();
    await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
    await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
    await page.addInitScript(()=>{
      const end=Date.now()-60000;
      localStorage.setItem('elara_space_v1',JSON.stringify({
        version:1,theme:'dark',xp:0,habits:[],goals:[],books:[],words:[],tasks:[],folders:[],tags:[],
        focusSessions:[{id:'walnut-real',startedAt:end-25*60000,endedAt:end,durationMin:25,completed:true}],
        activeFocus:null,focusPlanProgress:null
      }));
    });
    await page.goto(base+'/?focus-walnut='+width+'#focus-pomodoro',{waitUntil:'domcontentloaded',timeout:40000});
    await page.waitForFunction(()=>!!document.querySelector('#panel-focus-pomodoro:not(.hidden)[data-focus-ref-ready="true"] .focus-ref-side')
      && !document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
    const d=await page.evaluate(()=>{
      const panel=document.getElementById('panel-focus-pomodoro');
      const card=panel.querySelector(':scope > .focus-card');
      const timer=card.querySelector('#timer-display');
      const rect=timer.getBoundingClientRect();
      const hasStyle=[...document.styleSheets].some(x=>x.href?.includes('focus-library-walnut-20261016.css'));
      const history=panel.querySelector('.focus-ref-bottom .focus-history-card,.focus-ref-bottom .focus-ref-actual-sessions');
      return {
        hasStyle,viewport:innerWidth,scroll:document.documentElement.scrollWidth,
        count:document.querySelectorAll('#timer-display').length,
        timerWidth:rect.width,timerVisible:rect.width>0,
        columns:getComputedStyle(card).gridTemplateColumns,
        settingBackground:getComputedStyle(card.querySelector('.focus-config')).backgroundImage,
        scene:getComputedStyle(panel).backgroundImage,
        history:!!history,historyBorder:history?getComputedStyle(history).borderColor:'',
        completed:panel.querySelector('[data-focus-completed]')?.textContent,
        fullscreen:document.body.classList.contains('elara-focus-fullscreen'),
        playVisible:!!card.querySelector('#timer-start')?.getBoundingClientRect().width
      };
    });
    assert.ok(d.hasStyle,'Focus/library stylesheet was not loaded');
    assert.equal(d.count,1,'Must keep a single canonical timer');
    assert.ok(d.timerVisible&&d.playVisible,'Timer and its real play control must be visible');
    assert.equal(d.fullscreen,false,'Normal room must not enter immersive mode');
    assert.match(d.scene,/bg_focus_room\.webp/,'Keep the original room illustration');
    assert.match(d.settingBackground,/linear-gradient/,'Library walnut setting card');
    assert.ok(d.history,'Real session history or fallback session list must be present');
    assert.match(d.completed,/۱|1/,'Actual completed session must drive stats');
    assert.ok(d.scroll<=d.viewport+2,'Horizontal overflow at '+width+': '+JSON.stringify(d));
    if(width<=430)assert.ok(d.timerWidth>=245&&d.timerWidth<=260,'Compact mobile ring: '+JSON.stringify(d));
    console.log('FOCUS_WALNUT_RESPONSIVE_PASS',width,JSON.stringify(d));
    await context.close();
  }
} finally {await browser.close()}
console.log('FOCUS_WALNUT_ALL_PASS');
