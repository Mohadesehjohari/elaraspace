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
await page.route('**/*',async route=>{
 const url=route.request().url();
 const name=url.split('/').pop()?.split('?')[0]||'';
 if(paths.includes(name)||(mode==='no-css'&&/\.css(?:\?|$)/.test(url)&&name!=='styles.css'))await route.fulfill({status:200,contentType:name.endsWith('.css')?'text/css':'text/javascript',body:''});
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
