/* P3 Wardrobe isolated Chromium: mocked signed-in identity, never production Firebase proof. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const dir=process.env.ELARA_WARDROBE_SHOTS||'artifacts/wardrobe-p3';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const widths=[320,360,375,390,412,430,768,1440,1648],errors=[];
for(const width of widths){
 const context=await browser.newContext({viewport:{width,height:width>=1440?920:800}});
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(width+': '+error.message));
 await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ElaraProfileSystem&&!!window.ElaraWardrobeUI&&!!window.ElaraAccount,{timeout:30000});
 await page.evaluate(()=>{
  const account={uid:'wardrobe-p3-qa',name:'کاربر آزمایشی',username:'wardrobe_qa',xp:1000,bio:'آزمون مستقل',profilePublic:true};
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:account.uid,photoURL:''}),set:()=>{}});
  window.ElaraSocial={me:{...account},friends:[]};
  const original=window.ElaraProfileSystem.levelFromXp;
  window.ElaraProfileSystem.levelFromXp=()=>5;
  window.__wardrobeOriginalLevel=original;
  document.body.classList.remove('cloud-locked');
  document.body.classList.add('cloud-ready');
  document.documentElement.removeAttribute('data-elara-booting');
  document.getElementById('cloud-layer')?.setAttribute('hidden','');
  window.ElaraWardrobeUI.open();
 });
 await page.addStyleTag({content:'#cloud-layer{display:none!important}body.cloud-ready .shell{visibility:visible!important;opacity:1!important}'});
 try{await page.locator('.approved-wardrobe:not([hidden]) .wardrobe-p3-tabs').waitFor({timeout:12000});}catch(error){console.error('P3_LEGACY_DIAG '+JSON.stringify(await page.evaluate(()=>({hash:location.hash,wardrobeRoot:document.querySelector('.approved-wardrobe')?.outerHTML.slice(0,400),style:document.querySelector('.approved-wardrobe')?getComputedStyle(document.querySelector('.approved-wardrobe')).display:null,tabCount:document.querySelectorAll('.wardrobe-p3-tabs').length,html:document.querySelector('.approved-wardrobe')?.outerHTML.slice(0,1600)}))));throw error}
 assert.equal(await page.locator('[data-wardrobe-tab]').count(),5,'Five tabs');
 assert.equal(await page.locator('[data-wardrobe-equip]').isEnabled(),false,'No preview selection should equip');
 const box=await page.locator('.approved-wardrobe-window').boundingBox();
 assert.ok(box&&box.width<=width+1,'Wardrobe escapes viewport width '+width);
 const before=await page.evaluate(()=>JSON.stringify(window.ElaraProfileSystem.readWardrobe()));
 const selected=page.locator('[data-wardrobe-item="banner"]').first();
 await selected.click();
 const afterSelect=await page.evaluate(()=>JSON.stringify(window.ElaraProfileSystem.readWardrobe()));
 assert.equal(afterSelect,before,'Selection must NOT equip automatically');
 assert.equal(await page.locator('[data-wardrobe-equip]').isEnabled(),true,'Unlocked banner should be equippable');
 await page.screenshot({path:dir+'/wardrobe-'+width+'.png',fullPage:false});
 await page.locator('[data-wardrobe-equip]').click();
 const afterEquip=await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().banner);
 assert.ok(afterEquip,'Banner did not equip after explicit confirmation');
 await page.locator('[data-wardrobe-tab="frame"]').click();
 assert.ok(await page.locator('[data-wardrobe-item="frame"]').count()>0,'Frames missing');
 const lockedFrame=page.locator('[data-wardrobe-item="frame"][data-wardrobe-id="gold"]');
 await lockedFrame.click();
 assert.equal(await page.locator('[data-wardrobe-equip]').isEnabled(),false,'Locked frame became equippable');
 assert.equal(await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().frame),null,'Locked item unexpectedly equipped');
 await page.locator('[data-wardrobe-tab="badge"]').click();
 assert.match(await page.locator('.wardrobe-p3-empty').textContent(),/قرارداد تجهیز/);
 assert.equal(await page.locator('[data-wardrobe-equip]').isEnabled(),false,'Badge fake equip available');
 await page.locator('[data-wardrobe-tab="effect"]').click();
 assert.equal(await page.locator('[data-wardrobe-equip]').isEnabled(),false,'Effect fake equip available');
 if(width===390)await page.screenshot({path:dir+'/wardrobe-390-empty-effects.png',fullPage:false});
 if(width===390){
  await page.locator('.approved-wardrobe-window').evaluate(el=>el.scrollTop=el.scrollHeight);
  await page.screenshot({path:dir+'/wardrobe-390-bottom.png',fullPage:false});
 }
 await page.locator('[data-back-wardrobe]').click();
 await page.locator('.approved-wardrobe').waitFor({state:'hidden',timeout:10000});
 if(width===412){
  await page.evaluate(()=>window.ElaraPrivateDrawer?.open?.('account'));
  await page.locator('[data-approved-wardrobe]').first().evaluate(el=>el.click());
  await page.waitForFunction(()=>location.hash==='#wardrobe'&&!!document.querySelector('#elara-private-route .wardrobe-p3-tabs'),null,{timeout:13000});
  assert.equal(await page.locator('.approved-wardrobe:not([hidden])').count(),0,'Drawer wardrobe entry still opened an overlay');
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>location.hash==='#home',null,{timeout:13000});
  assert.ok(await page.locator('#elara-private-route').isHidden(),'Browser Back left private page in front of Home');
  const scrolling=await page.evaluate(()=>({body:document.body.style.overflow,html:document.documentElement.style.overflow}));
  assert.notEqual(scrolling.html,'hidden','Wardrobe Back left global document scroll locked');
 }
 await context.close();
}
assert.equal(errors.length,0,'Uncaught browser errors '+errors.join(' | '));
await browser.close();
console.log('WARDROBE_P3_MOCK_BROWSER_PASS '+widths.join(','));
