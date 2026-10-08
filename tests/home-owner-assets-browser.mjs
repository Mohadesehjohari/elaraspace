import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const sizes=[320,375,390,430,768,1440];
const required={
 hero:'homebanner1.webp',
 tasks:'tasks-card-background.webp',
 goals:'goals-target-background.webp',
 daily:'daily-banner-bg.webp',
 streak:'daily-streak-background.webp',
 wellness:'health-fitness-card-background.webp',
 language:'language-learning-background.webp',
 library:'library-card-background.webp',
 friends:'friends-card-bg.webp',
 ranking:'friends-ranking-bg.webp',
 focus:'pomodoro-icon.webp'
};
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of sizes){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],failures=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(/\/assets\/ui\/.*\.webp/.test(r.url())&&r.status()>=400)failures.push(r.url()+' status='+r.status())});
  await page.addInitScript(()=>{
   const now=new Date(),d=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
   localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:420,
    tasks:[{id:'owner-art-task-a',text:'مهم: مطالعه و مرور واقعی پروژه',date:d,priority:'2',completed:false,createdAt:Date.now()}],
    habits:[{id:'owner-art-habit-a',title:'تمرین روزانه',days:[],rewardDays:[]}],
    goals:[{id:'owner-art-goal-a',title:'هدف واقعی: پیشرفت زبان',horizon:'short',steps:[{id:'owner-step-a',text:'مرور ۲۰ واژه',done:false}]}],
    books:[{id:'owner-book-a',title:'کتاب واقعی آزمون',shelf:'reading',totalPages:250,currentPage:44}],
    words:[{id:'word-a',front:'hello',back:'سلام'},{id:'word-b',front:'world',back:'دنیا'}]
   }));
  });
  await page.goto(base+'/?owner-home-art='+width+'#home',{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&!!window.ElaraOwnerHomeArtwork&&!!window.ElaraReferenceHome,null,{timeout:30000});
  await page.evaluate(()=>{window.ElaraReferenceHome.render();window.ElaraOwnerHomeArtwork.refresh()});
  await page.waitForFunction(()=>{
   const hero=document.querySelector('#panel-home .owner-home-hero-image');
   return hero&&hero.complete&&hero.naturalWidth>0&&document.querySelector('#owner-home-summaries')&&document.querySelector('#panel-home .owner-home-wellness');
  },null,{timeout:25000});
  const metrics=await page.evaluate(()=>{
   const panel=document.getElementById('panel-home');
   const rect=s=>{const x=panel.querySelector(s);if(!x)return null;const r=x.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,scroll:x.scrollHeight,client:x.clientHeight,display:getComputedStyle(x).display,background:getComputedStyle(x).backgroundImage}};
   const checks={
    hero:rect('.owner-home-hero'),
    tasks:rect('.owner-home-tasks'),goals:rect('.owner-home-goals'),
    wellness:rect('.owner-home-wellness'),streak:rect('.owner-home-streak'),
    ranking:rect('.owner-home-ranking'),daily:rect('.owner-home-daily'),
    language:rect('.owner-home-language'),library:rect('.owner-home-library'),
    friends:rect('.owner-home-friends'),focus:rect('.owner-home-focus')
   };
   const img=panel.querySelector('.owner-home-hero-image');
   const icon=panel.querySelector('.owner-home-goal-icon');
   const focusIcon=panel.querySelector('.owner-home-focus-art');
   const all=Object.values(checks).filter(Boolean);
   const existing=[...panel.querySelectorAll('.ref-task-row,.ref-habit-row,.ref-goal-row')].map(x=>x.textContent||'').join(' | ');
   const title=panel.querySelector('.hero-copy h1');
   const dynamicData=Object.fromEntries([...panel.querySelectorAll('[data-owner-summary]')].map(x=>[x.dataset.ownerSummary,x.textContent]));
   const quote=document.querySelector('#ref-home-quote-card');
   return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
    images:{hero:{src:img.getAttribute('src'),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
      objectFit:getComputedStyle(img).objectFit,position:getComputedStyle(img).objectPosition,drawn:img.getBoundingClientRect().height},
     goal:{src:icon?.getAttribute('src'),naturalWidth:icon?.naturalWidth},
     focus:{src:focusIcon?.getAttribute('src'),naturalWidth:focusIcon?.naturalWidth}},
    checks,existing,dynamicData,title:title?.textContent,
    quoteVisible:!!quote&&getComputedStyle(quote).display!=='none',
    settingsGear:!!document.querySelector('#ref-header-settings'),
    tooNarrow:all.some(x=>x.w<80),
    overflowCards:all.some(x=>x.right>innerWidth+4||x.left< -4),
    hiddenButtons:[...panel.querySelectorAll('button')].filter(x=>{
      const s=getComputedStyle(x),rect=x.getBoundingClientRect();
      if(s.display==='none'||s.visibility==='hidden'||x.offsetParent===null)return false;
      return rect.width<5||rect.height<5;
    }).length
   };
  });
  for(const [key,path] of Object.entries(required)){
   if(key==='hero'||key==='focus')continue;
   const m=metrics.checks[key];
   assert.ok(m,'Home missing '+key+' card at '+width);
   assert.ok(m.background.includes(path),'Real '+key+' WebP not computed on Home at '+width+': '+m.background);
  }
  assert.equal(metrics.images.hero.src,'assets/ui/'+required.hero,'Hero src mismatch');
  assert.ok(metrics.images.hero.naturalWidth>0&&metrics.images.hero.drawn>0,'Hero image not actually decoded/rendered');
  assert.equal(metrics.images.hero.objectFit,'cover','Hero must retain aspect ratio');
  assert.ok(metrics.images.goal.naturalWidth>0,'Goal icon did not load');
  assert.ok(metrics.images.focus.naturalWidth>0,'Pomodoro icon did not load');
  assert.ok(metrics.checks.focus.background.includes('gradient'),'Focus card missing');
  assert.ok(metrics.dynamicData.language.includes('۲'),'Word counter must reflect two seeded words');
  assert.ok(metrics.dynamicData.library.includes('کتاب واقعی آزمون'),'Real reading book must render');
  assert.ok(metrics.existing.includes('مطالعه')&&metrics.existing.includes('تمرین')&&metrics.existing.includes('هدف واقعی'),'Real task/habit/goal rows lost: '+metrics.existing);
  assert.equal(metrics.quoteVisible,false,'Home Quote must not be visible');
  assert.equal(metrics.settingsGear,false,'Home top header Settings gear forbidden');
  assert.ok(metrics.width+2>=metrics.documentWidth,'document horizontal overflow '+width+' '+JSON.stringify(metrics));
  if(metrics.bodyWidth>metrics.width+2)console.log('HOME_OVERFLOW_DIAGNOSTICS '+JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&(r.left < -5||r.right>innerWidth+5||r.width>innerWidth+5)}).slice(0,35).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cl:String(el.className).slice(0,90),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),position:getComputedStyle(el).position}}))));
  assert.ok(metrics.width+2>=metrics.bodyWidth,'body horizontal overflow '+width);
  assert.equal(metrics.overflowCards,false,'card geometry exceeds viewport at '+width);
  if(metrics.tooNarrow)console.log('HOME_NARROW_DIAGNOSTICS '+JSON.stringify(Object.entries(metrics.checks).filter(([key,v])=>v&&v.w<80)));
  if(metrics.tooNarrow)console.log('HOME_GRID_LAYOUT_DIAGNOSTICS '+JSON.stringify(await page.evaluate(()=>{
   const panel=document.querySelector('#panel-home');const grid=panel.querySelector('.ref-home-grid'),task=panel.querySelector('.owner-home-tasks'),w=panel.querySelector('.owner-home-wellness');
   const snap=e=>e?{rect:{x:e.getBoundingClientRect().x,w:e.getBoundingClientRect().width},css:{display:getComputedStyle(e).display,width:getComputedStyle(e).width,columns:getComputedStyle(e).gridTemplateColumns,areas:getComputedStyle(e).gridTemplateAreas,area:getComputedStyle(e).gridArea,column:getComputedStyle(e).gridColumn},style:e.getAttribute('style')}:null;
   return {panel:snap(panel),grid:snap(grid),task:snap(task),wellness:snap(w),children:[...grid.children].filter(e=>getComputedStyle(e).display!=='none').map(e=>({id:e.id,cl:e.className,w:e.getBoundingClientRect().width,area:getComputedStyle(e).gridArea,cols:getComputedStyle(e).gridColumn}))};
  })));
  assert.equal(metrics.tooNarrow,false,'collapsed card at '+width);
  assert.equal(metrics.hiddenButtons,0,'visible Home buttons with zero hitbox at '+width);
  assert.deepEqual(errors,[],'Critical page errors '+width);
  assert.deepEqual(failures,[],'Broken WebP requests '+width);
  await page.screenshot({path:'browser-artifacts/home-owner-art-'+width+'.png',fullPage:true,animations:'disabled'});
  console.log('HOME_OWNER_ASSETS_PASS '+JSON.stringify({width,hero:required.hero,cards:Object.keys(metrics.checks),data:metrics.dynamicData,overflow:false,errors:0}));
  await context.close();
 }
}finally{await browser.close()}
console.log('HOME_OWNER_ART_MATRIX_PASS 320 375 390 430 768 1440');
