import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const scenarios=['normal','no-css','no-artwork','no-owner-art','no-polish','no-reference','no-visual','no-cloud','no-boot'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
try{
 for(const name of scenarios){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage(),errors=[],network=[];
  page.on('pageerror',e=>errors.push(String(e.stack||e.message).slice(0,550)));
  page.on('requestfailed',r=>network.push(r.url().split('/').pop()+':'+r.failure()?.errorText));
  const block={
   'no-artwork':'artwork-home-install-2026.js',
   'no-owner-art':'home-owner-art-2026.js',
   'no-polish':'home-reference-polish-20261012.js',
   'no-reference':'reference-home-shell-2026.js',
   'no-visual':'approved-visual.js',
   'no-boot':'boot.js'
  }[name];
  if(block)await page.route('**/'+block+'*',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  if(name==='no-css')await page.route('**/*.css*',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  if(name==='no-cloud')await page.route('**/*firebase*',r=>r.abort());
  const t=Date.now();
  try{
   await page.goto(base+'/?isolate='+name+'#home',{waitUntil:'commit',timeout:10000});
   await sleep(2500);
   const info=await Promise.race([
     page.evaluate(()=>({
       rs:document.readyState,boot:document.documentElement.hasAttribute('data-elara-booting'),
       home:!!document.querySelector('#panel-home'),grid:!!document.querySelector('#panel-home .elara-dashboard-grid'),
       nav:!!window.ElaraNavigation,open:typeof window.ElaraOpen,owner:!!window.ElaraReferenceHome,
       ready:document.querySelector('#panel-home .elara-dashboard-grid')?.dataset.structureReady,
       scripts:document.scripts.length
     })).then(x=>({responsive:true,...x})).catch(e=>({exception:e.message})),
     sleep(2500).then(()=>({responsive:false,timeout:true}))
   ]);
   console.log('ISOLATION '+JSON.stringify({name,ms:Date.now()-t,...info,errors:errors.slice(0,4),network:network.slice(0,5)}));
  }catch(e){console.log('ISOLATION_ERROR '+name+' '+e.message)}
  await Promise.race([ctx.close().catch(()=>{}),sleep(700)]);
 }
}finally{await Promise.race([browser.close().catch(()=>{}),sleep(1000)])}
console.log('ISOLATION_DONE');
