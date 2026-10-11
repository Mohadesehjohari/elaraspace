/* REPORTS-01 compact: browser geometry on actual document flow, not DOM existence. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const after=(process.env.REPORTS01_AFTER_URL||process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const before=process.env.REPORTS01_BEFORE_URL?.replace(/\/$/,'')||null;
const out='browser-artifacts/reports01-compact';
await mkdir(out,{recursive:true});
const date=n=>{let d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const today=date(0),now=Date.now();
const data={version:1,theme:'dark',xp:0,habits:[],goals:[],words:[],tasks:[{id:'task-reports01-compact',text:'تکمیل تست',date:today,completed:true,doneAt:today}],taskCompletionHistory:[{taskId:'task-reports01-compact',date:today,completedAt:now}],focusSessions:[{id:'focus-reports01-compact',completed:true,endedAt:now-10000,durationMin:25}],books:[{id:'book-reports01-compact',title:'مطالعه ثبت‌شده',shelf:'reading',totalPages:150,currentPage:12,readingLogs:[{date:today,timestamp:now-10000,fromPage:0,toPage:12,pagesRead:12}]}],tags:[],folders:[],taskLists:[]};
const auth="window.ElaraAccount={user:{uid:'reports01-compact-user',email:'qa@example.invalid'},profile:{name:'QA',username:'qa'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.querySelector('#cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'reports01-compact-user',name:'QA',username:'qa'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const widths=[320,360,375,390,412,430,768,1024,1440,1648],results=[];
const browser=await chromium.launch({headless:true});
async function startPage(width){
 const ctx=await browser.newContext({viewport:{width,height:width<=700?850:980},deviceScaleFactor:1});
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 360px verifies the Reports layout even if the optional Feature Hub adapter fails.
 if(width===360)await page.route('**/feature-hubs-2026.js*',route=>route.abort());
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.addInitScript(x=>localStorage.setItem('elara_space_v1',JSON.stringify(x)),data);
 return {ctx,page,errors};
}
async function measure(page,host,label,width){
 await page.goto(host+'/?reports-compact='+label+'-'+width+'#reports',{waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>!!window.ElaraReportsDashboard&&!!document.querySelector('#panel-reports .elara-reports-kpis')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:40000});
 await page.waitForFunction(()=>window.ElaraAccount?.user?.uid==='reports01-compact-user',null,{timeout:35000});
 await page.evaluate(()=>{window.ElaraOpen('reports',{history:'replace'});window.ElaraReportsDashboard.render()});
 await page.waitForSelector('#panel-reports:not(.hidden) .elara-reports-kpi');
 await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready});
 const m=await page.evaluate(()=>{
  const p=document.getElementById('panel-reports'),
        hero=p.querySelector(':scope > .elara-reports-hero'),
        kpis=p.querySelector(':scope > .elara-reports-dashboard .elara-reports-kpis'),
        main=document.getElementById('main'),
        head=document.querySelector('.workspace .topbar.ref-topbar')||document.querySelector('.workspace .topbar');
  const rect=x=>{if(!x)return null;const b=x.getBoundingClientRect();return {x:b.x,y:b.y,top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:b.width,height:b.height}};
  const css=x=>{if(!x)return null;const st=getComputedStyle(x);return {display:st.display,position:st.position,paddingTop:st.paddingTop,marginTop:st.marginTop,marginBottom:st.marginBottom,rowGap:st.rowGap,visibility:st.visibility}};
  const h=rect(hero),k=rect(kpis),t=rect(head),legacy=[...p.querySelectorAll(':scope > h1')].filter(x=>x.textContent.trim()==='گزارش‌های من');
  const allCards=[...kpis.querySelectorAll('.elara-reports-kpi')];
  return {
   hero:h,kpis:k,header:t,main:rect(main),panel:rect(p),
   gap:Number((k.top-h.bottom).toFixed(2)),
   headerToHero:t?Number((h.top-t.bottom).toFixed(2)):null,
   css:{main:css(main),panel:css(p),hero:css(hero)},
   legacy:legacy.map(x=>({text:x.textContent,rect:rect(x),display:getComputedStyle(x).display})),
   heroTitles:[...hero.querySelectorAll('h1')].map(x=>x.textContent.trim()),
   cards:allCards.length,cardRects:allCards.map(rect),
   cardTextOverflow:allCards.map(x=>({outer:x.scrollWidth-x.clientWidth,inner:[...x.querySelectorAll('strong')].map(y=>y.scrollWidth-y.clientWidth)})),
   sections:{trend:!!p.querySelector('.elara-reports-trends'),today:!!p.querySelector('.elara-reports-today'),sections:!!p.querySelector('.elara-reports-sections'),insights:!!p.querySelector('.elara-reports-insights'),activities:!!p.querySelector('.elara-reports-activities')},
   viewport:document.documentElement.clientWidth,documentWidth:document.documentElement.scrollWidth,
   plot:(()=>{const wrap=p.querySelector('.elara-reports-plot-scroll'),svg=p.querySelector('.elara-reports-plot');return wrap&&svg?{scrollExcess:wrap.scrollWidth-wrap.clientWidth,wrap:rect(wrap),svg:rect(svg),viewBox:svg.getAttribute('viewBox')}:null})(),
   lower:(()=>{
    const lower=p.querySelector('.elara-reports-lower'),
      activity=lower?.querySelector('.elara-reports-activities'),
      left=lower?.firstElementChild,
      last=activity?.querySelector('.elara-reports-activity-list>button:last-child'),
      insight=lower?.querySelector('.elara-reports-insight-grid');
    return activity?{
      height:activity.getBoundingClientRect().height,
      leftHeight:left?.getBoundingClientRect().height||0,
      activityBottom:rect(activity).bottom,
      lastBottom:last?rect(last).bottom:null,
      slack:last?Number((rect(activity).bottom-rect(last).bottom).toFixed(2)):null,
      insightCount:insight?.querySelectorAll('button').length||0,
      insightRects:[...(insight?.querySelectorAll('button')||[])].map(rect),
      activityCount:activity.querySelectorAll('.elara-reports-activity-list>button').length
    }:null;
   })(),
   mobileNav:[...document.querySelectorAll('.bottom-nav [data-elara-nav-kind="main"]')].length
  };
 });
 if([390,1440].includes(width))await page.screenshot({path:out+'/'+label+'-'+width+'.png',fullPage:true,animations:'disabled'});
 console.log('REPORTS01_COMPACT_GEOMETRY '+label+' '+width+' '+JSON.stringify(m));
 return m;
}
try{
 for(const width of widths){
  const {ctx,page,errors}=await startPage(width);
  let b=null;
  if(before){b=await measure(page,before,'before',width)}
  const a=await measure(page,after,'after',width);
  assert.equal(a.legacy.length,0,width+': orphan heading still present');
  assert.deepEqual(a.heroTitles,['گزارش‌های کل'],width+': canonical banner title changed');
  assert.equal(a.cards,6,width+': KPI count changed');
  assert.ok(a.sections.trend&&a.sections.today&&a.sections.sections&&a.sections.insights&&a.sections.activities,width+': reports sections missing');
  assert.ok(a.documentWidth<=a.viewport+4,width+': horizontal document overflow');
  const min=width<=700?8:12,max=width<=700?12:16;
  assert.ok(a.gap>=min-1&&a.gap<=max+1,width+': hero-to-KPIs gap '+a.gap+' outside ['+min+','+max+']');
  if(width<=700){
   assert.ok(a.header!==null,width+': real mobile header missing');
   assert.ok(a.headerToHero>=-2&&a.headerToHero<=9,width+': banner should start just below mobile header, actual '+a.headerToHero);
   assert.equal(a.mobileNav,7,width+': approved seven navigation entries changed');
   if(a.plot){assert.ok(a.plot.scrollExcess<=3,width+': mobile plot still scrolls horizontally '+JSON.stringify(a.plot));assert.ok(a.plot.svg.width<=a.plot.wrap.width+3,width+': mobile chart SVG exceeds its panel');}
   if(width>=360)assert.ok(a.cardRects.every(c=>c.height<=135),width+': KPI density regressed');
   if(width>=360)assert.ok(Math.abs(a.cardRects[0].top-a.cardRects[1].top)<=3,width+': mobile KPI rows no longer use two columns');
  }
  assert.ok(a.cardTextOverflow.every(o=>o.outer<=5),width+': KPI overflow outside card');
  assert.ok(a.lower&&a.lower.insightCount>=1,width+': insights or recent activities missing');
  if(a.lower.activityCount){
   assert.ok(a.lower.slack>=0&&a.lower.slack<=34,width+': recent activities have trailing blank space '+JSON.stringify(a.lower));
  }
  if(width>=1151)assert.ok(a.lower.height<=a.lower.leftHeight+4,width+': desktop activity panel stretched to unrelated column height');
  if(width<=700){
   assert.ok(a.lower.insightRects.every(r=>r.width<=a.kpis.width+2),width+': mobile insight overflows');
   assert.ok(a.lower.insightRects.every(r=>r.height>=44),width+': mobile insight touch target too small');
  }
  if(b){
   if(b.legacy.length)assert.ok(a.gap+30<b.gap,width+': legacy heading gap not released');
   else assert.ok(a.gap<=b.gap+1,width+': already-compact baseline regressed: before '+b.gap+' after '+a.gap);
   if(width<=700)assert.ok(a.headerToHero<=b.headerToHero+1,width+': banner moved lower on mobile');
  }
  assert.ok(!errors.some(x=>/reports-dashboard-01|feature-hubs-2026/i.test(x)),width+': new Reports console errors '+JSON.stringify(errors));
  if(width===390||width===1440){
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForSelector('#panel-reports:not(.hidden) .elara-reports-kpis',{timeout:40000});
   await page.locator('#panel-reports [data-reports-route="reports-today"]').first().click();
   await page.waitForSelector('#panel-reports-today:not(.hidden) .elara-reports-detail-head');
   await page.goBack({waitUntil:'domcontentloaded'});
   await page.waitForSelector('#panel-reports:not(.hidden) .elara-reports-kpis');
  }
  if(width===390||width===1440){
   const emptyState=await page.evaluate(()=>{
    const key='elara_space_v1',original=localStorage.getItem(key),state=JSON.parse(original||'{}');
    for(const name of ['tasks','taskCompletionHistory','focusSessions','books','habits'])state[name]=[];
    localStorage.setItem(key,JSON.stringify(state));
    window.ElaraReportsDashboard.render();
    const p=document.querySelector('#panel-reports .elara-reports-activities'),
      empty=p?.querySelector('.elara-reports-empty'),
      insight=document.querySelector('#panel-reports .elara-reports-insight-grid');
    const result={
      empty:!!empty,
      height:empty?.getBoundingClientRect().height||0,
      containerHeight:p?.getBoundingClientRect().height||0,
      insightButtons:insight?.querySelectorAll('button').length||0
    };
    if(original===null)localStorage.removeItem(key);else localStorage.setItem(key,original);
    window.ElaraReportsDashboard.render();
    return result;
   });
   assert.equal(emptyState.empty,true,width+': no-activity empty state absent');
   assert.ok(emptyState.height<=110,width+': no-activity empty placeholder too tall '+JSON.stringify(emptyState));
   assert.ok(emptyState.insightButtons>=1,width+': missing real-data-insufficient insight');
   console.log('REPORTS03_EMPTY_PASS '+width+' '+JSON.stringify(emptyState));
  }
  results.push({width,before:b&&{gap:b.gap,headerToHero:b.headerToHero,legacy:b.legacy.length},after:{gap:a.gap,headerToHero:a.headerToHero,legacy:a.legacy.length,cards:a.cards}});
  console.log('REPORTS01_COMPACT_PASS '+width+' gap='+a.gap+' headerToHero='+a.headerToHero);
  await ctx.close();
 }
 await writeFile(out+'/geometry.json',JSON.stringify({beforeURL:before,afterURL:after,results},null,2));
 console.log('REPORTS01_COMPACT_ALL_10_PASS');
}finally{await browser.close()}
