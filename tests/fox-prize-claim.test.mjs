import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../elara-fox-prize.js',import.meta.url),'utf8');
class Fake{
 constructor(){this.children=[];this.dataset={};this.attrs={};this.handlers={};this.parentNode=null;this.style={setProperty(){}};this.classList={add(name){this.last=name},remove(name){this.removed=name}};this.textContent=''}
 setAttribute(k,v){this.attrs[k]=v}
 append(...kids){for(const k of kids){this.children.push(k);k.parentNode=this}}
 prepend(...kids){for(const k of kids.reverse()){this.children.unshift(k);k.parentNode=this}}
 insertBefore(child,ref){const i=this.children.indexOf(ref);this.children.splice(i<0?this.children.length:i,0,child);child.parentNode=this}
 before(node){this.parentNode?.insertBefore(node,this)}
 after(node){if(this.parentNode){const i=this.parentNode.children.indexOf(this);this.parentNode.children.splice(i+1,0,node);node.parentNode=this.parentNode}}
 addEventListener(name,cb){(this.handlers[name]??=[]).push(cb)}
 querySelector(s){return s==='.elara-fox-actions'?this.actions:null}
}
const saved=new Map(),events={},store={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
const doc={documentElement:{lang:'fa'},createElement:()=>new Fake(),querySelector:()=>null,addEventListener:(name,fn)=>{events[name]=fn}};
const win={ElaraAccount:{user:{uid:'a'}},ElaraFoxRewards:{options:{visible:true,celebrations:true},refresh(){}},addEventListener(){}};
const context={window:win,document:doc,localStorage:store,Date,setTimeout,clearTimeout};
vm.runInNewContext(src,context);
const api=win.ElaraFoxClaim;
assert.equal(api.prefs().sound,false,'sound starts muted');
assert.equal(api.prefs().motion,true);
function modal(data){
 const dialog=new Fake(),img=new Fake(),actions=new Fake(),shade=new Fake(),primary=new Fake(),secondary=new Fake();
 dialog.actions=actions;dialog.append(img,actions);
 api.present({shade,dialog,data,primary,secondary,img});
 return {primary,secondary,dialog,shade};
}
function collect(primary){let blocked=0;primary.handlers.click[0]({preventDefault(){blocked++},stopImmediatePropagation(){blocked++}});return blocked}
saved.set('elara_space_v1',JSON.stringify({xp:300,missionRewardClaims:['daily:first-task']}));
const first=modal({key:'mission:daily:first-task',kind:'mission',title:'Mission finished',image:'celebrate',rewardXp:35,stars:2,primary:'View missions',go:'missions'});
assert.equal(api.read().pending.length,1,'real award is claimable if modal is dismissed');
assert.equal(api.read().totalStars,0);
assert.equal(collect(first.primary),2,'first click intercepts navigation and collects');
assert.equal(api.read().totalStars,2,'stars persisted');
assert.equal(api.read().pending.length,0);
assert.equal(api.read().claimedKeys.length,1);
assert.equal(first.primary.textContent,'View missions');
assert.equal(first.dialog.dataset.foxPhase,'collected','visual success state must differ from unopened chest');
assert.equal(first.dialog.classList.last,'is-fox-prize-collected');
assert.equal(JSON.parse(saved.get('elara_space_v1')).xp,300,'reward UI must never mint XP');
assert.equal(api.wasClaimed('mission:daily:first-task'),true);
modal({key:'mission:daily:first-task',kind:'mission',title:'Repeat'});
assert.equal(api.read().totalStars,2,'cannot double claim');
modal({key:'domain:goal:2',kind:'goal',title:'Goal reached',image:'goals'});
assert.equal(api.read().pending.length,1,'dismissed reward remains pending');
const demo=modal({key:'preview:level:1',kind:'level',title:'Demo'});
collect(demo.primary);
assert.equal(api.read().pending.length,1,'preview must not enter vault');
assert.equal(api.read().totalStars,2,'preview must not earn collectibles');
win.ElaraAccount.user.uid='b';
assert.equal(api.read().totalStars,0,'vault isolated by signed-in account');
win.ElaraAccount.user.uid='a';
const input={dataset:{foxPrizeSetting:'sound'},checked:true,closest:()=>input};
events.change({target:input});
assert.equal(api.prefs().sound,true,'audio toggle persisted');
const ceremonyCss=readFileSync(new URL('../elara-fox-prize.css',import.meta.url),'utf8');
assert.match(ceremonyCss,/prefers-reduced-motion/);
assert.match(ceremonyCss,/elara-fox-treasure-lid/);
assert.match(ceremonyCss,/is-fox-prize-collected \.elara-fox-victory-mark/);
assert.match(src,/fox-celebrate\.webp/);
assert.match(src,/elara-fox-claim-progress/);
assert.match(readFileSync(new URL('../elara-fox-rewards.js',import.meta.url),'utf8'),/ElaraFoxClaim\?\.present/);
console.log('FOX_PRIZE_PASS claim persists, no duplicate, unpaid later, preview, XP stable, audio, account isolation');
