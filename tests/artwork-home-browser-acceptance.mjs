import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const out='browser-artifacts';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const mobile=['exercise','language','tasks','home','ranking','social','books','freedom'];
const desktop=['home','tasks','language','books','exercise','ranking','freedom'];
const usedWebps=[
 'hero-landscape.webp','missions-rocket.webp','streak-flame.webp',
 'nav-home-default.webp','nav-home-active.webp','nav-tasks-default.webp','nav-tasks-active.webp',
 'nav-language-default.webp','nav-language-active.webp','nav-library-default.webp','nav-library-active.webp',
 'nav-ranking-default.webp','nav-ranking-active.webp','nav-exercise-default.webp','nav-exercise-active.webp',
 'friends-tab.webp','friends-group-icon.webp','icon-habits-sprout.webp','icon-wellness-heartbeat.webp',
 'icon-wellness-water.webp','icon-night-crescent-moon.webp','icon-exercise-dumbbell.webp','icon-ranking-trophy.webp'
];
const sizes=[[320,659],[375,659],[390,659],[430,659],[1440,1000],[1648,928],[1920,1000]];
const measurements=[],errors=[];
const bound=(page,selector)=>page.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});
async function init(page){
 await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraNavigation&&window.ElaraReferenceHome&&window.ElaraOpen&&document.querySelector('.ref-home-grid'),null,{timeout:30000});
 await page.addStyleTag({content:'#cloud-layer{display:none!important}body:not(.cloud-ready) .shell,body.cloud-locked .shell,body:not(.cloud-ready) .bottom-nav{visibility:visible!important}*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
 await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.ElaraNavigation.render();window.ElaraReferenceHome.render();window.ElaraOpen('home',{history:'replace'})});
 await page.waitForTimeout(650);
}
async function capture(page,width){
 await page.screenshot({path:`${out}/home-${width}-viewport.png`,fullPage:false});
 await page.screenshot({path:`${out}/home-${width}-full.png`,fullPage:true});
}
async function assets(page){const results=[];for(const name of usedWebps){const response=await page.request.get(`http://127.0.0.1:4173/assets/ui/${name}`);results.push({name,status:response.status(),type:response.headers()['content-type']||''})}return results}
for(const [width,height] of sizes){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 const item={width,height};
 try{
  await init(page);
  await capture(page,width);
  const selector=width<=700?'.bottom-nav':'.sidebar .elara-sidebar-primary';
  const expected=width<=700?mobile:desktop;
  item.routes=await page.locator(selector+' [data-elara-tab]').evaluateAll(nodes=>nodes.map(node=>node.dataset.elaraTab));
  item.header=await bound(page,'.topbar');item.hero=await bound(page,'.ref-hero');item.streak=await bound(page,'#ref-streak-card');
  item.tasks=await bound(page,'.ref-tasks');item.habits=await bound(page,'.ref-habits');item.wellness=await bound(page,'.ref-wellness-card');item.missions=await bound(page,'.ref-missions');item.ranking=await bound(page,'.ref-ranks');item.friends=await bound(page,'.ref-activity');
  item.grid=await bound(page,'.ref-home-grid');item.bottomNav=await bound(page,'.bottom-nav');
  item.overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
  item.scrollRemaining=await page.evaluate(()=>Math.max(0,Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-innerHeight));
  assert.deepEqual(item.routes,expected,'wrong canonical destinations');
  assert.ok(item.overflow<=2,'horizontal overflow '+item.overflow+'px');
  assert.ok(item.hero.h>=100,'Hero missing');
  assert.ok(item.tasks.x<item.habits.x&&Math.abs(item.tasks.y-item.habits.y)<=3,'Tasks/Habits not paired');
  assert.equal(await page.locator('#ref-streak-card .ref-streak-flame').evaluate(img=>img.complete&&img.naturalWidth>0),true,'real streak artwork unavailable');
  assert.equal(await page.locator('.ref-missions .ref-missions-art').evaluate(img=>img.complete&&img.naturalWidth>0),true,'rocket artwork unavailable');
  assert.ok(item.ranking.w>0&&item.friends.w>0,'Ranking/Friends Home cards missing');
  if(width<=700){
   assert.ok(item.header.h<=54,'mobile header too tall');assert.ok(item.streak.h>0&&item.streak.y>=item.hero.y+item.hero.h-2,'mobile streak must follow Hero');
   assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).display),'none','mobile sidebar visible');
   assert.ok(item.missions.x<item.ranking.x&&Math.abs(item.missions.y-item.ranking.y)<=3,'Missions/Ranking not paired');
   assert.equal(await page.locator('.bottom-nav [data-elara-tab="social"]').count(),1,'Friends button missing');
   assert.ok(item.bottomNav.h>=48,'touch navigation too short');
  }else{
   assert.ok(item.hero.h>=165&&item.hero.h<=180,'desktop Hero wrong height');
   assert.ok(item.streak.h>=46&&item.streak.h<=65,'desktop full streak strip missing');
   assert.ok(item.streak.y>=item.hero.y+item.hero.h-2,'desktop streak not below Hero');
   assert.equal(await page.locator('#ref-desktop-streak').isVisible(),false,'legacy Hero streak pill remains');
   assert.equal(await page.locator('.bottom-nav').isVisible(),false,'desktop bottom bar visible');
   assert.ok(item.tasks.x<item.habits.x&&item.habits.x<item.wellness.x,'desktop three-column order wrong');
   assert.ok(item.grid.w>width-300,'desktop Home grid width too narrow');
  }
  const navImage=page.locator(`${selector} [data-elara-tab="home"] .elara-nav-art`).first();
  assert.equal(await navImage.count(),1,'Home nav artwork not installed');
  assert.equal(await navImage.evaluate(img=>img.complete&&img.naturalWidth>0),true,'Home nav artwork failed to load');
  assert.ok((await navImage.getAttribute('src')).endsWith('nav-home-active.webp'),'selected Home artwork wrong');
  const nav=page.locator(`${selector} [data-elara-tab="tasks"]`);await nav.click();await page.waitForTimeout(240);
  assert.equal(await nav.getAttribute('aria-current'),'page','Tasks route not selected');
  assert.ok((await nav.locator('.elara-nav-art').getAttribute('src')).endsWith('nav-tasks-active.webp'),'active Tasks artwork missing');
  await page.locator(`${selector} [data-elara-tab="home"]`).click();await page.waitForTimeout(240);
  assert.ok((await nav.locator('.elara-nav-art').getAttribute('src')).endsWith('nav-tasks-default.webp'),'old route did not return to default');
  if(width<=700){const friend=page.locator('.bottom-nav [data-elara-tab="social"]');await friend.click();await page.waitForTimeout(240);assert.equal(await friend.getAttribute('aria-current'),'page','Friends route did not open');await page.locator('.bottom-nav [data-elara-tab="home"]').click()}
  if(width===390){item.assetResponses=await assets(page);assert.ok(item.assetResponses.every(row=>row.status===200&&row.type.includes('image')),'asset 404 or wrong MIME '+JSON.stringify(item.assetResponses.filter(row=>row.status!==200||!row.type.includes('image'))))}
  console.log('ARTWORK-BROWSER '+JSON.stringify({width,height,hero:item.hero,streak:item.streak,grid:item.grid,overflow:item.overflow,scrollRemaining:item.scrollRemaining}));
 }catch(error){item.error=error.stack||String(error);errors.push(`${width}: ${error.message||error}`);console.error('ARTWORK-BROWSER-FAIL '+width+' '+item.error)}
 finally{measurements.push(item);await page.close()}
}
writeFileSync(out+'/artwork-home-geometry.json',JSON.stringify(measurements,null,2));await browser.close();
assert.deepEqual(errors,[],'Artwork Home browser acceptance failures: '+errors.join(' | '));
console.log('PASS: live Home artwork, canonical routes, actual Streak, no synthetic data, 7 real Chromium viewports, asset HTTP and screenshots.');
