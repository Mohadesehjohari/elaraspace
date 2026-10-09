/* Approved Elara UI and Firebase account/social startup. */
(() => {
  const BUILD='20261009-global-banner-task-polish-v1';
  if(!location.hash||location.hash==='#')history.replaceState({...history.state,elaraTab:'home'},'',location.pathname+location.search+'#home');
  const assetUrl=name=>`${name}${name.includes('?')?'&':'?'}v=${BUILD}`;
  const styles=['elara-design.css','elara-finishing.css','approved-visual.css','approved-tuning.css','approved-reference-fidelity.css','approved-wellness.css','approved-navigation-extension.css','approved-seasonal.css','approved-home-return.css','approved-language-journal.css','visual-fidelity-pass2.css','visual-fidelity-pass3.css','visual-fidelity-pass4.css','artwork-home-install-2026.css','home-functional-pass-2026.css','reference-home-shell-2026.css','visual-fidelity-pass5.css','reference-restore.css','reference-exact-pass-2026.css','freedom-page.css','october-fixes-2026-10-01.css','freedom-refinement-v2.css','friends-hub.css','october-product-hubs.css','mobile-ia-2026-10-05.css','avatar-3d.css','task-goal-final-2026.css','elara-midnight-layout-2026.css','profile-gallery-2026.css','collab-2026.css','home-owner-art-2026.css','global-page-banner-20261009.css'];
  const criticalStyles=new Set(['reference-home-shell-2026.css','visual-fidelity-pass5.css','reference-exact-pass-2026.css','elara-midnight-layout-2026.css']);
  const criticalStyleReady=[];
  /* Request every stylesheet immediately, but only block the first Home render on the visual owners that define the current shell. */
  for(const name of styles){
    const css=document.createElement('link');css.rel='stylesheet';css.href=assetUrl(name);
    const ready=new Promise(resolve=>{css.onload=()=>resolve({name,ok:true});css.onerror=()=>{console.error('Elara stylesheet unavailable:',name);resolve({name,ok:false})}});
    if(criticalStyles.has(name))criticalStyleReady.push(ready);
    document.head.append(css)
  }
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=assetUrl('assets/logo.svg');document.head.append(icon);
  /* First-paint artwork is requested before the shell is released so users do not see legacy SVGs swap to WebPs. */
  const essentialImages=location.hash==='#home'?[
    'assets/ui/homebanner1.webp','assets/ui/nav-home-active.webp','assets/ui/brand-elara-app-mark.webp',
    'assets/ui/Glowing Neon Checkmark Orb.webp','assets/ui/streak-flame.webp',
    'assets/ui/icon-mode-night-active.webp','assets/ui/icon-notifications-read.webp'
  ]:[];
  const decodeImage=src=>new Promise(resolve=>{const img=new Image();let settled=false;const done=()=>{if(settled)return;settled=true;resolve()};img.onload=done;img.onerror=done;img.src=src;if(typeof img.decode==='function')img.decode().then(done,done)});
  for(const src of essentialImages){const preload=document.createElement('link');preload.rel='preload';preload.as='image';preload.href=src;preload.fetchPriority='high';document.head.append(preload)}
  const essentialArtworkReady=Promise.all(essentialImages.map(decodeImage));
  const release=()=>document.documentElement.removeAttribute('data-elara-booting');
  const criticalScripts=['approved-navigation-extension.js','elara-design.js','approved-visual.js','approved-runtime.js','approved-home-return.js','reference-shell-compat-2026.js','reference-home-shell-2026.js','artwork-home-install-2026.js','home-functional-pass-2026.js','home-owner-art-2026.js','mobile-ia-2026-10-05.js'];
  const deferredScripts=['feature-hubs-shell.js','approved-focus-dialog.js','approved-wellness.js','approved-overlay-guard.js','approved-language-journal.js','visual-fidelity-pass2.js','visual-fidelity-pass3.js','task-bulk-reorder.js','task-checklist.js','entity-reorder.js','entity-bulk-selection.js','task-collections.js','focus-ambience.js','domain-notifications.js','mission-celebration.js','social-view.js','social-messaging-ui.js','social-groups-ui.js','social-clubs-ui.js','social-challenges-ui.js','page-view.js','social-engagement-view.js','reports.js','blog-view.js','freedom-page.js','freedom-enhancements.js','freedom-diary-music.js','freedom-ai.js','feature-hubs-2026.js','language-custom-classes.js','store-view.js','profile-social-tools.js','mobile-banner-copy.js','global-page-banner-20261009.js'];
  const optionalFailures=[];
  const syncOptionalFailures=()=>{window.__elaraOptionalFailures=optionalFailures.slice()};
  const rememberOptionalFailure=(name,error)=>{
    if(!optionalFailures.includes(name))optionalFailures.push(name);
    syncOptionalFailures();
    window.__elaraOptionalFailureDetails={...(window.__elaraOptionalFailureDetails||{}),[name]:String(error?.message||error||'load failed')}
  };
  const clearOptionalFailure=name=>{
    const index=optionalFailures.indexOf(name);if(index>=0)optionalFailures.splice(index,1);
    syncOptionalFailures();
    if(window.__elaraOptionalFailureDetails)delete window.__elaraOptionalFailureDetails[name]
  };
  syncOptionalFailures();
  const loadScriptsInOrder=async names=>{
    const pending=names.map(name=>new Promise(resolve=>{
      const script=document.createElement('script');
      script.async=false;
      script.src=assetUrl(name);
      script.onload=()=>resolve();
      script.onerror=()=>{rememberOptionalFailure(name,new Error('script load failed'));console.error('Elara module unavailable:',name);resolve()};
      document.head.append(script);
    }));
    await Promise.all(pending);
    syncOptionalFailures();
  };
  let ready=false;
  const slow=setTimeout(()=>{if(!ready)console.warn('Elara shell startup exceeded 5 seconds; watchdog will reveal the usable shell.')},5000);
  const hardWatchdog=setTimeout(()=>{if(ready)return;console.error('Elara boot watchdog released the shell after a secondary startup stall.');ready=true;release();window.dispatchEvent(new Event('elara:boot-watchdog'))},6500);
  void(async()=>{
    try{
      /* First paint only waits for the Home/navigation owners, not every secondary feature. */
      await Promise.all([loadScriptsInOrder(criticalScripts),Promise.all(criticalStyleReady)]);
      window.ElaraNavigation?.render?.();window.ElaraReferenceHome?.render?.();
      /* Decode the actual rendered first-frame controls, not only preload clones. This prevents
         the shell from revealing while visible nav/Moon/Bell <img> nodes are still blank. */
      const renderedArtworkReady=Promise.all([...document.querySelectorAll('.bottom-nav [aria-current="page"] .elara-nav-art,.sidebar [aria-current="page"] .elara-nav-art,#theme-toggle .ref-theme-art,#ref-header-notifications .ref-notification-art')]
        .filter(img=>img.getClientRects().length>0)
        .map(img=>img.complete&&img.naturalWidth>0?Promise.resolve():typeof img.decode==='function'?img.decode().catch(()=>{}):new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
      /* Only first-viewport artwork blocks reveal; secondary icons load normally after release. */
      await Promise.race([Promise.all([essentialArtworkReady,renderedArtworkReady]),new Promise(resolve=>setTimeout(resolve,1800))]);
      ready=true;release();
      const loadDeferred=()=>loadScriptsInOrder(deferredScripts).catch(error=>console.error('Elara deferred UI startup:',error));
      if('requestIdleCallback' in window)requestIdleCallback(()=>void loadDeferred(),{timeout:1400});
      else setTimeout(()=>void loadDeferred(),250);
    }catch(error){console.error('Elara final shell could not start:',error);ready=true;release();const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');if(status)status.textContent='بخشی از رابط بارگذاری نشد؛ هستهٔ برنامه در حالت ایمن در دسترس است.';if(retry)retry.hidden=false}
    finally{clearTimeout(slow);clearTimeout(hardWatchdog)}
  })();
  let cloudPromise=null,socialPromise=null,socialFailure=null,socialAttempt=0,socialStartedAt=0;
  const loadCloud=()=>{
    if(window.ElaraAccount)return Promise.resolve(window.ElaraAccount);
    if(!cloudPromise){
      cloudPromise=import(assetUrl('./cloud.js')).then(()=>{
        if(!window.ElaraAccount)throw new Error('Firebase account module loaded without ElaraAccount API.');
        return window.ElaraAccount
      }).catch(error=>{console.error('Elara cloud module load:',error);throw error});
    }
    return cloudPromise
  };
  const loadSocial=(options={})=>{
    if(window.ElaraSocial&&typeof window.ElaraSocial.saveProfileValues==='function')return Promise.resolve(window.ElaraSocial);
    const retry=options===true||options?.retry===true;
    if(retry&&socialFailure){
      socialAttempt+=1;socialFailure=null;socialPromise=null;clearOptionalFailure('elara-social.js')
    }
    if(socialPromise)return socialPromise;
    if(socialFailure)return Promise.reject(socialFailure);
    socialStartedAt=performance.now();
    const url=assetUrl('./elara-social.js')+(socialAttempt?'&retry='+socialAttempt:'');
    socialPromise=(async()=>{
      await loadCloud();
      if(!window.ElaraAccount)throw new Error('Firebase account initialization is not ready for Social.');
      await import(url);
      const api=window.ElaraSocial;
      if(!api||typeof api.saveProfileValues!=='function')throw new Error('Social module loaded but canonical profile persistence API is missing.');
      socialFailure=null;clearOptionalFailure('elara-social.js');delete window.__elaraSocialLoadError;
      const elapsed=Math.max(0,performance.now()-socialStartedAt);
      window.dispatchEvent(new CustomEvent('elara:social-ready',{detail:{elapsedMs:elapsed,attempt:socialAttempt+1}}));
      return api
    })().catch(error=>{
      socialFailure=error;window.__elaraSocialLoadError=error;rememberOptionalFailure('elara-social.js',error);
      console.error('Elara social startup:',error);
      window.dispatchEvent(new CustomEvent('elara:social-failed',{detail:{message:String(error?.message||error),attempt:socialAttempt+1}}));
      throw error
    });
    window.ElaraSocialReady=socialPromise;
    return socialPromise
  };
  window.ElaraLoadSocial=loadSocial;
  window.ElaraSocialReady=null;

  let collabPromise=null;
  const loadCollab=async()=>{
    if(window.ElaraCollab&&!window.ElaraCollab.__lazyProxy)return window.ElaraCollab;
    if(!collabPromise)collabPromise=import(assetUrl('./elara-collab.js')).then(()=>window.ElaraCollab).catch(error=>{collabPromise=null;console.error('Elara collaboration lazy startup:',error);throw error});
    return collabPromise;
  };
  const lazyCollab={__lazyProxy:true};
  for(const name of ['shareEntity','createSpace','invite','acceptInvite','declineInvite','openInbox','refreshInvites','openSpace','memberRows','createShareLink','copyShareLink','joinLink']){
    lazyCollab[name]=(...args)=>loadCollab().then(api=>api?.[name]?.(...args));
  }
  window.ElaraCollab=window.ElaraCollab||lazyCollab;
  window.ElaraLoadCollab=loadCollab;
  const launch=async()=>{
    const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');
    let accountSettled=false,accountWatchdog=null;
    const settleAccount=()=>{if(accountSettled)return;accountSettled=true;if(accountWatchdog)clearTimeout(accountWatchdog)};
    window.addEventListener('elara:account-ready',settleAccount,{once:true});
    window.addEventListener('elara:account-gate-ready',settleAccount,{once:true});
    window.addEventListener('elara:cloud-unavailable',settleAccount,{once:true});
    accountWatchdog=setTimeout(()=>{
      if(document.body.classList.contains('cloud-ready')||document.querySelector('[data-elara-account-gate-ready]')){settleAccount();return}
      console.error('Elara account watchdog: Firebase/account startup exceeded 8 seconds; falling back to device-local mode.');
      window.__elaraLocalFallbackActive=true;
      document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready','cloud-offline');
      const layer=document.getElementById('cloud-layer');if(layer)layer.hidden=true;
      window.dispatchEvent(new CustomEvent('elara:cloud-unavailable',{detail:{message:'account-startup-timeout'}}));
      settleAccount();
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
      await Promise.race([
        loadCloud(),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('Firebase startup timeout')),6500))
      ]);
      // Social has one canonical loader shared by background preload and dependent features.
      // It stays non-blocking for Home, while Profile/Friends can await the same promise.
      void loadSocial().catch(error=>{
        const msg=document.getElementById('elara-social-message');if(msg)msg.textContent='بخش دوستان بارگذاری نشد: '+String(error?.message||error)
      });
      const optionalCloudModules=[
        ['./elara-page.js','Elara page startup:'],
        ['./social-engagement.js','Elara engagement startup:']
      ];
      // Optional cloud features must never hold the shell or one another hostage.
      for(const [name,label] of optionalCloudModules){
        import(assetUrl(name)).catch(error=>{rememberOptionalFailure(name.replace(/^\.\//,''),error);console.error(label,error)});
      }
    }catch(error){
      settleAccount();
      console.error('Elara cloud startup:',error);
      window.__elaraLocalFallbackActive=true;
      // Cloud/account startup must never make the local application unusable.
      // Keep existing device-local state available and surface the cloud outage non-blockingly.
      document.body.classList.remove('cloud-locked');
      document.body.classList.add('cloud-ready','cloud-offline');
      const layer=document.getElementById('cloud-layer');if(layer)layer.hidden=true;
      const toast=document.getElementById('toast');if(toast){toast.textContent='اتصال حساب ابری برقرار نشد؛ الارا فعلاً با داده‌های همین دستگاه در دسترس است.';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),6500)}
      window.dispatchEvent(new CustomEvent('elara:cloud-unavailable',{detail:{message:String(error?.message||error)}}));
    }
  };
  const startCloud=()=>{
    document.getElementById('cloud-retry')?.addEventListener('click',()=>location.reload());
    const run=()=>void launch();
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:2600});
    else setTimeout(run,1800)
  };
  if(document.readyState==='complete')startCloud();else window.addEventListener('load',startCloud,{once:true});
})();

