import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const out=process.env.ELARA_P4_SHOTS||'artifacts/profile-p4';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
const failures=[];
for(const width of widths){
 const context=await browser.newContext({viewport:{width,height:width<700?690:900}});
 const page=await context.newPage();
 page.on('pageerror',e=>failures.push(width+': '+e.message));
 await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ElaraProfileSystem&&!!window.ElaraPrivateDrawer&&!!window.ElaraWardrobeUI&&!!window.ElaraP4Routes,{timeout:30000});
 await page.evaluate(()=>{
  const user={uid:'p4-mock-uid-A',name:'کاربر آزمایشی',username:'qa_p4',bio:'آزمون مستقل',xp:500,profilePublic:true};
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:user.uid}),set:()=>{}});
  window.ElaraSocial={me:user,friends:[],requests:[]};
  document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');
  document.documentElement.removeAttribute('data-elara-booting');
  document.getElementById('cloud-layer')?.setAttribute('hidden','');
 });
 await page.addStyleTag({content:'#cloud-layer{display:none!important}html[data-elara-booting] .shell,body.cloud-locked .shell{visibility:visible!important;opacity:1!important}'});
 // Only clicks on visible UI. Never call openProfile or openWardrobe programmatically.
 await page.locator('#elara-account-menu-trigger').click();
 await page.locator('.drawer-menu [data-p4-private-profile]').click();
 await page.waitForURL('**/#profile');
 await page.locator('#elara-p4-private-profile:not([hidden]) .elara-profile-hub').waitFor({timeout:10000});
 assert.equal(await page.locator('#elara-p4-private-profile .elara-profile-hub-edit').isVisible(),true);
 assert.ok(!(await page.locator('#elara-p4-private-profile').evaluate(el=>el.scrollWidth>el.clientWidth+3)),'profile overflow '+width);
 if(width===390||width===1440)await page.screenshot({path:out+'/profile-'+width+'.png',fullPage:false});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ElaraP4Routes&&!!window.ElaraProfileSystem,{timeout:20000});
 // A user session mock cannot survive reload; auth gate must not display another account's private data.
 await page.locator('#elara-p4-private-profile').waitFor({timeout:10000});
 assert.equal(new URL(page.url()).hash,'#profile');
 assert.equal(await page.locator('#elara-p4-private-profile .elara-profile-hub').count(),0,'Ghost profile after signed-out reload');
 await page.evaluate(()=>{
  const user={uid:'p4-mock-uid-B',name:'حساب دوم',username:'qa_p4_b',bio:'متن دوم',xp:0};
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:user.uid}),set:()=>{}});
  window.ElaraSocial={me:user};
  window.dispatchEvent(new Event('elara:account-ready'));
 });
 assert.ok((await page.locator('#elara-p4-private-profile').textContent()).includes('حساب دوم'),'second UID did not hydrate');
 await page.locator('#elara-p4-private-profile [data-approved-wardrobe]').first().click();
 await page.waitForURL('**/#wardrobe');
 await page.locator('.approved-wardrobe.p4-wardrobe-route:not([hidden]) .wardrobe-p3-tabs').waitFor({timeout:12000});
 assert.equal(await page.locator('.wardrobe-p3-tabs button').count(),5);
 if(width===390||width===1440)await page.screenshot({path:out+'/wardrobe-'+width+'.png',fullPage:false});
 await page.locator('[data-back-wardrobe]').click();
 await page.waitForURL('**/#profile');
 await context.close();
}
await browser.close();
assert.deepEqual(failures,[],'page errors');
console.log('PROFILE_P4_REAL_UI_ROUTE_PASS');
