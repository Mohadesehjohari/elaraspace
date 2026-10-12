/* PROFILE-P4: standalone private Profile route; social #page unchanged. */
(()=>{'use strict';
const route='#profile';
let screen=null,origin='#home',owner=null,scrollY=0;
const uid=()=>String(window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'');
function create(){
 if(screen)return;
 screen=document.createElement('main');
 screen.id='elara-p4-private-profile';screen.hidden=true;screen.setAttribute('dir','rtl');
 screen.setAttribute('aria-label','پروفایل خصوصی من');screen.innerHTML='<div class="p4-private-wrap"><header class="p4-private-top"><button type="button" data-p4-back aria-label="بازگشت به صفحه قبلی">← بازگشت</button><div><h1>پروفایل من</h1><p>نمایش هویت، افتخارات و اطلاعات شخصی شما در Elara</p></div></header><div id="p4-profile-content" aria-live="polite"></div></div>';
 document.body.appendChild(screen);
 screen.addEventListener('click',ev=>{
  if(ev.target.closest('[data-p4-back]')){ev.preventDefault();back();return}
  const nav=ev.target.closest('[data-drawer-nav]');
  if(nav){ev.preventDefault();ev.stopImmediatePropagation();goBackThen(()=>window.ElaraPrivateDrawer?.open?.(nav.dataset.drawerNav));return}
  const wardrobe=ev.target.closest('[data-approved-wardrobe]');
  if(wardrobe){ev.preventDefault();ev.stopImmediatePropagation();window.ElaraP4Routes?.openWardrobe?.();return}
 },true);
}
function populate(){
 if(!screen||screen.hidden)return;
 const target=document.getElementById('p4-profile-content');
 if(!uid()){target.innerHTML='<p class="p4-route-state" role="status">برای مشاهده پروفایل خصوصی وارد حساب خود شوید.</p>';return}
 const renderer=window.ElaraPrivateDrawer?.renderAccount;
 if(typeof renderer!=='function'){target.innerHTML='<p class="p4-route-state">اطلاعات پروفایل هنوز آماده نیست.</p>';return}
 renderer();
 const legacy=document.getElementById('drawer-account-area');
 const content=legacy?.querySelector('.elara-profile-hub');
 if(!content){target.innerHTML='<p class="p4-route-state">اطلاعات حساب در حال بارگذاری است.</p>';return}
 target.replaceChildren(content.cloneNode(true));
 target.querySelectorAll('.elara-profile-hub-heading').forEach(n=>n.remove());
}
function open({push=true}={}){
 create();
 // Leave the account Drawer before entering a full private route; never stack two surfaces.
 window.ElaraPrivateDrawer?.close?.();
 if(push){origin=location.hash&&location.hash!==route?location.hash:'#home';history.pushState({...history.state,elaraP4Profile:true},'',route)}
 owner=uid();scrollY=window.scrollY;screen.hidden=false;document.body.classList.add('p4-private-profile-open');populate();screen.scrollTop=0;
}
function hide(){if(!screen||screen.hidden)return;screen.hidden=true;document.body.classList.remove('p4-private-profile-open');owner=null;window.scrollTo({top:scrollY,behavior:'instant'})}
function back(){if(history.state?.elaraP4Profile){history.back();return}location.hash=origin||'#home';hide()}
function goBackThen(action){hide();history.replaceState({...history.state,elaraP4Profile:false},'',origin);action()}
function sync(){
 if(location.hash===route){
  if(!screen||screen.hidden)open({push:false});else if(owner!==uid())populate();
 }else hide();
 if(location.hash==='#wardrobe'){
  const current=document.querySelector('.approved-wardrobe');
  if(!current||current.hidden)window.ElaraWardrobeUI?.open?.();
  const root=document.querySelector('.approved-wardrobe');
  if(root){root.classList.add('p4-wardrobe-route');root.querySelector('.approved-wardrobe-window')?.setAttribute('aria-modal','false')}
 }else document.querySelector('.approved-wardrobe.p4-wardrobe-route')?.classList.remove('p4-wardrobe-route')
}
window.ElaraP4Routes={openProfile:()=>open(),closeProfile:back,openWardrobe:()=>{origin=location.hash||'#home';location.hash='#wardrobe';sync()}};
window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);
window.addEventListener('load',()=>{
 const requested=window.__elaraP4RequestedHash;
 if(requested){
  window.__elaraP4RequestedHash=null;
  history.replaceState({...history.state,elaraP4BootPending:false,elaraP4Restored:true},'',requested);
  sync()
 }
},{once:true});
for(const name of ['elara:profile-saved','elara:wardrobe-changed','elara:account-ready','elara:social-updated'])window.addEventListener(name,()=>{if(screen&&!screen.hidden){if(owner!==uid())owner=uid();populate()}});
document.addEventListener('click',ev=>{
 const wardrobeEntry=ev.target.closest('[data-p4-wardrobe]');
 if(wardrobeEntry){ev.preventDefault();ev.stopImmediatePropagation();origin=location.hash||'#home';location.hash='#wardrobe';sync();return}
 const entry=ev.target.closest('[data-p4-private-profile]');
 if(!entry)return;ev.preventDefault();ev.stopImmediatePropagation();open();
},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{create();sync()},{once:true});else{create();sync()}
})();