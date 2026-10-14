/* L5 isolated UX: canonical word scoring remains in app.js. No demo data. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');
const read=()=>{try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return {}}};
const uid=()=>window.ElaraAccount?.user?.uid||null;
const autoKey=()=>uid()?'elara_leitner_auto_study_v1_'+uid():null;
let active=null,drag=null,transitionTimer=null,syncPending=false,watch=null;
function message(s){const el=$('#l3-review-scene [data-l5-feedback]');if(el)el.textContent=s}
function setAuto(el,value){
 el.setAttribute('aria-pressed',String(value));
 if(autoKey())try{localStorage.setItem(autoKey(),value?'1':'0')}catch{}
}
function autoEnabled(){const key=autoKey();if(!key)return false;try{return localStorage.getItem(key)==='1'}catch{return false}}
function focusButton(){return $('#l3-review-scene [data-l3-focus]')}
function isFocusRunning(){return focusButton()?.getAttribute('aria-pressed')==='true'}
function startFocus(){if(!document.hidden&&!isFocusRunning())focusButton()?.click()}
function stopFocus(){if(isFocusRunning())focusButton()?.click()}
function addStory(scene){
 if(active!==scene){active=scene;drag=null}
 const frame=scene.querySelector('[data-l3-drag-surface]');
 if(frame&&!scene.querySelector('.l5-swipe-stage')){
  const stage=document.createElement('div');stage.className='l5-swipe-stage';
  frame.before(stage);stage.append(frame);
  [...frame.querySelectorAll('.l3-swipe-cue')].forEach(cue=>stage.insertBefore(cue,frame));
 }
 const meta=scene.querySelector('.l3-story-meta');
 if(meta&&!meta.querySelector('[data-l5-auto]')){
  const b=document.createElement('button');b.type='button';b.className='l5-auto-study';
  b.dataset.l5Auto='';b.textContent='◉ '+tx('ثبت خودکار مطالعه','Auto-record study');b.setAttribute('aria-pressed',String(autoEnabled()));
  const clock=meta.querySelector('.l3-study-clock');meta.insertBefore(b,clock);
  if(autoEnabled())requestAnimationFrame(()=>{if(scene.isConnected)startFocus()});
 }
 if(!scene.querySelector('[data-l5-feedback]')){
  const status=document.createElement('p');status.className='l5-feedback';status.dataset.l5Feedback='';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  scene.querySelector('.l3-story-actions')?.before(status);
 }
 const prev=scene.querySelector('[data-l3-prev]');
 if(prev){if(prev.disabled)prev.disabled=false;const hasHistory=!!scene.querySelector('.l3-story-progress i.is-done')||false;
  prev.setAttribute('title',tx('اگر واژهٔ قبلی نباشد پیام نمایش داده می‌شود','Displays a message when there is no previous word'));
 }
}
function progressData(){
 const data=read(),words=Array.isArray(data.words)?data.words:[];
 const due=words.filter(w=>w&&(!w.due||String(w.due)<=(window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA'))));
 const boxes=[1,2,3,4,5].map(b=>words.filter(w=>Number(w.box||1)===b).length);
 const allTasks=(Array.isArray(data.tasks)?data.tasks:[]).filter(t=>t?.sourceGroup==='language');
 const tasks=allTasks.slice(0,4);
 return {words,due,boxes,tasks,allTasks};
}
function addDashboard(host){
 if(host.querySelector('.l5-quick-entry'))return;
 const data=progressData(),{words,due,boxes,tasks,allTasks}=data;
 const currentDay=window.ElaraSchedule?.today?.()||new Date().toLocaleDateString('en-CA');
 const taskDone=t=>!!window.ElaraTasks?.taskDone?.(t,currentDay);
 const completedTasks=allTasks.filter(taskDone).length;
 const taskPercent=allTasks.length?Math.round(completedTasks/allTasks.length*100):0;
 const stats=host.querySelector('.l2-leitner-stats');
 if(!stats)return;
 host.querySelector('.l2-leitner-bottom')?.remove();
 const quick=document.createElement('form');quick.className='l5-quick-entry';quick.dataset.l5Quick='';
 quick.innerHTML='<div class="l5-quick-title"><span aria-hidden="true">✎</span><div><h2>'+tx('افزودن واژه جدید','Add a new word')+'</h2><small>'+tx('کلمات خودت، بدون دادهٔ نمونه','Your words, no sample data')+'</small></div></div><label><span class="sr-only">'+tx('کلمه','Word')+'</span><input name="front" dir="auto" maxlength="120" required placeholder="'+tx('کلمه...','Word...')+'"></label><label><span class="sr-only">'+tx('معنی','Meaning')+'</span><input name="back" dir="auto" maxlength="240" required placeholder="'+tx('معنی...','Meaning...')+'"></label><button type="submit">＋ '+tx('افزودن واژه','Add word')+'</button>';
 stats.after(quick);
 const percent=words.length?Math.round((words.length-due.length)*100/words.length):0;
 const feature=document.createElement('section');feature.className='l5-review-feature';
 feature.innerHTML='<div class="l5-review-today"><div class="l5-feature-copy"><h2>✦ '+tx('مرور امروز','Today’s review')+'</h2><p>'+tx('زمان یادگیری فرا رسیده! هر واژه را در زمان واقعی مرور کن.','Review due words when they are ready.')+'</p><div class="l5-study-meter"><div class="l5-meter-ring" style="--l5-progress:'+percent+'%"><strong>'+num(due.length)+'</strong><small>'+tx('واژه آماده','words ready')+'</small></div><div class="l5-meter-note"><b>'+num(words.length)+'</b><span>'+tx('کل واژه‌ها','total words')+'</span><small>'+tx('غیرسررسید: ','Not due: ')+num(words.length-due.length)+'</small></div></div><button type="button" class="l5-review-btn" data-l2-review '+(!due.length?'disabled':'')+'>'+tx(due.length?'شروع مرور امروز':'مرور امروز انجام شده',due.length?'Start review':'No words due')+' ▶</button></div></div>'+
 '<div class="l5-language-tasks"><header><h2>◎ '+tx('تسک‌های زبان','Language tasks')+'</h2><button type="button" data-ui13-canonical="language-tasks">'+tx('مشاهده همه','View all')+' ←</button></header><div class="l5-task-list">'+(tasks.length?tasks.map(t=>{const done=taskDone(t);return '<div class="l5-task '+(done?'is-done':'')+'"><button type="button" class="l5-task-check" data-section-task-toggle="'+esc(t.id||'')+'" aria-label="'+esc(tx('تغییر وضعیت تسک','Toggle task'))+'" aria-pressed="'+done+'" '+(t.sourceCompletionLocked?'disabled':'')+'>'+ (done?'✓':'') +'</button><span class="l5-task-content" data-elara-ugc dir="auto">'+esc(t.text||t.title||tx('تسک زبان','Language task'))+'</span></div>'}).join(''):'<p class="l5-empty">'+tx('برای امروز تسک زبانی ثبت نشده است.','No language tasks have been added.')+'</p>')+'</div><div class="l5-task-progress"><div class="l5-task-track" role="progressbar" aria-label="'+tx('پیشرفت تسک‌های زبان','Language task progress')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+taskPercent+'"><i style="width:'+taskPercent+'%"></i></div><small>'+num(completedTasks)+' '+tx('از','of')+' '+num(allTasks.length)+' '+tx('انجام‌شده','completed')+'</small></div></div>';
 quick.after(feature);
 // Live dashboard summary only: source vocabulary and scheduling remain canonical.
 const collections=document.createElement('section');collections.className='l6-collections';
 const tiles=[
  {key:'all',label:tx('کل واژه‌ها','All words'),count:words.length,caption:tx('واژه‌های ثبت‌شده','Saved vocabulary'),icon:'▣',go:'boxes'},
  {key:'due',label:tx('آماده مرور','Ready to review'),count:due.length,caption:tx('نیازمند مرور امروز','Due today'),icon:'↻',go:'review'},
  {key:'new',label:tx('واژه جدید','New words'),count:boxes[0],caption:tx('در جعبه اول','In the first box'),icon:'＋',go:'add'},
  {key:'learned',label:tx('ماندگار','Mastered'),count:boxes[4],caption:tx('در جعبه پنجم','In the fifth box'),icon:'★',go:'boxes'}
 ];
 collections.innerHTML='<header><div><h2>'+tx('جعبه‌های لایتنر','Leitner boxes')+'</h2><p>'+tx('واژه‌ها بر اساس عملکردت در جعبه‌های مختلف قرار می‌گیرند.','Your real vocabulary moves between boxes as you learn.')+'</p></div></header><div class="l6-collections-grid">'+tiles.map(t=>'<button type="button" class="l6-collection '+t.key+'" data-l6-go="'+t.go+'" aria-label="'+esc(t.label)+'"><span class="l6-collection-icon" aria-hidden="true">'+t.icon+'</span><span class="l6-collection-copy"><strong>'+t.label+'</strong><b>'+num(t.count)+'</b><small>'+t.caption+'</small></span><span class="l6-collection-arrow" aria-hidden="true">‹</span></button>').join('')+'</div>';
 feature.after(collections);
 const last=document.createElement('section');last.className='l5-latest';
 const recent=words.slice(0,4);
 last.innerHTML='<header><h2>◷ '+tx('آخرین واژه‌های اضافه‌شده','Recently added words')+'</h2><span>'+num(recent.length)+' '+tx('واژه','words')+'</span></header><div class="l5-recent-list">'+(recent.length?recent.map(w=>'<div class="l5-recent-row"><span aria-hidden="true">♧</span><strong dir="auto">'+esc(w.front||'')+'</strong><small dir="auto">'+esc(w.back||'')+'</small><b>'+tx('جعبه ','Box ')+num(w.box||1)+'</b></div>').join(''):'<p class="l5-empty">'+tx('هنوز واژه‌ای اضافه نشده است.','No words have been added yet.')+'</p>')+'</div>';
 host.append(last);
 host.classList.add('l5-designed');
}
function sync(){
 syncPending=false;let scene=$('#l3-review-scene');
 // Restore a direct review deep link after asynchronous auth/data hydration.
 // The original route initializer can run before the canonical flashcard exists.
 if(!scene&&new URLSearchParams(location.search).get('leitner')==='review'&&$('#panel-words .flashcard')){
  // The host bootstrap sometimes restores #home during reload even with the review
  // deep-link marker intact; reassert only the explicit review destination.
  if(location.hash!=='#words'&&document.body.classList.contains('cloud-ready')){
   window.ElaraOpen?.('words',{history:'replace'});
   const u=new URL(location.href);u.searchParams.set('leitner','review');u.hash='#words';
   history.replaceState(history.state,'',u);
  }
  if(location.hash==='#words'){window.ElaraLanguageDestinations?.l3Enter?.(false);scene=$('#l3-review-scene')}
 }
 if(scene)addStory(scene);
 else{active=null;drag=null;clearTimeout(transitionTimer)}
 const host=$('#panel-words [data-l2-leitner]');if(host)addDashboard(host);
}
function schedule(){
 if(syncPending)return;syncPending=true;requestAnimationFrame(sync)
}
function endDrag(){
 const s=$('#l3-review-scene');if(s){s.classList.remove('l5-dragging','l5-drag-yes','l5-drag-no','l5-swipe-left','l5-swipe-right');s.style.setProperty('--l5-x','0px');s.style.setProperty('--l5-rotation','0deg')}
 drag=null;
}
window.addEventListener('pointerdown',e=>{
 const frame=e.target.closest?.('#l3-review-scene [data-l3-drag-surface]');
 if(!frame||e.target.closest('button,input,textarea,select')||e.button!==0||!$('#l3-review-scene'))return;
 e.stopImmediatePropagation(); // Suppress the legacy inner-card drag handler.
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,frame,moved:false};
 try{frame.setPointerCapture(e.pointerId)}catch{}
},true);
window.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 e.stopImmediatePropagation();
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.moved&&Math.abs(dx)<7)return;
 if(!drag.moved&&Math.abs(dy)>Math.abs(dx)*1.4)return;
 drag.moved=true;if(e.cancelable)e.preventDefault();
 const s=$('#l3-review-scene');if(!s)return;
 const max=Math.min(innerWidth*.75,480),x=Math.min(max,Math.max(-max,dx));
 s.style.setProperty('--l5-x',x+'px');s.style.setProperty('--l5-rotation',Math.max(-14,Math.min(14,x/22))+'deg');
 s.classList.add('l5-dragging');
 s.classList.toggle('l5-drag-yes',x>22);s.classList.toggle('l5-drag-no',x< -22);
},true);
window.addEventListener('pointerup',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 e.stopImmediatePropagation();
 const d=drag,delta=e.clientX-d.x,s=$('#l3-review-scene'),ready=!$('#word-remembered')?.classList.contains('hidden');
 const threshold=Math.min(125,Math.max(65,d.frame.clientWidth*.2));
 drag=null;
 if(s&&d.moved&&ready&&Math.abs(delta)>=threshold){
  s.classList.remove('l5-dragging');s.classList.add(delta>0?'l5-swipe-right':'l5-swipe-left');
  transitionTimer=setTimeout(()=>{
   if(s.isConnected){endDrag();const button=$(delta>0?'#word-remembered':'#word-forgot');if(button&&!button.classList.contains('hidden'))button.click()}
  },240);
 }else{endDrag();if(d.moved&&!ready)message(tx('ابتدا معنی کلمه را نمایش بده','Reveal the meaning first'))}
},true);
window.addEventListener('pointercancel',e=>{if(drag&&drag.id===e.pointerId){e.stopImmediatePropagation();endDrag()}},true);
window.addEventListener('click',e=>{
 const summary=e.target.closest?.('#panel-words [data-l6-go]');
 if(summary){
  e.preventDefault();
  const target=summary.dataset.l6Go;
  if(target==='review'){$('#panel-words .l5-review-btn:not(:disabled)')?.click();return}
  if(target==='add'){$('#panel-words .l5-quick-entry input[name="front"]')?.focus();return}
  $('#panel-words .l2-leitner-boxes')?.scrollIntoView({behavior:'smooth',block:'center'});
  return;
 }
 const auto=e.target.closest?.('#l3-review-scene [data-l5-auto]');
 if(auto){e.preventDefault();e.stopImmediatePropagation();const next=auto.getAttribute('aria-pressed')!=='true';setAuto(auto,next);if(next)startFocus();else stopFocus();message(next?tx('ثبت خودکار روشن شد؛ زمان‌های کامل به گزارش زبان اضافه می‌شوند','Automatic study recording is on'):tx('ثبت خودکار خاموش شد','Automatic study recording is off'));return}
 const prev=e.target.closest?.('#l3-review-scene [data-l3-prev]');
 if(prev&&!$('#l3-review-scene .l3-story-progress i.is-done')){e.preventDefault();e.stopImmediatePropagation();message(tx('کلمهٔ قبلی وجود ندارد','No previous word'));return}
 const focus=e.target.closest?.('#l3-review-scene [data-l3-focus],[data-l3-pause]');
 if(focus&&e.isTrusted){const b=$('#l3-review-scene [data-l5-auto]');if(b?.getAttribute('aria-pressed')==='true'){setAuto(b,false);message(tx('ثبت خودکار خاموش شد؛ حالت تمرکز دستی است','Automatic recording off; manual focus mode'))}}
},true);
window.addEventListener('visibilitychange',()=>{
 if(document.hidden)return;
 const scene=$('#l3-review-scene');
 if(scene&&autoEnabled()&&!isFocusRunning())startFocus()
});
document.addEventListener('submit',e=>{
 const f=e.target.closest?.('[data-l5-quick]');if(!f)return;
 e.preventDefault();const word=f.elements.namedItem('front')?.value?.trim(),meaning=f.elements.namedItem('back')?.value?.trim();
 const canonical=$('#word-form'),front=$('#word-front'),back=$('#word-back');
 if(!word||!meaning||!canonical||!front||!back)return;
 front.value=word;back.value=meaning;canonical.requestSubmit();
 f.reset();schedule();
},true);
for(const event of ['elara:open','elara:state-committed','elara:data-changed','elara:locale-changed','elara:language-journal-changed'])window.addEventListener(event,schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{watch=new MutationObserver(schedule);watch.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});schedule()},{once:true});
else{watch=new MutationObserver(schedule);watch.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});schedule()}
window.ElaraLeitnerL5={refresh:schedule};
})();
