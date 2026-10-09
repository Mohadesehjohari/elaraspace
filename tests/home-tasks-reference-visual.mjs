import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.ELARA_CHROMIUM_EXECUTABLE?{executablePath:process.env.ELARA_CHROMIUM_EXECUTABLE}:{})});
const date=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
try{
 for(const [route,width,height] of [
 ['home',1672,941],['tasks',1672,941],
 ...[320,375,390,430,768,1440].flatMap(w=>[['home',w,w<701?850:900],['tasks',w,w<701?850:900]])
]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Isolate the public page's login overlay in a browser-only fixture.
  // The actual local Tasks/Home renderer, styling and persisted model remain real.
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraAccount={user:null,profile:{name:'مرجع الارا',username:'fixture_owner',xp:420,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true};window.dispatchEvent(new Event('elara:social-updated'));"}));
  await page.addInitScript(day=>{
   const make=(id,text,sourceGroup,priority,completed)=>({id,text,sourceGroup,priority:String(priority),completed,date:day,createdAt:Date.now(),list:'کارهای شخصی'});
   const d={version:1,xp:420,theme:'dark',taskLists:['کارهای شخصی'],folders:['درس'],tags:['زبان'],
     tasks:[make('fx1','مطالعه و مرور زبان انگلیسی','language',2,false),make('fx2','دانلود جزوهٔ ریاضی','',2,false),
       make('fx3','تمرین روزانهٔ ورزشی','exercise',3,false),make('fx4','عادت مطالعهٔ کتاب','habit',3,false),
       make('fx5','تکمیل مرحلهٔ هدف','goal',2,false),{...make('fx6','کتاب تمام‌شدهٔ دیروز','book',4,true),date:new Date(Date.now()-86400000).toLocaleDateString('en-CA'),doneAt:new Date(Date.now()-86400000).toLocaleDateString('en-CA')}],
     habits:[{id:'h1',title:'عادت تمرین صبحگاهی',days:[]}],
     goals:[{id:'g1',title:'هدف زبان در سه ماه',steps:[{id:'s1',text:'مرور واژه',done:true},{id:'s2',text:'تمرین',done:false}]},
       {id:'g2',title:'هدف مطالعه',steps:[{id:'s3',text:'شروع',done:false}]}],books:[],words:[]};
   localStorage.setItem('elara_space_v1',JSON.stringify(d));localStorage.setItem('elara_locale_v1','fa');
  },date());
  await page.goto(base+'/?visual_inventory='+route+'-'+width+'#'+route,{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&!!window.ElaraReferenceHome,null,{timeout:30000});
  await page.evaluate((route)=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');if(route==='home')window.ElaraReferenceHome?.render();window.ElaraOpen?.(route)},route);
  await page.waitForTimeout(450);
  if(route==='home'){
   const artwork=await page.evaluate(async()=>{
    const images=[...document.querySelectorAll('#ref-quick-access .ref-quick-icon')];
    await Promise.all(images.map(async img=>{img.loading='eager';try{await img.decode()}catch(_){}}));
    return images.map(img=>({src:img.getAttribute('src'),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
      width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height,
      display:getComputedStyle(img).display,opacity:getComputedStyle(img).opacity}));
   });
   assert.equal(artwork.length,6,'Exactly six real quick access icons required');
   assert.ok(artwork.every(img=>img.src?.startsWith('assets/ui/')&&img.naturalWidth>0&&img.naturalHeight>0&&img.width>=32&&img.height>=32&&img.display!=='none'&&Number(img.opacity)>0),
    'Owner WebP Quick Access icons must decode and visibly render: '+JSON.stringify(artwork));
   console.log('REFERENCE_QUICK_WEBP_DECODE_PASS '+width);
  }
  const selectors=route==='home'?['.topbar','.sidebar','.ref-home-grid','#ref-streak-card','.ref-quick-access-grid','.owner-home-hero','.owner-home-streak','.owner-home-goals','#ref-bottom-grid']:['.topbar','.sidebar','#panel-tasks','.astra-task-row','#astra-task-toolbar','.astra-task-hero','#astra-task-streak','#tasks-heading','.section-heading','.astra-task-insights'];
  const metrics=await page.evaluate((selectors)=>{const m={width:innerWidth,scrollWidth:document.documentElement.scrollWidth};for(const s of selectors){const el=document.querySelector(s);if(!el){m[s]=null;continue}const a=el.getBoundingClientRect(),cs=getComputedStyle(el);m[s]={x:Math.round(a.x),y:Math.round(a.y),width:Math.round(a.width),height:Math.round(a.height),display:cs.display,background:cs.backgroundImage?.slice(0,300)}}return m},selectors);
  if(route==='home')console.log('HOME_HERO_DIAGNOSTIC '+JSON.stringify(await page.evaluate(()=>{
 const p=document.querySelector('#panel-home'),h=p?.querySelector('.owner-home-hero'),b=document.querySelector('.topbar');
 const props=e=>{if(!e)return null;const s=getComputedStyle(e),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,height:s.height,marginTop:s.marginTop,paddingTop:s.paddingTop,top:s.top,transform:s.transform,position:s.position,display:s.display}};
 return {panel:props(p),hero:props(h),topbar:props(b),main:props(document.querySelector('#main')),loaded:[...document.styleSheets].map(x=>x.href||'inline').filter(x=>/home-owner-art|reference|midnight/.test(x))};
})));
  const fidelity=await page.evaluate(route=>{
    const p=document.querySelector(route==='home'?'#panel-home':'#panel-tasks'),visible=x=>!!x&&getComputedStyle(x).display!=='none';
    const rect=e=>e?e.getBoundingClientRect():null;
    if(route==='home'){
     const header=rect(document.querySelector('.topbar')),hero=rect(p.querySelector('.owner-home-hero'));
     const cards=['.owner-home-streak','.owner-home-tasks','.owner-home-wellness','.owner-home-goals'].map(x=>rect(p.querySelector(x)));
     const quick=[...p.querySelectorAll('#ref-quick-access .ref-quick-card')];
     return {headerBottom:header?.bottom,heroTop:hero?.top,heroHeight:hero?.height,main:cards.map(x=>x?{x:x.x,y:x.y,w:x.width,h:x.height}:null),
      quick:quick.length,quote:!!p.querySelector('#ref-home-quote-card'),
      doubleSummary:!!p.querySelector('#owner-home-summaries,.owner-home-daily'),
      gear:visible(document.querySelector('#ref-header-settings')),
      goals:[...p.querySelectorAll('#elara-home-goals .ref-goal-row')].map(x=>x.textContent),
      homeBackgrounds:['.owner-home-streak','.owner-home-tasks','.owner-home-wellness','.owner-home-goals','.ref-quick-language','.ref-quick-books','.ref-quick-social'].map(x=>getComputedStyle(p.querySelector(x)).backgroundImage),
      img:{hero:p.querySelector('.owner-home-hero-image')?.naturalWidth,flame:p.querySelector('.ref-streak-flame')?.naturalWidth}};
    }
    const rows=[...p.querySelectorAll('#task-list>.astra-task-row')];
    return {headerBottom:rect(document.querySelector('.topbar'))?.bottom,heroTop:rect(p.querySelector('.astra-task-hero'))?.top,
     heroHeight:rect(p.querySelector('.astra-task-hero'))?.height,
     heroBackground:getComputedStyle(p.querySelector('.astra-task-hero')).backgroundImage,
     toolbar:rect(p.querySelector('#astra-task-toolbar'))?.height,rows:rows.length,
     rowSamples:rows.slice(0,8).map(x=>({src:x.dataset.taskSource,background:getComputedStyle(x).backgroundImage,
       checked:x.querySelector('.check-button')?.getAttribute('aria-pressed'),
       checkWidth:x.querySelector('.check-button')?.getBoundingClientRect().width,
       titleFont:x.querySelector('.item-title')?parseFloat(getComputedStyle(x.querySelector('.item-title')).fontSize):0,
       statusFont:x.querySelector('.astra-task-status')?parseFloat(getComputedStyle(x.querySelector('.astra-task-status')).fontSize):0,
       checkArt:x.querySelector('.check-button')?getComputedStyle(x.querySelector('.check-button')).backgroundImage:'',
       status:getComputedStyle(x.querySelector('.astra-task-status')).display,
       title:x.querySelector('.item-title')?.textContent,
       titleWhiteSpace:x.querySelector('.item-title')?getComputedStyle(x.querySelector('.item-title')).whiteSpace:'',
       w:rect(x)?.width,h:rect(x)?.height
     })),toolbarActions:!!p.querySelector('#elara-task-add-main'),
     navTasks:!!document.querySelector('.sidebar [data-elara-tab="tasks"].active,.bottom-nav [data-elara-tab="tasks"].active'),
     richRows:rows.some(x=>x.classList.contains('source-language'))&&rows.some(x=>x.classList.contains('source-exercise'))};
  },route);
  console.log('FIDELITY_METRIC '+JSON.stringify({route,width,fidelity}));
  if(route==='home'){
    assert.equal(fidelity.quick,6,'Home must contain six canonical quick links');
    assert.equal(fidelity.quote,false,'Quote forbidden');
    assert.equal(fidelity.doubleSummary,false,'Extra Home summaries forbidden');
    assert.equal(fidelity.gear,false,'Settings gear forbidden');
    assert.equal(fidelity.main.length,4,'Exactly four primary cards');
    assert.ok(fidelity.homeBackgrounds.every(x=>x.includes('assets/ui/')),'Some Home uploaded artwork missing');
    assert.ok(fidelity.img.hero>0&&fidelity.img.flame>0,'Home hero/flame did not decode');
    if(width>=1001){
      assert.ok(fidelity.heroTop>=fidelity.headerBottom-3&&fidelity.heroTop<=fidelity.headerBottom+8,'Desktop Home artwork must start below the clear header at '+width);
      assert.ok(fidelity.heroHeight>=185&&fidelity.heroHeight<=215,'Home artwork proportions incorrect at '+width);
      assert.ok(Math.max(...fidelity.main.map(x=>x.y))-Math.min(...fidelity.main.map(x=>x.y))<4,'Four Home cards not in same row at '+width);
    }
  }else{
    assert.ok(fidelity.heroBackground.includes('task-header-banner-bg.webp'),'Tasks panoramic owner art missing');
    assert.ok(width<=700
      ? fidelity.heroTop>=fidelity.headerBottom-3&&fidelity.heroTop<=fidelity.headerBottom+8
      : fidelity.heroTop>=fidelity.headerBottom-3&&fidelity.heroTop<=fidelity.headerBottom+8,
      'Tasks hero must start below the real header without a dark overlay');
    assert.ok(fidelity.rows>=5,'Tasks fixture missing canonical items');
    assert.equal(fidelity.toolbarActions,true,'Add Task button absent');
    assert.equal(fidelity.richRows,true,'source-specific real tasks lost');
    assert.ok(fidelity.rowSamples.some(x=>x.background.includes('task-mountain-bg.webp')),'Task mountain art not used');
    assert.ok(fidelity.rowSamples.every(x=>x.status!=='none'),'Task state badges hidden');
    assert.ok(fidelity.rowSamples.every(x=>x.titleWhiteSpace!=='nowrap'),'Task title clipping regression');
    assert.equal(fidelity.navTasks,true,'Tasks navigation not active');
    if(width>=1400){
      assert.ok(fidelity.rowSamples.every(x=>x.h>=80),'Tasks rows visually undersized vs owner reference: '+JSON.stringify(fidelity.rowSamples.map(x=>x.h)));
      assert.ok(fidelity.rowSamples.every(x=>x.checkWidth>=38),'Task completion boxes too small vs owner reference');
      assert.ok(fidelity.rowSamples.every(x=>x.titleFont>=16),'Persian Tasks titles smaller than reference readability threshold');
      assert.ok(fidelity.rowSamples.every(x=>x.statusFont>=11),'Tasks status labels too small');
    }
  }
    console.log('VISUAL_INVENTORY '+JSON.stringify({route,width,metrics,errors}));
  assert.ok(metrics.scrollWidth<=width+5,'viewport overflows '+route+width);
  await page.screenshot({path:'browser-artifacts/fidelity-baseline-'+route+'-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.close();
 }
  const gallery=await browser.newPage({viewport:{width:1280,height:900}});
  await gallery.goto(base+'/?asset_gallery=1',{waitUntil:'domcontentloaded'});
  const names=['nav-home-default','nav-home-active','nav-tasks-default','nav-tasks-active','11-tasks-nav-default','12-tasks-nav-active','nav-library-default','01-library-nav-default','nav-language-default','07-language-nav-default','03-wellness-nav-default','04-wellness-nav-active','09-friends-nav-default','friends_normal','friend_active','13-freedom-nav-default','reports-nav-inactive','blog-nav-inactive','store-nav-inactive','task-header-banner-bg','hero-tasks-astra-v2','task-mountain-bg','tick','tick_fraim','Empy_tick','icon-tasks-check-alpha'];
  await gallery.setContent('<style>body{background:#06142b;color:white;font:14px system-ui}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.item{border:1px solid #498;padding:8px;border-radius:10px;text-align:center;word-break:break-all;display:grid;justify-items:center}.item img{width:115px;height:95px;object-fit:contain}</style><div class=grid>'+names.map(n=>'<div class=item><img src="'+base+'/assets/ui/'+n+'.webp"><span>'+n+'</span></div>').join('')+'</div>');
  await gallery.waitForTimeout(600);
  await gallery.screenshot({path:'browser-artifacts/fidelity-baseline-asset-gallery.png',fullPage:true});
  await gallery.close();
}finally{await browser.close()}
console.log('FIDELITY_BASELINE_CAPTURES_PASS');
