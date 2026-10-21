/* Illustrated pose selectors for real VRM only. Compact arrow stays clean. */
(() => {
  'use strict';
  // Original purple-and-white emote silhouettes: inspired by game emote
  // selectors, but not copied from any game's copyrighted icon assets.
  const actions=[
    {id:'idle',label:'آرام',arms:[[-16,22],[16,22]],legs:[[-13,38],[13,38]]},
    {id:'smile',label:'لبخند',arms:[[-20,14],[20,14]],legs:[[-13,38],[13,38]]},
    {id:'softSmile',label:'لبخند ملیح',arms:[[-16,18],[16,18]],legs:[[-11,38],[11,38]],cute:true},
    {id:'wave',label:'سلام',arms:[[-18,20],[18,-10]],legs:[[-12,38],[12,38]]},
    {id:'dance1',label:'دنس ریتم',arms:[[-27,-8],[24,7]],legs:[[-21,35],[10,42]]},
    {id:'dance2',label:'دنس پاپ',arms:[[-25,8],[25,-10]],legs:[[-10,40],[22,32]]},
    {id:'dance3',label:'دنس انرژی',arms:[[-25,-14],[25,-12]],legs:[[-22,36],[22,36]]}
  ];
  function picture(item){
    const a=item.arms,l=item.legs;
    // All cards share the same purple gradient and solid white silhouette.
    // Angles differ by movement, like readable emote icons in a game.
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 106" aria-hidden="true">'+
      '<defs><linearGradient id="emote" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4020a1"/><stop offset=".56" stop-color="#7135d4"/><stop offset="1" stop-color="#ad65f6"/></linearGradient></defs>'+
      '<rect width="100" height="106" rx="15" fill="url(#emote)"/>'+
      '<path d="M9 21l2-7 2 7 7 2-7 2-2 7-2-7-7-2z M78 12l1.3-5 1.3 5 5 1.3-5 1.3-1.3 5-1.3-5-5-1.3z" fill="#e5d6ff" opacity=".72"/>'+
      '<ellipse cx="50" cy="95" rx="28" ry="4" fill="#290d73" opacity=".42"/>'+
      '<circle cx="50" cy="24" r="10" fill="white"/>'+
      '<path d="M50 37L50 64" stroke="white" stroke-width="12" stroke-linecap="round"/>'+
      '<path d="M45 43L'+(45+a[0][0])+' '+(43+a[0][1])+' M55 43L'+(55+a[1][0])+' '+(43+a[1][1])+'" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>'+
      '<path d="M47 65L'+(50+l[0][0])+' '+(65+l[0][1])+' M53 65L'+(50+l[1][0])+' '+(65+l[1][1])+'" stroke="white" stroke-width="8" stroke-linecap="round" fill="none"/>'+
      (item.cute?'<path d="M24 22l2-6 2 6 6 2-6 2-2 6-2-6-6-2z" fill="white" opacity=".8"/>':'')+
      '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
  }
  function availableModel(stage){
    const live=window.ElaraLiveVRM?.current;
    if(live?.stage===stage&&live?.setAction)return name=>live.setAction(name);
    return ()=>false;
  }
  function gallery(stage){
    if(!stage?.isConnected||stage.querySelector('[data-elara-motion-gallery]')||
       window.ElaraLiveVRM?.current?.stage!==stage)return;
    const quick=stage.closest('.elara-avatar-quick-modal');
    if(quick&&quick.dataset.mode!=='fullscreen')return;
    const wrap=document.createElement('aside');
    wrap.className='elara-motion-gallery';
    wrap.dataset.elaraMotionGallery='';
    wrap.setAttribute('aria-label','حرکت‌ها و حالت چهره کاراکتر');
    wrap.setAttribute('dir','rtl');
    const info=document.createElement('p');info.className='elara-motion-notice';info.setAttribute('role','status');info.setAttribute('aria-live','polite');
    for(const item of actions){
      const b=document.createElement('button');b.type='button';
      b.dataset.avatarMotionOption=item.id;
      b.setAttribute('aria-label',item.label);
      b.setAttribute('aria-pressed',String(item.id==='idle'));
      const img=document.createElement('img');img.src=picture(item);img.alt='';img.loading='lazy';
      const text=document.createElement('span');text.textContent=item.label;
      b.append(img,text);
      b.addEventListener('click',async()=>{
        // Keep the current choice until the actual VRMA is ready. Previously the
        // interface claimed success even when the source returned 404, then reset.
        if(wrap.dataset.busy==='true')return;
        const previous=wrap.querySelector('[aria-pressed="true"]');
        wrap.dataset.busy='true';
        b.dataset.loading='true';
        info.textContent=item.id.startsWith('dance')?'در حال دریافت حرکت واقعی…':'';
        let played=false;
        try{played=(await availableModel(stage)(item.id))===true;}catch(error){console.warn('Avatar motion failed',error);}
        if(!stage.isConnected)return;
        wrap.dataset.busy='false';delete b.dataset.loading;
        if(played){
          wrap.querySelectorAll('[data-avatar-motion-option]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
          info.textContent='';
        }else{
          wrap.querySelectorAll('[data-avatar-motion-option]').forEach(x=>x.setAttribute('aria-pressed',String(x===previous)));
          info.textContent='این رقص دریافت نشد. اتصال را بررسی کن یا حرکت دیگری انتخاب کن.';
        }
      });
      wrap.append(b);
    }
    wrap.append(info);
    stage.append(wrap);
  }
  function sync(){
    document.querySelectorAll('[data-elara-avatar-stage]').forEach(stage=>{
      if(window.ElaraLiveVRM?.current?.stage===stage)gallery(stage);
      else stage.querySelector('[data-elara-motion-gallery]')?.remove();
    });
  }
  window.addEventListener('elara:avatar-stage-ready',sync);
  window.addEventListener('elara:live-avatar-mounted',sync);
  window.addEventListener('elara:avatar-motion-error',event=>{
    const stage=event.detail?.stage;
    const notice=stage?.querySelector('.elara-motion-notice');
    if(notice)notice.textContent='فایل رقص بارگذاری نشد؛ ژست عادی حفظ شد.';
  });
  window.addEventListener('elara:avatar-motion-ended',event=>{
    const stage=event.detail?.stage;
    stage?.querySelectorAll('[data-avatar-motion-option]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatarMotionOption==='idle')));
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
