import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage();
    const jsErrors=[];
    page.on('pageerror',error=>jsErrors.push(error.message));
    await page.route('**/reference-home-shell-2026.js*',async route=>{
      await new Promise(resolve=>setTimeout(resolve,4600));
      await route.continue();
    });
    await page.route('**/home-reference-polish-20261012.css*',async route=>{
      await new Promise(resolve=>setTimeout(resolve,5600));
      await route.continue();
    });
    await page.goto(base+'/?verify=slow-'+width+'#home',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(3500);
    const before=await page.evaluate(()=>({
      booting:document.documentElement.hasAttribute('data-elara-booting'),
      shell:document.querySelector('.shell')?.getBoundingClientRect().width,
      shellInvisible:getComputedStyle(document.querySelector('.shell')).visibility==='hidden',
      oldNavInvisible:getComputedStyle(document.querySelector('.sidebar')).visibility==='hidden',
      heroPresent:!!document.querySelector('#panel-home .elara-hero')
    }));
    assert.equal(before.booting,true,'Shell was revealed while canonical Home script/CSS delayed');
    assert.equal(before.shellInvisible,true,'Legacy app shell leaked into first paint');
    assert.equal(before.oldNavInvisible,true,'Legacy navigation flashed before new UI');

    await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting') &&
      !!document.querySelector('#panel-home .elara-hero') &&
      !!document.querySelector('#panel-home .ref-home-grid') &&
      !!window.ElaraReferenceHome && !!window.ElaraNavigation,
      null,{timeout:40000});
    const after=await page.evaluate(()=>({
      ready:window.__elaraBootStage,
      panel:document.querySelector('#panel-home'),
      shell:getComputedStyle(document.querySelector('.shell')).visibility,
      hero:!!document.querySelector('#panel-home .owner-home-hero-image'),
      recovery:document.documentElement.hasAttribute('data-elara-boot-error')
    }));
    assert.notEqual(after.shell,'hidden','New shell remained hidden after verification');
    assert.ok(['home','tasks','secondary'].includes(after.ready));
    assert.equal(after.recovery,false,'Recovery appeared after successful boot');
    assert.equal(after.hero,true,'Canonical image owner missing after boot');
    assert.deepEqual(jsErrors,[],'Unexpected runtime errors: '+jsErrors.join('; '));
    console.log('VERIFIED_HOME_RECOVERY_PASS '+JSON.stringify({width,before,after:{ready:after.ready,hero:after.hero}}));
    await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:390,height:860}});
    const page=await context.newPage();
    await page.route('**/reference-home-shell-2026.css*',route=>
      route.fulfill({status:503,contentType:'text/css',body:'/* unavailable */'}));
    await page.goto(base+'/?verify=missing-css#home',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.documentElement.hasAttribute('data-elara-boot-error'),null,{timeout:25000});
    const blocked=await page.evaluate(()=>({
      booting:document.documentElement.hasAttribute('data-elara-booting'),
      legacyHidden:getComputedStyle(document.querySelector('.shell')).visibility==='hidden',
      retry:!!document.querySelector('#elara-boot-recovery button'),
      error:document.getElementById('elara-boot-recovery')?.textContent
    }));
    assert.equal(blocked.booting,true,'Missing CSS exposed the fallback shell');
    assert.equal(blocked.legacyHidden,true);
    assert.equal(blocked.retry,true);
    assert.ok(blocked.error?.includes('بارگذاری دوباره'));
    console.log('VERIFIED_HOME_MISSING_ASSET_PASS');
    await context.close();
  }
}finally{await browser.close()}
console.log('VERIFIED_HOME_BOOT_ALL_PASS');
