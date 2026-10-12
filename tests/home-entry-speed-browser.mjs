import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    // Explicitly shared links should remain reachable on initial navigation.
    await page.goto(origin+'/?home-entry-qa='+width+'#books',{waitUntil:'domcontentloaded'});
    assert.equal(new URL(page.url()).hash,'#books','Direct links must continue to work');
    // A reload from an interior page must always reopen Home, without looping.
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(new URL(page.url()).hash,'#home',width+': reload did not return to Home');
    const splash=await page.evaluate(()=>({
      splashLogo:!!document.querySelector('#elara-boot-screen img'),
      splashBrand:!!document.querySelector('#elara-boot-screen .elara-skel-logo'),
      iconPreload:!!document.querySelector('link[rel="preload"][href*="brand-elara-app-mark.webp"]'),
      homePreload:!!document.querySelector('link[rel="preload"][href*="homebanner1.webp"]')
    }));
    assert.equal(splash.splashLogo,false,width+': loading-screen icon remains');
    assert.equal(splash.splashBrand,false,width+': loading-screen logo remains');
    assert.equal(splash.iconPreload,false,width+': unnecessary app-logo preload remains');
    assert.equal(splash.homePreload,true,width+': actual Home hero must be prioritized');
    await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&
      !!window.ElaraReferenceHome&&!!window.ElaraNavigation,null,{timeout:12000});
    const timing=await page.evaluate(()=>({
      initialRoute:location.hash,
      timeMs:window.__elaraHomeVisibleMs,
      mark:performance.getEntriesByName('elara-home-visible','mark').length
    }));
    assert.equal(timing.initialRoute,'#home');
    assert.equal(timing.mark,1,width+': missing first-frame timing mark');
    assert.ok(timing.timeMs>0&&timing.timeMs<12000,width+': unreasonable Home latency');
    // Functional in-app navigation should not be intercepted by entry normalization.
    await page.evaluate(()=>window.ElaraOpen('tasks',{history:'push'}));
    assert.equal(new URL(page.url()).hash,'#tasks',width+': internal navigation broken');
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(new URL(page.url()).hash,'#home',width+': repeated reload should return Home');
    assert.deepEqual(errors,[],width+': runtime errors: '+errors.join(' | '));
    console.log('HOME_ENTRY_PERF_PASS '+JSON.stringify({width,...timing}));
    await context.close();
  }
}finally{await browser.close()}
