import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
for(const width of [320,375,390,430]){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(base+'/?hotfix-mobile='+width+'#home',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&document.querySelector('.shell'),{timeout:20000});
 const result=await page.evaluate(()=>({
   innerWidth,
   docWidth:document.documentElement.scrollWidth,
   bodyWidth:document.body.scrollWidth,
   home:location.hash==='#home',
   shell:!!document.querySelector('.shell'),
   homeAssets:[...document.images].filter(img=>/assets\//.test(img.getAttribute('src')||'')).length
 }));
 assert.equal(result.home,true,'root must remain on Home at '+width);
 assert.ok(result.docWidth<=result.innerWidth+2,'document horizontal overflow at '+width+': '+JSON.stringify(result));
 assert.ok(result.bodyWidth<=result.innerWidth+2,'body horizontal overflow at '+width+': '+JSON.stringify(result));
 assert.ok(result.shell,'shell missing at '+width);
 assert.ok(result.homeAssets>0,'Home assets missing at '+width);
 assert.equal(pageErrors.length,0,'uncaught page errors at '+width+': '+pageErrors.join(' | '));
 console.log('HOTFIX_MOBILE_PASS '+JSON.stringify({width,...result}));
 await context.close();
}
await browser.close();
console.log('HOTFIX_MOBILE_MATRIX_PASS 320 375 390 430 overflow=0');
