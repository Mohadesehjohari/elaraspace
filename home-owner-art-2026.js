/* Real owner WebP artwork on the canonical Home. No new Home cards or sections. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const asset=name=>'assets/ui/'+name+'.webp';
function heroImage(root){
 let img=root.querySelector(':scope > img.owner-home-hero-image');
 if(img)return;
 img=document.createElement('img');img.className='owner-home-hero-image';
 img.src=asset('homebanner1');img.width=1600;img.height=900;
 img.loading='eager';img.fetchPriority='high';img.decoding='async';img.alt='';img.setAttribute('aria-hidden','true');
 root.prepend(img);
}
function art(node,name,from='#071329bf',to='#061025df'){
 if(!node)return;
 const v='linear-gradient(180deg,'+from+','+to+'),url("'+asset(name)+'")';
 if(node.style.getPropertyValue('background-image')!==v)node.style.setProperty('background-image',v,'important');
 if(node.style.getPropertyValue('background-size')!=='cover')node.style.setProperty('background-size','cover','important');
 if(node.style.getPropertyValue('background-position')!=='center')node.style.setProperty('background-position','center','important');
 if(node.style.getPropertyValue('background-repeat')!=='no-repeat')node.style.setProperty('background-repeat','no-repeat','important');
}
function decorate(){
 const panel=$('panel-home');if(!panel)return;
 panel.classList.add('owner-art-home');
 const hero=panel.querySelector('.elara-hero');
 if(hero){hero.classList.add('owner-home-hero');heroImage(hero)}
 const streak=$('ref-streak-card');
 if(streak){streak.classList.add('owner-home-streak');art(streak,'daily-streak-background','#100b1c40','#11112372')}
 const tasks=$('elara-home-tasks')?.closest('.elara-card');
 if(tasks){tasks.classList.add('owner-home-tasks');art(tasks,'tasks-card-background','#041a36c9','#061228df')}
 const goals=$('elara-home-goals')?.closest('.elara-card');
 if(goals){
  goals.classList.add('owner-home-goals');art(goals,'goals-target-background','#06102735','#0610238b');
  const title=goals.querySelector(':scope > header h2');
  if(title&&!title.querySelector('.owner-home-goal-icon')){
   const img=document.createElement('img');img.className='owner-home-goal-icon';
   img.src=asset('my-goals-icon');img.alt='';img.width=33;img.height=33;img.loading='lazy';title.prepend(img);
  }
 }
 const wellness=$('ref-wellness-card');
 if(wellness){wellness.classList.add('owner-home-wellness');art(wellness,'health-fitness-card-background','#05202e9c','#051b29b5')}
 const ranking=$('elara-home-ranks')?.closest('.ref-ranks');
 if(ranking){ranking.classList.add('owner-home-ranking');art(ranking,'friends-ranking-bg')}
 for(const [route,name] of [['tasks','tasks-card-background'],['language','language-learning-background'],['books','library-card-background'],['exercise','health-fitness-card-background'],['social','friends-card-bg'],['freedom','freedom-card-bg']])
  art(panel.querySelector('.ref-quick-'+route),name,'#070b1f28','#071029a2');
 // Honor the canonical Home's intentionally hidden cards. CSS elsewhere uses
 // !important display rules which otherwise create phantom grid tracks.
 for(const node of panel.querySelectorAll('.ref-home-grid > [hidden], #ref-bottom-grid > [hidden]'))
  if(node.style.getPropertyValue('display')!=='none')node.style.setProperty('display','none','important');
 $('owner-home-summaries')?.remove();
 panel.querySelector('.owner-home-daily')?.remove();
 $('ref-home-quote-card')?.remove();
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})}
for(const event of ['elara:open','elara:hydrate','elara:data-changed','elara:account-ready','elara:profile-saved','elara:locale-changed','resize'])addEventListener(event,schedule);
function start(){schedule();const root=$('panel-home');if(root)new MutationObserver(records=>{if(records.some(x=>x.addedNodes.length))schedule()}).observe(root,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ElaraOwnerHomeArtwork={refresh:schedule,assets:Object.freeze({hero:asset('homebanner1'),streak:asset('daily-streak-background'),tasks:asset('tasks-card-background'),wellness:asset('health-fitness-card-background'),goals:asset('goals-target-background'),language:asset('language-learning-background'),library:asset('library-card-background'),friends:asset('friends-card-bg'),ranking:asset('friends-ranking-bg')})};
})();
