/* Approved Elara UI and Firebase account/social startup. */
(() => {
  for(const name of ['elara-design.css','elara-finishing.css','approved-visual.css','approved-tuning.css','approved-reference-fidelity.css','approved-wellness.css','approved-navigation-extension.css','approved-seasonal.css','approved-home-return.css','approved-language-journal.css','visual-fidelity-pass2.css','visual-fidelity-pass3.css','visual-fidelity-pass4.css','visual-fidelity-pass5.css','reference-home-shell-2026.css']){const css=document.createElement('link');css.rel='stylesheet';css.href=name;document.head.append(css)}
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='assets/logo.svg';document.head.append(icon);
  const loadScript=name=>new Promise(resolve=>{const script=document.createElement('script');script.src=name;script.onload=()=>resolve(true);script.onerror=()=>{console.error('Elara module not loaded:',name);resolve(false)};document.head.append(script)});
  void (async()=>{
    if(!await loadScript('approved-icon-system.js'))return;
    if(!await loadScript('approved-navigation-extension.js'))return;
    if(!await loadScript('elara-design.js'))return;
    if(!await loadScript('approved-visual.js'))return;
    for(const name of ['approved-runtime.js','approved-focus-dialog.js','approved-wellness.js','approved-home-return.js','approved-overlay-guard.js','approved-language-journal.js','visual-fidelity-pass2.js','visual-fidelity-pass3.js','reference-shell-compat-2026.js','reference-home-shell-2026.js'])await loadScript(name);
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
