import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const cloud="window.ElaraAccount={user:{uid:'freedom-r31-qa',emailVerified:true},profile:{uid:'freedom-r31-qa',name:'Private QA'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'freedom-r31-qa',name:'Private QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};";
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,375,390,430,768,1024,1440,1648]){
  const p=await browser.newPage({viewport:{width,height:900}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await p.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await p.goto(base+'/?r31='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:45000});
  await p.waitForFunction(()=>window.ElaraFreedomR30&&window.ElaraFreedomR31&&window.ElaraFreedomEnhancements?.__r31&&window.ElaraFreedomDashboardR26&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:50000});
  for(const kind of ['gallery','inspiration','vision','experiences','art','ideas','diary']){
   await p.evaluate(x=>window.ElaraFreedomDashboardR26.openSection(x),kind);
   const newClass=['art','experiences','gallery'].includes(kind)?'r31-shell':'r30-shell';
   await p.waitForSelector('#panel-freedom .'+newClass+'[data-freedom-view="'+kind+'"]',{timeout:12000});
   const q=await p.evaluate(()=>{
    const root=document.querySelector('#panel-freedom .freedom-subpage-shell');
    const content=root.querySelector('.r30-content,.r31-content');
    const header=root.querySelector('.r30-hero,.r31-hero');
    return {width:document.documentElement.scrollWidth,panels:root.querySelectorAll('.r30-panel,.r31-panel').length,tabs:root.querySelectorAll('.r30-tabs button,.r31-tabs button').length,hero:header?.getBoundingClientRect().width,content:content?.textContent?.length||0,oldEmpty:!!root.querySelector('.freedom-sub-empty')};
   });
   assert.ok(q.width<=width+3,width+' '+kind+' no global horizontal scroll '+JSON.stringify(q));
   assert.ok(q.hero>width*.6,width+' '+kind+' full banner');
   assert.ok(q.tabs>=4,width+' '+kind+' actual category navigation');
   assert.ok(q.panels>=1&&q.content>80,width+' '+kind+' designed content not empty placeholder');
   assert.equal(q.oldEmpty,false,width+' '+kind+' no legacy empty screen');
   if(width===390||width===1440)await p.screenshot({path:'browser-artifacts/freedom-r31-'+kind+'-'+width+'.png',fullPage:true});
   await p.locator('.r30-back,.r31-back').click();
   await p.waitForFunction(()=>!document.querySelector('#panel-freedom .freedom-subpage-shell'),null,{timeout:12000});
  }
  if(width===390){
   await p.evaluate(()=>window.ElaraFreedomDashboardR26.openSection('experiences'));
   await p.locator('[data-r31-experience-form] [name=title]').fill('سفر واقعی QA');
   await p.locator('[data-r31-experience-form] textarea[name=text]').fill('اولین تجربه خصوصی من');
   await p.locator('[data-r31-experience-form] [name=category]').selectOption('سفر');
   await p.locator('[data-r31-experience-form] [type=submit]').click();
   await p.waitForFunction(()=>window.ElaraFreedomEnhancements.read().experiences.some(x=>x.title==='سفر واقعی QA'&&x.category==='سفر'));
   assert.ok((await p.locator('.r31-experience-row').count())>=1,'experience appears on timeline');
   await p.locator('.r31-back').click();
   await p.evaluate(()=>window.ElaraFreedomDashboardR26.openSection('art'));
   await p.locator('[data-r31-new-art]').first().click();
   await p.waitForSelector('.elara-dialog-panel .freedom-entry-editor');
   await p.locator('.elara-dialog-panel input[name=title]').fill('اثر هنری QA');
   await p.locator('.elara-dialog-panel textarea[name=text]').fill('یک اثر جدید');
   await p.locator('.elara-dialog-panel select[name=category]').selectOption('عکاسی');
   await p.locator('.elara-dialog-actions .primary-button').last().click();
   await p.waitForFunction(()=>window.ElaraFreedomEnhancements.read().artworks.some(x=>x.title==='اثر هنری QA'&&x.category==='عکاسی'));
   await p.locator('.r31-back').click();
   await p.reload({waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>window.ElaraFreedomR31&&window.ElaraFreedomEnhancements?.__r31&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:50000});
   const restored=await p.evaluate(()=>{const d=window.ElaraFreedomEnhancements.read();return {art:d.artworks.some(x=>x.title==='اثر هنری QA'),experience:d.experiences.some(x=>x.title==='سفر واقعی QA')}});
   assert.deepEqual(restored,{art:true,experience:true},'real saved private data survives a reload');
  }
  assert.deepEqual(errors,[],width+' page JavaScript errors');
  console.log('R31_ALL_SEVEN_PASS '+width);
  await p.close();
 }
}finally{await browser.close()}
