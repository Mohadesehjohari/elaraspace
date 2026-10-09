import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=readFileSync(new URL('../elara-collab.js',import.meta.url),'utf8');
const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const match=source.match(/function randomToken\(\)\{[\s\S]*?\n\}/);
assert.ok(match,'token generator missing');
assert.doesNotMatch(match[0],/Math\.random|randomUUID/,'token generator must use 256 bits of CSPRNG entropy');
const ctx={crypto:webcrypto,Uint8Array,Array,Error,tx:(fa,en)=>en};
const tokens=new Set();
for(let i=0;i<40;i++){
 const token=runInNewContext(match[0]+';randomToken()',ctx);
 assert.match(token,/^[a-f0-9]{64}$/,'bad token shape');
 tokens.add(token);
}
assert.equal(tokens.size,40,'CSPRNG issued duplicate link tokens');
assert.match(source,/const LINK_LIFETIME_MS=7\*24\*60\*60\*1000/,'7-day lifetime missing');
assert.match(source,/expiresAt=Timestamp\.fromMillis/,'client does not write expiration');
assert.match(source,/where\('ownerUid','==',uid\)/,'owner-only listing query missing');
assert.match(source,/data-collab-revoke-links/,'owner revocation UI missing');
assert.match(source,/active:false/,'owner revocation mutation missing');
assert.match(source,/linkSnap\.data\(\)\.expiresAt\.toMillis\(\)<=Date\.now\(\)/,'client rejects neither expired nor revoked URLs');
assert.match(rules,/validCollabJoinToken\(request\.resource\.data\.joinToken,spaceId\)/,'membership access not server-gated');
assert.match(rules,/request\.auth\.token\.email_verified == true/,'missing verified identity gate');
assert.match(rules,/token\.matches\('\^\[a-f0-9\]\{64\}\$'\)/,'Firestore does not validate token format');
assert.match(rules,/request\.resource\.data\.expiresAt <= request\.time \+ duration\.value\(8, 'd'\)/,'excessive link TTL accepted');
assert.match(rules,/resource\.data\.active == true\s*&& request\.resource\.data\.active == false/,'link can be reactivated after revocation');
// Exercise the URL join handler as an actual asynchronous interaction rather than
// a static text check. Auth/account/boot notifications must not open duplicate dialogs.
const begin=source.indexOf('let joinUrlHandling=false;'),finish=source.indexOf("document.addEventListener('click',async e=>",begin);
assert.ok(begin>=0&&finish>begin,'URL join flow cannot be found');
const joinHandler=source.slice(begin,finish);
async function runJoinScenario({verified=true,accept=true,concurrent=true}={}){
 let joined=0,prompts=0,alerts=0,visible='https://example.test/elaraspace/?ref=friend&elaraJoin='+('f'.repeat(64))+'#home';
 let proceed=()=>{};
 const gate=new Promise(resolve=>{proceed=resolve});
 const location={href:visible};
 const history={state:{tab:'home'},replaceState(state,unused,path){visible='https://example.test'+path;location.href=visible}};
 const auth={currentUser:{emailVerified:verified}};
 const window={ElaraDialog:{confirm:async()=>{prompts++;await gate;return accept},alert:async()=>{alerts++}},ElaraNotify:{push:()=>{}}};
 const context={URL,location,history,auth,window,tx:(fa,en)=>en,joinLink:async()=>{joined++}};
 runInNewContext(joinHandler+';globalResult=handleJoinFromUrl;',context);
 const first=context.globalResult();
 const second=concurrent?context.globalResult():Promise.resolve();
 await Promise.resolve();
 if(verified){
  assert.equal(prompts,1,'multiple lifecycle events opened duplicate join prompts');
  assert.ok(!visible.includes('elaraJoin'),'capability token remained in address bar during consent dialog');
  assert.ok(visible.includes('ref=friend'),'clearing the token discarded ordinary query parameters');
 }else{
  assert.equal(prompts,0,'unverified identity received a join prompt');
  assert.ok(visible.includes('elaraJoin'),'unverified identity lost token before login');
 }
 proceed();
 await Promise.all([first,second]);
 assert.equal(joined,verified&&accept?1:0,'join not restricted to confirmed single action');
 assert.equal(alerts,0,'unexpected join failure');
 if(!verified){
  auth.currentUser.emailVerified=true;
  await context.globalResult();
  assert.equal(prompts,1,'join prompt did not resume after verification');
  assert.equal(joined,accept?1:0,'verified user could not join');
 }
}
await runJoinScenario({verified:true,accept:true});
await runJoinScenario({verified:true,accept:false});
await runJoinScenario({verified:false,accept:true});
console.log('COLLAB_JOIN_URL_SINGLE_FLIGHT_PASS verified/decline/deferred-login, no duplicated prompts or leaked address token');

console.log('COLLAB_LINK_CRYPTO_CONTRACT_PASS 40 unique 256-bit tokens; verified, expiring, owner-revokable');
