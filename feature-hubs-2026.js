/* Elara 2026-10-04 clean feature hubs. Existing business logic is moved, never duplicated. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>document.documentElement.lang==='en'?'en':'fa',tx=(fa,en)=>lang()==='en'?en:fa;
const titles={
 'library-clips':['بریده‌های کتاب','Book clips'],'library-search':['جستجوی کتاب','Find books'],'library-reports':['گزارش مطالعه','Reading report'],'library-shelves':['قفسه‌ها و کتاب‌ها','Shelves & books'],
 'language-books':['کتاب‌های زبان','Language books'],'language-courses':['کلاس‌ها و مسیرها','Classes & paths'],'language-reports':['گزارش زبان','Language report'],
 'wellness-water':['آب','Water'],'wellness-sleep':['خواب','Sleep'],'wellness-exercise':['ورزش و برنامه‌ها','Exercise & plans'],'wellness-weight':['وزن','Weight'],'wellness-reports':['گزارش حال خوب','Wellness report'],'wellness-analysis':['تحلیل','Analysis'],
 'focus-pomodoro':['پومودورو','Pomodoro'],'focus-ambience':['موسیقی و فضای تمرکز','Focus ambience'],'focus-room':['اتاق تمرکز','Focus room'],'focus-deep-work':['کار عمیق','Deep work'],
 'reports-productivity':['گزارش بهره‌وری','Productivity report']
};
const moved=new WeakSet();
function icon(src,alt=''){return '<img class="feature-launcher-art" src="'+src+'" alt="'+esc(alt)+'" loading="lazy" decoding="async">'}
function card(route,src,fa,en,descFa,descEn,opts={}){
 return '<button type="button" class="feature-launcher-card '+(opts.wide?'is-wide ':'')+(opts.gated?'is-gated':'')+'" data-feature-route="'+esc(route)+'">'+icon(src,fa)+'<span><strong>'+tx(fa,en)+'</strong><small>'+tx(descFa,descEn)+'</small>'+(opts.gated?'<em>'+tx('نیازمند Backend واقعی','Real backend required')+'</em>':'')+'</span><b aria-hidden="true">←</b></button>'
}
function hub(host,html,kind){
 let root=host.querySelector(':scope > .feature-hub-launchers[data-hub-kind="'+kind+'"]');
 if(!root){root=document.createElement('section');root.className='feature-hub-launchers';root.dataset.hubKind=kind;host.append(root)}
 root.innerHTML=html;return root
}
function head(panel,parent,eyebrow,title,sub){
 let h=panel.querySelector(':scope > .feature-subpage-head');if(!h){h=document.createElement('header');h.className='feature-subpage-head';panel.prepend(h)}
 h.innerHTML='<button type="button" class="feature-back" data-feature-route="'+parent+'">→ '+tx('بازگشت','Back')+'</button><div><small>'+esc(eyebrow)+'</small><h1>'+tx(title[0],title[1])+'</h1><p>'+tx(sub[0],sub[1])+'</p></div>';
}
function move(node,panel){if(!node||!panel)return;panel.append(node);moved.add(node)}
function readState(){try{return JSON.parse(localStorage.getItem('elara_space_v1')||'{}')}catch{return{}}}
function readingPreview(){
 const s=readState(),books=Array.isArray(s.books)?s.books:[],active=books.filter(b=>b.shelf==='reading').slice(0,4);
 return '<section class="feature-hub-preview"><header><h2>'+tx('در حال مطالعه','Currently reading')+'</h2><button type="button" data-feature-route="library-shelves">'+tx('همه کتاب‌ها','All books')+' ←</button></header><div>'+(
  active.length?active.map(b=>'<article><strong data-elara-ugc dir="auto">'+esc(b.title||tx('بدون عنوان','Untitled'))+'</strong><small>'+Number(b.currentPage||0).toLocaleString(lang()==='en'?'en-US':'fa-IR')+' / '+(Number(b.totalPages)||'—')+'</small></article>').join(''):'<p class="muted">'+tx('کتابی در حال مطالعه نیست؛ از جستجو یا قفسه‌ها شروع کن.','No current book; start from Search or Shelves.')+'</p>'
 )+'</div></section>'
}
function setupLibrary(){
 const parent=$('panel-books');if(!parent)return;
 parent.classList.add('feature-hub-parent','library-feature-hub');
 const clips=$('library-clips'),tools=parent.querySelector('.library-enhancement-tools'),form=$('book-form'),filter=parent.querySelector('.bookshelf-filter'),list=$('book-list'),empty=$('book-empty');
 const clipPanel=$('panel-library-clips'),shelfPanel=$('panel-library-shelves'),searchPanel=$('panel-library-search'),reportPanel=$('panel-library-reports');
 head(clipPanel,'books','LIBRARY · CLIPS',titles['library-clips'],['متن و تصویرهای ماندگار کتاب‌ها.','Quotes, notes and memorable images.']);
 head(shelfPanel,'books','LIBRARY · COLLECTIONS',titles['library-shelves'],['قفسه‌ها، جلدها و کتاب‌های فعلی.','Shelves, covers and your current books.']);
 head(searchPanel,'books','LIBRARY · DISCOVER',titles['library-search'],['جستجو و افزودن کتاب با Open Library.','Search and add books with Open Library.']);
 head(reportPanel,'books','LIBRARY · ANALYTICS',titles['library-reports'],['آمار مطالعه فقط از دادهٔ واقعی خودت.','Reading analytics from your real data only.']);
 if(clips)move(clips,clipPanel);
 for(const n of [tools,form,filter,list,empty])if(n)move(n,shelfPanel);
 searchPanel.querySelector('.library-search-launch')?.remove();const search=document.createElement('section');search.className='elara-card library-search-launch';search.innerHTML=icon('assets/ui/search-button.webp','')+'<div><h2>'+tx('کتاب بعدی‌ات را پیدا کن','Find your next book')+'</h2><p>'+tx('نام کتاب یا نویسنده را جستجو کن؛ نتیجهٔ ساختگی نمایش داده نمی‌شود.','Search by book or author; no fabricated results are shown.')+'</p><button type="button" class="primary-button" data-library-search-direct>'+tx('باز کردن جستجو','Open search')+'</button></div>';searchPanel.append(search);
 const stats=window.ElaraReading?.stats?.(readState().books||[])||'';const chart=window.ElaraReading?.chart?.(readState().books||[])||'';reportPanel.querySelector('.library-report-live')?.remove();const report=document.createElement('section');report.className='elara-card library-report-live';report.innerHTML='<h2>'+tx('خلاصهٔ مطالعه','Reading overview')+'</h2>'+stats+chart+'<button type="button" class="quiet-button" data-feature-route="reports-productivity">'+tx('مرکز همهٔ گزارش‌ها','All reports')+'</button>';reportPanel.append(report);
 const libraryHub=hub(parent,
   card('library-clips','assets/ui/book.webp','بریده کتاب','Book Clips','جمله‌ها، عکس‌ها و یادداشت‌های کتاب','Quotes, images and notes')+
   card('library-search','assets/ui/search-button.webp','جستجوی کتاب','Find Books','کتاب بعدی را پیدا یا اضافه کن','Find or add your next book')+
   card('library-reports','assets/ui/ranking-chart-icon.webp','گزارش مطالعه','Reading Report','آمار و روند مطالعه','Reading stats and trends')+
   card('library-shelves','assets/ui/icon-library-open-book.webp','قفسه‌ها','Shelves','کتاب‌ها و مجموعه‌های شخصی','Books and custom collections'),'library'
 );parent.querySelectorAll(':scope > .feature-hub-preview').forEach(x=>x.remove());libraryHub.insertAdjacentHTML('afterend',readingPreview());
}
function setupLanguage(){
 const parent=$('panel-language');if(!parent)return;parent.classList.add('feature-hub-parent','language-feature-hub');
 const grid=parent.querySelector('.approved-language-grid'),books=parent.querySelector('[data-language-block="books"]'),report=parent.querySelector('[data-language-block="report"]'),courses=parent.querySelector('[data-language-block="courses"]'),leitner=document.querySelector('[data-language-block="leitner"]');
 const bp=$('panel-language-books'),rp=$('panel-language-reports'),cp=$('panel-language-courses'),lp=$('panel-words');
 head(bp,'language','LANGUAGE · BOOKS',titles['language-books'],['مطالعهٔ کتاب‌های زبان و ثبت پیشرفت.','Language reading and progress.']);
 head(rp,'language','LANGUAGE · REPORT',titles['language-reports'],['واژه‌ها، مرور و مطالعهٔ واقعی.','Real vocabulary, review and reading stats.']);
 head(cp,'language','LANGUAGE · CLASSES',titles['language-courses'],['مسیرهای یادگیری؛ بدون دورهٔ ساختگی.','Learning paths without fake courses.']);
 if(lp)head(lp,'language','LANGUAGE · LEITNER',['جعبه لایتنر','Leitner Box'],['طراحی و تصاویر اصلی لایتنر بدون تغییر حفظ شده‌اند.','The original Leitner design and artwork are preserved.']);
 if(books)move(books,bp);if(report)move(report,rp);if(courses)move(courses,cp);
 if(leitner&&lp){leitner.classList.remove('feature-source-hidden');move(leitner,lp)}
 if(grid&&!grid.children.length)grid.classList.add('feature-source-hidden');
 hub(parent,
   card('words','assets/ui/22-leitner-box-icon.webp','جعبه لایتنر','Leitner Box','مرور فاصله‌دار با همان طراحی و تصاویر اصلی','Spaced repetition with the original design and artwork')+
   card('language-books','assets/ui/23-language-books-icon.webp','کتاب‌های زبان','Language Books','کتاب و گزارش مطالعه','Books and reading logs')+
   card('language-courses','assets/ui/24-language-classes-icon.webp','کلاس‌ها','Classes','مسیرهای آموزشی واقعی وقتی Backend آماده شد','Real learning paths when backend is ready',{gated:true})+
   card('language-reports','assets/ui/25-study-report-icon.webp','گزارش زبان','Study Report','مرور، واژه و مطالعه','Reviews, vocabulary and reading'),'language'
 );
}
function splitWeight(water,weightPanel){
 const settings=water?.querySelector('.wellness-water-settings');if(!settings)return;
 const weight=settings.querySelector('#wellness-weight')?.closest('label'),target=settings.querySelector('#wellness-target-weight')?.closest('label'),status=settings.querySelector('.wellness-weight-status');
 let card=weightPanel.querySelector('.wellness-weight-route-card');if(!card){card=document.createElement('section');card.className='elara-card wellness-weight-route-card';card.innerHTML='<header><h2>'+icon('assets/ui/icon-wellness-weight-scale.webp','')+tx(' وزن و هدف شخصی',' Weight & personal goal')+'</h2></header><div class="wellness-weight-route-fields"></div><button class="primary-button" type="button" data-wellness-save-settings>'+tx('ذخیره','Save')+'</button>';weightPanel.append(card)}
 const fields=card.querySelector('.wellness-weight-route-fields');for(const n of [weight,target,status])if(n)fields.append(n);
}
function setupWellness(){
 const parent=$('panel-exercise');if(!parent)return;parent.classList.add('feature-hub-parent','wellness-feature-hub');
 const water=parent.querySelector('.wellness-water'),sleep=parent.querySelector('.wellness-sleep'),exercise=parent.querySelector('.wellness-workouts'),plans=parent.querySelector('.wellness-plans'),analysis=parent.querySelector('.wellness-analysis'),context=parent.querySelector('.wellness-profile-context');
 const wp=$('panel-wellness-water'),sp=$('panel-wellness-sleep'),ep=$('panel-wellness-exercise'),weight=$('panel-wellness-weight'),ap=$('panel-wellness-analysis'),rp=$('panel-wellness-reports');
 for(const [panel,key] of [[wp,'wellness-water'],[sp,'wellness-sleep'],[ep,'wellness-exercise'],[weight,'wellness-weight'],[ap,'wellness-analysis'],[rp,'wellness-reports']])head(panel,'exercise','WELLNESS',titles[key],['ثبت خصوصی و سادهٔ حال خوب.','A private, simple wellness space.']);
 splitWeight(water,weight);
 if(water)move(water,wp);if(sleep)move(sleep,sp);if(plans)move(plans,ep);if(exercise)move(exercise,ep);if(context)move(context,ep);if(analysis)move(analysis,ap);
 rp.querySelector('.wellness-report-shortcuts')?.remove();const rs=document.createElement('section');rs.className='wellness-report-shortcuts feature-hub-launchers';rs.innerHTML=card('wellness-water','assets/ui/icon-wellness-water.webp','آب','Water','لیوان‌ها و روند هفتگی','Glasses and weekly trend')+card('wellness-sleep','assets/ui/icon-night-crescent-moon.webp','خواب','Sleep','ساعت‌های خواب ثبت‌شده','Logged sleep duration')+card('wellness-exercise','assets/ui/icon-exercise-dumbbell.webp','ورزش','Exercise','تمرین‌ها و برنامه‌ها','Workouts and plans')+card('wellness-analysis','assets/ui/ranking-chart-icon.webp','تحلیل','Analysis','جمع‌بندی بدون تشخیص پزشکی','A non-medical overview');rp.append(rs);
 hub(parent,
   card('wellness-water','assets/ui/icon-wellness-water.webp','آب','Water','لیوان‌های امروز و هدف آب','Today’s glasses and goal')+
   card('wellness-sleep','assets/ui/icon-night-crescent-moon.webp','خواب','Sleep','ثبت و روند خواب','Sleep log and trend')+
   card('wellness-exercise','assets/ui/icon-exercise-dumbbell.webp','ورزش','Exercise','تمرین و برنامه ورزشی/تغذیه','Workouts and training/nutrition plans')+
   card('wellness-weight','assets/ui/icon-wellness-weight-scale.webp','وزن','Weight','وزن فعلی و هدف شخصی','Current and target weight')+
   card('wellness-reports','assets/ui/ranking-chart-icon.webp','گزارش‌ها','Reports','میانبر گزارش‌های حال خوب','Wellness report shortcuts',{wide:true})+
   card('wellness-analysis','assets/ui/icon-wellness-heartbeat.webp','تحلیل','Analysis','الگوهای ثبت‌شدهٔ واقعی','Patterns from your real logs',{wide:true}),'wellness'
 );
}
function setupFocus(){
 const parent=$('panel-focus');if(!parent)return;parent.classList.add('feature-hub-parent','focus-feature-hub');
 const pom=$('panel-focus-pomodoro'),amb=$('panel-focus-ambience'),room=$('panel-focus-room'),deep=$('panel-focus-deep-work');
 for(const [panel,key] of [[pom,'focus-pomodoro'],[amb,'focus-ambience'],[room,'focus-room'],[deep,'focus-deep-work']])head(panel,'focus','FOCUS',titles[key],['یک مقصد خلوت برای تمرکز.','A calm destination for focus.']);
 const timer=document.querySelector('#panel-focus .focus-card,#panel-books .focus-card,#ref-library-focus .focus-card');if(timer)move(timer,pom);
 const legacy=$('ref-library-focus');if(legacy&&!legacy.querySelector('.focus-card'))legacy.remove();
 const ambience=$('focus-ambience');if(ambience)move(ambience,amb);
 room.querySelector('.feature-gated-message')?.remove();room.insertAdjacentHTML('beforeend','<section class="elara-card feature-gated-message"><h2>'+tx('اتاق تمرکز گروهی','Shared Focus Room')+'</h2><p>'+tx('دعوت دوست، حضور زنده، همگام‌سازی Pomodoro و ثبت Stop هر نفر بعد از آماده‌شدن Realtime backend فعال می‌شود.','Friend invites, live presence, synchronized Pomodoro and per-person stop events require the realtime backend.')+'</p><span>'+tx('بدون کاربر یا حضور آنلاین ساختگی','No fake users or presence')+'</span></section>');
 deep.querySelector('.feature-deep-work')?.remove();deep.insertAdjacentHTML('beforeend','<section class="elara-card feature-deep-work"><h2>'+tx('جلسهٔ کار عمیق','Deep Work session')+'</h2><p>'+tx('از Pomodoro با مدت و Tag واقعی استفاده کن؛ نتیجه طبق Privacy در Activity ثبت می‌شود.','Use Pomodoro with a real duration and tag; completion follows your Activity privacy.')+'</p><button class="primary-button" type="button" data-feature-route="focus-pomodoro">'+tx('شروع','Start')+'</button></section>');
 hub(parent,
  card('focus-pomodoro','assets/ui/icon_brain.webp','پومودورو','Pomodoro','تایمر و چرخه‌های تمرکز','Timer and focus cycles')+
  card('focus-room','assets/ui/friends-group-icon.webp','اتاق تمرکز','Focus Room','تمرکز مشترک با دوستان','Shared focus with friends',{gated:true})+
  card('focus-ambience','assets/ui/icon-night-crescent-moon.webp','موسیقی و فضا','Music / Ambience','صدای محیطی و منظرهٔ تمرکز','Soundscape and focus scene')+
  card('focus-deep-work','assets/ui/icon-achievement-star.webp','کار عمیق','Deep Work','جلسهٔ جدی با مدت و Tag','A focused session with duration and tag'),'focus'
 );
}
function setupReports(){
 const parent=$('panel-reports'),prod=$('panel-reports-productivity');if(!parent||!prod)return;parent.classList.add('feature-hub-parent','reports-feature-hub');
 head(prod,'reports','REPORTS',titles['reports-productivity'],['همهٔ نمودارهای کامل بهره‌وری.','Your full productivity analytics.']);
 const live=$('elara-reports-page');if(live)move(live,prod);
 hub(parent,
  card('library-reports','assets/ui/book.webp','گزارش مطالعه','Reading Report','صفحه‌ها و پیشرفت کتاب','Pages and book progress')+
  card('language-reports','assets/ui/icon_brain.webp','گزارش زبان','Language Report','واژه، مرور و مطالعه','Vocabulary, reviews and reading')+
  card('wellness-reports','assets/ui/icon-wellness-heartbeat.webp','گزارش ورزش و حال خوب','Fitness Report','آب، خواب و تمرین','Water, sleep and exercise')+
  card('reports-productivity','assets/ui/ranking-chart-icon.webp','گزارش بهره‌وری','Productivity Report','تسک، عادت، هدف و تمرکز','Tasks, habits, goals and focus'),'reports'
 );
}
function setupAliases(){
 const redirects={'reports-reading':'library-reports','reports-language':'language-reports','reports-fitness':'wellness-reports'};
 window.addEventListener('elara:open',e=>{const target=redirects[e.detail?.tab];if(target)queueMicrotask(()=>window.ElaraOpen?.(target,{history:'replace'}));const label=titles[e.detail?.tab];if(label&&$('page-title'))$('page-title').textContent=tx(label[0],label[1])});
}
function openRoute(route){if(route==='words')window.ElaraOpen?.('words');else window.ElaraOpen?.(route,{history:'push'})}
function bind(){
 document.addEventListener('click',e=>{
  const go=e.target.closest('[data-feature-route]');if(go){e.preventDefault();openRoute(go.dataset.featureRoute);return}
  if(e.target.closest('[data-library-search-direct]')){void window.ElaraLibraryEnhancements?.searchBooks?.()}
 });
}
let scheduled=false;
function setup(){scheduled=false;setupLibrary();setupLanguage();setupWellness();setupFocus();setupReports();window.ElaraFeatureHubs={refresh:setup,card}}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(setup,0)}
setupAliases();bind();
for(const ev of ['elara:locale-changed','elara:state-committed','elara:hydrate'])window.addEventListener(ev,schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,0),{once:true});else setTimeout(setup,0);
})();