import {getApps} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,collection,query,where,getDocs,getDoc,setDoc,updateDoc,deleteDoc,doc,serverTimestamp,Timestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {getStorage,ref as storageRef,uploadBytes,deleteObject,getBytes} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js';

const app=getApps()[0]||null,auth=app?getAuth(app):null,db=app?getFirestore(app):null,storage=app?getStorage(app):null;
const state={posts:[],stories:[],loading:false,error:'',targetUid:'',targetPerson:null};
let liveMediaUrls=new Set();
const safe=(v,n)=>String(v??'').trim().slice(0,n);
const visibility=v=>['private','friends','public'].includes(v)?v:'friends';
const ms=v=>typeof v?.toMillis==='function'?v.toMillis():Number(v?.seconds)*1000||Number(v)||0;
const friends=()=>Array.isArray(window.ElaraSocial?.friends)?window.ElaraSocial.friends:[];
const person=uid=>uid===auth?.currentUser?.uid?({...window.ElaraAccount?.profile,uid,name:window.ElaraAccount?.profile?.name||window.ElaraSocial?.me?.name||'Elara'}):(state.targetPerson?.uid===uid?state.targetPerson:(friends().find(x=>x.uid===uid)||{uid,name:'دوست'}));
const emit=()=>window.dispatchEvent(new CustomEvent('elara:page-updated',{detail:{...state}}));
function row(snapshot){const d=snapshot.data()||{};return{id:snapshot.id,...d,createdMs:ms(d.createdAt),updatedMs:ms(d.updatedAt),expiresMs:ms(d.expiresAt),person:person(d.uid)}}
const MEDIA_TYPES=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);
function validateMedia(file){if(!file)return null;if(!(file instanceof Blob)||!MEDIA_TYPES.has(file.type))throw Error('فقط تصویر JPEG، PNG یا WebP مجاز است.');if(file.size<=0||file.size>=5*1024*1024)throw Error('حجم تصویر باید کمتر از ۵ مگابایت باشد.');return file}
async function uploadMedia(file,kind,contentId,uid){file=validateMedia(file);if(!file)return null;if(!storage)throw Error('فضای ذخیره‌سازی در دسترس نیست.');const ext=MEDIA_TYPES.get(file.type),name=(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,24)+'.'+ext,path='pageMedia/'+uid+'/'+kind+'/'+contentId+'/'+name;await uploadBytes(storageRef(storage,path),file,{contentType:file.type,cacheControl:'private,max-age=3600'});return{mediaPath:path,mediaType:file.type}}
async function removeMedia(path){if(!path||!storage)return;try{await deleteObject(storageRef(storage,path))}catch(error){if(String(error?.code||'')!=='storage/object-not-found')console.warn('Elara page media cleanup:',error)}}
async function hydrateMedia(rows,urls){if(!storage)return rows;await Promise.all(rows.map(async item=>{if(!item.mediaPath)return;try{const bytes=await getBytes(storageRef(storage,item.mediaPath),5*1024*1024);const url=URL.createObjectURL(new Blob([bytes],{type:item.mediaType||'image/webp'}));item.mediaUrl=url;urls.add(url)}catch(error){console.warn('Elara page media read:',item.id,error)}}));return rows}
async function collectFor(name,{story=false,urls=new Set()}={}){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)return[];
 const ref=collection(db,name),map=new Map();
 const own=await getDocs(query(ref,where('uid','==',current.uid)));own.forEach(x=>map.set(x.id,row(x)));
 for(const f of friends().slice(0,24)){
  for(const vis of ['friends','public']){
   try{const clauses=[where('uid','==',f.uid),where('visibility','==',vis)];if(story)clauses.push(where('expiresAt','>',Timestamp.now()));const snap=await getDocs(query(ref,...clauses));snap.forEach(x=>map.set(x.id,row(x)))}catch(error){console.warn('Elara page friend query:',name,f.uid,vis,error)}
  }
 }
 const now=Date.now(),rows=[...map.values()].filter(x=>!story||x.uid===current.uid||x.expiresMs>now).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0));return hydrateMedia(rows,urls)
}
async function collectUser(name,target,{story=false,urls=new Set()}={}){
 const current=auth?.currentUser;if(!current?.emailVerified||!db||!target)return[];
 const ref=collection(db,name),map=new Map(),self=target===current.uid,isFriend=friends().some(x=>x.uid===target),visibilities=self?[]:(isFriend?['friends','public']:['public']);
 if(self){const snap=await getDocs(query(ref,where('uid','==',target)));snap.forEach(x=>map.set(x.id,row(x)))}
 else for(const vis of visibilities){const clauses=[where('uid','==',target),where('visibility','==',vis)];if(story)clauses.push(where('expiresAt','>',Timestamp.now()));try{const snap=await getDocs(query(ref,...clauses));snap.forEach(x=>map.set(x.id,row(x)))}catch(error){console.warn('Elara targeted page query:',name,target,vis,error)}}
 const now=Date.now(),rows=[...map.values()].filter(x=>self||!story||x.expiresMs>now).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0));return hydrateMedia(rows,urls)
}
async function loadTarget(targetUid,personHint=null){
 const current=auth?.currentUser,target=String(targetUid||'');if(!current?.emailVerified||!db||!target)throw Error('صفحهٔ کاربر در دسترس نیست.');
 state.targetUid=target;state.targetPerson=target===current.uid?person(target):{...(friends().find(x=>x.uid===target)||{}),...(personHint||{}),uid:target};state.loading=true;state.error='';emit();const urls=new Set();
 try{const [posts,stories]=await Promise.all([collectUser('socialPosts',target,{urls}),collectUser('socialStories',target,{story:true,urls})]);for(const url of liveMediaUrls)URL.revokeObjectURL(url);liveMediaUrls=urls;state.posts=posts;state.stories=stories;return state}
 catch(error){for(const url of urls)URL.revokeObjectURL(url);state.error=String(error?.message||error);console.error('Elara target page:',error);return state}
 finally{state.loading=false;emit()}
}
async function clearTarget(){state.targetUid='';state.targetPerson=null;return refresh()}
async function refresh(){
 if(state.targetUid)return loadTarget(state.targetUid,state.targetPerson);
 state.loading=true;state.error='';emit();
 try{
  const current=auth?.currentUser;if(!current?.emailVerified||!db){state.posts=[];state.stories=[];return state}
  const urls=new Set();try{const [posts,stories]=await Promise.all([collectFor('socialPosts',{urls}),collectFor('socialStories',{story:true,urls})]);for(const url of liveMediaUrls)URL.revokeObjectURL(url);liveMediaUrls=urls;state.posts=posts;state.stories=stories;return state}catch(error){for(const url of urls)URL.revokeObjectURL(url);throw error}
 }catch(error){state.error=String(error?.message||error);console.error('Elara page refresh:',error);return state}
 finally{state.loading=false;emit()}
}
async function createPost(text,vis='friends',media=null){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('برای انتشار وارد حساب تأییدشده شو.');
 const clean=safe(text,4000),file=validateMedia(media);if(!clean&&!file)throw Error('متن یا تصویر پست را اضافه کن.');
 const postRef=doc(collection(db,'socialPosts'));let uploaded=null;
 try{uploaded=await uploadMedia(file,'post',postRef.id,current.uid);await setDoc(postRef,{uid:current.uid,text:clean,visibility:visibility(vis),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...(uploaded||{})})}
 catch(error){if(uploaded?.mediaPath)await removeMedia(uploaded.mediaPath);throw error}
 await refresh();return true
}
async function createStory(text,vis='friends',media=null){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('برای استاتوس وارد حساب تأییدشده شو.');
 const clean=safe(text,1000),file=validateMedia(media);if(!clean&&!file)throw Error('متن یا تصویر استاتوس را اضافه کن.');
 const storyRef=doc(collection(db,'socialStories'));let uploaded=null;
 try{uploaded=await uploadMedia(file,'story',storyRef.id,current.uid);await setDoc(storyRef,{uid:current.uid,text:clean,visibility:visibility(vis),createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+24*60*60*1000),...(uploaded||{})})}
 catch(error){if(uploaded?.mediaPath)await removeMedia(uploaded.mediaPath);throw error}
 await refresh();return true
}
async function editPost(id,text,vis='friends'){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('حساب در دسترس نیست.');
 const row=state.posts.find(x=>x.id===id);if(!row||row.uid!==current.uid)throw Error('فقط پست خودت را می‌توانی ویرایش کنی.');
 const clean=safe(text,4000);if(!clean)throw Error('متن پست خالی است.');
 await updateDoc(doc(db,'socialPosts',id),{text:clean,visibility:visibility(vis),updatedAt:serverTimestamp()});await refresh();return true
}
const reportReason=v=>['spam','harassment','hate','sexual','violence','privacy','other'].includes(v)?v:'other';
async function reportContent(kind,id,reason='other',detail=''){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('برای گزارش وارد حساب تأییدشده شو.');
 kind=kind==='story'?'story':'post';id=String(id||'');const rows=kind==='story'?state.stories:state.posts,row=rows.find(x=>x.id===id);
 if(!row)throw Error('این محتوا دیگر در دسترس نیست.');if(row.uid===current.uid)throw Error('محتوای خودت را نمی‌توانی گزارش کنی.');
 const reportId=current.uid+'__'+kind+'__'+id,reportRef=doc(db,'contentReports',reportId),existing=await getDoc(reportRef);
 if(existing.exists())return 'existing';
 await setDoc(reportRef,{reporter:current.uid,targetUid:String(row.uid),kind,targetId:id,reason:reportReason(reason),detail:safe(detail,500),createdAt:serverTimestamp()});
 return true
}
async function remove(kind,id){
 const current=auth?.currentUser;if(!current?.emailVerified||!db)throw Error('حساب در دسترس نیست.');
 const collectionName=kind==='story'?'socialStories':'socialPosts',rows=kind==='story'?state.stories:state.posts,row=rows.find(x=>x.id===id);if(!row||row.uid!==current.uid)throw Error('فقط محتوای خودت را می‌توانی حذف کنی.');
 if(kind==='post')try{await window.ElaraEngagement?.purge?.('post',id)}catch(error){console.warn('Elara post engagement cleanup:',error)}
 await deleteDoc(doc(db,collectionName,id));if(row.mediaPath)await removeMedia(row.mediaPath);await refresh();return true
}
window.ElaraPage={state,refresh,viewUser:loadTarget,clearTarget,createPost,createStory,editPost,reportContent,deletePost:id=>remove('post',id),deleteStory:id=>remove('story',id),person};
for(const event of ['elara:account-ready','elara:social-updated'])window.addEventListener(event,()=>{if(auth?.currentUser?.emailVerified)void refresh();else emit()});
if(auth?.currentUser?.emailVerified)void refresh();else emit();
