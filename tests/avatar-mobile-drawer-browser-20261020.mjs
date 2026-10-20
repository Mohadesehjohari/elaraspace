/* Character-first mobile profile smoke (with fixture identity, no live Firebase). */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
mkdirSync('artifacts/avatar-mobile',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader']});
try {
  for(const width of [390,1440]){
    const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/#home',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>window.ElaraPrivateDrawer&&window.ElaraProfileSystem,{timeout:30000});
    await page.evaluate(()=>{
      const user={uid:'eli-avatar-mobile-qa',name:'Elara QA',xp:1000,username:'eliqa'};
      window.ElaraAccount={...(window.ElaraAccount||{}),user:{uid:user.uid,email:'qa@example.test'},profile:user};
      window.ElaraSocial=window.ElaraSocial||{};
      window.ElaraSocial.me=user;
      document.body.classList.remove('cloud-locked');
      document.body.classList.add('cloud-ready');
      document.documentElement.removeAttribute('data-elara-booting');
      document.getElementById('cloud-layer')?.setAttribute('hidden','');
      window.ElaraPrivateDrawer.open('home');
    });
    await page.addStyleTag({content:'#cloud-layer{display:none!important}body.cloud-ready .shell{visibility:visible!important;opacity:1!important}'});
    const menu=page.locator('.elara-private-drawer-panel>.drawer-menu');
    const arrow=page.locator('[data-elara-drawer-toggle]');
    if(width===390){
      assert.equal(await arrow.isVisible(),true,'Phone must show an under-banner arrow');
      assert.equal(await menu.isVisible(),false,'Phone profile must open directly on the 3D character');
      const stage=page.locator('.elara-private-drawer-panel [data-elara-avatar-stage]');
      await stage.waitFor({state:'visible',timeout:12000});
      const box=await stage.boundingBox();
      assert.ok(box&&box.width>275&&box.height>320,'Phone full-height avatar area '+JSON.stringify(box));
      assert.equal(await arrow.getAttribute('aria-expanded'),'false','Menu is collapsed on initial character view');
      await page.screenshot({path:'artifacts/avatar-mobile/phone-avatar.png'});
      await arrow.click();
      assert.equal(await menu.isVisible(),true,'Under-banner arrow reveals settings');
      assert.equal(await stage.isVisible(),false,'Character must be hidden while menu is shown');
      await page.screenshot({path:'artifacts/avatar-mobile/phone-menu.png'});
      await arrow.click();
      assert.equal(await menu.isVisible(),false,'Second arrow press restores full-body character');
      assert.equal(await stage.isVisible(),true,'Full-body avatar visible again');
    }else {
      assert.equal(await arrow.isVisible(),false,'Desktop accordion MUST NOT be visible');
      assert.equal(await menu.isVisible(),true,'Desktop settings navigation preserved');
      await page.locator('[data-elara-avatar-stage]').waitFor({state:'visible',timeout:12000});
      await page.evaluate(()=>window.ElaraPrivateDrawer.open('settings'));
      await page.locator('[data-drawer-section="settings"]:not(.hidden)').waitFor({state:'visible',timeout:12000});
      assert.equal(await arrow.isVisible(),false,'Desktop settings keep the original layout');
      await page.screenshot({path:'artifacts/avatar-mobile/desktop-settings-unchanged.png'});
    }
    assert.equal(errors.filter(e=>/drawer|avatar.*syntax/i.test(e)).length,0,'Unexpected drawer errors');
    await page.close();
  }
  console.log('AVATAR_MOBILE_DRAWER_AND_DESKTOP_PRESERVATION_PASS');
}finally {await browser.close();}
