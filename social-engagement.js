import {getApps} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,addDoc,deleteDoc,serverTimestamp,query,orderBy} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const app=getApps()[0]||null,auth=app?getAuth(app):null,db=app?getFirestore(app):null;
const safe=(v,n)=>String(v??'').trim().slice(0,n);
const kindName=kind=>kind==='post'?'socialPosts':kind==='activity'?'activities':null;
const ms=v=>typeof v?.toMillis==='function'?v.toMillis():Number(v?.seconds)*1000||Number(v)||0;
const person=uid=>uid===auth?.currentUser?.uid?({...window.ElaraAccount?.profile,uid,name:window.ElaraAccount?.profile?.name||window.ElaraSocial?.me?.name||'Elara'}):((window.ElaraSocial?.friends||[]).find(x=>x.uid===uid)||{uid,name:'کاربر الارا'});
function ready(){const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('برای واکنش و نظر وارد حساب تأییدشده شو.');return current}
function refs(kind,targetId){const name=kindName(kind);if(!name||!targetId)throw Error('مقصد تعامل معتبر نیست.');const parent=doc(db,name,String(targetId));return{parent,likes:collection(parent,'likes'),comments:collection(parent,'comments'),name}}
async function load(kind,targetId){
 const current=ready(),r=refs(kind,targetId);
 const [likesSnap,commentsSnap]=await Promise.all([getDocs(r.likes),getDocs(query(r.comments,orderBy('createdAt','asc')))]);
 const likes=[];likesSnap.forEach(s=>likes.push({id:s.id,...s.data()}));
 const comments=[];commentsSnap.forEach(s=>{const d=s.data()||{};comments.push({id:s.id,uid:d.uid,text:d.text||'',ms:ms(d.createdAt),person:person(d.uid),mine:d.uid===current.uid})});
 return{likes:likes.length,liked:likes.some(x=>x.uid===current.uid||x.id===current.uid),comments,commentCount:comments.length}
}
async function toggleLike(kind,targetId){
 const current=ready(),r=refs(kind,targetId),likeRef=doc(r.likes,current.uid),snap=await getDoc(likeRef);
 if(snap.exists()){await deleteDoc(likeRef);return false}
 await setDoc(likeRef,{uid:current.uid,createdAt:serverTimestamp()});return true
}
async function addComment(kind,targetId,text){
 const current=ready(),r=refs(kind,targetId),clean=safe(text,1000);if(!clean)throw Error('متن نظر خالی است.');
 const created=await addDoc(r.comments,{uid:current.uid,text:clean,createdAt:serverTimestamp()});return created.id
}
async function deleteComment(kind,targetId,commentId){
 ready();const r=refs(kind,targetId);await deleteDoc(doc(r.comments,String(commentId)));return true
}
async function purge(kind,targetId){
 const current=ready(),r=refs(kind,targetId),parent=await getDoc(r.parent);if(!parent.exists()||parent.data()?.uid!==current.uid)throw Error('فقط صاحب محتوا می‌تواند تعامل‌ها را پاک‌سازی کند.');
 const [likes,comments]=await Promise.all([getDocs(r.likes),getDocs(r.comments)]);
 await Promise.all([...likes.docs,...comments.docs].map(row=>deleteDoc(row.ref)));return true
}
window.ElaraEngagement={load,toggleLike,addComment,deleteComment,purge,person};
window.dispatchEvent(new Event('elara:engagement-ready'));
