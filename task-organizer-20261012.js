/* Folder → list → tasks. No separate task database. */
(()=>{'use strict';
const KEY='elara_space_v1',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=()=>{try{return JSON.parse(window.ElaraCloudStorage.getItem(KEY)||'{}')||{}}catch{return{}}};
const fa=n=>Number(n||0).toLocaleString('fa-IR');
const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const meta=(s,n)=>s.taskListDetails?.[n]||{folder:'',description:''};
const openedFolders=new Set(),openedLists=new Set();let focusList='',focusFolder='',scheduled=false;
function store(s){
 s.taskLists=Array.isArray(s.taskLists)?s.taskLists:[];s.folders=Array.isArray(s.folders)?s.folders:[];
 s.taskListDetails=s.taskListDetails&&typeof s.taskListDetails==='object'?s.taskListDetails:{};
 window.ElaraCloudStorage.setItem(KEY,JSON.stringify(s));
 window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}));
 window.dispatchEvent(new Event('elara:data-changed'));
 window.ElaraTasks?.render?.();
}
function completed(t){return !!window.ElaraTasks?.taskDone?.(t)}
function ensure(){
 const nav=document.getElementById('task-category-nav');if(!nav)return null;
 let root=document.getElementById('task-organizer');
 if(!root){root=document.createElement('section');root.id='task-organizer';root.className='task-organizer';root.hidden=true;
 root.innerHTML='<header><div><h2>لیست‌ها و پوشه‌ها</h2><small>تسک‌های بدون پوشه و لیست نیز اینجا دیده می‌شوند.</small></div><div><button type="button" data-org-folder-new>+ پوشه</button><button type="button" data-org-list-new>+ لیست</button></div></header><div class="org-tree"></div>';
 nav.after(root)}
 return root;
}
function task(t){
 const done=completed(t),day=localDay(),target=window.ElaraTasks?.taskDailyTarget?.(t,day)??Math.max(1,Math.min(24,Math.round(Number(t.dailyTarget)||1))),count=window.ElaraTasks?.taskDailyProgress?.(t,day)??Number(t.dailyProgress?.[day]||0);
 return '<div class="org-task-row"><button type="button" data-org-toggle data-id="'+esc(t.id)+'" aria-pressed="'+done+'" title="وضعیت تسک">'+(done?'<img src="assets/ui/task-complete-user-blue.webp" alt="">':'')+'</button><span dir="auto">'+esc(t.text)+'</span>'+(target>1?'<small>'+fa(count)+'/'+fa(target)+'</small>':'')+'</div>';
}
function list(s,name){
 const desc=meta(s,name).description,rows=(s.tasks||[]).filter(t=>t.list===name),done=rows.filter(completed).length;
 return '<details class="org-list" data-org-list="'+esc(name)+'" '+(openedLists.has(name)||focusList===name?'open':'')+'><summary><span aria-hidden="true">☑</span><div><strong>'+esc(name)+'</strong><small>'+esc(desc||'بدون توضیحات')+'</small></div><b>'+fa(done)+' / '+fa(rows.length)+'</b><i>⌄</i></summary><div class="org-list-body"><div class="org-list-tools"><button type="button" data-org-task-new="'+esc(name)+'">+ تسک</button><button type="button" data-org-list-edit="'+esc(name)+'">ویرایش</button><button type="button" class="org-delete" data-org-list-delete="'+esc(name)+'">حذف لیست</button></div>'+ (rows.length?rows.map(task).join(''):'<p class="org-empty">لیست خالی است؛ یک تسک اضافه کن.</p>')+'</div></details>';
}
function folder(s,name,mode){
 const lists=(s.taskLists||[]).filter(n=>(meta(s,n).folder||'')===name);
 const noList=(s.tasks||[]).filter(t=>!t.list&&(t.folder||'')===name);
 const count=lists.reduce((n,k)=>n+(s.tasks||[]).filter(t=>t.list===k).length,0)+noList.length;
 const open=openedFolders.has(name)||focusFolder===name||(mode==='lists'&&!focusList);
 return '<details class="org-folder" data-org-folder="'+esc(name)+'" '+(open?'open':'')+'><summary><span aria-hidden="true">▣</span><strong>'+esc(name||'بدون پوشه')+'</strong><small>'+fa(lists.length)+' لیست · '+fa(count)+' تسک</small><i>⌄</i></summary><div class="org-folder-body"><div class="org-folder-tools"><button type="button" data-org-list-new data-folder="'+esc(name)+'">+ لیست</button><button type="button" data-org-task-new="" data-folder="'+esc(name)+'">+ تسک</button>'+(name?'<button type="button" class="org-delete" data-org-folder-delete="'+esc(name)+'">حذف پوشه</button>':'')+'</div>'+lists.map(k=>list(s,k)).join('')+(noList.length?'<div class="org-no-list"><strong>بدون لیست</strong>'+noList.map(task).join('')+'</div>':'')+(!count&&!lists.length?'<p class="org-empty">هنوز موردی ثبت نشده.</p>':'')+'</div></details>';
}
function render(){
 const root=ensure();if(!root)return;
 const active=document.querySelector('#task-category-nav [data-task-category][aria-pressed=true]')?.dataset.taskCategory||'all';
 root.hidden=!['lists','folders'].includes(active);
 document.getElementById('panel-tasks')?.classList.toggle('org-directory-mode',!root.hidden);
 if(root.hidden)return;
 const s=get();s.tasks=Array.isArray(s.tasks)?s.tasks:[];s.taskLists=Array.isArray(s.taskLists)?s.taskLists:[];s.folders=Array.isArray(s.folders)?s.folders:[];
 const folders=[...new Set([...s.folders,...Object.values(s.taskListDetails||{}).map(x=>x?.folder||''),...s.tasks.map(t=>t.folder||'')])].filter(Boolean);
 root.querySelector('.org-tree').innerHTML=folders.map(n=>folder(s,n,active)).join('')+folder(s,'',active);
}
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})}
function modal(kind,old='',folder=''){
 let d=document.getElementById('org-edit-modal');if(!d){d=document.createElement('dialog');d.id='org-edit-modal';d.className='org-edit-modal';document.body.append(d)}
 const s=get(),m=meta(s,old),lists=Array.isArray(s.folders)?s.folders:[],isList=kind==='list';
 d.innerHTML='<form><header><h2>'+(old?'ویرایش لیست':isList?'افزودن لیست':'افزودن پوشه')+'</h2><button type="button" data-org-close>×</button></header><label>عنوان<input name="title" value="'+esc(old)+'" maxlength="60" required placeholder="عنوان را بنویس"></label>'+(isList?'<label>توضیحات<textarea name="description" maxlength="2000" rows="3" placeholder="دربارهٔ این لیست">'+esc(m.description||'')+'</textarea></label><label>پوشه<select name="folder"><option value="">بدون پوشه</option>'+lists.map(n=>'<option value="'+esc(n)+'" '+((folder||m.folder||'')===n?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label>':'')+'<footer><button type="button" data-org-close>لغو</button><button type="submit">ذخیره</button></footer></form>';
 d.querySelectorAll('[data-org-close]').forEach(x=>x.addEventListener('click',()=>d.close()));
 d.querySelector('form').addEventListener('submit',e=>{
  e.preventDefault();const f=e.currentTarget,title=f.elements.title.value.trim().slice(0,60),state=get();if(!title)return;
  state.tasks=Array.isArray(state.tasks)?state.tasks:[];state.folders=Array.isArray(state.folders)?state.folders:[];state.taskLists=Array.isArray(state.taskLists)?state.taskLists:[];state.taskListDetails=state.taskListDetails&&typeof state.taskListDetails==='object'?state.taskListDetails:{};
  if(isList){
   if(state.taskLists.some(n=>n.toLowerCase()===title.toLowerCase()&&n!==old)){f.elements.title.setCustomValidity('این نام تکراری است');f.reportValidity();return}
   if(old&&title!==old){state.taskLists=state.taskLists.map(x=>x===old?title:x);state.tasks.forEach(t=>{if(t.list===old)t.list=title});delete state.taskListDetails[old]}
   if(!state.taskLists.includes(title))state.taskLists.push(title);
   const parent=f.elements.folder.value;
   state.taskListDetails[title]={description:f.elements.description.value.trim().slice(0,2000),folder:parent};
   state.tasks.forEach(t=>{if(t.list===title)t.folder=parent});
   focusFolder=parent;focusList=title;openedFolders.add(parent);openedLists.add(title);
  }else{
   if(state.folders.some(n=>n.toLowerCase()===title.toLowerCase())){f.elements.title.setCustomValidity('این نام تکراری است');f.reportValidity();return}
   state.folders.push(title);focusFolder=title;openedFolders.add(title);
  }
  d.close();store(state);window.ElaraTasks?.selectCategory?.(isList?'lists':'folders');queue();
 });
 d.showModal();d.querySelector('input')?.focus();
}
async function removeGroup(kind,name){
 const isList=kind==='list',label=isList?'لیست':'پوشه';
 const ok=window.ElaraDialog?.confirm
  ? await window.ElaraDialog.confirm('«'+name+'» حذف شود؟ تسک‌ها نگه داشته می‌شوند و فقط دسته‌بندی‌شان تغییر می‌کند.',{title:'حذف '+label,danger:true,confirmText:'حذف'})
  : window.confirm('«'+name+'» حذف شود؟ تسک‌ها حذف نمی‌شوند.');
 if(!ok)return false;
 const s=get();s.tasks=Array.isArray(s.tasks)?s.tasks:[];
 s.taskLists=Array.isArray(s.taskLists)?s.taskLists:[];
 s.folders=Array.isArray(s.folders)?s.folders:[];
 s.taskListDetails=s.taskListDetails&&typeof s.taskListDetails==='object'?s.taskListDetails:{};
 if(isList){
  const parent=meta(s,name).folder||'';
  s.taskLists=s.taskLists.filter(n=>n!==name);
  delete s.taskListDetails[name];
  s.tasks.forEach(t=>{if(t.list===name){t.list='';t.folder=parent}
   Object.values(t.occurrenceOverrides||{}).forEach(o=>{if(o?.list===name){o.list='';o.folder=parent}})
  });
  openedLists.delete(name);if(focusList===name)focusList='';
 }else{
  if(!name)return;
  s.folders=s.folders.filter(n=>n!==name);
  Object.values(s.taskListDetails).forEach(d=>{if(d?.folder===name)d.folder=''});
  s.tasks.forEach(t=>{if(t.folder===name)t.folder='';
   Object.values(t.occurrenceOverrides||{}).forEach(o=>{if(o?.folder===name)o.folder=''})
  });
  openedFolders.delete(name);if(focusFolder===name)focusFolder='';
 }
 store(s);queue();return true;
}
function addTask(list='',folder=''){
 window.ElaraTasks?.openComposer?.({focus:false});
 requestAnimationFrame(()=>{const x=get(),l=document.getElementById('task-list-name'),f=document.getElementById('task-folder');if(l)l.value=list;if(f)f.value=list?meta(x,list).folder||'':folder;document.getElementById('task-title')?.focus()});
}
function jump(list='',folder=''){
 focusFolder=folder;focusList=list;openedFolders.add(folder);if(list)openedLists.add(list);
 window.ElaraOpen?.('tasks');window.ElaraTasks?.selectCategory?.(list?'lists':'folders');queue();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-org-folder-new],[data-org-list-new],[data-org-list-edit],[data-org-task-new],[data-org-toggle],[data-org-jump-list],[data-org-jump-folder],[data-org-list-delete],[data-org-folder-delete]');
 if(!b)return;e.preventDefault();e.stopImmediatePropagation();
 if(b.hasAttribute('data-org-folder-new'))modal('folder');
 else if(b.hasAttribute('data-org-list-new'))modal('list','',b.dataset.folder||'');
 else if(b.hasAttribute('data-org-list-edit'))modal('list',b.dataset.orgListEdit);
 else if(b.hasAttribute('data-org-list-delete'))void removeGroup('list',b.dataset.orgListDelete);
 else if(b.hasAttribute('data-org-folder-delete'))void removeGroup('folder',b.dataset.orgFolderDelete);
 else if(b.hasAttribute('data-org-task-new'))addTask(b.dataset.orgTaskNew,b.dataset.folder||'');
 else if(b.hasAttribute('data-org-toggle'))void window.ElaraTasks?.taskAction?.('toggle-task',b.dataset.id);
 else if(b.hasAttribute('data-org-jump-list')){const s=get();jump(b.dataset.orgJumpList,meta(s,b.dataset.orgJumpList).folder||'')}
 else if(b.hasAttribute('data-org-jump-folder'))jump('',b.dataset.orgJumpFolder);
},true);
document.addEventListener('toggle',e=>{const x=e.target;if(x?.matches?.('.org-folder'))x.open?openedFolders.add(x.dataset.orgFolder):openedFolders.delete(x.dataset.orgFolder);if(x?.matches?.('.org-list'))x.open?openedLists.add(x.dataset.orgList):openedLists.delete(x.dataset.orgList)},true);
document.addEventListener('change',e=>{const el=e.target;if(el?.id==='task-list-name'&&el.value){const f=document.getElementById('task-folder');if(f)f.value=meta(get(),el.value).folder||''}if(el?.matches?.('[data-detail=list]')&&el.value){const f=el.closest('form')?.querySelector('[data-detail=folder]');if(f)f.value=meta(get(),el.value).folder||''}},true);
window.addEventListener('elara:task-category',queue);window.addEventListener('elara:data-changed',queue);window.addEventListener('elara:open',queue);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
window.ElaraTaskOrganizer={jump,refresh:queue,removeGroup};
})();