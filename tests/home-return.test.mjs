import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const routeNames=['tasks','habits','goals'];
class Element {
  constructor(type='div'){this.type=type;this.dataset={};this.children=[];this.attributes={};this.hidden=false;}
  append(child){this.children.push(child);child.parent=this;}
  setAttribute(name,value){this.attributes[name]=value;}
  querySelector(selector){
    if(selector==='header')return this.header||null;
    if(selector==='.section-heading')return this.heading||null;
    if(selector.startsWith('#elara-home-'))return this.homeContent||null;
    if(selector==='[data-elara-home-return]')return this.children.find(x=>x.dataset.elaraHomeReturn)||null;
    if(selector.startsWith('[data-elara-tab='))return this.children.find(x=>x.dataset.elaraTab===selector.match(/"([^"]+)"/)[1])||null;
    return null;
  }
  closest(selector){return selector==='.elara-card'?this.card||null:null;}
}
const elements={};
for(const route of routeNames){
  const card=new Element();const header=new Element('header');const content=new Element();
  card.header=header;card.homeContent=content;content.card=card;
  elements[`elara-home-${route}`]=content;
  const panel=new Element();panel.heading=new Element();elements[`panel-${route}`]=panel;
}
const docHandlers={};const windowHandlers={};const location={hash:'#home'};
const document={readyState:'complete',getElementById:key=>elements[key]||null,createElement:tag=>new Element(tag),addEventListener:(name,handler)=>{docHandlers[name]=handler}};
const window={addEventListener:(name,handler)=>{windowHandlers[name]=handler}};
window.ElaraOpen=route=>{location.hash='#'+route;windowHandlers['elara:open']?.({detail:{tab:route}})};
vm.runInNewContext(fs.readFileSync(new URL('../approved-home-return.js',import.meta.url),'utf8'),{document,window,location,decodeURIComponent});
const goalsCard=elements['elara-home-goals'].card;
const link=goalsCard.header.children.find(x=>x.dataset.elaraTab==='goals');
assert.equal(link?.textContent,'همه ›','missing full page link');
const click=(target,card)=>docHandlers.click({target:{closest:selector=>selector==='[data-elara-home-return]'&&target.dataset.elaraHomeReturn?target:selector==='[data-elara-tab]'&&target.dataset.elaraTab?{dataset:target.dataset,closest:()=>card}:null},preventDefault(){},stopPropagation(){}});
click(link,goalsCard);window.ElaraOpen('goals');
const back=elements['panel-goals'].heading.children.find(x=>x.dataset.elaraHomeReturn==='goals');
assert.equal(back?.hidden,false,'home-linked destination missing visible back control');
click(back);assert.equal(location.hash,'#home');assert.equal(back.hidden,true,'back does not return to Home');
const tab=new Element('button');tab.dataset.elaraTab='tasks';click(tab,null);window.ElaraOpen('tasks');
assert.equal(elements['panel-tasks'].heading.children[0].hidden,true,'direct tab must not show Home back button');
window.ElaraOpen('home');click(link,goalsCard);window.ElaraOpen('goals');window.ElaraOpen('habits');
assert.equal(back.hidden,true,'stale back button after subsequent navigation');
for(const route of routeNames)assert.equal(elements[`elara-home-${route}`].card.header.children.length,1,'duplicate all link');
console.log('PASS: Home links, conditional return, direct tab, subsequent route, no duplicated links');
