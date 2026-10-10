# FRIENDS UI — Reference Specification and Implementation Gate

Status: **reference mapping and dependency audit only** (NOT UI complete; NOT release-approved).  
Scope: Friends/Social-owned presentation only. Do not modify Profile Editor, central identity/username, global header/sidebar/mobile navigation, central roadmaps, or Firebase Rules/Indexes/Functions/Storage without a separate security-reviewed change.

## Source references (2026-10-10 uploads)

Uploaded file names may contain numeric suffixes; identify images by content rather than exact suffix. Screenshots labeled `Screenshot 2026-10-10...` depict the currently deployed UI and are **baselines**, not target mockups.

| Surface | Desktop reference | Mobile reference | Distinctive layout |
| --- | --- | --- | --- |
| Friends dashboard | `دوستان(2).png` | `دوستان موبایل(1).png` | Friends-specific panoramic hero, seven navigation tiles, six KPIs, friend grid/list, suggestions, requests, activities, groups/clubs, leaderboard |
| Chats index | `دوستان_تب چت ها(4).png` | `دوستان_تب چت ها موبایل(1).png` | Conversation list and filters, preview/selected chat, responsive independent conversation |
| DM conversation | `صفحه چت(1).png` | `صفحه چت موبایل(1).png` | Chat list + message pane; back navigation and fixed composer on mobile |
| DM profile expanded | `صفحه چت_ پروفایل باز(2).png` | No separate reference | Third, toggleable participant-information pane |
| Groups | `گروه ها(3).png` | `گروه ها موبایل(1).png` | Membership list, discovery, filters, suggestions, active groups and invitations |
| Clubs | `باشگاه(2).png` | `باشگاه موبایل(1).png` | Special club podium/list, club tasks, memberships and discovery, distinct from groups |
| Challenges | `دوستان_تب چالش ها(1).png` | `دوستان_ تب چالش ها(3).png` | KPI strip, challenge cards, collaboration tasks/classes, rankings and invites |
| Ranking (additional provided references) | `رتبه بندی(2).png` | `رتبه بندی موبایل.png` | Dedicated ranking podium, rewards, personal status and multiple leaderboard sections |
| Activity / requests | No dedicated target screenshot | No dedicated target screenshot | Preserve existing IA; integrate visual tokens without inventing new page content |

## Current implementation / ownership evidence

- `elara-social.js` is the Firestore-backed social service. `window.ElaraSocial` exposes authenticated friends, requests, activities, blocked/muted sets, Presence, DM, groups, clubs, challenges and profile operations.
- `window.ElaraSocial.dm` exposes `list`, `messages`, `listen`, `send` and `markRead`. It stores messages under `conversations/{id}/messages`, and attempts an additional parent conversation update.
- `elara-social.js` Presence writes `presence/{uid}` with timestamp and reads per-friend listeners, using a 90-second TTL and 45-second heartbeat. A valid timestamp indicates heartbeat freshness, not guaranteed realtime connectivity; do not treat missing/denied visibility as offline.
- `friends-hub.css` currently has overlapping social/ranking tab styles and prominent 150px artwork tiles. Mobile overrides reach 126–138px; references instead use compact, horizontal navigation controls. Modifying shared ranking selectors or global navigation is outside safe scope.
- `elara-page.js`, `reference-exact-pass-2026.css`, and `index.html` also participate in page composition/styles. Inspect their Social hooks and cascade before isolated updates; coordinate any required shared edit.
- `docs/social-cutover-plan.md` marks Group/Club/Challenge mutations as guarded during a Rules/schema cutover and describes a strict release sequence. No UI implementation should bypass this guard.
- Firebase emulator declarations exist in `firebase.json` (Firestore and Storage), but their presence **does not** prove two-account tests were executed.

## Design contracts

- Use RTL with explicit direction for timestamps and mixed-language identifiers. Navy panels, thin blue/cyan borders, controlled glow, readable high-contrast Farsi typography, consistent 12–18px corner radii.
- Exactly one primary hero per tab (when referenced); tab selection reflects the actual URL and survives reload/back/forward.
- All content uses authorized account-backed reads. Never render mock names, messages, avatar portraits, XP, member totals, ranks, online flags or unread counts in production. Missing data gets an accessible truthful empty state.
- Actions must invoke existing permissions-aware services and expose real pending, success and error states. For forbidden flows, disable with an explicit reason rather than provide fake feedback.
- Preserve existing global mobile navigation; do not rebuild it from the concept images.
- `min-width:0` for grid children; wrapping where required; no page-level horizontal overflow. Chat history is the sole vertical scroll container in the active mobile conversation.

## Visual measurement and validation matrix

Target viewports: **320, 375, 390, 430, 768, 1440, 1648 CSS px**. For each surface and viewport: capture real Chromium screenshots with matching account/data state, compare to target image by hero aspect, top padding, tab active position, card grouping, column proportion, type scale, CTA location and bottom-navigation collision. The references are not browser screenshots at matching viewport CSS widths; avoid claiming pixel-exact comparison until both are normalized and reviewed. Record measured deltas in a follow-up per-tab report.

Expected desktop structures: Friends dashboard multiple dashboard columns; chats two primary columns; active DM two columns with optional third participant pane; groups content/discovery columns; clubs ranking/task/discovery columns; challenges active-challenge, collaboration, ranking columns. Mobile stacks or uses a dedicated conversation screen rather than uniformly collapsing all desktop cards.

## DM operational investigation — required before release

1. Prepare two separately authenticated verified **test** accounts in the correct Firebase project, both with explicit mutual accepted friendship, and one blocked/nonfriend control pair. Do not log personal message bodies, tokens or raw identities.
2. Confirm published Firestore Rules SHA/revision and backend data schema. Compare `ensureDm`, `sendDm`, conversation creation, `reads`, and `messages` Rules; run emulator allow/deny tests (including cross-account nonmembers).
3. Observe whether `addDoc(messages)` succeeds but `updateDoc(conversation)` fails: current code uses two sequential writes, so a failed second write may report a failure even after the message was persisted. **Hypothesis only, not verified root cause.**
4. Test message delivery in both directions, live listeners, reload persistence, unread/read receipts, blocked restrictions, unauthorized reads and duplicate-send retry behavior. Never claim DM repaired based solely on a client smoke test.
5. Presence must be checked against actually published Rules and two clients; record heartbeat, visibility, background-tab and network-disconnect behaviors. Use unknown/unavailable when permission is denied or data is stale.

## Tabs / acceptance gates

| Tab | Real-data integration | UI reference | Acceptance evidence |
| --- | --- | --- | --- |
| Friends | Existing friendRequests/social state | Desktop/mobile dashboard | Search, filter, presence labels, accepted/declined/cancelled state across two users |
| Chats | Existing conversations and reads | List desktop/mobile | Search, last message, unread, desktop selection, mobile open/back |
| DM | Existing `ElaraSocial.dm` | Desktop/mobile/expanded info | Authorized two-user send/receive, persistence, attachment gating, privacy |
| Groups | Existing groupMembership and chat service | Desktop/mobile groups | Current guard honored; membership and messaging verified |
| Clubs | Separate clubs/membership/roles service | Desktop/mobile clubs | Owner/assistant/member and Rules/access verified |
| Challenges | Existing challenge/collaboration service | Desktop/mobile challenges | Invites, rate/privacy/block and mutation guard verified |
| Activities | Existing activity records | No custom reference | No leakage; preserve published capability |
| Requests | Existing friendship/invitation services | No custom reference | Accept/reject/cancel and unread consistent |
| Ranking | Existing ranking service | Additional desktop/mobile podiums | No fabricated score, XP, or rank |

## Release gates (not yet satisfied)

- Isolated implementation changes plus test updates, with a dedicated branch and **Draft** PR.
- Screenshot evidence at all seven widths, including no body horizontal overflow and no mobile keyboard/composer/dock collision.
- Browser automation for navigation, route persistence, actions and errors; emulator Rules coverage and two-account DM/Presence tests.
- Owner visual signoff; coordinate with concurrent Profile Editor branch.
- Review and record any shared-file changes before they are made. **Never merge, migrate or deploy from this spec.**
