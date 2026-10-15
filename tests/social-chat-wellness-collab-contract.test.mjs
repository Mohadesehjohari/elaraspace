import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const social=read('elara-social.js'),account=read('cloud.js'),dmUi=read('social-messaging-ui.js');
const collab=read('elara-collab.js'),wellness=read('wellness-folder-sharing.js'),rules=read('firestore.rules'),boot=read('boot.js');

// Missing participant-only documents must be CREATED, not read first.
const dm=social.slice(social.indexOf('async function ensureDm(other){'),social.indexOf('async function listDms(){'));
assert.match(dm,/await setDoc\(ref,\{kind:'dm'/,'first DM should attempt create');
assert.ok(dm.indexOf('await setDoc(ref')<dm.indexOf('await getDoc(ref)'),'DM must not read absent conversation before creating it');
assert.match(dm,/existing\.data\(\)\?\.members/,'an existing conversation must be verified, never overwritten');
const send=social.slice(social.indexOf('async function sendDm('),social.indexOf('function watchDmInbox('));
assert.match(send,/const batch=writeBatch\(db\)/);
assert.match(send,/batch\.set\(doc\(messages\)/);
assert.match(send,/batch\.update\(doc\(db,'conversations',cid\)/);
assert.match(send,/await batch\.commit\(\)/);
assert.match(social,/watchInbox:watchDmInbox/);
assert.match(dmUi,/api\(\)\.watchInbox\(queueInboxRefresh/);
assert.match(dmUi,/pendingInboxRefresh/);

// Private profiles are not publicly exposed to stranger reads, but valid claims
// can be used to start a request. Verify the canonical profile after the request.
for(const text of [social,account]){
 assert.match(text,/verifyAfterRequest:true/);
 assert.match(text,/if\(identity\.verifyAfterRequest\)/);
 assert.ok(text.indexOf('if(identity.verifyAfterRequest)')>text.indexOf("await setDoc("),'verify only after the request is created');
}
assert.match(rules,/match \/profiles\/\{uid\}/);
assert.match(rules,/requestParticipant\(uid\)/);

// Changes to shared Task definitions propagate without copying progress to others.
assert.match(collab,/syncOwnedTaskPayload/);
assert.match(collab,/applySharedTaskSnapshot/);
assert.match(collab,/onSnapshot\(doc\(db,'collabSpaces',key\)/);
assert.match(collab,/oldChecks\.get\(String\(item\.id\)\)/);
assert.match(collab,/\['text','shortDescription','description'/);

// Workout/nutrition plans are shared only on acceptance with separate progress.
assert.match(wellness,/data-wellshare-toggle/);
assert.match(wellness,/onSnapshot\(x\.fs\.collection\(ref,'progress'\)/);
assert.match(wellness,/x\.fs\.doc\(ref,'progress',mine\)/);
assert.match(wellness,/share\.status!=='accepted'/);
assert.match(wellness,/unsubscribeShare\(\);unsubscribeProgress\(\)/);
assert.match(rules,/match \/progress\/\{participantUid\}/);
assert.match(rules,/participantUid == request\.auth\.uid/);
assert.match(rules,/get\(sharePath\(\)\)\.data\.status == 'accepted'/);
assert.match(boot,/20261016-social-live-collab-v1/);

console.log('SOCIAL_CHAT_WELLNESS_COLLAB_CONTRACT_PASS');
