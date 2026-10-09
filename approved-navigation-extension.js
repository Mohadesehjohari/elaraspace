/* Canonical navigation owns routes, initial artwork and image state. */
(()=>{'use strict';
const MAIN=Object.freeze([
 {route:'exercise',label:'ورزش و سلامتی',icon:'workout'},
 {route:'language',label:'زبان',icon:'course'},
 {route:'tasks',label:'تسک‌ها',icon:'tasks'},
 {route:'home',label:'خانه',icon:'home'},
 {route:'ranking',label:'رتبه‌بندی',icon:'ranking'},
 {route:'books',label:'کتابخانه',icon:'book'},
 {route:'freedom',label:'آزادی',icon:'spark'}
]);
const FRIEND=Object.freeze({route:'social',label:'دوستان',icon:'friends'});
const PAGE=Object.freeze({route:'page',label:'صفحه من',icon:'user'});
const BLOG=Object.freeze({route:'blog',label:'وبلاگ',icon:'book'});
const STORE=Object.freeze({route:'store',label:'فروشگاه',icon:'spark'});
/* Five comfortable primary destinations; the other *real* routes remain
   available through an accessible secondary popover. */
const MORE=Object.freeze({route:'more',label:'بیشتر',icon:'menu'});
const MOBILE=Object.freeze([MAIN[6],FRIEND,MAIN[3],MAIN[5],MORE]);
const MOBILE_EXTRA=Object.freeze([MAIN[2],MAIN[1],MAIN[0],MAIN[4],PAGE,BLOG,STORE,{route:'reports',label:'گزارش‌ها',icon:'chart'}]);
const SIDEBAR=Object.freeze([...MAIN,FRIEND]);
const DESKTOP_ORDER=Object.freeze(['home','tasks','language','books','exercise','ranking','social','freedom']);
const SECONDARY=Object.freeze([{route:'reports',label:'گزارش‌ها',icon:'chart'},PAGE,BLOG,STORE]);
/* Navigation artwork is sourced only from files verified on the current main branch. */
const ASSETS=Object.freeze({
 home:['nav-home-default.webp','nav-home-active.webp'],
 tasks:['nav-tasks-default.webp','nav-tasks-active.webp'],
 language:['nav-language-default.webp','nav-language-active.webp'],
 books:['nav-library-default.webp','nav-library-active.webp'],
 ranking:['nav-ranking-default.webp','nav-ranking-active.webp'],
 exercise:['nav-exercise-default.webp','nav-exercise-active.webp'],
 social:['friends_normal.webp','friend_active.webp'],
 freedom:['13-freedom-nav-default.webp','14-freedom-nav-active.webp'],
 reports:['05-reports-nav-default.webp','06-reports-nav-active.webp'],
 store:['15-store-nav-default.webp','16-store-nav-active.webp']
});
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
function button(def,kind='main',existing=null){
 const side=kind==='sidebar'||kind==='secondary',b=existing||document.createElement(side?'button':'a');
 if(side||def.route==='more'){b.type='button';b.removeAttribute('href')}else b.href='#'+def.route;
 b.className=side?'nav-item elara-nav elara-canonical-sidebar':'elara-extension-nav elara-canonical-main';
 if(kind==='secondary')b.classList.add('elara-sidebar-secondary-item');
 b.dataset.elaraTab=def.route;b.dataset.elaraNavKind=kind;b.setAttribute('aria-label',def.label);
 /* The flat vector set already shipped with Elara is the closest match to the owner's clean cyan/white desktop sidebar. Keep WebP artwork for main/mobile navigation. */
  const pair=side?null:ASSETS[def.route],isSelected=def.route===current;
 const image=pair?`<img class="elara-art-img elara-nav-art" src="${root+pair[isSelected?1:0]}" data-file="${pair[isSelected?1:0]}" alt="" aria-hidden="true" width="40" height="40" decoding="async" loading="eager">`:'';
 b.innerHTML=`${image}${def.route==='more'?'<span class="elara-more-nav-icon" aria-hidden="true">☰</span>':fallback(def.icon)}<small>${def.label}</small>`;
 if(def.route==='more'){b.setAttribute('aria-controls','elara-mobile-more-panel');b.setAttribute('aria-expanded','false');b.addEventListener('click',toggleMobileMore)}
 if(pair){b.classList.add('elara-nav-has-art');const img=b.querySelector('.elara-nav-art');img.onload=()=>{img.hidden=false;b.classList.add('elara-nav-has-art')};img.onerror=()=>{img.hidden=true;b.classList.remove('elara-nav-has-art')};for(const name of ['pointerenter','pointerleave','focusin','focusout'])b['on'+name]=()=>artworkState(b)}
 if(isSelected){b.classList.add('active');b.setAttribute('aria-current','page')}else{b.classList.remove('active');b.removeAttribute('aria-current')}
 b.classList.toggle('elara-home-main',def.route==='home');return b
}
const same=(host,definitions)=>host?.dataset.elaraNavOwner==='canonical'&&host.querySelectorAll('[data-elara-nav-kind]').length===definitions.length&&[...host.querySelectorAll('[data-elara-nav-kind]')].every((el,i)=>el.dataset.elaraTab===definitions[i].route);
function renderMainNav(host){
 if(!host)return;const defs=host.classList.contains('bottom-nav')?MOBILE:MAIN;if(same(host,defs))return;
 const existing=new Map([...host.querySelectorAll('[data-elara-tab]')].map(el=>[el.dataset.elaraTab,el]));
 const keep=new Set(),nodes=defs.map(def=>{const node=button(def,'main',existing.get(def.route)||null);keep.add(node);return node});
 nodes.forEach(node=>host.append(node));
 [...host.children].forEach(node=>{if(node.matches?.('[data-elara-nav-kind]')&&!keep.has(node))node.remove()});
 host.dataset.elaraNavOwner='canonical'
}
function renderSidebar(host){if(!host)return;const defs=[...DESKTOP_ORDER.map(route=>SIDEBAR.find(def=>def.route===route)).filter(Boolean),...SECONDARY];if(same(host,defs))return;host.dataset.elaraNavOwner='canonical';const primary=document.createElement('div');primary.className='elara-sidebar-primary';primary.setAttribute('role','group');primary.setAttribute('aria-label','مقصدهای اصلی');primary.append(...DESKTOP_ORDER.map(route=>SIDEBAR.find(def=>def.route===route)).filter(Boolean).map(def=>button(def,'sidebar')));const secondary=document.createElement('div');secondary.className='elara-sidebar-secondary';secondary.setAttribute('role','group');secondary.setAttribute('aria-label','دسترسی‌های تکمیلی');secondary.append(...SECONDARY.map(def=>button(def,'secondary')));host.replaceChildren(primary,secondary)}
/* Secondary navigation is a real accessible popover, not a fictional route.
   Links use existing ElaraOpen semantics, with keyboard/outside dismissal. */
function ensureMobileMore(){
 let panel=document.getElementById('elara-mobile-more-panel');
 if(panel)return panel;
 panel=document.createElement('aside');
 panel.id='elara-mobile-more-panel';
 panel.className='elara-mobile-more-panel';
 panel.setAttribute('aria-label','بخش‌های بیشتر الارا');
 panel.hidden=true;
 panel.innerHTML='<strong>بخش‌های بیشتر</strong><div class="elara-mobile-more-grid">'+
  MOBILE_EXTRA.map(x=>'<button type="button" data-more-route="'+x.route+'">'+x.label+'</button>').join('')+'</div>';
 document.body.append(panel);
 panel.addEventListener('click',e=>{
  const item=e.target.closest('[data-more-route]');if(!item)return;
  const route=item.dataset.moreRoute;closeMobileMore();window.ElaraOpen?.(route);
 });
 document.addEventListener('pointerdown',e=>{
  if(panel.hidden||panel.contains(e.target)||e.target.closest('.bottom-nav [data-elara-tab="more"]'))return;
  closeMobileMore()
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!panel.hidden){closeMobileMore();document.querySelector('.bottom-nav [data-elara-tab="more"]')?.focus()}
 });
 return panel;
}
function closeMobileMore(){
 const panel=document.getElementById('elara-mobile-more-panel');
 if(panel)panel.hidden=true;
 document.querySelector('.bottom-nav [data-elara-tab="more"]')?.setAttribute('aria-expanded','false');
}
function toggleMobileMore(){
 const panel=ensureMobileMore(),open=panel.hidden;
 panel.hidden=!open;
 document.querySelector('.bottom-nav [data-elara-tab="more"]')?.setAttribute('aria-expanded',String(open));
 if(open)panel.querySelector('button')?.focus()
}
function ensureDock(){let dock=document.querySelector('.elara-desktop-dock');if(!dock){dock=document.createElement('nav');dock.className='elara-desktop-dock';dock.setAttribute('aria-label','ناوبری اصلی الارا');(document.querySelector('.shell')||document.body).append(dock)}return dock}
function active(event){current=event?.detail?.tab||location.hash.replace(/^#/,'')||'home';closeMobileMore();document.querySelectorAll('[data-elara-nav-kind]').forEach(el=>{const selected=el.dataset.elaraTab===current||(el.dataset.elaraTab==='more'&&!MOBILE.some(x=>x.route===current));el.classList.toggle('active',selected);if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');artworkState(el)})}
function render(){current=location.hash.replace(/^#/,'')||current||'home';renderMainNav(document.querySelector('.bottom-nav'));renderMainNav(ensureDock());renderSidebar(document.querySelector('.sidebar .navigation'));document.querySelector('.identity')?.setAttribute('href','#home');active()}
function setup(){render();window.addEventListener('elara:open',active);window.addEventListener('popstate',active);window.addEventListener('hashchange',active)}
window.ElaraNavigation={routes:MAIN,mobileRoutes:MOBILE,sidebarRoutes:SIDEBAR,desktopOrder:DESKTOP_ORDER,secondaryRoutes:SECONDARY,render,renderMainNav,renderSidebar,active};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
