import {getApps} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,collection,query,where,getDocs,addDoc,deleteDoc,doc,serverTimestamp,Timestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const app=getApps()[0]||null,auth=app?getAuth(app):null,db=app?getFirestore(app):null;
const state={posts:[],stories:[],loading:false,error:''};
const safe=(v,n)=>String(v??'').trim().slice(0,n);
const visibility=v=>['private','friends','public'].includes(v)?v:'friends';
const ms=v=>typeof v?.toMillis==='function'?v.toMillis():Number(v?.seconds)*1000||Number(v)||0;
const friends=()=>Array.isArray(window.ElaraSocial?.friends)?window.ElaraSocial.friends:[];
const person=uid=>uid===auth?.currentUser?.uid?({...window.ElaraAccount?.profile,uid,name:window.ElaraAccount?.profile?.name||window.ElaraSocial?.me?.name||'Elara'}):(friends().find(x=>x.uid===uid)||{uid,name:'دوست'});
const emit=()=>window.dispatchEvent(new CustomEvent('elara:page-updated',{detail:{...state}}));
function row(snapshot){const d=snapshot.data()||{};return{id:snapshot.id,...d,createdMs:ms(d.createdAt),updatedMs:ms(d.updatedAt),expiresMs:ms(d.expiresAt),person:person(d.uid)}}
async function collectFor(name,{story=false}={}){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)return[];
 const ref=collection(db,name),map=new Map();
 const own=await getDocs(query(ref,where('uid','==',current.uid)));own.forEach(x=>map.set(x.id,row(x)));
 for(const f of friends().slice(0,24)){
  for(const vis of ['friends','public']){
   try{const snap=await getDocs(query(ref,where('uid','==',f.uid),where('visibility','==',vis)));snap.forEach(x=>map.set(x.id,row(x)))}catch(error){console.warn('Elara page friend query:',name,f.uid,vis,error)}
  }
 }
 const now=Date.now();return [...map.values()].filter(x=>!story||x.uid===current.uid||x.expiresMs>now).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0))
}
async function refresh(){
 state.loading=true;state.error='';emit();
 try{
  const current=auth?.currentUser;if(!current?.emailVerified||!db){state.posts=[];state.stories=[];return state}
  const [posts,stories]=await Promise.all([collectFor('socialPosts'),collectFor('socialStories',{story:true})]);state.posts=posts;state.stories=stories;return state
 }catch(error){state.error=String(error?.message||error);console.error('Elara page refresh:',error);return state}
 finally{state.loading=false;emit()}
}
async function createPost(text,vis='friends'){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('برای انتشار وارد حساب تأییدشده شو.');
 const clean=safe(text,4000);if(!clean)throw Error('متن پست خالی است.');
 await addDoc(collection(db,'socialPosts'),{uid:current.uid,text:clean,visibility:visibility(vis),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});await refresh();return true
}
async function createStory(text,vis='friends'){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('برای استاتوس وارد حساب تأییدشده شو.');
 const clean=safe(text,1000);if(!clean)throw Error('متن استاتوس خالی است.');
 await addDoc(collection(db,'socialStories'),{uid:current.uid,text:clean,visibility:visibility(vis),createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+24*60*60*1000)});await refresh();return true
}
async function remove(kind,id){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('حساب در دسترس نیست.');
 const collectionName=kind==='story'?'socialStories':'socialPosts',rows=kind==='story'?state.stories:state.posts,row=rows.find(x=>x.id===id);if(!row||row.uid!==current.uid)throw Error('فقط محتوای خودت را می‌توانی حذف کنی.');
 await deleteDoc(doc(db,collectionName,id));await refresh();return true
}
window.ElaraPage={state,refresh,createPost,createStory,deletePost:id=>remove('post',id),deleteStory:id=>remove('story',id),person};
for(const event of ['elara:account-ready','elara:social-updated'])window.addEventListener(event,()=>{if(auth?.currentUser?.emailVerified)void refresh();else emit()});
if(auth?.currentUser?.emailVerified)void refresh();else emit();
