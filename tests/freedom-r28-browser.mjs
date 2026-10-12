import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const BASE=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const widths=[320,375,390,430,768,1024,1440,1648];
const cloud="window.ElaraAccount={user:{uid:'freedom-r28-qa',emailVerified:true},profile:{uid:'freedom-r28-qa',name:'آزمایش دفترچه'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'freedom-r28-qa',name:'آزمایش دفترچه'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:width<=700?780:950}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.goto(BASE+'/?freedom-r28-test='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>window.ElaraFreedomNotebookR28&&document.querySelector('#panel-freedom .fd-dashboard')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:50000});
  await page.waitForFunction(()=>[...document.styleSheets].some(s=>s.href?.includes('freedom-r28-notebook.css')),null,{timeout:30000});
  await page.locator('#panel-freedom [data-fd-new-diary]').first().click();
  await page.waitForSelector('#elara-dialog-root .freedom-r28-diary');
  const geometry=await page.evaluate(()=>{
   const rect=q=>document.querySelector(q)?.getBoundingClientRect();
   const d=rect('#elara-dialog-root .elara-dialog-panel:has(.freedom-r28-diary)');
   const body=rect('#elara-dialog-root .elara-dialog-body');
   return {width:innerWidth,dialog:{left:d.left,right:d.right,top:d.top,bottom:d.bottom,width:d.width,height:d.height},body:{left:body.left,right:body.right},viewportHeight:innerHeight,docWidth:document.documentElement.scrollWidth,themeCount:document.querySelectorAll('.r28-theme-card').length,saveVisible:!!document.querySelector('.r28-save')};
  });
  assert.ok(Math.abs(geometry.dialog.width-width)<=2,width+': full width dialog '+JSON.stringify(geometry));
  assert.ok(Math.abs(geometry.dialog.height-geometry.viewportHeight)<=2,width+': full height dialog');
  assert.ok(geometry.docWidth<=width+3,width+': no horizontal document scroll');
  assert.equal(geometry.themeCount,4,width+': exactly four reference themes');
  for(const name of ['Celestial Mirror Lake at Night.webp','Sunlit Botanical Shadows on Parchment.webp','Lavender Moonrise Over Misty Meadows.webp','Misty Mountain Lake at Dawn.webp']){
    assert.ok(await page.locator('.r28-theme-grid img[src*="'+encodeURIComponent(name)+'"]').count(),width+': actual supplied reference image '+name);
  }
  await page.locator('[data-r28-theme="paper"]').click();
  assert.equal(await page.locator('.r28-theme-card.selected').getAttribute('data-r28-theme'),'paper');
  assert.ok((await page.locator('[data-r28-writing-wall]').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('Sunlit%20Botanical')|| (await page.locator('[data-r28-writing-wall]').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('Sunlit Botanical'),width+': writing background changes immediately');
  if(width===390){
   await page.locator('.r28-note-form [name=title]').fill('یادداشت تم روشن');
   await page.locator('.r28-note-form [name=body]').fill('این متن باید بعد از باز کردن دوباره باقی بماند.');
   await page.locator('#r28-tag-input').fill('شکرگزاری');
   await page.locator('[data-r28-add-tag]').click();
   await page.locator('[data-r28-save]').click();
   await page.waitForFunction(()=>window.ElaraFreedomMediaDiary.diaryRows().some(r=>r.title==='یادداشت تم روشن'&&r.diaryTheme==='paper'&&r.tags.includes('شکرگزاری')));
   const saved=await page.evaluate(()=>window.ElaraFreedomMediaDiary.diaryRows().find(x=>x.title==='یادداشت تم روشن'));
   console.log('R28_POST_SAVE_VISIBILITY',JSON.stringify(await page.evaluate(()=>{const p=document.querySelector('#panel-freedom');return {hash:location.hash,hidden:p?.classList.contains('hidden'),display:p?getComputedStyle(p).display:'absent',bodyClass:document.body.className}})));
   await page.locator('[data-fd-diary-id="'+saved.id+'"]').first().evaluate(el=>el.click());
   await page.waitForSelector('.freedom-r28-diary.r28-paper');
   assert.equal(await page.locator('.r28-note-form [name=body]').inputValue(),'این متن باید بعد از باز کردن دوباره باقی بماند.');
   await page.locator('[data-r28-back]').click();
   await page.waitForFunction(()=>!document.querySelector('.freedom-r28-diary'));
   await page.locator('#panel-freedom [data-fd-new-diary]').first().click();
   await page.locator('.r28-note-form [name=title]').fill('یادداشت تصویر شخصی');
   await page.locator('.r28-note-form [name=body]').fill('عکس خصوصی به این یادداشت تعلق دارد.');
   const imageBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
   await page.locator('[data-r28-upload]').setInputFiles({name:'my-private-bg.png',mimeType:'image/png',buffer:imageBytes});
   assert.ok(await page.locator('.freedom-r28-diary.r28-custom').count());
   await page.locator('[data-r28-save]').click();
   await page.waitForFunction(()=>window.ElaraFreedomMediaDiary.diaryRows().some(r=>r.title==='یادداشت تصویر شخصی'&&r.diaryTheme==='custom'&&r.diaryBackgroundKey));
   const ref=await page.evaluate(()=>window.ElaraFreedomMediaDiary.diaryRows().find(r=>r.title==='یادداشت تصویر شخصی'));
   assert.ok(ref.diaryBackgroundKey.startsWith('freedom-r28-qa/'));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.ElaraFreedomNotebookR28&&window.ElaraFreedomMediaDiary?.diaryRows().length>=2&&document.querySelector('#panel-freedom .fd-diary-list'),null,{timeout:45000});
   console.log('R28_POST_RELOAD_VISIBILITY',JSON.stringify(await page.evaluate(()=>{const p=document.querySelector('#panel-freedom');return {hash:location.hash,hidden:p?.classList.contains('hidden'),display:p?getComputedStyle(p).display:'absent',bodyClass:document.body.className}})));
   await page.locator('[data-fd-diary-id="'+ref.id+'"]').first().evaluate(el=>el.click());
   await page.waitForSelector('.freedom-r28-diary.r28-custom');
   await page.waitForFunction(()=>document.querySelector('[data-r28-writing-wall]')?.style.backgroundImage.includes('blob:'),null,{timeout:16000});
   assert.equal(await page.locator('.r28-note-form [name=title]').inputValue(),'یادداشت تصویر شخصی');
  }
  if([390,1440,1648].includes(width))await page.screenshot({path:'browser-artifacts/freedom-r28-fullscreen-'+width+'.png',fullPage:false});
  assert.equal(errors.length,0,width+': page errors '+errors.join(';'));
  console.log('FREEDOM_R28_PASS '+width);
  await page.close();
 }
}finally{await browser.close()}
