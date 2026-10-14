import {chromium} from 'playwright';
const mode=process.env.BISECT_MODE||'none';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(['JS',e.message.slice(0,220)]));
page.on('requestfailed',r=>errors.push(['NETWORK',r.url().split('/').pop()]));
const paths={
 'no-boot':['boot.js'],
 'no-design':['elara-design.js'],
 'no-reference':['reference-home-shell-2026.js'],
 'no-art':['artwork-home-install-2026.js','home-owner-art-2026.js','home-reference-polish-20261012.js'],
 'no-app':['app.js']
}[mode]||[];
const allow={
 'only-app':['app.js'],'only-phase2':['phase2.js'],
 'only-boot':['boot.js'],'only-design':['elara-design.js'],
 'only-core':['app.js','elara-design.js','reference-home-shell-2026.js'],
 'only-ref':['reference-home-shell-2026.js']
}[mode];
await page.route('**/*',async route=>{
 const url=route.request().url();
 const name=url.split('/').pop()?.split('?')[0]||'';
 if((allow&&/\.js(?:\?|$)/.test(url)&&!allow.includes(name))||paths.includes(name)||(mode==='no-css'&&/\.css(?:\?|$)/.test(url)&&name!=='styles.css')||(mode==='no-js'&&/\.js(?:\?|$)/.test(url))||(mode==='no-all-assets'&&/\.(?:js|css|webp|png|jpg|svg)(?:\?|$)/.test(url))||(mode==='no-static'&&['dialog.js','schedule.js','calendar.js','stable-dom.js','i18n.js','reading.js','notifications.js','app.js','library-enhancements.js','linked-tasks.js','phase2.js','elara-levels.js','collection-level.js','rpg.js','approved-profile-system.js','approved-icon-system.js'].includes(name)))await route.fulfill({status:200,contentType:name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/plain',body:''});
 else await route.continue();
});
let phase='navigate';
try{
 await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'commit',timeout:9000});
 await page.waitForTimeout(2300);
 phase='evaluate';
 const result=await Promise.race([page.evaluate(()=>({
 ready:document.readyState,home:!!document.getElementById('panel-home'),reference:!!window.ElaraReferenceHome,
 boot:document.documentElement.hasAttribute('data-elara-booting'),scriptCount:document.scripts.length
 })),new Promise(resolve=>setTimeout(()=>resolve('EVALUATE_TIMEOUT'),3000))]);
 console.log('BOOT_BISECT '+JSON.stringify({mode,phase,result,errors:errors.slice(0,8)}));
}catch(e){console.log('BOOT_BISECT '+JSON.stringify({mode,phase,error:e.message.slice(0,300),errors:errors.slice(0,8)}))}
finally{process.exit(0)}
