import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const social=readFileSync(new URL('../elara-social.js',import.meta.url),'utf8');
const collab=readFileSync(new URL('../elara-collab.js',import.meta.url),'utf8');
const notifications=readFileSync(new URL('../notifications.js',import.meta.url),'utf8');
const view=readFileSync(new URL('../social-view.js',import.meta.url),'utf8');

// Friend realtime must be a recipient-scoped listener, not a refresh-only poll.
assert.match(social,/function startFriendRequestRealtime[sS]*onSnapshot\(query\(collection\(db,'friendRequests'\),where\('to','==',mine\)\)/);
assert.match(social,/meta:\{kind:'friend-request',requestId:/,'friend realtime notification must carry canonical request id');
assert.match(social,/dedupeKey:'friend-in:'\+row\.id/,'friend notification dedupe key missing');

// The permanent Friends UI owns requests independently of temporary tabs.
assert.match(view,/social-requests-standalone/);
assert.match(view,/data-friend-action="accept"/);
assert.match(view,/data-friend-action="decline"/);
assert.match(view,/data-profile-friend-action="cancel"/);

// Bell actions must delegate to canonical APIs rather than duplicate Firestore writes.
assert.match(notifications,/window\.ElaraSocial\?\.decide\?\.\(request,status\)/,'Friend notification must call ElaraSocial.decide');
assert.match(notifications,/window\.ElaraCollab\?\.acceptInvite\?\.\(inviteId\)/,'Collab Accept must delegate to ElaraCollab.acceptInvite');
assert.match(notifications,/window\.ElaraCollab\?\.declineInvite\?\.\(inviteId\)/,'Collab Decline must delegate to ElaraCollab.declineInvite');
assert.doesNotMatch(notifications,/\b(?:setDoc|updateDoc|deleteDoc)\s*\(/,'Notification UI must not contain duplicate Firestore mutation logic');

// Collaboration realtime must be recipient scoped, deduplicated and preserve kind/title/sender metadata.
assert.match(collab,/onSnapshot\(query\(collection\(db,'collabInvites'\),where\('to','==',sourceUid\)\)/);
assert.match(collab,/dedupeKey:'collab-in:'\+row\.id/);
assert.match(collab,/meta:\{kind:'collab-invite',inviteId:row\.id,collabKind:row\.kind/);

console.log('SOCIAL_REALTIME_NOTIFICATION_CONTRACT_PASS canonical-actions realtime-dedupe permanent-request-cards');
