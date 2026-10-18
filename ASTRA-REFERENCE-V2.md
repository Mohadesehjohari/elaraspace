# Home and Tasks — reference pass, 2026-09-29

Base: `53251de315c60e220b482031216337cb01aecfd6`, Mohadesehjohari/elaraspace main.

References: `e1ee3630-45aa-49de-a5b2-f82f0936cb89.jpg` (desktop Home), `6ca5725c-732c-4ad7-97f8-ba7efb5340a6.jpg` (mobile Home), `60d022f5-3390-48f3-9ab4-b7a61b0ba921.jpg` (desktop/mobile Tasks).

## Implemented

- Added a filled violet completion disk with a white tick and true alpha. Home, Tasks, recurring habit owner and Home goal controls use the new file. Original artwork remains available for older untouched consumers.
- Added an illustrated clipboard / crescent / mountain Tasks hero, installed locally as WebP. The existing Home landscape already matches the supplied Home scene and is reused.
- Reworked Home desktop grid, mobile two-column cards, full-width health card, streak calendar, mission marks, five-row goal scroll, semantic habit icons and mini podium. Podium displays only actual account/friend inputs; no fabricated people.
- Reworked Tasks toolbar and real metadata chips, collapsible search/filters, task cards, category/priority/XP information, per-row completion bars, daily donut and streak. The current data model is binary completion: bars show 0/100%, never invented partial progress. The XP rate remains 10 per task.
- Preserved existing composer, scheduling, per-day completion, XP, account startup fallback, Firebase and data persistence. No deployment credentials or security settings changed.
- Added both image assets to the production required-assets manifest and updated the existing browser acceptance selectors for the actual composer and view-all CTA.

## Verification

Local: recurrence tests, DOM integration, series splitting, Social rendering, v2 ownership/data checks, static app checks, navigation/profile/deployment contracts and JavaScript syntax pass. JSDOM does not validate layout. The supported browser could not open the local preview (`ERR_BLOCKED_BY_CLIENT`); no pixel-match claim is made. The existing GitHub browser workflow exercises seven viewports and uploads screenshots after the commit. Its run status must be checked separately. Live Firebase writes and deployment have not been exercised locally.

The visual assets are part of the project; reference screenshots are not substituted for interactive UI. Source images were converted to WebP, preserving the completion icon's transparency.

## Production asset specifications

- `assets/ui/icon-task-complete-astra-v2.webp` — 160 × 160 WebP, transparent background, filled violet disk and white checkmark. Intended for 28–40 pixel display sizes.
- `assets/ui/hero-tasks-astra-v2.webp` — 1920 × 768 WebP Tasks banner, violet clipboard, mountains and dark left-side text-safe area. Supports desktop and mobile cropping.
