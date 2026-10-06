import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});

const cloudStub=`
window.ElaraAccount={user:{uid:'me',emailVerified:true},profile:{uid:'me',name:'آرین',username:'me',xp:600,profilePublic:true}};
document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');
document.getElementById('cloud-layer')?.setAttribute('hidden','');
window.dispatchEvent(new Event('elara:account-ready'));
`;

const socialStub=`
const me={uid:'me',name:'آرین',username:'me',xp:600};
const incomingPerson={uid:'f1',name:'مهسا',username:'mahsa',xp:300};
const outgoingPerson={uid:'f2',name:'کیان',username:'kian',xp:250};
const api={me,friends:[incomingPerson],activities:[],error:'',blocked:[],requests:[
 {id:'r-in',from:'f1',to:'me',status:'pending',person:incomingPerson,other:'f1'},
 {id:'r-out',from:'me',to:'f2',status:'pending',person:outgoingPerson,other:'f2'}
],refresh:async()=>{},addFriend:async()=>{},cancelRequest:async req=>{api.requests=api.requests.filter(x=>x.id!==req.id);window.dispatchEvent(new Event('elara:social-updated'))},removeFriend:async()=>{},openProfile(){},openSelfProfile(){},dm:{list:async()=>[],messages:async()=>[],listen:()=>()=>{},send:async()=>{}},groups:{list:async()=>[]}};
api.decide=async(req,status)=>{api.requests=status==='declined'?api.requests.filter(x=>x.id!==req.id):api.requests.map(x=>x.id===req.id?{...x,status}:x);if(status==='accepted'&&!api.friends.some(x=>x.uid===req.person?.uid))api.friends=[...api.friends,req.person];window.dispatchEvent(new Event('elara:social-updated'));return true};
window.ElaraSocial=api;window.dispatchEvent(new Event('elara:social-updated'));
`;

const collabStub=`
let rows=[{id:'ci-1',from:'f1',to:'me',status:'pending',kind:'language-class',title:'کلاس مکالمه',sender:{uid:'f1',name:'مهسا',username:'mahsa'}}];
const collab={kinds:['task','habit','goal','language-class','leitner-word'],pendingInvites:()=>rows.slice(),refreshInvites:async()=>rows.slice(),openInbox:async()=>{},openSpace:async()=>[],shareEntity:async()=>'',acceptInvite:async id=>{rows=rows.filter(x=>x.id!==id);window.dispatchEvent(new Event('elara:collab-updated'));return 'shared-local'},declineInvite:async id=>{rows=rows.filter(x=>x.id!==id);window.dispatchEvent(new Event('elara:collab-updated'));return true}};
window.ElaraCollab=collab;window.dispatchEvent(new Event('elara:collab-updated'));
`;

function seedScript(){
 const day=new Date().toISOString().slice(0,10);
 const state={version:1,xp:600,theme:'dark',taskLists:[],folders:[],tags:[],linkedTaskDismissals:[],focusSessions:[],taskCompletionHistory:[],missionRewardClaims:[],books:[],bookShelves:[],bookClips:[],words:[],
  tasks:[{id:'shared-task-qa',text:'تسک مشترک تست',shortDescription:'',description:'',date:day,time:'',priority:'2',list:'',folder:'',tag:'',completed:false,doneAt:null,xpAwarded:false,createdAt:Date.now(),recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{},dailyTarget:1,dailyProgress:{},checklist:[],collabSpaceId:'space-task',collabRole:'member',collabOwnerUid:'f1',shared:true}],
  habits:[{id:'shared-habit-qa',title:'عادت مشترک تست',days:[],rewardDays:[],dailyTarget:1,dailyProgress:{},recurrenceRule:null,skippedDates:[],occurrenceOverrides:{},collabSpaceId:'space-habit',collabRole:'member',collabOwnerUid:'f1',shared:true}],
  goals:[{id:'shared-goal-qa',title:'هدف مشترک تست',description:'هدف canonical',horizon:'short',date:'',time:'',priority:'2',list:'',folder:'',tag:'',dailyTarget:1,dailyProgress:{},recurrenceRule:null,skippedDates:[],steps:[{id:'shared-goal-step',text:'قدم مشترک',done:false,date:day,time:'',priority:'2',list:'',folder:'',tag:'',dailyTarget:1,dailyProgress:{},recurrenceRule:null,occurrenceDone:[],skippedDates:[]}],collabSpaceId:'space-goal',collabRole:'member',collabOwnerUid:'f1',shared:true}],
  languageClasses:[{id:'shared-class-qa',ownerUid:'f1',title:'کلاس مشترک مکالمه',type:'online',terms:2,sessionsPerTerm:10,durationMin:60,weekdays:[1,3],studyTime:'18:00',studyHoursPerDay:1,linkUrl:'',createdAt:Date.now(),updatedAt:Date.now(),sessionLogs:[],collabSpaceId:'space-class',collabRole:'member',collabOwnerUid:'f1',shared:true}]
 };
 localStorage.setItem('elara_space_v1',JSON.stringify(state));
}

async function noOverflow(page,label){
 const data=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 assert.ok(data.doc<=data.inner+1&&data.body<=data.inner+1,label+' horizontal overflow '+JSON.stringify(data));
 return data;
}
async function touchTargets(locator,label,min=40){
 const boxes=await locator.evaluateAll(nodes=>nodes.filter(n=>{const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'}).map(n=>{const r=n.getBoundingClientRect();return{w:r.width,h:r.height,text:n.textContent.trim()}}));
 assert.ok(boxes.length,label+' missing');
 for(const box of boxes)assert.ok(box.w>=min&&box.h>=min,label+' touch target too small '+JSON.stringify(box));
 return boxes;
}

async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 await page.addInitScript(seedScript);
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.route('**/elara-collab.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:collabStub}));
 await page.goto(base+'/?p0-social-mobile='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraSocialView&&window.ElaraNotify&&window.ElaraCollab&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 await page.evaluate(()=>{
  const row={id:'ci-1',from:'f1',to:'me',status:'pending',kind:'language-class',title:'کلاس مکالمه',sender:{uid:'f1',name:'مهسا',username:'mahsa'}};
  window.ElaraCollab={...(window.ElaraCollab||{}),kinds:['task','habit','goal','language-class','leitner-word'],pendingInvites:()=>[row],acceptInvite:async()=>true,declineInvite:async()=>true,openSpace:async()=>[],shareEntity:async()=>''};
  window.dispatchEvent(new Event('elara:collab-updated'));window.ElaraSocialView.render()
 });
 await page.waitForSelector('#elara-social-page .social-requests-standalone');

 assert.equal(await page.locator('#elara-social-page [data-social-view="requests"]').count(),0,width+': redundant Requests tab returned');
 assert.equal(await page.locator('#elara-social-page .social-requests-standalone').count(),1,width+': standalone Friend Requests card missing');
 assert.equal(await page.locator('#elara-social-page .social-collab-requests').count(),1,width+': standalone Shared Requests card missing');
 assert.match(await page.locator('#elara-social-page .social-requests-standalone').innerText(),/مهسا|mahsa/);
 assert.match(await page.locator('#elara-social-page .social-requests-standalone').innerText(),/کیان|kian/);
 assert.match(await page.locator('#elara-social-page .social-collab-requests').innerText(),/کلاس مکالمه/);
 await touchTargets(page.locator('#elara-social-page .social-request-actions button'),width+': friend request actions');
 await touchTargets(page.locator('#elara-social-page .social-collab-requests [data-collab-accept],#elara-social-page .social-collab-requests [data-collab-decline]'),width+': collab request actions');
 const socialOverflow=await noOverflow(page,width+': social');
 await page.screenshot({path:'browser-artifacts/p0-social-requests-'+width+'.png',fullPage:true});

 await page.evaluate(()=>window.ElaraOpen('language-courses',{history:'replace'}));await page.waitForTimeout(150);
 await page.waitForSelector('[data-shared-classes]');
 assert.match(await page.locator('[data-shared-classes]').innerText(),/کلاس‌های مشترک/);
 assert.match(await page.locator('[data-shared-classes]').innerText(),/کلاس مشترک مکالمه/);
 await noOverflow(page,width+': shared classes');
 await page.screenshot({path:'browser-artifacts/p0-shared-classes-'+width+'.png',fullPage:true});

 await page.evaluate(()=>window.ElaraOpen('tasks',{history:'replace'}));await page.waitForTimeout(150);
 assert.ok(await page.locator('#task-list .astra-shared-chip').count()>=1,width+': shared Task badge missing');
 await noOverflow(page,width+': tasks');

 await page.evaluate(()=>window.ElaraOpen('goals',{history:'replace'}));await page.waitForTimeout(150);
 assert.ok(await page.locator('#goal-list .entity-shared-chip').count()>=1,width+': shared Goal badge missing');
 assert.ok(await page.locator('#goal-list [data-action="shared-goal"]').count()>=1,width+': shared Goal canonical action missing');
 await noOverflow(page,width+': goals');

 await page.evaluate(()=>{
  ElaraNotify.push({type:'friend',title:'درخواست دوستی جدید',message:'مهسا · @mahsa',dedupeKey:'friend-request:r-in',meta:{kind:'friend-request',requestId:'r-in'}});
  ElaraNotify.push({type:'social',title:'درخواست مشترک جدید',message:'مهسا · کلاس مشترک',dedupeKey:'collab-in:ci-1',meta:{kind:'collab-invite',inviteId:'ci-1'}});
  ElaraNotify.open(document.getElementById('ref-header-notifications'));
 });
 await page.waitForSelector('.elara-notification-window:not([hidden])');
 assert.equal(await page.locator('[data-notification-friend-accept]').count(),1,width+': friend notification Accept missing');
 assert.equal(await page.locator('[data-notification-friend-decline]').count(),1,width+': friend notification Decline missing');
 assert.equal(await page.locator('[data-notification-collab-accept]').count(),1,width+': collab notification Accept missing');
 assert.equal(await page.locator('[data-notification-collab-decline]').count(),1,width+': collab notification Decline missing');
 await touchTargets(page.locator('.elara-notification-inline-actions button'),width+': notification actions');
 await noOverflow(page,width+': notification');
 await page.screenshot({path:'browser-artifacts/p0-notifications-'+width+'.png',fullPage:true});

 console.log(JSON.stringify({width,socialOverflow,friendRequests:true,sharedRequests:true,sharedClass:true,sharedTask:true,sharedGoal:true,notificationActions:true}));
 await page.close();
}

for(const [w,h] of [[320,780],[375,812],[390,844],[430,932]])await run(w,h);
await browser.close();
console.log('P0_SOCIAL_COLLAB_MOBILE_PASS 320 375 390 430 overflow=0');
