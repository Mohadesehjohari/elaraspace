# UI13 Language backend compatibility and safe release gate

**Status: NOT DEPLOYED for independent Language Channels/Challenges.** PR #32 is the separate UI delivery; this document does not grant permissions or change Firebase configuration.

## Inspected canonical resources

- Firebase project: `elara-ab1aa`, Firestore/Auth/Storage are already wired in `cloud.js` and `elara-social.js`.
- Real Social clubs already support `kind: "language"` with `clubs`, `clubMembers`, bans, joining, roles, privacy and owner-only actions. UI13 lists only authenticated `ElaraSocial.clubs.list()` and authorized `discover()` results and opens them with `ElaraSocialClubsUI.openClub()`. Creation delegates to the actual Club composer with Language preselected. These are **language clubs**, not a newly released channel service.
- Existing friend challenges are recorded in the `challenges` collection with authenticated friend relationships, supported targetKinds task/habit/reading/exercise/focus/general. They do **not** support an independent Language targetKind or trusted cross-account achievement settlement. UI13's dedicated Language Challenge page clearly says this and links to the real Friends challenge area; it never fabricates scores.
- Collaboration already supports `language-class` spaces. `ElaraCollab.memberRows(spaceId)` is the canonical authorized classmate-progress read, backed by `collabSpaces/{spaceId}/members`. A button should call the report that displays those rows, not just the unrelated Space dialog.

## Separate backend release required for fully independent channels & language challenges

A future *separate* Backend PR should first include a document schema and an emulator suite, then a rules/indexes/function deployment before enabling the feature flag. Review:

1. **Channels**: reuse real Club membership and bans (or formally migrate to a room resource), enforce requester membership and role for every read/write, reject blocked users, and never grant visibility to private members through public discovery. Unique membership keys `{clubId}/{uid}` and idempotent join/leave; per-room message limits, sanitizer and moderation/audit.
2. **Language challenges**: explicitly add `language` to supported challenge kinds only with **verified** metrics (word review IDs, reading log provenance and participant consent). Validate owner/recipient, blocklist, required email verification, invited friend relationship, fixed start/end, result sign-off on server, idempotent progress and replay protection. Use transactions and authenticated Cloud Functions, not client-reported winner values.
3. **Rules**: implement least-privilege read/write predicates, immutable owner/participant keys, bounded field sets and sizes, member-only progress, no arbitrary record creation. Ensure existing PR #24/#26 rules are reconciled rather than overwritten.
4. **Storage**: allowlist media types, file size/owner path, club image moderation, no public leak for private rooms. Use current Club media permissions where possible.
5. **Indexes & emulator**: document query shapes, add only needed composite indexes, run two-user allow/deny scenarios for blocked/private/banned/unverified members, role escalation, double joins, challenge retries and expired invitations. Test data must stay in Emulator, never users' Production accounts.
6. **Rate limits**: enforce server-side quotas per authenticated UID/action and per target for joins, invitations, messages and challenge result submissions.
7. **Live cutover**: create a versioned feature flag disabled by default; deploy rules/indexes/functions together, complete emulator proof, deploy UI only after authorized Firebase deployment and smoke against two opted-in real accounts.

## Owner action at backend release gate

A maintainer with authorized Firebase access must review any future Backend PR, the indexes and emulator test report, then deploy from a vetted checkout:

```bash
firebase login
firebase use elara-ab1aa
firebase emulators:exec --project demo-ui13-language "npm run test:rules"
# Only after standalone backend implementation and tests are actually in the repo:
firebase deploy --project elara-ab1aa --only firestore:rules,firestore:indexes,functions,storage
```

**Do not execute the above deployment against the current UI-only PR:** `npm run test:rules` is a proposed backend test command, **not** claimed to exist in current checkout. Validate scripts/deployment targets in the future Backend PR before use. Confirm Firestore indexes built, Functions healthy, and Rules allow/deny with two consenting accounts before enabling public UI. Without the owner's Firebase deployment permissions, stop here rather than claiming channels/challenges are live.
