/* R28: full-screen private notebook, four exact artwork assets, per-entry saved themes. */
(()=>{'use strict';
const A='assets/ui/',STORE='elara_space_v1';
const themes=[
 {id:'night',title:'شب کیهانی',sub:'تاریکی آرام و الهام‌بخش',file:'Celestial Mirror Lake at Night.webp'},
 {id:'paper',title:'کاغذ روشن',sub:'ساده و دلنشین',file:'Sunlit Botanical Shadows on Parchment.webp'},
 {id:'lavender',title:'یاسی آرام',sub:'لطافت و رؤیایی',file:'Lavender Moonrise Over Misty Meadows.webp'},
 {id:'forest',title:'صبح مه‌آلود',sub:'طبیعت و تمرکز',file:'Misty Mountain Lake at Dawn.webp'}];
const esc=v=>String(v??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;',"'":'&#39;'}[k]));
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'local';
const getState=()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||'{}');v.diaryEntries=Array.isArray(v.diaryEntries)?v.diaryEntries:[];return v}catch{return {diaryEntries:[]}}};
const rowId=()=>crypto.randomUUID?.()||'entry-'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const imageUrl=t=>t==='custom'?null:A+encodeURIComponent(themes.find(x=>x.id===t)?.file||themes[0].file);
const previewBackground=row=>row?.themeId==='custom'&&/^data:image\/(webp|jpeg|png);base64,/.test(row?.backgroundImage||'')?row.backgroundImage:imageUrl(row?.themeId);
const announce=()=>{window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:getState()}));window.dispatchEvent(new Event('elara:data-changed'))};
const tagsOf=v=>[...new Set(String(v||'').split(/[،,]/).map(x=>x.trim().replace(/^#/,'')).filter(Boolean))].slice(0,8).map(x=>x.slice(0,32));
const dateOf=v=>new Date(v||Date.now()).toLocaleDateString('fa-IR');
const uploadImage=file=>new Promise((resolve,reject)=>{
 if(!file?.type.match(/^image\/(png|jpeg|webp)$/))return reject(Error('فقط تصویر PNG، JPG یا WebP انتخاب کن.'));
 if(file.size>8*1024*1024)return reject(Error('حجم تصویر باید کمتر از ۸ مگابایت باشد.'));
 const img=new Image(),url=URL.createObjectURL(file);
 img.onload=()=>{try{const canvas=document.createElement('canvas'),ratio=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const result=canvas.toDataURL('image/jpeg',.67);URL.revokeObjectURL(url);if(result.length>550000)reject(Error('تصویر پس از فشرده‌سازی همچنان بزرگ است.'));else resolve(result)}catch(e){URL.revokeObjectURL(url);reject(e)}};
 img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('تصویر قابل خواندن نیست.'))};img.src=url;
});
function openDiary(initialId){
 const original=getState().diaryEntries.find(x=>x.id===initialId);
 let active=original?.themeId||'night',custom=original?.backgroundImage||'',editingId=original?.id||null,dirty=false;
 const dialog=document.createElement('section');dialog.className='r28-diary';dialog.dir='rtl';dialog.dataset.elaraI18n='off';
 const themeCards=themes.map(x=>'<button type="button" data-r28-theme="'+x.id+'" aria-pressed="false" class="r28-theme"><span class="r28-theme-image"><img alt="" src="'+A+encodeURIComponent(x.file)+'"><span class="r28-check">✓</span></span><b>'+x.title+'</b><small>'+x.sub+'</small></button>').join('');
 dialog.innerHTML='<div class="r28-header"><div class="r28-brand"><span>✦</span><small>E L A R A</small></div><div class="r28-title"><span class="r28-book">▣</span><div><h2>دفترچه یادداشت خصوصی</h2><small>افکار، ایده‌ها و خاطرات خود را در فضایی امن ذخیره کنید.</small></div></div><button type="button" class="r28-back" data-r28-back aria-label="بازگشت به آزادی">← بازگشت</button></div>'+
 '<div class="r28-layout"><aside class="r28-themes"><h3>◉ انتخاب تم یادداشت</h3><p>فضایی متناسب با حال‌وهوای خود انتخاب کنید.</p><div class="r28-theme-grid">'+themeCards+'</div><label class="r28-upload">＋ آپلود پس‌زمینه شخصی<input data-r28-upload type="file" accept="image/png,image/jpeg,image/webp"></label><p class="r28-hint">تصاویر آپلودشده فقط همراه یادداشت در داده‌های خصوصی همین حساب ذخیره می‌شوند.</p></aside>'+
 '<form class="r28-editor" data-r28-form><label>✎ عنوان<input name="title" required maxlength="120" placeholder="مثلاً امروز چه گذشت؟"></label><label>▣ تاریخ<input name="date" type="date"></label><label class="r28-body-label">▤ متن یادداشت<div class="r28-writing"><div class="r28-toolbar" role="toolbar" aria-label="ابزار متن"><button type="button" data-r28-insert="**" title="برجسته">B</button><button type="button" data-r28-insert="_" title="تأکید">I</button><button type="button" data-r28-insert="• " title="فهرست">☷</button><button type="button" data-r28-insert="— " title="خط جدید">↩</button></div><textarea name="body" required maxlength="6000" placeholder="اینجا یادداشت خود را بنویسید..."></textarea></div></label>'+
 '<label>◇ برچسب‌ها<input name="tags" maxlength="220" placeholder="برچسب‌ها را با ویرگول جدا کنید…"></label><label class="r28-share"><input name="shareTags" type="checkbox"> فقط برچسب‌ها برای Explore آینده قابل‌استفاده باشند (اختیاری)</label><div class="r28-status" aria-live="polite" data-r28-status></div>'+
 '</form></div><footer class="r28-footer"><button type="button" data-r28-close>× بستن</button><div><button type="button" data-r28-new>▣ یادداشت جدید</button><button type="button" class="r28-save" data-r28-save>✧ ذخیره یادداشت</button></div></footer>';
 const form=dialog.querySelector('form'),status=dialog.querySelector('[data-r28-status]'),area=form.elements.body;
 const apply=()=>{dialog.querySelectorAll('[data-r28-theme]').forEach(b=>{const selected=b.dataset.r28Theme===active;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});
  const bg=active==='custom'?custom:imageUrl(active);dialog.style.setProperty('--r28-bg',bg?'url("'+bg+'")':'none');dialog.dataset.theme=active;
 };
 const fill=row=>{editingId=row?.id||null;form.elements.title.value=row?.title||'';form.elements.body.value=row?.body||'';form.elements.tags.value=(row?.tags||[]).join('، ');form.elements.shareTags.checked=row?.shareTags===true;form.elements.date.value=row?.noteDate||new Date().toISOString().slice(0,10);active=row?.themeId||'night';custom=row?.backgroundImage||'';dirty=false;status.textContent='';apply()};
 const save=()=>{if(!form.reportValidity())return false;const s=getState(),now=Date.now(),index=s.diaryEntries.findIndex(x=>x.id===editingId),existing=index>=0?s.diaryEntries[index]:null;
  const payload={id:existing?.id||rowId(),title:form.elements.title.value.trim().slice(0,120),body:form.elements.body.value.trim().slice(0,6000),tags:tagsOf(form.elements.tags.value),shareTags:form.elements.shareTags.checked,noteDate:form.elements.date.value,themeId:active,backgroundImage:active==='custom'?custom:'',createdAt:existing?.createdAt||now,updatedAt:now,ownerUid:existing?.ownerUid||uid()};
  if(!payload.title||!payload.body){status.textContent='عنوان و متن یادداشت را بنویس.';return false}
  if(index>=0)s.diaryEntries[index]={...existing,...payload};else s.diaryEntries.push(payload);
  try{localStorage.setItem(STORE,JSON.stringify(s))}catch{status.textContent='فضای ذخیره‌سازی کافی نیست؛ تصویر دیگری انتخاب کن.';return false}
  editingId=payload.id;dirty=false;announce();status.textContent='✓ یادداشت با همین پس‌زمینه ذخیره شد.';return true;
 };
 const close=async()=>{if(dirty){const ok=await window.ElaraDialog.confirm('تغییرات ذخیره‌نشده را کنار می‌گذاری؟',{title:'خروج از دفترچه'});if(!ok)return}window.ElaraDialog.close()};
 const handle=()=>{
  dialog.querySelectorAll('[data-r28-theme]').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.r28Theme;dirty=true;apply()}));
  form.addEventListener('input',()=>{dirty=true});
  dialog.querySelector('[data-r28-upload]').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;status.textContent='در حال آماده‌سازی تصویر…';try{custom=await uploadImage(file);active='custom';dirty=true;apply();status.textContent='پس‌زمینه شخصی آماده شد. برای نگه‌داشتنش یادداشت را ذخیره کن.'}catch(err){status.textContent=err.message}e.target.value=''});
  dialog.querySelectorAll('[data-r28-insert]').forEach(b=>b.addEventListener('click',()=>{const start=area.selectionStart,end=area.selectionEnd,mark=b.dataset.r28Insert;area.setRangeText(mark+area.value.slice(start,end)+(mark==='**'||mark==='_'?mark:''),start,end,'end');dirty=true;area.focus()}));
  dialog.querySelector('[data-r28-save]').addEventListener('click',save);
  dialog.querySelector('[data-r28-new]').addEventListener('click',async()=>{if(dirty){const ok=await window.ElaraDialog.confirm('یادداشت قبلی ذخیره نشده؛ یادداشت جدید شروع شود؟');if(!ok)return}fill(null);form.elements.title.focus()});
  dialog.querySelector('[data-r28-close]').addEventListener('click',close);
  dialog.querySelector('[data-r28-back]').addEventListener('click',close);
 };
 fill(original);handle();
 const promise=window.ElaraDialog.open({title:'دفترچه یادداشت خصوصی',content:dialog,wide:true,actions:[{label:'بستن',value:false}]});
 const layer=dialog.closest('.elara-dialog-layer');if(layer){layer.classList.add('r28-notebook-layer');layer.querySelector('.elara-dialog-back')?.setAttribute('aria-label','بازگشت');}
 // Native Escape and scrim close the dialog. Preserve drafts on explicit app buttons.
 return promise;
}
function decorateLists(){
 const rows=window.ElaraFreedomMediaDiary?.diaryRows?.()||[];
 document.querySelectorAll('#panel-freedom .fd-diary-entry').forEach((el,i)=>{const id=el.querySelector('[data-fd-diary-id]')?.dataset.fdDiaryId;const row=rows.find(r=>r.id===id);if(!row)return;
  const url=previewBackground(row);if(url){const img=el.querySelector('img');if(img&&img.dataset.r28For!==url){img.src=url;img.dataset.r28For=url;img.style.objectFit='cover'}}
 });
 document.querySelectorAll('#panel-freedom .fd-subdiary-row').forEach(el=>{const id=el.dataset.fSubDiary,row=rows.find(r=>r.id===id),img=el.querySelector('img');if(row&&img){const url=previewBackground(row);if(url&&img.dataset.r28For!==url){img.src=url;img.dataset.r28For=url;img.style.objectFit='cover'}}});
}
function install(){const m=window.ElaraFreedomMediaDiary;if(!m)return;if(!m.__r28){m.openDiary=openDiary;m.__r28=true}decorateLists()}
const mo=new MutationObserver(()=>{if(!document.hidden)install()});mo.observe(document.documentElement,{childList:true,subtree:true});install();
for(const name of ['elara:secondary-ready','elara:freedom-rendered','elara:data-changed','elara:open'])window.addEventListener(name,install);
window.ElaraFreedomDiaryR28={openDiary,themes};
})();