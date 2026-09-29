# Home and Tasks — reference pass, 2026-09-29

Base: `53251de315c60e220b482031216337cb01aecfd6`, Mohadesehjohari/elaraspace main.

References: `e1ee3630-45aa-49de-a5b2-f82f0936cb89.jpg` (desktop Home), `6ca5725c-732c-4ad7-97f8-ba7efb5340a6.jpg` (mobile Home), `60d022f5-3390-48f3-9ab4-b7a61b0ba921.jpg` (desktop/mobile Tasks).

## Implemented

- Generated a new filled violet completion disk with a white tick and true alpha. Home, Tasks, recurring habit owner and Home goal controls use the new file. Original artwork remains available for older untouched consumers.
- Generated an illustrated clipboard / crescent / mountain Tasks hero, installed locally as WebP. The existing Home landscape already matches the supplied Home scene and is reused.
- Reworked Home desktop grid, mobile two-column cards, full-width health card, streak calendar, mission marks, five-row goal scroll, semantic habit icons and mini podium. Podium displays only actual account/friend inputs; no fabricated people.
- Reworked Tasks toolbar and real metadata chips, collapsible search/filters, task cards, category/priority/XP information, per-row completion bars, daily donut and streak. The current data model is binary completion: bars show 0/100%, never invented partial progress. The XP rate remains 10 per task.
- Preserved existing composer, scheduling, per-day completion, XP, account startup fallback, Firebase and data persistence. No deployment credentials or security settings changed.
- Added both generated images to the production required-assets manifest and updated the existing browser acceptance selectors for the actual composer and view-all CTA.

## Verification

Local: recurrence tests, DOM integration, series splitting, Social rendering, v2 ownership/data checks, static app checks, navigation/profile/deployment contracts and JavaScript syntax pass. JSDOM does not validate layout. The supported browser could not open the local preview (`ERR_BLOCKED_BY_CLIENT`); no pixel-match claim is made. The existing GitHub browser workflow exercises seven viewports and uploads screenshots after the commit. Its run status must be checked separately. Live Firebase writes and deployment have not been exercised locally.

Generated files are project assets; no screenshot of a reference is used as a fake interactive page. PNG sources were converted to WebP for delivery, with the check's alpha preserved. Built-in image generation was used, not CLI/API fallback.

## Generated asset paths and final prompts

`assets/ui/icon-task-complete-astra-v2.webp` (160 × 160, alpha):

> Use case: stylized-concept. Asset type: production UI completion check icon for a Persian navy/violet productivity dashboard. Create ONE centered front-facing perfectly round filled violet-purple disk, luminous lavender upper-left highlight, rich electric-purple lower-right gradient, subtly beveled soft edge. Inside a bold, simple, perfectly legible WHITE checkmark with rounded ends, centered and spanning 55% of disk diameter, shape leaning up to right. Match a polished neon game dashboard icon. Disk fills about 82% of square canvas with a small soft purple outer glow. Actual transparent background. No text, no lettering, no ring around check, no outline circle, no star, no extra symbols, no app tile, no perspective, no shadows beyond subtle glow. Intended to remain crisp at 28–40 pixels.

`assets/ui/hero-tasks-astra-v2.webp` (1920 × 768):

> Use case: stylized-concept. Asset type: ultra-wide website Tasks page hero background. Premium fantasy productivity dashboard illustration, navy and luminous violet palette. A beautiful oversized 3D lavender clipboard with four white check marks and violet horizontal checklist strokes, leaning slightly on rocky ground, placed at 60 percent across canvas. Tiny antique gold pocket watch at its lower corner. Background: majestic violet mountains, dark pine forest, starry deep indigo sky with a glowing crescent moon near clipboard. Low purple dawn glow behind mountains. Polished detailed digital fantasy art, elegant and crisp, subtle bloom. Panoramic wide banner composition, important clipboard center-right, dark quiet negative space left 40 percent for HTML Persian title, far right dark for quote card. No people. NO text, NO letters, NO words, NO watermark, NO UI frames or buttons. Design to crop well to 4:1 desktop header and 2.5:1 mobile header.
