(()=>{'use strict';
const KEY='elara_space_v1',$=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const makeId=()=>crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
const selected=new Set();let selecting=false,pressTimer=null,pressStart=null,drag=null,ignoreClickUntil=0;
function read(){try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');s.tasks=Array.isArray(s.tasks)?s.tasks:[];s.taskLists=Array.isArray(s.taskLists)?s.taskLists:[];s.folders=Array.isArray(s.folders)?s.folders:[];s.taskCompletionHistory=Array.isArray(s.taskCompletionHistory)?s.taskCompletionHistory:[];return s}catch{return{tasks:[],taskLists:[],folders:[],taskCompletionHistory:[]}}}
function write(state){localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:state}));window.dispatchEvent(new Event('elara:data-changed'))}
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),3200)}
const list=()=>document.getElementById('task-list');
const rows=()=>[...(list()?.querySelectorAll(':scope > .astra-task-row[data-key]')||[])];
const visibleIds=()=>rows().filter(x=>!x.hidden).map(x=>x.dataset.key);
const rowById=id=>list()?.querySelector(':scope > .astra-task-row[data-key="'+CSS.escape(id)+'"]')||null;
function syncUi(){
 const panel=document.getElementById('panel-tasks');panel?.classList.toggle('task-selection-mode',selecting);
 for(const row of rows()){const on=selected.has(row.dataset.key);row.classList.toggle('is-selected',on);row.setAttribute('aria-selected',String(on));const b=row.querySelector('[data-task-select]');if(b){if(selecting){b.hidden=false;b.removeAttribute('hidden')}else{b.hidden=true;b.setAttribute('hidden','')}b.style.setProperty('display',selecting?'grid':'none','important');b.style.setProperty('visibility',selecting?'visible':'hidden','important');b.style.setProperty('opacity',selecting?'1':'0','important');b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?t('برداشتن از انتخاب','Deselect task'):t('انتخاب تسک','Select task'));b.textContent=on?'✓':'○'}}
 const bar=document.getElementById('task-bulk-toolbar');if(bar){bar.hidden=!selecting;const count=bar.querySelector('[data-task-selected-count]');if(count)count.textContent=Number(selected.size).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')}
 const toggle=document.getElementById('task-selection-toggle');if(toggle){toggle.setAttribute('aria-pressed',String(selecting));toggle.textContent=selecting?t('لغو انتخاب','Cancel selection'):t('انتخاب','Select')}
}
function decorate(){
 for(const row of rows()){
  if(!row.querySelector('[data-task-select]')){const b=document.createElement('button');b.type='button';b.className='task-select-control';b.dataset.taskSelect=row.dataset.key;b.setAttribute('aria-label',t('انتخاب تسک','Select task'));b.hidden=!selecting;if(selecting)b.removeAttribute('hidden');b.style.setProperty('display',selecting?'grid':'none','important');b.style.setProperty('visibility',selecting?'visible':'hidden','important');b.style.setProperty('opacity',selecting?'1':'0','important');b.textContent=selected.has(row.dataset.key)?'✓':'○';b.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();ignoreClickUntil=Date.now()+500;toggle(b.dataset.taskSelect)},{capture:true});row.insertBefore(b,row.firstChild)}
  if(!row.querySelector('[data-task-drag]')){const h=document.createElement('button');h.type='button';h.className='task-drag-handle';h.dataset.taskDrag=row.dataset.key;h.setAttribute('aria-label',t('جابجایی تسک؛ Alt و کلید بالا یا پایین برای مرتب‌سازی','Move task; use Alt + Up/Down to reorder'));h.innerHTML='<span aria-hidden="true">⋮⋮</span>';const more=row.querySelector('.astra-task-more');more?row.insertBefore(h,more):row.append(h)}
 }
 syncUi()
}
function ensureUi(){
 const panel=document.getElementById('panel-tasks'),toolbar=panel?.querySelector('.list-toolbar'),actions=panel?.querySelector('.elara-task-page-actions');if(!panel||!toolbar)return false;
 let toggle=document.getElementById('task-selection-toggle');
 if(!toggle){toggle=document.createElement('button');toggle.id='task-selection-toggle';toggle.type='button';toggle.className='quiet-button task-selection-toggle';toggle.setAttribute('aria-pressed','false');toggle.textContent=t('انتخاب','Select');toggle.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();ignoreClickUntil=Date.now()+500;selecting?cancel():enter()},{capture:true})}
 const visibleOwner=actions||toolbar;if(toggle.parentElement!==visibleOwner)visibleOwner.append(toggle);
 let bar=document.getElementById('task-bulk-toolbar');
 if(!bar){bar=document.createElement('div');bar.id='task-bulk-toolbar';bar.className='task-bulk-toolbar';bar.hidden=true;bar.dataset.elaraI18n='off';bar.innerHTML='<strong><span data-task-selected-count>0</span> '+t('انتخاب شده','selected')+'</strong><div><button type="button" data-task-bulk="all">'+t('انتخاب همه','Select all')+'</button><button type="button" data-task-bulk="duplicate">'+t('کپی','Duplicate')+'</button><button type="button" data-task-bulk="move">'+t('انتقال','Move')+'</button><button type="button" class="danger" data-task-bulk="delete">'+t('حذف','Delete')+'</button><button type="button" data-task-bulk="cancel">'+t('لغو','Cancel')+'</button></div>'}
 const filterDetails=toolbar.closest('.astra-task-filters'),anchor=filterDetails||panel.querySelector('#astra-task-toolbar')||toolbar;
 if(bar.previousElementSibling!==anchor||bar.parentElement!==anchor.parentElement)anchor.insertAdjacentElement('afterend',bar);
 decorate();return true
}
function enter(id=null){selecting=true;if(id)selected.add(id);syncUi()}
function cancel(){selecting=false;selected.clear();syncUi()}
function toggle(id){if(!selecting)enter(id);else{selected.has(id)?selected.delete(id):selected.add(id);selected.size?syncUi():cancel()}}
function baseSorted(state){
 const api=window.ElaraTasks,now=new Date().toISOString().slice(0,10);
 return [...state.tasks].sort((a,b)=>{
  const da=api?.taskDone?.(a,now)?1:0,db=api?.taskDone?.(b,now)?1:0;if(da!==db)return da-db;
  const oa=a.manualOrder!=null&&Number.isFinite(Number(a.manualOrder))?Number(a.manualOrder):null,ob=b.manualOrder!=null&&Number.isFinite(Number(b.manualOrder))?Number(b.manualOrder):null;
  if(oa!=null||ob!=null){const d=(oa??Number.MAX_SAFE_INTEGER)-(ob??Number.MAX_SAFE_INTEGER);if(d)return d}
  const va=api?.taskView?.(a,now)||a,vb=api?.taskView?.(b,now)||b,pd=Number(va.priority||4)-Number(vb.priority||4);if(pd)return pd;
  return String(a.date||'9999').localeCompare(String(b.date||'9999'))
 })
}
function persistDomOrder(){
 const visible=visibleIds();if(visible.length<2)return;const state=read(),base=baseSorted(state),set=new Set(visible),slots=[];base.forEach((x,i)=>{if(set.has(x.id))slots.push(i)});if(slots.length!==visible.length)return;
 const byTask=new Map(base.map(x=>[x.id,x]));slots.forEach((slot,i)=>base[slot]=byTask.get(visible[i]));base.forEach((task,i)=>task.manualOrder=i);
 const orders=new Map(base.map(x=>[x.id,x.manualOrder]));for(const task of state.tasks)task.manualOrder=orders.get(task.id)??task.manualOrder;
 write(state);window.ElaraTasks?.render?.();setTimeout(decorate,0)
}
function shift(id,delta){
 const row=rowById(id);if(!row)return;const candidates=rows().filter(x=>x.classList.contains('done')===row.classList.contains('done')),i=candidates.indexOf(row),target=candidates[i+delta];if(!target)return;
 delta<0?target.before(row):target.after(row);persistDomOrder();setTimeout(()=>rowById(id)?.querySelector('[data-task-drag]')?.focus(),30)
}
async function bulkDelete(){
 if(!selected.size)return;const n=selected.size;if(!(await window.ElaraDialog.confirm(t(n.toLocaleString('fa-IR')+' تسک انتخاب‌شده حذف شوند؟','Delete '+n+' selected tasks?'),{title:t('حذف گروهی','Bulk delete'),confirmText:t('حذف','Delete'),danger:true})))return;
 const state=read(),ids=new Set(selected);for(const task of state.tasks)if(ids.has(task.id)&&task.sourceManaged)window.ElaraLinkedTasks?.dismissTask?.(state,task);
 state.tasks=state.tasks.filter(x=>!ids.has(x.id));state.taskCompletionHistory=state.taskCompletionHistory.filter(x=>!ids.has(x.taskId));write(state);cancel();window.ElaraTasks?.render?.();toast(t('تسک‌های انتخاب‌شده حذف شدند.','Selected tasks deleted.'))
}
function cleanClone(task,index){
 const copy=typeof structuredClone==='function'?structuredClone(task):JSON.parse(JSON.stringify(task));copy.id=makeId();copy.text=String(task.text||'')+(document.documentElement.lang==='en'?' (copy)':' (کپی)');copy.createdAt=Date.now()+index;copy.completed=false;copy.doneAt=null;copy.xpAwarded=false;copy.occurrenceDone=[];copy.occurrenceRewardDays=[];copy.skippedDates=[];copy.occurrenceOverrides={};copy.manualOrder=null;
 for(const k of ['linkedTask','sourceType','sourceId','sourceParentId','sourceGroup','sourceLabel','sourceManaged','sourceCompletionLocked','sourceOwner','sourceUserEdited'])delete copy[k];return copy
}
function bulkDuplicate(){
 const state=read(),ids=new Set(selected),source=state.tasks.filter(x=>ids.has(x.id));if(!source.length)return;state.tasks.push(...source.map(cleanClone));write(state);cancel();window.ElaraTasks?.render?.();toast(t('کپی تسک‌ها ساخته شد.','Task copies created.'))
}
async function bulkMove(){
 const state=read();if(!selected.size)return;const wrap=document.createElement('div');wrap.className='task-bulk-move';wrap.dataset.elaraI18n='off';
 const opts=(items,noneFa,noneEn)=>'<option value="__keep__">'+t('بدون تغییر','Keep unchanged')+'</option><option value="__none__">'+t(noneFa,noneEn)+'</option>'+items.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 wrap.innerHTML='<label>'+t('لیست','List')+'<select name="list">'+opts(state.taskLists,'بدون لیست','No list')+'</select></label><label>'+t('پوشه','Folder')+'<select name="folder">'+opts(state.folders,'بدون پوشه','No folder')+'</select></label>';
 const ok=await window.ElaraDialog.open({title:t('انتقال تسک‌ها','Move tasks'),content:wrap,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('انتقال','Move'),value:true,kind:'primary'}]});if(ok!==true)return;
 const listValue=wrap.querySelector('[name=list]').value,folderValue=wrap.querySelector('[name=folder]').value,ids=new Set(selected);
 for(const task of state.tasks)if(ids.has(task.id)){if(listValue!=='__keep__')task.list=listValue==='__none__'?'':listValue;if(folderValue!=='__keep__')task.folder=folderValue==='__none__'?'':folderValue}
 write(state);cancel();window.ElaraTasks?.render?.();toast(t('تسک‌ها منتقل شدند.','Tasks moved.'))
}
async function bulk(action){if(action==='cancel'){cancel();return}if(action==='all'){selecting=true;for(const id of visibleIds())selected.add(id);syncUi();return}if(action==='delete')return bulkDelete();if(action==='duplicate'){bulkDuplicate();return}if(action==='move')return bulkMove()}
function clearPress(){clearTimeout(pressTimer);pressTimer=null;pressStart=null}
function startCardPress(e,row){
 if(e.pointerType==='mouse'&&e.button!==0)return;if(e.target.closest('.check-button,.astra-task-more,.task-select-control,.task-drag-handle,input,select,textarea,a'))return;clearPress();pressStart={x:e.clientX,y:e.clientY,id:row.dataset.key,pointerId:e.pointerId};
 pressTimer=setTimeout(()=>{ignoreClickUntil=Date.now()+700;enter(row.dataset.key);navigator.vibrate?.(18);clearPress()},e.pointerType==='touch'?560:520)
}
function moveCardPress(e){if(pressStart&&Math.hypot(e.clientX-pressStart.x,e.clientY-pressStart.y)>9)clearPress()}
function dragStart(e,handle){
 if(e.button!==undefined&&e.button!==0)return;const row=handle.closest('.astra-task-row');if(!row)return;e.preventDefault();
 const state={id:row.dataset.key,row,handle,pointerId:e.pointerId,x:e.clientX,y:e.clientY,started:false,timer:null};drag=state;
 const activate=()=>{if(drag!==state)return;state.started=true;ignoreClickUntil=Date.now()+800;row.classList.add('is-dragging');handle.setPointerCapture?.(e.pointerId);document.body.classList.add('task-reordering')};
 if(e.pointerType==='touch')state.timer=setTimeout(activate,180);else activate()
}
function dragMove(e){
 if(!drag||e.pointerId!==drag.pointerId)return;if(!drag.started){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){clearTimeout(drag.timer);drag=null}return}
 e.preventDefault();if(e.clientY<70)window.scrollBy(0,-18);else if(e.clientY>innerHeight-90)window.scrollBy(0,18);
 const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('#task-list > .astra-task-row');if(!hit||hit===drag.row||hit.classList.contains('done')!==drag.row.classList.contains('done'))return;const r=hit.getBoundingClientRect();e.clientY<r.top+r.height/2?hit.before(drag.row):hit.after(drag.row)
}
function dragEnd(e){
 if(!drag||e.pointerId!==drag.pointerId)return;clearTimeout(drag.timer);const was=drag.started,id=drag.id,row=drag.row;drag=null;row.classList.remove('is-dragging');document.body.classList.remove('task-reordering');if(was){persistDomOrder();setTimeout(()=>rowById(id)?.querySelector('[data-task-drag]')?.focus(),20)}
}
document.addEventListener('click',e=>{
 if(Date.now()<ignoreClickUntil&&e.target.closest('#task-selection-toggle,[data-task-select],#task-list > .astra-task-row[data-key]')){e.preventDefault();e.stopImmediatePropagation();return}
 if(e.target.closest('#task-selection-toggle')){e.preventDefault();selecting?cancel():enter();return}
 const select=e.target.closest('[data-task-select]');if(select){e.preventDefault();e.stopImmediatePropagation();toggle(select.dataset.taskSelect);return}
 const action=e.target.closest('[data-task-bulk]');if(action){e.preventDefault();void bulk(action.dataset.taskBulk);return}
 if(selecting){const row=e.target.closest('#task-list > .astra-task-row[data-key]');if(row&&!e.target.closest('[data-task-drag]')){e.preventDefault();e.stopImmediatePropagation();toggle(row.dataset.key)}}
},true);
document.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-task-drag]');if(handle){dragStart(e,handle);return}const row=e.target.closest('#task-list > .astra-task-row[data-key]');if(row)startCardPress(e,row)},true);
document.addEventListener('pointermove',e=>{moveCardPress(e);dragMove(e)},true);
document.addEventListener('pointerup',e=>{clearPress();dragEnd(e)},true);document.addEventListener('pointercancel',e=>{clearPress();dragEnd(e)},true);
document.addEventListener('keydown',e=>{const h=e.target.closest?.('[data-task-drag]');if(h&&e.altKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();shift(h.dataset.taskDrag,e.key==='ArrowUp'?-1:1)}if(e.key==='Escape'&&selecting){e.preventDefault();cancel()}},true);
window.addEventListener('elara:data-changed',()=>setTimeout(decorate,0));window.addEventListener('elara:locale-changed',()=>{document.getElementById('task-selection-toggle')?.remove();document.getElementById('task-bulk-toolbar')?.remove();setTimeout(ensureUi,0)});window.addEventListener('elara:open',e=>{if(e.detail?.tab==='tasks')setTimeout(ensureUi,50);else if(selecting)cancel()});window.addEventListener('hashchange',()=>{if(location.hash!=='#tasks'&&selecting)cancel();setTimeout(ensureUi,80)});
let observer=null,mountAttempts=0;
function start(){
 const target=list();
 if(ensureUi()&&target){
  if(!observer){observer=new MutationObserver(()=>decorate());observer.observe(target,{childList:true})}
  decorate();return true
 }
 if(mountAttempts++<24)setTimeout(start,100);
 return false
}
window.ElaraTaskBulk={enter,cancel,toggle,bulk,persistDomOrder,shift,selected,start};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else queueMicrotask(start);
})();