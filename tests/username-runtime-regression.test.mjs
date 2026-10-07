import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const cloud=readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
const social=readFileSync(new URL('../elara-social.js',import.meta.url),'utf8');

const snap=data=>({exists:()=>data!==undefined,data:()=>data});
function makeStore(){
  const profiles=new Map(),usernames=new Map();
  const refData=(ref,p=profiles,u=usernames)=>ref.kind==='profiles'?p.get(ref.id):ref.kind==='usernames'?u.get(ref.id):undefined;
  const doc=(_db,kind,...rest)=>({kind,id:rest.join('/')});
  const getDoc=async ref=>snap(refData(ref));
  const runTransaction=async(_db,fn)=>{
    const p=new Map([...profiles].map(([k,v])=>[k,{...v}])),u=new Map([...usernames].map(([k,v])=>[k,{...v}]));
    const target=ref=>ref.kind==='profiles'?p:u;
    const tx={
      get:async ref=>snap(refData(ref,p,u)),
      set:(ref,data)=>target(ref).set(ref.id,{...data}),
      update:(ref,patch)=>{const current=target(ref).get(ref.id);if(!current)throw Error('missing '+ref.kind+'/'+ref.id);target(ref).set(ref.id,{...current,...patch})},
      delete:ref=>target(ref).delete(ref.id)
    };
    const result=await fn(tx);
    profiles.clear();for(const [k,v] of p)profiles.set(k,v);
    usernames.clear();for(const [k,v] of u)usernames.set(k,v);
    return result;
  };
  return {profiles,usernames,doc,getDoc,runTransaction,db:{}};
}

const cloudStart=cloud.indexOf('const normalizeUsername='),cloudEnd=cloud.indexOf('function chooseUsername()');
assert.ok(cloudStart>0&&cloudEnd>cloudStart,'cloud identity block not found');
const cloudIdentitySource=cloud.slice(cloudStart,cloudEnd);
function cloudApi(store,user){
  const sessionStorage={removed:[],removeItem(key){this.removed.push(key)}};
  const safe=x=>String(x??'').trim(),usernameValid=s=>/^[a-z][a-z0-9_]{2,19}$/.test(s);
  const build=new Function('safe','usernameValid','doc','db','getDoc','runTransaction','sessionStorage','user',
    cloudIdentitySource+'\nreturn {reserveUsername,validateOwnUsernameInvariant,resolveCanonicalUsername};');
  return {...build(safe,usernameValid,store.doc,store.db,store.getDoc,store.runTransaction,sessionStorage,user),sessionStorage};
}

const socialHelpersStart=social.indexOf('const usernameValid='),socialHelpersEnd=social.indexOf('function avatar');
const renameStart=social.indexOf('async function changeCanonicalUsername'),renameEnd=social.indexOf('async function addFriend',renameStart);
assert.ok(socialHelpersStart>0&&socialHelpersEnd>socialHelpersStart&&renameStart>0&&renameEnd>renameStart,'social identity blocks not found');
const socialIdentitySource=social.slice(socialHelpersStart,socialHelpersEnd)+'\n'+social.slice(renameStart,renameEnd);
function socialApi(store,uid){
  const build=new Function('doc','db','getDoc','runTransaction','uid',
    socialIdentitySource+'\nreturn {resolveUsernameIdentity,assertProfileUsernameClaim,changeCanonicalUsername,normalizeUsername};');
  return build(store.doc,store.db,store.getDoc,store.runTransaction,uid);
}

// CASE A — duplicate registration: B cannot take nova from A.
{
  const s=makeStore();s.profiles.set('A',{username:'nova',name:'A'});s.usernames.set('nova',{uid:'A'});
  const b=cloudApi(s,{uid:'B'});
  await assert.rejects(()=>b.reserveUsername('nova','B'),/قبلاً انتخاب شده/);
  assert.equal(s.profiles.has('B'),false);
  assert.deepEqual(s.usernames.get('nova'),{uid:'A'});
}

// CASE B — existing profile + missing claim: runtime refuses an ambiguous auto-repair.
// The audit classifier separately proves a safe repair only when the profile username is globally unique.
{
  const s=makeStore();s.profiles.set('A',{username:'nova',name:'A'});
  const a=cloudApi(s,{uid:'A'});
  const error=await assert.rejects(()=>a.reserveUsername('nova','A'));
  assert.equal(error.identityCode,'existing-profile-claim-missing');
  assert.equal(s.usernames.has('nova'),false);
}

// CASE C — claim belongs to another user: B cannot steal it.
{
  const s=makeStore();s.profiles.set('B',{username:'nova',name:'B'});s.usernames.set('nova',{uid:'A'});
  const b=cloudApi(s,{uid:'B'});
  const error=await assert.rejects(()=>b.reserveUsername('nova','B'));
  assert.equal(error.identityCode,'existing-profile-claim-conflict');
  assert.deepEqual(s.usernames.get('nova'),{uid:'A'});
}

// CASE D — canonical rename is one transaction and removes old claim only when owned by A.
{
  const s=makeStore();s.profiles.set('A',{username:'nova',name:'A'});s.usernames.set('nova',{uid:'A'});
  const a=socialApi(s,'A');
  assert.equal(await a.changeCanonicalUsername('NOVA2'),'nova2');
  assert.equal(s.profiles.get('A').username,'nova2');
  assert.deepEqual(s.usernames.get('nova2'),{uid:'A'});
  assert.equal(s.usernames.has('nova'),false);
}
{
  const s=makeStore();s.profiles.set('A',{username:'legacy',name:'A'});s.usernames.set('legacy',{uid:'B'});
  const a=socialApi(s,'A');
  await a.changeCanonicalUsername('clean_a');
  assert.equal(s.profiles.get('A').username,'clean_a');
  assert.deepEqual(s.usernames.get('clean_a'),{uid:'A'});
  assert.deepEqual(s.usernames.get('legacy'),{uid:'B'},'rename must not delete another UID\'s claim');
}

// CASE E — stale index cannot resolve/open wrong profile.
{
  const s=makeStore();s.profiles.set('A',{username:'nova2',name:'A'});s.usernames.set('nova',{uid:'A'});s.usernames.set('nova2',{uid:'A'});
  const api=socialApi(s,'B');
  const error=await assert.rejects(()=>api.resolveUsernameIdentity('nova'));
  assert.equal(error.identityCode,'claim-profile-mismatch');
}

// CASE F — self-search is explicitly identified as self only when claim + profile agree.
{
  const s=makeStore();s.profiles.set('A',{username:'nova2',name:'A'});s.usernames.set('nova2',{uid:'A'});
  const api=socialApi(s,'A'),identity=await api.resolveUsernameIdentity('@NOVA2');
  assert.equal(identity.uid,'A');assert.equal(identity.username,'nova2');assert.equal(identity.self,true);
}

// A stale alias that points to self is never treated as self-search.
{
  const s=makeStore();s.profiles.set('A',{username:'nova2',name:'A'});s.usernames.set('nova',{uid:'A'});
  const api=socialApi(s,'A');
  const error=await assert.rejects(()=>api.resolveUsernameIdentity('nova'));
  assert.equal(error.identityCode,'claim-profile-mismatch');
}

console.log('USERNAME_RUNTIME_REGRESSION_PASS duplicate missing-claim conflict rename stale-search self-search');
