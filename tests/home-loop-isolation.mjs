import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const scenarios=['prefix-all','plus-cloud','plus-cloud-external','plus-social-external','normal-no-cloud','normal-no-social','normal-no-page','normal-no-external','normal'];
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
  const deferred=["approved-focus-dialog.js","approved-wellness.js","approved-overlay-guard.js","approved-language-journal.js","visual-fidelity-pass2.js","visual-fidelity-pass3.js","task-bulk-reorder.js","task-checklist.js","entity-reorder.js","entity-bulk-selection.js","task-collections.js","focus-ambience.js","domain-notifications.js","mission-celebration.js","social-view.js","social-messaging-ui.js","social-groups-ui.js","social-clubs-ui.js","social-challenges-ui.js","page-view.js","social-engagement-view.js","reports.js","blog-view.js","freedom-page.js","freedom-enhancements.js","freedom-diary-music.js","freedom-ai.js","feature-hubs-2026.js","language-custom-classes.js","store-view.js","profile-social-tools.js","mobile-banner-copy.js","global-page-banner-20261009.js","ui12-language-dashboard.js","ui13-language-routes.js","well01-wellness-dashboard.js","wellness-reference-popups-20261012.js","freedom-dashboard-r2026.js","freedom-r27-music.js","ranking-gold-20261012.js","task-organizer-20261012.js","task-cross-links-20261012.js","task-streak-calendar-20261012.js","freedom-r28-notebook.js"];
  const taskFirst=['task-bulk-reorder.js','task-checklist.js','entity-reorder.js','entity-bulk-selection.js','task-collections.js'];
  const deferred=["approved-focus-dialog.js","approved-wellness.js","approved-overlay-guard.js","approved-language-journal.js","visual-fidelity-pass2.js","visual-fidelity-pass3.js","task-bulk-reorder.js","task-checklist.js","entity-reorder.js","entity-bulk-selection.js","task-collections.js","focus-ambience.js","domain-notifications.js","mission-celebration.js","social-view.js","social-messaging-ui.js","social-groups-ui.js","social-clubs-ui.js","social-challenges-ui.js","page-view.js","social-engagement-view.js","reports.js","blog-view.js","freedom-page.js","freedom-enhancements.js","freedom-diary-music.js","freedom-ai.js","feature-hubs-2026.js","language-custom-classes.js","store-view.js","profile-social-tools.js","mobile-banner-copy.js","global-page-banner-20261009.js","ui12-language-dashboard.js","ui13-language-routes.js","well01-wellness-dashboard.js","wellness-reference-popups-20261012.js","freedom-dashboard-r2026.js","freedom-r27-music.js","ranking-gold-20261012.js","task-organizer-20261012.js","task-cross-links-20261012.js","task-streak-calendar-20261012.js","freedom-r28-notebook.js"];
  const coreAll=[...staticScripts,...core,...deferred];
  const allow={
    'prefix-all':coreAll,
    'plus-cloud':[...coreAll,'cloud.js'],
    'plus-cloud-external':[...coreAll,'cloud.js','__ALLOW_EXTERNAL__'],
    'plus-social-external':[...coreAll,'cloud.js','elara-social.js','__ALLOW_EXTERNAL__'],
    'normal-no-cloud':null,'normal-no-social':null,'normal-no-page':null,'normal-no-external':null,'normal':null
  }[name];
  await page.route('**/*.js*',r=>{
    const u=r.request().url(),file=u.split('/').pop().split('?')[0];
    const forbid=(name==='normal-no-cloud'&&file==='cloud.js')||
      (name==='normal-no-social'&&file==='elara-social.js')||
      (name==='normal-no-page'&&['elara-page.js','social-engagement.js'].includes(file))||
      (name==='normal-no-external'&&!u.startsWith(base));
    const block=forbid||(allow&&!allow.includes(file)&&!(allow.includes('__ALLOW_EXTERNAL__')&&!u.startsWith(base)));
    return block?r.fulfill({status:200,contentType:'application/javascript',body:''}):r.continue();
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
   console.log('ISOLATION '+JSON.stringify({name,ms:Date.now()-t,...info,errors:errors.slice(0,4),network:network.slice(0,5),extraJs:requested.filter(x=>!coreAll.includes(x)).slice(-35)}));
  }catch(e){console.log('ISOLATION_ERROR '+name+' '+e.message)}
  await Promise.race([ctx.close().catch(()=>{}),sleep(700)]);
 }
}finally{await Promise.race([browser.close().catch(()=>{}),sleep(1000)])}
console.log('ISOLATION_DONE');
