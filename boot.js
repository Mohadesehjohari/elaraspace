/* Approved Elara UI and Firebase account/social startup. */
(() => {
  window.__elaraBootInProgress=true;
  const BUILD='20261015-freedom-r31-seven-v2';
  // Initial route is normalized inline in index.html before deferred modules run.
  if(!location.hash||location.hash==='#')history.replaceState({...history.state,elaraTab:'home'},'',location.pathname+location.search+'#home');
  const assetUrl=name=>`${name}${name.includes('?')?'&':'?'}v=${name==='language-custom-classes.js'?'20261015-class-popup-v3':/^(social-messaging-ui\.js|friends-chats-redesign\.css)$/.test(name)?'20261012-chats-r1':BUILD}`;
  const styles=['elara-design.css','elara-finishing.css','approved-visual.css','approved-tuning.css','approved-reference-fidelity.css','approved-wellness.css','approved-navigation-extension.css','approved-seasonal.css','approved-home-return.css','approved-language-journal.css','visual-fidelity-pass2.css','visual-fidelity-pass3.css','visual-fidelity-pass4.css','artwork-home-install-2026.css','home-functional-pass-2026.css','reference-home-shell-2026.css','visual-fidelity-pass5.css','reference-restore.css','reference-exact-pass-2026.css','freedom-page.css','october-fixes-2026-10-01.css','freedom-refinement-v2.css','friends-hub.css','friends-chats-redesign.css','october-product-hubs.css','mobile-ia-2026-10-05.css','avatar-3d.css','task-goal-final-2026.css','elara-midnight-layout-2026.css','profile-gallery-2026.css','collab-2026.css','home-owner-art-2026.css','global-page-banner-20261009.css','ui12-language-dashboard.css','ui13-language.css','well01-wellness-dashboard.css','wellness-reference-popups-20261012.css','freedom-dashboard-r2026.css','store-reference-2026.css','desktop-home-only-controls-20261012.css','tasks-mobile-fidelity-20261012.css','freedom-r27-polish.css','ranking-gold-20261012.css','home-reference-polish-20261012.css','task-blue-compact-20261012.css','task-organizer-20261012.css','task-mobile-inline-20261012.css','task-layout-hotfix-20261012.css','task-final-round-archive-20261014.css','task-completion-polish-20261014.css','task-streak-calendar-20261012.css','freedom-r28-notebook.css','freedom-r30-pages.css','freedom-r31-remaining.css'];
  /* Shared styles have one deterministic cascade position, ahead of every new page owner's CSS. */
  const ownerStyleAnchor=document.getElementById('elara-page-owner-styles');
  // Core/Home styling first, Tasks next; unrelated page themes stream in later.
  const secondaryStyles=new Set(['freedom-page.css','freedom-refinement-v2.css','friends-hub.css','october-product-hubs.css','profile-gallery-2026.css','collab-2026.css','ui12-language-dashboard.css','ui13-language.css','well01-wellness-dashboard.css','wellness-reference-popups-20261012.css','freedom-dashboard-r2026.css','store-reference-2026.css','freedom-r27-polish.css','ranking-gold-20261012.css']);
  const taskStyles=new Set(['task-goal-final-2026.css','tasks-mobile-fidelity-20261012.css']);
  const initialRoute=(location.hash||'#home').slice(1).split('?')[0];
  const routeStyles={freedom:['freedom-page.css','freedom-refinement-v2.css','freedom-r27-polish.css','freedom-r28-notebook.css','freedom-r30-pages.css','freedom-r31-remaining.css'],social:['friends-hub.css','friends-chats-redesign.css'],books:['october-product-hubs.css'],language:['ui12-language-dashboard.css','ui13-language.css'],exercise:['well01-wellness-dashboard.css','wellness-reference-popups-20261012.css'],ranking:['ranking-gold-20261012.css'],store:['store-reference-2026.css']};
  const priorityStyles=new Set([...(routeStyles[initialRoute]||[]),'reference-home-shell-2026.css','reference-exact-pass-2026.css','elara-midnight-layout-2026.css','home-owner-art-2026.css','global-page-banner-20261009.css','home-reference-polish-20261012.css']);
  const styleLinks=styles.map(name=>{const css=document.createElement('link');css.rel='stylesheet';css.href=assetUrl(name);return css});
  const styleReady=new Map();
  const mountStyle=name=>{
    if(styleReady.has(name))return styleReady.get(name);
    const i=styles.indexOf(name),css=styleLinks[i];
    if(!css)return Promise.resolve({name,ok:false});
    const done=new Promise(resolve=>{
      css.onload=()=>resolve({name,ok:true});
      css.onerror=()=>{console.warn('Elara style unavailable:',name);resolve({name,ok:false})};
    });
    styleReady.set(name,done);
    // Preserve canonical cascade order even when stylesheets are inserted in phases.
    const later=styleLinks.slice(i+1).find(link=>link.isConnected);
    (later||ownerStyleAnchor)?.before(css);
    if(!css.isConnected)document.head.append(css);
    return done;
  };
  const primaryCss=styles.filter(name=>(!taskStyles.has(name)&&!secondaryStyles.has(name))||priorityStyles.has(name));
  primaryCss.forEach(mountStyle);
  // Do not reveal Home using an intermediate cascade: final mobile geometry lives
  // in these owners, especially home-owner-art-2026.css (two-column rail).
  const homePaintStyles=['elara-design.css','elara-finishing.css','approved-navigation-extension.css',
    'reference-home-shell-2026.css','reference-exact-pass-2026.css',
    'elara-midnight-layout-2026.css','home-owner-art-2026.css',
    'home-reference-polish-20261012.css','mobile-ia-2026-10-05.css'];
  const homeStylesReady=Promise.all(homePaintStyles.map(mountStyle)).then(styles=>{
    const missing=styles.filter(style=>!style.ok).map(style=>style.name);
    if(missing.length)throw new Error('Home CSS unavailable: '+missing.join(', '));
    return true;
  });
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=assetUrl('assets/logo.svg');document.head.append(icon);
  // The Home banner is preloaded in HTML. Never decode all app icons during startup:
  // decoding triggers extra requests and is unnecessary for the first usable frame.
  const release=()=>{
    if(!document.documentElement.hasAttribute('data-elara-booting'))return;
    performance.mark('elara-home-visible');
    window.__elaraHomeVisibleMs=Math.round(performance.now());
    document.documentElement.removeAttribute('data-elara-booting');
    document.documentElement.removeAttribute('data-elara-boot-failed');
    window.__elaraBootInProgress=false;
    window.__elaraBootStage='home';
    window.dispatchEvent(new Event('elara:visual-ready'));
  };
  const criticalScripts=['feature-hubs-shell.js','approved-visual.js','approved-runtime.js','approved-home-return.js','reference-shell-compat-2026.js','artwork-home-install-2026.js','home-functional-pass-2026.js','mobile-ia-2026-10-05.js','home-reference-polish-20261012.js'];
  const deferredScripts=['approved-focus-dialog.js','approved-wellness.js','approved-overlay-guard.js','approved-language-journal.js','visual-fidelity-pass2.js','visual-fidelity-pass3.js','task-bulk-reorder.js','task-checklist.js','entity-reorder.js','entity-bulk-selection.js','task-collections.js','focus-ambience.js','domain-notifications.js','mission-celebration.js','social-view.js','social-messaging-ui.js','social-groups-ui.js','social-clubs-ui.js','social-challenges-ui.js','page-view.js','social-engagement-view.js','reports.js','blog-view.js','freedom-page.js','freedom-enhancements.js','freedom-diary-music.js','freedom-ai.js','feature-hubs-2026.js','language-custom-classes.js','store-view.js','profile-social-tools.js','mobile-banner-copy.js','global-page-banner-20261009.js','ui12-language-dashboard.js','ui13-language-routes.js','language-four-routes-20261015.js','well01-wellness-dashboard.js','wellness-reference-popups-20261012.js','freedom-dashboard-r2026.js','freedom-r27-music.js','ranking-gold-20261012.js','task-organizer-20261012.js','task-cross-links-20261012.js','task-streak-calendar-20261012.js','freedom-r28-notebook.js','freedom-r30-pages.js','freedom-r31-remaining.js'];
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
      let settled=false;
      const finish=error=>{
        if(settled)return;
        settled=true;clearTimeout(timeout);
        if(error){rememberOptionalFailure(name,error);console.warn('Elara module unavailable:',name,error.message);script.remove()}
        resolve();
      };
      const timeout=setTimeout(()=>finish(new Error('script load timeout')),6500);
      script.onload=()=>finish();
      script.onerror=()=>finish(new Error('script load failed'));
      document.head.append(script);
    }));
    await Promise.all(pending);
    syncOptionalFailures();
  };
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const domReady=new Promise(resolve=>{
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resolve,{once:true});
    else resolve();
  });
  let startupReleased=false,homeCheckTimer=null;
  const actualHomeReady=()=>{
    const home=document.getElementById('panel-home');
    const grid=home?.querySelector('.elara-dashboard-grid');
    return !!(home?.classList.contains('owner-art-home') &&
      grid?.dataset.structureReady==='true' && home.querySelector('.owner-home-hero-image') &&
      home.querySelector('#ref-streak-card.owner-home-streak') &&
      grid.querySelector('#elara-home-tasks') &&
      typeof window.ElaraOpen==='function' && typeof window.ElaraReferenceHome?.render==='function');
  };
  const refreshHome=()=>{
    if(!document.getElementById('panel-home'))return false;
    try{
      window.ElaraNavigation?.render?.();
      window.ElaraReferenceHome?.render?.();
    }catch(error){console.error('Elara Home render error:',error);window.__elaraHomeError=String(error?.message||error)}
    return actualHomeReady();
  };
  const revealHome=()=>{
    if(startupReleased||!actualHomeReady())return false;
    startupReleased=true;clearTimeout(homeCheckTimer);release();
    return true;
  };
  // No time-based reveal: a blank fallback shell is NOT a successful boot.
  const retryUntilReady=(attempt=0)=>{
    if(startupReleased)return;
    if(refreshHome()&&revealHome())return;
    if(attempt<60){homeCheckTimer=setTimeout(()=>retryUntilReady(attempt+1),250)}
    else window.ElaraShowBootError?.(window.__elaraHomeError||'Home did not mount');
  };
  void(async()=>{
    const primaryReady=loadScriptsInOrder(criticalScripts);
    try{
      // The owner scripts are parser-ordered defer tags in index.html.
      await domReady;
      // The canonical Home exists by now, but its CSS and owner artwork may not.
      // No old one-column layout, oversized streak or fallback icon may be painted.
      await homeStylesReady;
      if(initialRoute!=='home'){
        const routeSpecific=[...(initialRoute==='tasks'?['task-blue-compact-20261012.css',
          'task-organizer-20261012.css','task-mobile-inline-20261012.css',
          'task-layout-hotfix-20261012.css','task-streak-calendar-20261012.css']:[]),
          ...(routeStyles[initialRoute]||[])];
        const results=await Promise.all(routeSpecific.map(mountStyle));
        const missing=results.filter(style=>!style.ok).map(style=>style.name);
        if(missing.length)console.warn('Optional route style unavailable:',missing.join(', '));
      }
      retryUntilReady();
    }catch(error){
      console.error('Elara Home bootstrap failed:',error);
      window.ElaraShowBootError?.(String(error?.message||error));
    }
    // Tasks and optional routes may load after the first real Home frame.
    try{
      await primaryReady;
      const tasks=['task-bulk-reorder.js','task-checklist.js','entity-reorder.js','entity-bulk-selection.js','task-collections.js'];
      taskStyles.forEach(mountStyle);
      await loadScriptsInOrder(tasks);
      window.__elaraBootStage='tasks';
      window.dispatchEvent(new Event('elara:tasks-ready'));
      await delay(100);
      styles.filter(name=>secondaryStyles.has(name)&&!styleReady.has(name)).forEach(mountStyle);
      const taskNames=new Set(tasks);
      const rest=deferredScripts.filter(name=>!taskNames.has(name));
      for(let i=0;i<rest.length;i+=6){
        await loadScriptsInOrder(rest.slice(i,i+6));
        if(i+6<rest.length)await delay(120);
      }
      window.ElaraFeatureHubs?.refresh?.();
      window.ElaraGlobalBanners?.refresh?.();
      window.ElaraLibraryDashboardLIB01?.refresh?.();
      window.ElaraLanguageUI12?.refresh?.();
      window.ElaraReportsDashboard?.render?.();
      window.__elaraBootStage='secondary';
      window.dispatchEvent(new Event('elara:secondary-ready'));
    }catch(error){console.warn('Elara optional features:',error)}
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
  // Window load waits for images and background styles; account initialization should not.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startCloud,{once:true});else startCloud();
})();

