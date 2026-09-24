import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
for(const width of [390,1648]){
 const page=await browser.newPage({viewport:{width,height:928}});await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ElaraReferenceHome&&!document.documentElement.hasAttribute('data-elara-booting'));
 await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');window.ElaraReferenceHome.render()});
 const result=await page.evaluate(()=>{
 const output={};const sources=[['flame','#ref-streak-card .ref-streak-flame'],['rocket','#panel-home .ref-missions-art'],['nav','.sidebar [data-elara-tab="home"] img.elara-nav-art, .bottom-nav [data-elara-tab="home"] img.elara-nav-art']];
 for(const [key,selector] of sources){const img=document.querySelector(selector);if(!img||!img.complete||!img.naturalWidth){output[key]='missing or not decoded';continue}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0,256,256);
 const p=context.getImageData(0,0,256,256).data;let count=0,alphaCount=0,minX=256,minY=256,maxX=-1,maxY=-1;const corners=[];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const idx=(y*256+x)*4,r=p[idx],g=p[idx+1],b=p[idx+2],a=p[idx+3];if(a>0)alphaCount++;if(a>64&&Math.max(r,g,b)>95&&Math.max(r,g,b)-Math.min(r,g,b)>35){count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}if((x===0||x===255)&&(y===0||y===255))corners.push([r,g,b,a])}
 output[key]={src:img.getAttribute('src'),natural:[img.naturalWidth,img.naturalHeight],contentPixels:count,alphaPixels:alphaCount,colorBounds:count?[minX,minY,maxX,maxY]:null,corners};
 }
 return output});console.log('ARTWORK-SUBJECT '+width+' '+JSON.stringify(result));await page.close();
}
await browser.close();
