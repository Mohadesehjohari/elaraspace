import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub=`window.ElaraAccount={user:{uid:'me',emailVerified:true},profile:{uid:'me',name:'Milestone QA',username:'milestone_qa',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`window.ElaraSocial={me:{uid:'me',name:'Milestone QA',username:'milestone_qa',xp:20},friends:[],requests:[],activities:[],refresh:async()=>{},activityVisibility:()=> 'friends'};window.dispatchEvent(new Event('elara:social-updated'));`;
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
await page.addInitScript(()=>{
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,now=new Date(),d1=new Date(now),d2=new Date(now);d1.setDate(now.getDate()-1);d2.setDate(now.getDate()-2);
 localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,theme:'dark',
  tasks:[{id:'t1',text:'تسک QA',priority:4,completed:false}],taskCompletionHistory:[],
  habits:[{id:'h1',title:'عادت QA',days:[iso(d2),iso(d1)],rewardDays:[]}],
  goals:[{id:'g1',title:'هدف QA',steps:[{id:'s1',text:'قدم QA',done:false}]}],
  books:[{id:'b1',title:'کتاب QA',shelf:'reading',totalPages:100,currentPage:20,readingLogs:[]}],
  words:Array.from({length:10},(_,i)=>({id:'w'+i,front:'w'+i,back:'m'+i,box:1,due:iso(now)})),
  focusSessions:[],missionRewardClaims:[],folders:[],tags:[],taskLists:[]}));
 localStorage.removeItem('elara_notifications_v1');localStorage.removeItem('elara_domain_notif_cursor_v1_me');
 localStorage.setItem('elara_private_wellness_v1_me',JSON.stringify({goal:2000,glass:250,water:{},sleep:[],workouts:[],cycles:[]}));
});
await page.goto(base+'/?domain-events='+Date.now()+'#home',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.ElaraDomainNotifications&&window.ElaraNotify&&window.ElaraMissions&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
await page.waitForTimeout(180);
await page.evaluate(()=>{window.__domainRows=()=>ElaraNotify.read().filter(x=>/^(book-finished:|goal-complete:|habit-streak:|task-today:|water-goal:|workout:)/.test(String(x?.dedupeKey||'')))});
assert.equal(await page.evaluate(()=>window.__domainRows().length),0,'first domain observation must only establish baseline');

await page.evaluate(()=>{
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,day=iso(new Date()),s=JSON.parse(localStorage.getItem('elara_space_v1'));
 s.books[0].shelf='finished';s.books[0].readingLogs=[{date:day,pagesRead:20,fromPage:20,toPage:40}];
 s.goals[0].steps[0].done=true;s.taskCompletionHistory=[{key:'t1:'+day,taskId:'t1',date:day,title:'تسک QA',completedAt:Date.now()}];
 s.habits[0].days.push(day);s.focusSessions=[{id:'f1',startedAt:Date.now()-25*60000,endedAt:Date.now(),durationMin:25,completed:true}];
 localStorage.setItem('elara_space_v1',JSON.stringify(s));
 localStorage.setItem('elara_private_wellness_v1_me',JSON.stringify({goal:2000,glass:250,water:{[day]:2100},sleep:[],workouts:[{id:'wo1',date:day,minutes:25}],cycles:[]}));
 window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}));window.dispatchEvent(new Event('elara:wellness-saved'));
});
await page.waitForFunction(()=>window.__domainRows().length>=6,null,{timeout:8000});
const rows=await page.evaluate(()=>window.__domainRows().map(x=>({type:x.type,key:x.dedupeKey,title:x.title,message:x.message})));
for(const prefix of ['book-finished:b1','goal-complete:g1','habit-streak:h1:3','task-today:','water-goal:','workout:'])assert.ok(rows.some(x=>String(x.key).startsWith(prefix)),'missing milestone '+prefix+' '+JSON.stringify(rows));
const before=rows.length;
await page.evaluate(()=>{ElaraDomainNotifications.check();window.dispatchEvent(new Event('elara:data-changed'));window.dispatchEvent(new Event('elara:wellness-saved'))});
await page.waitForTimeout(180);
assert.equal(await page.evaluate(()=>window.__domainRows().length),before,'domain notifications duplicated after repeated events');
await page.evaluate(()=>{ElaraI18n.set('en');const s=JSON.parse(localStorage.getItem('elara_space_v1'));s.books.push({id:'b2',title:'کتاب دوم من',shelf:'finished',totalPages:120,currentPage:120,readingLogs:[]});localStorage.setItem('elara_space_v1',JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}))});
await page.waitForFunction(()=>window.__domainRows().some(x=>x.dedupeKey==='book-finished:b2'),null,{timeout:5000});
const englishBook=await page.evaluate(()=>window.__domainRows().find(x=>x.dedupeKey==='book-finished:b2'));
assert.match(englishBook.title,/Book finished/,'English locale must generate English system notification copy');
assert.match(englishBook.message,/کتاب دوم من/,'English notification must preserve Persian book-title UGC');
assert.doesNotMatch(englishBook.title,/[؀-ۿ]/,'English notification title leaked Persian system UI');
const missions=await page.evaluate(()=>Object.fromEntries(ElaraMissions.snapshot().map(x=>[x.key,{completed:x.completed,amount:x.amount,target:x.target}])));
for(const k of ['read-20','focus-25','move-20','language-10','streak-3'])assert.equal(missions[k]?.completed,true,'mission not completed '+k+' '+JSON.stringify(missions[k]));
await page.evaluate(()=>ElaraNotify.open(document.getElementById('ref-header-notifications')));
await page.waitForSelector('.elara-notification-window:not([hidden])');
assert.ok(await page.locator('.elara-notification-row').count()>=6,'notification UI did not render milestones');
await page.screenshot({path:'browser-artifacts/domain-events-390.png',fullPage:true});
await browser.close();
console.log('DOMAIN_EVENTS_PASS baseline dedupe task habit goal book water workout + locale-aware UGC + diverse missions');
