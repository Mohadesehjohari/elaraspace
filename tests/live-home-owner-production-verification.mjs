import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium,request} from 'playwright';
const sha='dd590d08ffef6c24b02889b5f7481dcdc808f19b';
const base='https://mohadesehjohari.github.io/elaraspace/';
const files=[
 'index.html','boot.js','home-owner-art-2026.js','home-owner-art-2026.css',
 ...['homebanner1','tasks-card-background','goals-target-background','my-goals-icon','daily-banner-bg','daily-streak-background','streak-flame','health-fitness-card-background','language-learning-background','library-card-background','friends-card-bg','friends-ranking-bg','pomodoro-icon'].map(s=>'assets/ui/'+s+'.webp')
];
const net=await request.newContext({ignoreHTTPSErrors:false});
try{
 for(const file of files){
  const response=await net.get(base+file+'?verify_merge='+sha,{timeout:60000});
  assert.equal(response.status(),200,'Production did not serve '+file+' HTTP='+response.status());
  const live=await response.body(),committed=readFileSync(file);
  assert.ok(live.equals(committed),'LIVE PRODUCTION FILE IS NOT MERGED CONTENT: '+file+', bytes '+live.length+' != '+committed.length);
  console.log('LIVE_EXACT_MERGE_FILE_PASS '+file+' bytes='+live.length);
 }
}finally{await net.dispose()}
mkdirSync('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,375,390,430,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],badAssets=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('response',res=>{if(/\/assets\/ui\//.test(res.url())&&res.status()>=400)badAssets.push(res.url()+':'+res.status())});
  await page.goto(base+'?home_live='+sha+'-'+width+'#home',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&window.ElaraOwnerHomeArtwork&&window.ElaraReferenceHome&&document.querySelector('.owner-home-hero-image'),null,{timeout:45000});
  await page.waitForFunction(()=>{const img=document.querySelector('.owner-home-hero-image');return img?.complete&&img.naturalWidth>0&&document.querySelector('#ref-header-account .ref-account-copy strong')},null,{timeout:20000});
  const m=await page.evaluate(()=>{
   const $=s=>document.querySelector(s),r=s=>{const e=$(s);if(!e)return null;const b=e.getBoundingClientRect(),cs=getComputedStyle(e);return {x:b.x,y:b.y,w:b.width,h:b.height,display:cs.display,visibility:cs.visibility}};
   const selectors={'name':'#ref-header-account .ref-account-copy strong','avatar':'#ref-header-account .ref-account-avatar','bell':'#ref-header-notifications','theme':'#theme-toggle'};
   const positions=Object.fromEntries(Object.entries(selectors).map(([k,v])=>[k,r(v)]));
   const hero=$('.owner-home-hero-image');
   const owner=$('#panel-home.owner-art-home');
   const media=[
    ['tasks','.owner-home-tasks','tasks-card-background.webp'],
    ['goals','.owner-home-goals','goals-target-background.webp'],
    ['daily','.owner-home-daily','daily-banner-bg.webp'],
    ['streak','.owner-home-streak','daily-streak-background.webp'],
    ['wellness','.owner-home-wellness','health-fitness-card-background.webp'],
    ['language','.owner-home-language','language-learning-background.webp'],
    ['library','.owner-home-library','library-card-background.webp'],
    ['friends','.owner-home-friends','friends-card-bg.webp'],
    ['ranking','.owner-home-ranking','friends-ranking-bg.webp']
   ].map(([name,selector,file])=>({name,file,exists:!!$(selector),background:$(selector)?getComputedStyle($(selector)).backgroundImage:''}));
   const activeButtons=[...document.querySelectorAll('#panel-home button')].filter(e=>e.offsetParent!==null&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden');
   const zeroButtons=activeButtons.filter(e=>{const b=e.getBoundingClientRect();return b.width<5||b.height<5}).map(e=>({cls:e.className,html:e.outerHTML.slice(0,180)}));
   const clipped=[...document.querySelectorAll('#panel-home .ref-task-row strong,#panel-home .ref-habit-row strong,#panel-home .ref-goal-main strong')].filter(e=>e.offsetParent!==null&&(getComputedStyle(e).whiteSpace==='nowrap'||e.scrollWidth>e.clientWidth+3)).map(e=>e.textContent?.slice(0,90));
   return {
    width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,owner:!!owner,hash:location.hash,
    hero:{src:hero?.getAttribute('src'),naturalWidth:hero?.naturalWidth,objectFit:hero?getComputedStyle(hero).objectFit:null},
    goalIcon:$('.owner-home-goal-icon')?.naturalWidth||0,focusIcon:$('.owner-home-focus-art')?.naturalWidth||0,
    media,positions,zeroButtons,clipped,
    quoteVisible:!!$('#ref-home-quote-card')&&getComputedStyle($('#ref-home-quote-card')).display!=='none',
    settingsVisible:!!$('#ref-header-settings')&&getComputedStyle($('#ref-header-settings')).display!=='none',
    profile:typeof window.ElaraProfileSystem?.avatarShell==='function',
    dataPaths:typeof window.ElaraReferenceHome.render==='function'&&typeof window.ElaraTasks?.taskAction==='function',
   };
  });
  console.log('LIVE_HOME_HEADER_DIAGNOSTICS '+JSON.stringify({width,positions:m.positions}));
  await page.screenshot({path:'browser-artifacts/live-home-owner-'+width+'.png',fullPage:true,animations:'disabled'});
  assert.equal(m.owner,true,'Live owner Home mounting missing '+width);
  assert.equal(m.hash,'#home','Production did not open Home '+width);
  assert.ok(m.hero.naturalWidth>0&&m.hero.src==='assets/ui/homebanner1.webp','Real merged hero missing '+width);
  assert.equal(m.hero.objectFit,'cover','Hero stretching '+width);
  assert.ok(m.goalIcon>0&&m.focusIcon>0,'Goals/Pomodoro icon did not decode '+width);
  for(const c of m.media)assert.ok(c.exists&&c.background.includes(c.file),'Live card '+c.name+' not actually rendering '+c.file+' at '+width);
  assert.ok(m.scrollWidth<=width+2&&m.bodyScrollWidth<=width+2,'Live Home horizontal overflow '+width+' '+JSON.stringify(m));
  assert.deepEqual(m.zeroButtons,[],'Zero-size visible important buttons '+width);
  assert.deepEqual(m.clipped,[],'Clipped Persian task/habit/goal text '+width);
  assert.equal(m.quoteVisible,false,'Quote on Home '+width);
  assert.equal(m.settingsVisible,false,'Settings gear on Home '+width);
  assert.equal(m.profile,true,'Profile/Username bootstrap absent '+width);
  assert.equal(m.dataPaths,true,'Task data renderer not installed '+width);
  for(const key of ['name','avatar','bell','theme'])assert.ok(m.positions[key],key+' missing from header '+width);
  assert.deepEqual(errors,[],'Critical production JavaScript error '+width);
  assert.deepEqual(badAssets,[],'Broken production image '+width);
  console.log('LIVE_HOME_WIDTH_PASS '+JSON.stringify({width,hero:'homebanner1.webp',cardAssets:m.media.length,overflow:0,errors:0}));
  if(width===390){
    const social=await page.evaluate(async()=>{
      await window.ElaraLoadSocial();
      return {core:typeof window.ElaraSocial?.groups?.create==='function'&&typeof window.ElaraSocial?.clubs?.create==='function'&&typeof window.ElaraSocial?.challenges?.create==='function',guard:!!window.ElaraSocial?.socialCutover};
    });
    assert.equal(social.core,true,'Live Social Core services unavailable');
    assert.equal(social.guard,false,'Social cutover guard wrongly active');
    console.log('LIVE_SOCIAL_POSTMERGE_PASS');
  }
  await context.close();
 }
}finally{await browser.close()}
console.log('LIVE_HOME_PRODUCTION_PASS sha='+sha+' URL='+base+' widths=320,375,390,430,768,1440');
