import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const live='https://mohadesehjohari.github.io/elaraspace';
const preview=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const widths=[320,360,375,390,412,430,768,1440,1648];
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const today=()=>new Date().toLocaleDateString('en-CA');
async function run(base,route,width,count=21,kind='after'){
 const page=await browser.newPage({viewport:{width,height:width>=701?945:880},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraAccount={user:null,profile:{name:'پروفایل واقعی آزمایش',username:'fixture',xp:420,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true};window.dispatchEvent(new Event('elara:social-updated'));"}));
 await page.addInitScript(({count,day})=>{
  const sources=['language','exercise','habit','goal','book','focus','personal'];
  const tasks=Array.from({length:count},(_,i)=>({id:'ui09_'+i,text:'تسک واقعی آزمایشی '+(i+1)+' · مطالعه و تمرین امروز',sourceGroup:sources[i%sources.length],priority:String(1+i%4),completed:false,date:day,createdAt:Date.now()+i,shared:false}));
  const state={version:1,theme:'dark',xp:420,taskLists:['کارهای شخصی'],tasks,folders:[],tags:[],books:[],words:[],habits:count>5?[{id:'h1',title:'عادت آب خوردن',days:[]}]:[],goals:count>5?[{id:'g1',title:'هدف مطالعهٔ فارسی',steps:[{id:'s1',text:'مطالعه',done:false}]}]:[],wellness:{waterGlasses:3,sleepMinutes:440,exerciseMinutes:30}};
  localStorage.setItem('elara_space_v1',JSON.stringify(state));localStorage.setItem('elara_locale_v1','fa');
 },{count,day:today()});
 await page.goto(base+'/?ui09='+kind+'-'+route+'-'+width+'-'+count+'#'+route,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&!!window.ElaraReferenceHome,null,{timeout:35000});
 await page.evaluate(route=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');if(route==='home')window.ElaraReferenceHome?.render();window.ElaraOpen?.(route)},route);
 await page.waitForTimeout(500);
 const m=await page.evaluate(route=>{
  const rect=x=>{if(!x)return null;let r=x.getBoundingClientRect();return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),bottom:+r.bottom.toFixed(2),right:+r.right.toFixed(2)}};
  const q=s=>document.querySelector(s),sel=s=>[...document.querySelectorAll(s)];
  const top=q('.workspace>.topbar.ref-topbar'),hero=q(route==='home'?'#panel-home .owner-home-hero':'#panel-tasks .astra-task-hero');
  const headline=hero?.querySelector('.hero-copy h1,.elara-generated-hero h1');
  const generic={width:innerWidth,scale:visualViewport?.scale,zoom:getComputedStyle(document.body).zoom,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,topbarBg:top?getComputedStyle(top).backgroundImage:'',hero:rect(hero),heroBg:hero?getComputedStyle(hero).backgroundImage:'',headline:headline?{rect:rect(headline),fontSize:getComputedStyle(headline).fontSize,lineHeight:getComputedStyle(headline).lineHeight}:null,header:rect(top),mobileBrand:rect(q('.topbar .ref-mobile-brand')),mobileSearch:rect(q('.topbar #ref-header-search'))};
  if(route==='home'){
   const cards=['#ref-streak-card','.owner-home-tasks','#ref-wellness-card','.owner-home-goals'].map(s=>({s,r:rect(q('#panel-home '+s))}));
   const host=q('#elara-home-tasks'),list=host?.querySelector('.ref-task-list');
   const scrollables=sel('#panel-home .owner-home-tasks *').filter(x=>{const st=getComputedStyle(x);return /(auto|scroll)/.test(st.overflowY)}).map(x=>({id:x.id,cls:x.className,scrollH:x.scrollHeight,clientH:x.clientHeight}));
   return {...generic,cards,grid:rect(q('#panel-home .ref-home-grid')),gridStyle:{marginBottom:getComputedStyle(q('#panel-home .ref-home-grid')).marginBottom,rowGap:getComputedStyle(q('#panel-home .ref-home-grid')).rowGap,gridTemplateRows:getComputedStyle(q('#panel-home .ref-home-grid')).gridTemplateRows},quickStyle:{marginTop:getComputedStyle(q('#ref-quick-access')).marginTop,marginBottom:getComputedStyle(q('#ref-quick-access')).marginBottom},quick:rect(q('#ref-quick-access')),bottom:rect(q('#ref-bottom-grid')),quickCount:sel('#ref-quick-access .ref-quick-card').length,goals:sel('#elara-home-goals .ref-goal-row').map(x=>x.textContent.trim()),wellnessParts:{main:rect(q('#ref-wellness-card .ref-health-main')),ring:rect(q('#ref-wellness-card .ref-health-ring')),copy:rect(q('#ref-wellness-card .ref-health-copy')),metrics:sel('#ref-wellness-card .ref-wellness-cell').map(rect)},taskCount:sel('#elara-home-tasks .ref-task-row').length,scrollables,hostScroll:host?{c:host.clientHeight,s:host.scrollHeight,overflow:getComputedStyle(host).overflowY}:null,listScroll:list?{c:list.clientHeight,s:list.scrollHeight,overflow:getComputedStyle(list).overflowY,tabindex:list.tabIndex}:null,headings:sel('#panel-home .ref-home-grid .ref-card header h2').map(rect),chevron:!!q('#ref-equipped-character-toggle')};
  }
  return {...generic,toolbar:rect(q('#astra-task-toolbar')),rows:sel('#task-list>.astra-task-row').map(x=>({source:x.className,rect:rect(x),bg:getComputedStyle(x).backgroundImage,accent:getComputedStyle(x).getPropertyValue('--task-accent').trim(),label:x.querySelector('.item-title')?.textContent||'',strike:x.querySelector('.item-title')?getComputedStyle(x.querySelector('.item-title')).textDecorationLine:''})),archived:sel('.task-archive-row').length};
 },route);
 if(kind==='after'||kind==='before')await page.screenshot({path:'browser-artifacts/ui09-'+kind+'-'+route+'-'+width+'-'+count+'.png',fullPage:width>=701});
 console.log('UI09_DIAGNOSTIC '+JSON.stringify({kind,route,width,expected:count,observed:m.taskCount,host:m.hostScroll,list:m.listScroll,cards:m.cards,quick:m.quick,bottom:m.bottom,rows:m.rows?.length}));
 if(route==='home'&&kind==='after'){
  assert.equal(m.quickCount,6,'exact six shortcuts required');
  assert.ok(m.goals.every(t=>!t.includes('عادت آب خوردن')),'habit rendered as goal');
  assert.ok(m.chevron,'account character chevron not mounted');
  assert.ok(m.taskCount>=count&&m.taskCount<=count+4,'All due tasks should be shown (including genuine Habit/Goal linked tasks): '+JSON.stringify({count,rendered:m.taskCount}));
  assert.ok(m.scrollables.filter(x=>x.scrollH>x.clientH+3).length<=1,'two overflowing Home task scroll owners: '+JSON.stringify(m.scrollables));
  if(count>5){assert.ok(m.listScroll.s>m.listScroll.c,'large task list not scrollable');assert.equal(m.listScroll.tabindex,0,'task list not keyboard focusable')}
  if(width>=1001){
   assert.ok(m.cards.every(x=>Math.abs(x.r.h-322)<1),'desktop 322px four cards changed: '+JSON.stringify(m.cards));
   assert.ok(Math.max(...m.cards.map(x=>x.r.bottom))-Math.min(...m.cards.map(x=>x.r.bottom))<=2,'unaligned card bottoms');
  }
  if(width>=412&&width<=700){assert.ok(Math.abs(m.cards[0].r.y-m.cards[1].r.y)<3,'mobile first two cards not side by side');assert.ok(m.cards[2].r.y>m.cards[0].r.y,'mobile lower row not below first row')}
  if(width<=390)assert.ok(m.cards[1].r.y>m.cards[0].r.y,'narrow mobile must use readable stack');
 }
 if(route==='tasks'&&kind==='after'){
  assert.ok(m.rows.length>=Math.min(count,3),'Task rows not loaded');
  assert.ok(m.rows.some(x=>x.source.includes('source-language')),'language source absent');
  assert.ok(m.rows.some(x=>x.source.includes('source-exercise')),'exercise source absent');
  assert.ok(m.rows.some(x=>x.source.includes('source-habit')),'habit source absent');
  assert.ok(m.rows.every(x=>x.bg.includes('url(')),'mountain art lost in source gradient');
  assert.ok(m.rows.every(x=>!x.strike.includes('line-through')),'Task title struck through');
 }
 if(kind==='after'&&width>=360&&width<=700){
  assert.ok(m.header&&m.hero&&m.hero.y>=m.header.bottom-2,'Mobile hero overlaps topbar: '+JSON.stringify({route,width,header:m.header,hero:m.hero}));
  assert.ok(m.mobileBrand?.w>15,'Mobile brand missing from header: '+route+' '+width);
  assert.ok(m.mobileSearch?.w>100,'Mobile second-row search missing: '+route+' '+width);
 }
 if(kind==='after')assert.equal(m.scrollWidth,width,'whole-page horizontal overflow at '+route+' '+width);
 console.log('UI09_'+kind.toUpperCase()+'_'+route.toUpperCase()+' '+JSON.stringify(m));
 return {page,m};
}
try{
 for(const width of widths){
  const orig=width===1440||width===1648?await run(live,'home',width,5,'before'):null;
  if(orig)await orig.page.close();
  const h=await run(preview,'home',width,21,'after');
  if(orig&&width>=1001){
   const old=orig.m,newM=h.m;const gap=n=>+(n.quick.y-n.cards[0].r.bottom).toFixed(2);
   console.log('UI09_HOME_GAP_DELTA '+JSON.stringify({width,before:{card:old.cards[0].r.h,gap:gap(old),lower:+(old.bottom.y-old.quick.bottom).toFixed(2)},after:{card:newM.cards[0].r.h,gap:gap(newM),lower:+(newM.bottom.y-newM.quick.bottom).toFixed(2)}}));
   assert.ok(gap(newM)>=8&&gap(newM)<=14,'Home primary-to-Quick gap must be 8–14px, measured '+gap(newM));
   const lower=newM.bottom.y-newM.quick.bottom;
   assert.ok(lower>=8&&lower<=14,'Quick-to-bottom-row gap must be 8–14px, measured '+lower);
  }
  if(width===430||width===1440) {
   const btn=h.page.locator('#ref-equipped-character-toggle');await btn.click();
   assert.equal(await btn.getAttribute('aria-expanded'),'true','character panel not opened');
   assert.equal(await h.page.locator('#ref-equipped-character-panel').isVisible(),true);
   assert.ok((await h.page.locator('#ref-equipped-character-panel').innerText()).includes('انتخاب نکرده'),'missing wardrobe should render truthful empty state');
   await h.page.keyboard.press('Escape');assert.equal(await btn.getAttribute('aria-expanded'),'false');
   await h.page.evaluate(()=>{window.ElaraProfileSystem.writeWardrobe({avatarGroup:'female',avatarLevel:1});window.ElaraReferenceHome.render()});
   await btn.click();assert.equal(await h.page.locator('#ref-equipped-character-panel .ref-character-preview img[data-avatar-image]').count(),1,'equipped profile asset not shown');
   await h.page.locator('#ref-equipped-character-toggle').click();assert.equal(await btn.getAttribute('aria-expanded'),'false');
   console.log('UI09_CHARACTER_PANEL_PASS '+width);
   // Disposable browser-only social fixture (never written to user data or Firestore).
   await h.page.evaluate(()=>{
    window.ElaraSocial.me={uid:'fixture_self',name:'نفر اول آزمایش',username:'fixture_self',xp:1700};
    window.ElaraSocial.friends=[{uid:'fixture_2',name:'نفر دوم آزمایش',username:'fixture_2',xp:1100},{uid:'fixture_3',name:'نفر سوم آزمایش',username:'fixture_3',xp:650}];
    window.dispatchEvent(new Event('elara:social-updated'));
   });
   await h.page.waitForFunction(()=>document.querySelectorAll('#elara-home-ranks .ref-podium-person').length===3,{},{timeout:8000});
   const podium=await h.page.evaluate(()=>{
    const rect=x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}};
    return [...document.querySelectorAll('#elara-home-ranks .ref-podium-person')].map(p=>({rank:p.className,button:rect(p),portrait:rect(p.querySelector('.ref-podium-portrait')),frame:rect(p.querySelector('.ref-podium-frame')),name:p.querySelector('strong')?.textContent,xp:p.querySelector('small')?.textContent}));
   });
   assert.equal(podium.length,3);
   assert.ok(podium.every(x=>Math.abs(x.frame.cx-x.portrait.cx)<=2&&Math.abs(x.frame.cy-x.portrait.cy)<=2),'Ranking avatar frames not centered: '+JSON.stringify(podium));
   assert.ok(podium[0].portrait.cx>podium[1].portrait.cx&&podium[0].portrait.cx<podium[2].portrait.cx,'First rank is not centered between 2 and 3');
   assert.ok(podium[0].portrait.y<=podium[1].portrait.y&&podium[0].portrait.y<=podium[2].portrait.y,'First rank must be highest');
   console.log('UI09_PODIUM_REAL_RECORD_LAYOUT_PASS '+JSON.stringify({width,podium}));
  }
  await h.page.close();
  if(width===430||width===1440){const oldTasks=await run(live,'tasks',width,21,'before');await oldTasks.page.close()}
  const t=await run(preview,'tasks',width,21,'after');await t.page.close();
 }
 for(const count of [0,1,5]){
  const {page,m}=await run(preview,'home',1440,count,'after');assert.equal(m.taskCount,count,'zero/one/five fixture should show exact count');await page.close()
 }
}finally{await browser.close()}
console.log('UI09_BROWSER_MATRIX_PASS mobile and desktop screenshot & DOM metrics');
