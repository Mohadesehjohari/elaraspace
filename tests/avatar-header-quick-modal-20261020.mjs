/* Header chevron is a small anchored, nonmodal full-body character viewer.
   The existing profile provides a distinct fullscreen character action. */
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
  assert.equal(await popup.getAttribute('data-mode'),'popover');
  assert.equal(await popup.locator('[role="dialog"][aria-modal="false"]').isVisible(),true);
  assert.equal(await popup.locator('.elara-avatar-quick-backdrop').isVisible(),false,'Small popover must not dim/block the page');
  assert.equal(await page.locator('body.elara-quick-avatar-open').count(),0,'Small popover must not lock body scroll');
  assert.equal(await popup.locator('[data-elara-avatar-stage]').isVisible(),true);
  assert.equal(await page.locator('.elara-private-drawer:not(.hidden)').count(),0,'Profile/settings drawer MUST stay closed');
  const box=await popup.locator('.elara-avatar-quick-dialog').boundingBox();
  assert.ok(box&&box.width>=200&&box.width<=300&&box.height>=300&&box.height<=450,'Chevron popup must be compact '+JSON.stringify(box));
  const arrowBox=await arrow.boundingBox();
  assert.ok(arrowBox&&box.y>=arrowBox.y+arrowBox.height-2,'Popover must open directly under header chevron');
  assert.ok(Math.abs(box.x+box.width-arrowBox.x-arrowBox.width)<=15,'Popover must align to the right edge of the chevron');
  assert.equal(await arrow.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  await popup.waitFor({state:'hidden',timeout:7000});
  assert.equal(await arrow.getAttribute('aria-expanded'),'false');
  await arrow.click();
  await popup.waitFor({state:'visible',timeout:7000});
  await popup.locator('.elara-avatar-quick-close').click();
  await popup.waitFor({state:'hidden',timeout:7000});
  assert.equal(await page.locator('.elara-private-drawer:not(.hidden)').count(),0,'Closing character must not open profile');
  // Profile view stays independent and exposes the only fullscreen action.
  await page.evaluate(()=>window.ElaraPrivateDrawer.open('home'));
  const drawer=page.locator('.elara-private-drawer:not(.hidden)');
  await drawer.waitFor({state:'visible'});
  const expand=drawer.locator('[data-elara-avatar-fullscreen]');
  await expand.waitFor({state:'visible'});
  await expand.click();
  await popup.waitFor({state:'visible'});
  assert.equal(await popup.getAttribute('data-mode'),'fullscreen');
  assert.equal(await popup.locator('[role="dialog"][aria-modal="true"]').isVisible(),true);
  const fullBox=await popup.locator('.elara-avatar-quick-dialog').boundingBox();
  assert.ok(fullBox&&fullBox.width>=width*.75&&fullBox.height>=700,'Profile button should open the large character viewer');
  await page.keyboard.press('Escape');
  await popup.waitFor({state:'hidden'});
  assert.equal(await drawer.isVisible(),true,'Profile must remain open after closing fullscreen character');
  console.log('ELARA_AVATAR_COMPACT_CHEVRON_AND_PROFILE_FULLSCREEN_PASS '+width);
  await page.close();
 }
}finally{await browser.close();}
