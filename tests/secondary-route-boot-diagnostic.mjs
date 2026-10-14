import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const routes=['home','tasks','books','language','exercise','social','ranking','freedom','reports','page','blog','store','focus-pomodoro','library-clips','language-books'];
try {
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(8000);
  const errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message.slice(0,380)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,270))});
  page.on('response',r=>{if(r.status()>=400&&/\.(?:js|css)/.test(r.url()))bad.push([r.status(),r.url().split('/').pop()])});
  const snapshot=async (tag)=>await page.evaluate((args)=>{
    const q=route=>{
      const p=document.getElementById('panel-'+route);
      const r=p?.getBoundingClientRect();
      return {route,exists:!!p,hidden:!!p?.classList.contains('hidden'),visible:!!r&&r.height>0,
        elements:p?.querySelectorAll('*').length??0, chars:p?.innerText?.trim().length||0,
        content:(p?.innerText||'').trim().slice(0,90)}
    };
    return {width:args.width,tag:args.tag,elapsed:Math.round(performance.now()),
      stage:window.__elaraBootStage,
      boot:document.documentElement.hasAttribute('data-elara-booting'),
      route:location.hash,
      hubs:typeof window.ElaraFeatureHubs?.refresh,
      features:['ElaraLibraryDashboardLIB01','ElaraLanguageUI12','ElaraWellnessDashboardWELL01','ElaraGlobalBanners','ElaraReportsDashboard'].map(x=>[x,typeof window[x]]),
      optional:(window.__elaraOptionalFailures||[]).slice(0,30),
      panels:args.routes.map(q),
      routeExposed:typeof window.ElaraOpen
    }
  },{tag,width,routes});
  try{
   await page.goto(base+'/?multi-route-diag='+width+'#home',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:25000});
   console.log('ROUTES_DIAG '+JSON.stringify(await snapshot('at-home-visible')));
   for(const route of routes.filter(x=>x!=='home'&&x!=='tasks')){
    await page.evaluate(route=>window.ElaraOpen?.(route,{history:'replace'}),route);
    await page.waitForTimeout(180);
    const s=await page.evaluate(route=>{
      const p=document.getElementById('panel-'+route);const r=p?.getBoundingClientRect();
      return {route,hash:location.hash,visible:!!r&&r.height>0,chars:p?.innerText?.trim().length||0,
        elms:p?.querySelectorAll('*').length||0,body:p?.innerText?.trim().slice(0,80)};
    },route);
    console.log('ROUTE_IMMEDIATE '+JSON.stringify({width,...s}));
   }
   await page.waitForTimeout(3000);
   console.log('ROUTES_DIAG '+JSON.stringify(await snapshot('after-3s')));
   await page.waitForTimeout(7000);
   console.log('ROUTES_DIAG '+JSON.stringify(await snapshot('after-10s')));
   for(const route of ['language-books','language','exercise','social','page']){
    await page.evaluate(route=>window.ElaraOpen?.(route,{history:'replace'}),route);
    await page.waitForTimeout(100);
    const detail=await page.evaluate(route=>{
      const p=document.getElementById('panel-'+route),e=p?.querySelector(':scope > *');
      const info=node=>{if(!node)return null;const s=getComputedStyle(node),r=node.getBoundingClientRect();return {tag:node.tagName,class:node.className,display:s.display,visibility:s.visibility,opacity:s.opacity,height:r.height,width:r.width,text:node.textContent?.trim().slice(0,120),inner:node.innerText?.trim().slice(0,120),hidden:node.hidden}};
      return {route,panel:info(p),child:info(e),children:p?.children.length,selector:document.querySelector('#main>.panel:not(.hidden)')?.id};
    },route);
    console.log('ROUTE_STYLE '+JSON.stringify({width,...detail}));
   }
  }catch(e){console.log('ROUTES_DIAG_ERROR '+JSON.stringify({width,error:e.message.slice(0,500)}));}
  console.log('ROUTES_DIAG_ERRORS '+JSON.stringify({width,errors:errors.slice(0,30),bad:bad.slice(0,35)}));
  await context.close();
 }
}finally{await browser.close()}
console.log('ROUTES_DIAG_DONE');
