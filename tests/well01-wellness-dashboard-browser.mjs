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
async function open(width,url,seed=true){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
 await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));
 if(seed)await page.addInitScript(({date})=>{
  localStorage.setItem('elara_private_wellness_v1_well01-qa',JSON.stringify({weight:'68.5',targetWeight:'',goal:2000,glass:250,water:{[date]:750},sleep:[{id:'well01-sleep',date,bed:'22:30',wake:'06:00'}],workouts:[{id:'well01-workout',date,type:'یوگا',minutes:30}],workoutPlanNote:'تمرین قدرتی سه روز در هفته',nutritionPlanNote:'یادداشت تغذیه شخصی',workoutPlanFolders:[],nutritionPlanFolders:[]}));
 },{date});
 await page.goto(url+'/?well01='+width+'#home',{waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForFunction(()=>window.ElaraOpen&&window.ElaraFeatureHubs&&!document.documentElement.hasAttribute('data-elara-booting'),{timeout:35000});
 await page.evaluate(()=>window.ElaraOpen('exercise'));
 await page.waitForSelector('#panel-exercise:not(.hidden)',{timeout:30000});
 return page;
}
await mkdir('browser-artifacts/well01',{recursive:true});
for(const w of [390,1440]){
 if(baseline){
  const before=await open(w,baseline);
  await before.screenshot({path:'browser-artifacts/well01/before-'+w+'.png',fullPage:true});
  await before.close();
 }
}
for(const width of widths){
 const page=await open(width,base);
 await page.waitForSelector('#panel-exercise:not(.hidden) #well01-dashboard .well01-hero',{timeout:30000});
 const dash=page.locator('#well01-dashboard');
 assert.equal(await dash.locator('.well01-shortcut').count(),5,'five category shortcuts at '+width);
 assert.equal(await dash.locator('.well01-metric').count(),4,'four daily metrics at '+width);
 assert.equal(await dash.locator('.well01-report').count(),4,'four real-data report entries at '+width);
 assert.match(await dash.locator('.well01-workout-plan').innerText(),/تمرین قدرتی/);
 assert.match(await dash.locator('.well01-nutrition-plan').innerText(),/یادداشت تغذیه/);
 assert.match(await dash.locator('.well01-activity-card').innerText(),/یوگا/);
 assert.doesNotMatch(await dash.innerText(),/۴۲۰|420 کالری/,'no synthetic calories');
 const dimensions=await page.evaluate(()=>({view:innerWidth,body:document.documentElement.scrollWidth,panel:document.querySelector('#panel-exercise').scrollWidth}));
 assert.ok(dimensions.body<=dimensions.view+1,'unexpected horizontal scroll '+width+': '+JSON.stringify(dimensions));
 assert.ok(dimensions.panel<=dimensions.view+1,'dashboard overflow '+width+': '+JSON.stringify(dimensions));
 if(width===390||width===1440){
  await page.screenshot({path:'browser-artifacts/well01/after-'+width+'.png',fullPage:true});
  for(const kind of ['water','sleep','weight','exercise','analysis']){
   await dash.locator('.well01-shortcut[data-feature-route="wellness-'+kind+'"]').click();
   await page.waitForSelector('#panel-wellness-'+kind+':not(.hidden)',{timeout:10000});
   await page.locator('#panel-wellness-'+kind+' .feature-subpage-head [data-feature-route="exercise"]').click();
   await page.waitForSelector('#panel-exercise:not(.hidden) #well01-dashboard');
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
  await page.evaluate(()=>{window.ElaraAccount.user.uid='well01-other';window.ElaraSocial.me.uid='well01-other';window.dispatchEvent(new Event('elara:account-ready'))});
  await page.waitForFunction(()=>document.querySelector('.well01-metric-weight strong')?.textContent.includes('—'));
  assert.doesNotMatch(await dash.innerText(),/68[.٫]5|۶۸[.٫]۵|تمرین قدرتی سه روز/,'one account cannot read another account data');
 }
 await page.close();
}
await browser.close();
console.log('WELL01_PASS: ten widths, private dashboard, real stats, navigation, water persistence, account isolation');
