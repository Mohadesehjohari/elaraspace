import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');

const navigation=read('approved-navigation-extension.js');
const design=read('elara-design.js');
const drawer=read('drawer.js');
const approvedVisual=read('approved-visual.js');
const focusDialog=read('approved-focus-dialog.js');
const iconSystem=read('approved-icon-system.js');
const pass2=read('visual-fidelity-pass2.js');
const pass3=read('visual-fidelity-pass3.js');
const social=read('elara-social.js');
const wellness=read('approved-wellness.js');
const app=read('app.js');
const phase2=read('phase2.js');
const rpg=read('rpg.js');
const cloud=read('cloud.js');
const boot=read('boot.js');
const html=read('index.html');

class ClassList{
  constructor(){this.items=new Set()}
  add(...items){for(const item of items)if(item)this.items.add(item)}
  remove(...items){for(const item of items)this.items.delete(item)}
  contains(item){return this.items.has(item)}
  toggle(item,force){
    if(force===true){this.items.add(item);return true}
    if(force===false){this.items.delete(item);return false}
    if(this.items.has(item)){this.items.delete(item);return false}
    this.items.add(item);return true
  }
}
class El{
  constructor(tag='div'){
    this.tagName=tag.toUpperCase();this.dataset={};this.children=[];this.attributes=new Map();
    this.classList=new ClassList();this._className='';this.innerHTML='';this.parentNode=null;
  }
  set className(value){this._className=String(value||'');this.classList=new ClassList();for(const x of this._className.split(/\s+/).filter(Boolean))this.classList.add(x)}
  get className(){return [...this.classList.items].join(' ')}
  append(...nodes){for(const n of nodes){if(!n)continue;n.parentNode=this;this.children.push(n)}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes)}
  setAttribute(name,value){this.attributes.set(name,String(value));if(name==='class')this.className=value}
  getAttribute(name){return this.attributes.get(name)??null}
  removeAttribute(name){this.attributes.delete(name)}
}
const body=new El('body');
const bottom=new El('nav');bottom.className='bottom-nav';body.append(bottom);
const sidebar=new El('aside');sidebar.className='sidebar';body.append(sidebar);
const sideNav=new El('nav');sideNav.className='navigation';sidebar.append(sideNav);
const identity=new El('a');identity.className='identity';body.append(identity);

const walk=node=>[node,...node.children.flatMap(walk)];
const document={
  readyState:'complete',
  body,
  createElement:tag=>new El(tag),
  addEventListener(){},
  querySelector(selector){
    if(selector==='.bottom-nav')return bottom;
    if(selector==='.sidebar .navigation')return sideNav;
    if(selector==='.identity')return identity;
    if(selector==='.elara-desktop-dock')return walk(body).find(x=>x.classList?.contains('elara-desktop-dock'))||null;
    return null;
  },
  querySelectorAll(selector){
    if(selector==='[data-elara-nav-kind]')return walk(body).filter(x=>x.dataset?.elaraNavKind);
    return [];
  }
};
const window={
  ElaraIcons:{icon:name=>`<span class="elara-icon" data-test-icon="${name}"></span>`},
  addEventListener(){}
};
const location={hash:'#home'};
vm.runInNewContext(navigation,{window,document,location,Object,console:{log(){},warn(){},error(){}}});

const navApi=window.ElaraNavigation;
assert.ok(navApi,'canonical navigation API missing');
const routes=navApi.routes.map(x=>x.route);
const labels=navApi.routes.map(x=>x.label);
assert.deepEqual(JSON.parse(JSON.stringify(routes)),['exercise','language','tasks','home','ranking','books','freedom']);
assert.deepEqual(JSON.parse(JSON.stringify(labels)),['ورزش','زبان','تسک‌ها','خانه','رنکینگ','کتابخانه','آزادی']);

const childRoutes=rootEl=>rootEl.children.map(x=>x.dataset.elaraTab);
assert.deepEqual(childRoutes(bottom),routes,'mobile nav must render exactly the canonical seven routes');
const dock=document.querySelector('.elara-desktop-dock');
assert.ok(dock,'desktop dock was not created');
assert.deepEqual(childRoutes(dock),routes,'desktop dock must share the exact canonical route order');
assert.equal(bottom.children.length,7);
assert.equal(dock.children.length,7);
assert.equal(bottom.children[3].dataset.elaraTab,'home');
assert.ok(bottom.children[3].classList.contains('elara-home-main'));
assert.ok(bottom.children[3].classList.contains('active'));
assert.equal(bottom.children[3].getAttribute('aria-current'),'page');

const legacyMain=new Set(['habits','goals','focus','missions','social']);
assert.equal(routes.filter(x=>legacyMain.has(x)).length,0,'complementary routes must not re-enter main nav');
const sideRoutes=childRoutes(sideNav);
assert.deepEqual(sideRoutes,['home','habits','goals','focus','missions','social','reports']);
const dockSet=new Set(routes);
assert.deepEqual(sideRoutes.filter(x=>dockSet.has(x)),['home'],'Sidebar may duplicate only Home from the desktop dock');

// Idempotence: rendering twice must stay at seven items and create no second dock.
navApi.render();
assert.deepEqual(childRoutes(bottom),routes);
assert.equal(bottom.children.length,7);
assert.equal(walk(body).filter(x=>x.classList?.contains('elara-desktop-dock')).length,1);
assert.ok(!navigation.includes('MutationObserver'),'canonical navigation must not oscillate via MutationObserver');

// No other active renderer may own Bottom/Dock composition.
assert.ok(!design.includes('.bottom-nav'),'elara-design.js must not write Bottom Nav');
assert.ok(!drawer.includes('.bottom-nav')&&!drawer.includes('rebuildMobileNav'),'drawer.js must not rebuild Bottom Nav');
assert.ok(!approvedVisual.includes('.bottom-nav')&&!approvedVisual.includes('function nav(){'),'approved-visual.js must not rewrite Bottom Nav');
assert.ok(!rpg.includes('insertBefore(makeNav')&&!rpg.includes("data-tab='missions'"),'RPG must not inject legacy navigation entries');
assert.ok(!pass2.includes('.bottom-nav'),'Pass 2 must not rewrite Bottom Nav');
assert.ok(!pass3.includes('.bottom-nav'),'Pass 3 must not rewrite Bottom Nav');
assert.ok(!boot.includes("'approved-nav-icons.js'")&&!boot.includes("'approved-icons.js'"),'legacy icon patch modules must not be active');
assert.ok(boot.indexOf("'approved-icon-system.js'")<boot.indexOf("'approved-navigation-extension.js'"));
assert.ok(boot.indexOf("'approved-navigation-extension.js'")<boot.indexOf("'elara-design.js'"));

// Initial HTML must be neutral/canonical, not a five-item legacy flash.
const initialBottom=html.match(/<nav class="bottom-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1]??null;
assert.notEqual(initialBottom,null,'Bottom Nav mount missing from index.html');
assert.equal(initialBottom.trim(),'','initial Bottom Nav mount must be empty for canonical runtime rendering');
assert.match(html,/<a class="identity" href="#home"/);
const initialSidebar=html.match(/<nav class="navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
assert.ok(!/data-tab=/.test(initialSidebar),'initial Sidebar must not use legacy data-tab writer markup');
for(const mainRoute of ['tasks','language','books','ranking','exercise','freedom']){
  assert.ok(!new RegExp(`href="#${mainRoute}"`).test(initialSidebar),`initial Sidebar must not duplicate ${mainRoute}`);
}

// Home Focus must have exactly one actionable CTA, owned by approved-focus-dialog.
const homeBlock=design.slice(design.indexOf('function home(){'),design.indexOf('function makeSections(){'));
assert.equal((homeBlock.match(/data-approved-focus/g)||[]).length,1,'Home Focus must have exactly one canonical CTA');
assert.equal((homeBlock.match(/data-elara-tab="focus"/g)||[]).length,0,'Home Focus must not keep a parallel route CTA');
assert.ok(!/insertAdjacentHTML\([^\n]*data-approved-focus/.test(approvedVisual),'approved-visual.js must not inject a second Focus CTA');
assert.ok(!approvedVisual.includes('data-approved-focus'),'approved-visual.js must not own a parallel Focus CTA handler');
assert.match(focusDialog,/\[data-approved-focus\]/);
assert.match(focusDialog,/content\.append\(card\)/,'Focus dialog must move the real timer card');
assert.match(focusDialog,/marker\.replaceWith\(card\)/,'Focus dialog must restore the real timer card');
assert.ok(!focusDialog.includes('cloneNode'),'Focus dialog must not clone timer/session DOM');
assert.ok(!focusDialog.includes('timer-reset'),'opening Home Focus must not reset the timer');

// Wider BMP-symbol guard: primary runtime renderers cannot emit platform-dependent pictographic glyphs.
const forbidden=/[☑⚙⌂♛♧◐☀☾◉◎▤◈◷◇✦✧▥▣◫⌕★]/u;
for(const [name,source] of [
  ['index.html',html],['app.js',app],['phase2.js',phase2],['rpg.js',rpg],['cloud.js',cloud],
  ['elara-design.js',design],['drawer.js',drawer],['approved-visual.js',approvedVisual],
  ['approved-focus-dialog.js',focusDialog],['approved-navigation-extension.js',navigation],
  ['elara-social.js',social],['approved-wellness.js',wellness]
]){
  assert.ok(!forbidden.test(source),`${name} still contains a forbidden graphical glyph`);
}
assert.ok(iconSystem.includes('window.ElaraIcons={icon,badge,hydrate,paths,assets}'),'shared icon system must remain the renderer source of truth');

console.log('PASS: canonical 7-item DOM navigation, idempotent render, complementary Sidebar, single Home Focus CTA, initial markup cleanup, and extended forbidden-glyph contract. Browser E2E not tested.');
