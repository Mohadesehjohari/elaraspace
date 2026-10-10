# Friends UI reference specification — 2026-10-10

> Working spec, not acceptance evidence. Owner screenshots are the visual source of truth. Keep this feature on `feat/friends-reference-ui-20261010` and the PR **DRAFT**. No merge/deploy without owner approval, successful scoped tests, and coordination with concurrent Edit Profile work.

## Source and boundaries

Repo: `Mohadesehjohari/elaraspace`, default branch `main`. Existing page: `#social`; separate existing `#ranking` route. Social UI: `social-view.js`, `social-messaging-ui.js`, `social-groups-ui.js`, `social-clubs-ui.js`, `social-challenges-ui.js`, `friends-hub.css`. Existing services and identities: `elara-social.js`, `approved-profile-system.js` (read only for this work); Firebase security: `firestore.rules` and `storage.rules` (do not change/deploy without security/emulator approval).

No edits to Profile Edit, global Header, Sidebar, global mobile Bottom Navigation, Username identity, central Roadmap or Firebase Rules. `boot.js` is a shared script loader; avoid edits by enhancing already-loaded Social scripts/styles. All mutations must reuse the existing `ElaraSocial` DM, friend requests, groups, clubs, challenges, and `ElaraCollab` APIs.

## Image assignment (uploaded files)

| Reference image (received spelling) | Unique page/viewport |
| --- | --- |
| `دوستان(2).png` | Friends dashboard desktop (equivalent to requested `دوستان(1).png`) |
| `دوستان موبایل(1).png` | Friends dashboard mobile |
| `دوستان_تب چت ها(4).png` | Chats overview desktop |
| `دوستان_تب چت ها موبایل(1).png` | Chats overview mobile |
| `صفحه چت(1).png` | DM conversation desktop |
| `صفحه چت موبایل(1).png` | DM conversation mobile |
| `صفحه چت_ پروفایل باز(2).png` | Desktop DM with info panel open |
| `گروه ها(3).png` | Groups desktop |
| `گروه ها موبایل(1).png` | Groups mobile |
| `باشگاه(2).png` | Clubs desktop |
| `باشگاه موبایل(1).png` | Clubs mobile |
| `دوستان_ تب چالش ها(3).png` | Challenges desktop |
| `دوستان_تب چالش ها(1).png` | Challenges mobile |
| `رتبه بندی(2).png` | Ranking desktop, supplementary |
| `رتبه بندی موبایل.png` | Ranking mobile, supplementary |

The `Screenshot 2026-10-10 *.png` captures are **current live/before** screenshots for Social, Tasks, Books, Language and should not replace any desired target for a Friends subpage. Dimensions of desktop target assets: 1672 × 941; mobile target assets: 941 × 1672 (design reference canvas, not CSS viewport pixels).

## Page-specific composition

- **Friends**: unique wide hero, route-aware strip, six *real* summary statistics, real searchable/filterable friend cards (authenticated avatar/presence), suggestions, pending incoming/outgoing, consented activity, joined groups/clubs, short friend-ranking list. Do not show a fabricated `online` count or rank.
- **Chats**: its own hero, search and filters, authentic DM rows with last message, unread, timestamp, optional group conversations; desktop selected chat in center column; mobile full-width dedicated chat. Empty list = honest state.
- **Direct Message**: desktop three-region layout (conversations, message thread, toggleable profile info); mobile compact chat header, independently scrollable messages and composer safe from keyboard/bottom nav. Sending text must call `ElaraSocial.dm.send()`; preserve draft and verified acceptance/block/mute protections. Images/files/audio need proven safe storage and are **disabled** until then.
- **Groups**: group-only hero; `ElaraSocial.groups.list/create/invites/members/messages/send` are the source. Invite, manage, enter group chat remain functional. Do not infer public recommendation catalogs from private group membership.
- **Clubs**: separate club hero and ranking surface; real `ElaraSocial.clubs` membership/discovery/roles. Club rankings or XP earn tables must not be invented; show unsupported/empty until verified backend aggregate exists.
- **Challenges**: unique hero and counts only from verified challenge/collab rows; creation, accept/decline/cancel use existing service; progress labels must describe local/self-reported state when that is all that exists. No fabricated classes/tasks/XP history.
- **Activity / Requests / Ranking**: retain original working APIs and unified design, with no unrelated IA redesign.

## Visual geometry / responsive acceptance

Reference: navy #041529 to #0c2346; neon cyan borders; restrained violet/cyan glow; imagery as per target category, large corner radius ~14–20px, RTL cards. Desktop navigation layout with existing global sidebar and header. Responsive Social content should fit 320, 375, 390, 430, 768, 1440, 1648 CSS px **without document scrollWidth exceeding innerWidth**. At <= 768: cards stack, chat becomes one useful full-width thread with back control; preserve existing global mobile nav. A single page hero only. Long names, badges, tools, and messages wrap instead of overflowing; fixed composer must not cover the last message.

## Dependency and risk register

1. **DM delivery**: Existing `sendDm` performs `addDoc(conversations/{id}/messages)` then `updateDoc(conversations/{id})`. A failure on the second write may leave a real message stored but show a failed send in the UI. **Hypothesis only**, not a confirmed production root cause. Diagnose with two distinct authenticated accounts, Rules Emulator, browser network logs and a readback; do not weaken Firestore security to hide an error.
2. **Presence**: uses `presence/{uid}` Firestore heartbeat TTL 90s and friends-only access; private or unavailable presence must never display a green online dot. Permission denial should be treated as unknown.
3. **Club media**: `social-clubs-ui.js` explicitly defers Firebase Storage media. Do not advertise attachment uploads or render broken protected URLs.
4. **Group vs Club**: group messaging and club membership are distinct resources. Do not merge them, expose unapproved membership rosters or invent group recommendations.
5. **Testing limitations**: existing Playwright browser tests inject Social service stubs, which verify UI wiring only — **not** cross-account delivery or true Rules enforcement. Emulator security tests in `tests/social-strict-security-emulator.mjs` cover some adversarial access but do not prove all DM transactions.

## Evidence & gate (must be updated)

| Surface | Target screenshot | Required live proof | Status |
| --- | --- | --- | --- |
| Friends dashboard | desktop/mobile | screenshots at all target widths; friend request search + cancel/accept/decline | OPEN |
| Chats | desktop/mobile | real list, unread, empty state, selection, restore | OPEN |
| DM | desktop/mobile/profile panel | two-account send+receive and unread; responsive editor | OPEN |
| Groups | desktop/mobile | authenticated create/invite/membership/chat | OPEN |
| Clubs | desktop/mobile | role/membership/privacy/test of level gate | OPEN |
| Challenges | desktop/mobile | invite/response, privacy, validated progress | OPEN |
| Activity/Requests/Ranking | current plus ranking references | authentic values and states, no regression | OPEN |
| System-wide | 320,375,390,430,768,1440,1648 | Chromium screenshots, overflow check, bottom-nav overlap, visual owner signoff | OPEN |

Do not mark any category DONE without browser/emulator/owner visual evidence. A Draft PR is a review surface, not a release.
