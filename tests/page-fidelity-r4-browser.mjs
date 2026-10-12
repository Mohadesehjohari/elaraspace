import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const widths=[320,360,375,390,412,430,768,1024,1440,1648];
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloud="window.ElaraAccount={user:{uid:'me',emailVerified:true},profile:{uid:'me',name:'رها',username:'raha',xp:320,bio:'کتاب‌خوان و عاشق آسمان',profilePublic:true}};window.ElaraPublicContent={listSitePages:async()=>[]};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'me',name:'رها',username:'raha',xp:320,bio:'کتاب‌خوان و عاشق آسمان',profilePublic:true},friends:[{uid:'friend-1',name:'نیلوفر',username:'niloo',xp:180,avatarGroup:'female',avatarLevel:1}],requests:[],activities:[],error:'',refresh:async()=>{},openProfile(){},openSelfProfile(){},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},blockUser:async()=>true,dm:{list:async()=>[],messages:async()=>[],listen:()=>()=>{},send:async()=>{}}};window.dispatchEvent(new Event('elara:social-updated'));";
const pageFixture=[
 "const friend={uid:'friend-1',name:'نیلوفر',username:'niloo',xp:180,profilePublic:true},self={uid:'me',name:'رها',username:'raha',xp:320,bio:'کتاب‌خوان و عاشق آسمان'};",
 "const posts=[{id:'p1',uid:'friend-1',person:friend,text:'یک یادداشت واقعی در سناریوی تست',visibility:'friends',createdMs:Date.now()-60000}],stories=[{id:'s1',uid:'friend-1',person:friend,text:'استاتوس تست دوستان',visibility:'friends',createdMs:Date.now()-30000,expiresMs:Date.now()+3600000}];",
 "const state={posts:[...posts],stories:[...stories],loading:false,error:'',targetUid:'',targetPerson:null};",
 "const emit=()=>window.dispatchEvent(new CustomEvent('elara:page-updated',{detail:{...state}}));window.__pageOps=[];",
 "window.ElaraPage={state,refresh:async()=>{window.__pageOps.push('refresh');emit();return state},viewUser:async(uid,hint)=>{state.targetUid=uid;state.targetPerson={...friend,...(hint||{}),uid};state.posts=posts.filter(x=>x.uid===uid);state.stories=stories.filter(x=>x.uid===uid);emit()},clearTarget:async()=>{state.targetUid='';state.targetPerson=null;state.posts=[...posts];state.stories=[...stories];emit()},createPost:async(text,visibility)=>{const p={id:'own-post',uid:'me',person:self,text,visibility,createdMs:Date.now()};posts.unshift(p);state.posts.unshift(p);window.__pageOps.push('post');emit()},createStory:async(text,visibility)=>{const s={id:'own-story',uid:'me',person:self,text,visibility,createdMs:Date.now(),expiresMs:Date.now()+86400000};stories.unshift(s);state.stories.unshift(s);window.__pageOps.push('story');emit()},editPost:async()=>{},reportContent:async()=>{},deletePost:async()=>{},deleteStory:async()=>{}};",
 "emit();"
].join('\n');
const errors=[];
try {
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:width<700?850:1050}});
  page.on('pageerror',e=>errors.push(width+': '+e.message));
  await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.route('**/elara-page.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:pageFixture}));
  await page.goto(base+'/?page-fidelity-r4='+Date.now()+'#page',{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>window.ElaraPageView&&document.querySelector('#panel-page:not(.hidden) [data-page-post-form]')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
  // Browser-only fixture: real client storage schema for book clips; never production seed.
  await page.evaluate(()=>{
   localStorage.setItem('elara_space_v1',JSON.stringify({
    books:[{id:'b1',title:'کتاب آزمون',author:'نویسندهٔ آزمایشی'}],
    bookClips:[{id:'clip1',bookId:'b1',text:'این بریده از کتابخانهٔ همین حساب است',page:42,createdAt:Date.now()}]
   }));
  });
  await page.evaluate(()=>window.ElaraPageView.render());
  await page.waitForSelector('#panel-page .page-id-shell');
  await page.waitForFunction(()=>[...document.styleSheets].some(x=>x.href?.includes('page-fidelity-release4.css')));
  assert.equal(await page.locator('#panel-page > .page-hero').count(),1,width+': primary hero must be direct and unique');
  assert.equal(await page.locator('#panel-page .page-hero').count(),1,width+': duplicate page hero');
  assert.match(await page.locator('.page-id-shell').innerText(),/رها/,width+': real account name');
  assert.match(await page.locator('.page-id-bio').innerText(),/کتاب‌خوان/,width+': real bio');
  assert.match(await page.locator('.page-id-meta').innerText(),/۳۲۰|320/,width+': account XP');
  assert.equal(await page.locator('.page-story').count(),2,width+': only add button and real fixture status');
  assert.equal(await page.locator('.page-post').count(),1,width+': only fixture posts');
  assert.equal(await page.locator('#panel-page .page-side-card').count(),3,width+': three visible side cards');
  assert.equal(await page.locator('#panel-page .page-side-clip').count(),1,width+': real local clip');
  assert.match(await page.locator('#panel-page .page-side-clip').innerText(),/این بریده از کتابخانه/);
  assert.equal(await page.locator('#panel-page .page-topic-hash').count(),0,width+': no invented trending topics');
  assert.equal(await page.locator('#panel-page .page-side-friends [data-profile-add-friend]').count(),0,width+': no invented follow accounts');
  assert.equal(await page.locator('#panel-page [data-page-write-post]').count(),2,width+': two real write entrypoints');
  assert.equal(await page.locator('#panel-page .page-story-compose').isVisible(),false,width+': collapsed status editor');
  assert.equal(await page.locator('#panel-page .page-post-grid .page-post').count(),1,width+': real responsive feed cards');
  const rail=await page.evaluate(()=>{
   const a=document.querySelector('.page-social-aside')?.getBoundingClientRect(),
         feed=document.querySelector('.page-feed')?.getBoundingClientRect(),
         stories=document.querySelector('.page-stories')?.getBoundingClientRect(),
         identity=document.querySelector('.page-id-shell')?.getBoundingClientRect();
   return {asideTop:a?.top,asideLeft:a?.left,feedLeft:feed?.left,feedBottom:feed?.bottom,asideWidth:a?.width,bodyWidth:document.body.scrollWidth,
    storiesTop:stories?.top,storiesRight:stories?.right,identityTop:identity?.top,identityBottom:identity?.bottom}
  });
  assert.ok(rail.asideWidth>0,width+': side rail visible');
  if(width>=1151){
   assert.ok(rail.asideLeft>rail.feedLeft,width+': sidebar must be on physical RIGHT');
   assert.ok(rail.asideLeft>=rail.storiesRight-3,width+': sidebar must be separate from stories');
   assert.ok(rail.asideTop<rail.storiesTop,width+': sidebar must start alongside identity, above stories');
   assert.ok(rail.asideTop>rail.identityTop+35&&rail.asideTop<rail.identityBottom,width+': right rail overlapping identity row');
  }
  if(width<=700)assert.ok(rail.asideTop>=rail.feedBottom-2,width+': mobile side cards follow main feed');
  assert.equal(await page.locator('[data-page-media-input]:not(:disabled)').count(),0,width+': no fake upload');
  assert.equal(await page.locator('.page-post-compose.is-collapsed textarea').isVisible(),false,width+': default composer compact');

  const header=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s)?.getBoundingClientRect();
    return {hero:rect('#panel-page > .page-hero'),topbar:rect('.workspace > .topbar'),accountDisplay:getComputedStyle(document.querySelector('#ref-header-account')).display}
  });
  assert.equal(header.accountDisplay,'none',width+': topbar account must be hidden only on Page');
  if(width<=700)assert.ok(Math.abs(header.hero.top-header.topbar.bottom)<=14,width+': mobile hero must follow header '+JSON.stringify(header));
  else assert.ok(header.hero.top<=header.topbar.bottom,width+': desktop cover must start behind transparent header '+JSON.stringify(header));
  const mainNav=await page.locator('.bottom-nav [data-elara-nav-kind="main"]').count();
  assert.equal(mainNav,7,width+': seven canonical mobile-nav entries must remain untouched');
  const overflow=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert.ok(overflow.scrollWidth<=overflow.innerWidth+2,width+': horizontal overflow '+JSON.stringify(overflow));
  const geometry=await page.evaluate(()=>{
    const hero=document.querySelector('#panel-page > .page-hero').getBoundingClientRect(),avatar=document.querySelector('.page-id-avatar-wrap').getBoundingClientRect();
    return {heroBottom:hero.bottom,avatarTop:avatar.top}
  });
  assert.ok(geometry.avatarTop<geometry.heroBottom&&geometry.avatarTop>geometry.heroBottom-135,width+': avatar must overlap banner '+JSON.stringify(geometry));

  if(width===390){
   const d=await page.evaluate(()=>{
    const measure=e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,id:e.id,cls:String(e.className||'').slice(0,90),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}};
    return {viewport:innerWidth,htmlScroll:document.documentElement.scrollWidth,bodyScroll:document.body.scrollWidth,root:measure(document.documentElement),body:measure(document.body),outside:[...document.querySelectorAll('body *')].map(measure).filter(x=>x.right>innerWidth+4||x.left< -4).sort((a,b)=>b.right-a.right).slice(0,18)}
   });
   console.log('R2_MOBILE_GEOMETRY='+JSON.stringify(d));
  }
  if(width===390||width===1440){
   const png=await page.screenshot({path:'browser-artifacts/page-r4-'+width+'.png',fullPage:true});
   const imageWidth=png.readUInt32BE(16);
   assert.ok(imageWidth<=width+2,width+': full-page screenshot overflow width='+imageWidth);
  }
  await page.locator('[data-page-write-post]').first().click();
  assert.equal(await page.locator('[data-page-post-form] textarea').isVisible(),true,width+': writer expands');
  assert.equal(await page.evaluate(()=>document.activeElement?.closest('[data-page-post-form]')!==null),true,width+': Write post button focuses canonical editor');
  await page.locator('[data-page-add-story]').first().click();
  assert.equal(await page.evaluate(()=>document.activeElement?.closest('[data-page-story-form]')!==null),true,width+': add status focus');
  assert.equal(await page.locator('.page-story-compose').isVisible(),true,width+': real story editor expands');
  await page.locator('[data-page-content=posts]').click();
  assert.equal(await page.locator('.page-story-compose').isVisible(),false,width+': posts tab hides story');
  await page.locator('[data-page-content=all]').click();

  // Must launch the separate Page settings, never the private Profile editor.
  await page.evaluate(()=>{window.__legacyProfileEdit=0;window.ElaraProfileEdit={open:async()=>window.__legacyProfileEdit++}});
  await page.locator('[data-page-edit-profile]').last().click();
  await page.waitForSelector('.page-settings-form');
  assert.match(await page.locator('.elara-dialog-head').last().innerText(),/تنظیمات صفحه من/,width+': Page settings title');
  assert.equal(await page.evaluate(()=>window.__legacyProfileEdit),0,width+': must not open private Profile settings');
  await page.locator('.page-settings-form [name=name]').fill('نام اختصاصی پیج');
  await page.locator('.page-settings-form [name=bio]').fill('معرفی اختصاصی پیج');
  await page.locator('.page-settings-form [name=cover][value=castle]').check();
  assert.equal(await page.locator('.page-settings-interest-grid [name=interests]').count(),12,width+': select interests list');
  await page.locator('.page-settings-interest:has([name=interests][value="مطالعه"]) > span').click();
  await page.locator('.page-settings-interest:has([name=interests][value="نجوم"]) > span').click();
  await page.locator('.page-settings-form [name=otherInterests]').fill('بازی‌های رومیزی، جهان‌های خیالی');
  await page.locator('.elara-dialog-actions .primary-button').last().click();
  await page.waitForFunction(()=>document.querySelector('.page-id-name-row h2')?.textContent==='نام اختصاصی پیج');
  assert.match(await page.locator('.page-id-bio').innerText(),/معرفی اختصاصی پیج/);
  assert.equal(await page.evaluate(()=>window.ElaraAccount.profile.name),'رها',width+': private identity must not be overwritten');
  const local=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_social_page_settings_v1_me')||'{}'));
  assert.equal(local.cover,'castle',width+': UID local artwork persisted');
  assert.equal(local.name,'نام اختصاصی پیج',width+': UID local Page name persisted');
  assert.deepEqual(local.interests,['مطالعه','نجوم','بازی‌های رومیزی','جهان‌های خیالی'],width+': selected+typed interests saved locally');
  assert.equal(await page.locator('.page-id-interests .page-interest-chip').count(),4,width+': interests shown beside bio');
  assert.match(await page.locator('.page-id-interests').innerText(),/جهان‌های خیالی/,width+': custom interest reflected');
  assert.equal(await page.locator('.page-hero').evaluate(el=>el.style.getPropertyValue('--elara-page-cover').includes('banner_city_of_stars.webp')),true);
  await page.locator('[data-page-content=posts]').click();
  assert.equal(await page.locator('.page-stories').isVisible(),false,width+': posts filter');
  await page.locator('[data-page-content=statuses]').click();
  assert.equal(await page.locator('.page-feed').isVisible(),false,width+': statuses filter');
  await page.locator('[data-page-content=all]').click();
  assert.equal(await page.locator('.page-feed').isVisible(),true,width+': all filter');

  await page.locator('[data-page-write-post]').first().click();
  await page.locator('[data-page-post-form] textarea').fill('متن پست در تست رابط #کتاب');
  await page.locator('[data-page-post-form] button[type=submit]').click();
  await page.waitForFunction(()=>window.__pageOps.includes('post'));
  assert.equal(await page.locator('.page-post').count(),2,width+': real post flow');
  assert.match(await page.locator('.page-topic-list').innerText(),/کتاب/,width+': trend from real visible #کتاب post');
  await page.locator('[data-page-library-open]').click();
  await page.waitForFunction(()=>location.hash==='#library-clips');
  await page.evaluate(()=>window.ElaraOpen?.('page'));
  await page.waitForFunction(()=>location.hash==='#page');
  await page.locator('[data-page-friends-open]').first().click();
  await page.waitForFunction(()=>location.hash==='#social');
  await page.evaluate(()=>window.ElaraOpen?.('page'));
  await page.waitForFunction(()=>location.hash==='#page');
  await page.evaluate(()=>{window.ElaraPage.viewUser('friend-1')});
  await page.waitForSelector('.page-hero.is-target-page');
  assert.equal(await page.locator('[data-page-post-form]').count(),0,width+': other page cannot compose');
  assert.equal(await page.locator('[data-page-edit-profile]').count(),0,width+': cannot edit another account');
  assert.equal(await page.locator('.page-social-aside').count(),0,width+': owner-only library data never appears on another Page');
  assert.equal(await page.locator('.page-id-interests').count(),0,width+': UID-local interests never appear on another user Page');
  await page.locator('[data-page-back-feed]').click();
  await page.waitForSelector('[data-page-post-form]');
  await page.evaluate(()=>window.ElaraOpen?.('home'));
  await page.waitForFunction(()=>location.hash==='#home');
  assert.equal(await page.locator('#ref-header-account').isVisible(),true,width+': account must remain on Home');
  await page.evaluate(()=>window.ElaraOpen?.('page'));
  await page.waitForFunction(()=>location.hash==='#page');
  await page.waitForSelector('.page-id-shell');
  assert.equal(await page.locator('#ref-header-account').isVisible(),false,width+': account hidden again on Page');
  await page.close()
 }
 assert.deepEqual(errors,[],'No JS runtime exceptions across ten viewports');
 console.log('PAGE_FIDELITY_R4_PASS widths='+widths.join(',')+' profile=real-data nav=7 post=real-handler story=real-handler target=isolated screenshots=390,1440');
} finally {await browser.close()}
