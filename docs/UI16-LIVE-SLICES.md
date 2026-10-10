# UI16 — Incremental Production Slices

## L1: Language / Leitner scenic card (2026-10-11)

- Scope: illustrated scene above the five real word-box stages, inside the existing Language dashboard; existing review button and word counts are preserved.
- Owner: UI16. No Header, Sidebar, mobile navigation, shared Router, Profile, Friends, Firebase, Storage or Backend changes.
- Changed: `ui12-language-dashboard.js`, `ui12-language-dashboard.css`, `tests/ui13-language-owner-browser.mjs`, a one-line `boot.js` cache-version change and scoped integration CI.
- Original slice base: `main@b8b830883c39cdf717ad433d1633eb9a7b4d6e59`; safely synchronized with `main@6d72adcc94e81d181c6d12f94b6a6a8fbd7788a6` (Friends #42, Profile #43 and test-only #45 preserved).
- Gates: UI12, UI13, P0 and Social; after merge, existing `UI12 Live Production Exact Bytes and Browser` checks public Pages file bytes and real Chromium.
- Status at candidate commit: **NOT MERGED / NOT LIVE VERIFIED**. Only move to LIVE VERIFIED after Pages deployment plus exact bytes and public-browser run on merge SHA.
- Further #38 changes are separately queued; do not merge whole original draft PR. Do not create demo-user records in Production.

- Cross-release gate: UI12/UI13 full nine-width checks, P0 identity/tasks/collaboration, seven-width Profile Edit, seven-width Friends, Product Hubs and Store. Do not declare merged or live from local fixtures; check Pages exact served code, decoded art and real-origin browser after the release.

- Visual QA found duplicate `lightner.webp` on parent and child at 1440px; that candidate was withheld. The corrected scoped CSS renders a **single scenic layer behind** the real five stages and keeps visible owner art; UI13 now asserts the parent's background image is `none`, while the scene contains `lightner.webp` and has real dimensions.
