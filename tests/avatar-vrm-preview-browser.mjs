import fs from 'node:fs';
import { chromium } from 'playwright';
fs.mkdirSync('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:920,height:1040},deviceScaleFactor:1});
page.on('console',m=>console.log('BROWSER',m.type(),m.text()));
page.on('pageerror',e=>console.error('PAGEERROR',String(e)));
try{
  const html='<!doctype html><html><head><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/","@pixiv/three-vrm":"https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3/lib/three-vrm.module.min.js"}}</script><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:linear-gradient(#07152b,#04101f)}#stage{width:100%;height:100%;position:relative}canvas{display:block;width:100%;height:100%}#label{position:absolute;top:20px;left:20px;color:white;font:18px sans-serif;z-index:3}</style></head><body><div id="stage"><div id="label"></div></div><script type="module">'+
  "import * as THREE from 'three';"+
  "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';"+
  "import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';"+
  "const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.querySelector('#stage').append(renderer.domElement);"+
  "const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(28,innerWidth/innerHeight,.01,100);scene.add(camera);scene.add(new THREE.HemisphereLight(0xeaf2ff,0x172139,2.5));const key=new THREE.DirectionalLight(0xffe9df,4);key.position.set(3,6,5);scene.add(key);const rim=new THREE.DirectionalLight(0x8b74ff,2.5);rim.position.set(-4,4,-3);scene.add(rim);"+
  "const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));let current=null;"+
  "window.loadVrm=async(url,label)=>{if(current)scene.remove(current.scene);const gltf=await loader.loadAsync(url);const vrm=gltf.userData.vrm;current=vrm;try{VRMUtils.rotateVRM0(vrm)}catch{}try{VRMUtils.removeUnnecessaryVertices(vrm.scene)}catch{}vrm.scene.traverse(o=>{o.frustumCulled=false;const mats=Array.isArray(o.material)?o.material:[o.material].filter(Boolean);for(const m of mats){if(/hair/i.test((m.name||'')+' '+(o.name||''))&&m.color)m.color.lerp(new THREE.Color('#b66d74'),.6)}});scene.add(vrm.scene);const box=new THREE.Box3().setFromObject(vrm.scene),size=box.getSize(new THREE.Vector3());const targetH=5.9,scale=targetH/size.y;vrm.scene.scale.setScalar(scale);const box2=new THREE.Box3().setFromObject(vrm.scene),center2=box2.getCenter(new THREE.Vector3());vrm.scene.position.x-=center2.x;vrm.scene.position.y-=box2.min.y;vrm.scene.position.z-=center2.z;camera.position.set(0,3.15,11.3);camera.lookAt(0,3.05,0);document.querySelector('#label').textContent=label;window.__vrmReady=label};"+
  "function tick(){requestAnimationFrame(tick);current?.update?.(1/60);renderer.render(scene,camera)}tick();"+
  '</scr'+'ipt></body></html>';
  await page.setContent(html,{waitUntil:'load'});
  await page.waitForFunction(()=>typeof window.loadVrm==='function',{timeout:30000});
  for(const [name,url] of [
    ['female','https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/fem_vroid.vrm'],
    ['male','https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/masc_vroid.vrm']
  ]){
    await page.evaluate(({url,name})=>window.loadVrm(url,name),{url,name});
    await page.waitForFunction(n=>window.__vrmReady===n,name,{timeout:60000});
    await page.waitForTimeout(900);
    await page.screenshot({path:'browser-artifacts/vrm-sample-'+name+'.png'});
  }
}finally{await browser.close()}