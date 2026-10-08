# Home + Tasks — independent owner-reference visual QA

**Review date:** 2026-10-08  
**Branch:** `ui/home-tasks-reference-fidelity-20261008`  
**Code reviewed:** `76d6f1dd9dbd382ded99cc1fc6920d57eb1265c5`  
**Production main (unchanged):** `2b19cacf170fa086ef7f64b355332bd5a7ceb8be`  
**PR:** #22 (Draft, NOT MERGED)

## Exact screenshot evidence

Owner reference screenshots: `خانه(7).png` and `کارها(4).png`, each **1672 × 941**.  
Actual Chromium from the branch: [Actions #37838746890](https://github.com/Mohadesehjohari/elaraspace/actions/runs/37838746890), screenshot artifact **11576382599**, files `fidelity-baseline-home-1672.png` and `fidelity-baseline-tasks-1672.png`. Additional captures: 320, 375, 390, 430, 768, 1440. The comparison was conducted **side by side at matching 1672 × 941 resolution**, not from a CSS pattern test.

The visual fixture uses sample local Task/Goal/Habit records and bypasses sign-in for browser screenshot isolation. It does NOT place fake users/friends or progress into production. Differences caused by sample data (e.g. 0-day streak versus owner reference 12 days) must not be disguised as layout defects or repaired by hardcoded counts.

## Owner asset audit

All **32/32** owner-listed `assets/ui/*.webp` files exist on this reviewed branch. None is missing or renamed. The two candidate task-hero assets are both present; `task-header-banner-bg.webp` is the actual banner background, `hero-tasks-astra-v2.webp` remains available. Task completion checked/unchecked art is loaded from real `tick.webp` / `tick_fraim.webp`. The sidebar uses the verified `nav-*` / `friends_normal.webp` / related default-active family; the Quick Access cards now have six real WebP icons rather than fake typographic glyphs.

## Visual inventory — HOME

| Surface | Owner reference | Current Chromium | Remaining difference |
|---|---|---|---|
| Header / sidebar | Large logo, balanced search bar and clean blue icons | Navigation works, no Settings gear, but logo/search/controls and artwork still feel smaller and icons more ornate | **Noticeable** |
| Hero | Character and castle naturally composed, compact legible right-aligned title/CTA | Real `homebanner1.webp`, no stretch/overlap; composition close | Minor–moderate typography/crop |
| Streak | Warm orange card, dominant flame, large value and 7 day circles | Real flame increased; real streak value and seven markers | Improved, still less luminous than reference |
| Today’s Tasks | Larger check circles, cyan progress, compact clean rows | Real Tasks and cyan progress; denser badges and scenery distract | **Noticeable** |
| Wellness | Central cyan circular score + three spacious mini tiles | Genuine derived value, enlarged ring + 3 metrics | Mid-card visual hierarchy different |
| Goals | Large target visual + full-width progress/list | Actual `read().goals`, separate from `read().habits` verified | Image target competes with compact list |
| Quick Access | Six bright scenic cards, prominent top icons, bottom caption/CTA | Exactly six original destinations, real backgrounds and icons, less dark overlay | Improved; shadows/type still differ |
| Bottom | Ranking podium / quote / achievements | Ranking reflects genuine empty friend state, Habits replaces quote, achievements real | **Major data-state / reference structural difference**, cannot invent friends or restore prohibited Quote |
| Overrides | No Home quote and no Settings gear | Both confirmed absent | PASS |

## Visual inventory — TASKS

| Surface | Owner reference | Current Chromium | Remaining difference |
|---|---|---|---|
| Hero | Panoramic castle + streak block + right motivation | Correct `task-header-banner-bg.webp` and real streak | Text/streak density somewhat smaller |
| Toolbar | Balanced RTL chips, prominent pink/purple Add button | Functional chip/filter/view controls, real Add button | Active chips/spacing still more compressed |
| Task rows | Taller scenic color-coded bands; prominent titles, badges and checkbox | Scenic real WebP strips, source-color accents; increased title/checkbox/chip sizes | **Noticeable**: badges feel clustered and scene/empty horizontal space differs |
| Completion art | Clear outlined square and checked owner asset | Real `tick_fraim.webp` and `tick.webp`, 40px click target | Icon contrast still different |
| Metadata | Distinct legible priority, due, recurrence, list and XP chips | Actual task fields; increased chip font/height | Alignment across mixed task types still differs |
| Completed block | Strong heading, muted completed row + edit/delete | Existing real completed section intact | Still comparatively plain/small |
| Sidebar | Cyan illuminated Tasks state with simple blue line icon set | Active state real and prominent, verified WebP nav family | Ornate icon family remains visibly unlike owner mockup |

**Important:** The implementation fixture renders more rows than the owner's reference because the app produces canonical Habit/Goal-related Tasks, not because extra decorative rows were added. It would be wrong to hide real tasks to make screenshot counts match.

## Actions performed on the branch

- Enlarged Task title and metadata/chip typography, increased checkbox/button hitboxes, improved scenic row spacing in the **existing** Tasks CSS owner.
- Enlarged Home health ring and improved Tasks summary/Quick Access text size, without adding sections.
- Replaced Quick Access placeholder glyphs with actual WebP icons, retained all six canonical routes and source data.
- Removed a conflict between desktop Streak flame size and a later 80px cap in Home CSS; kept a smaller responsive cap on mobile.
- Reduced the redundant dark overlay on owner Quick Access landscape images.
- Hardened six-width Browser checks to demand actual WebP decode, nonzero visibility, desktop Task row height, title font and checkbox size.

## Green automated evidence (not a visual similarity sign-off)

- [P0 Fast #37838748798](https://github.com/Mohadesehjohari/elaraspace/actions/runs/37838748798): SUCCESS.
- [Home owner Browser / Profile & Username / Emulator #37838748989](https://github.com/Mohadesehjohari/elaraspace/actions/runs/37838748989): SUCCESS.
- [Visual captures, Tasks browser CRUD, checklist, reorder, social, Firestore Emulator #37838746890](https://github.com/Mohadesehjohari/elaraspace/actions/runs/37838746890): SUCCESS.

## Merge decision

**HOME EXTREME REFERENCE FIDELITY: FAIL / further art-direction pass needed.**  
**TASKS EXTREME REFERENCE FIDELITY: FAIL / further hierarchy and spacing pass needed.**

No data, schema, Firebase Rules, Storage, or billing changes. **Do not merge PR #22 based only on green CI**. Keep this PR Draft until desktop visual differences narrow to acceptable reference fidelity and retest against the real URL after merge. Never invent production progress, friends, or rankings merely to match the static screenshot.
