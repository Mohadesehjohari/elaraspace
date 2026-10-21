/* Avatar pose cards for real VRM and procedural fallback. Character popover stays clean. */
(() => {
  'use strict';
  const actions=[
    {id:'idle',label:'آرام',tone:'#489cbb',arms:[[-16,19],[16,19]],legs:[[-11,42],[11,42]]},
    {id:'smile',label:'لبخند',tone:'#dc75aa',arms:[[-17,13],[17,13]],legs:[[-11,42],[11,42]]},
    {id:'wave',label:'سلام',tone:'#a184f5',arms:[[-17,19],[24,-4]],legs:[[-11,42],[11,42]]},
    {id:'dance1',label:'دنس ریتم',tone:'#63e6be',arms:[[-23,-6],[25,9]],legs:[[-18,40],[12,42]]},
    {id:'dance2',label:'دنس پاپ',tone:'#ffa85b',arms:[[-23,12],[24,-7]],legs:[[-9,42],[20,36]]},
    {id:'dance3',label:'دنس انرژی',tone:'#e780ef',arms:[[-22,-10],[22,-10]],legs:[[-18,39],[17,39]]}
  ];
  function picture(item){
    const a=item.arms,l=item.legs;
    const stroke='#f9e7fa';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 106">'+
      '<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#101b3d"/><stop offset="1" stop-color="'+item.tone+'"/></linearGradient></defs>'+
      '<rect width="100" height="106" rx="16" fill="url(#bg)"/>'+
      '<ellipse cx="50" cy="96" rx="28" ry="5" fill="#070f29" opacity=".5"/>'+
      '<path d="M19 26l2-6 2 6 6 2-6 2-2 6-2-6-6-2z M78 20l1.5-4 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5z" fill="#fff" opacity=".7"/>'+
      '<circle cx="50" cy="23" r="12" fill="#f6cfbf"/>'+
      '<path d="M39 18q10-18 22 0l-6-4-12 3z" fill="#46305c"/>'+
      '<path d="M46 23h1 M53 23h1" stroke="#3a3044" stroke-width="2.6" stroke-linecap="round"/>'+
      '<path d="M44 29q6 6 12 0" stroke="#90465e" stroke-width="1.8" fill="none" stroke-linecap="round"/>'+
      '<path d="M50 36v29" stroke="'+stroke+'" stroke-width="13" stroke-linecap="round"/>'+
      '<path d="M48 65L'+(50+l[0][0])+' '+(65+l[0][1])+' M52 65L'+(50+l[1][0])+' '+(65+l[1][1])+'" stroke="'+stroke+'" stroke-width="7" fill="none" stroke-linecap="round"/>'+
      '<path d="M46 42L'+(46+a[0][0])+' '+(42+a[0][1])+' M54 42L'+(54+a[1][0])+' '+(42+a[1][1])+'" stroke="#f5cfbf" stroke-width="6" fill="none" stroke-linecap="round"/>'+
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
  window.addEventListener('elara:procedural-avatar-mounted',sync);
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
