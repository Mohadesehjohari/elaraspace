/* Home-only decoration. Canonical navigation owns its own artwork from initial render. */
(()=>{'use strict';
const ROOT='assets/ui/';
/* Reference Home regenerates innerHTML on navigation. Reuse already-decoded decorative nodes to prevent art flash. */
const durable={flame:null,rocket:null};
function keepDecoded(key,selector){const live=document.querySelector(selector);if(!live)return;const saved=durable[key];
 if(saved&&saved!==live&&!saved.isConnected&&saved.complete&&saved.naturalWidth){live.replaceWith(saved);return}
 if(live.complete&&live.naturalWidth){durable[key]=live;return}
 if(live.dataset.elaraKeepDecoded)return;live.dataset.elaraKeepDecoded='1';live.addEventListener('load',()=>{if(!durable[key]||!durable[key].isConnected)durable[key]=live},{once:true});
}
function ranking(){const host=document.getElementById('elara-home-ranks');if(!host)return;const social=window.ElaraSocial,people=[social?.me,...(Array.isArray(social?.friends)?social.friends:[])].filter(Boolean).sort((a,b)=>(Number(b.xp)||0)-(Number(a.xp)||0)).slice(0,3);if(!people.length)return;const models=people.map(p=>window.ElaraProfileSystem?.viewModel?.(p,{self:p.uid===social?.me?.uid})||{}),signature=JSON.stringify(people.map((p,i)=>[p.uid,p.name,p.username,p.xp,models[i].avatarSrc]));if(host.dataset.podiumSignature===signature&&host.querySelector('.ref-mini-podium'))return;host.dataset.podiumSignature=signature;const podium=document.createElement('div');podium.className='ref-mini-podium';people.forEach((person,i)=>{const b=document.createElement('button');b.type='button';b.className='ref-podium-person place-'+(i+1);b.dataset.openProfile=person.uid;const portrait=document.createElement('span');portrait.className='ref-podium-portrait';if(models[i].avatarSrc){const img=document.createElement('img');img.src=models[i].avatarSrc;img.alt='';portrait.append(img)}else portrait.textContent=(person.name||person.username||'؟').slice(0,1);const frame=document.createElement('img');frame.src=ROOT+'artwork-rank-frame-'+(i+1)+'.webp';frame.alt='رتبه '+(i+1);frame.className='ref-podium-frame';portrait.append(frame);const name=document.createElement('strong');name.textContent=person.name||person.username||'کاربر';const xp=document.createElement('small');xp.textContent=Number(person.xp||0).toLocaleString('fa-IR')+' XP';b.append(portrait,name,xp);podium.append(b)});host.replaceChildren(podium)}

function decorate(){keepDecoded('flame','#ref-streak-card .ref-streak-flame');ranking()}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
function init(){decorate();for(const name of ['elara:open','elara:hydrate','elara:social-updated','elara:account-ready','elara:profile-saved'])window.addEventListener(name,schedule);const home=document.getElementById('panel-home');if(home){const observer=new MutationObserver(()=>schedule());observer.observe(home,{childList:true,subtree:true})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
