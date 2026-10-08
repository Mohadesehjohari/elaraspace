import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../elara-social.js',import.meta.url),'utf8');

assert.match(s,/const PRESENCE_TTL_MS=90000,PRESENCE_HEARTBEAT_MS=45000/);
assert.match(s,/online=lastSeen>0&&\(Date\.now\(\)-lastSeen\)<=PRESENCE_TTL_MS/);
assert.match(s,/state\.friends\.map\(x=>String\(x\.uid\)\)\.filter\(x=>x&&!blocked\.has\(x\)&&!muted\.has\(x\)\)/,'presence listeners must exclude blocked and muted friends');
assert.match(s,/setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'\)void heartbeatPresence\(\)\}/);
assert.match(s,/visibilitychange',\(\)=>\{if\(document\.visibilityState==='visible'&&presenceRuntime\.uid===uid\)void heartbeatPresence\(\)\}\)/);
assert.doesNotMatch(s,/visibilitychange'[\s\S]{0,260}(?:deleteDoc\([^)]*presence|online:false|offline)/,'visibilitychange must not write definitive offline state');
assert.match(s,/\['private','friends','public'\]\.includes\(value\)/,'presence privacy choices missing');

console.log('PRESENCE_TTL_PRIVACY_CONTRACT_PASS ttl heartbeat no-fake-offline block-mute-aware');
