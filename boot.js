/* Approved Elara UI and Firebase account/social startup. */
(() => {
  const styleReady=[];
  const styles=['elara-design.css','elara-finishing.css','approved-visual.css','approved-tuning.css','approved-reference-fidelity.css','approved-wellness.css','approved-navigation-extension.css','approved-seasonal.css','approved-home-return.css','approved-language-journal.css','visual-fidelity-pass2.css','visual-fidelity-pass3.css','visual-fidelity-pass4.css','visual-fidelity-pass5.css','reference-home-shell-2026.css','artwork-home-install-2026.css','home-functional-pass-2026.css'];
  /* All of the shell CSS participates in first paint, not only the last three stylesheets. */
  for(const name of styles){const css=document.createElement('link');css.rel='stylesheet';css.href=name;styleReady.push(new Promise((resolve,reject)=>{css.onload=resolve;css.onerror=()=>reject(new Error('Elara stylesheet unavailable: '+name))}));document.head.append(css)}
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='assets/logo.svg';document.head.append(icon);
  /* First-paint artwork is requested before the shell is released so users do not see legacy SVGs swap to WebPs. */
  const criticalImages=(!location.hash||location.hash==='#home')?[
    'assets/ui/hero-landscape.webp','assets/ui/nav-home-active.webp','assets/ui/nav-tasks-default.webp','assets/ui/nav-language-default.webp','assets/ui/nav-library-default.webp','assets/ui/nav-ranking-default.webp','assets/ui/nav-exercise-default.webp','assets/ui/friends-group-icon.webp',
    'assets/ui/icon-mode-night-active.webp','assets/ui/icon-mode-night-default.webp','assets/ui/icon-notifications-read.webp','assets/ui/icon-notifications-unread.webp','assets/ui/brand-elara-app-mark.webp','assets/ui/icon-wellness-heartbeat.webp','assets/ui/icon-exercise-dumbbell.webp','assets/ui/icon-ranking-trophy.webp','assets/ui/missions-rocket.webp','assets/ui/streak-flame.webp','assets/ui/friends-tab.webp'
  ]:[];
  const decodeImage=src=>new Promise(resolve=>{const img=new Image();let settled=false;const done=()=>{if(settled)return;settled=true;resolve()};img.onload=done;img.onerror=done;img.src=src;if(typeof img.decode==='function')img.decode().then(done,done)});
  for(const src of criticalImages){const preload=document.createElement('link');preload.rel='preload';preload.as='image';preload.href=src;preload.fetchPriority='high';document.head.append(preload)}
  const firstPaintArtwork=Promise.all(criticalImages.map(decodeImage));
  const release=()=>document.documentElement.removeAttribute('data-elara-booting');
  const loadScript=name=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=name;script.onload=resolve;script.onerror=()=>reject(new Error('Elara module unavailable: '+name));document.head.append(script)});
  let ready=false;
  const slow=setTimeout(()=>{if(ready)return;const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');if(status)status.textContent='آماده‌سازی صفحه طولانی شده است؛ اتصال اینترنت و بارگذاری فایل‌ها را بررسی کن.';if(retry)retry.hidden=false},9000);
  void(async()=>{
    try{
      for(const name of ['approved-icon-system.js','approved-navigation-extension.js','elara-design.js','approved-visual.js','approved-runtime.js','approved-focus-dialog.js','approved-wellness.js','approved-home-return.js','approved-overlay-guard.js','approved-language-journal.js','visual-fidelity-pass2.js','visual-fidelity-pass3.js','reference-shell-compat-2026.js','reference-home-shell-2026.js','artwork-home-install-2026.js','home-functional-pass-2026.js'])await loadScript(name);
      await Promise.all(styleReady);
      window.ElaraNavigation?.render?.();window.ElaraReferenceHome?.render?.();
      /* Avoid multi-second blank screens on poor links, but normally release only after critical art decodes. */
      await Promise.race([firstPaintArtwork,new Promise(resolve=>setTimeout(resolve,1400))]);
      ready=true;release();
    }catch(error){console.error('Elara final shell could not start:',error);const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');if(status)status.textContent='بارگذاری پوستهٔ الارا کامل نشد. اتصال را بررسی کن و دوباره تلاش کن.';if(retry)retry.hidden=false}
    finally{clearTimeout(slow)}
  })();
  const launch=async()=>{
    const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');
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
      await import('./cloud.js');
      try{await import('./elara-social.js')}catch(error){console.error('Elara social startup:',error);const msg=document.getElementById('elara-social-message');if(msg)msg.textContent='بخش دوستان بارگذاری نشد. اتصال اینترنت و فایل‌ها را بررسی کن.'}
    }catch(error){console.error('Elara cloud startup:',error);if(status)status.textContent='ارتباط با حساب Firebase برقرار نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.';if(retry)retry.hidden=false}
  };
  document.addEventListener('DOMContentLoaded',()=>{document.getElementById('cloud-retry')?.addEventListener('click',()=>location.reload());void launch()},{once:true});
})();
