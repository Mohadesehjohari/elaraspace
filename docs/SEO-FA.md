# راهنمای SEO Studio الارا

## چی اضافه شده؟
در پنل مدیریت فعلی سایت، تب «سئو و سرچ گوگل» و فیلدهای SEO برای مقاله‌ها و صفحات رسمی اضافه شده است. اطلاعات در Firestore ذخیره می‌شوند و صفحه‌ساز استاتیک، محتوای عمومی را به HTML قابل خزیدن تبدیل می‌کند.

**هنوز هیچ انتشار زنده‌ای انجام نشده است.** گزارش Search Console هم از CSV واقعی و هم از اتصال OAuth گوگل پشتیبانی می‌کند؛ اما اتصال OAuth نیاز به تنظیمات دستی Google Cloud دارد. رتبه و ترافیک ساختگی نداریم.

## پیش‌نیاز امنیتی
1. بعد از تأیید و ادغام PR، قبل از تغییر قواعد Firebase از قواعد فعلی پشتیبان بگیرید.
2. قواعد نسخه جدید فایل firestore.rules را با حساب معتبر در پروژه elara-ab1aa منتشر کنید. صرف تغییر این فایل در GitHub، قواعد زنده Firebase را تغییر نمی‌دهد. در محیط توسعه مورد اعتماد از firebase deploy --only firestore:rules استفاده کنید.
3. با حساب Owner/Admin وارد مسیر /admin/ شوید. نقش Moderator اجازه انتشار ندارد.
4. آدرس اصلی سایت را مشخص کنید؛ اگر دامنه اختصاصی دارید از آن استفاده کنید، نه هم‌زمان از دامنه GitHub Pages.

## امکانات پنل
- SEO Title، Meta Description، Focus Keyword و Slug برای مقاله‌ها.
- SEO Title، Meta Description و Focus Keyword برای صفحات رسمی با Slug موجود.
- گزینه حذف محتوا از خروجی ایندکس؛ Draft نیز هرگز وارد فایل عمومی نمی‌شود.
- بررسی مشکلات پیشنهادی عنوان، توضیح، طول محتوا و URL، با پیش‌نمایش تقریبی نتیجه گوگل.
- دریافت JSON فقط شامل مقاله‌ها و صفحات منتشرشده و قابل ایندکس (بدون UID یا سند مدیر).
- ورود CSV صادرشده از گزارش Performance در Search Console و نمایش کلیک، نمایش، CTR، میانگین وزنی جایگاه و فهرست ردیف‌ها.
- اتصال زنده به Search Console API با OAuth Web Client ID، Property واقعی، بازه تاریخ و گروه‌بندی بر اساس query یا page. Google Identity Services فقط دامنه مجاز را قبول می‌کند، دسترسی readonly می‌گیرد و توکن در حافظه همان صفحه است. با خروج از حساب Admin توکن پاک/لغو می‌شود؛ در Firebase/LocalStorage ذخیره نمی‌شود. ردیف‌های API معمولاً تنها داده‌های برتر هستند، نه کل گزارش.

فاصله‌های طول عنوان و توضیحات صرفاً راهنمای ویرایشی هستند؛ گوگل محدودیت ثابت کاراکتری تضمین‌شده ندارد و ممکن است عنوان/توضیح دیگری نمایش دهد.

## فعال‌سازی اتصال زنده Google Search Console
1. در Google Cloud یک پروژه بسازید/انتخاب کنید و **Search Console API** را فعال کنید.
2. OAuth Consent Screen را مطابق نوع کاربران تنظیم کنید. سپس یک **OAuth Client ID از نوع Web application** بسازید (نه API Key یا Client Secret برای Frontend).
3. دامنه واقعی پنل Admin را در Authorized JavaScript origins ثبت کنید، مثلاً https://mohadesehjohari.github.io یا https://your-domain.example (فقط origin، بدون /admin/).
4. حساب گوگلی که وارد می‌شود باید روی Property در Search Console دسترسی داشته باشد. آدرس Property در پنل باید عین شناسه سرچ کنسول باشد (URL-prefix با اسلش انتهایی یا sc-domain:...).
5. داخل تب SEO، Client ID، Property، تاریخ و نوع گزارش را وارد کنید و «اتصال به گوگل» را بزنید. فقط scope https://www.googleapis.com/auth/webmasters.readonly درخواست می‌شود؛ توکن و تاریخچه کوئری‌ها در دیتابیس یا GitHub ذخیره نمی‌شوند.
6. اگر OAuth هنوز در حالت Testing است، حساب مجاز را به Test users اضافه کنید. در صورت نیاز به کاربران عمومی، تنظیمات و الزامات تأیید برنامه در Google Cloud را تکمیل کنید.

این روش نیازی به Backend جدید یا Service Account عمومی ندارد، ولی برای اتصال پشت‌صحنه/دوره‌ای یا ذخیره گزارش‌ها یک سرویس امن دیگر لازم است.

## انتشار صفحات عمومی بدون cPanel
1. محتوا را در پنل ذخیره و برای انتشار وضعیت Published انتخاب کنید.
2. در پنل SEO آدرس واقعی ریشه سایت را با HTTPS وارد کنید و فایل public-content.json را صادر کنید.
3. فایل را در ریپو به مسیر seo/public-content.json منتقل کنید؛ این فایل عمومی است و باید قبل از commit بازبینی شود.
4. GitHub Actions با نام «Build public SEO pages (review artifact)» را اجرا کنید. همچنین با Python 3 می‌توانید دستور زیر را اجرا کنید:

   python3 tools/build_seo.py --input seo/public-content.json --out seo-dist

5. خروجی seo-dist شامل blog/، pages/، sitemap.xml و robots.txt است. این محتوا باید در ریشه وب‌سایت نهایی، کنار فایل index.html اصلی، منتشر شود؛ نه زیر پیشوند seo-dist.
6. برای GitHub Pages در حالت main/root، فایل‌های تولیدی را داخل root همان ریپو commit کنید یا pipeline مستقل Pages تنظیم کنید. برای هاست معمولی می‌توان از SSH/SFTP یا ابزار انتشار امن استفاده کرد؛ cPanel لازم نیست.
7. URLهای مقاله‌ها ساختاری مشابه /blog/fa/pomodoro-guide/ و /pages/fa/about-elara/ دارند. هر URL باید HTTP 200 با محتوای اصلی در HTML اولیه بدهد.
8. اگر مقاله حذف یا Draft شد، فایل استاتیک قدیمی آن مسیر را هم حذف کنید؛ سازنده فایل‌های قدیمی روی سایت زنده را خودکار پاک نمی‌کند. برای تغییر URL به ریدایرکت مناسب فکر کنید.
9. مالکیت دامنه در Google Search Console را تأیید، sitemap.xml را ثبت و ایندکس را با URL Inspection بررسی کنید.

**محدودیت مهم:** تا وقتی فایل JSON خروجی و سپس فایل‌های HTML ساخته‌شده روی سایت نهایی منتشر نشوند، ذخیره محتوا در Firestore به‌تنهایی صفحه قابل ایندکس مستقلی ایجاد نمی‌کند. اتصال یک‌کلیکی و انتشار خودکار از Firestore به GitHub/هاست نیازمند Backend امن و مجوز مستقل است. هیچ توکن Google/GitHub یا Service Account نباید در JS عمومی یا JSON محتوای منتشرشده ذخیره شود.

## تست‌های توسعه
- python3 -m unittest discover -s tests -p 'test_seo_builder.py' -v
- node --input-type=module --check < admin/admin.js
- node --input-type=module --check < admin/seo-manager.js
- node tests/test-seo-dashboard.mjs
- python3 tools/build_seo.py --input seo/public-content.json --out seo-dist

قبل از ادغام، ثبت/ویرایش/انتشار یک مقاله آزمایشی در Firebase و نمایش آن در Blog و صحت لینک‌های استاتیک باید با حساب مدیر واقعی آزمایش شوند.



## همگام‌سازی آنلاین بدون دانلود فایل JSON

یک مسیر یک‌کلیکی برای دریافت مستقیم محتوای **عمومی و منتشرشده** Firestore در GitHub Actions آماده شده:

Workflow: **Sync public Firestore SEO and optionally deploy GitHub Pages**
(فایل .github/workflows/publish-public-seo-pages.yml)

در تنظیمات ریپوی GitHub در بخش Settings → Secrets and variables → Actions، دو **Repository Variable** ثبت کنید:

- ELARA_FIREBASE_WEB_API_KEY = کلید **عمومی Firebase Web App** مربوط به پروژه elara-ab1aa، فقط با مجوز APIهای Firebase و محدودیت‌های مناسب.
- ELARA_SEO_BASE_URL = آدرس HTTPS دقیقی که GitHub Pages آن را سرو می‌کند، همراه با مسیر نصب؛ مثال: https://mohadesehjohari.github.io/elaraspace/

کلید وب Firebase **مجوز دسترسی به داده خصوصی نیست**؛ پرس‌وجوی بدون ورود فقط اجازه خواندن سندهایی را دارد که Firestore Rules واقعاً منتشرشده مجاز می‌دانند. گردش‌کار برای هر collection فقط status=published را درخواست می‌کند، فیلدهای ناخواسته مانند شناسه نویسنده را حذف می‌کند و noindex را کنار می‌گذارد. اگر قواعد Firebase منتشر نشده باشند، درخواست خطای مجوز خواهد داد و هیچ نسخه زنده‌ای تغییر نمی‌کند. در صورت اجباری بودن App Check یا محدودیت ناسازگار کلید، ممکن است این روش بدون راهکار سروری جایگزین کار نکند.

مراحل:
1. **اول قواعد Firestore جدید را جداگانه منتشر و تست کنید.**
2. با حداقل یک مطلب منتشرشده و قابل ایندکس، گردش‌کار بالا را از تب Actions روی شاخه main اجرا کنید؛ گزینه publish_to_pages را **false** بگذارید تا فقط خروجی کامل قابل بررسی ساخته شود. اگر محتوای عمومی صفر باشد، گردش‌کار برای پیشگیری از پاک‌شدن ناخواسته صفحه‌ها متوقف می‌شود.
3. Artifact با نام elara-pages-site-review را دانلود و بازبینی کنید (index.html، assets، admin، blog، pages، sitemap، robots).
4. وقتی مسیر GitHub Pages روی GitHub Actions تنظیم شد و environment با نام github-pages مجازسازی/محافظت شد، همان workflow را روی main با publish_to_pages=true اجرا کنید. این کار **تمام سایت GitHub Pages** را با بسته جدید جایگزین می‌کند؛ نه فقط بخش وبلاگ. از وضعیت قبلی نسخه پشتیبان و امکان بازگشت داشته باشید.
5. سرویس cPanel **به‌طور خودکار** آپدیت نمی‌شود. اگر دامنه اصلی روی cPanel باشد، این workflow نباید به‌عنوان راهکار انتشار آن دامنه به کار برود؛ باید مسیر امن اختصاصی هاست تنظیم شود.
6. در نسخه فعلی اجرای workflow دستی است؛ انتشار خودکار به‌محض تغییر Firestore نیاز به Trigger مجاز سروری یا زمان‌بندی بعد از آزمون واقعی دارد.

**قواعد ایمنی:** هیچ Service Account JSON، کلید محرمانه Google یا رمز cPanel در ریپو یا مرورگر قرار ندهید. workflow فقط برای انتشار صفحات GitHub Pages در حالت مجاز و از main کار می‌کند. آزمایش واقعی دسترسی Anonymous به اسناد Published و حذف URLهای قدیمی الزامی است.

## گام‌های بعدی
اتصال امن API سرچ کنسول برای به‌روزرسانی خودکار، همگام‌سازی انتشار از Firestore، ساخت ریدایرکت/حذف فایل قدیمی و افزودن لینک‌های داخلی بین اپ و صفحات سئومحور.
