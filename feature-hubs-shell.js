/* Route shells registered before ElaraDesign resolves the initial hash. */
(()=>{'use strict';
const routes=[
 'store',
 'library-clips','library-search','library-reports','library-shelves',
 'language-books','language-courses','language-reports',
 'wellness-water','wellness-sleep','wellness-exercise','wellness-weight','wellness-reports','wellness-analysis',
 'focus-pomodoro','focus-ambience','focus-room','focus-deep-work',
 'reports-reading','reports-language','reports-fitness','reports-productivity'
];
function ensure(){
 const main=document.getElementById('main');if(!main)return false;
 for(const route of routes){
  if(document.getElementById('panel-'+route))continue;
  const section=document.createElement('section');
  section.id='panel-'+route;
  section.className='panel hidden elara-deep-route-panel';
  section.dataset.hubRoute=route;
  main.prepend(section);
 }
 return true
}
ensure();
window.ElaraFeatureHubShell={routes:routes.slice(),ensure};
})();