import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
mkdirSync('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,375,390,430,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?home_header='+width+'#home',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.ElaraReferenceHome&&document.querySelector('#ref-header-account .ref-account-copy strong')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
  await page.waitForTimeout(250);
  const m=await page.evaluate(()=>{
   const pos=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,mid:r.x+r.width/2,w:r.width,h:r.height,display:c.display,visibility:c.visibility}};
   const account=document.querySelector('#ref-header-account');
   return {
    width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
    account:account?.getAttribute('class'),html:account?.outerHTML.slice(0,1000),
    name:pos('#ref-header-account .ref-account-copy strong'),
    avatar:pos('#ref-header-account .ref-account-avatar'),
    bell:pos('#ref-header-notifications'),theme:pos('#theme-toggle'),
    settings:!!document.querySelector('#ref-header-settings'),
    quote:!!document.querySelector('#ref-home-quote-card')&&getComputedStyle(document.querySelector('#ref-home-quote-card')).display!=='none',
    hero:document.querySelector('.owner-home-hero-image')?.naturalWidth||0
   };
  });
  console.log('HOME_HEADER_LAYOUT '+JSON.stringify(m));
  await page.screenshot({path:'browser-artifacts/home-header-'+width+'.png',animations:'disabled'});
  for(const key of ['name','avatar','bell','theme']){
   assert.ok(m[key]&&m[key].w>=8&&m[key].h>=8&&m[key].display!=='none'&&m[key].visibility!=='hidden',
    'Home header '+key+' hidden or zero-size '+width);
  }
  assert.ok(m.name.mid>m.avatar.mid&&m.avatar.mid>m.bell.mid&&m.bell.mid>m.theme.mid,
    'Wrong RTL header order; expected name→avatar→bell→theme at '+width+' '+JSON.stringify(m));
  assert.ok(m.scrollWidth<=width+2&&m.bodyWidth<=width+2,'Header creates overflow '+width);
  assert.equal(m.settings,false,'Settings gear must not return '+width);
  assert.equal(m.quote,false,'Quote must not return '+width);
  assert.ok(m.hero>0,'Owner WebP Home Hero missing '+width);
  assert.deepEqual(errors,[],'Page errors in Home header smoke '+width);
  console.log('HOME_HEADER_ORDER_PASS '+width);
  await context.close();
 }
}finally{await browser.close()}
console.log('HOME_HEADER_ORDER_MATRIX_PASS 320 375 390 430 768 1440');
