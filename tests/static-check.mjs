import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../',import.meta.url);
const html = readFileSync(new URL('index.html',root),'utf8');
const js = readFileSync(new URL('app.js',root),'utf8');
const css = readFileSync(new URL('styles.css',root),'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
assert.ok(ids.size > 50,'Application markup seems incomplete');
for (const [_,id] of js.matchAll(/\$\('([\w-]+)'\)/g)) {
  assert.ok(ids.has(id),`app.js references missing #${id}`);
}
for (const name of ['tasks','habits','goals','focus','books','words','settings']) {
  assert.ok(ids.has(`panel-${name}`),`Missing panel: ${name}`);
  assert.ok(html.includes(`data-tab="${name}"`),`Missing navigation: ${name}`);
}
for (const asset of ['styles.css','app.js']) assert.ok(html.includes(`"${asset}"`),`Missing asset: ${asset}`);
assert.ok(!/<script[^>]+src="http/.test(html),'Core functionality must not depend on remote scripts');
assert.ok(css.includes('@media(max-width:700px)'),'Mobile layout is missing');
console.log(`Static check passed: ${ids.size} HTML ids, 7 panels, local assets and selector references.`);
