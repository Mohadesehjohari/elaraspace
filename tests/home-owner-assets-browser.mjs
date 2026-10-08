import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const widths=[320,375,390,430,768,1440];
const goals=['هدف سه‌ماههٔ ستاره','هدف یادگیری ژاپنی','هدف مطالعهٔ پژوهشی'];
const habits=['عادت تمرین صبحگاهی','عادت مراقبهٔ شبانه'];
const assets={
 hero:'homebanner1.webp',tasks:'tasks-card-background.webp',
 goals:'goals-target-background.webp',streak:'daily-streak-background.webp',
 wellness:'health-fitness-card-background.webp',ranking:'friends-ranking-bg.webp',
 language:'language-learning-background.webp',library:'library-card-background.webp',friends:'friends-card-bg.webp'
};
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],imageErrors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(/\/assets\/ui\/.*\.webp/.test(r.url())&&r.status()>=400)imageErrors.push(r.url()+':'+r.status())});
  await page.addInitScript(({goals,habits})=>{
   const now=new Date(),d=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
   localStorage.setItem('elara_space_v1',JSON.stringify({
    version:1,xp:420,taskCompletionHistory:[],
    tasks:[{id:'task-home',text:'تسک واقعی با عنوان چندخطی فارسی برای بررسی کامل خوانایی',date:d,priority:'2',completed:false,createdAt:Date.now()}],
    habits:habits.map((title,i)=>({id:'habit-'+i,title,days:[],rewardDays:[]})),
    goals:goals.map((title,i)=>({id:'goal-'+i,title,horizon:'short',steps:[{id:'step-'+i,text:'قدم مرتبط با هدف',done:i===1},{id:'other-'+i,text:'قدم بعدی',done:false}]}))
   }));
  },{goals,habits});
  await page.goto(base+'/?layout_fidelity='+width+'#home',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&!!window.ElaraReferenceHome&&!!window.ElaraOwnerHomeArtwork,null,{timeout:30000});
  await page.evaluate(()=>{window.ElaraReferenceHome.render();window.ElaraOwnerHomeArtwork.refresh()});
  await page.waitForFunction(()=>{
   const img=document.querySelector('#panel-home .owner-home-hero-image');
   return img?.complete&&img.naturalWidth>0&&document.querySelectorAll('#panel-home #elara-home-goals .ref-goal-row').length===3;
  },null,{timeout:25000});
  const m=await page.evaluate(()=>{
   const panel=document.getElementById('panel-home');
   const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);
     return {x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height,display:s.display,visibility:s.visibility,background:s.backgroundImage}};
   const q=s=>panel.querySelector(s);
   const hero=q('.owner-home-hero'),grid=q('.ref-home-grid'),quick=q('#ref-quick-access'),bottom=q('#ref-bottom-grid');
   const selectors={streak:'.owner-home-streak',tasks:'.owner-home-tasks',wellness:'.owner-home-wellness',goals:'.owner-home-goals',ranking:'.owner-home-ranking',
     language:'.ref-quick-language',library:'.ref-quick-books',friends:'.ref-quick-social'};
   const cards=Object.fromEntries(Object.entries(selectors).map(([key,s])=>[key,rect(q(s))]));
   const mainVisible=[...grid.children].filter(e=>{const r=rect(e);return r.display!=='none'&&r.visibility!=='hidden'&&r.w>4&&r.h>4})
     .map(e=>({id:e.id,cl:e.className,area:getComputedStyle(e).gridArea}));
   const goalRows=[...q('#elara-home-goals').querySelectorAll('.ref-goal-row')].map(e=>({
      title:e.querySelector('.ref-goal-main strong')?.textContent,
      width:e.querySelector('.ref-goal-main')?.getBoundingClientRect().width,
      progress:e.querySelector('.ref-goal-main .elara-track i')?.style.width,
      step:e.querySelector('[data-home-goal-step]')?.dataset.homeGoalStep||e.querySelector('[data-goal-id]')?.dataset.homeGoalStep
   }));
   const habitRows=[...q('#elara-home-habits').querySelectorAll('.ref-habit-row')].map(e=>e.textContent);
   const quickCards=[...q('#ref-quick-access .ref-quick-card')].map(e=>e.dataset.elaraTab);
   const heroImg=q('.owner-home-hero-image');
   const computedImages={hero:{src:heroImg?.getAttribute('src'),naturalWidth:heroImg?.naturalWidth,fit:heroImg?getComputedStyle(heroImg).objectFit:null},
     icon:q('.owner-home-goal-icon')?.naturalWidth||0,flame:q('.ref-streak-flame')?.naturalWidth||0};
   const clicked=[...panel.querySelectorAll('button')].filter(e=>e.offsetParent!==null&&getComputedStyle(e).visibility!=='hidden')
     .filter(e=>{const r=e.getBoundingClientRect();return r.width<5||r.height<5}).map(e=>e.outerHTML.slice(0,100));
   const quotes=!!q('#ref-home-quote-card');
   const text=panel.textContent||'';
   return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
      order:[...panel.children].map(e=>e.id||e.className),
      hero:rect(hero),grid:rect(grid),quick:rect(quick),bottom:rect(bottom),cards,mainVisible,quickCards,goalRows,habitRows,computedImages,
      summary:!!q('#owner-home-summaries'),daily:!!q('.owner-home-daily'),phrase:text.includes('نگاهی به جهان تو'),
      quote:quotes,settings:!!document.getElementById('ref-header-settings'),quickCount:panel.querySelectorAll('#ref-quick-access').length,
      duplicateQuickTitles:[...panel.querySelectorAll('h2')].filter(x=>x.textContent.includes('ورود سریع به بخش‌ها')).length,
      zeroButtons:clicked,actualTasks:q('#elara-home-tasks')?.textContent||'',clipped:[...panel.querySelectorAll('.ref-task-row strong,.ref-habit-row strong,.ref-goal-main strong')].filter(e=>e.offsetParent!==null&&(getComputedStyle(e).whiteSpace==='nowrap'||e.scrollWidth>e.clientWidth+3)).map(e=>e.textContent),
   };
  });
  assert.equal(m.summary,false,'Accidental #owner-home-summaries exists');
  assert.equal(m.daily,false,'Accidental full-width Daily banner exists');
  assert.equal(m.phrase,false,'Accidental heading exists');
  assert.equal(m.quote,false,'Home Quote must stay absent');
  assert.equal(m.settings,false,'Header Settings gear must stay absent');
  assert.equal(m.quickCount,1,'One canonical Quick Access only');
  assert.equal(m.duplicateQuickTitles,1,'Duplicate quick access heading');
  assert.deepEqual(m.quickCards,['tasks','language','books','exercise','social','freedom'],'Quick Access routes must remain canonical');
  assert.equal(m.mainVisible.length,4,'Exactly four visible canonical cards expected: '+JSON.stringify(m.mainVisible));
  assert.deepEqual(m.mainVisible.map(x=>x.area),['streak','tasks','wellness','goals'],'Main four-card canonical order changed');
  assert.ok(m.hero.bottom<=m.grid.top+3,'Hero must precede the main card row');
  assert.ok(m.grid.bottom<=m.quick.top+3,'Quick Access must immediately follow the main row');
  assert.ok(m.quick.bottom<=m.bottom.top+3,'Bottom cards must follow Quick Access');
  for(const [key,name] of Object.entries(assets)){
    if(key==='hero')continue;
    assert.ok(m.cards[key]?.background.includes(name),'Real owner artwork not shown: '+key+' '+width);
  }
  assert.equal(m.computedImages.hero.src,'assets/ui/'+assets.hero);
  assert.ok(m.computedImages.hero.naturalWidth>0&&m.computedImages.icon>0&&m.computedImages.flame>0,'Hero/Goals/Streak asset not decoded '+width);
  assert.equal(m.computedImages.hero.fit,'cover','Hero distorted');
  assert.deepEqual(m.goalRows.map(x=>x.title),goals,'Goals card did not use exactly 3 real Goal records');
  for(const h of habits)assert.ok(!m.goalRows.some(g=>g.title?.includes(h)),'Habit leaked into Goals');
  assert.ok(m.habitRows.some(x=>x.includes(habits[0]))&&m.habitRows.some(x=>x.includes(habits[1])),'Habits must remain in separate Habits section');
  assert.ok(m.goalRows.every(x=>x.width>15&&/^\d+%$/.test(x.progress||'')),'Goal progress/readability broken');
  assert.ok(m.actualTasks.includes('تسک واقعی'),'Real Task data path no longer renders');
  assert.ok(m.documentWidth<=width+2&&m.bodyWidth<=width+2,'Horizontal overflow '+width+' '+JSON.stringify(m));
  assert.deepEqual(m.zeroButtons,[],'Zero size important buttons '+width);
  assert.deepEqual(m.clipped,[],'Clipped Persian content '+width);
  assert.deepEqual(errors,[],'Critical browser pageerrors '+width);
  assert.deepEqual(imageErrors,[],'Broken owner WebP paths '+width);
  if(width===1440){
    const row=['streak','tasks','wellness','goals'].map(x=>m.cards[x]);
    assert.ok(row.every(x=>x&&x.display!=='none'),'All 4 visible in desktop row');
    assert.ok(Math.max(...row.map(x=>x.top))-Math.min(...row.map(x=>x.top))<=4,'Four cards not on same top row');
    assert.ok(Math.max(...row.map(x=>x.bottom))-Math.min(...row.map(x=>x.bottom))<=5,'Four card bottoms not aligned');
    assert.ok(row.every(x=>x.h<=310&&x.h>=170),'Giant cards exceed reference compact height');
    for(let i=1;i<row.length;i++)assert.ok(row[i].left>row[i-1].left,'Desktop left-right card order violated');
    assert.equal(m.bottom!==null,true,'Bottom row missing');
    console.log('HOME_REFERENCE_STRUCTURE_PASS four_aligned=1 quick_access=single goals=3 habits=separate');
  }
  await page.screenshot({path:'browser-artifacts/home-reference-'+width+'.png',fullPage:true,animations:'disabled'});
  console.log('HOME_REFERENCE_WIDTH_PASS '+JSON.stringify({width,main:m.mainVisible.map(x=>x.area),goals:m.goalRows.map(x=>x.title),overflow:false}));
  await context.close();
 }
}finally{await browser.close()}
console.log('HOME_REFERENCE_MATRIX_PASS 320 375 390 430 768 1440');
