# نصب Production الارا روی cPanel

این راهنما برای مخزن فعال **`Mohadesehjohari/elaraspace`** و شاخهٔ **`main`** است. مسیرهای زیر نمونه‌اند؛ قبل از اجرا مقدارهای `CPANEL_USERNAME`، `DOMAIN` و `DOCUMENT_ROOT` را با اطلاعات واقعی هاست جایگزین کن.

> نکتهٔ امنیتی: فایل‌های HTML/CSS/JS/Image که مرورگر برای اجرای سایت لازم دارد قابل دریافت‌اند و «نامرئی» نمی‌شوند. هدف این معماری جلوگیری از انتشار Secretها، فایل‌های توسعه، Git history، Rules، تست‌ها، لاگ‌ها و بکاپ‌های سرور است.

## 1) مسیرهای استاندارد

ساختار پیشنهادی:

```text
/home/CPANEL_USERNAME/repositories/elaraspace/   # Git checkout، خارج public_html
/home/CPANEL_USERNAME/elara-deploy/              # config/state/backups/logs/runtime، server-only
DOCUMENT_ROOT/                                   # فقط فایل‌های Production allowlist
```

برای دامنهٔ اصلی، `DOCUMENT_ROOT` معمولاً `/home/CPANEL_USERNAME/public_html` است. برای Addon Domain یا Subdomain ممکن است متفاوت باشد. مسیر واقعی را از **cPanel → Domains** بخوان.

## 2) SSL و دامنه

1. در **cPanel → Domains** دامنهٔ `DOMAIN` و Document Root آن را بررسی کن.
2. در **SSL/TLS Status** یا AutoSSL مطمئن شو HTTPS فعال است.
3. قبل از انتشار نهایی، `https://DOMAIN/` و `https://DOMAIN/admin/` باید بدون هشدار گواهی باز شوند.

## 3) Git Version Control در cPanel

1. برو به **cPanel → Git™ Version Control**.
2. **Create** را بزن.
3. Repository URL را روی مخزن رسمی قرار بده: `https://github.com/Mohadesehjohari/elaraspace.git`.
4. Repository Path را خارج Document Root بگذار، مثلاً:
   `/home/CPANEL_USERNAME/repositories/elaraspace`
5. Branch فعال باید `main` باشد.
6. Repository را ایجاد/Clone کن.

مخزن Git را داخل `public_html` Clone نکن؛ `.git` نباید در دسترس وب باشد.

## 4) config سروری

فایل واقعی config باید اینجا باشد:

```text
/home/CPANEL_USERNAME/elara-deploy/config.php
```

این فایل **خارج `public_html`** است و داخل Git Commit نمی‌شود. نمونه در `deploy/config.example.php` وجود دارد. حداقل:

```php
<?php
return [
    'document_root' => '/home/CPANEL_USERNAME/public_html',
    'server_root' => '/home/CPANEL_USERNAME/elara-deploy',
    'github_token' => null,
];
```

Repo فعلاً Public است، بنابراین `github_token` لازم نیست. اگر بعداً Repo Private شد، credential فقط در همین فایل server-only قرار می‌گیرد؛ هرگز آن را در `admin.js`، HTML، Firestore، GitHub public repo یا فایل داخل Document Root نگذار.

اگر config وجود نداشته باشد، اولین اجرای cPanel deploy برای دامنهٔ اصلی به‌طور پیش‌فرض `$HOME/public_html` را می‌سازد. برای Document Root سفارشی، بهتر است config را قبل از اولین Deploy دستی بسازی یا محیط `ELARA_DOCUMENT_ROOT` را برای اجرای CLI تعیین کنی.

## 5) اولین نصب

در صفحهٔ Git Version Control مخزن:

1. **Update from Remote** را اجرا کن تا `main` تازه باشد.
2. SHA نمایش‌داده‌شده را با GitHub مقایسه کن.
3. **Deploy HEAD Commit** را بزن.

cPanel فایل `.cpanel.yml` را می‌خواند و `deploy/cpanel-deploy.sh` را اجرا می‌کند. این اسکریپت کل Repository را wildcard داخل سایت کپی نمی‌کند؛ `deploy/production-manifest.json` source-of-truth است و فقط allowlist Production منتشر می‌شود.

در اولین Deploy این پوشه‌ها ساخته می‌شوند:

```text
$HOME/elara-deploy/state/
$HOME/elara-deploy/staging/
$HOME/elara-deploy/backups/
$HOME/elara-deploy/logs/
$HOME/elara-deploy/runtime/
```

فایل‌های Git، `.github/`، `tests/`، `docs/`، Roadmapها، READMEها، `firestore.rules`، اسکرین‌شات‌های توسعه و Secretها به Document Root Deploy نمی‌شوند.

## 6) Maintenance واقعی

Production از `.htaccess` و flag محلی `.elara-maintenance` استفاده می‌کند. هنگام Update:

1. lock سروری گرفته می‌شود؛
2. Maintenance فعال می‌شود؛
3. کاربران عادی HTTP 503 و صفحهٔ سبک RTL «Elara در حال به‌روزرسانی است» می‌بینند؛
4. `/admin/` و gateway احراز‌شدهٔ Deploy برای ادامهٔ عملیات در دسترس می‌مانند؛
5. بعد از Deploy موفق، Maintenance خودکار خاموش می‌شود؛
6. اگر Deploy بعد از تغییر Production شکست بخورد، Rollback خودکار تلاش می‌شود. اگر Rollback هم شکست بخورد، Maintenance عمداً روشن می‌ماند.

`.elara-maintenance` توسط `.htaccess` از دسترسی عمومی محافظت شده و Secret محسوب نمی‌شود.

## 7) One-Click Update از Admin

بعد از اولین نصب دستی، برو به:

`https://DOMAIN/admin/`

با حساب Firebase که سند معتبر `admins/{uid}` با `enabled=true` و role `owner` یا `admin` دارد وارد شو. role `moderator` اجازهٔ Deploy ندارد.

در تب **انتشار**:

- **بررسی آپدیت**: SHA فعلی Production و آخرین SHA شاخهٔ `main` را مقایسه می‌کند.
- **اعمال آپدیت از GitHub**: exact SHA را از GitHub می‌گیرد، lock می‌گیرد، Maintenance را فعال می‌کند، Archive همان SHA را در staging خارج Document Root Extract می‌کند، manifest را validate می‌کند، از Production فعلی Backup می‌گیرد، فایل‌ها را با replace اتمیک منتشر می‌کند، checksum health check انجام می‌دهد و SHA موفق را ثبت می‌کند.
- **Rollback به نسخه قبلی**: آخرین Backup موفق را برمی‌گرداند.

Browser هیچ `git`، shell command، cPanel token یا deployment secret اجرا/دریافت نمی‌کند. Endpoint فقط actionهای hard-coded `status/check/deploy/rollback/maintenance` را می‌پذیرد و Repo/Branch در Backend ثابت است.

### نیازمندی PHP برای One-Click

- PHP 8.1 یا جدیدتر
- extension `curl`
- extension `zip` / `ZipArchive`
- امکان نوشتن PHP user روی `DOCUMENT_ROOT` و `$HOME/elara-deploy`

اگر `ZipArchive` فعال نیست، از **cPanel → Select PHP Version / Extensions** (نام منو بسته به هاست متفاوت است) extension `zip` را فعال کن یا از پشتیبانی هاست بخواه.

## 8) Authentication و مجوز Deploy

Admin frontend، Firebase ID token حساب واردشده را با `Authorization: Bearer ...` به `/admin/deploy.php` می‌فرستد. Backend:

1. token را با Firebase Auth بررسی می‌کند؛
2. UID را می‌گیرد؛
3. سند `admins/{uid}` را از Firestore با همان token می‌خواند؛
4. فقط `owner` و `admin` فعال را قبول می‌کند؛
5. `moderator` با HTTP 403 رد می‌شود.

وجود URL `/admin/` یا مخفی‌بودن دکمه هیچ‌وقت مجوز محسوب نمی‌شود. `admins/{uid}` طبق Rules این Repository از Client قابل create/update/delete نیست؛ ایجاد نقش Admin باید در محیط مورد اعتماد انجام شود.

## 9) Firebase Production Prep

Commit شدن `firestore.rules` به GitHub به معنی Deploy شدن Rules نیست. قبل از Production واقعی:

1. در Firebase Console، Firestore Rules واقعی را Publish کن.
2. Auth providerهای لازم (مثلاً Email/Password) را فعال کن.
3. `DOMAIN` را در **Authentication → Settings → Authorized domains** اضافه کن.
4. با یک حساب Admin واقعی ورود `/admin/` را تست کن.
5. ثبت‌نام و ورود یک حساب دوم واقعی را تست کن.
6. با حساب moderator واقعی تأیید کن که Deploy endpoint پاسخ 403 می‌دهد.

تا این تست‌ها در Firebase واقعی انجام نشده‌اند، Firebase Production را «تأییدشده» حساب نکن.

## 10) فایل‌ها و Hardening

Production Manifest فقط runtime allowlist را منتشر می‌کند. `.htaccess` علاوه بر `Options -Indexes` دسترسی به الگوهای توسعه/Secret را هم می‌بندد. CSP سخت در این مرحله فعال نشده چون باید جدا با Firebase CDN/Auth تست شود؛ در عوض headerهای کم‌ریسک `nosniff`، Referrer Policy، Frame policy و Permissions Policy فعال شده‌اند.

Source mapهای `.map`، فایل‌های Markdown، Rules، key/pem و backup/log در manifest مجاز نیستند.

## 11) Update from Remote و Deploy HEAD در cPanel

اگر One-Click Admin موقتاً در دسترس نبود:

1. **Git Version Control → Manage**
2. **Update from Remote**
3. بررسی کن Branch روی `main` باشد.
4. **Deploy HEAD Commit**

این مسیر همان Production Manifest و backup/maintenance runtime را استفاده می‌کند؛ نیازی به ZIP/File Manager نیست.

## 12) Rollback و لاگ‌ها

State و Backupها خارج Document Root هستند:

```text
$HOME/elara-deploy/state/deployment.json
$HOME/elara-deploy/backups/
$HOME/elara-deploy/logs/audit.ndjson
```

Audit شامل UID مدیر، from/to SHA، زمان شروع/پایان، status و rollback status است. این فایل‌ها نباید به `public_html` منتقل شوند.

اگر Rollback از Admin شکست خورد:

1. Maintenance را روشن نگه دار.
2. `audit.ndjson` و `deployment.json` را از File Manager/Terminal بررسی کن.
3. از cPanel Git Version Control، Commit سالم قبلی را Checkout/Deploy کن یا Backup سالم زیر `$HOME/elara-deploy/backups/` را با پشتیبانی فنی بررسی کن.
4. قبل از خاموش‌کردن Maintenance، `index.html`، `/admin/` و login را تست کن.

## 13) Troubleshooting

**Admin می‌گوید runtime نصب نیست:** یک بار از cPanel Git Version Control گزینهٔ **Deploy HEAD Commit** را اجرا کن و وجود `$HOME/elara-deploy/runtime/ElaraDeployRuntime.php` را بررسی کن.

**HTTP 403 در Deploy:** سند `admins/{uid}`، `enabled` و role را بررسی کن. Moderator عمداً مجاز نیست. همچنین Rules واقعی Firestore باید Publish شده باشند.

**GitHub check/download خطا:** خروجی هاست به `api.github.com` و `codeload.github.com` روی HTTPS باید مجاز باشد. برای Repo Public token لازم نیست.

**PHP ZipArchive موجود نیست:** extension `zip` را در cPanel فعال کن.

**Maintenance خاموش نمی‌شود:** ابتدا مطمئن شو Deployment/Rollback کامل شده، سپس از Admin دوباره Maintenance را خاموش کن. حذف دستی `.elara-maintenance` فقط در شرایط اضطراری و بعد از بررسی سلامت فایل‌ها انجام شود.

**500 بعد از `.htaccess`:** برخی هاست‌ها AllowOverride محدود دارند. Error Log cPanel را بررسی کن؛ `Options -Indexes` و mod_rewrite/mod_headers باید توسط هاست مجاز باشند. بدون بررسی، ruleهای امنیتی را کورکورانه حذف نکن.

## 14) چک‌لیست پذیرش Production

- [ ] Git repository خارج Document Root است.
- [ ] `$HOME/elara-deploy/config.php` خارج public_html و permission محدود دارد.
- [ ] SSL معتبر است.
- [ ] Deploy HEAD Commit یک بار موفق شده است.
- [ ] `/admin/` با Admin واقعی کار می‌کند.
- [ ] Check Update SHA واقعی را نشان می‌دهد.
- [ ] One-Click Update در cPanel واقعی تست شده است.
- [ ] Rollback در cPanel واقعی تست شده است.
- [ ] Firebase Authorized Domain اضافه شده است.
- [ ] Firestore Rules واقعاً Publish شده‌اند.
- [ ] حساب دوم واقعی ثبت‌نام/ورود شده است.

تا قبل از تکمیل موارد cPanel/Firebase واقعی، این Repository فقط **Production-prepared** است و نباید «deployed-to-production» یا «release-ready» اعلام شود.
