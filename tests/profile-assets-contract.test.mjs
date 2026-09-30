import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const profile=read('approved-profile-system.js');
const visual=read('approved-visual.js');
const manifest=JSON.parse(read('deploy/production-manifest.json'));
const variants=[];
for(let n=1;n<=10;n++)for(const g of ['m','f'])for(const shape of ['circle','square'])variants.push(`assets/avatars/level-${String(n).padStart(2,'0')}-${g}-${shape}.png`);
for(const tier of ['bronze','silver','gold','diamond'])for(const shape of ['circle','square'])variants.push(`assets/frames/${tier}-${shape}.png`);
for(const asset of variants){
 assert.equal(existsSync(new URL('../'+asset,import.meta.url)),true,`missing shape variant: ${asset}`);
 assert.ok(statSync(new URL('../'+asset,import.meta.url)).size>1000,`empty/tiny shape variant: ${asset}`);
 assert.ok(manifest.files.includes(asset),`production manifest missing variant: ${asset}`);
 assert.ok(manifest.required.includes(asset),`production required list missing variant: ${asset}`);
}
assert.match(profile,/shape,nameFont,photoMode/);
assert.match(profile,/photoVariants/);
assert.match(profile,/frameVariantPath/);
assert.match(profile,/assets\/avatars\/level-/);
assert.match(profile,/assets\/frames\//);
assert.ok(profile.includes("SHAPES=Object.freeze(['circle','square'])"));
assert.ok(visual.includes('data-wardrobe-shape="circle"')&&visual.includes('data-wardrobe-shape="square"'),'Wardrobe must expose explicit Circle/Square filtering');
assert.ok(visual.includes("system.avatarPath(group,n,p.shape||'circle')"),'Avatar picker must load active shape variant');
assert.ok(visual.includes("system.frameVariantPath(f.id,p.shape||'circle')"),'Frame picker must load active shape variant');
console.log('PASS: 40 avatar + 8 frame shape paths, production manifest, picker filtering and upload/font/shape contracts.');
