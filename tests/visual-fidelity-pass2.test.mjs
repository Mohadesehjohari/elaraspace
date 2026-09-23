import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const pass2=readFileSync(new URL('visual-fidelity-pass2.js',root),'utf8');
const wellness=readFileSync(new URL('approved-wellness.js',root),'utf8');

const memory=new Map();
memory.set('elara_space_v1',JSON.stringify({words:[
  {id:'a',front:'a',back:'A',box:1,due:'2000-01-01'},
  {id:'b',front:'b',back:'B',box:3,due:'2000-01-01'},
  {id:'c',front:'c',back:'C',box:2,due:'2999-01-01'}
]}));
memory.set('elara_privacy_local_v1_U',JSON.stringify({showWellnessHome:false}));
const doc={readyState:'loading',getElementById(){return null},querySelector(){return null},addEventListener(){}};
const window={ElaraAccount:{user:{uid:'U'}},ElaraPrivacyLocal:{read:()=>({showWellnessHome:false}),wellnessHomeVisible:()=>false},addEventListener(){}};
const localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
vm.runInNewContext(pass2,{window,document:doc,localStorage,location:{},history:{},MutationObserver:class{},setTimeout,Date,Intl,Set,JSON,Number,String,Array,Math,console});
const p=window.ElaraVisualPass2Test;
assert.ok(p,'pass2 test surface missing');
const due=p.dueWords();
assert.equal(due.due.length,2);
assert.equal(due.newCount,1);
assert.equal(due.revisit,1);
assert.equal(p.wellnessHomeVisible(),false);
const d=new Date();d.setHours(12,0,0,0);
const iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
const active=new Set();for(let i=0;i<3;i++){const x=new Date(d);x.setDate(x.getDate()-i);active.add(iso(x))}
assert.equal(p.streakCount(active),3);
for(const token of ['pruneSidebar','restoreLeitner','reorderHome','enforceWellnessPrivacy','data-pass2-open-leitner','data-approved-wardrobe'])assert.ok(pass2.includes(token),`pass2 missing ${token}`);
assert.ok(!pass2.includes('function upgradePrivacy'),'Privacy renderer must be owned by drawer.js, not patched by Pass 2');
assert.ok(!pass2.includes('data-pass2-privacy'),'Legacy Pass 2 privacy controls must not remain');

const wWindow={ElaraAccount:{user:{uid:'U'}},addEventListener(){}};
vm.runInNewContext(wellness,{window:wWindow,document:doc,localStorage,Date,Intl,JSON,Number,String,Array,Math,console});
const w=wWindow.ElaraWellnessTest;
assert.ok(w,'wellness test surface missing');
assert.equal(w.defaults().targetWeight,'');
assert.equal(w.sleepMinutes({date:'2026-09-22',bed:'23:00',wake:'07:00'}),480);
const empty=w.lineChart([0,0,0,0,0,0,0],'sleep');
assert.match(empty,/wellness-empty-chart/);
const line=w.lineChart([7,8,6,7.5,8,0,7],'sleep');
assert.match(line,/<polyline/);
assert.match(line,/class="point"/);
assert.doesNotMatch(line,/wellness-chart-track/);
for(const token of ['wellness-water-glass-fill','wellness-target-weight','targetWeight','wellness-personal-settings'])assert.ok(wellness.includes(token),`wellness missing ${token}`);
assert.ok(!wellness.includes('حریم خصوصی و انتخاب اختیاری'),'legacy wellness privacy heading must be removed');

console.log('PASS: Pass 2 route/privacy helpers, Leitner contract tokens, target weight and compact sleep line-chart helpers. Browser/Firebase not tested.');
