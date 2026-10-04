# کارهای باقی‌مانده — Operational Queue

> مرجع کامل و canonical: [docs/MASTER-ROADMAP-2026-10-03.md](docs/MASTER-ROADMAP-2026-10-03.md)  
> آخرین handoff اجرایی: بخش **Execution Handoff — 2026-10-04** در Master Roadmap.  
> این فایل فقط صف کوتاه‌مدت است و نباید با Master رقابت کند.

## P0 — همین الان، قبل از Feature جدید
1. **Ranking visual + profile/frame sync**
   - Avatar/Frame هم‌مرکز و هم‌شکل Circle/Square در Podium، جدول، Friends و Public Profile.
   - Desktop: Podium + My Rank، سپس Weekly/Friends/Requests/Online/Clubs بدون ستون باریک یا overflow.
   - Mobile: Podium و My Rank تمام‌عرض.
   - چهار کنترل Ranking/Friends/Community/Clubs مطابق artwork موجود و بدون متن تکراری.
   - League فقط به‌عنوان backlog backend-gated؛ fake league ممنوع.

2. **Friends Hub cleanup**
   - 6 کنترل اصلی Desktop در یک ردیف افقی.
   - Mobile همان یک ردیف با horizontal scroll؛ دو ردیف نشود.
   - Cards/boxes grid منظم و spacing/height هماهنگ.
   - Presence فقط واقعی؛ در غیر این صورت empty state.

3. **Tasks interaction cleanup**
   - حذف دایرهٔ بزرگ selection/completion که در screenshot فعلی دیده شده.
   - Long-press/pointer-hold روی خود Task row → Selection mode؛ Bulk toolbar فقط بعد از انتخاب.
   - Habit امروز، Goal Step، Task عادی و Section-linked Task همگی از Tasks قابل completion باشند و با source اصلی sync بمانند.
   - Habit full-row سبز/فیروزه‌ای، Goal Step full-row بنفش در list و grouped view.
   - `dailyTarget` / چند نوبت در روز روی یک Task، بدون duplicate.
   - Grouped compact cards بر اساس Folder/List یا Priority — **CODED؛ END-HEAD acceptance باقی است**.
   - Drag/reorder + trash-drop Mouse/Touch بدون تداخل با long-press — **CODED + browser fixture؛ CI/Pages acceptance باقی است**.

4. **Section Tasks verification**
   - Language / Library / Wellness-Exercise shelf زیر launcherها.
   - Add Task از همان بخش → همان Task در Home و Tasks.
   - completion/edit/delete/repeat/select یکسان.

## P1 — Profile / Mobile shell
1. Avatar/Frame/Shape contract واحد در Header/Home/Ranking/Friends/Public Profile/Store.
2. Mobile Gear فقط داخل Profile؛ Page بالا کنار Profile؛ Blog در bottom nav.
3. Profile Settings: Account، Privacy، Language، Calendar، Help، Blocked، Logout؛ Reports فقط Mobile.
4. XP زیر progress؛ controls روی Level نیفتند.
5. Profile Banner + name/container themes واقعاً Equip و sync شوند.
6. Other-user menu: Block / hide chat / nickname / relationship slot؛ public pair فقط consent + Rules.
7. Store Catalog/Preview/Equip برای Profile/Frames/Banners/Themes فوری؛ fake token/purchase ممنوع.

## P2 — Freedom / Media
1. Music + Search Music در Freedom با provider قانونی.
2. Profile Song با privacy/mute و autoplay خاموش.
3. Private Diary؛ public Explore فقط opt-in.
4. Freedom subpages موجود حفظ شوند.

## P3 — Language / Classes
1. Custom Online / Offline / Linked Class.
2. Term count، sessions per term، duration، weekdays، study time و ETA.
3. Reports + Edit.
4. Shared class / classmate progress / join flow فقط با backend و Rules واقعی.

## P4 — Progression / Login / Ambient
1. XP Journey فضایی: swipe-left Mobile، trigger Desktop، rewards locked بر اساس XP.
2. Home day/night sun/moon based on local time.
3. Morning greeting + mission/reward/CTA واقعی.
4. Login comet/star intro → main Elara logo + reduced-motion.

## P5 — Mobile navigation
1. Page بالا کنار Profile.
2. Gear از main Mobile shell حذف؛ فقط Profile.
3. Blog در bottom nav.
4. Desktop nav بدون درخواست مستقیم دست نخورد.

## P6 — Admin Content Studio — CODED / VERIFY
1. Blog Publisher: Draft/Published، category، locale، cover، read-time، edit/delete و Audit.
2. Site Page Publisher: slug، locale، Draft/Published، edit/delete و Audit؛ Published در Page به‌صورت Official card.
3. Role contract: owner/admin publish؛ moderator read-only.
4. Firestore Rules جدید `blogArticles` / `sitePages` باید روی پروژه Firebase publish شوند.
5. Acceptance: Draft از app مخفی، Published در Blog/Page دیده شود، browser 390/1440 + Admin smoke + production read.

## Backend-gated — هیچ دادهٔ جعلی مجاز نیست
1. Firestore/Storage Rules publish + 2 UID / 2 device tests.
2. Presence.
3. Public relationship pair.
4. Shared Task/Class.
5. League authoritative result.
6. Clubs realtime.
7. Store token ledger / Elite / payment verification.
8. AI gateway.

## Definition of Done برای چت اجرایی
- هر نوبت HEAD واقعی `main` را بگیر.
- patch روی همان HEAD؛ concurrent commits را rollback نکن.
- asset موجود repo، نه filename/visual حدسی.
- intentional visual contract → تست stale را به‌روز کن، نه اینکه UI را عقب ببری.
- END HEAD باید Validate + Reference + Browser + P0 + Pages را ببیند.
- «DONE» فقط بعد از deploy/test همان END HEAD؛ در غیر این صورت CODED/TESTING بگو.
