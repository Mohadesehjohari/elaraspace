/* Canonical navigation owns routes, initial artwork and image state. */
(()=>{'use strict';
const MAIN=Object.freeze([
 {route:'exercise',label:'ورزش',icon:'workout'},
 {route:'language',label:'زبان',icon:'course'},
 {route:'tasks',label:'تسک‌ها',icon:'tasks'},
 {route:'home',label:'خانه',icon:'home'},
 {route:'ranking',label:'رنکینگ',icon:'ranking'},
 {route:'books',label:'کتابخانه',icon:'book'},
 {route:'freedom',label:'آزادی',icon:'freedom'}
]);
const FRIEND=Object.freeze({route:'social',label:'دوستان',icon:'friends'});
const MOBILE=Object.freeze([...MAIN.slice(0,5),FRIEND,...MAIN.slice(5)]);
const SIDEBAR=Object.freeze([...MAIN,FRIEND]);
const DESKTOP_ORDER=Object.freeze(['home','tasks','language','books','exercise','ranking','social','freedom']);
const SECONDARY=Object.freeze([{route:'reports',label:'گزارش‌ها',icon:'chart'}]);
/* Navigation artwork is sourced only from files verified on the current main branch. */
const ASSETS=Object.freeze({home:['nav-home-default.webp','nav-home-active.webp'],tasks:['nav-tasks-default.webp','nav-tasks-active.webp'],language:['nav-language-default.webp','nav-language-active.webp'],books:['nav-library-default.webp','nav-library-active.webp'],ranking:['nav-ranking-default.webp','nav-ranking-active.webp'],exercise:['nav-exercise-default.webp','nav-exercise-active.webp'],social:['friends-group-icon.webp','friends-group-icon.webp']});
const root='assets/ui/';
const fallback=n=>window.ElaraIcons?.icon?.(n)||'<span class="elara-icon" aria-hidden="true"></span>';
let current=(location.hash.replace(/^#/,'')||'home');
function artworkState(button){
 const pair=ASSETS[button.dataset.elaraTab],img=button.querySelector(':scope > .elara-nav-art');if(!pair||!img)return;
 const selected=button.dataset.elaraTab===current,hover=!matchMedia('(hover:none)').matches&&(button.matches(':hover')||button.matches(':focus-visible'));
 const filename=pair[selected||hover?1:0];button.classList.toggle('elara-art-selected',selected);
 if(img.dataset.file===filename)return;
 /* Route state is synchronous; boot preloads both states so the bitmap swap does not lag aria-current. */
 img.dataset.file=filename;img.src=root+filename;img.hidden=false;button.classList.add('elara-nav-has-art');
}
function button(def,kind='main'){
 const b=document.createElement('button');b.type='button';const side=kind==='sidebar'||kind==='secondary';
 b.className=side?'nav-item elara-nav elara-canonical-sidebar':'elara-extension-nav elara-canonical-main';
 if(kind==='secondary')b.classList.add('elara-sidebar-secondary-item');
 b.dataset.elaraTab=def.route;b.dataset.elaraNavKind=kind;b.setAttribute('aria-label',def.label);
 const pair=ASSETS[def.route],isSelected=def.route===current;
 const image=pair?`<img class="elara-art-img elara-nav-art" src="${root+pair[isSelected?1:0]}" data-file="${pair[isSelected?1:0]}" alt="" aria-hidden="true" width="40" height="40" decoding="async" loading="eager">`:'';
 b.innerHTML=`${image}${fallback(def.icon)}<small>${def.label}</small>`;
 if(pair){b.classList.add('elara-nav-has-art');const img=b.querySelector('.elara-nav-art');img.addEventListener('load',()=>{img.hidden=false;b.classList.add('elara-nav-has-art')});img.addEventListener('error',()=>{img.hidden=true;b.classList.remove('elara-nav-has-art')});for(const name of ['pointerenter','pointerleave','focusin','focusout'])b.addEventListener(name,()=>artworkState(b));}
 if(isSelected){b.classList.add('active');b.setAttribute('aria-current','page')};if(def.route==='home')b.classList.add('elara-home-main');return b;
}
const same=(host,definitions)=>host?.dataset.elaraNavOwner==='canonical'&&host.querySelectorAll('[data-elara-nav-kind]').length===definitions.length&&[...host.querySelectorAll('[data-elara-nav-kind]')].every((el,i)=>el.dataset.elaraTab===definitions[i].route);
function renderMainNav(host){if(!host)return;const defs=host.classList.contains('bottom-nav')?MOBILE:MAIN;if(same(host,defs))return;host.dataset.elaraNavOwner='canonical';host.replaceChildren(...defs.map(def=>button(def,'main')))}
function renderSidebar(host){if(!host)return;const defs=[...DESKTOP_ORDER.map(route=>SIDEBAR.find(def=>def.route===route)).filter(Boolean),...SECONDARY];if(same(host,defs))return;host.dataset.elaraNavOwner='canonical';const primary=document.createElement('div');primary.className='elara-sidebar-primary';primary.setAttribute('role','group');primary.setAttribute('aria-label','مقصدهای اصلی');primary.append(...DESKTOP_ORDER.map(route=>SIDEBAR.find(def=>def.route===route)).filter(Boolean).map(def=>button(def,'sidebar')));const secondary=document.createElement('div');secondary.className='elara-sidebar-secondary';secondary.setAttribute('role','group');secondary.setAttribute('aria-label','دسترسی‌های تکمیلی');secondary.append(...SECONDARY.map(def=>button(def,'secondary')));host.replaceChildren(primary,secondary)}
function ensureDock(){let dock=document.querySelector('.elara-desktop-dock');if(!dock){dock=document.createElement('nav');dock.className='elara-desktop-dock';dock.setAttribute('aria-label','ناوبری اصلی الارا');(document.querySelector('.shell')||document.body).append(dock)}return dock}
function active(event){current=event?.detail?.tab||location.hash.replace(/^#/,'')||'home';document.querySelectorAll('[data-elara-nav-kind]').forEach(el=>{const selected=el.dataset.elaraTab===current;el.classList.toggle('active',selected);if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');artworkState(el)})}
function render(){current=location.hash.replace(/^#/,'')||current||'home';renderMainNav(document.querySelector('.bottom-nav'));renderMainNav(ensureDock());renderSidebar(document.querySelector('.sidebar .navigation'));document.querySelector('.identity')?.setAttribute('href','#home');active()}
function setup(){render();window.addEventListener('elara:open',active);window.addEventListener('popstate',active);window.addEventListener('hashchange',active)}
window.ElaraNavigation={routes:MAIN,mobileRoutes:MOBILE,sidebarRoutes:SIDEBAR,desktopOrder:DESKTOP_ORDER,secondaryRoutes:SECONDARY,render,renderMainNav,renderSidebar,active};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
