/* Freedom R28 — full-screen private notebook, persisted visual themes and local uploaded backdrops. */
(()=>{'use strict';
const STORE='elara_space_v1',DB='elara_private_diary_backdrops_v1',TABLE='backdrops',ROOT='assets/ui/';
const THEMES=[
 {key:'night',name:'شب کیهانی',subtitle:'تاریکی آرام و الهام‌بخش',file:'Celestial Mirror Lake at Night.webp'},
 {key:'paper',name:'کاغذ روشن',subtitle:'ساده و دلنشین',file:'Sunlit Botanical Shadows on Parchment.webp'},
 {key:'lavender',name:'یاسی آرام',subtitle:'لطافت و رؤیایی',file:'Lavender Moonrise Over Misty Meadows.webp'},
 {key:'mist',name:'جنگل مه‌آلود',subtitle:'طبیعت و تمرکز',file:'Misty Mountain Lake at Dawn.webp'}
];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'local';
const theme=(k)=>THEMES.find(t=>t.key===k)||THEMES[0];
const asset=k=>ROOT+encodeURIComponent(theme(k).file);
const noteState=()=>{try{let s=JSON.parse(localStorage.getItem(STORE)||'{}');if(!Array.isArray(s.diaryEntries))s.diaryEntries=[];return s}catch{return{diaryEntries:[]}}};
const newID=()=>crypto.randomUUID?.()||'note-'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const tagsOf=value=>[...new Set(String(value||'').split(/[,،]/).map(x=>x.trim().replace(/^#/,'').slice(0,32)).filter(Boolean))].slice(0,8);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateOf=row=>row?.noteDate||new Date(row?.createdAt||Date.now()).toLocaleDateString('en-CA');
function dbOpen(){
 return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(TABLE))req.result.createObjectStore(TABLE,{keyPath:'key'})};
  req.onerror=()=>reject(req.error||Error('Cannot open local background storage'));
  req.onsuccess=()=>resolve(req.result);
 });
}
async function storeImage(file){
 const db=await dbOpen(),ownerUid=uid(),key=ownerUid+'/'+newID();
 try{await new Promise((resolve,reject)=>{const tr=db.transaction(TABLE,'readwrite');tr.objectStore(TABLE).put({key,ownerUid,file,createdAt:Date.now()});tr.oncomplete=resolve;tr.onerror=()=>reject(tr.error);tr.onabort=()=>reject(tr.error)})}finally{db.close()}
 return key;
}
async function fetchImage(key){
 if(!key||!key.startsWith(uid()+'/'))return null;
 const db=await dbOpen();try{return await new Promise((resolve,reject)=>{const req=db.transaction(TABLE,'readonly').objectStore(TABLE).get(key);req.onsuccess=()=>resolve(req.result?.ownerUid===uid()?req.result.file:null);req.onerror=()=>reject(req.error)})}finally{db.close()}
}
async function dropImage(key){
 if(!key||!key.startsWith(uid()+'/'))return;
 const db=await dbOpen();try{await new Promise((resolve,reject)=>{const t=db.transaction(TABLE,'readwrite');t.objectStore(TABLE).delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}finally{db.close()}
}
const images=new Map();
async function imageURL(key){
 if(!key)return null;if(images.has(key))return images.get(key);
 const file=await fetchImage(key);if(!file)return null;
 const url=URL.createObjectURL(file);images.set(key,url);return url;
}
async function decorate(){
 const nodes=[...document.querySelectorAll('img[data-r28-cover]')];
 await Promise.all(nodes.map(async img=>{
  const key=img.dataset.r28Cover;if(!key||img.dataset.r28Loaded===key)return;
  img.dataset.r28Loaded=key;
  try{const url=await imageURL(key);if(url&&img.isConnected)img.src=url}catch{}
 }));
}
function validUpload(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error(lang('فقط JPG، PNG یا WebP انتخاب کن.','Only JPG, PNG or WebP files are supported.'));
 if(file.size>4*1024*1024||file.size===0)throw Error(lang('حجم تصویر باید کمتر از ۴ مگابایت باشد.','The image must be under 4 MB.'));
}
function saveState(s){localStorage.setItem(STORE,JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}));window.dispatchEvent(new Event('elara:data-changed'))}
function formatText(area,command){
 const start=area.selectionStart,end=area.selectionEnd,sel=area.value.slice(start,end);let insert=sel;
 if(command==='bold')insert='**'+(sel||lang('متن پررنگ','bold'))+'**';
 if(command==='italic')insert='*'+(sel||lang('متن مورب','italic'))+'*';
 if(command==='list')insert=(sel||lang('مورد جدید','New item')).split('\n').map(x=>'• '+x).join('\n');
 if(command==='link')insert='['+(sel||lang('عنوان پیوند','Link'))+'](https://)';
 area.setRangeText(insert,start,end,'select');area.focus();
}
async function openDiary(initialId){
 if(!window.ElaraDialog?.open)return;
 const existing=initialId?noteState().diaryEntries.find(x=>x.id===initialId):null;
 if(initialId&&!existing)return;
 let selected=existing?.diaryTheme||'night',key=existing?.diaryBackgroundKey||'',file=null,previewURL=null,paintSeq=0,opening=true;
 const box=document.createElement('section');box.className='freedom-r28-diary';box.dataset.elaraI18n='off';
 box.innerHTML='<div class="r28-shell" dir="rtl">'+
 '<div class="r28-section-top"><div class="r28-brand" aria-hidden="true">✦<small>ELARA</small></div><div class="r28-intro"><strong>دفترچه یادداشت خصوصی</strong><span>افکار، ایده‌ها و خاطرات خود را در فضایی امن ذخیره کنید.</span></div></div>'+
 '<form class="r28-note-form" data-r28-form>'+
 '<div class="r28-editor-column">'+
 '<label class="r28-label">'+lang('عنوان','Title')+' <span aria-hidden="true">✎</span><input name="title" required maxlength="120" autocomplete="off" placeholder="'+lang('مثلاً امروز چه گذشت؟','What happened today?')+'" value="'+esc(existing?.title||'')+'"></label>'+
 '<label class="r28-label r28-date">'+lang('تاریخ','Date')+' <span aria-hidden="true">▣</span><input name="date" type="date" value="'+esc(existing?dateOf(existing):today())+'"></label>'+
 '<div class="r28-label r28-writing-label"><span>'+lang('متن یادداشت','Note text')+' ▤</span></div>'+
 '<div class="r28-writing-panel"><div class="r28-tools" role="toolbar" aria-label="'+lang('ابزار ویرایش متن','Text editing tools')+'">'+
 '<button type="button" title="پررنگ" data-r28-format="bold"><b>B</b></button><button type="button" title="مورب" data-r28-format="italic"><i>I</i></button><button type="button" title="فهرست" data-r28-format="list">☷</button><button type="button" title="پیوند" data-r28-format="link">🔗</button></div>'+
 '<div class="r28-writing-wall" data-r28-writing-wall><textarea name="body" required maxlength="12000" spellcheck="true" placeholder="'+lang('اینجا یادداشت خود را بنویسید…','Write your thoughts here…')+'">'+esc(existing?.body||'')+'</textarea></div></div>'+
 '<div class="r28-tags"><label for="r28-tag-input">◇ '+lang('برچسب‌ها','Tags')+'</label><div class="r28-tag-field"><div data-r28-tags></div><input id="r28-tag-input" name="tag" maxlength="40" placeholder="'+lang('برچسب اضافه کنید…','Add a tag…')+'"><button type="button" data-r28-add-tag aria-label="افزودن برچسب">+</button></div></div>'+
 '<details class="r28-privacy"><summary>تنظیمات خصوصی برچسب‌ها</summary><label><input name="shareTags" type="checkbox"> فقط برچسب‌ها را برای Explore آینده مجاز می‌دانم؛ متن خصوصی می‌ماند.</label></details>'+
 '</div>'+
 '<aside class="r28-themes-column"><div class="r28-theme-heading"><b>◉ انتخاب تم یادداشت</b><small>فضایی متناسب با حال و هوای خود انتخاب کنید.</small></div>'+
 '<div class="r28-theme-grid">'+THEMES.map(t=>'<button type="button" class="r28-theme-card" data-r28-theme="'+t.key+'" aria-pressed="false"><div class="r28-theme-image"><img src="'+ROOT+encodeURIComponent(t.file)+'" alt="" loading="lazy"><i aria-hidden="true"></i></div><strong>'+t.name+'</strong><small>'+t.subtitle+'</small></button>').join('')+'</div>'+
 '<label class="r28-upload"><span aria-hidden="true">+</span>'+lang('آپلود پس‌زمینه دلخواه','Upload custom background')+'<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" data-r28-upload></label>'+
 '<small class="r28-upload-hint">'+lang('حداکثر ۴ مگابایت؛ تصویر شخصی فقط روی همین مرورگر ذخیره می‌شود.','Max 4 MB; custom image stays in this browser.')+'</small>'+
 '<p class="r28-upload-error" role="status" aria-live="polite" data-r28-status></p></aside>'+
 '</form>'+
 '<footer class="r28-bottom-actions"><button type="button" class="r28-close" data-r28-back>× '+lang('بستن','Close')+'</button><div><button type="button" class="r28-new" data-r28-new>▣ '+lang('یادداشت جدید','New note')+'</button><button type="submit" form="r28-form" class="r28-save" data-r28-save>✧ '+lang('ذخیره','Save')+' ▣</button></div></footer></div>';
 const form=box.querySelector('form');form.id='r28-form';
 const status=box.querySelector('[data-r28-status]'),wall=box.querySelector('[data-r28-writing-wall]');
 const tags=new Set(existing?.tags||[]);
 const textInput=form.elements.body,titleInput=form.elements.title;
 let editId=existing?.id||null;form.elements.shareTags.checked=existing?.shareTags===true;
 function renderTags(){
  box.querySelector('[data-r28-tags]').innerHTML=[...tags].map((v,i)=>'<button type="button" class="r28-tag-chip" data-r28-tag="'+i+'" aria-label="حذف برچسب '+esc(v)+'"># '+esc(v)+' <span aria-hidden="true">×</span></button>').join('');
 }
 function addTag(){const input=form.elements.tag;tagsOf(input.value).forEach(x=>{if(tags.size<8)tags.add(x)});input.value='';renderTags()}
 async function paint(){
  const current=++paintSeq;
  let url=asset(selected);
  if(selected==='custom'){
   try{url=previewURL||(key?await imageURL(key):'')||asset('night')}catch{url=asset('night')}
  }
  if(current!==paintSeq||!box.isConnected&& !opening)return;
  const safe=String(url).replace(/["\\]/g,'');
  wall.style.backgroundImage='linear-gradient(180deg,rgba(3,10,31,.20),rgba(3,9,32,.34)),url("'+safe+'")';
  box.style.backgroundImage='linear-gradient(90deg,rgba(3,9,29,.82),rgba(3,9,29,.55)),url("'+safe+'")';
  box.querySelectorAll('[data-r28-theme]').forEach(el=>{let active=selected===el.dataset.r28Theme;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active))});
  box.classList.toggle('r28-paper',selected==='paper');
  box.classList.toggle('r28-custom',selected==='custom');
  box.querySelector('.r28-upload')?.classList.toggle('selected',selected==='custom');
 }
 async function persist(e){
  e?.preventDefault();
  addTag();if(!form.reportValidity())return;
  const button=box.querySelector('[data-r28-save]');button.disabled=true;status.textContent='';
  let nextKey=key;
  try{
   if(selected==='custom'&&file)nextKey=await storeImage(file);
   const s=noteState(),before=editId?s.diaryEntries.find(x=>x.id===editId):null,now=Date.now();
   const payload={...(before||{}),id:editId||newID(),title:titleInput.value.trim().slice(0,120),body:textInput.value.trim().slice(0,12000),
    tags:[...tags],noteDate:form.elements.date.value,diaryTheme:selected,diaryBackgroundKey:selected==='custom'?nextKey:'',
    shareTags:form.elements.shareTags.checked,createdAt:before?.createdAt||now,updatedAt:now,ownerUid:uid()};
   if(!payload.title||!payload.body)throw Error('عنوان و متن یادداشت را وارد کنید.');
   if(selected==='custom'&&!nextKey)throw Error('لطفاً یک تصویر پس‌زمینه انتخاب کنید.');
   if(before)Object.assign(before,payload);else s.diaryEntries.unshift(payload);
   saveState(s);
   if(before?.diaryBackgroundKey&&before.diaryBackgroundKey!==payload.diaryBackgroundKey)void dropImage(before.diaryBackgroundKey);
   if(selected==='custom'&&nextKey)key=nextKey;
   editId=payload.id;window.ElaraDialog.close();
  }catch(err){status.textContent=String(err?.message||err);button.disabled=false}
 }
 form.addEventListener('submit',persist);
 box.addEventListener('click',e=>{
  const card=e.target.closest('[data-r28-theme]');if(card){selected=card.dataset.r28Theme;file=null;void paint();return}
  const tag=e.target.closest('[data-r28-tag]');if(tag){tags.delete([...tags][Number(tag.dataset.r28Tag)]);renderTags();return}
  if(e.target.closest('[data-r28-add-tag]')){addTag();return}
  const format=e.target.closest('[data-r28-format]');if(format){formatText(textInput,format.dataset.r28Format);return}
  if(e.target.closest('[data-r28-back]')){window.ElaraDialog.close();return}
  if(e.target.closest('[data-r28-new]')){
   editId=null;file=null;key='';selected='night';tags.clear();form.reset();form.elements.date.value=today();renderTags();void paint();titleInput.focus();return
  }
 });
 box.querySelector('[data-r28-upload]').addEventListener('change',e=>{
  const selectedFile=e.target.files?.[0];if(!selectedFile)return;
  try{validUpload(selectedFile);file=selectedFile;key='';if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(file);selected='custom';status.textContent='پس‌زمینه آپلود شد؛ با ذخیره یادداشت ثبت می‌شود.';void paint()}
  catch(err){status.textContent=String(err.message||err);e.target.value=''}
 });
 form.elements.tag.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();addTag()}});
 renderTags();
 const popup=window.ElaraDialog.open({title:lang('دفترچه یادداشت خصوصی','Private Notebook'),content:box,wide:true,actions:[{label:lang('بستن','Close'),value:null}]});
 opening=false;void paint();
 await popup;
 if(previewURL)URL.revokeObjectURL(previewURL);
}
function install(){
 const media=window.ElaraFreedomMediaDiary;if(!media)return false;
 media.openDiary=openDiary;return true;
}
install();
window.addEventListener('elara:account-ready',install);
window.addEventListener('elara:open',install);
window.addEventListener('DOMContentLoaded',install,{once:true});
window.addEventListener('elara:data-changed',()=>queueMicrotask(decorate));
window.ElaraFreedomNotebookR28={openDiary,decorate,themeAsset:asset,themeFile:k=>theme(k).file};
})();
