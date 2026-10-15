import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const cloud="window.ElaraAccount={user:{uid:'freedom-r33-qa',emailVerified:true},profile:{uid:'freedom-r33-qa'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'freedom-r33-qa'},friends:[],requests:[],activities:[],refresh:async()=>{}};";
const browser=await chromium.launch({headless:true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 for(const width of [375,390,768,1440]){
  const p=await browser.newPage({viewport:{width,height:900}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await p.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));
  await p.goto(base+'/?r33='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:40000});
  await p.waitForFunction(()=>!!window.ElaraFreedomDashboardR26&&!!window.ElaraGlobalBanners&&!!window.ElaraFreedomR30&&!!window.ElaraFreedomR31&&window.ElaraFreedomEnhancements?.__r31&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:55000});
  // Exercise every dedicated tab, including a synthetic fallback GLOBAL hero.
  for(const kind of ['ideas','inspiration','vision','diary','art','experiences','gallery']){
   await p.evaluate(x=>window.ElaraFreedomDashboardR26.openSection(x),kind);
   await p.waitForSelector('#panel-freedom .freedom-subpage-shell[data-freedom-view="'+kind+'"]',{timeout:15000});
   await p.evaluate(()=>{
    const panel=document.querySelector('#panel-freedom');
    if(!panel.querySelector('#r33-regression-global-hero')){
     const extra=document.createElement('section');
     extra.id='r33-regression-global-hero';
     extra.className='elara-global-hero elara-generated-hero';
     extra.dataset.elaraPageHero='freedom';
     extra.innerHTML='<h1>آزادی - duplicate generated hero</h1>';
     panel.prepend(extra);
    }
    window.ElaraGlobalBanners.refresh();
   });
   await delay(80);
   let q=await p.evaluate(()=>{
    const panel=document.querySelector('#panel-freedom');
    const v=el=>el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>0;
    const global=[...panel.querySelectorAll(':scope > [data-elara-page-hero="freedom"],:scope > .freedom-hero,:scope > .elara-global-hero')];
    const own=[...panel.querySelectorAll('.freedom-subpage-shell .r30-hero,.freedom-subpage-shell .r31-hero')];
    return {globalCount:global.length,globalVisible:global.filter(v).length,ownCount:own.length,ownVisible:own.filter(v).length,
      docWidth:document.documentElement.scrollWidth,viewport:innerWidth,
      hiddenElements:global.every(el=>getComputedStyle(el).display==='none')};
   });
   assert.equal(q.globalVisible,0,kind+' has no extra global banner '+JSON.stringify(q));
   assert.equal(q.ownVisible,1,kind+' has exactly one visible detail hero');
   assert.ok(q.docWidth<=q.viewport+3,kind+' no horizontal page overflow');
   await p.evaluate(()=>document.getElementById('r33-regression-global-hero')?.remove());
   await p.locator('#panel-freedom .r30-back,#panel-freedom .r31-back').click();
   await p.waitForFunction(()=>!document.querySelector('#panel-freedom .freedom-subpage-shell'),null,{timeout:15000});
   await p.evaluate(()=>{window.ElaraGlobalBanners.refresh()});
   await delay(80);
   const home=await p.evaluate(()=>{
     const panel=document.querySelector('#panel-freedom');
     const headers=[...panel.querySelectorAll(':scope > [data-elara-page-hero="freedom"]')];
     return {detail:panel.classList.contains('freedom-subpage-open'),visible:headers.filter(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>0).length};
   });
   assert.equal(home.detail,false,'back clears detail mode');
   assert.equal(home.visible,1,'primary Freedom banner returns on back navigation');
   await p.evaluate(()=>window.ElaraGlobalBanners.refresh());
  }
  assert.deepEqual(errors,[],width+' no JavaScript runtime errors');
  console.log('R33_HERO_GUARD_PASS '+width);
  await p.close();
 }
}finally{await browser.close()}
