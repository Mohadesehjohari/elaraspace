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
 const page=await browser.newPage({viewport:{width,height:width>=701?945:880},deviceScaleFactor:width<=700?2:1,isMobile:width<=700,hasTouch:width<=700});
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
   return {...generic,cards,cardStyles:cards.map(x=>{const el=q('#panel-home '+x.s),st=getComputedStyle(el);return {className:el.className,height:st.height,minHeight:st.minHeight,maxHeight:st.maxHeight,padding:st.padding,boxSizing:st.boxSizing,display:st.display,overflow:st.overflow,gridTemplateRows:st.gridTemplateRows,children:[...el.children].slice(0,5).map(ch=>({cls:ch.className,r:rect(ch)}))}}),grid:rect(q('#panel-home .ref-home-grid')),gridStyle:{marginBottom:getComputedStyle(q('#panel-home .ref-home-grid')).marginBottom,rowGap:getComputedStyle(q('#panel-home .ref-home-grid')).rowGap,gridTemplateRows:getComputedStyle(q('#panel-home .ref-home-grid')).gridTemplateRows},quickStyle:{marginTop:getComputedStyle(q('#ref-quick-access')).marginTop,marginBottom:getComputedStyle(q('#ref-quick-access')).marginBottom},quick:rect(q('#ref-quick-access')),quickRail:{client:q('.ref-quick-access-grid')?.clientWidth,scroll:q('.ref-quick-access-grid')?.scrollWidth,cards:sel('#ref-quick-access .ref-quick-card').map(rect)},bottom:rect(q('#ref-bottom-grid')),quickCount:sel('#ref-quick-access .ref-quick-card').length,
   accountGeometry:{cluster:rect(q('.ref-header-account-cluster')),avatar:rect(q('.ref-header-account-cluster .ref-account-avatar')),chevron:rect(q('#ref-equipped-character-toggle')),account:rect(q('#ref-header-account'))},
   mobileNav:sel('.bottom-nav [data-elara-nav-kind]').map(e=>({route:e.dataset.elaraTab,r:rect(e)})),
   metricsChildren:sel('#ref-wellness-card .ref-wellness-cell').map(e=>({cell:rect(e),strong:rect(e.querySelector('strong')),lastUnit:rect(e.querySelector('small:last-child'))})),
   goals:sel('#elara-home-goals .ref-goal-row').map(x=>x.textContent.trim()),wellnessParts:{main:rect(q('#ref-wellness-card .ref-health-main')),ring:rect(q('#ref-wellness-card .ref-health-ring')),copy:rect(q('#ref-wellness-card .ref-health-copy')),metrics:sel('#ref-wellness-card .ref-wellness-cell').map(rect)},taskCount:sel('#elara-home-tasks .ref-task-row').length,scrollables,hostScroll:host?{c:host.clientHeight,s:host.scrollHeight,overflow:getComputedStyle(host).overflowY}:null,listScroll:list?{c:list.clientHeight,s:list.scrollHeight,overflow:getComputedStyle(list).overflowY,tabindex:list.tabIndex}:null,headings:sel('#panel-home .ref-home-grid .ref-card header h2').map(rect),chevron:!!q('#ref-equipped-character-toggle')};
  }
  return {...generic,toolbar:rect(q('#astra-task-toolbar')),rows:sel('#task-list>.astra-task-row').map(x=>({source:x.className,rect:rect(x),bg:getComputedStyle(x).backgroundImage,accent:getComputedStyle(x).getPropertyValue('--task-accent').trim(),label:x.querySelector('.item-title')?.textContent||'',strike:x.querySelector('.item-title')?getComputedStyle(x.querySelector('.item-title')).textDecorationLine:''})),archived:sel('.task-archive-row').length};
 },route);
 if(kind==='after'||kind==='before')await page.screenshot({path:'browser-artifacts/ui09-'+kind+'-'+route+'-'+width+'-'+count+'.png',fullPage:width>=701});
 console.log('UI09_DIAGNOSTIC '+JSON.stringify({kind,route,width,expected:count,observed:m.taskCount,host:m.hostScroll,list:m.listScroll,cards:m.cards,quick:m.quick,bottom:m.bottom,rows:m.rows?.length,styles:m.cardStyles}));
 if(route==='home'&&kind==='after'){
  assert.equal(m.quickCount,6,'exact six shortcuts required');
  assert.ok(m.goals.every(t=>!t.includes('عادت آب خوردن')),'habit rendered as goal');
  assert.ok(m.chevron,'account character chevron not mounted');
  const geom=m.accountGeometry,near=(a,b)=>Math.max(0,a.x-(b.x+b.w),b.x-(a.x+a.w));
  assert.ok(geom.cluster&&geom.chevron&&geom.avatar,'Profile chevron/avatar cannot be measured '+JSON.stringify(geom));
  assert.ok(near(geom.chevron,geom.avatar)<=70,'Profile chevron detached from real avatar '+width+': '+JSON.stringify(geom));
  assert.ok(m.taskCount>=count&&m.taskCount<=count+4,'All due tasks should be shown (including genuine Habit/Goal linked tasks): '+JSON.stringify({count,rendered:m.taskCount}));
  assert.ok(m.scrollables.filter(x=>x.scrollH>x.clientH+3).length<=1,'two overflowing Home task scroll owners: '+JSON.stringify(m.scrollables));
  if(count>5){assert.ok(m.listScroll.s>m.listScroll.c,'large task list not scrollable');assert.equal(m.listScroll.tabindex,0,'task list not keyboard focusable')}
  if(width>=1001){
   assert.ok(m.hero?.y<=2&&m.hero?.h>=215,'Desktop landscape must reach workspace edge beneath clear toolbar');
   assert.ok(m.cards.every(x=>Math.abs(x.r.h-322)<1),'desktop 322px four cards changed: '+JSON.stringify(m.cards));
   assert.ok(Math.max(...m.cards.map(x=>x.r.bottom))-Math.min(...m.cards.map(x=>x.r.bottom))<=2,'unaligned card bottoms');
  }
  if(width>=390&&width<=700){
    assert.ok(Math.abs(m.cards[0].r.y-m.cards[1].r.y)<3,'wide mobile first two cards not side by side');
    assert.ok(m.cards[2].r.y>m.cards[0].r.y,'mobile lower row not below first row');
    assert.ok(m.cards.slice(0,2).every(x=>x.r.h<=210&&x.r.h>=160),'first-row mobile cards too tall/clipped: '+JSON.stringify(m.cards));
    assert.ok(m.cards.slice(2).every(x=>x.r.h<=250&&x.r.h>=185),'second-row mobile cards too tall/clipped: '+JSON.stringify(m.cards));
    assert.ok(m.wellnessParts.metrics.every(x=>x.bottom<=m.cards[2].r.bottom+2),'wellness metric clipped outside card');
    assert.ok(m.wellnessParts.copy?.bottom<=m.cards[2].r.bottom+2,'wellness status copy clipped outside card');
   }
  if(width>=375&&width<=389){
   assert.ok(m.cards[1].r.y>m.cards[0].r.y,'375–389 must keep full-width Streak/Tasks');
   assert.ok(m.cards[3].r.y>m.cards[2].r.y,'real Goals require a readable full-width row at 375');
  }
  if(width<=360)assert.ok(m.cards[1].r.y>m.cards[0].r.y,'very narrow mobile needs readable stacked cards');
  if(width>=1001){
   assert.ok(m.quick.h<=155,'Quick Access internal wrapper still too tall: '+JSON.stringify(m.quick));
   assert.ok(m.bottom.y<=770,'Entire final Home row has not moved up: '+JSON.stringify({grid:m.grid,quick:m.quick,bottom:m.bottom}));
  }
  if(width>=375&&width<=389)assert.ok(m.quick.y<=1000,'Readable full-data fallback still giant before shortcuts '+width+': '+m.quick.y);
  if(width>=390&&width<=700)assert.ok(m.quick.y<=775,'Wide mobile shortcuts remain too far down '+width+': '+m.quick.y);
  if(width<=360)assert.ok(m.quick.y<=1065,'Narrow fallback still giant before Quick Access: '+m.quick.y);
  if(width<=700){
   assert.deepEqual(m.mobileNav.map(x=>x.route),['freedom','social','home','books','more'],'Wrong mobile main nav semantics');
   assert.ok(m.mobileNav.every((v,i,a)=>!i||v.r.x>a[i-1].r.x),'Mobile route order not physically reference-aligned: '+JSON.stringify(m.mobileNav));
   assert.ok(m.mobileNav.every(x=>x.r.w>=44),'Mobile nav target smaller than 44px');
   assert.ok(m.metricsChildren.every(x=>x.strong&&x.lastUnit&&x.lastUnit.bottom<=x.cell.bottom+2),
     'Wellness values or units clipped by metric tile: '+JSON.stringify(m.metricsChildren));
   assert.ok(m.quick.h<=220,'Mobile Quick Access must not use giant multi-row grid: '+JSON.stringify(m.quick));
   assert.ok(m.quickRail.scroll>m.quickRail.client+40,'Six Quick Access destinations are not horizontally reachable');
   assert.ok(m.quickRail.cards.length===6&&m.quickRail.cards.every(x=>Math.abs(x.y-m.quickRail.cards[0].y)<2),'Mobile Quick Access must be one aligned horizontal rail');
  }
 }
 if(route==='tasks'&&kind==='after'){
  assert.ok(m.rows.length>=Math.min(count,3),'Task rows not loaded');
  assert.ok(m.rows.some(x=>x.source.includes('source-language')),'language source absent');
  assert.ok(m.rows.some(x=>x.source.includes('source-exercise')),'exercise source absent');
  assert.ok(m.rows.some(x=>x.source.includes('source-habit')),'habit source absent');
  assert.ok(m.rows.every(x=>x.bg.includes('url(')),'mountain art lost in source gradient');
  const source=cls=>m.rows.find(x=>x.source.includes('source-'+cls));
  const neutral=m.rows.find(x=>!/(source-habit|source-language|source-exercise|source-goal|source-book|source-focus)/.test(x.source));
  assert.ok(neutral,'neutral task row absent');
  const tint=x=>x.bg.split('url(')[0];
  for(const group of ['habit','language','exercise']){
   assert.notEqual(tint(source(group)),tint(neutral),'Task mountain gradient identical for sourceGroup '+group+' at '+width);
  }
  assert.ok(m.rows.every(x=>!x.strike.includes('line-through')),'Task title struck through');
 }
 if(kind==='after'&&width>=320&&width<=700){
  assert.ok(m.header&&m.hero&&m.hero.y>=m.header.bottom-2,'Mobile hero overlaps topbar: '+JSON.stringify({route,width,header:m.header,hero:m.hero}));
  if(width>=360)assert.ok(m.mobileBrand?.w>15,'Mobile brand missing from header: '+route+' '+width);
  assert.ok(m.mobileSearch?.w>100,'Mobile second-row search missing: '+route+' '+width);
  assert.ok(m.mobileSearch?.bottom<=m.hero.y+1,'Mobile search extends over image: '+JSON.stringify({route,width,search:m.mobileSearch,hero:m.hero}));
 }
 if(kind==='after'&&route==='home'&&width>=1001){
  const font=parseFloat(m.headline?.fontSize||'0');
  assert.ok(font>=17&&font<=24,'Home desktop heading exceeds owner reference: '+font);
 }
 if(kind==='after'&&route==='home'&&width<=700){
  const font=parseFloat(m.headline?.fontSize||'0');
  assert.ok(font>=15.5&&font<=20,'Home mobile heading too big/small: '+font);
  assert.ok(m.headline?.rect.y<m.hero.y+m.hero.h*.58,'Home mobile heading should be at top-right: '+JSON.stringify({hero:m.hero,heading:m.headline}));
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
   console.log('UI10_ABSOLUTE_HOME_ROWS '+JSON.stringify({width,hero:newM.hero,primary:newM.grid,primaryBottom:newM.cards[0].r.bottom,quick:newM.quick,bottom:newM.bottom,beforeQuick:old.quick,beforeBottom:old.bottom}));
   const lower=newM.bottom.y-newM.quick.bottom;
   assert.ok(lower>=8&&lower<=14,'Quick-to-bottom-row gap must be 8–14px, measured '+lower);
  }
  if(width===430){
   const nav=h.page.locator('.bottom-nav [data-elara-nav-kind]');
   assert.equal(await nav.count(),5,'Mobile main navigation must contain five readable destinations');
   const more=h.page.locator('.bottom-nav [data-elara-tab="more"]');
   await more.click();
   assert.equal(await more.getAttribute('aria-expanded'),'true');
   const lang=h.page.locator('#elara-mobile-more-panel [data-more-route="language"]');
   assert.ok(await lang.isVisible(),'Language lost from accessible secondary routes');
   await lang.click();
   await h.page.waitForTimeout(100);
   assert.equal(await more.getAttribute('aria-expanded'),'false');
   await h.page.evaluate(()=>{window.ElaraOpen?.('home');window.ElaraReferenceHome?.render()});
   console.log('UI10_MOBILE_MORE_ACCESS_PASS 430');
  }
  if(width===430||width===1440){
   const list=h.page.locator('#elara-home-tasks .ref-task-list');
   const scrollPos=()=>list.evaluate(el=>el.scrollTop);
   await list.focus();await h.page.keyboard.press('End');
   assert.ok(await scrollPos()>10,'Keyboard cannot scroll the single Home task list');
   await list.evaluate(el=>{el.scrollTop=0});
   const bounds=await list.boundingBox();
   assert.ok(bounds&&bounds.height>12,'Single Task list has no usable scroll hitbox');
   await h.page.mouse.move(bounds.x+bounds.width/2,bounds.y+Math.min(bounds.height/2,22));
   await h.page.mouse.wheel(0,215);await h.page.waitForTimeout(100);
   assert.ok(await scrollPos()>10,'Mouse wheel cannot scroll the single Home task list');
   console.log('UI09_TASK_SCROLL_WHEEL_KEYBOARD_PASS '+width);
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
  const t=await run(preview,'tasks',width,21,'after');
  if(width===430){
   const first=t.page.locator('#task-list>.astra-task-row .check-button[data-phase2-action="toggle-task"]').first();
   const countBefore=await t.page.locator('#task-list>.astra-task-row').count();
   await first.click();await t.page.waitForTimeout(250);
   const archive=t.page.locator('#task-checked-archive .task-archive-row');
   assert.ok(await archive.count()>=1,'Completed Task not moved to the Completed section');
   const decoration=await archive.first().locator('strong').first().evaluate(el=>getComputedStyle(el).textDecorationLine);
   assert.ok(!decoration.includes('line-through'),'Completed Task title struck through');
   assert.ok(await t.page.locator('#task-list>.astra-task-row').count()<countBefore,'Completed Task remained in pending list');
   const past=await t.page.evaluate(async()=>{
    const key='elara_space_v1',state=JSON.parse(localStorage.getItem(key));
    const d=new Date();d.setDate(d.getDate()-3);
    const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const startXp=Number(state.xp||0);
    state.tasks.push({id:'ui09_past_occurrence',text:'بازبینی روز گذشته',sourceGroup:'personal',priority:'4',date:iso,createdAt:Date.now(),recurrenceRule:{frequency:'daily',interval:1,startDate:iso},occurrenceDone:[],completed:false});
    localStorage.setItem(key,JSON.stringify(state));
    await window.ElaraTasks.taskAction('toggle-task','ui09_past_occurrence',iso);
    const next=JSON.parse(localStorage.getItem(key));
    return {past:iso,done:next.tasks.find(t=>t.id==='ui09_past_occurrence')?.occurrenceDone||[],xpGain:Number(next.xp||0)-startXp};
   });
   assert.ok(past.done.includes(past.past),'Cannot complete Task on prior occurrence date');
   assert.equal(past.xpGain,10,'Prior-day Task completion XP mismatch');
   console.log('UI09_TASK_COMPLETED_AND_PAST_DATE_PASS '+JSON.stringify(past));
  }
  await t.page.close();
 }
 for(const count of [0,1,5]){
  const {page,m}=await run(preview,'home',1440,count,'after');assert.equal(m.taskCount,count,'zero/one/five fixture should show exact count');await page.close()
 }
}finally{await browser.close()}
console.log('UI09_BROWSER_MATRIX_PASS mobile and desktop screenshot & DOM metrics');
