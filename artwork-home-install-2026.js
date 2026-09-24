/* 2026-09-24 Checkpoint A: artwork presentation only; existing Home and navigation own their DOM and data. */
(()=>{'use strict';
const DIR='assets/ui/';
const NAV=Object.freeze({
 home:['nav-home-default.webp','nav-home-active.webp'],
 tasks:['nav-tasks-default.webp','nav-tasks-active.webp'],
 language:['nav-language-default.webp','nav-language-active.webp'],
 books:['nav-library-default.webp','nav-library-active.webp'],
 ranking:['nav-ranking-default.webp','nav-ranking-active.webp'],
 exercise:['nav-exercise-default.webp','nav-exercise-active.webp'],
 social:['friends-tab.webp','friends-tab.webp']
});
const art=(file,kind)=>{const img=document.createElement('img');img.className='elara-art-img '+kind;img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';img.src=DIR+file;return img};
function navState(button){
 const pair=NAV[button.dataset.elaraTab],img=button.querySelector(':scope > .elara-nav-art');if(!pair||!img)return;
 const selected=button.classList.contains('active')||button.getAttribute('aria-current')==='page';
 const preview=button.matches(':hover,:focus-visible')||button.contains(document.activeElement);
 const file=pair[selected||preview?1:0];if(img.dataset.file!==file){img.dataset.file=file;img.src=DIR+file}
 button.classList.toggle('elara-art-selected',selected);
}
function decorateNavigation(){
 document.querySelectorAll('.bottom-nav [data-elara-nav-kind="main"],.sidebar .navigation [data-elara-nav-kind="sidebar"]').forEach(button=>{
  if(!NAV[button.dataset.elaraTab])return;
  let img=button.querySelector(':scope > .elara-nav-art');
  if(!img){img=art(NAV[button.dataset.elaraTab][0],'elara-nav-art');const previous=button.querySelector(':scope > .elara-icon');if(previous)previous.before(img);else button.prepend(img);
   img.addEventListener('error',()=>{button.classList.remove('elara-nav-has-art');img.hidden=true});
   img.addEventListener('load',()=>{img.hidden=false;button.classList.add('elara-nav-has-art')});
   for(const type of ['pointerenter','pointerleave','focusin','focusout'])button.addEventListener(type,()=>navState(button));
  }
  navState(button);
 });
}
const HOME_HEADERS=[
 ['.ref-tasks','nav-tasks-default.webp'],
 ['.ref-habits','icon-habits-sprout.webp'],
 ['.ref-wellness-card','icon-wellness-heartbeat.webp'],
 ['.ref-ranks','icon-ranking-trophy.webp'],
 ['.ref-activity','friends-group-icon.webp']
];
function decorateHeader(cardSelector,file){
 const heading=document.querySelector('#panel-home '+cardSelector+' > header h2');if(!heading)return;
 const old=heading.querySelector('.elara-icon');if(!old)return;
 const img=art(file,'elara-card-art');img.addEventListener('error',()=>{img.remove();old.hidden=false});old.hidden=true;old.before(img);
}
function decorateWellness(){
 const cells=document.querySelectorAll('#panel-home .ref-wellness-summaries > .ref-wellness-cell');
 const files=['icon-wellness-water.webp','icon-night-crescent-moon.webp','icon-exercise-dumbbell.webp'];
 files.forEach((file,i)=>{const cell=cells[i],slot=cell?.querySelector(':scope > span');if(!slot||slot.querySelector('.elara-wellness-art'))return;
  const fallback=slot.querySelector('.elara-icon'),img=art(file,'elara-wellness-art');img.addEventListener('error',()=>{img.remove();if(fallback)fallback.hidden=false});if(fallback)fallback.hidden=true;slot.prepend(img);
 });
}
function decorateRanking(){
 const host=document.getElementById('elara-home-ranks');if(!host)return;
 const social=window.ElaraSocial,persons=[social?.me,...(Array.isArray(social?.friends)?social.friends:[])].filter(Boolean);
 host.querySelectorAll(':scope > .elara-rank-line').forEach((row,index)=>{
  row.hidden=index>=3;
  if(index>=3)return;
  const target=row.querySelector('[data-open-profile]')?.dataset.openProfile;
  const person=persons.find(p=>p.uid===target);if(!person)return;
  const avatar=window.ElaraProfileSystem?.viewModel?.(person,{self:person.uid===social?.me?.uid})?.avatarSrc;
  const holder=row.querySelector('.elara-social-avatar');if(!avatar||!holder||holder.querySelector('img'))return;
  const img=document.createElement('img');img.className='elara-real-rank-avatar';img.alt='';img.decoding='async';img.src=avatar;
  img.addEventListener('error',()=>img.remove());holder.prepend(img);
 });
}
function decorateHome(){for(const [selector,file] of HOME_HEADERS)decorateHeader(selector,file);decorateWellness();decorateRanking()}
function decorate(){decorateNavigation();decorateHome()}
let queued=false;function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;decorate()},160)}
function init(){decorate();setTimeout(decorate,350);for(const name of ['elara:open','elara:data-changed','elara:hydrate','elara:social-updated','elara:account-ready','elara:privacy-local-changed','elara:profile-saved'])window.addEventListener(name,schedule);window.addEventListener('hashchange',schedule);window.addEventListener('popstate',schedule)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
