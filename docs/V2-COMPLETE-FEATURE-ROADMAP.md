# Elara Space V2 — بک‌لاگ جامع قابلیت‌ها و مقایسه با `main`

**تاریخ ممیزی:** ۲۱ سپتامبر ۲۰۲۶  
**منبع نیازمندی:** تصاویر مرجع تأییدشده + همهٔ ایده‌ها و تغییرات مطرح‌شده در گفت‌وگوی برنامه‌ریزی تا این تاریخ.  
**هدف این سند:** هر قابلیت باید یکی از وضعیت‌های «موجود»، «نیمه‌کاره»، «درخواست‌شده»، «نیازمند بک‌اند/امنیت» یا «فاز بعد» داشته باشد؛ وجود یک تب یا ماکاپ به معنی اجرای واقعی نیست.

## راهنمای وضعیت
- ✅ **موجود در کد**: قابلیت پایه در `main` دیده می‌شود؛ ممکن است هنوز E2E واقعی لازم داشته باشد.
- 🟡 **نیمه‌کاره**: بخشی موجود است ولی با نیازمندی نهایی فاصله دارد.
- ⬜ **درخواست‌شده / پیاده‌سازی نشده**
- 🔒 **نیازمند منطق معتبر سمت سرور / امنیت**
- 🧪 **نیازمند تست واقعی Firebase/مرورگر/چند حساب**
- 🚀 **فاز بعد / وابسته به سرویس خارجی یا تصمیم محصول**

---

## ۱) وضعیت فعلی که در `main` وجود دارد

- ✅ تسک: ساخت/ویرایش/حذف/تکمیل، اولویت، تاریخ، ساعت، پوشه، برچسب، جست‌وجو و فیلتر.
- ✅ عادت پایه: ساخت و چک‌این روزانه.
- ✅ هدف پایه و قدم‌ها.
- ✅ کتابخانهٔ پایه با قفسه‌های «برای مطالعه / در حال مطالعه / خوانده‌شده»، تغییر قفسه و حذف.
- ✅ لایتنر/لغت پایه با افزودن واژه و مرور فاصله‌دار.
- ✅ تمرکز پایه با تایمر ثابت ۲۵ دقیقه.
- ✅ مأموریت‌های پایه و Level 1..10 بر اساس XP.
- ✅ چند نشان سادهٔ فعلی: «اولین تسک»، «ده تسک»، «ده لغت»، «سطح پنجم»، «سطح دهم».
- ✅ ۱۰ لقب فعلی در کد: **جوینده، آغازگر، رهرو، کاوشگر، پیشرو، پرتلاش، سازنده، معمار عادت، قهرمان سحر، فرمانده تمرکز**.
- ✅ Light / Dark / System و هشت رنگ قالب.
- 🟡 فارسی / English / Türkçe برای ناوبری و بخش‌های جدید؛ ترجمهٔ همهٔ متن‌های قدیمی و پویا کامل نیست.
- ✅ Firebase Email/Password، نام کاربری یکتا، تفکیک دادهٔ حساب، درخواست/پذیرش/رد دوستی.
- 🟡 تأیید ایمیل فعلی با **لینک** است؛ OTP عددی در کد نیست.
- 🟡 رنکینگ فعلی فقط میان خود کاربر و دوستان پذیرفته‌شده و بر اساس XP کلاینتی است؛ ضدتقلب/جهانی/فصلی نیست.
- ✅ اشتراک خلاصهٔ فعالیت Task/Habit با رضایت کاربر.
- 🟡 «آزادی» فقط Placeholder است؛ Gemini متصل نیست.
- 🧪 حساب‌ها، Rules و سناریوی دو حساب مستقل هنوز باید روی Firebase واقعی E2E تست شوند.

---

# ۲) ثبت‌نام، ورود، امنیت و پروفایل

### ثبت‌نام و Login
- ✅ ایمیل + رمز عبور.
- ✅ تکرار رمز در ثبت‌نام.
- ✅ Username یکتا و انگلیسی.
- ✅ Display Name.
- 🟡 پیام بررسی Spam پس از ارسال ایمیل وجود دارد؛ در تمام جریان‌های ایمیل یکسان‌سازی شود.
- ⬜ تاریخ تولد با Date Picker.
- ⬜ انتخاب جنسیت/نیازهای سلامت در Onboarding؛ نمایش Cycle Tracker فقط بر اساس انتخاب کاربر و قابل فعال/غیرفعال شدن در Settings.
- ⬜ OTP عددی ایمیل، اگر تصمیم نهایی همین باشد؛ اکنون لینک تأیید استفاده می‌شود.
- 🟡 بازیابی رمز با ایمیل موجود است؛ صفحهٔ Security کامل و تأیید مجدد هویت لازم است.
- ⬜ انیمیشن ورود لوگوی کهکشانی/سه‌بعدی + صدای ماجراجویانه با گزینهٔ Skip/Mute و Reduce Motion.
- 🟡 جداسازی دادهٔ حساب پیاده شده؛ تست دو حساب/تعویض حساب/refresh/دو دستگاه ضروری است.

### پروفایل
- 🟡 صفحهٔ Profile Self/Public و نمایش Name/Username/Bio/Level/XP/Title کدنویسی پایه شده؛ Rank، Medals، Achievements، Streak، Wins، Clubs، Forest و Activity profile هنوز باقی‌اند.
- 🟡 تغییر Name / Bio / Username با رزرو اتمیک Username در کد/Rules اضافه شده؛ Rate limit/history و تست هم‌زمانی واقعی هنوز لازم است.
- ⬜ Security Center: تغییر رمز با تأیید ایمیل، نشست‌ها، خروج از همهٔ دستگاه‌ها.
- ⬜ Privacy Center برای تعیین Public / Friends / Only me به تفکیک هر داده.
- ⬜ پروفایل مربعی مطابق نسبت فایل‌های Frame/Avatar طراحی شود.

### آواتار و فریم
- ⬜ Level 1-2: فقط آواتارهای آماده.
- ⬜ **از Level 3: بازشدن آپلود عکس پروفایل شخصی**.
- ⬜ Crop / Zoom / Reposition / Delete personal photo.
- ⬜ Avatarهای انسانی، حیوانی، فانتزی، انیمه‌ای/فانتزی با سبک سازگار برند.
- ⬜ Frameهای Bronze / Silver / Gold / Legendary + Event/Level/Achievement.
- ⬜ Preview و Locked state + شرط Unlock.
- 🔒 Unlockها سمت سرور اعتبارسنجی شوند؛ فقط مخفی‌کردن UI کافی نیست.

---

# ۳) Level، XP، Titles، Medals، Streak و RPG

### Level
- ✅ ۱۰ Level وجود دارد.
- 🟡 فرمول فعلی صرفاً XP است.
- ⬜ Levelهای بالاتر سخت‌تر و دارای قواعد قابل تنظیم شوند: XP + Mission + Focus + Habit + Reading + Streak در صورت نیاز.
- ⬜ Level 6 شرط ساخت Club/باشگاه باشد.
- ⬜ Unlockها: Avatar، Upload photo در Level 3، Frame، Banner، Theme، Cosmetic، Club creation و قابلیت‌های دیگر.
- 🔒 XP و Level برای رقابت رسمی باید سروری و ضدتقلب شوند.

### Titles
- ✅ عنوان‌های فعلی کد: جوینده، آغازگر، رهرو، کاوشگر، پیشرو، پرتلاش، سازنده، معمار عادت، قهرمان سحر، فرمانده تمرکز.
- ⬜ کاربر بتواند از میان Titleهای Unlockشده یکی را برای نمایش انتخاب کند.
- ⬜ Achievement Titleهای مستقل مانند «ذهن آرام»، «کتاب‌گرد»، «جنگل‌بان»، «باشگاه‌دار»، «قهرمان باشگاه»، «چندزبانه»، «آهنین‌اراده».

### Medals/Achievements
- 🟡 چند Badge ساده وجود دارد؛ سیستم Medal حرفه‌ای هنوز نیست.
- ⬜ دسته‌ها: Focus، Streak، Habit، Reading، Language، Fitness، Goals، Missions، Social، Club، Special.
- ⬜ Rarity: Common / Rare / Epic / Legendary.
- ⬜ Medal Showcase در پروفایل و Favorite medals.

### Streak
- ⬜ Streak کلی شبیه Duolingo با Animation آتش و پاداش.
- ⬜ ۳ عدد Streak Freeze در ماه؛ مصرف و تاریخچه.
- ⬜ Streak مستقل Language / Fitness / Reading / Focus / Habits.
- ⬜ Milestoneها و Calendar streak.
- 🔒 افزایش Streak در بخش‌های رقابتی فقط با Activity معتبر.

---

# ۴) تم، ظاهر، Hero و چندزبانه

### Theme
- ✅ Light / Dark / System.
- ✅ هشت رنگ قالب.
- 🟡 «مشکی» فعلی بیشتر رنگ Accent است؛ **Pure Black/AMOLED Theme مستقل** لازم است.
- ⬜ **Style Familyهای واقعی و محسوس:** Default/Elara فعلی (با Accent قابل تغییر)، Minimal ظریف، Dark/Rugged گنگ و خشن، Anime/Fantasy؛ هرکدام Design Token، تایپوگرافی، Card geometry، background/graphics، icon/motion متفاوت داشته باشند، نه صرفاً تغییر Accent. سپس Forest/Love/Space/Study/Animal/Seasonal/Custom در فازهای بعد. Pure Black/AMOLED مستقل و Default بازگشت‌پذیر الزامی است.
- ⬜ همهٔ Chart/Progress/Graphها باید از Design Tokens مرکزی Theme استفاده کنند؛ با تغییر Theme رنگ قبلی در Habit chart باقی نماند.
- ⬜ Preview، Favorite، Admin enable/disable، Theme unlock بر اساس Level/Achievement.

### Hero/Banner
- 🟡 Hero ثابت موجود است.
- ⬜ گالری Banner قابل انتخاب.
- ⬜ Locked Banner بر اساس Level/Achievement/Event.
- ⬜ Desktop/Mobile assets جدا در صورت نیاز.
- ⬜ Admin Upload/Disable/Reorder/Default.

### Localization
- 🟡 FA/EN/TR جزئی.
- ⬜ **با تغییر زبان تمام UI بدون استثنا عوض شود**: فرم‌ها، Validation، Errorهای Firebase، Quotes، Motivation، Empty state، Toast، Modal، Notifications، Missions، Dates، Numbers، Dashboard، Auth و Settings.
- ⬜ RTL/LTR کامل، locale date/number، فونت مناسب.
- ⬜ هیچ متن hard-coded خارج از i18n باقی نماند.

---

# ۵) Tasks، Calendar، Search و Dashboard

### Tasks
- ✅ CRUD و Search پایه.
- ⬜ Recurrence، Subtasks، Notes، Reminder، Goal linking، Archive.
- ⬜ Task جدید به‌طور پیش‌فرض روی **امروز** قرار بگیرد؛ فقط با انتخاب دستی تاریخ دیگر تغییر کند.

### Calendar
- ⬜ Day / Week / Month.
- ⬜ دکمهٔ «امروز» که مستقیم به تاریخ فعلی برگردد.
- ⬜ یکپارچه با Task / Habit / Goal / Workout / Study / Focus / Event.
- ⬜ Drag & Drop در دسکتاپ در فاز مناسب.

### Global Search
- ⬜ جست‌وجوی سراسری Task، Habit، Goal، Book، Word، Movie، Friend، User، Note، Course، Exercise، Settings، Mission.
- ⬜ Command Palette با Ctrl+K / Cmd+K.

### Dashboard personalization
- ⬜ Widgetها قابل Hide/Show و در فاز بعد Drag & Drop.
- ⬜ Shop card در Dashboard.
- ⬜ Wallet/Elara Coin card در صورت فعال‌سازی اقتصاد داخلی.

---

# ۶) کتابخانه و Reading

- ✅ سه Shelf پایه و حذف/تغییر Shelf.
- ⬜ Edit Book.
- ⬜ ورود تعداد صفحات دستی.
- ⬜ **Online Book Search** جدا از **Manual Add**.
- ⬜ Manual Add: Title، Author، Pages، Cover، Category، Notes.
- ⬜ Book detail menu با Reading Report.
- ⬜ گزارش: «امروز N صفحه خواندم»؛ عدد کاملاً دستی، نه محدود به ۵ صفحه.
- ⬜ Progress bar بر اساس صفحات واقعی.
- ⬜ انتقال خودکار/با تأیید به Read پس از تکمیل صفحات.
- ⬜ Reading history / chart / streak.
- ⬜ Upload کتاب شخصی PDF/ePub در صورت تصمیم محصول و ذخیرهٔ خصوصی.
- 🚀 Goodreads import/sync فقط با API/روش رسمی قابل اتکا.

### اعتبارسنجی گزارش مطالعه برای رقابت
- ⬜ حالت **Casual**: گزارش آزاد و بدون بازجویی.
- ⬜ حالت **Verified Challenge**: کاربر بازهٔ صفحات + توضیح کوتاه «چه خواندم/چه فهمیدم» ثبت کند.
- ⬜ AI بتواند یک یا چند سؤال درک مطلب متناسب با اطلاعات ثبت‌شده بپرسد.
- ⬜ پاسخ AI به‌تنهایی «اثبات قطعی خواندن» محسوب نشود؛ فقط **Verification Confidence / Verified points** ایجاد کند.
- ⬜ در صورت دسترسی قانونی به متن کتاب/فایل خصوصی کاربر، سؤال از همان صفحات تولید شود؛ در غیر این صورت AI نباید جزئیات کتاب را جعل کند.
- ⬜ Random spot-check برای Challengeهای رقابتی، محدودیت دفعات، جلوگیری از ایجاد مزاحمت در مطالعهٔ عادی.
- 🔒 امتیاز رقابتی بر اساس Event سروری و نتیجهٔ Verification ثبت شود.

---

# ۷) Language Learning

- ✅ لایتنر پایه.
- 🟡 List واژه وجود دارد ولی UX کامل «همهٔ کلمات»، Edit/Delete/Search پیشرفته نیاز به تکمیل دارد.
- ⬜ صفحهٔ جدا «همه کلمات» با Search / Edit / Delete / Favorite / Status.
- ⬜ معنی، Example، Notes، Learned/Learning.
- ⬜ کتاب زبان از همان Reading Report عمومی استفاده کند؛ ورود هر تعداد صفحه به‌صورت دستی.
- ⬜ Online Course / Class: Session count، «یک جلسه دیده شد»، Progress، Notes، Completion.
- ⬜ Language streak مستقل.
- 🚀 Duolingo فقط اگر روش رسمی/پایدار برای دادهٔ موردنیاز وجود داشته باشد؛ در غیر این صورت بخش حذف شود و دادهٔ ساختگی نمایش داده نشود.

---

# ۸) Fitness، Water و Health

### Fitness onboarding
- ⬜ بار اول: سابقه ورزشی، قد، وزن، هدف وزنی، سطح فعالیت، ورزش‌ها، روزهای آزاد، زمان روزانه، خانه/باشگاه، تجهیزات و داشتن/نداشتن برنامه.
- ⬜ اگر برنامه ندارد، ساخت Plan بر اساس پاسخ‌ها با امکان ویرایش.
- ⬜ وزن قابل تغییر + Goal Weight + Progress chart.
- ⬜ BMI استاندارد و توضیح محدودیت‌های آن با زبان علمی و خنثی.

### Workout log
- ⬜ دکمهٔ + با فهرست ورزش‌ها.
- ⬜ ثبت نوع، زمان انجام، مدت، Sets، Reps، Weight، Distance، Intensity، Notes.
- ⬜ تفکیک تمرین عضله‌ای و Activity عمومی.
- ⬜ برآورد کالری بر اساس نوع/مدت/وزن/شدت با برچسب **تخمینی**.
- ⬜ Fitness report و Streak مستقل.
- ⬜ Ranking ورزشی بر اساس Consistency/Completion، نه وزن بدن یا کالری خام.

### Water
- 🟡 آیکون/نمایش آب در Dashboard وجود دارد، Tracker واقعی کامل نیست.
- ⬜ Quick add: «یک لیوان»، «یک قمقمه»، Custom ml.
- ⬜ اندازهٔ لیوان/قمقمه قابل تنظیم.
- ⬜ Bottle visualization، Goal، History، Reminder، Streak.

### Cycle tracker
- ⬜ Period Calendar شبیه Cycle Tracker حرفه‌ای: Start/End، Cycle length، Flow، Symptoms، Mood، Cramps، Notes، History، Reminder و Prediction با برچسب تخمینی.
- ⬜ فعال/غیرفعال شدن از Settings؛ فقط به جنسیت ثبت‌نام وابسته نباشد.
- ⬜ Partner sharing اختیاری و Permission جدا: وضعیت/تاریخ تقریبی/اعلان؛ Notes و دادهٔ حساس پیش‌فرض خصوصی.
- 🔒 دسترسی سلامت از Profile عمومی و Friends جدا و کمینه باشد.

---

# ۹) Focus، Pomodoro، جنگل شخصی، Meditation و Audio

### Focus
- ✅ تایمر ۲۵ دقیقه‌ای.
- ⬜ Custom duration + Presetهای 15/25/30/45/50/60 و Custom.
- ⬜ Tag هر Session: Study، Work، Language، Reading، Project، Custom.
- ⬜ Pause/Resume/Cancel/Complete و History/Stats/Streak.
- ⬜ Pomodoro break settings.

### جنگل شخصی
- ⬜ داخل خود بخش Pomodoro یک **Personal Forest** ذخیره شود.
- ⬜ نمایش ساده و زیبا؛ نیاز به نمایش مرحله‌ای «بذر → جوانه» در UI نیست.
- ⬜ Session موفق = گل/درخت کامل در جنگل.
- ⬜ Session نیمه‌کاره/لغوشده = گیاه پژمرده و **در جنگل باقی بماند**.
- ⬜ هر گیاه: Date، Duration، Tag، Complete/Abandoned، XP.
- ⬜ Daily / Weekly / Monthly / All time.
- ⬜ Species unlock بر اساس Level/Achievement.

### Meditation / Calm
- ⬜ Guided/Unguided Meditation، Deep Breathing، Box breathing، 4-7-8، Relaxation، Sleep.
- ⬜ Music/Nature sounds: Rain، Forest، Ocean، Fireplace، White/Brown noise، Piano، Ambient.
- ⬜ Player: play/pause/loop/volume/favorite/playlist/remember last sound.
- ⬜ Admin Audio Upload با Metadata/Category/Cover و محدودیت فرمت/حجم/مجوز نشر.
- ⬜ مینی‌گیم آرامش با شخصیت فانتزی/غیرواقعی و واکنش کارتونی در صورت تأیید طراحی؛ به‌عنوان سرگرمی، نه درمان.

---

# ۱۰) Wellbeing، Journal، Entertainment و Movies

- ⬜ «امروز برای حال خوبم چه کردم؟» با Mood، Note، Emoji، Image و دسته‌بندی Self-care/Walk/Music/Game/Friends/Nature/Art.
- ⬜ Journal / درد دل / تخلیه ذهنی Private by default.
- ⬜ Affirmations / حرف خوب به خود / Intentions / Visualization؛ بدون وعدهٔ تحقق قطعی.
- ⬜ Movies: Want to watch / Watching / Watched / Favorite / Dropped + Edit/Delete/Rating/Note/Date/Cover.
- ⬜ Experiences: Wishlist / Done / Date / Note / Mood / Photo.
- 🚀 Brain games در فاز بعد.
- 🚀 Mood & Wellbeing program در آینده؛ بدون ادعای «درمان افسردگی».

---

# ۱۱) Friends، روابط، Profile social، Post و Chat

### Friends
- ✅ Search username + request + accept/reject.
- ⬜ Remove friend، cancel request، block/report، mutual friends، privacy.
- ⬜ Profile دوستان و Activity timeline معتبر.

### Relationship circle
- ⬜ نوع رابطه: Partner (حداکثر ۱)، Companion، Best Friend محدود، Family چندنفره، Friend.
- ⬜ Relationship request دوطرفه و قابل لغو.
- ⬜ لقب اجتماعی برای دوست در کنار نام اصلی نمایش داده شود و نام اصلی هرگز جایگزین نشود؛ **nickname خصوصیِ فقط برای خود کاربر مدنظر نیست**. برای لقب عمومی/اشتراکی Moderation، Report و قواعد سوءاستفاده لازم است.
- ⬜ نمایش بصری Relationship Circle با Privacy.
- ⬜ Partner بودن خودکار هیچ مجوزی برای دادهٔ سلامت ایجاد نکند.

### Posts/Feed
- ⬜ Text/Image/Achievement/Level/Forest/Book/Goal share، Edit/Delete، Like/Comment و Privacy.

### Chat
- ⬜ Direct Message، Group Chat.
- 🚀 Global Chat فقط با Block/Report/Mute/Rate-limit/Moderation.
- ⬜ Social links: Instagram / YouTube / Discord / Telegram؛ URLها از Admin قابل تنظیم و فعلاً قابل خالی بودن.

---

# ۱۲) Challenge مستقیم بین کاربران و ضدتقلب

- ⬜ «دعوت به چالش» از Profile/Friends.
- ⬜ انتخاب Goal و نوع Challenge: Tasks، Pages، Focus minutes/Pomodoros، Language sessions، Workout sessions، Habits، Mission یا metric معتبر.
- ⬜ **اولین نفر که به هدف برسد برنده است**.
- ⬜ Deadline + Draw/No winner.
- ⬜ Live progress.
- ⬜ Challenge History در پروفایل.
- ⬜ آمار Wins / Losses / Draws / Win rate / Win streak.
- ⬜ Rematch و در فاز بعد Best-of-3/Group challenge.
- ⬜ Quick Chat آماده و کنترل‌شده برای کل‌کل دوستانه: «شروع کنیم»، «منتظرتم»، «می‌بینمت خط پایان»، «ریمچ؟»، «تبریک بردی» و مشابه؛ پیام‌ها در Message Center کاربر نیز ثبت شوند؛ Mute/Rate-limit/Block/Report و جلوگیری از توهین/تهدید.
- ⬜ درخواست Challenge از زمان معتبر سرور **۳۰ ثانیه** فرصت Accept داشته باشد؛ بعد expiresAt منقضی و Accept سمت سرور رد شود. Client countdown فقط نمایش است و مرجع امنیتی نیست.
- ⬜ Unlock شدن بعضی Quick Chatها با Rank/Achievement.
- 🔒 نتیجه Challenge فقط از Activity معتبر سمت سرور محاسبه شود؛ کاربر نتیجه را دستی تغییر ندهد.

### Verified reports برای رقابت
- ⬜ هر Activity رقابتی سطح اعتماد داشته باشد: `self_reported`، `app_tracked`، `ai_checked`، `integrated`.
- ⬜ Reading: شرح صفحات + سؤال درک مطلب AI در Challengeهای Verified.
- ⬜ Workout: نوع/مدت/جزئیات + تایمر داخل اپ؛ در آینده integration با Health/fitness services در صورت امکان.
- ⬜ Focus: فقط تایمر خود Elara برای Challenge معتبر.
- ⬜ Verification نباید ادعا کند ۱۰۰٪ تقلب را تشخیص می‌دهد؛ فقط امتیاز/اعتماد را بهتر کند.
- ⬜ Casual challenge قابل تنظیم باشد تا دوستان اگر خواستند بدون Verification سخت‌گیرانه رقابت کنند.

---

# ۱۳) Club / Clan / باشگاه

### ساخت و عضویت
- ⬜ تب «باشگاه‌ها» داخل Friends/Social.
- ⬜ فقط **Level 6+** بتواند Club بسازد.
- ⬜ یک Owner؛ حداکثر **۲ Assistant**؛ Member.
- ⬜ Dashboard Owner / Assistant / Member متفاوت.
- ⬜ دسته‌ها: Reading، Fitness، Language، Focus، Habits، Meditation/Calm، Study و در صورت نیاز General.
- ⬜ Public / Request to Join / Invite Only.
- ⬜ Avatar، Banner، Bio، Rules، Language، Member limit، Invite، Leave، Transfer ownership، Kick/Ban/Report، Activity log.

### محتوای کنترل‌شده بر اساس نوع Club
- ⬜ Owner/Assistant به‌جای چت آزاد مدیریتی، Structured post بسازند: Mission، Challenge، Poll، Reminder، Result، Congratulations، Notice.
- ⬜ Mission/Challenge فقط در Scope همان Club؛ Book Club مأموریت ورزشی نسازد.
- ⬜ Admin سایت Templateهای Mission/Challenge قابل انتخاب تعریف کند.

### Book Club
- ⬜ Poll برای انتخاب کتاب بعدی.
- ⬜ کتاب برنده پس از پایان Poll به‌صورت خودکار Current Club Book شود.
- ⬜ پیشنهاد تقسیم صفحات/Deadline و Missionهای روزانه با تأیید Owner.
- ⬜ Reading Report و Challenge بر اساس همان کتاب.

### Challenge و Report
- ⬜ Daily / Weekly / Monthly Challenge؛ Individual یا Cooperative.
- ⬜ گزارش پایان روز خودکار از Activity معتبر اعضا.
- ⬜ Daily / Weekly / Monthly / All-time Club internal ranking.
- ⬜ پایان Challenge: Lock، محاسبهٔ نتیجه، Reward، Result card و پیام تبریک خودکار + پیام قالبی Owner.

### Rest Day
- ⬜ هر کاربر هفته‌ای یک «روز آزاد من» را **از قبل** انتخاب کند.
- ⬜ در آن روز Mission اجباری/جریمه نداشته باشد و Streakهای واجد شرایط حفظ شوند؛ Ranking Point رایگان نگیرد و ممکن است از بقیه عقب بماند.

### Club Level
- ⬜ Club XP و Club Level مستقل از Rank فصل.
- ⬜ Unlockهای Club: Banner/Frame/Member capacity/Theme/Challenge slots و ابزارهای مدیریتی.

---

# ۱۴) Ranking شخصی، تخصصی، Club و Season

### Personal
- 🟡 Friends XP ranking پایه موجود.
- ⬜ Global / Friends؛ Daily / Weekly / Monthly / Season / All time.
- ⬜ Category ranking: Language، Fitness، Study، Reading، Focus، Habits؛ Finance در آینده.
- ⬜ Rank رقابتی مستقل از Level، مثلاً Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster → Elara Legend با Divisionها.
- ⬜ Level دائمی؛ Rank فصلی بالا/پایین برود.

### Club Ranking
- ⬜ Club Points (CP) جدا از XP شخصی.
- ⬜ رتبه کلن‌ها بر اساس امتیاز معتبر اعضا.
- ⬜ Global club ranking + Category ranking (Book/Fitness/Language/Focus/...).
- ⬜ Today / Weekly / Monthly / Season / All time.
- ⬜ Total Power (مجموع امتیاز اعضا) + شاخص Performance برای مقایسهٔ عادلانه‌تر کلن‌های کوچک‌تر.
- ⬜ Season snapshot و تاریخچهٔ افتخارات.
- ⬜ Hall of Fame باشگاه.

### Reward کلن‌های برتر
- ⬜ رتبه ۱/۲/۳، Top 10 و رده‌های مناسب Reward جدا.
- ⬜ Reward برای Club: Trophy، Club XP، Frame، Banner، Badge.
- ⬜ Reward اعضای فعال: XP/Cosmetic/Medal/Title با حداقل مدت عضویت و حداقل Contribution.
- ⬜ Reward Owner مستقل، مثل Title/Frame/Founder trophy.
- ⬜ Reward Assistantها کوچک‌تر از Owner.
- 🔒 Owner/Admin باشگاه نتواند CP یا نتیجه را دستی دستکاری کند.

---

# ۱۵) Elara Coin، Shop، Character و اقتصاد داخلی

### اصل معماری
- ⬜ **XP** = پیشرفت دائمی.
- ⬜ **Elara Coin (EC)** = پول داخلی و غیرقابل برداشت در نسخه اصلی.
- ⬜ **Rank Point** = رقابت فصلی.
- ⬜ **Club Point** = رقابت باشگاه.
- ⬜ این چهار مقدار مستقل باشند.

### Shop
- ⬜ Shop card در Dashboard و صفحهٔ مستقل فروشگاه.
- ⬜ Category: لباس، شلوار/ست، کفش، Hair، Accessory، Effect/Aura، Avatar، Frame، Banner، Theme، Forest item، Pet، Club cosmetics.
- ⬜ Rarity و Locked conditions.
- ⬜ Wallet + History درآمد/خرج.
- ⬜ Reward از Mission/Challenge/Streak/Level/Event/Club.
- ⬜ Coin Sink و محدودیت Reward برای جلوگیری از تورم.

### Character Builder
- ⬜ کاراکتر مستقل از عکس Profile.
- ⬜ Wardrobe: Owned / Locked / Favorites / Recent / Saved outfits.
- ⬜ Slotهای Hair / Top / Bottom / Shoes / Accessory / Effect.
- ⬜ نمایش در Profile، Challenge، Ranking و Club در صورت انتخاب کاربر.
- ⬜ Pet system و Cosmetic در فاز مناسب.

### Admin Shop
- ⬜ **داشبورد مدیریت فروشگاه** برای Upload/Create/Edit/Disable/Reorder آیتم.
- ⬜ Price، Rarity، Unlock condition، Level، Category، Asset، Preview، Availability/Event window.
- ⬜ Economy dashboard: Coin minted/spent، sink/source balance و رفتار غیرعادی.

### Saver ranking
- ⬜ Ranking بهتر است بر اساس EC earned در Season/Lifetime یا Saver Score باشد، نه صرفاً Balance؛ خرید از Shop نباید بازیکن را مجازات کند.

### ارز دیجیتال واقعی
- 🚀 اگر روزی Token واقعی ELARA ساخته شود، پروژه‌ای جدا از EC داخلی باشد.
- 🚀 نیازمند حقوق/مقررات، کیف پول، امنیت، KYC/AML حسب حوزه، قرارداد هوشمند و Tokenomics شفاف.
- 🚀 هیچ تضمین «قیمت پایین نمی‌آید» یا سازوکار دستکاری قیمت در محصول تعریف نشود؛ عرضه/vesting/utility شفاف و ریسک بازار صریح باشد.
- 🚀 موجودی مالی واقعی کاربران در Ranking عمومی نمایش داده نشود.

---

# ۱۶) «آزادی» و Gemini

- 🟡 تب «آزادی» موجود ولی AI واقعی متصل نیست.
- ⬜ Gemini از **بک‌اند امن** فراخوانی شود؛ هیچ API key در Frontend/GitHub/Firestore عمومی نباشد.
- ⬜ چند API Key با Alias، enabled، priority، health، quota، last use، rotation.
- ⬜ Load balancing / failover فقط برای خطاهای retryable، backoff، rate limit، user quota، cost guard و circuit breaker.
- ⬜ Admin بتواند Provider/Model واقعی را با شناسهٔ معتبر انتخاب و Default/Fallback تعیین کند.
- ⬜ نام نمایشی دستیار/مدل در UI مستقل از شناسهٔ فنی باشد؛ برند UI می‌تواند **Elara** باشد.
- ⬜ Prompt/System policy چندزبانه و مقاوم در برابر افشای Secret/System prompt.
- ⬜ کلید، Secret، Prompt خصوصی و جزئیات امنیتی افشا نشود.
- ⬜ **اما در پاسخ به سؤال مستقیم دربارهٔ فناوری زیربنایی، سیستم نباید ادعای نادرست کند که مدل پایه توسط Elara ساخته شده است.**
- ⬜ AI context با اجازهٔ کاربر: Goals/Habits/Tasks/Schedule/Reading/Learning/Focus؛ داده سلامت Permission جدا.
- ⬜ Delete conversation/data، privacy و retention policy روشن.

### AI برای Verification گزارش
- ⬜ سرویس جدا/قابلیت مستقل با Prompt و Model قابل تنظیم.
- ⬜ خروجی ساختاریافته: confidence، reasons، follow-up question، pass/retry/manual-review؛ **نه حکم قطعی تقلب**.
- ⬜ Question bank / randomization / rate-limit برای جلوگیری از حفظ کردن سؤال.
- ⬜ هزینهٔ AI برای Challengeها سقف داشته باشد؛ همهٔ گزارش‌های عادی مجبور به AI check نباشند.

---

# ۱۷) Admin Dashboard جامع

- ⬜ /admin با Role server-side: owner/admin/moderator/user.
- ⬜ Users، roles، restriction، reports، support، audit log.
- ⬜ Levels، XP rules، Missions، Titles، Medals، Avatars، Frames، Banners، Themes، Unlocks.
- ⬜ Clubs، Club templates، Challenge templates، Club categories و policy.
- ⬜ Shop/Items/Economy/Elara Coin.
- ⬜ Audio/Meditation content.
- ⬜ AI/Gemini keys/models/prompts/limits/usage/cost.
- ⬜ Feature flags، languages، global settings، announcements.
- ⬜ Privacy-preserving analytics؛ Admin به Journal/درددل/سلامت خصوصی به‌صورت پیش‌فرض دسترسی نداشته باشد.
- ⬜ پنل **Site Preview** حرفه‌ای در Admin با نوار جدا برای انتخاب route/device/refresh و مشاهدهٔ ظاهر نسخهٔ سایت، بدون افشای credential ادمین به Preview یا دادن دسترسی خصوصی بیشتر از کاربر عادی.
- ⬜ آمار بازدید واقعی: page view/session/active users/referrer/device در حد نیاز و با retention مشخص؛ IP خام و دادهٔ حساس به‌طور پیش‌فرض ذخیره نشود، Bot/abuse تفکیک و شمارش ساختگی ممنوع.
- ⬜ مدیریت System Message/Announcement از Admin با target/audience، زمان‌بندی، expiry، audit log و ارسال امن سمت سرور؛ کلاینت عادی نتواند پیام سیستمی جعل کند.
- 🔒 Audit log و re-auth برای عملیات حساس.

---

# ۱۸) به‌روزرسانی سایت از راه دور / Git deployment

- ⬜ Admin بتواند Version فعلی و نسخهٔ آماده را ببیند و Deploy را اجرا کند.
- ⬜ Private repo / controlled CI/CD؛ نه اجرای shell دلخواه از مرورگر.
- ⬜ Build در محیط جدا، health check، atomic deploy، rollback، deployment history.
- ⬜ Maintenance mode هنگام مهاجرت ناسازگار یا عملیات ضروری؛ همهٔ کاربران پیام «در حال به‌روزرسانی» ببینند.
- ⬜ Secrets در backend/secret manager و خارج از public web root.
- ⬜ `.git`، backup، logs و config خصوصی هرگز سرو نشوند.
- ⬜ کد Frontend که مرورگر نیاز دارد قابل مشاهده است؛ منطق و Secret حساس باید Backend بماند.

---

# ۱۹) Integrationها

- 🚀 Google Calendar: Connect، import events، سپس sync دوطرفه در صورت طراحی مطمئن.
- 🚀 TickTick: API رسمی؛ ابتدا Import-only اگر Sync دوطرفه قابل اتکا نیست.
- 🚀 Goodreads: Import/Sync shelves با روش رسمی پایدار.
- 🚀 Health/Fitness integration برای Verified workout در صورت امکان و رضایت کاربر.

---

# ۲۰) Responsive، UI، Icons، Help و Accessibility

- 🟡 responsive پایه وجود دارد؛ تست واقعی Desktop/Laptop/Tablet/Mobile و رفع فاصله‌های زیاد لازم است.
- ⬜ Fluid grid و استفادهٔ بهتر از عرض دسکتاپ.
- ⬜ Icon system حرفه‌ای و یکپارچه.
- ⬜ Logo رسمی از assets پروژه کنار نام سایت؛ Light/Dark/Favicon/App icon.
- ⬜ More Drawer/Bottom Sheet برای قابلیت‌های کم‌کاربرد در موبایل؛ Sidebar گروه‌بندی‌شده در Desktop.
- 🟡 ورودی Help در More و صفحهٔ پایه کدنویسی شده؛ محتوای کامل Getting Started، Tasks، Habits، Goals، Focus، XP/Level، Friends، Privacy، FAQ، Support و Shortcuts هنوز باید تکمیل و چندزبانه شود.
- ⬜ Dashboard موبایل به‌صورت محسوس **box/card-based** بازطراحی شود؛ اطلاعات پراکنده به کارت‌های منظم با hierarchy، tap target و spacing مناسب تبدیل شوند و طرح فعلی موبایل مرجع نهایی نیست.
- ⬜ Accessibility: Reduce Motion، Disable sounds، Font size، High contrast، Keyboard nav.
- ⬜ تمام Animation/Soundهای Login/Level/Streak قابلیت خاموش‌شدن داشته باشند.

---

# ۲۱) Message Center، اعلان‌ها و Notification Center

- ⬜ Inbox مستقل «پیام‌ها / پیام سیستم» با read/unread، timestamp، history، deep-link و دسته‌های mission_complete، system/admin، friend، challenge_request/result و challenge_quick_chat.
- ⬜ تکمیل Mission علاوه بر Toast کوتاه ۲–۳ ثانیه‌ای و صدای قابل خاموش‌کردن، رکورد زمان‌دار در Message Center بسازد و مأموریت بعدی را لینک/نمایش دهد.
- ⬜ پیام System/Admin فقط از backend/admin مجاز تولید شود و کلاینت نتواند sender/type سیستمی را جعل کند.
- ⬜ Task/Habit/Focus/Books/Language/Fitness/Friends/Messages/Relationship/Missions/Level/Streak/Gifts/Cycle/Event.
- ⬜ Notification center مستقل با read/unread.
- ⬜ per-category preferences.
- ⬜ محتوای حساس Health روی Lock screen اختیاری و پیش‌فرض محافظه‌کارانه.

---

# ۲۲) گزارش‌ها و Weekly Review

- 🟡 گزارش آماری ساده موجود است.
- ⬜ Activity Timeline شخصی.
- ⬜ Weekly Review: Tasks، Focus، Reading، Exercise، Habits، Streak، XP، Mood.
- ⬜ Personal Bests.
- ⬜ Charts theme-aware و locale-aware.
- ⬜ Export/Backup دادهٔ مناسب و Privacy-preserving.

---

# ۲۳) موارد فاز بعد

- 🚀 Finance: income/expense/budget/saving goals/reports.
- 🚀 Scam analysis AI با نتیجهٔ «ریسک/نشانه‌ها» نه حکم قطعی پلیسی.
- 🚀 Brain games.
- 🚀 Advanced social/global chat بعد از moderation.
- 🚀 Real blockchain token فقط به‌عنوان پروژهٔ جدا و بعد از بررسی حقوقی/اقتصادی.

---

# ۲۴) اولویت اجرایی پیشنهادی

## P0 — قبل از گسترش محصول
1. 🧪 تست واقعی دو حساب Firebase و Security Rules.
2. 🔒 XP/Activity event معتبر سمت سرور برای هر چیزی که وارد Ranking/Challenge می‌شود.
3. i18n کامل و Theme tokenization کامل.
4. Profile/Privacy/Security و حذف/مسدودسازی دوست.
5. Responsive و CI.

## P1 — هستهٔ V2
1. Profile + Level unlock + Upload photo Level 3 + Frames/Banners.
2. Streak/Freeze/Missions/Medals/Rank.
3. Books advanced + Reading report.
4. Focus custom + Tags + Personal Forest + Audio.
5. Fitness/Water + Cycle tracker.
6. Global search + Calendar.
7. Gemini backend + «آزادی» + Admin Gemini.
8. Direct Challenges + Verified reports.

## P2 — Social/Game economy
1. Clubs Level 6 + Assistants + Poll/Missions/Reports.
2. Club Ranking/Season/Rewards.
3. Shop + Elara Coin + Character/Wardrobe.
4. Posts/Chat محدود و moderation.
5. Courses/Language enhancements، Entertainment، Wellbeing.

## P3 — Integrations / future
Google Calendar، TickTick، Goodreads، Health integrations، Finance، Scam AI، Brain Games، real token research.

---

# ۲۵) معیار پذیرش عمومی هر قابلیت

- قابلیت باید واقعاً از دادهٔ حساب جاری استفاده کند؛ هیچ دادهٔ نمونه به حساب واقعی نشت نکند.
- اگر قابلیت رقابتی است، Score/Result سمت سرور اعتبارسنجی شود.
- ترجمهٔ FA/EN/TR و RTL/LTR همزمان با خود قابلیت تکمیل شود.
- Light/Dark/Pure Black و Themeهای فعال بدون رنگ hard-coded شکسته تست شوند.
- Desktop/Mobile و عرض‌های اصلی تست شوند.
- Privacy پیش‌فرض برای Health/Journal/AI محافظه‌کارانه باشد.
- Loading/Error/Empty/Offline state واقعی داشته باشد.
- در Admin، عملیات حساس audit log، role check و re-auth داشته باشند.
- وضعیت «کدنویسی شده»، «E2E تست شده» و «آماده انتشار» جدا ثبت شود.

# ۲۶) Assetهای تأییدشده و گام بعدی

- 📌 قرارداد کامل نام‌گذاری در [PROJECT-ASSETS-CONVENTION.md](PROJECT-ASSETS-CONVENTION.md).
- 📌 آواتارهای Male: `avatars-male-level1.png` تا `avatars-male-level10.png`.
- 📌 آواتارهای Female: `avatars_female_level1.png` تا `avatars_female_level10.png`.
- 📌 Frameها: `frames_bronze.png`، `frames_silver.png`، `frames_gold.png`، `frames_diamond.png`.
- 📌 لوگوی اصلی موردنظر برای ادامهٔ طراحی: `logo.png`.
- 📌 مرجع Rank/Level همان تصویر تأییدشدهٔ کاربر است و نگاشت ۱۰ عنوان فضایی در سند Asset ثبت شده است.
- ⬜ **گام بعدی بعد از تست فعلی:** Preloader/Login animation فضایی-نئونی با `logo.png`، Progress واقعی، Glow/Orbit/Shine/Spark، Mobile و Reduced Motion؛ سپس همسان‌سازی GitHub و ZIP کامل.
- ⛔ در این ثبت فقط مستندسازی انجام شده؛ Loader هنوز ساخته نشده است.


## افزودهٔ اجرایی — Task Details / Dialog / Private Drawer

### Task Details / Dialog / Private Drawer [کدنویسی پایه / نیازمند تست]
- 🟡 Task: Short Description + Long Description + Detail Modal و ویرایش Date/Time/Priority/Folder/Tag/Recurrence.
- 🟡 Folder/Tag inline creation باید Draft فرم Task را بدون ریست حفظ کند.
- 🟡 Dialog System مشترک، وسط صفحه، Theme-aware و بدون browser-native alert/prompt/confirm.
- 🟡 Mission Reward XP در کارت مأموریت نمایش داده و Claim روزانه idempotent ثبت شود.
- 🟡 Private Profile Drawer با سه‌نقطه برای Desktop/Mobile؛ Profile summary، Theme toggle، Account، Privacy/Password reset، Folders/Tags، Notifications, Appearance, Help, Calendar, Logout.
- 🟡 Folder Drawer: نمایش Tasks هر Folder و Add Task داخل همان Folder.
- 🟡 Public Profile به Modal مستطیلی وسط صفحه تبدیل شود؛ Self Profile داخل Drawer/Account flow باشد.
- 🟡 Refresh روی Profile route خالی نشود.
- 🟡 Profile save: Name/Bio مستقل از Username/Privacy ذخیره شود تا Permission یک قابلیت کل فرم را fail نکند؛ Rules جدید برای Username/Privacy باید Publish و با دو UID تست شوند.
