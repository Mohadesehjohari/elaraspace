import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const sha=process.env.GITHUB_SHA||'local',out=`browser-artifacts/${sha}`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[],failures=[];
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
function seed(){
 if(localStorage.getItem('restore-fixture'))return;
 const d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:0,tasks:[{id:'qa-a',text:'مطالعهٔ فصل جدید کتاب',date,priority:'1',completed:false},{id:'qa-b',text:'طراحی رابط کاربری',date,priority:'2',completed:false},{id:'qa-c',text:'پیاده‌روی روزانه',date,priority:'3',completed:true,xpAwarded:true,doneAt:date}],habits:[{id:'qa-h',title:'مطالعهٔ کتاب',days:[]},{id:'qa-water',title:'نوشیدن آب',days:[]}],goals:[{id:'qa-g',title:'یادگیری و رشد',steps:[{id:'qa-s',text:'یک قدم کوچک',done:false}]}],books:[{id:'qa-book',title:'کتاب آزمایشی مطالعه',shelf:'reading',totalPages:200,currentPage:0,readingLogs:[]}],words:[]}));localStorage.setItem('restore-fixture','true');
}
async function open(page){await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ElaraReferenceHome&&window.ElaraSocialView&&window.ElaraReading&&!document.documentElement.hasAttribute('data-elara-booting'));await page.evaluate(()=>{document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');ElaraOpen('home')});await page.waitForTimeout(700)}
async function route(page,name){await page.evaluate(name=>ElaraOpen(name),name);await page.waitForTimeout(180);await page.evaluate(()=>Promise.race([Promise.allSettled([...document.images].filter(i=>i.complete&&i.naturalWidth).map(i=>i.decode?.())),new Promise(r=>setTimeout(r,1200))]));}
async function check(name,fn){try{await fn();results.push({name,status:'PASS'})}catch(e){failures.push({name,error:e.stack});results.push({name,status:'FAIL',error:e.message})}}
for(const width of [1440,1648,1920,320,375,390,430]){
 const context=await browser.newContext({viewport:{width,height:width<701?844:1000},deviceScaleFactor:1});await context.addInitScript(seed);const page=await context.newPage(),missing=[],errors=[];page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);console.log('[RESTORE] width '+width+' start');
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:'// Test-only offline boundary. Production Firebase is not exercised.'}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:'// Empty social data in offline browser acceptance; no fabricated users.'}));
 page.on('response',r=>{if(r.status()===404)missing.push(r.url())});page.on('pageerror',e=>errors.push(e.message));
 try{
 await open(page);
 await check(`${width}: stable toggle / decoded artwork / no hydrate`,async()=>{
  await page.evaluate(()=>{
   window.__stable=[...document.querySelectorAll('.sidebar,.sidebar img,.topbar,.topbar img,.ref-hero,.ref-streak-flame,.ref-missions-art,.ref-habit-semantic-art,.ref-home-grid')];window.__removed=[];window.__hydrates=0;addEventListener('elara:hydrate',()=>__hydrates++);window.__observer=new MutationObserver(rs=>{for(const r of rs)for(const n of r.removedNodes)if(__stable.some(x=>n===x||n.contains?.(x)))__removed.push(n.nodeName)});__observer.observe(document.body,{childList:true,subtree:true});window.__blankFrames=0;window.__checking=true;const sample=()=>{if(!__checking)return;for(const n of __stable){if(!n.isConnected||getComputedStyle(n).visibility==='hidden'||getComputedStyle(n).display==='none')continue;if(n.tagName==='IMG'&&(!n.complete||!n.naturalWidth))__blankFrames++}requestAnimationFrame(sample)};requestAnimationFrame(sample);
  });
  const b=page.locator('[data-ref-task="qa-a"]');await b.click();await page.waitForTimeout(200);assert.equal(await b.getAttribute('aria-pressed'),'true');assert.match(await b.locator('img').getAttribute('src'),/icon-tasks-check-alpha/);
  await b.click();await page.waitForTimeout(150);assert.equal(await b.locator('img').count(),0);await b.click();await page.waitForTimeout(150);
  await page.locator('[data-ref-habit="qa-h"]').click();await page.waitForTimeout(180);
  const status=await page.evaluate(()=>{__checking=false;__observer.disconnect();return{removed:__removed,connected:__stable.every(n=>n.isConnected),hydrates:__hydrates,blankFrames:__blankFrames}});assert.deepEqual(status.removed,[]);assert.equal(status.connected,true);assert.equal(status.hydrates,0);assert.equal(status.blankFrames,0);
 });
 if(width>=701)await check(`${width}: search elementFromPoint`,async()=>{await page.locator('#ref-search-input').fill('مطالعه');const top=await page.locator('#ref-search-results').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+Math.min(24,r.height/2)))});assert.equal(top,true);await page.locator('#ref-search-input').fill('')});
 await check(`${width}: linked tasks dedup, deletion, completion and XP`,async()=>{
  const result=await page.evaluate(async()=>{const read=()=>JSON.parse(localStorage.getItem('elara_space_v1')),L=ElaraLinkedTasks;L.syncAll();L.syncAll();let s=read(),t=s.tasks.find(t=>t.sourceType==='goal-step');const xp=s.xp;await ElaraTasks.taskAction('toggle-task',t.id);s=read();const synced=s.goals[0].steps[0].done,delta=s.xp-xp;L.syncAll();L.syncAll();s=read();const keys=s.tasks.filter(t=>t.linkedTask).map(t=>[t.sourceType,t.sourceId,t.sourceParentId].join(':'));return{synced,delta,unique:new Set(keys).size===keys.length}});assert.equal(result.synced,true);assert.equal(result.delta,0);assert.equal(result.unique,true);
 });
 await route(page,'books');
 await check(`${width}: reading log persistence and reports`,async()=>{
  await page.locator('[data-reading-book="qa-book"]').click();await page.locator('.library-log-form [name=pages]').fill('30');await page.locator('.library-log-form [type=submit]').click();await page.waitForTimeout(150);
  await page.locator('[data-reading-book="qa-book"]').click();await page.locator('.library-log-form [name=mode]').selectOption('page');await page.locator('.library-log-form [name=pages]').fill('80');await page.locator('.library-log-form [type=submit]').click();await page.waitForTimeout(150);
  await open(page);await route(page,'books');const b=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).books.find(b=>b.id==='qa-book'));assert.equal(b.currentPage,80);assert.equal(b.readingLogs.length,2);assert.equal(b.readingLogs[1].pagesRead,50);assert.equal(await page.locator('[data-key="qa-book"] [role=progressbar]').getAttribute('aria-valuenow'),'40');await route(page,'reports');const report=await page.evaluate(()=>({sum:ElaraReports.data().reading.reduce((n,r)=>n+r.value,0),stats:ElaraReading.summary(JSON.parse(localStorage.getItem('elara_space_v1')).books)}));assert.equal(report.sum,80);assert.equal(report.stats.today,80);
 });
 for(const name of ['home','tasks','social','ranking','books','reports']){
  await route(page,name);await check(`${width}: ${name} no horizontal overflow`,async()=>{const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(metrics.scroll<=metrics.width+1,JSON.stringify(metrics))});
  if(name==='home')await check(`${width}: Home geometry`,async()=>{const rects=await page.evaluate(()=>Object.fromEntries(['tasks','habits','wellness-card','missions','goals','ranks','activity'].map(n=>{const r=document.querySelector('.ref-'+n).getBoundingClientRect();return[n,{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom}]})));if(width>=701){assert.ok(Math.abs(rects.tasks.y-rects.habits.y)<2);assert.ok(Math.abs(rects.tasks.y-rects['wellness-card'].y)<2);assert.ok(Math.abs(rects.missions.y-rects.ranks.y)<2);assert.ok(rects.ranks.w<width/2)}else{const firstBottom=Math.max(rects.tasks.b,rects.habits.b),missionBottom=Math.max(rects.missions.b,rects.goals.b);assert.ok(rects['wellness-card'].y>=firstBottom-2,'Wellness must follow Tasks/Habits');assert.ok(rects.missions.y>=rects['wellness-card'].b-2&&rects.goals.y>=rects['wellness-card'].b-2,'Missions/Goals must follow Wellness');assert.ok(rects.ranks.y>=missionBottom-2,'Ranking must follow Missions/Goals');assert.ok(rects.activity.y>=rects.ranks.b-2,'Friends Activity must follow Ranking')}});
  if(width===1440||width===390)await page.screenshot({path:`${out}/${name}-${width}-fixture.png`,fullPage:false});
 }
 await check(`${width}: no asset 404 / page errors`,async()=>{assert.deepEqual(missing,[]);assert.deepEqual(errors,[])});
 }catch(e){failures.push({name:`${width}: startup`,error:e.stack});await page.screenshot({path:`${out}/error-${width}.png`,fullPage:true}).catch(()=>{})}
 console.log('[RESTORE] width '+width+' done');await context.close();
}
// Genuine empty-state capture, in a clean browser storage context.
const p=await browser.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(8000);p.setDefaultNavigationTimeout(15000);await p.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));await p.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));await open(p);await route(p,'social');await p.screenshot({path:`${out}/social-1440-empty.png`,fullPage:false});await p.close();
await browser.close();writeFileSync(`${out}/acceptance.json`,JSON.stringify({sha,fixtureNotice:'Isolated local test records only. No production Firebase account or synthetic social users.',results,failures},null,2));console.log(JSON.stringify({sha,results,failures},null,2));if(failures.length)process.exitCode=1;
