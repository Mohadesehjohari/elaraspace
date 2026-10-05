/* Elara Desktop 3D Avatar — procedural base v1.
   Desktop-only. The public contract stays stable so a production VRM/GLB can
   replace the procedural mesh later without changing the profile drawer. */
(() => {
  'use strict';
  const DESKTOP='(min-width: 701px)';
  const THREE_PRIMARY='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
  const THREE_FALLBACK='https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js';
  let threePromise=null,current=null;
  const desktop=()=>window.matchMedia?.(DESKTOP)?.matches!==false;
  const profileSex=()=>window.ElaraProfileSystem?.readPrivate?.()?.sex||'';
  const avatarBase=()=>profileSex()==='male'?'male':'female';
  const loadThree=()=>threePromise||(threePromise=import(THREE_PRIMARY).catch(()=>import(THREE_FALLBACK)));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ease=(a,b,t)=>a+(b-a)*t;

  function status(stage,text,state=''){
    const el=stage?.querySelector('[data-elara-avatar-status]');
    if(!el)return;
    el.textContent=text||'';
    el.dataset.state=state;
  }

  function mat(THREE,color,roughness=.72,metalness=.015){
    return new THREE.MeshStandardMaterial({color,roughness,metalness});
  }

  function ellipsoid(THREE,parent,geo,material,position,scale,name=''){
    const mesh=new THREE.Mesh(geo,material);
    mesh.position.set(...position);mesh.scale.set(...scale);mesh.name=name;
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    return mesh;
  }

  function cylinder(THREE,parent,material,rTop,rBottom,height,position,rot=[0,0,0],segments=24,name=''){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,height,segments,3,false),material);
    mesh.position.set(...position);mesh.rotation.set(...rot);mesh.name=name;
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    return mesh;
  }

  function tube(THREE,parent,material,points,radius=.016,segments=20,radial=7,name=''){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,radial,false),material);
    mesh.name=name;mesh.castShadow=true;parent.add(mesh);return mesh;
  }

  function hairLock(THREE,parent,material,o){
    const pivot=new THREE.Group();
    pivot.position.set(...o.root);pivot.rotation.x=o.rx||0;pivot.rotation.z=o.rz||0;parent.add(pivot);
    const geo=THREE.CapsuleGeometry
      ?new THREE.CapsuleGeometry(o.radius,Math.max(.08,o.length-o.radius*2),7,12)
      :new THREE.CylinderGeometry(o.radius*.52,o.radius,o.length,14,3,false);
    const lock=new THREE.Mesh(geo,material);
    lock.position.y=-o.length*.49;lock.scale.z=.50;lock.castShadow=true;pivot.add(lock);
    pivot.userData.hair={phase:o.phase||0,stiffness:10,damping:.83,vx:0,vz:0,baseX:o.rx||0,baseZ:o.rz||0};
    return pivot;
  }

  function createFace(THREE,head,m,isMale,refs){
    const eyeY=isMale?.15:.12,eyeX=isMale?.155:.165;
    const eyeScale=isMale?[.17,.066,.052]:[.185,.078,.056];
    refs.eyes=[];
    for(const s of [-1,1]){
      const group=new THREE.Group();group.position.set(s*eyeX,eyeY,.426);head.add(group);
      const white=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),m.eyeWhite);white.scale.set(...eyeScale);group.add(white);
      const iris=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),m.iris);iris.position.z=.052;iris.scale.set(eyeScale[0]*.42,eyeScale[1]*.71,.026);group.add(iris);
      refs.eyes.push(group);
      tube(THREE,head,m.brow,[[-.11+s*eyeX,eyeY+.135,.43],[s*eyeX,eyeY+.153,.444],[.11+s*eyeX,eyeY+.135,.43]],.011,12,6,'brow');
    }
    const nose=new THREE.Mesh(new THREE.ConeGeometry(isMale?.045:.037,isMale?.18:.15,16),m.skin);
    nose.rotation.x=Math.PI/2;nose.position.set(0,-.035,.49);head.add(nose);
    tube(THREE,head,m.mouth,[[-.095,-.205,.447],[0,-.221,.461],[.095,-.205,.447]],.0105,12,6,'mouth');
  }

  function createHair(THREE,root,m,isMale,refs){
    const hairRoot=new THREE.Group();hairRoot.name='hair';root.add(hairRoot);refs.hair=[];
    const headY=5.82;
    const cap=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),m.hair);
    cap.position.set(0,headY+.13,-.10);cap.scale.set(isMale?.48:.52,isMale?.61:.66,.43);cap.castShadow=true;hairRoot.add(cap);
    const lobes=[[-.22,.31,.01,.27,.35,.24],[.22,.29,.01,.27,.34,.24],[0,.39,-.02,.31,.32,.25],[-.34,.10,-.02,.19,.43,.19],[.34,.10,-.02,.19,.43,.19]];
    for(const [x,y,z,sx,sy,sz] of lobes)ellipsoid(THREE,hairRoot,new THREE.SphereGeometry(1,22,15),m.hairHi,[x,headY+y,z-.07],[sx,sy,sz],'hair-volume');
    const locks=isMale?[
      {root:[-.34,headY+.30,.04],length:.83,radius:.095,rz:-.26,phase:.1},
      {root:[.34,headY+.30,.04],length:.78,radius:.09,rz:.25,phase:.8},
      {root:[-.42,headY+.09,-.03],length:.86,radius:.09,rz:-.13,phase:1.4},
      {root:[.42,headY+.08,-.04],length:.84,radius:.09,rz:.14,phase:2.0},
      {root:[-.22,headY+.48,.13],length:.65,radius:.075,rz:-.38,rx:.12,phase:2.8},
      {root:[.18,headY+.49,.14],length:.61,radius:.075,rz:.42,rx:.10,phase:3.4},
      {root:[0,headY+.52,-.08],length:.90,radius:.10,rx:-.16,phase:4.1}
    ]:[
      {root:[-.38,headY+.22,.03],length:1.05,radius:.105,rz:-.18,phase:.2},
      {root:[.38,headY+.22,.03],length:1.02,radius:.105,rz:.18,phase:.9},
      {root:[-.45,headY+.01,-.05],length:1.10,radius:.11,rz:-.08,phase:1.6},
      {root:[.45,headY+.01,-.05],length:1.08,radius:.11,rz:.08,phase:2.2},
      {root:[-.25,headY+.47,.16],length:.90,radius:.085,rz:-.34,rx:.10,phase:2.9},
      {root:[.23,headY+.47,.16],length:.88,radius:.085,rz:.34,rx:.10,phase:3.6},
      {root:[0,headY+.52,-.09],length:1.16,radius:.115,rx:-.14,phase:4.2},
      {root:[-.14,headY+.38,.31],length:.68,radius:.066,rz:-.13,rx:.18,phase:4.8},
      {root:[.15,headY+.38,.31],length:.67,radius:.066,rz:.13,rx:.18,phase:5.2}
    ];
    for(const o of locks)refs.hair.push(hairLock(THREE,hairRoot,m.hair,o));
  }

  function createAvatar(THREE,kind='female'){
    const isMale=kind==='male',model=new THREE.Group(),refs={hair:[],eyes:[],arms:[]};
    model.name='elara-'+kind+'-procedural-v1';
    const m={
      skin:mat(THREE,isMale?0xffdfce:0xffe5d8,.66),
      suit:mat(THREE,isMale?0xd6c2b5:0xddc8bc,.82),
      suitShade:mat(THREE,isMale?0xc5ac9f:0xccb3a7,.86),
      hair:mat(THREE,isMale?0x925552:0xae646b,.60),
      hairHi:mat(THREE,isMale?0xb47369:0xce858b,.57),
      eyeWhite:mat(THREE,0xfff8f4,.54),
      iris:mat(THREE,isMale?0x463538:0x514044,.46),
      brow:mat(THREE,isMale?0x684043:0x74454a,.68),
      mouth:mat(THREE,0xb06b70,.68)
    };
    const sphere=new THREE.SphereGeometry(1,32,22);
    const root=new THREE.Group();root.name='body-root';model.add(root);refs.root=root;
    const torso=new THREE.Group();root.add(torso);refs.torso=torso;
    const hips=isMale?[.50,.42,.33]:[.54,.42,.34];
    const waist=isMale?[.40,.66,.30]:[.365,.69,.285];
    const chest=isMale?[.56,.62,.33]:[.47,.60,.315];
    ellipsoid(THREE,torso,sphere,m.suit,[0,3.63,0],hips,'pelvis');
    ellipsoid(THREE,torso,sphere,m.suit,[0,4.22,0],waist,'waist');
    const chestMesh=ellipsoid(THREE,torso,sphere,m.suit,[0,4.78,0],chest,'chest');refs.chest=chestMesh;
    cylinder(THREE,root,m.suit,.14,.16,.43,[0,5.27,0],[],24,'neck');

    const head=new THREE.Group();head.position.set(0,5.75,0);root.add(head);refs.head=head;
    ellipsoid(THREE,head,sphere,m.skin,[0,0,0],[isMale?.39:.385,isMale?.49:.51,isMale?.38:.39],'head');
    ellipsoid(THREE,head,sphere,m.skin,[-.395,.02,-.01],[.052,.09,.033],'ear');
    ellipsoid(THREE,head,sphere,m.skin,[.395,.02,-.01],[.052,.09,.033],'ear');
    createFace(THREE,head,m,isMale,refs);

    const hipX=isMale?.28:.295;
    for(const s of [-1,1]){
      cylinder(THREE,root,m.suit,isMale?.16:.152,isMale?.125:.118,1.61,[s*hipX,2.73,0],[0,0,s*.022],28,'upper-leg');
      ellipsoid(THREE,root,sphere,m.suit,[s*hipX,1.91,.01],[.145,.155,.14],'knee');
      cylinder(THREE,root,m.suitShade,isMale?.125:.118,isMale?.088:.082,1.61,[s*hipX,1.10,.015],[0,0,-s*.012],24,'lower-leg');
      ellipsoid(THREE,root,sphere,m.suit,[s*hipX,.26,.13],[isMale?.145:.135,.145,.30],'foot');
      ellipsoid(THREE,root,sphere,m.suit,[s*hipX,.17,.29],[isMale?.135:.128,.08,.27],'toe');
    }

    const shoulderX=isMale?.585:.515;
    for(const s of [-1,1]){
      const arm=new THREE.Group();arm.position.set(s*shoulderX,4.93,0);root.add(arm);refs.arms.push(arm);
      ellipsoid(THREE,arm,sphere,m.suit,[0,0,0],[.16,.18,.16],'shoulder');
      cylinder(THREE,arm,m.suit,isMale?.105:.094,isMale?.084:.073,1.09,[s*.012,-.63,0],[0,0,s*.018],22,'upper-arm');
      ellipsoid(THREE,arm,sphere,m.suit,[s*.02,-1.17,0],[.095,.105,.09],'elbow');
      cylinder(THREE,arm,m.suitShade,isMale?.084:.073,isMale?.061:.056,1.05,[s*.03,-1.72,.01],[0,0,s*.014],20,'forearm');
      ellipsoid(THREE,arm,sphere,m.suit,[s*.035,-2.31,.07],[isMale?.086:.078,.18,.095],'hand');
      cylinder(THREE,arm,m.suit,.055,.030,.28,[s*.035,-2.50,.08],[0,0,s*.018],16,'fingers');
    }

    createHair(THREE,root,m,isMale,refs);
    tube(THREE,root,m.suitShade,[[-.27,5.03,.29],[0,4.95,.34],[.27,5.03,.29]],.011,18,6,'collarbone-seam');
    refs.baseScales={chest:chestMesh.scale.clone()};
    model.userData={kind,refs};
    return model;
  }

  async function mount(stage){
    if(!stage||stage.dataset.avatarMounted==='yes'||!desktop())return;
    stage.dataset.avatarMounted='yes';status(stage,'در حال آماده‌سازی آواتار سه‌بعدی…','loading');
    let THREE;
    try{THREE=await loadThree()}
    catch(error){
      console.error('Elara Avatar: Three.js failed to load',error);
      status(stage,'نمای سه‌بعدی در دسترس نیست.','error');stage.dataset.avatarMounted='error';return;
    }
    if(!stage.isConnected||!desktop()){stage.dataset.avatarMounted='';return}

    const viewport=stage.querySelector('[data-elara-avatar-viewport]');if(!viewport)return;
    let renderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true})}
    catch(error){
      console.error('Elara Avatar: WebGL unavailable',error);
      status(stage,'WebGL روی این دستگاه در دسترس نیست.','error');stage.dataset.avatarMounted='error';return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.className='elara-avatar-canvas';
    renderer.domElement.setAttribute('aria-label','کاراکتر سه‌بعدی؛ برای چرخاندن درگ کن');
    viewport.replaceChildren(renderer.domElement);

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(31,1,.1,50);camera.position.set(0,3.18,11.3);camera.lookAt(0,3.15,0);let cameraZ=11.3;
    scene.add(new THREE.HemisphereLight(0xcbd9ff,0x24334d,2.25));
    const key=new THREE.DirectionalLight(0xffe8df,4.2);key.position.set(3.6,7.4,5.1);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
    const rim=new THREE.DirectionalLight(0x8f79ff,3.3);rim.position.set(-4.5,5.4,-3.5);scene.add(rim);
    const fill=new THREE.PointLight(0x8dd7ff,2.2,18);fill.position.set(-2.4,3.2,4.0);scene.add(fill);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(1.65,64),new THREE.MeshBasicMaterial({color:0x6f5cff,transparent:true,opacity:.10,depthWrite:false}));
    glow.rotation.x=-Math.PI/2;glow.position.y=.02;scene.add(glow);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.30,64),new THREE.ShadowMaterial({opacity:.20}));
    shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;shadow.receiveShadow=true;scene.add(shadow);

    let avatar=createAvatar(THREE,avatarBase());scene.add(avatar);
    let refs=avatar.userData.refs,targetYaw=.08,yaw=.08,velocity=0,lastX=0,pointerId=null,dancingUntil=0,disposed=false,lastTime=performance.now(),lastUserAction=performance.now();
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const resize=()=>{const r=viewport.getBoundingClientRect();if(r.width<2||r.height<2)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()};
    const ro=new ResizeObserver(resize);ro.observe(viewport);resize();

    function rebuild(){
      const wanted=avatarBase();if(avatar.userData.kind===wanted)return;
      scene.remove(avatar);
      avatar.traverse?.(o=>{o.geometry?.dispose?.();if(o.material&&Array.isArray(o.material))o.material.forEach(x=>x.dispose?.());else o.material?.dispose?.()});
      avatar=createAvatar(THREE,wanted);scene.add(avatar);refs=avatar.userData.refs;
      status(stage,wanted==='male'?'مدل پایه مرد':'مدل پایه زن','ready');
    }

    function down(e){
      if(e.button!==undefined&&e.button!==0)return;
      pointerId=e.pointerId;lastX=e.clientX;velocity=0;lastUserAction=performance.now();
      renderer.domElement.setPointerCapture?.(pointerId);stage.classList.add('is-dragging');e.preventDefault();
    }
    function move(e){
      if(pointerId!==e.pointerId)return;
      const dx=e.clientX-lastX;lastX=e.clientX;const delta=dx*.011;
      targetYaw+=delta;velocity=delta*3;lastUserAction=performance.now();e.preventDefault();
    }
    function up(e){
      if(pointerId!==e.pointerId)return;
      pointerId=null;stage.classList.remove('is-dragging');renderer.domElement.releasePointerCapture?.(e.pointerId);
    }
    function wheel(e){
      cameraZ=clamp(cameraZ+Math.sign(e.deltaY)*.42,9.45,13.15);lastUserAction=performance.now();e.preventDefault();
    }
    renderer.domElement.addEventListener('pointerdown',down,{passive:false});
    renderer.domElement.addEventListener('pointermove',move,{passive:false});
    renderer.domElement.addEventListener('pointerup',up);
    renderer.domElement.addEventListener('pointercancel',up);
    renderer.domElement.addEventListener('wheel',wheel,{passive:false});

    const edit=stage.querySelector('[data-elara-avatar-edit]');
    if(edit)edit.addEventListener('click',()=>window.ElaraProfileSystem?.openEditor?.());
    const sex=profileSex();
    status(stage,sex==='male'?'مدل پایه مرد':sex==='female'?'مدل پایه زن':'مدل پایه زن · از ویرایش پروفایل قابل تغییر','ready');

    const privateChange=()=>{
      rebuild();const s=profileSex();
      status(stage,s==='male'?'مدل پایه مرد':s==='female'?'مدل پایه زن':'مدل پایه زن · از ویرایش پروفایل قابل تغییر','ready');
    };
    window.addEventListener('elara:profile-private-changed',privateChange);

    function play(name='dance'){
      if(name==='dance'){dancingUntil=performance.now()+7200;lastUserAction=performance.now();return true}
      return false;
    }
    function dispose(){
      if(disposed)return;disposed=true;ro.disconnect();
      window.removeEventListener('elara:profile-private-changed',privateChange);
      renderer.dispose();stage.dataset.avatarMounted='';
    }
    function active(){return stage.isConnected&&desktop()&&stage.offsetParent!==null&&!document.hidden}

    function frame(now){
      if(disposed)return;requestAnimationFrame(frame);
      if(!stage.isConnected){dispose();return}
      const dt=Math.min(.04,Math.max(.001,(now-lastTime)/1000));lastTime=now;
      if(!active())return;
      const t=now/1000,dancing=now<dancingUntil,idleAmp=reduced?.25:1;

      if(pointerId===null){
        targetYaw+=velocity;velocity*=Math.pow(.87,dt*60);
        if(Math.abs(velocity)<.00002)velocity=0;
      }
      yaw=ease(yaw,targetYaw,1-Math.pow(.001,dt));avatar.rotation.y=yaw;
      camera.position.z=ease(camera.position.z,cameraZ,1-Math.pow(.02,dt));camera.lookAt(0,3.18,0);

      refs.root.position.y=(Math.sin(t*1.22)*.012+(dancing?Math.abs(Math.sin(t*5.8))*.055:0))*idleAmp;
      refs.torso.rotation.z=(Math.sin(t*.76)*.006+(dancing?Math.sin(t*4.0)*.065:0))*idleAmp;
      refs.torso.rotation.y=(Math.sin(t*.52)*.010+(dancing?Math.sin(t*2.4)*.10:0))*idleAmp;
      refs.head.rotation.y=(Math.sin(t*.58)*.045+(dancing?Math.sin(t*3.1)*.13:0))*idleAmp;
      refs.head.rotation.z=Math.sin(t*.44)*.012*idleAmp;

      if(refs.chest){
        const base=refs.baseScales.chest,breath=1+Math.sin(t*1.33)*.006*idleAmp;
        refs.chest.scale.set(base.x*breath,base.y*(1+Math.sin(t*1.33)*.004*idleAmp),base.z*breath);
      }
      refs.arms.forEach((arm,i)=>{
        const s=i===0?-1:1;
        arm.rotation.z=(Math.sin(t*.82+s)*.014+(dancing?s*(.28+.18*Math.sin(t*3.4)):0))*idleAmp;
        arm.rotation.x=(dancing?Math.sin(t*3.4+s)*.22:Math.sin(t*.67+s)*.008)*idleAmp;
      });
      const blink=(t%4.9)>4.70&&((t%4.9)<4.86);
      refs.eyes.forEach(e=>{e.scale.y=blink?.16:1});

      const spin=clamp(velocity*5,-.28,.28);
      refs.hair.forEach((p,i)=>{
        const h=p.userData.hair;if(!h)return;
        const wind=(Math.sin(t*(1.05+i*.025)+h.phase)*.022+spin*(i%2?1:-1))*idleAmp;
        const targetX=h.baseX+Math.sin(t*.93+h.phase)*.018*idleAmp;
        const targetZ=h.baseZ+wind+(dancing?Math.sin(t*4.1+h.phase)*.045:0)*idleAmp;
        h.vx=(h.vx+(targetX-p.rotation.x)*h.stiffness*dt)*Math.pow(h.damping,dt*60);
        h.vz=(h.vz+(targetZ-p.rotation.z)*h.stiffness*dt)*Math.pow(h.damping,dt*60);
        p.rotation.x+=h.vx;p.rotation.z+=h.vz;
      });

      if(pointerId===null&&now-lastUserAction>9000&&!dancing&&!reduced)targetYaw+=Math.sin(t*.18)*.000055;
      renderer.render(scene,camera);
    }
    requestAnimationFrame(frame);

    current={stage,play,dispose,rebuild};
    window.ElaraAvatar3D={
      play,dance:()=>play('dance'),rebuild,
      get base(){return avatar?.userData?.kind||avatarBase()},
      version:'procedural-desktop-v1'
    };
  }

  function discover(){
    if(!desktop())return;
    const stage=document.querySelector('[data-elara-avatar-stage]');
    if(stage)mount(stage);
  }
  window.addEventListener('elara:avatar-stage-ready',discover);
  window.addEventListener('resize',()=>{
    if(desktop())discover();
    else if(current){current.dispose();current=null}
  },{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',discover,{once:true});
  else discover();
})();