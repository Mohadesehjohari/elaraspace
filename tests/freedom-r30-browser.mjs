import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('browser-artifacts',{recursive:true});
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const cloud="window.ElaraAccount={user:{uid:'r30-freedom-qa',emailVerified:true},profile:{uid:'r30-freedom-qa',name:'R30 QA'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'r30-freedom-qa',name:'R30 QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};";
const browser=await chromium.launch({headless:true});
try{
for(const width of [320,375,390,430,768,1024,1440,1648]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.goto(base+'/?r30-qa='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForFunction(()=>!!window.ElaraFreedomR30&&!!window.ElaraFreedomEnhancements&&!!window.ElaraFreedomMediaDiary&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:50000});
 for(const kind of ['ideas','inspiration','vision','diary']){
  await page.evaluate(kind=>window.ElaraFreedomEnhancements.open(kind),kind);
  await page.waitForSelector('#panel-freedom .r30-shell[data-freedom-view='+kind+']',{timeout:18000});
  await page.waitForFunction(()=>document.querySelector('#panel-freedom .r30-shell .r30-panel')!==null);
  const metric=await page.evaluate(()=>{
   const root=document.querySelector('#panel-freedom .r30-shell');
   const hero=root.querySelector('.r30-hero').getBoundingClientRect();
   return {docWidth:document.documentElement.scrollWidth,screen:innerWidth,heroWidth:hero.width,cardCount:root.querySelectorAll('.r30-panel').length};
  });
  assert.ok(metric.docWidth<=width+3,width+' '+kind+' no document horizontal overflow '+JSON.stringify(metric));
  assert.ok(metric.heroWidth>width*.64,width+' '+kind+' hero visible');
  assert.ok(metric.cardCount>=3,width+' '+kind+' populated reference sections');
  if([390,1440].includes(width))await page.screenshot({path:'browser-artifacts/freedom-r30-'+kind+'-'+width+'.png',fullPage:true});
  await page.locator('#panel-freedom .r30-back').click();
  await page.waitForFunction(()=>!document.querySelector('#panel-freedom .r30-shell'),null,{timeout:10000});
 }
 if(width===390){
  await page.evaluate(()=>window.ElaraFreedomEnhancements.open('ideas'));
  await page.locator('[data-r30-idea-form] [name=title]').fill('ایده آزمایشی R30');
  await page.locator('[data-r30-idea-form] [name=text]').fill('ثبت یک ایده واقعی در مخزن شخصی');
  await page.locator('[data-r30-idea-form] select[name=category]').selectOption('تحصیلی');
  await page.locator('[data-r30-idea-form] [type=submit]').click();
  await page.waitForFunction(()=>window.ElaraFreedomEnhancements.read().ideas.some(x=>x.title==='ایده آزمایشی R30'&&x.category==='تحصیلی'));
  await page.locator('.r30-back').click();
  await page.waitForFunction(()=>!document.querySelector('.r30-shell'));
  await page.evaluate(()=>window.ElaraFreedomEnhancements.open('vision'));
  await page.locator('[data-r30-new-board]').first().click();
  await page.waitForSelector('.elara-dialog-panel input[name=title]');
  await page.locator('.elara-dialog-panel input[name=title]').fill('تابلوی تست');
  await page.locator('.elara-dialog-actions .primary-button').last().click();
  await page.waitForFunction(()=>(window.ElaraFreedomEnhancements.read().visionBoards||[]).some(x=>x.title==='تابلوی تست'));
  await page.locator('.r30-back').click();
  await page.waitForFunction(()=>!document.querySelector('.r30-shell'));
  await page.evaluate(()=>window.ElaraFreedomEnhancements.open('diary'));
  await page.locator('[data-r30-diary-form] [name=title]').fill('روز آزمایشی');
  await page.locator('[data-r30-diary-form] [name=body]').fill('احساسات آزمایشی خصوصی');
  await page.locator('[data-r30-mood=عالی]').click();
  await page.locator('[data-r30-diary-form] [type=submit]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').diaryEntries?.some(x=>x.title==='روز آزمایشی'&&x.mood==='عالی'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.ElaraFreedomR30&&!!window.ElaraFreedomEnhancements?.read&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:50000});
  const persisted=await page.evaluate(()=>({ideas:window.ElaraFreedomEnhancements.read().ideas.some(x=>x.title==='ایده آزمایشی R30'),diary:JSON.parse(localStorage.getItem('elara_space_v1')).diaryEntries.some(x=>x.title==='روز آزمایشی')}));
  assert.deepEqual(persisted,{ideas:true,diary:true},'user entries survive reload');
 }
 assert.equal(errors.length,0,width+' no runtime exceptions '+errors.join('; '));
 await page.close();console.log('FREEDOM_R30_PASS '+width);
}
}finally{await browser.close()}
