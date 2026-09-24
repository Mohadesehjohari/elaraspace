/* Approved Elara UI and Firebase account/social startup. */
(() => {
  const styleReady=[];
  const styles=['elara-design.css','elara-finishing.css','approved-visual.css','approved-tuning.css','approved-reference-fidelity.css','approved-wellness.css','approved-navigation-extension.css','approved-seasonal.css','approved-home-return.css','approved-language-journal.css','visual-fidelity-pass2.css','visual-fidelity-pass3.css','visual-fidelity-pass4.css','visual-fidelity-pass5.css','reference-home-shell-2026.css','artwork-home-install-2026.css','home-functional-pass-2026.css'];
  /* All of the shell CSS participates in first paint, not only the last three stylesheets. */
  for(const name of styles){const css=document.createElement('link');css.rel='stylesheet';css.href=name;styleReady.push(new Promise((resolve,reject)=>{css.onload=resolve;css.onerror=()=>reject(new Error('Elara stylesheet unavailable: '+name))}));document.head.append(css)}
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='assets/logo.svg';document.head.append(icon);
  /* Only the current Home artwork is prioritized; other illustrations are not mass-preloaded. */
  if(!location.hash||location.hash==='#home')for(const src of ['assets/ui/hero-landscape.webp','assets/ui/nav-home-active.webp']){const preload=document.createElement('link');preload.rel='preload';preload.as='image';preload.href=src;preload.fetchPriority='high';document.head.append(preload)}
  const release=()=>document.documentElement.removeAttribute('data-elara-booting');
  const loadScript=name=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=name;script.onload=resolve;script.onerror=()=>reject(new Error('Elara module unavailable: '+name));document.head.append(script)});
  let ready=false;
  const slow=setTimeout(()=>{if(ready)return;const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');if(status)status.textContent='آماده‌سازی صفحه طولانی شده است؛ اتصال اینترنت و بارگذاری فایل‌ها را بررسی کن.';if(retry)retry.hidden=false},9000);
  void(async()=>{
    try{
      for(const name of ['approved-icon-system.js','approved-navigation-extension.js','elara-design.js','approved-visual.js','approved-runtime.js','approved-focus-dialog.js','approved-wellness.js','approved-home-return.js','approved-overlay-guard.js','approved-language-journal.js','visual-fidelity-pass2.js','visual-fidelity-pass3.js','reference-shell-compat-2026.js','reference-home-shell-2026.js','artwork-home-install-2026.js','home-functional-pass-2026.js'])await loadScript(name);
      await Promise.all(styleReady);
      window.ElaraNavigation?.render?.();window.ElaraReferenceHome?.render?.();
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
