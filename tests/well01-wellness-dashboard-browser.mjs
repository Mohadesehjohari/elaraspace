import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const baseline=process.env.ELARA_BASELINE_URL||'';
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
const browser=await chromium.launch({headless:true});
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const date=iso(new Date());
const cloud="window.ElaraAccount={user:{uid:'well01-qa'},profile:{name:'Wellness QA',username:'wellness_qa',xp:0,profilePublic:false}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'well01-qa',name:'Wellness QA'},friends:[],activities:[],requests:[],publishActivity:async()=>{throw Error('private wellness must not publish to social')},refresh:async()=>{}};";
async function open(width,url,seed=true,touch=false){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,hasTouch:touch,isMobile:touch});
 await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));

 await page.goto(url+'/?well01='+width+'#home',{waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForFunction(()=>window.ElaraOpen&&window.ElaraFeatureHubs&&!document.documentElement.hasAttribute('data-elara-booting'),{timeout:35000});
 await page.evaluate(()=>window.ElaraOpen('exercise'));
 await page.waitForSelector('#panel-exercise:not(.hidden)',{timeout:30000});
 if(seed)await page.evaluate(({date})=>{
  window.ElaraAccount=window.ElaraAccount||{};window.ElaraAccount.user={...(window.ElaraAccount.user||{}),uid:'well01-qa'};
  if(window.ElaraSocial?.me)window.ElaraSocial.me.uid='well01-qa';
  localStorage.setItem('elara_private_wellness_v1_well01-qa',JSON.stringify({weight:'68.5',targetWeight:'',goal:2000,glass:250,water:{[date]:750},sleep:[{id:'well01-sleep',date,bed:'22:30',wake:'06:00'}],workouts:[{id:'well01-workout',date,type:'یوگا',minutes:30}],workoutPlanNote:'تمرین قدرتی سه روز در هفته',nutritionPlanNote:'یادداشت تغذیه شخصی',workoutPlanFolders:[{id:'well01-folder-workout',title:'چربی‌سوزی',programName:'تمرین چربی‌سوزی',description:'برنامه قدرتی سه روز در هفته',note:'یادداشت مربی',days:['شنبه','دوشنبه','چهارشنبه'],checks:[{id:'well01-check-a',text:'گرم کردن',done:false},{id:'well01-check-b',text:'تمرین اصلی',done:true}]}],nutritionPlanFolders:[{id:'well01-folder-nutrition',title:'تغذیه سالم',programName:'تغذیه روزانه',description:'وعده‌های متعادل در طول روز',note:'آب کافی بنوش',days:['همه روزها'],checks:[]}]}));
  window.dispatchEvent(new Event('elara:wellness-saved'));
  window.ElaraWell01?.render();
 },{date});
 return page;
}
await mkdir('browser-artifacts/well01',{recursive:true});
if(process.env.WELL_PROFILE_CAPTURE_ONLY==='1'){
 const publicUrl='https://mohadesehjohari.github.io/elaraspace';
 for(const width of [1440,390]){
  const pg=await open(width,publicUrl,false,width===390);
  await pg.locator('#panel-exercise:not(.hidden) #well01-dashboard .well01-hero').waitFor();
  const cluster=pg.locator('.topbar .ref-header-account-cluster');
  await cluster.waitFor();await pg.waitForTimeout(300);
  await pg.screenshot({path:'browser-artifacts/well01/production-profile-idle-'+width+'.png'});
  if(width===1440){await cluster.hover();await pg.waitForTimeout(280);await pg.screenshot({path:'browser-artifacts/well01/production-profile-hover-1440.png'});await pg.locator('#ref-header-account').click();}
  else{const r=await pg.locator('#ref-header-account').boundingBox();await pg.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);}
  await pg.locator('.elara-private-drawer:not(.hidden)').waitFor();
  await pg.waitForTimeout(280);
  await pg.screenshot({path:'browser-artifacts/well01/production-profile-menu-'+width+'.png'});
  console.log('LIVE_PROFILE_PROOF_'+width);
  await pg.close();
 }
 await browser.close();
 console.log('LIVE_PROFILE_PROOF_PASS public GitHub Pages 1440 and 390');
 process.exit(0);
}

const beforeGeometry=new Map();
async function geometry(page){
 return page.evaluate(()=>{
 const b=selector=>document.querySelector(selector)?.getBoundingClientRect()?.toJSON();
 const box=b('#well01-dashboard .well01-hero'),bar=b('.topbar'),copy=b('#well01-dashboard .well01-hero-copy h1'),cta=b('#well01-dashboard .well01-hero-cta');
 const eyebrow=b('#well01-dashboard .well01-hero-copy small'),shortcut=b('#well01-dashboard .well01-shortcuts'),features=b('#well01-dashboard .well01-features');
 const app=b('#main'),panel=b('#panel-exercise');
 const search=document.querySelector('#ref-search-input'),searchBox=search?.getBoundingClientRect();
 const cx=searchBox?searchBox.left+searchBox.width/2:0,cy=searchBox?searchBox.top+searchBox.height/2:0;
 const searchHit=searchBox?document.elementFromPoint(cx,cy):null;
 return {hero:box,bar,copy,cta,eyebrow,shortcut,features,app,panel,searchUnblocked:!!search&&(searchHit===search||search.contains(searchHit)),scrollY:scrollY};
 });
}
for(const w of [390,1440]){
 if(baseline){
  const before=await open(w,baseline);
  await before.evaluate(()=>window.scrollTo(0,0));
  const beforeRect=await geometry(before);
  beforeGeometry.set(w,beforeRect);
  console.log('WELL_HERO_TOP_BEFORE_'+w,JSON.stringify({heroY:beforeRect.hero.y,heroH:beforeRect.hero.height,heroW:beforeRect.hero.width,shortcutsY:beforeRect.shortcut.y,cardsY:beforeRect.features.y,headerY:beforeRect.bar.y,headerBottom:beforeRect.bar.bottom,appY:beforeRect.app.y}));
  await before.screenshot({path:'browser-artifacts/well01/before-'+w+'.png',fullPage:true});
  await before.close();
 }
}
for(const width of widths){
 const page=await open(width,base);
 await page.waitForSelector('#panel-exercise:not(.hidden) #well01-dashboard .well01-hero',{timeout:30000});
 const dash=page.locator('#well01-dashboard');
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.waitForTimeout(110);
 if([390,412,1440].includes(width)){
  const g=await page.evaluate(()=>{const hero=document.querySelector('#well01-dashboard .well01-hero'),bar=document.querySelector('.topbar'),panels=[...document.querySelectorAll('#well01-dashboard .well01-shortcut')].map(x=>x.getBoundingClientRect());return {hero:hero.getBoundingClientRect().toJSON(),header:bar?.getBoundingClientRect().toJSON(),shortcuts:panels.map(p=>({top:p.top,width:p.width,left:p.left}))}});
  console.log('WELL01_SHELL_'+width,JSON.stringify({heroTop:g.hero.top,heroHeight:g.hero.height,barBottom:g.header?.bottom,shortcuts:g.shortcuts}));
  const measure=await geometry(page);
  console.log('WELL_HERO_TOP_AFTER_'+width,JSON.stringify({heroY:measure.hero.y,heroH:measure.hero.height,heroW:measure.hero.width,shortcutsY:measure.shortcut.y,cardsY:measure.features.y,headerY:measure.bar.y,headerBottom:measure.bar.bottom,appY:measure.app.y,copyY:measure.copy.y,ctaY:measure.cta.y,searchUnblocked:measure.searchUnblocked}));
  assert.ok(measure.hero.top<measure.bar.bottom-20,'header should float over hero image at '+width);
  assert.ok(measure.copy.top>=measure.bar.bottom-2,'hero heading must remain readable under header at '+width);
  assert.ok(measure.cta.top>=measure.bar.bottom-2,'hero CTA must not hide below header at '+width);
  assert.ok(measure.eyebrow.top>=measure.bar.bottom-2,'eyebrow must remain below actionable header at '+width);
  assert.ok(measure.cta.bottom<=measure.hero.bottom+1,'hero CTA must remain fully within unchanged image at '+width);
  assert.ok(measure.searchUnblocked,'top search click target obstructed '+width);
  if(beforeGeometry.has(width)){
    const before=beforeGeometry.get(width),change=before.hero.y-measure.hero.y;
    assert.ok(Math.abs(change)<=1,'WELL-PROFILE must preserve the #79 hero vertical position at '+width+': '+change);
    assert.ok(Math.abs(measure.hero.height-before.hero.height)<=1,'hero height must be preserved '+width);
    assert.ok(Math.abs(measure.hero.width-before.hero.width)<=1,'hero width must be preserved '+width);
    assert.ok(Math.abs((before.shortcut.y-measure.shortcut.y)-change)<=3,'shortcut row must move with hero '+width);
    assert.ok(Math.abs((before.features.y-measure.features.y)-change)<=3,'feature cards must move with hero '+width);
    console.log('WELL_HERO_TOP_DELTA_'+width,JSON.stringify({heroUp:change,shortcutUp:before.shortcut.y-measure.shortcut.y,cardsUp:before.features.y-measure.features.y}));
  }
  if(width===390||width===412)assert.ok(g.shortcuts.every(x=>Math.abs(x.top-g.shortcuts[0].top)<3),'all five shortcuts on same mobile row at '+width);
 }

 if(width===390||width===1440){
  const account=page.locator('.topbar .ref-header-account-cluster'),button=page.locator('#ref-header-account');
  const opacity=()=>account.evaluate(el=>Number(getComputedStyle(el).opacity));
  const drawer=page.locator('.elara-private-drawer:not(.hidden)');
  const geom=await page.evaluate(()=>{const x=document.querySelector('.topbar .ref-header-account-cluster'),b=document.querySelector('#ref-header-account');const st=getComputedStyle(x);return {rect:x.getBoundingClientRect().toJSON(),button:b.getBoundingClientRect().toJSON(),position:st.position,events:st.pointerEvents,display:st.display};});
  console.log('WELL_PROFILE_REAL_DOM_'+width,JSON.stringify(geom));
  assert.ok(geom.button.height>=44&&geom.button.width>=44,'account keeps >=44px hit target');
  assert.equal(geom.events,'auto','account remains pointer-interactive');
  await page.waitForTimeout(280);
  const idle=await opacity();
  await page.screenshot({path:'browser-artifacts/well01/profile-idle-'+width+'.png'});
  if(width===1440){
   assert.ok(idle<=.15,'desktop account fades when idle: '+idle);
   await account.hover();await page.waitForTimeout(270);
   assert.ok(await opacity()>.9,'desktop account reveals on hover');
   await page.screenshot({path:'browser-artifacts/well01/profile-hover-1440.png'});
   await page.mouse.move(12,360);await page.waitForTimeout(280);
   assert.ok(await opacity()<=.15,'desktop account fades again after pointer leaves');
  }else assert.ok(idle>=.48&&idle<.9,'touch account stays discoverable: '+idle);
  await button.click();
  await drawer.waitFor();
  assert.ok(await page.evaluate(()=>document.body.classList.contains('elara-private-drawer-open')),'drawer open class exists');
  await page.waitForTimeout(270);
  assert.ok(await opacity()>.9,'account fully visible while menu open');
  await page.screenshot({path:'browser-artifacts/well01/profile-menu-'+width+'.png'});
  if(width===1440){
   await page.locator('.elara-private-drawer-panel').hover();
   assert.ok(await opacity()>.9,'account remains visible on mouse travel into drawer');
  }
  if(width===1440)await page.keyboard.press('Escape');
  else await page.locator('.elara-private-drawer [data-drawer-close]').click();
  await drawer.waitFor({state:'hidden'});
  await page.mouse.move(12,360);await page.waitForTimeout(270);
  if(width===1440)assert.ok(await opacity()<=.15,'account fades after drawer closed');
  else assert.ok((await opacity())>=.48&&(await opacity())<.9,'touch account returns to compact form');
  if(width===1440){
   await page.keyboard.press('Tab');await button.focus();await page.waitForTimeout(260);
   assert.ok(await opacity()>.9,'keyboard focus-within reveals account');
   await page.keyboard.press('Enter');await drawer.waitFor();
   await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
   await button.focus();await page.keyboard.press('Space');await drawer.waitFor();
   await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
  }
  await page.evaluate(()=>window.ElaraOpen('home'));
  await page.waitForSelector('#panel-home:not(.hidden)');
  assert.ok(Math.abs(await opacity()-1)<.001,'account remains fully visible on Home');
  for(const [route,panelId] of [['tasks','panel-tasks'],['reports','panel-reports'],['habits','panel-habits']]){
   await page.evaluate(route=>window.ElaraOpen(route),route);
   await page.waitForSelector('#'+panelId+':not(.hidden)',{timeout:12000});
   await page.mouse.move(12,360);await page.waitForTimeout(270);
   const p=await opacity();
   if(width===1440){
    assert.ok(p<=.15,'nonhome desktop account should fade on '+route+': '+p);
    await account.hover();await page.waitForTimeout(260);assert.ok(await opacity()>.9,'hover must reveal account on '+route);
   }else assert.ok(p>=.48&&p<.9,'nonhome mobile account must remain visible on '+route);
   await page.evaluate(()=>window.ElaraOpen('home'));
   await page.waitForSelector('#panel-home:not(.hidden)');
   await page.waitForTimeout(260);
   assert.ok(Math.abs(await opacity()-1)<.001,'Home account must restore after '+route);
  }
  await page.evaluate(()=>window.ElaraOpen('exercise'));
  await page.waitForSelector('#panel-exercise:not(.hidden)');
  console.log('WELL_PROFILE_INTERACTION_PASS_'+width);
 }
 assert.equal(await dash.locator('.well01-shortcut').count(),5,'five category shortcuts at '+width);
 assert.equal(await dash.locator('.well01-metric').count(),4,'four daily metrics at '+width);
 assert.equal(await dash.locator('.well01-report').count(),4,'four real-data report entries at '+width);
 assert.equal(await dash.locator('.well01-workout-plan [data-well01-folder-view="workout"]').count(),1,'workout card contains folder tile');
 assert.equal(await dash.locator('.well01-nutrition-plan [data-well01-folder-view="nutrition"]').count(),1,'nutrition card contains folder tile');
 assert.doesNotMatch(await dash.locator('.well01-workout-plan').innerText(),/برنامه قدرتی سه روز در هفته/,'no inline workout plan text');
 assert.doesNotMatch(await dash.locator('.well01-nutrition-plan').innerText(),/وعده‌های متعادل در طول روز/,'no inline nutrition plan text');
 if(width===390||width===1440){
  await dash.locator('[data-well01-folder-view="workout"]').click();
  const folderModal=page.locator('.elwp-folder-view-overlay .elwp-dialog');
  await folderModal.waitFor();
  assert.match(await folderModal.locator('.elwp-view-description').innerText(),/برنامه قدرتی/);
  assert.equal(await folderModal.locator('[data-wellness-folder-share="workout"]').count(),1,'share action available on own folder');
  assert.match(await folderModal.locator('.elwp-view-notes').innerText(),/یادداشت مربی/);
  assert.equal(await folderModal.locator('.elwp-view-day.is-selected').count(),3);
  const modalBox=await folderModal.boundingBox();
  if(width===1440)assert.ok(modalBox.width>=1150,'folder viewer must be significantly wider than previous 840px editor');
  await folderModal.locator('[data-elwp-view-check="well01-check-a"]').check();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well01-qa')).workoutPlanFolders[0].checks[0].done);
  assert.equal(saved,true,'viewer checkbox persists per-folder completion');
  await folderModal.locator('[data-elwp-close]').first().click();
  await folderModal.waitFor({state:'hidden'});
 }
 assert.match(await dash.locator('.well01-activity-card').innerText(),/یوگا/);
 assert.doesNotMatch(await dash.innerText(),/۴۲۰|420 کالری/,'no synthetic calories');
 const dimensions=await page.evaluate(()=>({view:innerWidth,body:document.documentElement.scrollWidth,panel:document.querySelector('#panel-exercise').scrollWidth}));
 assert.ok(dimensions.body<=dimensions.view+1,'unexpected horizontal scroll '+width+': '+JSON.stringify(dimensions));
 assert.ok(dimensions.panel<=dimensions.view+1,'dashboard overflow '+width+': '+JSON.stringify(dimensions));
 if(width===390||width===1440){
  const initialRect=await page.evaluate(()=>({hero:document.querySelector('#well01-dashboard .well01-hero').getBoundingClientRect().top,topbar:document.querySelector('.topbar')?.getBoundingClientRect().bottom,scrollY:window.scrollY}));
  console.log('WELL01_AFTER_INITIAL_GEOMETRY_'+width,JSON.stringify(initialRect));
  await page.screenshot({path:'browser-artifacts/well01/after-'+width+'.png',fullPage:true});
  for(const kind of ['water','sleep','weight','exercise','analysis']){
   await dash.locator('.well01-shortcut[data-feature-route="wellness-'+kind+'"]').click();
   await page.waitForSelector('#panel-wellness-'+kind+':not(.hidden)',{timeout:10000});
    if(kind==='weight'){
     const skin=await page.evaluate(()=>{
       const hero=document.querySelector('#panel-wellness-weight > .feature-subpage-head'),card=document.querySelector('#panel-wellness-weight .wellness-weight-route-card');
       const style=getComputedStyle(hero);return{height:hero.getBoundingClientRect().height,image:style.backgroundImage,cardBorder:card?getComputedStyle(card).borderColor:''}
     });
     assert.ok(skin.height>=200,'weight banner uses full wellness hero proportions');
     assert.match(skin.image,/workout_banner_main.webp/,'weight banner reuses wellness hero artwork');
     assert.ok(skin.cardBorder&&skin.cardBorder!=='rgb(110, 91, 238)','weight card uses its own green theme');
    }
   await page.locator('#panel-wellness-'+kind+' .feature-subpage-head [data-feature-route="exercise"]').click();
   await page.waitForSelector('#panel-exercise:not(.hidden) #well01-dashboard');
  }
 }
 if(width===390||width===1440){
  await dash.locator('.well01-activity-card [data-wellness-add="workout"]').click();
  const modal=page.locator('.wellness-workout-dialog[role="dialog"][aria-modal="true"]');
  await modal.waitFor();
  assert.equal(await modal.locator('[name="note"]').count(),1,'one optional workout note');
  if(width===1440){
   const pair=await page.evaluate(()=>({type:document.querySelector('.wellness-workout-pair [name="type"]').getBoundingClientRect().toJSON(),name:document.querySelector('.wellness-workout-pair [name="customType"]').getBoundingClientRect().toJSON(),footer:document.querySelector('.wellness-workout-footer').getBoundingClientRect().toJSON(),dialog:document.querySelector('.wellness-workout-dialog').getBoundingClientRect().toJSON()}));
   console.log('WELL01_DESKTOP_MODAL',JSON.stringify({typeY:pair.type.y,nameY:pair.name.y,footerBottom:pair.footer.bottom,dialogBottom:pair.dialog.bottom}));
   assert.ok(Math.abs(pair.type.y-pair.name.y)<=3,'desktop type and custom name are in the same row');
   assert.ok(pair.footer.bottom<=900,'desktop save and cancel are visible without scrolling at 900px height');
  }
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden','workout form locks background scrolling');
  await page.screenshot({path:'browser-artifacts/well01/workout-popup-'+width+'.png'});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(90);
  const rect=await page.evaluate(()=>({hero:document.querySelector('#well01-dashboard .well01-hero').getBoundingClientRect().top,panel:document.querySelector('#panel-exercise').getBoundingClientRect().top,topbar:document.querySelector('.topbar')?.getBoundingClientRect().bottom}));
  console.log('WELL01_GEOMETRY_'+width,JSON.stringify(rect));
  if(width===390){
   await modal.locator('[name="type"]').selectOption({label:'ورزش دیگر'});
   assert.ok(await modal.locator('[data-workout-custom]').isVisible(),'custom type visible');
   await page.screenshot({path:'browser-artifacts/well01/workout-other-390.png'});
   await modal.locator('[name="customType"]').fill('');
   await modal.locator('.wellness-workout-save').click();
   assert.ok(await modal.locator('.wellness-workout-error').isVisible(),'validation does not close dialog');
   await modal.locator('[name="customType"]').fill('صخره‌نوردی');
   await modal.locator('[name="minutes"]').fill('43');
   await modal.locator('[name="note"]').fill('آرام و بدون فشار');
   await page.screenshot({path:'browser-artifacts/well01/workout-filled-390.png'});
   await modal.locator('.wellness-workout-save').click();
   await modal.waitFor({state:'hidden'});
   await page.waitForFunction(()=>document.documentElement.style.overflow!=='hidden');

   const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well01-qa')).workouts);
   assert.equal(rows.length,2,'one and only one workout created');
   assert.equal(rows[1].note,'آرام و بدون فشار');
   assert.equal(await page.evaluate(()=>history.state?.elaraWorkoutModal||null),null,'closing removes transient modal history state');
   await dash.locator('.well01-metric-exercise [data-wellness-add="workout"]').click();
   await modal.waitFor();
   await modal.locator('[name="note"]').fill('لغو بدون ذخیره');
   await page.keyboard.press('Escape');
   await modal.waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well01-qa')).workouts.length),2,'Escape must not persist draft');
   await dash.locator('.well01-metric-exercise [data-wellness-add="workout"]').click();
   await modal.waitFor();
   await page.evaluate(()=>history.back());
   await modal.waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well01-qa')).workouts.length),2,'browser Back must not save draft');

   assert.match(await dash.locator('.well01-activity-card').innerText(),/صخره‌نوردی/,'dashboard refresh after workout save');
  }else{
   await page.keyboard.press('Escape');
   await modal.waitFor({state:'hidden'});
  }
 }
 if(width===390){
  await dash.locator('[data-wellness-water="add"]').click();
  await page.waitForFunction(date=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well01-qa')||'{}').water?.[date]===1000,date);
  await dash.locator('[data-wellness-water="remove"]').click();
  await page.waitForFunction(date=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well01-qa')||'{}').water?.[date]===750,date);
  for(let k=0;k<4;k++)await dash.locator('[data-wellness-water="remove"]').click();
  assert.equal(await page.evaluate(date=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well01-qa')).water[date],date),0,'water must not become negative');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraWell01&&window.ElaraOpen);
  await page.evaluate(()=>window.ElaraOpen('exercise'));
  await page.waitForSelector('#panel-exercise:not(.hidden) #well01-dashboard');
  assert.equal(await page.evaluate(date=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well01-qa')).water[date],date),0,'refresh persists real state');
  await page.evaluate(()=>{window.ElaraAccount=window.ElaraAccount||{};window.ElaraAccount.user={...(window.ElaraAccount.user||{}),uid:'well01-other'};window.ElaraSocial=window.ElaraSocial||{me:{}};window.ElaraSocial.me={...(window.ElaraSocial.me||{}),uid:'well01-other'};window.dispatchEvent(new Event('elara:account-ready'))});
  await page.waitForFunction(()=>document.querySelector('.well01-metric-weight strong')?.textContent.includes('—'));
  await page.waitForFunction(()=>!(/68[.٫]5|۶۸[.٫]۵|تمرین قدرتی سه روز/).test(document.querySelector('#well01-dashboard')?.innerText||''),{timeout:10000});
  assert.doesNotMatch(await dash.innerText(),/68[.٫]5|۶۸[.٫]۵|تمرین قدرتی سه روز/,'one account cannot read another account data');
 }
 await page.close();
}

const touch=await open(390,base,false,true);
await touch.waitForSelector('#panel-exercise:not(.hidden) #well01-dashboard .well01-hero');
const tr=await touch.locator('#ref-header-account').boundingBox();
assert.ok(tr&&tr.width>=44&&tr.height>=44,'actual touch account >=44x44');
await touch.touchscreen.tap(tr.x+tr.width/2,tr.y+tr.height/2);
await touch.locator('.elara-private-drawer:not(.hidden)').waitFor();
await touch.screenshot({path:'browser-artifacts/well01/profile-touch-open-390.png'});
await touch.locator('.elara-private-drawer [data-drawer-close]').click();
await touch.locator('.elara-private-drawer:not(.hidden)').waitFor({state:'hidden'});
await touch.waitForTimeout(275); // allow 210ms opacity transition to settle
const closedOpacity=await touch.locator('.ref-header-account-cluster').evaluate(el=>Number(getComputedStyle(el).opacity));
assert.ok(closedOpacity<.9,'touch account compacts after closing');
await touch.close();

/* Proof-only: rendered screenshots come from the real PUBLIC GitHub Pages URL,
   not localhost or a generated mockup. No personal account data is used. */
const liveUrl='https://mohadesehjohari.github.io/elaraspace';
for(const width of [1440,390]){
 const page=await open(width,liveUrl,false,width===390);
 const cluster=page.locator('.topbar .ref-header-account-cluster');
 await cluster.waitFor();
 await page.waitForTimeout(290);
 await page.screenshot({path:'browser-artifacts/well01/production-profile-idle-'+width+'.png'});
 if(width===1440){
  await cluster.hover();await page.waitForTimeout(275);
  await page.screenshot({path:'browser-artifacts/well01/production-profile-hover-1440.png'});
  await page.locator('#ref-header-account').click();
 }else{
  const rect=await page.locator('#ref-header-account').boundingBox();
  await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
 }
 await page.locator('.elara-private-drawer:not(.hidden)').waitFor();
 await page.waitForTimeout(275);
 await page.screenshot({path:'browser-artifacts/well01/production-profile-menu-'+width+'.png'});
 console.log('WELL_PROFILE_PRODUCTION_SCREENSHOTS_'+width);
 await page.close();
}
await browser.close();
console.log('WELL01_PASS: ten widths, private dashboard, real stats, navigation, water persistence, account isolation');
