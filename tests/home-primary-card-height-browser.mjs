import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const local=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const live='https://mohadesehjohari.github.io/elaraspace';
const widths=[1440,1648,320,375,390,430];
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const selectors=['#ref-streak-card','.owner-home-tasks','#ref-wellness-card','.owner-home-goals'];
const date=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};

async function measure(url,width,which){
 const page=await browser.newPage({viewport:{width,height:width>=1001?945:950},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraAccount={user:null,profile:{name:'مرجع الارا',username:'fixture_owner',xp:420,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true};window.dispatchEvent(new Event('elara:social-updated'));"}));
 await page.addInitScript(day=>{
  const make=(id,text,sourceGroup,priority)=>({id,text,sourceGroup,priority:String(priority),completed:false,date:day,createdAt:Date.now()});
  const s={version:1,xp:420,theme:'dark',taskLists:['کارهای شخصی'],folders:[],tags:[],
   tasks:[make('one','مطالعه و مرور زبان انگلیسی','language',2),make('two','دانلود جزوهٔ ریاضی','personal',2),make('three','تمرین روزانهٔ ورزشی','exercise',3),make('four','عادت مطالعهٔ کتاب','habit',3)],
   habits:[{id:'h1',title:'عادت صبحگاهی',days:[]}],
   goals:[{id:'g1',title:'هدف زبان در سه ماه',steps:[{id:'s1',text:'مرور واژه',done:true},{id:'s2',text:'تمرین',done:false}]},{id:'g2',title:'هدف مطالعه',steps:[{id:'s3',text:'شروع',done:false}]}],
   books:[],words:[]};
  localStorage.setItem('elara_space_v1',JSON.stringify(s));
  localStorage.setItem('elara_locale_v1','fa');
 },date());
 await page.goto(url+'/?homeCardProbe='+which+'-'+width+'#home',{waitUntil:'domcontentloaded',timeout:40000});
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&!!window.ElaraReferenceHome,null,{timeout:30000});
 await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.ElaraReferenceHome?.render();window.ElaraOpen?.('home')});
 await page.waitForTimeout(550);
 const data=await page.evaluate(selectors=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2),right:+r.right.toFixed(2),bottom:+r.bottom.toFixed(2)}};
  const cards=selectors.map(selector=>{
   const element=document.querySelector('#panel-home '+selector);
   if(!element)return {selector,missing:true};
   const st=getComputedStyle(element),r=rect(element);
   const head=element.querySelector('header h2'),scroll=element.querySelector('#elara-home-tasks,#ref-wellness-data,#elara-home-goals,.ref-goals-scroll');
   return {selector,rect:r,computed:{height:st.height,minHeight:st.minHeight,maxHeight:st.maxHeight,boxSizing:st.boxSizing,overflow:st.overflow,paddingTop:st.paddingTop,paddingBottom:st.paddingBottom},head:head?rect(head):null,scroll:scroll?{clientHeight:scroll.clientHeight,scrollHeight:scroll.scrollHeight}:null,art:st.backgroundImage};
  });
  const card=document.querySelector('#ref-streak-card'),checks=[...card?.querySelectorAll('.ref-streak-day .ref-day-mark')||[]].map(el=>rect(el));
  const wellness=document.querySelector('#ref-wellness-card'),metrics=[...wellness?.querySelectorAll('.ref-wellness-cell')||[]].map(el=>rect(el));
  const goalRows=[...document.querySelectorAll('#elara-home-goals .ref-goal-row')].map(x=>x.textContent.trim().slice(0,110));
  const quick=document.querySelector('#ref-quick-access,.ref-quick-access');
  const sheetOrder=[...document.styleSheets].map(x=>x.href?.split('/').pop()||'inline').filter(x=>/home-owner-art|global-page-banner|reference-exact-pass|elara-midnight/.test(x));
  const target=document.querySelector('#ref-streak-card'),matching=[];
  for(const sheet of document.styleSheets){
   if(!sheet.href||!/home-owner-art|global-page-banner|reference-exact-pass|elara-midnight/.test(sheet.href))continue;
   let rules;try{rules=sheet.cssRules}catch{continue}
   function walk(rules,mediaOK=true){
    for(const rule of rules){
     if(rule.cssRules){const nextOK=mediaOK&&(!rule.conditionText||matchMedia(rule.conditionText).matches);walk(rule.cssRules,nextOK);continue}
     if(!mediaOK||!rule.selectorText||!rule.style)continue;
     try{if(target.matches(rule.selectorText)&&['height','min-height','max-height'].some(k=>rule.style.getPropertyValue(k))){
      matching.push({sheet:sheet.href.split('/').pop(),selector:rule.selectorText.slice(0,170),height:rule.style.getPropertyValue('height'),minHeight:rule.style.getPropertyValue('min-height'),maxHeight:rule.style.getPropertyValue('max-height'),important:rule.style.getPropertyPriority('height')});
     }}catch{}
    }
   }
   walk(rules)
  }
  return {viewport:innerWidth,scale:visualViewport?.scale||1,dpr:devicePixelRatio,zoom:getComputedStyle(document.body).zoom,scrollWidth:document.documentElement.scrollWidth,quick:quick?rect(quick):null,cards,checks,metrics,goalRows,sheetOrder,matching};
 },selectors);
 await page.screenshot({path:'browser-artifacts/home-height-'+which+'-'+width+'.png',fullPage:width>=1001});
 console.log('HOME_CARD_RENDERED_'+which.toUpperCase()+' '+JSON.stringify(data));
 assert.equal(errors.length,0,'page errors: '+errors.join('; '));
 await page.close();
 return data;
}
try{
 for(const width of widths){
  const before=width>=1001?await measure(live,width,'before'):null;
  const after=await measure(local,width,'after');
  assert.equal(after.scrollWidth,width,'horizontal overflow at '+width);
  const items=after.cards;
  assert.equal(items.length,4);
  assert.ok(items.every(x=>!x.missing&&x.art.includes('/assets/ui/')),'real owner art missing');
  if(width>=1001){
   assert.ok(items.every(c=>c.rect.height>=315&&c.rect.height<=340),'desktop cards outside target band: '+JSON.stringify(items));
   const heights=items.map(x=>x.rect.height),tops=items.map(x=>x.rect.y),bottoms=items.map(x=>x.rect.bottom);
   assert.ok(Math.max(...heights)-Math.min(...heights)<=2,'desktop heights misaligned');
   assert.ok(Math.max(...tops)-Math.min(...tops)<=2,'desktop tops misaligned');
   assert.ok(Math.max(...bottoms)-Math.min(...bottoms)<=2,'desktop bottoms misaligned');
   const old=before.cards.map(x=>x.rect.height),deltas=heights.map((h,i)=>+(h-old[i]).toFixed(2));
   assert.ok(deltas.every(x=>x>=35&&x<=50),'real rendered height increase not 35-50px: '+JSON.stringify({old,heights,deltas,width}));
   assert.ok(after.quick&&after.quick.y>=Math.max(...bottoms)&&after.quick.y<=Math.max(...bottoms)+52,'Quick Access must flow naturally below cards');
   assert.ok(after.metrics.length===3&&after.metrics.every(r=>r.bottom<=items[2].rect.bottom+1),'Wellness metric panel clipped at '+width);
   console.log('HOME_CARD_HEIGHT_DELTA_PASS '+JSON.stringify({width,old,heights,deltas,sheetOrder:after.sheetOrder,winning:after.matching.filter(x=>x.height==='304px')}));
  }else{
   assert.ok(items.every(c=>c.rect.height>=170&&c.rect.height<=375),'mobile card height unreasonable '+width);
   assert.ok(after.checks.length===7&&Math.max(...after.checks.map(r=>r.y))-Math.min(...after.checks.map(r=>r.y))<12,'streak weekday checks not aligned');
   assert.ok(after.metrics.length===3&&after.metrics.every(r=>r.right<=items[2].rect.right+2&&r.x>=items[2].rect.x-2),'Wellness metrics clipped horizontally');
   assert.ok(after.goalRows.every(x=>!x.includes('عادت')),'Habits incorrectly rendered as Goals');
   assert.ok(items.every(c=>c.selector==='#ref-streak-card'||(c.head&&c.head.bottom<=c.rect.bottom)),'headings clipped at '+width);
   console.log('HOME_MOBILE_HEIGHT_PASS '+width+' '+items.map(c=>c.rect.height).join(','));
  }
 }
}finally{await browser.close()}
