import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const nav=read('approved-navigation-extension.js');
const boot=read('boot.js');
const home=read('reference-home-shell-2026.js');
const css=read('reference-home-shell-2026.css');
const wellness=read('approved-wellness.js');
const drawer=read('drawer.js');

for(const route of ['exercise','language','tasks','home','ranking','books','freedom'])assert.match(nav,new RegExp("route:'"+route+"'"));
assert.match(nav,/const SIDEBAR=Object\.freeze\(\[\.\.\.MAIN,FRIEND\]\);/,'Desktop Sidebar must retain Friends');
assert.match(nav,/const DESKTOP_ORDER=Object\.freeze\(\['home','tasks','language','books','exercise','ranking','social','freedom'\]\);/,'Friends belongs after ranking and before freedom');
assert.match(nav,/route:'social',label:'دوستان'/,'Friends route must remain primary');
for(const forbidden of ["route:'habits'","route:'goals'","route:'focus'"])assert.doesNotMatch(nav.split('const SIDEBAR=Object.freeze([...MAIN,FRIEND]);')[1]||'',new RegExp(forbidden));

assert.match(boot,/reference-home-shell-2026\.css/);
assert.match(boot,/reference-home-shell-2026\.js/);
assert.doesNotMatch(boot,/p0-home-2026\.css/);
assert.doesNotMatch(boot,/p0-home-2026\.js/);

for(const token of ['ref-wellness-card','ref-theme-strip','ref-streak-card','ref-desktop-streak','ref-library-focus','localSearch','ref-header-search','ref-mobile-brand','assets/ui/missions-rocket.webp','assets/ui/streak-flame.webp'])assert.ok(home.includes(token),'reference Home missing '+token);
assert.match(home,/for\(const id of \['elara-home-focus','elara-home-books','elara-home-freedom'\]\)/);
assert.match(home,/const books=\$\('panel-books'\)/);
assert.match(home,/data-ref-exercise/);
assert.match(css,/grid-template-areas:'tasks habits wellness' 'missions goals right' 'theme theme right'/);
assert.match(css,/\.bottom-nav\{display:none!important/);
assert.match(css,/@media\(max-width:700px\)/);
assert.match(css,/grid-template-areas:'tasks habits' 'wellness wellness' 'missions ranks' 'activity activity'/);
assert.match(css,/assets\/ui\/hero-landscape\.webp/);
assert.match(css,/\.ref-home-grid>\.ref-goals,#panel-home\.ref-home \.ref-home-grid>\.ref-theme-strip\{display:none!important\}/);
assert.doesNotMatch(wellness,/row\.dataset\.wellnessHome/);
assert.match(drawer,/function topOverlayOpen/);
assert.doesNotMatch(drawer,/data-drawer-route="reports"/);
assert.doesNotMatch(drawer,/if\(edit\)\{close\(\);await window\.ElaraProfileSystem/);
console.log('PASS: canonical navigation retains Friends plus the Home-card list entry, artwork-backed reference Home, compact mobile preview, Library Focus, Wellness boundary and Drawer layering guards.');
