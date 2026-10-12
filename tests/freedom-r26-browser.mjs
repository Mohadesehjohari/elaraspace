import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
const cloud="window.ElaraAccount={user:{uid:'freedom-qa-1',emailVerified:true},profile:{uid:'freedom-qa-1',name:'آزمایش آزادی',xp:100}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'freedom-qa-1',name:'آزمایش آزادی'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:width<=700?850:950}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
    await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));
    await page.goto(BASE+'/?freedom-r26='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:35000});
    await page.waitForFunction(()=>!!window.ElaraFreedomDashboardR26&&!!document.querySelector('#panel-freedom .fd-dashboard')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:45000});
    await page.waitForFunction(()=>[...document.styleSheets].some(x=>x.href?.includes('freedom-dashboard-r2026.css')),null,{timeout:15000});
    assert.equal(await page.locator('#panel-freedom .fd-tile').count(),7,width+': seven features');
    assert.equal(await page.locator('.bottom-nav [data-elara-nav-kind="main"]').count(),7,width+': seven canonical mobile nav entries');
    assert.equal(await page.locator('#panel-freedom .freedom-hero').count(),1,width+': no duplicate hero');
    const m=await page.evaluate(()=>{
      const rect=q=>{const el=document.querySelector(q);return el?.getBoundingClientRect().toJSON()};
      const main=document.querySelector('#panel-freedom .fd-main');
      const hero=document.querySelector('#panel-freedom .freedom-hero');
      return {width:innerWidth,scroll:document.documentElement.scrollWidth,header:rect('.workspace>.topbar'),hero:rect('#panel-freedom .freedom-hero'),features:rect('#panel-freedom .fd-features'),cols:getComputedStyle(main).gridTemplateColumns,mainDisplay:getComputedStyle(main).display,heroText:rect('#panel-freedom .freedom-hero-copy'),heroImage:hero?.querySelector('.freedom-hero-art')?.naturalWidth||0,
        order:[...document.querySelectorAll('#panel-freedom .fd-main .fd-panel')].map(x=>({cls:x.className,y:x.getBoundingClientRect().y}))};
    });
    assert.ok(m.scroll<=m.width+3,width+': no document horizontal overflow '+JSON.stringify(m));
    assert.ok(m.heroImage>0,width+': hero asset loads');
    assert.ok(m.hero.height>=195&&m.hero.height<=245,width+': compact hero height');
    assert.ok(m.hero.top>=m.header.bottom-15,width+': hero must follow header '+JSON.stringify({hero:m.hero.top,header:m.header.bottom}));
    assert.ok(m.heroText.top>=m.hero.top-2&&m.heroText.bottom<=m.hero.bottom+2,width+': readable hero text within image');
    if(width>900)assert.equal(m.mainDisplay,'grid',width+': three-column main');
    else{
      assert.equal(m.mainDisplay,'flex',width+': mobile stack');
      const ys=await page.evaluate(()=>['.fd-diary','.fd-dreams','.fd-inspiration','.fd-music'].map(c=>document.querySelector('#panel-freedom '+c)?.getBoundingClientRect().y));
      assert.ok(ys.every((y,i)=>i===0||y>=ys[i-1]),width+': mobile section order '+JSON.stringify(ys));
    }
    if([390,1440,1648].includes(width)){
      await page.screenshot({path:'browser-artifacts/freedom-after-'+width+'.png',fullPage:true});
    }
    if(width===390){
      await page.locator('#panel-freedom [data-fd-new-diary]').first().click();
      await page.locator('.freedom-diary-dialog [name=title]').fill('خاطره تست QA');
      await page.locator('.freedom-diary-dialog [name=body]').fill('این یک رکورد آزمایشی خصوصی است.');
      await page.locator('.freedom-diary-dialog [data-diary-form] [type=submit]').click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').diaryEntries?.some(x=>x.title==='خاطره تست QA'));
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForSelector('#panel-freedom .fd-dashboard',{timeout:35000});
      await page.waitForFunction(()=>document.querySelector('#panel-freedom .fd-diary-list')?.textContent.includes('خاطره تست QA'));
      await page.locator('[data-fd-open=art]').first().click();
      await page.waitForSelector('#panel-freedom.freedom-subpage-open [data-freedom-view=art]');
      await page.goBack();
      await page.waitForFunction(()=>!document.querySelector('#panel-freedom')?.classList.contains('freedom-subpage-open'));
      await page.goForward();
      await page.waitForSelector('#panel-freedom.freedom-subpage-open [data-freedom-view=art]');
      const second=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').diaryEntries.filter(x=>x.title==='خاطره تست QA').length);
      assert.equal(second,1,'no duplicate diary records after reload/navigation');
    }
    assert.equal(errors.length,0,width+': browser errors '+errors.join('; '));
    await page.close();
    console.log('FREEDOM_R26_PASS '+width);
  }
}finally{await browser.close()}
