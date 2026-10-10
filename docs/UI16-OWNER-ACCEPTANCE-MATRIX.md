# UI16 — owner acceptance and evidence register (OPEN)

Baseline: `main@b8b830883c39cdf717ad433d1633eb9a7b4d6e59` (verified GitHub ref 2026-10-10).
Source: UI16 owner request, reference renderings (desktop/mobile), owner screenshots of live UI15. Owner has **not** approved UI15 or UI16. **Do not merge** before explicit visual approval and passing blocking CI.

Status lexicon: NOT IMPLEMENTED / PARTIAL / CODE NOT VERIFIED LIVE / BROWSER VERIFIED / OWNER APPROVED. "Code present" is never equivalent to "browser verified"; pending test is not PASS.

| Request | Real UI15 evidence | Responsible file(s) | Required action | Acceptance test | Owner |
|---|---|---|---|---|---|
| Latest main + no premature release | main SHA verified; PR #37 merged previously | GitHub refs/workflows | draft PR, before/after, explicit signoff | git SHA, PR draft + CI + owner confirmation | OPEN |
| Language hero, eight dedicated shortcut routes | source present; real screenshot still visually diverges | ui12-language-dashboard.js, ui13-language-routes.js, feature-hubs-2026.js | validate click to distinct destination, back, reload | nine-width, FA/EN, direct routes, real hit targets | OPEN |
| Language desktop RTL geometry, asymmetric first row | 4 cells in CSS; image/sizes not owner-accepted | ui12-language-dashboard.css, ui13-language.css | geometry/row order against reference | bounding boxes 1440/1648 and screenshots | OPEN |
| Language second row report right | grid areas coded; actual pixel ordering requires proof | ui12-language-dashboard.css, ui13-language.css | enforce/report right in RTL physical order | bounding boxes 1440/1648 | OPEN |
| Leitner 5 3D boxes + real counts | rectangular boxes exist since UI15; owner still rejects full composition | ui12-language-dashboard.js, ui13-language.css | retain indices, real counts, owner art and flashcard illustration, gold CTA | count fixtures 0/1/many, screenshots, click | OPEN |
| Dedicated advanced Leitner | existing #words is a route, advanced design not accepted | app.js, feature-hubs-2026.js | separate roadmap: smart review, CRUD, actual progress | dedicated functional owner test | OPEN |
| Language assets | files exist in assets/ui, used inconsistently | assets/ui, ui12-language-dashboard.*, ui13-language.css | audit exact names, use relevant assets | asset decode + computed UI | OPEN |
| Language/library hero lower crop not lower card | backgrounds reference owner art, crop not visually accepted | global-page-banner-20261009.*, ui13-language.css | adjust image internal framing only | production images, no black top space | OPEN |
| Duplicate heroes across library/social/ranking/language/blog/page | removal code exists; not owner-accepted across every route | global-page-banner-20261009.js | one primary hero; do not delete reports or Home | count visible hero elements on real pages | OPEN |
| Freedom black half and overlapping text | guard exists; owner reports bad result | global-page-banner-20261009.css, freedom-page.css | examine actual hero screenshot and preserve approved art | 9 widths, text/black overlay check | OPEN |
| Sidebar owner banner | moon background set; approved exact asset not established | reference-home-shell-2026.js, assets/ui/daily-banner-bg_main.webp, background-moonlit-mountains.webp | compare owner approved artwork and verify real lower-left visibility/scroll | screenshot 1440/1648 | OPEN — ask owner if artwork cannot be identified |
| Header/back click/refresh | CSS hacks hide some overlays; prior intercept issue | ui13-language.css, feature-hubs-2026.js, global-page-banner-20261009.css | root no extra Back; subroute click unobstructed | native Playwright click and elementFromPoint | OPEN |
| Classmates stats popup | dialog code exists; owner mobile tap fails | language-custom-classes.js, ui13-language.css | authorize real member data, show empty/denied, make dialog usable | touch 320–430, visible dialog, close, no overflow | OPEN |
| Task category add/edit/details + scoped views | canonical sourceGroup exists; screens and routing still need proof | app.js, feature-hubs-2026.js, ui13-language-routes.js, linked-tasks.js | ensure category editable, round-trip, no clones | add/edit/reload/delete and scoped global/section, XP | OPEN |
| Three-state task workflow | three-state model not delivered | app.js, task-universal-interactions.js | separate model/permissions/XP contract; hover and touch | no double XP, defer not completed | OPEN |
| Decorator icons policy | generic symbols still present in cards | ui12-language-dashboard.js, ui13-language-routes.js | SVG for inner UI only; preserve menus/Freedom | snapshots/icon inventory | OPEN |
| Language channels/challenges backend | issue #33 OPEN; no dedicated secure backend | docs/UI13-LANGUAGE-BACKEND-SAFETY.md, Firebase (separate work) | roles/rules/indexes/functions/block/emulator/two-user deploy | security tests + authorized deployment | OPEN (separate issue #33) |
| Home/Tasks panorama failure | Run 38032868169 FAIL; task hero computed backgroundImage 'none' | global-page-banner-20261009.css, tests/home-tasks-reference-visual.mjs | correct real background delivery, keep strong assertion | run original fidelity test on HEAD and production | OPEN |
| Sitewide horizontal overflow | UI13 tests cover subset, not all routes/popups | CSS surface owners + test matrix | measure offending elements, structural repairs | widths 320,360,375,390,412,430,768,1440,1648 | OPEN |
| Global mobile seven-item nav + main Home | approved, protected | index.html, mobile-ia-2026-10-05.*, reference-home-shell-2026.* | do NOT redesign/reduce to More | mobile nav count/order and Home parity | OPEN (regression gate) |
| Friends focus room/presence/DM/privacy | requested separate future work | elara-collab.js, social-messaging-ui.js, elara-social.js | two-real-account proof, online state, block/mute | role/privacy + real account delivery | OPEN (roadmap) |
| Pomodoro/focus collaboration | future module requirement | focus-ambience.js, elara-collab.js | sessions, invites, presence, exits | timer correctness + two-account | OPEN (roadmap) |
| Friend emoji activity notifications | future work | notifications.js, domain-notifications.js | real event-only privacy-safe copy | two-account cases | OPEN (roadmap) |
| Admin Gemini multiple server keys | future separate secure backend | admin/ai.php, docs/ADMIN-GEMINI-ROADMAP.md | no keys front-end, budgets/quotas/roles/transparency | backend security review | OPEN (roadmap) |

## Evidence gates — each request separately

1. Code implemented? **per PR diff**; a code file's existence is not acceptance.
2. Technical tests PASS? **only with CI run URL and exact SHA**.
3. Real browser PASS? **only with documented browser metrics/clicks/screenshot**.
4. Production verified? **not before owner signoff + merge + live bytes proof**.
5. Owner visual approval? **NO**, until owner explicitly approves exact before/after candidate.

## Screenshot / comparison plan

Candidate (local PR branch): 390, 1440, 1648; mobile overflow: 320, 360, 375, 412, 430; tablet 768. Capture raw live UI15 before and candidate after beside uploaded reference. Record native clicks for all seven language destinations, classmate modal and Back. Fixture records must never write to production accounts.

## Roadmap order (not secretly counted as UI16 complete)

1. Owner-accept Language dashboard composition and working dedicated routes.
2. Full dedicated classes screen: real CRUD, roles, sharing, classmates, empty/forbidden states and mobile acceptance.
3. Advanced real-data Leitner page.
4. Backend issue #33 separately: secure channels and verified challenges, no fake scores.
5. Friends DM, shared real-time focus, privacy, presence and notifications.
6. Standalone Pomodoro and focus sessions.
7. Secure multi-Gemini admin integration.
8. Three-state canonical Tasks model in a separately reviewed contract.

Issue #35 remains OPEN until owner acceptance. Issue #33 remains OPEN until secure backend deployment and real two-account verification.

---

## UI16 owner-fix execution — current PR #38 (2026-10-10)

Current candidate branch `ui16-owner-acceptance-20261010`; base `main@b8b830883c39cdf717ad433d1633eb9a7b4d6e59`. Previous UI16 commits: `3c727e69` (hero/Leitner/Freedom/sidebar) and `361c6f4d` (canonical task status). This record is **candidate code, not owner signoff, merge or production verification**. Browser gates and side-by-side reference/before/after remain mandatory. Tests seed only isolated browser-local stores; never a real production account.

| محور | وضعیت واقعی | فایل‌ها | علت/کد اصلاح | مدرک و آزمون | Live / مالک |
|---|---|---|---|---|---|
| ۱. لایتنر | **CODE FIXED** | `ui12-language-dashboard.js`, `ui16-owner-fidelity.css` | HTML 5 actual storage counts; due and review are existing canonical code | UI13 and candidate screenshot comparison pending | NO / NO |
| ۲. کتابخانه | **CODE FIXED** | `global-page-banner-20261009.js`, `ui16-owner-fidelity.css` | One active hero controller; removes only secondary decorative hero. Crop position adjusted. | Chromium 390/1440 screenshot and owner comparison pending | NO / NO |
| ۳. زبان | **CODE FIXED** | `global-page-banner-20261009.js`, `ui12-language-dashboard.js`, `ui16-owner-fidelity.css` | Single route hero, asymmetric layout, cropped owner art | Candidate visual diff pending | NO / NO |
| ۴. دوستان/رتبه‌بندی | **CODE FIXED** | `global-page-banner-20261009.js` | Nested social hero remains owned by social renderer; redundant visual headers marked hidden | Rendered tab/route enumeration pending | NO / NO |
| ۵. آزادی | **CODE FIXED** | `freedom-page.css`, `ui16-owner-fidelity.css` | Remove second background and opaque overlay; text wraps | Screenshots 390/430/1440 pending | NO / NO |
| ۶. سایدبار | **CODE FIXED** | `reference-home-shell-2026.js`, `ui16-owner-fidelity.css` | Replace wrong moonlit-mountains with daily-banner-bg_main.webp, also existing banner | Image network / screenshot confirmation pending | NO / NO |
| ۷. هدر و Back | **IN PROGRESS** | `ui16-owner-fidelity.css`, `global-page-banner-20261009.js` | Root Back CSS suppressed; sub-route account suppression partly preexisting; route sync still needs proof | Back/Forward, click and layout pending | NO / NO |
| ۸. تسک‌های موضوعی و تصمیم سه‌گانه | **CODE FIXED** | `app.js`, `phase2.js`, `ui16-owner-fidelity.css`, `tests/task-date-completion-browser.mjs` | Reuses sourceGroup and canonical IDs; adds per-date missed/later, done delegates canonical XP, no default strike | Cross-view CRUD and regression pending | NO / NO |
| ۹. SVG محتوای داخلی | **IN PROGRESS** | `ui12-language-dashboard.js` | Semantic SVGs in main Language dashboard from existing UI13 work; other product-hub icon inventory incomplete | Screenshot SVG inventory pending | NO / NO |
| ۱۰. موبایل/عرض‌ها | **IN PROGRESS** | `ui16-owner-fidelity.css`, `tests/ui16-owner-candidate-browser.mjs` | Responsive adjustments; nine-width automated browser gate | Cross-page overflow and modal proof pending | NO / NO |

### CI and evidence (SHA-scoped)

- Baseline UI16 first patch `3c727e69`: [candidate browser check run 38073667358](https://github.com/Mohadesehjohari/elaraspace/actions/runs/38073667358) PASS, [UI12 run 38073667377](https://github.com/Mohadesehjohari/elaraspace/actions/runs/38073667377) PASS, [P0 fast run 38073667393](https://github.com/Mohadesehjohari/elaraspace/actions/runs/38073667393) PASS. These are **not** proof on the final HEAD.
- [UI13 run 38073667350](https://github.com/Mohadesehjohari/elaraspace/actions/runs/38073667350) failed: old assertion expected `lightner.webp` on entire card (instead of new scene) and old `background-moonlit-mountains.webp` sidebar. Updated UI13 test verifies actual art layer and owner-correct sidebar art without dropping five-box/count assertions. Rerun required on final HEAD.
- Browser screenshots stored in Actions artifacts for candidate workflows (`browser-artifacts/ui16/{before-main,after-ui16}-<route>-<width>.png` and `browser-artifacts/ui13/`). Uploaded owner desktop/mobile reference is separate and must be placed beside raw screenshots, not mislabeled as current live site.
- No owner visual approval. PR must remain **Draft / Open / Unmerged**; no Pages publish, no `LIVE VERIFIED` or `OWNER ACCEPTED`. Backend issue #33 remains separate.
