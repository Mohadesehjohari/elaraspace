// Pure, side-effect-free migration plans for the OLD production 57914b schema.
// Strict target: Social Closure c102700. Never invent membership or activity.
import {createHash} from 'node:crypto';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const validString=(s,max=1000)=>typeof s==='string'&&s.length>0&&s.length<=max;
const legacyClubFields=['owner','title','kind','visibility','assistant1','assistant2','restDay','createdAt','updatedAt'];
const modernClubFields=['membershipMode','bio','rulesText','language','avatarPath','bannerPath','memberLimit','memberCount','lastMembershipUid','lastMembershipAction','currentBookTitle','status'];
const challengeNew=['mode','attempt','originId','updatedAt'];
export function planGroup(id,data){
 if(own(data,'status')){if(!['active','closed'].includes(data.status))throw Error('invalid-group-status');return null}
 if(!validString(data.owner,200)||!validString(data.title,80)||data.title.length<2||!data.createdAt||!data.updatedAt||data.lastText===undefined||data.lastSender===undefined)throw Error('invalid-legacy-group');
 return {status:'active'};
}
export function planClub(id,data,members){
 if(modernClubFields.every(k=>own(data,k)))return null;
 if(modernClubFields.some(k=>own(data,k)))throw Error('partially-migrated-club');
 if(!legacyClubFields.every(k=>own(data,k)))throw Error('incomplete-legacy-club');
 if(!validString(data.owner,200)||!validString(data.title,80)||data.title.length<2||!['reading','fitness','focus','general'].includes(data.kind)||!['public','private'].includes(data.visibility)||!Number.isInteger(data.restDay)||data.restDay<0||data.restDay>6)throw Error('invalid-legacy-club');
 if(!Array.isArray(members)||members.length<1||members.length>200)throw Error('invalid-club-member-count');
 if(members.filter(m=>m.role==='owner'&&m.uid===data.owner).length!==1||members.filter(m=>m.role==='owner').length!==1)throw Error('invalid-club-owner-membership');
 const uidSet=new Set(members.map(m=>m.uid));if(uidSet.size!==members.length)throw Error('duplicate-club-member');
 const assists=members.filter(m=>m.role==='assistant').map(m=>m.uid);
 if(assists.length>2||data.assistant1&&(!assists.includes(data.assistant1))||data.assistant2&&(!assists.includes(data.assistant2)))throw Error('club-assistant-inconsistent');
 return {
  membershipMode:'invite', // legacy membership was always invite-only irrespective of visibility
  bio:'',rulesText:'',language:'',avatarPath:'',bannerPath:'',
  memberLimit:Math.max(50,members.length),memberCount:members.length,
  lastMembershipUid:'',lastMembershipAction:'migration', // explicit neutral marker, NOT a fabricated join
  currentBookTitle:'',status:'active'
 };
}
export function planChallenge(id,data,stamp,nowMs){
 if(challengeNew.every(k=>own(data,k)))return null;
 if(challengeNew.some(k=>own(data,k)))throw Error('partially-migrated-challenge');
 if(!validString(data.from,200)||!validString(data.to,200)||!['pending','accepted','declined'].includes(data.status)||!['task','habit','reading','exercise','focus','general'].includes(data.targetKind)||!validString(data.targetText,120)||!Number.isInteger(data.targetValue)||data.targetValue<1||data.targetValue>1000000||!data.createdAt||!data.expiresAt||typeof data.expiresAt.toMillis!=='function')throw Error('invalid-legacy-challenge');
 // Preserve createdAt, status, expiresAt, respondedAt. Pending expired stays expired:
 // the new client uses the original past expiresAt, never an extended deadline.
 return {mode:'now',attempt:1,originId:'legacy-'+createHash('sha256').update(id).digest('hex').slice(0,32),updatedAt:stamp};
}
export const isExpiredPending=(data,nowMs)=>data.status==='pending'&&data.expiresAt?.toMillis?.()<=nowMs;
export function inspectCollab(data){
 return {valid:validString(data.ownerUid,200)&&['task','habit','goal','language-class','leitner-word'].includes(data.kind),kind:data.kind};
}
