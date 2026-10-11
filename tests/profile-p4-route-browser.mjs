import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const url=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const out=process.env.ELARA_P4_SHOTS||'artifacts/profile-p4';
mkdirSync(out,{recursive:true});
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
const errors=[],browser=await chromium.launch({headless:true});
const user={uid:'p4-fixture-user-A',username:'testing_p4',name:'کاربر آزمون صفحه مستقل',bio:'سلام به دنیای پروفایل من؛ این یک متن آزمایشی بلند برای بررسی فارسی و Latin username testing_p4 است.',xp:1000,profilePublic:true};
async function seed(page,who=user){
 await page.waitForFunction(()=>!!window.ElaraProfileSystem&&!!window.ElaraPrivateDrawer&&!!window.ElaraWardrobeUI&&!!window.ElaraAccount,{timeout:30000});
 await page.evaluate(usr=>{
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:usr.uid,photoURL:'',metadata:{creationTime:'2026-01-01T00:00:00Z'}})});
  window.ElaraSocial={me:{...usr},friends:[],saveProfileValues:async()=>({warnings:[]})};
  window.ElaraProfileSystem.levelFromXp=()=>5;
  document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');
  document.getElementById('cloud-layer')?.setAttribute('hidden','');
  document.documentElement.removeAttribute('data-elara-booting');
  window.dispatchEvent(new Event('elara:account-ready'));
 },who);
 await page.addStyleTag({content:'#cloud-layer{display:none!important;pointer-events:none!important}body.cloud-ready .shell{visibility:visible!important;opacity:1!important}'});
}
for(const width of widths){
 const ctx=await browser.newContext({viewport:{width,height:width===390?680:width>=1024?900:780}});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(width+': '+e.message));
 // Deterministic mocked auth bootstrap: the real header and account UI are clicked,
 // while Firebase is never contacted and no fixture can modify real users.
 await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraAccount={user:null,profile:null,logout:async()=>{}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
 await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],saveProfileValues:async values=>({profile:values,warnings:[]})};window.ElaraLoadSocial=async()=>window.ElaraSocial;window.dispatchEvent(new Event('elara:social-updated'));"}));
 await page.goto(url+'/#home',{waitUntil:'domcontentloaded'});
 await seed(page);
 for(let attempt=0;attempt<2;attempt++){
  const visible=await page.locator('#ref-header-account').isVisible().catch(()=>false);
  if(visible)break;
  if(attempt===0){await page.reload({waitUntil:'domcontentloaded'});await seed(page)}
  await page.waitForTimeout(1500);
 }
 await page.screenshot({path:out+'/entry-before-'+width+'.png',fullPage:false});
 const entryDiagnosis=await page.locator('#ref-header-account').evaluate(el=>({visible:!!el.getClientRects().length,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity,ancestors:[...function*(x){while(x&&x!==document.body){yield [x.tagName,x.className,getComputedStyle(x).display,getComputedStyle(x).visibility];x=x.parentElement}}(el)].slice(0,8)}));
 if(!entryDiagnosis.visible)throw Error('Header account inaccessible at '+width+': '+JSON.stringify(entryDiagnosis));
 await page.locator('#ref-header-account').click();
 await page.locator('.drawer-menu [data-drawer-nav="account"]').click();
 await page.waitForURL('**/#profile');
 try{await page.locator('#elara-private-profile-page:not([hidden]) .elara-profile-hub').waitFor({timeout:6000})}
 catch(e){const diag=await page.evaluate(()=>({hash:location.hash,root:document.getElementById('elara-private-profile-page')?.outerHTML.slice(0,1800),uid:window.ElaraProfileSystem?.currentUid?.(),me:window.ElaraSocial?.me,drawer:document.querySelector('#drawer-account-area')?.innerHTML.slice(0,350),errors:document.querySelector('.cloud-layer')?.getAttribute('hidden')}));console.error('P4-ROUTE-DIAG',JSON.stringify(diag));await page.screenshot({path:out+'/profile-failed-'+width+'.png'});throw e}
 const routeBefore=await page.evaluate(()=>({hash:location.hash,drawerVisible:!document.querySelector('.elara-private-drawer')?.classList.contains('hidden'),social:!!document.getElementById('panel-page')}));
 assert.equal(routeBefore.hash,'#profile');
 assert.equal(routeBefore.drawerVisible,false,'Account page remains trapped inside Drawer');
 await page.screenshot({path:out+'/profile-'+width+'.png',fullPage:false});
 const geom=await page.locator('#elara-private-profile-page').boundingBox();
 assert.ok(geom&&geom.width<=width+1,'Profile page horizontal overflow at '+width);
 const cta=page.locator('#elara-private-profile-page [data-p4-wardrobe]').last();
 await cta.click();
 await page.waitForURL('**/#wardrobe');
 await page.locator('.p4-wardrobe-page .wardrobe-p3-tabs').waitFor({timeout:10000});
 await page.screenshot({path:out+'/wardrobe-'+width+'.png',fullPage:false});
 const wardrobeGeom=await page.locator('.p4-wardrobe-page .approved-wardrobe-window').boundingBox();
 assert.ok(wardrobeGeom&&wardrobeGeom.width<=width+1,'Wardrobe width overflow at '+width);
 const initial=await page.evaluate(()=>JSON.stringify(window.ElaraProfileSystem.readWardrobe()));
 await page.locator('[data-wardrobe-item="banner"]').first().click();
 assert.equal(await page.evaluate(()=>JSON.stringify(window.ElaraProfileSystem.readWardrobe())),initial,'Preview wrote equipment before Equip');
 if(width===390)await page.screenshot({path:out+'/wardrobe-390-preview-before-equip.png',fullPage:false});
 await page.locator('[data-wardrobe-equip]').click();
 const equipped=await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().banner);
 assert.ok(equipped,'Explicit equip did not persist');
 if(width===390)await page.screenshot({path:out+'/wardrobe-390-equipped.png',fullPage:false});
 await page.locator('[data-wardrobe-tab="frame"]').click();
 await page.locator('[data-wardrobe-item="frame"][data-wardrobe-id="gold"]').click();
 assert.equal(await page.locator('[data-wardrobe-equip]').isEnabled(),false,'Locked item became equippable');
 if(width===390)await page.screenshot({path:out+'/wardrobe-390-locked.png',fullPage:false});
 await page.locator('.p4-wardrobe-page [data-back-wardrobe]').click();
 await page.waitForURL('**/#profile');
 await page.locator('#elara-private-profile-page .elara-profile-hub').waitFor();
 if(width===390){
  await page.reload({waitUntil:'domcontentloaded'});
  await seed(page);
  await page.locator('#elara-private-profile-page .elara-profile-hub').waitFor();
  assert.equal(await page.evaluate(()=>location.hash),'#profile','Direct route reload failed');
  await page.evaluate(()=>window.ElaraProfilePages.navigate('wardrobe'));
  await page.locator('.p4-wardrobe-page .wardrobe-p3-tabs').waitFor();
  assert.equal(await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().banner),equipped,'Equipment missing after reload');
  await page.evaluate(()=>window.ElaraProfilePages.back());
  await page.waitForURL('**/#profile');
 }
 await ctx.close();
}
assert.deepEqual(errors,[],'Uncaught JS errors: '+errors.join(' | '));
await browser.close();
console.log('PROFILE_P4_NATURAL_UI_ROUTE_MOCK_PASS '+widths.join(','));
