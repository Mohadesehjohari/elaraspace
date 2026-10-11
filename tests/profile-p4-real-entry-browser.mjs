/* PROFILE-P4: actual UI-click and direct-link smoke; mock identities, NOT Firebase evidence. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const dest=process.env.ELARA_P4_SHOTS||'artifacts/profile-p4';
mkdirSync(dest,{recursive:true});
const widths=[320,360,375,390,412,430,768,1024,1440,1648],errors=[],checks=[];
const browser=await chromium.launch({headless:true});
const user=(uid='p4-uid-A')=>({uid,name:'نام آزمایشی پروفایل',username:'latin_test_111',bio:'متن فارسی طولانی برای ارزیابی شکست درست خطوط و نظم کارت‌های پروفایل در گوشی',xp:750,profilePublic:true});
for(const width of widths){
 const context=await browser.newContext({viewport:{width,height:width>=1024?940:width<=390?730:850}});
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(width+': '+error.message));
 await page.goto(base+'/?p4='+width+'#home',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ElaraProfileSystem&&window.ElaraWardrobeUI&&window.ElaraPrivateDrawer&&window.ElaraPrivateRoutes&&window.ElaraAccount&&document.getElementById('ref-header-account'),null,{timeout:35000});
 await page.evaluate(async()=>{try{await window.ElaraLoadSocial?.()}catch{}});
 await page.evaluate(account=>{
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:account.uid,photoURL:''}),set:()=>{}});
  window.ElaraSocial={me:{...account},friends:[],saveProfileValues:async p=>{Object.assign(window.ElaraSocial.me,p);return{profile:window.ElaraSocial.me,warnings:[]}}};
  document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');
  document.documentElement.removeAttribute('data-elara-booting');
  const layer=document.getElementById('cloud-layer');if(layer){layer.hidden=true;layer.inert=true}
 },user());
 await page.addStyleTag({content:'#cloud-layer{display:none!important;pointer-events:none!important}html[data-elara-booting] .shell,body.cloud-locked .shell{visibility:visible!important;opacity:1!important}'});
 const initialMobile=await page.locator('.bottom-nav').innerHTML();
 // The entire entry path uses visible app controls; never call .open() to start navigation.
 await page.locator('#ref-header-account').click();
 await page.locator('.elara-private-drawer:not(.hidden) .drawer-menu [data-drawer-nav="account"]').waitFor({state:'visible',timeout:12000});
 await page.locator('.elara-private-drawer:not(.hidden) .drawer-menu [data-drawer-nav="account"]').click();
 await page.waitForFunction(()=>location.hash==='#profile'&&document.body.classList.contains('elara-private-route-profile'),null,{timeout:12000});
 await page.locator('#elara-private-route .elara-profile-hub-hero .elara-profile-composition').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('.elara-private-drawer:not(.hidden)').count(),0,'Profile must not sit inside modal drawer');
 const badgeState=await page.evaluate(()=>({earned:(window.ElaraProfileSystem.viewModel(window.ElaraSocial.me,{self:true}).medals||[]).length,visible:document.querySelectorAll('#elara-private-route .elara-profile-hub-medal').length}));
 assert.equal(badgeState.visible,badgeState.earned,'Medal list differs from canonical view model');
 assert.ok((await page.locator('#elara-private-route .elara-profile-hub-status').innerText()).includes('متن فارسی'),'Bio missing');
 assert.ok(await page.locator('.topbar').isVisible(),'Global header hidden');
 assert.equal(await page.locator('.approved-wardrobe:not([hidden])').count(),0,'Old wardrobe popup leaked');
 await page.screenshot({path:dest+'/profile-'+width+'.png',fullPage:true});
 if(width===390||width===1440)await page.screenshot({path:dest+'/profile-'+width+'-viewport.png',fullPage:false});
 const top=await page.locator('#elara-private-route .elara-profile-hub-hero').boundingBox();
 assert.ok(top?.width>Math.min(width-45,570),'Profile hero too narrow '+width);
 assert.ok(await page.locator('#elara-private-route .elara-profile-hub-actions [data-profile-edit]').isVisible(),'Edit CTA missing');
 // From inside private profile, actual wardrobe CTA must open a *page*, not legacy overlay.
 await page.locator('#elara-private-route .elara-profile-hub-actions [data-approved-wardrobe]').click();
 await page.waitForFunction(()=>location.hash==='#wardrobe'&&document.body.classList.contains('elara-private-route-wardrobe'),null,{timeout:12000});
 await page.locator('#elara-private-route .wardrobe-p3-tabs').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('#elara-private-route .wardrobe-p3-tabs button').count(),5);
 assert.equal(await page.locator('.approved-wardrobe:not([hidden])').count(),0,'Wardrobe still a modal');
 const before=await page.evaluate(()=>JSON.stringify(window.ElaraProfileSystem.readWardrobe()));
 await page.locator('#elara-private-route [data-wardrobe-item="banner"]').first().click();
 const afterPreview=await page.evaluate(()=>JSON.stringify(window.ElaraProfileSystem.readWardrobe()));
 assert.equal(afterPreview,before,'Selection wrote equipment before Equip');
 await page.screenshot({path:dest+'/wardrobe-'+width+'-preview.png',fullPage:true});
 await page.locator('#elara-private-route [data-wardrobe-equip]').click();
 const afterEquip=await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().banner);
 assert.ok(afterEquip,'Equip did not save local wardrobe');
 await page.screenshot({path:dest+'/wardrobe-'+width+'-equipped.png',fullPage:false});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ElaraPrivateRoutes&&window.ElaraWardrobeUI&&window.ElaraAccount,null,{timeout:25000});
 // Simulated signed-in identity again after reload (no Firebase credentials).
 await page.evaluate(async account=>{
  try{await window.ElaraLoadSocial?.()}catch{}
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:account.uid}),set:()=>{}});
  window.ElaraSocial={me:{...account},friends:[]};
  window.ElaraPrivateRoutes.render();
 },user());
 await page.locator('#elara-private-route .wardrobe-p3-tabs').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().banner),afterEquip,'Local equip lost on reload');
 await page.locator('#elara-private-route [data-wardrobe-tab="frame"]').click();
 await page.locator('#elara-private-route [data-wardrobe-item="frame"][data-wardrobe-id="diamond"]').click();
 assert.equal(await page.locator('#elara-private-route [data-wardrobe-equip]').isEnabled(),false,'Locked frame equippable');
 if(width===390)await page.screenshot({path:dest+'/wardrobe-390-locked.png',fullPage:false});
 await page.locator('#elara-private-route [data-p4-back]').click();
 await page.waitForFunction(()=>location.hash==='#profile'&&document.body.classList.contains('elara-private-route-profile'));
 assert.ok(await page.locator('#elara-private-route .elara-profile-hub-hero').isVisible(),'Back failed to profile');
 if(width===390){await page.goForward();await page.waitForFunction(()=>location.hash==='#wardrobe');await page.goBack();await page.waitForFunction(()=>location.hash==='#profile')}
 if(width===412){
  await page.evaluate(()=>{Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:'p4-uid-B'}),set:()=>{}});window.ElaraSocial.me={...window.ElaraSocial.me,uid:'p4-uid-B',name:'حساب دوم بدون تجهیزات'};window.dispatchEvent(new Event('elara:account-ready'))});
  await page.waitForTimeout(100);
  assert.ok(await page.locator('#elara-private-route .elara-profile-hub').isVisible(),'UID switch lost own route');
  assert.equal(await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().banner),null,'UID B inherited A banner');
 }
 assert.equal(await page.locator('.bottom-nav').innerHTML(),initialMobile,'Main mobile menu changed');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=3,'Horizontal overflow '+width+': '+overflow);
 checks.push({width,success:true,overflow});
 await context.close();
}
assert.deepEqual(errors,[],'Console runtime errors');
writeFileSync(dest+'/results.json',JSON.stringify({checks,errors},null,2));
await browser.close();
console.log('PROFILE_P4_REAL_CLICK_MOCK_PASS '+widths.join(','));
