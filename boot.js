/* Approved Elara UI and Firebase account/social startup. */
(() => {
  const BUILD='20261001-p0-runtime-v14';
  const assetUrl=name=>`${name}${name.includes('?')?'&':'?'}v=${BUILD}`;
  const styleReady=[];
  const styles=['elara-design.css','elara-finishing.css','approved-visual.css','approved-tuning.css','approved-reference-fidelity.css','approved-wellness.css','approved-navigation-extension.css','approved-seasonal.css','approved-home-return.css','approved-language-journal.css','visual-fidelity-pass2.css','visual-fidelity-pass3.css','visual-fidelity-pass4.css','artwork-home-install-2026.css','home-functional-pass-2026.css','reference-home-shell-2026.css','visual-fidelity-pass5.css','reference-restore.css','reference-exact-pass-2026.css'];
  /* Load legacy artwork/functional layers first; canonical Home geometry and Tasks visual owner load last so stale !important rules cannot displace their DOM owners. */
  for(const name of styles){const css=document.createElement('link');css.rel='stylesheet';css.href=assetUrl(name);styleReady.push(new Promise(resolve=>{css.onload=()=>resolve({name,ok:true});css.onerror=()=>{console.error('Elara stylesheet unavailable:',name);resolve({name,ok:false})}}));document.head.append(css)}
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=assetUrl('assets/logo.svg');document.head.append(icon);
  /* First-paint artwork is requested before the shell is released so users do not see legacy SVGs swap to WebPs. */
  const essentialImages=(!location.hash||location.hash==='#home')?[
    'assets/ui/icon-tasks-check-alpha.webp','assets/ui/hero-landscape.webp',
    'assets/ui/nav-home-active.webp','assets/ui/nav-tasks-default.webp','assets/ui/nav-language-default.webp','assets/ui/nav-library-default.webp','assets/ui/nav-ranking-default.webp','assets/ui/nav-exercise-default.webp',
    'assets/ui/friends-group-icon.webp','assets/ui/icon-freedom-lotus.webp','assets/ui/brand-elara-app-mark.webp','assets/ui/streak-flame.webp','assets/ui/missions-rocket.webp',
    'assets/ui/icon-mode-night-active.webp','assets/ui/icon-mode-night-default.webp','assets/ui/icon-notifications-read.webp','assets/ui/icon-notifications-unread.webp','assets/ui/button-view-all.webp'
  ]:[];
  const decodeImage=src=>new Promise(resolve=>{const img=new Image();let settled=false;const done=()=>{if(settled)return;settled=true;resolve()};img.onload=done;img.onerror=done;img.src=src;if(typeof img.decode==='function')img.decode().then(done,done)});
  for(const src of essentialImages){const preload=document.createElement('link');preload.rel='preload';preload.as='image';preload.href=src;preload.fetchPriority='high';document.head.append(preload)}
  const essentialArtworkReady=Promise.all(essentialImages.map(decodeImage));
  const release=()=>document.documentElement.removeAttribute('data-elara-booting');
  const scripts=['approved-icon-system.js','approved-navigation-extension.js','elara-design.js','approved-visual.js','approved-runtime.js','approved-focus-dialog.js','approved-wellness.js','approved-home-return.js','approved-overlay-guard.js','approved-language-journal.js','visual-fidelity-pass2.js','visual-fidelity-pass3.js','reference-shell-compat-2026.js','reference-home-shell-2026.js','artwork-home-install-2026.js','home-functional-pass-2026.js','social-view.js','reports.js'];
  const optionalFailures=[];
  const loadScriptsInOrder=async names=>{
    for(const name of names){
      await new Promise(resolve=>{
        const script=document.createElement('script');
        script.async=false;
        script.src=assetUrl(name);
        script.onload=()=>resolve();
        script.onerror=()=>{optionalFailures.push(name);console.error('Elara module unavailable:',name);resolve()};
        document.head.append(script);
      });
    }
    window.__elaraOptionalFailures=optionalFailures.slice();
  };
  let ready=false;
  const slow=setTimeout(()=>{if(!ready)console.warn('Elara shell startup exceeded 5 seconds; watchdog will reveal the usable shell.')},5000);
  const hardWatchdog=setTimeout(()=>{if(ready)return;console.error('Elara boot watchdog released the shell after a secondary startup stall.');ready=true;release();window.dispatchEvent(new Event('elara:boot-watchdog'))},6500);
  void(async()=>{
    try{
      /* Dynamic scripts fetch in parallel but execute in insertion order (async=false). */
      await Promise.all([loadScriptsInOrder(scripts),Promise.all(styleReady)]);
      window.ElaraNavigation?.render?.();window.ElaraReferenceHome?.render?.();
      /* Decode the actual rendered first-frame controls, not only preload clones. This prevents
         the shell from revealing while visible nav/Moon/Bell <img> nodes are still blank. */
      const renderedArtworkReady=Promise.all([...document.querySelectorAll('.bottom-nav .elara-nav-art,.sidebar .elara-nav-art,#theme-toggle .ref-theme-art,#ref-header-notifications .ref-notification-art')]
        .filter(img=>img.getClientRects().length>0)
        .map(img=>img.complete&&img.naturalWidth>0?Promise.resolve():typeof img.decode==='function'?img.decode().catch(()=>{}):new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
      /* Only first-viewport artwork blocks reveal; secondary icons load normally after release. */
      await Promise.race([Promise.all([essentialArtworkReady,renderedArtworkReady]),new Promise(resolve=>setTimeout(resolve,3500))]);
      ready=true;release();
    }catch(error){console.error('Elara final shell could not start:',error);ready=true;release();const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');if(status)status.textContent='بخشی از رابط بارگذاری نشد؛ هستهٔ برنامه در حالت ایمن در دسترس است.';if(retry)retry.hidden=false}
    finally{clearTimeout(slow);clearTimeout(hardWatchdog)}
  })();
  const launch=async()=>{
    const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');
    let accountSettled=false;
    const accountWatchdog=setTimeout(()=>{
      if(accountSettled||document.body.classList.contains('cloud-ready'))return;
      console.error('Elara account watchdog: Firebase/account startup exceeded 8 seconds; falling back to device-local mode.');
      document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready','cloud-offline');
      const layer=document.getElementById('cloud-layer');if(layer)layer.hidden=true;
      window.dispatchEvent(new CustomEvent('elara:cloud-unavailable',{detail:{message:'account-startup-timeout'}}));
    },8000);
    try{
      if(status)status.textContent='در حال اتصال امن به Firebase…';if(retry)retry.hidden=true;
      setTimeout(()=>{
        if(document.body.classList.contains('cloud-ready')||document.getElementById('cloud-form'))return;
        const text=status?.textContent||'';
        if(text.startsWith('در حال اتصال')||text.startsWith('در حال دریافت')){
          status.textContent='راه‌اندازی حساب بیش از حد طول کشید. اگر با تلاش دوباره رفع نشد، اتصال Firebase را در مرورگر و شبکه بررسی کن.';
          if(retry)retry.hidden=false;
        }
      },15000);
      await import(assetUrl('./cloud.js'));accountSettled=true;clearTimeout(accountWatchdog);
      try{await import(assetUrl('./elara-social.js'))}catch(error){console.error('Elara social startup:',error);const msg=document.getElementById('elara-social-message');if(msg)msg.textContent='بخش دوستان بارگذاری نشد. اتصال اینترنت و فایل‌ها را بررسی کن.'}
    }catch(error){
      accountSettled=true;clearTimeout(accountWatchdog);
      console.error('Elara cloud startup:',error);
      // Cloud/account startup must never make the local application unusable.
      // Keep existing device-local state available and surface the cloud outage non-blockingly.
      document.body.classList.remove('cloud-locked');
      document.body.classList.add('cloud-ready','cloud-offline');
      const layer=document.getElementById('cloud-layer');if(layer)layer.hidden=true;
      const toast=document.getElementById('toast');if(toast){toast.textContent='اتصال حساب ابری برقرار نشد؛ الارا فعلاً با داده‌های همین دستگاه در دسترس است.';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),6500)}
      window.dispatchEvent(new CustomEvent('elara:cloud-unavailable',{detail:{message:String(error?.message||error)}}));
    }finally{accountSettled=true;clearTimeout(accountWatchdog)}
  };
  document.addEventListener('DOMContentLoaded',()=>{document.getElementById('cloud-retry')?.addEventListener('click',()=>location.reload());void launch()},{once:true});
})();

