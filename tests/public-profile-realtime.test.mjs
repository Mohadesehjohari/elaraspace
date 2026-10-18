import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const live = read('public-profile-realtime-20261019.js');
const editor = read('profile-edit-redesign.js');
const social = read('elara-social.js');
const rules = read('firestore.rules');
const page = read('index.html');
const manifest = JSON.parse(read('deploy/production-manifest.json'));
assert.match(page,/public-profile-realtime-20261019\.js/);
assert.ok(manifest.files.includes('public-profile-realtime-20261019.js'));
assert.ok(manifest.files.includes('public-profile-live-20261019.css'));
assert.match(rules,/validProfileAppearance/);
assert.match(editor,/appearance:publicAppearance/);
assert.match(social,/const patch=\{name,bio,profilePublic\}/);
assert.match(social,/await updateDoc\(profileRef,patch\)/);

const dom = new JSDOM('<!doctype html><html lang="fa"><body>'+
  '<div class="elara-profile-dialog" data-profile-uid="bob">'+
  '<div class="pass4-public-profile-summary"></div>'+
  '<p class="elara-profile-bio">Old bio</p>'+
  '<div class="pass4-profile-facts"><span></span><span></span><span></span></div>'+
  '</div></body></html>', {
  url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true
});
const w=dom.window,d=w.document;
const listeners=new Map();
let rendered=0,closed=0,stopped=0;
const fakeApp={getApps:()=>[{}],getApp:()=>({})};
const fakeDb={
  getFirestore:()=>({}),
  doc:(db,collection,id)=>({collection,id}),
  onSnapshot:(ref,onNext,onError)=>{listeners.set(ref.id,{onNext,onError});return ()=>{listeners.delete(ref.id);stopped++}}
};
w.__elaraFakeModule=async url=>url.includes('/firebase-app.js')?fakeApp:fakeDb;
w.ElaraAccount={user:{uid:'alice'},profile:{username:'alice'}};
w.ElaraSocial={friends:[{uid:'bob',name:'Bob',username:'bob',bio:'Old bio',profilePublic:true}],requests:[],profileView:{uid:'bob',name:'Bob',bio:'Old bio',profilePublic:true}};
w.ElaraSocialView={render:()=>{rendered++}};
w.ElaraProfileSystem={viewModel:p=>({name:p.name,level:2,title:'سطح دوم',xp:p.xp||0}),composition:p=>'<div class="elara-profile-composition" data-profile-uid="bob">'+p.name+'</div>'};
w.ElaraDialog={close:()=>{closed++}};
w.console.warn=()=>{};
w.eval(live.replaceAll("import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js')",
    "window.__elaraFakeModule('firebase-app.js')").replaceAll(
    "import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')",
    "window.__elaraFakeModule('firebase-firestore.js')"));
d.dispatchEvent(new w.Event('DOMContentLoaded'));
w.dispatchEvent(new w.Event('elara:account-ready'));
await new Promise(resolve=>setTimeout(resolve,30));
assert.ok(listeners.has('bob'),'Friend profile must have a realtime subscription');
listeners.get('bob').onNext({exists:()=>true,data:()=>({name:'Bob Updated',username:'bob',bio:'The new biography',profilePublic:true,appearance:{color:'violet',title:'Stargazer'}})});
assert.equal(w.ElaraSocial.friends[0].bio,'The new biography');
assert.equal(d.querySelector('.elara-profile-bio').textContent,'The new biography');
assert.match(d.querySelector('.pass4-public-profile-summary').textContent,/Bob Updated/);
assert.ok(rendered>=1,'Friend list must re-render after a profile snapshot');
w.ElaraPublicProfileSync.refresh();
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(w.ElaraSocial.friends[0].bio,'The new biography');
listeners.get('bob').onNext({exists:()=>true,data:()=>({name:'Bob Updated',username:'bob',bio:'Private',profilePublic:false,appearance:{}})});
assert.equal(closed,0,'Accepted friends should retain access to private-to-public-off profiles');
w.ElaraSocial.friends=[];
w.dispatchEvent(new w.Event('elara:social-updated'));
await new Promise(resolve=>setTimeout(resolve,20));
w.ElaraPublicProfileSync.stop();
assert.equal(listeners.size,0,'Logout must unsubscribe all profile listeners');
assert.ok(stopped>0);
dom.window.close();
console.log('PASS: other-account Bio, name and cosmetic changes update friend list and open visitor profile in real time.');
