import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../elara-collab.js',import.meta.url),'utf8');
assert.match(source,/const KINDS=new Set\(\['task','habit','goal','language-class','leitner-word'\]\)/);

const mStart=source.indexOf('function materialize(space){');
const mEnd=source.indexOf('function requireUser()',mStart);
assert.ok(mStart>=0&&mEnd>mStart,'materialize() block missing');
const materialize=source.slice(mStart,mEnd);

assert.match(materialize,/arr\.find\(x=>x\.collabSpaceId===space\.id\)/,'materialization must dedupe by collabSpaceId');
for(const kind of ['task','habit','goal','language-class']){
  assert.ok(materialize.includes("kind==='"+kind+"'"),'materialize branch missing for '+kind);
}
assert.match(materialize,/else row=\{[\s\S]*front:/,'Leitner materialization branch missing');
assert.match(materialize,/shared:true/,'canonical shared metadata missing');
assert.match(materialize,/window\.ElaraLinkedTasks\?\.syncAll\?\.\(\)/,'Goal steps must flow through existing linked-task synchronization');
assert.doesNotMatch(materialize,/kind==='goal'[\s\S]{0,1400}tasks\.unshift/,'Goal materialization must not manufacture a fake Task for the Goal itself');

const acceptStart=source.indexOf('async function acceptInvite(inviteId){');
const acceptEnd=source.indexOf('async function declineInvite',acceptStart);
assert.ok(acceptStart>=0&&acceptEnd>acceptStart,'acceptInvite block missing');
const accept=source.slice(acceptStart,acceptEnd);
assert.match(accept,/d\.status==='pending'/);
assert.match(accept,/else if\(d\.status!=='accepted'\)/,'accepted invite must be idempotent');
assert.match(accept,/existing\?\.id\|\|materialize\(space\)/,'accepted retry must not duplicate materialization');
assert.match(accept,/progressCompleted:progress\.completed/);
assert.match(accept,/progressTotal:progress\.total/);
assert.match(accept,/progressPercent:progress\.percent/);

const syncStart=source.indexOf('async function syncProgress(){');
const syncEnd=source.indexOf('function scheduleSync()',syncStart);
const sync=source.slice(syncStart,syncEnd);
for(const kind of ['task','habit','goal','language-class','leitner-word']){
  assert.ok(sync.includes("['"+kind+"'"),'progress sync missing '+kind);
}

console.log('COLLAB_FIVE_KIND_MATERIALIZATION_PASS task habit goal class leitner idempotent progress linked-tasks');
