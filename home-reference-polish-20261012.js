/* Home-only replacement for legacy purple quick-link badge images. */
(()=>{'use strict';
const icons={
tasks:'<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 4h6M9 12l2 2 4-4M9 18h6"/>',
language:'<path d="M4 6h12M10 3v3m3 0c-.3 6-3 10-8 12m1-8c1 3 4 6 8 8M15 12l5 9m-2-4h-5"/>',
books:'<path d="M12 21c-2.5-2.5-5.8-3.4-9-3V4c3.5-.4 6.5.4 9 3 2.5-2.6 5.5-3.4 9-3v14c-3.2-.4-6.5.5-9 3ZM12 7v14"/>',
exercise:'<path d="M3 9v6m3-9v12m3-8v4m6-4v4m3-8v12m3-9v6M9 12h6"/>',
social:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 6a3 3 0 0 1 0 6m1 3c2.4 0 4 1.6 4 4v1"/>',
freedom:'<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z"/>'
};
function render(){
 const root=document.getElementById('ref-quick-access');if(!root)return;
 for(const [route,path] of Object.entries(icons)){
  const card=root.querySelector('.ref-quick-'+route),old=card?.querySelector(':scope > .ref-quick-icon');
  if(!old||old.classList.contains('ref-quick-icon--reference'))continue;
  const span=document.createElement('span');span.className='ref-quick-icon ref-quick-icon--reference';
  span.setAttribute('aria-hidden','true');
  span.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
  old.replaceWith(span);
 }
}
let scheduled=false;function refresh(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})}
function start(){
 render();
 const panel=document.getElementById('panel-home');
 if(panel)new MutationObserver(changes=>{
  if(changes.some(c=>[...c.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.ref-quick-access,.ref-quick-access-grid,.ref-quick-card')||n.querySelector?.('.ref-quick-card')))))refresh();
 }).observe(panel,{subtree:true,childList:true});
 for(const name of ['elara:open','elara:hydrate','elara:data-changed','elara:locale-changed'])window.addEventListener(name,refresh);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();