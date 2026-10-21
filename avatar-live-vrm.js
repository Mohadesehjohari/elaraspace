/* Elara live VRM stage (desktop-first, opt-in when exported .vrm exists).
   Does not read .vroid, does not touch existing 2D wardrobe or shop entitlements. */
(() => {
  'use strict';
  const CONFIG = 'avatar/vrm-looks.json?v=20261020-male-vrm-character-gender-v1';
  const PREFIX = 'elara_live_look_v1_';
  // The quick modal must never continue mounting after it has been closed.
  const enabled = stage => !stage?.closest('.elara-avatar-quick-modal[hidden]') && (
    !!stage?.closest('.elara-avatar-quick-modal:not([hidden])') || window.matchMedia('(min-width:701px)').matches ||
    !!document.querySelector('.elara-private-drawer[data-mobile-section="home"][data-elara-view="avatar"]:not(.hidden)'));
  const ready = item => !!item && ['preview', 'ready'].includes(item.status) && typeof item.src === 'string' && item.src.startsWith('assets/avatar/') && /\.vrm(?:\?.*)?$/.test(item.src);
  const uid = () => window.ElaraProfileSystem?.currentUid?.() || null;
  const currentKind = () => {const system=window.ElaraProfileSystem,p=system?.readPrivate?.()||{};return ['male','female'].includes(p.avatarGender)?p.avatarGender:(['male','female'].includes(p.sex)?p.sex:(system?.readWardrobe?.()?.avatarGroup==='male'?'male':'female'));};
  const status = (stage, message, kind = '') => { const el = stage.querySelector('[data-elara-avatar-status]'); if (el) { el.textContent=message; el.dataset.state=kind; } };
  const saved = kind => { try { if (!uid()) return ''; return JSON.parse(localStorage.getItem(PREFIX+uid()) || '{}')[kind] || ''; } catch { return ''; } };
  const save = (kind, id) => { try { if (!uid()) return; const key=PREFIX+uid(); const state=JSON.parse(localStorage.getItem(key)||'{}'); state[kind]=id; localStorage.setItem(key,JSON.stringify(state)); } catch (e) { console.warn('Elara VRM: could not save wardrobe choice',e); } };
  const importRuntime = () => Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('@pixiv/three-vrm')
  ]);
  function disposeMeshes(THREE, obj) {
    if (!obj) return;
    const materials = new Set(), geometries = new Set();
    obj.traverse(node => { if (node.geometry) geometries.add(node.geometry); const m=node.material; if(m) (Array.isArray(m)?m:[m]).forEach(x=>materials.add(x)); });
    geometries.forEach(g=>g.dispose?.());
    materials.forEach(m=>{ Object.values(m).forEach(v=>{ if(v?.isTexture)v.dispose?.(); }); m.dispose?.(); });
  }
  async function mount(stage, config, kind, base) {
    const [THREE, {GLTFLoader}, {VRMLoaderPlugin, VRMUtils}] = await importRuntime();
    const loader = new GLTFLoader();
    loader.register(parser => new VRMLoaderPlugin(parser));

    const looks = [{id:'base',label:'استایل اصلی',status:base.status,src:base.src},
      ...(config.looks || []).filter(x => x.kind===kind && x.id !== 'base')];
    const findLook = id => looks.find(x => x.id===id && ready(x));
    let initialLook = findLook(saved(kind)) || looks[0];
    const getVRM = async (src) => {
      const gltf = await loader.loadAsync(src);
      const vrm = gltf.userData.vrm;
      if (!vrm) { disposeMeshes(THREE,gltf.scene); throw new Error('File does not contain a VRM humanoid'); }
      if (vrm.meta?.metaVersion === '0' && VRMUtils.rotateVRM0) VRMUtils.rotateVRM0(vrm);
      return vrm;
    };
    // Do not replace the existing viewer if the initial model cannot load.
    let vrm;
    try {vrm = await getVRM(initialLook.src);}
    catch(error) {
      if(initialLook.id==='base')throw error;
      console.warn('Elara VRM: saved outfit unavailable, using base',error);
      initialLook=looks[0];vrm=await getVRM(initialLook.src);
    }
    if (!stage.isConnected || !enabled(stage)) { disposeMeshes(THREE,vrm.scene); return false; }

    let renderer;
    try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'}); }
    catch (e) { disposeMeshes(THREE,vrm.scene); throw e; }
    // 1x desktop monitors benefit from modest supersampling; cap GPU work on HiDPI screens.
    renderer.setPixelRatio(window.matchMedia('(max-width:700px)').matches
      ? Math.min(1.5,window.devicePixelRatio||1)
      : Math.min(2,Math.max(1.5,window.devicePixelRatio||1)));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.04;
    renderer.domElement.className='elara-avatar-canvas';
    renderer.domElement.setAttribute('aria-label','آواتار سه‌بعدی؛ با کشیدن بچرخان');
    const viewport=stage.querySelector('[data-elara-avatar-viewport]');
    if (!viewport) { renderer.dispose(); disposeMeshes(THREE,vrm.scene); return false; }
    viewport.replaceChildren(renderer.domElement);

    const scene=new THREE.Scene(), anchor=new THREE.Group(), camera=new THREE.PerspectiveCamera(30,1,.03,70);
    scene.add(anchor);scene.add(camera);
    // Control both eyes together, with tightly bounded offsets. Native VRM lookAt
    // was producing crossed/off-axis eyes because its camera-bound target was too close.
    const mouse={x:0,y:0},smoothMouse={x:0,y:0};
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const trackPointer=(e)=>{
      if(pointer!==null||e.pointerType!=='mouse')return;
      const rect=stage.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      mouse.x=clamp((e.clientX-(rect.left+rect.width*.5))/(rect.width*.5),-.42,.42);
      mouse.y=clamp(((rect.top+rect.height*.5)-e.clientY)/(rect.height*.5),-.38,.38);
    };
    const resetPointer=()=>{mouse.x=0;mouse.y=0;};
    window.addEventListener('pointermove',trackPointer,{passive:true});
    window.addEventListener('blur',resetPointer);
    scene.add(new THREE.HemisphereLight(0xf4f1ff,0x202b49,1.55));
    const key=new THREE.DirectionalLight(0xfff6f0,2.65);
    key.position.set(2,4,5); scene.add(key);
    const rim=new THREE.DirectionalLight(0x857aff,1.15);
    rim.position.set(-3,3,-4); scene.add(rim);
    let height=1.7, look=initialLook, disposed=false, replacing=false, yaw=0, targetYaw=0, zoom=1, pointer=null, lastX=0, lastY=0, downX=0, downY=0, downAt=0, lastTime=performance.now(), focus='full', motion='idle', motionStarted=0, motionUntil=0;
    const focusHeights={full:.52,face:.865,torso:.63,legs:.30};
    const focusDistance={full:4.6,face:1.25,torso:2.3,legs:2.6};
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bones = {};
    const Euler=new THREE.Euler(), q=new THREE.Quaternion();
    const boneNames = ['head','neck','chest','spine','hips','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand',
      ...['left','right'].flatMap(side=>['Eye','ThumbMetacarpal','ThumbProximal','IndexProximal','IndexIntermediate','MiddleProximal','MiddleIntermediate','RingProximal','RingIntermediate','LittleProximal','LittleIntermediate'].map(finger=>side+finger))];
    function captureBones() {
      for(const name of boneNames) {
        const node=vrm.humanoid?.getNormalizedBoneNode(name);
        bones[name]=node?{node,quat:node.quaternion.clone(),pos:node.position.clone()}:null;
      }
    }
    function poseBone(name, x=0, y=0, z=0) {
      const b=bones[name]; if (!b) return;
      Euler.set(x,y,z,'XYZ');q.setFromEuler(Euler);b.node.quaternion.copy(b.quat).multiply(q);
    }
    const motionOptions=['idle','smile','wave','dance1','dance2','dance3'];
    function setAction(name='idle'){
      if(!motionOptions.includes(name))name='idle';
      motion=name;motionStarted=elapsed;
      motionUntil=name.startsWith('dance')?motionStarted+8:0;
      stage.dataset.avatarMotion=motion;
      return true;
    }
    function attach(next) {
      anchor.clear();
      vrm=next;
      anchor.add(vrm.scene);
      const bb=new THREE.Box3().setFromObject(vrm.scene);
      const size=bb.getSize(new THREE.Vector3());
      const mid=bb.getCenter(new THREE.Vector3());
      const rawHeight=Math.max(size.y,.2);
      const scale=1.9/rawHeight;
      vrm.scene.scale.multiplyScalar(scale);
      vrm.scene.position.x-=mid.x*scale;
      vrm.scene.position.y-=bb.min.y*scale;
      vrm.scene.position.z-=mid.z*scale;
      height=1.9;
      captureBones();
      if(vrm.lookAt){vrm.lookAt.autoUpdate=false;vrm.lookAt.target=null;} // No automatic convergence / cross-eyed focus.
      const aspect=viewport.clientWidth/Math.max(viewport.clientHeight,1);
      focus='full';zoom=1;
      camera.position.set(0,height*.52,aspect<.8?4.85:4.6);
      camera.lookAt(0,height*.52,0);
    }
    attach(vrm);

    const interfaceNode=document.createElement('div');
    interfaceNode.className='elara-live-controls';
    interfaceNode.innerHTML = '<div class="elara-live-actions"><button type="button" data-live-action="front">نمای روبه‌رو</button></div>'+
      '<nav class="elara-avatar-zone-buttons" aria-label="زوم کاراکتر"><button type="button" data-avatar-focus="face" aria-pressed="false">صورت</button><button type="button" data-avatar-focus="torso" aria-pressed="false">تنه</button><button type="button" data-avatar-focus="legs" aria-pressed="false">پاها</button></nav>'+
      '<button type="button" data-live-focus-return hidden>← بازگشت به تمام‌قد</button>'+
      '<div class="elara-live-panel" data-live-panel hidden role="region" aria-label="کمد سه‌بعدی">'+
      '<header><strong>کمد Elara</strong><button type="button" data-live-action="close" aria-label="بستن کمد">×</button></header>'+
      '<div class="elara-live-tabs" role="tablist" aria-label="نوع لباس"><button type="button" data-live-tab="sets" aria-selected="true">ست‌های کامل</button><button type="button" data-live-tab="parts" aria-selected="false">تکی</button></div>'+
      '<div data-live-content></div><p class="elara-live-note" data-live-note></p></div>';
    stage.append(interfaceNode);
    const focusReturn=interfaceNode.querySelector('[data-live-focus-return]');
    const focusButtons=[...interfaceNode.querySelectorAll('[data-avatar-focus]')];
    function selectFocus(next) {
      if(!Object.hasOwn(focusHeights,next))next='full';
      focus=next;zoom=1;
      mouse.x=mouse.y=0;smoothMouse.x=smoothMouse.y=0;
      if(next!=='full')targetYaw=0;
      focusReturn.hidden=next==='full';
      focusButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.avatarFocus===next)));
    }
    const panel=interfaceNode.querySelector('[data-live-panel]');
    const tabButtons=interfaceNode.querySelectorAll('[data-live-tab]');
    const content=interfaceNode.querySelector('[data-live-content]');
    const note=interfaceNode.querySelector('[data-live-note]');
    let tab='sets';
    function renderWardrobe() {
      tabButtons.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.liveTab===tab)));
      content.replaceChildren();
      if (tab==='parts') {
        const p=document.createElement('p');p.textContent='انتخاب تکی بالاپوش، پایین‌پوش، کفش و مو پس از آماده‌شدن فایل‌های جدا و سازگار با اسکلت این مدل فعال می‌شود.';content.append(p);
        for(const label of ['بالاپوش','پایین‌پوش','کفش','مو']) {
          const row=document.createElement('div');row.className='elara-live-part';
          const title=document.createElement('span');title.textContent=label;
          const flag=document.createElement('span');flag.textContent='در انتظار آیتم سه‌بعدی';row.append(title,flag);content.append(row);
        }
        note.textContent='این بخش هنوز قابلیت تعویض واقعی ندارد؛ لباس‌های یکپارچه VRM خودکار از هم جدا نمی‌شوند.';
        return;
      }
      const grid=document.createElement('div');grid.className='elara-live-look-grid';
      for (const item of looks) {
        const button=document.createElement('button');button.type='button';button.className='elara-live-look';
        const available=ready(item), active=look.id===item.id;
        button.disabled=!available||replacing;button.setAttribute('aria-pressed',String(active));
        button.innerHTML='<span class="elara-live-look-icon" aria-hidden="true">✧</span>';
        const title=document.createElement('strong');title.textContent=item.label;
        const sub=document.createElement('small');sub.textContent=available?(active?'پوشیده‌شده':'انتخاب'):'هنوز فایل سه‌بعدی ندارد';
        button.append(title,sub);
        button.addEventListener('click',()=>{void changeLook(item);});
        grid.append(button);
      }
      content.append(grid);
      note.textContent='هر ست یک خروجی VRM جدا از همان شخصیت است. انتخاب روی همین مرورگر و فقط برای حساب شما ذخیره می‌شود.';
    }
    renderWardrobe();
    function renderWardrobeControls(host){
      if(!host)return;
      panel.hidden=false;
      host.replaceChildren(panel);
      renderWardrobe();
    }
    panel.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.liveAction==='close')window.ElaraWardrobeUI?.close?.();
      if(b.dataset.liveTab){tab=b.dataset.liveTab;renderWardrobe();}
    });

    async function changeLook(item) {
      if (replacing||!ready(item)||look.id===item.id) return;
      replacing=true;renderWardrobe();status(stage,'در حال پوشیدن لباس…','loading');
      try {
        const newVRM=await getVRM(item.src);
        if(disposed) {disposeMeshes(THREE,newVRM.scene);return;}
        const previous=vrm;attach(newVRM);disposeMeshes(THREE,previous.scene);
        look=item;save(kind,item.id);renderWardrobe();status(stage,'مدل سه‌بعدی آماده است','ready');
      }catch(error) {
        console.error('Elara VRM outfit failed',error);
        status(stage,'این لباس بارگذاری نشد؛ مدل قبلی حفظ شد','error');
      }finally{replacing=false;renderWardrobe();}
    }

    interfaceNode.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.avatarFocus){selectFocus(b.dataset.avatarFocus);}
      else if(b.hasAttribute('data-live-focus-return'))selectFocus('full');
      else if(b.dataset.liveAction==='front'){targetYaw=0;mouse.x=0;mouse.y=0;}
    });
    const raycaster=new THREE.Raycaster(),rayPoint=new THREE.Vector2();
    function focusAt(e) {
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      rayPoint.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));
      raycaster.setFromCamera(rayPoint,camera);
      const hits=raycaster.intersectObject(vrm.scene,true);
      if(!hits.length)return; // Taps on the empty background are ignored.
      const local=anchor.worldToLocal(hits[0].point.clone());
      selectFocus(local.y>height*.75?'face':local.y>height*.44?'torso':'legs');
    }
    function down(e){
      if(e.button!==undefined&&e.button!==0)return;
      pointer=e.pointerId;lastX=downX=e.clientX;lastY=downY=e.clientY;downAt=performance.now();
      renderer.domElement.setPointerCapture?.(e.pointerId);stage.classList.add('is-dragging');e.preventDefault();
    }
    function move(e){if(pointer!==e.pointerId)return;targetYaw+=(e.clientX-lastX)*.008;lastX=e.clientX;lastY=e.clientY;e.preventDefault();}
    function up(e){
      if(pointer!==e.pointerId)return;
      const click=Math.hypot(e.clientX-downX,e.clientY-downY)<7&&performance.now()-downAt<550;
      pointer=null;stage.classList.remove('is-dragging');
      if(renderer.domElement.hasPointerCapture?.(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
      if(click&&e.type==='pointerup')focusAt(e);
    }
    function wheel(e){zoom=Math.max(.66,Math.min(1.75,zoom+Math.sign(e.deltaY)*.055));e.preventDefault();}
    const canvas=renderer.domElement;
    canvas.addEventListener('pointerdown',down);
    canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',up);
    canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('wheel',wheel,{passive:false});
    const resize=()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(w<2||h<2)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const ro=new ResizeObserver(resize);ro.observe(viewport);resize();

    let raf=0, elapsed=0, nextBlink=3.4, blinkStart=-1, blinkDuration=.16;
    const changeKind=()=>{dispose();stage.dataset.avatarMounted='';window.dispatchEvent(new Event('elara:avatar-stage-ready'));};
    window.addEventListener('elara:profile-private-changed',changeKind);
    function frame(now){
      if(disposed)return;
      raf=requestAnimationFrame(frame);
      const dt=Math.max(.001,Math.min(.05,(now-lastTime)/1000));lastTime=now;
      if(!stage.isConnected) {dispose();return;}
      if(stage.offsetParent===null||document.hidden||
        (document.querySelector('.approved-wardrobe:not([hidden])')&&!stage.closest('.approved-wardrobe')&&!stage.closest('.elara-avatar-quick-modal')))return;
      elapsed+=dt;
      const amp=reduced?.12:1, t=elapsed;
      yaw+=(targetYaw-yaw)*Math.min(1,dt*8);
      anchor.rotation.y=yaw;
      const tall=viewport.clientWidth/Math.max(1,viewport.clientHeight)<.8;
      const dest=(focus==='full'?(tall?4.85:4.6):focusDistance[focus]*(tall?1.12:1))*zoom;
      const targetHeight=height*focusHeights[focus],cameraFollow=1-Math.exp(-dt*5);
      camera.position.z+=(dest-camera.position.z)*cameraFollow;
      camera.position.y+=(targetHeight-camera.position.y)*cameraFollow;
      camera.lookAt(0,targetHeight,0);
      const follow=1-Math.exp(-dt*5);
      smoothMouse.x+=(mouse.x-smoothMouse.x)*follow;
      smoothMouse.y+=(mouse.y-smoothMouse.y)*follow;
      poseBone('neck',-.025*smoothMouse.y*amp,.042*smoothMouse.x*amp,Math.sin(t*.47)*.004*amp);
      poseBone('head',-.04*smoothMouse.y*amp+Math.sin(t*.42)*.009*amp,.065*smoothMouse.x*amp+Math.sin(t*.5)*.014*amp,Math.sin(t*.38)*.008*amp);
      // A shared micro-rotation avoids inward convergence. If eye bones are absent,
      // use only very small expression weights for exported VRM gaze presets.
      if(bones.leftEye&&bones.rightEye){
        const eyeX=-.05*smoothMouse.y*amp, eyeY=.065*smoothMouse.x*amp;
        poseBone('leftEye',eyeX,eyeY,0);
        poseBone('rightEye',eyeX,eyeY,0);
      }else{
        const em=vrm.expressionManager, horizontal=smoothMouse.x*.13*amp, vertical=smoothMouse.y*.12*amp;
        if(em){
          for(const [key,value] of [['lookLeft',Math.max(0,-horizontal)],['lookRight',Math.max(0,horizontal)],
            ['lookUp',Math.max(0,vertical)],['lookDown',Math.max(0,-vertical)]])
            try{em.setValue(key,value)}catch{}
        }
      }
      if(motionUntil&&t>=motionUntil){motion='idle';motionUntil=0;stage.dataset.avatarMotion='idle';window.dispatchEvent(new CustomEvent('elara:avatar-motion-ended',{detail:{stage}}));}
      const dancing=motion.startsWith('dance')&&!reduced;
      const dancingT=t-motionStarted;
      const sway=Math.sin(dancingT*(motion==='dance2'?6:4.2));
      const lift=dancing?1:0;
      const breath=Math.sin(t*1.5);
      poseBone('chest',breath*.016*amp,Math.sin(t*.37)*.008*amp,Math.sin(t*.51)*.005*amp);
      poseBone('spine',breath*.008*amp,0,Math.sin(t*.46)*.006*amp);
      // VRM normalized rest arms begin in A/T pose: rotate downward but keep
      // relaxed elbows and palms, never lock fingers into a rigid cylinder.
      let leftArm=-1.27,rightArm=1.27,leftElbow=-.16,rightElbow=.16;
      if(motion==='wave'){
        rightArm=.12+Math.sin(t*3.5)*.1;rightElbow=-.72;
      }else if(dancing){
        if(motion==='dance1'){leftArm=-.65-.22*sway;rightArm=.72+.22*sway;}
        if(motion==='dance2'){leftArm=-.40-.3*Math.sin(dancingT*5);rightArm=1.05-.30*Math.cos(dancingT*5);}
        if(motion==='dance3'){leftArm=-.20-.22*sway;rightArm=.20-.22*sway;}
        leftElbow=-.32;rightElbow=.32;
      }
      poseBone('leftShoulder',0,0,-.055);
      poseBone('rightShoulder',0,0,.055);
      poseBone('leftUpperArm',-.075,0,leftArm+Math.sin(t*.7)*.012*amp);
      poseBone('rightUpperArm',-.075,0,rightArm-Math.sin(t*.7+.3)*.012*amp);
      poseBone('leftLowerArm',-.18,0,leftElbow);
      poseBone('rightLowerArm',-.18,0,rightElbow);
      poseBone('leftHand',.055*amp,0,-.065+Math.sin(t*.39)*.013*amp);
      poseBone('rightHand',.055*amp,0,.065-Math.sin(t*.39+.7)*.013*amp);
      // Resting finger flexion with tiny independent movement. Avoid T-pose hands.
      for(const side of ['left','right']){
        const sign=side==='left'?1:-1;
        for(const [finger,index] of [['Index',0],['Middle',1],['Ring',2],['Little',3]]){
          const relax=.18+index*.026+Math.sin(t*.56+index*.57+(sign>0?0:1))*.012*amp;
          poseBone(side+finger+'Proximal',0,0,sign*relax);
          poseBone(side+finger+'Intermediate',0,0,sign*(.13+index*.015));
        }
        poseBone(side+'ThumbProximal',0,0,sign*.11);
      }
      const hips=bones.hips;
      if(hips){hips.node.position.copy(hips.pos);hips.node.position.y+=Math.sin(t*1.55)*.003*amp + (dancing?Math.abs(sway)*.013*amp:0);hips.node.position.x+=dancing?.032*sway*amp:0;}
      if(t>=nextBlink){blinkStart=t;blinkDuration=.13+Math.random()*.07;nextBlink=t+2.7+Math.random()*3.6;}
      const p=(t-blinkStart)/blinkDuration;
      const blink=p>=0&&p<=1?Math.sin(Math.PI*p):0;
      try{vrm.expressionManager?.setValue('blink',blink*amp);}catch{}
      // Smile accompanies positive poses while leaving normal blinking intact.
      try{vrm.expressionManager?.setValue('happy',(['smile','wave'].includes(motion)||dancing)?.65:0);}catch{}
      vrm.update(dt); // VRM lookAt, expressions and spring bones
      renderer.render(scene,camera);
    }
    raf=requestAnimationFrame(frame);
    stage.dataset.avatarMounted='live';
    status(stage,'Elara · زنده','ready');

    function dispose() {
      if(disposed)return;disposed=true;cancelAnimationFrame(raf);ro.disconnect();
      window.removeEventListener('elara:profile-private-changed',changeKind);
      window.removeEventListener('pointermove',trackPointer);window.removeEventListener('blur',resetPointer);
      panel.remove();interfaceNode.remove();renderer.dispose();canvas.remove();disposeMeshes(THREE,vrm.scene);
      stage.dataset.avatarMounted='';
      if(window.ElaraLiveVRM?.current?.stage===stage)window.ElaraLiveVRM.current=null;
    }
    window.ElaraLiveVRM.current={stage,dispose,renderWardrobeControls,focus:selectFocus,setAction,get action(){return motion;},get look(){return look.id;},get kind(){return kind;}};
    window.dispatchEvent(new Event('elara:live-avatar-mounted'));
    return true;
  }

  async function tryMount(stage) {
    if(!stage||!enabled(stage))return false;
    const kind=currentKind();
    let config;
    try {
      // Always revalidate the tiny catalogue; a stale cached copy can mark an uploaded VRM as unavailable.
      const result=await fetch(CONFIG,{cache:'no-cache'});
      if(!result.ok){stage.dataset.avatarFallbackReason='catalog-unavailable';return false;}
      config=await result.json();
    } catch {stage.dataset.avatarFallbackReason='catalog-unavailable';return false;}
    const base=config?.bases?.[kind];
    if(!ready(base)){
      stage.dataset.avatarFallbackReason=kind==='male'?'male-vrm-not-ready':'base-vrm-not-ready';
      return false;
    }
    delete stage.dataset.avatarFallbackReason;
    try {
      return await mount(stage,config,kind,base);
    } catch(err) {
      console.warn('Elara VRM: preview failed; displaying diagnostic prototype',err);
      stage.dataset.avatarFallbackReason='vrm-download-or-render-failed';
      status(stage,'مدل جدید بارگذاری نشد؛ نسخهٔ آزمایشی نمایش داده می‌شود','error');
      return false;
    }
  }
  window.ElaraLiveVRM={tryMount,current:null,version:'vrm-wardrobe-preview-v1'};
})();