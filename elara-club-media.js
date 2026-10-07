import {getApps} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getStorage,ref as storageRef,uploadBytes,deleteObject,getBytes} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js';

const app=getApps()[0]||null,auth=app?getAuth(app):null,storage=app?getStorage(app):null;
const TYPES=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]),urls=new Set();
function validate(file){if(!(file instanceof Blob)||!TYPES.has(file.type))throw Error('فقط JPEG، PNG یا WebP مجاز است.');if(file.size<=0||file.size>=5*1024*1024)throw Error('حجم تصویر باید کمتر از ۵ مگابایت باشد.');return file}
async function upload(clubId,kind,file){
 if(!auth?.currentUser?.emailVerified||!storage)throw Error('حساب تأییدشده و Firebase Storage لازم است.');if(!['avatar','banner'].includes(kind))throw Error('نوع تصویر باشگاه معتبر نیست.');file=validate(file);
 const ext=TYPES.get(file.type),name=(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,24)+'.'+ext,path='clubMedia/'+String(clubId)+'/'+kind+'/'+auth.currentUser.uid+'/'+name,api=window.ElaraSocial?.clubs;if(!api?.settings)throw Error('سرویس باشگاه آماده نیست.');
 const clubs=await api.list(),club=clubs.find(x=>x.id===String(clubId));if(!club||club.owner!==auth.currentUser.uid)throw Error('فقط صاحب باشگاه می‌تواند تصویر را تغییر دهد.');
 const previous=kind==='avatar'?club.avatarPath:club.bannerPath;await uploadBytes(storageRef(storage,path),file,{contentType:file.type,cacheControl:'private,max-age=3600'});try{await api.settings(clubId,{[kind==='avatar'?'avatarPath':'bannerPath']:path})}catch(error){try{await deleteObject(storageRef(storage,path))}catch{}throw error}
 if(previous&&previous!==path)try{await deleteObject(storageRef(storage,previous))}catch(error){if(String(error?.code||'')!=='storage/object-not-found')console.warn('Club old media cleanup:',error)}
 return path
}
async function read(path){if(!path||!storage)return'';const bytes=await getBytes(storageRef(storage,String(path)),5*1024*1024),url=URL.createObjectURL(new Blob([bytes]));urls.add(url);return url}
function revoke(url){if(url&&urls.has(url)){URL.revokeObjectURL(url);urls.delete(url)}}
window.addEventListener('pagehide',()=>{for(const url of urls)URL.revokeObjectURL(url);urls.clear()});
window.ElaraClubMedia={upload,read,revoke};
