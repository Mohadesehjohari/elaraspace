import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('private-state.js','utf8');
function load(search){
  class FakeStorage {
    constructor(){this.items=new Map()}
    getItem(k){return this.items.has(String(k))?this.items.get(String(k)):null}
    setItem(k,v){this.items.set(String(k),String(v))}
    removeItem(k){this.items.delete(String(k))}
  }
  const localStorage=new FakeStorage(),sessionStorage=new FakeStorage();
  localStorage.setItem('elara_space_v1','{"tasks":[{"text":"legacy"}]}');
  const data={elaraPrivateStateFailed:undefined};
  const window={localStorage,sessionStorage},document={documentElement:{dataset:data}};
  vm.runInNewContext(source,{window,localStorage,Storage:FakeStorage,sessionStorage,URLSearchParams,location:{search},document,console});
  return {window,localStorage,sessionStorage,data};
}
{
  const a=load('?serverOnly=1');
  assert.equal(a.window.ElaraPrivateState.active,true);
  assert.equal(a.localStorage.getItem('elara_space_v1'),null,'Private trial must never load old on-disk state into another account');
  assert.equal(a.window.ElaraPrivateState.nativeLegacyExists(),true,'Legacy snapshot must remain recoverable, not destroyed automatically');
  a.window.ElaraPrivateState.activate('user-one');
  a.localStorage.setItem('elara_space_v1','{"tasks":[{"text":"new private task"}]}');
  assert.match(a.localStorage.getItem('elara_space_v1'),/new private task/);
  assert.ok(![...a.localStorage.items.values()].some(x=>x.includes('new private task')),'Private draft must not be persisted to disk');
  a.localStorage.setItem('unrelated-value','safe');
  assert.equal(a.localStorage.items.get('unrelated-value'),'safe','Unrelated storage behavior must be unchanged');
  a.window.ElaraPrivateState.activate('user-two');
  assert.equal(a.localStorage.getItem('elara_space_v1'),null,'Switching account must erase prior account RAM state');
  a.localStorage.setItem('elara_space_v1','user-two');
  a.window.ElaraPrivateState.reset();
  assert.equal(a.localStorage.getItem('elara_space_v1'),null,'Logout must clear the RAM state');
  assert.equal(a.window.ElaraPrivateState.nativeLegacyExists(),true,'Trial cannot silently destroy original local data');
}
{
  const a=load('');
  assert.equal(a.window.ElaraPrivateState.active,false);
  assert.match(a.localStorage.getItem('elara_space_v1'),/legacy/,'Default/legacy mode must remain unaffected');
  a.localStorage.setItem('elara_space_v1','normal');
  assert.equal(a.localStorage.items.get('elara_space_v1'),'normal');
}
console.log('PASS: opt-in authenticated RAM-only data, cross-account isolation, no persistent writes, reversible legacy fallback');
