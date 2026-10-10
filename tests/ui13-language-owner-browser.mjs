/* UI13 owner-art and classmate modal smoke. Launch on a local candidate server. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const origin=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const out='browser-artifacts/ui13';mkdirSync(out,{recursive:true});
const widthSet=[320,360,375,390,412,430,768,1440,1648];
const files=['language_banner_main.webp','librairy_banner_main.webp','weblog_banner_main.webp','workout_banner_main.webp','daily-banner-bg_main.webp','lightner.webp'];
const fakeCloud="window.ElaraAccount={user:{uid:'ui13-qa',email:'ui13@example.test',emailVerified:true},profile:{uid:'ui13-qa',name:'Test'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');window.dispatchEvent(new Event('elara:account-ready'));";
const fakeSocial="window.ElaraSocial={me:{uid:'ui13-qa',name:'Test'},friends:[],clubs:{list:async()=>[],discover:async()=>[]},challenges:{list:async()=>[]},refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const browser=await chromium.launch({headless:true});
const tasks=[{id:'lang-1',text:'تمرین زبان واقعی در تست ایزوله',sourceGroup:'language',completed:false,date:new Date().toLocaleDateString('en-CA')}];
const store={version:1,tasks,words:[{id:'word-1',front:'hello',back:'سلام',box:1,due:'2020-01-01'}],languageClasses:[{id:'class-1',ownerUid:'ui13-qa',title:'کلاس مشترک آزمایشی QA',type:'online',terms:1,sessionsPerTerm:10,durationMin:60,weekdays:[1,3],sessionLogs:[],collabSpaceId:'qa-accepted-space',collabRole:'member',updatedAt:Date.now()}],books:[],habits:[],goals:[],folders:[],tags:[]};
try{
 for(const width of widthSet){
  const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:width<=430?2:1,isMobile:width<=700,hasTouch:width<=700});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:fakeCloud}));
  await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:fakeSocial}));
  await page.addInitScript(row=>{localStorage.setItem('elara_space_v1',JSON.stringify(row));localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',language:'fa'}))},store);
  await page.goto(origin+'/?ui13='+width+'#language',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraOpen&&window.ElaraLanguageUI12&&window.ElaraLanguageDestinations,null,{timeout:35000});
  await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
  await page.waitForSelector('#panel-language:not(.hidden) .ui12-board');
  assert.equal(await page.locator('#panel-language .ui12-shortcut').count(),8,'Missing eight Language shortcuts at '+width);
  assert.equal(await page.locator('#panel-language .ui12-shortcut svg').count(),8,'Semantic SVG icons at '+width);
  const imageState=await page.evaluate(async files=>Promise.all(files.map(async name=>{const im=new Image();im.src='assets/ui/'+name;try{await im.decode()}catch{}return{name,ok:im.naturalWidth>0,width:im.naturalWidth,height:im.naturalHeight}})),files);
  assert.ok(imageState.every(x=>x.ok),'Broken new owner WebP assets: '+JSON.stringify(imageState));
  const hero=await page.locator('#panel-language .ui12-hero').evaluate(e=>getComputedStyle(e).backgroundImage);
  assert.match(hero,/language_banner_main\.webp/,'Language hero not owner image');
  const leitner=await page.locator('#ui12-leitner .ui12-leitner-art').evaluate(e=>getComputedStyle(e).backgroundImage);
  assert.match(leitner,/lightner\.webp/,'Leitner owner image absent');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,'UI13 viewport overflow '+width+': '+overflow);
  if(width<=700){assert.equal(await page.locator('.bottom-nav [data-elara-nav-kind="main"]').count(),7,'Global seven-button navigation changed')}
  if(width>=1440){
   const xs=await page.locator('#panel-language [data-ui12-jump]').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().left));
   assert.ok(xs.every((v,i)=>i===0||v>xs[i-1]),'Desktop physical shortcut order not left-to-right: '+xs);
   const top=await page.locator('#panel-language .ui12-hero').evaluate(el=>el.getBoundingClientRect().top);
   assert.ok(top<32,'Language hero retains unwanted top strip '+top);
  }
  await page.screenshot({path:out+'/after-'+width+'.png',fullPage:true,animations:'disabled'});
  for(const [key,target] of Object.entries({leitner:'words',books:'language-books',classes:'language-courses',tasks:'language-tasks',channels:'language-channels',challenges:'language-challenges',report:'language-reports'})){
   await page.locator('#panel-language [data-ui12-jump="'+key+'"]').click();
   await page.waitForSelector('#panel-'+target+':not(.hidden)',{timeout:12000});
   if(target==='language-tasks')assert.equal(await page.locator('#panel-language-tasks [data-section-task-toggle="lang-1"]').count(),1,'Canonical task missing from its own page');
   if(target==='language-channels'||target==='language-challenges')assert.equal(await page.locator('#panel-'+target+' .ui13-subpage').count(),1,'Dedicated page missing');
   await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
   await page.waitForSelector('#panel-language:not(.hidden)');
  }
  if(width===390){
   await page.evaluate(()=>ElaraOpen('language-courses',{history:'replace'}));
   await page.waitForSelector('#panel-language-courses:not(.hidden) [data-class-classmates="class-1"]');
   await page.evaluate(()=>{window.ElaraCollab={memberRows:async()=>[{name:'عضو آزمایشی',completed:2,total:10,percent:20}],openSpace:async()=>{throw Error('must not open collaboration dashboard')}}});
   await page.locator('[data-class-classmates="class-1"]').click();
   await page.waitForSelector('.language-class-classmates',{timeout:10000});
   assert.ok((await page.locator('.language-class-classmates').innerText()).includes('عضو آزمایشی'),'Classmate stats did not show authorized fixture results');
   await page.screenshot({path:out+'/classmate-stats-390.png',fullPage:false});
   const cancel=page.locator('#elara-dialog-root button').filter({hasText:/بستن|Close/}).last();
   if(await cancel.count())await cancel.click();
  }
  assert.deepEqual(errors.filter(e=>!/favicon|network/i.test(e)),[],'Browser runtime error '+width);
  console.log('UI13_RESPONSIVE_PASS '+width);
  await ctx.close();
 }
 console.log('UI13_OWNER_IMAGES_SVG_ROUTES_CLASSMATES_PASS');
}finally{await browser.close()}
