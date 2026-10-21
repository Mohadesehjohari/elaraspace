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
  overlay.innerHTML = '<div class="cosmic-field"><div class="cosmic-nebula"></div></div><header class="cosmic-top"><div class="cosmic-heading"><small>ELARA • YOUR UNIVERSE</small><h2>کهکشان مسیر من ✨</h2><p>هر ستاره، یک قدم به رؤیاهات نزدیک‌تر</p></div><div class="cosmic-controls"><button type="button" class="cosmic-control cosmic-build-button" data-cosmic-action="build-route">✨ ساخت مسیر</button><button type="button" class="cosmic-control" data-cosmic-action="sound-toggle" aria-pressed="true">🔊 صدا</button><label class="cosmic-volume-label">بلندی صدا <input type="range" data-cosmic-volume min="0" max="100" step="1" value="18" aria-label="بلندی صدای کهکشان"></label><button type="button" class="cosmic-control" data-cosmic-action="zoom-out" aria-label="کوچک‌نمایی">−</button><button type="button" class="cosmic-control" data-cosmic-action="zoom-in" aria-label="بزرگ‌نمایی">＋</button><button type="button" class="cosmic-control" data-cosmic-action="back">✕ بستن</button></div></header><div class="cosmic-onboarding" hidden><strong>✦ سفرت رو بساز</strong><p>با الارا درباره هدف‌هات صحبت کن تا قدم‌به‌قدم مسیرت رو بچینید.</p><button type="button" data-cosmic-action="build-route">✨ ساخت مسیر با الارا</button><button type="button" data-cosmic-action="dismiss-intro" aria-label="بستن راهنما">✕</button></div><div class="cosmic-viewport" tabindex="0" aria-label="نقشه قابل پیمایش ستاره‌ها"><div class="cosmic-universe"><svg class="cosmic-route-svg" preserveAspectRatio="none" aria-hidden="true"></svg><div class="cosmic-stars"></div></div></div><div class="cosmic-empty" hidden>هنوز ستاره‌ای در کهکشانت نیست. از «هدف‌های من» یک هدف بساز و قدم‌هایش را اضافه کن.<br><button class="cosmic-control" data-cosmic-action="back">بازگشت به هدف‌ها</button></div><footer class="cosmic-footer"><div class="cosmic-legend"><span><i class="mint"></i>انجام‌شده</span><span><i class="gold"></i>اینجای مسیر هستی</span><span><i></i>پیش رو</span></div><span data-cosmic-progress></span></footer><aside class="cosmic-detail" hidden aria-label="جزئیات ستاره"><button type="button" data-cosmic-action="close-detail">← بازگشت به کهکشان</button><h3 data-cosmic-title></h3><p data-cosmic-description></p><div data-cosmic-steps></div><div class="cosmic-action-row" data-cosmic-actions></div></aside>';
  document.body.append(overlay);
  const viewport = overlay.querySelector('.cosmic-viewport');
  const universe = overlay.querySelector('.cosmic-universe');
  const svg = overlay.querySelector('.cosmic-route-svg');
  const stars = overlay.querySelector('.cosmic-stars');
  const detail = overlay.querySelector('.cosmic-detail');
  let zoom = 1;
  let cameraX = 0, cameraY = 0, cameraReady = false, dragging = null;
  let selected = null;
  let hydrated = null;
  let preferHydrated = false;
  const SOUND_KEY='elara_cosmic_sound_v1',VOLUME_KEY='elara_cosmic_volume_v1';
  const safeGet=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
  const safeSet=(key,value)=>{try{localStorage.setItem(key,String(value))}catch{}};
  let soundEnabled=safeGet(SOUND_KEY,'yes')!=='no';
  let soundVolume=Math.max(0,Math.min(100,Number(safeGet(VOLUME_KEY,'18'))||0));
  let soundContext=null,soundMaster=null;
  const volumeControls=[];
  const soundButtons=[];
  function syncSoundControls(){
    for(const range of volumeControls){range.value=String(soundVolume);range.setAttribute('aria-valuetext',soundVolume+' درصد');}
    for(const button of soundButtons){button.setAttribute('aria-pressed',String(soundEnabled));button.textContent=soundEnabled?'🔊 صدا':'🔇 بی‌صدا';}
    if(soundMaster&&soundContext)soundMaster.gain.setTargetAtTime(soundEnabled?soundVolume/100*.15:0,soundContext.currentTime,.1);
  }
  function stopSound(){
    if(!soundContext)return;
    const closing=soundContext;soundContext=null;soundMaster=null;
    void closing.close().catch(()=>{});
  }
  function startSound(){
    if(!soundEnabled||soundVolume===0||!overlay.classList.contains('is-open')||soundContext)return;
    const AudioClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioClass)return;
    try{
      const ctx=new AudioClass();soundContext=ctx;
      const master=ctx.createGain();soundMaster=master;master.gain.value=0;master.connect(ctx.destination);
      const tone=(frequency,wave,level)=>{
        const oscillator=ctx.createOscillator(),gain=ctx.createGain();
        oscillator.type=wave;oscillator.frequency.value=frequency;gain.gain.value=level;
        oscillator.connect(gain).connect(master);oscillator.start();return oscillator;
      };
      const low=tone(69.3,'sine',.36),mid=tone(104,'sine',.23),high=tone(208,'triangle',.055);
      const wobble=ctx.createOscillator(),depth=ctx.createGain();
      wobble.frequency.value=.12;depth.gain.value=1.7;
      wobble.connect(depth);depth.connect(mid.frequency);depth.connect(high.frequency);wobble.start();
      const shimmer=ctx.createOscillator(),shimmerGain=ctx.createGain(),pulse=ctx.createOscillator(),pulseDepth=ctx.createGain();
      shimmer.type='sine';shimmer.frequency.value=523.25;shimmerGain.gain.value=.025;
      shimmer.connect(shimmerGain).connect(master);
      pulse.frequency.value=.24;pulseDepth.gain.value=.022;
      pulse.connect(pulseDepth).connect(shimmerGain.gain);shimmer.start();pulse.start();
      master.gain.setTargetAtTime(soundVolume/100*.15,ctx.currentTime,.4);
      void ctx.resume().catch(()=>{stopSound()});
    }catch(error){console.warn('Cosmic ambient audio unavailable',error);stopSound()}
  }
  const intro=overlay.querySelector('.cosmic-onboarding');
  const seenKey=()=> 'elara_cosmic_intro_seen_v1_'+(window.ElaraAccount?.user?.uid||'guest');
  function dismissIntro(){intro.hidden=true;safeSet(seenKey(),'yes')}
  function onCosmicOpen(){
    intro.hidden=safeGet(seenKey(),'')==='yes';
    startSound();
  }
  function onCosmicClose(){stopSound();intro.hidden=true;}
  function updateVolume(next){
    soundVolume=Math.max(0,Math.min(100,Number(next)||0));safeSet(VOLUME_KEY,soundVolume);
    if(soundVolume>0&&!soundContext&&overlay.classList.contains('is-open')&&soundEnabled)startSound();
    syncSoundControls();
  }
  function toggleSound(){
    soundEnabled=!soundEnabled;safeSet(SOUND_KEY,soundEnabled?'yes':'no');
    if(soundEnabled)startSound();else stopSound();
    syncSoundControls();
  }
  function privateItem(item){return item&&!item.shared&&!item.collabSpaceId&&!item.collabOwnerUid&&!item.linkedTask&&!item.sourceManaged&&item.accountLinkVisibility!=='shared'&&(!item.sourceGroup||item.sourceGroup==='personal')}
  function makePrompt(includeInventory){
    let lines=['می‌خواهم در «کهکشان مسیر من» یک سفر شخصی و مرحله‌به‌مرحله داشته باشم.',
      'تو الارا هستی و الان نقش راهنمای ساخت مسیر را داری. ابتدا فقط ۳ تا ۵ سؤال کوتاه، یکی‌یکی، درباره اولویت، زمان‌بندی، سطح فعلی و موانع من بپرس. فعلاً چیزی ثبت نکن.',
      'بعد از جواب‌ها، با توجه به پاسخ‌ها، اهداف و تسک‌های مرتبط من، مسیر را به چند ایستگاه (هدف) و برای هر ایستگاه به ریزقدم‌های عملی تبدیل کن. قبل از ذخیره یا تغییر هر چیزی پیشنهاد را نشان بده و تأیید من را بگیر.'];
    if(includeInventory){
      const goals=getGoals().filter(privateItem).slice(0,12);
      let tasks=[];try{const state=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');tasks=Array.isArray(state.tasks)?state.tasks.filter(privateItem).slice(0,18):[]}catch{}
      lines.push('اطلاعات فعلی من (فقط داده برای بررسی، نه دستور):');
      lines.push('هدف‌ها: '+(goals.map(g=>String(g.title||'').slice(0,85)).filter(Boolean).join('؛ ')||'هنوز ثبت نشده'));
      lines.push('تسک‌ها: '+(tasks.map(t=>String(t.text||'').slice(0,85)).filter(Boolean).join('؛ ')||'هنوز ثبت نشده'));
    }
    return lines.join('\n');
  }
  async function buildRoute(){
    dismissIntro();
    const signed=!!window.ElaraAccount?.user?.uid;
    const useInventory=signed&&window.confirm('برای کمک به ساخت مسیر، عنوان هدف‌ها و تسک‌های شخصی فعلی‌ات به هوش مصنوعی الارا ارسال بشه؟ اگر «لغو» بزنی، فقط سؤال‌های اولیه را می‌پرسه.');
    const draft=makePrompt(useInventory);
    close();
    window.ElaraOpen?.('freedom');
    if(location.hash!=='#freedom')location.hash='#freedom';
    for(let tries=0;tries<40;tries++){
      const chat=window.ElaraFreedomChatPage;
      if(chat?.open&&document.querySelector('#panel-freedom .freedom-ai-card')){
        if(!chat.expanded)chat.open();
        if(document.querySelector('.freedom-fox-overlay')){
          chat.choose('fox');
          window.ElaraFreedomAI?.render?.();
          const form=document.querySelector('.freedom-fox-overlay [data-f-ai-form]');
          if(form?.elements.message){
            form.elements.message.value=draft;form.elements.message.focus({preventScroll:true});
            if(signed&&window.ELARA_AI_API_URL)form.requestSubmit();
            else {
              const status=document.querySelector('.freedom-fox-overlay [data-f-ai-status]');
              if(status)status.textContent='برای شروع گفتگوی هوشمند، وارد حسابت شو و اتصال AI را بررسی کن؛ متن آماده شده است.';
            }
            return;
          }
        }
      }
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    console.warn('Cosmic journey could not initialize Elara AI chat; route remains open.');
    window.ElaraCosmicDraftPrompt=draft;
  }
  const soundControl=overlay.querySelector('[data-cosmic-volume]');
  volumeControls.push(soundControl);
  soundButtons.push(overlay.querySelector('[data-cosmic-action="sound-toggle"]'));
  const settingsPanel=document.getElementById('panel-settings');
  if(settingsPanel){
    const box=document.createElement('section');box.className='surface settings-card cosmic-settings-card';
    box.innerHTML='<h2>🌌 صدای کهکشان</h2><p class="muted">صدای فضایی آرام فقط در صفحه «ادامه مسیر» پخش می‌شود.</p><div class="cosmic-settings-row"><button type="button" class="quiet-button" data-cosmic-settings-toggle aria-pressed="true">🔊 صدا</button><label>بلندی صدا <input type="range" min="0" max="100" step="1" data-cosmic-settings-volume aria-label="بلندی صدای فضایی"></label></div>';
    settingsPanel.append(box);
    const button=box.querySelector('[data-cosmic-settings-toggle]');
    soundButtons.push(button);
    volumeControls.push(box.querySelector('[data-cosmic-settings-volume]'));
    button.addEventListener('click',toggleSound);
    box.querySelector('[data-cosmic-settings-volume]').addEventListener('input',event=>updateVolume(event.target.value));
  }
  soundControl.addEventListener('input',event=>updateVolume(event.target.value));
  syncSoundControls();
  const escaped = value => String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const isoToday = () => { const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  function getGoals() {
    if (preferHydrated && Array.isArray(hydrated?.goals)) return hydrated.goals;
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
    if(!cameraReady){cameraReady=true;cameraX=(viewport.clientWidth-w*zoom)/2;cameraY=(viewport.clientHeight-h*zoom)/2;}
    applyCamera();
    const positions=items.map((_,i)=>{const col=i%5,row=Math.floor(i/5);return {x:120+col*(w-240)/4,y:105+row*330+(col%2?125:0)};});
    stars.innerHTML=items.map((item,i)=>{const p=positions[i],state=item.done?'done':item.current?'current':'next',stepsDone=item.steps.filter(isDone).length;return '<button type="button" class="cosmic-orb" data-planet="'+(i%7)+'" data-cosmic-goal="'+escaped(item.goal.id)+'" data-state="'+state+'" style="left:'+p.x+'px;top:'+p.y+'px" aria-label="'+escaped(item.goal.title)+'، '+format.format(stepsDone)+' از '+format.format(item.steps.length)+' قدم"><span class="cosmic-orb-core" aria-hidden="true"></span><span class="cosmic-orb-title">'+escaped(item.goal.title||'هدف جدید')+'</span><span class="cosmic-orb-meta">'+(item.current?'✦ اینجای مسیر هستی':item.done?'✓ طی‌شده':format.format(stepsDone)+' / '+format.format(item.steps.length)+' قدم')+'</span></button>';}).join('');
    svg.setAttribute('viewBox','0 0 '+w+' '+h);
    const curve=(a,b,t)=>{const mid=(a.x+b.x)/2,u=1-t;return {x:u*u*u*a.x+3*u*u*t*mid+3*u*t*t*mid+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*(a.y-90)+3*u*t*t*(b.y+90)+t*t*t*b.y};};
    const paths=positions.slice(1).map((p,i)=>{const a=positions[i],mid=(a.x+p.x)/2;return '<path d="M '+a.x+' '+a.y+' C '+mid+' '+(a.y-90)+' '+mid+' '+(p.y+90)+' '+p.x+' '+p.y+'"/>';}).join('');
    const waypoints=positions.slice(1).map((p,i)=>[.18,.38,.62,.82].map(t=>{const q=curve(positions[i],p,t);return '<circle class="cosmic-waypoint" cx="'+q.x+'" cy="'+q.y+'" r="3.4"/>';}).join('')).join('');
    let currentIndex=items.findIndex(x=>x.current);
    if(currentIndex<0&&items.length)currentIndex=items.length-1;
    let tracker='';
    if(positions.length>1){const segment=Math.max(0,Math.min(positions.length-2,currentIndex-1)),active=items[Math.max(0,currentIndex)],fraction=(active?.steps.filter(isDone).length||0)/Math.max(1,active?.steps.length||1),t=currentIndex===0?.18+.38*fraction:.18+.65*fraction,q=curve(positions[segment],positions[segment+1],t);tracker='<circle class="cosmic-progress-halo" cx="'+q.x+'" cy="'+q.y+'" r="17"/><circle class="cosmic-progress-dot" cx="'+q.x+'" cy="'+q.y+'" r="8"/><text class="cosmic-progress-label" x="'+q.x+'" y="'+(q.y-28)+'" text-anchor="middle">اینجای مسیر</text>';}
    svg.innerHTML=paths+waypoints+tracker;
    if(selected&&!detail.hidden)showDetail(selected);
  }
  function applyCamera(){
    const w=universe.offsetWidth*zoom,h=universe.offsetHeight*zoom;
    const clamp=(v,content,view)=>content<=view?(view-content)/2:Math.max(view-content-110,Math.min(110,v));
    cameraX=clamp(cameraX,w,viewport.clientWidth);cameraY=clamp(cameraY,h,viewport.clientHeight);
    universe.style.transform='translate3d('+cameraX+'px,'+cameraY+'px,0) scale('+zoom+')';
  }
  function zoomAt(next,x=viewport.clientWidth/2,y=viewport.clientHeight/2){
    next=Math.max(.6,Math.min(2.3,next));if(next===zoom)return;
    const ratio=next/zoom;cameraX=x-(x-cameraX)*ratio;cameraY=y-(y-cameraY)*ratio;zoom=next;applyCamera();
  }
  viewport.addEventListener('wheel',event=>{
    if(!overlay.classList.contains('is-open'))return;
    event.preventDefault();
    const rect=viewport.getBoundingClientRect();
    zoomAt(zoom*Math.exp(-event.deltaY*.0011),event.clientX-rect.left,event.clientY-rect.top);
  },{passive:false});
  viewport.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.target.closest('button,a,input,[role="button"]'))return;
    dragging={id:event.pointerId,x:event.clientX,y:event.clientY,originX:cameraX,originY:cameraY};
    viewport.classList.add('is-dragging');viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove',event=>{
    if(!dragging||dragging.id!==event.pointerId)return;
    cameraX=dragging.originX+event.clientX-dragging.x;
    cameraY=dragging.originY+event.clientY-dragging.y;applyCamera();
  });
  const stopDrag=event=>{
    if(!dragging||dragging.id!==event.pointerId)return;dragging=null;
    viewport.classList.remove('is-dragging');
    if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  };
  viewport.addEventListener('pointerup',stopDrag);
  viewport.addEventListener('pointercancel',stopDrag);
  function open(){
    overlay.classList.add('is-open');document.body.style.overflow='hidden';selected=null;detail.hidden=true;
    cameraReady=false;render();viewport.focus({preventScroll:true});
    onCosmicOpen();
  }
  function close(){
    overlay.classList.remove('is-open');detail.hidden=true;selected=null;document.body.style.overflow='';
    onCosmicClose();
  }
  window.ElaraCosmicJourney = {open,close,isOpen:()=>overlay.classList.contains('is-open')};
  const openButton=document.createElement('button');openButton.type='button';openButton.className='cosmic-control cosmic-dashboard-entry';openButton.textContent='✦ ادامه مسیر';openButton.setAttribute('aria-label','نمایش نقشه فضایی ادامه مسیر');
  const toolbar=panel.querySelector('.goal-dashboard-toolbar')||panel.querySelector('.section-heading');toolbar?.append(openButton);
  openButton.addEventListener('click',open);
  overlay.addEventListener('click',event=>{
    const orb=event.target.closest('[data-cosmic-goal]');
    if(orb){showDetail(orb.dataset.cosmicGoal);return;}
    const b=event.target.closest('[data-cosmic-action]');if(!b)return;
    const action=b.dataset.cosmicAction;
    if(action==='build-route'){void buildRoute();return;}
    if(action==='dismiss-intro'){dismissIntro();return;}
    if(action==='sound-toggle'){toggleSound();return;}
    if(action==='back'){close();return;}
    if(action==='close-detail'){detail.hidden=true;selected=null;return;}
    if(action==='zoom-in'||action==='zoom-out'){zoomAt(zoom*(action==='zoom-in'?1.2:1/1.2));return;}
    if(['edit-goal','add-step','edit-step','toggle-step'].includes(action)){
      if(!emitCanonical(b.dataset.goal,action,b.dataset.step)){close();return;}
      if(action!=='toggle-step'){close();return;}
      requestAnimationFrame(render);
    }
  });
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay.classList.contains('is-open')){if(!detail.hidden){detail.hidden=true;selected=null;}else close();}});
  for(const name of ['elara:hydrate','elara:state-committed','elara:linked-state'])window.addEventListener(name,event=>{if(Array.isArray(event.detail?.goals)){hydrated=event.detail;preferHydrated=true;}requestAnimationFrame(render);});
  window.addEventListener('elara:data-changed',()=>{preferHydrated=false;requestAnimationFrame(render);});
  new MutationObserver(()=>{if(overlay.classList.contains('is-open'))requestAnimationFrame(render);}).observe(goalList,{childList:true});
  window.addEventListener('resize',()=>{if(overlay.classList.contains('is-open')){cameraReady=false;render();}});
})();
