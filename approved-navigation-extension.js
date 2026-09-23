/* Canonical Elara main navigation: one source for mobile bottom nav, desktop dock and complementary sidebar. */
(()=>{'use strict';
const MAIN=Object.freeze([
  Object.freeze({route:'exercise',label:'ورزش',icon:'workout'}),
  Object.freeze({route:'language',label:'زبان',icon:'course'}),
  Object.freeze({route:'tasks',label:'تسک‌ها',icon:'tasks'}),
  Object.freeze({route:'home',label:'خانه',icon:'home'}),
  Object.freeze({route:'ranking',label:'رنکینگ',icon:'ranking'}),
  Object.freeze({route:'books',label:'کتابخانه',icon:'book'}),
  Object.freeze({route:'freedom',label:'آزادی',icon:'freedom'})
]);
const SIDEBAR=MAIN;
const SECONDARY=Object.freeze([Object.freeze({route:'reports',label:'گزارش‌ها',icon:'chart'})]);
const icon=name=>window.ElaraIcons?.icon?.(name)||'<span class="elara-icon" aria-hidden="true"></span>';
function button(def,kind='main'){
  const b=document.createElement('button');
  b.type='button';
  const sidebarKind=kind==='sidebar'||kind==='secondary';
  b.className=sidebarKind?'nav-item elara-nav elara-canonical-sidebar':'elara-extension-nav elara-canonical-main';
  if(kind==='secondary')b.classList.add('elara-sidebar-secondary-item');
  b.dataset.elaraTab=def.route;
  b.dataset.elaraNavKind=kind;
  b.setAttribute('aria-label',def.label);
  b.innerHTML=`${icon(def.icon)}<small>${def.label}</small>`;
  if(def.route==='home')b.classList.add('elara-home-main');
  return b;
}
function renderMainNav(root){
  if(!root)return;
  root.dataset.elaraNavOwner='canonical';
  root.replaceChildren(...MAIN.map(def=>button(def,'main')));
}
function renderSidebar(root){
  if(!root)return;
  root.dataset.elaraNavOwner='canonical';
  const primary=document.createElement('div');primary.className='elara-sidebar-primary';primary.setAttribute('role','group');primary.setAttribute('aria-label','مقصدهای اصلی');primary.append(...SIDEBAR.map(def=>button(def,'sidebar')));
  const secondary=document.createElement('div');secondary.className='elara-sidebar-secondary';secondary.setAttribute('role','group');secondary.setAttribute('aria-label','دسترسی‌های تکمیلی');secondary.append(...SECONDARY.map(def=>button(def,'secondary')));
  root.replaceChildren(primary,secondary);
}
function ensureDock(){
  let dock=document.querySelector('.elara-desktop-dock');
  if(!dock){
    dock=document.createElement('nav');
    dock.className='elara-desktop-dock';
    dock.setAttribute('aria-label','ناوبری اصلی الارا');
    document.body.append(dock);
  }
  return dock;
}
function routeOf(el){return el?.dataset?.elaraTab||''}
function active(){
  const route=location.hash.replace(/^#/,'')||'home';
  document.querySelectorAll('[data-elara-nav-kind]').forEach(el=>{
    const on=routeOf(el)===route;
    el.classList.toggle('active',on);
    if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
  });
}
function render(){
  renderMainNav(document.querySelector('.bottom-nav'));
  renderMainNav(ensureDock());
  renderSidebar(document.querySelector('.sidebar .navigation'));
  const identity=document.querySelector('.identity');
  if(identity)identity.setAttribute('href','#home');
  active();
}
function setup(){
  render();
  window.addEventListener('elara:open',active);
  window.addEventListener('popstate',active);
  window.addEventListener('hashchange',active);
}
window.ElaraNavigation={routes:MAIN,sidebarRoutes:SIDEBAR,secondaryRoutes:SECONDARY,render,renderMainNav,renderSidebar,active};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();