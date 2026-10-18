/* Realtime public profile projection: friend updates and active visitor dialogs.
   Keeps Firebase as source of truth; no private account state is shared. */
(() => {
  'use strict';
  const watched=new Map(),cache=new Map();
  let sessionUid='',apiPromise=null,syncQueued=false,observer=null;
  const sameUid=()=>String(window.ElaraAccount?.user?.uid||'')===sessionUid;
  const state=()=>window.ElaraSocial;
  const json=value=>JSON.stringify(value);
  const publicFields=data=>({
    name:String(data?.name||''),username:String(data?.username||''),
    bio:String(data?.bio||''),xp:Number(data?.xp||0),
    profilePublic:data?.profilePublic!==false,
    appearance:data?.appearance||{}
  });

  function reset() {
    for(const off of watched.values())try{off()}catch{}
    watched.clear();cache.clear();sessionUid='';
  }
  function viewerCards(){
    return [...document.querySelectorAll('.elara-profile-dialog')];
  }
  function shownUid(card){
    return card.dataset.profileUid||
      card.querySelector('.elara-profile-composition[data-profile-uid]')?.dataset.profileUid||'';
  }
  function isFriend(peerId){
    return (state()?.friends||[]).some(p=>p.uid===peerId);
  }
  function applyDialog(peerId,person){
    for(const card of viewerCards()){
      if(shownUid(card)!==peerId)return;
      const allowed=person.profilePublic!==false||isFriend(peerId);
      if(!allowed){window.ElaraDialog?.close?.();return}
      const fingerprint=json(publicFields(person));
      if(card.dataset.profileLiveFingerprint===fingerprint)continue;
      card.dataset.profileLiveFingerprint=fingerprint;
      const system=window.ElaraProfileSystem;
      const model=system?.viewModel?.(person,{self:false});
      const summary=card.querySelector('.pass4-public-profile-summary');
      if(summary&&model&&system?.composition){
        summary.innerHTML=system.composition(model,{profilePage:true});
        const cover=card.querySelector('.visitor-profile-hero');
        const cta=summary.querySelector('.elara-profile-page-entry');
        if(cover&&cta)summary.querySelector('.elara-profile-composition')?.append(cta);
      }
      const bio=card.querySelector('.elara-profile-bio');
      if(bio)bio.textContent=person.bio||'هنوز Bio ثبت نشده است.';
      const facts=card.querySelector('.pass4-profile-facts');
      if(facts){
        const spans=facts.querySelectorAll('span');
        if(spans[0])spans[0].textContent='Level '+(model?.level||1);
        if(spans[1])spans[1].textContent=model?.title||'';
        if(spans[2])spans[2].textContent=Number(person.xp||0).toLocaleString('fa-IR')+' XP';
      }
    }
  }
  function apply(peerId){
    const data=cache.get(peerId);
    if(!data||!sameUid())return;
    const social=state();
    if(!social)return;
    const patch={uid:peerId,...data};
    let modified=false;
    for(const friend of social.friends||[]){
      if(friend.uid!==peerId)continue;
      const before=json(publicFields(friend));
      Object.assign(friend,patch);
      if(before!==json(publicFields(friend)))modified=true;
    }
    for(const req of social.requests||[]){
      if(req.other!==peerId||!req.person)continue;
      Object.assign(req.person,patch);
    }
    if(social.profileView?.uid===peerId)Object.assign(social.profileView,patch);
    applyDialog(peerId,patch);
    if(modified)window.ElaraSocialView?.render?.();
    window.dispatchEvent(new CustomEvent('elara:public-profile-updated',{detail:{uid:peerId}}));
  }
  async function firestore(){
    if(!apiPromise)apiPromise=Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
    ]).then(([app,db])=>({app,db})).catch(error=>{apiPromise=null;throw error});
    return apiPromise;
  }
  async function sync(){
    const mine=String(window.ElaraAccount?.user?.uid||'');
    if(!mine||!window.ElaraAccount?.profile||!state()){reset();return}
    if(sessionUid!==mine){reset();sessionUid=mine}
    const peers=new Set((state().friends||[]).map(p=>p.uid).filter(id=>id&&id!==mine));
    for(const card of viewerCards()){
      const who=shownUid(card);
      if(who&&who!==mine)peers.add(who);
    }
    for(const [id,off] of watched)if(!peers.has(id)){off();watched.delete(id);cache.delete(id)}
    if(!peers.size)return;
    let firebase;
    try{firebase=await firestore()}catch(error){console.warn('Elara profile sync not ready:',error);return}
    if(!sameUid()||!firebase.app.getApps().length)return;
    const db=firebase.db.getFirestore(firebase.app.getApp());
    for(const id of peers){
      if(watched.has(id))continue;
      watched.set(id,()=>{});
      const off=firebase.db.onSnapshot(firebase.db.doc(db,'profiles',id),snapshot=>{
        if(!sameUid())return;
        if(!snapshot.exists()){cache.delete(id);return}
        cache.set(id,snapshot.data());apply(id);
      },error=>{
        if(!sameUid())return;
        console.warn('Elara public profile subscription:',id,error.code||error.message);
        watched.delete(id);cache.delete(id);
        if(error.code==='permission-denied'){
          const card=viewerCards().find(card=>shownUid(card)===id);
          if(card)window.ElaraDialog?.close?.();
        }
      });
      if(watched.has(id))watched.set(id,off);else off();
    }
    for(const id of peers)if(cache.has(id))apply(id);
  }
  function schedule(){
    if(syncQueued)return;
    syncQueued=true;
    queueMicrotask(()=>{syncQueued=false;void sync().catch(err=>console.warn('Elara profile sync:',err))});
  }
  window.addEventListener('elara:account-ready',schedule);
  window.addEventListener('elara:social-updated',schedule);
  window.addEventListener('elara:profile-saved',schedule);
  window.addEventListener('elara:logout',reset);
  window.addEventListener('online',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
  function start(){
    observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>
        n.nodeType===1&&(n.matches?.('.elara-profile-dialog')||n.querySelector?.('.elara-profile-dialog')))))schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.ElaraPublicProfileSync={refresh:schedule,stop:reset};
})();
