# Elara — بررسی مشکل ورود روی PC

**تاریخ بررسی:** ۲۱ سپتامبر ۲۰۲۶

## نتیجهٔ ممیزی کد

کد فعلی Elara هیچ شرطی برای جلوگیری از ورود در Desktop/PC ندارد.

- `cloud.js`: ورود/ثبت‌نام فقط با Firebase Authentication انجام می‌شود.
- `admin/admin.js`: پس از ورود Firebase فقط `admins/{uid}` بررسی می‌شود؛ ایمیل خاص، User-Agent یا دستگاه خاص hard-code نشده است.
- `firestore.rules`: دسترسی Admin بر اساس UID + role + enabled است، نه نوع دستگاه.
- CSS responsive فقط Layout را تغییر می‌دهد.

در عیب‌یابی PC، خطای `auth/network-request-failed` برای `identitytoolkit.googleapis.com` و پیام Firefox دربارهٔ Proxy مشاهده شد. این الگو به شبکه/Proxy/Driver یا تنظیمات مرورگر همان PC اشاره می‌کند، نه محدودیت کد Elara.

## تغییرات این نسخه

- دکمهٔ نمایش/پنهان‌کردن رمز در Login و Registration سایت.
- دکمهٔ نمایش/پنهان‌کردن رمز در Admin.
- پیام دقیق برای خطاهای `auth/network-request-failed`, `auth/unauthorized-domain`, `auth/operation-not-allowed`, `auth/invalid-credential`, `auth/too-many-requests`.
