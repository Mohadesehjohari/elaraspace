'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const files=fs.readdirSync(root).filter(name=>name.endsWith('.js')&&name!=='elara-cloud-storage.js');
const offenders=[];
for(const file of files){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 // The migration adapter is the only module allowed to read legacy native
 // browser storage. Old local music blobs may only be read for migration.
 const nativeStorage=/(?:window\.)?(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem|clear|key)\s*\(/g;
 const matches=[...text.matchAll(nativeStorage)];
 for(const match of matches)offenders.push(file+' native storage @'+match.index);
 if(file!=='freedom-r27-music.js'&&/\bindexedDB\.open\s*\(/.test(text))offenders.push(file+' IndexedDB write/read');
}
assert.deepEqual(offenders,[], 'First-party feature modules must use ElaraCloudStorage, not native browser storage');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.indexOf('elara-cloud-storage.js')>=0&&html.indexOf('elara-cloud-storage.js')<html.indexOf('app.js'),'memory facade must precede application startup');
console.log('BROWSERLESS_STORAGE_STATIC_PASS: no direct browser storage in root application modules');
