# Elara Space — الحاقیهٔ مصوب «اول تصاویر» و برنامهٔ محصول

**تاریخ ثبت:** ۲۴ سپتامبر ۲۰۲۶؛ **مخزن توسعه و انتشار:** `Mohadesehjohari/elaraspace/main`؛ **HEAD مشاهده‌شده در آغاز:** `0ec1369c60fc23e7d7563e4f86591d52b98c345f`.

این سند الحاقیهٔ رودمپ `APPROVED-VISUAL-2026-09-22-EXTENSION-ROADMAP.md` و `APPROVED-VISUAL-REDESIGN-AND-NEXT-PHASE.md` است؛ بندهای قدیمی که با تصمیم جدید مغایرت دارند مطابق تصمیم جدید تفسیر شوند، بدون حذف سابقه. **ثبت الزام‌ها به‌معنای کدنویسی، آزمایش، انتشار یا تأیید نیست.** فقط Checkpoint A مجوز اجرای فعلی دارد؛ B و C تا تأیید تصویری صریح کاربر اجرا نشوند.

## روش اجباری Visual Fidelity برای هر Pass

تصویر مرجع و اسکرین‌شات واقعی برنامه در یک viewport → اندازه‌گیری هندسه/جای اجزا → تشخیص مالک واحد DOM و CSS → اصلاح ساختاری → تست مرورگر و اندازه‌گیری → مقایسهٔ مجدد → اصلاح تکراری تا تأیید. صرفاً تعویض رنگ/CSS، تغییر zoom/scale یا ادعای شباهت بدون مقایسهٔ ابعادی پذیرفته نیست. گزارش Browser PASS فقط روی همان End HEAD و با مرورگر واقعی معتبر است؛ CI، Pages و نمونهٔ تصویری معادل cPanel/Firebase production-tested نیستند.

## A — Artwork-first، تنها بخش مجاز فعلی

هندسهٔ موفق Home حفظ شود: Sidebar چپ Desktop، Bottom Nav هفت‌تایی فقط Mobile، Grid فشردهٔ سه‌ستونه Desktop و ترتیب Mobile `Hero → Streak → Tasks/Habits → Wellness → Missions/Ranking → Friends`؛ Focus واقعی فقط در Library؛ ثبت آب، لیوان پرشونده و ثبت خواب فقط در Exercise؛ Home فقط خوانندهٔ خلاصهٔ داده؛ Search و حساب/Drawer سالم بمانند. بازنویسی Shell، چند writer متعارض، دادهٔ نمونه و migration مخرب ممنوع.

فایل‌های تصویری پیوست از روی محتوای واقعی و نه نام فایل دسته‌بندی شوند: Tasks تیک بنفش، Habits برگ سبز، Wellness قلب صورتی، Water قطره آبی، Workout دمبل آبی، Missions راکت بنفش، Ranking جام و در صورت لزوم تاج فقط جایگاه اول، Notifications زنگ، Brand یک نسخهٔ برگ/ستاره، Home آیکن سه‌بعدی خانه فقط در صورت وجود فایل مناسب. برای نبود تصویر مناسب، ایموجی یا تصویر نامربوط جایگزین نشود؛ فقدان گزارش گردد.

پیش از استفاده، فرمت/ابعاد/آلفا/زمینهٔ سیاه/Glow/خوانایی در اندازهٔ کارت و موبایل و نوشتهٔ داخلی بررسی شود. فایل original تغییر نکند؛ خروجی شفاف مجزا تهیه و روی پس‌زمینهٔ واقعی تست شود؛ اگر مات‌زدایی Glow را خراب می‌کند، شفافِ اصلی خواسته شود. Assetهای نمایشی با اسم پایدار در `assets/ui/`، کوچک و با اندازهٔ صریح در slotهای ثابت باشند؛ JS/CSS شامل data URI یا base64 تصویری نشوند. URL تمام Assetهای Production به `deploy/production-manifest.json` اضافه و وجود/Deploy آنها بررسی شود. آواتار/فریم canonical، Admin Deploy، `.cpanel.yml`، Maintenance و Firebase در A دست‌نخورده بمانند.

در Home، تصویر Tasks کنار عنوان و بخش مرتبط، برگ برای Habits، قلب برای Wellness، قطره/دمبل در خلاصهٔ خواندنی مربوط، راکت Missions، جام Competition، زنگ Header و آیکن خانه فقط در Nav فعال استفاده شود. متن/نوار/دکمه‌ها همچنان HTML و وابسته به دادهٔ واقعی باشند، نه یک screenshot واحد. Hero مرجع کوهستان/ماه/شخصیت و متن زنده است: اگر فایل مستقل مناسب موجود نیست Hero فعلی حفظ و کمبود گزارش شود؛ Artwork دارای نوشتهٔ بزرگ Elara بدون وارسی، جای بنر Home قرار نگیرد. Brand واحد باشد؛ نام حساب از برند جدا و هویت حساب حذف نشود. Thumbnail تم فقط اگر Asset مشخص همان تم موجود است جایگزین شود. CTAهای «مشاهده همه» باید با Design Token تم واقعی در Mode/Accent، Hover/Focus/Active/Disabled سازگار باشند؛ بنفش ثابت مستقل از تم ممنوع.

معیار تحویل A: asset mapping ورودی→نسخهٔ نمایشی/اصلی→محل استفاده، حجم، فایل‌های استفاده‌نشده و علت، Start/End HEAD/Commit، تست‌ها، اسکرین‌شات واقعی Desktop هم‌viewport و Mobile 390/320 با اسکرول کامل، Theme Strip و Header، مقایسهٔ قبل/بعد، باقی اختلاف‌ها و وضعیت واقعی Production/Firebase. پس از A برای تأیید تصویری کاربر **STOP**.

## B — عادت‌ها و اهداف قابل‌اندازه‌گیری؛ فقط برنامه‌ریزی تا تأیید A

شش پیشنهاد اختیاری و UID-scoped: خواب، ورزش، کتاب، آب، مدیتیشن، زبان؛ فعال‌سازی، هدف و واحد، مخفی‌کردن Home، حذف و بازگرداندن بدون ایجاد دوباره/ازبین‌بردن عادت دست‌ساز. منبع واحد سنجهٔ مرتبط با ماژول اصلی؛ مثال خواب ۷/۸ ساعت = ۸۷٫۵٪ یا ۸۸٪ گرد‌شده، آب ۵۰۰/۲۰۰۰ mL = ۲۵٪. ثبت آب/خواب در Exercise بماند. Workout از دقیقهٔ واقعی، کتاب از پیشرفت واقعی Library و زبان از فعالیت واقعی Language؛ در نبود منبع، دادهٔ ساختگی نگذارید و ثبت دستی شفاف ارائه شود. پیشرفت هدف مثبت «رسیدن به حداقل» `clamp(actual/target*100,0,100)`؛ باینری ۰ یا ۱۰۰٪؛ بازهٔ روزانه/هفتگی فقط با قرارداد تاریخ/منطقهٔ زمانی معتبر. واحدهای شمارش، دقیقه، ساعت، صفحه، لیوان، mL، لیتر، km، قدم، kg و سفارشی با معنای مناسب؛ وزن نیازمند نقطهٔ آغاز و جهت تغییر است، نه درصد مصرف روزانه. قابلیت ساخت عادت شخصی با وضعیت انجام، مقدار و هدف، واحد، نمایش Home، رنگ/آیکن و نوع حداقل/حداکثر/ثبت صرف. نمایش Home ردیف محدود با مقدار واقعی، نوار/درصد و پیوند «مشاهده همه» به مدیریت کامل؛ دادهٔ نمایشی اضافه نشود.

Goals با عنوان، گام‌های checkbox واقعی و درصد واحد؛ برای چهار قدم، یک گام ۲۵٪ و دو گام ۵۰٪، لغو تیک بازگشت درست؛ وزن‌داربودن گام‌ها قرارداد روشن لازم دارد. دادهٔ خصوصی وارد Ranking/Profile عمومی نشود؛ تست دو UID واقعی و Rules منتشرشده پیش از ادعای Sync/Firebase PASS ضروری است؛ Refresh، دستگاه دوم، تغییر هدف/واحد، بازگرداندن پیش‌فرض‌ها و محاسبهٔ یک‌بار/روز تست شوند.

## C — رقابت/دوستان/منوی تکمیلی/i18n؛ فقط برنامه‌ریزی تا تأیید A و قرارداد B

نام نمایشی «رنکینگ» به «رقابت» بدون تخریب route/data تغییر کند. کارت رقابت Home فقط تا سه کاربر مجاز واقعی با آواتار و تاجِ جایگاه اول؛ برای کمبود نفر، Empty State؛ جدول کامل/XP/لقب در صفحهٔ رقابت؛ ساخت پروفایل/XP نمایشی ممنوع. ورودی مستقل دوستان در بخش ثانویه Sidebar Desktop؛ دو بخش دوستان آنلاین/همه دوستان؛ نام/آواتار/لقب و XP مجاز، رتبه بر اساس XP واقعی. Pin دوست، ترتیب نمایش را تغییر دهد نه رتبه. بدون Presence امن، رضایت و قرارداد Backend، «آنلاین» ادعا نشود. Search Name/ID، درخواست دوستی و حریم خصوصی موجود حفظ شوند.

منوی تکمیلی Desktop: دوستان، دستاوردها، فروشگاه، تنظیمات و گزارش‌ها؛ برچسب‌های کارها، رقابت، ورزش و تندرستی؛ هفت مقصد اصلی Mobile بدون دکمهٔ هشتم و مسیر دسترسی ثانویه در Drawer. دستاورد فقط واقعی؛ Store بدون Backend/مالکیت/خرید معتبر صرفاً «در حال توسعه»، بدون کسر XP نمایشی. تنظیمات واقعی یکپارچه بمانند.

i18n یکپارچه برای `fa-IR`/RTL، `en`/LTR و `tr`/LTR در تمام متن‌های ثابت Home، صفحات، Drawer، Dialog، Toast، Forms، Validation، Empty State، Notifications و Admin frontend. اعداد/تاریخ/واحد/درصد و ترتیب مناسب جهت؛ ترجیح زبان پایدار؛ متن شخصی، نام دوستان، کتاب‌ها و داده‌ها ترجمهٔ خودکار نشوند. route و داده/XP/حریم خصوصی در تغییر زبان ثابت بمانند. برای هر locale و صفحات Home/Library/Exercise/Competition/Friends/Settings/Drawer/Dialog اسکرین‌شات واقعی Desktop و Mobile لازم است؛ ترجمهٔ ناقص را کامل اعلام نکنید.

## وضعیت ثبت

`A: requirements recorded; integration and production tests pending.`
`B: requirements recorded only; implementation not authorized yet.`
`C: requirements recorded only; implementation not authorized yet.`


## الحاقیهٔ اجرایی قطعی Checkpoint A — ۲۴ سپتامبر ۲۰۲۶

**HEAD شروع این اجرای واقعی:** `dde7281e7a10b6eaeb515340c305fe38f4223df1`. این بخش آخرین تصمیم کاربر در Checkpoint A است و در تعارض با بندهای قدیمی، بر آن‌ها مقدم است.

- **فرمت Artwork:** بنرهای بزرگ و آیکن‌های سه‌بعدیِ raster به‌صورت WebP واقعی استفاده می‌شوند؛ SVG فقط برای منبع واقعاً برداری است و JPG/PNG داخل SVG پنهان نمی‌شود. Originalهای کاربر دست‌نخورده می‌مانند و نسخهٔ نمایشی در صورت نیاز جدا ساخته می‌شود. Glow و Alpha آیکن‌ها باید حفظ شوند.
- **Mobile Home:** اولویت، بیشترین شباهت به مرجع گوشی کاربر با هندسهٔ واقعی و کمترین ارتفاع/اسکرول اضافی است. ترتیب اصلی `Header → Hero → Streak → Tasks/Habits → Wellness → Missions/Ranking → Friends → Bottom Navigation` است. Goals، Theme Strip و Previewهای کم‌اولویت می‌توانند فقط از Home موبایل حذف/فشرده شوند؛ route، داده و قابلیت اصلی آن‌ها حذف نمی‌شود. `zoom` و `transform: scale` برای کوچک‌کردن کل صفحه ممنوع است.
- **Desktop Streak:** شعله و شمارندهٔ واقعی Streak در Desktop نیز دیده می‌شوند، اما به‌صورت عنصر فشرده در Hero/Header و بدون افزودن ردیف بلند بین Hero و Grid سه‌ستونه.
- **Assetهای مصوب این نوبت:** `assets/ui/hero-landscape.webp` برای پس‌زمینهٔ Hero با متن HTML زنده، `assets/ui/missions-rocket.webp` برای عنوان Missions، و `assets/ui/streak-flame.webp` برای Streak موبایل و دسکتاپ. دادهٔ Streak، روزها، Missions و XP باید از state واقعی فعلی خوانده شوند.
- **روش Fidelity:** مرجع + Screenshot واقعی در viewport هم‌اندازه → اندازه‌گیری Header/Hero/Streak/Card/Gap/Scroll → اصلاح مالک واحد `reference-home-shell-2026.js/css` → Browser test → مقایسهٔ مجدد. Pages PASS به‌تنهایی Browser/cPanel/Firebase PASS نیست.
- Checkpointهای **B و C همچنان STOP** هستند تا کاربر نتیجهٔ تصویری A را تأیید کند.


---

## HANDOFF قطعی برای ادامه در چت جدید — ۲۴ سپتامبر ۲۰۲۶

این بخش آخرین snapshot اجرایی و مرجع ادامهٔ پروژه است. در تعارض با توضیحات قدیمی‌تر دربارهٔ وضعیت اجرا، این snapshot جدیدتر اولویت دارد.

### 1) مخزن و مالکیت توسعه

- **تنها مخزن فعال برای توسعه و Commit:** `Mohadesehjohari/elaraspace`
- **Branch فعال:** `main`
- مخزن `ArenParsi/elaraspace` فقط سابقهٔ تاریخی است و بدون درخواست صریح کاربر نباید تغییر کند.
- **Baseline پیاده‌سازی قبل از Commit صرفاً Roadmap/Handoff حاضر:** `27203792fcd9a92f1a99fef5b2bdc3b49dba0f9d`
- هر چت جدید باید **قبل از هر write، HEAD واقعی main را دوباره بخواند** و به SHA بالا اعتماد کور نکند.

### 2) وضعیت Checkpoint A — Artwork + Home Fidelity

Checkpoint A در کد واقعی main تا مرحلهٔ Browser acceptance پیش رفته است. Checkpointهای B و C هنوز **STOP** هستند تا کاربر نتیجهٔ بصری A را صریحاً تأیید کند.

Assetهای واقعی نصب‌شده در GitHub:
- `assets/ui/hero-landscape.webp` — Hero landscape، با متن UI زندهٔ HTML
- `assets/ui/missions-rocket.webp` — آیکن سه‌بعدی Missions
- `assets/ui/streak-flame.webp` — شعلهٔ Streak برای Mobile و Desktop

قاعدهٔ Artwork:
- بنرهای raster بزرگ: WebP
- آیکن‌های سه‌بعدی raster: WebP بهینه با transparency واقعی
- SVG فقط وقتی واقعاً vector است؛ raster نباید داخل SVG پنهان شود.
- Original کاربر حفظ می‌شود؛ نسخهٔ نمایشی جداگانه مجاز است.
- Glow/alpha نباید تخریب شود.

### 3) Home فعلی و قرارداد بصری

مالک اصلی Home/Shell این مرحله:
- `reference-home-shell-2026.js`
- `reference-home-shell-2026.css`

ساختار موفق فعلی نباید rollback یا از صفر بازنویسی شود.

Desktop:
- Sidebar چپ حدود 228px
- Header فشرده
- Hero حدود 175px
- Grid سه‌ستونه
- Theme Strip افقی
- Bottom Navigation روی Desktop ممنوع
- Streak در Desktop نیز با `assets/ui/streak-flame.webp` نمایش داده می‌شود، اما فشرده و داخل/نزدیک Hero؛ نباید ردیف بلند جدیدی بین Hero و Grid بسازد.

Mobile:
ترتیب اولویت Home:
`Header → Hero → Streak → Tasks/Habits → Wellness → Missions/Ranking → Friends → Bottom Navigation`

اهداف Mobile:
- یک Header واقعی و فشرده؛ Brand تکراری نشود.
- Hero کوتاه با crop کنترل‌شدهٔ تصویر.
- Streak بلافاصله زیر Hero، با شعلهٔ واقعی، مقدار واقعی و نشان‌های روزها.
- Tasks و Habits کنار هم و کوتاه.
- Wellness فقط summaryهای فشرده آب/خواب/تمرین/وزن در Home؛ ثبت آب/خواب همچنان در Exercise.
- Missions و Ranking کنار هم.
- Friends نوار کوتاه پایین.
- Goals و Theme Strip فقط از **Home موبایل** حذف/پنهان می‌شوند؛ route، داده و قابلیتشان حذف نشده است.
- ممنوع: `zoom` یا `transform:scale` روی کل صفحه برای جعل one-screen.
- اگر one-screen با خوانایی واقعی ممکن نباشد، اختلاف ارتفاع باید به px گزارش شود؛ قابلیت ضروری نباید حذف شود.

### 4) اندازه‌های Browser تأییدشده روی baseline 27203792...

Browser automation واقعی روی Chromium اجرا شده است.

Mobile viewport height تست‌شده: **659 CSS px**

در 390px:
- Header: 52px
- Hero: 104px
- Streak: 48px
- Tasks: 120px
- Habits: 120px
- Wellness: 96px
- Missions: 104px
- Ranking: 104px
- Friends: 52px
- horizontal overflow: 0
- vertical scroll remaining: **0px**

در 320px:
- همان ترتیب و ارتفاع‌های اصلی
- horizontal overflow: 0
- vertical scroll remaining: **0px**

Desktop 1648×928:
- Sidebar: 228px
- Header: 80px
- Hero: 1380×175px
- Desktop Streak: حدود 95×40px
- Tasks/Habits/Wellness: هرکدام حدود 450×285px
- Missions/Goals: حدود 450×225px
- Theme Strip: حدود 915×100px
- vertical scroll remaining: **7px**
- Bottom Nav مخفی

Desktop 1440 و 1920 نیز در Browser test بررسی شده‌اند.

### 5) تست‌های موفق روی baseline 27203792...

- Validate Elara site: SUCCESS
  - Run: `35996952257`
- Browser navigation acceptance / geometry / screenshots: SUCCESS
  - Run: `35996952258`
- GitHub Pages build and deployment: SUCCESS
  - Run: `35996951433`

این PASSها فقط برای همان کد و همان محدوده معتبرند.
- GitHub Pages PASS ≠ cPanel production-tested
- Browser geometry PASS ≠ Firebase production-tested
- Pixel-perfect هنری هنوز نیازمند تأیید چشمی کاربر است.

### 6) Production Manifest و Hosting

هر سه Artwork جدید در `deploy/production-manifest.json → files` ثبت شده‌اند:
- `assets/ui/hero-landscape.webp`
- `assets/ui/missions-rocket.webp`
- `assets/ui/streak-flame.webp`

عمداً فقط به `files` اضافه شده‌اند و بدون دلیل معماری به `required` تحمیل نشده‌اند.

زیرساخت cPanel/Production قبلاً کدنویسی شده است:
- `.cpanel.yml`
- deployment manifest
- server-side maintenance
- staging/backup/rollback
- Admin one-click update gateway
- مستند نصب فارسی

اما وضعیت واقعی:
- **cpanel production-tested: NO**
- **deployed-to-cPanel-production: NO**
- **firebase production-tested: NO**
- Firestore Rules صرف وجود در repo به معنی Publish شدن نیست.
- Firebase Authorized Domain و ثبت‌نام حساب دوم باید روی Production واقعی تست شوند.

### 7) Navigation/Drawer — قرارداد تثبیت‌شده

Canonical main navigation دقیقاً:
`ورزش | زبان | تسک‌ها | خانه | رنکینگ | کتابخانه | آزادی`

Desktop:
- Sidebar باقی می‌ماند.
- Reports یک secondary item پایین Sidebar است.
- Habits / Goals / Focus / Missions / Friends main destination مستقل نیستند.

Mobile:
- Bottom Nav همان هفت مقصد canonical را دارد.
- Sidebar مخفی است.

Drawer:
- سیستم جدا از Main Navigation است.
- حساب، پروفایل، کمد، تنظیمات، Appearance، Privacy، Notifications، Messages، Help، Folder/Tag، Calendar، Logout و موارد تنظیماتی.
- popup بازشده از Drawer نباید Drawer پشت آن را ببندد.
- بستن popup باید کاربر را به Drawer باز برگرداند.

### 8) داده‌ها و قابلیت‌هایی که نباید تخریب شوند

- Firebase/Auth/Firestore flows را صرفاً برای Visual pass تغییر نده.
- دادهٔ Streak باید واقعی باشد، نه mock.
- Missions/XP واقعی بماند.
- Tasks/Habits/Goals data و routeها حفظ شوند.
- Water/Sleep write فقط در Exercise/Wellness؛ به Home برنگردد.
- Focus main tab ساخته نشود؛ Focus در ساختار مرتبط فعلی/Library باقی بماند.
- قابلیت حذف‌شده از Preview موبایل به معنی حذف route یا داده نیست.

### 9) وضعیت Asset Upload

مانع Binary Upload برای سه Asset فعلی حل شده است، چون کاربر آن‌ها را مستقیماً در GitHub main آپلود کرده است.
برای Assetهای بعدی:
- ابتدا بررسی کن فایل واقعاً در HEAD وجود دارد.
- اگر فایل binary جدید هنوز در repo نیست و ابزار GitHub binary upload ندارد، فقط همان فایل موردنیاز را با نام و مسیر دقیق از کاربر بخواه؛ درخواست ارسال مجدد همه تصاویر ممنوع.
- Asset فقط وقتی «نصب‌شده» محسوب می‌شود که واقعاً در GitHub HEAD باشد، در manifest لازم ثبت شود، به UI وصل شود و Browser بدون 404 آن را نشان دهد.

### 10) مرحلهٔ بعد در چت جدید

ترتیب اجباری شروع:
1. HEAD واقعی main را refresh کن.
2. هر سه Roadmap رسمی را بخوان.
3. latest Actions را برای همان HEAD بررسی کن.
4. Screenshotهای واقعی و مرجع جدیدی که کاربر در چت جدید می‌فرستد مبنای visual delta باشند.
5. **Checkpoint A را فقط بر اساس feedback بصری کاربر ادامه بده.**
6. Checkpoint B/C را تا اجازهٔ صریح کاربر شروع نکن.

در ادامهٔ Checkpoint A، اولویت با این‌هاست:
- اصلاح deltaهای باقی‌مانده نسبت به reference بدون بازسازی دوبارهٔ Home
- حفظ one-screen Mobile در viewport واقعی
- حفظ Desktop three-column geometry
- استفاده از Assetهای WebP واقعی
- اندازه‌گیری و گزارش عددی before/after
- تست empty-state و seeded-data
- Browser screenshots روی End HEAD

### 11) قرارداد تحویل هر Pass بعدی

گزارش باید شامل این موارد باشد:
- Start HEAD
- End HEAD
- Commit SHA + URL
- changed files
- Assetهای واقعاً موجود/نصب‌شده
- tests actually run
- Browser viewports actually run
- اندازهٔ Header/Hero/Streak/Card/Grid
- horizontal overflow
- vertical scroll remaining in px
- Screenshot واقعی روی End HEAD
- اختلاف‌های باقی‌مانده با reference
- cPanel/Firebase status بدون ادعای تست‌نشده

وضعیت فعلی پیش از شروع چت جدید:
- Checkpoint A coded: YES
- automated-tested: YES
- browser-tested: YES
- Pages deployed: YES
- pixel-perfect user-approved: **PENDING USER VISUAL APPROVAL**
- cPanel production-tested: NO
- Firebase production-tested: NO
- Checkpoint B: STOP
- Checkpoint C: STOP


---

## FINAL SUPERVISOR HANDOFF + LATEST VISUAL OVERRIDE — ۲۴ سپتامبر ۲۰۲۶

این بخش مرجع نهایی شروع چت بعدی است و در تعارض با بخش‌های قدیمی‌تر این سند، **همین بخش مقدم است**.

### A) نقش و پروتکل ناظر

- Assistant در چت جدید **ناظر فنی، طراحی، کیفیت و پیشرفت** است؛ مجری اصلی توسعه نیست.
- چت اجرایی جداگانه تغییرات را روی GitHub انجام می‌دهد.
- ناظر باید در آغاز **هر Stage** مستقل:
  1. HEAD واقعی `Mohadesehjohari/elaraspace/main` را بخواند.
  2. این سه سند را روی همان HEAD بخواند:
     - `docs/APPROVED-VISUAL-REDESIGN-AND-NEXT-PHASE.md`
     - `docs/APPROVED-VISUAL-2026-09-22-EXTENSION-ROADMAP.md`
     - `docs/APPROVED-VISUAL-2026-09-24-ARTWORK-ROADMAP-ADDENDUM.md`
  3. فایل‌های مرتبط و در صورت ادعای تست، Actions/Browser artifacts همان End HEAD را بررسی کند.
- گزارش چت اجرایی به‌تنهایی مدرک نیست. بین requested / coded / automated-tested / browser-tested / cPanel-tested / Firebase-tested / release-ready تفکیک شود.
- مخزن `ArenParsi/elaraspace` تاریخی است و نباید تغییر جدید بگیرد.

### B) Snapshot فعلی

- Checkpoint A روی کد واقعی تا Browser acceptance اجرا شده است.
- Baseline اجرایی Artwork/Home که Browser PASS داشت: `27203792fcd9a92f1a99fef5b2bdc3b49dba0f9d`.
- HEAD بعدی ممکن است Docs-only یا Visual-pass جدید باشد؛ چت جدید باید HEAD را دوباره refresh کند و از این SHA به‌عنوان HEAD جاری فرضی استفاده نکند.
- Assetهای نصب‌شده و متصل:
  - `assets/ui/hero-landscape.webp`
  - `assets/ui/missions-rocket.webp`
  - `assets/ui/streak-flame.webp`
- این سه مسیر در `deploy/production-manifest.json -> files` ثبت شده‌اند.
- وضعیت محیط واقعی:
  - cPanel production-tested: **NO**
  - Firebase production-tested: **NO**
  - Firestore Rules committed ≠ published
  - Pages PASS ≠ cPanel/Firebase PASS

### C) Workflow قطعی Assetهای بعدی

این قرارداد برای همه تصاویر جدید کاربر لازم‌الاجرا است:

**مرحله Asset Packaging — بدون تغییر کد**
- کاربر تصاویر را در چت اجرایی می‌فرستد.
- چت اجرایی فقط فایل‌ها را با مشاهدهٔ محتوای واقعی دسته‌بندی می‌کند.
- نام‌گذاری: lowercase + kebab-case + کاربردمحور.
- Raster artworkها و آیکن‌های سه‌بعدی به **WebP واقعی با کیفیت بالا** تبدیل می‌شوند.
- Alpha/Transparency و Neon Glow باید حفظ شوند.
- تغییر extension بدون conversion واقعی ممنوع.
- Downscale باید در UI کوچک sharp بماند؛ over-compression ممنوع.
- خروجی باید شامل:
  - فایل‌های جداگانهٔ قابل دانلود
  - یک ZIP واقعی
  - manifest نام/ابعاد/حجم/transparency/کاربرد
- در این مرحله GitHub، UI و Manifest پروژه تغییر نمی‌کنند.
- کاربر فایل‌ها را دستی در GitHub Upload می‌کند.
- فقط پس از پیام صریح «آپلود شد» اتصال UI شروع می‌شود.

### D) Visual Pass بعدی — Desktop + Mobile

#### Desktop Streak
- Streak دسکتاپ باید از badge کوچک فعلی به **strip پهن، فشرده و شبیه ساختار مرجع موبایل** تبدیل شود.
- Flame جدید بزرگ‌تر و واضح‌تر شود.
- کنار Flame: عدد Streak و متن کوتاه.
- ادامهٔ همان strip: روزهای هفته.
- Current day glow واضح؛ completed/future state قابل تشخیص.
- داده کاملاً واقعی از state فعلی؛ عدد یا روز mock ممنوع.
- نباید Grid سه‌ستونه را خراب یا Home را بلند کند.
- Bottom Nav دسکتاپ همچنان ممنوع.

#### Mobile Navigation — تصمیم جدید
- Bottom Nav موبایل باید **Friends / دوستان** را نیز به‌عنوان مقصد مستقیم اضافه کند.
- این تصمیم جدیدتر بر قرارداد قدیمی «هفت مقصد فقط» مقدم است.
- در 320/375/390/430:
  - single row
  - no wrap
  - horizontal overflow = 0
  - label/icon خوانا
- اگر لازم شد اندازه icon/gap/padding کمی فشرده شود.

#### Home Ranking Preview
- «رنکینگ این هفته» در Home فقط Top 3 واقعی را به‌صورت فشرده نمایش دهد.
- آواتارها کاملاً circular.
- نفر اول برجسته‌تر/وسط؛ دوم و سوم اطراف.
- نام + XP زیر هر Avatar.
- جایگاه 1/2/3 واضح.
- crown/medal مطابق جایگاه واقعی.
- row/card بزرگ برای هر کاربر در Preview ممنوع.
- کاربر جعلی برای پرکردن رتبه‌ها ممنوع.
- صفحهٔ Ranking/Competition کامل همچنان محل اطلاعات تفصیلی است.

#### Hero / Missions
- Hero artwork background است و متن HTML زنده باقی می‌ماند.
- Desktop/Mobile crop مستقل.
- Rocket داخل slot کنترل‌شدهٔ Missions.
- هیچ Artwork نباید ارتفاع Card را دیکته کند.

#### Logo
- لوگوی قدیمی UI فعلاً حذف/neutralize شود.
- slot و ساختار Layout حفظ شود.
- لوگوی جدید بدون تأیید کاربر خودکار انتخاب نشود.
- Assetهای Logo بعداً پس از Packaging/Upload دستی متصل می‌شوند.

### E) Neon Fidelity Pass

Neon باید **Live CSS effect** باشد، نه صرفاً بخشی از تصویر.

مجاز/مطلوب:
- `box-shadow`
- `filter: drop-shadow`
- `text-shadow`
- gradient border
- pseudo-element aura
- subtle active glow

Hierarchy:
- Primary/Active: glow قوی‌تر
- Secondary: متوسط
- Normal cards: بسیار ملایم

موارد هدف:
- Hero edge/atmosphere
- Missions Rocket
- Active Navigation
- Current Streak day
- CTAها
- selected/checked states
- Progress bars
- بعضی Card borderها

ممنوع:
- blur سنگین روی کل صفحه
- overexposure
- unreadable text
- animation سنگین روی موبایل

`prefers-reduced-motion` و performance باید رعایت شود.

### F) Habits / Goals Progress Bars

- Barهای `عادت‌های امروز` و `اهداف من` از line بسیار باریک به Track + Filled Bar واضح‌تر و پهن‌تر تبدیل شوند.
- رنگ‌ها token-based و مستقل باشند؛ مثال:
  - Reading: purple
  - Workout: cyan/turquoise
  - Meditation: violet
  - Water: blue
  - Sleep: green/cyan
  - Language: indigo
- Goals نیز رنگ مستقل هماهنگ داشته باشند.
- track تیره + fill روشن + glow ظریف + درصد خوانا.
- Data/Calculation logic در Visual pass تغییر نکند مگر Bug واقعی اثبات شود.

### G) Task Completed Artwork

- Asset تیک جدید فقط وقتی Task واقعاً Completed است نمایش داده شود.
- Contract:
  - `task.completed === true` → completed artwork
  - `task.completed === false` → artwork تیک نمایش داده نشود
- unchecked state کنترل مستقل فعلی را حفظ کند.
- Refresh و rerender تست شوند.
- تیک Static برای همه Taskها ممنوع.

### H) Notification Artwork

اگر کاربر دو Asset زنگ Normal/Unread بدهد:
- unread = 0 → normal bell
- unread > 0 → active/unread bell
- اگر data source واقعی برای unread وجود ندارد، mapping آماده شود ولی state جعلی ساخته نشود.

### I) Scope Guard

- Checkpoint B (Measured Habits/Goals backend/product logic) همچنان **STOP** تا تأیید صریح کاربر.
- Checkpoint C همچنان **STOP**، با دو استثنای صریحی که اکنون مجازند:
  1. افزودن Friends به Mobile Bottom Nav.
  2. Restyle کردن Home Ranking Preview به Top-3 circular avatars.
- این دو استثنا مجوز ساخت Presence، Online status، Store، Achievement backend، rename سراسری، i18n کامل یا دادهٔ اجتماعی جعلی نیستند.

### J) معیار تحویل Passهای بعدی

برای هر Pass کدنویسی:
- Start HEAD
- End HEAD
- Commit SHA + URL
- changed files
- Assetهای واقعاً موجود در HEAD
- manifest diff
- tests actually run
- Browser viewports actually run
- Desktop screenshots: 1440 / 1648 / 1920
- Mobile screenshots: 320 / 375 / 390 / 430
- Header/Hero/Streak/Card/Grid sizes
- horizontal overflow
- vertical scroll remaining
- remaining visual deltas
- cPanel/Firebase status بدون ادعای تست‌نشده

### K) Hosting که هنوز باز است

پس از اتمام Visual checkpointهای تأییدشده، استقرار واقعی `elaraspace.ir` روی cPanel باید تکمیل شود:
- Document Root جدا از پروژه‌های دیگر
- Git source خارج webroot
- Cloudflare DNS/SSL
- Firebase Authorized Domain
- Firestore Rules publish واقعی
- تست دو UID
- Admin one-click deploy + maintenance + rollback روی cPanel واقعی

تا آن زمان:
- deployed-to-cPanel-production = NO
- release-ready = NO
