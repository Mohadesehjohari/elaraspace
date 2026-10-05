/* Universal task interactions: hold/drag to trash + daily-repeat access across task surfaces. */
(()=>{'use strict';
const KEY='elara_space_v1';
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const surfaceSelector=[
  '#task-list .astra-task-row[data-key]',
  '.feature-section-task-row[data-section-task-id]',
  '.task-board-card[data-task-board-id]',
  '#panel-home .ref-task-row[data-key]',
  '.task-archive-row[data-task-archive-id]'
].join(',');
let gesture=null,suppressId='',suppressUntil=0,decorateQueued=false,observer=null;

function read(){try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');s.tasks=Array.isArray(s.tasks)?s.tasks:[];return s}catch{return{tasks:[]}}}
function taskById(id){return read().tasks.find(x=>String(x?.id)===String(id))||null}
function dailyTarget(task){const n=Math.round(Number(task?.dailyTarget)||1);return Math.max(1,Math.min(24,Number.isFinite(n)?n:1))}
function cardFrom(target){return target?.closest?.(surfaceSelector)||null}
function cardId(card){
 if(!card)return'';
 return String(card.dataset.key||card.dataset.sectionTaskId||card.dataset.taskBoardId||card.dataset.taskArchiveId||'');
}
function protectedTarget(target){
 return !!target?.closest?.('.check-button,.feature-section-task-check,.task-board-check,[data-ref-task],[data-task-drag],.task-drag-handle,.astra-task-more,[data-task-bulk],.task-daily-target-chip,input,select,textarea,a');
}
function taskTitle(card){
 return (card?.querySelector?.('.item-title,.task-summary-button strong,.task-board-open strong,.ref-task-row>strong,.task-archive-row strong')?.textContent||t('تسک','Task')).trim();
}
function trashTarget(){
 let target=document.getElementById('task-trash-drop');
 if(!target){target=document.createElement('div');target.id='task-trash-drop';target.setAttribute('role','status');document.body.append(target)}
 target.setAttribute('aria-live','polite');
 target.innerHTML='<span class="task-trash-icon" aria-hidden="true">🗑</span><span><b>'+t('سطل آشغال','Trash')+'</b><small>'+t('برای حذف، تسک را اینجا رها کن','Drop the task here to delete')+'</small></span>';
 return target
}
function makeGhost(card,id,x,y){
 const ghost=document.createElement('div');ghost.id='task-universal-drag-ghost';ghost.dataset.taskId=id;
 ghost.innerHTML='<span aria-hidden="true">↕</span><strong></strong>';ghost.querySelector('strong').textContent=taskTitle(card);
 document.body.append(ghost);moveGhost(ghost,x,y);return ghost
}
function moveGhost(ghost,x,y){if(!ghost)return;ghost.style.transform='translate3d('+(x+14)+'px,'+(y+14)+'px,0)'}
function cleanup(){
 if(!gesture)return;
 clearTimeout(gesture.timer);
 gesture.card?.classList.remove('is-universal-task-dragging');
 gesture.ghost?.remove();
 const trash=document.getElementById('task-trash-drop');if(trash){trash.hidden=true;trash.classList.remove('is-over')}
 document.body.classList.remove('task-universal-dragging');
 gesture=null
}
function activate(g){
 if(gesture!==g)return;
 g.active=true;g.card.classList.add('is-universal-task-dragging');document.body.classList.add('task-universal-dragging');
 try{g.card.setPointerCapture?.(g.pointerId)}catch{}
 g.ghost=makeGhost(g.card,g.id,g.x,g.y);const trash=trashTarget();trash.hidden=false;
 navigator.vibrate?.(18)
}
function pointerDown(e){
 if(window.ElaraCoreTaskHold)return;
 if(gesture||e.pointerType==='mouse'&&e.button!==0||protectedTarget(e.target))return;
 const card=cardFrom(e.target);if(!card)return;const id=cardId(card);if(!id)return;
 const g={card,id,pointerId:e.pointerId,pointerType:e.pointerType,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,active:false,moved:false,overTrash:false,ghost:null,timer:null};
 gesture=g;g.timer=setTimeout(()=>activate(g),e.pointerType==='touch'?430:320)
}
function pointerMove(e){
 const g=gesture;if(!g||e.pointerId!==g.pointerId)return;
 const distance=Math.hypot(e.clientX-g.x,e.clientY-g.y);g.lastX=e.clientX;g.lastY=e.clientY;
 if(!g.active){if(distance>10)cleanup();return}
 e.preventDefault();if(distance>12)g.moved=true;moveGhost(g.ghost,e.clientX,e.clientY);
 if(e.clientY<70)window.scrollBy(0,-14);else if(e.clientY>innerHeight-105)window.scrollBy(0,14);
 const trash=document.getElementById('task-trash-drop'),rect=trash?.getBoundingClientRect();
 g.overTrash=!!rect&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
 trash?.classList.toggle('is-over',g.overTrash)
}
function pointerEnd(e){
 const g=gesture;if(!g||e.pointerId!==g.pointerId)return;
 const active=g.active,over=g.overTrash,moved=g.moved,id=g.id,isMain=g.card.matches('#task-list .astra-task-row[data-key]');
 if(active){suppressId=id;suppressUntil=Date.now()+850}
 cleanup();
 if(!active)return;
 if(over){void window.ElaraTasks?.taskAction?.('delete-task',id);return}
 if(!moved&&isMain)window.ElaraTaskBulk?.enter?.(id)
}
function cancelGesture(){cleanup()}
function openDaily(id){
 if(!id)return;void window.ElaraTasks?.taskAction?.('view-task',id)
}
function chipFor(card){
 const id=cardId(card);if(!id)return;const task=taskById(id);if(!task)return;
 let chip=card.querySelector(':scope > .task-daily-target-chip');
 if(!chip){chip=document.createElement('button');chip.type='button';chip.className='task-daily-target-chip';card.append(chip)}
 const n=dailyTarget(task);chip.dataset.taskDailyOpen=id;chip.dataset.dailyTarget=String(n);chip.classList.toggle('is-multi',n>1);
 const text='↻'+n.toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');if(chip.textContent!==text)chip.textContent=text;
 chip.setAttribute('aria-label',t('تکرار در روز: '+n+' بار؛ برای تغییر باز کن','Repeat per day: '+n+'; open to change'));
 chip.title=t('تکرار در روز','Repeat per day')
}
function decorate(){
 decorateQueued=false;
 document.querySelectorAll(surfaceSelector).forEach(chipFor)
}
function scheduleDecorate(){if(decorateQueued)return;decorateQueued=true;requestAnimationFrame(decorate)}
function click(e){
 const chip=e.target.closest('[data-task-daily-open]');if(chip){e.preventDefault();e.stopPropagation();openDaily(chip.dataset.taskDailyOpen);return}
 if(Date.now()<suppressUntil){const card=cardFrom(e.target);if(card&&cardId(card)===suppressId){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;suppressId=''}}
}
function contextMenu(e){
 const card=cardFrom(e.target);if(!card)return;
 if(gesture?.card===card||e.pointerType==='touch'){e.preventDefault()}
}
function init(){
 window.ElaraUniversalTaskInteractions={decorate,cardId,surfaceSelector};
 document.addEventListener('pointerdown',pointerDown,true);
 document.addEventListener('pointermove',pointerMove,{capture:true,passive:false});
 document.addEventListener('pointerup',pointerEnd,true);
 document.addEventListener('pointercancel',cancelGesture,true);
 document.addEventListener('click',click,true);
 document.addEventListener('contextmenu',contextMenu,true);
 observer=new MutationObserver(scheduleDecorate);observer.observe(document.body,{childList:true,subtree:true});
 for(const ev of ['elara:data-changed','elara:state-committed','elara:open','elara:hydrate','elara:locale-changed'])window.addEventListener(ev,scheduleDecorate);
 decorate()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();