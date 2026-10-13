import { chromium } from 'playwright';
const root=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
 for(const blocked of ['none','boot.js','phase2.js','app.js','reference-home-shell-2026.js']){
   const ctx=await browser.newContext({viewport:{width:1280,height:820}});
   const page=await ctx.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message.slice(0,220)));
   if(blocked!=='none')await page.route('**/*',route=>{
     if(new URL(route.request().url()).pathname.endsWith('/'+blocked))
       return route.fulfill({status:200,contentType:'application/javascript',body:''});
     return route.continue();
   });
   const started=Date.now();
   let goto='ok',dcl='timeout';
   try{
     await page.goto(root+'/?diagnose='+blocked+'#home',{waitUntil:'commit',timeout:9000});
     try{await page.waitForLoadState('domcontentloaded',{timeout:9000});dcl='yes';}
     catch(e){dcl='no: '+String(e.message).slice(0,120)}
   }catch(e){goto=String(e.message).slice(0,190)}
   let status='unresponsive';
   try{
     const state=await Promise.race([
       page.evaluate(()=>({
         readyState:document.readyState,booting:document.documentElement.hasAttribute('data-elara-booting'),
         homeOwner:typeof window.ElaraReferenceHome,
         coreHero:!!document.querySelector('#panel-home .elara-hero'),
         css:document.styleSheets.length,
         stage:window.__elaraBootStage,
         optional:window.__elaraOptionalFailures
       })),
       new Promise(resolve=>setTimeout(()=>resolve('DOM evaluation timed out'),2000))
     ]);
     status=JSON.stringify(state);
   }catch(e){status=String(e.message).slice(0,200)}
   console.log('BOOT_BLOCKER_DIAGNOSTIC '+JSON.stringify({blocked,elapsed:Date.now()-started,dcl,goto,status,errors:errors.slice(0,4)}));
   await ctx.close().catch(()=>{});
 }
}finally{await browser.close().catch(()=>{})}
