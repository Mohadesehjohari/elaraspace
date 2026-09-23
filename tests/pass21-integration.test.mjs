import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const visual=read('approved-visual.js');
const pass2=read('visual-fidelity-pass2.js');
const navigation=read('approved-navigation-extension.js');
const drawer=read('drawer.js');

assert.ok(!visual.includes("tab==='words'?'language':tab"),'Global words -> language remap must not exist');
assert.ok(!visual.includes('[data-elara-tab="words"]'),'Legacy capture listener for words must not intercept the route');
assert.ok(visual.includes("if(location.hash==='#words')window.ElaraOpen?.('words',{history:'replace'})"),'Direct #words must preserve/open the Leitner route');
assert.match(pass2,/data-pass2-open-leitner[^\n]*window\.ElaraOpen\?\.\('words'\)/,'Language CTA must open words');
assert.match(pass2,/data-pass2-leitner-back[^\n]*window\.ElaraOpen\?\.\('language'\)/,'Leitner Back must open language');
assert.ok(!drawer.includes('data-drawer-route="words"'),'Leitner must not live in the account drawer');
assert.ok(!drawer.includes('rebuildMobileNav'),'Drawer must not rebuild the mobile bottom nav');

const defsSource=navigation.match(/const MAIN=Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1]||'';
const defs=[...defsSource.matchAll(/route:'([^']+)',label:'([^']+)'/g)].map(m=>[m[1],m[2]]);
assert.deepEqual(defs,[
  ['exercise','ورزش'],
  ['language','زبان'],
  ['tasks','تسک‌ها'],
  ['home','خانه'],
  ['ranking','رنکینگ'],
  ['books','کتابخانه'],
  ['freedom','آزادی']
],'Seven-route navigation order/labels changed unexpectedly');
assert.equal(defs[3][0],'home','Home must remain the central route');

const openBlock=drawer.match(/function open\(section='home'\)\{([\s\S]*?)\}\n  function show/)?.[1]||'';
const showBlock=drawer.match(/function show\(section='home'\)\{([\s\S]*?)\n  \}/)?.[1]||'';
const privacyBlock=drawer.match(/function renderPrivacy\(\)\{([\s\S]*?)\n  \}\n  function renderFolders/)?.[1]||'';
assert.match(openBlock,/show\(section\)/,'Programmatic drawer open must route through show(section)');
assert.match(showBlock,/if\(section==='privacy'\)renderPrivacy\(\)/,'show(privacy) must synchronously render the privacy center');
for(const token of ['مرکز حریم خصوصی و امنیت','پروفایل عمومی','فعالیت دوستان','تسک‌ها','عادت‌ها','اهداف','مأموریت‌ها','کتابخانه','زبان / گزارش یادگیری','Ranking / Social','ورزش و سلامت','drawer-password-form','data-drawer-privacy="wellness-home"']){
  assert.ok(privacyBlock.includes(token),`Direct privacy renderer missing ${token}`);
}
assert.ok(drawer.includes('window.ElaraPrivacyLocal={read:readPrivacy,write:writePrivacy,wellnessHomeVisible}'),'Drawer must own the local privacy API');
assert.ok(!pass2.includes('function upgradePrivacy'),'Pass 2 must not overwrite Privacy Center after opening');
assert.ok(!pass2.includes('setTimeout(upgradePrivacy'),'Delayed privacy patch must not exist');
assert.ok(!pass2.includes('data-pass2-privacy'),'Legacy Pass 2 privacy controls must not exist');

console.log('PASS: Leitner route integration, seven-route labels/order, and direct drawer Privacy Center contract. Browser/Firebase not tested.');
