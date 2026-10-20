/* Elara Cosmic Journey: read-only rendering, canonical goal actions are delegated to app.js. */
(() => {
  'use strict';
  const panel = document.getElementById('panel-goals');
  const goalList = document.getElementById('goal-list');
  if (!panel || !goalList || document.getElementById('elara-cosmic-map')) return;
  const format = new Intl.NumberFormat('fa-IR');
  const overlay = document.createElement('section');
  overlay.id = 'elara-cosmic-map';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'نقشه فضایی مسیر اهداف');
  overlay.innerHTML = '<div class="cosmic-field"><div class="cosmic-nebula"></div></div><header class="cosmic-top"><div class="cosmic-heading"><small>ELARA • YOUR UNIVERSE</small><h2>کهکشان مسیر من ✨</h2><p>هر ستاره، یک قدم به رؤیاهات نزدیک‌تر</p></div><div class="cosmic-controls"><button type="button" class="cosmic-control" data-cosmic-action="zoom-out" aria-label="کوچک‌نمایی">−</button><button type="button" class="cosmic-control" data-cosmic-action="zoom-in" aria-label="بزرگ‌نمایی">＋</button><button type="button" class="cosmic-control" data-cosmic-action="back">✕ بستن</button></div></header><div class="cosmic-viewport" tabindex="0" aria-label="نقشه قابل پیمایش ستاره‌ها"><div class="cosmic-universe"><svg class="cosmic-route-svg" preserveAspectRatio="none" aria-hidden="true"></svg><div class="cosmic-stars"></div></div></div><div class="cosmic-empty" hidden>هنوز ستاره‌ای در کهکشانت نیست. از «هدف‌های من» یک هدف بساز و قدم‌هایش را اضافه کن.<br><button class="cosmic-control" data-cosmic-action="back">بازگشت به هدف‌ها</button></div><footer class="cosmic-footer"><div class="cosmic-legend"><span><i class="mint"></i>انجام‌شده</span><span><i class="gold"></i>اینجای مسیر هستی</span><span><i></i>پیش رو</span></div><span data-cosmic-progress></span></footer><aside class="cosmic-detail" hidden aria-label="جزئیات ستاره"><button type="button" data-cosmic-action="close-detail">← بازگشت به کهکشان</button><h3 data-cosmic-title></h3><p data-cosmic-description></p><div data-cosmic-steps></div><div class="cosmic-action-row" data-cosmic-actions></div></aside>';
  document.body.append(overlay);
  const viewport = overlay.querySelector('.cosmic-viewport');
  const universe = overlay.querySelector('.cosmic-universe');
  const svg = overlay.querySelector('.cosmic-route-svg');
  const stars = overlay.querySelector('.cosmic-stars');
  const detail = overlay.querySelector('.cosmic-detail');
  let zoom = 1;
  let selected = null;
  let hydrated = null;
  const escaped = value => String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const isoToday = () => { const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  function getGoals() {
    try {const data=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');if(Array.isArray(data.goals))return data.goals;}
    catch (_) {}
    return Array.isArray(hydrated?.goals)?hydrated.goals:[];
  }
  function isDone(step) {
    if (step.recurrenceRule) return Array.isArray(step.occurrenceDone)&&step.occurrenceDone.includes(isoToday());
    const target=Math.max(1,Number(step.dailyTarget)||1);
    return !!step.done || (target>1 && Number(step.dailyProgress?.[isoToday()]||0)>=target);
  }
  function model() {
    const goals=[...getGoals()].sort((a,b)=>(a.manualOrder??Number.MAX_SAFE_INTEGER)-(b.manualOrder??Number.MAX_SAFE_INTEGER));
    const result=goals.map(g=>({goal:g, steps:Array.isArray(g.steps)?g.steps:[]}));
    let found=false;
    result.forEach(item=>{
      item.done=item.steps.length>0&&item.steps.every(isDone);
      item.current=!found&&!item.done;
      if(item.current)found=true;
    });
    return result;
  }
  function emitCanonical(goalId,action,stepId) {
    const row=Array.from(goalList.querySelectorAll('.goal-item')).find(node=>node.dataset.entityId===String(goalId));
    const original=Array.from(row?.querySelectorAll('[data-action]')||[]).find(btn=>btn.dataset.action===action&&(!stepId||btn.dataset.id===String(stepId)));
    if (!original) return false;
    original.click();
    return true;
  }
  function showDetail(goalId) {
    const item=model().find(x=>String(x.goal.id)===String(goalId));
    if(!item){detail.hidden=true;return;}
    selected=String(goalId);
    const g=item.goal;
    detail.querySelector('[data-cosmic-title]').textContent=g.title||'ستاره بدون نام';
    detail.querySelector('[data-cosmic-description]').textContent=g.description||'ریزقدم‌های این ستاره مسیر رسیدن به هدف را روشن می‌کنند.';
    const steps=detail.querySelector('[data-cosmic-steps]');
    steps.innerHTML='<h4>قدم‌های این ستاره</h4>'+(item.steps.length?item.steps.map((step,i)=>'<div class="cosmic-step '+(isDone(step)?'is-done':'')+'"><span>'+format.format(i+1)+'. '+escaped(step.text)+'</span><button type="button" data-cosmic-action="toggle-step" data-goal="'+escaped(g.id)+'" data-step="'+escaped(step.id)+'" aria-label="تغییر وضعیت قدم">'+(isDone(step)?'✓':'○')+'</button><button type="button" data-cosmic-action="edit-step" data-goal="'+escaped(g.id)+'" data-step="'+escaped(step.id)+'">✎</button></div>').join(''):'<p>هنوز قدمی ثبت نشده.</p>');
    detail.querySelector('[data-cosmic-actions]').innerHTML='<button type="button" data-cosmic-action="add-step" data-goal="'+escaped(g.id)+'">＋ افزودن قدم</button><button type="button" data-cosmic-action="edit-goal" data-goal="'+escaped(g.id)+'">✎ ویرایش هدف</button>';
    detail.hidden=false;
  }
  function render() {
    if(!overlay.classList.contains('is-open'))return;
    const items=model();
    const total=items.reduce((n,x)=>n+x.steps.length,0);
    const done=items.reduce((n,x)=>n+x.steps.filter(isDone).length,0);
    overlay.querySelector('[data-cosmic-progress]').textContent=format.format(done)+' از '+format.format(total)+' قدم طی‌شده';
    overlay.querySelector('.cosmic-empty').hidden=items.length>0;
    const w=Math.max(900,viewport.clientWidth,items.length*185+240);
    const h=Math.max(570,viewport.clientHeight,Math.ceil(items.length/5)*330+230);
    universe.style.width=w+'px';universe.style.height=h+'px';
    universe.style.transform='scale('+zoom+')';
    const positions=items.map((_,i)=>{const col=i%5,row=Math.floor(i/5);return {x:120+col*(w-240)/4,y:105+row*330+(col%2?125:0)};});
    stars.innerHTML=items.map((item,i)=>{const p=positions[i],state=item.done?'done':item.current?'current':'next',stepsDone=item.steps.filter(isDone).length;return '<button type="button" class="cosmic-orb" data-cosmic-goal="'+escaped(item.goal.id)+'" data-state="'+state+'" style="left:'+p.x+'px;top:'+p.y+'px" aria-label="'+escaped(item.goal.title)+'، '+format.format(stepsDone)+' از '+format.format(item.steps.length)+' قدم"><span class="cosmic-orb-core" aria-hidden="true"></span><span class="cosmic-orb-title">'+escaped(item.goal.title||'هدف جدید')+'</span><span class="cosmic-orb-meta">'+(item.current?'✦ اینجای مسیر هستی':item.done?'✓ طی‌شده':format.format(stepsDone)+' / '+format.format(item.steps.length)+' قدم')+'</span></button>';}).join('');
    svg.setAttribute('viewBox','0 0 '+w+' '+h);
    svg.innerHTML=positions.slice(1).map((p,i)=>{const a=positions[i],mid=(a.x+p.x)/2;return '<path d="M '+a.x+' '+a.y+' C '+mid+' '+(a.y-90)+' '+mid+' '+(p.y+90)+' '+p.x+' '+p.y+'"/>';}).join('');
    if(selected&&!detail.hidden)showDetail(selected);
  }
  function open(){overlay.classList.add('is-open');document.body.style.overflow='hidden';selected=null;detail.hidden=true;render();viewport.scrollLeft=Math.max(0,(universe.offsetWidth-viewport.clientWidth)/2);viewport.focus({preventScroll:true});}
  function close(){overlay.classList.remove('is-open');detail.hidden=true;selected=null;document.body.style.overflow='';}
  const openButton=document.createElement('button');openButton.type='button';openButton.className='cosmic-control cosmic-dashboard-entry';openButton.textContent='✦ ادامه مسیر';openButton.setAttribute('aria-label','نمایش نقشه فضایی ادامه مسیر');
  const toolbar=panel.querySelector('.goal-dashboard-toolbar')||panel.querySelector('.section-heading');toolbar?.append(openButton);
  openButton.addEventListener('click',open);
  overlay.addEventListener('click',event=>{
    const orb=event.target.closest('[data-cosmic-goal]');
    if(orb){showDetail(orb.dataset.cosmicGoal);return;}
    const b=event.target.closest('[data-cosmic-action]');if(!b)return;
    const action=b.dataset.cosmicAction;
    if(action==='back'){close();return;}
    if(action==='close-detail'){detail.hidden=true;selected=null;return;}
    if(action==='zoom-in'||action==='zoom-out'){zoom=Math.max(.7,Math.min(1.4,zoom+(action==='zoom-in'?.15:-.15)));render();return;}
    if(['edit-goal','add-step','edit-step','toggle-step'].includes(action)){
      if(!emitCanonical(b.dataset.goal,action,b.dataset.step)){close();return;}
      if(action!=='toggle-step'){close();return;}
      requestAnimationFrame(render);
    }
  });
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay.classList.contains('is-open')){if(!detail.hidden){detail.hidden=true;selected=null;}else close();}});
  for(const name of ['elara:hydrate','elara:state-committed','elara:linked-state'])window.addEventListener(name,event=>{if(Array.isArray(event.detail?.goals))hydrated=event.detail;requestAnimationFrame(render);});
  window.addEventListener('elara:data-changed',()=>requestAnimationFrame(render));
  new MutationObserver(()=>{if(overlay.classList.contains('is-open'))requestAnimationFrame(render);}).observe(goalList,{childList:true});
  window.addEventListener('resize',()=>{if(overlay.classList.contains('is-open'))render();});
})();
