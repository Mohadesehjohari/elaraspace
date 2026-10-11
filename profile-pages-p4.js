/* PROFILE-P4: independent private account pages; #page continues to be the social page.
   Reuses the existing P2 renderer and P3 inventory/equipment source of truth. */
(()=>{'use strict';
 const ROUTES=new Set(['profile','wardrobe']);
 const $=sel=>document.querySelector(sel);
 let host=null,routeNow='',ownerUid=null,previousFocus=null,renderPending=false;
 const route=()=>decodeURIComponent(location.hash.replace(/^#/,''));
 const signedIn=()=>String(window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'');
 const icon=name=>window.ElaraIcons?.icon?.(name)||'';
 const ensure=()=>{
  if(!host){
   const main=$('#main');if(!main)return null;
   host=document.createElement('section');host.id='elara-private-route';host.setAttribute('dir','rtl');host.setAttribute('aria-label','فضای خصوصی حساب');host.hidden=true;
   main.append(host);
  }
  if(!$('#elara-private-route-css')){const css=document.createElement('link');css.id='elara-private-route-css';css.rel='stylesheet';css.href='profile-pages-p4.css?v=20261011-p4-1';document.head.append(css)}
  return host
 };
 const heading=(title,description)=>
  '<header class="p4-page-heading"><div><h1>'+title+'</h1><p>'+description+'</p></div><button type="button" data-p4-back aria-label="بازگشت به صفحه قبل">'+icon('back')+' بازگشت</button></header>';
 function clear(){
  if(routeNow==='wardrobe')window.ElaraWardrobeUI?.unmountPage?.();
  document.body.classList.remove('elara-private-route-active','elara-private-route-profile','elara-private-route-wardrobe');
  if(host){host.hidden=true;host.replaceChildren()}
  if(routeNow&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  routeNow='';ownerUid=null
 }
 function render(){
  const next=route(),valid=ROUTES.has(next);
  if(!valid){clear();return}
  if(!ensure())return;
  if(!document.querySelector('.topbar')||!window.ElaraProfileSystem||!window.ElaraPrivateDrawer||!window.ElaraWardrobeUI){
   host.hidden=false;host.innerHTML='<p class="p4-page-loading" role="status">در حال آماده‌سازی فضای پروفایل…</p>';
   if(!renderPending){renderPending=true;setTimeout(()=>{renderPending=false;render()},450)}
   return
  }
  if(routeNow!==next&&routeNow==='wardrobe')window.ElaraWardrobeUI.unmountPage?.();
  if(routeNow!==next){previousFocus=document.activeElement;host.scrollIntoView?.({behavior:'instant',block:'start'})}
  routeNow=next;
  document.body.classList.toggle('elara-private-route-profile',next==='profile');
  document.body.classList.toggle('elara-private-route-wardrobe',next==='wardrobe');
  document.body.classList.add('elara-private-route-active');
  host.hidden=false;host.dataset.page=next;
  const uid=signedIn();ownerUid=uid;
  // Never expose a previous account's P2 snapshot while Firebase identity changes.
  if(!uid){
   host.innerHTML=heading(next==='profile'?'پروفایل من':'کمد فضایی من','فضای شخصی Elara')+
     '<div class="p4-page-empty" role="status">برای دیدن تجهیزات و اطلاعات پروفایل، ابتدا وارد حساب خودت شو.</div>';
   return
  }
  if(next==='profile'){
   host.innerHTML='<div class="p4-account-mount" id="p4-account-mount"></div>';
   const account=host.querySelector('#p4-account-mount');
   window.ElaraPrivateDrawer.renderAccountInto(account);
   if(!account.querySelector('.elara-profile-hub'))account.innerHTML=heading('پروفایل من','اطلاعات این حساب')+'<p class="p4-page-loading">در حال بارگذاری اطلاعات حساب…</p>';
   const cta=account.querySelector('.elara-profile-hub-actions');
   if(cta&&!cta.querySelector('[data-p4-wardrobe]')){
    const b=document.createElement('button');b.type='button';b.className='p4-wardrobe-cta';
    b.dataset.p4Wardrobe='';b.innerHTML=icon('wardrobe')+'<span>ورود به کمد فضایی من<small>انتخاب و تجهیز آیتم‌ها</small></span>';
    cta.append(b);
   }
  }else{
   host.innerHTML='<section class="elara-page-wardrobe"><div class="approved-wardrobe-window">'+heading('کمد فضایی من','انتخاب، پیش‌نمایش و تجهیز آیتم‌های واقعی پروفایل')+
     '<div class="p4-wardrobe-intro">نمایش آیتم‌های حساب شما · انتخاب کارت به‌تنهایی تجهیز نمی‌کند</div>'+
     '<div class="p4-wardrobe-mount" id="p4-wardrobe-mount"></div></div></section>';
   window.ElaraWardrobeUI.mountPage(host.querySelector('#p4-wardrobe-mount'));
  }
  $('#page-title')?.replaceChildren(document.createTextNode(next==='profile'?'پروفایل من':'کمد فضایی من'));
 }
 function open(next){
  if(!ROUTES.has(next))return false;
  const target='#'+next;
  if(location.hash!==target)history.pushState({...history.state,elaraPrivatePage:next},'',location.pathname+location.search+target);
  render();window.scrollTo({top:0,behavior:'instant'});return true
 }
 function back(){
  if(ROUTES.has(route())&&history.state?.elaraPrivatePage){history.back();return}
  const fallback=route()==='wardrobe'?'profile':'home';
  history.replaceState({...history.state,elaraPrivatePage:null},'',location.pathname+location.search+'#'+fallback);
  render()
 }
 function onClick(event){
  const area=event.target.closest('#elara-private-route');
  if(!area)return;
  if(event.target.closest('[data-p4-back]')){event.preventDefault();event.stopImmediatePropagation();back();return}
  if(event.target.closest('[data-p4-wardrobe],[data-approved-wardrobe]')){
   event.preventDefault();event.stopImmediatePropagation();open('wardrobe');return
  }
  const nav=event.target.closest('[data-drawer-nav]');
  if(nav){
   event.preventDefault();event.stopImmediatePropagation();
   if(nav.dataset.drawerNav==='home')back();
   else window.ElaraPrivateDrawer.open(nav.dataset.drawerNav);
  }
 }
 document.addEventListener('click',onClick,true);
 const refresh=()=>{if(!ROUTES.has(route()))return;
  const uid=signedIn();
  if(uid!==ownerUid){clear();render();return}
  // Editing does not destroy draft; only refresh the screen after actual canonical changes.
  if(!$('#elara-profile-edit-screen')&&document.querySelector('.approved-wardrobe[hidden]'))render();
  else if(!$('#elara-profile-edit-screen'))render();
 };
 window.addEventListener('hashchange',render);
 window.addEventListener('popstate',render);
 for(const event of ['elara:account-ready','elara:social-updated','elara:profile-saved','elara:wardrobe-changed'])window.addEventListener(event,refresh);
 window.addEventListener('load',render,{once:true});
 window.ElaraPrivateRoutes={open,back,render,current:()=>route()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
