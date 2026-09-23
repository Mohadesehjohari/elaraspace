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
    for(const key of ['tasks','habits','goals','books','words','folders','tags','focusSessions','taskCompletionHistory'])if(!Array.isArray(s[key]))s[key]=[];
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
    if(hydrate)window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:state}));
    window.dispatchEvent(new Event('elara:data-changed'));
  };
  const dateList=v=>Array.isArray(v)?[...new Set(v.filter(validDate))]:[];
  const safeRule=(rule,startFallback=today())=>{
    if(!rule||typeof rule!=='object')return null;
    const weekdays=[...new Set((Array.isArray(rule.weekdays)?rule.weekdays:[]).map(Number).filter(n=>n>=0&&n<=6))];
    if(!weekdays.length)return null;
    const startDate=validDate(rule.startDate)?rule.startDate:(validDate(startFallback)?startFallback:today());
    const endDate=validDate(rule.endDate)&&rule.endDate>=startDate?rule.endDate:null;
    return {weekdays,startDate,endDate,timezone:String(rule.timezone||timezone()).slice(0,80)};
  };
  const applies=(item,date)=>{
    const rule=safeRule(item.recurrenceRule,item.date||today());
    if(!rule)return false;
    if(date<rule.startDate||(rule.endDate&&date>rule.endDate))return false;
    if(dateList(item.skippedDates).includes(date))return false;
    return rule.weekdays.includes(dayOf(date));
  };
  const recurrenceLabel=rule=>{
    const r=safeRule(rule);if(!r)return'';
    const days=r.weekdays.length===7?'هر روز':weekOrder.filter(d=>r.weekdays.includes(d)).map(d=>weekNames[d]).join('، ');
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
    if(!weekdays.length)throw new Error('حداقل یک روز هفته را برای تکرار انتخاب کن.');
    const noEnd=$(`${prefix}-recurrence-no-end`)?.checked;
    const rawEnd=$(`${prefix}-recurrence-end`)?.value||'';
    const end=noEnd?'':rawEnd;
    if(end&&!validDate(end))throw new Error('تاریخ پایان تکرار معتبر نیست.');
    if(end&&end<start)throw new Error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
    if(end&&daysBetween(start,end)>1830)throw new Error('بازهٔ تکرار در این نسخه حداکثر ۵ سال است.');
    return {weekdays:[...new Set(weekdays)],startDate:start,endDate:end||null,timezone:timezone()};
  };
  function setRuleForm(prefix,rule,startDate){
    const r=safeRule(rule,startDate||today()),toggle=$(`${prefix}-recurrence`),options=$(`${prefix}-recurrence-options`);
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
    syncSelect('task-folder',s.folders,'بدون پوشه');
    syncSelect('task-tag',s.tags,'بدون برچسب');
    syncSelect('focus-tag',s.tags,'بدون برچسب');
  }
  function captureTaskDraft(){
    return {title:$('task-title')?.value||'',shortDescription:$('task-short-description')?.value||'',description:$('task-description')?.value||'',due:$('task-due')?.value||'',time:$('task-time')?.value||'',priority:$('task-priority')?.value||'4',folder:$('task-folder')?.value||'',tag:$('task-tag')?.value||'',recurrence:$('task-recurrence')?.checked||false,recurrenceEnd:$('task-recurrence-end')?.value||'',noEnd:$('task-recurrence-no-end')?.checked||false,weekdays:[...document.querySelectorAll('input[name="task-weekday"]:checked')].map(x=>x.value)};
  }
  function restoreTaskDraft(draft){
    if(!draft)return;if($('task-title'))$('task-title').value=draft.title;if($('task-short-description'))$('task-short-description').value=draft.shortDescription;if($('task-description'))$('task-description').value=draft.description;if($('task-due'))$('task-due').value=draft.due;if($('task-time'))$('task-time').value=draft.time;if($('task-priority'))$('task-priority').value=draft.priority;
    syncSelectors();if($('task-folder'))$('task-folder').value=draft.folder;if($('task-tag'))$('task-tag').value=draft.tag;if($('task-recurrence'))$('task-recurrence').checked=draft.recurrence;syncRecurrenceVisibility('task');document.querySelectorAll('input[name="task-weekday"]').forEach(x=>x.checked=draft.weekdays.includes(x.value));if($('task-recurrence-end')){$('task-recurrence-end').value=draft.recurrenceEnd;$('task-recurrence-end').disabled=draft.noEnd}if($('task-recurrence-no-end'))$('task-recurrence-no-end').checked=draft.noEnd;
  }
  async function inlineCreate(kind,targetId){
    const state=ensureState(readState()),field=kind==='folder'?'folders':'tags',draft=targetId.startsWith('task-')?captureTaskDraft():null;
    const title=kind==='folder'?'افزودن پوشه':'افزودن برچسب';
    const value=await window.ElaraDialog.prompt(kind==='folder'?'اسم پوشهٔ جدید را بنویس.':'اسم برچسب جدید را بنویس.',{title,label:kind==='folder'?'نام پوشه':'نام برچسب',placeholder:kind==='folder'?'مثلاً دانشگاه':'مثلاً مهم',maxLength:60,confirmText:'افزودن'});
    const name=String(value||'').trim().slice(0,60);if(!name){restoreTaskDraft(draft);return}
    const existing=state[field].find(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase());if(existing){restoreTaskDraft(draft);syncSelectors();$(targetId).value=existing;notify('این نام از قبل وجود دارد؛ همان مورد انتخاب شد.');return}
    state[field].push(name);writeState(state);restoreTaskDraft(draft);syncSelectors();$(targetId).value=name;notify(kind==='folder'?'پوشه ساخته و انتخاب شد.':'برچسب ساخته و انتخاب شد.');
  }

  function recurrenceMarkup(prefix){
    return `<div class="recurrence-box"><label class="recurrence-toggle"><input id="${prefix}-recurrence" type="checkbox"> تکرار زمان‌بندی‌شده</label><div id="${prefix}-recurrence-options" class="recurrence-options hidden"><div class="weekday-picks">${weekOrder.map(d=>`<label><input type="checkbox" name="${prefix}-weekday" value="${d}"><span>${weekNames[d]}</span></label>`).join('')}</div><div class="recurrence-actions"><button type="button" class="quiet-button" data-weekdays-all="${prefix}">هر روز</button><label>پایان <input id="${prefix}-recurrence-end" type="date"></label><label class="no-end"><input id="${prefix}-recurrence-no-end" type="checkbox"> بدون تاریخ پایان</label></div><small class="muted">تکمیل هر نوبت جدا ثبت می‌شود؛ سری بی‌نهایت رکورد تولید نمی‌کند.</small></div></div>`;
  }
  function injectUI(){
    if(!$('task-recurrence')){
      const taskForm=$('task-form'),grid=taskForm?.querySelector('.form-grid');
      const folder=$('task-folder'),tag=$('task-tag');
      if(folder&&!folder.nextElementSibling?.matches('[data-phase2-create]'))folder.insertAdjacentHTML('afterend','<button type="button" class="mini-create" data-phase2-create="folder" data-phase2-target="task-folder">+ جدید</button>');
      if(tag&&!tag.nextElementSibling?.matches('[data-phase2-create]'))tag.insertAdjacentHTML('afterend','<button type="button" class="mini-create" data-phase2-create="tag" data-phase2-target="task-tag">+ جدید</button>');
      const dueLabel=document.querySelector('label[for="task-due"]');if(dueLabel)dueLabel.textContent='تاریخ شروع / انجام';
      grid?.insertAdjacentHTML('afterend','<div class="task-description-fields"><label for="task-short-description">توضیح کوتاه<textarea id="task-short-description" maxlength="280" rows="2" placeholder="یک خلاصهٔ کوتاه برای لیست تسک…"></textarea></label><label for="task-description">توضیحات کامل<textarea id="task-description" maxlength="4000" rows="5" placeholder="جزئیات کامل، نکته‌ها، مراحل یا هر چیزی که برای این تسک لازم داری…"></textarea></label></div>');
      taskForm?.querySelector('.task-description-fields')?.insertAdjacentHTML('afterend',recurrenceMarkup('task'));
      const filters=taskForm?.parentElement?.querySelector('.filters');
      if(filters&&!$('task-priority-filter'))filters.insertAdjacentHTML('beforeend','<label class="sr-only" for="task-priority-filter">فیلتر اولویت</label><select id="task-priority-filter"><option value="">همهٔ اولویت‌ها</option><option value="1">فوری · P1</option><option value="2">بالا · P2</option><option value="3">متوسط · P3</option><option value="4">عادی · P4</option></select>');
      const priority=$('task-priority');if(priority)priority.innerHTML='<option value="4">عادی · P4 · خاکستری</option><option value="3">متوسط · P3 · آبی</option><option value="2">بالا · P2 · زرد</option><option value="1">فوری · P1 · قرمز</option>';
    }
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
    const now=today(),search=($('task-search')?.value||'').trim().toLocaleLowerCase(),filter=$('task-filter')?.value||'all',folder=$('task-folder-filter')?.value||'',tag=$('task-tag-filter')?.value||'',priority=$('task-priority-filter')?.value||'';
    const visible=state.tasks.filter(t=>{
      const v=taskView(t,now),done=taskDone(t,now),todayDue=t.recurrenceRule?applies(t,now):t.date===now,rule=safeRule(t.recurrenceRule,t.date),expired=!!(rule?.endDate&&rule.endDate<now);
      const hay=[v.text||t.text,v.shortDescription||t.shortDescription,v.description||t.description,v.tag||t.tag,v.folder||t.folder].map(x=>String(x||'').toLocaleLowerCase());
      return (!search||hay.some(x=>x.includes(search)))&&(!folder||v.folder===folder)&&(!tag||v.tag===tag)&&(!priority||String(v.priority)===priority)&&(
        filter==='all'||filter==='active'&&!done&&!expired||filter==='completed'&&done||filter==='today'&&todayDue||filter==='overdue'&&!t.recurrenceRule&&!t.completed&&t.date&&t.date<now
      );
    }).sort((a,b)=>Number(taskDone(a,now))-Number(taskDone(b,now))||Number(taskView(a,now).priority)-Number(taskView(b,now).priority)||(a.date||'9999').localeCompare(b.date||'9999'));
    list.innerHTML=visible.map(t=>{
      const v=taskView(t,now),done=taskDone(t,now),scheduled=!t.recurrenceRule||applies(t,now),p=priorityMeta[String(v.priority)]||priorityMeta['4'];
      return `<li class="item priority-${esc(v.priority||'4')} ${done?'done':''}"><button class="check-button" type="button" data-phase2-action="toggle-task" data-id="${esc(t.id)}" aria-pressed="${done}" ${!scheduled?'disabled':''} aria-label="${scheduled?(done?'بازگرداندن':'تکمیل'):'امروز برنامه‌ریزی نشده'} ${esc(v.text||t.text)}">${done?'✓':''}</button><div class="item-content"><button class="task-summary-button" type="button" data-phase2-action="view-task" data-id="${esc(t.id)}"><div class="item-title">${esc(v.text||t.text)}</div>${(v.shortDescription||t.shortDescription)?`<div class="task-short-description">${esc(v.shortDescription||t.shortDescription)}</div>`:''}</button><div class="item-meta"><span class="priority-badge ${p.className}">${p.label} · P${esc(v.priority||'4')}</span>${t.recurrenceRule?`<span>↻ ${esc(recurrenceLabel(t.recurrenceRule))}</span>`:(t.date?`<span class="${!t.completed&&t.date<now?'overdue':''}">زمان: ${esc(labelDate(t.date))}${v.time?' · '+esc(v.time):''}</span>`:'')}${v.folder?`<span>پوشه: ${esc(v.folder)}</span>`:''}${v.tag?`<span>#${esc(v.tag)}</span>`:''}</div></div><div class="item-actions"><button class="mini-button" type="button" data-phase2-action="edit-task" data-id="${esc(t.id)}">ویرایش در فرم</button><button class="mini-button danger" type="button" data-phase2-action="delete-task" data-id="${esc(t.id)}">حذف</button></div></li>`;
    }).join('');
    $('task-empty')?.classList.toggle('hidden',visible.length!==0);
    if($('task-visible-count'))$('task-visible-count').textContent=fa(visible.length);
    const activeDone=state.tasks.filter(t=>taskDone(t,now)).length,doneCount=completedTodayCount(state,now),activeIds=new Set(state.tasks.map(t=>t.id)),archivedDone=state.taskCompletionHistory.filter(x=>x.date===now&&!activeIds.has(x.taskId)).length,total=state.tasks.length+archivedDone,pct=total?Math.round(doneCount/total*100):0;
    if($('stat-total'))$('stat-total').textContent=fa(total);if($('stat-done'))$('stat-done').textContent=fa(doneCount);if($('stat-pending'))$('stat-pending').textContent=fa(Math.max(0,state.tasks.length-activeDone));if($('stat-progress'))$('stat-progress').textContent=fa(Math.min(100,pct))+'٪';if($('progress-bar'))$('progress-bar').style.width=Math.min(100,pct)+'%';
  }
  function resetTaskForm(){
    editingTask=null;editingTaskScope='series';const f=$('task-form');f?.reset();if($('task-form-heading'))$('task-form-heading').textContent='تسک جدید';if($('task-submit'))$('task-submit').textContent='+ افزودن';$('task-cancel')?.classList.add('hidden');if($('task-short-description'))$('task-short-description').value='';if($('task-description'))$('task-description').value='';setRuleForm('task',null,today());syncRecurrenceVisibility('task');
  }
  function fillTaskForm(task,scope){
    const v=scope==='occurrence'?taskView(task,today()):task;editingTask=task.id;editingTaskScope=scope;$('task-title').value=v.text||task.text||'';if($('task-short-description'))$('task-short-description').value=v.shortDescription||task.shortDescription||'';if($('task-description'))$('task-description').value=v.description||task.description||'';$('task-due').value=scope==='future'?today():(task.date||today());$('task-time').value=v.time||'';$('task-priority').value=String(v.priority||'4');syncSelectors();$('task-folder').value=v.folder||'';$('task-tag').value=v.tag||'';setRuleForm('task',task.recurrenceRule,task.date||today());syncRecurrenceVisibility('task');$('task-form-heading').textContent=scope==='occurrence'?'ویرایش فقط نوبت امروز':scope==='future'?'ویرایش از امروز به بعد':'ویرایش تسک';$('task-submit').textContent='ذخیره';$('task-cancel').classList.remove('hidden');$('task-form').scrollIntoView({behavior:'smooth',block:'center'});$('task-title').focus();
  }
  function submitTask(){
    const state=ensureState(readState()),text=String($('task-title').value||'').trim().slice(0,180);if(!text)return;const date=$('task-due').value||'',fields={text,shortDescription:String($('task-short-description')?.value||'').trim().slice(0,280),description:String($('task-description')?.value||'').trim().slice(0,4000),date,time:$('task-time').value||'',priority:$('task-priority').value||'4',folder:$('task-folder').value||'',tag:$('task-tag').value||''};let rule=null;try{rule=ruleFromForm('task',date||today())}catch(e){notify(e.message);return}if(rule&&!fields.date)fields.date=rule.startDate;
    if(editingTask){const task=state.tasks.find(t=>t.id===editingTask);if(!task)return resetTaskForm();if(editingTaskScope==='occurrence'){task.occurrenceOverrides=task.occurrenceOverrides&&typeof task.occurrenceOverrides==='object'?task.occurrenceOverrides:{};task.occurrenceOverrides[today()]={text:fields.text,shortDescription:fields.shortDescription,description:fields.description,time:fields.time,priority:fields.priority,folder:fields.folder,tag:fields.tag};}else{if(editingTaskScope==='future'&&rule)rule.startDate=today();Object.assign(task,fields,{recurrenceRule:rule});}notify('تسک ویرایش شد.');}else{state.tasks.unshift({id:makeId(),...fields,completed:false,doneAt:null,xpAwarded:false,createdAt:Date.now(),recurrenceRule:rule,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{}});notify('تسک اضافه شد.');}
    writeState(state);resetTaskForm();renderTasks();
  }
  async function openTaskDetails(task){
    const state=ensureState(readState()),wrap=document.createElement('form');wrap.className='task-detail-form';const rule=safeRule(task.recurrenceRule,task.date||today()),weekdays=rule?.weekdays||[];
    wrap.innerHTML=`<label class="wide">عنوان<input data-detail="text" maxlength="180" required value="${esc(task.text||'')}"></label><label class="wide">توضیح کوتاه<textarea data-detail="shortDescription" maxlength="280" rows="2">${esc(task.shortDescription||'')}</textarea></label><label class="wide">توضیحات کامل<textarea data-detail="description" maxlength="4000" rows="6">${esc(task.description||'')}</textarea></label><label>تاریخ شروع / انجام<input data-detail="date" type="date" value="${esc(task.date||'')}"></label><label>ساعت<input data-detail="time" type="time" value="${esc(task.time||'')}"></label><label>اولویت<select data-detail="priority"><option value="1">فوری · P1</option><option value="2">بالا · P2</option><option value="3">متوسط · P3</option><option value="4">عادی · P4</option></select></label><label>پوشه<select data-detail="folder"><option value="">بدون پوشه</option>${state.folders.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><label>برچسب<select data-detail="tag"><option value="">بدون برچسب</option>${state.tags.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><div class="task-detail-recurrence"><label class="recurrence-toggle"><input data-detail="recurrence" type="checkbox" ${rule?'checked':''}> تکرار زمان‌بندی‌شده</label><div class="weekday-picks">${weekOrder.map(d=>`<label><input data-detail-weekday type="checkbox" value="${d}" ${weekdays.includes(d)?'checked':''}><span>${weekNames[d]}</span></label>`).join('')}</div><div class="recurrence-actions"><label>پایان <input data-detail="endDate" type="date" value="${esc(rule?.endDate||'')}" ${rule&&!rule.endDate?'disabled':''}></label><label class="no-end"><input data-detail="noEnd" type="checkbox" ${rule&&!rule.endDate?'checked':''}> بدون تاریخ پایان</label></div></div>`;
    wrap.querySelector('[data-detail="priority"]').value=String(task.priority||'4');wrap.querySelector('[data-detail="folder"]').value=task.folder||'';wrap.querySelector('[data-detail="tag"]').value=task.tag||'';
    const recurrence=wrap.querySelector('[data-detail="recurrence"]'),end=wrap.querySelector('[data-detail="endDate"]'),noEnd=wrap.querySelector('[data-detail="noEnd"]');noEnd.addEventListener('change',()=>{end.disabled=noEnd.checked;if(noEnd.checked)end.value=''});
    const save=await window.ElaraDialog.open({title:'جزئیات و ویرایش تسک',content:wrap,wide:true,actions:[{label:'بستن',value:false},{label:'ذخیره تغییرات',value:true,kind:'primary'}]});if(save!==true)return;
    const text=String(wrap.querySelector('[data-detail="text"]').value||'').trim().slice(0,180);if(!text){notify('عنوان تسک نمی‌تواند خالی باشد.');return}const date=wrap.querySelector('[data-detail="date"]').value||'';const newRule=recurrence.checked?{weekdays:[...wrap.querySelectorAll('[data-detail-weekday]:checked')].map(x=>Number(x.value)),startDate:date||today(),endDate:noEnd.checked?null:(end.value||null),timezone:timezone()}:null;if(newRule&&!newRule.weekdays.length){notify('برای تکرار حداقل یک روز هفته را انتخاب کن.');return}
    Object.assign(task,{text,shortDescription:String(wrap.querySelector('[data-detail="shortDescription"]').value||'').trim().slice(0,280),description:String(wrap.querySelector('[data-detail="description"]').value||'').trim().slice(0,4000),date,time:wrap.querySelector('[data-detail="time"]').value||'',priority:wrap.querySelector('[data-detail="priority"]').value||'4',folder:wrap.querySelector('[data-detail="folder"]').value||'',tag:wrap.querySelector('[data-detail="tag"]').value||'',recurrenceRule:newRule});writeState(state);renderTasks();notify('جزئیات تسک ذخیره شد.');
  }
  async function taskAction(action,id){
    const state=ensureState(readState()),task=state.tasks.find(t=>t.id===id);if(!task)return;const now=today();
    if(action==='toggle-task'){if(task.recurrenceRule){if(!applies(task,now)){notify('این تسک برای امروز برنامه‌ریزی نشده.');return}task.occurrenceDone=dateList(task.occurrenceDone);task.occurrenceRewardDays=dateList(task.occurrenceRewardDays);if(task.occurrenceDone.includes(now)){task.occurrenceDone=task.occurrenceDone.filter(x=>x!==now);removeCompletion(state,task,now)}else{task.occurrenceDone.push(now);recordCompletion(state,task,now);if(!task.occurrenceRewardDays.includes(now)){task.occurrenceRewardDays.push(now);state.xp=Number(state.xp||0)+10}}}else{const oldDate=task.doneAt;task.completed=!task.completed;task.doneAt=task.completed?now:null;if(task.completed){recordCompletion(state,task,now);if(!task.xpAwarded){task.xpAwarded=true;state.xp=Number(state.xp||0)+10}}else if(oldDate){removeCompletion(state,task,oldDate)}}writeState(state);renderTasks();return;}
    if(action==='view-task'){await openTaskDetails(task);return}
    if(action==='edit-task'){let scope='series';if(task.recurrenceRule&&applies(task,now)){const choice=await window.ElaraDialog.choice({title:'ویرایش تسک تکرارشونده',message:'می‌خواهی تغییر برای کدام بخش اعمال شود؟',options:[{label:'فقط نوبت امروز',value:'occurrence'},{label:'از امروز به بعد',value:'future',kind:'primary'}]});if(!choice)return;scope=choice}fillTaskForm(task,scope);return;}
    if(action==='delete-task'){if(task.recurrenceRule&&applies(task,now)){const choice=await window.ElaraDialog.choice({title:'حذف تسک تکرارشونده',message:'کدام بخش حذف شود؟',options:[{label:'فقط نوبت امروز',value:'occurrence'},{label:'کل سری',value:'series',kind:'danger'}]});if(!choice)return;if(choice==='occurrence'){task.skippedDates=dateList(task.skippedDates);if(!task.skippedDates.includes(now))task.skippedDates.push(now);task.occurrenceDone=dateList(task.occurrenceDone).filter(x=>x!==now);writeState(state);renderTasks();notify('نوبت امروز حذف شد.');return}}if(await window.ElaraDialog.confirm(task.recurrenceRule?'کل سری این تسک حذف شود؟':'این تسک حذف شود؟',{title:'حذف تسک',confirmText:'حذف',danger:true})){state.tasks=state.tasks.filter(t=>t.id!==id);writeState(state);resetTaskForm();renderTasks()}}
  }

  function renderHabits(){
    const state=ensureState(readState()),list=$('habit-list');if(!list)return;const now=today();
    list.innerHTML=state.habits.map(h=>{
      const v=habitView(h,now),done=habitDone(h,now),scheduled=habitScheduled(h,now);
      return `<li class="item ${done?'done':''}"><button type="button" class="check-button" data-phase2-action="toggle-habit" data-id="${esc(h.id)}" aria-pressed="${done}" ${!scheduled?'disabled':''} aria-label="${scheduled?'ثبت امروز':'امروز زمان‌بندی نشده'} برای ${esc(v.title||h.title)}">${done?'✓':''}</button><div class="item-content"><div class="item-title">${esc(v.title||h.title)}</div><div class="item-meta"><span>تداوم: ${fa(scheduledStreak(h))} نوبت</span><span>کل ثبت‌ها: ${fa(dateList(h.days).length)}</span>${h.recurrenceRule?`<span>↻ ${esc(recurrenceLabel(h.recurrenceRule))}</span>`:'<span>هر روز</span>'}</div></div><div class="item-actions"><button type="button" class="mini-button" data-phase2-action="edit-habit" data-id="${esc(h.id)}">ویرایش</button><button type="button" class="mini-button danger" data-phase2-action="delete-habit" data-id="${esc(h.id)}">حذف</button></div></li>`;
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
      const h=state.habits.find(x=>x.id===editingHabit);if(!h)return resetHabitForm();
      if(editingHabitScope==='occurrence'){h.occurrenceOverrides=h.occurrenceOverrides&&typeof h.occurrenceOverrides==='object'?h.occurrenceOverrides:{};h.occurrenceOverrides[today()]={title}}
      else{if(editingHabitScope==='future'&&rule)rule.startDate=today();h.title=title;h.recurrenceRule=rule}
      notify('عادت ویرایش شد.');
    }else{state.habits.unshift({id:makeId(),title,days:[],rewardDays:[],recurrenceRule:rule,skippedDates:[],occurrenceOverrides:{}});notify('عادت اضافه شد.')}
    writeState(state);resetHabitForm();renderHabits();
  }
  async function habitAction(action,id){
    const state=ensureState(readState()),h=state.habits.find(x=>x.id===id);if(!h)return;const now=today();
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
    for(const id of ['task-search','task-filter','task-folder-filter','task-tag-filter','task-priority-filter'])$(id)?.addEventListener(id==='task-search'?'input':'change',renderTasks);
    $('focus-duration')?.addEventListener('input',()=>{if(!focusState().activeFocus)updateFocusDisplay()});
    window.addEventListener('elara:hydrate',()=>setTimeout(()=>{refreshAll();restoreFocus()},0));
    window.addEventListener('elara:data-changed',()=>setTimeout(refreshAll,0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();