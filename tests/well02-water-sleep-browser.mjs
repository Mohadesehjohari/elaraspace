import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173',baseline=process.env.ELARA_BASELINE_URL||'';
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
const date=(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})();
const browser=await chromium.launch({headless:true});
const cloud="window.ElaraAccount={user:{uid:'well02-qa'},profile:{name:'Wellness QA',username:'well02_qa',xp:0,profilePublic:false}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'well02-qa',name:'QA'},friends:[],activities:[],requests:[],publishActivity:async()=>{throw Error('private wellness must not share to social feed')},refresh:async()=>{}};";
async function pageAt(width,url){
 const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
 await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.goto(url+'/?well02='+width+'#home',{waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForFunction(()=>window.ElaraOpen&&window.ElaraFeatureHubs&&!document.documentElement.hasAttribute('data-elara-booting'),{timeout:35000});
 return page;
}
async function seed(page){
 await page.evaluate(({date})=>{
  window.ElaraAccount=window.ElaraAccount||{};
  window.ElaraAccount.user={...(window.ElaraAccount.user||{}),uid:'well02-qa'};
  window.ElaraSocial=window.ElaraSocial||{me:{}};
  window.ElaraSocial.me={...(window.ElaraSocial.me||{}),uid:'well02-qa'};
  localStorage.setItem('elara_private_wellness_v1_well02-qa',JSON.stringify({water:{[date]:750},goal:2000,glass:250,weight:'71',sleep:[],workouts:[],workoutPlanNote:'',nutritionPlanNote:'',cycles:[],workoutPlanFolders:[],nutritionPlanFolders:[]}));
  window.dispatchEvent(new Event('elara:account-ready'));
  window.ElaraWell02?.render();
 },{date});
}
async function route(page,name){await page.evaluate(name=>window.ElaraOpen('wellness-'+name),name);await page.waitForSelector('#panel-wellness-'+name+':not(.hidden)',{timeout:20000});}
const get=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well02-qa')||'{}'));
await mkdir('browser-artifacts/well02',{recursive:true});
for(const width of [390,1440]){
 if(baseline){
  const page=await pageAt(width,baseline);await route(page,'water');
  await page.screenshot({path:'browser-artifacts/well02/before-water-'+width+'.png',fullPage:true});
  await route(page,'sleep');await page.screenshot({path:'browser-artifacts/well02/before-sleep-'+width+'.png',fullPage:true});await page.close();
 }
}
for(const width of widths){
 const page=await pageAt(width,base);await seed(page);
 await route(page,'water');
 await page.waitForSelector('#well02-water .well02-glass-scene',{timeout:30000});
 assert.match(await page.locator('#well02-water .well02-big-count').innerText(),/۳|3/,'real water count at '+width);
 assert.equal(await page.locator('#well02-water .well02-bar-day').count(),7,'7 water days at '+width);
 assert.ok((await page.locator('#well02-water .well02-water-form input').count())===2,'water controls at '+width);
 let dims=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,panel:document.querySelector('#panel-wellness-water').scrollWidth}));
 assert.ok(dims.doc<=dims.width+1,'water document overflow at '+width+' '+JSON.stringify(dims));
 assert.ok(dims.panel<=dims.width+1,'water panel overflow at '+width+' '+JSON.stringify(dims));
 if([390,1440].includes(width))await page.screenshot({path:'browser-artifacts/well02/after-water-'+width+'.png',fullPage:true});
 await route(page,'sleep');
 await page.waitForSelector('#well02-sleep .well02-sleep-form',{timeout:20000});
 assert.equal(await page.locator('#well02-sleep .well02-bar-day').count(),0,'empty week must not fake chart days '+width);
 dims=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,panel:document.querySelector('#panel-wellness-sleep').scrollWidth}));
 assert.ok(dims.doc<=dims.width+1,'sleep overflow '+width+' '+JSON.stringify(dims));
 assert.ok(dims.panel<=dims.width+1,'sleep panel overflow '+width+' '+JSON.stringify(dims));
 if([390,1440].includes(width))await page.screenshot({path:'browser-artifacts/well02/after-sleep-'+width+'.png',fullPage:true});
 if(width===390){
  await route(page,'water');
  await page.locator('#well02-water [data-well02-water="add"]').click();
  await page.waitForFunction(date=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well02-qa')).water[date]===1000,date);
  for(let n=0;n<5;n++)await page.locator('#well02-water [data-well02-water="remove"]').click();
  assert.equal((await get(page)).water[date],0,'water never negative');
  await page.locator('.well02-water-form [name=glass]').fill('300');
  await page.locator('.well02-water-form [name=goal]').fill('2400');
  await page.locator('.well02-water-form button[type=submit]').click();
  let s=await get(page);
  assert.equal(s.glass,300);assert.equal(s.goal,2400);
  await page.locator('#well02-water [data-well02-water="add"]').click();
  assert.equal((await get(page)).water[date],300,'new glass size updates real stored water');
  await route(page,'sleep');
  await page.locator('.well02-sleep-form [name=date]').fill(date);
  await page.locator('.well02-sleep-form [name=bed]').fill('23:00');
  await page.locator('.well02-sleep-form [name=wake]').fill('07:30');
  await page.locator('.well02-sleep-form button[type=submit]').click();
  s=await get(page);assert.equal(s.sleep.length,1,'one confirmed sleep record');
  assert.equal(await page.evaluate(()=>window.ElaraWellnessTest.sleepMinutes(JSON.parse(localStorage.getItem('elara_private_wellness_v1_well02-qa')).sleep[0])),510,'cross-midnight sleep is 8h30m');
  const id=s.sleep[0].id;
  await page.locator('#well02-sleep [data-well02-sleep-edit]').first().click();
  assert.equal(await page.locator('.well02-sleep-form [name=id]').inputValue(),id);
  await page.locator('.well02-sleep-form [name=bed]').fill('22:30');
  await page.locator('.well02-sleep-form button[type=submit]').click();
  s=await get(page);assert.equal(s.sleep.length,1,'edit cannot create duplicate');
  assert.equal(s.sleep[0].id,id);assert.equal(s.sleep[0].bed,'22:30');
  await page.locator('.well02-sleep-goal-form [name=goal]').fill('8.5');
  await page.locator('.well02-sleep-goal-form button[type=submit]').click();
  assert.equal((await get(page)).sleepGoalHours,8.5);
  await page.evaluate(()=>{window.ElaraDialog=window.ElaraDialog||{};window.ElaraDialog.confirm=async()=>false});
  await page.locator('#well02-sleep [data-well02-sleep-delete]').first().click();
  await page.waitForTimeout(90);
  assert.equal((await get(page)).sleep.length,1,'cancel deletion retains sleep');
  await page.evaluate(()=>{window.ElaraDialog.confirm=async()=>true});
  await page.locator('#well02-sleep [data-well02-sleep-delete]').first().click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_private_wellness_v1_well02-qa')).sleep.length===0);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraWell02&&window.ElaraOpen);
  await route(page,'water');assert.equal((await get(page)).water[date],300,'hydration persisted after reload');
  await page.evaluate(()=>{window.ElaraAccount=window.ElaraAccount||{};window.ElaraAccount.user={...(window.ElaraAccount.user||{}),uid:'well02-other'};window.ElaraSocial=window.ElaraSocial||{me:{}};window.ElaraSocial.me={...(window.ElaraSocial.me||{}),uid:'well02-other'};window.dispatchEvent(new Event('elara:account-ready'));window.ElaraWell02.render()});
  assert.doesNotMatch(await page.locator('#well02-water .well02-big-count').innerText(),/۱|1/,'account must not see other account water');
 }
 if(width===1440){
  await route(page,'sleep');
  await page.locator('#panel-wellness-sleep .feature-back').click();
  await page.waitForSelector('#panel-exercise:not(.hidden)',{timeout:15000});
 }
 await page.close();
}
await browser.close();
console.log('WELL02_PASS: all widths, water add/remove/goal, cross-midnight sleep, edit/dedupe/delete, refresh, private account isolation');
