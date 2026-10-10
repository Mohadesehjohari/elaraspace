# Profile Edit — Firebase Cloud Media Migration Proposal

Status: **DESIGN ONLY / NOT IMPLEMENTED OR DEPLOYED**. Companion proposal for Draft PR #39. Backend work must be isolated from UI and coordinated with concurrent Friends/Social work.

## Verified current contracts

- Storage rules currently allow pageMedia uploads only for `post` and `story` and clubMedia uploads for owner-controlled club assets; all other storage paths are denied.
- Firestore `profiles/{uid}` uses `validProfile(data)` with a restricted schema: `username,name,bio,xp,profilePublic`. Neither avatar/banner paths nor theme/subtitle exist in the accepted profile schema.
- `ElaraSocial.saveProfileValues` is the canonical account save path and uses the current transactional username-claim identity logic. Do **not** replace it.
- UI-only cosmetics in PR #39 are UID-scoped local browser settings; **no personal upload to Firebase** is attempted.

## Proposed backend contract (separate PR)

1. Add canonical optional fields to `profiles/{uid}`: `avatarStoragePath`, `bannerStoragePath`, `profileTheme`, `profileAccent`, `profileSubtitle`, `profileFrame`. Decide shape/unlock rules and migrate conservatively. Explicitly include fields in `validProfile` and update allowlists; do not weaken existing username claim predicates. Consider a dedicated `profileAppearances/{uid}` document instead to avoid coupling to the identity transaction; in either case **owner-only writes** and identical privacy to profiles.
2. Dedicated Storage paths `profileMedia/{uid}/avatar/{uuid}.webp` and `profileMedia/{uid}/banner/{uuid}.webp`. Require authenticated `request.auth.uid == uid` for create/update/delete and enforce 5 MiB maximum with `image/webp`, `image/png`, `image/jpeg` MIME checks. Use random IDs and never allow arbitrary URL/path injection; use strict regex for UUID basename and a small bounded extension set.
3. **Read visibility must match profile privacy.** Owner can read. Other signed-in users can only read profiles that are publicly visible under the same privacy/blocked-account policy as Firestore, with any friend-specific access implemented consistently rather than accidentally exposing private images. If Storage rules cannot reproduce the existing social policy safely, use a dedicated authenticated image-access endpoint with server-side authorization instead of broad `allow read: if request.auth != null`.
4. On upload: validate dimensions/type/size in browser; upload to a **new** path with user auth; validate server metadata/content where feasible (client MIME can be spoofed). Only after upload success, commit the new path to Firestore with ownership and path-format validation. No unrelated username/name changes are needed in that media-only transaction. After the Firestore commit, schedule deletion of the prior object (with retry). Failed Firestore commits must clean up the unreferenced new object; do not delete the old object before the new reference is committed.
5. On reload, resolve only the **current signed-in UID** profile paths, never reuse a previous session's cached appearance for another UID. Use authorized Storage URL retrieval or a verified secured proxy. Avoid persisting long-lived public download tokens for private images.
6. Delete: clear Firestore reference first, then remove the old object; support retrying orphan cleanup. Enforce an upload quota, content dimensions, idempotency and revoke/share behavior. Avoid revealing images for private/blocking cases through cached URLs.
7. Only after a tested authenticated end-to-end rollout should the editor display **cloud-saved** success. Until then the UI must accurately distinguish canonical Firestore identity fields and local-only cosmetics.

## Required emulator and staging tests

- Create real **two independent Firebase Auth accounts A and B** with verified profiles and username claims; do not use screenshot fixture identities.
- A may upload/replace/delete its own avatar/banner; B may not upload/write/delete files under A's UID.
- Test signed-out attempt, forged UID/path, unsupported MIME, oversized object, malformed filename, and unauthorized reads of private/blocked accounts.
- Verify an upload followed by successful Firestore path update is visible on a different browser/device signed in as A; verify replacement and old-path cleanup. Confirm partial Storage success followed by Firestore failure does not display false success.
- Test a true duplicate username against the canonical transaction, a rules permission denial, network disconnect, and login A→B during pending upload/save.
- Test private/public/friends/block settings against the actual published social privacy contract; verify URLs are not made globally accessible accidentally.
- Deploy **Firestore rules and Storage rules separately from GitHub Pages**; first emulator, then staging Firebase project, then audited production rollout with backup/rollback. No rules publication as part of Draft PR #39.

## Coordination / release decision

PR #39 remains a UI-only Draft. A separately approved backend PR is required for the schema/rules/API above; do not modify `firestore.rules`, `storage.rules`, `elara-social.js`, or files owned by concurrent PR #38 / Friends work in this UI branch. Release status for cloud media: **NOT IMPLEMENTED**.
