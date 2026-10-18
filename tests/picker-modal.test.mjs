import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const script = read('elara-date-time-picker.js');
const html = read('index.html');
const styles = read('elara-date-time-picker.css');
assert.match(html, /elara-date-time-picker\.js\?v=/);
assert.match(html, /elara-date-time-picker\.css\?v=/);
assert.match(styles, /2147483500/);
assert.match(styles, /#9e6fff/);

const dom = new JSDOM('<!doctype html><html lang="fa"><body>' +
  '<form id="task-form"><input id="task-due" type="date" value="2026-10-19">' +
  '<input id="task-time" type="time" value="08:05"></form>' +
  '<button data-task-calendar type="button">calendar</button></body></html>', {
  url:'https://example.test/', runScripts:'outside-only', pretendToBeVisual:true
});
const {window:w} = dom, d = w.document;
w.eval(script);
d.dispatchEvent(new w.Event('DOMContentLoaded', {bubbles:true}));

const due=d.getElementById('task-due'),time=d.getElementById('task-time');
assert.equal(due.type,'text');
assert.equal(time.type,'text');
assert.equal(due.readOnly,true);
assert.equal(due.value,'2026-10-19');
assert.equal(time.value,'08:05');
let inputs=0,changes=0;
due.addEventListener('input',()=>inputs++);
due.addEventListener('change',()=>changes++);
due.click();
assert.ok(d.querySelector('.elara-dtp-overlay [role="dialog"]'));
assert.equal(d.querySelectorAll('[data-dtp-day]').length,31);
d.querySelector('[data-dtp-day="2026-10-23"]').click();
d.querySelector('[data-dtp-action="apply"]').click();
assert.equal(due.value,'2026-10-23');
assert.equal(inputs,1);
assert.equal(changes,1);
assert.equal(d.querySelector('.elara-dtp-overlay'),null);

d.querySelector('[data-task-calendar]').click();
assert.ok(d.querySelector('[data-dtp-days]'));
d.querySelector('[data-dtp-action="cancel"]').click();
assert.equal(due.value,'2026-10-23');

time.click();
assert.equal(d.querySelector('[data-dtp-clock]').textContent,'08:05');
d.querySelector('[data-dtp-hour="16"]').click();
d.querySelector('[data-dtp-minute="37"]').click();
d.querySelector('[data-dtp-action="apply"]').click();
assert.equal(time.value,'16:37');
time.click();
d.dispatchEvent(new w.KeyboardEvent('keydown', {key:'Escape',bubbles:true}));
assert.equal(d.querySelector('.elara-dtp-overlay'),null);
assert.equal(time.value,'16:37');
time.click();
d.querySelector('[data-dtp-action="clear"]').click();
assert.equal(time.value,'');

const recur=d.createElement('input');
recur.type='date';
recur.id='task-recurrence-end';
d.querySelector('#task-form').append(recur);
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(recur.type,'text');
recur.click();
assert.ok(d.querySelector('[data-dtp-days]'));
d.querySelector('[data-dtp-action="cancel"]').click();

console.log('PASS: purple Elara date/time picker opens, chooses, cancels, clears and upgrades dynamic date fields.');
dom.window.close();
