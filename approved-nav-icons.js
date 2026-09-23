/* Approved five-item mobile navigation: icons only; existing routing and account drawer stay intact. */
(()=>{'use strict';
const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 tasks:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
 language:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-4 6-4 9s1 6 4 9m0-18c3 3 4 6 4 9s-1 6-4 9"/>',
 books:'<path d="M12 6c-3-2-6-3-10-2v15c4-1 7 0 10 2m0-15c3-2 6-3 10-2v15c-4-1-7 0-10 2M12 6v15"/>',
 ranking:'<path d="M7 4h10v6a5 5 0 0 1-10 0V4zM7 6H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v4m-5 2h10m-8-2h6"/>'
};
const labels={home:'خانه',tasks:'تسک‌ها',language:'زبان',books:'کتابخانه',ranking:'رنکینگ'};
function paint(){const nav=document.querySelector('.bottom-nav');if(!nav)return;
 for(const [key,path] of Object.entries(paths)){const button=nav.querySelector(`[data-elara-tab="${key}"]`);if(!button)continue;const mark=button.querySelector('span');if(!mark||mark.dataset.approvedIcon===key)continue;mark.dataset.approvedIcon=key;mark.innerHTML=`<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;button.setAttribute('aria-label',labels[key]);}
}
function setup(){const nav=document.querySelector('.bottom-nav');if(!nav)return;paint();new MutationObserver(paint).observe(nav,{childList:true});window.addEventListener('elara:open',paint)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();