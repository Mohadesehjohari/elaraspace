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
 const value={title:String(f.title||'').slice(0,80),programName:String(f.programName||f.title||'').slice(0,100),description:String(f.description||'').slice(0,5000),note:String(f.note||'').slice(0,5000),days:(Array.isArray(f.days)?f.days:Array.isArray(defaultDays)?defaultDays:[]).filter(x=>days.includes(x)||x==='همه روزها'||x==='روزهای کاری').slice(0,9),checks:(Array.isArray(f.checks)?f.checks:[]).slice(0,90).map((c,i)=>({id:String(c.id||'legacy-'+i).slice(0,110),text:String(c.text||'').slice(0,180),done:!!c.done}))};
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
function close(){if(!dialog)return;try{dialog.__dispose?.()}catch{}document.removeEventListener('keydown',dialog.__key,true);dialog.remove();dialog=null;document.body.style.overflow=priorOverflow}
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
 '<div class="wellshare-actions">'+(rows.length?'<button class="wellshare-primary" type="button" data-wellshare-send>'+tx('اشتراک با دوست','Share with friend')+'</button>':'')+(existing&&existing.status==='accepted'?'<button type="button" data-wellshare-open-shared>'+tx('اجرای مشترک برنامه','Open shared plan')+'</button>':'')+(existing?'<button class="wellshare-danger" type="button" data-wellshare-revoke>'+tx('لغو اشتراک','Revoke access')+'</button>':'')+'<button type="button" data-wellshare-close>'+tx('بستن','Close')+'</button></div><p class="wellshare-message" role="status"></p>';
 const overlay=panel(html,title);
 const content=overlay.querySelector('.wellshare-content');
 overlay.addEventListener('click',async e=>{
  if(e.target.closest('[data-wellshare-open-shared]')){close();await openReceived(shareId(x.user.uid,kind,folderId));return}
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
// Keep incoming invites and accepted folders current without a manual refresh.
let stopReceived=null,receivedWatcherUid='';
function stopReceivedWatch(){try{stopReceived?.()}catch{}stopReceived=null;receivedWatcherUid=''}
async function watchReceived(){
 let x;try{x=await signed()}catch{return}
 if(receivedWatcherUid===x.user.uid&&stopReceived)return;
 stopReceivedWatch();receivedWatcherUid=x.user.uid;
 const inbox=x.fs.query(x.fs.collection(x.db,collectionName),x.fs.where('friendUid','==',x.user.uid));
 stopReceived=x.fs.onSnapshot(inbox,snap=>{
  if(x.auth.currentUser?.uid!==x.user.uid)return;
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>kinds.includes(r.kind)&&r.friendUid===x.user.uid);
  const fingerprint=JSON.stringify(rows.map(r=>[r.id,r.status,r.title,r.updatedAt?.seconds||0,r.payloadJson]));
  const previous=new Set(received.filter(r=>r.status==='pending').map(r=>r.id));
  received=rows;loadedUid=x.user.uid;shareError=null;
  if(fingerprint!==lastFingerprint){
   lastFingerprint=fingerprint;window.dispatchEvent(new Event('elara:wellness-shares-updated'));
   for(const r of rows.filter(r=>r.status==='pending'&&!previous.has(r.id))){
    window.ElaraNotify?.push?.({type:'social',title:tx('دعوت برنامه مشترک','Shared plan invite'),message:r.title||tx('پوشه ورزشی','Wellness folder'),dedupeKey:'wellshare-invite:'+r.id,reopen:true});
   }
  }
 },error=>{shareError=error;console.warn('Wellness invite stream:',error?.code||error?.message);window.dispatchEvent(new Event('elara:wellness-shares-updated'))});
}
function receivedFolders(kind){return received.filter(r=>r.kind===kind&&r.status==='accepted').map(r=>({id:r.id,title:r.title,ownerUid:r.ownerUid}))}
function readPayload(row){try{const d=JSON.parse(row.payloadJson||'{}');return{title:String(d.title||row.title||'').slice(0,80),programName:String(d.programName||'').slice(0,100),description:String(d.description||'').slice(0,5000),note:String(d.note||'').slice(0,5000),days:Array.isArray(d.days)?d.days.filter(x=>days.includes(x)||x==='همه روزها').slice(0,9):[],checks:Array.isArray(d.checks)?d.checks.slice(0,90).map((c,i)=>({id:String(c.id||'legacy-'+i).slice(0,110),text:String(c.text||'').slice(0,180),done:!!c.done})):[]}}catch{return null}}
// Each participant records their own checklist progress; plan edits and progress stream live.
async function openReceived(id){
 try{
  const x=await signed(),ref=x.fs.doc(x.db,collectionName,String(id)),snap=await x.fs.getDoc(ref);
  if(!snap.exists())throw Error(tx('این اشتراک دیگر وجود ندارد.','This share no longer exists.'));
  const share=snap.data(),isOwner=share.ownerUid===x.user.uid;
  if(!isOwner&&share.friendUid!==x.user.uid)throw Error(tx('به این پوشه دسترسی نداری.','Access denied.'));
  if(share.status!=='accepted')throw Error(tx('ابتدا دعوت باید پذیرفته شود.','The invitation must be accepted first.'));
  let liveShare=share,folder=readPayload(share),progress={},saving=false,revoked=false;
  if(!folder)throw Error(tx('محتوای پوشه معتبر نیست.','Invalid shared folder.'));
  const overlay=panel('<p class="wellshare-description">'+tx('هر نفر چک‌لیست خودش را تکمیل می‌کند؛ پیشرفت هر دو نفر هم‌زمان دیده می‌شود.','Each friend checks off their own tasks; progress updates live for both.')+'</p><div data-wellshare-live></div><p class="wellshare-message" role="status"></p>',folder.title);
  function render(){
   if(!overlay.isConnected||!folder)return;
   const otherUid=isOwner?liveShare.friendUid:liveShare.ownerUid;
   const own=Array.isArray(progress[x.user.uid]?.doneIds)?progress[x.user.uid].doneIds:(isOwner?folder.checks.filter(c=>c.done).map(c=>c.id):[]);
   const other=Array.isArray(progress[otherUid]?.doneIds)?progress[otherUid].doneIds:[];
   const a=new Set(own),b=new Set(other),items=folder.checks,valid=new Set(items.map(c=>c.id));
   overlay.querySelector('[data-wellshare-live]').innerHTML='<h3 data-elara-ugc dir="auto">'+esc(folder.programName||folder.title)+'</h3>'+
    '<div class="wellshare-view-grid"><section><h4>'+tx('توضیحات برنامه','Plan details')+'</h4><div class="wellshare-prose" data-elara-ugc dir="auto">'+esc(folder.description||tx('توضیحی ثبت نشده است.','No description.')).replace(/\n/g,'<br>')+'</div></section>'+
    '<section><h4>'+tx('روزهای هفته','Weekdays')+'</h4><div class="wellshare-days">'+days.map(d=>'<span class="'+(folder.days.includes(d)||folder.days.includes('همه روزها')?'active':'')+'">'+d+'</span>').join('')+'</div></section></div>'+
    '<section class="wellshare-team"><h4>'+tx('انجام برنامه با دوست','Do the plan together')+'</h4><p class="wellshare-team-count">'+tx('من','Me')+': '+[...a].filter(k=>valid.has(k)).length+'/'+items.length+' · '+tx('دوستم','Friend')+': '+[...b].filter(k=>valid.has(k)).length+'/'+items.length+'</p>'+
    '<ul class="wellshare-checks">'+items.map(item=>'<li class="wellshare-team-item"><label><input type="checkbox" data-wellshare-toggle="'+esc(item.id)+'" '+(a.has(item.id)?'checked':'')+(revoked?' disabled':'')+'><span data-elara-ugc dir="auto">'+esc(item.text)+'</span></label><small>'+tx('دوستم','Friend')+': '+(b.has(item.id)?'✓':'○')+'</small></li>').join('')+'</ul></section>'+
    '<section><h4>'+tx('یادداشت‌ها','Notes')+'</h4><div class="wellshare-prose" data-elara-ugc dir="auto">'+esc(folder.note||'').replace(/\n/g,'<br>')+'</div></section>';
  }
  const unsubscribeShare=x.fs.onSnapshot(ref,newSnap=>{
   if(!newSnap.exists()||newSnap.data()?.status!=='accepted'||(newSnap.data()?.ownerUid!==x.user.uid&&newSnap.data()?.friendUid!==x.user.uid)){
    revoked=true;msg(overlay,tx('اشتراک بسته یا لغو شده است.','The share was revoked or closed.'),true);
    overlay.querySelectorAll('[data-wellshare-toggle]').forEach(el=>el.disabled=true);return;
   }
   liveShare=newSnap.data();folder=readPayload(liveShare);if(folder)render();
  },error=>msg(overlay,error.message||String(error),true));
  const unsubscribeProgress=x.fs.onSnapshot(x.fs.collection(ref,'progress'),progressSnap=>{
   progress={};progressSnap.docs.forEach(d=>{progress[d.id]=d.data()});render();
  },error=>msg(overlay,error.message||String(error),true));
  overlay.__dispose=()=>{unsubscribeShare();unsubscribeProgress()};
  overlay.addEventListener('change',async e=>{
   const input=e.target.closest('[data-wellshare-toggle]');
   if(!input||saving||revoked||!folder)return;
   const valid=new Set(folder.checks.map(c=>c.id)),mine=x.user.uid;
   const saved=progress[mine]?.doneIds,initial=Array.isArray(saved)?saved:(isOwner?folder.checks.filter(c=>c.done).map(c=>c.id):[]);
   const next=new Set(initial.filter(k=>valid.has(k)));
   if(input.checked)next.add(input.dataset.wellshareToggle);else next.delete(input.dataset.wellshareToggle);
   const prior=progress[mine];progress[mine]={uid:mine,doneIds:[...next]};render();saving=true;
   try{await x.fs.setDoc(x.fs.doc(ref,'progress',mine),{uid:mine,doneIds:[...next].slice(0,90),updatedAt:x.fs.serverTimestamp()});msg(overlay,'')}
   catch(error){progress[mine]=prior;render();msg(overlay,error.message||String(error),true)}
   finally{saving=false}
  });
  render();
 }catch(e){window.ElaraDialog?.alert?.(e.message||String(e),{title:tx('پوشه مشترک','Shared folder')});void refresh()}
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
window.addEventListener('elara:account-ready',()=>setTimeout(()=>{void refresh();void watchReceived()},550));
window.addEventListener('elara:social-updated',()=>void refresh());
window.addEventListener('elara:logout',()=>{stopReceivedWatch();received=[];loadedUid='';lastFingerprint='';shareError=null;close();window.dispatchEvent(new Event('elara:wellness-shares-updated'))});
window.ElaraWellnessShare={shareFolder,openInbox,openReceived,receivedFolders,refresh,syncOwned};
setTimeout(()=>{void refresh();void watchReceived()},1300);
})();