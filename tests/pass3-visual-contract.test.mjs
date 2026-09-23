import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const pass3=read('visual-fidelity-pass3.js');
const approved=read('approved-visual.js');
const design=read('elara-design.js');
const drawer=read('drawer.js');
const social=read('elara-social.js');
const wellness=read('approved-wellness.js');
const nav=read('approved-navigation-extension.js');
const boot=read('boot.js');

const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const memory=new Map();
memory.set('elara_space_v1',JSON.stringify({
  tasks:[
    {id:'r',text:'recurring',priority:1,recurrenceRule:{type:'daily'},occurrenceDone:[today()]},
    {id:'n',text:'normal',priority:3,completed:false,dueTime:'10:30',folder:'کار'}
  ],
  habits:[{id:'h',title:'مطالعه',days:[today()]}],
  goals:[{id:'g',title:'هدف',steps:[{done:true},{done:false}]}]
}));
memory.set('elara_language_journal_v1_U',JSON.stringify([{id:'j',date:today(),minutes:35,words:4,note:''}]));
const elements={};
const document={readyState:'loading',addEventListener(){},getElementById:id=>elements[id]||null,querySelector(){return null},querySelectorAll(){return[]}};
const window={ElaraAccount:{user:{uid:'U'}},ElaraMissions:{snapshot:()=>[{name:'ماموریت',amount:2,target:4,rewardXp:30}]},addEventListener(){}};
const localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
vm.runInNewContext(pass3,{window,document,localStorage,Date,Intl,JSON,Number,String,Array,Math,Set,console,setTimeout});
const p=window.ElaraVisualPass3Test;
assert.ok(p,'Pass 3 test surface missing');
assert.equal(p.taskDone(JSON.parse(memory.get('elara_space_v1')).tasks[0]),true,'recurring occurrenceDone must drive Home task completion');
assert.equal(p.goalPct(JSON.parse(memory.get('elara_space_v1')).goals[0]),50);
assert.equal(p.habitPct(JSON.parse(memory.get('elara_space_v1')).habits[0]),100);
assert.deepEqual(JSON.parse(JSON.stringify(p.priority(1))),{n:1,label:'P1',cls:'p1'});
assert.match(p.metaTask(JSON.parse(memory.get('elara_space_v1')).tasks[1]),/10:30/);
const model=p.homeModel();
assert.equal(model.tasks.length,2);
assert.equal(model.missions[0].rewardXp,30);
assert.deepEqual(JSON.parse(JSON.stringify(p.HOME_ORDER)),['elara-home-tasks','elara-home-habits','elara-home-missions','elara-home-goals','elara-home-ranks','elara-home-social','elara-home-activity','elara-home-freedom']);
assert.equal(p.journalSeries().reduce((n,x)=>n+x.minutes,0),35);

// Behavioral DOM contract: Focus is moved inside the existing Tasks card; it is not cloned.
class ClassList{constructor(){this.s=new Set()}add(...x){x.forEach(v=>this.s.add(v))}contains(x){return this.s.has(x)}}
const taskCard={children:[],append(node){this.children.push(node)},contains(node){return this.children.includes(node)},classList:new ClassList()};
const focusCard={classList:new ClassList()};
elements['elara-home-tasks']={closest:sel=>sel==='.elara-card'?taskCard:null};
elements['elara-home-focus']={closest:sel=>sel==='.elara-card'?focusCard:null};
p.ensureFocusInsideTasks();
assert.equal(taskCard.children.length,1);
assert.equal(taskCard.children[0],focusCard);
assert.ok(focusCard.classList.contains('pass3-focus-subcard'));
p.ensureFocusInsideTasks();
assert.equal(taskCard.children.length,1,'Focus must not be duplicated');

const languageMarkup=approved.match(/panel\.innerHTML=`([\s\S]*?)`;\n main\.prepend\(panel\)/)?.[1]||'';
assert.equal((languageMarkup.match(/pass3-language-block/g)||[]).length,4,'Language must expose exactly four primary blocks');
for(const key of ['pass3-language-leitner','pass3-language-books','pass3-language-report','pass3-language-courses'])assert.ok(languageMarkup.includes(key),`Missing Language block ${key}`);
assert.ok(approved.includes("if(event.target.closest('[data-lang-leitner]')){window.ElaraOpen?.('words');return}"),'Leitner CTA must open words');
assert.ok(!approved.includes("tab==='words'?'language':tab"),'words route must never be globally remapped to language');

const mainSource=nav.match(/const MAIN=Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1]||'';
const defs=[...mainSource.matchAll(/route:'([^']+)',label:'([^']+)'/g)].map(m=>[m[1],m[2]]);
assert.deepEqual(defs,[['exercise','ورزش'],['language','زبان'],['tasks','تسک‌ها'],['home','خانه'],['ranking','رنکینگ'],['books','کتابخانه'],['freedom','آزادی']]);
assert.equal(defs[3][0],'home');

assert.ok(wellness.includes('data-workout-custom')&&wellness.includes('name="customType"'),'Custom workout text field missing');
assert.ok(wellness.includes('name="note"')&&wellness.includes('function normalizeCycle('),'Cycle optional note must persist');
assert.ok(wellness.includes("row.dataset.extensionRoute='exercise'"),'Home water/sleep rows must route to exercise');
assert.ok(pass3.includes("e.target.closest('[data-wellness-home]')")&&pass3.includes("window.ElaraOpen?.('exercise')"),'Pass 3 must preserve wellness Home route');
const wellnessWindow={ElaraAccount:{user:{uid:'U'}},addEventListener(){}};
vm.runInNewContext(wellness,{window:wellnessWindow,document,localStorage,Date,Intl,JSON,Number,String,Array,Math,console,setTimeout});
const wh=wellnessWindow.ElaraWellnessTest;
assert.ok(wh,'Wellness test surface missing');
const custom=wh.normalizeWorkout({type:'ورزش دیگر',customType:'  صخره‌نوردی  ',minutes:'45',date:today()},{},'w1');
assert.equal(custom.type,'ورزش دیگر');assert.equal(custom.customType,'صخره‌نوردی');assert.equal(custom.minutes,45);
const cycle=wh.normalizeCycle({start:today(),end:'',note:'  یادداشت خصوصی  '},{},'c1');
assert.equal(cycle.note,'یادداشت خصوصی');

const pictographic=/[\u{1F300}-\u{1FAFF}]/u;
for(const [name,source] of [['approved-visual.js',approved],['elara-design.js',design],['drawer.js',drawer],['elara-social.js',social]])assert.ok(!pictographic.test(source),`${name} still emits platform pictographic emoji`);
assert.ok(boot.indexOf("approved-icon-system.js")<boot.indexOf("elara-design.js"),'Shared icon system must load before renderers');
assert.ok(boot.includes('visual-fidelity-pass3.css')&&boot.includes('visual-fidelity-pass3.js'),'Pass 3 assets must be loaded');
assert.ok(social.includes('دوستت')&&social.includes('درخواست فرستاده شده')&&social.includes('درخواست دوستی'),'Friendly social wording missing');

console.log('PASS: Pass 3 behavior/data contracts, four-block Language, Focus nesting, seven-route order, emoji source cleanup, Wellness extensions and social wording. Browser/Firebase not tested.');
