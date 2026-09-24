import {chromium} from 'playwright';
const b=await chromium.launch({headless:true});
for(const width of [320,375,390,430,1648]){
 const p=await b.newPage({viewport:{width,height:928}});await p.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.ElaraReferenceHome&&document.querySelector('.ref-home-grid')&&!document.documentElement.hasAttribute('data-elara-booting'));
 await p.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');window.ElaraReferenceHome.render()});
 const probe=()=>p.evaluate(()=>{
  const keys=['#panel-home','.ref-home-grid','.ref-hero','.ref-tasks','.ref-habits','.ref-wellness-card','.ref-theme-strip'];const d={};
  for(const k of keys){const el=document.querySelector(k);if(!el)continue;const s=getComputedStyle(el),r=el.getBoundingClientRect();d[k]={gridTemplateColumns:s.gridTemplateColumns,gridTemplateAreas:s.gridTemplateAreas,display:s.display,width:s.width,height:s.height,visibility:s.visibility,position:s.position,x:r.x,y:r.y}}
  const nav=document.querySelector((innerWidth<=700?'.bottom-nav':'.sidebar .navigation')+' [data-elara-tab="home"]'),im=nav?.querySelector('img.elara-nav-art'),label=nav?.querySelector('small');if(nav&&im&&label){const ns=getComputedStyle(nav),is=getComputedStyle(im),r=im.getBoundingClientRect(),t=label.getBoundingClientRect();d.navImage={hidden:im.hidden,complete:im.complete,naturalWidth:im.naturalWidth,src:im.getAttribute('src'),navDisplay:ns.display,navDirection:ns.direction,navJustify:ns.justifyContent,navFlexDirection:ns.flexDirection,imageDisplay:is.display,imageVisibility:is.visibility,imageOpacity:is.opacity,imageRect:{x:r.x,y:r.y,w:r.width,h:r.height},labelRect:{x:t.x,y:t.y,w:t.width,h:t.height}}}
  for(const [key,selector] of [['flame','#ref-streak-card .ref-streak-flame'],['rocket','#panel-home .ref-missions-art']]){const i=document.querySelector(selector);if(!i){d[key]='absent';continue}const s=getComputedStyle(i),r=i.getBoundingClientRect();d[key]={src:i.getAttribute('src'),complete:i.complete,naturalWidth:i.naturalWidth,display:s.display,visibility:s.visibility,opacity:s.opacity,rect:{x:r.x,y:r.y,w:r.width,h:r.height}}}return d;
 });
 console.log('COMPUTED_INITIAL '+width+' '+JSON.stringify(await probe()));await p.waitForTimeout(550);console.log('COMPUTED_SETTLED '+width+' '+JSON.stringify(await probe()));
 await p.close();
}
await b.close();
