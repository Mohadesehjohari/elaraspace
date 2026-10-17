import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const index=read('index.html');
const base=read('neon-lavender-theme.css');
const site=read('galaxy-lilac-sitewide.css');
const design=read('elara-design.js');

assert.match(index,/galaxy-lilac-sitewide\.css\?v=20261017-sitewide-r1/);
assert.ok(index.indexOf('galaxy-lilac-sitewide.css')>index.indexOf('neon-lavender-theme.css'),'Sitewide layer must follow the core palette');
assert.ok(index.indexOf('galaxy-lilac-sitewide.css')>index.indexOf('focus-library-walnut-20261016.css'),'Sitewide layer must follow all page-owner layers');
const finalStylesheet=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].at(-1)?.[1]||'';
assert.match(finalStylesheet,/^galaxy-lilac-sitewide\.css/,'No other stylesheet may override the theme coverage layer');

const stripped=site.replace(/\/\*[\s\S]*?\*\//g,'');
assert.equal((stripped.match(/\{/g)||[]).length,(stripped.match(/\}/g)||[]).length,'Unbalanced CSS rules');
const selectors=[...stripped.matchAll(/(?:^|\})\s*([^{}]+)\{/g)].map(x=>x[1].trim());
assert.ok(selectors.length>=25,'Missing module coverage rules');
for(const selector of selectors){
  assert.ok(selector.includes('body[data-elara-theme="violet"]'),'An unscoped CSS rule would repaint Midnight: '+selector);
}
for(const name of [
  '#panel-home','#panel-tasks','#panel-books','#panel-library-shelves',
  '#panel-focus-pomodoro','#panel-language','#panel-language-courses',
  '#panel-words','#panel-exercise','#panel-wellness-','#panel-reports',
  '#elara-social-page','#panel-social','#panel-ranking','#panel-blog',
  '#panel-store','#panel-freedom'
])assert.ok(stripped.includes(name),'Site module lacks palette coverage: '+name);
for(const surface of [
  '.elara-private-drawer-panel','.elara-dialog-panel','.store-preview-dialog',
  '.bottom-nav','.elara-desktop-dock','.sidebar',
  '.g4-main','.social-chat-messages','.rg-card','.blog-card',
  '.store-product','.fd-panel','.lib01-card','.l2-stat'
])assert.ok(stripped.includes(surface),'Module surface not covered: '+surface);
for(const banned of [
 '.astra-task-row','.ref-task-row','.feature-section-task-row',
 '.well01-task-row','.priority-red','.priority-yellow','.priority-blue',
 '.rg-place-1','.rg-podium-card','.lib02-wood','.lib02-book',
 '.elara-reports-legend','.g4-group-avatar','.social-unread-badge'
])assert.ok(!selectors.some(s=>s.includes(banned)),'A semantic/artwork selector is being repainted: '+banned);

for(const color of ['#101536','#7544DA','#C18BFF','#42B9FF'])
 assert.ok(base.includes(color),'Approved 4-color palette missing: '+color);
assert.ok(base.includes('body[data-elara-theme="violet"].light'),'Missing Lilac Light');
assert.ok(base.includes('body[data-elara-theme="violet"].dark.amoled'),'Missing Lilac AMOLED');
assert.match(design,/document\.body\.dataset\.elaraTheme=visualTheme\(\)/);
assert.match(site,/--galaxy-site-panel/);
assert.match(site,/--galaxy-site-raised/);
assert.match(site,/--galaxy-site-field/);
assert.match(site,/--galaxy-site-edge-blue/);
console.log('PASS: Galaxy Lilac site-wide chrome, 17 areas, opt-in scope, nonsemantic recolor protection, last CSS owner, Dark/Light/AMOLED.');
