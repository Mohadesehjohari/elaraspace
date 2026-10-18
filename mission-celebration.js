(()=>{'use strict';
const $=s=>document.querySelector(s),tr=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
const queue=[],pending=[];let active=null,timer=0,scheduled=false;
function preference(key){try{return localStorage.getItem(key)==='on'}catch{return false}}
function nextMission(currentKey=''){const rows=Array.isArray(window.ElaraMissions?.snapshot?.())?window.ElaraMissions.snapshot():[];return rows.find(x=>x&&x.key!==currentKey&&!x.completed)||null}
function haptic(){if(!preference('elara_mission_haptics_v1')||!navigator.vibrate)return;try{navigator.vibrate([22,36,28])}catch{}}
function sound(){if(!preference('elara_mission_sound_v1'))return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{const c=new C(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(620,c.currentTime);o.frequency.exponentialRampToValueAtTime(880,c.currentTime+.16);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.08,c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.22);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.24);setTimeout(()=>c.close?.(),420)}catch{}}
function remove(){clearTimeout(timer);timer=0;const el=$('[data-mission-celebration]');if(el){el.classList.add('is-leaving');setTimeout(()=>el.remove(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:170)}active=null;setTimeout(showNext,190)}
function showNext(){if(active||!queue.length)return;const opt=window.ElaraFoxRewards?.options;if(opt&&(!opt.visible||!opt.celebrations)){queue.length=0;return}if(window.ElaraFoxRewards?.active){setTimeout(showNext,300);return}active=queue.shift();const next=nextMission(active.key),root=document.createElement('aside');root.className='mission-celebration';root.dataset.missionCelebration='';root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.innerHTML='<button type="button" class="mission-celebration-close" data-mission-celebration-close aria-label="'+tr('بستن','Close')+'">×</button><img class="mission-celebration-fox" src="assets/ui/fox-mission.webp" alt="" aria-hidden="true" width="88" height="88"><div><small>'+tr('ماموریت کامل شد','Mission complete')+'</small><strong data-mission-celebration-name></strong><p data-mission-celebration-next></p><b>+'+Number(active.rewardXp||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+' XP</b></div>';root.querySelector('[data-mission-celebration-name]').textContent=String(active.name||tr('ماموریت','Mission'));root.querySelector('[data-mission-celebration-next]').textContent=next?tr('بعدی: ','Next: ')+String(next.name||''):tr('فعلاً مأموریت آمادهٔ بعدی نداری؛ مسیرت رو ادامه بده 😎','No next mission is ready yet — keep going 😎');const fox=root.querySelector('.mission-celebration-fox');if(fox)fox.onerror=()=>{fox.onerror=null;fox.src='assets/mascot/fox-fallback.svg'};document.body.append(root);haptic();sound();timer=setTimeout(remove,2700)}
function enqueue(detail){
 if(!detail?.key)return;
 if(pending.some(x=>x.key===detail.key)||queue.some(x=>x.key===detail.key)||active?.key===detail.key)return;
 pending.push({...detail});
 if(!scheduled){scheduled=true;queueMicrotask(flush)}
}
function flush(){
 scheduled=false;
 const claims=pending.splice(0);
 if(!claims.length)return;
 const opt=window.ElaraFoxRewards?.options;
 if(opt&&(!opt.visible||!opt.celebrations))return;
 if(window.ElaraFoxRewards?.show){
  const total=claims.reduce((sum,c)=>sum+Math.max(0,Number(c.rewardXp)||0),0);
  const multi=claims.length>1,last=claims[claims.length-1],next=nextMission(last.key);
  const images={'first-task':'tasks','three-tasks':'celebrate',habit:'habits','read-20':'library','focus-25':'focus','move-20':'sport','language-10':'language','streak-3':'habits',steps:'goals',book:'library'};
  const description=claims.map(c=>String(c.name||tr('مأموریت','Mission'))).join(' · ')+(next?'\n'+tr('مأموریت بعدی: ','Next mission: ')+String(next.name||''):'');
  const loc=document.documentElement.lang==='en'?'en-US':'fa-IR';
  const item={kind:'mission',image:multi?'celebrate':images[String(last.key).split(':')[0]]||'mission',
   kicker:tr('پاداش مسیرت','YOUR QUEST REWARD'),
   title:multi?tr('چند مأموریت رو کامل کردی!','Multiple missions completed!'):tr('مأموریت کامل شد!','Mission complete!'),
   description,rewardXp:total,stars:Math.min(8,claims.length),tags:[...(multi?[claims.length.toLocaleString(loc)+tr(' مأموریت',' missions')]:[]),'+'+total.toLocaleString(loc)+' XP'],
   primary:tr('دیدن مأموریت‌ها','View missions'),secondary:tr('ادامه می‌دم','Keep going'),go:'missions'};
  const id='mission:'+claims.map(c=>String(c.key)).sort().join('|');
  if(window.ElaraFoxRewards.show(id,item)){haptic();return}
  if(document.documentElement.hasAttribute('data-elara-booting'))return;
 }
 for(const claim of claims)queue.push(claim);
 showNext();
}
window.addEventListener('elara:mission-claimed',e=>enqueue(e.detail));
document.addEventListener('click',e=>{if(e.target.closest('[data-mission-celebration-close]'))remove()});
window.ElaraMissionCelebration={enqueue,close:remove,nextMission,get active(){return active},preferences:{haptics:()=>preference('elara_mission_haptics_v1'),sound:()=>preference('elara_mission_sound_v1')}};
})();