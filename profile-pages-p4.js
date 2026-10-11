/* P4 profile pages: hash-routed, private account surfaces. No #page changes. */
(()=>{'use strict';
 const routes=new Set(['#profile','#wardrobe']);
 const $=s=>document.querySelector(s);
 let root=null,origin='#home',lastUid=null,active='',pending=null;
 const logged=()=>String(window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function mount(){
  if(root)return root;
  const workspace=$('.workspace');if(!workspace)return null;
  root=document.createElement('section');root.id='elara-private-profile-page';root.className='p4-private-page';root.hidden=true;
  root.dir='rtl';root.setAttribute('aria-label','پروفایل خصوصی و کمد');
  workspace.append(root);return root;
 }
 function closeDrawer(){
  try{window.ElaraPrivateDrawer?.close?.()}catch{}
 }
 function showProfile(){
  const host=mount();if(!host)return;
  if(!logged()){host.innerHTML='<div class="p4-account-required"><h2>پروفایل من</h2><p>برای دیدن پروفایل خصوصی، وارد حساب خود شو.</p><button type="button" data-p4-back>بازگشت</button></div>';return}
  const drawer=window.ElaraPrivateDrawer;
  drawer?.renderAccount?.();
  const source=$('#drawer-account-area .elara-profile-hub');
  if(!source){host.innerHTML='<div class="p4-account-required"><h2>پروفایل من</h2><p>داده‌های حساب هنوز آماده نیست. دوباره تلاش کن.</p><button data-p4-refresh>تلاش دوباره</button><button data-p4-back>بازگشت</button></div>';return}
  const copy=source.cloneNode(true);
  copy.querySelector('.elara-profile-hub-heading [data-drawer-nav="home"]')?.setAttribute('data-p4-back','');
  copy.querySelectorAll('[data-approved-wardrobe]').forEach(b=>{b.setAttribute('data-p4-wardrobe','');b.removeAttribute('data-approved-wardrobe')});
  copy.querySelector('.elara-profile-hub-shortcuts [data-drawer-nav="account"]')?.setAttribute('data-p4-identity','');
  host.replaceChildren(copy);
  host.scrollTop=0;
 }
 function showWardrobe(){
  if(!logged()){root.innerHTML='<div class="p4-account-required"><h2>کمد فضایی من</h2><p>برای مشاهده تجهیزات حساب باید وارد شوی.</p><button data-p4-back>بازگشت</button></div>';return}
  root.innerHTML='';
  window.ElaraWardrobeUI?.open?.();
  const widget=$('.approved-wardrobe');
  if(widget){widget.classList.add('p4-wardrobe-page');widget.hidden=false;widget.querySelector('.approved-wardrobe-window')?.setAttribute('aria-modal','false')}
 }
 function hide(){
  if(active==='wardrobe'){
   const widget=$('.approved-wardrobe');
   widget?.classList.remove('p4-wardrobe-page');
   if(widget&&!widget.hidden)window.ElaraWardrobeUI?.close?.(true);
  }
  if(root){root.hidden=true;root.innerHTML=''}
  document.body.classList.remove('p4-profile-page-active','p4-wardrobe-page-active');
  active='';
 }
 function sync(){
  const route=location.hash;
  if(!routes.has(route)){hide();return}
  if(!mount())return;
  if(active!==route.slice(1)&&active==='wardrobe'){
   const widget=$('.approved-wardrobe');widget?.classList.remove('p4-wardrobe-page');
   window.ElaraWardrobeUI?.close?.(true);
  }
  active=route.slice(1);lastUid=logged();root.hidden=false;
  document.body.classList.toggle('p4-profile-page-active',route==='#profile');
  document.body.classList.toggle('p4-wardrobe-page-active',route==='#wardrobe');
  if(route==='#profile')showProfile();else showWardrobe();
 }
 function navigate(kind){
  const route='#'+kind;if(!routes.has(route))return;
  if(!routes.has(location.hash))origin=location.hash||'#home';
  closeDrawer();
  if(location.hash!==route)history.pushState({...history.state,elaraPrivateRoute:kind,elaraDrawer:false},'',location.pathname+location.search+route);
  sync();
 }
 function back(){
  if(history.state?.elaraPrivateRoute&&history.length>1){history.back();return}
  history.replaceState({...history.state,elaraPrivateRoute:null},'',location.pathname+location.search+origin);
  sync();window.dispatchEvent(new HashChangeEvent('hashchange'));
 }
 window.ElaraProfilePages={navigate,back,refresh:sync};
 document.addEventListener('click',event=>{
  const w=event.target.closest('[data-p4-wardrobe]');if(w){event.preventDefault();navigate('wardrobe');return}
  if(event.target.closest('[data-p4-back]')){event.preventDefault();back();return}
  if(event.target.closest('[data-p4-refresh]')){sync();return}
  const trigger=event.target.closest('.elara-private-drawer [data-drawer-nav="account"]');
  if(trigger){event.preventDefault();event.stopImmediatePropagation();navigate('profile');return}
  const tab=event.target.closest('[data-p4-identity]');if(tab){event.preventDefault();event.stopImmediatePropagation();sync();return}
 },true);
 window.addEventListener('popstate',sync);
 window.addEventListener('hashchange',sync);
 const refresh=()=>{if(routes.has(location.hash)&&lastUid!==logged())sync();else if(location.hash==='#profile'&&root&&!root.hidden)showProfile()};
 ['elara:profile-saved','elara:wardrobe-changed','elara:account-ready','elara:social-updated'].forEach(e=>window.addEventListener(e,refresh));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,400),{once:true});else setTimeout(sync,400);
})();