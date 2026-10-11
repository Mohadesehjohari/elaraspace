/* P3 wardrobe: fixture-backed nine-width UI and equip transaction regression.
   No real Firebase/Storage claims. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173',dir=process.env.ELARA_WARDROBE_SHOTS||'artifacts/wardrobe';
mkdirSync(dir,{recursive:true});
const widths=[320,360,375,390,412,430,768,1440,1648],out=[],errors=[],browser=await chromium.launch();
const mockGate='#cloud-layer{display:none!important;visibility:hidden!important;pointer-events:none!important}html[data-elara-booting] .shell,body.cloud-locked .shell,body.cloud-locked .workspace{visibility:visible!important;opacity:1!important;pointer-events:auto!important}';
for(const width of widths){
 const context=await browser.newContext({viewport:{width,height:width>1000?941:820}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(width+': '+e.message));
 await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ElaraWardrobeUI&&!!window.ElaraProfileSystem&&!!window.ElaraAccount&&typeof window.ElaraLoadSocial==='function',{timeout:25000});
 await page.evaluate(async()=>{try{await window.ElaraLoadSocial()}catch{}});
 await page.evaluate(()=>{
   window.__wardrobeMock={uid:'wardrobe-p3-account-A',xp:0};
 });
 await page.evaluate(w=>{
  window.__wardrobeMock.xp=w>=1440?100000000:0;
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:window.__wardrobeMock.uid,photoURL:''}),set:()=>{}});
  Object.defineProperty(window,'ElaraSocial',{configurable:true,get:()=>({me:{uid:window.__wardrobeMock.uid,name:'کاربر آزمایشی',username:'wardrobe_qa',xp:window.__wardrobeMock.xp,bio:'داده Fixture'},friends:[]}),set:()=>{}});
 },width);
 await page.evaluate(()=>window.ElaraWardrobeUI.open());
 await page.addStyleTag({content:mockGate});
 await page.evaluate(()=>{document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.documentElement.removeAttribute('data-elara-booting')});
 await page.locator('.approved-wardrobe.wardrobe-reference:not([hidden]) .wardrobe-ref-hero').waitFor({state:'visible',timeout:12000});
 await page.waitForFunction(()=>!!document.getElementById('wardrobe-reference-css')?.sheet,{timeout:10000});
 const geom=await page.evaluate(()=>{
  const root=document.querySelector('.wardrobe-reference'),panel=root.querySelector('.approved-wardrobe-window'),scroller=root.querySelector('.wardrobe-reference-main');
  return {viewport:innerWidth,outerWidth:panel.getBoundingClientRect().width,scrollWidth:scroller.scrollWidth,clientWidth:scroller.clientWidth,navBefore:document.querySelector('.bottom-nav')?.innerHTML||''}
 });
 out.push({width,...geom,navBefore:undefined});
 assert.ok(geom.scrollWidth<=geom.clientWidth+3,'Wardrobe horizontal overflow '+width+': '+JSON.stringify(geom));
 assert.equal(await page.locator('[data-wardrobe-tab]').count(),5,'Five tabs');
 assert.equal(await page.locator('[data-wardrobe-tab="banner"]').getAttribute('aria-selected'),'true');
 assert.ok(await page.locator('.wardrobe-ref-hero .elara-profile-composition').isVisible());
 await page.screenshot({path:dir+'/wardrobe-'+width+'.png'});
 if(width===390||width===1648)await page.locator('.wardrobe-reference-main').screenshot({path:dir+'/wardrobe-'+width+'-full.png',timeout:30000});
 const storageKey=await page.evaluate(()=>window.ElaraProfileSystem.key(window.__wardrobeMock.uid));
 const before=await page.evaluate(key=>localStorage.getItem(key),storageKey);
 if(width<1440){
  const locked=page.locator('[data-wardrobe-ref-item="banner"].is-locked').first();
  if(await locked.count()){
   await locked.click();
   assert.equal(await page.locator('[data-wardrobe-equip]').isDisabled(),true,'Locked item must not equip');
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),storageKey),before,'Locked preview mutated canonical wardrobe');
  }
  await page.locator('[data-wardrobe-tab="badge"]').click();
  assert.equal(await page.locator('[data-wardrobe-equip]').isDisabled(),true,'Unsupported badge equip must remain disabled');
  await page.locator('[data-wardrobe-tab="effect"]').click();
  assert.equal(await page.locator('[data-wardrobe-equip]').isDisabled(),true,'Unsupported effect equip must remain disabled');
 }else {
  await page.locator('[data-wardrobe-ref-item="banner"]').last().click();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),storageKey),before,'Selecting a card must NOT equip');
  const equip=page.locator('[data-wardrobe-equip]');
  if(await equip.isEnabled()){
   await equip.click();
   assert.notEqual(await page.evaluate(key=>localStorage.getItem(key),storageKey),before,'Equip did not persist to canonical wardrobe');
   await page.evaluate(()=>window.ElaraWardrobeUI.close());
   await page.evaluate(()=>window.ElaraWardrobeUI.open());
   assert.ok(await page.locator('.wardrobe-ref-hero .elara-profile-composition').isVisible(),'Equipped profile not rendered after reopen');
  }
 }
 if(width===430){
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.locator('.approved-wardrobe[hidden]').waitFor({state:'attached',timeout:10000});
 }
 if(width===390){
  await page.locator('[data-back-wardrobe]').click();
  assert.ok(await page.locator('.approved-wardrobe[hidden]').count()===1,'Back did not close wardrobe');
  assert.ok(await page.locator('.elara-private-drawer:not(.hidden)').count()===1,'Back must route to existing profile Drawer');
 }
 assert.equal(await page.evaluate(()=>document.querySelector('.bottom-nav')?.innerHTML||''),geom.navBefore,'Global mobile nav mutated');
 await context.close();
}
writeFileSync(dir+'/geometry.json',JSON.stringify(out,null,2));
assert.deepEqual(errors,[]);
await browser.close();
console.log('WARDROBE_P3_MOCK_PASS '+widths.join(','));
