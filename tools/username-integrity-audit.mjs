import {analyzeIdentityRecords,redactAnalysis,normalizeUsername} from './username-integrity-core.mjs';

const projectId=process.env.FIREBASE_PROJECT_ID||'elara-ab1aa';
const applySafe=process.argv.includes('--apply-safe');
let adminApp,adminFirestore;
try{
  adminApp=await import('firebase-admin/app');
  adminFirestore=await import('firebase-admin/firestore');
}catch(error){
  console.error('firebase-admin is required for the production audit. Install it in a trusted admin environment, then authenticate with Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(2);
}
const {applicationDefault,getApps,initializeApp}=adminApp;
const {getFirestore}=adminFirestore;
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app);

const [profilesSnap,claimsSnap]=await Promise.all([
  db.collection('profiles').get(),
  db.collection('usernames').get()
]);
const profileRows=profilesSnap.docs.map(d=>({uid:d.id,...d.data()}));
const claimRows=claimsSnap.docs.map(d=>({username:d.id,...d.data()}));
const analysis=analyzeIdentityRecords(profileRows,claimRows);
console.log(JSON.stringify({projectId,mode:applySafe?'apply-safe':'read-only',analysis:redactAnalysis(analysis)},null,2));

if(!applySafe)process.exit(analysis.hasConflicts?3:0);
if(process.env.ELARA_IDENTITY_REPAIR_CONFIRM!=='APPLY_SAFE_NON_CONFLICTING'){
  console.error('Refusing writes. Set ELARA_IDENTITY_REPAIR_CONFIRM=APPLY_SAFE_NON_CONFLICTING only after reviewing the read-only report.');
  process.exit(4);
}

for(const row of analysis.safeCreateClaims){
  await db.runTransaction(async tx=>{
    const profileRef=db.collection('profiles').doc(row.uid),claimRef=db.collection('usernames').doc(row.username);
    const duplicateQuery=db.collection('profiles').where('username','==',row.username).limit(3);
    const [profileSnap,claimSnap,duplicates]=await Promise.all([tx.get(profileRef),tx.get(claimRef),tx.get(duplicateQuery)]);
    if(!profileSnap.exists)throw new Error('Profile disappeared during safe repair: '+row.uid);
    if(normalizeUsername(profileSnap.get('username'))!==row.username)throw new Error('Profile username changed during safe repair: '+row.uid);
    if(claimSnap.exists)throw new Error('Claim appeared during safe repair: '+row.username);
    if(duplicates.size!==1||duplicates.docs[0].id!==row.uid)throw new Error('Username is not uniquely owned by one profile: '+row.username);
    tx.create(claimRef,{uid:row.uid});
  });
  console.log('SAFE_CREATE_CLAIM '+row.username);
}
for(const row of analysis.safeDeleteClaims){
  await db.runTransaction(async tx=>{
    const profileRef=db.collection('profiles').doc(row.uid),staleRef=db.collection('usernames').doc(row.username),canonicalRef=db.collection('usernames').doc(row.profileUsername);
    const [profileSnap,staleSnap,canonicalSnap]=await Promise.all([tx.get(profileRef),tx.get(staleRef),tx.get(canonicalRef)]);
    if(!profileSnap.exists)throw new Error('Profile disappeared during stale-claim cleanup: '+row.uid);
    if(normalizeUsername(profileSnap.get('username'))!==row.profileUsername)throw new Error('Canonical profile username changed: '+row.uid);
    if(!staleSnap.exists||String(staleSnap.get('uid')||'')!==row.uid)throw new Error('Stale claim ownership changed: '+row.username);
    if(!canonicalSnap.exists||String(canonicalSnap.get('uid')||'')!==row.uid)throw new Error('Canonical claim not verified: '+row.profileUsername);
    tx.delete(staleRef);
  });
  console.log('SAFE_DELETE_STALE_CLAIM '+row.username);
}
console.log('SAFE_REPAIR_COMPLETE. Ambiguous duplicate/mismatch/orphan conflicts were not modified.');
