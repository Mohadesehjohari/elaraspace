import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const profileSource=read('approved-profile-system.js');
const drawerSource=read('drawer.js');
const visualSource=read('approved-visual.js');
const pass2Source=read('visual-fidelity-pass2.js');
const socialSource=read('elara-social.js');
const visualCss=read('approved-visual.css');
const pass4Css=read('visual-fidelity-pass4.css');
const designCss=read('elara-design.css');
const designSource=read('elara-design.js');
const indexHtml=read('index.html');

class ClassList{
  constructor(){this.s=new Set()}
  add(...items){items.forEach(x=>this.s.add(x))}
  remove(...items){items.forEach(x=>this.s.delete(x))}
  contains(x){return this.s.has(x)}
  toggle(x,on){if(on===undefined)on=!this.s.has(x);on?this.s.add(x):this.s.delete(x);return on}
}
const memory=new Map();
const localStorage={
  getItem:k=>memory.has(k)?memory.get(k):null,
  setItem:(k,v)=>memory.set(k,String(v)),
  removeItem:k=>memory.delete(k)
};
const documentMock={
  readyState:'loading',
  body:{classList:new ClassList(),dataset:{}},
  documentElement:{dataset:{}},
  addEventListener(){},
  getElementById(){return null},
  querySelector(){return null},
  querySelectorAll(){return[]}
};
const windowMock={
  ElaraAccount:{user:{uid:'A',photoURL:''}},
  ElaraSocial:{me:{uid:'A',name:'Aren',username:'aren',xp:0}},
  addEventListener(){},
  dispatchEvent(){}
};
class CustomEventMock{constructor(type,init={}){this.type=type;this.detail=init.detail}}
vm.runInNewContext(profileSource,{
  window:windowMock,document:documentMock,localStorage,CustomEvent:CustomEventMock,
  Event:class{constructor(type){this.type=type}},JSON,Number,String,Math,Object,Array,console
});
const ps=windowMock.ElaraProfileSystem;
assert.ok(ps,'shared profile system missing');

assert.equal(ps.readWardrobe().avatarGroup,null);
assert.equal(ps.readWardrobe().avatarLevel,null);
ps.writeWardrobe({avatarGroup:'male'});
assert.equal(ps.readWardrobe().avatarGroup,'male');
assert.equal(ps.readWardrobe().avatarLevel,null,'choosing a group must not silently equip level 1');

assert.equal(ps.avatarPath('male',1),'assets/avatars-male-level1.png');
assert.equal(ps.avatarPath('male',10),'assets/avatars-male-level10.png');
assert.equal(ps.avatarPath('female',1),'assets/avatars_female_level1.png');
assert.equal(ps.avatarPath('female',10),'assets/avatars_female_level10.png');
assert.deepEqual(JSON.parse(JSON.stringify(ps.FRAMES.map(x=>[x.id,x.required,x.path]))),[
  ['bronze',1,'assets/frames_bronze.png'],
  ['silver',4,'assets/frames_silver.png'],
  ['gold',7,'assets/frames_gold.png'],
  ['diamond',10,'assets/frames_diamond.png']
]);

for(const n of [1,2,3])assert.equal(ps.frameForLevel(n).id,'bronze');
for(const n of [4,5,6])assert.equal(ps.frameForLevel(n).id,'silver');
for(const n of [7,8,9])assert.equal(ps.frameForLevel(n).id,'gold');
assert.equal(ps.frameForLevel(10).id,'diamond');

assert.equal(ps.canEquipAvatar('male',4,3),false);
assert.equal(ps.canEquipAvatar('male',4,4),true);
assert.equal(ps.canEquipFrame('silver',3),false);
assert.equal(ps.canEquipFrame('silver',4),true);
assert.equal(ps.canEquipFrame('diamond',9),false);
assert.equal(ps.canEquipFrame('diamond',10),true);

ps.writeWardrobe({avatarLevel:1,frame:'bronze',banner:'moon'});
windowMock.ElaraAccount.user={uid:'B',photoURL:''};windowMock.ElaraSocial.me={uid:'B',name:'B',username:'b',xp:0};
assert.equal(ps.readWardrobe().avatarGroup,null);
assert.equal(ps.readWardrobe().frame,null);
ps.writeWardrobe({avatarGroup:'female',avatarLevel:1,banner:'dream'});
assert.equal(ps.readWardrobe().avatarGroup,'female');
windowMock.ElaraAccount.user=null;windowMock.ElaraSocial.me=null;
ps.writeWardrobe({avatarGroup:'male',avatarLevel:2});
assert.equal(ps.readWardrobe().avatarLevel,2);
windowMock.ElaraAccount.user={uid:'A',photoURL:''};windowMock.ElaraSocial.me={uid:'A',name:'Aren',username:'aren',xp:0};
assert.equal(ps.readWardrobe().avatarGroup,'male');
assert.equal(ps.readWardrobe().avatarLevel,1);
assert.equal(ps.readWardrobe().banner,'moon');

const view=ps.viewModel({uid:'A',name:'Aren',username:'aren',xp:0},{self:true});
const composition=ps.composition(view);
assert.match(composition,/elara-profile-avatar-img/);
assert.match(composition,/elara-profile-frame-img/);
assert.match(composition,/banner-moon\.svg/);
assert.match(composition,/Level 1/);

const wardrobeClickBlock=visualSource.slice(visualSource.indexOf("const itemButton=event.target.closest('[data-wardrobe-item]')"),visualSource.indexOf("const toggle=event.target.closest('[data-language-book-toggle]')"));
assert.match(wardrobeClickBlock,/selectedPreview=preview/);
assert.match(wardrobeClickBlock,/if\(!locked&&system\.canEquipAvatar/);
assert.match(wardrobeClickBlock,/if\(!locked&&system\.canEquipFrame/);
assert.match(wardrobeClickBlock,/if\(!locked&&system\.canEquipBanner/);
assert.ok(visualSource.includes("const p=wardrobe(),group=p.avatarGroup"),'Wardrobe must not default avatarGroup');
assert.ok(!visualSource.includes("p.avatarGroup||'female'"));
assert.ok(visualSource.includes('آپلود عکس شخصی Level 3 هنوز پیاده‌سازی نشده'),'Personal upload must be honestly marked unimplemented');

assert.match(drawerSource,/function renderAccount\(\)/);
assert.ok(drawerSource.includes('data-profile-edit'));
assert.ok(!drawerSource.includes('id="drawer-account-form"'),'Account screen must not contain old inline edit form');
assert.ok(!visualSource.includes('function accountButtons'));
assert.ok(!visualSource.includes('drawer-account-area'));
assert.ok(!visualSource.includes('MutationObserver'));
assert.ok(!pass2Source.includes('cleanAccountWardrobe'));

assert.ok(profileSource.includes("window.ElaraDialog.open({title:'ویرایش پروفایل'"));
assert.ok(profileSource.includes('window.ElaraSocial.saveProfileValues'));
assert.ok(drawerSource.includes("window.ElaraProfileSystem?.openEditor?.()"));
assert.ok(designSource.includes("window.ElaraPrivateDrawer?.open?.('account')"),'Self profile entry must open the canonical Account screen');

const publicBlock=socialSource.slice(socialSource.indexOf('function profileSummary(person)'),socialSource.indexOf('async function presentProfile(person)'));
for(const token of ['person.tasks','person.habits','person.goals','person.wellness','localStorage.getItem'])assert.ok(!publicBlock.includes(token),'Public profile reads private token: '+token);
assert.ok(publicBlock.includes('اطلاعات Task، Habit، Goal و Wellness در پروفایل عمومی نمایش داده نمی‌شوند.'));

const drawerMemory=new Map();
const drawerStorage={getItem:k=>drawerMemory.get(k)??null,setItem:(k,v)=>drawerMemory.set(k,String(v))};
const drawerDocument={
  readyState:'loading',body:{classList:new ClassList(),dataset:{}},documentElement:{dataset:{}},
  addEventListener(){},getElementById(){return null},querySelector(){return null},querySelectorAll(){return[]}
};
const drawerWindow={addEventListener(){},dispatchEvent(){},ElaraIcons:{icon:()=>''}};
vm.runInNewContext(drawerSource,{
  window:drawerWindow,document:drawerDocument,localStorage:drawerStorage,
  CustomEvent:CustomEventMock,Event:class{constructor(type){this.type=type}},
  crypto:{randomUUID:()=> 'id'},CSS:{escape:x=>String(x)},Intl,Date,JSON,Math,Number,String,Array,Object,setTimeout:()=>0,console
});
const dt=drawerWindow.ElaraDrawerTest;
assert.ok(dt,'drawer test surface missing');
dt.setStyle('anime');dt.setColor('green');dt.setMode('light');
let pref=JSON.parse(drawerMemory.get('elara_preferences_v2'));
assert.equal(pref.style,'anime');assert.equal(pref.color,'green');assert.equal(pref.mode,'light');
dt.setMode('amoled');
pref=JSON.parse(drawerMemory.get('elara_preferences_v2'));
assert.equal(pref.mode,'dark','AMOLED must reuse existing dark preference schema');
assert.equal(drawerMemory.get('elara_amoled'),'yes');
for(const token of ["'dark','Dark'","'light','Light'","'system','System'","'amoled','AMOLED'","'default','Elara Neon'","'minimal','Minimal'","'rugged','Rugged'","'anime','Anime'","['violet','یاسی']","['black','مشکی']"])assert.ok(drawerSource.includes(token),'Theme selector missing '+token);

const forbidden=/[\u{1F300}-\u{1FAFF}☑⚙⌂♛♧◐☀☾◉◎▤◈◷◇✦✧▥▣◫⌕★]/u;
for(const [name,source] of [['elara-design.css',designCss],['approved-visual.css',visualCss],['visual-fidelity-pass4.css',pass4Css]])assert.ok(!forbidden.test(source),name+' contains forbidden pictographic glyph');
assert.ok(!visualCss.includes("content:'🔒'"));
assert.ok(!/Apple Color Emoji|Segoe UI Emoji/.test(designCss+visualCss+pass4Css));
assert.ok(pass4Css.includes('body.light'));
assert.ok(pass4Css.includes('body.dark.amoled'));
for(const token of ['var(--surface)','var(--surface2)','var(--border)','var(--text)','var(--muted)','var(--elara-accent)'])assert.ok(pass4Css.includes(token),'Pass 4 CSS missing theme token '+token);

assert.ok(indexHtml.indexOf('approved-profile-system.js')<indexHtml.indexOf('boot.js'));
assert.ok(profileSource.includes('assets/logo.png')===false,'Profile system must not invent the missing logo PNG');

console.log('PASS: Pass 4 account ownership, explicit avatar groups, frame unlock mapping, locked preview/equip guard, UID isolation, profile composition/dialog, public privacy, theme persistence and CSS glyph contracts. Browser/Firebase/PNG loading not tested.');
