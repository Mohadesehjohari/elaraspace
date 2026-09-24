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
