import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const widths=[320,390,430,1440];
try {
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  const faults=[];
  const requests=[];
  page.on('pageerror',err=>faults.push(err.message));
  page.on('request',req=>{if(/home-owner-art-2026\.(js|css)/.test(req.url()))requests.push(req.url())});
  await page.addInitScript(()=>{
   window.__elaraMobileFirstFrame=null;
   const measure=()=>{
    const p=document.querySelector('#panel-home.ref-home');
    const g=p?.querySelector('.elara-dashboard-grid');
    const s=p?.querySelector('#ref-streak-card');
    const c=s?.getBoundingClientRect();
    const gRect=g?.getBoundingClientRect();
    const owner=document.querySelector('link[href*="home-owner-art-2026.css"]');
    return {
     width:innerWidth,
     booting:document.documentElement.hasAttribute('data-elara-booting'),
     owner:!!p?.classList.contains('owner-art-home'),
     ownerHero:!!p?.querySelector('.owner-home-hero-image'),
     twoColumn:getComputedStyle(g).gridTemplateColumns.split(' ').length===2,
     streakWidth:Math.round(c?.width||0),
     streakHeight:Math.round(c?.height||0),
     gridWidth:Math.round(gRect?.width||0),
     stylesheet:!!owner?.sheet,
     ready:g?.dataset.structureReady
    };
   };
   const tick=()=>{
    const p=document.querySelector('#panel-home.ref-home'),grid=p?.querySelector('.elara-dashboard-grid');
    if(!document.documentElement.hasAttribute('data-elara-booting')&&grid){
     window.__elaraMobileFirstFrame=measure();
     return;
    }
    requestAnimationFrame(tick);
   };
   window.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(tick),{once:true});
  });
  // A slow mobile connection must not paint the old one-column layout.
  await page.route('**/home-owner-art-2026.css*',async route=>{
   await new Promise(resolve=>setTimeout(resolve,1900));
   await route.continue();
  });
  await page.route('**/home-owner-art-2026.js*',async route=>{
   await new Promise(resolve=>setTimeout(resolve,650));
   await route.continue();
  });
  await page.goto(base+'/?mobile-first-paint='+width+'#home',{waitUntil:'commit',timeout:12000});
  await page.waitForTimeout(750);
  const interim=await page.evaluate(()=>({
    booting:document.documentElement.hasAttribute('data-elara-booting'),
    ownerSheet:!!document.querySelector('link[href*="home-owner-art-2026.css"]')?.sheet
  }));
  assert.equal(interim.booting,true,'Old layout exposed while final owner CSS is delayed, width='+width);
  await page.waitForFunction(()=>!!window.__elaraMobileFirstFrame,null,{timeout:30000});
  const first=await page.evaluate(()=>window.__elaraMobileFirstFrame);
  assert.equal(first.booting,false);
  assert.equal(first.owner,true,'Owner class was not applied before first paint');
  assert.equal(first.ownerHero,true,'Final hero not available at first paint');
  assert.equal(first.stylesheet,true,'Owner CSS was not ready at reveal');
  assert.equal(first.ready,'true');
  if(width>=360&&width<=700){
   assert.equal(first.twoColumn,true,'Mobile should be two-column on its first visible frame');
   assert.ok(first.streakWidth<first.gridWidth*0.6,'Oversized full-width Streak flashed');
   assert.ok(first.streakHeight>=145&&first.streakHeight<=185,'Streak height incorrect on initial paint: '+first.streakHeight);
  }
  await page.waitForTimeout(1100);
  const final=await page.evaluate(()=>{
   const p=document.querySelector('#panel-home.ref-home');
   const s=p.querySelector('#ref-streak-card').getBoundingClientRect();
   return {streakWidth:Math.round(s.width),streakHeight:Math.round(s.height),
    owner:p.classList.contains('owner-art-home'),booting:document.documentElement.hasAttribute('data-elara-booting')};
  });
  assert.equal(final.owner,true);
  assert.equal(final.booting,false);
  if(width>=360&&width<=700){
   assert.ok(Math.abs(first.streakWidth-final.streakWidth)<=3,'Streak width shifted after reveal');
   assert.ok(Math.abs(first.streakHeight-final.streakHeight)<=3,'Streak height shifted after reveal');
  }
  assert.equal(faults.length,0,'Runtime exceptions: '+faults.join(' | '));
  const ownerCssRequests=requests.filter(u=>/home-owner-art-2026\.css/.test(u)).length;
  const ownerJsRequests=requests.filter(u=>/home-owner-art-2026\.js/.test(u)).length;
  assert.equal(ownerCssRequests,1,'Duplicate owner CSS requests');
  assert.equal(ownerJsRequests,1,'Duplicate owner JS requests');
  console.log('MOBILE_HOME_FIRST_PAINT_PASS '+JSON.stringify({width,interim,first,final,ownerCssRequests,ownerJsRequests}));
  await context.close();
 }
}finally {await browser.close()}
console.log('MOBILE_HOME_FIRST_PAINT_ALL_PASS');
