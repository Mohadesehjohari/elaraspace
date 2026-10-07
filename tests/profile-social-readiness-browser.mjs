import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});

async function waitBase(page){
  await page.goto(base+'/?profile-social-ready='+Date.now()+'#home',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.ElaraProfileSystem&&window.ElaraDialog&&typeof window.ElaraLoadSocial==='function',{timeout:20000});
}
async function openAndSubmit(page,username){
  await page.evaluate(()=>{window.dispatchEvent(new Event('elara:account-ready'));void window.ElaraProfileSystem.openEditor()});
  await page.waitForSelector('#elara-central-profile-form',{timeout:10000});
  await page.locator('#elara-central-profile-form [name="name"]').fill('Readiness QA');
  await page.locator('#elara-central-profile-form [name="username"]').fill(username);
  await page.locator('#elara-central-profile-form [name="bio"]').fill('Canonical readiness test');
  await page.evaluate(()=>document.querySelector('#elara-central-profile-form').requestSubmit());
}
const statusText=page=>page.locator('#elara-central-profile-form [data-profile-edit-status]').textContent();

// Delayed real Social module: editor must wait, one import only, then reach real canonical saveProfileValues.
{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const pageErrors=[],consoleErrors=[],socialRequests=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  await page.route('**/elara-social.js*',async route=>{
    socialRequests.push(route.request().url());
    await new Promise(resolve=>setTimeout(resolve,1400));
    await route.continue();
  });
  await waitBase(page);
  assert.equal(await page.evaluate(()=>typeof window.ElaraSocial?.saveProfileValues),'undefined','Social unexpectedly ready before delayed request');
  await openAndSubmit(page,'readiness_qa');
  await page.waitForFunction(()=>document.querySelector('[data-profile-edit-status]')?.textContent.includes('در حال آماده‌سازی سرویس پروفایل'),{timeout:3000}).catch(()=>{});
  assert.equal(await page.locator('#elara-central-profile-form [type="submit"]').isDisabled(),true,'Save must be disabled while Social readiness is pending');
  await page.waitForFunction(()=>typeof window.ElaraSocial?.saveProfileValues==='function',{timeout:15000});
  await page.waitForFunction(()=>document.querySelector('[data-profile-edit-status]')?.textContent.includes('ابتدا وارد حساب شو.'),{timeout:10000});
  const finalStatus=await statusText(page);
  assert.doesNotMatch(finalStatus,/سرویس پروفایل هنوز آماده نیست/);
  assert.match(finalStatus,/ابتدا وارد حساب شو/,'submit must reach the real ElaraSocial.saveProfileValues path');
  assert.equal(socialRequests.length,1,'canonical loader must dedupe concurrent background/editor Social loads');
  assert.equal(pageErrors.length,0,'uncaught errors in delayed Social test: '+pageErrors.join(' | '));
  console.log('PROFILE_SOCIAL_DELAY_PASS '+JSON.stringify({socialRequests:socialRequests.length,saveType:await page.evaluate(()=>typeof window.ElaraSocial?.saveProfileValues),status:finalStatus,consoleErrors}));
  await context.close();
}

// Hard failure: surface original import failure, re-enable Save, and retry exactly once on user submit.
{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const pageErrors=[],socialRequests=[];let attempts=0;
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('**/elara-social.js*',async route=>{
    attempts+=1;socialRequests.push(route.request().url());
    if(attempts===1)return route.abort('failed');
    return route.continue();
  });
  await waitBase(page);
  await page.evaluate(()=>{window.dispatchEvent(new Event('elara:account-ready'));void window.ElaraProfileSystem.openEditor()});
  await page.waitForSelector('#elara-central-profile-form',{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('[data-profile-edit-status]')?.textContent.includes('بارگذاری سرویس پروفایل ناموفق بود'),{timeout:15000});
  const failureStatus=await statusText(page);
  assert.match(failureStatus,/برای تلاش دوباره/);
  assert.equal(await page.locator('#elara-central-profile-form [type="submit"]').isDisabled(),false,'Save must be re-enabled for deliberate retry after load failure');
  assert.equal(await page.evaluate(()=>!!window.__elaraSocialLoadError),true,'original Social load error must remain diagnosable');
  assert.ok((await page.evaluate(()=>window.__elaraOptionalFailures||[])).includes('elara-social.js'),'Social load failure must be recorded in optional failures');
  await page.locator('#elara-central-profile-form [name="name"]').fill('Retry QA');
  await page.locator('#elara-central-profile-form [name="username"]').fill('retry_qa');
  await page.evaluate(()=>document.querySelector('#elara-central-profile-form').requestSubmit());
  await page.waitForFunction(()=>typeof window.ElaraSocial?.saveProfileValues==='function',{timeout:15000});
  await page.waitForFunction(()=>document.querySelector('[data-profile-edit-status]')?.textContent.includes('ابتدا وارد حساب شو.'),{timeout:10000});
  assert.equal(socialRequests.length,2,'failed Social load must retry only after explicit user action');
  assert.match(socialRequests[1],/[?&]retry=1/,'retry must use an explicit retry module URL');
  assert.equal(pageErrors.length,0,'uncaught errors in failed/retry Social test: '+pageErrors.join(' | '));
  assert.equal((await page.evaluate(()=>window.__elaraOptionalFailures||[])).includes('elara-social.js'),false,'successful retry must clear active Social failure');
  console.log('PROFILE_SOCIAL_FAILURE_RETRY_PASS '+JSON.stringify({requests:socialRequests,status:await statusText(page)}));
  await context.close();
}

await browser.close();
console.log('PROFILE_SOCIAL_READINESS_BROWSER_PASS real-elara-social delayed-and-failed-import');
