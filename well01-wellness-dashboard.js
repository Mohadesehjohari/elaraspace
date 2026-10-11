/* WELL-01: private, reference-led wellness dashboard; additive UI only. No migration or data writes. */
(()=>{'use strict';
const panelId='panel-exercise',localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>window.ElaraSchedule?.today?.()||localDate(new Date());
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fa=x=>Number(x||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');
const en=()=>document.documentElement.lang==='en',tx=(fa,enText)=>en()?enText:fa;
const safeNum=(value,min=0,max=100000)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):0};
const route=(name)=>'wellness-'+name;
function read(){
 const id=uid();if(!id)return {water:{},sleep:[],workouts:[],workoutPlanFolders:[],nutritionPlanFolders:[]};
 try{
  const s=JSON.parse(localStorage.getItem('elara_private_wellness_v1_'+id)||'{}')||{};
  return {...s,water:s.water&&typeof s.water==='object'&&!Array.isArray(s.water)?s.water:{},sleep:Array.isArray(s.sleep)?s.sleep:[],workouts:Array.isArray(s.workouts)?s.workouts:[],workoutPlanFolders:Array.isArray(s.workoutPlanFolders)?s.workoutPlanFolders:[],nutritionPlanFolders:Array.isArray(s.nutritionPlanFolders)?s.nutritionPlanFolders:[]};
 }catch{return {water:{},sleep:[],workouts:[],workoutPlanFolders:[],nutritionPlanFolders:[]}}
}
function taskData(){
 try{
  const state=JSON.parse(localStorage.getItem('elara_space_v1')||'{}'),day=today();
  return (Array.isArray(state.tasks)?state.tasks:[]).filter(t=>(t?.sourceGroup==='exercise'||t?.sourceGroup==='wellness')&&window.ElaraSchedule?.taskDue?.(t,day)!==false).slice(0,6);
 }catch{return []}
}
const sleepMinutes=x=>{const lib=window.ElaraWellnessTest?.sleepMinutes;if(lib)return lib(x);if(!x?.date||!x?.bed||!x?.wake)return 0;const start=Date.parse(x.date+'T'+x.bed+':00'),end=Date.parse(x.date+'T'+x.wake+':00');return Number.isFinite(start)&&Number.isFinite(end)?Math.max(0,Math.min(1440,(end<=start?end+86400000:end)-start)/60000):0};
function week(){return Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);return localDate(d)})}
const sleepOf=(s,date)=>s.sleep.filter(x=>x.date===date).reduce((n,x)=>n+sleepMinutes(x),0);
const workoutOf=(s,date)=>s.workouts.filter(x=>x.date===date).reduce((n,x)=>n+safeNum(x.minutes,0,1440),0);
const unitHours=m=>m?fa(Math.round(m/6)/10):fa(0);
function mini(values,type){
 const max=Math.max(...values,0);
 if(!max)return '<span class="well01-no-data">'+tx('هنوز داده‌ای ثبت نشده','No records yet')+'</span>';
 return '<div class="well01-bars '+type+'" role="img" aria-label="'+tx('نمودار هفت روز ثبت‌شده','Seven-day chart')+'">'+values.map((v,i)=>'<span title="'+esc(week()[i])+' · '+fa(Math.round(v*10)/10)+'" style="--bar:'+Math.max(3,Math.round(v/max*100))+'%"></span>').join('')+'</div>';
}
function shortcut(kind,icon,label,desc){
 const art={
  water:'<path d="M12 2C9 6 5.5 10.5 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10.5 15 6 12 2Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  sleep:'<path d="M20.6 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.6 14.1Z"/><path d="M17 3v4m-2-2h4"/>',
  weight:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M9 9a4 4 0 0 1 6 0l-3 4-3-4Z"/>',
  exercise:'<path d="M3 9v6M6 6v12m12-12v12m3-9v6M6 12h12"/>',
  analysis:'<path d="M4 20V11h3v9m4 0V5h3v15m4 0v-7h3v7M3 22h19"/>'
 };
 const svg='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">'+art[kind]+'</svg>';
 return '<button class="well01-shortcut well01-'+kind+'" type="button" data-feature-route="'+route(kind)+'"><span class="well01-shortcut-icon">'+svg+'</span><span class="well01-shortcut-label"><strong>'+label+'</strong><small>'+desc+'</small></span><span class="well01-arr" aria-hidden="true">‹</span></button>';
}
function tasks(){
 const rows=taskData();
 return '<article class="well01-card well01-task-card"><header><h2><span class="well01-title-icon">☷</span>'+tx('تسک‌های ورزش و سلامتی','Wellness tasks')+'</h2><small>'+tx('امروز','Today')+'</small></header><div class="well01-task-list">'+(rows.length?rows.map(t=>{
  const done=!!window.ElaraTasks?.taskDone?.(t,today()),name=t.title||t.text||t.name||tx('تسک بدون نام','Untitled task');
  return '<button type="button" class="well01-task-row '+(done?'is-done':'')+'" data-section-task-toggle="'+esc(t.id)+'" aria-pressed="'+done+'"><span class="well01-checkbox">'+(done?'✓':'')+'</span><span class="well01-task-text" data-elara-ugc dir="auto">'+esc(name)+'</span><span class="well01-task-tick" aria-hidden="true">'+(done?'✓':'')+'</span></button>'
 }).join(''):'<p class="well01-empty">'+tx('هنوز تسک ورزشی برای امروز ثبت نکرده‌ای.','No wellness tasks scheduled today.')+'</p>')+'</div><button class="well01-subaction" type="button" data-section-task-add="exercise">+ '+tx('افزودن تسک جدید','Add task')+'</button></article>';
}
function planSummary(s,kind){
 const prefix=kind==='workout'?'workout':'nutrition';
 const note=String(s[prefix+'PlanNote']||'').trim();
 const folders=s[prefix+'PlanFolders'].filter(x=>x&&x.id&&x.title);
 const first=folders[0];
 const mainText=note||String(first?.note||'').trim();
 const title=kind==='workout'?tx('برنامه تمرینی','Training plan'):tx('برنامه تغذیه','Nutrition plan');
 const icon=kind==='workout'?'🏋️':'🌿',label=kind==='workout'?tx('ایجاد برنامه تمرینی','Create training plan'):tx('ایجاد برنامه تغذیه','Create nutrition plan');
 return '<article class="well01-card well01-plan well01-'+kind+'-plan"><header><h2><span class="well01-title-icon">'+icon+'</span>'+title+'</h2><button type="button" class="well01-edit" data-well01-plan-edit="'+kind+'" aria-label="'+tx('ویرایش برنامه','Edit plan')+'">✎</button></header><div class="well01-plan-body">'+(mainText?'<p data-elara-ugc dir="auto">'+esc(mainText)+'</p>':'<div class="well01-plan-empty"><span aria-hidden="true">'+(kind==='workout'?'◎':'✿')+'</span><p>'+tx('هنوز برنامه شخصی ثبت نشده است.','No personal plan saved yet.')+'</p><small>'+tx('با یک یادداشت کوتاه شروع کن.','Start with a short personal note.')+'</small></div>')+(first?'<span class="well01-folder">📁 '+esc(first.title)+'</span>':'')+'</div><footer><button type="button" class="well01-plan-link" data-well01-plan-edit="'+kind+'">'+(mainText?tx('ویرایش یادداشت','Edit note'):label)+'</button><button type="button" class="well01-plan-link" data-wellness-plan-folder-add="'+kind+'">+ '+tx('پوشه','Folder')+'</button></footer></article>';
}
function activity(s){
 const rows=s.workouts.filter(x=>x.date===today()),total=workoutOf(s,today()),last=rows[rows.length-1],type=last?(last.type==='ورزش دیگر'?last.customType||last.type:last.type):'';
 return '<article class="well01-card well01-activity-card"><header><h2>'+tx('فعالیت امروز','Today’s activity')+'</h2><button type="button" data-feature-route="'+route('exercise')+'" aria-label="'+tx('جزئیات ورزش','Exercise details')+'">‹</button></header><div class="well01-activity-image" role="img" aria-label="'+tx('منظره آینده‌نگر طبیعت و ورزش','Futuristic nature and wellness')+'"></div><div class="well01-activity-description"><div><strong>'+esc(rows.length?type:tx('برای امروز تمرینی ثبت نشده','No workout logged today'))+'</strong><p>'+esc(rows.length?fa(total)+' '+tx('دقیقه فعالیت ثبت‌شده','logged minutes'):tx('از ثبت یک فعالیت کوتاه شروع کن.','Start by logging a short activity.'))+'</p></div><button class="well01-play" type="button" data-well01-start="exercise" aria-label="'+tx('ثبت تمرین','Log workout')+'">▶</button></div></article>';
}
function metric(kind,label,icon,value,sub,actions,ratio){
 const progress=Number.isFinite(ratio)?Math.max(0,Math.min(100,ratio)):0;
 return '<article class="well01-metric well01-metric-'+kind+'"><div class="well01-metric-top"><span class="well01-metric-icon">'+icon+'</span><div><h3>'+label+'</h3><strong>'+value+'</strong><small>'+sub+'</small></div></div><div class="well01-metric-actions">'+actions+'</div><div class="well01-progress"><i style="width:'+progress+'%"></i></div></article>';
}
function metrics(s){
 const d=today(),glass=safeNum(s.glass,50,1000)||250,amount=safeNum(s.water[d]),glasses=Math.round(amount/glass),goal=safeNum(s.goal,250,10000)||2000;
 const sleep= sleepOf(s,d),lastSleep=sleep||sleepMinutes(s.sleep.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||{});
 const weight=Number(s.weight)>0?fa(Number(s.weight)):'—',target=Number(s.targetWeight)>0?fa(Number(s.targetWeight))+' '+tx('کیلوگرم هدف','kg goal'):tx('هدف ثبت نشده','No target');
 const workout=workoutOf(s,d);
 const waterActions='<button type="button" data-wellness-water="remove" aria-label="'+tx('کم کردن یک لیوان','Remove one glass')+'">−</button><button type="button" data-wellness-water="add" aria-label="'+tx('افزودن یک لیوان','Add one glass')+'">+</button>';
 return metric('water',tx('مصرف آب','Water'),'💧',fa(glasses)+' '+tx('لیوان','glasses'),tx('هدف: ','Goal: ')+fa(Math.ceil(goal/glass))+' '+tx('لیوان','glasses'),waterActions,amount/goal*100)
 +metric('sleep',tx('خواب','Sleep'),'☾',lastSleep?unitHours(lastSleep)+' '+tx('ساعت','hours'):'—',lastSleep?tx('آخرین خواب ثبت‌شده','Last logged sleep'):tx('هنوز ثبت نشده','No log yet'),'<button type="button" data-wellness-add="sleep">+ '+tx('ثبت خواب','Log sleep')+'</button>',null)
 +metric('weight',tx('وزن','Weight'),'⚖',weight+(weight==='—'?'':' '+tx('کیلوگرم','kg')),target,'<button type="button" data-feature-route="'+route('weight')+'">'+tx('مدیریت وزن','Manage')+'</button>',null)
 +metric('exercise',tx('ورزش امروز','Exercise'),'🏋',fa(workout)+' '+tx('دقیقه','min'),workout?tx('فعالیت امروز','Today’s activity'):tx('هنوز ثبت نشده','No log yet'),'<button type="button" data-wellness-add="workout">+ '+tx('ثبت ورزش','Log workout')+'</button>',null);
}
function streak(s){
 const days=new Set([...Object.entries(s.water).filter(([d,v])=>Number(v)>0).map(([d])=>d),...s.sleep.filter(x=>sleepMinutes(x)>0).map(x=>x.date),...s.workouts.filter(x=>Number(x.minutes)>0).map(x=>x.date)]);
 const date=new Date();date.setHours(12,0,0,0);if(!days.has(localDate(date)))date.setDate(date.getDate()-1);
 let count=0;while(count<365&&days.has(localDate(date))){count++;date.setDate(date.getDate()-1)}return count;
}
function summary(s){
 const d=today(),w=workoutOf(s,d),sl=sleepOf(s,d),gl=safeNum(s.glass,50,1000)||250;
 const items=[['💧',fa(Math.round(safeNum(s.water[d])/gl)),tx('لیوان آب','Water glasses')],['☾',sl?unitHours(sl):'—',tx('ساعت خواب','Sleep hours')],['🏃',fa(w),tx('دقیقه ورزش','Exercise minutes')],['⚖',Number(s.weight)>0?fa(Number(s.weight)):'—',tx('وزن (کیلوگرم)','Weight (kg)')],['⭐',streak(s)?fa(streak(s)):'—',tx('روز متوالی ثبت','Logging streak')]];
 return '<section class="well01-card well01-summary"><header><h2>'+tx('خلاصه امروز','Today at a glance')+'</h2></header><div class="well01-summary-grid">'+items.map(x=>'<div class="well01-summary-item"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>').join('')+'</div></section>';
}
function reports(s){
 const ds=week(),water=ds.map(d=>safeNum(s.water[d])),sleep=ds.map(d=>sleepOf(s,d)/60),workout=ds.map(d=>workoutOf(s,d));
 const cards=[['water','💧',tx('مصرف آب','Water'),water,tx('میلی‌لیتر','ml')],['sleep','☾',tx('مدت خواب','Sleep'),sleep,tx('ساعت','hours')],['exercise','🏃',tx('فعالیت ورزشی','Exercise'),workout,tx('دقیقه','minutes')],['weight','⚖',tx('روند وزن','Weight trend'),[],tx('تاریخچه‌ای ثبت نشده','No weight history')]];
 return '<section class="well01-card well01-reports"><header><h2>'+tx('گزارش‌های اخیر','Recent reports')+'</h2><button type="button" data-feature-route="'+route('reports')+'">'+tx('مشاهده همه','See all')+' ‹</button></header><div class="well01-report-grid">'+cards.map(([kind,icon,label,vals,unit])=>'<button type="button" class="well01-report well01-report-'+kind+'" data-feature-route="'+route(kind)+'"><strong>'+icon+' '+label+'</strong><small>'+(kind==='weight'?unit:tx('هفت روز اخیر · ','Last 7 days · ')+unit)+'</small>'+mini(vals,kind)+'</button>').join('')+'</div></section>';
}
function ensureLegacyEditors(s){
 const hdr=document.querySelector('#panel-wellness-exercise .wellness-plans > header');if(!hdr)return;
 let bar=hdr.querySelector('.well01-legacy-editors');
 if(!bar){bar=document.createElement('div');bar.className='well01-legacy-editors';hdr.append(bar)}
 const workout=String(s.workoutPlanNote||'').trim(),nutrition=String(s.nutritionPlanNote||'').trim();
 bar.innerHTML=(workout?'<button class="quiet-button well01-delete-note" type="button" data-wellness-plan-delete="workout">'+tx('حذف یادداشت تمرین','Delete training note')+'</button>':'<button class="quiet-button" type="button" data-wellness-plan-edit="workout">'+tx('ویرایش برنامه تمرینی','Edit training plan')+'</button>')+
 (nutrition?'<button class="quiet-button well01-delete-note" type="button" data-wellness-plan-delete="nutrition">'+tx('حذف یادداشت تغذیه','Delete nutrition note')+'</button>':'<button class="quiet-button" type="button" data-wellness-plan-edit="nutrition">'+tx('ویرایش برنامه تغذیه','Edit nutrition plan')+'</button>');
 let preview=hdr.nextElementSibling;
 if(!preview?.classList.contains('well01-legacy-preview')){preview=document.createElement('div');preview.className='well01-legacy-preview';hdr.insertAdjacentElement('afterend',preview)}
 preview.innerHTML='<article><strong>'+tx('برنامه تمرینی','Workout plan')+'</strong><p id="wellness-workout-plan" data-elara-ugc dir="auto">'+esc(workout||tx('هنوز برنامه‌ای ننوشتی','No plan written yet'))+'</p></article>'+
 '<article><strong>'+tx('برنامه تغذیه','Nutrition plan')+'</strong><p id="wellness-nutrition-plan" data-elara-ugc dir="auto">'+esc(nutrition||tx('هنوز برنامه‌ای ننوشتی','No plan written yet'))+'</p></article>';
}
let wellnessHeroObserver=null;
function hideDuplicateHero(panel){
 for(const node of panel.querySelectorAll('.elara-global-hero,.feature-hub-hero,[data-elara-page-hero="exercise"]')){
  if(node.closest('#well01-dashboard'))continue;
  node.style.setProperty('display','none','important');
  node.setAttribute('aria-hidden','true');
 }
 if(!wellnessHeroObserver){
  wellnessHeroObserver=new MutationObserver(()=>hideDuplicateHero(panel));
  wellnessHeroObserver.observe(panel,{childList:true});
 }
}
function render(){
 const panel=document.getElementById(panelId);if(!panel)return;hideDuplicateHero(panel);
 let host=panel.querySelector(':scope > #well01-dashboard');
 if(!host){host=document.createElement('section');host.id='well01-dashboard';host.className='well01';host.setAttribute('dir','rtl');panel.prepend(host)}
 const s=read();ensureLegacyEditors(s);
 host.innerHTML='<section class="well01-hero"><div class="well01-hero-copy"><small>ELARA · WELLNESS</small><h1>'+tx('ورزش و سلامتی','Wellness & Fitness')+'</h1><p>'+tx('بدن سالم، ذهن روشن، جهانی بزرگ‌تر در انتظار توست.','A healthier body, a clearer mind and a bigger world await.')+'</p><button type="button" class="well01-hero-cta" data-feature-route="wellness-exercise">'+tx('شروع یک زندگی سالم‌تر','Start a healthier life')+' <span aria-hidden="true">‹</span></button></div><aside class="well01-quote"><strong>'+tx('«سرمایه واقعی تو سلامتی توست.»','“Your wellness is your real wealth.”')+'</strong><small>— ELARA</small></aside></section>'
 +'<nav class="well01-shortcuts" aria-label="'+tx('بخش‌های ورزش و سلامتی','Wellness sections')+'">'+shortcut('water','26-water-tracker-icon.webp',tx('آب','Water'),tx('آبرسانی بدن','Hydration'))+shortcut('sleep','27-sleep-tracker-icon.webp',tx('خواب','Sleep'),tx('استراحت و بازیابی','Rest and recovery'))+shortcut('weight','29-weight-tracker-icon.webp',tx('وزن','Weight'),tx('مدیریت وزن','Weight log'))+shortcut('exercise','28-exercise-icon.webp',tx('ورزش','Exercise'),tx('فعالیت و تناسب اندام','Activity'))+shortcut('analysis','09-wellness-analytics-icon..webp',tx('تحلیل','Analysis'),tx('گزارش‌ها و روند','Trends'))+'</nav>'
 +'<div class="well01-features">'+tasks()+planSummary(s,'workout')+planSummary(s,'nutrition')+activity(s)+'</div>'
 +'<section class="well01-metrics" aria-label="'+tx('شاخص‌های روزانه','Daily measures')+'">'+metrics(s)+'</section>'
 +'<div class="well01-lower">'+summary(s)+reports(s)+'</div>'
 +'<section class="well01-tip"><div><small>🌿 '+tx('نکته سلامتی امروز','Today’s wellness note')+'</small><strong>'+tx('حرکت امروز، انرژی فردای توست.','Movement today supports tomorrow’s energy.')+'</strong></div><span>'+tx('داده‌های شخصی در مرورگر این دستگاه می‌مانند؛ همگام‌سازی ابری فعال نیست.','Personal records stay in this browser; cloud sync is not enabled.')+'</span></section>';
}
let pending=false;function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;render()},30)}
document.addEventListener('click',e=>{const edit=e.target.closest('[data-well01-plan-edit]');if(edit){const kind=edit.dataset.well01PlanEdit;const tmp=document.createElement('button');tmp.type='button';tmp.dataset.wellnessPlanEdit=kind;tmp.hidden=true;document.body.append(tmp);tmp.click();tmp.remove();return}const b=e.target.closest('[data-well01-start]');if(b)window.ElaraOpen?.('wellness-exercise')});
window.addEventListener('elara:wellness-saved',render);
for(const name of ['elara:account-ready','elara:state-committed','elara:data-changed','elara:locale-changed','elara:open'])window.addEventListener(name,schedule);
window.ElaraWell01={render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();