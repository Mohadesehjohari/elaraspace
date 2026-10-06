import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const app=readFileSync(new URL('app.js',root),'utf8');
const phase2=readFileSync(new URL('phase2.js',root),'utf8');
const home=readFileSync(new URL('reference-home-shell-2026.js',root),'utf8');

const homeBootstrap=html.indexOf("if(!location.hash||location.hash==='#')history.replaceState");
const appScript=html.indexOf('app.js?v=20261006-home-first-v10');
assert.ok(homeBootstrap>=0,'root route must normalize to #home');
assert.ok(appScript>homeBootstrap,'root route must normalize before app.js executes');

assert.doesNotMatch(app,/renderAll\(\);setTab\('tasks'\)/,'legacy startup must not force Tasks');
assert.match(app,/const initialRoute=\(location\.hash\|\|''\)\.replace\(\/\^#\/,''\)\|\|'home'/);
assert.match(app,/renderAll\(\{tasks:initialRoute==='tasks',habits:initialRoute==='habits'\}\)/,'Tasks/Habits render must be deferred on Home');
assert.match(app,/if\(Object\.hasOwn\(tabNames,initialRoute\)\)setTab\(initialRoute\)/,'direct legacy routes must still open');
assert.match(app,/if\(tab==='tasks'\)renderTasks\(\)/,'Tasks must render when user actually opens Tasks');
assert.match(app,/tab==='habits'[\s\S]*renderHabits/,'Habits must render when user actually opens Habits');
assert.match(phase2,/function routeActive\(name\)/,'Phase 2 must gate hidden route renders');
assert.match(phase2,/if\(routeActive\('tasks'\)\)renderTasks\(\)/,'Phase 2 must skip hidden Tasks on Home');
assert.match(phase2,/if\(routeActive\('habits'\)\)renderHabits\(\)/,'Phase 2 must skip hidden Habits on Home');
assert.match(home,/ElaraTasks\.taskAction\('toggle-task',[\s\S]*selected\(\)/,'Home Task toggle must use canonical state without hidden Tasks DOM');
assert.match(home,/ElaraTasks\.habitAction\('toggle-habit',[\s\S]*selected\(\)/,'Home Habit toggle must use canonical state without hidden Habits DOM');

console.log('HOME_FIRST_STARTUP_PASS');
