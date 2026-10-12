import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.ELARA_TEST_URL || 'http://127.0.0.1:4173';
const baseline=process.env.ELARA_BASELINE==='1';
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
fs.mkdirSync('browser-artifacts',{recursive:true});
try {
 for(const width of widths) {
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   page.on('console',msg=>{if(msg.type()==='error' && /ranking-gold-20261012|gold ranking/i.test(msg.text()))errors.push(msg.text())});
   await page.goto(base+'/#ranking',{waitUntil:'domcontentloaded',timeout:60000});
   if(baseline) {
     await page.waitForTimeout(3200);
     if(width===390||width===1440)await page.screenshot({path:'browser-artifacts/ranking-before-'+width+'.png',fullPage:true});
     results.push({width,baseline:true});
     await page.close();
     continue;
   }
   await page.waitForSelector('#elara-ranking-page.ranking-gold .rg-tabs button',{state:'attached',timeout:45000});
   await page.waitForTimeout(700);
   let state=await page.evaluate(()=>{
     const panel=document.getElementById('panel-ranking');
     const hero=panel?.querySelector(':scope > .ranking-gold-hero');
     const header=document.querySelector('.workspace>.topbar');
     const profile=document.querySelector('#ref-header-account');
     const rect=hero?.getBoundingClientRect();
     const headerRect=header?.getBoundingClientRect();
     return {
       hash:location.hash,heroExists:!!hero,
       artwork:hero?getComputedStyle(hero).backgroundImage:'',
       bannerVar:hero?.style.getPropertyValue('--elara-page-art'),
       heroTop:rect?.top,headerBottom:headerRect?.bottom,
       profileVisible:profile?getComputedStyle(profile).display!=='none' && getComputedStyle(profile).visibility!=='hidden':false,
       profileExists:!!profile,
       overflow:document.documentElement.scrollWidth-innerWidth,
       active:document.querySelector('#elara-ranking-page .rg-tabs [aria-selected="true"]')?.dataset.rgFilter,
       cards:[...document.querySelectorAll('#elara-ranking-page .rg-grid>.rg-card')].map(n=>n.className)
     };
   });
   assert.equal(state.hash,'#ranking','Route unchanged '+width);
   assert.ok(state.heroExists,'Hero exists '+width);
   assert.ok(state.artwork.includes('ranking_banner_main.webp'),'Main banner is active '+width);
   assert.ok(state.bannerVar.includes('ranking_banner_main.webp'),'Hero asset binding '+width);
   assert.ok(state.heroTop >= -2 && state.heroTop <= 114,'Hero at top '+width+': '+state.heroTop);
   if(width>700)assert.ok(Math.abs(state.heroTop)<4,'Desktop hero flush with workspace '+width+': '+state.heroTop);
   else assert.ok(Math.abs(state.heroTop-state.headerBottom)<9,'Mobile hero immediately below header '+width+': '+JSON.stringify(state));
   assert.ok(!state.profileVisible,'No account in Ranking '+width);
   assert.ok(state.overflow<=2,'No horizontal overflow '+width+': '+state.overflow);
   assert.equal(state.active,'all','Gold tab active '+width);
   for(const name of ['rg-podium-card','rg-my-card','rg-rewards-card','rg-leaderboard-card','rg-clubs-card','rg-friends-card','rg-countdown-card','rg-weekly-card'])assert.ok(state.cards.some(x=>x.includes(name)),'Required panel '+name+' '+width);
   const asset=await page.evaluate(async()=>{const res=await fetch('assets/ui/ranking_banner_main.webp',{cache:'no-store'});return {status:res.status,type:res.headers.get('content-type')}});
   assert.equal(asset.status,200,'WebP available '+width);
   if(width===320 || width===390 || width===1440){
     const debug=await page.locator('[data-rg-filter="friends"]').evaluate(el=>{
       const parents=[];let p=el;while(p&&parents.length<8){const s=getComputedStyle(p);parents.push({tag:p.tagName,id:p.id,cls:String(p.className).slice(0,100),display:s.display,visibility:s.visibility,rect:p.getBoundingClientRect().toJSON()});p=p.parentElement}return parents
     });
     console.log('RANKING_VISIBILITY_DEBUG '+width+' '+JSON.stringify(debug));
     await page.screenshot({path:'browser-artifacts/ranking-debug-'+width+'.png',fullPage:true});
   }
   await page.locator('[data-rg-filter="friends"]').click();
   assert.equal(await page.locator('.rg-tabs [aria-selected=true]').getAttribute('data-rg-filter'),'friends');
   assert.ok(await page.locator('.rg-friends-card').count(),'Friends tab real data container');
   await page.locator('[data-rg-filter="season"]').click();
   assert.ok(await page.locator('.rg-season-card').count(),'Season honest empty state');
   await page.locator('[data-rg-filter="all"]').click();
   if(width===390||width===1440)await page.screenshot({path:'browser-artifacts/ranking-after-'+width+'.png',fullPage:true});
   await page.evaluate(()=>window.ElaraOpen?.('home'));
   await page.waitForTimeout(350);
   if(state.profileExists && width>=701) {
     const otherProfile=await page.locator('#ref-header-account').evaluate(el=>getComputedStyle(el).display!=='none');
     assert.ok(otherProfile,'Account available on Home '+width);
   }
   await page.goBack({waitUntil:'domcontentloaded',timeout:20000}).catch(()=>{});
   await page.goto(base+'/#ranking',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForSelector('#elara-ranking-page.ranking-gold .rg-card',{timeout:30000});
   await page.reload({waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForSelector('#elara-ranking-page.ranking-gold .rg-card',{timeout:30000});
   assert.equal(await page.locator('.rg-hero-copy').count(),1,'Only one ranking hero copy');
   assert.equal(errors.filter(x=>/ranking-gold-20261012/i.test(x)).length,0,'No Ranking Gold script exceptions '+width);
   results.push({width,ok:true,heroTop:state.heroTop,headerBottom:state.headerBottom,overflow:state.overflow,source:asset.status,cards:state.cards.length,newErrors:errors.filter(x=>/ranking-gold-20261012/i.test(x))});
   console.log('RANKING_GOLD_WIDTH_PASS '+width+' '+JSON.stringify(results[results.length-1]));
   await page.close();
 }
 fs.writeFileSync('browser-artifacts/ranking-gold-results.json',JSON.stringify(results,null,2));
 console.log(baseline?'RANKING_BASELINE_CAPTURED':'RANKING_GOLD_10_WIDTHS_PASS');
} finally {await browser.close()}
