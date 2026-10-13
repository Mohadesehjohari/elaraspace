import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const scenarios=['static-only','boot-no-dynamic','with-design','with-navigation-design','with-reference','with-hubs','with-visual','with-artwork','all-critical','all-no-artwork','all-no-reference','normal'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
try{
 for(const name of scenarios){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage(),errors=[],network=[];
  page.on('pageerror',e=>errors.push(String(e.stack||e.message).slice(0,550)));
  page.on('requestfailed',r=>network.push(r.url().split('/').pop()+':'+r.failure()?.errorText));
  const staticScripts=['dialog.js','schedule.js','calendar.js','stable-dom.js','i18n.js','reading.js',
    'notifications.js','app.js','library-enhancements.js','linked-tasks.js','phase2.js','elara-levels.js',
    'collection-level.js','rpg.js','approved-profile-system.js','approved-icon-system.js','drawer.js','avatar-3d.js','boot.js'];
  const nav=['approved-navigation-extension.js'];
  const design=['elara-design.js'];
  const ref=['reference-home-shell-2026.js'];
  const hubs=['feature-hubs-shell.js','reference-shell-compat-2026.js','mobile-ia-2026-10-05.js'];
  const visuals=['approved-visual.js','approved-runtime.js','approved-home-return.js','home-functional-pass-2026.js'];
  const art=['artwork-home-install-2026.js','home-owner-art-2026.js','home-reference-polish-20261012.js'];
  const core=[...nav,...design,...ref,...hubs,...visuals,...art];
  const allow={
    'static-only':staticScripts.filter(s=>s!=='boot.js'),
    'boot-no-dynamic':staticScripts,
    'with-design':[...staticScripts,...design],
    'with-navigation-design':[...staticScripts,...nav,...design],
    'with-reference':[...staticScripts,...nav,...design,...ref],
    'with-hubs':[...staticScripts,...nav,...design,...ref,...hubs],
    'with-visual':[...staticScripts,...nav,...design,...ref,...hubs,...visuals],
    'with-artwork':[...staticScripts,...nav,...design,...ref,...hubs,...visuals,...art],
    'all-critical':[...staticScripts,...core],
    'all-no-artwork':[...staticScripts,...core.filter(s=>!art.includes(s))],
    'all-no-reference':[...staticScripts,...core.filter(s=>!ref.includes(s))],
    'normal':null
  }[name];
  if(allow)await page.route('**/*.js*',r=>{
    const fname=r.request().url().split('/').pop().split('?')[0];
    return allow.includes(fname)?r.continue():r.fulfill({status:200,contentType:'application/javascript',body:''});
  });
  const t=Date.now();
  try{
   await page.goto(base+'/?isolate='+name+'#home',{waitUntil:'commit',timeout:10000});
   await sleep(1950);
   const info=await Promise.race([
     page.evaluate(()=>({
       rs:document.readyState,boot:document.documentElement.hasAttribute('data-elara-booting'),
       home:!!document.querySelector('#panel-home'),grid:!!document.querySelector('#panel-home .elara-dashboard-grid'),
       nav:!!window.ElaraNavigation,open:typeof window.ElaraOpen,owner:!!window.ElaraReferenceHome,
       ready:document.querySelector('#panel-home .elara-dashboard-grid')?.dataset.structureReady,
       scripts:document.scripts.length
     })).then(x=>({responsive:true,...x})).catch(e=>({exception:e.message})),
     sleep(1300).then(()=>({responsive:false,timeout:true}))
   ]);
   console.log('ISOLATION '+JSON.stringify({name,ms:Date.now()-t,...info,errors:errors.slice(0,4),network:network.slice(0,5)}));
  }catch(e){console.log('ISOLATION_ERROR '+name+' '+e.message)}
  await Promise.race([ctx.close().catch(()=>{}),sleep(700)]);
 }
}finally{await Promise.race([browser.close().catch(()=>{}),sleep(1000)])}
console.log('ISOLATION_DONE');
