/* Elara phase 2: recurrence, inline folder/tag creation, priority semantics and persistent Focus sessions. */
(() => {
  'use strict';
  const KEY='elara_space_v1', $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today=()=>iso(new Date());
  const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v??''))&&!Number.isNaN(new Date(`${v}T12:00:00`).getTime());
  const timezone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return'UTC'}};
  const dayOf=v=>new Date(`${v}T12:00:00`).getDay();
  const daysBetween=(a,b)=>Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000);
  const makeId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fa=n=>Number(n||0).toLocaleString('fa-IR');
  const labelDate=v=>{try{return new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(`${v}T12:00:00`))}catch{return v}};
  const weekNames={0:'یکشنبه',1:'دوشنبه',2:'سه‌شنبه',3:'چهارشنبه',4:'پنجشنبه',5:'جمعه',6:'شنبه'};
  const weekOrder=[6,0,1,2,3,4,5];
  const priorityMeta={
    '1':{label:'فوری',className:'priority-red'},
    '2':{label:'بالا',className:'priority-yellow'},
    '3':{label:'متوسط',className:'priority-blue'},
    '4':{label:'عادی',className:'priority-gray'}
  };
  let editingTask=null,editingTaskScope='series',editingHabit=null,editingHabitScope='series',focusInterval=null;

  const readState=()=>{try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');return s&&typeof s==='object'?s:{}}catch{return{}}};
  const ensureState=s=>{
    s.version=1;
    for(const key of ['tasks','habits','goals','books','words','taskLists','folders','tags','focusSessions','taskCompletionHistory'])if(!Array.isArray(s[key]))s[key]=[];
    if(!Number.isFinite(Number(s.xp)))s.xp=0;
    return s;
  };
  const notify=message=>{
    const el=$('toast');if(!el)return;el.textContent=message;el.classList.remove('hidden');
    clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.add('hidden'),3200);
  };
  const writeState=(state,{hydrate=true}={})=>{
    ensureState(state);
    localStorage.setItem(KEY,JSON.stringify(state));
    if(hydrate)window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:state}));
    window.dispatchEvent(new Event('elara:data-changed'));
  };
  const dateList=v=>Array.isArray(v)?[...new Set(v.filter(validDate))]:[];
  const safeRule=(rule,fallback=today())=>window.ElaraSchedule.normalize(rule,fallback);
  const applies=(item,date)=>window.ElaraSchedule.applies(item,date);
  const recurrenceLabel=rule=>{
    const r=safeRule(rule);if(!r)return'';
    const days=r.frequency==='monthly'?`هر ${fa(r.interval)} ماه`:r.frequency==='daily'?`هر ${fa(r.interval)} روز`:r.weekdays.length===7?'هر روز':weekOrder.filter(d=>r.weekdays.includes(d)).map(d=>weekNames[d]).join('، ');
    return `تکرار: ${days}${r.endDate?' · تا '+labelDate(r.endDate):' · بدون پایان'}`;
  };
  const completionKey=(taskId,date)=>String(taskId||'')+':'+String(date||'');
  const ensureCompletionHistory=state=>{
    state.taskCompletionHistory=Array.isArray(state.taskCompletionHistory)?state.taskCompletionHistory:[];
    const map=new Map();
    for(const entry of state.taskCompletionHistory){
      if(!entry||!validDate(entry.date))continue;
      const taskId=String(entry.taskId||'').slice(0,100),key=String(entry.key||'').slice(0,240)||(taskId?completionKey(taskId,entry.date):'');
      if(key)map.set(key,{key,taskId,date:entry.date,title:String(entry.title||'').slice(0,180),completedAt:Number(entry.completedAt)||0});
    }
    for(const task of state.tasks){
      if(task.recurrenceRule){
        for(const date of dateList(task.occurrenceDone)){const key=completionKey(task.id,date);if(!map.has(key))map.set(key,{key,taskId:task.id,date,title:task.text||'',completedAt:0})}
      }else if(task.completed&&validDate(task.doneAt)){
        const key=completionKey(task.id,task.doneAt);if(!map.has(key))map.set(key,{key,taskId:task.id,date:task.doneAt,title:task.text||'',completedAt:0});
      }
    }
    state.taskCompletionHistory=[...map.values()].slice(-20000);
    return state.taskCompletionHistory;
  };
  const recordCompletion=(state,task,date)=>{
    const list=ensureCompletionHistory(state),key=completionKey(task.id,date);
    if(!list.some(x=>x.key===key))list.push({key,taskId:task.id,date,title:task.text||'',completedAt:Date.now()});
  };
  const removeCompletion=(state,task,date)=>{
    const key=completionKey(task.id,date);ensureCompletionHistory(state);state.taskCompletionHistory=state.taskCompletionHistory.filter(x=>x.key!==key);
  };
  const completedTodayCount=(state,date=today())=>ensureCompletionHistory(state).filter(x=>x.date===date).length;
  const taskDone=(task,date=today())=>task.recurrenceRule?dateList(task.occurrenceDone).includes(date):!!task.completed;
  const taskView=(task,date=today())=>{
    if(!task.recurrenceRule||!applies(task,date))return task;
    const o=task.occurrenceOverrides&&typeof task.occurrenceOverrides==='object'?task.occurrenceOverrides[date]:null;
    return o&&typeof o==='object'?{...task,...o}:task;
  };
  const habitDone=(habit,date=today())=>dateList(habit.days).includes(date);
  const habitView=(habit,date=today())=>{
    if(!habit.recurrenceRule||!applies(habit,date))return habit;
    const o=habit.occurrenceOverrides&&typeof habit.occurrenceOverrides==='object'?habit.occurrenceOverrides[date]:null;
    return o&&typeof o==='object'?{...habit,...o}:habit;
  };
  const habitScheduled=(habit,date=today())=>habit.recurrenceRule?applies(habit,date):true;
  const scheduledStreak=habit=>{
    let d=new Date(`${today()}T12:00:00`),count=0,started=false;
    for(let i=0;i<3650;i++){
      const key=iso(d),scheduled=habitScheduled(habit,key);
      if(scheduled){
        if(habitDone(habit,key)){count++;started=true}
        else if(started||key<=today())break;
      }
      d.setDate(d.getDate()-1);
    }
    return count;
  };
  const ruleFromForm=(prefix,startFallback)=>{
    const enabled=$(`${prefix}-recurrence`)?.checked;
    if(!enabled)return null;
    const start=validDate(startFallback)?startFallback:today();
    const weekdays=[...document.querySelectorAll(`input[name="${prefix}-weekday"]:checked`)].map(x=>Number(x.value));
    const frequency=$(`${prefix}-frequency`)?.value||'weekly',interval=Number($(`${prefix}-interval`)?.value)||1;if(!Number.isInteger(interval)||interval<1||interval>365)throw new Error('فاصلهٔ تکرار باید بین ۱ و ۳۶۵ باشد.');
    if(frequency==='weekly'&&!weekdays.length)throw new Error('حداقل یک روز هفته را برای تکرار انتخاب کن.');
    const noEnd=$(`${prefix}-recurrence-no-end`)?.checked;
    const rawEnd=$(`${prefix}-recurrence-end`)?.value||'';
    const end=noEnd?'':rawEnd;
    if(end&&!validDate(end))throw new Error('تاریخ پایان تکرار معتبر نیست.');
    if(end&&end<start)throw new Error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
    if(end&&daysBetween(start,end)>1830)throw new Error('بازهٔ تکرار در این نسخه حداکثر ۵ سال است.');
    return {weekdays:[...new Set(weekdays)],frequency,interval,startDate:start,endDate:end||null,timezone:timezone()};
  };
  function setRuleForm(prefix,rule,startDate){
    const r=safeRule(rule,startDate||today()),toggle=$(`${prefix}-recurrence`),options=$(`${prefix}-recurrence-options`);
    if($(`${prefix}-frequency`))$(`${prefix}-frequency`).value=r?.frequency||'weekly';if($(`${prefix}-interval`))$(`${prefix}-interval`).value=r?.interval||1;
    if(toggle)toggle.checked=!!r;if(options)options.classList.toggle('hidden',!r);
    document.querySelectorAll(`input[name="${prefix}-weekday"]`).forEach(x=>x.checked=!!r&&r.weekdays.includes(Number(x.value)));
    const end=$(`${prefix}-recurrence-end`),noEnd=$(`${prefix}-recurrence-no-end`);
    if(end){end.value=r?.endDate||'';end.disabled=!!r&&!r.endDate}
    if(noEnd)noEnd.checked=!!r&&!r.endDate;
  }
  function syncRecurrenceVisibility(prefix){
    const on=$(`${prefix}-recurrence`)?.checked,options=$(`${prefix}-recurrence-options`);
    if(options)options.classList.toggle('hidden',!on);
    if(on&&!document.querySelector(`input[name="${prefix}-weekday"]:checked`))document.querySelectorAll(`input[name="${prefix}-weekday"]`).forEach(x=>x.checked=true);
  }
  function syncSelect(id,items,placeholder){
    const el=$(id);if(!el)return;const prev=el.value;
    el.innerHTML=`<option value="">${esc(placeholder)}</option>`+items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    if(items.includes(prev))el.value=prev;
  }
  function syncSelectors(){
    const s=ensureState(readState());
    syncSelect('task-list-name',s.taskLists,'بدون لیست');
    syncSelect('task-list-filter',s.taskLists,'همهٔ لیست‌ها');
    syncSelect('task-folder',s.folders,'بدون پوشه');
    syncSelect('task-folder-filter',s.folders,'همهٔ پوشه‌ها');
    syncSelect('task-tag',s.tags,'بدون برچسب');
    syncSelect('task-tag-filter',s.tags,'همهٔ برچسب‌ها');
    syncSelect('focus-tag',s.tags,'بدون برچسب');
  }
  function captureTaskDraft(){
    return {title:$('task-title')?.value||'',shortDescription:$('task-short-description')?.value||'',description:$('task-description')?.value||'',due:$('task-due')?.value||'',time:$('task-time')?.value||'',priority:$('task-priority')?.value||'4',list:$('task-list-name')?.value||'',folder:$('task-folder')?.value||'',tag:$('task-tag')?.value||'',recurrence:$('task-recurrence')?.checked||false,recurrenceEnd:$('task-recurrence-end')?.value||'',noEnd:$('task-recurrence-no-end')?.checked||false,frequency:$('task-frequency')?.value,interval:$('task-interval')?.value,weekdays:[...document.querySelectorAll('input[name="task-weekday"]:checked')].map(x=>x.value)};
  }
  function restoreTaskDraft(draft){
    if(!draft)return;if($('task-frequency'))$('task-frequency').value=draft.frequency||'weekly';if($('task-interval'))$('task-interval').value=draft.interval||1;if($('task-title'))$('task-title').value=draft.title;if($('task-short-description'))$('task-short-description').value=draft.shortDescription;if($('task-description'))$('task-description').value=draft.description;if($('task-due'))$('task-due').value=draft.due;if($('task-time'))$('task-time').value=draft.time;if($('task-priority'))$('task-priority').value=draft.priority;
    syncSelectors();if($('task-list-name'))$('task-list-name').value=draft.list;if($('task-folder'))$('task-folder').value=draft.folder;if($('task-tag'))$('task-tag').value=draft.tag;if($('task-recurrence'))$('task-recurrence').checked=draft.recurrence;syncRecurrenceVisibility('task');document.querySelectorAll('input[name="task-weekday"]').forEach(x=>x.checked=draft.weekdays.includes(x.value));if($('task-recurrence-end')){$('task-recurrence-end').value=draft.recurrenceEnd;$('task-recurrence-end').disabled=draft.noEnd}if($('task-recurrence-no-end'))$('task-recurrence-no-end').checked=draft.noEnd;
  }
  async function inlineCreate(kind,targetId=''){
    const map={list:'taskLists',folder:'folders',tag:'tags'},field=map[kind];if(!field)return'';
    let state=ensureState(readState());const draft=targetId&&targetId.startsWith('task-')?captureTaskDraft():null;
    const labels={list:['افزودن لیست','اسم لیست جدید را بنویس.','نام لیست','مثلاً امروز'],folder:['افزودن پوشه','اسم پوشهٔ جدید را بنویس.','نام پوشه','مثلاً دانشگاه'],tag:['افزودن برچسب','اسم برچسب جدید را بنویس.','نام برچسب','مثلاً مهم']}[kind];
    const value=await window.ElaraDialog.prompt(labels[1],{title:labels[0],label:labels[2],placeholder:labels[3],maxLength:60,confirmText:'افزودن'});
    const name=String(value||'').trim().slice(0,60);if(!name){restoreTaskDraft(draft);return''}
    state=ensureState(readState());const existing=state[field].find(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase());
    if(existing){restoreTaskDraft(draft);syncSelectors();if(targetId&&$(targetId))$(targetId).value=existing;notify('این نام از قبل وجود دارد؛ همان مورد انتخاب شد.');return existing}
    state[field].push(name);writeState(state);restoreTaskDraft(draft);if(draft)openTaskComposer({focus:false});syncSelectors();if(targetId&&$(targetId))$(targetId).value=name;
    notify(kind==='list'?'لیست ساخته و انتخاب شد.':kind==='folder'?'پوشه ساخته و انتخاب شد.':'برچسب ساخته و انتخاب شد.');return name;
  }
  let composerReturn=null;
  function closeComposer(){const shell=$('task-composer-shell');if(shell)shell.hidden=true;const f=$('task-form');if(f)f.hidden=true;composerReturn?.focus?.()}
  function openTaskComposer({focus=true,date=null}={}){
    const form=$('task-form');if(!form)return;let shell=$('task-composer-shell');
    if(!shell){shell=document.createElement('section');shell.id='task-composer-shell';shell.className='task-composer-shell';shell.hidden=true;shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','افزودن و ویرایش تسک');shell.innerHTML='<div class="task-composer-window"><header><h2>تسک من</h2><button type="button" class="quiet-button" data-composer-close aria-label="بستن">×</button></header><div class="task-date-shortcuts"><button type="button" data-date-offset="0">امروز</button><button type="button" data-date-offset="1">فردا</button><button type="button" data-task-calendar>انتخاب تاریخ</button></div></div>';document.body.append(shell);shell.firstElementChild.append(form);shell.addEventListener('click',e=>{if(e.target===shell||e.target.closest('[data-composer-close]'))closeComposer();const b=e.target.closest('[data-date-offset]');if(b){const d=new Date();d.setDate(d.getDate()+Number(b.dataset.dateOffset));$('task-due').value=iso(d)}if(e.target.closest('[data-task-calendar]'))window.ElaraCalendar?.open($('task-due').value||today(),d=>$('task-due').value=d)});shell.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeComposer()}if(e.key==='Tab'){const els=[...shell.querySelectorAll('button,input,select,textarea')].filter(x=>!x.disabled&&x.getClientRects().length);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}})}
    composerReturn=document.activeElement;shell.hidden=false;form.hidden=false;form.dataset.elaraTaskComposer='open';if(date)$('task-due').value=date;
    if(focus)setTimeout(()=>$('task-title')?.focus(),40);
  }
  function closeTaskTools(){const menu=$('elara-task-tools-menu'),toggle=$('elara-task-tools-toggle');if(menu)menu.hidden=true;if(toggle)toggle.setAttribute('aria-expanded','false')}
  function renderTaskTools(){const menu=$('elara-task-tools-menu');if(!menu)return;menu.querySelector('.task-metadata-lists')?.remove();const state=ensureState(readState()),body=document.createElement('div');body.className='task-metadata-lists';body.innerHTML=[['list','لیست‌ها','taskLists'],['folder','پوشه‌ها','folders'],['tag','برچسب‌ها','tags']].map(([kind,title,field])=>`<section><h3>${title}</h3>${state[field].map(name=>`<div class="task-metadata-row"><span>${esc(name)}</span><button type="button" data-meta-edit="${kind}" data-name="${esc(name)}" aria-label="تغییر نام ${esc(name)}">ویرایش</button><button type="button" data-meta-remove="${kind}" data-name="${esc(name)}" aria-label="حذف ${esc(name)}">×</button></div>`).join('')||'<small>هنوز موردی ساخته نشده است.</small>'}</section>`).join('');menu.append(body)}
  function toggleTaskTools(){const menu=$('elara-task-tools-menu'),toggle=$('elara-task-tools-toggle');if(!menu||!toggle)return;renderTaskTools();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))}
  async function manageMetadata(button){const kind=button.dataset.metaEdit||button.dataset.metaRemove,field={list:'taskLists',folder:'folders',tag:'tags'}[kind],old=button.dataset.name;if(!field)return;const draft=captureTaskDraft(),wasOpen=!!$('task-composer-shell')&&!$('task-composer-shell').hidden;let name='';if(button.dataset.metaEdit){name=String(await window.ElaraDialog.prompt('نام جدید',{title:'ویرایش',value:old,maxLength:60})||'').trim();if(!name)return}else if(!await window.ElaraDialog.confirm('این مورد حذف شود؟ تسک‌های آن نگه داشته می‌شوند.',{title:'حذف',danger:true}))return;const state=ensureState(readState());if(draft[kind]===old)draft[kind]=name;if(name&&state[field].includes(name)&&name!==old){notify('این نام وجود دارد.');return}state[field]=name?state[field].map(x=>x===old?name:x):state[field].filter(x=>x!==old);for(const t of state.tasks){if(t[kind]===old)t[kind]=name;for(const v of Object.values(t.occurrenceOverrides||{}))if(v[kind]===old)v[kind]=name}writeState(state);restoreTaskDraft(draft);if(wasOpen)openTaskComposer({focus:false});renderTaskTools()}
  async function handleTaskTools(action){
    if(action==='filter'){const filters=document.querySelector('.astra-task-filters');if(filters)filters.open=true;closeTaskTools();document.querySelector('#panel-tasks .list-toolbar')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('task-search')?.focus(),80);return}
    const target={list:'task-list-name',folder:'task-folder',tag:'task-tag'}[action];if(!target)return;
    openTaskComposer({focus:false});closeTaskTools();await inlineCreate(action,target);setTimeout(()=>$(target)?.focus(),40);
  }

  function recurrenceMarkup(prefix){
    return `<div class="recurrence-box"><label class="recurrence-toggle"><input id="${prefix}-recurrence" type="checkbox"> تکرار زمان‌بندی‌شده</label><div id="${prefix}-recurrence-options" class="recurrence-options hidden"><div class="recurrence-actions"><label>نوع تکرار<select id="${prefix}-frequency"><option value="weekly">روزهای هفته</option><option value="daily">روزانه / فاصله‌دار</option><option value="monthly">ماهانه</option></select></label><label>هر چند نوبت<input id="${prefix}-interval" type="number" min="1" max="365" value="1"></label></div><div class="weekday-picks">${weekOrder.map(d=>`<label><input type="checkbox" name="${prefix}-weekday" value="${d}"><span>${weekNames[d]}</span></label>`).join('')}</div><div class="recurrence-actions"><button type="button" class="quiet-button" data-weekdays-all="${prefix}">هر روز</button><label>پایان <input id="${prefix}-recurrence-end" type="date"></label><label class="no-end"><input id="${prefix}-recurrence-no-end" type="checkbox"> بدون تاریخ پایان</label></div><small class="muted">تکمیل هر نوبت جدا ثبت می‌شود؛ سری بی‌نهایت رکورد تولید نمی‌کند.</small></div></div>`;
  }
  function injectUI(){
    if(!$('task-recurrence')){
      const taskForm=$('task-form'),grid=taskForm?.querySelector('.form-grid');
      const folder=$('task-folder'),tag=$('task-tag');
      if(grid&&!$('task-list-name'))grid.insertAdjacentHTML('beforeend','<div class="task-list-field"><label for="task-list-name">لیست</label><select id="task-list-name"></select><button type="button" class="mini-create" data-phase2-create="list" data-phase2-target="task-list-name">+ جدید</button></div>');
      if(folder&&!folder.nextElementSibling?.matches('[data-phase2-create]'))folder.insertAdjacentHTML('afterend','<button type="button" class="mini-create" data-phase2-create="folder" data-phase2-target="task-folder">+ جدید</button>');
      if(tag&&!tag.nextElementSibling?.matches('[data-phase2-create]'))tag.insertAdjacentHTML('afterend','<button type="button" class="mini-create" data-phase2-create="tag" data-phase2-target="task-tag">+ جدید</button>');
      const dueLabel=document.querySelector('label[for="task-due"]');if(dueLabel)dueLabel.textContent='تاریخ شروع / انجام';
      grid?.insertAdjacentHTML('afterend','<div class="task-description-fields"><label for="task-short-description">توضیح کوتاه<textarea id="task-short-description" maxlength="280" rows="2" placeholder="یک خلاصهٔ کوتاه برای لیست تسک…"></textarea></label><label for="task-description">توضیحات کامل<textarea id="task-description" maxlength="4000" rows="5" placeholder="جزئیات کامل، نکته‌ها، مراحل یا هر چیزی که برای این تسک لازم داری…"></textarea></label></div>');
      if(taskForm?.querySelector('.task-description-fields')){const more=document.createElement('details');more.className='task-more-settings';more.innerHTML='<summary>تنظیمات بیشتر و توضیحات</summary>';const fields=taskForm.querySelector('.task-description-fields');fields.before(more);more.append(fields)}
      taskForm?.querySelector('.task-more-settings')?.insertAdjacentHTML('afterend',recurrenceMarkup('task'));
      const filters=taskForm?.parentElement?.querySelector('.filters');
      if(filters&&!$('task-list-filter'))filters.insertAdjacentHTML('beforeend','<label class="sr-only" for="task-list-filter">فیلتر لیست</label><select id="task-list-filter"><option value="">همهٔ لیست‌ها</option></select>');
      if(filters&&!$('task-priority-filter'))filters.insertAdjacentHTML('beforeend','<label class="sr-only" for="task-priority-filter">فیلتر اولویت</label><select id="task-priority-filter"><option value="">همهٔ اولویت‌ها</option><option value="1">فوری · P1</option><option value="2">بالا · P2</option><option value="3">متوسط · P3</option><option value="4">عادی · P4</option></select>');
      const priority=$('task-priority');if(priority)priority.innerHTML='<option value="4">عادی · P4 · خاکستری</option><option value="3">متوسط · P3 · آبی</option><option value="2">بالا · P2 · زرد</option><option value="1">فوری · P1 · قرمز</option>';
    }
    const taskPanel=$('panel-tasks'),taskForm=$('task-form'),heading=taskPanel?.querySelector('.section-heading');
    if(taskPanel&&!$('astra-task-hero')){const hero=document.createElement('section');hero.id='astra-task-hero';hero.className='astra-task-hero';hero.innerHTML='<div><p>ELARA · TASK HUB</p><h1>تسک‌های امروز</h1><span>کارهای امروزت را انجام بده و نسخه‌ای قوی‌تر از خودت بساز.</span></div><blockquote>«قدم‌های کوچک، نتایج بزرگ می‌سازند.»<small>— Elara</small></blockquote>';taskPanel.prepend(hero);if(heading){heading.querySelector('h1').textContent='برنامهٔ من';heading.querySelector('.eyebrow')?.remove()}}
    if(taskPanel&&!$('astra-task-chips')){const chips=document.createElement('div');chips.id='astra-task-chips';chips.className='astra-task-chips';chips.innerHTML=[['all','همه'],['today','امروز'],['active','در حال انجام'],['completed','انجام‌شده']].map(([value,label])=>`<button type="button" data-task-chip="${value}" aria-pressed="${value==='all'}">${label}</button>`).join('');taskPanel.querySelector('.list-toolbar')?.before(chips);chips.addEventListener('click',e=>{const b=e.target.closest('[data-task-chip]');if(!b)return;$('task-filter').value=b.dataset.taskChip;renderTasks();chips.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))})}
    if(heading&&!$('elara-task-page-actions')){const actions=document.createElement('div');actions.id='elara-task-page-actions';actions.className='elara-task-page-actions';actions.innerHTML='<div class="astra-task-view-controls" role="group" aria-label="نمایش تسک‌ها"><button type="button" data-task-view="list" aria-pressed="true" aria-label="نمای فهرستی">☷</button><button type="button" data-task-view="grid" aria-pressed="false" aria-label="نمای کارتی">▦</button></div><button id="elara-task-add-main" type="button" class="elara-task-add-main" aria-label="افزودن تسک جدید"><span aria-hidden="true">+</span><strong>افزودن تسک</strong></button><button id="elara-task-tools-toggle" type="button" class="elara-task-tools-toggle" aria-label="منوی بیشتر تسک‌ها" aria-haspopup="menu" aria-expanded="false">⋯</button>';heading.append(actions);actions.addEventListener('click',e=>{const view=e.target.closest('[data-task-view]');if(!view)return;const mode=view.dataset.taskView==='grid'?'grid':'list';taskPanel.dataset.taskView=mode;actions.querySelectorAll('[data-task-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===view)))})}
    if(taskPanel&&!$('elara-task-tools-menu')){const menu=document.createElement('div');menu.id='elara-task-tools-menu';menu.className='elara-task-tools-menu';menu.setAttribute('role','menu');menu.hidden=true;menu.innerHTML='<strong>مدیریت تسک‌ها</strong><button type="button" role="menuitem" data-task-tools="list">ساخت لیست</button><button type="button" role="menuitem" data-task-tools="folder">ساخت پوشه</button><button type="button" role="menuitem" data-task-tools="tag">ساخت تگ</button><button type="button" role="menuitem" data-task-tools="filter">فیلتر</button>';taskPanel.append(menu)}
    if(taskPanel&&!$('astra-task-toolbar')){const toolbar=document.createElement('div');toolbar.id='astra-task-toolbar';toolbar.className='astra-task-toolbar';$('astra-task-hero').after(toolbar);toolbar.append($('astra-task-chips'),$('elara-task-page-actions'));const filters=taskPanel.querySelector('.list-toolbar');if(filters){const details=document.createElement('details');details.className='astra-task-filters';details.innerHTML='<summary>جستجو و فیلترهای بیشتر</summary>';toolbar.after(details);details.append(filters)}}
    const stats=taskPanel?.querySelector('.stats');if(stats)taskPanel.append(stats);
    if(taskPanel&&!$('astra-task-insights')){const insights=document.createElement('div');insights.id='astra-task-insights';insights.className='astra-task-insights';insights.innerHTML='<section id="astra-task-progress" class="elara-card astra-task-progress" aria-live="polite"></section>';taskPanel.append(insights)}
    if(taskPanel&&!$('astra-task-streak')){const streak=document.createElement('section');streak.id='astra-task-streak';streak.className='elara-card astra-task-streak';$('astra-task-insights').append(streak)}
    if(taskForm&&!taskForm.dataset.elaraTaskComposer){taskForm.hidden=true;taskForm.dataset.elaraTaskComposer='closed'}
    if(!$('habit-recurrence')){
      const form=$('habit-form');form?.classList.add('phase2-habit-form');
      form?.insertAdjacentHTML('beforeend','<button id="habit-cancel" class="quiet-button hidden" type="button">لغو ویرایش</button><label class="phase2-date-label" for="habit-start">شروع</label><input id="habit-start" type="date">');
      form?.insertAdjacentHTML('beforeend',recurrenceMarkup('habit'));
    }
    if(!$('focus-duration')){
      const card=$('panel-focus')?.querySelector('.focus-card'),status=$('focus-status');const hint=card?.querySelector('.muted');if(hint)hint.textContent='مدت تمرکز و برچسب را قبل از شروع انتخاب کن؛ جلسهٔ فعال با جابه‌جایی بین صفحه‌ها و Refresh از بین نمی‌رود.';
      status?.insertAdjacentHTML('afterend','<div class="focus-config"><div><label for="focus-duration">مدت تمرکز (دقیقه)</label><div class="focus-presets"><button type="button" data-focus-preset="15">۱۵</button><button type="button" data-focus-preset="25">۲۵</button><button type="button" data-focus-preset="45">۴۵</button><button type="button" data-focus-preset="60">۶۰</button><input id="focus-duration" type="number" min="1" max="180" value="25" inputmode="numeric"></div></div><div><label for="focus-tag">برچسب جلسه</label><div class="focus-tag-row"><select id="focus-tag"></select><button type="button" class="mini-create" data-phase2-create="tag" data-phase2-target="focus-tag">+ جدید</button></div></div></div>');
      card?.insertAdjacentHTML('afterend','<section class="surface focus-history-card"><h2>تاریخچهٔ تمرکز</h2><p class="muted">جلسه‌های تکمیل‌شده با مدت و برچسب ذخیره می‌شوند.</p><div id="focus-history" class="focus-history"></div></section>');
    }
    syncSelectors();
    if($('habit-start')&&!$('habit-start').value)$('habit-start').value=today();
  }

  function renderTasks(){
    const state=ensureState(readState()),list=$('task-list');if(!list)return;
    const now=today(),search=($('task-search')?.value||'').trim().toLocaleLowerCase(),filter=$('task-filter')?.value||'all',listName=$('task-list-filter')?.value||'',folder=$('task-folder-filter')?.value||'',tag=$('task-tag-filter')?.value||'',priority=$('task-priority-filter')?.value||'';
    const visible=state.tasks.filter(t=>{
      const v=taskView(t,now),done=taskDone(t,now),todayDue=t.recurrenceRule?applies(t,now):t.date===now,rule=safeRule(t.recurrenceRule,t.date),expired=!!(rule?.endDate&&rule.endDate<now);
      const hay=[v.text||t.text,v.shortDescription||t.shortDescription,v.description||t.description,v.list||t.list,v.tag||t.tag,v.folder||t.folder].map(x=>String(x||'').toLocaleLowerCase());
      return (!search||hay.some(x=>x.includes(search)))&&(!listName||v.list===listName)&&(!folder||v.folder===folder)&&(!tag||v.tag===tag)&&(!priority||String(v.priority)===priority)&&(
        filter==='all'||filter==='active'&&!done&&!expired||filter==='completed'&&done||filter==='today'&&todayDue||filter==='overdue'&&!t.recurrenceRule&&!t.completed&&t.date&&t.date<now
      );
    }).sort((a,b)=>Number(taskDone(a,now))-Number(taskDone(b,now))||Number(taskView(a,now).priority)-Number(taskView(b,now).priority)||(a.date||'9999').localeCompare(b.date||'9999'));
    list.innerHTML=visible.map(t=>{
      const v=taskView(t,now),done=taskDone(t,now),scheduled=window.ElaraSchedule.taskDue(t,now),p=priorityMeta[String(v.priority)]||priorityMeta['4'];
      const kind=v.list||v.folder||v.tag||'شخصی',percent=done?100:0;
      const art=/کتاب|مطالعه|خوان|زبان/.test(v.text)?'icon-library-open-book.webp':/ورزش|تمرین|پیاده/.test(v.text)?'icon-exercise-dumbbell.webp':'nav-tasks-default.webp';
      return `<li class="item astra-task-row priority-${esc(v.priority||'4')} ${done?'done':''}"><button class="check-button" type="button" data-phase2-action="toggle-task" data-id="${esc(t.id)}" aria-pressed="${done}" ${!scheduled?'disabled':''} aria-label="${scheduled?(done?'بازگرداندن':'تکمیل'):'برای امروز برنامه‌ریزی نشده'} ${esc(v.text||t.text)}">${done?'<img class="elara-check-art" src="assets/ui/icon-task-complete-astra-v2.webp" alt="" decoding="async">':''}</button><div class="item-content"><button class="task-summary-button" type="button" data-phase2-action="view-task" data-id="${esc(t.id)}"><span class="item-title">${esc(v.text||t.text)}</span></button><div class="item-meta"><span class="priority-badge ${p.className}">${p.label} · P${esc(v.priority||'4')}</span>${t.recurrenceRule?`<span>↻ ${esc(recurrenceLabel(t.recurrenceRule))}</span>`:t.date?`<span>${esc(labelDate(t.date))}${v.time?' · '+esc(v.time):''}</span>`:''}${v.tag?`<span>#${esc(v.tag)}</span>`:''}</div>${v.shortDescription?`<p class="task-short-description">${esc(v.shortDescription)}</p>`:''}</div><span class="astra-task-category">${esc(kind)}</span><div class="astra-task-completion"><span class="astra-task-completion-label"><img src="assets/ui/${art}" alt="">${done?'انجام شد':'در انتظار انجام'}</span><span class="astra-row-track" role="progressbar" aria-label="تکمیل تسک" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></span><b>${fa(percent)}٪</b></div><span class="astra-task-xp">+۱۰ XP</span><details class="astra-task-more"><summary aria-label="گزینه‌های تسک">⋮</summary><div class="item-actions"><button class="mini-button" type="button" data-phase2-action="edit-task" data-id="${esc(t.id)}">ویرایش</button><button class="mini-button danger" type="button" data-phase2-action="delete-task" data-id="${esc(t.id)}">حذف</button></div></details></li>`;
    }).join('');
    document.querySelectorAll('[data-task-chip]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.taskChip===filter)));
    $('task-empty')?.classList.toggle('hidden',visible.length!==0);
    if($('task-visible-count'))$('task-visible-count').textContent=fa(visible.length);
    const daily=state.tasks.filter(t=>window.ElaraSchedule.taskDue(t,now)),total=daily.length,doneCount=daily.filter(t=>taskDone(t,now)).length,pct=total?Math.round(doneCount/total*100):0;
    const progress=$('astra-task-progress');if(progress)progress.innerHTML=`<h2><span aria-hidden="true">◎</span> پیشرفت امروز</h2><div class="astra-progress-content"><div class="astra-progress-ring" style="--done:${pct}%" role="img" aria-label="${fa(doneCount)} از ${fa(total)} تسک انجام شده"><strong>${fa(doneCount)}<small> / ${fa(total)}</small></strong></div><div class="astra-progress-legend"><p><i class="is-done"></i>${fa(doneCount)} انجام‌شده</p><p><i></i>${fa(total-doneCount)} باقی‌مانده</p><small>${total?'هر قدم کوچک حساب می‌شود.':'برای امروز تسکی ثبت نشده است.'}</small></div></div>`;
    const categoryHost=$('astra-task-chips');if(categoryHost){let categories=$('astra-list-chips');if(!categories){categories=document.createElement('span');categories.id='astra-list-chips';categoryHost.append(categories);categories.addEventListener('click',e=>{const b=e.target.closest('[data-astra-list]');if(!b)return;$('task-list-filter').value=$('task-list-filter').value===b.dataset.astraList?'':b.dataset.astraList;renderTasks()})}categories.innerHTML=state.taskLists.map(name=>`<button type="button" data-astra-list="${esc(name)}" aria-pressed="${listName===name}">${esc(name)} <small>${fa(state.tasks.filter(t=>t.list===name).length)}</small></button>`).join('')}
    const streakHost=$('astra-task-streak');if(streakHost){const dates=new Set(ensureCompletionHistory(state).map(x=>x.date));let cursor=new Date(now+'T12:00:00'),count=0;if(!dates.has(iso(cursor)))cursor.setDate(cursor.getDate()-1);while(dates.has(iso(cursor))){count++;cursor.setDate(cursor.getDate()-1)}streakHost.innerHTML=`<h2>▣ استریک تسک‌ها</h2><div><img src="assets/ui/streak-flame.webp" alt=""><strong>${fa(count)} روز متوالی</strong><span>${Array.from({length:7},(_,i)=>{const d=new Date(now+'T12:00:00');d.setDate(d.getDate()-6+i);return `<i class="${dates.has(iso(d))?'done':''}" title="${iso(d)}"><small>${d.toLocaleDateString('fa-IR',{weekday:'narrow'})}</small>${dates.has(iso(d))?'<img src="assets/ui/icon-task-complete-astra-v2.webp" alt="انجام‌شده">':'<span class="astra-streak-empty"></span>'}</i>`}).join('')}</span></div>`}
    if($('stat-total'))$('stat-total').textContent=fa(total);if($('stat-done'))$('stat-done').textContent=fa(doneCount);if($('stat-pending'))$('stat-pending').textContent=fa(total-doneCount);if($('stat-progress'))$('stat-progress').textContent=fa(pct)+'٪';if($('progress-bar'))$('progress-bar').style.width=pct+'%';

  }
  function resetTaskForm(){
    closeComposer();editingTask=null;editingTaskScope='series';const f=$('task-form');f?.reset();if(f){f.hidden=true;f.dataset.elaraTaskComposer='closed'}if($('task-form-heading'))$('task-form-heading').textContent='تسک جدید';if($('task-submit'))$('task-submit').textContent='+ افزودن';$('task-cancel')?.classList.add('hidden');if($('task-short-description'))$('task-short-description').value='';if($('task-description'))$('task-description').value='';setRuleForm('task',null,today());syncRecurrenceVisibility('task');
  }
  function fillTaskForm(task,scope){
    const v=scope==='occurrence'?taskView(task,today()):task;editingTask=task.id;editingTaskScope=scope;openTaskComposer({focus:false});$('task-title').value=v.text||task.text||'';if($('task-short-description'))$('task-short-description').value=v.shortDescription||task.shortDescription||'';if($('task-description'))$('task-description').value=v.description||task.description||'';$('task-due').value=scope==='future'?today():(task.date||today());$('task-time').value=v.time||'';$('task-priority').value=String(v.priority||'4');syncSelectors();if($('task-list-name'))$('task-list-name').value=v.list||'';$('task-folder').value=v.folder||'';$('task-tag').value=v.tag||'';setRuleForm('task',task.recurrenceRule,task.date||today());syncRecurrenceVisibility('task');$('task-form-heading').textContent=scope==='occurrence'?'ویرایش فقط نوبت امروز':scope==='future'?'ویرایش از امروز به بعد':'ویرایش تسک';$('task-submit').textContent='ذخیره';$('task-cancel').classList.remove('hidden');$('task-form').scrollIntoView({behavior:'smooth',block:'center'});$('task-title').focus();
  }
  // Split a recurring series without rewriting completed days or granting their XP again.
  function splitFuture(state,item,collection){
    const cut=today(),oldRule=safeRule(item.recurrenceRule,item.date);
    if(!oldRule||oldRule.startDate>=cut)return item;
    const previous=new Date(cut+'T12:00:00');previous.setDate(previous.getDate()-1);
    const next=JSON.parse(JSON.stringify(item));next.id=makeId();next.recurrenceRule={...oldRule,startDate:cut};
    item.recurrenceRule={...oldRule,endDate:iso(previous)};
    for(const field of ['occurrenceDone','occurrenceRewardDays','skippedDates','days','rewardDays'])if(Array.isArray(item[field])){next[field]=item[field].filter(d=>d>=cut);item[field]=item[field].filter(d=>d<cut)}
    next.occurrenceOverrides=Object.fromEntries(Object.entries(item.occurrenceOverrides||{}).filter(([d])=>d>=cut));
    item.occurrenceOverrides=Object.fromEntries(Object.entries(item.occurrenceOverrides||{}).filter(([d])=>d<cut));
    if(collection==='tasks'){next.date=cut;for(const entry of state.taskCompletionHistory)if(entry.taskId===item.id&&entry.date>=cut){entry.taskId=next.id;entry.key=completionKey(next.id,entry.date)}}
    state[collection].unshift(next);return next;
  }
  function submitTask(){
    const state=ensureState(readState()),text=String($('task-title').value||'').trim().slice(0,180);if(!text)return;const date=$('task-due').value||'',fields={text,shortDescription:String($('task-short-description')?.value||'').trim().slice(0,280),description:String($('task-description')?.value||'').trim().slice(0,4000),date,time:$('task-time').value||'',priority:$('task-priority').value||'4',list:$('task-list-name')?.value||'',folder:$('task-folder').value||'',tag:$('task-tag').value||''};let rule=null;try{rule=ruleFromForm('task',date||today())}catch(e){notify(e.message);return}if(rule&&!fields.date)fields.date=rule.startDate;
    if(editingTask){let task=state.tasks.find(t=>t.id===editingTask);if(!task)return resetTaskForm();if(editingTaskScope==='future')task=splitFuture(state,task,'tasks');if(editingTaskScope==='occurrence'){task.occurrenceOverrides=task.occurrenceOverrides&&typeof task.occurrenceOverrides==='object'?task.occurrenceOverrides:{};task.occurrenceOverrides[today()]={text:fields.text,shortDescription:fields.shortDescription,description:fields.description,time:fields.time,priority:fields.priority,list:fields.list,folder:fields.folder,tag:fields.tag};}else{if(editingTaskScope==='future'){if(rule)rule.startDate=today();else{fields.date=fields.date&&fields.date>=today()?fields.date:today();task.completed=dateList(task.occurrenceDone).includes(fields.date);task.doneAt=task.completed?fields.date:null;task.xpAwarded=dateList(task.occurrenceRewardDays).includes(fields.date)}}Object.assign(task,fields,{recurrenceRule:rule});}notify('تسک ویرایش شد.');}else{state.tasks.unshift({id:makeId(),...fields,completed:false,doneAt:null,xpAwarded:false,createdAt:Date.now(),recurrenceRule:rule,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{}});notify('تسک اضافه شد.');}
    writeState(state);resetTaskForm();renderTasks();
  }
  async function openTaskDetails(task){
    const state=ensureState(readState()),wrap=document.createElement('form');wrap.className='task-detail-form';const rule=safeRule(task.recurrenceRule,task.date||today()),weekdays=rule?.weekdays||[];
    wrap.innerHTML=`<label class="wide">عنوان<input data-detail="text" maxlength="180" required value="${esc(task.text||'')}"></label><label class="wide">توضیح کوتاه<textarea data-detail="shortDescription" maxlength="280" rows="2">${esc(task.shortDescription||'')}</textarea></label><label class="wide">توضیحات کامل<textarea data-detail="description" maxlength="4000" rows="6">${esc(task.description||'')}</textarea></label><label>تاریخ شروع / انجام<input data-detail="date" type="date" value="${esc(task.date||'')}"></label><label>ساعت<input data-detail="time" type="time" value="${esc(task.time||'')}"></label><label>اولویت<select data-detail="priority"><option value="1">فوری · P1</option><option value="2">بالا · P2</option><option value="3">متوسط · P3</option><option value="4">عادی · P4</option></select></label><label>لیست<select data-detail="list"><option value="">بدون لیست</option>${state.taskLists.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><label>پوشه<select data-detail="folder"><option value="">بدون پوشه</option>${state.folders.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><label>برچسب<select data-detail="tag"><option value="">بدون برچسب</option>${state.tags.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><div class="task-detail-recurrence"><label class="recurrence-toggle"><input data-detail="recurrence" type="checkbox" ${rule?'checked':''}> تکرار زمان‌بندی‌شده</label><div class="weekday-picks">${weekOrder.map(d=>`<label><input data-detail-weekday type="checkbox" value="${d}" ${weekdays.includes(d)?'checked':''}><span>${weekNames[d]}</span></label>`).join('')}</div><div class="recurrence-actions"><label>پایان <input data-detail="endDate" type="date" value="${esc(rule?.endDate||'')}" ${rule&&!rule.endDate?'disabled':''}></label><label class="no-end"><input data-detail="noEnd" type="checkbox" ${rule&&!rule.endDate?'checked':''}> بدون تاریخ پایان</label></div></div>`;
    wrap.querySelector('[data-detail="priority"]').value=String(task.priority||'4');wrap.querySelector('[data-detail="list"]').value=task.list||'';wrap.querySelector('[data-detail="folder"]').value=task.folder||'';wrap.querySelector('[data-detail="tag"]').value=task.tag||'';
    const recurrence=wrap.querySelector('[data-detail="recurrence"]'),end=wrap.querySelector('[data-detail="endDate"]'),noEnd=wrap.querySelector('[data-detail="noEnd"]');noEnd.addEventListener('change',()=>{end.disabled=noEnd.checked;if(noEnd.checked)end.value=''});
    const save=await window.ElaraDialog.open({title:'جزئیات و ویرایش تسک',content:wrap,wide:true,actions:[{label:'بستن',value:false},{label:'ذخیره تغییرات',value:true,kind:'primary'}]});if(save!==true)return;
    const text=String(wrap.querySelector('[data-detail="text"]').value||'').trim().slice(0,180);if(!text){notify('عنوان تسک نمی‌تواند خالی باشد.');return}const date=wrap.querySelector('[data-detail="date"]').value||'';const newRule=recurrence.checked?{frequency:task.recurrenceRule?.frequency||'weekly',interval:task.recurrenceRule?.interval||1,weekdays:[...wrap.querySelectorAll('[data-detail-weekday]:checked')].map(x=>Number(x.value)),startDate:date||today(),endDate:noEnd.checked?null:(end.value||null),timezone:timezone()}:null;if(newRule&&newRule.frequency==='weekly'&&!newRule.weekdays.length){notify('برای تکرار حداقل یک روز هفته را انتخاب کن.');return}
    Object.assign(task,{text,shortDescription:String(wrap.querySelector('[data-detail="shortDescription"]').value||'').trim().slice(0,280),description:String(wrap.querySelector('[data-detail="description"]').value||'').trim().slice(0,4000),date,time:wrap.querySelector('[data-detail="time"]').value||'',priority:wrap.querySelector('[data-detail="priority"]').value||'4',list:wrap.querySelector('[data-detail="list"]').value||'',folder:wrap.querySelector('[data-detail="folder"]').value||'',tag:wrap.querySelector('[data-detail="tag"]').value||'',recurrenceRule:newRule});writeState(state);renderTasks();notify('جزئیات تسک ذخیره شد.');
  }
  async function taskAction(action,id,date=today()){
    const state=ensureState(readState()),task=state.tasks.find(t=>t.id===id);if(!task)return;const now=validDate(date)?date:today();if(action==='toggle-task'&&(now>today()||!window.ElaraSchedule.taskDue(task,now))){notify('این نوبت هنوز قابل تکمیل نیست.');return}
    if(action==='toggle-task'){if(task.recurrenceRule){if(!applies(task,now)){notify('این تسک برای امروز برنامه‌ریزی نشده.');return}task.occurrenceDone=dateList(task.occurrenceDone);task.occurrenceRewardDays=dateList(task.occurrenceRewardDays);if(task.occurrenceDone.includes(now)){task.occurrenceDone=task.occurrenceDone.filter(x=>x!==now);removeCompletion(state,task,now)}else{task.occurrenceDone.push(now);recordCompletion(state,task,now);if(!task.occurrenceRewardDays.includes(now)){task.occurrenceRewardDays.push(now);state.xp=Number(state.xp||0)+10}}}else{const oldDate=task.doneAt;task.completed=!task.completed;task.doneAt=task.completed?now:null;if(task.completed){recordCompletion(state,task,now);if(!task.xpAwarded){task.xpAwarded=true;state.xp=Number(state.xp||0)+10}}else if(oldDate){removeCompletion(state,task,oldDate)}}writeState(state);renderTasks();return;}
    if(action==='view-task'){await openTaskDetails(task);return}
    if(action==='edit-task'){let scope='series';if(task.recurrenceRule&&applies(task,now)){const choice=await window.ElaraDialog.choice({title:'ویرایش تسک تکرارشونده',message:'می‌خواهی تغییر برای کدام بخش اعمال شود؟',options:[{label:'فقط نوبت امروز',value:'occurrence'},{label:'از امروز به بعد',value:'future',kind:'primary'}]});if(!choice)return;scope=choice}fillTaskForm(task,scope);return;}
    if(action==='delete-task'){if(task.recurrenceRule&&applies(task,now)){const choice=await window.ElaraDialog.choice({title:'حذف تسک تکرارشونده',message:'کدام بخش حذف شود؟',options:[{label:'فقط نوبت امروز',value:'occurrence'},{label:'کل سری',value:'series',kind:'danger'}]});if(!choice)return;if(choice==='occurrence'){task.skippedDates=dateList(task.skippedDates);if(!task.skippedDates.includes(now))task.skippedDates.push(now);task.occurrenceDone=dateList(task.occurrenceDone).filter(x=>x!==now);writeState(state);renderTasks();notify('نوبت امروز حذف شد.');return}}if(await window.ElaraDialog.confirm(task.recurrenceRule?'کل سری این تسک حذف شود؟':'این تسک حذف شود؟',{title:'حذف تسک',confirmText:'حذف',danger:true})){state.tasks=state.tasks.filter(t=>t.id!==id);writeState(state);resetTaskForm();renderTasks()}}
  }

  function renderHabits(){
    const state=ensureState(readState()),list=$('habit-list');if(!list)return;const now=today();
    list.innerHTML=state.habits.map(h=>{
      const v=habitView(h,now),done=habitDone(h,now),scheduled=habitScheduled(h,now);
      return `<li class="item ${done?'done':''}"><button type="button" class="check-button" data-phase2-action="toggle-habit" data-id="${esc(h.id)}" aria-pressed="${done}" ${!scheduled?'disabled':''} aria-label="${scheduled?'ثبت امروز':'امروز زمان‌بندی نشده'} برای ${esc(v.title||h.title)}">${done?'<img class="elara-check-art" src="assets/ui/icon-task-complete-astra-v2.webp" alt="" decoding="async">':''}</button><div class="item-content"><div class="item-title">${esc(v.title||h.title)}</div><div class="item-meta"><span>تداوم: ${fa(scheduledStreak(h))} نوبت</span><span>کل ثبت‌ها: ${fa(dateList(h.days).length)}</span>${h.recurrenceRule?`<span>↻ ${esc(recurrenceLabel(h.recurrenceRule))}</span>`:'<span>هر روز</span>'}</div></div><div class="item-actions"><button type="button" class="mini-button" data-phase2-action="edit-habit" data-id="${esc(h.id)}">ویرایش</button><button type="button" class="mini-button danger" data-phase2-action="delete-habit" data-id="${esc(h.id)}">حذف</button></div></li>`;
    }).join('');
    $('habit-empty')?.classList.toggle('hidden',state.habits.length!==0);
  }
  function resetHabitForm(){
    editingHabit=null;editingHabitScope='series';$('habit-form')?.reset();if($('habit-start'))$('habit-start').value=today();$('habit-cancel')?.classList.add('hidden');setRuleForm('habit',null,today());syncRecurrenceVisibility('habit');
  }
  function fillHabitForm(habit,scope){
    const v=scope==='occurrence'?habitView(habit,today()):habit;editingHabit=habit.id;editingHabitScope=scope;$('habit-title').value=v.title||habit.title||'';$('habit-start').value=scope==='future'?today():(habit.recurrenceRule?.startDate||today());setRuleForm('habit',habit.recurrenceRule,$('habit-start').value);syncRecurrenceVisibility('habit');$('habit-cancel').classList.remove('hidden');$('habit-title').focus();
  }
  function submitHabit(){
    const state=ensureState(readState()),title=String($('habit-title').value||'').trim().slice(0,120);if(!title)return;const start=$('habit-start').value||today();
    let rule=null;try{rule=ruleFromForm('habit',start)}catch(e){notify(e.message);return}
    if(editingHabit){
      let h=state.habits.find(x=>x.id===editingHabit);if(!h)return resetHabitForm();if(editingHabitScope==='future')h=splitFuture(state,h,'habits');
      if(editingHabitScope==='occurrence'){h.occurrenceOverrides=h.occurrenceOverrides&&typeof h.occurrenceOverrides==='object'?h.occurrenceOverrides:{};h.occurrenceOverrides[today()]={title}}
      else{if(editingHabitScope==='future'){if(!rule)rule={frequency:'daily',interval:1,weekdays:[],startDate:today(),endDate:null,timezone:timezone()};rule.startDate=today()}h.title=title;h.recurrenceRule=rule}
      notify('عادت ویرایش شد.');
    }else{state.habits.unshift({id:makeId(),title,days:[],rewardDays:[],recurrenceRule:rule,skippedDates:[],occurrenceOverrides:{}});notify('عادت اضافه شد.')}
    writeState(state);resetHabitForm();renderHabits();
  }
  async function habitAction(action,id,date=today()){
    const state=ensureState(readState()),h=state.habits.find(x=>x.id===id);if(!h)return;const now=validDate(date)?date:today();if(action==='toggle-habit'&&now>today()){notify('روز آینده هنوز قابل تکمیل نیست.');return}
    if(action==='toggle-habit'){if(!habitScheduled(h,now)){notify('این عادت برای امروز برنامه‌ریزی نشده.');return}h.days=dateList(h.days);h.rewardDays=dateList(h.rewardDays);if(h.days.includes(now))h.days=h.days.filter(x=>x!==now);else{h.days.push(now);if(!h.rewardDays.includes(now)){h.rewardDays.push(now);state.xp=Number(state.xp||0)+15}}writeState(state);renderHabits();return;}
    if(action==='edit-habit'){let scope='series';if(h.recurrenceRule&&applies(h,now)){const choice=await window.ElaraDialog.choice({title:'ویرایش عادت تکرارشونده',message:'تغییر برای کدام بخش باشد؟',options:[{label:'فقط نوبت امروز',value:'occurrence'},{label:'از امروز به بعد',value:'future',kind:'primary'}]});if(!choice)return;scope=choice}fillHabitForm(h,scope);return;}
    if(action==='delete-habit'){if(h.recurrenceRule&&applies(h,now)){const choice=await window.ElaraDialog.choice({title:'حذف عادت تکرارشونده',message:'کدام بخش حذف شود؟',options:[{label:'فقط نوبت امروز',value:'occurrence'},{label:'کل سری',value:'series',kind:'danger'}]});if(!choice)return;if(choice==='occurrence'){h.skippedDates=dateList(h.skippedDates);if(!h.skippedDates.includes(now))h.skippedDates.push(now);h.days=dateList(h.days).filter(x=>x!==now);writeState(state);renderHabits();notify('نوبت امروز حذف شد.');return}}if(await window.ElaraDialog.confirm(h.recurrenceRule?'کل سری این عادت حذف شود؟':'این عادت حذف شود؟',{title:'حذف عادت',confirmText:'حذف',danger:true})){state.habits=state.habits.filter(x=>x.id!==id);writeState(state);resetHabitForm();renderHabits()}}
  }

  const focusState=()=>ensureState(readState());
  function focusSelectedMinutes(){const n=Math.round(Number($('focus-duration')?.value||25));return Math.max(1,Math.min(180,Number.isFinite(n)?n:25))}
  function focusControls(disabled){document.querySelectorAll('[data-focus-preset],#focus-duration,#focus-tag,[data-phase2-create][data-phase2-target="focus-tag"]').forEach(el=>el.disabled=disabled)}
  function renderFocusHistory(){
    const state=focusState(),box=$('focus-history');if(!box)return;
    const sessions=[...state.focusSessions].sort((a,b)=>(b.endedAt||0)-(a.endedAt||0)).slice(0,20);
    box.innerHTML=sessions.length?sessions.map(s=>`<div class="focus-history-row"><strong>${fa(s.durationMin)} دقیقه</strong><span>${s.tag?'#'+esc(s.tag):'بدون برچسب'}</span><small>${new Date(s.endedAt||s.startedAt||Date.now()).toLocaleString('fa-IR')}</small></div>`).join(''):'<p class="muted">هنوز جلسهٔ تمرکز تکمیل‌شده‌ای نداری.</p>';
  }
  function timerText(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.max(0,sec%60)).padStart(2,'0')}`}
  function finishFocus(active){
    clearInterval(focusInterval);focusInterval=null;const state=focusState(),current=state.activeFocus;
    if(!current||current.id!==active.id)return;
    if(!state.focusSessions.some(s=>s.id===active.id)){state.focusSessions.push({id:active.id,startedAt:active.startedAt,endedAt:Date.now(),durationMin:active.durationMin,tag:active.tag||'',completed:true});state.focusSessions=state.focusSessions.slice(-2000);state.xp=Number(state.xp||0)+15}
    state.activeFocus=null;writeState(state);notify(`${fa(active.durationMin)} دقیقه تمرکز کامل شد؛ ۱۵ XP گرفتی.`);
  }
  function updateFocusDisplay(){
    const state=focusState(),a=state.activeFocus,display=$('timer-display');if(!display)return;
    if(!a){const sec=focusSelectedMinutes()*60;display.textContent=timerText(sec);$('focus-status').textContent='آمادهٔ تمرکز';$('timer-start').textContent='شروع';focusControls(false);return}
    const sec=a.status==='running'?Math.max(0,Math.ceil((Number(a.endAt)-Date.now())/1000)):Math.max(0,Number(a.remainingSec)||0);
    display.textContent=timerText(sec);$('focus-status').textContent=a.status==='running'?`در حال تمرکز${a.tag?' · #'+a.tag:''}`:'مکث';$('timer-start').textContent=a.status==='running'?'مکث':'ادامه';focusControls(true);
    if(a.status==='running'&&sec<=0)finishFocus(a);
  }
  function restoreFocus(){
    clearInterval(focusInterval);focusInterval=null;const state=focusState(),a=state.activeFocus;
    syncSelectors();if(a){if($('focus-duration'))$('focus-duration').value=a.durationMin||25;if($('focus-tag'))$('focus-tag').value=a.tag||''}
    updateFocusDisplay();if(a?.status==='running'&&Number(a.endAt)>Date.now())focusInterval=setInterval(updateFocusDisplay,250);renderFocusHistory();
  }
  function toggleFocus(){
    const state=focusState(),a=state.activeFocus;
    if(a?.status==='running'){a.remainingSec=Math.max(0,Math.ceil((Number(a.endAt)-Date.now())/1000));a.endAt=0;a.status='paused';writeState(state);return}
    if(a?.status==='paused'){a.endAt=Date.now()+Math.max(1,Number(a.remainingSec)||1)*1000;a.status='running';writeState(state);return}
    const durationMin=focusSelectedMinutes(),tag=$('focus-tag')?.value||'',id=makeId(),startedAt=Date.now();
    state.activeFocus={id,durationMin,tag,startedAt,endAt:startedAt+durationMin*60000,remainingSec:durationMin*60,status:'running'};writeState(state);
  }
  async function resetFocus(){
    const state=focusState(),active=state.activeFocus;
    if(!active){updateFocusDisplay();return}
    const confirmed=await window.ElaraDialog.confirm('جلسهٔ فعلی پایان داده شود و زمان‌سنج برای شروع دوباره آماده شود؟',{title:'شروع دوبارهٔ تمرکز',confirmText:'شروع دوباره',cancelText:'ادامهٔ جلسه',danger:true});
    if(!confirmed)return;
    clearInterval(focusInterval);focusInterval=null;
    state.activeFocus=null;
    writeState(state);
    notify('زمان‌سنج برای جلسهٔ جدید آماده شد.');
  }
  function refreshAll(){syncSelectors();renderTasks();renderHabits();renderFocusHistory();updateFocusDisplay()}

  function bind(){
    injectUI();resetTaskForm();resetHabitForm();refreshAll();restoreFocus();
    document.addEventListener('submit',event=>{
      if(event.target?.id==='task-form'){event.preventDefault();event.stopImmediatePropagation();submitTask()}
      if(event.target?.id==='habit-form'){event.preventDefault();event.stopImmediatePropagation();submitHabit()}
    },true);
    document.addEventListener('click',async event=>{
      const addMain=event.target.closest('#elara-task-add-main');if(addMain){event.preventDefault();event.stopImmediatePropagation();openTaskComposer();return}
      const toolsToggle=event.target.closest('#elara-task-tools-toggle');if(toolsToggle){event.preventDefault();event.stopImmediatePropagation();toggleTaskTools();return}
      const meta=event.target.closest('[data-meta-edit],[data-meta-remove]');if(meta){event.preventDefault();event.stopImmediatePropagation();await manageMetadata(meta);return}
      const toolsAction=event.target.closest('[data-task-tools]');if(toolsAction){event.preventDefault();event.stopImmediatePropagation();await handleTaskTools(toolsAction.dataset.taskTools);return}
      if(!$('elara-task-tools-menu')?.hidden&&!event.target.closest('#elara-task-tools-menu'))closeTaskTools();
      const create=event.target.closest('[data-phase2-create]');if(create){event.preventDefault();event.stopImmediatePropagation();await inlineCreate(create.dataset.phase2Create,create.dataset.phase2Target);return}
      const all=event.target.closest('[data-weekdays-all]');if(all){event.preventDefault();event.stopImmediatePropagation();document.querySelectorAll(`input[name="${all.dataset.weekdaysAll}-weekday"]`).forEach(x=>x.checked=true);return}
      const preset=event.target.closest('[data-focus-preset]');if(preset){event.preventDefault();event.stopImmediatePropagation();if(!$('focus-duration')?.disabled){$('focus-duration').value=preset.dataset.focusPreset;updateFocusDisplay()}return}
      if(event.target.closest('#timer-start')){event.preventDefault();event.stopImmediatePropagation();toggleFocus();return}
      if(event.target.closest('#timer-reset')){event.preventDefault();event.stopImmediatePropagation();await resetFocus();return}
      if(event.target.closest('#task-cancel')){event.preventDefault();event.stopImmediatePropagation();resetTaskForm();return}
      if(event.target.closest('#habit-cancel')){event.preventDefault();event.stopImmediatePropagation();resetHabitForm();return}
      const action=event.target.closest('[data-phase2-action]');if(action){event.preventDefault();event.stopImmediatePropagation();const type=action.dataset.phase2Action;if(type.endsWith('task'))await taskAction(type,action.dataset.id);else await habitAction(type,action.dataset.id);return}
    },true);
    for(const prefix of ['task','habit']){
      $(`${prefix}-recurrence`)?.addEventListener('change',()=>syncRecurrenceVisibility(prefix));
      $(`${prefix}-recurrence-no-end`)?.addEventListener('change',e=>{const end=$(`${prefix}-recurrence-end`);if(end){end.disabled=e.target.checked;if(e.target.checked)end.value=''}});
    }
    for(const id of ['task-search','task-filter','task-list-filter','task-folder-filter','task-tag-filter','task-priority-filter'])$(id)?.addEventListener(id==='task-search'?'input':'change',renderTasks);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeTaskTools();if(document.activeElement?.closest?.('#task-form'))closeComposer()}},true);
    $('focus-duration')?.addEventListener('input',()=>{if(!focusState().activeFocus)updateFocusDisplay()});
    window.addEventListener('elara:hydrate',()=>setTimeout(()=>{refreshAll();restoreFocus()},0));
    window.addEventListener('elara:data-changed',()=>setTimeout(refreshAll,0));
  }
  window.ElaraTasks={taskAction,habitAction,taskView,habitView,taskDone,habitScheduled,openComposer:openTaskComposer,render:renderTasks,reset:resetTaskForm};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();