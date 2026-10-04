# Elara Space — Master Product & Engineering Roadmap
**Canonical roadmap — 2026-10-03**

> این فایل از این تاریخ مرجع اصلی تصمیم محصول، اولویت اجرا و وضعیت قابلیت‌هاست.  
> فایل‌های قدیمی `ROADMAP.md`، `PRODUCT-ROADMAP.md`، `V2-COMPLETE-FEATURE-ROADMAP.md` و Addendumها به‌عنوان تاریخچه/جزئیات تخصصی نگه داشته می‌شوند. در هر تعارض، این Master جدیدتر مقدم است.

---

## 0) قرارداد وضعیت و قانون Done

وضعیت‌ها:
- **REQUESTED**: خواسته ثبت شده، هنوز implementation قطعی ندارد.
- **DESIGNED**: مدل داده/UX/Rule مشخص شده.
- **CODED**: کد در repo است، اما شواهد browser/backend کافی نیست.
- **TESTING**: تست محلی/CI در حال اجرا یا ناقص است.
- **VERIFIED**: رفتار لازم روی END HEAD با تست مناسب تأیید شده.
- **BACKEND-GATED**: بدون schema/rules/server/multi-UID قابل Done شدن نیست.
- **LATE / R&D**: عمداً بعد از هستهٔ محصول.

قانون Done:
1. دادهٔ نمونه به حساب واقعی نشت نکند.
2. قابلیت اجتماعی/رقابتی بدون Rules و تست چند UID VERIFIED نیست.
3. قابلیت cross-device بدون cloud/storage واقعی VERIFIED نیست.
4. Economy بدون ledger سروری و idempotency VERIFIED نیست.
5. UI در FA/EN و RTL/LTR، Light/Dark/AMOLED و viewportهای اصلی تست شود.
6. UGC کاربر ترجمه یا بازنویسی نشود.
7. Browser local + Pages public + CI مرتبط باید روی END HEAD سبز باشند.

---

# P0 — Release Integrity / Regression / Backend Contracts
**اولویت مطلق قبل از feature بزرگ جدید**

### P0.1 CI و مرورگر
- Browser Navigation / Reference / P0 / Pages Playwright باید END HEAD را تست کنند.
- production smoke بدون stub برای boot/Firebase حفظ شود.
- تست‌های Mobile: 320/360/375/390/412/430.
- Desktop: 1440/1648/1920.
- screenshot artifact برای visual passهای مهم.

### P0.2 Firebase / Security
- Publish واقعی `firestore.rules` در Firebase Console.
- تست دو UID برای Profile / Friend Request / Friend / Activity / Page / Status / Shared Task / Challenge.
- عدم اتکا به GitHub Pages برای publish Rules.
- Activity privacy دسته‌ای: private / friends / public.
- Period/Cycle همیشه private؛ Companion فقط opt-in صریح و backend contract.

### P0.3 Sync و persistence
- Profile photo، Page avatar/banner، Status media و هر چیزی که روی device دیگر باید دیده شود: **Storage-backed**.
- localStorage فقط cache/local-first؛ canonical cross-device باید cloud-backed باشد.
- conflict strategy بین دو device مشخص شود.
- import/export و migration از localStorage باید account-safe باشد.

---

# P1 — Information Architecture / خلوت‌سازی صفحه‌ها
**هدف: قابلیت زیاد بماند، ولی صفحه‌ها شلوغ نشوند.**

### P1.1 Feature Hub pattern — HIGH PRIORITY
- Home / Library / Wellness / Focus / Friends به Hub تبدیل شوند.
- feature سنگین با card/icon/CTA بزرگ باز شود.
- جزئیات در route/subpage مستقل.
- Back واقعی، hash route پایدار، refresh-safe.

### P1.2 Library Hub
- Book Clips از inline block بلند خارج شود.
- Card/Tile جذاب «بریده‌های کتاب» → `#book-clips`.
- Custom Shelves → subpage/hub.
- Reading Reports → subpage.
- Search/Import Book → popup/subpage.
- Main Library فقط Hero + current books + خلاصه + CTAها.

### P1.3 Wellness Hub
- Water / Sleep / Weight / Exercise / Analysis هرکدام tile مستقل.
- برنامهٔ تمرینی و برنامهٔ تغذیه به‌صورت Note قابل ویرایش/حذف.
- گزارش‌ها کوچک، مینیمال، دارای عدد/scale و overview.
- Report delete با confirmation.
- Wellness روی Home صاحب حساب همیشه دیده شود؛ Privacy فقط انتشار را کنترل کند.

### P1.4 Focus Hub
- Pomodoro عادی: circular/minimal.
- Fullscreen Pomodoro: فقط با فعال‌کردن fullscreen، UI عمودی/تیرهٔ مرجع.
- با پایان Timer به حالت معمول برگردد و Celebration نشان دهد.
- Focus Room و Ambience به route مستقل.
- Break/Session config در popup/subpage.

### P1.5 Friends Hub
Tabs روشن در بالای Friends:
- Private Chats
- Groups
- Friends / Requests
- Activity
- Clubs / Clan
- Status/Stories در صورت فعال‌شدن backend
- Ranking در صفحهٔ Ranking بماند و از Friends جدا باشد.

---

# P2 — Core Personal OS

## P2.1 Tasks
### وضعیت نزدیک‌مدت
- Completed پایین لیست.
- strike-through اختیاری.
- completed one-day tasks → «تسک‌های تیک‌خورده».
- task دیروز که one-day و انجام‌نشده است از Today حذف شود/به overdue semantics برود.
- Checklist shopping-style داخل Task.
- List/Folder مستقل با route.
- Drag/reorder Desktop و touch.
- right-click selection mode Desktop؛ long-press Mobile.
- بعد از انتخاب: Select All / Copy / Move / Delete.
- Edit dialog دارای Delete قرمز.
- Linked Task از Tasks قابل Edit/Delete باشد بدون dead-end.
- «حذف همه» با scope امن و confirmation.

### Task Kebab UX — REQUESTED / HIGH PRIORITY
- همزمان فقط یک منوی سه‌نقطه باز.
- بازکردن جدید → قبلی بسته شود.
- بدون تعامل، حداکثر 3 ثانیه بعد auto-close.
- click outside / Escape / focus-safe.
- popup همیشه topmost و زیر کارت‌های دیگر نرود.

## P2.2 Habits
- alignment متن کنار checkbox مثل Tasks.
- Schedule/Repeat compact؛ checkbox و control کوچک و گوشه‌ای.
- Edit Habit دکمهٔ واضح «ثبت تغییرات».
- reorder با mouse/touch.
- completion notification/mission integration.

## P2.3 Goals / Missions
- Goal artwork مرجع.
- Missions بیشتر، متنوع، صمیمی، emoji-aware.
- completion Mission:
  - haptic اختیاری
  - popup جشن
  - reward
  - mission بعدی
  - notification locale-aware
- idempotent claim و بدون double XP.

## P2.4 Home Streak
- روزهای قبلی با streak: **🔥** نه check.
- دور مربع روز flame/neon ring.
- روز بدون streak neutral.
- current day state جدا.
- Light mode: card روشن + متن تیره؛ artwork/icon رنگ خود را حفظ کند.

## P2.5 Focus / Pomodoro
- مدت Focus قابل انتخاب.
- مدت Break چند گزینه‌ای/Custom.
- تعداد session قبل از شروع.
- auto-start break اختیاری.
- session یک‌تایی بتواند بدون break باشد.
- music/ambience.
- garden/tree/flower visual focus.
- Fullscreen dark vertical reference mode.
- پایان session: celebration و بازگشت از fullscreen.
- Activity friends/global با duration و tag در صورت privacy.

## P2.6 Wellness
- Water به **لیوان** نمایش داده شود، نه فقط ml.
- Sleep / Water / Weight / Exercise.
- Analysis: پیشنهادهای ساده مثل «خواب را بهتر کن»، بر اساس دادهٔ واقعی و بدون تشخیص پزشکی.
- Note برنامه تمرینی.
- Note برنامه تغذیه.
- banner ورزش کمی بلندتر و خواناتر.
- weight artwork.
- raw health data هرگز public نشود.

## P2.7 Language
- UI کامل FA/EN.
- تمام System UI در English mode انگلیسی و LTR.
- Task/Goal/Habit/Book/Note و UGC با زبان اصلی بماند.
- Leitner route مستقل.
- Language review task از Tasks قابل check.
- Book import/cover/pages.
- notifications locale-aware.

## P2.8 Library
- Cover upload + remove.
- Photo/cover persistence.
- Custom Shelves.
- Open Library / Google Books metadata search.
- Goodreads scraping ممنوع.
- Book Clips:
  - text یا image
  - page number
  - privacy
  - delete
  - comment در Page در آینده
- Reading history/edit/delete.
- reading completion → notifications/activity.
- Book clip public → Page بخش Book Clips.

## P2.9 Freedom
- Notes / Ideas / Inspirations / Reflections / Vision Board route مستقل.
- Note subject/first line behavior.
- image upload/remove.
- note detail popup + back stack.
- Dream جدا از Notes.
- quote editable.
- Freedom AI server gateway و admin token/model routing.
- هیچ secret در client.

---

# P3 — Profile / Page / Social

## P3.1 Personal Profile
- Profile photo بزرگ‌تر.
- click avatar → fullscreen viewer.
- Edit profile: Change Photo روی خود avatar.
- Upload photo library:
  - عکس‌های قبلی بمانند
  - دوباره قابل انتخاب
  - delete واقعی
  - orphan cleanup
  - cross-device sync
- Status خالی: هیچ placeholder عمومی «Status» نشان ندهد.
- Wardrobe: Status color.
- Status composer: Theme انتخابی.
- status text/media/expiry/privacy.
- Level Collection جدا از XP Level.

## P3.2 Personal Profile vs Page
این دو identity مستقل‌اند:
- Personal avatar/banner
- Page avatar/banner
- Sidebar Page entry باید **Page avatar** را نشان دهد.
- پروفایل دیگران CTA بولد «رفتن به Page».
- Page sectionها:
  - Book Clips
  - Free Posts
  - Text Posts
  - Blog
  - Stories/Status
- Commentهای واقعی روی content.
- public content خودکار در section متناظر Page ظاهر شود.

## P3.3 Friends
- Search بزرگ و responsive.
- Invite action بزرگ و جای درست.
- Friend request Accept / decline red.
- Online: green neon dot با TTL واقعی.
- Friend Activity box ارتفاع محدود + internal scroll.
- لحن دوستانه/کول + 1–2 emoji.
- Like/Comment backend-backed.
- DM.
- Groups.
- Draft پیام بعد navigation/reload بماند؛ پس از Send پاک شود.
- avatar strip/stories بعد از backend آماده.
- block/report/mute.

## P3.4 Notifications
- وسط صفحه در Mobile.
- locale-aware.
- eventهای واقعی Domain:
  - Task
  - Habit
  - Goal
  - Mission
  - Reading
  - Language
  - Exercise
  - Focus / Deep Work
  - Streak
  - Challenge
- historical UGC ترجمه نشود.
- Telegram-like compact presentation.

## P3.5 Focus Activity / Deep Work
- در Friends Activity:
  - چه کسی چند دقیقه تمرکز کرد
  - Deep Work duration
  - Tag در صورت وجود
  - لحن فان و صمیمی
- اگر public → Global Activity پس از moderation/backend.
- اگر friends → فقط accepted friends.
- private → هیچ انتشار.

---

# P4 — Realtime Collaboration / Challenges

## P4.1 Shared Task
- Task مشترک با یک دوست.
- Invite / Accept / Decline.
- رنگ/Badge متفاوت.
- completion semantics.
- conflict resolution.
- multi-device.
- server-verifiable source.

## P4.2 Friendly Challenge
سه mode ارسال:
1. **Now**: اگر آنلاین است، toast 30s.
2. **When Online**.
3. **Persistent / Inbox**.

Toast challenge:
- Accept
- Decline
- countdown
- «درخواست‌های این فرد را نشان نده»
- timeout → Resend
- Edit before resend
- mute sender backend-backed
- rate limit

Challenge:
- انتخاب Goal.
- race-to-target.
- winner.
- win count در Profile.
- canned messages دوستانه مثل «ریز می‌بینمت 😎🔥».
- history.

## P4.3 Focus Room
- دعوت دوست به Focus Room.
- Avatar اعضا.
- Pomodoro بزرگ.
- synchronized room state.
- stop هر فرد ثبت شود.
- tab change/page close فقط signal باشد، نه حکم قطعی ترک.
- reconnect/TTL.
- پایان مشترک: تبریک به همه.
- Challenge بتواند به Focus Room وصل شود.

## P4.4 Presence
- neon green dot.
- TTL/reconnect.
- privacy.
- block/mute aware.
- visibilitychange به‌تنهایی online/offline قطعی نیست.

---

# P5 — Store / Economy / Cosmetics

## P5.1 Store Hub
دسته‌ها:
- Featured
- Events
- Elite
- Token
- Themes
- Profile Skins
- Frames
- Banners
- Status Cosmetics
- Page Cosmetics
- Owned / Inventory
- Seasonal

## P5.2 Elite
- Elite ماهانه با Token.
- cosmetics مخصوص همان ماه.
- entitlement + expiry.
- restore ownership.
- no pay-to-win XP/Rank advantage.

## P5.3 Seasonal catalog
همهٔ Themeها یکجا نمایش داده نشوند:
- rotation فصلی
- featured
- limited drops
- owned archive

Theme/Profile cosmetic families:
- Colorways
- Lemon/Lime
- Animals
- Masks
- Suit
- Zombie
- Street/Gang
- Mafia
- Mommy/Daddy aesthetic
- Birds
- Technology
- Leather
- Prison
- Doctor
- Engineering
- Scientist
- Marine
- Mermaid
- Princess
- Blogger
- Librarian
- Gaming
- Minecraft-inspired
- Tactical/shooter original themes

> نام/Asset برندهای Call of Duty / PUBG / Valorant / Warzone بدون مجوز وارد catalog production نشود؛ فقط aesthetic original.

## P5.4 Token Economy
- balance سروری.
- ledger.
- idempotent transaction.
- receipt verification.
- payment provider.
- client authoritative ممنوع.
- audit/admin.

## P5.5 Reward cosmetics
- Skin مخصوص Top Rank.
- cosmetics Clubهای برتر.
- cosmetics مدیران/ownerهای برتر.
- eligibility و expiration روشن.
- reward source قابل audit.

---

# P6 — Themes / Cursor / Visual Identity

## P6.1 Cursor Theme — Desktop only
Cursor با Theme تغییر کند:
- Lemon
- Space / Moon / Star
- Minimal
- Blood / Vampire / Halloween
- Ocean
- Snow

قواعد:
- touch device: custom cursor خاموش.
- hotspot درست.
- fallback استاندارد.
- reduced motion/accessibility.
- cursor asset خیلی بزرگ نباشد.

## P6.2 Theme Expansion
- Lemon/Lime
- Vampire/Blood red
- Ocean
- Snow
- Minimal
- Galaxy/Space
- existing dark/light/AMOLED
- color variants

## P6.3 Vampire/Halloween copy
- microcopy ترسناک/فان و locale-aware.
- فقط System UI.
- UGC بازنویسی نشود.

## P6.4 Banner mobile behavior
- متن چند ثانیه اول قابل مشاهده، سپس fade یا کوچک در گوشه.
- long-press/tap reveal.
- متن تصویر را نپوشاند.

---

# P7 — Clubs / Clan / Community

## P7.1 Club creation
- Level 6 minimum.
- Owner.
- تا 2 Assistant.
- Member.

انواع:
- Book Club
- Fitness Club
- Study/Focus
- Language
- generic challenge club

## P7.2 Permissions
Owner:
- assistants
- missions
- polls
- challenge schedules
- rest day
- announcements

Assistant:
- محدود به domain club و permission owner.

Member:
- participation / report / vote.

## P7.3 Club missions / polls / ranking
- daily/weekly/monthly challenges.
- book poll.
- auto-select winner طبق rule.
- daily reports.
- clan ranking.
- member ranking.
- end-of-challenge celebration.
- XP / title / profile cosmetic rewards.
- top club rewards.
- owner rewards.

## P7.4 Rest Day
- یک روز در هفته «هیچ کاری نمی‌کنم».
- rank catch-up جادویی نداشته باشد؛ صرفاً rest semantics شفاف.

---

# P8 — Blog / Learning / AI

## P8.1 Blog
- route مستقل.
- Articles:
  - planning
  - focus
  - habits
  - reading
  - energy
  - productivity
- search.
- article detail.
- Page blog section.

## P8.2 AI Tutor
- داخل Blog/Article.
- server-side gateway.
- rate limit.
- safety.
- provenance.
- هیچ API key در client.
- Admin model/token routing از AI Gateway فعلی.

---

# P9 — Reports / Analytics
- delete report.
- source-safe semantics.
- chartهای کوچک و مینیمال.
- axis/scale/number.
- یک overview قابل فهم در viewport.
- drill-down route.
- weekly/monthly/all-time.
- visual consistency در Light/Dark.
- export/import.
- cloud sync خصوصی.

---

# P10 — Ranking / Levels / Titles

## Ranking
- Ranking و Friends جدا.
- tabs بزرگ: Ranking / Friends / Community / Clubs.
- Top 3 frame بزرگ و align.
- streak flame + count زیر XP.
- public/friends privacy.
- no fake users.

## Levels
- progression عملاً بدون سقف سخت.
- 1–30 آسان‌تر.
- بعد سخت‌تر.
- 80+ elite.
- 100+ legendary.
- curve عددی و تست‌شده.

## Collection Level
- جدا از XP.
- از unlock/collection/shop ownership.
- anti-pay-to-win.

## Medal / Rank / Title registry
- canonical registry.
- unlock condition.
- rarity.
- display priority.
- seasonal/legacy status.

---

# P11 — 3D Avatar / Wardrobe — LATE R&D
- دو body preset قابل شخصی‌سازی.
- 360° rotate.
- hair motion.
- clothing/skins.
- Store integration.
- mobile performance budget.
- WebGL fallback.
- reduced motion.
- asset moderation.
- fallback 2D.

---

# P12 — Future Ideas / Experimental
- Calm interactive mini-game.
- Farm.
- Punch/relief animation با طراحی non-violent/comedic.
- Voice chat با moderation/consent/block/report.
- Brain games.
- health integrations.
- calendar integrations.
- finance/scam tools فقط با safety/legal review.
- blockchain token فقط پروژهٔ جدا و بعد از بررسی حقوقی/اقتصادی.

---

# Cross-cutting A — i18n
- FA RTL.
- EN LTR.
- TR بعداً.
- System UI ترجمه شود.
- UGC ترجمه نشود.
- Notification جدید براساس locale فعلی ساخته شود.
- stored historical UGC بازنویسی نشود.
- theme microcopy locale-aware.

# Cross-cutting B — Accessibility
- keyboard.
- Escape/Back.
- focus trap.
- touch targets.
- reduced motion.
- contrast.
- screen-reader labels.
- custom cursor fallback.
- haptic اختیاری.

# Cross-cutting C — Social Safety / Moderation
برای Page/DM/Group/Story/Global Activity/Club:
- block.
- report.
- rate limit.
- mute.
- privacy.
- retention.
- media limits.
- abuse controls.
- audit برای عملیات حساس.

# Cross-cutting D — Notifications / Event bus
تمام eventها از canonical source:
- Task completion
- Habit
- Goal
- Mission
- Reading
- Language
- Exercise
- Focus
- Streak
- Challenge
- Shared Task
- Club
- Store entitlement

هیچ notification صرفاً تزئینی یا fake ایجاد نشود.

---

# اجرای پیشنهادی از همین HEAD

## Sprint A — Cleanup / UX reliability
1. Library Clips Hub route.
2. Wellness Hub.
3. Focus Hub / fullscreen Pomodoro.
4. Task Kebab exclusive + 3s auto-close.
5. Profile cloud media design.
6. Notification locale audit.
7. Theme/Light final fixes فعلی.

## Sprint B — Page / Friends architecture
1. Friends tabs.
2. DM draft persistence.
3. Page identity separation.
4. Page sections.
5. Profile photo library.
6. Status color/theme.
7. Global/public activity contract.

## Sprint C — Realtime
1. Presence.
2. Shared Task.
3. Challenge delivery modes.
4. live challenge toast.
5. Focus Room.
6. multi-UID E2E.

## Sprint D — Store
1. Store UI catalog بدون پول.
2. Owned inventory.
3. Seasonal rotation.
4. Events.
5. server token ledger.
6. Elite.
7. payment verification.

## Sprint E — Clubs
1. schema/rules.
2. owner/assistant/member.
3. polls.
4. missions.
5. clan ranking.
6. rewards.

## Sprint F — Visual / R&D
1. Cursor themes.
2. Lemon/Vampire/Ocean/Snow.
3. seasonal cosmetics.
4. 3D Avatar prototype.
5. final Theme pass.

---

# Current status snapshot — 2026-10-03
- Language / popup / Settings / Tasks foundations: substantially implemented with browser coverage.
- Freedom: substantially implemented; AI real cPanel token verification remains gated.
- Library Stage 4: shelves/covers/clips/metadata-search implemented in repo; IA cleanup to dedicated Clips route is next.
- Blog route implemented; AI Tutor backend-gated.
- Task bulk/reorder/checklist/lifecycle work exists and is under CI.
- Focus duration/tag activity and Pomodoro session options exist; Focus Room realtime still pending.
- Page/Profile entry work exists; cross-device media sync still pending.
- Store/Economy/Elite: roadmap only.
- Realtime Challenge / Shared Task / Presence: backend-gated roadmap.
- Clubs: roadmap/back-end design stage.
- 3D Avatar: late R&D.

---


# Product extension — 2026-10-04 / Profile, Store, Hubs, Admin & Media

> این بخش جدیدترین تصمیم محصول است و در تعارض مستقیم با بندهای قدیمی دربارهٔ جای Settings، ناوبری موبایل و ساختار Hub مقدم است. قانون Done ابتدای Master همچنان برقرار است. هیچ قابلیت Realtime/Economy/Media فقط با UI، DONE محسوب نمی‌شود.

## X1 — Profile-first Settings / Mobile navigation — HIGH PRIORITY
- **PROFILE-SETTINGS-HUB-04 — REQUESTED / HIGH PRIORITY:** Settings از Sidebar حذف بماند و داخل Profile یک Gear کوچک داشته باشد. Gear در Header نیز مجاز است اما باید همان Profile Settings را باز کند؛ مقصد جدا و تکراری نسازد.
- Profile header: Close و Gear کوچک و بدون پوشاندن Level؛ progress bar در جای ثابت و متن XP زیر آن، سمت راست و خوانا.
- Profile Settings باید شامل Account، Privacy، Blocked accounts، App Language، Calendar، Help، Appearance/Wardrobe و Logout باشد.
- Notifications/Messages از Profile Settings حذف شوند؛ Notification Center همچنان از Bell در Header باز شود.
- Reports در انتهای Profile فقط روی Mobile shortcut داشته باشد؛ Desktop همان Reports navigation مستقل را حفظ کند.
- **MOBILE-PAGE-BLOG-NAV-04:** Ellipsis موبایل برنمی‌گردد. Page در جای overflow قدیمی و Blog کنار Freedom در دسترس مستقیم Mobile قرار بگیرند؛ بدون horizontal overflow.
- **PROFILE-BANNER-APPLY-04 — BUGFIX:** بنر Equip‌شده باید واقعاً روی Profile composition دیده شود. Avatar و Frame باید shape و اندازهٔ مشترک Circle/Square را رعایت کنند.
- **PROFILE-NAME-CONTAINER-COSMETICS-04 — REQUESTED:** Theme برای نام و کل مستطیل/کارت Profile با entitlement روشن.
- Status خالی هیچ placeholder عمومی نشان ندهد.

## X2 — Other-user Profile actions / Relationships
- **PROFILE-MORE-ACTIONS-04 — REQUESTED:** پروفایل هر شخص Gear ندارد؛ منوی سه‌نقطهٔ مخصوص همان شخص داشته باشد: Block، حذف/پنهان‌کردن Chat از لیست، Nickname خصوصی، Relationship slot.
- Nickname خصوصی است و UGC ترجمه نمی‌شود.
- Relationship presets حداقل شامل: همراه، خانواده، داش، سیسی، لاور، دوست، رفیق. هر slot quota روشن دارد؛ Lover و Companion حداکثر یک نفر.
- **PUBLIC-PAIR-04 — BACKEND/CONSENT-GATED:** نمایش Lover/Companion روی Profile عمومی و کنارهم‌آمدن دو Profile فقط بعد از رضایت دوطرفه، Privacy، revoke و Rules چند UID. local-only metadata نباید به‌عنوان رابطهٔ عمومی جعلی نمایش داده شود.
- حذف واقعی کل history پیام از سرور فقط با retention/delete contract و Rules انجام شود؛ تا آن زمان «حذف Chat» می‌تواند hide-local امن باشد و پیام جدید آن را دوباره ظاهر کند.
- **DM-DRAFT-01 — HIGH PRIORITY:** Draft پیام Private Chat account-scoped بعد navigation/reload بماند و بعد Send پاک شود.

## X3 — Store / Cosmetics — URGENT
- **STORE-HUB-04 — URGENT:** Store مستقل با دسته‌های Featured، Events، Tokens، Profile Skins، Frames، Banners، Status Cosmetics، Themes، Seasonal و Owned/Inventory.
- فاز اول فقط Catalog/Preview/Equip با assetهای واقعی موجود در repo است؛ balance یا purchase جعلی نمایش داده نشود.
- خانواده‌های Profile Theme برای catalog/seasonal plan: Colorways، Animals/Masks، Suit، Zombie، Street/Gang، Mafia، Mommy/Daddy aesthetic، Birds، Technology، Leather، Prison، Doctor، Engineering، Scientist، Marine، Mermaid، Princess، Blogger، Librarian، Gaming، Minecraft-inspired و tactical/shooter original.
- نام/Asset برند Call of Duty / PUBG / Valorant / Warzone بدون مجوز وارد Production catalog نشود؛ فقط aesthetic original و غیرنقض‌کننده.
- **SEASONAL-CATALOG-04:** همهٔ Themeها همزمان عرضه نشوند؛ rotation فصلی + Featured limited drops + Owned archive.
- **ELITE-PASS-04 — ECONOMY-BACKEND-GATED:** Elite ماهانه با Token، profile/cosmetic همان ماه، entitlement/expiry/restore purchase و بدون pay-to-win.
- **TOKEN-LEDGER-04 — SERVER-GATED:** balance، grant، purchase و receipt verification فقط server-authoritative + idempotent ledger.
- **LEADER-COSMETICS-04:** آیتم ویژهٔ Top Rank/Top Club/Admin با eligibility و expiration قابل audit.

## X4 — Clean Feature Hubs / uploaded IA contract — HIGH PRIORITY
- Home و Tasks در این pass redesign نشوند؛ functionality موجود حفظ شود.
- Hub pattern: Launcher visual → route مستقل؛ business logic duplicate نشود.
- Library Hub: Clips / Search / Reading Reports / Shelves.
- Language Hub: Leitner / Language Books / Classes / Study Report.
- Wellness Hub: Water / Sleep / Exercise / Weight / Reports / Analysis.
- Focus Hub: Pomodoro / Focus Room / Music-Ambience / Deep Work.
- Friends Hub: Friends / Chats / Groups / Clubs / Activity / Requests؛ فقط tab فعال visible؛ Ranking مستقل.
- Reports Hub: Reading / Language / Fitness / General Productivity shortcuts و summary؛ full analytics در routeهای مستقل.
- فقط assetهای موجود و تأییدشدهٔ repo استفاده شوند. Asset ناموجود fabricate نشود و replacement image تولید نشود.
- freedom-hero-banner.webp و my-goals-icon.webp تا تأیید Asset جدید استفاده نشوند. Asset extra #40 نادیده گرفته شود.
- Deep-link refresh و Back باید برای routeهای Hub پایدار باشد.

## X5 — Freedom / Diary / Music / Profile song
- **PRIVATE-DIARY-04 — REQUESTED:** دفتر خاطرات خصوصی account-scoped، edit/delete/search/tag؛ پیش‌فرض private.
- **DIARY-EXPLORE-TAGS-04 — PRIVACY-GATED:** فقط tagهایی که کاربر صریحاً public می‌کند می‌توانند در Explore aggregation ظاهر شوند؛ متن Diary هرگز خودکار public نشود.
- **FREEDOM-MUSIC-04 — REQUESTED / EXTERNAL-SOURCE:** بخش Music + Search Music در Freedom با provider قانونی/قابل‌اتکا؛ upload/streaming rights و attribution رعایت شود.
- **PROFILE-SONG-04 — REQUESTED:** آهنگ Profile با privacy، autoplay خاموش، mute و ownership/source روشن.

## X6 — Tasks presentation
- **TASK-CARD-GROUP-VIEW-04 — REQUESTED:** toggle نمای فعلی ↔ کارت‌های compact؛ grouping انتخابی بر اساس Folder/List یا Priority color. داده/selection/reorder و منطق Tasks تکرار نشود.
- Home/Tasks redesign عمومی ممنوع؛ این مورد فقط view mode در خود Tasks است.

## X7 — Admin publishing
- **ADMIN-BLOG-PUBLISH-04 — REQUESTED / BACKEND-GATED:** Admin بتواند article draft/publish/unpublish و category/cover/locale را مدیریت و داخل Blog سایت منتشر کند.
- **ADMIN-SITE-PAGE-PUBLISH-04 — REQUESTED / BACKEND-GATED:** محتوای رسمی Site Page از Admin با audit log و role checks.
- Admin utilities پیشنهادی: content moderation queue، reports، users/roles، catalog/events/seasonal store، notification campaigns، AI gateway/model routing، media review، feature flags، deploy health و audit log. همهٔ عملیات حساس server-side و role-gated.

## X8 — Login / visual entry
- **LOGIN-COMET-INTRO-04 — REQUESTED:** صفحه Login animation سبکِ ستاره‌های دنباله‌دار و سپس نمایش logo اصلی Elara (نه app mark)، با reduced-motion fallback و budget عملکرد Mobile.

## X9 — Existing requests retained
Cursor/theme expansion، Vampire copy، wellness plan notes، Profile photo library/cloud sync، Focus activity tone، Focus Room، Shared Task، Challenge delivery modes، Presence neon، Home streak flame، Status color/theme، Reports delete/minimal charts، Blog AI Tutor، Page identity/sections، Clubs، Store/Economy و 3D Avatar از بخش‌های قبلی حذف نشده‌اند و همچنان با status/gate فعلی ادامه دارند.

---

# Supersession map
- `ROADMAP.md`: historical execution log + pointer to this Master.
- `REMAINING-ROADMAP.md`: short operational queue only.
- `docs/PRODUCT-ROADMAP.md`: older product baseline.
- `docs/V2-COMPLETE-FEATURE-ROADMAP.md`: detailed backlog archive.
- `docs/ROADMAP-2026-10-01-SOCIAL-PRIVACY-ORGANIZATION-UX-ADDENDUM.md`: detailed change log / evidence ledger.
- **This file is canonical for priority and conflict resolution from 2026-10-03 onward.**


---

# Execution Handoff — 2026-10-04 (current user-approved queue)

> **Baseline inspected before this roadmap update:** `d55ede332cf4d14c6ff003efe0e19e1372c95091`. این SHA فقط نقطهٔ handoff است؛ اجراکننده باید در هر نوبت HEAD واقعی `main` را دوباره بگیرد و هیچ تغییر همزمان جدید را rollback نکند.  
> **قاعدهٔ تحویل:** CODED ≠ DONE. برای هر تغییر UI/Interaction، END-HEAD Browser + Pages + CI مرتبط باید روی همان HEAD بررسی شود و در صورت visual request، screenshot همان build ملاک است.

## H0 — P0 visual/interaction regressions — FIRST, before new features

### H0.1 Ranking / Friends visual acceptance — REGRESSION OPEN / HIGH
- Ranking باید با تصاویر مرجع Desktop/Mobile کاربر هم‌راستا شود، بدون حذف قابلیت‌های واقعی.
- Avatar و Frame در Ranking/Friends/Public Profile باید **یک shell و یک shape/size owner** داشته باشند؛ Circle/Square بودن و اندازهٔ Frame با خود Avatar sync باشد و Frame بیرون پروفایل نایستد.
- Ranking Desktop: Podium و «رتبهٔ من» در ردیف اصلی؛ Weekly/Friends ranking، Requests، Online و Clubs با grid پایدار و بدون ستون‌های باریک/خارج‌شده.
- Ranking Mobile: Podium و رتبهٔ خود کاربر full-width؛ بقیه کارت‌ها responsive و بدون overflow.
- چهار کنترل Ranking/Friends/Community/Clubs باید از artwork واقعی repo استفاده کنند؛ متن تکراری اگر داخل خود artwork وجود دارد در UI دوباره نمایش داده نشود.
- **League — REQUESTED / BACKEND-GATED:** لیگ هفتگی شبیه promotion/demotion 7 روزه، با rank thresholds روشن، history و نتیجهٔ server-authoritative. تا backend معتبر آماده نیست رتبه/لیگ ساختگی نمایش داده نشود.
- Friends main hub: همهٔ 6 کنترل اصلی **در Desktop یک ردیف افقی** باشند؛ روی Mobile در یک ردیف horizontal-scroll بمانند و به دو ردیف شکسته نشوند.
- Friends cards/boxes باید grid منظم، gap و height هماهنگ داشته باشند؛ Requests / Activity / Friends / Chats / Groups / Clubs از هم جدا ولی مرتب باشند.
- Presence فقط دادهٔ واقعی؛ empty state به‌جای Online ساختگی.
- معیار پذیرش: 1440/1648/1920 + 390/430، بدون horizontal overflow، Avatar/Frame هم‌مرکز، controls یک‌خطی، screenshots artifact همان END HEAD.

### H0.2 Tasks selection/completion contract — REGRESSION OPEN / HIGH
- دایرهٔ بزرگ/checkbox selection که در screenshot Tasks ظاهر شده **حذف شود**؛ selection نباید با control دائمی کنار هر Task انجام شود.
- Selection mode:
  - Desktop: pointer hold / long-press روی خود row (و در صورت وجود right-click contract فعلی، بدون تداخل).
  - Mobile: long-press روی خود row.
  - بعد از ورود به selection mode، Bulk toolbar ظاهر شود؛ قبل از selection پنهان بماند.
  - click/tap عادی همچنان برای completion/details طبق UI نهایی کار کند؛ long-press نباید completion را ناخواسته trigger کند.
- **همهٔ task-like sources قابل completion باشند**: Task عادی، Habit امروز، Goal Step و Section-linked tasks.
- Habit/Goal Step دادهٔ duplicate نسازند؛ completion از Tasks همان canonical Habit/Goal را تغییر دهد و completion از منبع اصلی نیز Tasks را sync کند.
- Habit در Tasks کل نوار رنگ مستقل سبز/فیروزه‌ای و Goal Step کل نوار رنگ مستقل بنفش داشته باشد؛ این قرارداد در list و grouped-card view هر دو حفظ شود.
- **Daily turns / repeat count — CODED, acceptance pending:** یک Task با `dailyTarget=N` بدون duplicate شدن باید بعد از N نوبت complete شود و progress مثل `1/2` نشان داده شود؛ XP فقط در completion نهایی و idempotent.
- **Grouped Task view — CODED, acceptance pending:** toggle نمای لیست ↔ کارت‌های compact، grouping بر اساس Folder/List یا Priority؛ داده duplicate نشود.
- Drag/reorder با Mouse/Touch و trash-drop برای حذف همچنان در roadmap باقی است؛ drag نباید long-press selection را خراب کند.
- معیار پذیرش: تست integration + Browser 390/1440؛ Habit/Goal/Task همگی قابل tick، long-press selection، no giant circle، no duplicate data، undo/XP درست.

### H0.3 Section-specific Tasks — CODED PARTIAL / VERIFY
- زیر launcherهای اصلی Language / Library / Wellness-Exercise، shelf تسک مخصوص همان بخش نمایش داده شود.
- Add Task از داخل هر بخش sourceGroup مناسب بسازد، در Tasks و Home هم همان canonical Task دیده شود.
- همان Daily turns، completion، edit/delete و selection contract روی Section Taskها نیز کار کند.
- Business logic duplicate نشود؛ فقط surface متفاوت است.

## H1 — Profile / Mobile shell — NEXT
- Avatar + Frame + Profile shape باید در Header، Home، Ranking، Friends، Public Profile و Store preview از یک قرارداد مشترک استفاده کنند.
- Mobile: Gear اصلی از shell صفحه حذف شود و Settings داخل Profile باشد؛ Page بالا کنار Profile قرار گیرد؛ Blog در bottom nav باشد. Desktop layout فعلی بی‌دلیل جابه‌جا نشود.
- Profile Settings: Account، Privacy، Language، Calendar، Help، Blocked، Logout؛ Reports shortcut فقط Mobile؛ Notifications/Messages از Profile حذف شوند و Notification bell مستقل بماند.
- XP زیر progress منتقل شود و close/settings controls روی Level نیفتند.
- Profile Banner و Profile container/name themes باید واقعاً Equip شوند و در Home/Profile sync بمانند.
- Other-user profile menu: Block، hide/delete-chat semantics امن، nickname، relationship slot؛ public Lover/Companion فقط consent + Rules.
- Store Catalog/Preview/Equip برای Profile/Frames/Banners/Themes **URGENT**؛ purchase/token جعلی ممنوع.

## H2 — Freedom / Media
- Music + Search Music در Freedom با provider قانونی/قابل‌اعتماد.
- Profile Song با privacy، autoplay خاموش و mute.
- Private Diary account-scoped؛ public explore فقط opt-in tags/content.
- Freedom subpages موجود حفظ شوند؛ چیزی برای «شبیه مرجع کردن» حذف نشود.

## H3 — Language / Classes
- Custom Class برای Online / Offline / Linked class.
- کاربر Term count، Sessions per term، Session duration، روزهای هفته و study time را تعیین کند؛ ETA اتمام محاسبه شود.
- Class report و edit.
- Shared class با Friend و challenge دائمی بدون timer؛ share-link/join flow؛ progress همکلاسی‌ها فقط از دادهٔ واقعی و privacy-aware.
- این بخش تا schema/Rules چند UID تست نشود VERIFIED نیست.

## H4 — Progression / ambient UX
- XP Journey screen: Mobile swipe-left به فضای سیاره/ستاره با مسیر XP و rewardهای locked؛ Desktop trigger کنار notification جایگزین edit-profile button طبق تصمیم نهایی.
- Back to main app واضح.
- Home banner local-time-aware: day=sun، night=moon/crescent؛ hover/reveal بدون پوشاندن محتوا.
- Morning greeting popup با mission/reward/CTA واقعی و عدم تکرار آزاردهنده.
- Login: comet/star intro → main Elara logo؛ reduced-motion fallback.

## H5 — Mobile navigation contract
- Page در Mobile بالای صفحه کنار Profile؛ Gear از main mobile shell حذف و فقط داخل Profile.
- Bottom nav مرتب و Blog در آن حاضر باشد.
- Blog/Page اگر جا کم بود با responsive/overflow منطقی حل شوند، نه حذف capability.
- Desktop navigation فعلی بدون درخواست مستقیم بازطراحی نشود.

## H6 — Data/backend gates that must not be faked
- Firestore/Storage Rules publish واقعی و تست دو UID/two-device.
- Presence، public relationships، Shared Class/Task، League authoritative result، Clubs realtime، Store token ledger، payment/Elite، AI gateway.
- برای هر مورد backend-gated، UI می‌تواند empty/locked state واقعی داشته باشد ولی دادهٔ جعلی، user ساختگی، fake balance یا fake online ممنوع است.

## H7 — Executor discipline
1. قبل از هر patch: `main` HEAD واقعی + فایل‌های همان HEAD را بگیر.
2. تغییر همزمان را rollback نکن؛ patch کوچک و additive/targeted باشد.
3. Asset موجود repo را استفاده کن؛ filename/shape را حدس نزن.
4. بعد از intentional visual change، تست قدیمی را فقط اگر contract قدیمی شده اصلاح کن؛ UI را برای راضی‌کردن تست stale عقب نبر.
5. Cache-bust/boot version فقط وقتی asset/runtime واقعاً تغییر کرده.
6. هر commit باید یک موضوع روشن داشته باشد.
7. آخر کار: END HEAD → Validate + Reference + Browser + P0 + Pages؛ وضعیت incomplete را صریح بگو.
8. هیچ‌وقت «انجام شد» نگو مگر همان HEAD واقعاً deploy/test شده باشد.
