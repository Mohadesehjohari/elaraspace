/* Chrome acceptance: the header caret owns a VRM-only popup on both breakpoints.
   Stub the large VRM download; the interface itself is tested with real browser CSS. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
  await page.goto(origin+'/#home',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.ElaraAvatarQuickModal&&window.ElaraLiveVRM&&window.ElaraPrivateDrawer,{timeout:35000});
  await page.evaluate(()=>{
   document.body.classList.remove('cloud-locked');
   document.body.classList.add('cloud-ready');
   document.documentElement.removeAttribute('data-elara-booting');
   document.getElementById('cloud-layer')?.setAttribute('hidden','');
   window.ElaraLiveVRM.tryMount=async stage=>{
    stage.dataset.avatarMounted='live';
    stage.querySelector('[data-elara-avatar-status]').textContent='Browser QA VRM';
    return true;
   };
  });
  await page.addStyleTag({content:'#cloud-layer{display:none!important}body.cloud-ready .shell{visibility:visible!important;opacity:1!important}'});
  const arrow=page.locator('#ref-equipped-character-toggle');
  await arrow.waitFor({state:'visible',timeout:15000});
  await arrow.click();
  const popup=page.locator('.elara-avatar-quick-modal');
  await popup.waitFor({state:'visible',timeout:10000});
  assert.equal(await popup.locator('[role="dialog"][aria-modal="true"]').isVisible(),true);
  assert.equal(await popup.locator('[data-elara-avatar-stage]').isVisible(),true);
  assert.equal(await page.locator('.elara-private-drawer:not(.hidden)').count(),0,'Profile/settings drawer MUST stay closed');
  const box=await popup.locator('.elara-avatar-quick-dialog').boundingBox();
  assert.ok(box&&box.width>310&&box.height>425,'Standalone full-body popup too small '+JSON.stringify(box));
  assert.equal(await arrow.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  await popup.waitFor({state:'hidden',timeout:7000});
  assert.equal(await arrow.getAttribute('aria-expanded'),'false');
  await arrow.click();
  await popup.waitFor({state:'visible',timeout:7000});
  await popup.locator('.elara-avatar-quick-close').click();
  await popup.waitFor({state:'hidden',timeout:7000});
  assert.equal(await page.locator('.elara-private-drawer:not(.hidden)').count(),0,'Closing character must not open profile');
  console.log('ELARA_AVATAR_STANDALONE_MODAL_PASS '+width);
  await page.close();
 }
}finally{await browser.close();}
