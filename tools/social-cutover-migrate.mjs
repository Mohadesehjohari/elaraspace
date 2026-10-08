#!/usr/bin/env node
// DEFAULT DRY RUN. Writes only with BOTH --apply and environment approval.
// Do NOT run apply until owner has reviewed the independent read-only audit.
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {scanCutover} from './social-cutover-scan.mjs';
const args=process.argv.slice(2);
const apply=args.includes('--apply');
const allowed=['--apply','--project','elara-ab1aa'];
if(args.filter(x=>x==='--apply').length>1||args.some(x=>!allowed.includes(x))||args.indexOf('--project')<0||args[args.indexOf('--project')+1]!=='elara-ab1aa')throw Error('Use --project elara-ab1aa [--apply]');
if(apply&&process.env.ELARA_SOCIAL_CUTOVER_CONFIRM!=='APPLY_SOCIAL_CUTOVER')throw Error('Refusing write: explicit ELARA_SOCIAL_CUTOVER_CONFIRM=APPLY_SOCIAL_CUTOVER required');
initializeApp({credential:applicationDefault(),projectId:'elara-ab1aa'});
const db=getFirestore(),now=Timestamp.now();
const result=await scanCutover(db,now,Date.now());
console.log(JSON.stringify({mode:apply?'APPLY':'DRY_RUN',before:result.counts,invalid:result.invalid,plannedWrites:result.plans.length},null,2));
if(result.invalid)throw Error('Unsafe source documents detected: fix/audit before migration');
if(!apply){console.log('SOCIAL_CUTOVER_MIGRATION_DRY_RUN_PASS writes=0');process.exit(0)}
let updated=0;
for(const item of result.plans){
 await item.ref.update(item.patch,{lastUpdateTime:item.updateTime});
 const after=await item.ref.get();
 for(const [field,value] of Object.entries(item.patch)){
  // Timestamps are verified by milliseconds; scalar fields require exact agreement.
  const actual=after.get(field);
  const equal=(actual?.toMillis&&value?.toMillis)?actual.toMillis()===value.toMillis():actual===value;
  if(!equal)throw Error('Migration verification failure; halt further writes');
 }
 updated++;
}
const again=await scanCutover(db,Timestamp.now(),Date.now());
console.log(JSON.stringify({mode:'APPLY_VERIFIED',applied:updated,after:again.counts,remaining:again.plans.length,invalid:again.invalid},null,2));
if(again.plans.length||again.invalid)throw Error('Post-migration re-scan requires review');
console.log('SOCIAL_CUTOVER_MIGRATION_APPLY_VERIFIED');
