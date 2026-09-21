/* Approved Elara UI and Firebase account/social startup. */
(() => {
  for(const name of ['elara-design.css','elara-finishing.css']){const css=document.createElement('link');css.rel='stylesheet';css.href=name;document.head.append(css)}
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='assets/logo.svg';document.head.append(icon);
  const design=document.createElement('script');design.src='elara-design.js';document.head.append(design);
  const launch=async()=>{
    const status=document.getElementById('cloud-status'),retry=document.getElementById('cloud-retry');
    try{
      if(status)status.textContent='در حال اتصال امن به Firebase…';if(retry)retry.hidden=true;
      await import('./cloud.js');
      try{await import('./elara-social.js')}catch(error){console.error('Elara social startup:',error);const msg=document.getElementById('elara-social-message');if(msg)msg.textContent='بخش دوستان بارگذاری نشد. اتصال اینترنت و فایل‌ها را بررسی کن.'}
    }catch(error){console.error('Elara cloud startup:',error);if(status)status.textContent='ارتباط با حساب Firebase برقرار نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.';if(retry)retry.hidden=false}
  };
  document.addEventListener('DOMContentLoaded',()=>{document.getElementById('cloud-retry')?.addEventListener('click',()=>location.reload());void launch()},{once:true});
})();