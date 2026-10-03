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

# Supersession map
- `ROADMAP.md`: historical execution log + pointer to this Master.
- `REMAINING-ROADMAP.md`: short operational queue only.
- `docs/PRODUCT-ROADMAP.md`: older product baseline.
- `docs/V2-COMPLETE-FEATURE-ROADMAP.md`: detailed backlog archive.
- `docs/ROADMAP-2026-10-01-SOCIAL-PRIVACY-ORGANIZATION-UX-ADDENDUM.md`: detailed change log / evidence ledger.
- **This file is canonical for priority and conflict resolution from 2026-10-03 onward.**
