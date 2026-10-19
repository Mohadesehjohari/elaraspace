#!/usr/bin/env node
/**
 * Elara one-time, read-only backup. Runs LOCALLY or in the user's own Cloud Shell.
 * Requires Firebase Admin SDK, which is never loaded in the public website.
 *
 * Copies Firestore (all root collections and nested subcollections) and
 * Firebase Authentication user metadata. Does NOT include Cloudflare KV,
 * browser-only drafts, Google Cloud Storage objects, or raw user passwords.
 *
 * Output is AES-256-GCM encrypted before it touches disk. This program never
 * writes to Firestore or Firebase Auth and never contacts any backup server.
 */
import {readFile, mkdir, writeFile, readFile as readBack} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {StringDecoder} from 'node:string_decoder';

const PROJECT_ID='elara-ab1aa';
const MAX_DOCUMENTS=40000;
const MAX_USERS=20000;
const MAX_SIZE=70*1024*1024;
const PREFIX='elara-firebase-all-users-';

function safeValue(value,depth=0){
  if(depth>90)throw Error('Firestore nested fields exceed safety limit.');
  if(value==null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'){
    if(!Number.isFinite(value))throw Error('Unsupported non-finite number in Firestore.');
    return value;
  }
  if(typeof value==='bigint')return {$type:'firestore-integer',value:value.toString()};
  if(value instanceof Date)return {$type:'date',iso:value.toISOString()};
  if(Buffer.isBuffer(value)||value instanceof Uint8Array)return {$type:'bytes',base64:Buffer.from(value).toString('base64')};
  if(Array.isArray(value))return value.map(v=>safeValue(v,depth+1));
  if(typeof value==='object'){
    const type=value.constructor?.name;
    if(type==='Timestamp'&&typeof value.seconds==='number'&&typeof value.nanoseconds==='number')
      return {$type:'firestore-timestamp',seconds:value.seconds,nanoseconds:value.nanoseconds};
    if(type==='GeoPoint'&&typeof value.latitude==='number'&&typeof value.longitude==='number')
      return {$type:'firestore-geopoint',latitude:value.latitude,longitude:value.longitude};
    if(type==='DocumentReference'&&typeof value.path==='string')
      return {$type:'firestore-reference',path:value.path};
    const out=Object.create(null);
    for(const [k,v] of Object.entries(value)){
      if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe field key in data.');
      out[k]=safeValue(v,depth+1);
    }
    return out;
  }
  throw Error('Unsupported Firestore value type: '+typeof value);
}

function destination(){
  if(process.env.ELARA_BACKUP_DIR)return path.resolve(process.env.ELARA_BACKUP_DIR);
  const downloads=path.join(os.homedir(),'Downloads');
  return path.join(existsSync(downloads)?downloads:os.homedir(),'Elara-Backups');
}

async function secret(prompt){
  if(!process.stdin.isTTY||!process.stdin.setRawMode)throw Error('Please run in an interactive terminal to enter the backup password securely.');
  process.stdout.write(prompt);
  const input=process.stdin,decoder=new StringDecoder('utf8');
  let typed='',done=false;
  return await new Promise((resolve,reject)=>{
    const finish=(error)=>{
      if(done)return;done=true;
      input.off('data',onData);
      input.setRawMode(false);input.pause();
      process.stdout.write('\n');
      if(error)reject(error);else resolve(typed);
    };
    function onData(bytes){
      const decoded=decoder.write(bytes);
      for(const char of decoded){
        if(char==='\u0003'){finish(Error('Cancelled.'));return;}
        if(char==='\r'||char==='\n'){finish();return;}
        if(char==='\u007f'||char==='\b'){typed=typed.slice(0,-1);continue;}
        if(char>=' '&&typed.length<300)typed+=char;
      }
    }
    input.setRawMode(true);input.resume();input.on('data',onData);
  });
}

function encrypt(payload,passphrase){
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
  const key=crypto.scryptSync(passphrase,salt,32,{N:16384,r:8,p:1});
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const ciphertext=Buffer.concat([cipher.update(payload),cipher.final()]);
  const tag=cipher.getAuthTag();
  return {
    format:'elara-firebase-admin-export',version:1,encrypted:true,
    kdf:{name:'scrypt',N:16384,r:8,p:1,salt:salt.toString('base64')},
    cipher:'aes-256-gcm',iv:iv.toString('base64'),tag:tag.toString('base64'),
    ciphertext:ciphertext.toString('base64')
  };
}
function decrypt(record,passphrase){
  if(record?.format!=='elara-firebase-admin-export'||record?.version!==1||!record.encrypted)throw Error('Invalid backup file.');
  const salt=Buffer.from(record.kdf.salt,'base64'),key=crypto.scryptSync(passphrase,salt,32,{
    N:record.kdf.N,r:record.kdf.r,p:record.kdf.p
  });
  const decipher=crypto.createDecipheriv(record.cipher,key,Buffer.from(record.iv,'base64'));
  decipher.setAuthTag(Buffer.from(record.tag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(record.ciphertext,'base64')),decipher.final()]);
}

async function main(){
  const credentialPath=process.argv[2];
  const sdk=await import('firebase-admin/app');
  const {getFirestore}=await import('firebase-admin/firestore');
  const {getAuth}=await import('firebase-admin/auth');

  let credential;
  if(credentialPath){
    const key=JSON.parse(await readFile(path.resolve(credentialPath),'utf8'));
    if(key.project_id!==PROJECT_ID||!key.private_key||!key.client_email)
      throw Error('This Firebase service account is not for the expected Elara project.');
    credential=sdk.cert(key);
  }else{
    credential=sdk.applicationDefault();
  }
  const app=sdk.initializeApp({credential,projectId:PROJECT_ID});
  const db=getFirestore(app),auth=getAuth(app);
  console.log('Project:',PROJECT_ID);
  console.log('Read-only backup: Firestore documents + Firebase Authentication users.');
  console.log('No Firebase data will be changed.');
  const verified=await secret('Choose a NEW backup password (at least 12 characters; not your Firebase password): ');
  if(verified.length<12)throw Error('Password too short; no backup was created.');
  const repeated=await secret('Repeat the backup password: ');
  if(verified!==repeated)throw Error('Passwords differ; no backup was created.');

  const started=new Date().toISOString();
  const docs=[],authUsers=[];
  // Listing subcollections also finds nested documents under missing parent docs.
  async function walkCollection(collection,depth=0){
    if(depth>40)throw Error('Too many Firestore subcollection levels.');
    const refs=await collection.listDocuments();
    for(const ref of refs){
      if(docs.length>=MAX_DOCUMENTS)throw Error('Document limit exceeded; no backup written.');
      const snapshot=await ref.get();
      if(snapshot.exists){
        docs.push({
          path:ref.path,
          data:safeValue(snapshot.data()),
          createTime:snapshot.createTime?.toDate().toISOString()||null,
          updateTime:snapshot.updateTime?.toDate().toISOString()||null
        });
      }
      const children=await ref.listCollections();
      for(const child of children)await walkCollection(child,depth+1);
    }
  }

  console.log('Reading Firestore documents…');
  const collections=await db.listCollections();
  for(const col of collections)await walkCollection(col);
  console.log('Firestore documents:',docs.length);

  console.log('Reading Firebase Authentication users…');
  let pageToken;
  do{
    const result=await auth.listUsers(1000,pageToken);
    for(const u of result.users){
      if(authUsers.length>=MAX_USERS)throw Error('User limit exceeded; no backup written.');
      // Keep auth user profiles/metadata without password hashes or salts.
      const row=u.toJSON();
      delete row.passwordHash;delete row.passwordSalt;
      authUsers.push(row);
    }
    pageToken=result.pageToken;
  }while(pageToken);
  console.log('Authentication users:',authUsers.length);

  // Encryption takes place entirely in memory; only encrypted bytes go to disk.
  const data={
    format:'elara-firebase-snapshot',version:1,
    projectId:PROJECT_ID,exportedAt:started,
    scope:'All Firestore collections/subcollections and Firebase Auth user metadata',
    exclusions:[
      'Cloudflare KV / Gemini AI history','browser-only localStorage',
      'Firebase/Google Cloud Storage files','Firebase Authentication password hashes',
      'native managed Firestore export format'
    ],
    counts:{firestoreDocuments:docs.length,authUsers:authUsers.length},
    firestoreDocuments:docs,firebaseAuthenticationUsers:authUsers
  };
  const plaintext=Buffer.from(JSON.stringify(data),'utf8');
  if(plaintext.length>MAX_SIZE)throw Error('Backup size exceeds this utility limit; no backup written.');
  const record=encrypt(plaintext,verified),dir=destination();
  await mkdir(dir,{recursive:true,mode:0o700});
  const timestamp=started.replace(/[-:]/g,'').replace(/\..*$/,'').replace('T','-');
  const output=path.join(dir,PREFIX+timestamp+'.json.enc');
  await writeFile(output,JSON.stringify(record),{encoding:'utf8',flag:'wx',mode:0o600});
  const fromDisk=JSON.parse(await readBack(output,'utf8'));
  const restored=decrypt(fromDisk,verified);
  if(!crypto.timingSafeEqual(crypto.createHash('sha256').update(plaintext).digest(),crypto.createHash('sha256').update(restored).digest()))
    throw Error('Backup verification failed! Do not trust this file.');
  console.log('\nSUCCESS: encrypted backup saved and verified.');
  console.log('File:',output);
  console.log('Firestore documents:',docs.length,' | Auth users:',authUsers.length);
  console.log('Keep BOTH this file and your backup password safe. Without the password it cannot be recovered.');
  console.log('No Cloudflare memory or browser-only data is included.');
}

const thisFile=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===thisFile){
  main().catch(error=>{
    console.error('\nBACKUP FAILED:',error?.message||String(error));
    console.error('No unencrypted data is written by this utility.');
    process.exitCode=1;
  });
}
export {safeValue,encrypt,decrypt};
