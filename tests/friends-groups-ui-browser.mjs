import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:{uid:'me',emailVerified:true},profile:{uid:'me',name:'من',username:'me_user',xp:220,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub=[
"const friends=[{uid:'f1',name:'سینا',username:'sina',xp:120},{uid:'f2',name:'مهسا',username:'mahsa',xp:110}];",
"const groups=[];const messages={};const listeners={};window.__groupOps=[];",
"const groupApi={",
" create:async(title,members)=>{const id='g'+(groups.length+1);groups.push({id,title,owner:'me',role:'owner',updatedAt:Date.now(),lastText:'',lastSender:''});messages[id]=[];window.__groupOps.push({type:'create',title,members:[...members],id});return id},",
" list:async()=>groups.map(x=>({...x})),",
" members:async id=>[{uid:'me',role:'owner',person:{uid:'me',name:'من'}},...((window.__groupOps.find(x=>x.type==='create'&&x.id===id)?.members||[]).map(uid=>({uid,role:'member',person:friends.find(f=>f.uid===uid)})))],",
" messages:async id=>(messages[id]||[]).slice(),",
" listen:(id,cb)=>{listeners[id]=cb;cb((messages[id]||[]).slice());return()=>{delete listeners[id]}},",
" send:async(id,text)=>{const row={id:'m'+((messages[id]||[]).length+1),sender:'me',text,ms:Date.now()};(messages[id]||(messages[id]=[])).push(row);window.__groupOps.push({type:'send',id,text});listeners[id]?.((messages[id]||[]).slice());const g=groups.find(x=>x.id===id);if(g){g.lastText=text;g.updatedAt=Date.now()}return id},",
" leave:async id=>{window.__groupOps.push({type:'leave',id});return true}",
"};",
"window.ElaraSocial={me:{uid:'me',name:'من',username:'me_user',xp:220},friends,requests:[],activities:[],error:'',refresh:async()=>{},addFriend:async()=>{},decide:async()=>{},cancelRequest:async()=>{},removeFriend:async()=>{},openProfile(){},openSelfProfile(){},dm:{list:async()=>[],messages:async()=>[],listen:()=>()=>{},send:async()=>{}},groups:groupApi};",
"window.dispatchEvent(new Event('elara:social-updated'));"
].join('\n');
const pageStub="window.ElaraPage={state:{posts:[],stories:[],loading:false,error:''},refresh:async()=>window.ElaraPage.state,createPost:async()=>true,createStory:async()=>true,deletePost:async()=>true,deleteStory:async()=>true};window.dispatchEvent(new Event('elara:page-updated'));";
const engagementStub="window.ElaraEngagement={load:async()=>({likes:0,liked:false,comments:[],commentCount:0}),toggleLike:async()=>true,addComment:async()=>'',deleteComment:async()=>true,purge:async()=>true};window.dispatchEvent(new Event('elara:engagement-ready'));";
async function wire(page){
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.route('**/elara-page.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:pageStub}));
 await page.route('**/social-engagement.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:engagementStub}));
}
async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});await wire(page);
 await page.goto(base+'/?group-stage8='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraSocialGroupsUI&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 await page.locator('[data-social-route="social"][data-social-view="groups"]').click();
 await page.waitForSelector('.social-groups-section');
 await page.locator('[data-social-create-group]').click();await page.waitForSelector('.social-group-create');
 await page.locator('.social-group-create input[name="title"]').fill('تیم خفن‌ها 🔥');
 const checks=page.locator('.social-group-friend-picker input[type="checkbox"]');await checks.nth(0).check();await checks.nth(1).check();
 await page.getByRole('button',{name:'ساخت گروه',exact:true}).last().click();
 await page.waitForFunction(()=>window.__groupOps?.some(x=>x.type==='create'));
 const created=await page.evaluate(()=>window.__groupOps.find(x=>x.type==='create'));assert.equal(created.title,'تیم خفن‌ها 🔥');assert.deepEqual(created.members.sort(),['f1','f2']);
 await page.waitForSelector('.social-group-chat-dialog');
 assert.match(await page.locator('.social-group-chat-dialog').innerText(),/تیم خفن‌ها/);
 await page.locator('[data-group-quick="بزن بریم 🔥"]').click();assert.equal(await page.locator('.social-group-chat-dialog textarea').inputValue(),'بزن بریم 🔥');
 await page.locator('.social-group-chat-dialog .social-chat-compose button[type="submit"]').click();
 await page.waitForFunction(()=>window.__groupOps?.some(x=>x.type==='send'&&x.text==='بزن بریم 🔥'));
 await page.waitForFunction(()=>document.querySelector('.social-group-chat-dialog .social-chat-messages')?.textContent.includes('بزن بریم'));
 assert.equal(await page.locator('.social-group-members>span').count(),3,width+': group members missing');
 await page.locator('.elara-dialog-close').click();await page.waitForFunction(()=>document.querySelectorAll('.social-group-row').length===1);
 const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(overflow.sw<=overflow.w+1,width+': group UI horizontal overflow '+JSON.stringify(overflow));
 await page.screenshot({path:'browser-artifacts/friends-groups-'+width+'.png',fullPage:true});await page.close();
}
await run(390,844);await run(1440,1000);await browser.close();
console.log('FRIENDS_GROUPS_PASS create accepted-friends live-chat quick-message 390/1440');
