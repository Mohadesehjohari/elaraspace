import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const day=new Date(),date=[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
const seed={version:1,theme:'dark',xp:0,goals:[],habits:[],books:[],words:[],folders:['شخصی','ورزش','مطالعه'],tags:[],taskLists:['عادت','مطالعهٔ روزانه'],taskListDetails:{'عادت':{folder:'شخصی',description:''},'مطالعهٔ روزانه':{folder:'مطالعه',description:''}},tasks:[
 ...Array.from({length:8},(_,i)=>({id:'meta-chip-qa-'+i,text:'برنامهٔ روزانهٔ تسک '+(i+1),date,priority:String(i%4+1),list:i%3===0?'عادت':i%3===1?'مطالعهٔ روزانه':'',folder:i%3===0?'شخصی':i%3===1?'مطالعه':'ورزش',time:i%2===0?'08:30':'20:45',completed:false,createdAt:1,recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],dailyTarget:1,dailyProgress:{}}))
]};
const browser=await chromium.launch({headless:true});
function metrics(page){return page.evaluate(()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
 const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
 const rows=[...document.querySelectorAll('#task-list>.astra-task-row')];
 return {vp:innerWidth,pageWidth:document.documentElement.scrollWidth,rows:rows.map(row=>{
  const meta=row.querySelector(':scope > .elara-task-meta-grid'),path=meta?.querySelector('.elara-task-path-link'),priority=meta?.querySelector('.elara-compact-priority'),timing=meta?.querySelector('.elara-task-timing'),status=row.querySelector(':scope > .astra-task-status');
  const bounds={row:rect(row),meta:meta?rect(meta):null,path:path?rect(path):null,priority:priority?rect(priority):null,timing:timing?rect(timing):null,status:status?rect(status):null};
  return {id:row.dataset.key,bounds,hasPath:!!path,hasPriority:!!priority,priorityText:priority?.textContent,metaDisplay:meta?getComputedStyle(meta).display:'missing',collisions:meta&&path&&priority&&timing?{pathPriority:intersects(bounds.path,bounds.priority),pathTiming:intersects(bounds.path,bounds.timing),priorityTiming:intersects(bounds.priority,bounds.timing),statusMeta:status?intersects(bounds.status,bounds.meta):false}:null};
 })}
})}
try{
 for(const width of [320,360,390,430,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraAccount={user:null,profile:{name:'QA',username:'qa',xp:0}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));"}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:"window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{}};"}));
  await page.addInitScript(data=>{if(!localStorage.getItem('elara_space_v1'))localStorage.setItem('elara_space_v1',JSON.stringify(data))},seed);
  await page.goto(base+'/?task-chip-qa='+width+'#tasks',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#task-list>.astra-task-row').length>=6&&document.querySelectorAll('#task-list>.astra-task-row>.elara-task-meta-grid').length>=6,null,{timeout:35000});
  const data=await metrics(page);
  assert.ok(data.rows.length>=6,'missing task rows '+width+' '+JSON.stringify(data));
  assert.ok(data.pageWidth<=width+2,'whole page overflows '+width+' '+data.pageWidth);
  for(const row of data.rows){
   assert.equal(row.metaDisplay,'grid',width+' task metadata is not grid: '+JSON.stringify(row));
   assert.ok(row.hasPath&&row.hasPriority,'path/priority badge missing: '+JSON.stringify(row));
   assert.match(row.priorityText,/^P[1-4]$/);
   assert.ok(row.bounds.meta.width>0,'metadata zero width '+JSON.stringify(row));
   assert.ok(row.bounds.meta.left>=row.bounds.row.left-1&&row.bounds.meta.right<=row.bounds.row.right+1,'meta out of task card '+JSON.stringify(row));
   assert.ok(row.bounds.row.height<=90,'task card became too tall '+width+' '+JSON.stringify(row));
   assert.deepEqual(row.collisions,{pathPriority:false,pathTiming:false,priorityTiming:false,statusMeta:false},'overlapping chips at '+width+': '+JSON.stringify(row));
  }
  console.log('TASK_META_NONOVERLAP_PASS '+width+'px rows='+data.rows.length+' width='+data.pageWidth);
  assert.deepEqual(errors,[],'Javascript errors at '+width+': '+errors.join('; '));
  await context.close();
 }
}finally{await browser.close()}
