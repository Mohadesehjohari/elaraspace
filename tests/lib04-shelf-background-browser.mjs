import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const tag=base.startsWith('https:')?'live':'candidate';
await mkdir('browser-artifacts/lib04',{recursive:true});
const browser=await chromium.launch({headless:true});
const auth="window.ElaraAccount={user:{uid:'lib04-qa',emailVerified:true},profile:{uid:'lib04-qa',name:'Library QA',username:'lib04qa'}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'lib04-qa',name:'Library QA'},friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));";
const blank={version:1,theme:'dark',xp:0,tasks:[],habits:[],goals:[],words:[],folders:[],tags:[],taskLists:[],focusSessions:[],books:[],bookShelves:[],bookClips:[]};
try {
 for(const width of [320,390,430,768,1024,1440,1648]){
  const context=await browser.newContext({viewport:{width,height:width<=430?844:950}});
  const page=await context.newPage();
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:auth}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.addInitScript(v=>localStorage.setItem('elara_space_v1',JSON.stringify(v)),blank);
  await page.goto(base+'/?lib04='+width+'#library-shelves',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.ElaraLibraryShelvesLIB02&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
  await page.evaluate(()=>window.ElaraOpen('library-shelves',{history:'replace'}));
  await page.locator('#panel-library-shelves:not(.hidden) #lib02-scene .lib02-wood').first().waitFor();
  const img=await page.request.get(base+'/assets/ui/Cinematic%20Gothic%20Library%20Alcove.webp?case='+width);
  assert.equal(img.status(),200,'WebP asset not public');
  assert.match(img.headers()['content-type']||'',/image\/webp/,'WebP MIME missing');
  const asset=await img.body();
  assert.ok(asset.byteLength>100000,'original higher-resolution WebP expected, got '+asset.byteLength+' bytes');
  assert.equal(asset.subarray(0,4).toString('ascii'),'RIFF','WebP RIFF signature');
  assert.equal(asset.subarray(8,12).toString('ascii'),'WEBP','WebP format signature');
  const details=await page.evaluate(()=>{
   const all=[...document.querySelectorAll('#lib02-scene .lib02-wood')];
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,
    backgrounds:all.map(el=>getComputedStyle(el).backgroundImage),
    shelfCount:all.length};
  });
  assert.equal(details.shelfCount,3,'all three canonical shelves preserved');
  for(const bg of details.backgrounds){
   assert.match(bg,/library-shelf-warm-alcove\.webp/,'owner wooden background missing');
   assert.doesNotMatch(bg,/library-card-background\.webp/,'old purple background still applied');
  }
  assert.ok(details.scroll<=details.width+1,'horizontal overflow '+JSON.stringify(details));
  if([390,1440].includes(width)){
   await page.screenshot({path:'browser-artifacts/lib04/'+tag+'-wood-'+width+'.png',fullPage:true});
  }
  console.log('LIB04_WEBP_BACKGROUND_PASS',width,details.shelfCount);
  await context.close();
 }
} finally {await browser.close()}
console.log('LIB04_OWNER_ASSET_LIVE_PASS');
