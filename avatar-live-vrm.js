/* Elara live VRM stage (desktop-first, opt-in when exported .vrm exists).
   Does not read .vroid, does not touch existing 2D wardrobe or shop entitlements. */
(() => {
  'use strict';
  const CONFIG = 'avatar/vrm-looks.json';
  const PREFIX = 'elara_live_look_v1_';
  const enabled = () => window.matchMedia('(min-width:701px)').matches;
  const ready = item => !!item && ['preview', 'ready'].includes(item.status) && typeof item.src === 'string' && item.src.startsWith('assets/avatar/') && /\.vrm(?:\?.*)?$/.test(item.src);
  const uid = () => window.ElaraProfileSystem?.currentUid?.() || null;
  const currentKind = () => (window.ElaraProfileSystem?.readPrivate?.()?.sex === 'male' ? 'male' : 'female');
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
    const initialLook = findLook(saved(kind)) || looks[0];
    const getVRM = async (src) => {
      const gltf = await loader.loadAsync(src);
      const vrm = gltf.userData.vrm;
      if (!vrm) { disposeMeshes(THREE,gltf.scene); throw new Error('File does not contain a VRM humanoid'); }
      if (vrm.meta?.metaVersion === '0' && VRMUtils.rotateVRM0) VRMUtils.rotateVRM0(vrm);
      return vrm;
    };
    // Do not replace the existing viewer if the initial model cannot load.
    let vrm = await getVRM(initialLook.src);
    if (!stage.isConnected || !enabled()) { disposeMeshes(THREE,vrm.scene); return false; }

    let renderer;
    try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'}); }
    catch (e) { disposeMeshes(THREE,vrm.scene); throw e; }
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.12;
    renderer.domElement.className='elara-avatar-canvas';
    renderer.domElement.setAttribute('aria-label','آواتار سه‌بعدی؛ با کشیدن بچرخان');
    const viewport=stage.querySelector('[data-elara-avatar-viewport]');
    if (!viewport) { renderer.dispose(); disposeMeshes(THREE,vrm.scene); return false; }
    viewport.replaceChildren(renderer.domElement);

    const scene=new THREE.Scene(), anchor=new THREE.Group(), camera=new THREE.PerspectiveCamera(30,1,.03,70);
    scene.add(anchor);
    scene.add(new THREE.HemisphereLight(0xf4f1ff,0x202b49,2.1));
    const key=new THREE.DirectionalLight(0xffe9eb,3.6);
    key.position.set(2,4,5); scene.add(key);
    const rim=new THREE.DirectionalLight(0x857aff,2.3);
    rim.position.set(-3,3,-4); scene.add(rim);
    let height=1.7, look=initialLook, disposed=false, replacing=false, yaw=0, targetYaw=0, zoom=1, pointer=null, lastX=0, lastTime=performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bones = {};
    const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), Euler=new THREE.Euler(), q=new THREE.Quaternion();
    const boneNames = ['head','neck','chest','spine','hips','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm'];
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
      const aspect=viewport.clientWidth/Math.max(viewport.clientHeight,1);
      camera.position.set(0,1.06,aspect<.8?6.5:5.2);
      camera.lookAt(0,1.02,0);
    }
    attach(vrm);

    const interfaceNode=document.createElement('div');
    interfaceNode.className='elara-live-controls';
    interfaceNode.innerHTML = '<div class="elara-live-actions"><button type="button" data-live-action="wardrobe" aria-expanded="false">✦ کمد سه‌بعدی</button><button type="button" data-live-action="front">نمای روبه‌رو</button></div>'+
      '<div class="elara-live-panel" data-live-panel hidden role="region" aria-label="کمد سه‌بعدی">'+
      '<header><strong>کمد Elara</strong><button type="button" data-live-action="close" aria-label="بستن کمد">×</button></header>'+
      '<div class="elara-live-tabs" role="tablist" aria-label="نوع لباس"><button type="button" data-live-tab="sets" aria-selected="true">ست‌های کامل</button><button type="button" data-live-tab="parts" aria-selected="false">تکی</button></div>'+
      '<div data-live-content></div><p class="elara-live-note" data-live-note></p></div>';
    stage.append(interfaceNode);
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
      const b=event.target.closest('button');if(!b) return;
      if(b.dataset.liveAction==='wardrobe'||b.dataset.liveAction==='close'){
        panel.hidden=!panel.hidden;interfaceNode.querySelector('[data-live-action="wardrobe"]').setAttribute('aria-expanded',String(!panel.hidden));
      }else if(b.dataset.liveAction==='front'){targetYaw=0;}
      if(b.dataset.liveTab){tab=b.dataset.liveTab;renderWardrobe();}
    });
    function down(e){if(e.button!==0)return;pointer=e.pointerId;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);stage.classList.add('is-dragging');e.preventDefault();}
    function move(e){if(pointer!==e.pointerId)return;targetYaw+=(e.clientX-lastX)*.009;lastX=e.clientX;e.preventDefault();}
    function up(e){if(pointer!==e.pointerId)return;pointer=null;stage.classList.remove('is-dragging');if(renderer.domElement.hasPointerCapture?.(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);}
    function wheel(e){zoom=Math.max(.77,Math.min(1.35,zoom+Math.sign(e.deltaY)*.045));e.preventDefault();}
    const canvas=renderer.domElement;
    canvas.addEventListener('pointerdown',down);
    canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',up);
    canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('wheel',wheel,{passive:false});
    const resize=()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(w<2||h<2)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const ro=new ResizeObserver(resize);ro.observe(viewport);resize();

    let raf=0, elapsed=0;
    const changeKind=()=>{dispose();stage.dataset.avatarMounted='';window.dispatchEvent(new Event('elara:avatar-stage-ready'));};
    window.addEventListener('elara:profile-private-changed',changeKind);
    function frame(now){
      if(disposed)return;
      raf=requestAnimationFrame(frame);
      const dt=Math.max(.001,Math.min(.05,(now-lastTime)/1000));lastTime=now;
      if(!stage.isConnected) {dispose();return;}
      if(stage.offsetParent===null||document.hidden)return;
      elapsed+=dt;
      const amp=reduced?.12:1, t=elapsed;
      yaw+=(targetYaw-yaw)*Math.min(1,dt*8);
      anchor.rotation.y=yaw;
      const dest=(viewport.clientWidth/Math.max(1,viewport.clientHeight)<.8?6.5:5.2)*zoom;
      camera.position.z+=(dest-camera.position.z)*Math.min(1,dt*8);
      camera.lookAt(0,height*.52,0);
      poseBone('head',Math.sin(t*.42)*.014*amp,Math.sin(t*.5)*.028*amp,Math.sin(t*.38)*.012*amp);
      poseBone('chest',Math.sin(t*1.5)*.006*amp,Math.sin(t*.37)*.009*amp,Math.sin(t*.51)*.006*amp);
      poseBone('spine',Math.sin(t*1.5)*.004*amp,0,Math.sin(t*.46)*.004*amp);
      poseBone('leftUpperArm',0,0,-.28+Math.sin(t*.7)*.008*amp);
      poseBone('rightUpperArm',0,0,.28-Math.sin(t*.7+.3)*.008*amp);
      const hips=bones.hips;
      if(hips) {hips.node.position.copy(hips.pos);hips.node.position.y+=Math.sin(t*1.5)*.004*amp;}
      const b=(t%5.3),blink = b>4.88&&b<5.08?Math.sin((b-4.88)/.20*Math.PI):0;
      try{vrm.expressionManager?.setValue('blink',blink*amp);}catch{}
      vrm.update(dt); // VRM spring bones / expression manager
      renderer.render(scene,camera);
    }
    raf=requestAnimationFrame(frame);
    stage.dataset.avatarMounted='live';
    status(stage,'Elara · زنده','ready');

    function dispose() {
      if(disposed)return;disposed=true;cancelAnimationFrame(raf);ro.disconnect();
      window.removeEventListener('elara:profile-private-changed',changeKind);
      interfaceNode.remove();renderer.dispose();canvas.remove();disposeMeshes(THREE,vrm.scene);
      stage.dataset.avatarMounted='';
    }
    window.ElaraLiveVRM.current={stage,dispose,get look(){return look.id;},get kind(){return kind;}};
    return true;
  }

  async function tryMount(stage) {
    if(!stage||!enabled())return false;
    const kind=currentKind();
    let config;
    try {
      const result=await fetch(CONFIG,{cache:'no-store'});
      if(!result.ok)return false;
      config=await result.json();
    } catch {return false;}
    const base=config?.bases?.[kind];
    if(!ready(base))return false;
    try {
      const response=await fetch(base.src,{method:'HEAD',cache:'no-store'});
      if(!response.ok) return false;
      return await mount(stage,config,kind,base);
    } catch(err) {
      console.warn('Elara VRM: preview not ready, using technical fallback',err);
      status(stage,'مدل VRM هنوز آماده نیست؛ نمایش نسخه آزمایشی','');
      return false;
    }
  }
  window.ElaraLiveVRM={tryMount,current:null,version:'vrm-wardrobe-preview-v1'};
})();