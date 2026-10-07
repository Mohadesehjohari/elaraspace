export const normalizeUsername=value=>String(value??'').trim().replace(/^@/,'').toLowerCase();
export const usernameValid=value=>/^[a-z][a-z0-9_]{2,19}$/.test(normalizeUsername(value));
export const redactUid=value=>{const uid=String(value||'');return uid.length<=8?uid.slice(0,2)+'…'+uid.slice(-2):uid.slice(0,4)+'…'+uid.slice(-4)};

const pushMap=(map,key,value)=>{if(!map.has(key))map.set(key,[]);map.get(key).push(value)};

export function analyzeIdentityRecords(profileRows=[],claimRows=[]){
 const profiles=new Map(),profilesByUsername=new Map(),claims=new Map(),claimsByUid=new Map();
 const invalidProfileUsernames=[],invalidClaimUsernames=[];
 for(const row of profileRows){
  const uid=String(row.uid||row.id||''),username=normalizeUsername(row.username);
  if(!uid)continue;
  profiles.set(uid,{...row,uid,username});
  if(!usernameValid(username)){invalidProfileUsernames.push({uid,username});continue}
  pushMap(profilesByUsername,username,uid);
 }
 for(const row of claimRows){
  const username=normalizeUsername(row.username||row.id),uid=String(row.uid||'');
  if(!usernameValid(username)){invalidClaimUsernames.push({username,uid});continue}
  claims.set(username,{...row,username,uid});
  if(uid)pushMap(claimsByUid,uid,username);
 }
 const duplicateProfiles=[...profilesByUsername].filter(([,uids])=>uids.length>1).map(([username,uids])=>({username,uids:[...uids].sort()}));
 const missingClaims=[],mismatchedClaims=[],claimProfileMissing=[],claimProfileUsernameMismatch=[],multipleClaimsForUid=[];
 for(const profile of profiles.values()){
  if(!usernameValid(profile.username))continue;
  const claim=claims.get(profile.username);
  if(!claim)missingClaims.push({uid:profile.uid,username:profile.username});
  else if(claim.uid!==profile.uid)mismatchedClaims.push({uid:profile.uid,username:profile.username,claimUid:claim.uid});
 }
 for(const claim of claims.values()){
  const profile=profiles.get(claim.uid);
  if(!profile)claimProfileMissing.push({username:claim.username,uid:claim.uid});
  else if(profile.username!==claim.username)claimProfileUsernameMismatch.push({username:claim.username,uid:claim.uid,profileUsername:profile.username});
 }
 for(const [uid,usernames] of claimsByUid)if(usernames.length>1)multipleClaimsForUid.push({uid,usernames:[...usernames].sort()});
 const safeCreateClaims=missingClaims.filter(row=>{
  const owners=profilesByUsername.get(row.username)||[],uidClaims=claimsByUid.get(row.uid)||[];
  return owners.length===1&&owners[0]===row.uid&&uidClaims.length===0;
 });
 const safeDeleteClaims=claimProfileUsernameMismatch.filter(row=>{
  const profile=profiles.get(row.uid),canonical=profile&&claims.get(profile.username),usersOfStale=profilesByUsername.get(row.username)||[];
  return !!profile&&!!canonical&&canonical.uid===row.uid&&usersOfStale.length===0;
 });
 return {
  counts:{profiles:profiles.size,claims:claims.size},
  duplicateProfiles,missingClaims,mismatchedClaims,claimProfileMissing,claimProfileUsernameMismatch,multipleClaimsForUid,
  invalidProfileUsernames,invalidClaimUsernames,
  safeCreateClaims,safeDeleteClaims,
  hasConflicts:!!(duplicateProfiles.length||missingClaims.length||mismatchedClaims.length||claimProfileMissing.length||claimProfileUsernameMismatch.length||multipleClaimsForUid.length||invalidProfileUsernames.length||invalidClaimUsernames.length)
 };
}

export function redactAnalysis(analysis){
 const mapRow=row=>Object.fromEntries(Object.entries(row).map(([key,value])=>{
  if(key==='uid'||key==='claimUid')return[key,redactUid(value)];
  if(key==='uids')return[key,value.map(redactUid)];
  return[key,value];
 }));
 const out={counts:analysis.counts,hasConflicts:analysis.hasConflicts};
 for(const key of ['duplicateProfiles','missingClaims','mismatchedClaims','claimProfileMissing','claimProfileUsernameMismatch','multipleClaimsForUid','invalidProfileUsernames','invalidClaimUsernames','safeCreateClaims','safeDeleteClaims'])out[key]=(analysis[key]||[]).map(mapRow);
 return out
}
