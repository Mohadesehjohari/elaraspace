import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../elara-collab.js',import.meta.url),'utf8');
const start=source.indexOf('async function invite(spaceId,friendUid){');
const end=source.indexOf('async function shareEntity',start);
assert.ok(start>=0&&end>start,'collaboration invite function missing');
const invite=source.slice(start,end);

const firstWrite=invite.indexOf('await setDoc(inviteRef,payload)');
const firstInviteRead=invite.indexOf('getDoc(inviteRef)');
assert.ok(firstWrite>=0,'first-time invite direct write missing');
assert.ok(firstInviteRead>firstWrite,'collab invite must not pre-read a missing participant-scoped document');
assert.match(invite,/error\?\.code!=='permission-denied'/,'invite retry must distinguish Firestore permission path');
assert.match(invite,/existing\.status==='accepted'/,'accepted invite idempotency missing');
assert.match(invite,/existing\.status==='pending'/,'pending invite idempotency missing');
assert.match(invite,/existing\.status==='declined'[\s\S]*updateDoc\(inviteRef,\{status:'pending'/,'declined invite retry missing');

console.log('COLLAB_INVITE_FIRST_WRITE_PASS');
