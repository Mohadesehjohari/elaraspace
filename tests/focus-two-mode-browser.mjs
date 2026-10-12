import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'focus-flow',emailVerified:true},profile:{uid:'focus-flow',name:'Focus',username:'focus_flow'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'focus-flow',name:'Focus'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
try{
for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:width===390?844:960}});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.addInitScript(()=>localStorage.setItem('elara_space_v1',JSON.stringify({version:1,theme:'dark',xp:0,tasks:[],habits:[],goals:[],books:[],words:[],taskLists:[],folders:[],tags:[],focusSessions:[]})));
 await page.goto(root+'/#books',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!document.querySelector('#lib01-overview [data-lib01-focus-inline]')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
 await page.locator('#lib01-overview [data-lib01-focus-inline]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').activeFocus?.status==='running');
 assert.equal(await page.evaluate(()=>location.hash),'#books','library timer must not navigate');
 assert.equal(await page.evaluate(()=>document.body.classList.contains('elara-focus-fullscreen')),false,'library inline must not enter fullscreen');
 await page.locator('#lib01-overview [data-lib01-focus-inline]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').activeFocus?.status==='paused');
 await page.evaluate(()=>window.ElaraOpen('focus-pomodoro',{history:'push'}));
 await page.locator('#panel-focus-pomodoro:not(.hidden) #elara-focus-expand').waitFor();
 assert.equal(await page.locator('#panel-focus-pomodoro .focus-config').isVisible(),true,'setup must show settings');
 assert.equal(await page.evaluate(()=>document.body.classList.contains('elara-focus-fullscreen')),false,'setup starts nonfullscreen');
 await page.locator('#timer-start').click();
 await page.waitForFunction(()=>document.body.classList.contains('elara-focus-fullscreen'));
 assert.equal(await page.locator('#panel-focus-pomodoro .focus-config').isVisible(),false,'immersive settings should be hidden');
 assert.equal(await page.locator('#panel-focus-pomodoro .elara-focus-mode-options').isVisible(),false,'immersive modes should be hidden');
 await page.locator('#elara-focus-exit').click();
 assert.equal(await page.evaluate(()=>document.body.classList.contains('elara-focus-fullscreen')),false,'return to setup');
 assert.equal(await page.locator('#panel-focus-pomodoro .focus-config').isVisible(),true,'setup settings restored');
 const m=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,w:innerWidth}));
 assert.ok(m.sw<=m.w+1,'horizontal overflow '+width+' '+JSON.stringify(m));
 console.log('FOCUS_02_FLOW_PASS',width);
 await page.close();
}
}finally{await browser.close()}
