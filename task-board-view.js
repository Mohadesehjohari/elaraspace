(()=>{"use strict";
const STORAGE_KEY="elara_space_v1",MODE_KEY="elara_task_board_mode_v1";
const labels={list:"لیست",folder:"پوشه‌ها",priority:"اولویت‌ها"};
const priorityLabel={"1":"فوری · P1","2":"بالا · P2","3":"متوسط · P3","4":"عادی · P4"};
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function state(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch{return{}}}
function mode(){const v=localStorage.getItem(MODE_KEY);return ["list","folder","priority"].includes(v)?v:"list"}
function setMode(v){localStorage.setItem(MODE_KEY,v);render()}
function sourceAction(id,kind){
 const all=[...document.querySelectorAll("[data-id]")].filter(x=>String(x.dataset.id)===String(id));
 if(kind==="toggle")return all.find(x=>x.dataset.action==="toggle-task"||x.dataset.phase2Action==="toggle-task")||null;
 return all.find(x=>x.dataset.phase2Action==="view-task"||x.dataset.action==="edit-task")||null;
}
function toolbar(){
 const host=document.querySelector("#panel-tasks .list-toolbar .toolbar-title");if(!host)return null;
 let box=host.querySelector(".task-board-switch");if(box)return box;
 box=document.createElement("div");box.className="task-board-switch";box.setAttribute("role","group");box.setAttribute("aria-label","نمایش تسک‌ها");
 box.innerHTML=Object.entries(labels).map(([k,l])=>'<button type="button" data-task-board-mode="'+k+'">'+l+"</button>").join("");
 box.addEventListener("click",e=>{const b=e.target.closest("[data-task-board-mode]");if(b)setMode(b.dataset.taskBoardMode)});
 host.append(box);return box;
}
function visibleTasks(){
 const s=state(),tasks=Array.isArray(s.tasks)?s.tasks:[];
 const list=document.getElementById("task-list");if(!list)return tasks;
 const visibleIds=new Set([...list.querySelectorAll("[data-id]")].map(x=>x.dataset.id).filter(Boolean));
 return visibleIds.size?tasks.filter(t=>visibleIds.has(String(t.id))):tasks;
}
function groups(tasks,current){
 if(current==="folder"){
  const map=new Map();for(const t of tasks){const key=String(t.folder||"بدون پوشه").trim()||"بدون پوشه";if(!map.has(key))map.set(key,[]);map.get(key).push(t)}return [...map];
 }
 const map=new Map();for(const t of tasks){const key=String(t.priority||"4");if(!map.has(key))map.set(key,[]);map.get(key).push(t)}
 return ["1","2","3","4"].filter(k=>map.has(k)).map(k=>[priorityLabel[k],map.get(k)]);
}
function card(t){
 const source=String(t.sourceGroup||'personal'),sourceClass=['goal','exercise','language','book','focus','habit'].includes(source)?' source-'+source:'';
 const meta=[t.folder?"پوشه: "+esc(t.folder):"",t.tag?"#"+esc(t.tag):"",priorityLabel[String(t.priority||4)]].filter(Boolean).join(" · ");
 const status=t.completed?"انجام شد":Number(t.dailyTarget)>1?"در حال انجام":"در انتظار";
 return '<article class="task-board-card priority-'+esc(t.priority||4)+sourceClass+(t.completed?" is-done":"")+'" data-task-source="'+esc(source)+'" data-task-board-id="'+esc(t.id)+'">'+
 '<button type="button" class="task-board-check" data-board-toggle="'+esc(t.id)+'" aria-label="'+(t.completed?"بازگرداندن ":"تکمیل ")+esc(t.text||t.title||"تسک")+'">'+(t.completed?"✓":"")+"</button>"+
 '<button type="button" class="task-board-open" data-board-open="'+esc(t.id)+'"><strong>'+esc(t.text||t.title||"بدون عنوان")+"</strong><small>"+meta+"</small><em class=\"task-board-status\">"+status+"</em></button></article>";
}
function render(){
 const list=document.getElementById("task-list"),panel=document.getElementById("panel-tasks");if(!list||!panel)return;
 const box=toolbar(),current=mode();if(box)[...box.querySelectorAll("button")].forEach(b=>b.classList.toggle("active",b.dataset.taskBoardMode===current));
 let board=panel.querySelector("#task-board-view");if(!board){board=document.createElement("section");board.id="task-board-view";board.className="task-board-view";list.insertAdjacentElement("afterend",board);
 board.addEventListener("click",e=>{const toggle=e.target.closest("[data-board-toggle]");if(toggle){sourceAction(toggle.dataset.boardToggle,"toggle")?.click();return}
 const open=e.target.closest("[data-board-open]");if(open)sourceAction(open.dataset.boardOpen,"open")?.click();});}
 if(current==="list"){board.hidden=true;list.hidden=false;return}
 list.hidden=true;board.hidden=false;const tasks=visibleTasks(),chunks=groups(tasks,current);
 board.innerHTML=chunks.length?chunks.map(([name,items])=>'<section class="task-board-group"><header><strong>'+esc(name)+"</strong><span>"+items.length+'</span></header><div class="task-board-grid">'+items.map(card).join("")+"</div></section>").join(""):'<p class="empty-state">تسکی برای این نما نیست.</p>';
}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;render()})}
function boot(){render();const list=document.getElementById("task-list");if(list)new MutationObserver(schedule).observe(list,{childList:true,subtree:true,attributes:true});window.addEventListener("storage",schedule);document.addEventListener("elara:tasks-changed",schedule)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();