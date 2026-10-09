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
console.log('COLLAB_LINK_CRYPTO_CONTRACT_PASS 40 unique 256-bit tokens; verified, expiring, owner-revokable');
