/* Mocked browser contract for the isolated Edit Profile page.
   Run with ELARA_TEST_URL=http://127.0.0.1:4173 node tests/profile-edit-redesign-browser.mjs
   This does NOT verify real Firebase permissions, Storage or deployed build. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const dir=process.env.ELARA_PROFILE_SHOTS||'artifacts/profile-edit';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const sizes=[320,375,390,430,768,1440,1648];
const geometry=[];
const errors=[];
const mockAuthStyle='#cloud-layer{display:none!important;visibility:hidden!important;pointer-events:none!important}html[data-elara-booting] .shell,body.cloud-locked .shell,body.cloud-locked .workspace{visibility:visible!important;opacity:1!important;pointer-events:auto!important}';
const testUser={uid:'mock-profile-edit-test',name:'کاربر آزمایشی',username:'visual_qa',bio:'متن تست',xp:0,profilePublic:true};
const bootstrap=async(page)=>{
 await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ElaraProfileSystem&&!!window.ElaraAccount&&typeof window.ElaraLoadSocial==='function',{timeout:25000});
 await page.evaluate(async()=>{try{await window.ElaraLoadSocial()}catch{}});
 await page.evaluate(user=>{
  Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:user.uid,photoURL:'',metadata:{creationTime:'2026-01-05T12:00:00Z'}}),set:()=>{}});
  window.__profileEditSaveCalls=[];
  const saveProfileValues=async(values)=>{
   window.__profileEditSaveCalls.push({...values});
   if(values.username==='occupied_qa')throw new Error('این نام کاربری قبلاً ثبت شده است.');
   if(values.username==='denied_qa'){const error=new Error('permission denied');error.code='permission-denied';throw error}
   window.ElaraSocial.me={...window.ElaraSocial.me,...values};
   return {warnings:[],profile:window.ElaraSocial.me};
  };
  window.ElaraSocial={me:{...user},friends:[],saveProfileValues};
  window.ElaraProfileSystem.canonicalProfileService=async()=>({saveProfileValues});
 },testUser);
 await page.evaluate(()=>window.ElaraProfileSystem.openEditor());
 // Test-only bypass of the signed-out Firebase account gate; never change production gate code.
 await page.addStyleTag({content:mockAuthStyle});
 await page.evaluate(()=>{const layer=document.getElementById('cloud-layer');if(layer){layer.hidden=true;layer.inert=true}document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.documentElement.removeAttribute('data-elara-booting')});
 await page.locator('#elara-profile-edit-screen').waitFor({timeout:15000});
 assert.equal(await page.locator('.pe-heading h1').isVisible(),true,'The Edit Profile surface must be visible');
 await page.locator('.pe-preview-card').waitFor({timeout:10000});
};
for(const width of sizes){
 const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(width+': '+e.message));
 await bootstrap(page);
 const dims=await page.evaluate(()=>{
  const a=document.querySelector('.pe-screen'),b=document.querySelector('#elara-profile-edit-screen');
  const rect=selector=>{const e=b.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}};
  return {
   editorWidth:a.clientWidth,scrollWidth:a.scrollWidth,outerScrollWidth:b.scrollWidth,outerClientWidth:b.clientWidth,
   main:rect('.pe-editor'),preview:rect('.pe-preview-outer'),heading:rect('.pe-heading'),back:rect('.pe-back'),banner:rect('.pe-banner'),
   avatar:rect('.pe-avatar'),camera:rect('.pe-camera'),identity:rect('.pe-name-grid'),
   bio:rect('.pe-bio-field'),colors:rect('.pe-colors'),templates:rect('.pe-templates'),
   frames:rect('.pe-frames-list'),actions:rect('.pe-actions'),nav:document.querySelector('.bottom-nav')?.getBoundingClientRect().top||null
  };
 });
 geometry.push({viewport:width,...dims});
 assert.ok(dims.scrollWidth<=dims.editorWidth+3,'Editor horizontal overflow at '+width+': '+JSON.stringify(dims));
 assert.ok(dims.outerScrollWidth<=dims.outerClientWidth+3,'Screen horizontal overflow at '+width);
 if(width>=1280){
  assert.ok(dims.back.x+dims.back.width<=dims.main.x+dims.main.width+4,
   'Desktop Back button overlaps preview column: '+JSON.stringify(dims));
  assert.ok(dims.heading.x<dims.preview.x,'Desktop title is not in edit column');
 }
 await page.screenshot({path:dir+'/profile-edit-'+width+'.png',fullPage:false});
 if(width===320||width===375||width===430)assert.ok(await page.locator('.pe-banner').isVisible(),'Banner hidden at '+width);
 if(width===390||width===1648){
  await page.evaluate(()=>{
   const el=document.getElementById('elara-profile-edit-screen');
   el.style.setProperty('position','absolute','important');el.style.setProperty('inset','auto 0 auto 0','important');
   el.style.setProperty('height','auto','important');el.style.setProperty('overflow','visible','important');
   // Only the long capture masks the fixed global dock; normal viewport screenshots validate it unchanged.
   const dock=document.querySelector('.bottom-nav');if(dock)dock.style.setProperty('visibility','hidden','important');
  });
  await page.locator('.pe-screen').screenshot({path:dir+'/profile-edit-'+width+'-full.png',timeout:20000});
  await page.evaluate(()=>{
   document.getElementById('elara-profile-edit-screen').removeAttribute('style');
   document.querySelector('.bottom-nav')?.style.removeProperty('visibility');
  });
 }
 if(width===390||width===1440){
  await page.evaluate(()=>{const scroller=document.getElementById('elara-profile-edit-screen');scroller.scrollTop=scroller.scrollHeight});
  await page.screenshot({path:dir+'/profile-edit-'+width+'-bottom.png',fullPage:false});
  await page.evaluate(()=>{document.getElementById('elara-profile-edit-screen').scrollTop=0});
 }
 if(width===375){
  await page.locator('[data-pe-action="avatars"]').click();
  await page.locator('[data-pe-avatar-id="male:1"]').click();
  assert.match(await page.locator('.pe-preview-avatar img.pe-preview-portrait').getAttribute('src'),/level-01-m-circle[.]png/);
  await page.locator('[data-pe-action="reset"]').click();
  assert.equal(await page.locator('.pe-preview-avatar img.pe-preview-portrait').count(),0,'Unsaved avatar did not reset');
 }
 await page.locator('#elara-profile-edit-screen [name="name"]').fill('نام جدید');
 await page.locator('#elara-profile-edit-screen [name="title"]').fill('در مسیر یادگیری');
 assert.equal(await page.locator('.pe-preview-body h3').textContent(),'نام جدید');
 assert.match(await page.locator('.pe-preview-title').textContent(),/در مسیر یادگیری/);
 await page.locator('[data-pe-action="reset"]').click();
 assert.equal(await page.locator('.pe-preview-body h3').textContent(),testUser.name);
 assert.equal(await page.locator('#elara-profile-edit-screen [name="title"]').inputValue(),'');
 if(width===390){
  const navBefore=await page.evaluate(()=>document.querySelector('.bottom-nav')?.innerHTML||'');
  const sidebarBefore=await page.evaluate(()=>document.querySelector('.sidebar')?.innerHTML||'');
  await page.locator('[data-pe-color="pink"]').click();
  await page.locator('[data-pe-template="nebula"]').click();
  assert.equal(await page.locator('.pe-preview-body').getAttribute('data-template'),'nebula');
  await page.locator('#elara-profile-edit-screen [name="username"]').fill('occupied_qa');
  await page.locator('[data-pe-save]').click();
  await page.waitForFunction(()=>document.querySelector('[data-pe-status]')?.textContent.includes('قبلاً'),{timeout:10000}).catch(async()=>{throw Error('Duplicate check failed: '+JSON.stringify(await page.evaluate(()=>({status:document.querySelector('[data-pe-status]')?.textContent,calls:window.__profileEditSaveCalls,disabled:document.querySelector('[data-pe-save]')?.disabled}))))});
  assert.notEqual(await page.locator('[data-pe-status]').textContent(),'اطلاعات اصلی در Firebase ذخیره شد.');
  await page.locator('#elara-profile-edit-screen [name="username"]').fill('denied_qa');
  await page.locator('[data-pe-save]').click();
  await page.waitForFunction(()=>document.querySelector('[data-pe-status]')?.textContent.includes('Firebase اجازهٔ ذخیره نداد'));
  await page.locator('#elara-profile-edit-screen [name="username"]').fill('visual_qa');
  await page.locator('#elara-profile-edit-screen [name="title"]').fill('عنوان تست');
  await page.locator('[data-pe-save]').click();
  await page.waitForFunction(()=>document.querySelector('[data-pe-status]')?.textContent.includes('در همین مرورگر'));
  assert.equal(await page.locator('.pe-preview-title').textContent(),'عنوان تست');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_profile_edit_extras_v1_mock-profile-edit-test')).title),'عنوان تست');
  const navAfter=await page.evaluate(()=>document.querySelector('.bottom-nav')?.innerHTML||'');
  const sidebarAfter=await page.evaluate(()=>document.querySelector('.sidebar')?.innerHTML||'');
  assert.equal(navAfter,navBefore,'Mobile nav mutated');
  assert.equal(sidebarAfter,sidebarBefore,'Sidebar mutated');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.ElaraProfileSystem&&!!window.ElaraAccount&&typeof window.ElaraLoadSocial==='function',{timeout:20000});
  await page.evaluate(async()=>{try{await window.ElaraLoadSocial()}catch{}});
  await page.evaluate(user=>{
   Object.defineProperty(window.ElaraAccount,'user',{configurable:true,get:()=>({uid:user.uid,photoURL:''}),set:()=>{}});
   window.ElaraSocial={me:{...user},friends:[],saveProfileValues:async()=>({warnings:[]})};
  },testUser);
  await page.evaluate(()=>window.ElaraProfileSystem.openEditor());
  await page.addStyleTag({content:mockAuthStyle});
  await page.evaluate(()=>{const layer=document.getElementById('cloud-layer');if(layer){layer.hidden=true;layer.inert=true}document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.documentElement.removeAttribute('data-elara-booting')});
  await page.locator('#elara-profile-edit-screen').waitFor();
  assert.equal(await page.locator('#elara-profile-edit-screen [name="title"]').inputValue(),'عنوان تست','Local visual settings did not survive reload');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#cloud-layer')).display),'none','Auth gate must stay excluded from mock screenshots');
  await page.screenshot({path:dir+'/profile-edit-390-after-reload.png',fullPage:false});
 }
 if(width===430){
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.locator('#elara-profile-edit-screen').waitFor({state:'detached',timeout:10000});
  assert.match(await page.evaluate(()=>location.hash),/#home/,'Browser Back changed source page unexpectedly');
 }
 if(width===1440){
  await page.locator('[data-pe-action="close"]').click();
  await page.locator('#elara-profile-edit-screen').waitFor({state:'detached',timeout:10000});
 }
 await context.close();
}
writeFileSync(dir+'/geometry.json',JSON.stringify(geometry,null,2));
assert.equal(errors.length,0,'Uncaught browser errors: '+errors.join(' | '));
await browser.close();
console.log('PROFILE_EDIT_MOCK_BROWSER_PASS viewports='+sizes.join(',')+' snapshots='+dir);
