/* Header chevron: independent character-only full-body dialog on every screen.
   Never opens profile settings or the wardrobe. Prefer real VRM; use the project's
   procedural 3D avatar until the selected VRM asset has been uploaded. */
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
        '<header class="elara-avatar-quick-header" dir="rtl">'+
          '<button class="elara-avatar-quick-close" type="button" data-avatar-quick-close aria-label="بستن کاراکتر">×</button>'+
        '</header>'+
        '<div class="elara-avatar-stage" data-elara-avatar-stage>'+
          '<div class="elara-avatar-viewport" data-elara-avatar-viewport></div>'+
          '<span class="elara-avatar-status" data-elara-avatar-status role="status"></span>'+
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
    window.ElaraProceduralPreview?.dispose?.(stage);
    stage.replaceChildren();
    stage.innerHTML='<div class="elara-avatar-viewport" data-elara-avatar-viewport></div>'+
      '<span class="elara-avatar-status" data-elara-avatar-status role="status"></span>';
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
      const mounted=await window.ElaraLiveVRM?.tryMount?.(stage);
      if(mine!==requestId||!visible())return;
      if(mounted){
        window.ElaraLiveVRM.current?.focus?.('full');
      }else{
        // Keep the popup useful even before the user's exported VRM reaches GitHub.
        const fallback=await window.ElaraProceduralPreview?.mount?.(stage);
        if(mine!==requestId||!visible()){
          window.ElaraProceduralPreview?.dispose?.(stage);return;
        }
        if(!fallback)message('نمایش سه‌بعدی در دسترس نیست. لطفاً دوباره امتحان کن.','error');
        else message('');
      }
    }catch(error){
      console.warn('Elara standalone VRM dialog:',error);
      if(mine===requestId&&visible()){
        try{
          const fallback=await window.ElaraProceduralPreview?.mount?.(stage);
          if(mine!==requestId||!visible()){window.ElaraProceduralPreview?.dispose?.(stage);return;}
          if(fallback)message('');else message('نمایش سه‌بعدی ناموفق بود؛ دوباره تلاش کن.','error');
        }catch{message('نمایش سه‌بعدی ناموفق بود؛ دوباره تلاش کن.','error');}
      }
    }
  }
  function toggle(button){
    if(visible())close();else void open(button);
  }
  // Capture only the small chevron. The adjacent account button keeps its
  // existing desktop settings and mobile drawer click handlers untouched.
  document.addEventListener('click',event=>{
    const arrow=event.target?.closest?.('#ref-equipped-character-toggle');
    if(!arrow)return;
    event.preventDefault();event.stopImmediatePropagation();
    toggle(arrow);
  },true);
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