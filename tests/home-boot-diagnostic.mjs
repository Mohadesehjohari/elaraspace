import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
 for(const scenario of ['normal','owner-delayed']){
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  const errors=[],failures=[],consoleErrors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('requestfailed',r=>failures.push({url:r.url().split('/').pop(),err:r.failure()?.errorText}));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,250))});
  if(scenario==='owner-delayed'){
   await page.route('**/reference-home-shell-2026.js*',async route=>{
    await new Promise(r=>setTimeout(r,5000));
    await route.continue();
   });
  }
  try{
   await page.goto(base+'/?diagnostic='+scenario+'#home',{waitUntil:'commit',timeout:15000});
   for(const wait of [1300,4000,8000]){
    await page.waitForTimeout(wait===1300?1300:wait===4000?2700:4000);
    const info=await page.evaluate(()=>({
     ready:document.readyState,htmlBooting:document.documentElement.hasAttribute('data-elara-booting'),
     shellVisible:getComputedStyle(document.querySelector('.shell')||document.body).visibility,
     home:!!document.getElementById('panel-home'),owner:!!window.ElaraReferenceHome,
     nav:!!window.ElaraNavigation,open:typeof window.ElaraOpen,design:!!document.querySelector('#panel-home .elara-dashboard-grid'),
     refHome:document.getElementById('panel-home')?.classList.contains('ref-home')||false,
     homeStructure:document.querySelector('#panel-home .elara-dashboard-grid')?.dataset.structureReady||'',
     status:window.__elaraBootStage,failures:window.__elaraOptionalFailures||[],
     scriptNodes:document.scripts.length,loadedScripts:performance.getEntriesByType('resource').filter(x=>x.name.includes('.js?')).length,
     scripts:[...document.scripts].filter(x=>x.src).slice(-9).map(x=>x.src.split('/').pop()),
     missingSections:['main','panel-home','panel-tasks','panel-settings','timer-display','elara-mirror-timer'].filter(id=>!document.getElementById(id)),
     extra:window.__elaraHomeError||null
    }));
    console.log('BOOT_DIAG '+JSON.stringify({scenario,elapsed:wait,...info,errors,failures:failures.slice(-12),consoleErrors:consoleErrors.slice(-12)}));
   }
  }catch(e){console.log('DIAG_FATAL '+scenario+' '+e.stack)}
  await context.close();
 }
}finally{await browser.close()}
