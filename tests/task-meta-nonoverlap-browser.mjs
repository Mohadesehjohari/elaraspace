import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const day=new Date(),date=[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
const seed={version:1,theme:'dark',xp:0,goals:[],habits:[],books:[],words:[],folders:['شخصی','ورزش','مطالعه'],tags:[],taskLists:['عادت','مطالعهٔ روزانه'],taskListDetails:{'عادت':{folder:'شخصی',description:''},'مطالعهٔ روزانه':{folder:'مطالعه',description:''}},tasks:[
 ...Array.from({length:8},(_,i)=>({id:'meta-chip-qa-'+i,text:'برنامهٔ روزانهٔ تسک '+(i+1),date,priority:String(i%4+1),list:i%3===0?'عادت':i%3===1?'مطالعهٔ روزانه':'',folder:i%3===0?'شخصی':i%3===1?'مطالعه':'ورزش',time:i%2===0?'08:30':'20:45',completed:false,createdAt:1,recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],dailyTarget:1,dailyProgress:{}})),
 {id:'meta-no-folder',text:'تسک بدون پوشه',date,priority:'2',list:'',folder:'',time:'14:00',completed:false,createdAt:1,recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],dailyTarget:1,dailyProgress:{}}
]};
const browser=await chromium.launch({headless:true});
function metrics(page){return page.evaluate(()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
 const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
 const rows=[...document.querySelectorAll('#task-list>.astra-task-row')];
 return {vp:innerWidth,pageWidth:document.documentElement.scrollWidth,rows:rows.map(row=>{
  const title=row.querySelector(':scope > .item-content'),menu=row.querySelector(':scope > .astra-task-more'),check=row.querySelector(':scope > .check-button'),meta=row.querySelector(':scope > .elara-task-meta-grid'),path=meta?.querySelector('.elara-task-path-link'),priority=meta?.querySelector('.elara-compact-priority'),timing=meta?.querySelector('.elara-task-timing'),status=row.querySelector(':scope > .astra-task-status');
  const bounds={row:rect(row),title:title?rect(title):null,menu:menu?rect(menu):null,check:check?rect(check):null,meta:meta?rect(meta):null,path:path?rect(path):null,priority:priority?rect(priority):null,timing:timing?rect(timing):null,status:status?rect(status):null};
  return {id:row.dataset.key,bounds,hasPath:!!path,hasPriority:!!priority,priorityText:priority?.textContent,metaDisplay:meta?getComputedStyle(meta).display:'missing',rowDisplay:getComputedStyle(row).display,collisions:meta&&priority?{pathPriority:path?intersects(bounds.path,bounds.priority):false,pathTiming:path&&timing?intersects(bounds.path,bounds.timing):false,priorityTiming:timing?intersects(bounds.priority,bounds.timing):false,statusMeta:status?intersects(bounds.status,bounds.meta):false,titleStatus:title&&status?intersects(bounds.title,bounds.status):false,titleMeta:title?intersects(bounds.title,bounds.meta):false,checkTitle:check&&title?intersects(bounds.check,bounds.title):false,metaMenu:menu?intersects(bounds.meta,bounds.menu):false}:null};
 })}
})}
try{
 for(const width of [320,360,390,430,640,700,767,768,920,1024,1440,1648]){
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
  if(width<=767){
   const toolbar=await page.evaluate(()=>{
    const pick=selector=>document.querySelector(selector);
    const metrics=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,display:getComputedStyle(el).display,flexWrap:getComputedStyle(el).flexWrap,maxHeight:getComputedStyle(el).maxHeight}};
    return {toolbar:metrics(pick('#astra-task-toolbar')),chips:metrics(pick('#astra-task-chips')),actions:metrics(pick('#elara-task-page-actions')),add:metrics(pick('#elara-task-add-main')),views:metrics(pick('#elara-task-page-actions .astra-task-view-controls'))};
   });
   assert.ok(toolbar.toolbar&&toolbar.actions&&toolbar.chips&&toolbar.add&&toolbar.views,'missing mobile task controls '+width);
   for(const key of ['toolbar','chips','actions'])assert.ok(toolbar[key].scrollWidth<=toolbar[key].clientWidth+2,'horizontal scrolling in '+key+' at '+width+': '+JSON.stringify(toolbar));
   assert.equal(toolbar.actions.display,'grid','mobile task action controls must wrap in a grid');
   assert.ok(toolbar.add.width>=toolbar.actions.width-2,'add-task button is not full-width at '+width+': '+JSON.stringify(toolbar));
   assert.ok(toolbar.add.height>=63,'add-task button is not tall enough at '+width+': '+JSON.stringify(toolbar));
   assert.ok(toolbar.add.top+2<toolbar.views.top,'add-task button must be on its own first row at '+width+': '+JSON.stringify(toolbar));
   assert.ok(toolbar.add.left>=toolbar.actions.left-2&&toolbar.add.right<=toolbar.actions.right+2,'add-task button extends beyond action controls at '+width+': '+JSON.stringify(toolbar));
  }
  for(const row of data.rows){
   assert.equal(row.metaDisplay,'flex',width+' task metadata is not one inline row: '+JSON.stringify(row));
   assert.equal(row.rowDisplay,'grid',width+' task is not single-row grid'); const b=row.bounds; const center=a=>(a.top+a.bottom)/2; assert.ok(Math.abs(center(b.check)-center(b.meta))<30&&Math.abs(center(b.status)-center(b.meta))<23&&Math.abs(center(b.title)-center(b.meta))<30,'task controls not on ONE horizontal line at '+width+': '+JSON.stringify(row)); if(width>=921)assert.ok(b.meta.width>=180,'desktop meta too narrow '+width+': '+JSON.stringify(row));
   assert.ok(row.hasPriority,'priority badge missing: '+JSON.stringify(row));
   if(row.id==='meta-no-folder')assert.equal(row.hasPath,false,'phantom without-folder path chip was rendered');
   else assert.equal(row.hasPath,true,'real path missing from row');
   assert.match(row.priorityText,/^P[1-4]$/);
   assert.ok(row.bounds.meta.width>0,'metadata zero width '+JSON.stringify(row));
   assert.ok(row.bounds.meta.left>=row.bounds.row.left-1&&row.bounds.meta.right<=row.bounds.row.right+1,'meta out of task card '+JSON.stringify(row));
   assert.ok(row.bounds.row.height<=98,'task card became too tall '+width+' '+JSON.stringify(row));
   assert.deepEqual(row.collisions,{pathPriority:false,pathTiming:false,priorityTiming:false,statusMeta:false,titleStatus:false,titleMeta:false,checkTitle:false,metaMenu:false},'overlapping chips at '+width+': '+JSON.stringify(row));
  }
  console.log('TASK_META_NONOVERLAP_PASS '+width+'px rows='+data.rows.length+' width='+data.pageWidth);
  assert.deepEqual(errors,[],'Javascript errors at '+width+': '+errors.join('; '));
  await context.close();
 }
}finally{await browser.close()}
