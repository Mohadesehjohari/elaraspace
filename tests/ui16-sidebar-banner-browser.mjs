import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const root=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/[/]$/,'');
await mkdir('browser-artifacts/ui16-sidebar',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,768,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<700?844:990},deviceScaleFactor:1});
  const page=await context.newPage();
  // The real app/Pages files load unchanged; only this Chromium context has
  // fixture authentication so screenshots show the actual Sidebar, not login.
  const auth="window.ElaraAccount={user:{uid:'sidebar-visual-qa',email:'qa@example.invalid',emailVerified:true},profile:{uid:'sidebar-visual-qa',name:'Visual QA',username:'sidebar_fixture',profilePublic:true,xp:0}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
  const social="window.ElaraSocial={me:{uid:'sidebar-visual-qa',name:'Visual QA',username:'sidebar_fixture'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(()=>{localStorage.setItem('elara_space_v1',JSON.stringify({version:1,tasks:[],words:[],languageClasses:[],books:[],habits:[],goals:[],folders:[],tags:[],taskLists:[]}));});
  await page.goto(root+'/?sidebar-s1='+width+'#home',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.ElaraReferenceHome&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:28000});
  await page.evaluate(()=>window.ElaraReferenceHome.render());
  await page.waitForSelector('#ref-sidebar-banner',{state:'attached',timeout:20000});
  await page.waitForFunction(()=>document.body.classList.contains('cloud-ready')&&!document.body.classList.contains('cloud-locked'),null,{timeout:20000});
  assert.equal(await page.locator('#cloud-layer').isVisible(),false,width+': screenshot is blocked by login overlay');
  assert.equal(await page.locator('.shell').isVisible(),true,width+': main application shell not visible');
  const model=await page.locator('#ref-sidebar-banner').evaluate(el=>{
   const s=getComputedStyle(el),rect=el.getBoundingClientRect();
   return{image:s.backgroundImage,position:s.backgroundPosition,size:s.backgroundSize,
    display:s.display,height:rect.height,width:rect.width,text:el.innerText};
  });
  assert.ok(model.image.includes('daily-banner-bg_main.webp'),width+': Sidebar owner daily art missing '+JSON.stringify(model));
  assert.ok(!model.image.includes('background-moonlit-mountains.webp'),width+': old Sidebar image still rendered');
  assert.match(model.text,/هر روز/,width+': existing daily copy missing');
  if(width>700){
   assert.ok(model.display!=='none'&&model.width>=130&&model.height>=150,
    width+': owner Sidebar card too small/hidden '+JSON.stringify(model));
   const hit=await page.locator('#ref-sidebar-banner').evaluate(el=>{
    const r=el.getBoundingClientRect(),p=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return{reachable:!!p&&(p===el||el.contains(p)),tag:p?.tagName,insideViewport:r.top>=0&&r.top<innerHeight};
   });
   assert.ok(hit.reachable&&hit.insideViewport,width+': Sidebar owner card must be visually reachable, not behind overlay '+JSON.stringify(hit));
   const decoded=await page.evaluate(async()=>{
    const i=new Image();i.src=new URL('assets/ui/daily-banner-bg_main.webp',location.href).href;
    try{await i.decode()}catch{}return{w:i.naturalWidth,h:i.naturalHeight,src:i.src};
   });
   assert.ok(decoded.w>100&&decoded.h>70,width+': actual owner sidebar WebP failed decoding '+JSON.stringify(decoded));
  }else{
   assert.equal(model.display,'none','Sidebar daily banner must remain hidden on mobile');
   const tabs=page.locator('.bottom-nav [data-elara-nav-kind]');
   assert.equal(await tabs.count(),7,'Original seven-option mobile menu changed');
   assert.deepEqual(await tabs.evaluateAll(xs=>xs.map(x=>x.dataset.elaraTab)),
    ['blog','books','social','home','tasks','freedom','page']);
  }
  const global=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(global.scroll<=global.viewport+2,width+': global horizontal overflow '+JSON.stringify(global));
  await page.screenshot({path:'browser-artifacts/ui16-sidebar/sidebar-'+width+'.png',fullPage:true,animations:'disabled'});
  console.log('UI16_SIDEBAR_ART_PASS '+JSON.stringify({width,model,global}));
  await context.close();
 }
 console.log('UI16_SIDEBAR_ALL_WIDTHS_PASS');
}finally{await browser.close()}
