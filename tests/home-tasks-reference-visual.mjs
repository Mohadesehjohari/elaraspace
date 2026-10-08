import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const date=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
try{
 for(const [route,width,height] of [['home',1672,941],['tasks',1672,941],['home',1440,900],['tasks',1440,900],['tasks',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(day=>{
   const make=(id,text,sourceGroup,priority,completed)=>({id,text,sourceGroup,priority:String(priority),completed,date:day,createdAt:Date.now(),list:'کارهای شخصی'});
   const d={version:1,xp:420,theme:'dark',taskLists:['کارهای شخصی'],folders:['درس'],tags:['زبان'],
     tasks:[make('fx1','مطالعه و مرور زبان انگلیسی','language',2,false),make('fx2','دانلود جزوهٔ ریاضی','',2,false),
       make('fx3','تمرین روزانهٔ ورزشی','exercise',3,false),make('fx4','عادت مطالعهٔ کتاب','habit',3,false),
       make('fx5','تکمیل مرحلهٔ هدف','goal',2,false),make('fx6','کتاب تمام‌شدهٔ امروز','book',4,true)],
     habits:[{id:'h1',title:'عادت تمرین صبحگاهی',days:[]}],
     goals:[{id:'g1',title:'هدف زبان در سه ماه',steps:[{id:'s1',text:'مرور واژه',done:true},{id:'s2',text:'تمرین',done:false}]},
       {id:'g2',title:'هدف مطالعه',steps:[{id:'s3',text:'شروع',done:false}]}],books:[],words:[]};
   localStorage.setItem('elara_space_v1',JSON.stringify(d));
  },date());
  await page.goto(base+'/?visual_inventory='+route+'-'+width+'#'+route,{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&!!window.ElaraReferenceHome,null,{timeout:30000});
  await page.evaluate((route)=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');if(route==='home')window.ElaraReferenceHome?.render();window.ElaraOpen?.(route)},route);
  await page.waitForTimeout(450);
  const selectors=route==='home'?['.topbar','.sidebar','.ref-home-grid','#ref-streak-card','.ref-quick-access-grid','.owner-home-hero']:['.topbar','.sidebar','#panel-tasks','.astra-task-row','#astra-task-toolbar','#astra-task-streak','#tasks-heading','.section-heading','.astra-task-insights'];
  const metrics=await page.evaluate((selectors)=>{const m={width:innerWidth,scrollWidth:document.documentElement.scrollWidth};for(const s of selectors){const el=document.querySelector(s);if(!el){m[s]=null;continue}const a=el.getBoundingClientRect(),cs=getComputedStyle(el);m[s]={x:Math.round(a.x),y:Math.round(a.y),width:Math.round(a.width),height:Math.round(a.height),display:cs.display,background:cs.backgroundImage?.slice(0,300)}}return m},selectors);
  console.log('VISUAL_INVENTORY '+JSON.stringify({route,width,metrics,errors}));
  assert.ok(metrics.scrollWidth<=width+5,'viewport overflows '+route+width);
  await page.screenshot({path:'browser-artifacts/fidelity-baseline-'+route+'-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.close();
 }
}finally{await browser.close()}
console.log('FIDELITY_BASELINE_CAPTURES_PASS');
