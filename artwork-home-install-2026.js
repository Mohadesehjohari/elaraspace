/* Home-only decoration. Canonical navigation owns its own artwork from initial render. */
(()=>{'use strict';
const ROOT='assets/ui/';
function picture(name,cls){const img=document.createElement('img');img.className='elara-art-img '+cls;img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';img.src=ROOT+name;return img}
function cardHeadingArt(selector,filename,extra=''){const heading=document.querySelector(selector);if(!heading||heading.querySelector('.elara-card-art'))return;const fallback=heading.querySelector('.elara-icon'),img=picture(filename,'elara-card-art '+extra);img.addEventListener('load',()=>{if(fallback)fallback.hidden=true});img.addEventListener('error',()=>{img.remove();if(fallback)fallback.hidden=false});if(fallback)fallback.before(img);else heading.prepend(img)}
function headingArtwork(){cardHeadingArt('#panel-home .ref-tasks > header h2','nav-tasks-default.webp','ref-tasks-heading-art');cardHeadingArt('#panel-home .ref-ranks > header h2','icon-ranking-trophy.webp','ref-ranking-heading-art');cardHeadingArt('#panel-home .ref-activity > header h2','friends-group-icon.webp','ref-friends-heading-art')}
/* Reference Home regenerates innerHTML on navigation. Reuse already-decoded decorative nodes to prevent art flash. */
const durable={flame:null,rocket:null};
function keepDecoded(key,selector){const live=document.querySelector(selector);if(!live)return;const saved=durable[key];
 if(saved&&saved!==live&&!saved.isConnected&&saved.complete&&saved.naturalWidth){live.replaceWith(saved);return}
 if(live.complete&&live.naturalWidth){durable[key]=live;return}
 if(live.dataset.elaraKeepDecoded)return;live.dataset.elaraKeepDecoded='1';live.addEventListener('load',()=>{if(!durable[key]||!durable[key].isConnected)durable[key]=live},{once:true});
}
function ranking(){const host=document.getElementById('elara-home-ranks');if(!host)return;const social=window.ElaraSocial,people=[social?.me,...(Array.isArray(social?.friends)?social.friends:[])].filter(Boolean);host.querySelectorAll(':scope > .elara-rank-line').forEach((row,i)=>{row.hidden=i>=3;if(i>=3)return;const uid=row.querySelector('[data-open-profile]')?.dataset.openProfile,person=people.find(x=>x.uid===uid),holder=row.querySelector('.elara-social-avatar');if(!person||!holder||holder.querySelector('img'))return;const source=window.ElaraProfileSystem?.viewModel?.(person,{self:person.uid===social?.me?.uid})?.avatarSrc;if(!source)return;const img=document.createElement('img');img.className='elara-real-rank-avatar';img.alt='';img.src=source;img.addEventListener('error',()=>img.remove());holder.prepend(img)})}
function decorate(){keepDecoded('flame','#ref-streak-card .ref-streak-flame');keepDecoded('rocket','#panel-home .ref-missions-art');headingArtwork();ranking()}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
function init(){decorate();for(const name of ['elara:open','elara:data-changed','elara:hydrate','elara:social-updated','elara:account-ready','elara:profile-saved'])window.addEventListener(name,schedule)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
