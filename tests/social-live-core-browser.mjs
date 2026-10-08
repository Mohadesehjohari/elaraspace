import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'https://mohadesehjohari.github.io/elaraspace').replace(/\/$/,'');
const sha=process.env.GITHUB_SHA||'';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[],storageRequests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/firebasestorage|firebase-storage|storage\.googleapis/i.test(r.url()))storageRequests.push(r.url())});
 await page.goto(base+'/?social_core='+sha+'#home',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&!!document.querySelector('.shell'),{timeout:25000});
 await page.waitForFunction(()=>typeof window.ElaraLoadSocial==='function',{timeout:25000});
 const loaded=await page.evaluate(async()=>{
  try{await window.ElaraLoadSocial()}catch(e){return {error:String(e?.message||e)}}
  return {ready:typeof window.ElaraSocial?.groups?.create==='function'&&typeof window.ElaraSocial?.clubs?.create==='function'&&typeof window.ElaraSocial?.challenges?.create==='function',
   guard:!!window.ElaraSocial?.socialCutover,
   overflow:document.documentElement.scrollWidth>innerWidth+2};
 });
 assert.equal(loaded.error,undefined,'Social import must not throw when signed out: '+JSON.stringify(loaded));
 assert.ok(loaded.ready,'Real Social core services not loaded');
 assert.equal(loaded.guard,false,'Temporary production guard must be absent');
 assert.equal(loaded.overflow,false,'Live mobile overflow');
 await page.evaluate(()=>{location.hash='#social';window.ElaraOpen?.('social')});
 await page.waitForTimeout(900);
 const site=await page.evaluate(()=>({hash:location.hash,social:!!document.getElementById('elara-social-page'),
   overflow:document.documentElement.scrollWidth>innerWidth+2}));
 assert.ok(site.social,'Social panel absent from live site');
 assert.equal(site.overflow,false);
 assert.equal(storageRequests.length,0,'Live startup must not require Firebase Storage');
 assert.deepEqual(errors,[],'Critical browser startup errors');
 console.log('LIVE_SOCIAL_CORE_BROWSER_PASS sha='+sha+' services=loaded guard=absent storage_requests=0 page_errors=0 390px');
}finally{await browser.close()}
