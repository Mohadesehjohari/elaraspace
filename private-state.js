/*
 * Server-first private state trial.
 * Opt in with ?serverOnly=1 (the default/legacy app is unchanged).
 * The canonical Firebase private/{uid}/app/main record stays the source of truth.
 * During this trial the legacy key is virtualized in RAM so existing modules
 * can use their usual getItem/setItem APIs without writing account data to disk.
 * This does NOT delete any preexisting localStorage backups or other keys.
 */
(()=>{
  'use strict';
  const MAIN='elara_space_v1';
  const trial=new URLSearchParams(location.search).get('serverOnly')==='1';
  let currentUid='',memory=null,installed=false;
  const native={};
  try{
    if(trial&&typeof Storage!=='undefined'){
      const p=Storage.prototype;
      native.get=p.getItem;native.set=p.setItem;native.remove=p.removeItem;
      p.getItem=function(key){
        if(this===window.localStorage&&String(key)===MAIN)return memory;
        return native.get.call(this,key);
      };
      p.setItem=function(key,value){
        if(this===window.localStorage&&String(key)===MAIN){memory=String(value);return;}
        return native.set.call(this,key,value);
      };
      p.removeItem=function(key){
        if(this===window.localStorage&&String(key)===MAIN){memory=null;return;}
        return native.remove.call(this,key);
      };
      installed=p.getItem!==native.get&&p.setItem!==native.set&&p.removeItem!==native.remove;
    }
  }catch(err){console.error('Private state compatibility failed:',err);installed=false;}
  const active=trial&&installed;
  if(trial&&!active){
    document.documentElement.dataset.elaraPrivateStateFailed='true';
    console.error('Server-only trial is not supported by this browser. Do not proceed with private session data.');
  }
  window.ElaraPrivateState=Object.freeze({
    requested:trial,
    supported:!trial||installed,
    active,
    get accountUid(){return currentUid;},
    activate(uid){
      if(!active)throw Error('حالت ذخیره سروری در این مرورگر آماده نیست.');
      if(!uid)throw Error('حساب کاربری تأیید نشده است.');
      currentUid=String(uid);memory=null;
    },
    reset(){currentUid='';memory=null;},
    // Read-only legacy candidate for an explicitly approved one-time migration.
    // The RAM-only shim must not hide an older, possibly un-synced on-disk snapshot.
    readDiskSnapshot(key){
      if(!['elara_space_v1','elara_precloud_backup'].includes(String(key)))return null;
      try{return active?native.get.call(localStorage,key):localStorage.getItem(key)}catch{return null;}
    },
    nativeLegacyExists(){
      try{return active&&native.get.call(localStorage,MAIN)!==null}catch{return false;}
    },
    // Do not delete or export old backups without the user's separate consent.
    // Legacy data stays untouched so a user can recover un-synced old work.
    status(){return {trial,installed,uid:currentUid,hasMemory:memory!==null,legacyPresent:this.nativeLegacyExists()};}
  });
})();
