/* Route-specific artwork, one consistent full-bleed banner contract. This module never owns application data. */
(()=>{'use strict';
const ROOT='assets/ui/';
const routeArt=Object.freeze({
 home:['homebanner1.webp','خانه'],
 tasks:['task-header-banner-bg.webp','تسک‌ها'],
 language:['language_banner_main.webp','یادگیری زبان'],
 books:['librairy_banner_main.webp','کتابخانه'],
 exercise:['workout_banner_main.webp','ورزش و سلامتی'],
 ranking:['ranking_banner.webp','رتبه‌بندی'],
 social:['36-friends-hero-banner.webp','دوستان'],
 freedom:['41-freedom-hero-banner.webp','آزادی'],
 reports:['39-reports-hero-banner.webp','گزارش‌ها'],
 page:['38-my-page-hero-banner.webp','صفحهٔ من'],
 blog:['weblog_banner_main.webp','وبلاگ'],
 store:[null,'فروشگاه'],
 goals:['goals-target-background.webp','هدف‌ها'],
 habits:['daily-streak-background.webp','عادت‌ها'],
 focus:['banner_moon_lake.webp','تمرکز']
});
const choices={
 home:'.owner-home-hero,.ref-hero,.elara-hero',
 tasks:'.astra-task-hero',
 language:'.feature-hub-hero,.elara-language-hero',
 books:'.feature-hub-hero,.elara-library-hero',
 exercise:'.feature-hub-hero',
 ranking:'.social-page-head,.ranking-hero',
 social:'.social-page-head',
 freedom:'.freedom-hero',
 reports:'.feature-hub-hero',
 page:'.page-hero',
 blog:'.blog-hero',
 store:'.store-hero'
};
let pending=false;
function update(){
 for(const [route,[art,title]] of Object.entries(routeArt)){
  const panel=document.getElementById('panel-'+route);
  if(!panel)continue;
  panel.dataset.elaraBannerPage=route;
  let hero=panel.querySelector('[data-elara-page-hero="'+route+'"]');
  if(!hero)hero=panel.querySelector(choices[route]||'.feature-hub-hero,.elara-hero');
  if(!hero&&route==='social'||!hero&&route==='ranking'){
   hero=panel.querySelector('.social-page-head');
  }
  if(!hero){
   hero=document.createElement('section');
   hero.className='elara-global-hero elara-generated-hero';
   hero.innerHTML='<div><small>ELARA SPACE</small><h1></h1></div>';
   hero.querySelector('h1').textContent=title;
   panel.prepend(hero);
  }
  if(hero.parentElement!==panel)panel.prepend(hero);
  else if(panel.firstElementChild!==hero)panel.prepend(hero);
  if(hero.dataset.elaraPageHero!==route)hero.dataset.elaraPageHero=route;
  if(!hero.classList.contains('elara-global-hero'))hero.classList.add('elara-global-hero');
  // A route owns one primary hero. Legacy hub modules may still mount a
  // second header below it; keep their content but suppress only redundant heroes.
  if(['language','books','ranking','social','blog','page'].includes(route)){
    const selector=choices[route];if(selector){
      panel.querySelectorAll(selector).forEach(candidate=>{
        const redundant=candidate!==hero;
        candidate.classList.toggle('elara-secondary-hero-duplicate',redundant);
        if(redundant)candidate.setAttribute('aria-hidden','true');
        else candidate.removeAttribute('aria-hidden');
      });
    }
  }
  // Store deliberately keeps its existing cosmic artwork and product identity.
  if(art)hero.style.setProperty('--elara-page-art','url("'+ROOT+art+'")');
 }
}
function schedule(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;update()})}
function start(){
 update();window.addEventListener('elara:open',schedule);
 window.addEventListener('hashchange',schedule);
 for(const name of ['elara:hydrate','elara:social-updated','elara:account-ready'])window.addEventListener(name,schedule);
 const main=document.getElementById('main');
 if(main)new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.type==='attributes'&&r.attributeName==='class'))schedule()})
 .observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
window.ElaraGlobalBanners={refresh:schedule,routes:Object.keys(routeArt)};
})();
