/* A visible error path if the Firebase CDN is unreachable. */
(() => {
  const launch = async () => {
    const status = document.getElementById('cloud-status');
    const retry = document.getElementById('cloud-retry');
    try {
      if (status) status.textContent = 'در حال اتصال امن به Firebase…';
      if (retry) retry.hidden = true;
      await import('./cloud.js');
    } catch (error) {
      console.error('Elara cloud startup:', error);
      if (status) status.textContent = 'اتصال به سرویس حساب کاربری برقرار نشد. اینترنت یا VPN را بررسی کن و دوباره تلاش کن.';
      if (retry) retry.hidden = false;
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cloud-retry')?.addEventListener('click', () => location.reload());
    launch();
  }, {once:true});
})();
