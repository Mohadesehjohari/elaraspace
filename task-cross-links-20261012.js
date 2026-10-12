/* Cross-site jump links to the canonical task folder and list; no duplicate task state. */
(()=>{'use strict';
const read=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')||{}}catch{return{}}};
const fa=n=>Number(n||0).toLocaleString('fa-IR');
let running=false;
function decorate(){
 const state=read(),items=new Map((Array.isArray(state.tasks)?state.tasks:[]).map(t=>[String(t.id),t]));
 for(const row of document.querySelectorAll('#task-list .astra-task-row[data-key],.task-board-card[data-task-board-id],.feature-section-task-row[data-section-task-id]')){
  const task=items.get(String(row.dataset.key||row.dataset.taskBoardId||row.dataset.sectionTaskId||''));if(!task)continue;
  const src=String(task.list||'')+'|'+String(task.folder||'')+'|'+String(task.priority||'');
  if(row.dataset.orgLinked===src)continue;row.dataset.orgLinked=src;
  row.querySelector(':scope > .elara-task-cross-links')?.remove();
  const wrap=document.createElement('div');wrap.className='elara-task-cross-links';
  const add=(name,label)=>{const btn=document.createElement('button');btn.type='button';btn.dataset[name==='list'?'orgJumpList':'orgJumpFolder']=String(task[name]||'');btn.textContent=label;btn.title='باز کردن '+label;wrap.append(btn)};
  if(task.list)add('list',task.list);
  if(task.folder)add('folder',task.folder);
  else if(!task.list)add('folder','بدون پوشه');
  const priority=document.createElement('span');priority.className='elara-compact-priority p'+String(task.priority||4);priority.textContent='P'+String(task.priority||4);wrap.append(priority);
  if(task.time){const time=document.createElement('span');time.className='elara-compact-time';time.textContent='◷ '+task.time;wrap.append(time)}
  if(task.date){
   const now=new Date(),t=new Date(task.date+'T12:00:00'),d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12),n=Math.round((t-d)/86400000);
   if(Number.isFinite(n)){const left=document.createElement('span');left.className='elara-compact-days';left.textContent=n===0?'امروز':n>0?fa(n)+' روز مانده':fa(-n)+' روز گذشته';wrap.append(left)}
  }
  row.append(wrap);
 }
 const panel=document.getElementById('panel-tasks'),nav=document.getElementById('task-category-nav'),hero=document.getElementById('astra-task-hero');
 if(panel&&nav&&hero&&nav.previousElementSibling!==hero)hero.after(nav);
}
function schedule(){if(running)return;running=true;requestAnimationFrame(()=>{running=false;decorate()})}
function start(){
 schedule();const main=document.getElementById('main');
 if(main)new MutationObserver(x=>{if(x.some(a=>a.addedNodes.length||a.removedNodes.length))schedule()}).observe(main,{subtree:true,childList:true});
 for(const ev of ['elara:open','elara:data-changed','elara:task-category'])window.addEventListener(ev,schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();