/* Home-only decoration. Canonical navigation owns its own artwork from initial render. */
(()=>{'use strict';
const ROOT='assets/ui/';
function picture(name,cls){const img=document.createElement('img');img.className='elara-art-img '+cls;img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';img.src=ROOT+name;return img}
function friendsHeading(){const heading=document.querySelector('#panel-home .ref-activity > header h2');if(!heading||heading.querySelector('.elara-card-art'))return;const fallback=heading.querySelector('.elara-icon'),img=picture('friends-group-icon.webp','elara-card-art');img.addEventListener('load',()=>{if(fallback)fallback.hidden=true});img.addEventListener('error',()=>{img.remove();if(fallback)fallback.hidden=false});if(fallback)fallback.before(img);else heading.prepend(img)}
function ranking(){const host=document.getElementById('elara-home-ranks');if(!host)return;const social=window.ElaraSocial,people=[social?.me,...(Array.isArray(social?.friends)?social.friends:[])].filter(Boolean);host.querySelectorAll(':scope > .elara-rank-line').forEach((row,i)=>{row.hidden=i>=3;if(i>=3)return;const uid=row.querySelector('[data-open-profile]')?.dataset.openProfile,person=people.find(x=>x.uid===uid),holder=row.querySelector('.elara-social-avatar');if(!person||!holder||holder.querySelector('img'))return;const source=window.ElaraProfileSystem?.viewModel?.(person,{self:person.uid===social?.me?.uid})?.avatarSrc;if(!source)return;const img=document.createElement('img');img.className='elara-real-rank-avatar';img.alt='';img.src=source;img.addEventListener('error',()=>img.remove());holder.prepend(img)})}
function decorate(){friendsHeading();ranking()}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
function init(){decorate();for(const name of ['elara:open','elara:data-changed','elara:hydrate','elara:social-updated','elara:account-ready','elara:profile-saved'])window.addEventListener(name,schedule)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
