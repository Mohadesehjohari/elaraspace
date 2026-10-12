import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const cloud="window.ElaraAccount={user:{uid:'notebook-qa',emailVerified:true},profile:{uid:'notebook-qa'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'notebook-qa'},friends:[],requests:[],activities:[],refresh:async()=>{}};";
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,375,390,430,768,1024,1440,1648]){
  const page=await browser.newPage({viewport:{width,height:880}});
  page.on('pageerror',e=>console.error('PAGE_ERROR',e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.goto(base+'/?r28='+width+'#freedom',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraFreedomDiaryR28&&window.ElaraFreedomMediaDiary?.__r28&&window.ElaraDialog,{timeout:45000});
  await page.evaluate(()=>window.ElaraFreedomMediaDiary.openDiary());
  await page.waitForSelector('.r28-notebook-layer .r28-diary');
  const metrics=await page.evaluate(()=>{const p=document.querySelector('.r28-notebook-layer>.elara-dialog-panel'),r=p.getBoundingClientRect();return {width:innerWidth,panelWidth:r.width,panelHeight:r.height,scroll:document.querySelector('.r28-diary').scrollWidth,viewportHeight:innerHeight,images:[...document.querySelectorAll('.r28-theme-image img')].map(i=>i.naturalWidth)}});
  assert.ok(Math.abs(metrics.panelWidth-width)<3,width+' full width '+JSON.stringify(metrics));
  assert.ok(Math.abs(metrics.panelHeight-880)<3,width+' full height');
  assert.ok(metrics.scroll<=width+2,width+' no horizontal overflow');
  assert.equal(metrics.images.length,4);
  assert.ok(metrics.images.every(x=>x>0),width+' theme assets loaded '+JSON.stringify(metrics));
  if(width===390){
   await page.locator('[data-r28-theme=lavender]').click();
   await page.locator('.r28-editor input[name=title]').fill('نمونه خصوصی');
   await page.locator('.r28-editor textarea[name=body]').fill('این یک یادداشت برای تست ماندگاری تم است');
   await page.locator('[data-r28-save]').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').diaryEntries?.some(x=>x.title==='نمونه خصوصی'&&x.themeId==='lavender'));
   const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).diaryEntries.find(x=>x.title==='نمونه خصوصی').id);
   await page.locator('[data-r28-close]').click();
   await page.evaluate(id=>window.ElaraFreedomMediaDiary.openDiary(id),id);
   await page.waitForSelector('.r28-notebook-layer .r28-diary');
   assert.equal(await page.locator('[data-r28-theme=lavender]').getAttribute('aria-pressed'),'true');
   await page.locator('[data-r28-upload]').setInputFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/RnAAAAAASUVORK5CYII=','base64')});
   await page.waitForFunction(()=>document.querySelector('.r28-diary')?.dataset.theme==='custom',{timeout:12000});
   await page.locator('[data-r28-save]').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').diaryEntries.find(x=>x.title==='نمونه خصوصی')?.backgroundImage?.startsWith('data:image/jpeg'));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.ElaraFreedomMediaDiary?.__r28,{timeout:45000});
   await page.evaluate(id=>window.ElaraFreedomMediaDiary.openDiary(id),id);
   await page.waitForSelector('.r28-diary[data-theme=custom]');
   assert.equal(await page.locator('.r28-editor input[name=title]').inputValue(),'نمونه خصوصی');
  }
  await page.close();console.log('R28_PASS '+width);
 }
}finally{await browser.close()}
