import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='browser-artifacts';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const mobile=['exercise','language','tasks','home','ranking','social','books','freedom'];
const desktop=['home','tasks','language','books','exercise','ranking','freedom'];
const retained=['hero-landscape.webp','missions-rocket.webp','streak-flame.webp','friends-tab.webp','friends-group-icon.webp'];
const removed=['nav-home-default.webp','nav-home-active.webp','nav-tasks-default.webp','nav-tasks-active.webp','nav-language-default.webp','nav-language-active.webp','nav-library-default.webp','nav-library-active.webp','nav-ranking-default.webp','nav-ranking-active.webp','nav-exercise-default.webp','nav-exercise-active.webp','icon-habits-sprout.webp','icon-wellness-heartbeat.webp','icon-wellness-water.webp','icon-night-crescent-moon.webp','icon-exercise-dumbbell.webp','icon-ranking-trophy.webp'];
const sizes=[[320,659],[375,659],[390,659],[430,659],[1440,1000],[1648,928],[1920,1000]];
const measurements=[],errors=[];
const bound=(page,selector)=>page.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});
async function init(page){
 await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraNavigation&&window.ElaraReferenceHome&&window.ElaraOpen&&document.querySelector('.ref-home-grid'),null,{timeout:30000});
 await page.addStyleTag({content:'#cloud-layer{display:none!important}body:not(.cloud-ready) .shell,body.cloud-locked .shell,body:not(.cloud-ready) .bottom-nav{visibility:visible!important}*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
 await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.ElaraNavigation.render();window.ElaraReferenceHome.render();window.ElaraOpen('home',{history:'replace'})});
 await page.waitForTimeout(500);
}
for(const [width,height] of sizes){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const item={width,height};const misses=[];
 page.on('response',r=>{if(r.status()===404&&r.url().includes('/assets/ui/'))misses.push(r.url())});
 try{
  await init(page);
  const selector=width<=700?'.bottom-nav':'.sidebar .elara-sidebar-primary';
  const expected=width<=700?mobile:desktop;
  item.routes=await page.locator(selector+' [data-elara-tab]').evaluateAll(nodes=>nodes.map(node=>node.dataset.elaraTab));
  item.header=await bound(page,'.topbar');item.hero=await bound(page,'.ref-hero');item.streak=await bound(page,'#ref-streak-card');
  item.tasks=await bound(page,'.ref-tasks');item.habits=await bound(page,'.ref-habits');item.wellness=await bound(page,'.ref-wellness-card');item.missions=await bound(page,'.ref-missions');item.ranking=await bound(page,'.ref-ranks');item.friends=await bound(page,'.ref-activity');item.grid=await bound(page,'.ref-home-grid');
  item.overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
  item.scrollRemaining=await page.evaluate(()=>Math.max(0,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-innerHeight));
  assert.deepEqual(item.routes,expected,'canonical navigation destinations changed');
  assert.ok(item.overflow<=2,'horizontal overflow '+item.overflow+'px');
  assert.ok(item.hero.h>=100&&item.tasks.w>0&&item.habits.w>0&&item.wellness.w>0&&item.ranking.w>0&&item.friends.w>0,'Home card geometry broken');
  assert.ok(item.tasks.x<item.habits.x&&Math.abs(item.tasks.y-item.habits.y)<=3,'Tasks/Habits pairing broken');
  assert.equal(await page.locator('#ref-streak-card .ref-streak-flame').evaluate(img=>img.complete&&img.naturalWidth>0),true,'transparent streak image absent');
  assert.equal(await page.locator('.ref-missions .ref-missions-art').evaluate(img=>img.complete&&img.naturalWidth>0),true,'transparent rocket absent');
  for(const name of retained){const resp=await page.request.get(`http://127.0.0.1:4173/assets/ui/${name}`);assert.equal(resp.status(),200,'retained image 404 '+name)}
  for(const name of removed){assert.equal(await page.locator(`img[src$="/${name}"],img[src="assets/ui/${name}"]`).count(),0,'deleted image still in DOM '+name)}
  assert.equal(await page.locator(`${selector} [data-elara-tab="home"] .elara-nav-art`).count(),0,'deleted Home image wrapper should not render');
  assert.equal(await page.locator(`${selector} [data-elara-tab="home"] .elara-icon`).count(),1,'existing semantic Home SVG fallback missing');
  const tasks=page.locator(`${selector} [data-elara-tab="tasks"]`);await tasks.click();await page.waitForTimeout(200);
  assert.equal(await tasks.getAttribute('aria-current'),'page','Tasks route did not open');
  await page.locator(`${selector} [data-elara-tab="home"]`).click();await page.waitForTimeout(200);
  assert.equal(await page.locator(`${selector} [data-elara-tab="home"]`).getAttribute('aria-current'),'page','Home route did not reopen');
  if(width<=700){assert.ok(item.header.h<=54,'mobile header expanded');assert.ok(item.streak.h>0&&item.streak.y>=item.hero.y+item.hero.h-2,'mobile streak row misplaced');assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).display),'none');assert.ok(item.missions.x<item.ranking.x&&Math.abs(item.missions.y-item.ranking.y)<=3,'mobile Missions/Ranking mispaired');const friends=page.locator('.bottom-nav [data-elara-tab="social"]');await friends.click();await page.waitForTimeout(200);assert.equal(await friends.getAttribute('aria-current'),'page','Friends route broken');await page.locator('.bottom-nav [data-elara-tab="home"]').click();}
  else{assert.ok(item.hero.h>=165&&item.hero.h<=180,'desktop Hero height changed');assert.ok(item.streak.h>=46&&item.streak.h<=65,'desktop Streak strip lost');assert.equal(await page.locator('.bottom-nav').isVisible(),false);assert.ok(item.tasks.x<item.habits.x&&item.habits.x<item.wellness.x,'desktop columns broken');}
  await page.screenshot({path:`${out}/home-${width}-viewport.png`,fullPage:false});await page.screenshot({path:`${out}/home-${width}-full.png`,fullPage:true});
  assert.deepEqual(misses,[],'404 from removed asset reference');
  console.log('POST-DELETE-BROWSER '+JSON.stringify({width,height,overflow:item.overflow,scrollRemaining:item.scrollRemaining,missingAssetResponses:misses.length}));
 }catch(error){item.error=error.stack||String(error);errors.push(`${width}: ${error.message||error}`);console.error('POST-DELETE-BROWSER-FAIL '+width+' '+item.error)}
 finally{item.asset404=misses;measurements.push(item);await page.close()}
}
writeFileSync(out+'/post-delete-home-geometry.json',JSON.stringify(measurements,null,2));await browser.close();
assert.deepEqual(errors,[],'Post-deletion browser failures: '+errors.join(' | '));
console.log('PASS: native SVG navigation, transparent images, Home geometry, real routes, zero runtime asset 404 and seven viewport screenshots.');
