# Elara Admin Core — راه‌اندازی روی cPanel

این بسته اولین قدم پنل مدیریت است. هنوز مدیریت Gemini، فروشگاه، کاربران، Club و Deploy خودکار را پیاده نمی‌کند؛ فقط هستهٔ دسترسی امن، Overview، شمارش کاربران، تنظیم Maintenance و Audit Log را می‌سازد.

## ۱. فایل‌های cPanel
پوشهٔ `admin/` را در کنار فایل‌های اصلی Elara داخل `public_html` قرار دهید:

```
public_html/
  index.html
  assets/
  ...
  admin/
    index.html
    admin.css
    admin.js
    .htaccess
```

سپس پنل از مسیر `https://YOUR-DOMAIN/admin/` باز می‌شود.

## ۲. دامنه و HTTPS
- SSL/HTTPS را در cPanel فعال کنید.
- دامنهٔ واقعی سایت را در Firebase Authentication > Settings > Authorized domains اضافه کنید.
- پنل Admin را روی همان دامنه یا زیردامنهٔ مورد اعتماد نگه دارید.

## ۳. Firestore Rules
فایل `firestore.rules` این ریپو را در Firebase Console > Firestore Database > Rules بررسی و Publish کنید. آپلود فایل در GitHub یا cPanel به‌تنهایی Rules فعال را تغییر نمی‌دهد.

## ۴. ساخت Owner اولیه
برای جلوگیری از اینکه کاربر عادی خودش را Admin کند، رابط عمومی هیچ راهی برای ساخت سند Admin ندارد.

1. در Firebase Console > Authentication، UID حساب مالک را پیدا کنید.
2. در Firestore یک collection به نام `admins` بسازید.
3. Document ID را دقیقاً UID مالک قرار دهید.
4. فیلدها:
   - `role`: string = `owner`
   - `enabled`: boolean = `true`
   - `name`: string = نام دلخواه

نمونه:
```json
{
  "role": "owner",
  "enabled": true,
  "name": "Elara Owner"
}
```

این سند را فقط از Firebase Console یا Backend مورد اعتماد بسازید. Rules اجازه نمی‌دهند کاربر مرورگر آن را ایجاد یا تغییر دهد.

## ۵. ورود
با همان حساب تأییدشده وارد `/admin/` شوید. Admin Core سند `admins/{uid}` را بررسی می‌کند؛ صرف دانستن URL پنل دسترسی ایجاد نمی‌کند.

## ۶. Maintenance
در این مرحله Toggle تعمیر و نگهداری فقط در `publicSettings/site` ذخیره می‌شود و Audit Log می‌نویسد. اتصال این مقدار به صفحهٔ اصلی سایت در گام بعدی انجام می‌شود.

## ۷. Gemini و Secretها
هیچ Gemini API key، رمز، token یا secret را داخل `public_html`، JavaScript مرورگر، GitHub یا Firestore قابل‌خواندن توسط کاربران قرار ندهید. گام Gemini نیازمند Backend امن است.

## ۸. مرحله بعد
پس از بالا آمدن این Core روی دامنه:
1. اتصال Maintenance به سایت اصلی.
2. مدیریت User/Role و Content.
3. ساخت Backend امن برای Gemini.
4. Shop/Assets.
5. CI/CD و Rollback متناسب با cPanel.
