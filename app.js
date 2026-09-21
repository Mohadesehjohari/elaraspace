(() => {
  'use strict';
  const KEY = 'elara_space_v1';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const today = () => iso(new Date());
  const datePlus = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return iso(d); };
  const makeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const asText = (value, limit = 180) => String(value ?? '').trim().slice(0, limit);
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const readJSON = key => { try { return JSON.parse(read(key) ?? 'null'); } catch { return null; } };
  const initial = () => ({version:1, tasks:[], habits:[], goals:[], books:[], words:[], folders:[], tags:[], focusSessions:[], activeFocus:null, missionRewardClaims:[], xp:0, theme:'dark'});
  const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime());
  const uniqueNames = values => Array.isArray(values) ? [...new Set(values.map(v => asText(v,60)).filter(Boolean))].slice(0,250) : [];
  const normalize = raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('ساختار فایل پشتیبان معتبر نیست.');
    const data = initial();
    data.theme = raw.theme === 'light' ? 'light' : 'dark';
    data.xp = Number.isFinite(Number(raw.xp)) ? Math.max(0,Math.min(9999999,Math.floor(Number(raw.xp)))) : 0;
    data.folders = uniqueNames(raw.folders);
    data.tags = uniqueNames(raw.tags);
    for (const key of ['tasks','habits','goals','books','words']) {
      if (raw[key] != null && !Array.isArray(raw[key])) throw new Error(`فهرست ${key} معتبر نیست.`);
    }
    const ids = new Set();
    const safeId = value => { const id = asText(value,100); if (!id || ids.has(id)) { const newId = makeId(); ids.add(newId); return newId; } ids.add(id); return id; };
    const safeDates = value => [...new Set((Array.isArray(value)?value:[]).filter(validDate))].slice(-10000);
    const safeRule = (rule,fallback='') => {
      if(!rule||typeof rule!=='object')return null;
      const weekdays=[...new Set((Array.isArray(rule.weekdays)?rule.weekdays:[]).map(Number).filter(n=>n>=0&&n<=6))];
      if(!weekdays.length)return null;
      const startDate=validDate(rule.startDate)?rule.startDate:(validDate(fallback)?fallback:today());
      const endDate=validDate(rule.endDate)&&rule.endDate>=startDate?rule.endDate:null;
      return {weekdays,startDate,endDate,timezone:asText(rule.timezone,80)||'UTC'};
    };
    const safeOverrides = value => {
      const out={};if(!value||typeof value!=='object'||Array.isArray(value))return out;
      for(const [date,v] of Object.entries(value)){
        if(!validDate(date)||!v||typeof v!=='object')continue;
        out[date]={};
        if(v.text!=null)out[date].text=asText(v.text,180);
        if(v.shortDescription!=null)out[date].shortDescription=asText(v.shortDescription,280);
        if(v.description!=null)out[date].description=asText(v.description,4000);
        if(v.title!=null)out[date].title=asText(v.title,120);
        if(v.time!=null&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time))out[date].time=v.time;
        if(v.priority!=null&&['1','2','3','4'].includes(String(v.priority)))out[date].priority=String(v.priority);
        if(v.folder!=null)out[date].folder=asText(v.folder,60);
        if(v.tag!=null)out[date].tag=asText(v.tag,60);
      }
      return out;
    };
    data.tasks = (raw.tasks || []).slice(0,10000).filter(t => t && typeof t === 'object').map(t => ({id:safeId(t.id),text:asText(t.text ?? t.title),shortDescription:asText(t.shortDescription,280),description:asText(t.description,4000),date:validDate(t.date) ? t.date : '',time:/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time ?? '') ? t.time : '',priority:['1','2','3','4'].includes(String(t.priority)) ? String(t.priority) : '4',folder:asText(t.folder,60),tag:asText(t.tag,60),completed:!!t.completed,doneAt:validDate(t.doneAt) ? t.doneAt : null,xpAwarded:!!(t.xpAwarded || t.completed),createdAt:Number(t.createdAt) || Date.now(),recurrenceRule:safeRule(t.recurrenceRule,t.date),occurrenceDone:safeDates(t.occurrenceDone),occurrenceRewardDays:safeDates(t.occurrenceRewardDays),skippedDates:safeDates(t.skippedDates),occurrenceOverrides:safeOverrides(t.occurrenceOverrides)})).filter(t => t.text);
    data.habits = (raw.habits || []).slice(0,2000).filter(Boolean).map(h => ({id:safeId(h.id),title:asText(h.title ?? h.name,120),days:[...new Set((Array.isArray(h.days) ? h.days : (Array.isArray(h.history) ? h.history : [])).filter(validDate))].slice(-3650),rewardDays:[...new Set((Array.isArray(h.rewardDays) ? h.rewardDays : (Array.isArray(h.days) ? h.days : [])).filter(validDate))].slice(-3650),recurrenceRule:safeRule(h.recurrenceRule,h.recurrenceRule?.startDate),skippedDates:safeDates(h.skippedDates),occurrenceOverrides:safeOverrides(h.occurrenceOverrides)})).filter(h => h.title);
    data.goals = (raw.goals || []).slice(0,2000).filter(Boolean).map(g => ({id:safeId(g.id),title:asText(g.title,180),horizon:['short','medium','long'].includes(g.horizon) ? g.horizon : 'short',steps:(Array.isArray(g.steps) ? g.steps : []).slice(0,1000).filter(Boolean).map(step => ({id:safeId(step.id),text:asText(step.text ?? step.title,180),done:!!(step.done || step.completed)})).filter(step => step.text)})).filter(g => g.title);
    data.books = (raw.books || []).slice(0,3000).filter(Boolean).map(b => ({id:safeId(b.id),title:asText(b.title,180),shelf:['want','reading','finished'].includes(b.shelf) ? b.shelf : 'want'})).filter(b => b.title);
    data.words = (raw.words || []).slice(0,10000).filter(Boolean).map(w => ({id:safeId(w.id),front:asText(w.front ?? w.word,120),back:asText(w.back ?? w.meaning,240),box:Math.max(1,Math.min(5,Number(w.box) || 1)),due:validDate(w.due) ? w.due : today()})).filter(w => w.front && w.back);
    data.missionClaims = [...new Set((Array.isArray(raw.missionClaims)?raw.missionClaims:[]).map(x=>asText(x,120)).filter(Boolean))].slice(-5000);
    data.focusSessions = (Array.isArray(raw.focusSessions)?raw.focusSessions:[]).slice(-2000).filter(s=>s&&typeof s==='object').map(s=>({id:asText(s.id,100)||makeId(),startedAt:Number(s.startedAt)||Date.now(),endedAt:Number(s.endedAt)||0,durationMin:Math.max(1,Math.min(180,Math.round(Number(s.durationMin)||25))),tag:asText(s.tag,60),completed:s.completed!==false}));
    data.missionRewardClaims = [...new Set((Array.isArray(raw.missionRewardClaims)?raw.missionRewardClaims:[]).map(x=>asText(x,100)).filter(Boolean))].slice(-5000);
    if(raw.activeFocus&&typeof raw.activeFocus==='object'){const a=raw.activeFocus;const durationMin=Math.max(1,Math.min(180,Math.round(Number(a.durationMin)||25)));data.activeFocus={id:asText(a.id,100)||makeId(),durationMin,tag:asText(a.tag,60),startedAt:Number(a.startedAt)||Date.now(),endAt:Number(a.endAt)||0,remainingSec:Math.max(0,Math.min(180*60,Math.round(Number(a.remainingSec)||durationMin*60))),status:a.status==='paused'?'paused':'running'}}
    return data;
  };
  const migrateLegacy = () => {
    const legacy = {tasks:readJSON('elara_tasks'),habits:readJSON('elara_habits'),goals:readJSON('elara_goals'),folders:readJSON('elara_folders'),tags:readJSON('elara_tags'),xp:Number(read('elara_xp') || 0)};
    if (!Object.values(legacy).some(v => (Array.isArray(v) && v.length) || (typeof v === 'number' && v > 0))) return initial();
    // Do not overwrite or delete the original app's localStorage keys.
    if (Array.isArray(legacy.habits)) legacy.habits = legacy.habits.map(h => ({...h,title:h.title ?? h.name,days:h.days ?? h.history ?? [],rewardDays:h.days ?? h.history ?? []}));
    if (Array.isArray(legacy.goals)) legacy.goals = legacy.goals.map(g => ({...g,title:g.title ?? g.text,horizon:g.horizon ?? g.category}));
    return normalize(legacy);
  };
  let state;
  try { const saved = readJSON(KEY); state = saved ? normalize(saved) : migrateLegacy(); }
  catch (error) { console.warn('Elara storage recovery:', error); state = initial(); }
  let editingTask = null;
  let currentTab = 'tasks';
  let activeWordId = null;
  let toastTimer;
  const toast = message => { const el = $('toast'); el.textContent = message; el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'),3500); };
  const save = () => { try { localStorage.setItem(KEY,JSON.stringify(state)); window.dispatchEvent(new Event('elara:data-changed')); } catch (error) { console.warn(error); toast('ذخیره‌سازی مرورگر در دسترس نیست. از داده‌ها بکاپ بگیر.'); } };
  const fmt = n => Number(n).toLocaleString('fa-IR');
  const labelDate = value => { try { return new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00`)); } catch { return value; } };
  const wordIntervals = [1,3,7,14,30];
  const taskSort = (a,b) => Number(a.completed)-Number(b.completed) || Number(a.priority)-Number(b.priority) || (a.date || '9999').localeCompare(b.date || '9999') || b.createdAt-a.createdAt;
  const optionHTML = (items,placeholder) => `<option value="">${esc(placeholder)}</option>` + items.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  function syncSelectors() {
    const fields = [['task-folder',state.folders,'بدون پوشه'],['task-tag',state.tags,'بدون برچسب'],['task-folder-filter',state.folders,'همهٔ پوشه‌ها'],['task-tag-filter',state.tags,'همهٔ برچسب‌ها']];
    for (const [id,names,placeholder] of fields) { const el = $(id),prev = el.value; el.innerHTML = optionHTML(names,placeholder); if (names.includes(prev)) el.value = prev; }
  }
  function renderTasks() {
    const search = $('task-search').value.trim().toLocaleLowerCase();
    const filter = $('task-filter').value,folder = $('task-folder-filter').value,tag = $('task-tag-filter').value;
    const visible = state.tasks.filter(t => (!search || [t.text,t.tag,t.folder].some(x => x.toLocaleLowerCase().includes(search))) && (!folder || t.folder === folder) && (!tag || t.tag === tag) && (filter === 'all' || filter === 'active' && !t.completed || filter === 'completed' && t.completed || filter === 'today' && t.date === today() || filter === 'overdue' && !t.completed && t.date && t.date < today())).sort(taskSort);
    $('task-list').innerHTML = visible.map(t => `<li class="item priority-${t.priority} ${t.completed ? 'done':''}"><button class="check-button" type="button" data-action="toggle-task" data-id="${esc(t.id)}" aria-label="${t.completed?'بازگرداندن':'تکمیل'} ${esc(t.text)}" aria-pressed="${t.completed}">${t.completed?'✓':''}</button><div class="item-content"><div class="item-title">${esc(t.text)}</div><div class="item-meta"><span>P${t.priority}</span>${t.date ? `<span class="${!t.completed && t.date < today()?'overdue':''}">◷ ${esc(labelDate(t.date))}${t.time?' · '+esc(t.time):''}</span>`:''}${t.folder?`<span>▤ ${esc(t.folder)}</span>`:''}${t.tag?`<span>#${esc(t.tag)}</span>`:''}</div></div><div class="item-actions"><button class="mini-button" type="button" data-action="edit-task" data-id="${esc(t.id)}" aria-label="ویرایش ${esc(t.text)}">ویرایش</button><button class="mini-button danger" type="button" data-action="delete-task" data-id="${esc(t.id)}" aria-label="حذف ${esc(t.text)}">حذف</button></div></li>`).join('');
    $('task-empty').classList.toggle('hidden',visible.length!==0);
    $('task-visible-count').textContent = fmt(visible.length);
    const done = state.tasks.filter(t => t.completed).length,total = state.tasks.length,pct = total ? Math.round(done/total*100):0;
    $('stat-total').textContent=fmt(total); $('stat-done').textContent=fmt(done); $('stat-pending').textContent=fmt(total-done); $('stat-progress').textContent=fmt(pct)+'٪'; $('progress-bar').style.width=pct+'%';
  }
  function resetTaskForm() { editingTask=null; $('task-form').reset(); $('task-form-heading').textContent='تسک جدید'; $('task-submit').textContent='+ افزودن'; $('task-cancel').classList.add('hidden'); }
  function handleTaskSubmit(event) {
    event.preventDefault();const text=asText($('task-title').value);if(!text)return;
    const fields={text,date:$('task-due').value,time:$('task-time').value,priority:$('task-priority').value,folder:$('task-folder').value,tag:$('task-tag').value};
    if(editingTask){const item=state.tasks.find(t=>t.id===editingTask);if(item)Object.assign(item,fields);toast('تسک ویرایش شد.');}
    else{state.tasks.unshift({id:makeId(),...fields,completed:false,doneAt:null,xpAwarded:false,createdAt:Date.now()});toast('تسک اضافه شد.');}
    save();resetTaskForm();renderTasks();
  }
  async function handleTaskClick(event){
    const button=event.target.closest('[data-action]');if(!button)return;const task=state.tasks.find(t=>t.id===button.dataset.id);if(!task)return;
    if(button.dataset.action==='toggle-task'){task.completed=!task.completed;task.doneAt=task.completed?today():null;if(task.completed&&!task.xpAwarded){task.xpAwarded=true;state.xp+=10;}save();renderTasks();renderHeader();}
    if(button.dataset.action==='edit-task'){editingTask=task.id;$('task-title').value=task.text;$('task-due').value=task.date;$('task-time').value=task.time;$('task-priority').value=task.priority;$('task-folder').value=state.folders.includes(task.folder)?task.folder:'';$('task-tag').value=state.tags.includes(task.tag)?task.tag:'';$('task-form-heading').textContent='ویرایش تسک';$('task-submit').textContent='ذخیره';$('task-cancel').classList.remove('hidden');$('task-form').scrollIntoView({behavior:'smooth',block:'center'});$('task-title').focus();}
    if(button.dataset.action==='delete-task'&&await window.ElaraDialog.confirm('این تسک حذف شود؟',{title:'حذف تسک',confirmText:'حذف',danger:true})){state.tasks=state.tasks.filter(t=>t.id!==task.id);if(editingTask===task.id)resetTaskForm();save();renderTasks();}
  }
  function streak(h){let day=today();if(!h.days.includes(day))day=datePlus(day,-1);let count=0;while(h.days.includes(day)){count++;day=datePlus(day,-1);}return count;}
  function renderHabits(){ $('habit-list').innerHTML=state.habits.map(h=>`<li class="item ${h.days.includes(today())?'done':''}"><button type="button" class="check-button" data-action="toggle-habit" data-id="${esc(h.id)}" aria-pressed="${h.days.includes(today())}" aria-label="ثبت امروز برای ${esc(h.title)}">${h.days.includes(today())?'✓':''}</button><div class="item-content"><div class="item-title">${esc(h.title)}</div><div class="item-meta"><span>تداوم: ${fmt(streak(h))} روز</span><span>کل روزها: ${fmt(h.days.length)}</span></div></div><button type="button" class="mini-button danger" data-action="delete-habit" data-id="${esc(h.id)}">حذف</button></li>`).join('');$('habit-empty').classList.toggle('hidden',!!state.habits.length);}
  async function handleHabitClick(event){const b=event.target.closest('[data-action]');if(!b)return;const h=state.habits.find(x=>x.id===b.dataset.id);if(!h)return;if(b.dataset.action==='toggle-habit'){if(h.days.includes(today()))h.days=h.days.filter(x=>x!==today());else{h.days.push(today());if(!h.rewardDays.includes(today())){h.rewardDays.push(today());state.xp+=15;}}save();renderHabits();renderHeader();}if(b.dataset.action==='delete-habit'&&await window.ElaraDialog.confirm('این عادت حذف شود؟',{title:'حذف عادت',confirmText:'حذف',danger:true})){state.habits=state.habits.filter(x=>x.id!==h.id);save();renderHabits();}}
  const horizonName={short:'کوتاه‌مدت',medium:'میان‌مدت',long:'بلندمدت'};
  function renderGoals(){$('goal-list').innerHTML=state.goals.map(g=>`<li class="item"><div class="item-content"><div class="item-title">${esc(g.title)}</div><div class="item-meta"><span>${horizonName[g.horizon]}</span><span>${fmt(g.steps.filter(s=>s.done).length)} / ${fmt(g.steps.length)} قدم</span></div><ul class="item-list">${g.steps.map(s=>`<li class="item ${s.done?'done':''}"><button class="check-button" type="button" data-action="toggle-step" data-goal="${esc(g.id)}" data-id="${esc(s.id)}" aria-label="تکمیل قدم ${esc(s.text)}">${s.done?'✓':''}</button><span class="item-content item-title">${esc(s.text)}</span><button class="mini-button danger" type="button" data-action="delete-step" data-goal="${esc(g.id)}" data-id="${esc(s.id)}">حذف</button></li>`).join('')}</ul><button class="mini-button" type="button" data-action="add-step" data-goal="${esc(g.id)}">+ افزودن قدم</button></div><button class="mini-button danger" type="button" data-action="delete-goal" data-goal="${esc(g.id)}">حذف هدف</button></li>`).join('');$('goal-empty').classList.toggle('hidden',!!state.goals.length);}
  async function handleGoalClick(event){const b=event.target.closest('[data-action]');if(!b)return;const goal=state.goals.find(g=>g.id===b.dataset.goal);if(!goal)return;const action=b.dataset.action;if(action==='delete-goal'&&await window.ElaraDialog.confirm('هدف و قدم‌های آن حذف شود؟',{title:'حذف هدف',confirmText:'حذف',danger:true}))state.goals=state.goals.filter(g=>g.id!==goal.id);if(action==='add-step'){const text=asText(await window.ElaraDialog.prompt('عنوان قدم جدید را بنویس.',{title:'افزودن قدم',label:'عنوان قدم',placeholder:'مثلاً مطالعه فصل اول',maxLength:180,confirmText:'افزودن'}));if(text)goal.steps.push({id:makeId(),text,done:false});}if(action==='toggle-step'){const s=goal.steps.find(x=>x.id===b.dataset.id);if(s)s.done=!s.done;}if(action==='delete-step'&&await window.ElaraDialog.confirm('این قدم حذف شود؟',{title:'حذف قدم',confirmText:'حذف',danger:true}))goal.steps=goal.steps.filter(s=>s.id!==b.dataset.id);save();renderGoals();}
  const shelfName={want:'برای مطالعه',reading:'در حال مطالعه',finished:'خوانده‌شده'};
  function renderBooks(){const filter=$('book-filter').value;const books=state.books.filter(b=>filter==='all'||b.shelf===filter);$('book-list').innerHTML=books.map(b=>`<li class="item"><span class="topbar-star">▤</span><div class="item-content"><div class="item-title">${esc(b.title)}</div><div class="item-meta"><span>${shelfName[b.shelf]}</span></div></div><select data-action="book-shelf" data-id="${esc(b.id)}" aria-label="قفسه ${esc(b.title)}">${Object.entries(shelfName).map(([value,label])=>`<option value="${value}" ${b.shelf===value?'selected':''}>${label}</option>`).join('')}</select><button class="mini-button danger" type="button" data-action="delete-book" data-id="${esc(b.id)}">حذف</button></li>`).join('');$('book-empty').classList.toggle('hidden',!!books.length);}
  const dueWords=()=>state.words.filter(w=>w.due<=today()).sort((a,b)=>a.due.localeCompare(b.due));
  function renderWords(){const due=dueWords();if(!due.some(w=>w.id===activeWordId))activeWordId=due[0]?.id??null;const w=due.find(w=>w.id===activeWordId);$('word-count').textContent=`${fmt(due.length)} کلمه برای مرور · ${fmt(state.words.length)} کلمه در جعبه`;$('flash-front').textContent=w?w.front:'کلمه‌ای برای مرور امروز باقی نمانده ✦';$('flash-back').textContent=w?w.back:'';$('flash-back').classList.add('hidden');$('word-reveal').classList.toggle('hidden',!w);$('word-forgot').classList.add('hidden');$('word-remembered').classList.add('hidden');$('word-list').innerHTML=state.words.map(word=>`<li class="item"><div class="item-content"><div class="item-title">${esc(word.front)} — ${esc(word.back)}</div><div class="item-meta"><span>جعبه ${fmt(word.box)}</span><span>مرور بعدی: ${esc(labelDate(word.due))}</span></div></div><button class="mini-button danger" type="button" data-action="delete-word" data-id="${esc(word.id)}">حذف</button></li>`).join('');}
  function reviewWord(remembered){const w=state.words.find(word=>word.id===activeWordId);if(!w)return;w.box=remembered?Math.min(5,w.box+1):1;w.due=datePlus(today(),remembered?wordIntervals[w.box-2]??30:1);if(remembered)state.xp+=15;activeWordId=null;save();renderWords();renderHeader();}
  function renderSettings(){ $('folder-list').innerHTML=state.folders.map(name=>`<span class="chip">${esc(name)} <button type="button" data-action="remove-folder" data-name="${esc(name)}" aria-label="حذف پوشه ${esc(name)}">×</button></span>`).join('');$('tag-list').innerHTML=state.tags.map(name=>`<span class="chip">${esc(name)} <button type="button" data-action="remove-tag" data-name="${esc(name)}" aria-label="حذف برچسب ${esc(name)}">×</button></span>`).join('');}
  function renderHeader(){ $('xp-count').textContent=fmt(state.xp);$('today-date').textContent=labelDate(today());$('sidebar-date').textContent=labelDate(today());$('task-date-chip').textContent=labelDate(today());}
  const tabNames={tasks:'تسک‌های من',habits:'عادت‌های من',goals:'هدف‌های من',focus:'فضای تمرکز',books:'کتابخانه',words:'جعبه لایتنر',settings:'تنظیمات'};
  function setTab(name){if(!Object.hasOwn(tabNames,name))return;currentTab=name;for(const tab of Object.keys(tabNames))$(`panel-${tab}`).classList.toggle('hidden',name!==tab);document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);if(b.classList.contains('nav-item'))b.setAttribute('aria-current',b.dataset.tab===name?'page':'false');});$('page-title').textContent=tabNames[name];window.scrollTo({top:0,behavior:'instant'});}
  let remaining=25*60,endAt=0,interval=null;
  function updateTimer(){const sec=endAt?Math.max(0,Math.ceil((endAt-Date.now())/1000)):remaining;$('timer-display').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;if(endAt&&sec<=0){clearInterval(interval);interval=null;endAt=0;remaining=25*60;$('timer-start').textContent='شروع';$('focus-status').textContent='بازهٔ تمرکز تموم شد ✦';state.xp+=15;save();renderHeader();toast('۲۵ دقیقه تمرکز تموم شد؛ ۱۵ امتیاز گرفتی.');}return sec;}
  function toggleTimer(){if(endAt){remaining=updateTimer();endAt=0;clearInterval(interval);interval=null;$('timer-start').textContent='ادامه';$('focus-status').textContent='مکث';}else{endAt=Date.now()+remaining*1000;interval=setInterval(updateTimer,250);$('timer-start').textContent='مکث';$('focus-status').textContent='در حال تمرکز';updateTimer();}}
  function resetTimer(){endAt=0;remaining=25*60;clearInterval(interval);interval=null;$('timer-start').textContent='شروع';$('focus-status').textContent='آمادهٔ تمرکز';updateTimer();}
  function applyTheme(){document.body.classList.toggle('light',state.theme==='light');document.body.classList.toggle('dark',state.theme!=='light');}
  function renderAll(){syncSelectors();renderHeader();renderTasks();renderHabits();renderGoals();renderBooks();renderWords();renderSettings();applyTheme();}
  function bindForm(form,callback){$(form).addEventListener('submit',event=>{event.preventDefault();callback(event);});}
  $('task-form').addEventListener('submit',handleTaskSubmit);$('task-cancel').addEventListener('click',resetTaskForm);$('task-list').addEventListener('click',handleTaskClick);
  for(const id of ['task-search','task-filter','task-folder-filter','task-tag-filter'])$(id).addEventListener(id==='task-search'?'input':'change',renderTasks);
  bindForm('habit-form',()=>{const title=asText($('habit-title').value,120);if(!title)return;state.habits.unshift({id:makeId(),title,days:[],rewardDays:[]});$('habit-form').reset();save();renderHabits();});$('habit-list').addEventListener('click',handleHabitClick);
  bindForm('goal-form',()=>{const title=asText($('goal-title').value);if(!title)return;state.goals.unshift({id:makeId(),title,horizon:$('goal-horizon').value,steps:[]});$('goal-form').reset();save();renderGoals();});$('goal-list').addEventListener('click',handleGoalClick);
  bindForm('book-form',()=>{const title=asText($('book-title').value);if(!title)return;state.books.unshift({id:makeId(),title,shelf:$('book-shelf').value});$('book-form').reset();save();renderBooks();});$('book-filter').addEventListener('change',renderBooks);
  $('book-list').addEventListener('change',event=>{const el=event.target.closest('[data-action="book-shelf"]');if(!el)return;const book=state.books.find(b=>b.id===el.dataset.id);if(book&&Object.hasOwn(shelfName,el.value)){book.shelf=el.value;save();renderBooks();}});
  $('book-list').addEventListener('click',async event=>{const b=event.target.closest('[data-action="delete-book"]');if(!b||!await window.ElaraDialog.confirm('کتاب حذف شود؟',{title:'حذف کتاب',confirmText:'حذف',danger:true}))return;state.books=state.books.filter(book=>book.id!==b.dataset.id);save();renderBooks();});
  bindForm('word-form',()=>{const front=asText($('word-front').value,120),back=asText($('word-back').value,240);if(!front||!back)return;state.words.unshift({id:makeId(),front,back,box:1,due:today()});$('word-form').reset();save();renderWords();});
  $('word-reveal').addEventListener('click',()=>{$('flash-back').classList.remove('hidden');$('word-reveal').classList.add('hidden');$('word-forgot').classList.remove('hidden');$('word-remembered').classList.remove('hidden');});$('word-forgot').addEventListener('click',()=>reviewWord(false));$('word-remembered').addEventListener('click',()=>reviewWord(true));
  $('word-list').addEventListener('click',async event=>{const b=event.target.closest('[data-action="delete-word"]');if(!b||!await window.ElaraDialog.confirm('کلمه حذف شود؟',{title:'حذف کلمه',confirmText:'حذف',danger:true}))return;state.words=state.words.filter(w=>w.id!==b.dataset.id);save();renderWords();});
  for(const [kind,field] of [['folder','folders'],['tag','tags']]){bindForm(`${kind}-form`,()=>{const input=$(`${kind}-title`),name=asText(input.value,60);if(!name)return;if(state[field].includes(name)){toast('این نام قبلاً ثبت شده.');return;}state[field].push(name);input.value='';save();syncSelectors();renderSettings();});}
  $('panel-settings').addEventListener('click',async event=>{const b=event.target.closest('[data-action]');if(!b)return;const isFolder=b.dataset.action==='remove-folder',key=isFolder?'folders':'tags';if(!await window.ElaraDialog.confirm('این مورد حذف شود؟',{title:isFolder?'حذف پوشه':'حذف برچسب',confirmText:'حذف',danger:true}))return;state[key]=state[key].filter(name=>name!==b.dataset.name);if(isFolder)state.tasks.forEach(t=>{if(t.folder===b.dataset.name)t.folder='';});else state.tasks.forEach(t=>{if(t.tag===b.dataset.name)t.tag='';});save();syncSelectors();renderSettings();renderTasks();});
  const mobileMore=document.createElement('div');mobileMore.className='surface settings-card';mobileMore.innerHTML='<h2>بخش‌های دیگر</h2><div class="timer-actions"><button class="quiet-button" type="button" data-tab="books">▤ کتابخانه</button><button class="quiet-button" type="button" data-tab="words">◇ جعبه لایتنر</button></div>';$('panel-settings').prepend(mobileMore);
  document.addEventListener('click',event=>{const button=event.target.closest('[data-tab]');if(button)setTab(button.dataset.tab);});
  const changeTheme=()=>{state.theme=state.theme==='dark'?'light':'dark';save();applyTheme();};$('theme-toggle').addEventListener('click',changeTheme);$('settings-theme-toggle').addEventListener('click',changeTheme);
  $('timer-start').addEventListener('click',toggleTimer);$('timer-reset').addEventListener('click',resetTimer);
  $('export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`elara-backup-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('import-file').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>2*1024*1024)throw new Error('حداکثر حجم فایل پشتیبان ۲ مگابایت است.');const parsed=JSON.parse(await file.text());if(parsed.version!==1)throw new Error('نسخهٔ فایل پشتیبان پشتیبانی نمی‌شود.');const imported=normalize(parsed);if(!await window.ElaraDialog.confirm('همهٔ داده‌های فعلی با محتوای این فایل جایگزین بشه؟',{title:'بازیابی بکاپ',confirmText:'جایگزینی داده‌ها',danger:true}))return;state=imported;resetTaskForm();save();renderAll();toast('بکاپ با موفقیت بازیابی شد.');}catch(error){toast(error.message||'فایل پشتیبان قابل خواندن نیست.');}finally{event.target.value='';}});
  window.addEventListener('elara:hydrate',event=>{state=normalize(event.detail);editingTask=null;activeWordId=null;resetTaskForm();renderAll();window.dispatchEvent(new Event('storage'));});
  renderAll();setTab('tasks');
})();