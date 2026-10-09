import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const widths=[320,375,390,430,768,1440],routes=['home','tasks','language','books','exercise','ranking','social','freedom','reports','page','blog','store','goals','habits','focus'];
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const stubs={
 cloud:"window.ElaraAccount={user:null,profile:{name:'Visual QA',username:'qa',xp:0}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));",
 social:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));"
};
try{
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:940}});
  const errors=[],problems=[];const check=(ok,msg)=>{if(!ok)problems.push(msg)};page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:stubs.cloud}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:stubs.social}));
  await page.goto(base+'/?stageA='+width+'#home',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.ElaraGlobalBanners&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:35000});
  for(const route of routes){
   await page.evaluate(route=>{window.ElaraOpen?.(route);window.ElaraGlobalBanners?.refresh?.()},route);
   await page.waitForFunction(route=>{const panel=document.getElementById('panel-'+route);return !!panel&&!panel.classList.contains('hidden')&&!!panel.querySelector('[data-elara-page-hero="'+route+'"]')},route,{timeout:12000});
   const m=await page.evaluate(route=>{
     const p=document.getElementById('panel-'+route),hero=p.querySelector('[data-elara-page-hero="'+route+'"]'),rect=hero.getBoundingClientRect(),css=getComputedStyle(hero);
     const all=[...document.images].filter(x=>x.closest('#panel-'+route)&&x.complete&&x.naturalWidth===0).slice(0,5).map(x=>x.src);
     return {route,width:innerWidth,scroll:document.documentElement.scrollWidth,top:rect.top,w:rect.width,h:rect.height,border:css.borderTopWidth,bg:css.backgroundImage,imgBroken:all,headHeight:document.querySelector('.topbar')?.getBoundingClientRect().height}
   },route);
   if(width===320)console.log('BANNER_METRIC '+JSON.stringify(m));
   // Home/Tasks desktop panoramas now sit in the 18px-inset owner content
   // container below their separate header. Other desktop page heroes retain
   // the edge-to-edge treatment. Mobile headers precede every route hero.
   const insetDesktop=width>700&&(route==='home'||route==='tasks');
   check(width<=700||insetDesktop
    ? m.top>=m.headHeight-3&&m.top<=m.headHeight+8
    : m.top>=-3&&m.top<85,'banner-to-header gap '+JSON.stringify(m));
   check(m.h>=100&&m.h<280,'hero geometry '+JSON.stringify(m));
   check(m.border==='0px','outer border '+JSON.stringify(m));
   check(m.w>=Math.max(190,width-(width>700?(insetDesktop?270:255):25)),'banner does not span workspace '+JSON.stringify(m));
   check(m.scroll<=width+2,'horizontal overflow '+JSON.stringify(m));
   if(!['store','home','freedom'].includes(route))check(m.bg.includes('/assets/ui/'),'route-specific art missing '+JSON.stringify(m));
   if(route==='home')check(await page.locator('#panel-home .owner-home-hero-image').evaluate(img=>img.naturalWidth>0),'Home owner image not decoded');
   if(route==='home'&&width<=430){
    const g=await page.evaluate(()=>({titleTop:document.querySelector('#panel-home .owner-home-hero .hero-copy h1')?.getBoundingClientRect().top,headerBottom:document.querySelector('.topbar')?.getBoundingClientRect().bottom}));
    check((g.titleTop??-1)>=(g.headerBottom??0)+6,'mobile Home headline collides with global topbar '+JSON.stringify(g));
   }
   if(route==='freedom')check(m.bg.includes('/assets/ui/')||await page.locator('#panel-freedom .freedom-hero-art').evaluate(img=>img.naturalWidth>0),'Freedom owner image not decoded');
   check(m.imgBroken.length===0,'broken visible route images '+JSON.stringify(m));
   if(width===1440&&(route==='home'||route==='tasks'))await page.screenshot({path:'browser-artifacts/stageA-'+route+'-'+width+'.png',fullPage:true});
  }
  assert.equal(problems.length,0,'GLOBAL_BANNER_FAILURES '+width+'\n'+problems.join('\n'));
  assert.equal(await page.locator('#ref-header-settings').count(),0,'settings gear restored');
  assert.ok(!errors.length,'page error '+width+': '+errors.join(';'));
  await page.close();
  console.log('GLOBAL_BANNER_MOBILE_PASS '+width+' '+routes.join(','));
 }
}finally{await browser.close()}
