import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const scenarios=['normal','no-scripts','no-app','no-phase2','no-linked','no-library','no-profile','no-first-group','no-last-group','no-boot'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
try{
 for(const name of scenarios){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage(),errors=[],network=[];
  page.on('pageerror',e=>errors.push(String(e.stack||e.message).slice(0,550)));
  page.on('requestfailed',r=>network.push(r.url().split('/').pop()+':'+r.failure()?.errorText));
  const block={
   'no-app':'app.js','no-phase2':'phase2.js','no-linked':'linked-tasks.js',
   'no-library':'library-enhancements.js','no-profile':'approved-profile-system.js','no-boot':'boot.js'
  }[name];
  if(block)await page.route('**/'+block+'*',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  if(name==='no-scripts')await page.route('**/*.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  if(name==='no-first-group')await page.route('**/*',r=>{
    const file=r.request().url().split('/').pop().split('?')[0];
    return ['dialog.js','schedule.js','calendar.js','stable-dom.js','i18n.js','reading.js','notifications.js','app.js'].includes(file)?
    r.fulfill({status:200,contentType:'application/javascript',body:''}):r.continue()
  });
  if(name==='no-last-group')await page.route('**/*',r=>{
    const file=r.request().url().split('/').pop().split('?')[0];
    return ['library-enhancements.js','linked-tasks.js','phase2.js','elara-levels.js','collection-level.js','rpg.js','approved-profile-system.js','approved-icon-system.js','drawer.js','avatar-3d.js'].includes(file)?
    r.fulfill({status:200,contentType:'application/javascript',body:''}):r.continue()
  });
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
