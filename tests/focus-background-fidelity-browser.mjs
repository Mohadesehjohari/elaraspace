import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const root=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
await mkdir('browser-artifacts/focus-bg',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'focus-bg-qa',emailVerified:true},profile:{uid:'focus-bg-qa',name:'Focus QA',username:'focus_bg',xp:0}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'focus-bg-qa',name:'Focus QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const empty={version:1,theme:'dark',xp:0,habits:[],goals:[],tasks:[],taskLists:[],books:[],words:[],folders:[],tags:[],focusSessions:[],activeFocus:null,focusPlanProgress:null};
try {
  for(const width of [320,360,375,390,412,430,768,1024,1440,1648]){
    const context=await browser.newContext({viewport:{width,height:width<=700?850:960},deviceScaleFactor:1});
    const page=await context.newPage();
    await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
    await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
    await page.addInitScript(x=>localStorage.setItem('elara_space_v1',JSON.stringify(x)),empty);
    await page.goto(root+'/?focus-bg='+width+'#focus-pomodoro',{waitUntil:'domcontentloaded',timeout:40000});
    await page.waitForFunction(()=>!!window.ElaraOpen && !!document.querySelector('#panel-focus-pomodoro .focus-card') && !document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:32000});
    await page.evaluate(()=>window.ElaraOpen('focus-pomodoro',{history:'replace'}));
    await page.locator('#panel-focus-pomodoro:not(.hidden) #timer-display').waitFor();
    const image=await page.request.get(root+'/assets/ui/bg_focus_room.webp?focus-test='+width);
    assert.equal(image.status(),200,'approved image did not load');
    assert.match(image.headers()['content-type']||'',/image\/webp/,'approved image MIME');
    const state=await page.evaluate(()=>{
      const panel=document.querySelector('#panel-focus-pomodoro');
      const timer=panel.querySelector('#timer-display');
      const dial=timer.getBoundingClientRect(),wrap=panel.getBoundingClientRect();
      return {background:getComputedStyle(panel).backgroundImage,
        viewport:innerWidth,scroll:document.documentElement.scrollWidth,
        timer:dial.width,container:wrap.width,play:!!panel.querySelector('#timer-start'),
        route:location.hash,txt:timer.textContent.trim()};
    });
    assert.match(state.background,/bg_focus_room\.webp/,'canonical background missing');
    assert.ok(state.timer>=180,'timer too small '+width);
    assert.ok(state.container<=state.viewport+1,'focus panel too wide '+JSON.stringify(state));
    assert.ok(state.scroll<=state.viewport+1,'horizontal overflow '+JSON.stringify(state));
    assert.ok(state.play,'canonical timer play missing');
    assert.match(state.txt,/\d{1,3}:\d{2}/,'canonical timer display missing');
    if(width===390||width===1440){
      await page.screenshot({path:'browser-artifacts/focus-bg/'+(process.env.ELARA_TEST_URL?.startsWith('https:')?'live':'candidate')+'-'+width+'.png',fullPage:true});
    }
    await context.close();
    console.log('FOCUS_BG_WIDTH_PASS '+width);
  }
}finally{await browser.close()}
console.log('FOCUS_BG_FIDELITY_PASS 10 widths canonical engine and approved WebP');
