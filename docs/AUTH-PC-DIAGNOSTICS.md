# Elara — بررسی مشکل ورود روی PC

**تاریخ بررسی:** ۲۱ سپتامبر ۲۰۲۶

## نتیجهٔ ممیزی کد

کد فعلی Elara هیچ شرطی برای جلوگیری از ورود در Desktop/PC ندارد.

موارد بررسی‌شده:
- `cloud.js`: ورود و ثبت‌نام فقط با Firebase Authentication و `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` انجام می‌شود.
- `admin/admin.js`: پس از ورود Firebase فقط سند `admins/{uid}` بررسی می‌شود. ایمیل خاص، نام خاص، دستگاه خاص، User-Agent یا موبایل/دسکتاپ در دسترسی Admin hard-code نشده است.
- `firestore.rules`: دسترسی Admin بر اساس UID + role + enabled است، نه نوع دستگاه.
- CSSهای responsive فقط Layout را تغییر می‌دهند و منطق Authentication را تغییر نمی‌دهند.

بنابراین اگر یک حساب روی موبایل یا PC دیگر وارد می‌شود ولی روی یک PC خاص هم Login و هم Registration خطای `auth/network-request-failed` می‌دهند، مانع از لایهٔ شبکه/مرورگر همان دستگاه است، نه Rule اختصاصی Elara.

## شواهد مشاهده‌شده در عیب‌یابی

در Console مرورگر PC خطای درخواست به `identitytoolkit.googleapis.com` با `auth/network-request-failed` و CORS دیده شد. در Firefox نیز پیام `The proxy server is refusing connections` مشاهده شد. روی ویندوز نیز Proxy محلی قدیمی با آدرس `127.0.0.1:10808` دیده شد؛ این الگو با ابزارهای Proxy/V2Ray سازگار است.

حتی وقتی Toggle پراکسی خاموش است، Driver/Service/Browser profile یا تنظیمات شبکهٔ باقی‌مانده می‌تواند روی درخواست‌های Firebase اثر بگذارد.

## تغییرات UI برای عیب‌یابی بهتر

- نمایش/پنهان‌کردن Password با دکمهٔ چشم در Login/Registration سایت اصلی.
- نمایش/پنهان‌کردن Password در Admin.
- پیام دقیق برای خطاهای Firebase مانند:
  - `auth/network-request-failed`
  - `auth/unauthorized-domain`
  - `auth/operation-not-allowed`
  - `auth/invalid-credential`
  - `auth/too-many-requests`

این تغییرات محدودیت دسترسی جدیدی ایجاد نمی‌کنند.

## معیار تشخیص

- اگر `auth/invalid-credential` دیده شود: ارتباط Firebase برقرار شده ولی ایمیل/رمز صحیح نیست.
- اگر `auth/network-request-failed` دیده شود: درخواست قبل از احراز هویت در شبکه/مرورگر شکست خورده است.
- اگر Login موفق شود ولی Admin پیام عدم مجوز بدهد: Firebase Auth موفق بوده و مشکل از `admins/{uid}` یا وضعیت `emailVerified` است.
