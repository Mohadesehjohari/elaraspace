import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const app=readFileSync(new URL('app.js',root),'utf8');

const homeBootstrap=html.indexOf("if(!location.hash||location.hash==='#')history.replaceState");
const appScript=html.indexOf('app.js?v=20261006-home-first-v10');
assert.ok(homeBootstrap>=0,'root route must normalize to #home');
assert.ok(appScript>homeBootstrap,'root route must normalize before app.js executes');

assert.doesNotMatch(app,/renderAll\(\);setTab\('tasks'\)/,'legacy startup must not force Tasks');
assert.match(app,/const initialRoute=\(location\.hash\|\|''\)\.replace\(\/\^#\/,''\)\|\|'home'/);
assert.match(app,/renderAll\(\{tasks:initialRoute==='tasks'\}\)/,'Tasks render must be deferred on Home');
assert.match(app,/if\(Object\.hasOwn\(tabNames,initialRoute\)\)setTab\(initialRoute\)/,'direct legacy routes must still open');
assert.match(app,/if\(tab==='tasks'\)renderTasks\(\)/,'Tasks must render when user actually opens Tasks');

console.log('HOME_FIRST_STARTUP_PASS');
