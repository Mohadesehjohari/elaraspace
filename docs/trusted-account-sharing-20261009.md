# Trusted account pairing — distinct from expiring collaboration links

## What the user asked for

Account A and B mutually approve a **one-time trusted relationship**. Afterward, when A explicitly chooses to Share a Task, Habit, Goal, Language Class, or Leitner Word **to B**, the shared item appears automatically in B's canonical local collection. No per-item Accept dialog for this pair. B can reciprocate.

An unshared private item remains private. A normal friend without an active trusted pair still receives the existing per-item collaboration invitation.

## Implementation

- `accountLinks/{sortedUidA}__{sortedUidB}`: participant-only read, mutually activated; request by either accepted friend, acceptance only by the other, revocable by either, re-request requires fresh mutual approval.
- `trustedDeliveries/{spaceId}__{recipientUid}`: owner creates *only on explicit Share*. Immutable sender, target, space and kind; link reference validates active mutual trust and no block in Firestore Security Rules.
- Recipient's verified session subscribes to only `where('to','==',uid)`. For each delivery, the recipient creates their own `collabSpaces/{spaceId}/members/{uid}` authorization under a Rules-gated trusted-delivery clause. Then existing `materialize(space)` reuses `collabSpaceId` to deduplicate Tasks, Habits, Goals, Language Classes, and Leitner Words and synchronize progress. Feed resumes on reconnect/reload.
- Existing `collabInvites` remains unchanged for all non-trusted friends; `collabLinks` is not changed here. PR #24 is a separate expiring-link security enhancement, not the account-link feature.
- Existing memberships remain after disconnect; no **new** delivery is authorized when trust is revoked or blocking applies.

## Release gates

1. GitHub Actions must PASS `tests/trusted-account-client.test.mjs` and the multi-user Firestore/Storage Rules Emulator suite, including forged activation, private item access, unrelated users, blocks, disconnect, all five entity kinds, reciprocal delivery and normal friend invitations.
2. Verify the actual Firebase project and deploy the reviewed Rules **first** using authorized Firebase credentials. GitHub Pages does not deploy Firestore Rules.
3. Deploy the matching tested JS and loader cache version, then re-run home-first and social/profile regression.
4. Conduct end-to-end smoke using real disposable verified Firebase test accounts A and B: establish consent, confirm every explicit shared type auto appears, confirm no private data arrives, reload/offline-reconnect, block/disconnect and ensure new shares stop. Never use production personal data for testing.
5. Do NOT merge this Draft PR, deploy Rules, or claim feature live until deployment coordination and production smoke are completed.

## Limits and follow-ups

- This does not merge two Firebase Auth identities or combine private personal records. Accounts stay separate.
- Offline recipients obtain new items on reconnect to Firestore; an offline browser cannot be externally modified.
- Delivered items remain in the existing canonical ElaraCollab local entity model with the original shared-space identity.
- Blocking/disconnecting prevents **future** auto-delivery; previously accepted shared memberships are not automatically deleted or overwritten.
- Expiring join-link PR #24 and this PR touch some of the same Rules/source files. They must be reconciled and retested against an identical tested client+Rules revision before either release.
