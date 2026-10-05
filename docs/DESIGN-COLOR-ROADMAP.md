# Elara Space — Design & Color Roadmap
**Canonical visual-system roadmap — 2026-10-05**

> این سند مرجع اصلی تصمیم‌های رنگ، تم، آیکون، بنر، stateهای بصری و زبان تصویری Elara است.  
> برای رفتار محصول و اولویت مهندسی، `docs/MASTER-ROADMAP-2026-10-03.md` همچنان canonical است.  
> در تعارض بصری، این سند برای color/theme/icon/banner decisions مقدم است؛ در تعارض رفتاری، Master Product Roadmap مقدم است.

---

## 0) North Star

Elara باید **فضایی، آرام، رویایی و بالغ** بماند؛ نه «همه‌چیز بنفش و نورانی».

اصل طراحی:
- Space feeling از عمق، آسمان، نور، شیشه‌گونگی، ستاره و contrast می‌آید؛ نه از بنفش‌کردن همهٔ UI.
- Default theme باید کم‌خستگی‌ترین تم باشد.
- Neon فقط برای emphasis استفاده شود.
- هر بخش هویت رنگی خودش را دارد اما surface system ثابت می‌ماند.
- Artwork در Hero/Banner متمرکز شود؛ محتوای روزمره روی background ساده و خوانا بماند.
- هیچ component مهمی صرفاً با رنگ معنی ندهد؛ icon/label/state نیز لازم است.

---

# D0 — Design Foundation

## D0.1 Default visual language
نام: **Elara Midnight**

ویژگی‌ها:
- Background: dark neutral blue، نه purple-heavy.
- Primary interaction: blue/cyan.
- Purple: محدود و فقط برای magic/creative accents.
- Gold: ranking/reward/premium.
- Surfaceها: glassy ولی با contrast کنترل‌شده.
- Glow: کم و هدفمند.

نسبت استفاده:
- 70% dark neutral blues
- 15% blue/cyan
- 10% section accent colors
- 5% purple/gold special accents

## D0.2 Glow levels
### Level 1 — Soft Glass
- inactive/default
- glow صفر یا بسیار کم
- border تمیز
- saturation کاهش‌یافته

### Level 2 — Accent Glow
- hover/selected card/secondary CTA
- outer glow نرم
- saturation متوسط

### Level 3 — Hero Glow
- active nav
- primary CTA
- achievement/reward
- focal banner art
- استفاده محدود

قانون: اگر همه‌چیز بدرخشد، هیچ‌چیز برجسته نیست.

## D0.3 Active / Inactive / Hover
**Inactive**
- readable
- low saturation
- no strong halo
- color محفوظ ولی آرام

**Hover**
- brightness +8–15%
- border accent
- small drop-shadow
- transition 180–250ms

**Active**
- brighter accent
- compact glow
- selected surface
- clear state without giant purple background

---

# D1 — Default Theme Palette

## Core
- Background main: `#06111F`
- Header/Sidebar: `#08182A`
- Surface 1: `#0C2036`
- Surface 2: `#102A46`
- Border default: `#24405F`
- Border hover: `#3E628B`
- Text primary: `#F5F8FF`
- Text secondary: `#A8B7CC`
- Text muted: `#7F92A8`

## Semantic
- Primary blue: `#4F8CFF`
- Cyan accent: `#2DD4D7`
- Purple accent: `#8B5CF6`
- Gold: `#F5C45B`
- Success: `#38D39F`
- Warning: `#F6A84B`
- Danger: `#F0627D`

## Background rule
Default page background:
- base: `#06111F`
- subtle gradient toward `#0A1630`
- faint noise/stars only
- no full-screen illustrated background behind dense content
- cinematic art limited to hero/banner modules

---

# D2 — Section Color Identity (Default Theme)

| Section | Primary | Secondary | Glow | Psychology |
|---|---|---|---|---|
| Library | `#5BA8FF` | `#5667E8` | Low–Medium | knowledge, calm |
| Language | `#36D6E7` | `#F2B84B` | Medium | learning, movement |
| Wellness | `#20C9A6` | `#59D98E` | Medium | health, growth |
| Friends | `#53A8FF` | `#FF7D88` | Medium | social, warmth |
| Freedom | `#9064FF` | `#D565E8` | Medium–High | creativity, dreams |
| Reports | `#4E8BFF` | `#38D0DD` | Low | clarity, data |
| Ranking | `#F5C451` | `#5C8DFF` | Medium | value, competition |
| Store | `#F4C45E` | `#E46C9D` | Medium | premium |
| Blog | `#F38A5A` | `#668DFF` | Low–Medium | editorial inspiration |
| Goals | `#5C98FF` | `#F2C052` | Medium | progress, achievement |
| Focus/Pomodoro | `#FF9B4A` | `#4E90FF` | Medium | action, concentration |

Progress bars باید بر اساس domain رنگ بگیرند؛ همه purple نباشند.

---

# D3 — Component Color Rules

## Sidebar
- inactive: icon color retained but dimmed; no giant filled purple pill.
- hover: subtle surface lift + accent border.
- active: section accent + small glow + selected surface.
- text remains high-contrast.
- Settings در header/profile contract باقی بماند، نه sidebar در shellهایی که roadmap فعلی حذف آن را تعیین کرده است.

## Feature launcher icons
- larger, more illustrative than functional icons.
- transparent background.
- no text baked into image.
- independent asset, never cropped from contact sheet.
- 1024×1024 source master when generated.

## Functional icons
- simpler than feature icons.
- low glow.
- prioritize legibility at 24–40px.

## Task checkbox
- square with rounded corners, not circle.
- empty: transparent/dark fill + cool border.
- checked: compact fill + white/cyan tick.
- radius about 25–30% of box size.
- target UI size around 28–34px desktop depending row density.
- no heavy neon.

## Buttons
- primary: filled section accent or blue.
- secondary: glass/surface + border.
- danger: red only for destructive action.
- no universal purple button rule.

## Cards
- default border `#24405F`
- hover border `#3E628B`
- active border = section accent
- glow only on selected/focal card

---

# D4 — Theme Families & Reference Images

The supplied visual references are mapped as follows:

| Theme ID | Name | Reference filename | Mood | Neon |
|---|---|---|---|---|
| T00 | Elara Midnight | default system, no single image | calm cosmic | Low–Medium |
| T01 | Moonlit Kingdom | `city_theme.webp` | royal fantasy moon/castle | Medium |
| T02 | Peach Dawn | `theme.webp` | hopeful sunrise | Low |
| T03 | Frost Moon | `theme_blue.webp` | clean icy moon | Low |
| T04 | Violet Lake | `theme_dark.webp` | meditative violet night | Medium |
| T05 | Emerald Ruins | `theme_forest_green.webp` | forest/waterfall growth | Low–Medium |
| T06 | Galactic Violet | `theme_galaxy_purple.webp` | intense galaxy | High |
| T07 | Golden Horizon | `theme_orange.webp` | motivation/sunrise | Low |
| T08 | Sakura Valley | `theme_pink.webp` | soft poetic spring | Low–Medium |
| T09 | Crimson Eclipse | `theme_red.webp` | dramatic power | Medium–High |
| T10 | Aurora Tree | `theme_spring.webp` | magical inspiration | Medium |
| T11 | Snowlight | `theme_white.webp` | clean, breathable winter | Very Low |

### Theme psychology rules
- **Moonlit Kingdom:** royal blue + moon white + warm gold + violet.
- **Peach Dawn:** peach + blush + lavender + sky.
- **Frost Moon:** ice blue + white silver + midnight blue.
- **Violet Lake:** indigo + violet + lilac; no over-saturation.
- **Emerald Ruins:** emerald + mint + aqua + moss.
- **Galactic Violet:** electric violet + magenta + deep indigo; never default.
- **Golden Horizon:** sun gold + orange + apricot + warm rose.
- **Sakura Valley:** sakura pink + lavender + soft plum.
- **Crimson Eclipse:** crimson + fire orange + black cherry.
- **Aurora Tree:** violet + magenta + coral + gold light.
- **Snowlight:** snow white + cold blue + pale gold.

---

# D5 — Asset Production Plan Per Theme

Each theme must produce the same categories so implementation can swap theme tokens/assets consistently.

## A) Core Controls
- checkbox-empty
- checkbox-checked
- radio-empty
- radio-selected
- primary-button skin
- secondary-button skin
- progress-bar skin
- stat-chip skin
- achievement badge skin

## B) Sidebar / Navigation states
For each visible nav destination:
- inactive
- active
Optional hover should preferably be CSS-derived unless art direction explicitly requires a separate asset.

Destinations:
- Home
- Tasks
- Language
- Library
- Wellness/Exercise
- Ranking
- Friends
- Freedom
- Reports
- Page/Profile
- Blog/Magazine
- Store
- Settings only where product shell requires it

## C) Feature Icons
- Book Clips
- Pomodoro
- Focus Room
- Study Music / Ambience
- Custom Shelves
- Reading Goals
- Search Book
- Leitner Box
- Language Books
- Classes
- Study Reports
- Training Plan
- Nutrition Plan
- Wellness Analytics
- Sleep
- Hydration
- Weight
- Challenges
- Stories / Status
- Community
- Clubs Management
- Shared Study Room
- My Goals
- Invite Friend
- Group Chat
- Private Chat
- Activity Feed

## D) Banners
- Home hero
- Library
- Language
- Wellness
- Friends
- Freedom
- Reports
- Blog/Magazine
- Profile/Page
- Store
- Goals
- Pomodoro/Focus
- Ranking

Banner rules:
- no text baked into artwork unless explicitly approved.
- leave text-safe region.
- desktop and mobile crop-safe composition.
- avoid excessive purple in themes where purple is not the family accent.

---

# D6 — Default Theme Production Order

## Batch 1 — first 10 approved production targets
1. Library nav icon — inactive
2. Library nav icon — active
3. Language nav icon — inactive
4. Language nav icon — active
5. Wellness nav icon — inactive
6. Wellness nav icon — active
7. Friends nav icon — inactive
8. Friends nav icon — active
9. Task checkbox — empty
10. Task checkbox — checked

Quality:
- 1024×1024 source for icons, transparent background.
- no text.
- independent generation, no contact-sheet crops.
- active and inactive must share exact silhouette/composition.

## Batch 2 — next 10
1. Freedom nav inactive
2. Freedom nav active
3. Reports nav inactive
4. Reports nav active
5. Blog nav inactive
6. Blog nav active
7. Store nav inactive
8. Store nav active
9. My Goals
10. Pomodoro

## Batch 3 — feature set
- Book Clips
- Search Book
- Leitner Box
- Custom Shelves
- Study Music
- Focus Room
- Reading Goals
- Training Plan
- Nutrition Plan
- Shared Study Room

## Batch 4 — banners
- Home
- Library
- Language
- Wellness
- Friends
- Freedom
- Reports
- Blog
- Goals
- Pomodoro/Focus

---

# D7 — Typography

Preferred:
- Persian: **Vazirmatn**
- Persian alternative: **Estedad**
- English: **Inter**
- English alternative: **Plus Jakarta Sans**

Rules:
- FA system UI RTL.
- EN system UI LTR.
- user-generated content never rewritten merely to match locale.
- use consistent font-weight scale; avoid overly bold body copy.

---

# D8 — Handoff Rules for Implementation Chat

Final implementation prompt must include:
1. exact color tokens
2. typography tokens
3. background/surface/border tokens
4. section accent map
5. asset path mapping
6. active/inactive/hover behavior
7. banner placement and text-safe rules
8. checkbox/task states
9. responsive desktop/mobile rules
10. reduced motion
11. contrast/accessibility requirements
12. rule: no universal purple buttons
13. rule: no full-screen art under dense UI
14. rule: existing product behavior must not be removed for visual matching

---

# D9 — QA / Definition of Done for a Theme

A theme is not DONE until:
- Desktop 1440/1648/1920 visually checked.
- Mobile 360/390/430 checked.
- light/dark text contrast acceptable.
- no horizontal overflow.
- all nav states readable.
- checkbox states unambiguous.
- button hierarchy clear.
- no section becomes “all neon”.
- banner safe zones work in FA/EN.
- focus visible for keyboard.
- reduced-motion fallback.
- screenshots captured from the same END HEAD.
- generated assets are independent high-resolution masters, not cropped from sheets.

---

# D10 — Execution Priority

1. Complete **Elara Midnight**.
2. Produce developer handoff prompt + tokens.
3. Implement and visually verify default theme.
4. Only then expand to:
   - Moonlit Kingdom
   - Emerald Ruins
   - Peach Dawn
   - Frost Moon
   - Violet Lake
   - Golden Horizon
   - Sakura Valley
   - Galactic Violet
   - Crimson Eclipse
   - Aurora Tree
   - Snowlight

Default must be the calmest and most durable daily-use theme.
