/* Shared Elara icon language: one renderer for Home, Language, Drawer, Wellness and Social UI. */
(()=>{'use strict';
const paths={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  tasks:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 12 2.5 2.5L16.5 8"/>',
  habits:'<path d="M19 4c-7 .2-12.5 3.8-13.5 10.6C9 12 12.3 9.8 17 8c-4 2.5-6.8 5.5-8.2 9.2"/><path d="M8.8 17.2c2.7.4 6.7-.6 8.5-4.5C18.5 10 19 7 19 4"/>',
  goals:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m14 10 6-6M16 4h4v4"/>',
  focus:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  missions:'<path d="M14 4c3-1 5-1 6-1 0 1 0 3-1.8 5.8L13 14l-4-4 5-6z"/><path d="m9 10-4 1-2 3 5 1m5-1 1 5 3-2 1-4M8 16l-3 3"/>',
  ranking:'<path d="M7 4h10v6a5 5 0 0 1-10 0V4zM7 6H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v4m-5 2h10"/>',
  friends:'<path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6"/><path d="M2 21c0-4 2.5-7 6-7s6 3 6 7m1-7c3 0 5 2.5 5 6"/>',
  book:'<path d="M12 6C9 4 6 3 2 4v15c4-1 7 0 10 2m0-15c3-2 6-3 10-2v15c-4-1-7 0-10 2M12 6v15"/>',
  brain:'<path d="M9 5a3 3 0 0 0-5 2.2A3.5 3.5 0 0 0 5 14a3 3 0 0 0 4 4m6-13a3 3 0 0 1 5 2.2A3.5 3.5 0 0 1 19 14a3 3 0 0 1-4 4M9 5v14m6-14v14M6 9h3m6 0h3M6 15h3m6 0h3"/>',
  chart:'<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/><path d="m4 15 5-4 4 2 6-6"/>',
  course:'<path d="m2 8 10-5 10 5-10 5L2 8z"/><path d="M6 10v6c3 2 9 2 12 0v-6"/>',
  activity:'<path d="M4 13h3l2-6 4 12 2-6h5"/>',
  shield:'<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3z"/><path d="m9 12 2 2 4-5"/>',
  wardrobe:'<path d="M12 6a2 2 0 1 0-2-2"/><path d="m12 6-8 7h16l-8-7zM4 13v7h16v-7"/>',
  water:'<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/><path d="M9 15c.6 1.3 1.6 2 3 2"/>',
  sleep:'<path d="M20 15.2A8 8 0 1 1 8.8 4 6.8 6.8 0 0 0 20 15.2Z"/>',
  workout:'<path d="M6 7h2m8 0h2M4 5v4m4-5v6m8-6v6m4-5v4M8 7h8M5 17c3-3 5-2 7 0s4 3 7-1"/>',
  cycle:'<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
  lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  spark:'<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 8"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2.1-.7a7 7 0 0 0-.8-1.9l1-2-2.1-2.1-2 1a7 7 0 0 0-1.9-.8L10.5 2h-3l-.7 2.1a7 7 0 0 0-1.9.8l-2-1L.8 6l1 2a7 7 0 0 0-.8 1.9L-1 10.5v3l2.1.7a7 7 0 0 0 .8 1.9l-1 2L3 20.2l2-1a7 7 0 0 0 1.9.8l.7 2.1h3l.7-2.1a7 7 0 0 0 1.9-.8l2 1 2.1-2.1-1-2a7 7 0 0 0 .8-1.9z" transform="translate(2 0) scale(.83)"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  notification:'<path d="M6 9a6 6 0 0 1 12 0v4l2 3H4l2-3V9z"/><path d="M10 20h4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-1.3 1.2-2 1.5-2 3M12 17h.01"/>',
  logout:'<path d="M10 5H5v14h5M13 8l4 4-4 4m4-4H9"/>',
  folder:'<path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>',
  freedom:'<path d="M3 18 9 9l4 4 8-10M3 21h18M9 9l2-6 2 5"/>'
};
const assets={flame:'assets/icon-flame.png',brain:'assets/icon-brain.png',book3d:'assets/icon-book.png',friends3d:'assets/icon-friends.png',trophy3d:'assets/icon-trophy.png',rocket3d:'assets/icon-rocket.png',leaf3d:'assets/icon-leaf.png'};
function icon(name,opt={}){
  const cls=['elara-icon',opt.className||''].filter(Boolean).join(' ');
  if(assets[name])return `<span class="${cls} elara-icon-image" aria-hidden="true"><img src="${assets[name]}" alt=""></span>`;
  return `<span class="${cls}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.activity}</g></svg></span>`;
}
function badge(name,label){return `<span class="elara-icon-label">${icon(name)}<span>${String(label??'')}</span></span>`}
function hydrate(root=document){
  root.querySelectorAll?.('[data-elara-icon]').forEach(el=>{
    const name=el.dataset.elaraIcon;
    if(!name||el.dataset.elaraIconReady==='yes')return;
    el.innerHTML=icon(name);
    el.dataset.elaraIconReady='yes';
  });
}
window.ElaraIcons={icon,badge,hydrate,paths,assets};
hydrate();
})();