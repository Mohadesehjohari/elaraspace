import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const BASE=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const widths=[320,375,390,430,768,1024,1440,1648];
const cloud="window.ElaraAccount={user:{uid:'r29-notebook-qa',emailVerified:true},profile:{uid:'r29-notebook-qa'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'r29-notebook-qa'},friends:[],requests:[],activities:[],refresh:async()=>{}};";
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of widths){
  const height=width<740?812:900;
  const page=await browser.newPage({viewport:{width,height}});
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.goto(BASE+'/?r29='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>window.ElaraFreedomDiaryR28&&window.ElaraFreedomMediaDiary?.__r28&&window.ElaraDialog&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:50000});
  await page.evaluate(()=>window.ElaraFreedomMediaDiary.openDiary());
  await page.waitForSelector('#elara-dialog-root .r28-notebook-layer .r28-diary');
  await page.waitForFunction(()=>[...document.querySelectorAll('.r28-theme-image img')].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:20000});
  const metrics=await page.evaluate(()=>{
   const rect=q=>document.querySelector(q)?.getBoundingClientRect().toJSON();
   const diary=document.querySelector('.r28-diary');
   const before=getComputedStyle(diary,'::before'),after=getComputedStyle(diary,'::after'),writing=getComputedStyle(document.querySelector('.r28-writing'));
   return {viewport:[innerWidth,innerHeight],panel:rect('.r28-notebook-layer>.elara-dialog-panel'),themes:rect('.r28-themes'),editor:rect('.r28-editor'),footer:rect('.r28-footer'),horizScroll:document.documentElement.scrollWidth,
    bg:before.backgroundImage,overlay:after.content,filter:before.filter,writingBg:writing.backgroundImage,themeImages:[...document.querySelectorAll('.r28-theme-image img')].map(i=>i.naturalWidth)};
  });
  const p=metrics.panel;
  assert.ok(p.left>=-2&&p.top>=-2&&Math.abs(p.right-width)<=2&&Math.abs(p.bottom-height)<=2,width+': cover entire viewport '+JSON.stringify(p));
  assert.ok(metrics.footer.bottom<=height+2&&metrics.footer.bottom>=height-4,width+': bottom bar reaches viewport edge');
  assert.ok(metrics.horizScroll<=width+2,width+': no horizontal scrolling');
  assert.ok(!metrics.bg.includes('gradient')&&metrics.bg.includes('Celestial'),width+': no purple wallpaper overlay '+metrics.bg);
  assert.equal(metrics.overlay,'none',width+': no after gradient');
  assert.equal(metrics.filter,'none',width+': no color filter');
  assert.ok(!metrics.writingBg.includes('gradient'),width+': untinted writing background');
  assert.equal(metrics.themeImages.length,4);
  assert.ok(metrics.themeImages.every(v=>v>0),width+': four artwork files load');
  if(width>740)assert.ok(metrics.themes.right>metrics.editor.right,width+': theme picker is on the right');
  else assert.ok(metrics.themes.top>=metrics.editor.top,width+': mobile content in readable stack');
  await page.locator('[data-r28-theme=lavender]').click();
  assert.equal(await page.locator('[data-r28-theme=lavender]').getAttribute('aria-pressed'),'true');
  assert.ok((await page.evaluate(()=>getComputedStyle(document.querySelector('.r28-diary'),'::before').backgroundImage)).includes('Lavender'),width+': chosen wallpaper displays immediately');
  if([390,1440].includes(width))await page.screenshot({path:'browser-artifacts/freedom-r29-'+width+'.png'});
  await page.locator('[data-r28-back]').click();
  await page.waitForFunction(()=>!document.querySelector('.r28-notebook-layer'),null,{timeout:10000});
  await page.close();
  console.log('R29_NOTEBOOK_PASS '+width);
 }
}finally{await browser.close()}
