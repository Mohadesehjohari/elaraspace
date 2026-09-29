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
  const initial = () => ({version:1, tasks:[], habits:[], goals:[], books:[], words:[], taskLists:[], folders:[], tags:[], focusSessions:[], activeFocus:null, taskCompletionHistory:[], missionRewardClaims:[], xp:0, theme:'dark'});
  const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime());
  const uniqueNames = values => Array.isArray(values) ? [...new Set(values.map(v => asText(v,60)).filter(Boolean))].slice(0,250) : [];
  const normalize = raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('ساختار فایل پشتیبان معتبر نیست.');
    const data = initial();
    data.theme = raw.theme === 'light' ? 'light' : 'dark';
    data.xp = Number.isFinite(Number(raw.xp)) ? Math.max(0,Math.min(9999999,Math.floor(Number(raw.xp)))) : 0;
    data.taskLists = uniqueNames(raw.taskLists);
    data.folders = uniqueNames(raw.folders);
    data.tags = uniqueNames(raw.tags);
    for (const key of ['tasks','habits','goals','books','words']) {
      if (raw[key] != null && !Array.isArray(raw[key])) throw new Error(`فهرست ${key} معتبر نیست.`);
    }
    const ids = new Set();
    const safeId = value => { const id = asText(value,100); if (!id || ids.has(id)) { const newId = makeId(); ids.add(newId); return newId; } ids.add(id); return id; };
    const safeDates = value => [...new Set((Array.isArray(value)?value:[]).filter(validDate))].slice(-10000);
    const safeRule = (rule,fallback='') => window.ElaraSchedule.normalize(rule,fallback);
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
        if(v.list!=null)out[date].list=asText(v.list,60);
        if(v.folder!=null)out[date].folder=asText(v.folder,60);
        if(v.tag!=null)out[date].tag=asText(v.tag,60);
      }
      return out;
    };
    data.tasks = (raw.tasks || []).slice(0,10000).filter(t => t && typeof t === 'object').map(t => ({id:safeId(t.id),text:asText(t.text ?? t.title),shortDescription:asText(t.shortDescription,280),description:asText(t.description,4000),date:validDate(t.date) ? t.date : '',time:/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time ?? '') ? t.time : '',priority:['1','2','3','4'].includes(String(t.priority)) ? String(t.priority) : '4',list:asText(t.list,60),folder:asText(t.folder,60),tag:asText(t.tag,60),completed:!!t.completed,doneAt:validDate(t.doneAt) ? t.doneAt : null,xpAwarded:!!(t.xpAwarded || t.completed),createdAt:Number(t.createdAt) || Date.now(),recurrenceRule:safeRule(t.recurrenceRule,t.date),occurrenceDone:safeDates(t.occurrenceDone),occurrenceRewardDays:safeDates(t.occurrenceRewardDays),skippedDates:safeDates(t.skippedDates),occurrenceOverrides:safeOverrides(t.occurrenceOverrides)})).filter(t => t.text);
    const completionMap=new Map();
    for(const h of (Array.isArray(raw.taskCompletionHistory)?raw.taskCompletionHistory:[]).slice(-20000)){
      if(!h||typeof h!=='object'||!validDate(h.date))continue;
      const taskId=asText(h.taskId,100),key=asText(h.key,240)||(taskId?taskId+':'+h.date:'');
      if(!key)continue;
      completionMap.set(key,{key,taskId,date:h.date,title:asText(h.title,180),completedAt:Number(h.completedAt)||0});
    }
    for(const task of data.tasks){
      if(task.recurrenceRule){
        for(const date of task.occurrenceDone){const key=task.id+':'+date;if(!completionMap.has(key))completionMap.set(key,{key,taskId:task.id,date,title:task.text,completedAt:0})}
      }else if(task.completed&&validDate(task.doneAt)){
        const key=task.id+':'+task.doneAt;if(!completionMap.has(key))completionMap.set(key,{key,taskId:task.id,date:task.doneAt,title:task.text,completedAt:0});
      }
    }
    data.taskCompletionHistory=[...completionMap.values()].slice(-20000);
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
  const taskCompletionKey=(taskId,date)=>String(taskId||'')+':'+String(date||'');
  function canonicalTaskCompletionHistory(){
    const map=new Map();
    for(const entry of Array.isArray(state.taskCompletionHistory)?state.taskCompletionHistory:[]){
      if(!entry||!validDate(entry.date))continue;
      const taskId=asText(entry.taskId,100),key=asText(entry.key,240)||(taskId?taskCompletionKey(taskId,entry.date):'');
      if(key)map.set(key,{key,taskId,date:entry.date,title:asText(entry.title,180),completedAt:Number(entry.completedAt)||0});
    }
    state.taskCompletionHistory=[...map.values()].slice(-20000);
    return state.taskCompletionHistory;
  }
  function recordTaskCompletion(task,date){
    const list=canonicalTaskCompletionHistory(),key=taskCompletionKey(task.id,date);
    if(!list.some(entry=>entry.key===key))list.push({key,taskId:task.id,date,title:task.text||'',completedAt:Date.now()});
  }
  function removeTaskCompletion(task,date){
    const key=taskCompletionKey(task.id,date);
    state.taskCompletionHistory=canonicalTaskCompletionHistory().filter(entry=>entry.key!==key);
  }
  const baseTaskDone=(task,date=today())=>task.recurrenceRule?Array.isArray(task.occurrenceDone)&&task.occurrenceDone.includes(date):!!task.completed;
  function syncSelectors() {
    const fields = [['task-folder',state.folders,'بدون پوشه'],['task-tag',state.tags,'بدون برچسب'],['task-folder-filter',state.folders,'همهٔ پوشه‌ها'],['task-tag-filter',state.tags,'همهٔ برچسب‌ها']];
    for (const [id,names,placeholder] of fields) { const el = $(id),prev = el.value; el.innerHTML = optionHTML(names,placeholder); if (names.includes(prev)) el.value = prev; }
  }
  function renderTasks() {
    const search = $('task-search').value.trim().toLocaleLowerCase();
    const filter = $('task-filter').value,folder = $('task-folder-filter').value,tag = $('task-tag-filter').value;
    const visible = state.tasks.filter(t => (!search || [t.text,t.tag,t.folder].some(x => x.toLocaleLowerCase().includes(search))) && (!folder || t.folder === folder) && (!tag || t.tag === tag) && (filter === 'all' || filter === 'active' && !t.completed || filter === 'completed' && t.completed || filter === 'today' && t.date === today() || filter === 'overdue' && !t.completed && t.date && t.date < today())).sort(taskSort);
    $('task-list').innerHTML = visible.map(t => `<li class="item priority-${t.priority} ${t.completed ? 'done':''}"><button class="check-button" type="button" data-action="toggle-task" data-id="${esc(t.id)}" aria-label="${t.completed?'بازگرداندن':'تکمیل'} ${esc(t.text)}" aria-pressed="${t.completed}">${t.completed?'<img class="elara-check-art" src="assets/ui/icon-tasks-check-alpha.webp" alt="" decoding="async">':''}</button><div class="item-content"><div class="item-title">${esc(t.text)}</div><div class="item-meta"><span>P${t.priority}</span>${t.date ? `<span class="${!t.completed && t.date < today()?'overdue':''}">زمان: ${esc(labelDate(t.date))}${t.time?' · '+esc(t.time):''}</span>`:''}${t.folder?`<span>پوشه: ${esc(t.folder)}</span>`:''}${t.tag?`<span>#${esc(t.tag)}</span>`:''}</div></div><div class="item-actions"><button class="mini-button" type="button" data-action="edit-task" data-id="${esc(t.id)}" aria-label="ویرایش ${esc(t.text)}">ویرایش</button><button class="mini-button danger" type="button" data-action="delete-task" data-id="${esc(t.id)}" aria-label="حذف ${esc(t.text)}">حذف</button></div></li>`).join('');
    $('task-empty').classList.toggle('hidden',visible.length!==0);
    $('task-visible-count').textContent = fmt(visible.length);
    const day=today(),history=canonicalTaskCompletionHistory(),done=new Set(history.filter(entry=>entry.date===day).map(entry=>entry.key)).size,activeDone=state.tasks.filt