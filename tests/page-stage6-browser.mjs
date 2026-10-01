import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:{uid:'me',emailVerified:true},profile:{uid:'me',name:'آرین',username:'me_user',xp:300,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:{uid:'me',name:'آرین',username:'me_user',xp:300},friends:[{uid:'friend-1',name:'سینا',username:'sina',xp:180}],requests:[],activities:[],error:'',refresh:async()=>{},openProfile(){},openSelfProfile(){},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},dm:{list:async()=>[],messages:async()=>[],listen:()=>()=>{},send:async()=>{}}};window.dispatchEvent(new Event('elara:social-updated'));";
const pageStub=[
"const friend={uid:'friend-1',name:'سینا',username:'sina'};",
"const self={uid:'me',name:'آرین',username:'me_user'};",
"const state={posts:[{id:'p1',uid:'friend-1',person:friend,text:'امروز عالی بود 🔥',visibility:'friends',createdMs:Date.now()-60000}],stories:[{id:'s1',uid:'friend-1',person:friend,text:'بزن بریم 👊',visibility:'friends',createdMs:Date.now()-30000,expiresMs:Date.now()+3600000}],loading:false,error:''};",
"const emit=()=>window.dispatchEvent(new CustomEvent('elara:page-updated',{detail:{...state}}));",
"window.__pageOps=[];",
"window.ElaraPage={state,refresh:async()=>{window.__pageOps.push('refresh');emit();return state},createPost:async(text,visibility)=>{state.posts.unshift({id:'own-post',uid:'me',person:self,text,visibility,createdMs:Date.now()});window.__pageOps.push({type:'post',text,visibility});emit();return true},createStory:async(text,visibility)=>{state.stories.unshift({id:'own-story',uid:'me',person:self,text,visibility,createdMs:Date.now(),expiresMs:Date.now()+86400000});window.__pageOps.push({type:'story',text,visibility});emit();return true},deletePost:async id=>{state.posts=state.posts.filter(x=>x.id!==id);window.__pageOps.push({type:'delete-post',id});emit()},deleteStory:async id=>{state.stories=state.stories.filter(x=>x.id!==id);window.__pageOps.push({type:'delete-story',id});emit()}};",
"emit();"
].join('\n');
async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.route('**/elara-page.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:pageStub}));
 await page.goto(base+'/?page-stage6='+Date.now()+'#page',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraPageView&&document.querySelector('#panel-page:not(.hidden) [data-page-post-form]')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 assert.equal(await page.locator('.page-post').count(),1,width+': friend post missing');
 assert.equal(await page.locator('.page-story').count(),1,width+': friend status missing');
 const post=page.locator('[data-page-post-form]');await post.locator('textarea').fill('پست تست من 😎');await post.locator('select').selectOption('friends');await post.getByRole('button',{name:'انتشار پست'}).click();
 await page.waitForFunction(()=>window.__pageOps.some(x=>x?.type==='post'));assert.match(await page.locator('.page-feed').innerText(),/پست تست من/);
 const story=page.locator('[data-page-story-form]');await story.locator('textarea').fill('استاتوس تست ⚡');await story.locator('select').selectOption('private');await story.getByRole('button',{name:'گذاشتن استاتوس'}).click();
 await page.waitForFunction(()=>window.__pageOps.some(x=>x?.type==='story'));assert.equal(await page.locator('.page-story').count(),2,width+': own status not rendered');
 await page.locator('.page-story').first().click();await page.waitForSelector('.page-story-detail');assert.match(await page.locator('.page-story-detail').innerText(),/استاتوس تست/);await page.locator('.elara-dialog-close').click();
 const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(overflow.sw<=overflow.w+1,width+': page horizontal overflow '+JSON.stringify(overflow));
 await page.screenshot({path:'browser-artifacts/page-stage6-'+width+'.png',fullPage:true});
 await page.evaluate(()=>window.ElaraOpen('social'));await page.waitForFunction(()=>document.querySelector('[data-elara-page-cta]'));await page.locator('[data-elara-page-cta]').click();await page.waitForFunction(()=>!document.getElementById('panel-page').classList.contains('hidden'));
 await page.close();
}
await run(390,844);await run(1440,1000);
await browser.close();
console.log('PAGE_STAGE6_PASS posts status friends-cta 390/1440');
