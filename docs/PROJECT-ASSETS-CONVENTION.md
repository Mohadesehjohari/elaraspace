# Elara Space — قرارداد نام‌گذاری Assetها و گام بعدی

**ثبت:** ۲۱ سپتامبر ۲۰۲۶  
**وضعیت:** مرجع پروژه؛ در این تغییر هیچ قابلیت جدیدی در UI ساخته نشده است.

## فایل‌های آواتار تأییدشده

نام فایل‌ها باید دقیقاً با همین الگو حفظ شوند؛ نام‌گذاری فعلی male و female عمداً یکسان‌سازی نمی‌شود مگر با تصمیم صریح بعدی.

### Male
- `avatars-male-level1.png`
- `avatars-male-level2.png`
- `avatars-male-level3.png`
- `avatars-male-level4.png`
- `avatars-male-level5.png`
- `avatars-male-level6.png`
- `avatars-male-level7.png`
- `avatars-male-level8.png`
- `avatars-male-level9.png`
- `avatars-male-level10.png`

### Female
- `avatars_female_level1.png`
- `avatars_female_level2.png`
- `avatars_female_level3.png`
- `avatars_female_level4.png`
- `avatars_female_level5.png`
- `avatars_female_level6.png`
- `avatars_female_level7.png`
- `avatars_female_level8.png`
- `avatars_female_level9.png`
- `avatars_female_level10.png`

## فایل‌های Frame تأییدشده
- `frames_bronze.png`
- `frames_silver.png`
- `frames_gold.png`
- `frames_diamond.png`

## لوگوی اصلی
- `logo.png`

وقتی UI جدید ساخته می‌شود، این فایل PNG مرجع لوگوی اصلی است. `assets/logo.svg` فعلی صرفاً Asset موقت/نسخهٔ فعلی کد محسوب می‌شود تا زمانی که `logo.png` به نسخهٔ اصلی پروژه منتقل و متصل شود.

## Rank / Level presentation reference

نمایش Rank/Level باید با مرجع تصویری ارسالی کاربر و این نگاشت هماهنگ شود:

1. **Space Cadet / کادت فضا** — Bronze
2. **Star Watcher / دیده‌بان ستاره** — Bronze
3. **Lunar Explorer / کاوشگر ماه** — Bronze
4. **Mars Voyager / مسافر مریخ** — Silver
5. **Galactic Engineer / مهندس کهکشانی** — Silver
6. **Fleet Commander / فرمانده ناوگان** — Silver
7. **Cosmic Navigator / ناوبر کیهانی** — Gold
8. **Star Lord / ارباب ستاره‌ها** — Gold
9. **Galaxy Guardian / نگهبان کهکشان** — Gold
10. **Cosmic Legend / اسطورهٔ کیهان** — Diamond

فریم‌ها باید از نام فایل‌های تأییدشدهٔ بالا استفاده کنند، نه مسیرهای قدیمی مانند `frames/bronze.png`.

## گام بعدی قطعی پس از تست نسخهٔ فعلی

**Login / Entry Preloader با لوگوی اصلی Elara**

- از `logo.png` استفاده شود.
- حس فضایی / نئونی، Glow، Orbit، Shine و Spark حفظ شود.
- Progress واقعی با پایان‌دادن Loader بعد از Load شدن سایت پیاده شود و Fallback داشته باشد.
- Mobile responsive باشد.
- `prefers-reduced-motion` رعایت شود.
- با Firebase Auth و Overlay ورود موجود تداخل نداشته باشد؛ ترتیب پیشنهادی: Preloader → Auth/Login → App.
- صدا فقط در صورت تصمیم نهایی اضافه شود و Mute/Accessibility داشته باشد.
- پس از پیاده‌سازی، نسخهٔ کامل سایت دوباره با GitHub همسان و ZIP کامل تحویل شود.

**نکته:** در این مرحله فقط نیازمندی ثبت شده و هیچ فایل UI/JS/CSS مربوط به Loader ساخته یا تغییر داده نشده است.
