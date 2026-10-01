# Elara Space — الحاقیهٔ محصول/UX: Social، Privacy، Organization و Interaction

**ثبت درخواست:** ۱ اکتبر ۲۰۲۶  
**مخزن فعال:** `Mohadesehjohari/elaraspace` روی `main`  
**وضعیت کل سند:** **REQUESTED / ROADMAP ONLY** — ثبت این سند به معنی کدنویسی، تست، Deploy یا PASS نیست.  
**قاعدهٔ تقدم:** در تعارض با بندهای قدیمی دربارهٔ همین قابلیت‌ها، نیازمندی‌های این سند جدیدترند؛ مگر جایی که امنیت، حریم خصوصی یا مدل دادهٔ واقعی نیازمند تصمیم/مهاجرت جدا باشد.

## قرارداد وضعیت

هر آیتم هنگام اجرا باید مستقل با این وضعیت‌ها پیگیری شود:

- `REQUESTED`
- `DESIGNED`
- `CODED`
- `AUTOMATED-TESTED`
- `BROWSER-VERIFIED`
- `FIREBASE-VERIFIED` در موارد اجتماعی/اشتراکی
- `DONE` یا `REMAINING`

هیچ آیتمی صرفاً با Commit شدن یا وجود UI، `DONE` نیست.

---

# A — Friends Activity، Social و Community

## SOCIAL-ACTIVITY-01 — ارتفاع ثابت و اسکرول داخلی فعالیت دوستان

**وضعیت: REQUESTED**

- کارت «فعالیت دوستان» در Home نباید با زیادشدن Activityها بلند شود و بقیهٔ Grid را پایین هل بدهد.
- Header کارت ثابت بماند و فقط body فعالیت‌ها `overflow-y:auto` داشته باشد.
- Desktop: وقتی pointer/mouse روی هر بخش scrollable کارت است، wheel باید همان body را scroll کند.
- Mobile: touch/pan طبیعی داخل همان body کار کند.
- scrollbar باید طبق قرارداد Theme پروژه سمت راست کارت باشد و geometry را تغییر ندهد.
- اضافه‌شدن Activity جدید نباید باعث layout jump کارت‌های Ranking/Goals/Theme شود.

## SOCIAL-ACTIVITY-02 — لحن دوستانه، فان و امروزی

**وضعیت: REQUESTED**

متن Activityها از حالت اداری/خشک به لحن دوستانه و کوتاه تغییر کند، با حداکثر ۱ تا ۲ Emoji مرتبط. نمونهٔ لحن:

- «امروز تمرینشو ترکوند 🔥👊»
- «۳۰ صفحه جلو رفت 😎📚»
- «یه قدم دیگه به هدفش نزدیک شد ⚡🫡»
- «استریکش رو حفظ کرد 🔥🤝»

Emojiهای پیشنهادی: `🔥 😎 😍 🫣 🫡 👊 🤌 🤝 👀 🧠 🙇‍♀️ 🙇‍♂️ 🌚 🌝 💥 ☄️ ⚡`.

- از Unicode Emoji استفاده شود؛ Hotlink به Telegram/Web Emoji ممنوع.
- Activity جعلی برای پر کردن UI ممنوع.
- متن Activity باید از رویداد واقعی تولید شود و Privacy را رعایت کند.

## SOCIAL-ACTIVITY-03 — Like و Comment

**وضعیت: REQUESTED / BACKEND-REQUIRED**

- کاربر بتواند Activity دوست را Like کند.
- کاربر بتواند Comment بگذارد.
- Like/Comment باید persist شود و شمارش واقعی داشته باشد.
- Firestore/data model، Security Rules، حذف/ویرایش Comment، Report/Block و محدودیت abuse قبل از `DONE` تعریف و با دو UID واقعی تست شوند.
- Optimistic UI مجاز است ولی نتیجهٔ نهایی از backend canonical بیاید.

## FRIEND-REQUEST-UI-01 — Accept / Decline

**وضعیت: REQUESTED**

- درخواست دریافت‌شده دو Action واضح داشته باشد.
- Accept = action مثبت.
- Decline = دکمه/Artwork ضربدر با **background قرمز یا قرمز تیره**؛ فقط X قرمز روی wrapper بنفش کافی نیست.
- Loading/disabled/error state واقعی حفظ شود.

## FRIEND-INVITE-SEARCH-01 — اندازه و جای دعوت/جستجو

**وضعیت: REQUESTED**

- دکمه Invite بزرگ‌تر و خواناتر شود و underlay/shape اضافی زیر آن حذف شود.
- Search button در Desktop بزرگ‌تر و هم‌ارتفاع input باشد.
- Mobile: Search/Invite tap target مناسب، جای مستقل، alignment درست و بدون overlap.
- اگر Asset مناسب موجود نیست، Asset جدید هم‌سبک Elara تولید و در manifest ثبت شود.
- عنوان بخش‌های Social به‌جای عبارت‌هایی مثل «دعوت یک همراه» یا «دعوت دوستان»، مطابق ساختار جدید از **«جامعه»** و **«گروه‌ها»** استفاده کند؛ Action دعوت می‌تواند داخل این صفحات باقی بماند.

## FRIENDS-PAGE-01 — Friends صفحهٔ تخصصی، نه کپی Ranking

**وضعیت: REQUESTED / PARTIAL BACKEND REQUIRED**

صفحهٔ Friends باید هویت مستقل داشته باشد و صرفاً نسخهٔ Ranking نباشد. شامل:

- لیست دوستان پذیرفته‌شده
- درخواست‌های ورودی/خروجی
- Activity دوستان
- جستجو/دعوت
- لقب رابطه/Relationship nickname
- بخش Chat خصوصی در صورت ساخت backend امن
- Like/Comment Activity
- Privacy-aware statusها

Ranking می‌تواند زیرتب «رتبه‌بندی دوستان» داشته باشد، اما Friends صفحهٔ تخصصی تعامل اجتماعی باقی بماند.

### Chat خصوصی

- فقط پس از طراحی model، Rules، rate-limit/report/block، حذف حساب و تست دو حساب واقعی اجرا شود.
- Chat نمایشی/local-only برای ادعای completion ممنوع.

## FRIEND-STREAK-01 — استریک دوست در Ranking/Friends

**وضعیت: REQUESTED**

- در کارت/ردیف دوست، Streak با Flame نمایش داده شود.
- تعداد Streak زیر/نزدیک XP قرار گیرد.
- فقط از دادهٔ واقعی همان کاربر و طبق Privacy نمایش داده شود.

---

# B — Privacy و Wellness Sharing

## PRIVACY-GRANULAR-01 — Privacy قابل تغییر برای تمام گروه‌های قابل اشتراک

**وضعیت: REQUESTED / BUGFIX REQUIRED**

کاربر گزارش کرده انتخاب `public` عملاً هنوز private رفتار می‌کند. این باگ باید end-to-end رفع شود.

برای دسته‌های قابل اشتراک، visibility واقعی پشتیبانی شود:

- `private`
- `friends`
- `public`

دسته‌ها حداقل:

- Task completion summary
- Habit completion summary
- Goal milestone
- Reading activity
- Exercise/Workout activity
- Mission completion
- Streak milestone
- Ranking/profile fields که محصول اجازه می‌دهد

**Default برای Activityهای عمومی محصول:** `friends`، مگر کاربر تغییر دهد.

UI Privacy باید وضعیت ذخیره‌شده را دقیق بخواند و تغییر آن باید روی Feed/Friends/Public view واقعاً اثر بگذارد.

## WELLNESS-HOME-01 — ورزش در Home خصوصی/مخفی نباشد

**وضعیت: REQUESTED**

- Wellness/Exercise summary بخشی عادی از Home خود کاربر است و نباید به‌عنوان «private block مخفی» رفتار کند.
- Visibility اشتراک با دیگران از Privacy جدا کنترل شود.
- خصوصی بودن داده برای دیگران نباید باعث حذف کارت ورزش از Home صاحب حساب شود.

## CYCLE-PRIVACY-01 — دادهٔ پریود/چرخه

**وضعیت: REQUESTED / SENSITIVE-DATA**

- Cycle/Period **به‌طور پیش‌فرض Private** بماند.
- هرگز با default Friends/Public عمومی نشود.
- کاربر بتواند در صورت انتخاب صریح، فقط با **یک دوست پذیرفته‌شده که لقب/نقش «همراه» برایش تعیین کرده** share کند.
- اشتراک باید opt-in، قابل لغو و حداقل‌داده باشد.
- محتوای حساس کامل در Activity عمومی/Friends Feed نمایش داده نشود.
- Rules و تست دو UID الزامی است.

---

# C — Home، Habits، Missions و Wellness

## HOME-HABIT-ALIGN-01 — فاصلهٔ متن Habit تا checkbox

**وضعیت: REQUESTED**

- در فارسی/RTL، نام Habit مثل «کارهای امروز» از نظر فاصله و alignment به checkbox نزدیک و منظم باشد.
- Tasks و Habits قرارداد بصری مشترک داشته باشند.
- در English/LTR جهت و فاصله‌ها آینه‌ای/متناسب شوند؛ layout دستی RTL به English تحمیل نشود.

## DAILY-REPEAT-COMPACT-01 — Repeat/Schedule در Desktop

**وضعیت: REQUESTED**

- در بخش‌های روزانه Desktop، Badge/Control تکرار و زمان‌بندی کوچک و subtle باشد.
- check کوچک کنار آن، centred و optical-aligned باشد.
- metadata نباید ارتفاع row/card را زیاد کند.

## MISSIONS-CONTENT-01 — مأموریت‌های متنوع‌تر و دوستانه‌تر

**وضعیت: REQUESTED**

- مأموریت‌ها از مجموعهٔ واقعی و متنوع‌تر تشکیل شوند: Task/Habit/Reading/Language/Exercise/Goal/Streak و ترکیب‌های مجاز.
- لحن کوتاه، انگیزشی و امروزی با Emoji محدود.
- مأموریت جعلی یا XP تکراری ممنوع.
- تکمیل Mission باید Notification واقعی تولید کند.
- Notification template باید Locale-aware باشد.

## NOTIFY-DOMAIN-EVENTS-01 — رویدادهای مهم وارد Notification شوند

**وضعیت: REQUESTED**

مانند Reading، این رویدادها در Notification Center ثبت شوند:

- Mission completed
- Goal milestone
- Habit streak
- Task streak/meaningful milestone
- Book progress/completion
- Friend request / accepted
- Ranking milestone
- Exercise milestone در صورت Privacy مناسب

Notification duplicate بعد از Refresh ممنوع.

## CARD-WHEEL-TOUCH-01 — اسکرول کل ناحیهٔ کارت

**وضعیت: REQUESTED**

برای cardهای scrollable:

- Desktop: وقتی mouse/pointer روی **هر جای body کارت** است، wheel همان body را scroll کند؛ لازم نباشد pointer روی scrollbar باشد.
- Mobile: drag/touch vertical همان body را scroll کند.
- Header/Footer ثابت باشند.
- Nested scroll باید در boundary به page handoff صحیح داشته باشد و page را قفل نکند.

## WELLNESS-BANNER-02 — بنر ورزش بزرگ‌تر

**وضعیت: REQUESTED**

- Sports banner کارت Wellness ارتفاع بیشتری بگیرد تا Artwork و متن/جزئیات خواناتر شوند.
- aspect ratio/crop خراب نشود.
- Desktop/Mobile جدا اندازه‌گیری شوند.

## WELLNESS-WEIGHT-ART-01 — Artwork وزن

**وضعیت: REQUESTED / ASSET**

- برای Weight یک Artwork اختصاصی هماهنگ با Elara ساخته/انتخاب شود.
- Asset generated باید transparent/optimized، دارای مسیر واقعی و manifest entry باشد.

## GOALS-HOME-ART-01 — Artwork اهداف من

**وضعیت: REQUESTED / ASSET**

- برای کارت Goals یک تصویر/Artwork زیبا نزدیک Reference تولید/انتخاب شود.
- icon قدیمی هم‌زمان با Artwork جدید render نشود.

## TOPBAR-EDIT-ICON-01 — آیکن ویرایش کنار Bell

**وضعیت: REQUESTED**

- آیکن Edit کنار Bell مرتب، optical-centered و هم‌زبان با Moon/Bell شود.
- wrapper اضافی/box ناخواسته نداشته باشد.
- action واقعی و aria-label حفظ شود.

---

# D — Ranking Visual / Tabs

## RANKING-PODIUM-02 — اندازهٔ قاب Top 3

**وضعیت: REQUESTED**

- قاب/Avatar نفر اول و نفرات بعدی در Ranking نباید نسبت به Reference کوچک شوند.
- Top 1 visual dominance واضح‌تر باشد.
- geometry Desktop/Mobile جدا با Reference سنجیده شود.

## RANKING-TABS-02 — Buttons واقعی به‌جای text/underlay

**وضعیت: REQUESTED / ASSET**

تب‌های بالای Ranking:

- رنکینگ
- دوستان
- جامعه
- کلاب‌ها/گروه‌ها

باید buttonهای بزرگ‌تر و polished باشند.

- مستطیل/underlay اضافی زیر Button حذف شود.
- اگر Artwork دکمه موجود نیست، Asset مناسب تولید شود.
- خود button HTML، focus/keyboard و selected state واقعی حفظ شود.

---

# E — i18n کامل

## I18N-FULL-02 — تمام UI انگلیسی شود، دادهٔ کاربر ترجمه نشود

**وضعیت: REQUESTED**

وقتی Locale = English، تمام متن‌های **سیستمی/UI** انگلیسی شوند:

- Navigation
- Buttons
- Dialogs
- Forms
- Validation
- Empty states
- Settings
- Notifications
- Mission templates
- Social templates
- Reports
- Date labels
- Tooltips
- Search placeholders
- Privacy labels
- Ranking/Social

اما داده‌های User Generated Content با زبان ورود خود کاربر باقی بمانند، از جمله:

- عنوان/متن Task
- Goal و Steps
- Habit title
- Note/Journal
- نام کتاب دستی
- Commentهای کاربر

RTL/LTR باید بر اساس Locale UI باشد، نه زبان محتوای هر entity؛ خود متن entity می‌تواند `dir=auto` داشته باشد.

---

# F — Notifications / Modal UX

## NOTIFICATION-POPUP-02 — Popup اعلان در موبایل وسط صفحه

**وضعیت: REQUESTED / BUGFIX**

- Bell در Mobile Notification popup را **وسط viewport** باز کند، نه پایین صفحه.
- Popup جدید روی popup قبلی باید stack صحیح داشته باشد و پایین پرت نشود.
- Close/Back واضح، focus trap و scroll داخلی داشته باشد.
- ظاهر می‌تواند حس سریع/جمع‌وجور «پیام‌رسان» داشته باشد، ولی داده/برند Telegram کپی نشود.

## POPUP-NAV-02 — Back/Close برای همهٔ Popupها

**وضعیت: REQUESTED**

هر Modal/Popup/Subpage:
- `×` یا Back واضح
- Esc/Android Back
- focus return
- stack order واقعی
- no page jump

---

# G — Bulk Selection، Edit/Delete و Reorder

## MULTISELECT-01 — انتخاب چندتایی با نگه‌داشتن

**وضعیت: REQUESTED**

برای Entityهای قابل مدیریت مانند:

- Tasks
- Habits
- Goals/Steps
- در صورت مناسب بودن Books/List items

Desktop:
- pointer hold / selection mode، با alternative keyboard-accessible.

Mobile:
- long-press.

پس از ورود به selection mode:
- Select all
- Delete
- Copy/Duplicate
- Move
- Cancel selection

نمایش selection state واضح و قابل undo/confirm باشد.

## ENTITY-DELETE-EDIT-01 — Edit/Delete از همهٔ Surfaceها

**وضعیت: REQUESTED / DATA-OWNERSHIP REQUIRED**

- سه‌نقطه نباید بن‌بست «از فلان بخش مدیریت کن» ایجاد کند.
- کاربر بتواند Entity linked را از Surfaceهای مختلف Edit/Delete کند.
- mutation باید از یک Domain/Canonical service عبور کند تا Source و Linked representations sync شوند.
- Delete روی Linked Task باید confirmation روشن داشته باشد که source اصلی نیز حذف/به‌روز می‌شود.
- orphan/duplicate ممنوع.

## EDIT-DELETE-BUTTON-01 — سطل زباله قرمز در Edit

**وضعیت: REQUESTED**

داخل Edit Task/Habit/Goal/Book و Entityهای مناسب:
- دکمه Delete/Trash قرمز
- confirmation
- keyboard/touch accessible
- خطر حذف واضح

## REORDER-DRAG-01 — Drag & Drop ترتیب

**وضعیت: REQUESTED**

قابل reorder:

- Tasks
- Habits امروز
- Goals/Steps

Desktop:
- drag with mouse/pointer.

Mobile:
- long-press + drag.

الزامات:
- persistence ترتیب
- auto-scroll هنگام drag
- handle یا affordance روشن
- جلوگیری از تداخل با checkbox/click
- keyboard reorder fallback در accessibility
- sync چند دستگاه در صورت cloud-backed شدن ordering.

---

# H — Lists / Folders / Task Organization

## TASK-LISTS-02 — List در Settings و صفحات مستقل

**وضعیت: REQUESTED**

- در Settings امکان ساخت/ویرایش/حذف List و Folder وجود داشته باشد.
- هر List/Folder صفحهٔ اختصاصی داشته باشد.
- ورود به List صفحه‌ای از Tasks همان List را نشان دهد.
- Task جدید مستقیماً داخل همان List/Folder ساخته شود.
- جابه‌جایی Task بین List/Folder از Edit و Bulk Move ممکن باشد.
- Empty State دوستانه، Search/Filter و Back route واقعی.
- حذف List/Folder باید سیاست Taskهای داخل را بپرسد: Move/Unassign/Delete with confirmation.

## TASK-ORDER-IN-LIST-01

**وضعیت: REQUESTED**

- ترتیب دستی Tasks در هر List قابل drag/reorder باشد.
- Sorting دستی با sorting خودکار Date/Priority تضادش مشخص شود.
- mode انتخاب‌شده persist شود.

---

# I — Books: Cover Upload، Metadata Search و Reading

## BOOK-COVER-UPLOAD-01

**وضعیت: REQUESTED**

برای کتاب‌های دستی در Library و Language:
- Upload cover
- preview/crop
- size/type validation
- fallback art
- persistence در storage مناسب.

## BOOK-METADATA-SEARCH-01 — جستجو و Import مشخصات کتاب

**وضعیت: REQUESTED / EXTERNAL-DATA**

هنگام Add Book:
- Search بالای Popup.
- کاربر بتواند کتاب را از provider مجاز انتخاب کند.
- metadata قابل import:
  - title
  - author
  - cover
  - page count در صورت موجود بودن/معتبر بودن
  - publication metadata در صورت نیاز

Provider abstraction استفاده شود.

اولویت APIهای قانونی/قابل اتکا مثل Google Books / Open Library در صورت مناسب بودن.  
Goodreads فقط اگر API/دسترسی رسمی و مجاز وجود داشته باشد؛ **scraping غیرمجاز یا دورزدن Terms ممنوع**.

قبل از Save، user بتواند metadata مخصوصاً Page Count را اصلاح کند.

## BOOK-READING-02

**وضعیت: REQUESTED / ادامهٔ roadmap موجود**

- Total pages
- Current page
- Reading log
- Progress %
- Notification
- Privacy-aware Friends Activity

برای Library و Language مشترک/هماهنگ باشد، با domain owner روشن.

---

# J — Social Naming و Information Architecture

## SOCIAL-NAMING-01

**وضعیت: REQUESTED**

- عنوان‌های section از «دعوت یک همراه»/«دعوت دوستان» به ساختار روشن‌تر:
  - **جامعه**
  - **گروه‌ها**
تغییر کند، مطابق IA نهایی.
- Action «دعوت» می‌تواند در Context مناسب باقی بماند.
- «Friends» صفحهٔ مستقل تخصصی حفظ شود.

---

# K — Empty States دوستانه

## EMPTY-STATES-02

**وضعیت: REQUESTED**

برای Card/Section خالی، به‌جای فضای خالی یا متن خشک، پیام کوتاه و action-oriented:

- Friends Activity: «هنوز خبری نیست 👀 یه دوست اضافه کن تا اینجا زنده‌تر بشه 🔥»
- Requests: «فعلاً درخواستی نداری 😎»
- Goals: «یه هدف کوچیک بساز؛ از همون‌جا شروع می‌شه ⚡»
- Books: «قفسه منتظر اولین ماجراجوییه 📚✨»

متن‌ها Locale-aware باشند و fake data نسازند.

---

# L — معیارهای پذیرش مشترک

برای هر Stage مرتبط:

## Viewports

Mobile:
- 320
- 375
- 390
- 430

Desktop:
- 1440
- 1648
- 1920

## Tests

- no horizontal overflow
- no popup underlay/z-index failure
- no layout jump on data updates
- wheel/touch scroll داخلی
- full English UI while UGC remains original language
- Privacy public/friends/private واقعی
- cycle private-by-default + optional single Companion
- Friend request actions
- Activity like/comment backend security
- bulk select
- drag reorder
- list/folder route & persistence
- book search/import/cover/upload
- Reading logs
- notification events
- no fake social data
- no duplicate XP/events
- Firebase E2E با دو حساب برای قابلیت‌های اجتماعی/Privacy

---

# M — ترتیب پیشنهادی اجرا

1. **P0 Stability/Privacy bugs:** popup layering، Privacy public/friends/private، Notification positioning، scroll/layout.
2. **Friends Activity UX:** scroll ثابت، tone، request/search/invite، empty states.
3. **Home/Wellness/Missions visual + notifications.**
4. **Ranking visual/tabs/streak.**
5. **i18n کامل UI.**
6. **Edit/Delete canonical + Bulk Select.**
7. **Lists/Folders + dedicated task pages + reorder.**
8. **Books metadata/cover + Reading integration.**
9. **Likes/Comments + Friends specialized page + Chat فقط بعد از backend/security design.**
10. **Full browser/Firebase verification و بستن Roadmap items با شواهد واقعی.**

---

# N — Handoff برای ناظر

در چت‌های بعدی، ناظر باید:

- قبل از هر قضاوت HEAD واقعی `main` را refresh کند.
- گزارش چت اجرایی را بدون بررسی Commit/Files/CI نپذیرد.
- `CODED` را با `VERIFIED` یکی نداند.
- برای قابلیت اجتماعی/Privacy، بدون تست Firebase دو UID، `PASS` ندهد.
- برای Visual، تصاویر مرجع باید در همان گفت‌وگو در دسترس باشند؛ در غیر این صورت Visual PASS ندهد.
- از این سند و Roadmapهای بالادستی برای ساخت Prompt مرحلهٔ بعدی استفاده کند.
