/* Central FA/EN presentation layer. Dynamic renderers may keep canonical Persian copy; this layer owns locale output. */
(()=>{'use strict';
const KEY='elara_locale_v1',fa=/[؀-ۿ]/,textOrigin=new WeakMap(),attrOrigin=new WeakMap();
const exact=new Map(Object.entries({
'خانه':'Home','تسک‌ها':'Tasks','زبان':'Language','کتابخانه':'Library','ورزش':'Exercise','آزادی':'Freedom','رنکینگ':'Ranking','دوستان':'Friends',
'تنظیمات':'Settings','اعلان‌ها':'Notifications','حساب کاربری':'Account','حریم خصوصی':'Privacy','پوشه‌ها و تگ‌ها':'Folders & Tags','ظاهر و تم‌ها':'Appearance & Themes',
'کمد':'Wardrobe','تقویم':'Calendar','راهنما':'Help','خروج':'Sign out','ویرایش پروفایل':'Edit profile','ذخیره':'Save','انصراف':'Cancel','بستن':'Close',
'نام نمایشی':'Display name','نام کاربری':'Username','دربارهٔ خودت…':'About you…','پروفایل ذخیره شد.':'Profile saved.','در حال ذخیره…':'Saving…',
'همه':'All','امروز':'Today','انجام‌شده':'Completed','در حال انجام':'In progress','افزودن تسک':'Add task','جستجوی تسک…':'Search tasks…','فیلتر':'Filter',
'کارهای امروز':'Today Tasks','عادت‌های امروز':'Today Habits','سلامت / ورزش':'Wellness / Exercise','ماموریت‌های امروز':'Today Missions','اهداف من':'My Goals','رنکینگ این هفته':'Weekly Ranking','فعالیت دوستان':'Friends Activity',
'آب':'Water','خواب':'Sleep','تمرین':'Exercise','وزن':'Weight','لیوان':'glasses','ساعت':'hours','دقیقه':'minutes','کیلوگرم':'kg',
'گزارش مطالعه':'Reading report','ثبت مطالعه':'Log reading','کل صفحات':'Total pages','صفحهٔ فعلی (اختیاری)':'Current page (optional)','تاریخ شروع (اختیاری)':'Start date (optional)','ذخیره کتاب':'Save book',
'در حال مطالعه':'Reading','خوانده‌شده':'Finished','برای مطالعه':'Want to read','نام کتاب…':'Book title…','کل صفحات':'Total pages',
'جعبهٔ لایتنر':'Leitner Box','مرور هوشمند':'Smart review','شروع مرور':'Start review','کتاب‌های زبان':'Language Books','گزارش یادگیری':'Learning Report','کلاس‌های آنلاین / کورس‌ها':'Online Classes / Courses',
'دعوت از دوستان':'Invite friends','درخواست‌های دوستی':'Friend Requests','دوستان آنلاین':'Online Friends','رنکینگ هفته':'Weekly Ranking','کافه و کلاب‌ها':'Clubs & Cafe','جامعه':'Community','کلاب‌ها':'Clubs',
'ارسال درخواست دوستی':'Send friend request','جستجوی دوست':'Search user','درخواست فرستاده شد.':'Request sent.','درخواست ارسال شد · در انتظار':'Request sent · Pending','قبول درخواست':'Accept request','رد درخواست':'Decline request',
'خواندن همه':'Mark all read','پاک‌کردن خوانده‌شده‌ها':'Clear read','اعلان تازه‌ای نداری.':'No new notifications.','خواندم':'Mark read','مشاهده':'View',
'تغییر حالت روشن یا تاریک':'Toggle light or dark mode','حالت ظاهر':'Appearance mode','ویرایش پروفایل':'Edit Profile','عکس پروفایل':'Profile photo','آواتار Elara':'Elara avatar','عکس آپلودی':'Uploaded photo','شکل تصویر':'Image shape','فونت نام':'Display-name font','اطلاعات پروفایل':'Profile information',
'تکمیل نشده':'Not completed','زن':'Woman','مرد':'Man','سایر / ترجیح می‌دهم نگویم':'Other / Prefer not to say','ویرایش پروفایل':'Edit profile',
'فعالیت‌هایی که دوستان با اجازه به اشتراک می‌گذارند، اینجا دیده می‌شوند.':'Activities friends choose to share appear here.',
'کتاب «در حال مطالعه» با تعداد صفحات مشخص نداری.':'You have no reading book with a known page count.','کتاب در حال مطالعه را انتخاب کن.':'Choose a book you are reading.',
'ثبت':'Save','حذف':'Delete','ویرایش':'Edit','تلاش دوباره':'Retry','بارگذاری…':'Loading…','در حال اتصال امن…':'Connecting securely…',
'پیشرفت امروز':'Today Progress','استریک تسک‌ها':'Task Streak','روز متوالی':'day streak','سطح':'Level','مرحله':'Level','امتیاز':'XP',
'آزادی':'Freedom','بازگشت به خانه':'Back to Home','→ بازگشت به خانه':'← Back to Home','دیدن دوستان':'View friends','دیدن رنکینگ':'View ranking',
'حالت شب':'Dark mode','روشن':'Light','تاریک':'Dark','اعلان‌ها، ۱ خوانده‌نشده':'Notifications, 1 unread',
'پوشه':'Folder','برچسب':'Tag','فوری':'Urgent','بالا':'High','متوسط':'Medium','عادی':'Normal','تکرار':'Repeat','زمان‌بندی':'Schedule',
'نام عادت جدید…':'New habit…','نام هدف جدید…':'New goal…','کوتاه‌مدت':'Short term','میان‌مدت':'Medium term','بلندمدت':'Long term',
'تمرکز':'Focus','شروع':'Start','مکث':'Pause','ادامه':'Resume','شروع دوباره':'Reset','آمادهٔ تمرکز':'Ready to focus','فضای تمرکز':'Focus Space',
'گزارش‌ها':'Reports','بخش‌های دیگر':'More sections','بکاپ':'Backup','دریافت بکاپ':'Download backup','بازیابی بکاپ':'Restore backup','ظاهر برنامه':'App appearance',
'فعالیت امروز':'Today Activity','هدف مطالعه':'Reading Goal','پیشنهاد امروز':'Today Suggestion','دسته‌ها و علایق':'Categories & Interests','مرکز حریم خصوصی و امنیت':'Privacy & Security Center','پیش‌فرض فعالیت دوستان':'Default activity visibility','خصوصی':'Private','فقط دوستان':'Friends only','عمومی':'Public','ماموریت‌ها':'Missions','کتابخانه و مطالعه':'Library & Reading','زبان / گزارش یادگیری':'Language / Learning report','استریک':'Streak','چرخه / پریود':'Cycle / Period','مدیریت تسک‌ها':'Task management','ساخت لیست':'Create list','ساخت پوشه':'Create folder','ساخت تگ':'Create tag','خط‌زدن تسک کامل‌شده':'Strike completed tasks','بدون خط روی تسک کامل‌شده':'No strike on completed tasks','حذف تسک':'Delete task','ذخیره تغییرات':'Save changes','برنامه‌های شخصی من':'My private plans','برنامه تمرینی':'Workout plan','برنامه تغذیه':'Nutrition plan','هنوز برنامه‌ای ننوشتی.':'No plan yet.','فقط برای خودت؛ به دوستان یا فید عمومی فرستاده نمی‌شود.':'Only for you; it is not shared with friends or the public feed.','این یادداشت فقط در فضای خصوصی حساب خودت نگه‌داری می‌شود.':'This note stays private to your account.','حذف برنامه':'Delete plan','مسدودکردن':'Block','رفع مسدودیت':'Unblock','حساب‌های مسدودشده':'Blocked accounts','فعلاً کسی مسدود نشده است.':'No blocked accounts.','مسدودکردن کاربر':'Block user'
}));
const phrases=[
[/در حال اتصال امن…/g,'Connecting securely…'],[/در حال بارگذاری/g,'Loading'],[/در انتظار/g,'Pending'],[/کتاب/g,'book'],[/صفحه/g,'page'],[/مطالعه/g,'reading'],[/امروز/g,'today'],[/دوست/g,'friend'],[/درخواست/g,'request'],[/پروفایل/g,'profile'],[/تنظیمات/g,'settings'],[/اعلان/g,'notification'],[/عادت/g,'habit'],[/هدف/g,'goal'],[/تسک/g,'task'],[/مرحله|سطح/g,'level'],[/روز/g,'day'],[/دقیقه/g,'minutes'],[/ساعت/g,'hours']
];
function locale(){return localStorage.getItem(KEY)==='en'?'en':'fa'}
function fallback(node,original){
 const el=node?.parentElement,tag=el?.tagName||'',role=el?.getAttribute?.('role')||'';
 if(tag==='BUTTON'||role==='button')return'Action';
 if(tag==='LABEL')return'Field';
 if(/^H[1-6]$/.test(tag))return'Elara';
 if(tag==='OPTION')return'Option';
 if(tag==='INPUT'||tag==='TEXTAREA')return'Enter value…';
 return'Elara information';
}
function translate(value,node){
 const raw=String(value||''),trim=raw.trim();if(!trim||!fa.test(trim))return raw;
 const direct=exact.get(trim);if(direct)return raw.replace(trim,direct);
 let out=trim;for(const [re,to] of phrases)out=out.replace(re,to);
 if(fa.test(out))out=fallback(node,trim);
 return raw.replace(trim,out)
}
function rememberAttr(el,name){let map=attrOrigin.get(el);if(!map){map={};attrOrigin.set(el,map)}if(!(name in map))map[name]=el.getAttribute(name)||'';return map[name]}
function userContent(el){return !!el?.closest?.('[data-elara-ugc],[data-elara-i18n="off"]')}
let applying=false;
function apply(root=document){
 if(applying)return;
 const target=root&&typeof root.nodeType==='number'?root:document;
 const walkRoot=target.nodeType===9?target.documentElement:(target.nodeType===1?target:target.parentElement);
 if(!walkRoot||!walkRoot.isConnected)return;
 applying=true;try{
  const lang=locale(),walker=document.createTreeWalker(walkRoot,NodeFilter.SHOW_TEXT);
  const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);
  for(const node of nodes){const parent=node.parentElement;if(!parent||['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)||userContent(parent))continue;if(!textOrigin.has(node)&&fa.test(node.nodeValue||''))textOrigin.set(node,node.nodeValue);const origin=textOrigin.get(node);if(origin!=null)node.nodeValue=lang==='en'?translate(origin,node):origin}
  const scope=target.nodeType===9?target:(walkRoot.closest?.('html')||walkRoot);
  scope.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{if(userContent(el))return;for(const name of ['placeholder','title','aria-label'])if(el.hasAttribute(name)){const origin=rememberAttr(el,name);el.setAttribute(name,lang==='en'?translate(origin,{parentElement:el}):origin)}});
  document.documentElement.lang=lang;document.documentElement.dir=lang==='en'?'ltr':'rtl';document.body?.classList.toggle('lang-en',lang==='en');document.body?.classList.toggle('lang-fa',lang!=='en');
 }finally{applying=false}
}
function set(lang){localStorage.setItem(KEY,lang==='en'?'en':'fa');apply(document);window.dispatchEvent(new CustomEvent('elara:locale-changed',{detail:{locale:locale()}}))}
const observer=new MutationObserver(records=>{if(applying)return;for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1||n.nodeType===3)apply(n.nodeType===1?n:n.parentElement)});
function start(){apply(document);observer.observe(document.documentElement,{childList:true,subtree:true})}
window.ElaraI18n={locale,set,t:(faText,enText)=>locale()==='en'?(enText||translate(faText,{parentElement:null})):faText,apply,dictionary:exact};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();