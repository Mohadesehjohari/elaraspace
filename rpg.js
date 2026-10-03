/* Progressive enhancement: daily missions and level preview. No fake social connection. */
(() => {
  'use strict';
  const STORE = 'elara_space_v1';
  const $ = id => document.getElementById(id);
  const fa = value => Number(value).toLocaleString('fa-IR');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const parse = () => { try { const result = JSON.parse(localStorage.getItem(STORE) || '{}'); return result && typeof result === 'object' ? result : {}; } catch { return {}; } };
  const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
  const streakCount=data=>{
    const dates=new Set(),day=today();
    for(const row of Array.isArray(data.taskCompletionHistory)?data.taskCompletionHistory:[])if(row?.date)dates.add(row.date);
    for(const h of Array.isArray(data.habits)?data.habits:[])for(const d of Array.isArray(h?.days)?h.days:[])dates.add(d);
    const cursor=new Date(day+'T12:00:00');if(!dates.has(day))cursor.setDate(cursor.getDate()-1);let n=0;
    while(n<3650){const k=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;if(!dates.has(k))break;n++;cursor.setDate(cursor.getDate()-1)}
    return n;
  };
  const counts = data => {
    const linkedIds=new Set((data.tasks||[]).filter(t=>t.linkedTask).map(t=>t.id));
    const tasks = (Array.isArray(data.tasks) ? data.tasks : []).filter(t=>!t.linkedTask);
    const habits = Array.isArray(data.habits) ? data.habits : [];
    const goals = Array.isArray(data.goals) ? data.goals : [];
    const books = Array.isArray(data.books) ? data.books : [];
    const day = today();
    const history=(Array.isArray(data.taskCompletionHistory)?data.taskCompletionHistory:[]).filter(x=>!linkedIds.has(x.taskId)),historyToday=new Set(history.filter(x=>x?.date===day).map(x=>x.key||String(x.taskId||'')+':'+day));
    const fallbackToday=tasks.filter(t => t?.recurrenceRule ? Array.isArray(t.occurrenceDone) && t.occurrenceDone.includes(day) : t?.completed && t.doneAt === day).length;
    const readingPages=books.reduce((n,b)=>n+(Array.isArray(b?.readingLogs)?b.readingLogs.filter(x=>x?.date===day).reduce((m,x)=>m+Math.max(0,Number(x.pagesRead)||0),0):0),0);
    const focusMinutes=(Array.isArray(data.focusSessions)?data.focusSessions:[]).filter(x=>x?.completed!==false&&new Date(Number(x.endedAt||x.startedAt||0)).toISOString().slice(0,10)===day).reduce((n,x)=>n+Math.max(0,Number(x.durationMin)||0),0);
    let workoutMinutes=0;const me=uid();if(me)try{const w=JSON.parse(localStorage.getItem('elara_private_wellness_v1_'+me)||'{}');workoutMinutes=(Array.isArray(w.workouts)?w.workouts:[]).filter(x=>x?.date===day).reduce((n,x)=>n+Math.max(0,Number(x.minutes)||0),0)}catch{}
    return {
      tasks: historyToday.size||fallbackToday,
      habits: habits.filter(h => Array.isArray(h?.days) && h.days.includes(day)).length,
      steps: goals.reduce((n,g) => n + (Array.isArray(g?.steps) ? g.steps.filter(s => s?.done).length : 0), 0),
      books: books.filter(b => b?.shelf === 'finished').length,
      readingPages,focusMinutes,workoutMinutes,streak:streakCount(data),
      totalDone: history.length||tasks.reduce((n,t) => n + (t?.recurrenceRule ? (Array.isArray(t.occurrenceDone)?t.occurrenceDone.length:0) : (t?.completed?1:0)), 0),
      words: Array.isArray(data.words) ? data.words.length : 0
    };
  };
  const missions = [
    {key:'first-task', name:'اولین قدم امروز ⚡', detail:'فقط یک تسک واقعی رو ببند؛ موتور روز روشن می‌شه.', value:c=>c.tasks, target:1, rewardXp:20, daily:true},
    {key:'three-tasks', name:'سه ضربهٔ تمیز 👊', detail:'امروز سه تسک رو جمع کن.', value:c=>c.tasks, target:3, rewardXp:35, daily:true},
    {key:'habit', name:'عادتت رو زنده نگه دار 🔥', detail:'حداقل یک عادت امروز رو تیک بزن.', value:c=>c.habits, target:1, rewardXp:25, daily:true},
    {key:'read-20', name:'۲۰ صفحه، بی‌حواس‌پرتی 📚', detail:'امروز جمعاً ۲۰ صفحه مطالعه ثبت کن.', value:c=>c.readingPages, target:20, rewardXp:30, daily:true},
    {key:'focus-25', name:'یک راند تمرکز 😎', detail:'حداقل ۲۵ دقیقه Focus کامل کن.', value:c=>c.focusMinutes, target:25, rewardXp:25, daily:true},
    {key:'move-20', name:'بدن هم تیم توئه 💥', detail:'امروز ۲۰ دقیقه تمرین ثبت کن.', value:c=>c.workoutMinutes, target:20, rewardXp:25, daily:true},
    {key:'language-10', name:'واژه‌هات دارن جمع می‌شن 🧠', detail:'۱۰ واژهٔ واقعی داخل جعبهٔ زبان داشته باش.', value:c=>c.words, target:10, rewardXp:25, daily:false},
    {key:'streak-3', name:'سه روز روی موج 🔥', detail:'استریک واقعی‌ت رو به ۳ روز برسون.', value:c=>c.streak, target:3, rewardXp:35, daily:false},
    {key:'steps', name:'هدف رو خرد کن 🤌', detail:'یک قدم واقعی از هدف‌هات رو کامل کن.', value:c=>c.steps, target:1, rewardXp:30, daily:false},
    {key:'book', name:'یک جهان رو بستی 😍📖', detail:'یک کتاب رو واقعاً به قفسهٔ خوانده‌شده ببر.', value:c=>c.books, target:1, rewardXp:40, daily:false}
  ];
  const snapshot = () => {
    const data=parse(),c=counts(data),claims=Array.isArray(data.missionRewardClaims)?data.missionRewardClaims:[],day=today();
    return missions.map(m => {
      const amount=m.value(c),key=m.daily?`${day}:${m.key}`:m.key;
      return {key:m.key,name:m.name,detail:m.detail,amount,target:m.target,completed:amount>=m.target,rewardXp:m.rewardXp,daily:m.daily,claimed:claims.includes(key)};
    });
  };
  const claimKey=(m,day=today())=>m.daily?`${day}:${m.key}`:m.key;
  function awardCompletedMissions(){
    const data=parse(),c=counts(data),claims=Array.isArray(data.missionRewardClaims)?data.missionRewardClaims:[],day=today();
    let changed=false,total=0;const newly=[];
    for(const m of missions){
      const done=m.value(c)>=m.target,key=claimKey(m,day);
      if(done&&!claims.includes(key)){claims.push(key);data.xp=Math.max(0,Number(data.xp)||0)+m.rewardXp;changed=true;total+=m.rewardXp;newly.push({key,name:m.name,rewardXp:m.rewardXp,daily:!!m.daily});window.ElaraNotify?.push?.({type:'mission',title:window.ElaraI18n?.t?.('ماموریت کامل شد 🔥','Mission complete 🔥')||'ماموریت کامل شد 🔥',message:(window.ElaraI18n?.locale?.()==='en'?'Nice! ':'دمت گرم! ')+m.name+' · +'+m.rewardXp+' XP',dedupeKey:'mission:'+key})}
    }
    if(!changed)return 0;
    data.missionRewardClaims=claims.slice(-5000);
    localStorage.setItem(STORE,JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:data}));
    window.dispatchEvent(new Event('elara:data-changed'));
    for(const mission of newly)window.dispatchEvent(new CustomEvent('elara:mission-claimed',{detail:mission}));
    return total;
  }
  const levelFromXp = xp => window.ElaraLevels?.level?.(xp)||Math.max(1,1+Math.floor(Math.max(0,xp)/70));
  const threshold = level => window.ElaraLevels?.threshold?.(level)||Math.max(0,(level-1)*70);
  function setup(){
    if ($('panel-missions')) return;
    const section = document.createElement('section');
    section.id = 'panel-missions'; section.className = 'panel hidden'; section.setAttribute('aria-labelledby','rpg-heading');
    section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">LIFE RPG / YOUR QUESTS</p><h1 id="rpg-heading">ماموریت‌ها و سطح من</h1><p class="muted">با انجام کارهای واقعی در برنامه، پیشرفت مأموریت‌هات ثبت می‌شه.</p></div></div><div class="surface rpg-level"><div><span class="eyebrow">LEVEL PROGRESS</span><h2 id="rpg-level">سطح ۱</h2><p id="rpg-xp" class="muted"></p></div><div class="rpg-track"><span id="rpg-level-bar"></span></div></div><h2>ماموریت‌های امروز و مسیر پیشرفت</h2><div class="rpg-grid" id="rpg-quest-list" aria-live="polite"></div><div class="surface rpg-info"><strong>نشان‌های مسیر تو</strong><div id="rpg-badges" class="rpg-badges"></div><p class="muted">هر مأموریت جایزهٔ XP مشخص دارد؛ Claim هر مأموریت با کلید مستقل ذخیره می‌شود تا با Refresh دوباره جایزه ندهد.</p></div>`;
    const main = $('main'); if (!main) return;
    main.insertBefore(section, $('panel-settings'));
    // The original app writes localStorage on every change. Observe UI actions after its handlers run.
    document.addEventListener('click', () => queueMicrotask(render));
    document.addEventListener('submit', () => setTimeout(render,0));
    window.addEventListener('storage', event => { if(event.key===STORE)render(); });
    window.addEventListener('elara:hydrate', () => setTimeout(render,0));
    render();
  }
  function render(){
    if (!$('panel-missions')) return;
    awardCompletedMissions();
    const data=parse(), c=counts(data);
    const xp = Number.isFinite(+data.xp) ? Math.max(0,+data.xp) : 0;
    const level=levelFromXp(xp), min=threshold(level), max=threshold(level+1),rank=window.ElaraLevels?.rankForLevel?.(level),title=window.ElaraLevels?.titleForLevel?.(level);
    $('rpg-level').textContent=`سطح ${fa(level)} · ${title||'مسیر کیهانی'}`;
    $('rpg-xp').textContent=`${fa(xp-min)} از ${fa(max-min)} XP تا سطح بعدی${rank?.label?' · رنک '+rank.label:''}`;
    $('rpg-level-bar').style.width=`${Math.max(0,Math.min(100, (xp-min)/(max-min)*100))}%`;
    const list=$('rpg-quest-list'); list.replaceChildren();
    missions.forEach(m => {
      const amount=m.value(c), completed=amount>=m.target;
      const el=document.createElement('article');el.className='surface rpg-quest'+(completed?' rpg-complete':'');
      const heading=document.createElement('strong');heading.textContent=(completed?'✓ ':'○ ')+m.name;
      const detail=document.createElement('p');detail.className='muted';detail.textContent=m.detail;
      const claims=Array.isArray(data.missionRewardClaims)?data.missionRewardClaims:[],claimed=claims.includes(claimKey(m));const reward=document.createElement('span');reward.className='mission-reward';reward.textContent=claimed?`✓ جایزه دریافت شد: +${fa(m.rewardXp)} XP`:`جایزه: +${fa(m.rewardXp)} XP`;const count=document.createElement('span');count.textContent=`${fa(Math.min(amount,m.target))} / ${fa(m.target)} ${completed?'· انجام شد':''}`;
      const bar=document.createElement('div');bar.className='rpg-track';const fill=document.createElement('span');fill.style.width=`${Math.min(100, amount/m.target*100)}%`;bar.append(fill);
      el.append(heading,detail,reward,count,bar);list.append(el);
    });
    const badges=$('rpg-badges'); badges.replaceChildren();
    const medals=window.ElaraLevels?.medals?.(c,xp)||[];medals.forEach(m=>{const badge=document.createElement('span');badge.className='chip'+(m.earned?' rpg-earned':'');badge.textContent=(m.earned?'✓ ':'○ ')+m.label;badges.append(badge)});
    let registry=document.getElementById('rpg-progression-registry');if(!registry){registry=document.createElement('details');registry.id='rpg-progression-registry';registry.className='rpg-registry';registry.innerHTML='<summary>فهرست رنک‌ها و لقب‌های مسیر</summary><div data-rpg-registry-body></div>';badges.parentElement?.append(registry)}
    const body=registry.querySelector('[data-rpg-registry-body]'),levels=window.ElaraLevels,rankRows=Array.isArray(levels?.RANKS)?levels.RANKS:[],titleRows=Array.isArray(levels?.TITLES)?levels.TITLES:[];if(body){body.innerHTML=rankRows.length&&titleRows.length?'<h4>رنک‌های پیشرفت</h4><div class="rpg-registry-chips">'+rankRows.map(x=>'<span class="chip '+(level>=x.min?'rpg-earned':'')+'">'+x.fa+' · '+(x.max===Infinity?x.min+'+':x.min+'–'+x.max)+'</span>').join('')+'</div><h4>لقب‌ها</h4><div class="rpg-registry-chips">'+titleRows.map(x=>'<span class="chip '+(level>=x.min?'rpg-earned':'')+'">'+x.fa+' · '+(x.max===Infinity?x.min+'+':x.min===x.max?x.min:x.min+'–'+x.max)+'</span>').join('')+'</div>':'<p class="muted">فهرست کامل پیشرفت بعد از بارگذاری Registry نمایش داده می‌شود.</p>'}

  }
  window.ElaraMissions={render,snapshot};
  const css = document.createElement('style');
  css.textContent = `
  /* Keep the approved palette and mobile layout; make desktop use its available width. */
  @media(min-width:701px){.shell{width:100%;max-width:none}.workspace{width:100%;min-width:0}main{max-width:1600px;width:100%;margin:0 auto}.sidebar{min-width:0}}
  @media(min-width:1200px){main{padding:clamp(25px,3vw,56px)}.form-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
  @media(min-width:701px) and (max-width:920px){.shell{grid-template-columns:170px minmax(0,1fr)}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:22px}.topbar{padding-inline:18px}}
  @media(max-width:700px){.rpg-grid{grid-template-columns:1fr}.rpg-level{padding:16px}.rpg-quest{padding:15px}}
  @media(min-width:701px){.rpg-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .rpg-grid{display:grid;gap:12px;margin:14px 0 24px}.rpg-level,.rpg-info{padding:22px;margin-bottom:20px}.rpg-level h2{font-size:1.7rem;color:var(--accent);margin:4px 0}.rpg-quest{padding:18px}.rpg-quest strong{display:block;margin-bottom:5px}.rpg-quest p{margin:0 0 9px}.rpg-quest>span{display:block;font-size:.75rem;color:var(--muted);margin-bottom:9px}.rpg-complete{border-color:color-mix(in srgb,#42b993 60%,var(--border))}.rpg-track{height:6px;background:var(--surface2);overflow:hidden;border-radius:12px}.rpg-track>span{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:inherit}.rpg-badges{display:flex;gap:7px;flex-wrap:wrap;margin:15px 0}.rpg-earned{color:var(--accent);border:1px solid var(--accent)}.rpg-registry{margin-top:14px;border-top:1px solid var(--border);padding-top:12px}.rpg-registry summary{cursor:pointer;font-weight:800}.rpg-registry h4{margin:14px 0 8px}.rpg-registry-chips{display:flex;gap:7px;flex-wrap:wrap}.rpg-registry-chips .chip{font-size:.72rem}
  `;
  document.head.append(css);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();