/*
 * Elara Rose Layered — independent experimental 3D hair asset.
 * Authored for the 2026-10-05 approved adult anime turnaround.
 * Not a VRoid .vroidcustomitem. Built as portable Three.js geometry;
 * export the preview as .glb and fit/rig it to the final approved avatar.
 * No changes to the existing live avatar or player inventory.
 */

export const ELARA_ROSE_HAIR_SPEC = Object.freeze({
  version: '0.1.0-concept',
  label: 'Elara — Soft Rose Layered Medium Hair',
  approvedReference: '2026-10-05 female turnaround',
  scalpAxis: '+Y',
  faceDirection: '+Z',
  referenceHeadWidth: 0.76,
  referenceHeadHeight: 1.0,
  referenceHeadDepth: 0.69,
  referenceHeadCenter: [0, 0, 0],
  color: '#b57578',
  productionReady: false
});

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const mix = (a,b,t) => a+(b-a)*t;

/**
 * Create a detachable, all-original hairstyle, centered on a normalized
 * adult head. The mesh is self-contained: no copyrighted sample models.
 *
 * @param {typeof import('three')} THREE
 * @param {{color?:string, scale?:number, motion?:boolean}} options
 * @returns {{group:import('three').Group,update:(dt:number,t:number,impulse?:number)=>void,setColor:(hex:string)=>void,dispose:()=>void}}
 */
export function createElaraRoseHair(THREE, options={}) {
  const group = new THREE.Group();
  group.name = 'ELARA_HAIR_RoseLayered_v01';
  const paletteColor = new THREE.Color(options.color || ELARA_ROSE_HAIR_SPEC.color);
  const motion = options.motion !== false;
  const pieces = [];
  const mats = [];
  const random = (n) => {
    const x = Math.sin(n * 158.713 + 18.115) * 43758.5453;
    return x - Math.floor(x);
  };

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: .59,
    metalness: 0,
    side: THREE.DoubleSide
  });
  mats.push(material);

  // Tapered 3D clump: elliptical, gently scalloped cross-section. UVs are
  // provided for later texture baking and an optional atlas in Blender.
  function lock(points, width, thickness, tint, seed, physics=1) {
    const path = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
    const STEPS=23, AROUND=8, verts=[], colors=[],uv=[], indices=[],weights=[];
    const norm = new THREE.Vector3();
    const across = new THREE.Vector3();
    const depth = new THREE.Vector3();
    const up = new THREE.Vector3(0,1,0);
    const color = paletteColor.clone();
    const shade = new THREE.Color('#33242c');
    for(let i=0;i<=STEPS;i++) {
      const t=i/STEPS, pos=path.getPoint(t), tangent=path.getTangent(t).normalize();
      norm.set(pos.x*.72,0,pos.z>=0?.92:-.92).normalize();
      across.crossVectors(tangent,norm).normalize();
      if(across.lengthSq()<.1)across.crossVectors(tangent,up).normalize();
      depth.crossVectors(across,tangent).normalize();
      const taper=Math.pow(Math.max(.004,1-t*t),.72)*smooth(clamp(t/.09,0,1));
      const strandWidth=width*(.78+.22*Math.sin(Math.PI*t))*taper;
      const strandDepth=thickness*(.52+.48*taper);
      for(let j=0;j<AROUND;j++) {
        const a=j/AROUND*TAU;
        const x=Math.cos(a),z=Math.sin(a);
        const p=pos.clone().addScaledVector(across,x*strandWidth*.5)
          .addScaledVector(depth,z*strandDepth);
        p.addScaledVector(depth, Math.sin(a*3)*.0035*(1-t));
        verts.push(p.x,p.y,p.z);
        uv.push(j/AROUND,t);
        weights.push(t*t*physics);
        const lighten=.04+.14*Math.pow(Math.max(0,z),2)+.08*(1-t)+.045*Math.sin(a*2+seed);
        const colorOut=color.clone().multiplyScalar(tint+lighten)
          .lerp(shade, .10*Math.pow(t,3));
        colors.push(colorOut.r,colorOut.g,colorOut.b);
      }
    }
    for(let i=0;i<STEPS;i++)for(let j=0;j<AROUND;j++) {
      const a=i*AROUND+j,b=i*AROUND+(j+1)%AROUND;
      const c=(i+1)*AROUND+j,d=(i+1)*AROUND+(j+1)%AROUND;
      indices.push(a,c,b,b,c,d);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name='ELARA_Strand_'+String(pieces.length+1).padStart(3,'0');
    mesh.castShadow=true;mesh.receiveShadow=true;
    group.add(mesh);
    pieces.push({mesh,original:Float32Array.from(verts),weights:Float32Array.from(weights),
      phase:seed*1.37,velocity:0,angle:0,physics});
  }

  const capGeo=new THREE.SphereGeometry(1,50,22,0,TAU,0,Math.PI*.49);
  capGeo.scale(.396,.515,.358);
  capGeo.translate(0,.037,-.023);
  const cap=new THREE.Mesh(capGeo,new THREE.MeshStandardMaterial({
    color:paletteColor.clone().multiplyScalar(.82),roughness:.7,side:THREE.DoubleSide
  }));
  cap.name='ELARA_ScalpCap';cap.castShadow=true;group.add(cap);
  mats.push(cap.material);

  // Back: graduated pieces below nape and shoulders.
  for(let i=0;i<37;i++) {
    const u=i/36, theta=Math.PI*.60+u*Math.PI*1.80;
    const x=Math.cos(theta), z=Math.sin(theta);
    const shoulder= .27 + .22*Math.abs(x);
    const cx=.365*x;
    const backZ=-.22-.10*(1-Math.abs(x));
    const length=mix(.72,1.15,1-.50*Math.abs(x)) + (random(i+2)-.5)*.12;
    const endX=shoulder*x+.030*Math.sin(i*2.7);
    const start=[cx*.76,.41+.055*(1-Math.abs(x)),backZ+.12*z];
    const pts=[
      start,
      [cx,.24,backZ-.05],
      [cx*1.06,.02,backZ-.10],
      [endX+.028*Math.sin(i),-.38,backZ-.04],
      [endX+.055*Math.sin(i*2.1),-length+.13,backZ+.08],
      [endX+.035*Math.sin(i*2.1),-length,backZ+.12]
    ];
    lock(pts,.075+.024*random(i+19),.021,.83+.14*random(i+9),i,1.0);
  }

  // Front: loose center part and long face-framing layers, no flat fringe.
  for(const sign of [-1,1]) {
    for(let i=0;i<12;i++) {
      const u=i/11, r=random(i+63+(sign+1)*17);
      const p=.055+.24*u;
      const x=sign*p;
      const sideX=sign*(.28+.12*u);
      const endY= -(.53 + .43*u + .10*r);
      const z=.29-.14*u;
      lock([
        [x,.49-(u*.015),.16+u*.07],
        [sign*(p+.035),.45,.295],
        [sign*(p+.115),.27,.345-.04*u],
        [sideX,.025,.35-.13*u],
        [sideX+sign*.012,-.23,.31-.13*u],
        [sideX+sign*(.012+.040*Math.sin(i*1.81)),endY+.16,z+.02],
        [sideX+sign*(.010+.055*Math.sin(i*1.81)),endY,z]
      ], .050+.023*r, .012+.005*r, .9+.12*r,i+114,.8+.2*u);
    }
    // Fine flyaways across the outer cheeks and clavicle.
    for(let i=0;i<7;i++) {
      const u=i/6;
      const x=sign*(.29+.035*u);
      lock([
        [x,.32,.20],
        [x+sign*.066,.07,.31],
        [x+sign*.034,-.28,.31],
        [x+sign*(.04+.03*Math.sin(i)),-.71-.08*u,.31],
        [x+sign*(.01+.03*Math.cos(i)),-.87-.12*u,.26]
      ],.025+.014*random(i+146),.009,.97,i+175,.95);
    }
  }
  // Crown layering sweeps away from the center part.
  for(const sign of [-1,1])for(let i=0;i<11;i++) {
    const u=i/10, x=sign*(.035+.21*u);
    lock([
      [x*.6,.541,.030+.06*u],
      [x,.536,.16+.06*u],
      [sign*(.18+.15*u),.45,.25+.035*u],
      [sign*(.29+.065*u),.26,.27+.02*u],
      [sign*(.33+.045*u),.05,.24-.07*u]
    ],.039+.008*random(i+214),.009, .92+.09*random(i+244),i+230,.15);
  }

  group.scale.setScalar(options.scale??1);
  let spring=0,velocity=0,turnPrev=0;
  function update(dt,elapsed,turn=0) {
    if(!motion) return;
    const step=clamp(dt,0,.05);
    const turnSpeed=clamp((turn-turnPrev)/Math.max(step,.001),-5,5);
    turnPrev=turn;
    const force = -turnSpeed*.008;
    velocity+=(force-spring*16-velocity*7)*step;
    spring=clamp(spring+velocity*step,-.11,.11);
    for(const part of pieces) {
      if(part.physics<.35) continue;
      const b=part.original, p=part.mesh.geometry.attributes.position;
      const phase=part.phase;
      const idle=.007*Math.sin(elapsed*.94+phase)+.004*Math.sin(elapsed*1.53+phase*.67);
      const sway=(spring+idle)*part.physics;
      for(let i=0;i<part.weights.length;i++) {
        const w=part.weights[i];
        p.setXYZ(i,b[3*i]+sway*w,
          b[3*i+1],b[3*i+2]+(.32*sway+.004*Math.sin(elapsed*.67+phase))*w);
      }
      p.needsUpdate=true;
    }
  }
  function setColor(color) {
    const next=new THREE.Color(color);
    const ratioR=next.r/Math.max(.01,paletteColor.r),ratioG=next.g/Math.max(.01,paletteColor.g),
      ratioB=next.b/Math.max(.01,paletteColor.b);
    for(const part of pieces) {
      const attr=part.mesh.geometry.attributes.color;
      for(let i=0;i<attr.count;i++) {
        const base=part.mesh.userData.baseColors || (part.mesh.userData.baseColors=Float32Array.from(attr.array));
        attr.setXYZ(i,clamp(base[i*3]*ratioR,0,1),clamp(base[i*3+1]*ratioG,0,1),clamp(base[i*3+2]*ratioB,0,1));
      }
      attr.needsUpdate=true;
    }
    cap.material.color.copy(next).multiplyScalar(.82);
  }
  function dispose() {
    for(const part of pieces)part.mesh.geometry.dispose();
    cap.geometry.dispose();
    for(const m of mats)m.dispose();
  }
  return {group,update,setColor,dispose,meta:ELARA_ROSE_HAIR_SPEC};
}
