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
  await page.goto(base+'/?page-fidelity-r1='+Date.now()+'#page',{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>window.ElaraPageView&&document.querySelector('#panel-page:not(.hidden) [data-page-post-form]')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
  await page.evaluate(()=>window.ElaraPageView.render());
  await page.waitForSelector('#panel-page .page-id-shell');
  await page.waitForFunction(()=>[...document.styleSheets].some(x=>x.href?.includes('page-fidelity-release1.css')));
  assert.equal(await page.locator('#panel-page > .page-hero').count(),1,width+': primary hero must be direct and unique');
  assert.equal(await page.locator('#panel-page .page-hero').count(),1,width+': duplicate page hero');
  assert.match(await page.locator('.page-id-shell').innerText(),/رها/,width+': real account name');
  assert.match(await page.locator('.page-id-bio').innerText(),/کتاب‌خوان/,width+': real bio');
  assert.match(await page.locator('.page-id-meta').innerText(),/۳۲۰|320/,width+': account XP');
  assert.equal(await page.locator('.page-story').count(),2,width+': only add button and real fixture status');
  assert.equal(await page.locator('.page-post').count(),1,width+': only fixture posts');
  assert.equal(await page.locator('[data-page-media-input]:not(:disabled)').count(),0,width+': no fake upload');
  const mainNav=await page.locator('.bottom-nav [data-elara-nav-kind="main"]').count();
  assert.equal(mainNav,7,width+': seven canonical mobile-nav entries must remain untouched');
  const overflow=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert.ok(overflow.scrollWidth<=overflow.innerWidth+2,width+': horizontal overflow '+JSON.stringify(overflow));
  const geometry=await page.evaluate(()=>{
    const hero=document.querySelector('#panel-page > .page-hero').getBoundingClientRect(),avatar=document.querySelector('.page-id-avatar-wrap').getBoundingClientRect();
    return {heroBottom:hero.bottom,avatarTop:avatar.top}
  });
  assert.ok(geometry.avatarTop<geometry.heroBottom&&geometry.avatarTop>geometry.heroBottom-135,width+': avatar must overlap banner '+JSON.stringify(geometry));
  if(width===390||width===1440)await page.screenshot({path:'browser-artifacts/page-r1-'+width+'.png',fullPage:true});
  await page.locator('[data-page-add-story]').click();
  assert.equal(await page.evaluate(()=>document.activeElement?.closest('[data-page-story-form]')!==null),true,width+': add status focus');
  await page.evaluate(()=>{window.__privateEditorOpened=0;window.ElaraProfileEdit={open:async()=>{window.__privateEditorOpened++}}});
  await page.locator('[data-page-edit-profile]').last().click();
  await page.waitForSelector('.page-settings-form');
  assert.match(await page.locator('.elara-dialog-head').last().innerText(),/تنظیمات صفحه من/,width+': R1 regression must now use Page editor');
  assert.equal(await page.evaluate(()=>window.__privateEditorOpened),0,width+': private Profile must not launch from Page');
  await page.locator('.elara-dialog-actions .quiet-button').last().click();
  await page.locator('[data-page-post-form] textarea').fill('متن پست در تست رابط');
  await page.locator('[data-page-post-form] button[type=submit]').click();
  await page.waitForFunction(()=>window.__pageOps.includes('post'));
  assert.equal(await page.locator('.page-post').count(),2,width+': real post flow');
  await page.evaluate(()=>{window.ElaraPage.viewUser('friend-1')});
  await page.waitForSelector('.page-hero.is-target-page');
  assert.equal(await page.locator('[data-page-post-form]').count(),0,width+': other page cannot compose');
  assert.equal(await page.locator('[data-page-edit-profile]').count(),0,width+': cannot edit another account');
  await page.locator('[data-page-back-feed]').click();
  await page.waitForSelector('[data-page-post-form]');
  await page.close()
 }
 assert.deepEqual(errors,[],'No JS runtime exceptions across ten viewports');
 console.log('PAGE_FIDELITY_R1_PASS widths='+widths.join(',')+' profile=real-data nav=7 post=real-handler story=real-handler target=isolated screenshots=390,1440');
} finally {await browser.close()}
