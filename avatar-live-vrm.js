/* Elara live VRM stage (desktop-first, opt-in when exported .vrm exists).
   Does not read .vroid, does not touch existing 2D wardrobe or shop entitlements. */
(() => {
  'use strict';
  const CONFIG = 'avatar/vrm-looks.json?v=20261020-male-vrm-character-gender-v1';
  const PREFIX = 'elara_live_look_v1_';
  // Validated paths in ruslanmv/3D-Avatar-Chatbot; author-converted BVH dances.
  // Pin the source revision so a repository update cannot silently swap motions.
  const MOTION_SOURCES={
    dance1:'https://raw.githubusercontent.com/ruslanmv/3D-Avatar-Chatbot/2aa957f4dba43dc363a3d387b60df55b95bd2a91/addons/vrma-dance/dance_1.vrma',
    dance2:'https://raw.githubusercontent.com/ruslanmv/3D-Avatar-Chatbot/2aa957f4dba43dc363a3d387b60df55b95bd2a91/addons/vrma-dance/dance_2.vrma',
    dance3:'https://raw.githubusercontent.com/ruslanmv/3D-Avatar-Chatbot/2aa957f4dba43dc363a3d387b60df55b95bd2a91/addons/vrma-dance/dance_dab.vrma'
  };
  // The quick modal must never continue mounting after it has been closed.
  const enabled = stage => !stage?.closest('.elara-avatar-quick-modal[hidden]') && (
    !!stage?.closest('.elara-avatar-quick-modal:not([hidden])') || window.matchMedia('(min-width:701px)').matches ||
    !!document.querySelector('.elara-private-drawer[data-mobile-section="home"][data-elara-view="avatar"]:not(.hidden)'));
  const ready = item => !!item && ['preview', 'ready'].includes(item.status) && typeof item.src === 'string' && item.src.startsWith('assets/avatar/') && /\.vrm(?:\?.*)?$/.test(item.src);
  const uid = () => window.ElaraProfileSystem?.currentUid?.() || null;
  const currentKind = () => {const system=window.ElaraProfileSystem,p=system?.readPrivate?.()||{};return ['male','female'].includes(p.avatarGender)?p.avatarGender:(['male','female'].includes(p.sex)?p.sex:(system?.readWardrobe?.()?.avatarGroup==='male'?'male':'female'));};
  const status = (stage, message, kind = '') => { const el = stage.querySelector('[data-elara-avatar-status]'); if (el) { el.textContent=message; el.dataset.state=kind; } };
  // Shared real-byte progress for model downloads and recorded VRMA files.
  // When a server omits Content-Length we show an indeterminate ring, never a fake percentage/ETA.
  function showDownload(stage,key,label,loaded=0,total=0,started=performance.now()){
    if(!stage?.isConnected)return;
    let root=stage.querySelector('[data-elara-avatar-download]');
    if(!root){
      root=document.createElement('div');
      root.className='elara-avatar-download';
      root.dataset.elaraAvatarDownload='';
      root.setAttribute('role','status');
      root.innerHTML='<span class="elara-avatar-download-ring" aria-hidden="true"></span><span class="elara-avatar-download-label"></span>';
      stage.append(root);
    }
    root.dataset.owner=key;
    const size=Number(total)||0,bytes=Number(loaded)||0;
    const known=size>0&&Number.isFinite(size)&&Number.isFinite(bytes);
    const ratio=known?Math.max(0,Math.min(1,bytes/size)):null;
    const percent=known?Math.floor(ratio*100):null;
    const elapsed=Math.max(0,(performance.now()-started)/1000);
    const remaining=known&&ratio>.08&&ratio<1&&elapsed>=1
      ?Math.ceil(elapsed*(size-bytes)/Math.max(bytes,1)):null;
    const eta=remaining!==null&&remaining<3600?Math.max(1,remaining):null;
    const caption=known?(percent+'٪'+(eta!==null?' · حدود '+eta+' ثانیه':'')):'در حال دریافت…';
    const ring=root.querySelector('.elara-avatar-download-ring');
    root.classList.toggle('is-indeterminate',!known);
    ring.style.setProperty('--elara-download-angle',(known?ratio*360:0)+'deg');
    root.querySelector('.elara-avatar-download-label').textContent=label+' '+caption;
    root.setAttribute('aria-label',label+' '+caption);
    window.dispatchEvent(new CustomEvent('elara:avatar-download-progress',{
      detail:{stage,key,label,loaded:bytes,total:size,percent,eta}
    }));
  }
  function clearDownload(stage,key){
    const root=stage?.querySelector('[data-elara-avatar-download]');
    if(root?.dataset.owner===key)root.remove();
  }
  const saved = kind => { try { if (!uid()) return ''; return JSON.parse(localStorage.getItem(PREFIX+uid()) || '{}')[kind] || ''; } catch { return ''; } };
  const save = (kind, id) => { try { if (!uid()) return; const key=PREFIX+uid(); const state=JSON.parse(localStorage.getItem(key)||'{}'); state[kind]=id; localStorage.setItem(key,JSON.stringify(state)); } catch (e) { console.warn('Elara VRM: could not save wardrobe choice',e); } };
  const importRuntime = () => Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('@pixiv/three-vrm')
  ]);
  async function loadGltfAsset(loader,src,stage,key,label,started){
    const progress=(loaded,total)=>showDownload(stage,key,label,loaded,total,started);
    if(!window.ElaraAvatarAssetCache?.load){
      return loader.loadAsync(src,event=>progress(event.loaded,event.total));
    }
    const result=await window.ElaraAvatarAssetCache.load(src,{
      accountId:uid()||'guest',onProgress:progress
    });
    // GLTFLoader.parseAsync keeps the exact original humanoid and facial materials;
    // the only difference is the bytes came from local browser storage.
    const baseURL=new URL('.',new URL(src,document.baseURI)).href;
    return loader.parseAsync(result.buffer,baseURL);
  }
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
      const started=performance.now(),downloadKey='model:'+kind;
      showDownload(stage,downloadKey,kind==='male'?'مدل مرد':'مدل زن',0,0,started);
      let gltf;
      try{
        gltf=await loadGltfAsset(loader,src,stage,downloadKey,
          kind==='male'?'مدل مرد':'مدل زن',started);
      }finally{clearDownload(stage,downloadKey);}
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
    let height=1.7, look=initialLook, disposed=false, replacing=false, yaw=0, targetYaw=0, zoom=1,
      pitch=0,targetPitch=0,panY=0,cameraOrbitDistance=4.6,cameraLookY=.98,cameraLookX=0,
      pointer=null, lastX=0, lastY=0, downX=0, downY=0, downAt=0,
      lastTime=performance.now(), focus='full', motion='idle', motionStarted=0, motionUntil=0;
    const focusHeights={full:.52,face:.865,torso:.63,legs:.30};
    const focusDistance={full:4.6,face:1.7,torso:2.3,legs:2.6};
    // Safely frame the real animated VRMA silhouette at every rendered pose.
    const danceFrame={distance:7.6,centerX:0,centerY:1.05,bounds:null};
    const danceJoints=['head','neck','chest','hips','leftShoulder','rightShoulder',
      'leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand',
      'leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot'];
    const dancePoint=new THREE.Vector3();
    function minimumDanceCameraZ(bounds,cameraX,cameraY,aspect,fov){
      const tangent=Math.tan(fov*Math.PI/360);
      const halfWidth=Math.max(Math.abs(bounds.minX-cameraX),Math.abs(bounds.maxX-cameraX));
      const halfHeight=Math.max(Math.abs(bounds.minY-cameraY),Math.abs(bounds.maxY-cameraY));
      // The nearest hand/foot depth matters for perspective, particularly on phones.
      return bounds.maxZ+Math.max(
        halfHeight/(tangent*.78),
        halfWidth/(tangent*Math.max(.25,aspect)*.78)
      );
    }
    function minimumDanceOrbitDistance(bounds,cameraX,cameraY,aspect,fov,pitch){
      const tangent=Math.tan(fov*Math.PI/360)*.78;
      const sp=Math.sin(pitch),cp=Math.cos(pitch);
      let required=0;
      for(const x of [bounds.minX,bounds.maxX]){
        for(const y of [bounds.minY,bounds.maxY]){
          for(const z of [bounds.minZ,bounds.maxZ]){
            const up=(y-cameraY)*cp-z*sp;
            const forward=(y-cameraY)*sp+z*cp;
            required=Math.max(required,forward+Math.max(
              Math.abs(x-cameraX)/(tangent*Math.max(.25,aspect)),
              Math.abs(up)/tangent
            ));
          }
        }
      }
      return Math.max(6.6,required);
    }
    function sampleDanceFrame(time){
      // No 10 Hz throttling: a fast jump could occur entirely between samples.
      anchor.updateMatrixWorld(true);
      const cos=Math.cos(yaw),sin=Math.sin(yaw);
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity,count=0;
      for(const name of danceJoints){
        const joint=bones[name]?.node;if(!joint)continue;
        joint.getWorldPosition(dancePoint);
        anchor.worldToLocal(dancePoint);
        const worldX=cos*dancePoint.x+sin*dancePoint.z;
        const worldZ=-sin*dancePoint.x+cos*dancePoint.z;
        minX=Math.min(minX,worldX);maxX=Math.max(maxX,worldX);
        minY=Math.min(minY,dancePoint.y);maxY=Math.max(maxY,dancePoint.y);
        minZ=Math.min(minZ,worldZ);maxZ=Math.max(maxZ,worldZ);count++;
      }
      if(count<3)return;
      // Joints lie inside the silhouette: reserve space for hair, hands and shoes.
      const bounds={minX:minX-.36,maxX:maxX+.36,minY:minY-.34,maxY:maxY+.34,minZ:minZ-.42,maxZ:maxZ+.42};
      danceFrame.bounds=bounds;
      danceFrame.centerX=(bounds.minX+bounds.maxX)/2;
      danceFrame.centerY=(bounds.minY+bounds.maxY)/2-.08;
      danceFrame.distance=Math.max(6.6,minimumDanceCameraZ(
        bounds,danceFrame.centerX,danceFrame.centerY,camera.aspect,camera.fov));
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bones = {};
    const Euler=new THREE.Euler(), q=new THREE.Quaternion();
    // Recorded VRMA head rotation may exceed the safe range on BOTH real VRMs.
    // Preserve original meshes, facial textures and whole-body dance tracks.
    function stabilizeDanceHead(){
      if(!usingVRMA||!motion.startsWith('dance'))return;
      for(const [name,limit] of [['neck',.20],['head',.34]]){
        const bone=bones[name];if(!bone)continue;
        const angle=bone.quat.angleTo(bone.node.quaternion);
        if(angle>limit)bone.node.quaternion.slerpQuaternions(
          bone.quat,bone.node.quaternion,limit/angle);
      }
    }
    const boneNames = ['head','neck','chest','spine','hips','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot',
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
    const motionOptions=['idle','smile','softSmile','wave','dance1','dance2','dance3'];
    let mixer=null,activeClip=null,usingVRMA=false,motionRequest=0;
    const loadedVRMA=new Map(),armRestZ={left:-.85,right:.85};
    function restoreBoneDefaults(){
      for(const b of Object.values(bones)){
        if(!b)continue;
        b.node.quaternion.copy(b.quat);
        b.node.position.copy(b.pos);
      }
    }
    function measureArmRest(){
      vrm.scene.updateMatrixWorld(true);
      for(const side of ['left','right']){
        const upper=bones[side+'UpperArm']?.node,elbow=bones[side+'LowerArm']?.node;
        if(!upper||!elbow)continue;
        const from=new THREE.Vector3(),to=new THREE.Vector3();
        upper.getWorldPosition(from);elbow.getWorldPosition(to);
        const v=to.sub(from);
        if(v.lengthSq()<.000001)continue;
        // Downward arm with a small gap from torso; never rotate by a hard-coded 90 degrees.
        const target=Math.atan2(-1,Math.sign(v.x|| (side==='left'?1:-1))*.35);
        const correction=target-Math.atan2(v.y,v.x);
        armRestZ[side]=Math.max(-1.2,Math.min(1.2,Math.atan2(Math.sin(correction),Math.cos(correction))));
      }
    }
    function stopClip(){
      activeClip?.stop();mixer?.stopAllAction();
      activeClip=null;usingVRMA=false;danceFrame.bounds=null;
      restoreBoneDefaults();
    }
    async function applyClip(name,token){
      const src=MOTION_SOURCES[name];if(!src)return false;
      const downloadKey='dance:'+token,started=performance.now();
      showDownload(stage,downloadKey,'در حال دریافت رقص',0,0,started);
      try{
        let promise=loadedVRMA.get(src);
        if(!promise){
          promise=(async()=>{
            const {VRMAnimationLoaderPlugin,createVRMAnimationClip}=await import('@pixiv/three-vrm-animation');
            const reader=new GLTFLoader();
            reader.register(parser=>new VRMAnimationLoaderPlugin(parser));
            const gltf=await loadGltfAsset(reader,src,stage,downloadKey,
              'در حال دریافت رقص',started);
            const anim=gltf.userData.vrmAnimations?.[0];
            if(!anim||!anim.humanoidTracks?.rotation?.size)throw Error('VRMA contains no humanoid rotation tracks');
            return {anim,createVRMAnimationClip};
          })();
          loadedVRMA.set(src,promise);
        }
        const {anim,createVRMAnimationClip}=await promise;
        if(disposed||token!==motionRequest||!stage.isConnected)return false;
        const clip=createVRMAnimationClip(anim,vrm);
        if(!clip?.tracks?.length||!Number.isFinite(clip.duration)||clip.duration<=0)throw Error('Invalid VRMA clip');
        stopClip();
        // An emote should begin in the full-body view even if the user
        // previously zoomed into the face, torso or shoes.
        selectFocus('full');
        danceFrame.bounds=null;
        if(!mixer)mixer=new THREE.AnimationMixer(vrm.scene);
        const next=mixer.clipAction(clip);
        next.reset().setLoop(THREE.LoopOnce,1);
        next.clampWhenFinished=true;
        next.fadeIn(.25).play();
        activeClip=next;usingVRMA=true;motion=name;motionStarted=elapsed;
        motionUntil=elapsed+clip.duration;
        stage.dataset.avatarMotion=motion;
        stage.dataset.avatarMotionState='playing';
        window.dispatchEvent(new CustomEvent('elara:avatar-motion-started',{detail:{stage,name,duration:clip.duration}}));
        return true;
      }catch(error){
        loadedVRMA.delete(src);
        console.warn('Elara: cannot load the selected VRMA',name,error);
        if(token===motionRequest){
          stage.dataset.avatarMotionState='error';
          window.dispatchEvent(new CustomEvent('elara:avatar-motion-error',{detail:{stage,name}}));
        }
        return false;
      }finally{clearDownload(stage,downloadKey);}
    }
    function setAction(name='idle'){
      if(!motionOptions.includes(name))return false;
      const token=++motionRequest;
      if(MOTION_SOURCES[name]){
        stage.dataset.avatarMotionState='loading';
        window.dispatchEvent(new CustomEvent('elara:avatar-motion-loading',{detail:{stage,name}}));
        return applyClip(name,token);
      }
      stopClip();motion=name;motionUntil=0;motionStarted=elapsed;
      stage.dataset.avatarMotion=motion;stage.dataset.avatarMotionState='ready';
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
      mixer?.stopAllAction();mixer=new THREE.AnimationMixer(vrm.scene);
      activeClip=null;usingVRMA=false;motionRequest++;
      measureArmRest();
      if(vrm.lookAt){vrm.lookAt.autoUpdate=false;vrm.lookAt.target=null;} // No automatic convergence / cross-eyed focus.
      const aspect=viewport.clientWidth/Math.max(viewport.clientHeight,1);
      focus='full';zoom=1;pitch=targetPitch=panY=0;
      cameraLookX=0;cameraLookY=height*.52;cameraOrbitDistance=aspect<.8?4.85:4.6;
      camera.position.set(0,cameraLookY,cameraOrbitDistance);
      camera.lookAt(0,cameraLookY,0);
    }
    attach(vrm);

    const interfaceNode=document.createElement('div');
    interfaceNode.className='elara-live-controls';
    interfaceNode.innerHTML = '<div class="elara-live-actions"><button type="button" data-live-action="front">نمای روبه‌رو</button><button type="button" data-live-action="reset">بازگشت به حالت اولیه</button></div>'+
      '<nav class="elara-avatar-zone-buttons" aria-label="زوم کاراکتر"><button type="button" data-avatar-focus="face" aria-pressed="false">صورت</button><button type="button" data-avatar-focus="torso" aria-pressed="false">تنه</button><button type="button" data-avatar-focus="legs" aria-pressed="false">پاها</button></nav>'+
      '<nav class="elara-avatar-side-shortcuts" aria-label="تنظیمات سریع کاراکتر"><button type="button" data-avatar-open-character-settings>تنظیمات</button><button type="button" data-avatar-toggle-gender aria-label="تغییر مدل بین زن و مرد">زن/مرد</button></nav>'+
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
      focus=next;zoom=1;panY=0;targetPitch=0;
      mouse.x=mouse.y=0;smoothMouse.x=smoothMouse.y=0;
      if(next!=='full')targetYaw=0;
      focusReturn.hidden=next==='full';
      focusButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.avatarFocus===next)));
    }
    function resetView(){
      setAction('idle');
      selectFocus('full');
      yaw=targetYaw=0;pitch=targetPitch=0;panY=0;zoom=1;
      cameraLookX=0;cameraLookY=height*.52;
      cameraOrbitDistance=viewport.clientWidth/Math.max(1,viewport.clientHeight)<.8?4.85:4.6;
      mouse.x=mouse.y=0;smoothMouse.x=smoothMouse.y=0;
      window.dispatchEvent(new CustomEvent('elara:avatar-motion-ended',{detail:{stage}}));
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
        motion='idle';motionUntil=0;stage.dataset.avatarMotion='idle';
        setAction('idle');
        look=item;save(kind,item.id);renderWardrobe();status(stage,'مدل سه‌بعدی آماده است','ready');
      }catch(error) {
        console.error('Elara VRM outfit failed',error);
        status(stage,'این لباس بارگذاری نشد؛ مدل قبلی حفظ شد','error');
      }finally{replacing=false;renderWardrobe();}
    }

    interfaceNode.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.hasAttribute('data-avatar-open-character-settings')){
        window.ElaraWardrobeUI?.open?.('character');return;
      }
      if(b.hasAttribute('data-avatar-toggle-gender')){
        const profile=window.ElaraProfileSystem;
        if(profile?.writePrivate)profile.writePrivate({avatarGender:kind==='male'?'female':'male'});
        return;
      }
      if(b.dataset.avatarFocus){selectFocus(b.dataset.avatarFocus);}
      else if(b.hasAttribute('data-live-focus-return'))selectFocus('full');
      else if(b.dataset.liveAction==='reset')resetView();
      else if(b.dataset.liveAction==='front'){targetYaw=0;targetPitch=0;panY=0;mouse.x=0;mouse.y=0;}
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
    function move(e){
      if(pointer!==e.pointerId)return;
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      targetYaw+=dx*.008;
      targetPitch=clamp(targetPitch+dy*.004,-1.05,1.05);
      // While viewing face/torso/legs, vertical dragging also travels down/up the body.
      if(focus!=='full')panY=clamp(panY-dy*.003,-1.15,1.15);
      lastX=e.clientX;lastY=e.clientY;e.preventDefault();
    }
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
    // Idle stays local. Missing remote files must never hide the avatar's hands.
    stage.dataset.avatarMotion='idle';stage.dataset.avatarMotionState='ready';
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
      if(motionUntil&&t>=motionUntil){
        setAction('idle');
        window.dispatchEvent(new CustomEvent('elara:avatar-motion-ended',{detail:{stage}}));
      }
      yaw+=(targetYaw-yaw)*Math.min(1,dt*8);
      anchor.rotation.y=yaw;
      const dancingNow=usingVRMA&&motion.startsWith('dance');
      // User-picked face/torso/legs view stays selected during recorded dances.
      const follow=1-Math.exp(-dt*5);
      smoothMouse.x+=(mouse.x-smoothMouse.x)*follow;
      smoothMouse.y+=(mouse.y-smoothMouse.y)*follow;
      if(!usingVRMA){
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
      const dancing=motion.startsWith('dance')&&!reduced;
      const dancingT=t-motionStarted;
      const sway=Math.sin(dancingT*(motion==='dance2'?6:4.2));
      const lift=dancing?1:0;
      const breath=Math.sin(t*1.5);
      poseBone('chest',breath*.016*amp,Math.sin(t*.37)*.008*amp,Math.sin(t*.51)*.005*amp);
      poseBone('spine',breath*.008*amp,0,Math.sin(t*.46)*.006*amp);
      // VRM normalized rest arms begin in A/T pose: rotate downward but keep
      // relaxed elbows and palms, never lock fingers into a rigid cylinder.
      let leftArm=armRestZ.left,rightArm=armRestZ.right,leftElbow=-.12,rightElbow=.12;
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
      poseBone('leftHand',.03*amp,0,-.035+Math.sin(t*.39)*.007*amp);
      // Show the palm (rather than the hand's thin side) during greeting.
      // Preserve authored finger angles and gently turn the wrist only.
      if(motion==='wave')poseBone('rightHand',.10,-1.04,.08+Math.sin(t*4.5)*.13);
      else poseBone('rightHand',.03*amp,0,.035-Math.sin(t*.39+.7)*.007*amp);
      // Keep the sculpted VRM hand and finger resting rotations. Artificial per-frame
      // finger curling distorted this model; authored relaxed fingers look better.
      const hips=bones.hips;
      if(hips){hips.node.position.copy(hips.pos);hips.node.position.y+=Math.sin(t*1.55)*.003*amp + (dancing?Math.abs(sway)*.013*amp:0);hips.node.position.x+=dancing?.032*sway*amp:0;}
      }else if(motion==='wave'){
        // Local greeting is additive to the neutral arm pose.
        poseBone('rightUpperArm',-.17,0,armRestZ.right-.65+.10*Math.sin(t*5));
        poseBone('rightLowerArm',-.22,0,.38);
        poseBone('rightHand',.10,-1.04,.08+Math.sin(t*4.5)*.13);
      }
      if(t>=nextBlink){blinkStart=t;blinkDuration=.13+Math.random()*.07;nextBlink=t+2.7+Math.random()*3.6;}
      const p=(t-blinkStart)/blinkDuration;
      const blink=p>=0&&p<=1?Math.sin(Math.PI*p):0;
      try{vrm.expressionManager?.setValue('blink',blink*amp);}catch{}
      mixer?.update(dt);
      stabilizeDanceHead();
      // Layer the greeting on top of the idle VRMA; never write it before mixer.update.
      if(usingVRMA&&motion==='wave'){
        poseBone('rightUpperArm',-.17,0,armRestZ.right-.65+.10*Math.sin(t*5));
        poseBone('rightLowerArm',-.22,0,.38);
        poseBone('rightHand',.10,-1.04,.08+Math.sin(t*4.5)*.13);
      }
      // Respect animation-authored facial tracks. Small closed-mouth expressions
      // are layered only for explicit smile/wave, not exaggerated happy=0.65.
      const normalSmile=motion==='smile', cuteSmile=motion==='softSmile', greeting=motion==='wave';
      if(normalSmile||cuteSmile||greeting||!usingVRMA){
        const em=vrm.expressionManager;
        // Softer closed-mouth expressions, without the overly open VRoid grin.
        try{em?.setValue('happy',normalSmile?.075:cuteSmile?.025:greeting?.045:0);}catch{}
        try{em?.setValue('relaxed',normalSmile?.23:cuteSmile?.19:greeting?.12:.045);}catch{}
        if(normalSmile||cuteSmile||greeting){
          for(const shape of ['aa','ih','ou','ee','oh']){
            try{em?.setValue(shape,0);}catch{}
          }
        }
      }
      vrm.update(dt); // VRM lookAt, expressions and spring bones
      // Follow the actual animated pose, also when the user orbits vertically.
      if(dancingNow)sampleDanceFrame(t);
      const tall=viewport.clientWidth/Math.max(1,viewport.clientHeight)<.8;
      const normalDistance=(focus==='full'?(tall?4.85:4.6):focusDistance[focus]*(tall?1.12:1))*zoom;
      const fitted=dancingNow&&focus==='full'&&danceFrame.bounds;
      const targetHeight=(fitted?danceFrame.centerY:height*focusHeights[focus])+panY;
      const targetX=fitted?danceFrame.centerX:0;
      const cameraFollow=1-Math.exp(-dt*(fitted?9:4.5));
      cameraLookY+=(targetHeight-cameraLookY)*cameraFollow;
      cameraLookX+=(targetX-cameraLookX)*cameraFollow;
      pitch+=(targetPitch-pitch)*Math.min(1,dt*9);
      const required=fitted?minimumDanceOrbitDistance(
        danceFrame.bounds,cameraLookX,cameraLookY,camera.aspect,camera.fov,pitch):0;
      const dest=fitted?Math.max(normalDistance,required):normalDistance;
      cameraOrbitDistance+=(dest-cameraOrbitDistance)*cameraFollow;
      if(fitted)cameraOrbitDistance=Math.max(cameraOrbitDistance,required);
      // Actual orbit around the selected vertical body position (not a face roll).
      camera.position.set(cameraLookX,
        cameraLookY+Math.sin(pitch)*cameraOrbitDistance,
        Math.cos(pitch)*cameraOrbitDistance);
      camera.lookAt(cameraLookX,cameraLookY,0);
      renderer.render(scene,camera);
    }
    raf=requestAnimationFrame(frame);
    stage.dataset.avatarMounted='live';
    status(stage,'Elara · زنده','ready');

    function dispose() {
      if(disposed)return;disposed=true;cancelAnimationFrame(raf);ro.disconnect();
      window.removeEventListener('elara:profile-private-changed',changeKind);
      window.removeEventListener('pointermove',trackPointer);window.removeEventListener('blur',resetPointer);
      stopClip();mixer=null;
      panel.remove();interfaceNode.remove();renderer.dispose();canvas.remove();disposeMeshes(THREE,vrm.scene);
      stage.dataset.avatarMounted='';
      if(window.ElaraLiveVRM?.current?.stage===stage)window.ElaraLiveVRM.current=null;
    }
    window.ElaraLiveVRM.current={stage,dispose,renderWardrobeControls,focus:selectFocus,setAction,
      get action(){return motion;},get look(){return look.id;},get kind(){return kind;},
      get view(){return {focus,yaw,pitch,panY,zoom,distance:cameraOrbitDistance};}};
    window.dispatchEvent(new Event('elara:live-avatar-mounted'));
    return true;
  }

  async function tryMount(stage) {
    if(!stage||!enabled(stage))return false;
    const kind=currentKind();
    stage.dataset.avatarKind=kind;
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
    // The import map and VRM runtime may still be downloading before the GLTF loader starts.
    showDownload(stage,'model:'+kind,kind==='male'?'مدل مرد':'مدل زن');
    try {
      return await mount(stage,config,kind,base);
    } catch(err) {
      console.warn('Elara VRM: real model load failed; no synthetic model will be used',err);
      stage.dataset.avatarFallbackReason='vrm-download-or-render-failed';
      status(stage,kind==='male'?'فایل مدل مردانه در سایت موجود نیست.':'بارگذاری مدل واقعی انجام نشد.','error');
      return false;
    } finally {clearDownload(stage,'model:'+kind);}
  }
  window.ElaraLiveVRM={tryMount,current:null,version:'vrm-only-production-v2'};
  // The retired procedural renderer used to discover/profile-mount the real
  // VRM. Keep that responsibility here so its removal does not break the
  // female model or the male model after the real asset is uploaded.
  const pending=new WeakMap();
  function discover(){
    const stage=[...document.querySelectorAll('[data-elara-avatar-stage]')]
      .find(node=>!node.closest('.elara-avatar-quick-modal')&&node.isConnected&&node.offsetParent!==null);
    if(!stage||!enabled(stage)||window.ElaraLiveVRM.current?.stage===stage||
      pending.has(stage)||stage.dataset.avatarMounted==='unavailable')return;
    const job=(async()=>{
      try{
        const ok=await tryMount(stage);
        if(!ok&&stage.isConnected){
          stage.dataset.avatarMounted='unavailable';
          const kind=currentKind(),el=stage.querySelector('[data-elara-avatar-status]');
          if(el&&!el.textContent.trim()){
            status(stage,kind==='male'?'مدل واقعی مرد هنوز در سایت وجود ندارد.':'مدل واقعی در دسترس نیست.','error');
          }
        }
      }catch(error){
        stage.dataset.avatarMounted='unavailable';
        status(stage,'بارگذاری مدل واقعی انجام نشد.','error');
        console.warn('Elara VRM-only stage load failed',error);
      }finally{pending.delete(stage);}
    })();
    pending.set(stage,job);
  }
  window.addEventListener('elara:avatar-stage-ready',discover);
  window.addEventListener('elara:profile-private-changed',()=>{
    for(const stage of document.querySelectorAll('[data-elara-avatar-stage]')){
      if(!stage.closest('.elara-avatar-quick-modal')&&stage.dataset.avatarMounted==='unavailable')
        stage.dataset.avatarMounted='';
    }
    // A real mounted VRM already handles gender changes and disposes itself.
    queueMicrotask(discover);
  });
  window.addEventListener('resize',discover,{passive:true});
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',discover,{once:true});
  else queueMicrotask(discover);
})();