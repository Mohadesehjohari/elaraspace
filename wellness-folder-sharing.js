/* ELARA WELL-SHARE-01 · one-to-one, opt-in Firestore folder sharing. Never uploads other private wellness data. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const kinds=['workout','nutrition'],days=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const collectionName='wellnessFolderShares';
const friends=()=>Array.isArray(window.ElaraSocial?.friends)?window.ElaraSocial.friends.filter(f=>f&&f.uid):[];
let apiPromise=null,received=[],loadedUid='',loading=null,lastFingerprint='',shareError=null,dialog=null,priorOverflow='';
const api=()=>apiPromise||(apiPromise=Promise.all([
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
]).then(([app,auth,fs])=>({auth:auth.getAuth(app.getApp()),db:fs.getFirestore(app.getApp()),fs})).catch(e=>{apiPromise=null;throw e}));
async function signed(){const x=await api(),user=x.auth.currentUser;if(!user?.uid||!user.emailVerified)throw Error(tx('برای اشتراک پوشه باید وارد حساب تأییدشده شوی.','Sign in to a verified account first.'));return {...x,user}}
function shareId(uid,kind,folderId){if(!kinds.includes(kind)||!/^[a-zA-Z0-9_-]{1,110}$/.test(folderId))throw Error(tx('شناسهٔ پوشه برای اشتراک معتبر نیست.','Folder ID is not shareable.'));return uid+'__'+kind+'__'+folderId}
function localFolder(uid,kind,folderId){
 try{const s=JSON.parse(localStorage.getItem('elara_private_wellness_v1_'+uid)||'{}')||{},rows=Array.isArray(s[kind+'PlanFolders'])?s[kind+'PlanFolders']:[];return rows.find(f=>String(f?.id)===String(folderId))||null}catch{return null}
}
function snapshotFolder(f,kind,ownerUid){
 let defaultDays=[];try{const state=JSON.parse(localStorage.getItem('elara_private_wellness_v1_'+ownerUid)||'{}');defaultDays=state[kind+'PlanMeta']?.days||[]}catch{}
 const value={title:String(f.title||'').slice(0,80),programName:String(f.programName||f.title||'').slice(0,100),description:String(f.description||'').slice(0,5000),note:String(f.note||'').slice(0,5000),days:(Array.isArray(f.days)?f.days:Array.isArray(defaultDays)?defaultDays:[]).filter(x=>days.includes(x)||x==='همه روزها'||x==='روزهای کاری').slice(0,9),checks:(Array.isArray(f.checks)?f.checks:[]).slice(0,90).map(c=>({text:String(c.text||'').slice(0,180),done:!!c.done}))};
 const json=JSON.stringify(value);if(json.length>27000)throw Error(tx('حجم این پوشه برای اشتراک خیلی زیاد است.','This folder exceeds the sharing limit.'));return json;
}
function panel(html,title){
 if(dialog)close();priorOverflow=document.body.style.overflow;
 const overlay=document.createElement('div');overlay.className='wellshare-overlay';
 overlay.innerHTML='<section class="wellshare-dialog" role="dialog" aria-modal="true" aria-label="'+esc(title)+'" dir="rtl"><header><div><small>ELARA · WELLNESS</small><h2>'+esc(title)+'</h2></div><button type="button" data-wellshare-close aria-label="بستن">×</button></header><div class="wellshare-content">'+html+'</div></section>';
 document.body.append(overlay);document.body.style.overflow='hidden';dialog=overlay;
 overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-wellshare-close]'))close()});
 const key=e=>{if(e.key==='Escape'){e.preventDefault();close()}};
 overlay.__key=key;document.addEventListener('keydown',key,true);
 overlay.querySelector('[data-wellshare-close]')?.focus({preventScroll:true});
 return overlay
}
function close(){if(!dialog)return;document.removeEventListener('keydown',dialog.__key,true);dialog.remove();dialog=null;document.body.style.overflow=priorOverflow}
function msg(root,value,error=false){const e=root?.querySelector('.wellshare-message');if(e){e.textContent=value;e.classList.toggle('is-error',error)}}
async function shareFolder(kind,folderId){
 let x,folder,existing=null;
 try{x=await signed();folder=localFolder(x.user.uid,kind,folderId);if(!folder)throw Error(tx('پوشه پیدا نشد.','Folder not found.'));
 const ref=x.fs.doc(x.db,collectionName,shareId(x.user.uid,kind,folderId));
 try{const snap=await x.fs.getDoc(ref);existing=snap.exists()?snap.data():null}catch(error){if(error?.code!=='permission-denied')throw error;existing=null}
 // Firestore rules can deny a get for a document that does not yet exist.
 // Creation is authorized separately and will still fail safely if backend rules are absent.
 }catch(e){window.ElaraDialog?.alert?.(e.message||String(e),{title:'اشتراک پوشه'});return}
 const rows=friends().filter(f=>f.uid!==x.user.uid);
 const title=tx('اشتراک پوشه با یک دوست','Share folder with one friend');
 const html='<p class="wellshare-description">'+tx('فقط همین پوشه و محتوای برنامه برای دوستی که انتخاب می‌کنی فرستاده می‌شود؛ اطلاعات وزن و سایر برنامه‌ها خصوصی می‌مانند. دوستت باید دعوت را بپذیرد.','Only this folder is shared; other wellness information stays private. Your friend must accept.')+'</p>'+
 (existing?'<p class="wellshare-current">'+tx('وضعیت فعلی: ','Current status: ')+esc(existing.status==='accepted'?'پذیرفته شده':existing.status==='declined'?'رد شده':'در انتظار پذیرش')+'</p>':'')+
 (rows.length?'<fieldset class="wellshare-friends"><legend>'+tx('یک دوست انتخاب کن','Choose one friend')+'</legend>'+rows.map((f,i)=>'<label><input type="radio" name="wellshare-friend" value="'+esc(f.uid)+'" '+((existing?existing.friendUid===f.uid:i===0)?'checked':'')+'><span><strong>'+esc(f.name||f.username||tx('دوست','Friend'))+'</strong><small>'+esc(f.username?'@'+f.username:'')+'</small></span></label>').join('')+'</fieldset>':'<p class="wellshare-empty">'+tx('دوست تأییدشده‌ای برای انتخاب وجود ندارد.','No accepted friends are available.')+'</p>')+
 '<div class="wellshare-actions">'+(rows.length?'<button class="wellshare-primary" type="button" data-wellshare-send>'+tx('اشتراک با دوست','Share with friend')+'</button>':'')+(existing?'<button class="wellshare-danger" type="button" data-wellshare-revoke>'+tx('لغو اشتراک','Revoke access')+'</button>':'')+'<button type="button" data-wellshare-close>'+tx('بستن','Close')+'</button></div><p class="wellshare-message" role="status"></p>';
 const overlay=panel(html,title);
 const content=overlay.querySelector('.wellshare-content');
 overlay.addEventListener('click',async e=>{
  if(e.target.closest('[data-wellshare-send]')){
   const target=content.querySelector('[name=wellshare-friend]:checked')?.value;
   if(!target||!rows.some(f=>f.uid===target)){msg(content,tx('یکی از دوستان را انتخاب کن.','Select a friend.'),true);return}
   const btn=e.target.closest('button');btn.disabled=true;
   try{
    const current=localFolder(x.user.uid,kind,folderId);if(!current)throw Error(tx('پوشه حذف شده است.','Folder no longer exists.'));
    const payloadJson=snapshotFolder(current,kind,x.user.uid),r=x.fs.doc(x.db,collectionName,shareId(x.user.uid,kind,folderId));
    if(existing){await x.fs.updateDoc(r,{friendUid:target,title:String(current.title).slice(0,80),payloadJson,status:existing.friendUid===target&&existing.status==='accepted'?'accepted':'pending',updatedAt:x.fs.serverTimestamp()})}
    else{await x.fs.setDoc(r,{ownerUid:x.user.uid,friendUid:target,folderId:String(folderId),kind,title:String(current.title).slice(0,80),payloadJson,status:'pending',createdAt:x.fs.serverTimestamp(),updatedAt:x.fs.serverTimestamp()})}
    msg(content,tx('درخواست اشتراک ثبت شد. دوستت می‌تواند از بخش دریافتی‌ها آن را بپذیرد.','Invite sent. Your friend can accept it in Received folders.'));
    content.querySelector('[data-wellshare-send]')?.remove();
   }catch(err){msg(content,err.message||String(err),true)}finally{btn.disabled=false}
  }
  if(e.target.closest('[data-wellshare-revoke]')){
   const btn=e.target.closest('button');btn.disabled=true;
   try{await x.fs.deleteDoc(x.fs.doc(x.db,collectionName,shareId(x.user.uid,kind,folderId)));msg(content,tx('دسترسی دوست به این پوشه لغو شد.','Sharing revoked.'));content.querySelector('[data-wellshare-revoke]')?.remove()}
   catch(err){msg(content,err.message||String(err),true)}finally{btn.disabled=false}
  }
 });
}
async function refresh(){
 if(loading)return loading;
 loading=(async()=>{
  try{const {user,fs,db}=await signed(),snaps=await fs.getDocs(fs.query(fs.collection(db,collectionName),fs.where('friendUid','==',user.uid)));
    if((await api()).auth.currentUser?.uid!==user.uid)return;
    const rows=snaps.docs.map(d=>({id:d.id,...d.data()})).filter(x=>kinds.includes(x.kind)&&x.friendUid===user.uid);
    const fingerprint=JSON.stringify(rows.map(r=>[r.id,r.status,r.title,r.updatedAt?.seconds||0,r.payloadJson]));
    received=rows;loadedUid=user.uid;shareError=null;if(fingerprint!==lastFingerprint){lastFingerprint=fingerprint;window.dispatchEvent(new Event('elara:wellness-shares-updated'))}
  }catch(err){shareError=err;if(loadedUid){received=[];loadedUid='';lastFingerprint='';window.dispatchEvent(new Event('elara:wellness-shares-updated'))}if(err?.code!=='permission-denied')console.warn('Wellness shares:',err?.message||err)}
 })().finally(()=>{loading=null});return loading
}
function receivedFolders(kind){return received.filter(r=>r.kind===kind&&r.status==='accepted').map(r=>({id:r.id,title:r.title,ownerUid:r.ownerUid}))}
function readPayload(row){try{const d=JSON.parse(row.payloadJson||'{}');return{title:String(d.title||row.title||'').slice(0,80),programName:String(d.programName||'').slice(0,100),description:String(d.description||'').slice(0,5000),note:String(d.note||'').slice(0,5000),days:Array.isArray(d.days)?d.days.filter(x=>days.includes(x)||x==='همه روزها').slice(0,9):[],checks:Array.isArray(d.checks)?d.checks.slice(0,90).map(c=>({text:String(c.text||'').slice(0,180),done:!!c.done})):[]}}catch{return null}}
async function openReceived(id){
 try{const x=await signed(),snap=await x.fs.getDoc(x.fs.doc(x.db,collectionName,id));if(!snap.exists())throw Error('این اشتراک دیگر وجود ندارد.');
 const share=snap.data();if(share.friendUid!==x.user.uid||share.status!=='accepted')throw Error('به این پوشه دسترسی نداری.');
 const f=readPayload(share);if(!f)throw Error('محتوای پوشه معتبر نیست.');
 panel('<p class="wellshare-description">'+tx('این پوشه فقط برای مشاهده با تو مشترک شده است.','This folder is shared with you as read-only.')+'</p><h3>'+esc(f.programName||f.title)+'</h3><div class="wellshare-view-grid"><section><h4>توضیحات برنامه</h4><div class="wellshare-prose" data-elara-ugc dir="auto">'+esc(f.description||'توضیحی ثبت نشده است.').replace(/\n/g,'<br>')+'</div></section><section><h4>روزهای هفته</h4><div class="wellshare-days">'+days.map(d=>'<span class="'+(f.days.includes(d)||f.days.includes('همه روزها')?'active':'')+'">'+d+'</span>').join('')+'</div></section><section><h4>تسک‌ها</h4><ul class="wellshare-checks">'+f.checks.map(c=>'<li><span aria-hidden="true">'+(c.done?'☑':'□')+'</span><span>'+esc(c.text)+'</span></li>').join('')+'</ul></section><section><h4>یادداشت‌ها</h4><div class="wellshare-prose" data-elara-ugc dir="auto">'+esc(f.note||'یادداشتی ثبت نشده است.').replace(/\n/g,'<br>')+'</div></section></div>',f.title);
 }catch(e){window.ElaraDialog?.alert?.(e.message||String(e),{title:'پوشه مشترک'});void refresh()}
}
async function openInbox(){
 let x;try{x=await signed();await refresh();if(shareError)throw Error(shareError.code==='permission-denied'?tx('قوانین اشتراک پوشه هنوز روی Firestore منتشر نشده‌اند یا دسترسی این حساب مجاز نیست.','Folder-sharing Firestore rules are not deployed or access is denied.'):shareError.message)}catch(e){window.ElaraDialog?.alert?.(e.message||String(e));return}
 const rows=received.slice(),html='<p class="wellshare-description">'+tx('دعوت‌های دریافتی را می‌توانی بپذیری یا رد کنی. پوشه‌های پذیرفته‌شده فقط برای مشاهده در ورزش و تغذیه ظاهر می‌شوند.','Accept or decline invitations. Accepted folders appear read-only in Wellness.')+'</p>'+
 (rows.length?rows.map(r=>'<article class="wellshare-inbox-row" data-wellshare-row="'+esc(r.id)+'"><div><strong>'+esc(r.title||'پوشه')+'</strong><small>'+esc(r.status==='accepted'?'پذیرفته شده':r.status==='declined'?'رد شده':'در انتظار پاسخ')+'</small></div><div>'+(r.status==='pending'?'<button data-wellshare-accept="'+esc(r.id)+'">پذیرش</button><button data-wellshare-decline="'+esc(r.id)+'">رد</button>':r.status==='accepted'?'<button data-wellshare-open="'+esc(r.id)+'">مشاهده</button>':'')+'</div></article>').join(''):'<p class="wellshare-empty">'+tx('هنوز پوشه‌ای از دوستان دریافت نکرده‌ای.','No shared folders received yet.')+'</p>')+
 '<p class="wellshare-message" role="status"></p>';
 const overlay=panel(html,tx('پوشه‌های مشترک با من','Folders shared with me'));
 overlay.addEventListener('click',async e=>{
  const action=e.target.closest('[data-wellshare-accept],[data-wellshare-decline],[data-wellshare-open]');if(!action)return;
  const id=action.dataset.wellshareAccept||action.dataset.wellshareDecline||action.dataset.wellshareOpen;
  if(action.hasAttribute('data-wellshare-open')){close();await openReceived(id);return}
  action.disabled=true;
  try{const ref=x.fs.doc(x.db,collectionName,id),row=rows.find(r=>r.id===id);if(!row||row.friendUid!==x.user.uid||row.status!=='pending')throw Error('دعوت معتبر نیست.');
   await x.fs.updateDoc(ref,{status:action.hasAttribute('data-wellshare-accept')?'accepted':'declined',updatedAt:x.fs.serverTimestamp()});
   msg(overlay,tx('پاسخ ثبت شد.','Response saved.'));await refresh();close();
  }catch(err){msg(overlay,err.message||String(err),true)}finally{action.disabled=false}
 });
}
async function syncOwned(kind){
 if(!kinds.includes(kind))return;
 try{const x=await signed(),snaps=await x.fs.getDocs(x.fs.query(x.fs.collection(x.db,collectionName),x.fs.where('ownerUid','==',x.user.uid)));
  for(const item of snaps.docs){const share=item.data();if(share.ownerUid!==x.user.uid||share.kind!==kind)continue;const folder=localFolder(x.user.uid,kind,share.folderId);
   if(!folder){await x.fs.deleteDoc(item.ref);continue}
   const payloadJson=snapshotFolder(folder,kind,x.user.uid),title=String(folder.title||'').slice(0,80);
   if(share.payloadJson!==payloadJson||share.title!==title)await x.fs.updateDoc(item.ref,{payloadJson,title,updatedAt:x.fs.serverTimestamp()});
  }
 }catch(e){if(e?.code!=='permission-denied')console.warn('Wellness folder sync:',e?.message||e)}
}
document.addEventListener('click',e=>{
 const share=e.target.closest('[data-wellness-folder-share]');if(share){e.preventDefault();void shareFolder(share.dataset.wellnessFolderShare,share.dataset.folderId);return}
 const inbox=e.target.closest('[data-wellness-share-inbox]');if(inbox){e.preventDefault();void openInbox();return}
 const received=e.target.closest('[data-wellness-received-id]');if(received){e.preventDefault();void openReceived(received.dataset.wellnessReceivedId)}
});
window.addEventListener('elara:wellness-saved',e=>{if(e.detail?.workoutPlanFolders)void syncOwned('workout');if(e.detail?.nutritionPlanFolders)void syncOwned('nutrition')});
window.addEventListener('elara:open',e=>{if(['exercise','wellness-exercise'].includes(e.detail?.tab))setTimeout(()=>void refresh(),150)});
window.addEventListener('elara:account-ready',()=>setTimeout(()=>void refresh(),550));
window.addEventListener('elara:social-updated',()=>void refresh());
window.addEventListener('elara:logout',()=>{received=[];loadedUid='';lastFingerprint='';shareError=null;close();window.dispatchEvent(new Event('elara:wellness-shares-updated'))});
window.ElaraWellnessShare={shareFolder,openInbox,openReceived,receivedFolders,refresh,syncOwned};
setTimeout(()=>void refresh(),1300);
})();