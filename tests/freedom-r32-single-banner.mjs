import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const cloud="window.ElaraAccount={user:{uid:'freedom-r32-qa',emailVerified:true},profile:{uid:'freedom-r32-qa'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'freedom-r32-qa'},friends:[],requests:[],activities:[],refresh:async()=>{}};";
const browser=await chromium.launch({headless:true});
try{
for(const width of [320,375,390,768,1024,1440,1648]){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.goto(origin+'/?r32='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.ElaraFreedomDashboardR26&&window.ElaraFreedomR30&&window.ElaraFreedomR31&&window.ElaraFreedomEnhancements?.__r31&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:50000});
 const tiles=await page.locator('#panel-freedom .fd-tile').allTextContents();
 assert.ok(tiles.some(x=>x.includes('تابلوی رؤیاها')),'gallery tile renamed');
 assert.ok(tiles.some(x=>x.includes('بازتاب‌های من')),'experiences tile renamed');
 const dreamIcon=await page.locator('#panel-freedom .fd-tile[data-fd-open="vision"] img').getAttribute('src');
 assert.ok(decodeURIComponent(dreamIcon).includes('Plans & Dreams.webp'),'correct requested dream icon');
 const loaded=await page.locator('#panel-freedom .fd-tile[data-fd-open="vision"] img').evaluate(img=>img.complete&&img.naturalWidth>0);
 assert.ok(loaded,'Plans and Dreams image exists');
 for(const kind of ['ideas','inspiration','vision','diary','art','experiences','gallery']){
  await page.evaluate(kind=>window.ElaraFreedomDashboardR26.openSection(kind),kind);
  await page.waitForSelector('#panel-freedom.freedom-subpage-open .freedom-subpage-shell[data-freedom-view="'+kind+'"]',{timeout:20000});
  const q=await page.evaluate(()=>{
   const p=document.querySelector('#panel-freedom');
   const visible=el=>el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>1;
   const hero=p.querySelector('.r30-hero,.r31-hero'),main=p.querySelector('.freedom-hero');
   const b=p.querySelector('.r30-back,.r31-back');
   return {primaryHidden:!visible(main),detailVisible:!!visible(hero),back:!!visible(b),
    horizontal:document.documentElement.scrollWidth,viewport:innerWidth,
    name:hero?.querySelector('h1')?.textContent||'',
    neon:getComputedStyle(p.querySelector('.r30-panel,.r31-panel')).borderColor};
  });
  assert.ok(q.primaryHidden,kind+' main banner must disappear '+JSON.stringify(q));
  assert.ok(q.detailVisible,kind+' one tab-specific banner is visible');
  assert.ok(q.back,kind+' usable back button');
  assert.ok(q.horizontal<=q.viewport+3,kind+' no document horizontal overflow');
  if(kind==='gallery')assert.ok(q.name.includes('تابلوی رؤیاها'),kind+' renamed banner');
  if(kind==='experiences')assert.ok(q.name.includes('بازتاب‌های من'),kind+' renamed banner');
  await page.locator('#panel-freedom .r30-back,#panel-freedom .r31-back').click();
  await page.waitForFunction(()=>!document.querySelector('#panel-freedom .freedom-subpage-shell'),null,{timeout:12000});
 }
 assert.equal(errors.length,0,'runtime errors width '+width+': '+errors.join(' | '));
 await page.close();
 console.log('R32_SINGLE_BANNER_PASS '+width);
}
}finally{await browser.close()}
