# ElaraSpace — رودمپ اجرایی Artwork و وضعیت آیکن‌ها (۲۴ سپتامبر ۲۰۲۶)

**ثبت تصمیم صریح کاربر:** ۲۴ سپتامبر ۲۰۲۶، تصاویر سه نوبت آخر همین چت و توضیح روشن/کم‌نور شدن آیکن‌ها. **مخزن مجاز:** فقط `Mohadesehjohari/elaraspace/main`. این سند مکمل اجرایی `docs/APPROVED-VISUAL-2026-09-24-ARTWORK-ROADMAP-ADDENDUM.md` و تابع آخرین FINAL SUPERVISOR HANDOFF آن است؛ تاریخ این سند به‌معنای تأیید نهایی Pixel-perfect، اجرای UI یا اجازهٔ شروع Checkpoint B/C نیست. قبل از اجرای بعدی HEAD و سه Roadmap رسمی دوباره خوانده شوند.

## ۱) قرارداد مصوب چهار حالت آیکن ناوبری

- `default` = مقصد فعلی **نیست** و موس/فوکوس روی آن نیست: آیکن اختصاصی کم‌نور/خنثی همان مقصد نمایش داده شود؛ خود تصویر جداگانهٔ `*-default.webp` است، نه صرفاً opacity روی تصویر فعال.
- `hover`/`focus-visible` = مقصد فعلی نیست ولی اشاره‌گر روی آن رفته، یا فوکوس قابل‌دیدن کیبورد دارد: **موقتاً** تصویر `*-active.webp` جایگزین شود. با خروج موس یا انتقال فوکوس، فقط اگر route همچنان غیر‌فعال است، به `default` برگردد.
- `selected/current route` = کاربر واقعاً وارد مقصد شده است: آیکن روشن `*-active.webp` **ثابت** باقی بماند؛ خروج موس هیچ تغییری ندهد. با تغییر route، آیکن قبلی به `default` برگردد (مگر همچنان hover/focus باشد) و مقصد جدید فعال شود. برای تعیین active به route/router واقعی و `aria-current="page"` رجوع شود، نه state مستقل نمایشی یا کلیکِ بدون مسیریابی.
- اولویت وضعیت: `current route` یا `hover/focus-visible` ⇒ `active`؛ در غیر این صورت `default`. `pointer: coarse` موبایل hover ساختگی/ماندگار ندارد؛ لمس و تغییر route فعال را تعیین می‌کند. هنگام loading/route transition، چشمک یا برگشت تصادفی به default رخ ندهد.
- آیکن‌های تصویری در slot ثابت و با اندازهٔ یکسان به کار روند؛ تعویض تصویر نباید جابه‌جایی layout یا CLS بسازد. قبل از اتصال مسیرهای واقعی در HEAD و ثبت در `deploy/production-manifest.json -> files` وجودشان کنترل شود؛ `preload`/cache یا دو لایهٔ ثابت در صورت نیاز از چشمک جلوگیری کند. state متن/نشانگر/کنتراست، Tab/Enter، RTL و reduced-motion محفوظ؛ نشانهٔ فعال فقط رنگ تصویر نباشد.
- مالک واحد ناوبری `approved-navigation-extension.js` است. Desktop Sidebar و Mobile Bottom Nav از route source-of-truth مشترک استفاده کنند؛ Drawer از Main Navigation جدا بماند. هیچ بازنویسی Home/Shell یا تغییر Firebase/Data/XP مجاز نیست. **Friends در Mobile Bottom Nav طبق آخرین override مجاز است**؛ برای Friends و Freedom هنوز در این بسته جفت آیکن اختصاصی احراز نشده و نباید تصویر نامربوط جایگزین شود.

## ۲) نام‌گذاری مصوب WebP برای جفت‌های واقعی

همهٔ مسیرهای زیر **نام‌های بستهٔ تحویلی محلی** هستند و تا زمان Upload دستی کاربر و مشاهدهٔ فایل روی HEAD، «نصب‌شده در repo» محسوب نمی‌شوند. قرارداد lowercase + kebab-case + کاربرد/حالت؛ تصاویر موجود با رنگ کمتر/بیشتر بر اساس محتوای واقعی آن‌ها تطبیق داده شده‌اند.

| کاربرد | Default/کم‌نور | Active/روشن | مبدأ JPG default / active |
| --- | --- | --- | --- |
| خانه / Home | `assets/ui/nav-home-default.webp` | `assets/ui/nav-home-active.webp` | `photo_1_2026-09-23_15-24-35(2).jpg` / `photo_2_2026-09-23_15-24-35(2).jpg` |
| تسک‌ها / Tasks | `assets/ui/nav-tasks-default.webp` | `assets/ui/nav-tasks-active.webp` | `photo_3_2026-09-23_15-24-35(1).jpg` / `photo_4_2026-09-23_15-24-35(1).jpg` |
| زبان / Language | `assets/ui/nav-language-default.webp` | `assets/ui/nav-language-active.webp` | `photo_6_2026-09-23_15-24-35(1).jpg` / `photo_5_2026-09-23_15-24-35(1).jpg` |
| کتابخانه / Library | `assets/ui/nav-library-default.webp` | `assets/ui/nav-library-active.webp` | `photo_8_2026-09-23_15-24-35(1).jpg` / `photo_7_2026-09-23_15-24-35(1).jpg` |
| رنکینگ / Ranking | `assets/ui/nav-ranking-default.webp` | `assets/ui/nav-ranking-active.webp` | `photo_10_2026-09-23_15-24-35.jpg` / `photo_11_2026-09-23_15-24-35.jpg` |
| ورزش / Exercise | `assets/ui/nav-exercise-default.webp` | `assets/ui/nav-exercise-active.webp` | `photo_12_2026-09-23_15-24-35.jpg` / `photo_13_2026-09-23_15-24-35.jpg` |
| حالت شب / Mode (نه tab اصلی) | `assets/ui/icon-mode-night-default.webp` | `assets/ui/icon-mode-night-active.webp` | `photo_1_2026-09-23_15-35-21.jpg` / `photo_2_2026-09-23_15-35-21.jpg` |

## ۳) Assetهای جدید دیگر و محدودهٔ نمایش

| نام WebP بسته | مبدأ JPG | کاربرد و محدودیت |
| --- | --- | --- |
| `artwork-rank-frame-1.webp` | `photo_1_2026-09-24_00-03-42.jpg` | قاب طلایی با عدد ۱؛ فقط رتبهٔ اول واقعی، نه فریم قابل Equip کمد |
| `artwork-rank-frame-2.webp` | `photo_2_2026-09-24_00-03-42.jpg` | قاب آبی با عدد ۲؛ فقط رتبهٔ دوم واقعی |
| `artwork-rank-frame-3.webp` | `photo_4_2026-09-24_00-03-42.jpg` | قاب نارنجی با عدد ۳؛ فقط رتبهٔ سوم واقعی |
| `artwork-avatar-frame-orbit-blue.webp` | `photo_6_2026-09-24_00-39-36.jpg` | قاب تزئینی کاندید؛ **نه** فریم canonical کمد و نه Unlock واقعی |
| `artwork-avatar-frame-orbit-violet.webp` | `photo_7_2026-09-24_00-39-36.jpg` | قاب تزئینی کاندید، نیازمند تصمیم محصول پیش از Equip |
| `icon-notifications-read.webp` | `photo_4_2026-09-23_15-35-21(2).jpg` | زنگ بدون نقطه: unread واقعی برابر صفر |
| `icon-notifications-unread.webp` | `photo_3_2026-09-23_15-35-21(1).jpg` | زنگ دارای نقطه قرمز: unread واقعی بیشتر از صفر؛ **این جفت Hover نیست** |
| `icon-ranking-trophy.webp` | `photo_8_2026-09-23_23-53-04(2).jpg` | جام طلایی تزئینی رنکینگ؛ نشان رتبهٔ ساختگی نباشد |
| `icon-exercise-dumbbell.webp` | `photo_7_2026-09-23_18-20-27(2).jpg` | دمبل آبی برای ورزش |
| `icon-wellness-heartbeat.webp` | `photo_5_2026-09-23_23-53-04(2).jpg` | قلب صورتی دارای نوار ضربان، artwork تندرستی؛ جفت dim ندارد |
| `badge-task-priority-p1.webp` | `photo_7_2026-09-24_00-03-42(1).jpg` | فقط تسکِ واقعاً P1؛ نباید برای تمام تسک‌ها یا رنگ ثابت سایر اولویت‌ها به کار رود |
| `brand-elara-app-mark.webp` | `photo_2026-09-24_00-45-50.jpg` | لوگوی برگ/ستاره داخل مربع؛ فقط **کاندید** و تا تأیید صریح کاربر جایگزین برند موجود نمی‌شود |
| `icon-wellness-weight-scale.webp` | `photo_8_2026-09-24_00-39-36.jpg` | تصویر ترازو دارای نوشتهٔ نمونهٔ «68.0 kg»؛ در کنار وزن واقعی کاربر نمایش داده نشود تا دادهٔ جعلی القا نکند؛ نسخهٔ بدون عدد یا تصویر مناسب درخواست شود |

## ۴) قرارداد بسته، Upload و Test Gate

- در سه نوبت تازهٔ این گفت‌وگو مجموعاً **۲۷ تصویر واقعاً متفاوت** نسبت به بستهٔ ۱۷تایی قبلی مشاهده شد؛ ۱۲ بار ارسالِ تکراریِ دقیق byte-identical بود. خروجی جدید فقط همین ۲۷ مورد یکتا را دارد؛ بستهٔ ۱۷تایی قبلی جدا و بدون درخواست کاربر دوباره ساخته نشده است. Manifest همراه ZIP برای هر مورد filename اصلی/نام مقصد/ابعاد/حجم/وضعیت transparency/sha256/source aliases/کاربرد دارد.
- JPGهای ارسالی کانال Alpha واقعی ندارند؛ WebP lossless پیکسل‌های decode‌شدهٔ RGB، ابعاد و زمینهٔ مشکی منبع را حفظ می‌کند. **تبدیل JPG به WebP شفافیت واقعی ایجاد نمی‌کند**؛ زمینهٔ مشکی را بدون بررسی Glow حذف نکن. اگر در UI زمینهٔ مشکی مربع دیده شود، original دارای Alpha یا derivative جداگانهٔ بازبینی‌شده لازم است. ادعای فایل WebP «شفاف» صرفاً به‌خاطر پسوند ممنوع.
- **در این نوبت فقط بسته‌بندی local ZIP و این ثبت Roadmap انجام می‌شود؛ هیچ Binary WebP/HTML/JS/CSS/Production Manifest روی GitHub تغییر نمی‌کند.** کاربر تصاویر مناسب را دستی آپلود کند و پس از اعلام صریح «آپلود شد»، HEAD تازه بررسی و Pass اتصال UI/Manifest/Browser با اندازه‌گیری واقعی آغاز شود.
- برای Pass ناوبری: در Chromium واقعی desktop hover→leave→click→route change و keyboard focus بررسی شود؛ Mobile 320/375/390/430، Desktop 1440/1648/1920، no wrap، horizontal overflow 0، حفظ Home geometry، فعال‌ماندن route پس از Refresh، Light/Dark/AMOLED، FPS/performance و نمایش واقعی تصاویر بدون 404 ثبت شود. بدون تست اجراشده Browser PASS اعلام نشود.
- Checkpoint A user-visual-approved: **PENDING**؛ Checkpoint B و C: **STOP** به‌جز استثناهای صریح آخرین handoff. Pages/CI به‌تنهایی اثبات Browser Fidelity/cPanel/Firebase نیستند؛ cPanel production-tested = NO؛ Firebase production-tested = NO؛ release-ready = NO.
