(()=>{'use strict';
const MOBILE='(max-width:700px)',PRESS_MS=620,REVEAL_MS=4800,AUTO_MS=4600;
const specs=[
 ['#panel-home .ref-hero',['.hero-copy','.ref-hero-quote']],
 ['#panel-tasks .astra-task-hero',[':scope>div',':scope>blockquote']],
 ['#panel-language .elara-language-hero',['.language-hero-copy',':scope>blockquote']],
 ['#panel-books .library-hero',[':scope>div',':scope>blockquote']],
 ['#panel-freedom .freedom-hero',['.freedom-hero-copy']]
];
const wired=new WeakSet(),initialised=new WeakSet(),timers=new WeakMap(),presses=new WeakMap();
const mobile=()=>matchMedia(MOBILE).matches;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function clearTimer(hero){const id=timers.get(hero);if(id)clearTimeout(id);timers.delete(hero)}
function collapse(hero){if(!hero||!mobile()||reduced())return false;hero.classList.add('is-copy-collapsed');hero.setAttribute('data-mobile-copy-state','collapsed');return true}
function reveal(hero,duration=REVEAL_MS){if(!hero)return false;clearTimer(hero);hero.classList.remove('is-copy-collapsed');hero.setAttribute('data-mobile-copy-state','visible');if(mobile()&&!reduced()&&duration>0)timers.set(hero,setTimeout(()=>collapse(hero),duration));return true}
function targets(hero,selectors){const out=[];for(const sel of selectors){try{const el=hero.querySelector(sel);if(el)out.push(el)}catch{}}return out}
function cancelPress(hero){const p=presses.get(hero);if(p?.timer)clearTimeout(p.timer);presses.delete(hero)}
function wire(hero,selectors){
 hero.classList.add('elara-mobile-banner');hero.dataset.mobileBanner='';for(const el of targets(hero,selectors))el.classList.add('elara-mobile-banner-copy-target');
 if(wired.has(hero))return;wired.add(hero);
 hero.addEventListener('pointerdown',e=>{if(!mobile()||e.button>0)return;cancelPress(hero);const start={x:e.clientX,y:e.clientY,fired:false};start.timer=setTimeout(()=>{start.fired=true;reveal(hero)},PRESS_MS);presses.set(hero,start)},{passive:true});
 hero.addEventListener('pointermove',e=>{const p=presses.get(hero);if(!p)return;if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>10)cancelPress(hero)},{passive:true});
 for(const type of ['pointerup','pointercancel','pointerleave'])hero.addEventListener(type,()=>cancelPress(hero),{passive:true});
 hero.addEventListener('focusin',()=>reveal(hero));
}
function refresh(){
 for(const [selector,children] of specs){for(const hero of document.querySelectorAll(selector)){wire(hero,children);if(!mobile()){clearTimer(hero);hero.classList.remove('is-copy-collapsed');hero.dataset.mobileCopyState='desktop';continue}if(!initialised.has(hero)){initialised.add(hero);reveal(hero,reduced()?0:AUTO_MS)}}}
}
function collapseAll(){if(!mobile())return 0;let n=0;for(const [selector] of specs)for(const hero of document.querySelectorAll(selector))if(collapse(hero))n++;return n}
function revealAll(duration=REVEAL_MS){let n=0;for(const [selector] of specs)for(const hero of document.querySelectorAll(selector)){reveal(hero,duration);n++}return n}
const later=()=>setTimeout(refresh,80);
for(const ev of ['hashchange','elara:open','elara:locale-changed','elara:boot-watchdog'])window.addEventListener(ev,later);
matchMedia(MOBILE).addEventListener?.('change',refresh);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{refresh();setTimeout(refresh,350)},{once:true});else{refresh();setTimeout(refresh,350)}
window.ElaraMobileBannerCopy={refresh,collapseAll,revealAll,reveal,collapse,pressMs:PRESS_MS};
})();