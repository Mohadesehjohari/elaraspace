// Shared production read-only scanner. Does not log document IDs or private text.
import {planGroup,planClub,planChallenge,isExpiredPending,inspectCollab} from './social-cutover-core.mjs';
export async function scanCutover(db,stamp,nowMs=Date.now()){
 const counts={
  groups:{total:0,legacy:0,ready:0,groupMembers:0,invalid:0},
  clubs:{total:0,legacy:0,ready:0,clubMembers:0,clubInvites:0,invalid:0},
  challenges:{total:0,legacy:0,ready:0,invalid:0,expiredPending:0,statuses:{}},
  collabSpaces:{total:0,invalid:0,kinds:{}},
  collabInvites:{total:0},conversations:{total:0},
  planned:{groups:0,clubs:0,challenges:0}
 };
 const plans=[];
 async function each(path,fn){for await(const snap of db.collection(path).stream()){await fn(snap)}}
 async function assess(kind,snap,fn){
  try{
   const patch=await fn();
   if(patch){counts[kind].legacy++;counts.planned[kind]++;plans.push({kind,ref:snap.ref,updateTime:snap.updateTime,patch})}
   else counts[kind].ready++;
  }catch{counts[kind].invalid++}
 }
 await each('groups',async snap=>{
  counts.groups.total++;
  const members=await snap.ref.collection('groupMembers').get();counts.groups.groupMembers+=members.size;
  await assess('groups',snap,()=>planGroup(snap.id,snap.data()));
 });
 await each('clubs',async snap=>{
  counts.clubs.total++;
  const [members,invites]=await Promise.all([snap.ref.collection('clubMembers').get(),snap.ref.collection('clubInvites').get()]);
  counts.clubs.clubMembers+=members.size;counts.clubs.clubInvites+=invites.size;
  await assess('clubs',snap,()=>planClub(snap.id,snap.data(),members.docs.map(d=>d.data())));
 });
 await each('challenges',async snap=>{
  counts.challenges.total++;
  const data=snap.data();const key=String(data.status||'missing');counts.challenges.statuses[key]=(counts.challenges.statuses[key]||0)+1;
  if(isExpiredPending(data,nowMs))counts.challenges.expiredPending++;
  await assess('challenges',snap,()=>planChallenge(snap.id,data,stamp,nowMs));
 });
 await each('collabSpaces',async snap=>{
  counts.collabSpaces.total++;const a=inspectCollab(snap.data());
  counts.collabSpaces.kinds[String(a.kind||'missing')]=(counts.collabSpaces.kinds[String(a.kind||'missing')]||0)+1;
  if(!a.valid)counts.collabSpaces.invalid++;
 });
 await each('collabInvites',async()=>{counts.collabInvites.total++});
 await each('conversations',async()=>{counts.conversations.total++});
 return {counts,plans,invalid:counts.groups.invalid+counts.clubs.invalid+counts.challenges.invalid+counts.collabSpaces.invalid};
}
