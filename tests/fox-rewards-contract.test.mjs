import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
const file=p=>new URL('../'+p,import.meta.url),read=p=>readFileSync(file(p),'utf8');
const js=read('elara-fox-rewards.js'),css=read('elara-fox-rewards.css'),mission=read('mission-celebration.js'),html=read('index.html'),app=read('app.js');
assert.match(app,/elara:leitner-review-committed/);
assert.match(app,/dueRemaining:dueWords\(\)\.length/);
assert.match(js,/d\.dueRemaining\)!==0/);
assert.match(js,/ElaraLevels/);
assert.match(js,/aria-modal/);
assert.match(js,/elara:fox-focus-completed/);
assert.match(js,/elara:domain-milestone/);
assert.match(js,/elara_fox_options_v1/);
assert.match(js,/elara-fox-settings/);
assert.match(mission,/assets\/ui\/fox-mission\.webp/);
assert.match(html,/elara-fox-rewards\.js/);
assert.match(read('domain-notifications.js'),/elara:domain-milestone/);
assert.match(read('phase2.js'),/elara:fox-focus-completed/);
assert.match(css,/prefers-reduced-motion/);
const filenames=['sleep','sport','surprised','tasks','thoughtful','celebrate','focus','goals','habits','language','library','loved','mission','progress','sad'];
for(const name of filenames){
 const path='assets/ui/fox-'+name+'.webp';assert.ok(existsSync(file(path)),path+' missing');
 assert.ok(statSync(file(path)).size>20000,path+' too small');
 const b=readFileSync(file(path));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
}
assert.match(js,/assets\/ui\//);
console.log('FOX_REWARDS_PASS assets event contracts a11y settings real-progress checks');
