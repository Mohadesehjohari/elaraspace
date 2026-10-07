import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../elara-social.js',import.meta.url),'utf8');

assert.match(s,/const CHALLENGE_MODES=new Set\(\['now','online','inbox'\]\)/);
assert.match(s,/if\(!acceptedFriend\(to\)\)throw Error/,'challenge must require accepted friendship');
assert.match(s,/if\(mutedByMe\(to\)\)throw Error/,'challenge must respect mute');
assert.match(s,/Date\.now\(\)-last<10000/,'challenge sender rate limit missing');
assert.match(s,/mode==='now'\?Timestamp\.fromMillis\(now\+30000\):mode==='online'\?Timestamp\.fromMillis\(now\+86400000\):null/,'now/online/inbox expiry contract missing');
assert.match(s,/async function resendChallenge[\s\S]*attempt:\(Number\(challenge\.attempt\)\|\|1\)\+1[\s\S]*originId:challenge\.originId\|\|challenge\.id/,'resend history lineage missing');
assert.match(s,/targetText:override\.targetText\?\?challenge\.targetText/,'resend edit-before-send path missing');
assert.match(s,/status:'cancelled'/,'challenge cancel status missing');
assert.match(s,/\['accepted','declined'\]\.includes\(status\)/,'accept/decline path missing');
assert.match(s,/CHALLENGE_QUICK/,'quick canned messages missing');
assert.match(s,/onSnapshot\(query\(collection\(db,'challenges'\),where\('to','==',mine\)\)/,'challenge realtime listener missing');
assert.match(s,/dedupeKey:'challenge-in:'\+row\.id/,'challenge notification dedupe missing');
assert.match(s,/if\(challengeSeen\.has\(row\.id\)\|\|mutedByMe\(row\.from\)\)continue/,'challenge realtime must respect mute');

console.log('CHALLENGE_CORE_CONTRACT_PASS now online inbox timeout resend-edit history rate mute realtime');
