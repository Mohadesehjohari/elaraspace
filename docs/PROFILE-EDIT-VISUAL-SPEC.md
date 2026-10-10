# ELARA SPACE — Profile Edit visual specification

**Status:** Draft implementation; NOT approved for merge or deployment.
**Branch:** feat/profile-edit-reference-20261010 (base: main).

## References and scope

The attached desktop reference (ویرایش پروفایل - Copy.png) shows the two-column layout; the mobile reference (ویرایش پروفایل موبایل(1).png) shows the vertical flow. The attached live screenshot (image(20261010-163150).png) documents the previous small modal. None of these sample images is an account-data source.

This branch only changes the entry point of approved-profile-system.js, adds the isolated editor JS/CSS, and adds a test, workflow and this spec. No Friends/DM/Groups/Clubs/Challenges files, header, shared sidebar, mobile navigation, Firestore/Storage rules or Roadmap are edited.

## Implemented layout

Desktop: content-area editor and sticky right preview, near-navy surfaces, cyan outline, violet neon accents and prominent four-color gradient Save. The editor includes a profile heading/back button, banner with image selector, circular avatar with camera button, name, canonical username syntax hint/copy, Bio counter, real membership date, real level, earned badges, palette, four templates, level-gated frames, subtitle and Save/Reset/Public-preview actions. The right card live-updates banner/avatar/frame, identity fields, Bio, subtitle, theme, actual XP and badges, and real friends count when available.

Theme selections map Classic to dark; Minimal to minimal; Nebula to galaxy; Forest to forest. Their tiles use existing project artwork. Banner options and unlocked frames use the current ElaraProfileSystem registry, not screenshot data.

At widths 701–970px the preview stacks below the form. At 700px and below the order is: heading/preview, banner, avatar/name/username, Bio, membership/level, badges, colors, templates, frames, subtitle, actions, then preview. Scroll ends above the unchanged mobile navigation with safe-area bottom inset. At <=400px the avatar frame choices wrap into a separate row.

## Persistence and security

The canonical account write still calls ElaraSocial.saveProfileValues via ElaraProfileSystem.canonicalProfileService. The existing profiles/{uid} and usernames/{username} transaction/claim code is unmodified. Syntax feedback never asserts that the new username is available; uniqueness is checked by the existing canonical service on Save.

A copy of draft visual state is kept in memory until Save succeeds without canonical warnings. Reset reverts drafts to the last saved state. On canonical failure, no appearance state is committed; partial write warnings are displayed and are NOT reported as full success.

Existing UID-scoped wardrobe local storage remains the source for chosen avatar, banner, frame, shape and appearance settings. Accent, subtitle and locally supplied banner are stored under elara_profile_edit_extras_v1_{uid}; these settings are **only browser/UID-local**, not cloud/public-profile settings. Image selectors accept JPEG/PNG/WEBP up to 5 MiB and canvas downscale. Current storage.rules only authorizes post/story content in pageMedia and has NO personal avatar/banner upload path. Therefore personal uploads are NOT sent to Firebase; any backend upload permission or cross-device sync would require a separately coordinated change. No private records of other users are loaded.

## Tests and acceptance

Automated suite: tests/profile-edit-redesign-browser.mjs; seven Chromium viewport screenshots (320, 375, 390, 430, 768, 1440, 1648) should be uploaded under artifacts/profile-edit through the dedicated profile-edit-visual-gate GitHub Action. Run from a served PR checkout:

- npm install --no-save --no-package-lock playwright@1.55.0
- npx playwright install --with-deps chromium
- python3 -m http.server 4173
- node tests/profile-edit-redesign-browser.mjs

The browser suite uses *mocked* profile data and stub canonical failures; it exercises seven-width overflow and geometry, live preview, avatar selection/reset, browser Back, simulated duplicate username and permission denied, local save/reload and preservation of sidebar/nav DOM. It captures scrolled-bottom views and full-height editor-only images. It is NOT an authenticated Firebase permission test.

| Acceptance gate | Initial status |
| --- | --- |
| Shared entry-point and new editor JavaScript parse | PASS: isolated JS syntax parsing |
| Existing canonical username service unmodified | PASS: source review |
| Seven-width Chromium screenshot, geometry and horizontal-overflow test | PASS on reference-bound browser runs; after latest CSS refinement, fresh CI and screenshot review required |
| Visual pixel/geometry comparison with supplied references | PARTIAL: actual Chromium images reviewed; left/right positioning and mobile preview overlap corrected; not pixel-perfect or accepted |
| Actual Firebase username collision and failure handling | UNVERIFIED: authenticated staging |
| Actual avatar/banner Firebase Storage upload | UNSUPPORTED: no matching Storage rule |
| Same-device local appearance after reload | PASS: mocked browser test (UID-scoped localStorage); production authenticated reload unverified |
| Cross-device/public-page appearance consistency | NOT IMPLEMENTED |
| Real public/private-data boundary | Needs authenticated staging validation |
| Live main publication | NOT DEPLOYED: main untouched |

## CI evidence and review (2026-10-10)

- The Profile Edit visual gate passed on commit f691de6e58a06f458628a271ad46baa4616d6e94 (run 38070023936), and again on commit 03602e828cc7b150570d3438e4ff576abf00dca5 (run 38070102862). Both included six mock Chromium widths. The username production hotfix workflow also passed on the first of those generations.
- CI screenshots include 320/375/390/430/768/1440 and additional scrolled mobile/desktop bottoms and mocked local-reload images. These are mock-identity screenshots; the actual signed-out Firebase gate is intentionally masked by the **test only**.
- Visual comparisons found and corrected: avatar initially on wrong side of mobile fields; desktop columns/action directions reversed; preview too low on desktop; needlessly long desktop identity region; and mobile preview negative overlap with Save/Reset (last corrected in commit fea647d4c30105fb2db5fccdb714329f91a2e520, after the cited passing screenshot).
- Acceptance remains blocked: artwork differs from reference; detailed side-by-side measurement and live authenticated Firebase/Storage checks are still outstanding. A successful test does not prove exact visual matching.

## Follow-up implementation audit (2026-10-10)

The same Draft PR #39 was continued, not replaced. Changes are confined to the two isolated profile files, the minimal entry point, the browser test/CI workflow and this independent spec.

- `profile-edit-redesign.js`: SVG artwork in place of placeholder Unicode control glyphs; theme preview tiles now use existing city-of-stars, moon-lake, galaxy and forest art; username format hint does not imply backend availability. Mount in existing `#main`, save the previous browser-history entry, handle browser Back, draft-exit confirmation, drawer return, account UID switch and canonical current-profile availability. Public appearance preview explicitly states that it is only an unsaved preview.
- `profile-edit-redesign.css`: fixed column direction, avatar position, six uninterrupted desktop swatches, sticky Save/Reset at wide widths, no preview overlap with Back, and mobile-only preview/header behavior. At >=1280px, real membership date/level/earned badges now occupy the narrow facts rail alongside the avatar/name/Bio, matching the supplied desktop reference. A tablet fallback stays stacked.
- `tests/profile-edit-redesign-browser.mjs`: seven widths; actual Chromium screenshots and geometry.json, scrolled footer, full-height mobile/desktop editor captures, avatar reset, live preview, local reload, canonical mock failure and Back.
- Backend design documented separately in `docs/PROFILE-EDIT-CLOUD-MEDIA-PROPOSAL.md`. No Firestore/Storage rule was changed.
- Main and PR #38 overlap review: the UI16 PR's changed-file list has no path overlap with PR #39; `main` was still at `b8b830883c39cdf717ad433d1633eb9a7b4d6e59` when reviewed. Reconfirm before any authorized merge.

### Missing exact reference artwork

The current repository has usable `assets/ui/banner_city_of_stars.webp`, `banner_moon_lake.webp`, `theme_galaxy_purple.webp`, `theme_forest_green.webp` and level-scoped Elara avatars. They do **not** reproduce the exact purple character-and-castle banner, anime portrait and luminous frame set shown in the supplied reference. No reference sample portrait was assigned to a real user or silently published as a canonical account image. Owner-authorized source artwork is still required for asset-level pixel equivalence.

### Real service status

The identity save path remains the unmodified `ElaraSocial.saveProfileValues` with the existing canonical Firestore identity logic; real authenticated collision, rules-denial, multi-account media access and cross-device reload tests have **not** been run. Existing Storage and Firestore allowlists reject a personal cloud-media contract, so avatar/banner device uploads and selected appearance extras remain local-only. GitHub Pages publishing alone cannot deploy Firebase rules.

## Open visual / functional differences

1. Existing repository artwork replaces some exact illustrated portrait/castle artwork from the visual references. Do not claim asset-level pixel equivalence.
2. Exact 1440 geometry and all mobile margins, line breaks and bottom-dock clearance require captured Chromium comparison and corrections.
3. Frame, colors, subtitle, personal images and themes are not a reliable cloud-synced public-appearance contract. Backend/schema/rules and authenticated test approval are required before representing them as such.
4. Browser automation is mocked and cannot prove production Firebase or mobile browser behavior.
5. Accessibility and keyboard navigation require manual review.

## Merge / release gate

**Keep PR Draft.** Compare actual CI screenshots against both attachments, correct visual deltas, test real Firebase/username transactions and permission failures with an authenticated staging account, obtain explicit approval for the limited local-only cosmetics contract, and coordinate any later shared Social/Storage work with the parallel Friends changes. Do not merge or call complete until approved.
