# بسته کامل Elara Space — اصلاح ورود و نمایش رمز

این بسته از نسخه کامل کد Elara Space ساخته شده و تغییرات زیر را دارد:

- دکمه چشم برای نمایش/پنهان‌کردن رمز در ورود سایت اصلی.
- دکمه چشم برای رمز و تکرار رمز در ثبت‌نام.
- دکمه چشم در ورود Admin.
- پیام دقیق‌تر خطاهای Firebase Authentication، مخصوصاً `auth/network-request-failed`.
- مستند `docs/AUTH-PC-DIAGNOSTICS.md` برای مشکل ورود PC.
- مستند نام‌گذاری Assetها و Rankها.

ممیزی کد نشان داد محدودیت Desktop/PC یا ایمیل hard-coded برای ورود کاربران وجود ندارد. پنل Admin فقط بعد از ورود Firebase سند `admins/{uid}` را بررسی می‌کند.

نکته: فایل‌های PNG آواتار/فریم/`logo.png` که جداگانه در ریپوی `Mohadesehjohari/elaraspace` قرار گرفته‌اند، در Snapshot پایهٔ `ArenParsi/elaraspace` موجود نبودند و داخل این ZIP کد قرار نگرفته‌اند. نام‌گذاری آن‌ها در `docs/PROJECT-ASSETS-CONVENTION.md` ثبت شده است.
