/* Header avatar quick view: a standalone full-body VRM dialog.
   Does NOT open the settings/profile drawer or duplicate the wardrobe.
   Loads an actual VRM only when shown and disposes WebGL on close. */
(() => {
  'use strict';
  let root=null,stage=null,trigger=null,lastFocus=null,requestId=0;
  const visible=()=>!!root&&!root.hidden;
  const message=(value,state='')=>{
    const label=stage?.querySelector('[data-elara-avatar-status]');
    if(label){label.textContent=value;label.dataset.state=state;}
  };
  function ensure(){
    if(root)return;
    root=document.createElement('div');
    root.className='elara-avatar-quick-modal';
    root.dataset.elaraAvatarQuickModal='';
    root.hidden=true;root.setAttribute('aria-hidden','true');
    root.innerHTML=
      '<button type="button" class="elara-avatar-quick-backdrop" data-avatar-quick-close aria-label="بستن نمایش کاراکتر"></button>'+
      '<section class="elara-avatar-quick-dialog" role="dialog" aria-modal="true" aria-label="نمایش سه‌بعدی کاراکتر">'+
        '<header class="elara-avatar-quick-header" dir="rtl"><strong>کاراکتر من</strong><span>نمای تمام‌قد سه‌بعدی</span>'+
          '<button class="elara-avatar-quick-close" type="button" data-avatar-quick-close aria-label="بستن کاراکتر">×</button>'+
        '</header>'+
        '<div class="elara-avatar-stage" data-elara-avatar-stage>'+
          '<div class="elara-avatar-viewport" data-elara-avatar-viewport></div>'+
          '<span class="elara-avatar-badge">3D AVATAR</span>'+
          '<span class="elara-avatar-status" data-elara-avatar-status role="status">در حال آماده‌سازی کاراکتر…</span>'+
          '<div class="elara-avatar-help" aria-hidden="true"><i></i>لمس: زوم · درگ: چرخش</div>'+
        '</div>'+
      '</section>';
    document.body.append(root);
    stage=root.querySelector('[data-elara-avatar-stage]');
    root.addEventListener('click',event=>{
      if(event.target.closest('[data-avatar-quick-close]'))close();
    });
  }
  function close(){
    if(!visible())return;
    ++requestId;
    root.hidden=true;root.setAttribute('aria-hidden','true');
    document.body.classList.remove('elara-quick-avatar-open');
    if(window.ElaraLiveVRM?.current?.stage===stage)window.ElaraLiveVRM.current.dispose();
    // The quick dialog is VRM-only: do not touch the prototype in the profile drawer.
    stage.replaceChildren();
    stage.innerHTML='<div class="elara-avatar-viewport" data-elara-avatar-viewport></div>'+
      '<span class="elara-avatar-badge">3D AVATAR</span>'+
      '<span class="elara-avatar-status" data-elara-avatar-status role="status"></span>'+
      '<div class="elara-avatar-help" aria-hidden="true"><i></i>لمس: زوم · درگ: چرخش</div>';
    if(trigger?.isConnected)trigger.setAttribute('aria-expanded','false');
    lastFocus?.focus?.({preventScroll:true});
    trigger=null;lastFocus=null;
  }
  async function open(button){
    ensure();
    if(visible())return;
    lastFocus=document.activeElement;
    trigger=button||document.getElementById('ref-equipped-character-toggle');
    ++requestId;const mine=requestId;
    root.hidden=false;root.removeAttribute('aria-hidden');
    document.body.classList.add('elara-quick-avatar-open');
    trigger?.setAttribute('aria-expanded','true');
    root.querySelector('.elara-avatar-quick-close')?.focus({preventScroll:true});
    message('در حال بارگذاری کاراکتر سه‌بعدی…','loading');
    // Only one active VRM renderer: release a hidden profile/wardrobe renderer first.
    const active=window.ElaraLiveVRM?.current;
    if(active&&active.stage!==stage)active.dispose();
    await new Promise(resolve=>requestAnimationFrame(resolve));
    if(mine!==requestId||!visible())return;
    try {
      if(!window.ElaraLiveVRM?.tryMount){
        message('موتور نمایش سه‌بعدی آماده نیست. صفحه را تازه کن.','error');return;
      }
      const mounted=await window.ElaraLiveVRM.tryMount(stage);
      if(mine!==requestId||!visible())return;
      if(!mounted){
        const reason=stage.dataset.avatarFallbackReason;
        const text=reason==='male-vrm-not-ready'?'مدل مردانه هنوز روی سایت بارگذاری نشده است.':
          reason==='base-vrm-not-ready'?'برای این حساب هنوز فایل سه‌بعدی منتشر نشده است.':
          reason==='catalog-unavailable'?'فهرست مدل‌ها دریافت نشد؛ اتصال اینترنت را بررسی کن.':
          'فایل کاراکتر بارگذاری نشد؛ یک بار دیگر امتحان کن.';
        message(text,'error');
      }else{
        window.ElaraLiveVRM.current?.focus?.('full');
      }
    }catch(error){
      console.warn('Elara standalone VRM dialog:',error);
      if(mine===requestId&&visible())message('نمایش سه‌بعدی ناموفق بود؛ دوباره تلاش کن.','error');
    }
  }
  function toggle(button){
    if(visible())close();else void open(button);
  }
  document.addEventListener('keydown',event=>{
    if(!visible())return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
    if(event.key!=='Tab')return;
    const focusable=[...root.querySelectorAll('button:not([disabled]):not([hidden])')]
      .filter(node=>node.getClientRects().length);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  },true);
  window.ElaraAvatarQuickModal={open,close,toggle,get isOpen(){return visible();}};
})();