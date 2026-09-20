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
    return {
      tasks: tasks.filter(t => t?.completed && t.doneAt === day).length,
      habits: habits.filter(h => Array.isArray(h?.days) && h.days.includes(day)).length,
      steps: goals.reduce((n,g) => n + (Array.isArray(g?.steps) ? g.steps.filter(s => s?.done).length : 0), 0),
      books: books.filter(b => b?.shelf === 'finished').length,
      totalDone: tasks.filter(t => t?.completed).length,
      words: Array.isArray(data.words) ? data.words.length : 0
    };
  };
  const missions = [
    {key:'first-task', name:'اولین قدم امروز', detail:'امروز یک تسک انجام بده', value:c=>c.tasks, target:1},
    {key:'three-tasks', name:'سه قدم تا ستاره', detail:'امروز سه تسک انجام بده', value:c=>c.tasks, target:3},
    {key:'habit', name:'زنجیرهٔ عادت‌ها', detail:'امروز حداقل یک عادت رو انجام بده', value:c=>c.habits, target:1},
    {key:'steps', name:'مسیر هدف‌ها', detail:'یک قدم از هدف‌هات رو تکمیل کن', value:c=>c.steps, target:1},
    {key:'book', name:'یک جهان تازه', detail:'یک کتاب رو به قفسهٔ خوانده‌شده ببر', value:c=>c.books, target:1}
  ];
  const levelFromXp = xp => Math.min(10, 1 + Math.floor(Math.sqrt(Math.max(0,xp)/100)));
  const threshold = level => (level-1)*(level-1)*100;
  function setup(){
    if ($('rpg-missions')) return;
    const section = document.createElement('section');
    section.id = 'rpg-missions'; section.className = 'panel hidden'; section.setAttribute('aria-labelledby','rpg-heading');
    section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">LIFE RPG / YOUR QUESTS</p><h1 id="rpg-heading">ماموریت‌ها و سطح من ✦</h1><p class="muted">با انجام کارهای واقعی در برنامه، پیشرفت مأموریت‌هات ثبت می‌شه.</p></div></div><div class="surface rpg-level"><div><span class="eyebrow">LEVEL PROGRESS</span><h2 id="rpg-level">سطح ۱</h2><p id="rpg-xp" class="muted"></p></div><div class="rpg-track"><span id="rpg-level-bar"></span></div></div><h2>ماموریت‌های امروز و مسیر پیشرفت</h2><div class="rpg-grid" id="rpg-quest-list" aria-live="polite"></div><div class="surface rpg-info"><strong>نشان‌های مسیر تو</strong><div id="rpg-badges" class="rpg-badges"></div><p class="muted">امتیازها از کارهای اصلی برنامه به دست میان؛ این صفحه صرفاً پیشرفت رو نشون می‌ده و امتیاز اضافی یا رتبه‌بندی ساختگی ایجاد نمی‌کنه.</p></div>`;
    const main = $('main'); if (!main) return;
    main.insertBefore(section, $('panel-settings'));
    const makeNav = (label, klass) => { const b = document.createElement('button'); b.type='button'; b.dataset.tab='missions'; b.className=klass; b.textContent=label; return b; };
    const sidebar = document.querySelector('.navigation');
    if (sidebar) sidebar.insertBefore(makeNav('✦ مأموریت‌ها','nav-item'), sidebar.querySelector('[data-tab="settings"]'));
    const mobileMore = $('panel-settings')?.querySelector('.settings-card .timer-actions');
    if (mobileMore) mobileMore.append(makeNav('✦ مأموریت‌ها','quiet-button'));
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-tab="missions"]');
      if (!button) return;
      document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
      section.classList.remove('hidden');
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active',b.dataset.tab==='missions'));
      $('page-title').textContent='ماموریت‌ها و لول';
      render();
      window.scrollTo({top:0,behavior:'instant'});
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-tab]:not([data-tab="missions"])')) return;
      section.classList.add('hidden');
    });
    // The original app writes localStorage on every change. Observe UI actions after its handlers run.
    document.addEventListener('click', () => queueMicrotask(render));
    document.addEventListener('submit', () => setTimeout(render,0));
    window.addEventListener('storage', event => { if(event.key===STORE)render(); });
    window.addEventListener('elara:hydrate', () => setTimeout(render,0));
    render();
  }
  function render(){
    if (!$('rpg-missions')) return;
    const data=parse(), c=counts(data);
    const xp = Number.isFinite(+data.xp) ? Math.max(0,+data.xp) : 0;
    const level=levelFromXp(xp), min=threshold(level), max=threshold(level+1);
    $('rpg-level').textContent=`سطح ${fa(level)} از ۱۰`;
    $('rpg-xp').textContent=level===10?`${fa(xp)} XP · بالاترین سطح`:`${fa(xp-min)} از ${fa(max-min)} XP تا سطح بعدی`;
    $('rpg-level-bar').style.width=level===10?'100%':`${Math.max(0,Math.min(100, (xp-min)/(max-min)*100))}%`;
    const list=$('rpg-quest-list'); list.replaceChildren();
    missions.forEach(m => {
      const amount=m.value(c), completed=amount>=m.target;
      const el=document.createElement('article');el.className='surface rpg-quest'+(completed?' rpg-complete':'');
      const heading=document.createElement('strong');heading.textContent=(completed?'✓ ':'◇ ')+m.name;
      const detail=document.createElement('p');detail.className='muted';detail.textContent=m.detail;
      const count=document.createElement('span');count.textContent=`${fa(Math.min(amount,m.target))} / ${fa(m.target)} ${completed?'· انجام شد':''}`;
      const bar=document.createElement('div');bar.className='rpg-track';const fill=document.createElement('span');fill.style.width=`${Math.min(100, amount/m.target*100)}%`;bar.append(fill);
      el.append(heading,detail,count,bar);list.append(el);
    });
    const badges=$('rpg-badges'); badges.replaceChildren();
    [[c.totalDone>=1,'☑ اولین تسک'],[c.totalDone>=10,'✦ ده تسک'],[c.words>=10,'◇ ده لغت'],[level>=5,'✧ سطح پنجم'],[level>=10,'★ سطح دهم']].forEach(([earned,title])=>{
      const badge=document.createElement('span');badge.className='chip'+(earned?' rpg-earned':'');badge.textContent=(earned?'✦ ':'○ ')+title;badges.append(badge);
    });
  }
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