# UI16 — Incremental Production Slices

## L1: Language / Leitner scenic card (2026-10-11)

- Scope: illustrated scene above the five real word-box stages, inside the existing Language dashboard; existing review button and word counts are preserved.
- Owner: UI16. No Header, Sidebar, mobile navigation, shared Router, Profile, Friends, Firebase, Storage or Backend changes.
- Changed: `ui12-language-dashboard.js`, `ui12-language-dashboard.css`, `tests/ui13-language-owner-browser.mjs`.
- Base: `main@b8b830883c39cdf717ad433d1633eb9a7b4d6e59`.
- Gates: UI12, UI13, P0 and Social; after merge, existing `UI12 Live Production Exact Bytes and Browser` checks public Pages file bytes and real Chromium.
- Status at candidate commit: **NOT MERGED / NOT LIVE VERIFIED**. Only move to LIVE VERIFIED after Pages deployment plus exact bytes and public-browser run on merge SHA.
- Further #38 changes are separately queued; do not merge whole original draft PR. Do not create demo-user records in Production.
