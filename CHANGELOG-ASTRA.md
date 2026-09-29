# تغییرات Elara Astra

مبدأ فقط‌خواندنی: `Mohadesehjohari/elaraspace`، snapshot دقیق commit `7e0f80a32995523db888897105e949a1b19ddd4b`.

فایل‌های آرشیو مبدأ هنگام آماده‌سازی با tree مخزن و Git blob SHA مقایسه شدند. هیچ عملیات write در GitHub انجام نشد. ZIP شامل کل پروژه و تغییرات محلی است؛ تمام فایل‌های اصلی حفظ شده‌اند.

این یک Pass اجرایی با محدودیت QA بصری است؛ ادعای تکمیل تمام صفحات یا تطبیق پیکسلی ندارد. نتیجه و موارد باقی‌مانده در دو گزارش TEST-NOTES و REMAINING-ROADMAP آمده‌اند.

| فایل | وضعیت | تغییر و دلیل |
|---|---|---|
| `CHANGELOG-ASTRA.md` | جدید | گزارش درخواستی: تغییرات واقعی، نگاشت، شواهد یا کارهای باقی‌مانده. |
| `MISSING-ASSETS.md` | جدید | گزارش درخواستی: تغییرات واقعی، نگاشت، شواهد یا کارهای باقی‌مانده. |
| `REMAINING-ROADMAP.md` | جدید | گزارش درخواستی: تغییرات واقعی، نگاشت، شواهد یا کارهای باقی‌مانده. |
| `TEST-NOTES.md` | جدید | گزارش درخواستی: تغییرات واقعی، نگاشت، شواهد یا کارهای باقی‌مانده. |
| `VISUAL-MAPPING.md` | جدید | گزارش درخواستی: تغییرات واقعی، نگاشت، شواهد یا کارهای باقی‌مانده. |
| `app.js` | تغییرکرده | نرمال‌سازی سازگار recurrence با owner مشترک؛ event ثبت/مرور واژه برای گزارش. |
| `approved-visual.js` | تغییرکرده | حذف handler تکراری ساخت metadata؛ phase2 تنها owner این مسیر است و draft را حفظ می‌کند. |
| `approved-wellness.js` | تغییرکرده | Artwork آب صحیح و event پس از ذخیرهٔ موفق برای Home/Reports. |
| `assets/ui/button-view-all.webp` | جدید | کپی بایتی با نام معنایی صحیح از icon-add-button.webp؛ فایل اصلی برای سازگاری حفظ شد. |
| `boot.js` | تغییرکرده | بارگذاری reports.js پس از ownerهای موجود؛ ترتیب cloud/auth حفظ شد. |
| `calendar.js` | جدید | تقویم فارسی با انتخاب روز، ماه قبل/بعد، امروز و کلیدهای جهت؛ ISO storage. |
| `elara-design.js` | تغییرکرده | wordmark کامل بدون متن برند تکراری؛ عنوان دقیق رنکینگ و اجتماع. |
| `elara-finishing.css` | تغییرکرده | جایگزینی URL ناموجود hero.webp با hero-landscape.webp موجود. |
| `elara-social.js` | تغییرکرده | بازسازی markup رنکینگ: podium، My Rank، tabها، دوستان و درخواست‌های واقعی؛ APIها حفظ شدند. |
| `home-functional-pass-2026.css` | تغییرکرده | بازنویسی owner نهایی Home؛ خوانایی، ring تیک، اسکرول Goals، responsive، composer، calendar، Reports و اصلاح محدود فرم‌ها. |
| `home-functional-pass-2026.js` | تغییرکرده | Quick Task از فرم واقعی و تکمیل تسک/عادت از owner مشترک با روز انتخابی. |
| `index.html` | تغییرکرده | schedule.js و calendar.js پیش از مصرف‌کننده‌ها بارگذاری می‌شوند. |
| `phase2.js` | تغییرکرده | تکرار روزانه/هفتگی/ماهانه و interval، composer کامل، metadata management و draft، Task Hub، XP هر نوبت، حفظ سری گذشته در ویرایش آینده. |
| `reference-home-shell-2026.js` | تغییرکرده | روز انتخابی و تقویم، فیلتر occurrence، wellness روز انتخابی، آیکن‌های معنایی، Friends CTA و جای درست بنرها. |
| `reports.js` | جدید | نمودار SVG و جدول دادهٔ واقعی برای ۱۰ معیار، ثبت صفحات، history حساب‌محور، range و aggregation. |
| `schedule.js` | جدید | قواعد تاریخ مشترک Home و Tasks/Habits؛ سازگاری با ruleهای weekday قبلی. |
| `tests/README.md` | جدید | آزمون محلی قابل‌تکرار؛ fixtureها فقط در tests هستند و برنامه آن‌ها را بارگذاری نمی‌کند. |
| `tests/astra-schedule.test.cjs` | جدید | آزمون محلی قابل‌تکرار؛ fixtureها فقط در tests هستند و برنامه آن‌ها را بارگذاری نمی‌کند. |
| `tests/dom-check.cjs` | جدید | آزمون محلی قابل‌تکرار؛ fixtureها فقط در tests هستند و برنامه آن‌ها را بارگذاری نمی‌کند. |
| `tests/integration.cjs` | جدید | آزمون محلی قابل‌تکرار؛ fixtureها فقط در tests هستند و برنامه آن‌ها را بارگذاری نمی‌کند. |
| `tests/package.json` | جدید | آزمون محلی قابل‌تکرار؛ fixtureها فقط در tests هستند و برنامه آن‌ها را بارگذاری نمی‌کند. |
| `tests/social-test.cjs` | جدید | آزمون محلی قابل‌تکرار؛ fixtureها فقط در tests هستند و برنامه آن‌ها را بارگذاری نمی‌کند. |
| `tests/split-test.cjs` | جدید | آزمون محلی قابل‌تکرار؛ fixtureها فقط در tests هستند و برنامه آن‌ها را بارگذاری نمی‌کند. |
| `visual-fidelity-pass5.css` | تغییرکرده | Task Hub و Ranking responsive؛ منو، ردیف، podium و streak. |

## سازگاری و مرز تغییرات

- کلید اصلی `elara_space_v1` و ساختار Task/Habit/Goal حفظ شدند. `frequency` و `interval` به recurrence اضافه شده‌اند؛ ruleهای قدیمی روزهای هفته همچنان معتبرند.
- completion، rewardDays و occurrenceOverrides باقی‌اند. ویرایش آینده سری گذشته را پایان می‌دهد و قسمت آینده را با ID تازه نگه می‌دارد؛ تاریخچهٔ XP جابه‌جا می‌شود تا پاداش دوباره داده نشود.
- نرخ موجود XP تغییر نکرده: تسک ۱۰، عادت ۱۵؛ محاسبهٔ reward برای روز انتخابی از مسیر اصلی انجام می‌شود.
- `cloud.js`، `firestore.rules`، `rpg.js`، مالک پروفایل و اسکریپت‌های deploy تغییر نکرده‌اند. تغییر Social مربوط به render است؛ سرویس جدید، مجموعهٔ Firestore یا کاربر ساختگی افزوده نشده.
- Reports از کلید جدید `elara_report_history_v1_<uid>` روی همان دستگاه استفاده می‌کند؛ cloud sync و export تاریخچهٔ جدید هنوز در roadmap است.
- icon-add-button.webp حذف نشد؛ نسخهٔ button-view-all.webp دقیقاً همان بایت‌ها را دارد. CTA افزودن تسک متن و style خودش را دارد.
- owner نهایی CSS Home بازنویسی شد و handler تکراری inline metadata حذف شد؛ consolidation کامل همهٔ CSSها انجام نشده است.
