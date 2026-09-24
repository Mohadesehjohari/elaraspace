import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='browser-artifacts';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const mobile=['exercise','language','tasks','home','ranking','social','books','freedom'];
const desktop=['home','tasks','language','books','exercise','ranking','freedom'];
const used=['hero-landscape.webp','missions-rocket.webp','streak-flame.webp','friends-tab.webp','friends-group-icon.webp','nav-home-default.webp','nav-home-active.webp','nav-language-default.webp','nav-language-active.webp','nav-library-default.webp','nav-library-active.webp','nav-ranking-default.webp','nav-ranking-active.webp','nav-exercise-default.webp','nav-exercise-active.webp'];
const sizes=[[320,659],[375,659],[390,659],[430,659],[1440,1000],[1648,928],[1920,1000]];
const results=[],failures=[];
function fixture(){if(localStorage.getItem('elara-test-seeded'))return;const d=new Date(),today=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:0,tasks:[{id:'qa-task',text:'QA task',date:today,priority:'2',completed:false,xpAwarded:false,createdAt:Date.now()}],goals:[{id:'qa-goal',title:'QA goal',horizon:'short',steps:[{id:'qa-step',text:'QA step',done:false}]}],habits:[]}));localStorage.setItem('elara_visual_wardrobe_guest',JSON.stringify({frame:'bronze'}));localStorage.setItem('elara-test-seeded','1');}
async function init(page,{seed=false}={}){
 if(seed)await page.addInitScript(fixture);
 await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraNavigation&&window.ElaraReferenceHome&&window.ElaraOpen&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
 await page.addStyleTag({content:'#cloud-layer{display:none!important}body:not(.cloud-ready) .shell,body.cloud-locked .shell,body:not(.cloud-ready) .bottom-nav{visibility:visible!important}*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
 await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.ElaraNavigation.render();window.ElaraReferenceHome.render();window.ElaraOpen('home',{history:'replace'})});
 await page.waitForTimeout(450);
 if(seed){await page.evaluate(()=>localStorage.removeItem('elara-test-seeded'));await page.evaluate(fixture);await page.evaluate(()=>window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:JSON.parse(localStorage.getItem('elara_space_v1'))})));await page.evaluate(()=>window.ElaraReferenceHome.render());await page.waitForTimeout(200);}
}
const rect=(page,sel)=>page.locator(sel).first().evaluate(el=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});
for(const [width,height] of sizes){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const item={width,height,ui404:[],errors:[]};
 page.on('response',r=>{if(r.status()===404&&r.url().includes('/assets/ui/'))item.ui404.push(r.url())});page.on('pageerror',e=>item.errors.push(String(e)));
 try{
  await init(page,{seed:width===390});
  const sel=width<=700?'.bottom-nav':'.sidebar .elara-sidebar-primary';
  item.routes=await page.locator(sel+' [data-elara-tab]').evaluateAll(nodes=>nodes.map(n=>n.dataset.elaraTab));assert.deepEqual(item.routes,width<=700?mobile:desktop);
  item.header=await rect(page,'.topbar');item.hero=await rect(page,'.ref-hero');item.streak=await rect(page,'#ref-streak-card');item.grid=await rect(page,'.ref-home-grid');
  item.overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));item.scroll=await page.evaluate(()=>Math.max(0,Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)-innerHeight));
  assert.ok(item.overflow<=2,'horizontal overflow '+item.overflow);
  assert.ok(item.hero.h>=100&&item.streak.h>0&&item.grid.w>0,'Home geometry missing');
  assert.equal(await page.locator(`${sel} [data-elara-tab="home"] .elara-nav-art`).count(),1,'actual Home image missing');
  assert.equal(await page.locator(`${sel} [data-elara-tab="tasks"] .elara-nav-art`).count(),0,'unuploaded Tasks image referenced');
  assert.equal(await page.locator(`${sel} [data-elara-tab="home"] .elara-nav-art`).first().evaluate(e=>e.complete&&e.naturalWidth>0),true,'Home image load failed');
  const tasks=page.locator(`${sel} [data-elara-tab="tasks"]`);await tasks.click();await page.waitForTimeout(180);assert.equal(await tasks.getAttribute('aria-current'),'page');
  await page.locator(`${sel} [data-elara-tab="home"]`).click();await page.waitForTimeout(170);
  if(width<=700){assert.ok(item.header.h<=54,'mobile Header too tall');assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).display),'none');const friends=page.locator('.bottom-nav [data-elara-tab="social"]');await friends.click();assert.equal(await friends.getAttribute('aria-current'),'page');await page.locator('.bottom-nav [data-elara-tab="home"]').click()}
  else{assert.equal(await page.locator('.bottom-nav').isVisible(),false);assert.ok(item.streak.h>=46&&item.streak.h<=65,'desktop Streak invalid')}
  if(width===390){
    assert.equal(await page.locator('.ref-task-check[data-ref-task="qa-task"]').count(),1,'test-only task fixture absent');
    await page.locator('.ref-task-check[data-ref-task="qa-task"]').click();await page.waitForTimeout(180);
    let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.equal(state.tasks[0].completed,true);assert.equal(state.xp,10);
    assert.equal(await page.locator('.ref-task-check[data-ref-task="qa-task"]').getAttribute('aria-pressed'),'true');
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ElaraReferenceHome&&!document.documentElement.hasAttribute('data-elara-booting'));await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.ElaraOpen('home')});await page.waitForTimeout(250);
    assert.equal(await page.locator('.ref-task-check[data-ref-task="qa-task"]').getAttribute('aria-pressed'),'true','completed task failed to persist');
    await page.locator('.ref-task-check[data-ref-task="qa-task"]').click();state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.equal(state.tasks[0].completed,false);assert.equal(state.xp,10,'duplicate XP award');
    const step=page.locator('[data-home-goal-step="qa-step"]');assert.equal(await step.count(),1,'real goal step control absent');await step.click();state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.equal(state.goals[0].steps[0].done,true);
    await page.locator('[data-home-quick="task"]').click();await page.locator('#elara-home-quick-title').fill('Created from Home');await page.locator('.elara-home-quick-form [type=submit]').click();state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.equal(state.tasks.some(t=>t.text==='Created from Home'),true);
    await page.locator('[data-home-quick="goal"]').click();await page.locator('#elara-home-quick-title').fill('New Home goal');await page.locator('.elara-home-quick-form [type=submit]').click();state=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.equal(state.goals.some(g=>g.title==='New Home goal'),true);
    for(const route of ['tasks','goals','books'])for(let n=0;n<3;n++){await page.evaluate(r=>window.ElaraOpen(r),route);await page.waitForTimeout(120);const back=page.locator(`#panel-${route} [data-elara-home-return]`);assert.equal(await back.isVisible(),true,`${route} Back missing on entry ${n}`);await back.click();await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>location.hash),'#home')}
    for(const file of used){const res=await page.request.get(`http://127.0.0.1:4173/assets/ui/${file}`);assert.equal(res.status(),200,'installed image unavailable '+file)}
  }
  await page.screenshot({path:`${out}/home-${width}-viewport.png`,fullPage:false});await page.screenshot({path:`${out}/home-${width}-full.png`,fullPage:true});
  assert.deepEqual(item.ui404,[],'UI image 404');
  console.log('HOME-PASS '+JSON.stringify({width,height,overflow:item.overflow,scrollRemaining:item.scroll,ui404:item.ui404.length}));
 }catch(e){item.failure=e.stack||String(e);failures.push(width+': '+e.message);console.error('HOME-FAIL '+width+' '+item.failure)}finally{results.push(item);await page.close()}
}
writeFileSync(out+'/home-functional-artwork-geometry.json',JSON.stringify(results,null,2));await browser.close();assert.deepEqual(failures,[]);console.log('PASS: real Chromium seven viewports, canonical route UI, fixture-only Home Task/Goal/Quick Add and no artwork 404.');
