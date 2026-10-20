/* Task banner report link, like the small top-of-banner Reports shortcut. */
(()=>{'use strict';
function ensure(){
 const hero=document.getElementById('astra-task-hero');
 if(!hero||hero.querySelector('.task-banner-report-label'))return;
 const link=document.createElement('a');
 link.className='task-banner-report-label';
 link.href='#reports';
 link.textContent='گزارش‌ها';
 link.setAttribute('aria-label','مشاهده گزارش‌ها');
 hero.append(link);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
window.addEventListener('elara:open',ensure);
window.addEventListener('elara:hydrate',ensure);
})();