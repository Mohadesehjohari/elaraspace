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
  if(width===1440){
    for(const [destination,art] of [['books','librairy_banner_main.webp'],['blog','weblog_banner_main.webp'],['exercise','workout_banner_main.webp']]){
     await page.evaluate(destination=>ElaraOpen(destination,{history:'replace'}),destination);
     await page.waitForSelector('#panel-'+destination+':not(.hidden)');
     await page.waitForFunction(destination=>!!document.querySelector('#panel-'+destination+' [data-elara-page-hero]'),destination,{timeout:10000});
     const reference=await page.locator('#panel-'+destination+' [data-elara-page-hero]').first().evaluate(el=>getComputedStyle(el).getPropertyValue('--elara-page-art'));
     assert.ok(reference.includes(art),'Owner route art not wired to '+destination+': '+reference);
    }
    await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
  }
  await page.waitForFunction(()=>document.querySelector('link[href*="ui13-language.css"]')?.sheet&&getComputedStyle(document.querySelector('#ui12-leitner .ui12-leitner-art')).backgroundImage.includes('lightner.webp'),null,{timeout:20000});
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
  if(width===1440){
    const circles=await page.locator('#ui12-leitner .ui12-box').evaluateAll(xs=>xs.map(x=>({radius:getComputedStyle(x).borderTopLeftRadius,text:x.querySelector('b')?.textContent})));
    assert.equal(circles.length,5,'Leitner does not show five boxes');
    assert.ok(circles.every(x=>x.radius==='50%'&&x.text),'Leitner circles missing real count '+JSON.stringify(circles));
    const promo=await page.locator('#ref-sidebar-banner').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(promo,/background-moonlit-mountains\.webp/,'Real sidebar landscape not displayed');
  }
  await page.screenshot({path:out+'/after-'+width+'.png',fullPage:true,animations:'disabled'});
  for(const [key,target] of Object.entries({leitner:'words',books:'language-books',classes:'language-courses',tasks:'language-tasks',channels:'language-channels',challenges:'language-challenges',report:'language-reports'})){
   await page.locator('#panel-language [data-ui12-jump="'+key+'"]').click();
   await page.waitForSelector('#panel-'+target+':not(.hidden)',{timeout:12000});
   if(target==='language-tasks'){
    assert.equal(await page.locator('#panel-language-tasks [data-section-task-toggle="lang-1"]').count(),1,'Canonical task missing from its own page');
    if(width===390){
     await page.locator('#panel-language-tasks [data-section-task-toggle="lang-1"]').click();
     await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').tasks?.find(x=>x.id==='lang-1')?.completed===true,null,{timeout:8000});
     await page.locator('#panel-language-tasks [data-section-task-add="language"]').click();
     await page.waitForSelector('#task-form:not([hidden])',{timeout:8000});
     assert.equal(await page.locator('#task-source-group').inputValue(),'language','Language add did not preselect the canonical category');
     await page.locator('#task-title').fill('UI14 categorized test');
     await page.locator('#task-submit').click();
     await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').tasks?.some(x=>x.text==='UI14 categorized test'&&x.sourceGroup==='language'),null,{timeout:8000});
     await page.waitForSelector('#panel-language-tasks .ui13-task-row',{timeout:8000});
     assert.ok((await page.locator('#panel-language-tasks').innerText()).includes('UI14 categorized test'),'New canonical Task not in scoped Language view');
    }
   }
   if(target==='language-channels'||target==='language-challenges')assert.equal(await page.locator('#panel-'+target+' .ui13-subpage').count(),1,'Dedicated page missing');
   if(target==='language-channels'||target==='language-challenges'||target==='language-tasks'){
     const back=page.locator('#panel-'+target+' [data-ui13-back]');
     assert.equal(await back.count(),1,'Dedicated back missing '+target+' @'+width);
     const hit=await back.evaluate(el=>{const r=el.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return h===el||el.contains(h)});
     assert.equal(hit,true,'Language back covered by Header '+target+' @'+width);
     await back.click({timeout:9000});
   }else await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));
   await page.waitForSelector('#panel-language:not(.hidden)');
  }
  if(width===390){
   await page.evaluate(()=>ElaraOpen('language-courses',{history:'replace'}));
   await page.waitForSelector('#panel-language-courses:not(.hidden) [data-class-classmates="class-1"]');
   await page.evaluate(()=>{window.ElaraCollab={memberRows:async()=>[{name:'عضو آزمایشی',completed:2,total:10,percent:20}],openSpace:async()=>{throw Error('must not open collaboration dashboard')}}});
   await page.locator('[data-class-classmates="class-1"]').click();
   await page.waitForSelector('.language-class-classmates',{timeout:10000});
   assert.ok((await page.locator('.language-class-classmates').innerText()).includes('عضو آزمایشی'),'Classmate stats did not show authorized fixture results');
   const modalOverflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth-innerWidth,report:document.querySelector('.language-class-report')?.scrollWidth-document.querySelector('.language-class-report')?.clientWidth}));
   assert.ok(modalOverflow.page<=2&&modalOverflow.report<=2,'Classmate modal horizontal overflow '+JSON.stringify(modalOverflow));
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
