/* Cross-site jump links to the canonical task folder and list; no duplicate task state. */
(()=>{'use strict';
const read=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')||{}}catch{return{}}};
const fa=n=>Number(n||0).toLocaleString('fa-IR');
let running=false;
function decorate(){
 const state=read(),items=new Map((Array.isArray(state.tasks)?state.tasks:[]).map(t=>[String(t.id),t]));
 for(const row of document.querySelectorAll('#task-list .astra-task-row[data-key],.task-board-card[data-task-board-id],.feature-section-task-row[data-section-task-id]')){
  const task=items.get(String(row.dataset.key||row.dataset.taskBoardId||row.dataset.sectionTaskId||''));if(!task)continue;
  const src=['chip-v3',task.list||'',task.folder||'',task.priority||'',task.time||'',task.date||''].join('|');
  if(row.dataset.orgLinked===src&&row.querySelector(':scope > .elara-task-cross-links.elara-task-meta-grid'))continue;
  row.dataset.orgLinked=src;
  row.querySelector(':scope > .elara-task-cross-links')?.remove();
  const wrap=document.createElement('div');
  wrap.className='elara-task-cross-links elara-task-meta-grid';
  wrap.setAttribute('dir','rtl');
  const folder=String(task.folder||'').trim(),list=String(task.list||'').trim();
  // No fake "بدون پوشه" chip: the priority and timing use the freed space.
  // A real list stays clickable even when no folder has been assigned.
  if(list||folder){
   const path=document.createElement('button');
   path.type='button';
   path.className='elara-task-path-link';
   path.textContent=list||folder;
   path.dataset[list?'orgJumpList':'orgJumpFolder']=list||folder;
   path.title=list?(folder?'پوشه: '+folder+' ← لیست: '+list:'لیست: '+list):('پوشه: '+folder);
   path.setAttribute('aria-label','رفتن به '+path.title);
   wrap.append(path);
  }
  const priority=document.createElement('span');
  const level=String(task.priority||'4');
  priority.className='elara-compact-priority p'+level;
  priority.textContent='P'+level;
  priority.title='اولویت P'+level;
  wrap.append(priority);
  const pieces=[];
  if(task.time)pieces.push('◷ '+String(task.time));
  if(task.date){
   const now=new Date(),t=new Date(String(task.date)+'T12:00:00'),d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
   const delta=Math.round((t-d)/86400000);
   if(Number.isFinite(delta))pieces.push(delta===0?'امروز':delta>0?fa(delta)+' روز مانده':fa(-delta)+' روز گذشته');
  }
  if(pieces.length){
   const timing=document.createElement('span');
   timing.className='elara-task-timing';
   timing.textContent=pieces.join(' · ');
   timing.title=pieces.join(' · ');
   wrap.append(timing);
  }
  row.append(wrap);
 }

 // Home preview, completed archive and deferred task queues use title as the jump target
 // without adding decorative badges or increasing their height.
 for(const row of document.querySelectorAll('#panel-home .ref-task-row[data-key],#task-checked-archive .task-archive-row[data-task-archive-id],#task-status-groups .task-status-group article')){
  const id=row.dataset.key||row.dataset.taskArchiveId||row.querySelector('[data-task-restore]')?.dataset.taskRestore;
  const task=items.get(String(id||''));if(!task)continue;
  const strong=row.matches('.ref-task-row')?row.querySelector('.ref-task-copy>strong'):row.querySelector('strong');
  if(!strong)continue;
  if(!task.list&&!task.folder){strong.removeAttribute('data-org-jump-list');strong.removeAttribute('data-org-jump-folder');continue}
  if(task.list){strong.dataset.orgJumpList=task.list;strong.removeAttribute('data-org-jump-folder')}
  else{strong.dataset.orgJumpFolder=task.folder;strong.removeAttribute('data-org-jump-list')}
  strong.setAttribute('role','link');strong.tabIndex=0;
  strong.title='رفتن به '+(task.list?'لیست '+task.list:'پوشه '+task.folder);
 }
 const panel=document.getElementById('panel-tasks'),nav=document.getElementById('task-category-nav'),hero=document.getElementById('astra-task-hero');
 if(panel)for(const el of panel.querySelectorAll('a,button')){if((el.textContent||'').includes('بازگشت به خانه'))el.classList.add('elara-task-back-home-hidden')}
 if(panel&&nav&&hero&&nav.previousElementSibling!==hero)hero.after(nav);
}
function schedule(){if(running)return;running=true;requestAnimationFrame(()=>{running=false;decorate()})}
document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target?.matches?.('#panel-home [data-org-jump-list],#panel-home [data-org-jump-folder],#task-checked-archive strong[data-org-jump-list],#task-checked-archive strong[data-org-jump-folder]')){event.preventDefault();event.target.click()}});
function start(){
 schedule();const main=document.getElementById('main');
 if(main)new MutationObserver(x=>{if(x.some(a=>a.addedNodes.length||a.removedNodes.length))schedule()}).observe(main,{subtree:true,childList:true});
 for(const ev of ['elara:open','elara:data-changed','elara:task-category'])window.addEventListener(ev,schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();