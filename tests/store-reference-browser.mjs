import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const out='artifacts/store-reference';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
const cloudStub="window.ElaraAccount={user:{uid:'store-test',email:'store@example.test',emailVerified:true},profile:{uid:'store-test',name:'Tester',xp:0},logout:async()=>{},sendPasswordReset:async()=>{}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:{uid:'store-test',name:'Tester',xp:0},friends:[],requests:[],refresh:async()=>{},saveProfileValues:async()=>({})};window.dispatchEvent(new Event('elara:social-updated'));";
async function open(width){
 const context=await browser.newContext({viewport:{width,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/store-reference|store-view|shop_senter/i.test(m.text()))errors.push(m.text())});
 await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.goto(base+'/?store-reference-qa=1#store',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.ElaraStore&&document.querySelectorAll('#panel-store .store-product').length>=30&&document.querySelector('#panel-store .elara-global-hero')&&getComputedStyle(document.querySelector('#panel-store .elara-global-hero')).backgroundImage.includes('shop_senter.webp'),null,{timeout:30000});
 await page.waitForFunction(()=>window.ElaraProfileSystem?.currentUid?.()==='store-test',null,{timeout:15000});
 return {context,page,errors}
}
async function screenshotBefore(width){
 const context=await browser.newContext({viewport:{width,height:900}});
 const page=await context.newPage();
 try{
  await page.goto('https://mohadesehjohari.github.io/elaraspace/#store',{waitUntil:'domcontentloaded',timeout:16000});
  await page.waitForTimeout(1500);
  await page.screenshot({path:out+'/before-'+width+'.png',fullPage:true,timeout:15000});
 }catch(error){console.warn('Before screenshot unavailable at',width,error.message)}
 await context.close();
}
for(const width of widths){
 const {context,page,errors}=await open(width);
 const count=await page.locator('#panel-store .store-product').count();
 assert.ok(count>=35,width+': real catalog rows missing: '+count);
 assert.equal(await page.locator('#panel-store>.store-hero').count(),1,width+': duplicate/missing hero');
 assert.equal(await page.locator('#panel-store>.store-hero').getAttribute('data-elara-page-hero'),'store');
 const art=await page.locator('#panel-store>.store-hero').evaluate(el=>({css:getComputedStyle(el).backgroundImage,top:el.getBoundingClientRect().top}));
 assert.match(art.css,/shop_senter\.webp/,width+': approved banner is not bound to hero');
 const imgOk=await page.evaluate(()=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>10&&i.naturalHeight>10);i.onerror=()=>resolve(false);i.src='assets/ui/shop_senter.webp'}));
 assert.equal(imgOk,true,width+': banner decode failed');
 const overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
 assert.ok(overflow.document<=overflow.viewport+2,width+': horizontal overflow '+JSON.stringify(overflow));
 if(width===390||width===1440){
  await screenshotBefore(width);
  await page.screenshot({path:out+'/after-'+width+'.png',fullPage:true});
 }
 const cols=await page.locator('#panel-store .store-catalog').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
 if(width<=430)assert.equal(cols,2,width+': compact two-column catalog expected');
 if(width>=1440)assert.ok(cols>=4,width+': desktop catalog insufficiently dense');
 if(width<=700){
  assert.equal(await page.locator('#store-filter-panel').isVisible(),false,width+': mobile drawer must start closed');
  await page.locator('[data-store-filter-open]').click();
  assert.equal(await page.locator('#store-filter-panel').isVisible(),true,width+': mobile filters failed to open');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#store-filter-panel').isVisible(),false,width+': mobile Escape failed');
 }
 const search=page.locator('#panel-store [data-store-search]');
 await search.fill('Galaxy');
 assert.equal(await page.locator('#panel-store .store-product:visible').count(),1,width+': search must filter verified catalog');
 await search.fill('');
 await page.locator('#panel-store [data-store-category="frames"]').first().click();
 assert.equal(await page.locator('#panel-store .store-product').count(),4,width+': canonical frame catalog lost');
 const locked=page.locator('#panel-store .store-product[data-store-id="diamond"] [data-store-equip]');
 assert.equal(await locked.isDisabled(),true,width+': level lock unexpectedly enabled');
 await page.locator('#panel-store .store-product[data-store-id="bronze"] [data-store-preview]').first().click();
 assert.equal(await page.locator('#store-preview-dialog').isVisible(),true,width+': preview not open');
 await page.locator('#store-preview-dialog [data-store-equip]').click();
 const equipped=await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().frame);
 assert.equal(equipped,'bronze',width+': real wardrobe equip did not persist');
 await page.locator('#panel-store [data-store-category="all"]').first().click();
 const first=page.locator('#panel-store .store-product[data-store-kind="avatar"][data-store-id="female:1"]');
 await first.locator('[data-store-wish]').click();
 assert.equal(await first.locator('[data-store-wish]').getAttribute('aria-pressed'),'true',width+': favorite not persisted');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ElaraStore&&document.querySelectorAll('#panel-store .store-product').length>=35,null,{timeout:30000});
 await page.waitForFunction(()=>window.ElaraProfileSystem?.currentUid?.()==='store-test',null,{timeout:15000});
 assert.equal(await page.locator('#panel-store .store-product[data-store-kind="avatar"][data-store-id="female:1"] [data-store-wish]').getAttribute('aria-pressed'),'true',width+': wishlist lost on refresh');
 assert.equal(await page.evaluate(()=>window.ElaraProfileSystem.readWardrobe().frame),'bronze',width+': wardrobe lost on refresh');
 assert.equal(errors.length,0,width+': new browser errors '+errors.join(' | '));
 console.log('PASS '+width+' catalog='+count+' columns='+cols+' hero='+art.css.slice(0,96));
 await context.close();
}
await browser.close();
