/* Elara Space: Persian purple streak calendar. Uses the canonical Tasks date selector.
 * No duplicate completion state, task data or task-management logic. */
(()=>{'use strict';
 const pad=n=>String(n).padStart(2,'0');
 const iso=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
 const parse=key=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(key)))return null;const d=new Date(key+'T12:00:00');return Number.isFinite(d.getTime())&&iso(d)===key?d:null};
 const plus=(date,days)=>{const d=new Date(date.getTime());d.setDate(d.getDate()+days);return d};
 const dayParts=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric'});
 const monthTitle=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'long'});
 const persianDay=date=>Number(dayParts.formatToParts(date).find(x=>x.type==='day')?.value||1);
 const monthStart=date=>{let d=new Date(date.getTime());for(let i=0;i<35&&persianDay(d)!==1;i++)d=plus(d,-1);return d};
 const fa=n=>Number(n||0).toLocaleString('fa-IR');
 const weekdays=['ش','ی','د','س','چ','پ','ج'];
 const TODAY=()=>iso(new Date());
 const state=()=>{try{const v=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
 const labelDate=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
 let selected=TODAY(),viewStart=monthStart(parse(TODAY())),dialog=null,returnFocus=null;
 function counters(date,s){
  const tasks=Array.isArray(s.tasks)?s.tasks:[];
  let total=0,done=0;
  for(const t of tasks){
   const due=t.recurrenceRule?!!window.ElaraSchedule?.applies?.(t,date):t.date===date;
   if(!due)continue;
   total++;
   if(window.ElaraTasks?.taskDone?.(t,date))done++;
  }
  return {total,done};
 }
 function ensureDialog(){
  if(dialog?.isConnected)return dialog;
  dialog=document.getElementById('elara-streak-calendar');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='elara-streak-calendar';dialog.className='elara-streak-calendar';dialog.setAttribute('aria-labelledby','elara-streak-calendar-title');dialog.setAttribute('dir','rtl');document.body.append(dialog)}
  dialog.addEventListener('click',event=>{
   if(event.target===dialog){close();return}
   const nav=event.target.closest('[data-elara-month]');if(nav){const direction=Number(nav.dataset.elaraMonth);viewStart=monthStart(plus(viewStart,direction>0?35:-1));render();return}
   if(event.target.closest('[data-elara-close-calendar]')){close();return}
   const day=event.target.closest('[data-elara-calendar-day]');if(day)choose(day.dataset.elaraCalendarDay);
  });
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null});
  return dialog;
 }
 function render(){
  const dlg=ensureDialog(),today=TODAY(),data=state(),yearLabel=monthTitle.format(viewStart);
  const native=document.getElementById('task-occurrence-date');
  const current=parse(native?.value)||parse(selected)||parse(today);
  selected=iso(current);
  let days=[],d=new Date(viewStart.getTime());
  for(let n=0;n<32;n++){
   if(n>0&&persianDay(d)===1)break;
   const date=iso(d),metric=counters(date,data);
   const done=metric.total>0&&metric.done===metric.total,partial=metric.done>0&&!done;
   days.push('<button type="button" class="elara-cal-day'+(date===selected?' is-selected':'')+(date===today?' is-today':'')+(done?' is-complete':'')+'" data-elara-calendar-day="'+date+'" aria-label="'+labelDate.format(d)+'، '+fa(metric.total)+' تسک، '+fa(metric.done)+' انجام‌شده" aria-pressed="'+(date===selected)+'"><span>'+fa(persianDay(d))+'</span>'+(metric.total?'<i class="'+(done?'is-gold':partial?'is-mixed':'is-aqua')+'" title="'+fa(metric.total)+' تسک"></i>':'')+'</button>');
   d=plus(d,1);
  }
  const lead=(viewStart.getDay()+1)%7;
  dlg.innerHTML='<div class="elara-cal-shell"><header class="elara-cal-head"><div><small>Elara Space · تقویم استریک</small><h2 id="elara-streak-calendar-title">تقویم کارهای من</h2></div><button type="button" class="elara-cal-close" data-elara-close-calendar aria-label="بستن تقویم">×</button></header>'+
    '<div class="elara-cal-month"><button type="button" data-elara-month="-1" aria-label="ماه قبل">❯</button><strong>'+yearLabel+'</strong><button type="button" data-elara-month="1" aria-label="ماه بعد">❮</button></div>'+
    '<div class="elara-cal-weekdays">'+weekdays.map(w=>'<span>'+w+'</span>').join('')+'</div>'+
    '<div class="elara-cal-days">'+Array.from({length:lead},()=>'<span class="elara-cal-blank" aria-hidden="true"></span>').join('')+days.join('')+'</div>'+
    '<div class="elara-cal-legend"><span><i class="is-aqua"></i>دارای تسک</span><span><i class="is-gold"></i>همه انجام‌شده</span><span><i class="is-mixed"></i>بخشی انجام‌شده</span></div>'+
    '<div class="elara-cal-bottom"><button type="button" data-elara-calendar-day="'+today+'" class="elara-cal-today">رفتن به امروز</button><small>یک روز را انتخاب کن تا تسک‌های همان تاریخ باز شوند.</small></div></div>';
 }
 function open(trigger){
  const el=ensureDialog(),input=document.getElementById('task-occurrence-date');
  selected=/^\d{4}-\d{2}-\d{2}$/.test(input?.value||'')?input.value:TODAY();
  viewStart=monthStart(parse(selected)||new Date());
  returnFocus=trigger||document.activeElement;
  render();if(!el.open)el.showModal();
 }
 function close(){if(dialog?.open)dialog.close()}
 function choose(date){
  if(!parse(date))return;
  selected=date;
  // "All tasks" includes source tasks; "today" is relative to the chosen occurrence date.
  window.ElaraTasks?.selectCategory?.('all');
  const filter=document.getElementById('task-filter');
  if(filter)filter.value='today';
  const input=document.getElementById('task-occurrence-date');
  if(input){input.value=date;input.dispatchEvent(new Event('change',{bubbles:true}))}
  window.ElaraTasks?.render?.();
  document.getElementById('panel-tasks')?.setAttribute('data-calendar-date',date);
  close();
  requestAnimationFrame(()=>{const anchor=document.getElementById('task-list')||document.getElementById('task-empty');anchor?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})});
 }
 function triggers(){
  for(const el of document.querySelectorAll('#panel-tasks #astra-task-hero .task-streak-summary,#panel-tasks #astra-task-streak')){
   el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label','نمایش تقویم بنفش استریک و تسک‌های هر روز');el.setAttribute('aria-haspopup','dialog');el.setAttribute('aria-controls','elara-streak-calendar');el.classList.add('elara-cal-trigger');
  }
 }
 document.addEventListener('click',event=>{
  const t=event.target.closest('#panel-tasks #astra-task-hero .task-streak-summary,#panel-tasks #astra-task-streak');
  if(!t||event.target.closest('a,button,input,select,textarea'))return;
  event.preventDefault();open(t);
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  const trigger=event.target.closest('.elara-cal-trigger');
  if(!trigger||event.target!==trigger)return;
  event.preventDefault();open(trigger);
 });
 function init(){
  triggers();
  window.addEventListener('elara:tasks-ready',triggers);
  window.addEventListener('elara:open',triggers);
  const panel=document.getElementById('panel-tasks');
  if(panel)new MutationObserver(records=>{
   if(records.some(x=>Array.from(x.addedNodes).some(n=>n.nodeType===1&&(n.matches?.('#astra-task-hero,#astra-task-streak')||n.querySelector?.('#astra-task-hero,#astra-task-streak')))))triggers();
  }).observe(panel,{subtree:true,childList:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.ElaraStreakCalendar={open:()=>open(document.querySelector('#astra-task-hero .task-streak-summary')),selectDate:choose};
})();