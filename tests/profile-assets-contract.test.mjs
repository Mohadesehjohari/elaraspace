import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const profile=read('approved-profile-system.js');
const manifest=JSON.parse(read('deploy/production-manifest.json'));

const avatarVariants=[];
for(let level=1;level<=10;level++)for(const gender of ['m','f'])for(const shape of ['circle','square'])
  avatarVariants.push(`assets/avatars/level-${String(level).padStart(2,'0')}-${gender}-${shape}.png`);
const frameVariants=[];
for(const tier of ['bronze','silver','gold','diamond'])for(const shape of ['circle','square'])
  frameVariants.push(`assets/frames/${tier}-${shape}.png`);
const assets=[...avatarVariants,...frameVariants];

assert.match(profile,/assets\/avatars\/level-/);
assert.match(profile,/assets\/frames\//);
assert.match(profile,/photoVariants/);
assert.match(profile,/profile-shape-/);
for(const asset of assets){
  assert.equal(existsSync(new URL('../'+asset,import.meta.url)),true,`missing profile shape asset: ${asset}`);
  assert.ok(manifest.files.includes(asset),`production manifest missing profile asset: ${asset}`);
}
for(const old of [
  ...Array.from({length:10},(_,i)=>`assets/avatars-male-level${i+1}.png`),
  ...Array.from({length:10},(_,i)=>`assets/avatars_female_level${i+1}.png`)
]){
  assert.ok(!profile.includes(old),`retired avatar path is still a runtime owner: ${old}`);
}
console.log('PASS: 40 circle/square avatar variants + 8 frame variants exist, are deployable, and legacy level paths are retired from runtime ownership.');
