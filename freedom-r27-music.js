/* Freedom R27: authenticated, owner-private Firebase Storage audio.
 * Legacy IndexedDB records are read ONLY to migrate old device-only uploads.
 * Apple previews are licensed third-party streams, never copied to Storage.
 */
(()=>{'use strict';
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'local';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const SRC='assets/ui/04-study-music-ambience-icon.webp',DB='elara_freedom_audio_v1',STORE='tracks';
const localSrc=new Map(),migrating=new Set();
let firebaseStorageSdk=null;
async function storageSdk(){
 if(!firebaseStorageSdk){
  firebaseStorageSdk=Promise.all([
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js')
  ]).then(([app,storage])=>({storage,instance:storage.getStorage(app.getApp())})).catch(e=>{firebaseStorageSdk=null;throw e});
 }
 return firebaseStorageSdk
}
function cloudPath(key){const parts=String(key||'').split('/');if(parts.length!==3||parts[0]!=='cloud'||parts[1]!==uid()||!/^[A-Za-z0-9_-]{12,110}$/.test(parts[2]))throw Error('شناسهٔ فایل ابری معتبر نیست.');return 'privateAudio/'+parts[1]+'/'+parts[2]}
const audioFileAllowed=file=>/^(audio\/mpeg|audio\/mp3|audio\/mp4|audio\/ogg|audio\/wav|audio\/x-wav|audio\/aac|audio\/webm)$/.test(file.type)||(!file.type&&/\.(mp3|m4a|wav|ogg|webm|aac)$/i.test(file.name));
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(Error(tx('مرورگر شما ذخیرهٔ فایل صوتی را پشتیبانی نمی‌کند.','Local audio storage is unavailable.')));
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'})};
  request.onerror=()=>reject(request.error||Error('IndexedDB unavailable'));
  request.onsuccess=()=>resolve(request.result);
 })
}
async function saveLocal(file){
 if(!file||!audioFileAllowed(file))throw Error(tx('فرمت فایل صوتی نامعتبر است.','Unsupported audio format.'));
 if(file.size>15*1024*1024)throw Error(tx('فایل حداکثر ۱۵ مگابایت باشد.','Max upload size is 15 MB.'));
 if(!file.size)throw Error(tx('فایل خالی است.','The selected file is empty.'));
 const mine=uid();if(mine==='local'||!window.ElaraAccount?.user?.emailVerified)throw Error(tx('برای آپلود ابری وارد حساب تأییدشده شو.','Sign in to a verified account before uploading.'));
 const key='cloud/'+mine+'/'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
 const {storage,instance}=await storageSdk();
 await storage.uploadBytes(storage.ref(instance,cloudPath(key)),file,{contentType:file.type||'audio/mpeg'});
 return {trackId:'private:'+key,title:file.name.replace(/\.(mp3|m4a|wav|ogg|webm|aac)$/i,''),artist:tx('آهنگ خصوصی · فضای ابری','Private audio · cloud'),artwork:SRC,previewUrl:'',localAudioKey:key,provider:'Elara private Firebase Storage',ownerUid:mine,autoplay:false}
}

async function loadLocal(song){
 if(!song?.localAudioKey||song.ownerUid!==uid())return null;
 if(localSrc.has(song.localAudioKey))return localSrc.get(song.localAudioKey);
 if(song.localAudioKey.startsWith('cloud/')){
  const {storage,instance}=await storageSdk();
  const blob=await storage.getBlob(storage.ref(instance,cloudPath(song.localAudioKey)));
  const url=URL.createObjectURL(blob);localSrc.set(song.localAudioKey,url);return url
 }
 const db=await openDB();let rec;
 try{rec=await new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(song.localAudioKey);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}finally{db.close()}
 if(!rec||rec.ownerUid!==uid()||!(rec.blob instanceof Blob))return null;
 const url=URL.createObjectURL(rec.blob);localSrc.set(song.localAudioKey,url);
 // Migrate previously selected device-only audio after a verified account is
 // available. Never delete the old blob before the profile's cloud save.
 if(!migrating.has(song.localAudioKey)&&window.ElaraAccount?.user?.emailVerified){
  migrating.add(song.localAudioKey);
  void (async()=>{
   try{
    const file=new File([rec.blob],rec.name||'legacy.mp3',{type:rec.blob.type||'audio/mpeg'});
    const converted=await saveLocal(file);
    if(stateSong()?.localAudioKey===song.localAudioKey)window.ElaraFreedomMediaDiary?.setProfileSong?.(converted);
   }catch(e){console.warn('Legacy audio migration unavailable:',e.code||e.message)}
   finally{migrating.delete(song.localAudioKey)}
  })();
 }
 return url;
}
async function removeLocal(key){
 if(!key)return;
 const v=localSrc.get(key);if(v){URL.revokeObjectURL(v);localSrc.delete(key)}
 if(String(key).startsWith('cloud/')){
  const {storage,instance}=await storageSdk();
  await storage.deleteObject(storage.ref(instance,cloudPath(key)));return
 }
 const db=await openDB();
 try{await new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}finally{db.close()}
}
async function attachLocalAudio(host,song){
 const audio=host?.querySelector('audio');if(!audio)return;
 try{const src=await loadLocal(song);if(!audio.isConnected)return;if(src){audio.src=src;audio.load()}else{
  audio.remove();host.insertAdjacentHTML('beforeend','<small class="r27-local-missing">'+tx('فایل در این مرورگر موجود نیست. دوباره آپلود کن.','File unavailable on this device; please upload it again.')+'</small>');
 }}catch{if(audio.isConnected){audio.remove();host.insertAdjacentHTML('beforeend','<small class="r27-local-missing">'+tx('دسترسی به فایل محلی ممکن نیست.','Local file is unavailable.')+'</small>')}}
}
function stateSong(){try{return JSON.parse(window.ElaraCloudStorage.getItem('elara_space_v1')||'{}').profileSong||null}catch{return null}}
function ensureProfileAudio(){
 const song=stateSong();if(!song?.localAudioKey)return;
 document.querySelectorAll('.elara-profile-song-card').forEach(card=>{
  if(card.dataset.r27AudioKey===song.localAudioKey)return;
  card.dataset.r27AudioKey=song.localAudioKey;
  void attachLocalAudio(card,song);
 });
}
function songInfo(song){
 if(!song)return '<p class="r27-music-placeholder"><strong>♫</strong><span>'+tx('برای شروع، یک آهنگ جستجو یا آپلود کن.','Search for a song or upload your own audio.')+'</span></p>';
 return '<article class="r27-music-row"><img src="'+esc(song.artwork||SRC)+'" alt=""><div><strong dir="auto">'+esc(song.title||'آهنگ من')+'</strong><small dir="auto">'+esc(song.artist||'')+'</small><small>'+esc(song.localAudioKey?tx('فایل خصوصی حساب','Private to your account'):'Apple Preview')+'</small></div><button type="button" class="quiet-button" data-r27-remove>'+tx('برداشتن','Remove')+'</button><audio controls preload="none"></audio></article>';
}
async function openMusic(){
 const original=window.ElaraFreedomMediaDiary;
 if(!original||!window.ElaraDialog)return;
 let pending=stateSong(),rows=[],saved=false;
 const newKeys=new Set();
 const box=document.createElement('section');box.className='freedom-r27-music-dialog';box.dataset.elaraI18n='off';
 box.innerHTML='<p class="r27-music-lead">'+tx('آهنگ موردعلاقه‌ات را انتخاب کن و حال‌وهوای پروفایل را شخصی کن.','Choose a song and personalize your profile.')+'</p>'+
 '<div class="r27-audio-options"><label><input type="checkbox" data-r27-preview-gesture><span><b>'+tx('پیش‌نمایش پس از انتخاب','Preview after selecting')+'</b><small>'+tx('فقط با کلیک روی آهنگ، پخش را شروع می‌کند؛ پخش خودکار صفحه خاموش است.','Only plays after your click; page autoplay stays off.')+'</small></span></label></div>'+
 '<form data-r27-search><input type="search" name="q" required maxlength="120" placeholder="'+tx('نام آهنگ یا خواننده را جستجو کنید…','Search song or artist…')+'"><button type="submit">'+tx('جستجو','Search')+'</button></form>'+
 '<label class="r27-music-upload"><b aria-hidden="true">+</b><span>'+tx('آپلود آهنگ خصوصی به فضای ابری','Upload private audio to the cloud')+'</span><input type="file" name="file" accept=".mp3,.m4a,.wav,.ogg,.webm,.aac,audio/*" data-r27-upload></label>'+
 '<p class="r27-music-hint">'+tx('فایل حداکثر ۱۵ مگابایت؛ فقط در فضای خصوصی حساب ذخیره می‌شود و در دستگاه‌های دیگر قابل استفاده است.','Up to 15 MB. Stored privately in your account; available across devices.')+'</p>'+
 '<p class="r27-music-upload-status" aria-live="polite" data-r27-status></p>'+
 '<div data-r27-current></div><div data-r27-results><p class="r27-music-placeholder"><strong>♫</strong><span>'+tx('برای شروع یک آهنگ جستجو کن.','Search for a song to begin.')+'</span></p></div>';
 const current=box.querySelector('[data-r27-current]'),results=box.querySelector('[data-r27-results]'),status=box.querySelector('[data-r27-status]');
 const selectedAudio=async()=>{
  current.innerHTML=songInfo(pending);
  if(!pending)return;
  const audio=current.querySelector('audio');if(!audio)return;
  if(pending.localAudioKey)await attachLocalAudio(current,pending);
  else if(pending.previewUrl)audio.src=pending.previewUrl;
 };
 const list=()=>{
  results.innerHTML=rows.length?rows.map((song,i)=>'<article class="r27-music-row"><img src="'+esc(song.artwork||SRC)+'" alt=""><div><strong dir="auto">'+esc(song.title)+'</strong><small dir="auto">'+esc(song.artist)+'</small><small>Apple Preview</small></div><button type="button" data-r27-set="'+i+'">'+tx('انتخاب +','Choose +')+'</button><audio controls preload="none" src="'+esc(song.previewUrl)+'"></audio></article>').join(''):'<p class="r27-music-placeholder">'+tx('نتیجه‌ای دارای پیش‌نمایش پیدا نشد.','No preview results found.')+'</p>';
 };
 box.querySelector('[data-r27-search]').addEventListener('submit',async e=>{
  e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;status.textContent=tx('در حال جستجوی Apple Preview…','Searching Apple Preview…');
  try{rows=await original.musicSearch(e.target.elements.q.value.trim());list();status.textContent=tx('روی انتخاب + بزن و در پایان ذخیره کن.','Select a song and save to your profile.')}
  catch(err){status.textContent=String(err.message||err);results.innerHTML=''}
  finally{b.disabled=false}
 });
 box.querySelector('[data-r27-upload]').addEventListener('change',async e=>{
  const input=e.target,file=input.files?.[0];if(!file)return;
  status.textContent=tx('در حال آپلود امن به فضای ابری…','Uploading to cloud…');
  try{const song=await saveLocal(file);newKeys.add(song.localAudioKey);pending=song;await selectedAudio();status.textContent=tx('فایل آماده است؛ برای تأیید روی ذخیره بزن.','File ready. Click Save to confirm.')}
  catch(err){status.textContent=String(err.message||err)}
  finally{input.value=''}
 });
 box.addEventListener('click',e=>{
  const set=e.target.closest('[data-r27-set]');
  if(set){const song=rows[Number(set.dataset.r27Set)];if(!song)return;pending=song;void selectedAudio().then(()=>{if(box.querySelector('[data-r27-preview-gesture]').checked)current.querySelector('audio')?.play().catch(()=>{})});return}
  if(e.target.closest('[data-r27-remove]')){pending=null;void selectedAudio();status.textContent=tx('برای حذف از پروفایل ذخیره کن.','Save to remove the profile song.')}
 });
 await selectedAudio();
 const result=await window.ElaraDialog.open({title:'♫ '+tx('موسیقی و آهنگ پروفایل','Music & Profile Song'),content:box,wide:true,actions:[{label:tx('بستن','Close'),value:false},{label:'♫ '+tx('ذخیره','Save'),value:'save',kind:'primary'}]});
 if(result==='save'){
  const previous=stateSong();saved=true;
  if(pending)original.setProfileSong(pending);else original.clearProfileSong();
  if(previous?.localAudioKey&&previous.localAudioKey!==pending?.localAudioKey&&previous.ownerUid===uid())void removeLocal(previous.localAudioKey);
 }
 for(const k of newKeys)if(!saved||k!==pending?.localAudioKey)void removeLocal(k);
 box.querySelectorAll('audio').forEach(a=>{try{a.pause()}catch{}});
}
const install=()=>{
 const media=window.ElaraFreedomMediaDiary;if(!media||media.__r27)return;
 media.__r27=true;media.openMusic=openMusic;
};
install();window.addEventListener('elara:open',install);
queueMicrotask(()=>window.ElaraFreedomDashboardR26?.refresh?.());
const observer=new MutationObserver(()=>{install();ensureProfileAudio()});
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>{install();ensureProfileAudio()},{once:true});
window.addEventListener('elara:account-ready',ensureProfileAudio);
window.addEventListener('pagehide',()=>{for(const v of localSrc.values())URL.revokeObjectURL(v);localSrc.clear()});
window.ElaraFreedomMusicR27={openMusic,attachLocalAudio};
})();
