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

Automated suite: tests/profile-edit-redesign-browser.mjs; six Chromium screenshots (320, 375, 390, 430, 768, 1440) should be uploaded under artifacts/profile-edit through the dedicated profile-edit-visual-gate GitHub Action. Run from a served PR checkout:

- npm install --no-save --no-package-lock playwright@1.55.0
- npx playwright install --with-deps chromium
- python3 -m http.server 4173
- node tests/profile-edit-redesign-browser.mjs

The browser suite uses *mocked* profile data and stub canonical failures; it exercises responsive overflow, live preview, reset, simulated duplicate username and permission denied, local save/reload and preservation of the sidebar/nav DOM. It is NOT an authenticated Firebase permission test.

| Acceptance gate | Initial status |
| --- | --- |
| Shared entry-point and new editor JavaScript parse | PASS: isolated JS syntax parsing |
| Existing canonical username service unmodified | PASS: source review |
| Six-width Chromium screenshot and overflow test | PENDING: CI |
| Visual pixel/geometry comparison with supplied references | PENDING: manual screenshot review |
| Actual Firebase username collision and failure handling | UNVERIFIED: authenticated staging |
| Actual avatar/banner Firebase Storage upload | UNSUPPORTED: no matching Storage rule |
| Same-device local appearance after reload | PENDING: browser test |
| Cross-device/public-page appearance consistency | NOT IMPLEMENTED |
| Real public/private-data boundary | Needs authenticated staging validation |
| Live main publication | NOT DEPLOYED: main untouched |

## Open visual / functional differences

1. Existing repository artwork replaces some exact illustrated portrait/castle artwork from the visual references. Do not claim asset-level pixel equivalence.
2. Exact 1440 geometry and all mobile margins, line breaks and bottom-dock clearance require captured Chromium comparison and corrections.
3. Frame, colors, subtitle, personal images and themes are not a reliable cloud-synced public-appearance contract. Backend/schema/rules and authenticated test approval are required before representing them as such.
4. Browser automation is mocked and cannot prove production Firebase or mobile browser behavior.
5. Accessibility and keyboard navigation require manual review.

## Merge / release gate

**Keep PR Draft.** Compare actual CI screenshots against both attachments, correct visual deltas, test real Firebase/username transactions and permission failures with an authenticated staging account, obtain explicit approval for the limited local-only cosmetics contract, and coordinate any later shared Social/Storage work with the parallel Friends changes. Do not merge or call complete until approved.
