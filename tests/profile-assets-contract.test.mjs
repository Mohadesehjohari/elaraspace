import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const profile=read('approved-profile-system.js');
const manifest=JSON.parse(read('deploy/production-manifest.json'));

const assets=[
  ...Array.from({length:10},(_,i)=>`assets/avatars-male-level${i+1}.png`),
  ...Array.from({length:10},(_,i)=>`assets/avatars_female_level${i+1}.png`),
  'assets/frames_bronze.png',
  'assets/frames_silver.png',
  'assets/frames_gold.png',
  'assets/frames_diamond.png'
];

assert.match(profile,/assets\/avatars-male-level/);
assert.match(profile,/assets\/avatars_female_level/);
for(const frame of ['bronze','silver','gold','diamond'])assert.match(profile,new RegExp('assets/frames_'+frame+'\\.png'));

for(const asset of assets){
  assert.equal(existsSync(new URL('../'+asset,import.meta.url)),true,`missing canonical wardrobe asset: ${asset}`);
  assert.ok(manifest.files.includes(asset),`production manifest missing wardrobe asset: ${asset}`);
  assert.ok(manifest.required.includes(asset),`required production asset missing from manifest: ${asset}`);
}

for(const legacy of [
  ...Array.from({length:10},(_,i)=>`avatars-male-level${i+1}.png`),
  ...Array.from({length:10},(_,i)=>`avatars_female_level${i+1}.png`),
  'frames_bronze.png','frames_silver.png','frames_gold.png','frames_diamond.png'
]){
  assert.equal(manifest.files.includes(legacy),false,`legacy root wardrobe file must not deploy to production: ${legacy}`);
}

console.log('PASS: all 20 avatars and 4 frames exist at canonical assets/ paths and are required by the production manifest.');
