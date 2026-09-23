import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='browser-artifacts';mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});const rows=[];
const rect=(page,selector)=>page.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});
for(const width of [320,375,390,430,1440,1648,1920]){
 const page=await browser.newPage({viewport:{width,height:width===1648?928:1000}});
 try{
  await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ElaraReferenceHome&&document.querySelector('.ref-home-grid'),null,{timeout:25000});
  await page.addStyleTag({content:'#cloud-layer{display:none!important}body:not(.cloud-ready) .shell,body.cloud-locked .shell{visibility:visible!important}*,*:before,*:after{animation:none!important;transition:none!important}'});
  await page.evaluate(()=>{document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');window.ElaraReferenceHome.render()});await page.waitForTimeout(250);
  const measure={width,sidebar:await rect(page,'.sidebar'),hero:await rect(page,'.ref-hero'),tasks:await rect(page,'.ref-tasks'),habits:await rect(page,'.ref-habits'),wellness:await rect(page,'.ref-wellness-card'),missions:await rect(page,'.ref-missions'),ranks:await rect(page,'.ref-ranks'),friends:await rect(page,'.ref-activity'),theme:await rect(page,'.ref-theme-strip'),scrollW:await page.evaluate(()=>document.documentElement.scrollWidth)};
  rows.push(measure);await page.screenshot({path:out+'/geometry-'+width+'-full.png',fullPage:true});
  console.log(JSON.stringify(measure));
  assert.ok(measure.scrollW<=width+2,'horizontal overflow '+width);
  if(width>=1180){
   assert.ok(measure.sidebar.x<=1&&measure.sidebar.w>=210&&measure.sidebar.w<=240,'sidebar width or left position');
   assert.ok(measure.hero.h>=145&&measure.hero.h<=190,'desktop hero exceeds reference: '+measure.hero.h);
   assert.ok(measure.tasks.w>=(width-measure.sidebar.w-90)/3*.88,'desktop tasks column too narrow');
   assert.ok(measure.tasks.x<measure.habits.x&&measure.habits.x<measure.wellness.x,'desktop cards overlap or out of order');
   assert.ok(measure.theme.x===measure.tasks.x&&measure.theme.w>measure.tasks.w+measure.habits.w,'theme must span first two columns');
  } else if(width>=375){
   const half=(width-30)/2;
   assert.ok(measure.tasks.w>=half-8&&measure.habits.w>=half-8,'mobile cards too narrow');
   assert.ok(measure.tasks.x<measure.habits.x,'mobile Tasks must be left of Habits');
   assert.ok(Math.abs(measure.tasks.y-measure.habits.y)<=4,'mobile Tasks and Habits not paired');
   assert.ok(measure.wellness.w>=width-25&&measure.wellness.y>=measure.tasks.y+measure.tasks.h-4,'mobile Wellness not full-width below cards');
   assert.ok(measure.missions.x<measure.ranks.x&&Math.abs(measure.missions.y-measure.ranks.y)<=4,'mobile Missions and Ranking must be paired');
   assert.ok(measure.friends.w>=width-25,'mobile friends not full width');
   assert.ok(measure.hero.h<=185,'mobile hero too tall');
  } else {
   assert.ok(measure.tasks.w>=width-30&&measure.habits.w>=width-30,'320px must use readable single-column cards');
  }
 }finally{await page.close()}
}
writeFileSync(out+'/reference-geometry.json',JSON.stringify(rows,null,2));await browser.close();console.log('PASS: responsive reference geometry at seven widths.');
