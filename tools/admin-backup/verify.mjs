#!/usr/bin/env node
/*
 * Verify an existing encrypted Elara Firebase backup OFFLINE.
 * Never reads the Firebase key, never accesses the network, never sends data
 * to ChatGPT or GitHub, never writes decrypted user data to disk.
 */
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {decrypt,secret} from './backup.mjs';

export function inspectBackup(envelope,password) {
  // Authentication and integrity are checked by AES-GCM before JSON decoding.
  const content=decrypt(envelope,password);
  const record=JSON.parse(content.toString('utf8'));
  if(record?.format!=='elara-firebase-snapshot'||record?.version!==1||record?.projectId!=='elara-ab1aa')
    throw new Error('This file is not a recognized backup of Elara Firebase.');
  if(!Array.isArray(record.firestoreDocuments)||!Array.isArray(record.firebaseAuthenticationUsers))
    throw new Error('Backup does not include both Firestore documents and Auth accounts.');
  if(record.counts?.firestoreDocuments!==record.firestoreDocuments.length
     ||record.counts?.authUsers!==record.firebaseAuthenticationUsers.length)
    throw new Error('Backup count mismatch.');
  const ids=new Set(record.firebaseAuthenticationUsers.map(u=>u?.uid).filter(Boolean));
  const accountPaths=record.firestoreDocuments
    .map(doc=>doc?.path||'')
    .filter(p=>/^private\/[^/]+\/app\/main$/.test(p));
  const accountUIDs=new Set(accountPaths.map(p=>p.split('/')[1]));
  const matching=new Set([...accountUIDs].filter(uid=>ids.has(uid))).size;
  return {
    projectId:record.projectId,
    exportedAt:record.exportedAt,
    firestoreDocuments:record.firestoreDocuments.length,
    authUsers:record.firebaseAuthenticationUsers.length,
    accountDataDocuments:accountUIDs.size,
    matchedRegisteredAccounts:matching,
    encryptedVerified:true
  };
}

async function main(){
  const location=process.argv[2];
  if(!location||!location.endsWith('.json.enc'))
    throw new Error('Drag your elara-firebase-all-users-....json.enc file onto verify-windows.cmd.');
  const full=path.resolve(location);
  const details=await stat(full);
  if(!details.isFile()||details.size>100*1024*1024)throw new Error('Backup file is missing or too large.');
  const data=JSON.parse(await readFile(full,'utf8'));
  const password=await secret('Enter the SAME backup password you chose before: ');
  const result=inspectBackup(data,password);
  console.log('\nSUCCESS: BACKUP PASSWORD AND FILE INTEGRITY VERIFIED.');
  console.log('Project:',result.projectId);
  console.log('Created at (UTC):',result.exportedAt);
  console.log('Firestore documents:',result.firestoreDocuments);
  console.log('Firebase Authentication accounts:',result.authUsers);
  console.log('Accounts with main cloud data:',result.accountDataDocuments);
  console.log('Main cloud accounts matched with Authentication:',result.matchedRegisteredAccounts);
  if(result.accountDataDocuments<4)
    console.log('NOTE: fewer than 4 account data documents found. Check whether all users had synced data.');
  console.log('No data was changed, uploaded, or written unencrypted.');
  console.log('Do not share this encrypted backup or its password with anyone.');
}
const thisFile=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===thisFile){
  main().catch(e=>{
    console.error('\nVERIFICATION FAILED:',e.message||String(e));
    console.error('Original backup remains untouched.');
    process.exitCode=1;
  });
}
