/* P2 Profile Hub visual smoke — no Firebase credentials or private accounts. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const dir=process.env.ELARA_HUB_SHOTS||'artifacts/profile-hub';
mkdirSync(dir,{recursive:true});
const sizes=[320,360,375,390,412,430,768,1440,1648],geometry=[],errors=[];
const browser=await chromium.launch({headless:true});
for(const width of sizes){
 const context=await browser.newContext({viewport:{width,height:width>=1440?941:820}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(width+': '+e.message));
 await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ElaraProfileSystem&&!!window.ElaraPrivateDrawer&&!!window.ElaraAccount,{timeout:25000});
 await page.evaluate(async()=>{try{await window.ElaraLoadSocial?.()}catch{}});
 await page.evaluate(()=>{
  const user={uid:'hub-visual-user',name:'کاربر آزمایش',username:'profile_qa',bio:'متن واقعی همین fixture',xp:260,profilePublic:true};
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:user.uid,photoURL:''}),set:()=>{}});
  window.ElaraSocial={me:user,friends:[],saveProfileValues:async values=>({warnings:[],profile:{...user,...values}})};
 });
 const originalNav=await page.evaluate(()=>document.querySelector('.bottom-nav')?.innerHTML||'');
 await page.evaluate(()=>window.ElaraPrivateDrawer.open('account'));
 await page.locator('.elara-profile-hub .elara-profile-composition').waitFor({state:'visible',timeout:12000});
 await page.locator('#elara-profile-hub-reference-css').waitFor({state:'attached',timeout:12000}).catch(()=>{});
 await page.waitForFunction(()=>!!document.getElementById('elara-profile-hub-reference-css')?.sheet,{timeout:12000});
 const metrics=await page.evaluate(()=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
  const root=document.querySelector('.elara-private-drawer'),panel=root.querySelector('.elara-private-drawer-panel'),area=document.getElementById('drawer-account-area'),hub=area.querySelector('.elara-profile-hub');
  return {width:innerWidth,rootSection:root.dataset.mobileSection,rootPadding:getComputedStyle(root).padding,rootWidth:rect(root),panel:rect(panel),panelPadding:getComputedStyle(panel).padding,area:rect(area),areaPadding:getComputedStyle(area).padding,hub:rect(hub),scrollWidth:area.scrollWidth,clientWidth:area.clientWidth,medals:hub.querySelectorAll('.elara-profile-hub-medal').length};
 });
 geometry.push({viewport:width,...metrics});
 await page.screenshot({path:dir+'/profile-hub-'+width+'-diagnostic.png'});
 assert.ok(metrics.hub.w>=Math.min(width-36,580)||width>700,'Narrow hub at '+width+' '+JSON.stringify(metrics));
 assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,'Profile hub horizontal scroll at '+width);
 assert.equal(await page.locator('.elara-profile-hub-actions button').count(),3);
 assert.equal(await page.locator('.elara-profile-hub-entry').count(),5);
 assert.equal(await page.locator('.elara-profile-hub-status').textContent().then(x=>x.includes('متن واقعی')),true);
 assert.equal(await page.locator('.elara-profile-hub-no-medals').count(),1,'Fixture must not invent earned medals');
 await page.screenshot({path:dir+'/profile-hub-'+width+'.png'});
 if(width===390||width===1648){
  await page.locator('.elara-profile-hub').screenshot({path:dir+'/profile-hub-'+width+'-full.png',timeout:30000});
 }
 if(width===390){
  await page.locator('.elara-profile-hub-entry[data-drawer-nav="blocked"]').click();
  assert.equal(await page.locator('[data-drawer-section="blocked"]').isVisible(),true,'Blocked route');
  await page.evaluate(()=>window.ElaraPrivateDrawer.open('account'));
  await page.locator('.elara-profile-hub-actions [data-profile-edit]').click();
  await page.locator('#elara-profile-edit-screen').waitFor({timeout:10000});
  assert.equal(await page.locator('.pe-heading h1').isVisible(),true);
 }else if(width===1440){
  assert.equal(await page.locator('.drawer-menu').isVisible(),true,'Desktop drawer menu must remain');
  await page.locator('.elara-profile-hub-actions [data-approved-wardrobe]').click();
  await page.locator('.approved-wardrobe:not([hidden])').waitFor({timeout:10000});
 }
 assert.equal(await page.evaluate(()=>document.querySelector('.bottom-nav')?.innerHTML||''),originalNav,'Main mobile navigation mutated');
 await context.close();
}
writeFileSync(dir+'/geometry.json',JSON.stringify(geometry,null,2));
assert.deepEqual(errors,[],'Browser errors');
await browser.close();
console.log('PROFILE_HUB_P2_MOCK_PASS '+sizes.join(','));
