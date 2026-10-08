# Controlled Social Cutover — Stop Point A

## Release constraints
- Source production main: `57914b90966e929e760a71a48ec25dd5d5e6c329`
- Strict Social Closure candidate: `c1027003a06ffb86cd7ef92947a8b352be873fb1` (PR #15, Draft)
- Bridge PR #16 is **UNSHIPPABLE BY DESIGN**, see Actions run `37720289928`.
- Never deploy Bridge Rules. Guard is temporary client UX safety, not a security barrier.
- Never deploy strict Rules before guard is merged, Pages is verified and read-only audit reviewed.

## CUTOVER_BLOCKED_MUTATIONS
Guarded in current production `elara-social.js` before any Firestore mutation:

| Family | Old production mutation | Strict Social incompatibility |
| --- | --- | --- |
| Groups | `createGroup` | missing required `status: active` |
| Groups | `sendGroup` | parent/updated legacy Group without lifecycle `status`; message requires active group |
| Groups | `leaveGroup` | membership change during schema cutover; parent legacy handling may be inconsistent |
| Clubs | `createClub` | missing `membershipMode`, `memberCount`, `status` and other mandatory fields |
| Clubs | `inviteClub`, `decideClubInvite` | old invite shape and acceptance transaction do not update new parent membership counters |
| Clubs | `setClubAssistant` | parent/role lifecycle and counters differ |
| Clubs | `createClubPost` | new active/lifecycle validation needs migrated parent |
| Clubs | `voteClubPoll` | temporarily frozen with Club workflow until migration to avoid mixed-era writes |
| Challenges | `createChallenge` | lacks mode/attempt/originId/updatedAt and atomic rate-limit record |
| Challenges | `respondChallenge`, `cancelChallenge` | new response requires updatedAt/transition semantics; legacy delete not accepted |
| Challenges | `challengeQuick` | frozen with Challenge lifecycle during migration |

Other contracts compared:
- Profile/username claim and friendRequests stay available (unchanged old write shape).
- DM conversation/message send stays available for nonblocked friends; strict rules add read receipts but do not require old clients to write them.
- Social Stats, Page/activity and profile update mutations retain old permitted shapes.
- Old collaboration task/habit/class/Leitner writes use existing owner/invite/member paths; new Goal kind is additive.
- New Presence/Mute/Report and Group invite/read paths do not exist in the old client and therefore do not need legacy write blocking.
- Existing Storage paths remain available; new clubMedia is additive after cutover.

Guarded UI lists stay readable. Disabled mutation controls show a visible Persian maintenance notice; guarded service methods throw before contacting Firebase.

## Production data audit and migration
The scanner uses ADC, Firebase Admin and project `elara-ab1aa`, reads aggregates only, and never prints document IDs/content. Read-only audit is `tools/social-cutover-audit.mjs`.
Migration is `tools/social-cutover-migrate.mjs`: default DRY RUN; production writes require BOTH `--apply` and `ELARA_SOCIAL_CUTOVER_CONFIRM=APPLY_SOCIAL_CUTOVER`.
Migration patches do not change Group owner, timestamps, membership, or messages. Club counters derive from actual member documents and preserve invite-only membership; `lastMembershipAction=migration` is an explicit neutral marker. Challenge backfill leaves original status and expiry untouched, including already expired pending challenges.

## Release sequence
1. Green Guard browser, migration and P0 regressions, then merge Guard only.
2. Verify exact Pages deployment + live Guard SHA.
3. Owner runs independent read-only audit, returns redacted aggregate report.
4. Supervisor reviews dry run and separately approves any migration apply.
5. Post-migration verify final strict Social Rules, then owner deploys only strict Firestore+Storage Rules.
6. Merge updated PR #15 Social client, verify Pages and two-account/mobile acceptance.
7. Remove temporary guard only after real acceptance.

Stop Point A prohibits data migration, strict Rules deploy, Social Closure merge or Bridge merge.
