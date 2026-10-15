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

const tabs=['friends','chats','groups','clubs','activity','requests','challenges'];
async function assertTab(page,tab,width){
 await page.waitForFunction(tab=>{const root=document.getElementById('elara-social-page');return root?.dataset.socialTab===tab&&new URLSearchParams(location.search).get('friendsTab')===tab&&root.querySelector('.social-tabs [data-social-view="'+tab+'"][aria-selected="true"]')},tab,{timeout:15000});
 assert.equal(await page.locator('#elara-social-page .social-tabs [aria-selected="true"]').count(),1,width+': exactly one active tab');
}
async function run(width){
 const page=await browser.newPage({viewport:{width,height:width<600?844:900}});
 await wire(page);
 const badSocial=socialStub.replace('list:async()=>groups.map(x=>({...x})),',"list:async()=>{window.__failedGroupCalls=(window.__failedGroupCalls||0)+1;throw new Error('The query requires a COLLECTION_GROUP_ASC index for collection groupMembers and field uid')},");
 if(badSocial===socialStub)throw Error('Failing group stub did not apply');
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:badSocial}));
 await page.goto(base+'/?friendsTab=groups&nav-escape='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraSocialView&&window.ElaraSocialGroupsUI&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:25000});
 await assertTab(page,'groups',width);
 await page.waitForSelector('.groups-r4 .g4-hero',{timeout:10000});
 const hitbox=await page.evaluate(()=>{
  const tab=document.querySelector('#elara-social-page .social-tabs [data-social-view="chats"]');
  const r=tab.getBoundingClientRect();
  const target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  const topbar=document.querySelector('.workspace>.topbar.ref-topbar');
  return {ok:!!target&&(target===tab||tab.contains(target)),target:target?.className?.baseVal||target?.className||target?.tagName,headerBottom:Math.round(topbar?.getBoundingClientRect().bottom||0),tabTop:Math.round(r.top)};
 });
 assert.ok(hitbox.ok,width+': Friends navigation is still covered by another layer: '+JSON.stringify(hitbox));
 // Several social service updates must not make the current tab impossible to leave.
 await page.evaluate(()=>{for(let i=0;i<25;i++)window.dispatchEvent(new Event('elara:social-updated'))});
 await page.waitForTimeout(350);
 for(const tab of ['chats','friends','groups','chats','clubs','activity','requests','challenges','groups','friends']){
  await page.locator('#elara-social-page .social-tabs [data-social-view="'+tab+'"]').click();
  await assertTab(page,tab,width);
 }
 await page.locator('#elara-social-page .social-tabs [data-social-view="groups"]').click();
 await assertTab(page,'groups',width);
 await page.waitForFunction(()=>/ایندکس|index/i.test(document.querySelector('.groups-r4 .g4-availability-message')?.textContent||''),null,{timeout:11000});
 const countBefore=await page.evaluate(()=>window.__failedGroupCalls||0);
 await page.evaluate(()=>{for(let i=0;i<30;i++)window.dispatchEvent(new Event('elara:social-updated'))});
 await page.waitForTimeout(600);
 const countAfter=await page.evaluate(()=>window.__failedGroupCalls||0);
 assert.ok(countAfter-countBefore<=1,width+': Firestore failure retry storm '+(countAfter-countBefore));
 await page.locator('#elara-social-page .social-tabs [data-social-view="chats"]').click();
 await assertTab(page,'chats',width);
 await page.waitForSelector('#elara-social-page .social-section.social-chats, #elara-social-page .dm-hub, #elara-social-page .social-messaging-ui',{timeout:5000}).catch(()=>{});
 await page.goBack({waitUntil:'domcontentloaded'});
 await assertTab(page,'groups',width);
 await page.goForward({waitUntil:'domcontentloaded'});
 await assertTab(page,'chats',width);
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(overflow.scroll<=overflow.width+2,width+': navigation caused horizontal overflow '+JSON.stringify(overflow));
 await page.screenshot({path:'browser-artifacts/group-tab-escape-'+width+'.png',fullPage:true});
 await page.close();
}
try{await run(390);await run(1440)}finally{await browser.close()}
console.log('SOCIAL_GROUPS_TAB_ESCAPE_PASS: index failure, event storm, Chats/Friends/Clubs/Activities/Requests/Challenges, history, mobile/desktop');
