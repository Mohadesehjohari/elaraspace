/* Elara Desktop 3D Avatar — procedural anime base v2.
   Desktop-only. Public API is stable so a production VRM/GLB can replace this
   procedural base later without changing the profile drawer. */
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
    if(!el)return;el.textContent=text||'';el.dataset.state=state;
  }
  function material(THREE,color,rough=.76,metal=.01){
    return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  }
  function addMesh(THREE,parent,geometry,mat,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0],name=''){
    const o=new THREE.Mesh(geometry,mat);o.position.set(...position);o.scale.set(...scale);o.rotation.set(...rotation);o.name=name;
    o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function ellipsoid(THREE,parent,geo,mat,pos,scale,name=''){
    return addMesh(THREE,parent,geo,mat,pos,scale,[0,0,0],name);
  }
  function cylinder(THREE,parent,mat,rTop,rBottom,height,pos,rot=[0,0,0],segments=32,name=''){
    return addMesh(THREE,parent,new THREE.CylinderGeometry(rTop,rBottom,height,segments,6,false),mat,pos,[1,1,1],rot,name);
  }
  function tube(THREE,parent,mat,points,radius=.008,segments=18,radial=6,name=''){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return addMesh(THREE,parent,new THREE.TubeGeometry(curve,segments,radius,radial,false),mat,[0,0,0],[1,1,1],[0,0,0],name);
  }
  function bodyLathe(THREE,parent,mat,profile,zScale=.62){
    const pts=profile.map(([r,y])=>new THREE.Vector2(r,y));
    const o=addMesh(THREE,parent,new THREE.LatheGeometry(pts,48),mat,[0,3.35,0],[1,1,zScale],[0,0,0],'torso');
    return o;
  }
  function headGeometry(THREE){
    const g=new THREE.SphereGeometry(1,48,32);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      if(y<-.08){
        const k=clamp((y+1)/.92,0,1);
        x*=.76+.24*k;
      }
      if(y<-.72)z*=.91;
      if(z>.45)z*=.95;
      p.setXYZ(i,x,y,z);
    }
    p.needsUpdate=true;g.computeVertexNormals();return g;
  }
  function eye(THREE,head,m,x,y,isMale,refs){
    const group=new THREE.Group();group.position.set(x,y,.345);head.add(group);
    const white=addMesh(THREE,group,new THREE.CircleGeometry(1,40),m.eyeWhite,[0,0,0],[isMale?.128:.139,isMale?.047:.054,1],[0,0,0],'eye-white');
    const iris=addMesh(THREE,group,new THREE.CircleGeometry(1,32),m.iris,[0,-.002,.002],[isMale?.041:.044,isMale?.041:.045,1],[0,0,0],'iris');
    addMesh(THREE,group,new THREE.CircleGeometry(1,24),m.pupil,[0,-.002,.004],[.018,.020,1],[0,0,0],'pupil');
    addMesh(THREE,group,new THREE.CircleGeometry(1,20),m.eyeGlint,[-.012,.014,.006],[.008,.008,1],[0,0,0],'glint');
    tube(THREE,group,m.lash,[[-.13,.028,.007],[0,.052,.009],[.13,.025,.007]],isMale?.008:.010,14,5,'upper-lash');
    refs.eyes.push(group);
    return white;
  }
  function createFace(THREE,head,m,isMale,refs){
    refs.eyes=[];
    const ex=isMale?.145:.152,ey=isMale?.12:.115;
    eye(THREE,head,m,-ex,ey,isMale,refs);eye(THREE,head,m,ex,ey,isMale,refs);
    tube(THREE,head,m.brow,[[-.255,.245,.342],[-.15,.272,.350],[-.055,.254,.347]],isMale?.010:.008,14,5,'brow-left');
    tube(THREE,head,m.brow,[[.055,.254,.347],[.15,.272,.350],[.255,.245,.342]],isMale?.010:.008,14,5,'brow-right');
    tube(THREE,head,m.nose,[[.005,.045,.356],[.018,-.035,.364],[0,-.105,.365]],.006,12,5,'nose-line');
    tube(THREE,head,m.mouth,[[-.082,-.205,.352],[0,-.219,.360],[.082,-.205,.352]],.008,14,5,'mouth');
  }
  function hairRibbon(THREE,parent,mat,o){
    const shape=new THREE.Shape();
    const w=o.width,L=o.length;
    shape.moveTo(-w*.48,0);shape.quadraticCurveTo(-w*.56,-L*.34,-w*.28,-L*.75);
    shape.quadraticCurveTo(-w*.12,-L*.95,0,-L);
    shape.quadraticCurveTo(w*.12,-L*.95,w*.28,-L*.75);
    shape.quadraticCurveTo(w*.56,-L*.34,w*.48,0);shape.closePath();
    const geo=new THREE.ShapeGeometry(shape,8);
    const pivot=new THREE.Group();pivot.position.set(...o.root);pivot.rotation.set(o.rx||0,o.ry||0,o.rz||0);parent.add(pivot);
    const lock=addMesh(THREE,pivot,geo,mat,[0,0,0],[1,1,1],[0,0,0],'hair-lock');
    lock.material.side=THREE.DoubleSide;
    pivot.userData.hair={phase:o.phase||0,stiffness:o.stiffness||8.5,damping:o.damping||.86,vx:0,vz:0,baseX:o.rx||0,baseZ:o.rz||0};
    return pivot;
  }
  function createHair(THREE,root,m,isMale,refs){
    const hairRoot=new THREE.Group();root.add(hairRoot);refs.hair=[];
    const y=5.75;
    const cap=addMesh(THREE,hairRoot,new THREE.SphereGeometry(1,44,28),m.hair,[0,y+.09,-.06],[isMale?.405:.415,isMale?.535:.555,.305],[0,0,0],'hair-cap');
    const topGeo=new THREE.SphereGeometry(1,28,18);
    ellipsoid(THREE,hairRoot,topGeo,m.hairHi,[-.16,y+.43,-.03],[.22,.20,.20],'hair-top');
    ellipsoid(THREE,hairRoot,topGeo,m.hairHi,[.15,y+.44,-.04],[.23,.20,.20],'hair-top');
    const locks=isMale?[
      {root:[-.30,y+.40,.28],width:.17,length:.58,rz:.30,ry:-.06,phase:.2},
      {root:[-.10,y+.47,.30],width:.18,length:.67,rz:.17,phase:.7},
      {root:[.11,y+.47,.30],width:.18,length:.60,rz:-.20,phase:1.2},
      {root:[.31,y+.37,.26],width:.18,length:.65,rz:-.32,ry:.08,phase:1.8},
      {root:[-.37,y+.18,.02],width:.20,length:.74,ry:-.75,rz:.10,phase:2.4},
      {root:[.37,y+.18,.02],width:.20,length:.74,ry:.75,rz:-.10,phase:3.0},
      {root:[-.22,y+.25,-.28],width:.22,length:.78,ry:3.08,rz:.08,phase:3.6},
      {root:[.03,y+.31,-.31],width:.23,length:.82,ry:3.14,phase:4.2},
      {root:[.25,y+.24,-.27],width:.21,length:.74,ry:3.20,rz:-.08,phase:4.8}
    ]:[
      {root:[-.30,y+.43,.29],width:.17,length:.66,rz:.28,phase:.1},
      {root:[-.10,y+.49,.31],width:.18,length:.72,rz:.15,phase:.6},
      {root:[.10,y+.49,.31],width:.17,length:.63,rz:-.18,phase:1.1},
      {root:[.30,y+.41,.28],width:.18,length:.70,rz:-.30,phase:1.6},
      {root:[-.39,y+.18,.04],width:.21,length:1.02,ry:-.72,rz:.09,phase:2.2},
      {root:[.39,y+.18,.04],width:.21,length:1.00,ry:.72,rz:-.09,phase:2.8},
      {root:[-.31,y+.27,-.26],width:.23,length:1.08,ry:2.72,rz:.08,phase:3.4},
      {root:[-.10,y+.33,-.31],width:.24,length:1.14,ry:3.03,rz:.04,phase:4.0},
      {root:[.12,y+.34,-.31],width:.24,length:1.13,ry:3.25,rz:-.04,phase:4.6},
      {root:[.32,y+.26,-.25],width:.23,length:1.05,ry:3.55,rz:-.08,phase:5.2}
    ];
    for(const o of locks)refs.hair.push(hairRibbon(THREE,hairRoot,m.hair,o));
    refs.hairRoot=hairRoot;
  }
  function createAvatar(THREE,kind='female'){
    const isMale=kind==='male',model=new THREE.Group(),refs={hair:[],eyes:[],arms:[]};
    model.name='elara-'+kind+'-anime-base-v2';
    const m={
      skin:material(THREE,isMale?0xf6cdbf:0xf8d8cc,.72),
      suit:material(THREE,isMale?0xdac9c0:0xe2d0c7,.84),
      seam:material(THREE,isMale?0xbda9a0:0xc4afa7,.88),
      hair:material(THREE,isMale?0x8f5653:0xa96069,.64),
      hairHi:material(THREE,isMale?0xae6d66:0xc57880,.62),
      eyeWhite:material(THREE,0xfffbf8,.58),
      iris:material(THREE,isMale?0x514248:0x5a474d,.52),
      pupil:new THREE.MeshBasicMaterial({color:0x17151a}),
      eyeGlint:new THREE.MeshBasicMaterial({color:0xffffff}),
      lash:new THREE.MeshBasicMaterial({color:isMale?0x4d3739:0x4a3438}),
      brow:new THREE.MeshBasicMaterial({color:isMale?0x684749:0x734b51}),
      nose:new THREE.MeshBasicMaterial({color:0xc79387}),
      mouth:new THREE.MeshBasicMaterial({color:0xa9656b})
    };
    const sphere=new THREE.SphereGeometry(1,40,28);
    const root=new THREE.Group();model.add(root);refs.root=root;
    const torso=new THREE.Group();root.add(torso);refs.torso=torso;

    const profile=isMale
      ?[[.33,0],[.42,.18],[.43,.38],[.37,.60],[.33,.78],[.35,.98],[.43,1.20],[.53,1.40],[.50,1.53],[.31,1.62]]
      :[[.32,0],[.45,.17],[.48,.38],[.39,.61],[.325,.80],[.34,1.01],[.41,1.20],[.46,1.38],[.425,1.52],[.30,1.62]];
    const torsoMesh=bodyLathe(THREE,torso,m.suit,profile,isMale?.62:.60);refs.torsoMesh=torsoMesh;
    if(!isMale){
      ellipsoid(THREE,torso,sphere,m.suit,[-.18,4.77,.19],[.19,.22,.12],'chest-soft');
      ellipsoid(THREE,torso,sphere,m.suit,[.18,4.77,.19],[.19,.22,.12],'chest-soft');
    }

    cylinder(THREE,root,m.suit,.125,.145,.37,[0,5.10,0],[],28,'neck');
    const head=new THREE.Group();head.position.set(0,5.58,0);root.add(head);refs.head=head;
    addMesh(THREE,head,headGeometry(THREE),m.skin,[0,0,0],[isMale?.385:.38,isMale?.49:.50,isMale?.35:.345],[0,0,0],'head');
    ellipsoid(THREE,head,sphere,m.skin,[-.382,.02,-.005],[.045,.082,.028],'ear');
    ellipsoid(THREE,head,sphere,m.skin,[.382,.02,-.005],[.045,.082,.028],'ear');
    createFace(THREE,head,m,isMale,refs);

    const hipX=isMale?.255:.275;
    for(const s of [-1,1]){
      cylinder(THREE,root,m.suit,isMale?.145:.137,isMale?.112:.105,1.58,[s*hipX,2.50,0],[0,0,s*.012],36,'upper-leg');
      ellipsoid(THREE,root,sphere,m.suit,[s*hipX,1.70,.005],[.125,.135,.118],'knee');
      cylinder(THREE,root,m.suit,isMale?.112:.105,isMale?.078:.073,1.48,[s*hipX,0.93,.006],[0,0,-s*.008],32,'lower-leg');
      ellipsoid(THREE,root,sphere,m.suit,[s*hipX,.16,.14],[isMale?.13:.122,.105,.29],'foot');
      ellipsoid(THREE,root,sphere,m.suit,[s*hipX,.095,.31],[isMale?.125:.117,.067,.24],'toe');
    }

    const shoulderX=isMale?.50:.455;
    for(const s of [-1,1]){
      const arm=new THREE.Group();arm.position.set(s*shoulderX,4.72,0);root.add(arm);refs.arms.push(arm);
      ellipsoid(THREE,arm,sphere,m.suit,[0,0,0],[isMale?.145:.13,.165,.145],'shoulder');
      cylinder(THREE,arm,m.suit,isMale?.094:.084,isMale?.073:.065,1.03,[s*.008,-.57,0],[0,0,s*.012],28,'upper-arm');
      ellipsoid(THREE,arm,sphere,m.suit,[s*.012,-1.08,0],[.083,.092,.077],'elbow');
      cylinder(THREE,arm,m.suit,isMale?.073:.065,isMale?.052:.047,.99,[s*.018,-1.60,.006],[0,0,s*.010],28,'forearm');
      ellipsoid(THREE,arm,sphere,m.suit,[s*.022,-2.12,.075],[isMale?.073:.067,.155,.082],'hand');
      cylinder(THREE,arm,m.suit,.047,.025,.25,[s*.022,-2.29,.09],[0,0,s*.010],14,'fingers');
    }

    createHair(THREE,root,m,isMale,refs);
    tube(THREE,root,m.seam,[[-.25,4.93,.27],[0,4.86,.31],[.25,4.93,.27]],.007,18,5,'collarbone-seam');
    refs.baseScale=torsoMesh.scale.clone();
    model.userData={kind,refs};return model;
  }

  async function mount(stage){
    if(!stage||stage.dataset.avatarMounted==='yes'||!desktop())return;
    stage.dataset.avatarMounted='yes';status(stage,'در حال آماده‌سازی آواتار سه‌بعدی…','loading');
    let THREE;
    try{THREE=await loadThree()}catch(error){
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
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.className='elara-avatar-canvas';renderer.domElement.setAttribute('aria-label','کاراکتر سه‌بعدی؛ برای چرخاندن درگ کن');
    viewport.replaceChildren(renderer.domElement);

    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,1,.1,50);
    camera.position.set(0,3.05,11.0);camera.lookAt(0,3.05,0);let cameraZ=11.0;
    scene.add(new THREE.HemisphereLight(0xdce5ff,0x29354a,2.4));
    const key=new THREE.DirectionalLight(0xffe9e0,4.0);key.position.set(3.4,7.2,5.4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
    const rim=new THREE.DirectionalLight(0x937fff,3.1);rim.position.set(-4.2,5.6,-3.4);scene.add(rim);
    const fill=new THREE.PointLight(0xa7d6ff,1.8,18);fill.position.set(-2.1,3.4,4.0);scene.add(fill);
    const floorGlow=addMesh(THREE,scene,new THREE.CircleGeometry(1.5,64),new THREE.MeshBasicMaterial({color:0x6f5cff,transparent:true,opacity:.09,depthWrite:false}),[0,.016,0],[1,1,1],[-Math.PI/2,0,0],'floor-glow');
    const floorShadow=addMesh(THREE,scene,new THREE.CircleGeometry(1.25,64),new THREE.ShadowMaterial({opacity:.18}),[0,.02,0],[1,1,1],[-Math.PI/2,0,0],'floor-shadow');floorShadow.receiveShadow=true;

    let avatar=createAvatar(THREE,avatarBase());scene.add(avatar);
    let refs=avatar.userData.refs,targetYaw=.04,yaw=.04,velocity=0,lastX=0,pointerId=null,dancingUntil=0,disposed=false,lastTime=performance.now(),lastUserAction=performance.now();
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const resize=()=>{const r=viewport.getBoundingClientRect();if(r.width<2||r.height<2)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()};
    const ro=new ResizeObserver(resize);ro.observe(viewport);resize();

    function rebuild(){
      const wanted=avatarBase();if(avatar.userData.kind===wanted)return;
      scene.remove(avatar);avatar=createAvatar(THREE,wanted);scene.add(avatar);refs=avatar.userData.refs;
      status(stage,wanted==='male'?'مدل پایه مرد':'مدل پایه زن','ready');
    }
    function down(e){
      if(e.button!==undefined&&e.button!==0)return;
      pointerId=e.pointerId;lastX=e.clientX;velocity=0;lastUserAction=performance.now();renderer.domElement.setPointerCapture?.(pointerId);stage.classList.add('is-dragging');e.preventDefault();
    }
    function move(e){
      if(pointerId!==e.pointerId)return;
      const dx=e.clientX-lastX;lastX=e.clientX;const d=dx*.011;targetYaw+=d;velocity=d*2.8;lastUserAction=performance.now();e.preventDefault();
    }
    function up(e){if(pointerId!==e.pointerId)return;pointerId=null;stage.classList.remove('is-dragging');renderer.domElement.releasePointerCapture?.(e.pointerId)}
    function wheel(e){cameraZ=clamp(cameraZ+Math.sign(e.deltaY)*.38,9.45,12.8);lastUserAction=performance.now();e.preventDefault()}
    renderer.domElement.addEventListener('pointerdown',down,{passive:false});renderer.domElement.addEventListener('pointermove',move,{passive:false});
    renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});

    const edit=stage.querySelector('[data-elara-avatar-edit]');if(edit)edit.addEventListener('click',()=>window.ElaraProfileSystem?.openEditor?.());
    const sex=profileSex();status(stage,sex==='male'?'مدل پایه مرد':sex==='female'?'مدل پایه زن':'مدل پایه زن · از ویرایش پروفایل قابل تغییر','ready');
    const privateChange=()=>{rebuild();const s=profileSex();status(stage,s==='male'?'مدل پایه مرد':s==='female'?'مدل پایه زن':'مدل پایه زن · از ویرایش پروفایل قابل تغییر','ready')};
    window.addEventListener('elara:profile-private-changed',privateChange);

    function play(name='dance'){
      if(name==='dance'){dancingUntil=performance.now()+7200;lastUserAction=performance.now();return true}
      return false;
    }
    function dispose(){if(disposed)return;disposed=true;ro.disconnect();window.removeEventListener('elara:profile-private-changed',privateChange);renderer.dispose();stage.dataset.avatarMounted=''}
    function active(){return stage.isConnected&&desktop()&&stage.offsetParent!==null&&!document.hidden}

    function frame(now){
      if(disposed)return;requestAnimationFrame(frame);
      if(!stage.isConnected){dispose();return}
      const dt=Math.min(.04,Math.max(.001,(now-lastTime)/1000));lastTime=now;if(!active())return;
      const t=now/1000,dancing=now<dancingUntil,idleAmp=reduced?.22:1;
      if(pointerId===null){targetYaw+=velocity;velocity*=Math.pow(.87,dt*60);if(Math.abs(velocity)<.00002)velocity=0}
      yaw=ease(yaw,targetYaw,1-Math.pow(.001,dt));avatar.rotation.y=yaw;
      camera.position.z=ease(camera.position.z,cameraZ,1-Math.pow(.02,dt));camera.lookAt(0,3.05,0);

      refs.root.position.y=(Math.sin(t*1.15)*.010+(dancing?Math.abs(Math.sin(t*5.8))*.045:0))*idleAmp;
      refs.torso.rotation.z=(Math.sin(t*.72)*.005+(dancing?Math.sin(t*4.0)*.055:0))*idleAmp;
      refs.torso.rotation.y=(Math.sin(t*.48)*.009+(dancing?Math.sin(t*2.4)*.09:0))*idleAmp;
      refs.head.rotation.y=(Math.sin(t*.55)*.038+(dancing?Math.sin(t*3.1)*.12:0))*idleAmp;
      refs.head.rotation.z=Math.sin(t*.42)*.010*idleAmp;
      refs.arms.forEach((arm,i)=>{const s=i===0?-1:1;arm.rotation.z=(Math.sin(t*.78+s)*.011+(dancing?s*(.24+.15*Math.sin(t*3.4)):0))*idleAmp;arm.rotation.x=(dancing?Math.sin(t*3.4+s)*.18:Math.sin(t*.62+s)*.006)*idleAmp});
      const blink=(t%4.7)>4.52&&((t%4.7)<4.66);refs.eyes.forEach(e=>{e.scale.y=blink?.16:1});

      const spin=clamp(velocity*4.5,-.23,.23);
      refs.hair.forEach((p,i)=>{
        const h=p.userData.hair;if(!h)return;
        const wind=(Math.sin(t*(1.0+i*.02)+h.phase)*.018+spin*(i%2?1:-1))*idleAmp;
        const tx=h.baseX+Math.sin(t*.88+h.phase)*.014*idleAmp;
        const tz=h.baseZ+wind+(dancing?Math.sin(t*4.1+h.phase)*.038:0)*idleAmp;
        h.vx=(h.vx+(tx-p.rotation.x)*h.stiffness*dt)*Math.pow(h.damping,dt*60);
        h.vz=(h.vz+(tz-p.rotation.z)*h.stiffness*dt)*Math.pow(h.damping,dt*60);
        p.rotation.x+=h.vx;p.rotation.z+=h.vz;
      });
      if(pointerId===null&&now-lastUserAction>9000&&!dancing&&!reduced)targetYaw+=Math.sin(t*.18)*.00005;
      renderer.render(scene,camera);
    }
    requestAnimationFrame(frame);

    current={stage,play,dispose,rebuild};
    window.ElaraAvatar3D={play,dance:()=>play('dance'),rebuild,get base(){return avatar?.userData?.kind||avatarBase()},version:'procedural-desktop-v2'};
  }

  function discover(){if(!desktop())return;const stage=document.querySelector('[data-elara-avatar-stage]');if(stage)mount(stage)}
  window.addEventListener('elara:avatar-stage-ready',discover);
  window.addEventListener('resize',()=>{if(desktop())discover();else if(current){current.dispose();current=null}},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',discover,{once:true});else discover();
})();