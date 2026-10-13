import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const scenarios=['no-scripts','early-only','late-only','i18n-only','app-only','phase2-only','rpg-only','reading-only','library-only','profile-only','icons-only','all-except-i18n','all-except-rpg','all-except-phase2','all-except-app'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
try{
 for(const name of scenarios){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage(),errors=[],network=[];
  page.on('pageerror',e=>errors.push(String(e.stack||e.message).slice(0,550)));
  page.on('requestfailed',r=>network.push(r.url().split('/').pop()+':'+r.failure()?.errorText));
  const early=['dialog.js','schedule.js','calendar.js','stable-dom.js','i18n.js','reading.js','notifications.js','app.js'];
  const late=['library-enhancements.js','linked-tasks.js','phase2.js','elara-levels.js','collection-level.js','rpg.js','approved-profile-system.js','approved-icon-system.js','drawer.js','avatar-3d.js'];
  const allow={
    'no-scripts':[], 'early-only':early,'late-only':late,
    'i18n-only':['i18n.js'],'app-only':['app.js'],'phase2-only':['phase2.js'],'rpg-only':['rpg.js'],
    'reading-only':['reading.js'],'library-only':['library-enhancements.js'],
    'profile-only':['approved-profile-system.js'],'icons-only':['approved-icon-system.js'],
    'all-except-i18n':[...early,...late,'boot.js'].filter(x=>x!=='i18n.js'),
    'all-except-rpg':[...early,...late,'boot.js'].filter(x=>x!=='rpg.js'),
    'all-except-phase2':[...early,...late,'boot.js'].filter(x=>x!=='phase2.js'),
    'all-except-app':[...early,...late,'boot.js'].filter(x=>x!=='app.js')
  }[name];
  await page.route('**/*.js*',r=>{
    const fname=r.request().url().split('/').pop().split('?')[0];
    return allow.includes(fname)?r.continue():r.fulfill({status:200,contentType:'application/javascript',body:''});
  });
  const t=Date.now();
  try{
   await page.goto(base+'/?isolate='+name+'#home',{waitUntil:'commit',timeout:10000});
   await sleep(1000);
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
