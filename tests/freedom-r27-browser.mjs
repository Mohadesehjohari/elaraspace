import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const widths=[320,390,430,768,1024,1440,1648];
const cloud="window.ElaraAccount={user:{uid:'freedom-r27-qa',emailVerified:true},profile:{uid:'freedom-r27-qa',name:'آزادی تست'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'freedom-r27-qa',name:'آزادی تست'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:width<=700?850:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.goto(BASE+'/?freedom-r27='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.ElaraFreedomMusicR27&&!!window.ElaraFreedomDashboardR26&&!!document.querySelector('#panel-freedom .fd-dashboard')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:40000});
  await page.waitForFunction(()=>[...document.styleSheets].some(x=>x.href?.includes('freedom-r27-polish.css')),null,{timeout:20000});
  assert.equal(await page.locator('[data-fd-open]').count(),7,width+': exact seven cards');
  const coords=await page.evaluate(()=>{
   const rect=x=>document.querySelector(x)?.getBoundingClientRect();
   return {w:innerWidth,doc:document.documentElement.scrollWidth,top:rect('#panel-freedom .freedom-hero')?.top,headerBottom:rect('.workspace>.topbar')?.bottom,
     diaryButton:rect('#panel-freedom .fd-diary header .fd-action')?.left,diaryTitle:rect('#panel-freedom .fd-diary header h2')?.left,
     mainDisplay:getComputedStyle(document.querySelector('#panel-freedom .fd-main')).display};
  });
  assert.ok(coords.doc<=width+3,width+': no horizontal overflow '+JSON.stringify(coords));
  assert.ok(coords.top<=coords.headerBottom+10,width+': no gap between header and hero '+JSON.stringify(coords));
  assert.ok(coords.diaryButton>coords.diaryTitle,width+': diary action belongs to right '+JSON.stringify(coords));
  if(width>900)assert.equal(coords.mainDisplay,'grid',width+': desktop layout');
  if(width<=900)assert.equal(coords.mainDisplay,'flex',width+': mobile stack');
  for(const kind of ['gallery','inspiration','vision','experiences','art','ideas','diary']){
   await page.locator('#panel-freedom [data-fd-open="'+kind+'"]').click();
   await page.waitForSelector('#panel-freedom.freedom-subpage-open [data-freedom-view="'+kind+'"]');
   await page.locator('#panel-freedom [data-f-sub-back]').click();
   await page.waitForFunction(()=>!document.querySelector('#panel-freedom')?.classList.contains('freedom-subpage-open'));
  }
  if(width===390){
   await page.locator('#panel-freedom [data-fd-new-dream]').click();
   await page.waitForSelector('.freedom-r27-dream-form');
   assert.equal(await page.locator('.freedom-r27-dream-form input[name=target]').count(),1,'date on dream form');
   assert.equal(await page.locator('.freedom-r27-dream-form input[type=file]').count(),1,'image upload on dream form');
   await page.locator('.freedom-r27-dream-form input[name=title]').fill('رؤیای آزمایشی');
   await page.locator('.freedom-r27-dream-form textarea[name=text]').fill('یک هدف واقعی');
   await page.locator('.elara-dialog-actions .primary-button').last().click();
   await page.waitForFunction(()=>window.ElaraFreedomEnhancements.read().dreams.some(x=>x.title==='رؤیای آزمایشی'));
   await page.locator('#panel-freedom [data-fd-music]').first().click();
   await page.waitForSelector('.freedom-r27-music-dialog');
   assert.equal(await page.locator('.freedom-r27-music-dialog [data-r27-upload]').count(),1,'on-device music upload');
   await page.locator('.freedom-r27-music-dialog [data-r27-upload]').setInputFiles({name:'qa.mp3',mimeType:'audio/mpeg',buffer:Buffer.alloc(512,7)});
   await page.waitForFunction(()=>document.querySelector('.freedom-r27-music-dialog [data-r27-current]')?.textContent.includes('qa'));
   await page.locator('.elara-dialog-actions .primary-button').last().click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').profileSong?.localAudioKey);
   const data=await page.evaluate(async()=>{
    const song=JSON.parse(localStorage.getItem('elara_space_v1')||'{}').profileSong;
    const source=await new Promise((resolve,reject)=>{const request=indexedDB.open('elara_freedom_audio_v1');request.onsuccess=()=>{const q=request.result.transaction('tracks').objectStore('tracks').get(song.localAudioKey);q.onsuccess=()=>resolve(q.result)}});return {hasSong:!!song.localAudioKey,blobSize:source.blob.size,ownerUid:source.ownerUid};
   });
   assert.equal(data.hasSong,true);
   assert.equal(data.blobSize,512);
   assert.equal(data.ownerUid,'freedom-r27-qa');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!document.querySelector('#panel-freedom .fd-playing audio[src]'),null,{timeout:35000});
   const audio=await page.locator('#panel-freedom .fd-playing audio').getAttribute('src');
   assert.ok(audio.startsWith('blob:'),'persisted uploaded song resolves to a playable local URL');
  }
  if([390,1440,1648].includes(width))await page.screenshot({path:'browser-artifacts/freedom-r27-'+width+'.png',fullPage:true});
  assert.equal(errors.length,0,width+': JavaScript page errors '+errors.join('; '));
  console.log('FREEDOM_R27_PASS '+width);
  await page.close();
 }
}finally{await browser.close()}
