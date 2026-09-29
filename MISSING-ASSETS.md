# دارایی‌های غایب یا نامناسب

تمام مسیرهای ثابت تصویر در فایل‌های ریشه بررسی شدند. مسیر قدیمی `assets/hero.webp` به تصویر موجود اصلاح شد. موارد زیر برای نزدیک‌شدن بیشتر به مرجع نیازمند فایل مستقل هستند؛ از بریدن Screenshot کامل و جا زدن آن به‌عنوان UI استفاده نشد.

| دارایی | نام پیشنهادی | slot / راهکار فعلی |
|---|---|---|
| دکمهٔ مستقل «مشاهده همه مأموریت‌ها» | button-view-all-missions.webp | CTA متنی مأموریت‌ها فعلاً قابل‌استفاده است |
| حالت مستقل dim برای تم | icon-mode-night-dim.webp | فقط active/default موجود است؛ حالت dim ساختگی اضافه نشد |
| ترازوی بدون عدد ثابت | icon-wellness-scale-neutral.webp | وزن با HTML و دادهٔ واقعی؛ آیکن عمومی فعلی |
| Hero اختصاصی Tasks مطابق مرجع | hero-tasks-astra.webp | hero-landscape و Artwork تسکِ موجود استفاده شد |
| Hero اختصاصی Freedom | hero-freedom-galaxy.webp | Screenshot هدف موجود است، Artwork مستقلِ متناظر شناسایی نشد |
| آیکن‌های اختصاصی notes/ideas/inspiration/dreams/reflection | icon-freedom-notes.webp و مشابه | لازم برای بازسازی کامل Freedom؛ هنوز ساخته نشده |
| Hero کتابخانه با کاراکتر در حال مطالعه | hero-library-reading.webp | Hero موجود حفظ شده؛ فایل دقیق مرجع در دسترس نیست |
| جلد و metadata کتاب‌های واقعی کاربر | به ازای هر کتاب واقعی | تصویرهای نمونهٔ مرجع، دادهٔ حساب کاربر نیستند |

فونت Vazirmatn از import موجود Google Fonts استفاده می‌کند و Tahoma/Arial fallback هستند. فونت محلی جدید یا فونت دارای مجوز تجاری افزوده نشده است؛ حالت offline با فونت فارسی محلی هنوز تکمیل نشده.
