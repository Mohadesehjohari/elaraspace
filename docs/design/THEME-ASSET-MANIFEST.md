# Elara Theme Asset Manifest
**Production checklist — 2026-10-05**

> This is the asset naming and production queue for the visual-theme system.

## Naming
Use lowercase kebab-case:
- `library-nav-inactive.webp`
- `library-nav-active.webp`
- `task-checkbox-empty.webp`
- `task-checkbox-checked.webp`
- `library-hero-banner.webp`

No text inside icon files.

## Export
### Icons
- source master: 1024×1024
- transparent background
- WebP lossless/high quality
- exact padding consistency across active/inactive pair

### Banners
- desktop master composed for 16:5-ish safe crop
- mobile crop-safe
- no baked UI copy
- preserve text-safe region

## Default Theme — Batch 1 (first 10)
- [ ] 01-library-nav-inactive.webp
- [ ] 02-library-nav-active.webp
- [ ] 03-language-nav-inactive.webp
- [ ] 04-language-nav-active.webp
- [ ] 05-wellness-nav-inactive.webp
- [ ] 06-wellness-nav-active.webp
- [ ] 07-friends-nav-inactive.webp
- [ ] 08-friends-nav-active.webp
- [ ] 09-task-checkbox-empty.webp
- [ ] 10-task-checkbox-checked.webp

## Default Theme — Batch 2
- [ ] freedom-nav-inactive.webp
- [ ] freedom-nav-active.webp
- [ ] reports-nav-inactive.webp
- [ ] reports-nav-active.webp
- [ ] blog-nav-inactive.webp
- [ ] blog-nav-active.webp
- [ ] store-nav-inactive.webp
- [ ] store-nav-active.webp
- [ ] my-goals-icon.webp
- [ ] pomodoro-icon.webp

## Default Theme — Feature icons
- [ ] book-clips-icon.webp
- [ ] search-book-icon.webp
- [ ] custom-shelves-icon.webp
- [ ] reading-goals-icon.webp
- [ ] leitner-box-icon.webp
- [ ] language-books-icon.webp
- [ ] language-classes-icon.webp
- [ ] study-report-icon.webp
- [ ] hydration-icon.webp
- [ ] sleep-icon.webp
- [ ] exercise-icon.webp
- [ ] weight-icon.webp
- [ ] training-plan-icon.webp
- [ ] nutrition-plan-icon.webp
- [ ] wellness-analytics-icon.webp
- [ ] focus-room-icon.webp
- [ ] study-music-ambience-icon.webp
- [ ] deep-work-icon.webp
- [ ] challenges-icon.webp
- [ ] stories-status-icon.webp
- [ ] community-icon.webp
- [ ] clubs-management-icon.webp
- [ ] shared-study-room-icon.webp
- [ ] invite-friend-icon.webp
- [ ] private-chat-icon.webp
- [ ] group-chat-icon.webp
- [ ] activity-feed-icon.webp

## Default Theme — Banners
- [ ] home-hero-banner.webp
- [ ] library-hero-banner.webp
- [ ] language-hero-banner.webp
- [ ] wellness-hero-banner.webp
- [ ] friends-hero-banner.webp
- [ ] freedom-hero-banner.webp
- [ ] reports-hero-banner.webp
- [ ] blog-hero-banner.webp
- [ ] profile-hero-banner.webp
- [ ] store-hero-banner.webp
- [ ] goals-hero-banner.webp
- [ ] focus-hero-banner.webp
- [ ] ranking-hero-banner.webp

## Theme reference registry
- T01 Moonlit Kingdom → `city_theme.webp`
- T02 Peach Dawn → `theme.webp`
- T03 Frost Moon → `theme_blue.webp`
- T04 Violet Lake → `theme_dark.webp`
- T05 Emerald Ruins → `theme_forest_green.webp`
- T06 Galactic Violet → `theme_galaxy_purple.webp`
- T07 Golden Horizon → `theme_orange.webp`
- T08 Sakura Valley → `theme_pink.webp`
- T09 Crimson Eclipse → `theme_red.webp`
- T10 Aurora Tree → `theme_spring.webp`
- T11 Snowlight → `theme_white.webp`

## State rules
- inactive: quieter, low glow, same silhouette
- hover: CSS brightness/border preferred
- active: brighter, compact glow, selected surface
- avoid separate hover asset unless needed
- avoid contact sheets for final delivery
- every final icon must be independently generated/exported

## Theme completion checklist
For each theme:
- [ ] palette tokens
- [ ] background treatment
- [ ] nav active/inactive set
- [ ] task controls
- [ ] functional icons
- [ ] feature icons
- [ ] banners
- [ ] desktop 1648 visual QA
- [ ] mobile 390 visual QA
- [ ] contrast check
- [ ] reduced-motion check
