# Elara Space — الحاقیهٔ الزام‌آور رودمپ طرح تأییدشده (۲۲ سپتامبر ۲۰۲۶)

این سند **مکمل** `APPROVED-VISUAL-REDESIGN-AND-NEXT-PHASE.md` و تمام رودمپ‌های قبلی است؛ هیچ درخواست قبلی حذف یا با این سند جایگزین نمی‌شود. سه تصویر تأییدشدهٔ کاربر مرجع اصلی خانه، زبان و پنل حساب/کمد/پاپ‌آپ‌اند. «ثبت در رودمپ» با «کدنویسی، تست و انتشار» یکسان نیست. HEAD مبنای این الحاقیه: `bd185260cc8302683cbbbd54abcc5867743cef68` در `ArenParsi/elaraspace/main`.

## ۱. قرارداد طراحی و ناوبری (P0)

- **شباهت بصری بالا، نه ماکاپ:** هم‌چینش و ترتیب کارت‌ها، انحنای گوشه‌ها، فاصله‌ها، glow سرمه‌ای/بنفش-آبی نئونی، تصویر کوهستان شب/ماه، بنرها، نوارهای پیشرفت و آیکن‌های سه‌بعدی هماهنگ با سه تصویر. روی کد واقعی دسکتاپ و موبایل و با دادهٔ کاربر؛ در عین حال خوانایی حالت روشن/تاریک، سرعت گوشی، RTL/LTR، `prefers-reduced-motion` و Vazirmatn **واقعاً بارگذاری‌شده** حفظ شود. تصویرهای جدید برای بنرها سبک مشابه شب، پاییز، رؤیا و کوهستان داشته باشند؛ لزومی به کپی عکس Pinterest نیست و نباید تصاویر بدون مجوز یا وابستگی runtime به Pinterest داشته باشیم. بنرهای متمایز و محلی در `assets/` قرار گیرند.
- **دکمهٔ سه‌خط تیره** داخل Topbar و Drawer حساب از بغل در موبایل/دسکتاپ باقی بماند؛ حساب خصوصی، کمد، ظاهر/تم، حریم خصوصی، اعلان، پوشه/تگ، تقویم، راهنما و سایر تنظیمات در آن Drawer، نه در نوار اصلی. منوی تنظیمات و انتخاب تم از کل UI پشتیبانی کند و فقط به چند رنگ سطحی محدود نشود. مرجع جدیدِ انتخاب تم که کاربر گفته بعداً می‌فرستد تا زمان دریافت، «منتظر مرجع تصویری» است.
- **ناوبری هدف:** مسیرهای خانه، تسک‌ها، زبان، کتابخانهٔ عمومی، رنکینگ/اجتماع، ورزش و «آزادی» با نام خواناتر، در گوشی و PC هم‌معنا؛ خانه در مرکز آرایش بصری نوار باشد. از آنجا که هفت دکمه در عرض گوشی‌های باریک ممکن است خوانایی را از بین ببرند، تست واقعی عرض‌های 320/375/390/430px، حاشیه‌های امن و حالت دسترس‌پذیر الزامی است؛ بدون حذف قابلیت، یک الگوی سازگار طراحی شود. کافه در صورت مناسب‌نبودن ظرفیت، فعلاً مدخل مستقل در صفحهٔ اجتماع و **نه دکمهٔ هشتم در پایین** است و افزودن نهایی‌اش به بار نیازمند تصمیم بعدی. صفحه‌های عادت و هدف دیگر ورودی نوار پایین نباشند اما route، داده و دسترسی‌شان حذف نشود.
- **خانه مطابق تصویر:** بنر بالایی، استریک/XP، کارت کارهای امروز با Focus دقیقاً در بخش پایین همان کارت، کارت عادت‌ها با نوار و سطرهای دائمی «آب» و «خواب» که به صفحه ورزش/سلامت متصل‌اند، اهداف با نوار، مأموریت با Reward XP واقعی، دوستان و رنکینگ. دکمهٔ «همه» در عادت‌ها و هدف‌ها (و تسک‌ها) صفحهٔ کامل موجود خودشان را با دکمهٔ برگشت باز کند؛ از بازسازی داده‌ها یا سه نسخهٔ بی‌ارتباط خودداری شود.
- **زبان:** دقیقاً چهار قسمت برجستهٔ نمونه: لایتنر، کتاب‌های درحال مطالعه و خوانده‌شدهٔ زبان، گزارش یادگیری و کلاس/کورس. کتابخانهٔ عمومی مستقل بماند. کلاس/باشگاه/گلوبالِ فاقد backend باید صریحاً «در راه» بماند و رکورد ساختگی به‌عنوان واقعیت نمایش داده نشود.
- **اجتماع:** رنکینگ اصلی، رتبهٔ میان دوستان، نمای پروفایل عمومی و دوستان موجود را در مقصد رنکینگ/اجتماع قابل دسترسی کن؛ باشگاه‌ها/رنکینگ باشگاه‌ها/رنکینگ جهانی پس از قرارداد داده، حریم خصوصی و ضدتقلب تعریف و اجرا شوند. پیشنهاد/ایدهٔ باشگاه در رودمپ است، نه سرویس فعال.

## ۲. ورزش، آب، خواب و چرخهٔ قاعدگی (P1 با طراحی حریم خصوصی)

- صفحهٔ مستقل ورزش در بار اصلی؛ ثبت وزن اختیاری، هدف نوشیدن آب قابل تنظیم با واحد mL/لیوان و حجم هر لیوان، دکمهٔ افزودن یک لیوان و نمایش مقدار امروز؛ ارائهٔ تخمین بر اساس وزن فقط به‌عنوان **پیشنهاد قابل‌تغییر غیرپزشکی**، نه حد تجویزی ثابت. تاریخچه و نمودار روزانهٔ تعداد لیوان/حجم آب.
- ثبت ساعت خواب و بیداری هر روز با تاریخ محلی و محاسبهٔ طول خواب با عبور از نیمه‌شب، نمایش تاریخچه و نمودار مدت خواب؛ امکان اصلاح/حذف رکورد. ثبت نوع ورزش از لیست/متن اختصاصی، مدت به دقیقه، تاریخ و فهرست تمرین‌های روزانه با ویرایش/حذف، همراه با Dialog مرکزی هم‌سبک سایت.
- بخش چرخهٔ قاعدگی فقط برای کاربری که **خودش داوطلبانه گزینهٔ «زن» را برای این ماژول انتخاب کرده** نمایش داده شود؛ مقدار پیش‌فرض جنسیت «نامشخص» است و این انتخاب نباید از نام/آواتار استنباط شود. ثبت روز شروع/پایان و یادداشت اختیاری با تاریخ و امکان حذف، بدون ادعای پیش‌بینی پزشکی. **زیر کارت/بخش پریود هیچ میان‌بر یا بلوک «تنظیمات حریم خصوصی» نمایش داده نشود**؛ تنظیمات حریم خصوصی همچنان فقط در Privacy Center حساب/Drawer متمرکز بماند. دادهٔ چرخه به‌صورت پیش‌فرض خصوصی و تفکیک‌شده بر اساس UID باشد و در رنکینگ، مأموریت یا فید عمومی منتشر نشود. قابلیت آیندهٔ اشتراک‌گذاری فقط به‌صورت صریح و اختیاری طراحی شود: کاربر بتواند از میان دوستان پذیرفته‌شده یک نفر را با برچسب/لقب رابطه‌ای «همراه» تعیین کند و سپس رکورد یا خلاصهٔ انتخاب‌شدهٔ چرخه را آگاهانه برای همان همراه Share کند؛ نام اصلی و Username دوست حفظ شود و «همراه» فقط یک برچسب رابطه‌ای کنار نام باشد. دریافت‌کننده باید همان اشتراک را در بخش دوستان/پیام‌های مرتبط دریافت کند، نه اینکه داده به همهٔ دوستان نمایش داده شود. لغو اشتراک و تغییر همراه باید هر زمان ممکن باشد. پیش از هر Sync/Share ابری، رضایت روشن، قرارداد داده، احراز مجوز سمت سرور و Firestore/Backend Rules اختصاصی با تست دو حساب لازم است؛ localStorage به‌تنهایی مخزن امن این دادهٔ حساس نیست و اطلاعات حساب‌های دیگر هرگز با key مشترک ادغام نشود.
- خواب و آب همیشه در کارت عادت‌های خانه دیده شوند؛ امکان رفتن به ورزش برای ثبت سریع از همان ردیف. عادت‌های پایهٔ تسک/XP موجود دست‌کاری نشوند؛ اتصال این نمودارهای سلامت به XP صرفاً پس از طراحی جداگانه.

## ۳. پاپ‌آپ‌ها، حساب و Assetها (P0/P1)

- پاپ‌آپ ویرایش پروفایل، پروفایل عمومی، تمرکز و ثبت ورزش: کارت مات و خوانا در مرکز با فاصلهٔ چهارطرف؛ Scrim تیرهٔ **نیمه‌شفاف** که سایت پشت آن قابل تشخیص بماند؛ کنترل Escape/Back و focus trap، Scroll lock و ریسپانسیو آزمون شوند.
- فایل‌های آواتار (`avatars-male-level1.png` تا `avatars-male-level10.png` و `avatars_female_level1.png` تا `avatars_female_level10.png`)، فریم‌های `frames_bronze.png`, `frames_silver.png`, `frames_gold.png`, `frames_diamond.png` و `logo.png` با نام **دقیق** از ریپوی عمومی موجود طبق `PROJECT-ASSETS-CONVENTION.md` به `assets/` ریپوی توسعه **و ZIP اجرایی** منتقل شوند؛ بارگذاری محلی و نوع/ابعاد تصویر بررسی شود. دانلود تصاویر پروفایل جدید فقط از منبع مجاز با حق استفاده/بازنشر؛ از عکس افراد حقیقی یا کاراکترهای دارای حق نشر بدون اجازه استفاده نکن. پیش‌نمایش قفل‌شده آزاد و Equip آیتم قفل‌شده ممنوع؛ احراز قفل سمت سرور قبل از Sync ابری لازم است. Level ذخیره‌شده و پروفایل کاربران بدون مهاجرت امن تغییر نکند.
- بنرهای متمایز محلی شب/ماه، پاییز، کوه و رؤیا؛ اولین رایگان، باقی بر اساس Level و فقط پس از عبور از آستانه انتخاب‌پذیر. تنظیمات فعلی، تم‌های انتخابی و متن‌های قبلی کاربر بدون دلیل تغییر نکنند.

## ۴. کافه و بازی‌ها (P2 / فاز مستقل، هنوز ساخته نشده)

- فضای بصری کافه با میز/صندلی و دعوت دوستان، چت عمومی و خصوصی با مجوز دسترسی، مدیریت گزارش/مزاحمت، وضعیت آنلاین واقعی و حریم خصوصی؛ بازی‌های چندنفره شامل منچ، شطرنج، اونو، مونوپولی و بازی‌های دیگر فقط با طراحی backend همزمانی، قوانین و مالکیت معنوی. برای نام‌ها، آثار تصویری و قوانین دارای حق نشر مجوز بررسی شود. رزرو صندلی و هم‌زمانی باید سروری باشد، نه fake localStorage؛ امنیت چت و افراد کم‌سن نیازمند طراحی خاص است. **پیش از آماده‌بودن backend نباید این موارد را اجراشده یا قابل استفاده معرفی کرد.**

## ۵. مراحل اجرا و معیار پذیرش

۱. ممیزی آخرین `main` و رودمپ‌های اجباری؛ ثبت موجود/نیازمند اصلاح/پیاده‌سازی‌نشده. ۲. طراحی و ناوبری بدون تغییر منطق دادهٔ قبلی. ۳. ماژول واقعی ثبت آب/خواب/ورزش با تفکیک UID و نمایش در خانه. ۴. انتقال و تست PNGهای اصلی، بنرهای محلی و کمد. ۵. ادغام اجتماع و مسیرهای فاقد backend بدون دادهٔ جعلی. ۶. مقایسهٔ اسکرین‌شات از اجرای واقعی روی موبایل/PC با سه تصویر، بررسی فونت در `document.fonts`، تعامل Modal و تست رگرسیون تسک/تکرار/XP/Focus/Refresh و دو UID. ۷. تست و انتشار واقعی Firestore Rules فقط با دسترسی مجاز، سپس ZIP مستقل شامل کل فایل‌های اجرایی (ریشه `index.html` و `admin/index.html`)؛ هر تغییر با لینک Commit در `main` و گزارش جداگانهٔ «درخواست‌شده/کدنویسی‌شده/تست‌شده/آمادهٔ انتشار» تحویل شود.

**وضعیت در لحظهٔ ثبت این سند:** تمام موارد این الحاقیه «درخواست‌شده» هستند؛ این سند به‌تنهایی هیچ‌کدام را «کدنویسی/تست/آمادهٔ انتشار» نمی‌کند. تصمیم نهایی جای تب اصلی Focus همچنان باز است؛ کارت Focus در خانه باید حفظ شود.

## ۶. به‌روزرسانی Master Visual Roadmap — مرجع‌های تکمیلی همین جلسه

**ثبت:** ۲۲ سپتامبر ۲۰۲۶ — این بخش بر اساس مجموعهٔ مرجع‌های تصویری جدیدی است که کاربر در گفت‌وگوی ادامهٔ توسعه فرستاد: Home/Dashboard، Ranking & Social، Wellness/Exercise، Freedom/Creativity، Language و Account/Profile/Wardrobe. این مرجع‌ها جهت هنری و تراکم/Hierarchy را مشخص می‌کنند؛ متن‌های ناخوانا یا جزئیات غیرممکن تصویر مولد نباید عیناً به داده یا منطق واقعی تبدیل شوند. هر قابلیت باید با دادهٔ واقعی و قراردادهای فعلی پروژه اجرا شود.

### ۶.۱ قرارداد تم و هویت بصری

- ظاهر نئونی/شبانهٔ فعلی **یک Style Family اصلی** است، نه تنها ظاهر دائمی محصول. معماری Appearance باید سه محور مستقل را حفظ و تقویت کند: **Mode** (Light/Dark/System/AMOLED)، **Style Family** و **Accent**. تغییر Style Family باید واقعاً Card geometry، background treatment، icon treatment، depth/glow، typography emphasis و motion را تغییر دهد؛ صرفاً عوض‌کردن چند رنگ کافی نیست.
- Style Family نئونی مرجع: سرمه‌ای بسیار عمیق، لایه‌های آبی/بنفش، شیشهٔ تیره و نیمه‌شفاف، حاشیهٔ ظریف سرد، glow کنترل‌شده، gradientهای موضعی، پس‌زمینه/بنر سینمایی شب/کوه/ماه/کهکشان، depth چندلایه و CTAهای بنفش-آبی. Glow نباید روی همهٔ عناصر پخش شود یا خوانایی متن را کاهش دهد.
- آیکن‌های تصویری مرجع حس سه‌بعدی/برجسته دارند. ممنوعیت platform emoji و فونت emoji پابرجاست، اما نتیجه نباید UI تخت و بی‌تصویر باشد: برای بخش‌های کلیدی از **Asset/SVG/Icon اختصاصی و هم‌سبک** استفاده شود. حذف ایموجی سیستم به معنی حذف هویت تصویری نیست.
- Vazirmatn، RTL، کنتراست، focus-visible، reduced motion، Light و AMOLED قراردادهای غیرقابل حذف‌اند. تم نئونی نباید با hard-code رنگی باعث خراب‌شدن Modeهای دیگر شود.
- Art Direction مرجع است، نه mock data: تصویرهای Hero/Avatar/Banner می‌توانند فضای داستانی بسازند، اما XP، Rank، Task، Habit، Friend و Health باید از state واقعی کاربر بیایند.

### ۶.۲ ممیزی مجدد Pass 4 — ظاهر قبلی بدون مصونیت از اصلاح

کاربر صریحاً اعلام کرده ممکن است در اجرای چت قبلی خطاهای بصری وجود داشته باشد. بنابراین «Pass 4 روی main است» فقط مالکیت/قرارداد کد را تثبیت می‌کند و **تأیید بصری نهایی نیست**. این موارد باید دوباره بررسی و در صورت نیاز اصلاح شوند:

- Account Drawer در مرجع باید حس یک پنل پروفایل واقعی داشته باشد: Banner عریض، Avatar halo/frame، نام/Username/Level/XP، badge/chipهای فشرده، Bio و Actionهای واضح؛ نه صرفاً مجموعه‌ای از کارت‌های عمومی با background یکسان.
- Profile Edit باید Dialog مستقل و متمرکز باشد، با header تصویری/Avatar preview، فیلدهای خوانا، Save/Cancel واضح و Scrim نیمه‌شفاف. بازشدن آن نباید Layout حساب را جابه‌جا یا صفحه را به پایین اسکرول کند.
- Wardrobe باید یک فضای مستقل «کمد» با Preview برجسته، بخش‌های Avatar/Frame/Banner، آیتم‌های collectible، Lock state واضح، انتخاب فعال و hierarchy نزدیک مرجع باشد. کارت‌های تخت و fallbackهای بیش از حد نباید جای Asset واقعی را بگیرند.
- Public Profile باید همان composition مشترک Avatar + Frame + Banner را داشته باشد، اما فقط فیلدهای عمومی مجاز را نمایش دهد.
- Theme selector باید تفاوت قابل‌دیدن بین Mode/Style/Accent ایجاد کند. Neon/Elara باید به‌عنوان Style Family واضح و قابل تشخیص وجود داشته باشد؛ Minimal/Rugged/Fantasy نباید صرفاً previewهای اسمی باشند.
- Mobile در عرض‌های 320/375/390/430 باید تراکم و spacing مرجع را حفظ کند؛ متن، CTA، Avatar، chips و Wardrobe grid نباید فشرده یا بریده شوند.
- Navigation هفت‌مسیرهٔ canonical حفظ می‌شود؛ مشکل تراکم موبایل باید با layout/label/icon sizing و safe-area حل شود، نه حذف route یا ساخت writer دوم.
- missing PNG باید fallback صادقانه و تمیز داشته باشد. فایل canonical جعلی ساخته نشود؛ اما fallback نباید ظاهر اصلی را طوری پنهان کند که نبود Asset تشخیص‌ناپذیر شود.

### ۶.۳ مشخصات صفحه‌ها بر اساس مرجع‌های جدید

**Home / Dashboard**
- Hero سینمایی با پیام کوتاه، XP/Profile context، و تصویر شب/کوه.
- کارت‌های Today Tasks، Habits، Wellness snapshot، Missions، Goals، Friends/Activity و Ranking با depth متفاوت اما Design System واحد.
- Progress barها در سطح اطلاعاتی مهم و کوتاه؛ card density مشابه مرجع و نه صفحهٔ خالی با کارت‌های بسیار بزرگ.
- Focus در Home حفظ شود و منطق فعلی Reset/Session تغییر نکند.

**Ranking / Social**
- Header و podium/leaderboard با Avatar frame و Rank واضح.
- My rank، friend ranking، friend requests و friend activity به‌صورت بخش‌های مستقل ولی هم‌خانواده.
- Club/Cafe فقط در حد entry/coming-soon مطابق backend واقعی؛ fake online users یا fake leaderboard ممنوع.

**Wellness / Exercise**
- Hero سلامت/حرکت، Water، Sleep، Weight، Workout history/goals و Cycle module با سلسله‌مراتب کارت‌های مرجع.
- privacy contract و UID separation فعلی حفظ شود؛ زیبایی بصری نباید دادهٔ خصوصی را وارد public/social کند.

**Freedom / Creativity**
- محیط آرام‌تر اما همچنان هم‌خانوادهٔ نئونی: Notes، Ideas، Inspirations، Vision Board و AI/locked capabilities فقط مطابق وضعیت واقعی backend.
- فضای تصویری بیشتر از صفحات utility، با card density کمتر و hero هنری.

**Language**
- چهار بلوک canonical لایتنر، کتاب‌های زبان، گزارش یادگیری و کلاس/کورس باید از نظر بصری از هم قابل تشخیص باشند.
- Book cover/Brain/Study iconography باید به Asset/Icon system متکی باشد، نه emoji سیستم.
- Progress و report باید از دادهٔ واقعی همین حساب باشند؛ کلاس بدون backend همچنان «در راه».

**Account / Profile / Wardrobe**
- Profile header باید بیشترین وفاداری را به مرجع جدید داشته باشد: Banner، Avatar با halo/frame، identity، Level/XP progress و chips.
- Account navigation در Drawer می‌تواند ستون/لیست فشرده باشد، ولی صفحهٔ Account باید به‌جای فرم inline، presentation + actions باقی بماند.
- Wardrobe در modal/window مستقل، و Profile Edit در ElaraDialog مستقل باقی بمانند.
- Composition مشترک باید در Self/Public/Wardrobe preview یکسان باشد تا سه ظاهر متفاوت برای یک پروفایل ساخته نشود.

### ۶.۴ ترتیب اجرایی جدید

1. **Pass 5A — Visual audit + Account/Profile/Wardrobe/Theme correction (P0):** ممیزی CSS/DOM واقعی Pass 4، اصلاح visual depth و hierarchy با حفظ source-of-truth، focus/overlay contract و preference schema.
2. **Pass 5B — Home fidelity (P0):** Hero، card density، Today/Habits/Goals/Missions/Friends/Ranking، responsive mobile/desktop؛ بدون بازنویسی Task/XP/Firebase.
3. **Pass 5C — Language fidelity (P0/P1):** چهار بلوک canonical و visual hierarchy مطابق مرجع.
4. **Pass 5D — Ranking/Social fidelity (P1):** podium, lists, requests, activity و public profile؛ حفظ permissions.
5. **Pass 5E — Wellness + Freedom fidelity (P1):** card composition و storytelling بر اساس مرجع، بدون تغییر privacy/data contracts.
6. **Pass 5F — Multi-theme hardening (P1):** Neon/Elara + Minimal + Rugged + Fantasy/Anime با Mode/Accent مستقل، Light/Dark/AMOLED و reduced motion.
7. **Pass 5G — Asset completion/infrastructure (blocked where applicable):** canonical PNGها، logo.png، Storage personal upload، Rules/two-account tests و anti-cheat فقط با Asset/Backend واقعی.

### ۶.۵ ماتریس وضعیت و معیار توقف

- **موجود و باید حفظ شود:** canonical 7-route navigation، Home Pass 3 data wiring، Language four blocks، Leitner، recurrence، XP/Level، Focus، Privacy Center، Wellness، Social permissions، Learning Journal، Water/Sleep، Custom Workout، Cycle Note، shared Profile System، Wardrobe UID scope و central Dialog.
- **موجود ولی نیازمند ممیزی/اصلاح بصری:** Account Drawer، Profile Edit، Public Profile، Wardrobe، Theme selector، Home density، Language presentation، Social/Ranking presentation، Wellness/Freedom presentation، mobile 320–430 و desktop.
- **زیرساخت/Asset هنوز اثبات‌نشده:** canonical avatar/frame/logo PNG loading، personal upload/Storage، deployed Firestore Rules، real two-account validation، server-side wardrobe unlock/anti-cheat و ZIP نهایی.
- هیچ مورد Browser/Firebase/Asset/ZIP با تست static یا contract به‌تنهایی PASS اعلام نشود.
- برای هر Pass، خروجی باید جداگانه «requested / coded / automated-tested / browser-tested / infra-tested / release-ready» گزارش شود.

### ۶.۶ قانون ادامهٔ توسعه از این جلسه

- هر نیازمندی جدیدی که کاربر در ادامه بیان می‌کند ابتدا به رودمپ مرتبط افزوده شود، سپس کدنویسی بر اساس همان رودمپ انجام شود.
- پیش از هر write روی `main`، HEAD واقعی دوباره بررسی شود؛ reset/force-push/revert ناخواسته ممنوع.
- هر مرحلهٔ معنی‌دار با Commit قابل ردیابی روی `main` ثبت شود و گزارش شامل Start HEAD، End HEAD، Commit SHA، Compare، فایل‌های تغییرکرده، تست‌های واقعاً اجراشده و موارد Browser/Firebase/Asset باقی‌مانده باشد.
- اگر GitHub Actions پس از Commit اجرا شد، فقط نتیجهٔ واقعی Run گزارش شود؛ وضعیت pending/in-progress نباید PASS نامیده شود.


### ۶.۷ وضعیت اجرای Pass 5A در همین جلسه

- **کدنویسی‌شده:** لایهٔ `visual-fidelity-pass5.css` پس از Pass 4؛ بازحل تعارض Drawer موبایل به یک side drawer واحد؛ Workspace دو ستونهٔ Account روی دسکتاپ؛ Neon fidelity برای کارت/پروفایل/کمد/Dialog؛ XP progress واقعی در composition مشترک؛ reuse همان composition در Profile Edit؛ نام نمایشی Style پیش‌فرض به «Elara Neon» با حفظ storage key `default`.
- **قرارداد داده دست‌نخورده:** UID wardrobe، avatar-group neutrality، frame/banner unlock، Profile save API، canonical 7-route navigation، Task/XP/Firebase foundations.
- **تست خودکار افزوده:** `tests/pass5-visual-fidelity-contract.test.mjs` و اتصال آن به CI.
- **هنوز Browser PASS نیست:** مقایسهٔ واقعی 320/375/390/430/Desktop، focus/scrim/Escape، Light/Dark/AMOLED و asset fallback باید در مرورگر واقعی بررسی شوند.
- **Asset/Infra همچنان blocked/نااثبات‌شده:** canonical avatar/frame/logo PNGها در `assets/` موجود نیستند؛ Storage، deployed Rules، two-account و anti-cheat wardrobe تأیید نشده‌اند.


### ۶.۸ وضعیت اجرای Pass 5B در همین جلسه

- **کدنویسی‌شده:** اصلاح workspace خالی Account Drawer در حالت desktop با Hub واقعی حساب/تنظیمات؛ Home Neon fidelity با Hero عمیق‌تر، کارت‌های متراکم‌تر، glow کنترل‌شده و Grid واکنش‌گرا.
- **Desktop Home:** در عرض‌های بزرگ، layout دوازده‌ستونهٔ ترکیبی برای Tasks/Habits/Missions/Goals/Ranking/Friends و کارت‌های ثانویه، بدون تغییر data source.
- **Mobile Home:** در عرض‌های عادی گوشی دو ستون برای کارت‌های کوچک و full-width برای Tasks/Habits؛ در <=340px fallback تک‌ستونه برای خوانایی.
- **بدون تغییر منطق:** Focus همچنان داخل کارت Tasks و owner قبلی حفظ شده؛ Task/Habit/Goal/Mission/XP/Firebase و canonical 7-route navigation بازنویسی نشده‌اند.
- **هنوز نیازمند Browser verification:** نسبت واقعی ارتفاع کارت‌ها، scroll، فونت Vazirmatn، 320/375/390/430، desktop و Light/Dark/AMOLED باید با اجرای واقعی مقایسه شوند.


### ۶.۹ وضعیت اجرای Pass 5C در همین جلسه

- **کدنویسی‌شده:** Visual fidelity تب زبان بر اساس مرجع تأییدشده، بدون تغییر چهار بلوک canonical یا ساخت دادهٔ جعلی.
- **Desktop:** Leitner و Language Books در ردیف اصلی با نسبت 5/7؛ Learning Report و Courses در ردیف دوم با همان نسبت و hierarchy تصویری متفاوت.
- **Mobile:** Leitner و Books تمام‌عرض؛ Report/Courses در گوشی‌های معمولی دو ستونه و در <=375px برای خوانایی تک‌ستونه.
- **داده و backend:** Books/Leitner/Journal از منابع فعلی واقعی استفاده می‌کنند؛ Courses بدون backend همچنان «در راه» است.
- **Browser verification باقی‌مانده:** ارتفاع واقعی Book rows، فرم افزودن کتاب، نمودار، Vazirmatn، 320/375/390/430 و Light/Dark/AMOLED.


### ۶.۱۰ وضعیت اجرای Pass 5D — Ranking / Social fidelity

- **کدنویسی‌شده:** سه ردیف بالای رنکینگ واقعی با CSS به podium نئونی تبدیل شدند؛ ادامهٔ جدول، self highlight، Social stats، Friend Requests، Friends و consented Activity hierarchy بازطراحی شدند.
- **بدون دادهٔ جعلی:** Podium فقط از همان `ranking=[self,...state.friends]` و XP واقعی موجود ساخته می‌شود؛ کاربر/online state/global leaderboard ساختگی اضافه نشده است.
- **Privacy حفظ شد:** Public Profile همچنان از shared composition استفاده می‌کند و Task/Habit/Goal/Wellness خصوصی وارد Social/Public Profile نشده‌اند؛ Clubs/Global/Cafe همچنان «در راه» و وابسته به backend واقعی هستند.
- **Responsive:** podium سه‌تایی در موبایل حفظ شده، Social cards در <=430px تک‌ستونه و در desktop چندستونه‌اند؛ narrow guard برای <=340px اضافه شد.
- **تست قرارداد:** Pass 5 contract برای وجود لایهٔ 5D، podium واقعی و responsive Social گسترش یافت.
- **Browser/Firebase هنوز PASS نیست:** ترتیب و ارتفاع واقعی podium، focus، long Persian names، دو حساب واقعی، Rules و activity consent باید در browser/Firebase واقعی بررسی شوند.


## الحاقیهٔ اجرایی ۲۳ سپتامبر ۲۰۲۶ — مخزن و ساختار P0

- **مخزن واحد توسعه و انتشار از این تاریخ:** `Mohadesehjohari/elaraspace`، شاخهٔ `main`. هر اشارهٔ قدیمی به `ArenParsi/elaraspace` در بخش‌های تاریخی این سند فقط سابقهٔ تصمیم‌های گذشته است و مخزن توسعهٔ فعال محسوب نمی‌شود.
- قرارداد اصلی ناوبری هفت‌مقصدی: **ورزش | زبان | تسک‌ها | خانه | رنکینگ | کتابخانه | آزادی**. عادت‌ها، اهداف و Focus قابلیت و route خود را حفظ می‌کنند اما ورودی مستقل ناوبری اصلی ندارند؛ گزارش‌ها از Drawer حساب قابل دسترسی می‌مانند.
- Home در این فاز باید ساختار واقعی DOM/Grid داشته باشد: Hero فشرده؛ Tasks + Focus؛ Habits + Goals؛ Missions + Library؛ Ranking + Friends. ویجت‌های خودکار Water/Sleep فقط در Exercise می‌مانند و عادت شخصی کاربر حذف نمی‌شود.
- Topbar فقط یک کنترل Mode مستقیم دارد؛ زبان رابط فقط در «زبان برنامه» داخل Settings/Drawer مدیریت می‌شود. جستجو باید ورودی واقعی، focus، پاک‌کردن، Enter/Escape و نتایج محلی واقعی داشته باشد.
- Assetهای جدید لوگو/بنر/آیکن این مرحله وارد نمی‌شوند؛ فقط Asset فعلی و fallback تمیز مجاز است.
- Browser visual verification در 1280/1440 و 320/375/390/430، Firebase واقعی و performance timing واقعی شرط اعلام release-ready است؛ تست static یا syntax به‌تنهایی معادل این تأییدها نیست.


## تصمیم نهایی P0 Desktop Sidebar — ۲۳ سپتامبر ۲۰۲۶

- **مخزن فعال:** فقط `Mohadesehjohari/elaraspace` روی `main`.
- Sidebar دسکتاپ حذف نمی‌شود. مالک واحد DOM ناوبری Sidebar و Bottom Nav، `approved-navigation-extension.js` است؛ هیچ Pass بصری دیگری حق حذف یا بازنویسی ردیف‌های Sidebar را ندارد.
- Sidebar اصلی دقیقاً هفت مقصد canonical دارد: **ورزش، زبان، تسک‌ها، خانه، رنکینگ، کتابخانه، آزادی** و active state بر اساس route واقعی همگام می‌شود.
- **گزارش‌ها** route موجود خود را حفظ می‌کند اما مقصد اصلی نیست و در بخش secondary پایین Sidebar با جداکننده نمایش داده می‌شود.
- **عادت‌ها، اهداف، Focus، مأموریت‌ها و دوستان** مقصد مستقل main navigation نیستند؛ دسترسی آن‌ها از Home یا Ranking/Social context حفظ می‌شود و هیچ route یا داده‌ای حذف نمی‌شود.
- Drawer حساب/تنظیمات از Sidebar مستقل است و مقصدهای اصلی را تکرار نمی‌کند. باز کردن Profile/Wardrobe/Dialog از Drawer باید Drawer را در پشت popup باز نگه دارد و با بستن popup کاربر به همان Drawer برگردد.
- Bottom Nav موبایل همان هفت مقصد canonical را نگه می‌دارد و Home active glow حفظ می‌شود.
- ساختار P0 Home rollback نمی‌شود و Water/Sleep به Home برنمی‌گردد؛ این داده‌ها در Exercise/Wellness باقی می‌مانند.
- Browser PASS فقط با اجرای مرورگر واقعی و اسکرین‌شات Desktop 1440، route غیر Home، Mobile 390، Drawer و Drawer+popup قابل اعلام است.


## P0 Production Hosting / cPanel — ۲۳ سپتامبر ۲۰۲۶

- مخزن فعال Production فقط `Mohadesehjohari/elaraspace` روی `main` است؛ workflowهای import یک‌باره از مخزن قدیمی دیگر بخشی از مسیر فعال نیستند.
- Source repository باید خارج Document Root باشد؛ server-only config/state/backups/logs/runtime زیر `$HOME/elara-deploy/` و خارج `public_html` نگهداری می‌شوند.
- `deploy/production-manifest.json` تنها source-of-truth فایل‌های قابل انتشار است. `.git/.github/tests/docs/firestore.rules/README/roadmap/secrets/backups/logs` در Production manifest نیستند.
- Maintenance واقعی server-side با flag و `.htaccess`/HTTP 503 اجرا می‌شود؛ Admin و gateway احراز‌شده برای ادامهٔ deploy مستثنا هستند.
- One-Click Admin باید Firebase ID token را به Backend بفرستد؛ Backend UID و `admins/{uid}` را verify می‌کند و فقط roleهای `owner/admin` مجازند. Moderator اجازهٔ Production Deploy ندارد.
- Update flow: exact main SHA → non-blocking deploy lock → maintenance → staging → manifest validation → backup → atomic file replacement → checksum health check → deployed SHA state → maintenance off. Failure پس از تغییر live باید rollback کند؛ failure rollback maintenance را روشن نگه می‌دارد.
- GitHub repo فعلاً Public است؛ token لازم نیست. credential احتمالی آینده فقط در server-only config خارج Document Root قرار می‌گیرد. Browser هیچ git/shell/cPanel token/secret دریافت نمی‌کند.
- راهنمای نصب رسمی: `docs/CPANEL-PRODUCTION-INSTALL-FA.md`. Commit شدن `firestore.rules` به معنی Publish واقعی Rules نیست؛ Authorized Domain، Auth provider، Rules و دو حساب واقعی باید جدا در Firebase واقعی تست شوند.
- این Pass Visual/Home/Search/Icon redesign جدید ایجاد نمی‌کند. بدون تست واقعی cPanel و Firebase، وضعیت `deployed-to-production` و `release-ready` باید NO بماند.
