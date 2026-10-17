/* Account-scoped cloud-first Storage-compatible facade.
 * No application writes to native localStorage. Firebase Auth may use its own
 * browser persistence; authentication is separate from application data.
 * Keep the API synchronous for legacy rendering while Firestore is the source of truth.
 */
(()=>{'use strict';
 const rows=new Map(),sessionRows=new Map(),pending=new Map();
 let uid='',ready=false,transport=null,epoch=0,scheduled=null,writing=Promise.resolve(),lastError=null;
 const MAIN='elara_space_v1',MAX=350000,MAX_MAIN=800000;
 const native=()=>{try{return window.localStorage}catch{return null}};
 const notify=()=>window.dispatchEvent(new Event('elara:cloud-storage-status'));
 function safeKey(key){const s=String(key);if(!s||s.length>250||s.includes('/'))throw Error('Invalid Elara storage key');return s}
 function getItem(key){const value=rows.get(String(key));return value===undefined?null:value}
 function setItem(key,value){
  key=safeKey(key);value=String(value);
  if(value.length>(key===MAIN?MAX_MAIN:MAX))throw Error('حجم این داده بیشتر از سقف ذخیره‌سازی ابری است.');
  rows.set(key,value);
  if(ready&&key!==MAIN){pending.set(key,value);schedule()}
 }
 function removeItem(key){
  key=safeKey(key);rows.delete(key);
  if(ready&&key!==MAIN){pending.set(key,null);schedule()}
 }
 const session={
  getItem:key=>sessionRows.has(String(key))?sessionRows.get(String(key)):null,
  setItem:(key,value)=>sessionRows.set(String(key),String(value)),
  removeItem:key=>sessionRows.delete(String(key)),
  clear:()=>sessionRows.clear()
 };
 const migratable=(key,mine)=>{
  if(!key.startsWith('elara_')||key===MAIN||key==='elara_precloud_backup')return false;
  // Never copy another account's data from a shared browser.
  const ownerTagged=key.endsWith('_'+mine)||key.includes('_'+mine+'_');
  const prefs=new Set(['elara_locale_v1','elara_preferences_v2','elara_calendar_pref','elara_amoled','elara_task_strike_completed']);
  return ownerTagged||prefs.has(key)
 };
 async function flush(){
  if(!ready||!transport)return;
  clearTimeout(scheduled);scheduled=null;
  const mine=uid,at=epoch,changes=[...pending];pending.clear();
  if(changes.length){
   writing=writing.catch(()=>{}).then(async()=>{
    for(let i=0;i<changes.length;i++){
     const [key,value]=changes[i];
     if(at!==epoch||mine!==uid)return;
     try{
      if(value===null)await transport.remove(key);
      else await transport.write(key,value);
     }catch(error){
      // Keep the failed key for retry; newer edits take precedence.
      if(!pending.has(key))pending.set(key,value);
      for(const [leftKey,leftValue] of changes.slice(i+1))if(!pending.has(leftKey))pending.set(leftKey,leftValue);
      lastError=error;notify();throw error
     }
    }
    if(at===epoch){lastError=null;notify()}
   })
  }
  await writing
 }
 function schedule(){clearTimeout(scheduled);scheduled=setTimeout(()=>void flush().catch(error=>console.warn('Elara cloud key-value write:',error)),400)}
 async function connect(mine,api){
  if(!mine||!api?.list||!api?.write||!api?.remove)throw Error('Cloud storage transport missing');
  if(ready&&mine===uid)return;
  const at=++epoch;ready=false;clearTimeout(scheduled);scheduled=null;uid=mine;transport=null;rows.clear();pending.clear();
  // Fail closed: a Firestore read error must not turn cloud-only data into
  // apparently empty values that later overwrite the account's real data.
  const items=await api.list();if(at!==epoch)return;
  for(const {key,value} of items){
   if(typeof key==='string'&&key!==MAIN&&typeof value==='string'&&key.length<=250&&!key.includes('/'))rows.set(key,value)
  }
  // One-time account-tagged legacy import. Server data always wins. A native
  // item is removed ONLY AFTER Firestore acknowledges a successful upload.
  const store=native();
  if(store){
   for(let i=0;i<store.length;i++){
    const key=store.key(i);if(!key||!migratable(key,mine)||rows.has(key))continue;
    const value=store.getItem(key);
    if(typeof value!=='string'||value.length>MAX)continue;
    await api.write(key,value);
    if(at!==epoch)return;
    rows.set(key,value);
    store.removeItem(key);i--;
   }
  }
  if(at!==epoch)return;
  transport=api;ready=true;lastError=null;notify();
  window.dispatchEvent(new Event('elara:cloud-storage-ready'))
 }
 async function disconnect(){
  // Refuse to discard unsaved writes while the user still has a session.
  await flush();
  ++epoch;ready=false;uid='';transport=null;pending.clear();rows.clear();sessionRows.clear();
  clearTimeout(scheduled);scheduled=null;lastError=null;notify()
 }
 function loadMain(payload){rows.set(MAIN,typeof payload==='string'?payload:JSON.stringify(payload))}
 function inspect(){return{connected:ready,uid,pending:pending.size,error:lastError?.code||lastError?.message||null}}
 window.ElaraCloudStorage={getItem,setItem,removeItem,session,connect,disconnect,flush,loadMain,inspect};
})();
