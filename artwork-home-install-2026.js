/* Temporary image-free Home and Navigation state until approved transparent artwork is uploaded.
   Canonical navigation owns its SVG icons, labels, selection and route handlers. */
(()=>{'use strict';
function decorateRanking(){
 const host=document.getElementById('elara-home-ranks');if(!host)return;
 const social=window.ElaraSocial,persons=[social?.me,...(Array.isArray(social?.friends)?social.friends:[])].filter(Boolean);
 host.querySelectorAll(':scope > .elara-rank-line').forEach((row,index)=>{
  row.hidden=index>=3;
  if(index>=3)return;
  row.style.position='relative';
  const target=row.querySelector('[data-open-profile]')?.dataset.openProfile;
  const person=persons.find(p=>p.uid===target);if(!person)return;
  const avatar=window.ElaraProfileSystem?.viewModel?.(person,{self:person.uid===social?.me?.uid})?.avatarSrc;
  const holder=row.querySelector('.elara-social-avatar');if(!avatar||!holder||holder.querySelector('img'))return;
  const img=document.createElement('img');img.className='elara-real-rank-avatar';img.alt='';img.decoding='async';img.src=avatar;
  img.addEventListener('error',()=>img.remove());holder.prepend(img);
 });
}
let queued=false;function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;decorateRanking()},160)}
function init(){decorateRanking();setTimeout(decorateRanking,350);for(const name of ['elara:open','elara:data-changed','elara:hydrate','elara:social-updated','elara:account-ready','elara:privacy-local-changed','elara:profile-saved'])window.addEventListener(name,schedule);window.addEventListener('hashchange',schedule);window.addEventListener('popstate',schedule)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
