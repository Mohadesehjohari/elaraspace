import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../',import.meta.url);
const html = readFileSync(new URL('index.html',root),'utf8');
const js = readFileSync(new URL('app.js',root),'utf8');
const css = readFileSync(new URL('styles.css',root),'utf8');
const phase2 = readFileSync(new URL('phase2.js',root),'utf8');
const social = readFileSync(new URL('elara-social.js',root),'utf8');
const design = readFileSync(new URL('elara-design.js',root),'utf8');
const rules = readFileSync(new URL('firestore.rules',root),'utf8');
const drawer = readFileSync(new URL('drawer.js',root),'utf8');
const dialog = readFileSync(new URL('dialog.js',root),'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
assert.ok(ids.size > 50,'Application markup seems incomplete');
for (const [_,id] of js.matchAll(/\$\('([\w-]+)'\)/g)) {
  assert.ok(ids.has(id),`app.js references missing #${id}`);
}
for (const name of ['tasks','habits','goals','focus','books','words','settings']) {
  assert.ok(ids.has(`panel-${name}`),`Missing panel: ${name}`);
  assert.ok(html.includes(`data-tab="${name}"`),`Missing navigation: ${name}`);
}
for (const asset of ['styles.css','dialog.js','drawer.js','app.js','phase2.js']) assert.ok(html.includes(`"${asset}"`),`Missing asset: ${asset}`);
for (const token of ['recurrenceRule','occurrenceDone','focusSessions','data-focus-preset','task-priority-filter']) assert.ok(phase2.includes(token),`Phase 2 missing ${token}`);
for (const token of ['openSelfProfile','elara-profile-form','runTransaction','profilePublic','removeFriend']) assert.ok(social.includes(token),`Profile phase missing ${token}`);
for (const token of ["['profile'",'data-elara-profile-self','data-elara-tab="help"']) assert.ok(design.includes(token),`Profile navigation missing ${token}`);
for (const token of ['profilePublic','existsAfter','friendRequests']) assert.ok(rules.includes(token),`Firestore profile rules missing ${token}`);
for (const token of ['elara-corner-more','data-drawer-action="account"','data-folder-task-form','ElaraPrivateDrawer']) assert.ok(drawer.includes(token),`Private drawer missing ${token}`);
for (const token of ['ElaraDialog','role="dialog"','aria-modal="true"']) assert.ok(dialog.includes(token),`Dialog system missing ${token}`);
for (const token of ['task-short-description','task-description','view-task','openTaskDetails']) assert.ok(phase2.includes(token),`Task details missing ${token}`);
assert.ok(!/<script[^>]+src="http/.test(html),'Core functionality must not depend on remote scripts');
assert.ok(css.includes('@media(max-width:700px)'),'Mobile layout is missing');
console.log(`Static check passed: ${ids.size} HTML ids, 7 panels, local assets, phase 2 recurrence/focus module and selector references.`);
