/* Progressive enhancement: daily missions and level preview. No fake social connection. */
(() => {
  'use strict';
  const STORE = 'elara_space_v1';
  const $ = id => document.getElementById(id);
  const fa = value => Number(value).toLocaleString('fa-IR');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const parse = () => { try { const result = JSON.parse(localStorage.getItem(STORE) || '{}'); return result && typeof result === 'object' ? result : {}; } catch { return {}; } };
  const counts = data => {
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const habits = Array.isArray(data.habits) ? data.habits : [];
    const goals = Array.isArray(data.goals) ? data.goals : [];
    const books = Array.isArray(data.books) ? data.books : [];
    const day = today();
    const history=Array.isArray(data.taskCompletionHistory)?data.taskCompletionHistory:[],historyToday=new Set(history.filter(x=>x?.date===day).map(x=>x.key||String(x.taskId||'')+':'+day));
    const fallbackToday=tasks.filter(t => t?.recurrenceRule ? Array.isArray(t.occurrenceDone) && t.occurrenceDone.includes(day) : t?.completed && t.doneAt === day).length;
    return {
      tasks: historyToday.size||fallbackToday,
      habits: habits.filter(h => Array.isArray(h?.days) && h.days.includes(day)).length,
      steps: goals.reduce((n,g) => n + (Array.isArray(g?.steps) ? g.steps.filter(s => s?.done).length : 0), 0),
      books: books.filter(b => b?.shelf === 'finished').length,
      totalDone: history.length||tasks.reduce((n,t) => n + (t?.recurrenceRule ? (Array.isArray(t.occurrenceDone)?t.occurrenceDone.length:0) : (t?.completed?1:0)), 0),
      words: Array.isArray(data.words) ? data.words.length : 0
    };
  };
  const missions = [
    {key:'first-task', name:'اولین قدم امروز', detail:'امروز یک تسک انجام بده', value:c=>c.tasks, target:1, rewardXp:20, daily:true},
    {key:'three-tasks', name:'سه قدم تا ستاره', detail:'امروز سه تسک انجام بده', value:c=>c.tasks, target:3, rewardXp:35, daily:true},
    {key:'habit', name:'زنجیرهٔ عادت‌ها', detail:'امروز حداقل یک عادت رو انجام بده', value:c=>c.habits, target:1, rewardXp:25, daily:true},
    {key:'steps', name:'مسیر هدف‌ها', detail:'یک قدم از هدف‌هات رو تکمیل کن', value:c=>c.steps, target:1, rewardXp:30, daily:false},
    {key:'book', name:'یک جهان تازه', detail:'یک کتاب رو به قفسهٔ خوانده‌شده ببر', value:c=>c.books, target:1, rewardXp:40, daily:false}
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
    let changed=false,total=0;
    for(const m of missions){
      const done=m.value(c)>=m.target,key=claimKey(m,day);
      if(done&&!claims.includes(key)){claims.push(key);data.xp=Math.max(0,Number(data.xp)||0)+m.rewardXp;changed=true;total+=m.rewardXp}
    }
    if(!changed)return 0;
    data.missionRewardClaims=claims.slice(-5000);
    localStorage.setItem(STORE,JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:data}));
    window.dispatchEvent(new Event('elara:data-changed'));
    return total;
  }
  const levelFromXp = xp => Math.min(10, 1 + Math.floor(Math.sqrt(Math.max(0,xp)/100)));
  const threshold = level => (level-1)*(level-1)*100;
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
    const level=levelFromXp(xp), min=threshold(level), max=threshold(level+1);
    $('rpg-level').textContent=`سطح ${fa(level)} از ۱۰`;
    $('rpg-xp').textContent=level===10?`${fa(xp)} XP · بالاترین سطح`:`${fa(xp-min)} از ${fa(max-min)} XP تا سطح بعدی`;
    $('rpg-level-bar').style.width=level===10?'100%':`${Math.max(0,Math.min(100, (xp-min)/(max-min)*100))}%`;
    data.missionClaims=Array.isArray(data.missionClaims)?data.missionClaims:[];
    let rewarded=false;
    for(const m of missions){const amount=m.value(c),claim=today()+':'+m.key;if(amount>=m.target&&!data.missionClaims.includes(claim)){data.missionClaims.push(claim);data.xp=Math.max(0,Number(data.xp)||0)+m.rewardXp;rewarded=true}}
    if(rewarded){localStorage.setItem(STORE,JSON.stringify(data));window.dispatchEvent(new Event('elara:data-changed'));setTimeout(()=>window.ElaraMissions?.render(),0);return}
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
    [[c.totalDone>=1,'اولین تسک'],[c.totalDone>=10,'ده تسک'],[c.words>=10,'ده لغت'],[level>=5,'سطح پنجم'],[level>=10,'سطح دهم']].forEach(([earned,title])=>{
      const badge=document.createElement('span');badge.className='chip'+(earned?' rpg-earned':'');badge.textContent=(earned?'✓ ':'○ ')+title;badges.append(badge);
    });
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
  .rpg-grid{display:grid;gap:12px;margin:14px 0 24px}.rpg-level,.rpg-info{padding:22px;margin-bottom:20px}.rpg-level h2{font-size:1.7rem;color:var(--accent);margin:4px 0}.rpg-quest{padding:18px}.rpg-quest strong{display:block;margin-bottom:5px}.rpg-quest p{margin:0 0 9px}.rpg-quest>span{display:block;font-size:.75rem;color:var(--muted);margin-bottom:9px}.rpg-complete{border-color:color-mix(in srgb,#42b993 60%,var(--border))}.rpg-track{height:6px;background:var(--surface2);overflow:hidden;border-radius:12px}.rpg-track>span{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:inherit}.rpg-badges{display:flex;gap:7px;flex-wrap:wrap;margin:15px 0}.rpg-earned{color:var(--accent);border:1px solid var(--accent)}
  `;
  document.head.append(css);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();