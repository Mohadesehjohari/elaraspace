import {chromium} from 'playwright';
const b=await chromium.launch({headless:true});
for(const width of [390,1648]){
 const p=await b.newPage({viewport:{width,height:928}});await p.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.ElaraReferenceHome&&document.querySelector('.ref-home-grid'));
 await p.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');window.ElaraReferenceHome.render()});
 const diag=await p.evaluate(()=>{
  const keys=['#panel-home','.ref-home-grid','.ref-hero','.ref-tasks','.ref-habits','.ref-wellness-card','.ref-theme-strip'];const d={};
  for(const k of keys){const el=document.querySelector(k);if(!el)continue;const s=getComputedStyle(el),r=el.getBoundingClientRect();d[k]={className:el.className,inlineStyle:el.getAttribute('style'),gridTemplateColumns:s.gridTemplateColumns,gridTemplateAreas:s.gridTemplateAreas,gridColumn:s.gridColumn,gridRow:s.gridRow,gridArea:s.gridArea,direction:s.direction,display:s.display,width:s.width,height:s.height,minHeight:s.minHeight,maxHeight:s.maxHeight,boxSizing:s.boxSizing,position:s.position,padding:s.padding,x:r.x,y:r.y};}
  return d;
 });console.log('COMPUTED '+width+' '+JSON.stringify(diag));await p.close();
}
await b.close();
