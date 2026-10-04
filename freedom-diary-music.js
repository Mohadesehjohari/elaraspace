/* Private diary + legal music preview search for Freedom. Account data stays inside the canonical private app payload. */
(()=>{'use strict';
const STORE='elara_space_v1',$=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
function state(){try{const s=JSON.parse(localStorage.getItem(STORE)||'{}');if(!Array.isArray(s.diaryEntries))s.diaryEntries=[];if(!s.profileSong||typeof s.profileSong!=='object')s.profileSong=null;return s}catch{return{diaryEntries:[],profileSong:null}}}
function commit(s){localStorage.setItem(STORE,JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}));window.dispatchEvent(new Event('elara:data-changed'));setTimeout(injectProfileSong,0)}
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'local';
const id=()=>crypto.randomUUID?.()||('diary-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
const tagsOf=value=>[...new Set(String(value||'').split(/[،,]/).map(x=>x.trim().replace(/^#/,'')).filter(Boolean).map(x=>x.slice(0,32)))].slice(0,8);
const fmt=ms=>new Date(Number(ms)||Date.now()).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR',{dateStyle:'medium',timeStyle:'short'});
function diaryRows(query=''){
 const q=String(query||'').trim().toLocaleLowerCase(document.documentElement.lang==='en'?'en':'fa');
 return state().diaryEntries.slice().sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0)).filter(row=>!q||[row.title,row.body,...(row.tags||[])].join(' ').toLocaleLowerCase().includes(q));
}
function diaryExploreTags(){
 return [...new Set(state().diaryEntries.filter(x=>x.shareTags===true).flatMap(x=>Array.isArray(x.tags)?x.tags:[]))].slice(0,30);
}
async function openDiary(){
 const box=document.createElement('section');box.className='freedom-diary-dialog';box.dataset.elaraI18n='off';
 box.innerHTML='<div class="freedom-private-note">🔒 '+tx('متن خاطرات خصوصی است و داخل دادهٔ خصوصی حساب ذخیره می‌شود. روشن‌کردن Explore فقط تگ‌ها را برای انتشار آینده opt-in می‌کند؛ متن خاطره منتشر نمی‌شود.','Diary text is private account data. Explore opt-in marks tags only for future aggregation; diary text is never published.')+'</div><form data-diary-form><input name="id" type="hidden"><label>'+tx('عنوان','Title')+'<input name="title" maxlength="120" required placeholder="'+tx('مثلاً امروز چه گذشت؟','What happened today?')+'"></label><label>'+tx('خاطره','Entry')+'<textarea name="body" maxlength="6000" rows="7" required></textarea></label><label>'+tx('تگ‌ها','Tags')+'<input name="tags" maxlength="220" placeholder="#روزمره، #سفر"></label><label class="freedom-diary-share"><input name="shareTags" type="checkbox"> '+tx('اجازه می‌دهم فقط این تگ‌ها در Explore آینده استفاده شوند.','Allow only these tags to be used in future Explore aggregation.')+'</label><div class="freedom-diary-form-actions"><button type="submit" class="primary-button">'+tx('ذخیره خاطره','Save entry')+'</button><button type="button" class="quiet-button" data-diary-reset>'+tx('خاطره جدید','New entry')+'</button></div></form><div class="freedom-diary-toolbar"><input data-diary-search type="search" placeholder="'+tx('جستجو در خاطرات و تگ‌ها…','Search diary and tags…')+'"></div><div class="freedom-diary-explore" data-diary-explore></div><div class="freedom-diary-list" data-diary-list></div>';
 const form=box.querySelector('[data-diary-form]'),list=box.querySelector('[data-diary-list]'),search=box.querySelector('[data-diary-search]'),explore=box.querySelector('[data-diary-explore]');
 const reset=()=>{form.reset();form.elements.id.value='';form.elements.title.focus()};
 const render=()=>{
   const rows=diaryRows(search.value),tags=diaryExploreTags();
   explore.innerHTML='<strong>'+tx('تگ‌های opt-in برای Explore','Explore opt-in tags')+'</strong><div>'+(tags.length?tags.map(t=>'<span>#'+esc(t)+'</span>').join(''):'<small>'+tx('هنوز تگی برای Explore انتخاب نشده.','No tags opted in yet.')+'</small>')+'</div>';
   list.innerHTML=rows.length?rows.map(row=>'<article data-diary-id="'+esc(row.id)+'"><header><div><strong dir="auto">'+esc(row.title||tx('بدون عنوان','Untitled'))+'</strong><small>'+esc(fmt(row.updatedAt||row.createdAt))+'</small></div><span>'+(row.shareTags?'Explore tags ✓':'🔒')+'</span></header><p dir="auto">'+esc(String(row.body||'').slice(0,360))+(String(row.body||'').length>360?'…':'')+'</p><div class="freedom-diary-tags">'+(row.tags||[]).map(t=>'<span>#'+esc(t)+'</span>').join('')+'</div><footer><button type="button" class="quiet-button" data-diary-edit="'+esc(row.id)+'">'+tx('ویرایش','Edit')+'</button><button type="button" class="quiet-button danger" data-diary-delete="'+esc(row.id)+'">'+tx('حذف','Delete')+'</button></footer></article>').join(''):'<p class="freedom-empty">'+tx('هنوز خاطره‌ای ثبت نکرده‌ای.','No diary entries yet.')+'</p>';
 };
 form.addEventListener('submit',e=>{e.preventDefault();const s=state(),now=Date.now(),editId=form.elements.id.value,row=editId?s.diaryEntries.find(x=>x.id===editId):null,payload={id:editId||id(),title:String(form.elements.title.value||'').trim().slice(0,120),body:String(form.elements.body.value||'').trim().slice(0,6000),tags:tagsOf(form.elements.tags.value),shareTags:form.elements.shareTags.checked,createdAt:row?.createdAt||now,updatedAt:now,ownerUid:uid()};if(!payload.title||!payload.body)return;if(row)Object.assign(row,payload);else s.diaryEntries.push(payload);commit(s);reset();render()});
 box.addEventListener('click',async e=>{if(e.target.closest('[data-diary-reset]')){reset();return}const edit=e.target.closest('[data-diary-edit]');if(edit){const row=state().diaryEntries.find(x=>x.id===edit.dataset.diaryEdit);if(!row)return;form.elements.id.value=row.id;form.elements.title.value=row.title||'';form.elements.body.value=row.body||'';form.elements.tags.value=(row.tags||[]).join('، ');form.elements.shareTags.checked=row.shareTags===true;form.elements.title.focus();return}const del=e.target.closest('[data-diary-delete]');if(del){const ok=await window.ElaraDialog.confirm(tx('این خاطرهٔ خصوصی حذف شود؟','Delete this private diary entry?'),{title:tx('حذف خاطره','Delete entry'),confirmText:tx('حذف','Delete'),danger:true});if(!ok)return;const s=state();s.diaryEntries=s.diaryEntries.filter(x=>x.id!==del.dataset.diaryDelete);commit(s);render()}});
 search.addEventListener('input',render);render();
 await window.ElaraDialog.open({title:tx('دفتر خاطرات خصوصی','Private Diary'),content:box,wide:true,actions:[{label:tx('بستن','Close'),value:false}]});
}
function musicResult(row){
 const art=String(row.artworkUrl100||'').replace('100x100bb','240x240bb');
 return {trackId:String(row.trackId||''),title:String(row.trackName||''),artist:String(row.artistName||''),artwork:art,previewUrl:String(row.previewUrl||''),trackViewUrl:String(row.trackViewUrl||''),provider:'Apple Preview'};
}
function setSong(song){const s=state();s.profileSong={...song,updatedAt:Date.now(),autoplay:false};commit(s)}
function clearSong(){const s=state();s.profileSong=null;commit(s)}
async function musicSearch(query){
 const url='https://itunes.apple.com/search?entity=song&limit=16&term='+encodeURIComponent(query);
 const response=await fetch(url,{method:'GET',mode:'cors'});if(!response.ok)throw Error(tx('جستجوی موسیقی در دسترس نیست.','Music search is unavailable.'));
 const data=await response.json();return (Array.isArray(data.results)?data.results:[]).filter(x=>x.previewUrl&&x.trackName).map(musicResult);
}
async function openMusic(){
 const box=document.createElement('section');box.className='freedom-music-dialog';box.dataset.elaraI18n='off';
 box.innerHTML='<div class="freedom-music-provider"><strong>Apple Preview</strong><span>'+tx('پخش فقط Preview؛ autoplay خاموش است.','Preview playback only; autoplay is off.')+'</span></div><form data-music-search><input name="q" maxlength="120" required placeholder="'+tx('نام آهنگ یا خواننده…','Song or artist…')+'"><button class="primary-button" type="submit">'+tx('جستجو','Search')+'</button></form><div data-profile-song-current></div><div class="freedom-music-results" data-music-results><p class="freedom-empty">'+tx('برای شروع یک آهنگ جستجو کن.','Search for a song to begin.')+'</p></div>';
 const results=box.querySelector('[data-music-results]'),current=box.querySelector('[data-profile-song-current]');
 const renderCurrent=()=>{const song=state().profileSong;current.innerHTML=song?'<article class="freedom-profile-song-current"><img src="'+esc(song.artwork||'assets/logo.svg')+'" alt=""><div><small>'+tx('آهنگ پروفایل','Profile song')+'</small><strong>'+esc(song.title)+'</strong><span>'+esc(song.artist)+'</span></div><audio controls preload="none" src="'+esc(song.previewUrl)+'"></audio><button type="button" class="quiet-button danger" data-song-clear>'+tx('حذف از پروفایل','Remove')+'</button></article>':''};
 const renderRows=rows=>{results.innerHTML=rows.length?rows.map((song,i)=>'<article class="freedom-music-row" data-song-index="'+i+'"><img src="'+esc(song.artwork||'assets/logo.svg')+'" alt=""><div><strong>'+esc(song.title)+'</strong><span>'+esc(song.artist)+'</span><small>Apple Preview</small></div><audio controls preload="none" src="'+esc(song.previewUrl)+'"></audio><button type="button" class="primary-button" data-song-set="'+i+'">'+tx('انتخاب برای پروفایل','Set profile song')+'</button>'+(song.trackViewUrl?'<a href="'+esc(song.trackViewUrl)+'" target="_blank" rel="noopener">'+tx('مشاهده در Apple','View on Apple')+'</a>':'')+'</article>').join(''):'<p class="freedom-empty">'+tx('نتیجه‌ای با Preview پیدا نشد.','No preview results found.')+'</p>';results.__songs=rows};
 box.querySelector('[data-music-search]').addEventListener('submit',async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;results.innerHTML='<p class="freedom-empty">'+tx('در حال جستجو…','Searching…')+'</p>';try{renderRows(await musicSearch(e.target.elements.q.value.trim()))}catch(error){results.innerHTML='<p class="freedom-empty">'+esc(error.message||error)+'</p>'}finally{b.disabled=false}});
 box.addEventListener('click',e=>{const set=e.target.closest('[data-song-set]');if(set){const song=results.__songs?.[Number(set.dataset.songSet)];if(song){setSong(song);renderCurrent()}}if(e.target.closest('[data-song-clear]')){clearSong();renderCurrent()}});
 renderCurrent();
 await window.ElaraDialog.open({title:tx('موسیقی و آهنگ پروفایل','Music & Profile Song'),content:box,wide:true,actions:[{label:tx('بستن','Close'),value:false}]});
}
function featureButton(kind,title,sub,art){
 return '<button type="button" class="freedom-feature freedom-'+kind+'" data-freedom-extra="'+kind+'"><img src="assets/ui/'+art+'" alt="" decoding="async"><span><b>'+title+'</b><small>'+sub+'</small></span><i aria-hidden="true">‹</i></button>';
}
function injectFreedom(){
 const host=$('#panel-freedom .freedom-features');if(!host)return;
 if(!host.querySelector('[data-freedom-extra="diary"]'))host.insertAdjacentHTML('beforeend',featureButton('diary',tx('دفتر خاطرات','Private Diary'),tx('فقط برای خودت','Only for you'),'free_notes.webp'));
 if(!host.querySelector('[data-freedom-extra="music"]'))host.insertAdjacentHTML('beforeend',featureButton('music',tx('موسیقی','Music'),tx('جستجو و Preview','Search & Preview'),'Inspirations.webp'));
}
function injectProfileSong(){
 const song=state().profileSong;
 document.querySelectorAll('.elara-profile-composition[data-profile-self="1"]:not(.elara-profile-composition-compact)').forEach(root=>{
   let host=root.querySelector('[data-profile-song-card]');
   if(!song){host?.remove();return}
   if(!host){host=document.createElement('div');host.dataset.profileSongCard='';host.className='elara-profile-song-card';root.querySelector('.elara-profile-composition-copy')?.append(host)}
   if(!host)return;
   if(host.dataset.songId===song.trackId)return;host.dataset.songId=song.trackId||'song';
   host.innerHTML='<img src="'+esc(song.artwork||'assets/logo.svg')+'" alt=""><div><small>'+tx('آهنگ پروفایل','Profile song')+'</small><strong>'+esc(song.title||'')+'</strong><span>'+esc(song.artist||'')+'</span></div><audio controls preload="none" src="'+esc(song.previewUrl||'')+'"></audio>';
 });
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-freedom-extra]');if(!b)return;e.preventDefault();if(b.dataset.freedomExtra==='diary')void openDiary();if(b.dataset.freedomExtra==='music')void openMusic()});
for(const ev of ['elara:freedom-rendered','elara:open','elara:data-changed','elara:account-ready','elara:hydrate'])window.addEventListener(ev,()=>setTimeout(()=>{injectFreedom();injectProfileSong()},0));
new MutationObserver(()=>injectProfileSong()).observe(document.documentElement,{subtree:true,childList:true});
const start=()=>{injectFreedom();injectProfileSong()};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
window.ElaraFreedomMediaDiary={openDiary,openMusic,musicSearch,diaryRows,exploreTags:diaryExploreTags,setProfileSong:setSong,clearProfileSong:clearSong};
})();
