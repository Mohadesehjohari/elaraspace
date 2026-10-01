import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const digitValue=value=>Number(String(value||'').trim().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const cloudStub="window.ElaraAccount={user:{uid:'me',emailVerified:true},profile:{uid:'me',name:'من',username:'me_user',xp:200,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub=[
"const friend={uid:'friend-1',name:'سینا',username:'sina',xp:120};",
"window.ElaraSocial={me:{uid:'me',name:'من',username:'me_user',xp:200},friends:[friend],requests:[],activities:[{id:'a1',uid:'friend-1',type:'task',visibility:'friends',person:friend,ms:Date.now()-1000}],error:'',refresh:async()=>{},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},openProfile(){},openSelfProfile(){},dm:{list:async()=>[],messages:async()=>[],listen:()=>()=>{},send:async()=>{}}};",
"window.dispatchEvent(new Event('elara:social-updated'));"
].join('\n');
const pageStub=[
"const friend={uid:'friend-1',name:'سینا',username:'sina'};",
"const state={posts:[{id:'p1',uid:'friend-1',person:friend,text:'پست دوستم 🔥',visibility:'friends',createdMs:Date.now()-1000}],stories:[],loading:false,error:''};",
"const emit=()=>window.dispatchEvent(new CustomEvent('elara:page-updated',{detail:{...state}}));",
"window.ElaraPage={state,refresh:async()=>{emit();return state},createPost:async()=>true,createStory:async()=>true,deletePost:async()=>true,deleteStory:async()=>true};emit();"
].join('\n');
const engagementStub=[
"const data={activity:{a1:{likes:0,liked:false,comments:[]}},post:{p1:{likes:0,liked:false,comments:[]}}};",
"const copy=x=>({likes:x.likes,liked:x.liked,commentCount:x.comments.length,comments:x.comments.map(c=>({...c}))});",
"window.__engagementOps=[];",
"window.ElaraEngagement={",
" load:async(kind,id)=>copy(data[kind][id]),",
" toggleLike:async(kind,id)=>{const x=data[kind][id];x.liked=!x.liked;x.likes=x.liked?1:0;window.__engagementOps.push({type:'like',kind,id,liked:x.liked});return x.liked},",
" addComment:async(kind,id,text)=>{const x=data[kind][id],cid='c'+(x.comments.length+1);x.comments.push({id:cid,uid:'me',text,ms:Date.now(),person:{uid:'me',name:'من'},mine:true});window.__engagementOps.push({type:'comment',kind,id,text});return cid},",
" deleteComment:async(kind,id,cid)=>{const x=data[kind][id];x.comments=x.comments.filter(c=>c.id!==cid);return true},purge:async()=>true};",
"window.dispatchEvent(new Event('elara:engagement-ready'));"
].join('\n');
async function wire(page){
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.route('**/elara-page.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:pageStub}));
 await page.route('**/social-engagement.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:engagementStub}));
}
async function exercise(width,height){
 const page=await browser.newPage({viewport:{width,height}});await wire(page);
 await page.goto(base+'/?engagement-stage7='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraEngagementView&&document.querySelector('[data-engagement-kind="activity"][data-engagement-id="a1"]')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 const activity=page.locator('[data-engagement-kind="activity"][data-engagement-id="a1"]').first();
 await activity.locator('[data-engagement-like]').click();await page.waitForFunction(()=>window.__engagementOps?.some(x=>x.type==='like'&&x.kind==='activity'));
 assert.equal(digitValue(await activity.locator('[data-engagement-like-count]').innerText()),1,width+': activity like count');
 await activity.locator('[data-engagement-comment]').click();await page.waitForSelector('.engagement-dialog');
 await page.locator('.engagement-comment-form textarea').fill('دمت گرم 👊🔥');await page.locator('.engagement-comment-form button[type="submit"]').click();
 await page.waitForFunction(()=>window.__engagementOps?.some(x=>x.type==='comment'&&x.kind==='activity'));
 assert.match(await page.locator('.engagement-comments').innerText(),/دمت گرم/);await page.locator('.elara-dialog-close').click();
 await page.evaluate(()=>window.ElaraOpen('page'));await page.waitForFunction(()=>document.querySelector('[data-engagement-kind="post"][data-engagement-id="p1"]'));
 const post=page.locator('[data-engagement-kind="post"][data-engagement-id="p1"]');
 await post.locator('[data-engagement-like]').click();await page.waitForFunction(()=>window.__engagementOps?.some(x=>x.type==='like'&&x.kind==='post'));
 assert.equal(digitValue(await post.locator('[data-engagement-like-count]').innerText()),1,width+': post like count');
 await post.locator('[data-engagement-comment]').click();await page.waitForSelector('.engagement-dialog');
 await page.locator('.engagement-comment-form textarea').fill('خیلی خوبه 😎');await page.locator('.engagement-comment-form button[type="submit"]').click();
 await page.waitForFunction(()=>window.__engagementOps?.some(x=>x.type==='comment'&&x.kind==='post'));
 assert.match(await page.locator('.engagement-comments').innerText(),/خیلی خوبه/);await page.locator('.elara-dialog-close').click();
 const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(overflow.sw<=overflow.w+1,width+': engagement horizontal overflow '+JSON.stringify(overflow));
 await page.screenshot({path:'browser-artifacts/social-engagement-'+width+'.png',fullPage:true});await page.close();
}
await exercise(390,844);await exercise(1440,1000);await browser.close();
console.log('SOCIAL_ENGAGEMENT_PASS activity+page like/comment 390/1440');
