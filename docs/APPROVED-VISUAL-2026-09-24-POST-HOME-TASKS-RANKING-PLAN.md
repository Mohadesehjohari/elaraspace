# Elara Space — برنامهٔ مراحل پس از تأیید Home: Tasks و Ranking

**تصمیم کاربر:** ۲۴ سپتامبر ۲۰۲۶. **مخزن فعال:** فقط `Mohadesehjohari/elaraspace/main`. **ماهیت این سند:** ثبت ترتیب و نیازمندی‌های آینده؛ نه دستور اجرای فوری، نه اثبات آپلود Asset، نه تأیید Browser/Firebase/cPanel.

## ترتیب اجباری

1. ابتدا Checkpoint A / Home و اصلاحات فعلی Artwork، Navigation، Streak و Ranking Preview خانه با کد واقعی، Screenshot هم‌viewport و تأیید تصویری صریح صاحب پروژه به پایان برسد.
2. پس از تأیید Home، **مرحلهٔ مستقل Tasks** آغاز شود: ابتدا ممیزی ساختار و رفتار موجود، سپس تطبیق ساختاری Desktop/Mobile با تصاویر مرجع، نصب Artworkهای مناسب در جای درست، تست کامل رفتار Task و دریافت تأیید کاربر. نباید Tasks یا مدل داده را بی‌دلیل از صفر بازنویسی کرد.
3. پس از پذیرش Tasks، **مرحلهٔ مستقل Ranking / Social** آغاز شود: ابتدا ممیزی UI و منابع واقعی اطلاعات، سپس تطبیق صفحهٔ کامل Ranking و بخش‌های مجاز Friends با تصاویر مرجع، نصب Artworkهای تأییدشده و تست مستقل. استثنای فعلی C صرفاً Home Top-3 Preview و افزودن Friends به Bottom Nav موبایل است؛ این ثبت Roadmap به‌تنهایی Checkpoint C یا توسعهٔ Presence/Social backend را آزاد نمی‌کند. پیش از شروع بخش‌های خارج از استثنای فعلی، تأیید صریح کاربر و قرارداد امنیت/داده لازم است.

## فهرست Assetهایی که کاربر اعلام کرده آپلود کرده است — فعلاً «گزارش‌شده»، نه نصب‌شده

- `online-status.webp` — نشان وضعیت آنلاین؛ **فقط با Presence واقعی، مجاز و مورد تأیید حریم خصوصی**. در نبود منبع واقعی، وضعیت آنلاین یا دادهٔ جعلی نشان داده نشود.
- `decline-request-button.webp` — Artwork دکمه رد درخواست دوستی؛ دکمه باید HTML واقعی، قابل‌دسترس، دارای متن/حالت Loading و متصل به عملیات معتبر باقی بماند.
- `invite-friend-button.webp` — Artwork دکمه دعوت دوست؛ عملیات دعوت/درخواست فقط مطابق قابلیت و مجوز موجود، بدون رفتار یا دادهٔ ساختگی.
- `friends-tab.webp` — آیکن/Artwork ورودی دوستان؛ جایگاه و سازگاری Mobile/Desktop پس از ممیزی Navbar و Route موجود تعیین شود.
- `friends-group-icon.webp` — نماد بخش دوستان/گروه؛ وجود تصویر به معنی فعال‌بودن backend گروه/باشگاه نیست.
- `search-button.webp` — نماد جستجو؛ جستجوی واقعی، کنترل HTML و دسترسی صفحه‌کلید حفظ شود.
- `ranking-tab-active.webp` — آیکن روشن بخش Ranking؛ Default/Hover/Focus/Selected طبق سند `APPROVED-VISUAL-2026-09-24-NAV-ARTWORK-STATE-EXECUTION-ROADMAP.md` و route واقعی تعیین شود؛ بدون بررسی بصری، فایل جایگزین جفت active/default قبلی نشود.
- `quote-card.webp` — Artwork کارت نقل‌قول؛ متن نقل‌قول HTML زنده، خوانا و دارای انتساب معتبر بماند، تصویر دارای نوشتهٔ ثابت جای متن/داده را نگیرد.
- `ranking-chart-icon.webp` — نماد نمودار Ranking؛ نمودار و مقادیر صرفاً از دادهٔ واقعی موجود بیایند.

کاربر در پیام خود چند بار `svg` را نیز نوشته است، اما نام فایل، مسیر و محتوای قابل‌انتساب آن مشخص نیست؛ برای آن‌ها نام، کاربرد یا حضور در Repository فرض نشود. فایل واقعی SVG فقط در صورت واقعاً برداری‌بودن بررسی و استفاده شود.

**در زمان ثبت درخواست، آخرین HEAD بررسی‌شده پیش از این Commit**: `603e4f84ec5fd428a8dced0a95b0979bfda8d0ae`. در درخت `assets/ui/` این HEAD، ۹ نام WebP فوق مشاهده نشدند و درخواست مستقیم `assets/ui/online-status.webp` نیز 404 برگرداند. ممکن است آپلودها هنوز Commit نشده باشند، در مسیر/Branch دیگری باشند یا بعداً ثبت شوند. پیش از هر اتصال، HEAD جدید refresh و مسیر/نام/Content واقعی تک‌تک فایل‌ها به‌صورت مستقل تأیید شود. از روی نام، Transparency، کیفیت، Glow یا کاربری نهایی فایل نتیجه‌گیری نشود.

## قرارداد اجرای هر مرحله

- Reference + Screenshot واقعی همان viewport؛ ممیزی مالک DOM/CSS؛ اصلاح ساختاری حداقلی؛ عدم استفاده از zoom/scale یا Mock برای جعل شباهت.
- Desktop 1440/1648/1920 و Mobile 320/375/390/430، Overflow افقی صفر، RTL/Vazirmatn، Light/Dark و reduced-motion، و رفتار keyboard/hover/selected بررسی شود.
- Artwork پس از بررسی تصویر واقعی در ابعاد UI و زمینهٔ سایت متصل شود؛ تصاویر با پس‌زمینهٔ سیاه یا Alpha/Glow خراب بدون derivative تأییدشده نصب نشوند. فایل‌های به‌کاررفته فقط با مسیر موجود به `deploy/production-manifest.json -> files` اضافه و در Browser بدون 404 تأیید شوند.
- Task completed artwork فقط در حالت تکمیل واقعی و پس از Refresh/Rerender نمایش یابد. تغییر منطق Task، Recurrence، XP، Permissions و Firebase صرفاً برای آرایش ظاهری ممنوع.
- Ranking، XP، رتبه و آواتارها از دادهٔ مجاز واقعی؛ برای کمبود کاربر Empty State. Presence و Online جعلی، رتبه/دوست ساختگی، backend گروه/باشگاه/فروشگاه و افشای اطلاعات خصوصی ممنوع.
- برای هر Pass: Start/End HEAD، Commit/changed files، تفکیک requested/coded/automated-tested/browser-tested/cPanel-tested/Firebase-tested/release-ready، تست‌ها و Screenshot واقعی End HEAD و اختلاف بصری باقیمانده گزارش شوند.

**وضعیت ثبت:** برنامه‌ریزی و مستندسازی فقط. Stageهای Tasks و Ranking هنوز شروع/تأیید نشده‌اند؛ Checkpoint B و C همچنان STOP با دو استثنای مصوب Home Ranking Preview و Mobile Friends Navigation.


---

## الحاقیهٔ ۲۵ سپتامبر ۲۰۲۶ — مرجع جدید Tasks، Quick Add و Theme

**HEAD مشاهده‌شده هنگام ثبت این الحاقیه:** `66be3bb3608962290cf21db0ab35948212ba2845`. این بخش ثبت نیازمندی آینده است و به‌تنهایی مجوز شروع Stage کامل Tasks قبل از تأیید Home نیست. تصاویر ارسالی کاربر شامل: اسکرین‌شات فعلی صفحهٔ Tasks در Desktop، مرجع بصری Tasks دسکتاپ/موبایل، و چند مرجع رفتاری از TickTick برای Quick Add، Priority، Tag/List/Folder، Drawer و Date/Repeat هستند. تصاویر TickTick **مرجع رفتار و الگوی تعامل** هستند؛ داده، رنگ، نام اولویت و ساختار Elara باید canonical باقی بماند.

### TASK-UX-01 — Quick Add یک‌مرحله‌ای در Home

در کارت‌های **کارهای امروز، عادت‌های امروز و اهداف من** یک کنترل `+` سریع و واضح وجود داشته باشد. کلیک روی `+` نباید کاربر را ناخواسته به صفحهٔ کامل ببرد و باید همان entity canonical را با همان persistence فعلی بسازد.

- Tasks: Quick Add با عنوان، سپس دسترسی سریع به تاریخ/زمان، اولویت، تگ، پوشه/لیست و تکرار؛ گزینهٔ «تنظیمات بیشتر» همان فرم کامل موجود را با Draft حفظ‌شده باز کند.
- Habits: فقط فیلدها و تنظیماتی که مدل Habit واقعی اکنون پشتیبانی می‌کند؛ قابلیت ساختگی اضافه نشود.
- Goals: عنوان سریع و سپس همان تنظیمات واقعی Goal/steps/target/horizon موجود.
- Submit باید همان handler/schema اصلی را مصرف کند؛ local-only یا رکورد موازی ممنوع.
- نام و سطح‌های اولویت Elara تغییر نکنند و فعلاً **فارسی** باقی بمانند؛ مرجع انگلیسی TickTick فقط نمونهٔ Interaction است.
- پس از Create، کارت Home و صفحهٔ کامل همان لحظه به‌روز شوند و Refresh داده را حفظ کند.

### TASK-UX-02 — ساختار صفحهٔ کامل Tasks مطابق مرجع Elara

پس از تأیید Home، صفحهٔ Tasks با استفاده از **مرجع نئونی Elara** بازآرایی شود و فرم بزرگ فعلی که بخش زیادی از Viewport را اشغال می‌کند، ساختار غالب صفحه نباشد.

ساختار هدف:
- Header/Topbar و Sidebar فعلی Elara حفظ شوند.
- Hero/عنوان Tasks مطابق مرجع: عنوان برجسته، توضیح کوتاه و Artwork تأییدشده؛ دادهٔ نمایشی مرجع کپی نشود.
- زیر Hero: فیلتر/Category chips فشرده و قابل‌استفاده.
- یک دکمهٔ اصلی روشن **«+ افزودن تسک»** و در موبایل در صورت نیاز FAB مناسب، بدون ساختن صفحه/فرم موازی.
- لیست Taskها مرکز اصلی صفحه باشد؛ هر ردیف شامل checkbox واقعی، عنوان، category/tag، جزئیات مرتبط، progress واقعی در صورت وجود، XP واقعی و منوی بیشتر.
- کارت‌های «پیشرفت امروز» و «استریک تسک‌ها» از دادهٔ واقعی موجود ساخته شوند؛ عدد یا streak ساختگی ممنوع.
- Desktop و Mobile از همان مدل داده و رفتار مشترک استفاده کنند؛ فرم طولانی ثابت فعلی به Modal/Sheet/Quick Add مناسب منتقل شود.
- استایل، Glow، فاصله، ضخامت Border، ارتفاع ردیف، فونت و تراکم محتوا با مرجع Tasks ارسالی مقایسه شوند، نه صرفاً رنگ پس‌زمینه.

### TASK-UX-03 — Quick Add/Composer الهام‌گرفته از TickTick

با زدن `+` در Home یا صفحهٔ Tasks، Composer جمع‌وجور باز شود؛ UX مدنظر مشابه مرجع TickTick است، اما با Theme و زبان Elara.

حداقل Actionهای Composer:
- عنوان Task؛
- تاریخ/زمان؛
- Priority؛
- Tag؛
- List/Folder؛
- گزینهٔ More برای تنظیمات کامل.

در Mobile می‌تواند Bottom Sheet/Keyboard-safe composer باشد و در Desktop Popover/Dialog مرکزی یا Anchored panel. در هر دو حالت:
- Keyboard و Focus صحیح؛
- Escape/Back/Cancel بدون از دست‌دادن ناخواستهٔ Draft؛
- Submit روشن؛
- بازشدن pickerها روی composer بدون شکستن RTL؛
- منوی Priority فارسی و با P1/P2/P3/P4 canonical فعلی Elara؛ نام‌ها یا meaningهای ذخیره‌شده بدون migration تغییر نکنند.

### TASK-UX-04 — Date / Time / Repeat picker

مرجع TickTick برای Date panel ثبت شد:
- دسترسی سریع به امروز، فردا و گزینه‌های زمان مناسب؛
- Calendar ماهانه؛
- Time؛
- Reminder در صورت وجود قابلیت canonical؛
- Repeat با منطق recurrence موجود Elara.

ظاهر باید Elara باشد، نه کپی رنگ/فونت TickTick. تاریخ محلی/RTL و موبایل واقعی تست شود. اگر Reminder backend/permission واقعی موجود نیست، کنترل جعلی فعال ایجاد نشود.

### TASK-UX-05 — Task overflow menu و مدیریت List / Folder / Tag

برای صفحهٔ Tasks یک منوی اختصاصی سه‌نقطه/More وجود داشته باشد. این منو باید **در سمت مقابل منوی اصلی برنامه** باز شود تا با Sidebar/Drawer اصلی تداخل نکند.

از آن دسترسی به مدیریت ساختار Task فراهم شود:
- List / لیست؛
- Folder / پوشه؛
- Tag / برچسب؛
- Filterهای مرتبط؛
- تنظیمات نمای Task در صورت وجود واقعی.

کاربر باید بتواند:
- لیست جدید بسازد؛
- پوشه بسازد؛
- تگ بسازد؛
- آن‌ها را انتخاب/ویرایش/مدیریت کند طبق قابلیت‌های موجود؛
- Task را به List/Folder/Tag واقعی متصل کند.

منوی Task با Drawer اصلی Account/Settings یکی نشود و جای آن را نگیرد. در Desktop panel از سمت مقابل Sidebar باز شود؛ در Mobile Drawer/Sheet سازگار با فضای محدود و Back gesture. هیچ reset فرم یا از بین رفتن Draft هنگام افزودن Tag/Folder مجاز نیست.

### TASK-UX-06 — رفتار checkbox و completion

ظاهر checkbox صفحهٔ Tasks و Home باید به مرجع Elara نزدیک شود:
- incomplete: حلقهٔ واضح؛
- completed: Artwork/Glow تأییدشده در صورت وجود؛
- toggle مستقیم همان Task canonical؛
- persistence پس از Refresh؛
- recurrence، XP و history فقط یک بار و طبق منطق موجود؛
- کلیک checkbox نباید parent navigation را trigger کند.

### THEME-NEW-01 — Theme مستقل Pink / White

یک Theme **کاملاً جدید** با مرجع صورتی/سفید ارسالی کاربر به سیستم Theme اضافه شود؛ Theme فعلی Elara Neon/Dark **حذف یا جایگزین نشود**.

ویژگی‌ها:
- پس‌زمینه روشن سفید/صورتی بسیار ملایم؛
- کارت‌های روشن با سایه و مرز نرم؛
- accent صورتی؛
- متن تیره و کنتراست قابل‌قبول؛
- Modal/Bottom Sheet/Drawer/Input/Checkbox/Calendar/Tag/Priority و Bottom Navigation همگی Theme-aware باشند؛
- انتخاب Theme persistence داشته باشد و پس از Refresh حفظ شود؛
- Light/Dark/AMOLED فعلی خراب نشوند.

کاربر بعداً مجموعهٔ آیکن‌های مخصوص Theme صورتی را می‌سازد. تا آن زمان:
- آیکن‌های فعلی با fallback سازگار استفاده شوند؛
- معماری Asset state از اکنون طوری طراحی شود که Theme-specific artwork قابل نگاشت باشد؛
- نبود آیکن صورتی نباید باعث 404 یا آیکن نامرئی شود؛
- هیچ فایل فرضی برای آیکن صورتی در Manifest ثبت نشود.

### TASK-UX-07 — Mobile Tasks

مرجع موبایل Tasks ارسالی کاربر برای Stage Tasks الزام‌آور است:
- Hero فشرده؛
- chips/folders؛
- دکمهٔ Add بزرگ و واضح؛
- list/grid toggle فقط اگر عملکرد واقعی دارد؛
- Task rows full-width و قابل لمس؛
- checkbox بزرگ؛
- progress/metadata خوانا؛
- overflow menu سه‌نقطه؛
- Bottom Nav Elara حفظ شود.
- Keyboard بازشده نباید composer، sheet یا submit را بپوشاند.

عرض‌های 320/375/390/430 با کیبورد، Bottom Sheet و Drawer تست شوند.

### معیار پذیرش Stage Tasks آینده

برای بستن Stage Tasks صرف شباهت یک Screenshot کافی نیست. گزارش باید حداقل این موارد را جداگانه اثبات کند:
- Quick Add از Home برای Tasks/Habits/Goals؛
- Full Task Add از `+`؛
- Priority فارسی و canonical؛
- Date/Time/Repeat؛
- List/Folder/Tag creation؛
- Task overflow menu؛
- checkbox/persistence/XP/recurrence؛
- Desktop reference fidelity؛
- Mobile reference fidelity؛
- Pink/White theme و حفظ Themeهای فعلی؛
- keyboard/focus/back/RTL؛
- no horizontal overflow؛
- Firebase/cPanel فقط در صورت تست واقعی.

**ترتیب همچنان:** Home تأیید شود → Stage Tasks با این الحاقیه اجرا شود → پس از پذیرش Tasks، Ranking/Social کامل. در گزارش اجرایی بعدی، ناظر باید این شناسه‌ها را به Prompt اجرایی تبدیل کند و هرکدام را جداگانه پیگیری کند.
