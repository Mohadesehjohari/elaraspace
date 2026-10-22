import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const social=read('elara-social.js');
const groupUI=read('social-groups-ui.js');
const socialUI=read('social-view.js');
const indexes=JSON.parse(read('firestore.indexes.json'));
const rules=read('firestore.rules');

const activityRead=social.slice(social.indexOf('const recent=[];'),social.indexOf('if(auth.currentUser?.uid!==mine)return;state.activities='));
assert.match(activityRead,/where\('uid','==',friend\.uid\),where\('visibility','in',\['friends','public'\]\)/,
  'Every friend activity list query must include both ownership and permitted visibility');
assert.doesNotMatch(activityRead,/getDocs\(query\(collection\(db,'activities'\),where\('uid','==',friend\.uid\)\)\)/,
  'A uid-only friend activity query cannot satisfy Firestore visibility rules');
assert.match(rules,/match \/activities\/\{activityId\}/);
assert.ok(indexes.indexes.some(i=>i.collectionGroup==='activities'&&i.queryScope==='COLLECTION'
  &&i.fields?.[0]?.fieldPath==='uid'&&i.fields?.[1]?.fieldPath==='visibility'),
  'Composite index needed for privacy-safe per-user activity query');
assert.match(socialUI,/s\.activityError/, 'Display an actionable activity error rather than an empty feed');

const makeGroup=social.slice(social.indexOf('async function createGroup('),social.indexOf('async function listGroups('));
assert.doesNotMatch(makeGroup,/if\(!chosen\.length\)throw/, 'Creating a private group must not require an existing friend');
assert.match(makeGroup,/batch\.set\(doc\(ref,'groupMembers',uid\)/,
  'Owner must be a member in the same batch as group creation');
assert.match(makeGroup,/Promise\.allSettled\(chosen\.map\(member=>inviteGroup/,
  'Selected friends must be invited, not silently added');
const groupDialog=groupUI.slice(groupUI.indexOf('async function createGroup('),groupUI.indexOf('function renderMessages('));
assert.doesNotMatch(groupDialog,/if\(!people\.length\).*?return/s,
  'Empty friend list must not prevent opening the create-group form');

for(const [name,start,end] of [
  ['dm','async function sendDm(','window.ElaraSocial.dm='],
  ['group','async function sendGroup(','async function inviteGroup(']
]){
 const body=social.slice(social.indexOf(start),social.indexOf(end));
 assert.match(body,/const batch=writeBatch\(db\)/,name+' must use atomic writes');
 assert.match(body,/batch\.set\(messageRef,\{sender:uid,text,createdAt:stamp\}\)/,
  name+' must write its message inside the batch');
 assert.match(body,/batch\.update\(/,name+' must update preview in the same batch');
 assert.match(body,/await batch\.commit\(\)/,name+' must check batch success');
 assert.doesNotMatch(body,/await addDoc\(/,name+' must not leave a half-sent message');
}
assert.match(social,/inform\(socialError\('auth-bootstrap',error\)\)/,
  'Social startup failure must be visible instead of a silent empty friends list');
console.log('SOCIAL_CORE_RELIABILITY_PASS safe activity privacy, owner-only groups, atomic messages and clear startup error');
