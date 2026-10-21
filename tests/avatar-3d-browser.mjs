/* Browser regression: missing male VRM must NEVER resurrect the old prototype. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
try{
 await page.route('**/assets/avatar/bases/eli-male-v1.vrm*',route=>route.fulfill({status:404,body:'Male VRM fixture deliberately unavailable'}));
 await page.goto(base+'/#home',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.ElaraPrivateDrawer&&window.ElaraProfileSystem,{timeout:30000});
 await page.evaluate(()=>{
   window.ElaraAccount={...(window.ElaraAccount||{}),user:{uid:'real-vrm-only-qa',email:'avatar@example.test'},profile:{uid:'real-vrm-only-qa',name:'Avatar QA',username:'avatarqa',xp:980}};
   window.ElaraSocial=window.ElaraSocial||{};
   window.ElaraSocial.me={uid:'real-vrm-only-qa',name:'Avatar QA',username:'avatarqa',xp:980,profilePublic:true};
   window.ElaraProfileSystem.writePrivate({sex:'male',avatarGender:'male'});
   window.ElaraPrivateDrawer.open('home');
 });
 const stage=page.locator('.elara-private-drawer:not(.hidden) [data-elara-avatar-stage]');
 await stage.waitFor({state:'visible',timeout:12000});
 await page.waitForFunction(()=>document.querySelector('.elara-private-drawer:not(.hidden) [data-elara-avatar-stage]')?.dataset.avatarMounted==='unavailable',{timeout:45000});
 assert.equal(await page.evaluate(()=>Boolean(window.ElaraAvatar3D||window.ElaraProceduralPreview)),false,'No procedural code should be loaded');
 assert.equal(await stage.locator('.elara-avatar-canvas').count(),0,'A missing male file must never yield a fake canvas');
 assert.equal(await stage.locator('[data-elara-avatar-status][data-state="error"]').count(),1,'Missing model must be explained');
 await stage.locator('[data-elara-avatar-fullscreen]').click();
 const dialog=page.locator('.elara-avatar-quick-modal:not([hidden])');
 await dialog.waitFor({state:'visible'});
 assert.equal(await dialog.locator('[data-elara-avatar-stage] .elara-avatar-canvas').count(),0);
 await dialog.locator('[data-avatar-quick-close]').first().click();
 assert.equal(await stage.isVisible(),true,'Closing the fullscreen view must preserve the profile');
 console.log('REAL_ONLY_AVATAR_NO_SYNTHETIC_FALLBACK_PASS');
}finally{await browser.close();}
