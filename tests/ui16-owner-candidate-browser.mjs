import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const site=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const main=process.env.ELARA_BASE_URL||'http://127.0.0.1:4174';
const dir='browser-artifacts/ui16';mkdirSync(dir,{recursive:true});
const widths=[320,360,375,390,412,430,768,1440,1648];
const routes=['home','tasks','books','language','words','language-books','language-courses','language-channels','language-challenges','language-tasks','language-reports','social','ranking','exercise','page','blog','freedom','focus'];
const seed={version:1,theme:'dark',tasks:[{id:'qa-language',text:'تسک تست ایزوله',sourceGroup:'language',priority:'3',date:'',createdAt:1,completed:false}],words:[{id:'qa-word',front:'word',back:'واژه',box:2,due:'2020-01-01'}],languageClasses:[],books:[],habits:[],goals:[],folders:[],tags:[]};
const stub="window.ElaraAccount={user:{uid:'ui16-fixture',email:'ui16@example.test',emailVerified:true},profile:{uid:'ui16-fixture',name:'QA'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'ui16-fixture'},friends:[],clubs:{list:async()=>[],discover:async()=>[]},challenges:{list:async()=>[]},refresh:async()=>{}};";
const browser=await chromium.launch({headless:true,executablePath:process.env.ELARA_CHROMIUM_EXECUTABLE||undefined});
const audit=[],failures=[];
async function setup(url,width,route='home'){
 const context=await browser.newContext({viewport:{width,height:width<=700?900:1000},isMobile:width<=700,hasTouch:width<=700});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:stub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.addInitScript(s=>{localStorage.setItem('elara_space_v1',JSON.stringify(s));localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',language:'fa'}))},seed);
 await page.goto(url+'/?ui16='+width+'#'+route,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ElaraOpen&&window.ElaraLanguageUI12,null,{timeout:35000});
 return {context,page,errors}
}
try{
 for(const width of widths){
  const {context,page,errors}=await setup(site,width);
  const absent=[];
  for(const route of routes){
   if(!await page.evaluate(r=>!!document.getElementById('panel-'+r),route)){absent.push(route);continue}
   try{
    await page.evaluate(r=>ElaraOpen(r,{history:'replace'}),route);
    await page.waitForSelector('#panel-'+route+':not(.hidden)',{timeout:9000});
    await page.waitForTimeout(110);
    const m=await page.evaluate(()=>{
     const overflow=document.documentElement.scrollWidth-innerWidth;
     const culprits=[...document.querySelectorAll('body *')].filter(e=>{
       const r=e.getBoundingClientRect(),s=getComputedStyle(e);
       return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&(r.right>innerWidth+2||r.left< -2);
     }).slice(0,8).map(e=>({tag:e.tagName,id:e.id,className:String(e.className).slice(0,90),x:Math.round(e.getBoundingClientRect().x),right:Math.round(e.getBoundingClientRect().right)}));
     return {overflow,culprits}
    });
    audit.push({width,route,...m});
    if(m.overflow>2)failures.push({width,route,...m});
    if(route==='tasks'){
     const bg=await page.locator('#panel-tasks .astra-task-hero').evaluate(e=>getComputedStyle(e).backgroundImage);
     if(!bg.includes('task-header-banner-bg.webp'))failures.push({width,route,missing:'Tasks owner panorama',bg});
    }
    if(route==='language'){
     const bg=await page.locator('#panel-language .ui12-hero').evaluate(e=>getComputedStyle(e).backgroundImage);
     if(!bg.includes('language_banner_main.webp'))failures.push({width,route,missing:'approved Language banner',bg});
     if(await page.locator('#panel-language [data-ui12-jump]').count()!==8)failures.push({width,route,missing:'eight shortcuts'});
     if(width>=1440){
      const x=await page.locator('#ui12-stats,#ui12-books,#ui12-tasks,#ui12-leitner,#ui12-report').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.id,e.getBoundingClientRect().x])));
      if(!(x['ui12-stats']>x['ui12-books']&&x['ui12-books']>x['ui12-tasks']&&x['ui12-tasks']>x['ui12-leitner']&&x['ui12-report']>x['ui12-books']))failures.push({width,route,wrongRTL:x});
     }
    }
   }catch(e){failures.push({width,route,error:String(e.message||e)})}
  }
  if(width<=430&&await page.locator('.bottom-nav [data-elara-nav-kind="main"]').count()!==7)failures.push({width,missing:'seven-button approved mobile nav'});
  if(errors.length)failures.push({width,errors});
  console.log('UI16_AUDIT_WIDTH '+JSON.stringify({width,absent,failures:failures.filter(x=>x.width===width)}));
  await context.close();
 }
 for(const width of [390,1440,1648])for(const route of ['language','tasks','books']){
  for(const [label,url] of [['before-main',main],['after-ui16',site]]){
   const {context,page}=await setup(url,width,route);
   await page.evaluate(r=>ElaraOpen(r,{history:'replace'}),route);
   await page.waitForSelector('#panel-'+route+':not(.hidden)',{timeout:11000});
   await page.waitForTimeout(800);
   await page.screenshot({path:dir+'/'+label+'-'+route+'-'+width+'.png',fullPage:true,animations:'disabled'});
   await context.close();
  }
 }
 writeFileSync(dir+'/nine-width-audit.json',JSON.stringify({audit,failures},null,2));
 console.log('UI16_FINAL '+JSON.stringify({checked:audit.length,failures:failures.length}));
 assert.equal(failures.length,0,'Candidate sitewide overflow/asset failures; read artifact');
}finally{await browser.close()}
