#!/usr/bin/env node
// READ-ONLY production audit. No write calls. No raw IDs, document text or secrets logged.
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {scanCutover} from './social-cutover-scan.mjs';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--project'||args[1]!=='elara-ab1aa')throw Error('Use --project elara-ab1aa (read-only); no other arguments accepted');
initializeApp({credential:applicationDefault(),projectId:'elara-ab1aa'});
const {counts,invalid}=await scanCutover(getFirestore(),'AUDIT_READ_ONLY',Date.now());
console.log(JSON.stringify({mode:'READ_ONLY',project:'elara-ab1aa',counts,invalid,productionWrites:0},null,2));
