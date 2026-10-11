/* WELL-02: full-width private water and sleep pages, existing Wellness v1 key. No user-data migration. */
(()=>{'use strict';
const $=(sel,root=document)=>root.querySelector(sel);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fa=value=>Number(value||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR',{maximumFractionDigits:1});
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>iso(new Date());
const dates=(n=7)=>Array.from({length:n},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-n+1+i);return iso(d)});
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
const key=()=>uid()?'elara_private_wellness_v1_'+uid():'';
const clamp=(v,min,max,fallback=min)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
const store=()=>{try{return uid()?JSON.parse(localStorage.getItem(key())||'{}')||{}:{}}catch{return {}}};
function data(){const s=store();return {...s,water:s.water&&typeof s.water==='object'&&!Array.isArray(s.water)?s.water:{},sleep:Array.isArray(s.sleep)?s.sleep:[]}}
function save(patch){
 if(!uid()){status(tx('برای ثبت داده‌های خصوصی وارد حساب شو.','Sign in to save private records.'));return false}
 try{
  localStorage.setItem(key(),JSON.stringify({...store(),...patch}));
  window.dispatchEvent(new CustomEvent('elara:wellness-saved',{detail:patch}));
  render();
  status(tx('در همین مرورگر ذخیره شد.','Saved in this browser.'));
  return true
 }catch{status(tx('ذخیره اطلاعات روی این دستگاه انجام نشد.','Saving on this device failed.'));return false}
}
function status(message){const target=$('.well02-page:not([hidden]) .well02-status');if(target)target.textContent=message}
const minutesOf=x=>window.ElaraWellnessTest?.sleepMinutes?.(x)||0;
const formatSleep=m=>m?fa(Math.floor(m/60))+' '+tx('ساعت','h')+' '+fa(m%60)+' '+tx('دقیقه','min'):'—';
const goodDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00'));
const goodClock=x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const labels=()=>dates().map(x=>new Date(x+'T12:00:00').toLocaleDateString(document.documentElement.lang==='en'?'en-US':'fa-IR',{weekday:'short'}));
function bars(vals,unit,theme){
 const max=Math.max(0,...vals);
 if(!max)return '<p class="well02-no-data">'+tx('هنوز داده کافی برای نمودار هفتگی وجود ندارد.','Not enough records for a weekly chart yet.')+'</p>';
 return '<div class="well02-chart-bars '+theme+'" role="img" aria-label="'+esc(tx('گزارش واقعی هفت روز اخیر','Seven-day recorded chart'))+'">'+vals.map((v,i)=>{
  const height=v>0?Math.max(5,v/max*100):0;
  return '<div class="well02-bar-day"><span class="well02-bar-value">'+(v?fa(v):'—')+'</span><span class="well02-bar-track"><i style="height:'+height.toFixed(2)+'%"></i></span><small>'+esc(labels()[i])+'</small><span class="sr-only">'+esc(unit)+'</span></div>'
 }).join('')+'</div>'
}
const iconGlass='<svg viewBox="0 0 150 195" aria-hidden="true" fill="none"><defs><linearGradient id="well02-glass-grad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#42eaff" stop-opacity=".93"/><stop offset="1" stop-color="#07a8dc" stop-opacity=".46"/></linearGradient></defs><path d="M24 17H126L115 176Q75 193 35 176Z" stroke="#66f7ff" stroke-width="5" fill="#0b4e6990"/><path d="M34 24H116L108 168Q76 180 42 168Z" fill="#27defc" fill-opacity=".16"/><path d="M32 27H118" stroke="#a3fbff" stroke-width="4" stroke-linecap="round"/></svg>';
function panelHost(type){
 const panel=$('#panel-wellness-'+type);
 if(!panel)return null;
 panel.setAttribute('data-well02-page',type);
 let host=panel.querySelector('#well02-'+type);
 if(!host){
  host=document.createElement('section');host.id='well02-'+type;host.className='well02-page well02-'+type;host.dir='rtl';
  const head=panel.querySelector('.feature-subpage-head');
  if(head)head.insertAdjacentElement('afterend',host);else panel.prepend(host);
 }
 return host
}
function water(s,host){
 const glass=clamp(s.glass,50,1000,250),goal=clamp(s.goal,250,10000,2000),amount=clamp(s.water[today()],0,100000,0);
 const count=Math.round(amount/glass),ratio=Math.min(100,amount/goal*100);
 const days=dates(),totals=days.map(d=>clamp(s.water[d],0,100000,0)),recorded=Object.entries(s.water).filter(([date,val])=>goodDate(date)&&Number(val)>0).sort(([a],[b])=>b.localeCompare(a)).slice(0,30);
 host.innerHTML='<section class="well02-water-layout"><article class="well02-card well02-water-primary">'
 +'<div class="well02-card-head"><h2>💧 '+tx('آب امروز','Today’s water')+'</h2><small>'+esc(today())+'</small></div>'
 +'<div class="well02-water-body"><div class="well02-glass-scene"><div class="well02-glass-bg">'+iconGlass+'</div><div class="well02-water-fill" style="height:'+ratio.toFixed(1)+'%"></div></div>'
 +'<div class="well02-water-main"><strong class="well02-big-count">'+fa(count)+' <small>'+tx('لیوان','glasses')+'</small></strong><p>'+fa(amount)+' '+tx('میلی‌لیتر مصرف ثبت‌شده','ml logged')+'</p><p>'+tx('هدف شخصی: ','Personal goal: ')+fa(goal)+' '+tx('میلی‌لیتر','ml')+'</p><div class="well02-water-progress"><i style="width:'+ratio.toFixed(2)+'%"></i></div><small>'+fa(Math.round(ratio))+'٪ '+tx('از هدف روزانه','of your daily goal')+'</small>'
 +'<div class="well02-water-actions"><button type="button" data-well02-water="remove" aria-label="'+tx('کم‌کردن یک لیوان','Remove a glass')+'">−</button><button type="button" class="well02-primary" data-well02-water="add">+ '+tx('افزودن یک لیوان','Add one glass')+'</button></div></div></div></article>'
 +'<article class="well02-card well02-settings"><h2>⚙ '+tx('تنظیمات آب','Water settings')+'</h2><form class="well02-water-form"><label>'+tx('حجم هر لیوان (میلی‌لیتر)','Glass size (ml)')+'<input name="glass" type="number" inputmode="numeric" min="50" max="1000" step="25" required value="'+glass+'"></label><label>'+tx('هدف روزانه (میلی‌لیتر)','Daily target (ml)')+'<input name="goal" type="number" inputmode="numeric" min="250" max="10000" step="50" required value="'+goal+'"></label><button type="submit" class="well02-primary">'+tx('ذخیره تنظیمات','Save settings')+'</button></form><p class="well02-disclosure">'+tx('داده‌ها خصوصی و وابسته به حساب تو هستند، اما فقط در مرورگر همین دستگاه ذخیره می‌شوند؛ همگام‌سازی ابری فعال نیست.','Your account-scoped records are private but remain in this browser. Cloud sync is not active.')+'</p></article></section>'
 +'<div class="well02-bottom"><article class="well02-card"><h2>'+tx('مصرف آب در هفت روز اخیر','Water · last 7 days')+'</h2>'+bars(totals.map(v=>Math.round(v/glass)),tx('لیوان','glasses'),'water')+'</article>'
 +'<article class="well02-card"><h2>'+tx('تاریخچه مصرف آب','Water history')+'</h2><div class="well02-history">'+(recorded.length?recorded.map(([d,v])=>'<div class="well02-history-row"><time>'+esc(d)+'</time><strong>'+fa(Math.round(Number(v)/glass))+' '+tx('لیوان','glasses')+'</strong><span>'+fa(v)+' ml</span></div>').join(''):'<p class="well02-no-data">'+tx('هنوز مصرف آبی ثبت نشده است.','No water records yet.')+'</p>')+'</div></article></div><p class="well02-status" role="status"></p>';
}
function sleep(s,host){
 const rows=s.sleep.filter(x=>x&&goodDate(String(x.date))&&goodClock(String(x.bed))&&goodClock(String(x.wake))&&minutesOf(x)>0).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const last=rows[0],lastMinutes=last?minutesOf(last):0;
 const goal=Number(s.sleepGoalHours);const hasGoal=Number.isFinite(goal)&&goal>=1&&goal<=16;
 const week=dates(),chart=week.map(d=>Math.round(s.sleep.filter(x=>x?.date===d).reduce((n,x)=>n+minutesOf(x),0)/60*10)/10);
 host.innerHTML='<div class="well02-sleep-layout"><article class="well02-card well02-sleep-overview"><div class="well02-card-head"><h2>☾ '+tx('آخرین خواب ثبت‌شده','Last sleep recorded')+'</h2><small>'+esc(last?.date||tx('بدون ثبت','No record'))+'</small></div><div class="well02-sleep-orb"><span>☾</span><strong>'+formatSleep(lastMinutes)+'</strong><small>'+tx('مدت واقعی محاسبه‌شده','Calculated duration')+'</small></div>'
 +'<div class="well02-sleep-times"><div><span>'+tx('زمان خوابیدن','Bedtime')+'</span><strong>'+esc(last?.bed||'—')+'</strong></div><div><span>'+tx('زمان بیداری','Wake time')+'</span><strong>'+esc(last?.wake||'—')+'</strong></div></div><p class="well02-disclosure">'+tx('ثبت‌های عبوری از نیمه‌شب با احتساب بیداری در روز بعد محاسبه می‌شوند.','Sleep crossing midnight counts the wake time as the following day.')+'</p></article>'
 +'<article class="well02-card well02-sleep-editor"><h2>✎ '+tx('ثبت یا ویرایش خواب','Log or edit sleep')+'</h2><form class="well02-sleep-form"><input type="hidden" name="id"><label>'+tx('تاریخ شروع خواب','Sleep start date')+'<input name="date" type="date" value="'+today()+'" required></label><div class="well02-form-times"><label>'+tx('ساعت خوابیدن','Bedtime')+'<input name="bed" type="time" value="23:00" required></label><label>'+tx('ساعت بیدارشدن','Wake time')+'<input name="wake" type="time" value="07:00" required></label></div><div class="well02-form-actions"><button type="submit" class="well02-primary">'+tx('ذخیره خواب','Save sleep')+'</button><button type="reset" class="well02-secondary" data-well02-form-reset>'+tx('ثبت جدید','New entry')+'</button></div></form>'
 +'<hr class="well02-rule"><form class="well02-sleep-goal-form"><label>'+tx('هدف اختیاری خواب (ساعت)','Optional sleep target (hours)')+'<input type="number" name="goal" inputmode="decimal" min="1" max="16" step="0.5" placeholder="'+tx('تنظیم نشده','Not set')+'" value="'+(hasGoal?goal:'')+'"></label><button type="submit" class="well02-secondary">'+tx('ذخیره هدف','Save target')+'</button></form><p class="well02-disclosure">'+(hasGoal?tx('هدف تنظیم‌شده: ','Your selected goal: ')+fa(goal)+' '+tx('ساعت','hours'):tx('هنوز هدف خواب تنظیم نکرده‌ای.','You have not set a sleep target.'))+'</p></article></div>'
 +'<div class="well02-bottom"><article class="well02-card"><h2>'+tx('نمودار خواب هفت روز اخیر','Sleep · last 7 days')+'</h2>'+bars(chart,tx('ساعت','hours'),'sleep')+'</article>'
 +'<article class="well02-card"><h2>'+tx('تاریخچه خواب','Sleep history')+'</h2><div class="well02-history">'+(rows.length?rows.slice(0,30).map(x=>'<div class="well02-history-row well02-sleep-row"><time>'+esc(x.date)+'</time><strong>'+formatSleep(minutesOf(x))+'</strong><span>'+esc(x.bed)+' — '+esc(x.wake)+'</span><div class="well02-row-actions"><button type="button" data-well02-sleep-edit="'+esc(x.id)+'">'+tx('ویرایش','Edit')+'</button><button type="button" data-well02-sleep-delete="'+esc(x.id)+'">'+tx('حذف','Delete')+'</button></div></div>').join(''):'<p class="well02-no-data">'+tx('هنوز خوابی ثبت نشده است.','No sleep records yet.')+'</p>')+'</div></article></div><p class="well02-status" role="status"></p>';
}
function render(){
 for(const kind of ['water','sleep']){
  const host=panelHost(kind);if(!host)continue;
  const s=data();
  if(kind==='water')water(s,host);else sleep(s,host);
 }
}
function formSave(e){
 const form=e.target;
 if(form.matches('.well02-water-form')){
  e.preventDefault();
  const glass=Number(form.elements.glass.value),goal=Number(form.elements.goal.value);
  if(!Number.isFinite(glass)||glass<50||glass>1000||!Number.isFinite(goal)||goal<250||goal>10000){status(tx('مقدار هدف یا حجم لیوان معتبر نیست.','Invalid water target or glass size.'));return}
  save({glass,goal});return
 }
 if(form.matches('.well02-sleep-goal-form')){
  e.preventDefault();const raw=form.elements.goal.value.trim(),goal=raw?Number(raw):null;
  if(raw&&(!Number.isFinite(goal)||goal<1||goal>16)){status(tx('هدف خواب باید بین ۱ تا ۱۶ ساعت باشد.','Sleep target must be between 1 and 16 hours.'));return}
  save({sleepGoalHours:goal});return
 }
 if(form.matches('.well02-sleep-form')){
  e.preventDefault();const id=form.elements.id.value.trim(),date=form.elements.date.value,bed=form.elements.bed.value,wake=form.elements.wake.value;
  if(!goodDate(date)||!goodClock(bed)||!goodClock(wake)){status(tx('تاریخ و ساعت‌های خواب را بررسی کن.','Please check the sleep date and times.'));return}
  const s=data(),old=id?s.sleep.find(x=>String(x.id)===id):null;
  const row={...(old||{}),id:id||crypto.randomUUID?.()||'sleep-'+Date.now(),date,bed,wake};
  if(!minutesOf(row)){status(tx('مدت خواب باید بین یک دقیقه تا ۲۴ ساعت باشد.','Sleep must be between one minute and 24 hours.'));return}
  save({sleep:id?s.sleep.map(x=>String(x.id)===id?row:x):[...s.sleep,row]});return
 }
}
function click(e){
 const b=e.target.closest('[data-well02-water]');
 if(b){
  e.preventDefault();
  const s=data(),glass=clamp(s.glass,50,1000,250),old=clamp(s.water[today()],0,100000,0);
  save({water:{...s.water,[today()]:Math.max(0,Math.min(100000,old+(b.dataset.well02Water==='add'?glass:-glass)))}});return
 }
 const edit=e.target.closest('[data-well02-sleep-edit]');
 if(edit){
  e.preventDefault();const record=data().sleep.find(x=>String(x.id)===edit.dataset.well02SleepEdit),form=$('#well02-sleep .well02-sleep-form');if(!record||!form)return;
  for(const k of ['id','date','bed','wake'])form.elements[k].value=String(record[k]||'');
  form.scrollIntoView({behavior:'smooth',block:'center'});form.elements.bed.focus();status(tx('در حال ویرایش ثبت انتخاب‌شده؛ ذخیره، همان رکورد را جایگزین می‌کند.','Editing this entry; save replaces the existing record.'));return
 }
 const del=e.target.closest('[data-well02-sleep-delete]');
 if(del){e.preventDefault();void removeSleep(del.dataset.well02SleepDelete);return}
 const reset=e.target.closest('[data-well02-form-reset]');
 if(reset){e.preventDefault();const form=reset.closest('form');if(form){form.reset();form.elements.id.value='';form.elements.date.value=today()}} 
}
async function removeSleep(id){
 const s=data(),row=s.sleep.find(x=>String(x.id)===id);if(!row)return;
 const phrase=tx('این ثبت خواب خصوصی حذف شود؟','Delete this private sleep record?');
 const ok=window.ElaraDialog?.confirm?await window.ElaraDialog.confirm(phrase,{title:tx('حذف خواب','Delete sleep'),confirmText:tx('حذف','Delete'),danger:true}):window.confirm(phrase);
 if(!ok)return;
 const latest=data();save({sleep:latest.sleep.filter(x=>String(x.id)!==id)})
}
let pending=false;function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;render()},30)}
document.addEventListener('submit',formSave);
document.addEventListener('click',click);
window.addEventListener('elara:wellness-saved',render);
window.addEventListener('elara:account-ready',render);
for(const ev of ['elara:open','elara:locale-changed','hashchange'])window.addEventListener(ev,schedule);
window.ElaraWell02={render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();