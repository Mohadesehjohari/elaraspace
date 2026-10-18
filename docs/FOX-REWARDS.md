# Elara Fox companion / reward UX

15 user-uploaded WebP assets: `assets/ui/fox-{sleep,sport,surprised,tasks,thoughtful,celebrate,focus,goals,habits,language,library,loved,mission,progress,sad}.webp`.
Fallback vector: `assets/mascot/fox-fallback.svg`.

**Placement (updated 2026-10-17):** No persistent mascot in any page banner, heading, home card, or Missions level card. The user reviewed screenshots and removed static placements because the art competes with the cinematic visual design. Mascot shows only for earned milestones (Leitner completed, mission claim, level up, focus complete, finished book/goal/streak/workout) and within optional settings preview. No functional icons or canonical layout are modified.

**Canonical events (no new XP awarded):**
- `elara:leitner-review-committed`: due word reviewed and due count reaches zero.
- `elara:mission-claimed`: show interactive fox reward popup for real claimed missions, grouping simultaneous claims and adding their already-granted XP (no duplicate grant).
- `elara:data-changed`: Level Up via `ElaraLevels` and true XP increase.
- `elara:domain-milestone`: finished book, goal, habit streak, 20-minute workout.
- `elara:fox-focus-completed`: first completion of a real Focus session.

**Controls:** Settings switches for reactions and celebrations saved to `elara_fox_options_v1`, plus preview that awards zero XP.
Popups are real HTML with escape handling, focus trap, focus restore, RTL/English and reduced motion support.
Events read existing `elara_space_v1` state; UI code must never write XP or grant achievements.
The automatic test `node tests/fox-rewards-contract.test.mjs` verifies references and all WebP headers.


## Grouped mission-claim popup & variants (2026-10-17)

- When mission rewards are claimed by canonical RPG logic, a real HTML modal shows
  mission names, confirmed XP awarded by that claim, next mission and a link to Missions.
  Multiple claims made in the same tick are **grouped into one popup**. The previous
  small toast is only a fallback if the shared reward engine is absent.
- Distinct fox moments: mission completion, Level Up, Leitner review finished, Focus
  session, finished book, completed goal, habit streak, 5/10 tasks, hydration,
  and 20/45/60-minute workout threshold. Tasks 1 and 3 reuse mission popups;
  lower workout thresholds are suppressed when one logged activity passes several.
- The Settings panel offers six clickable, zero-XP UI previews to check each style.
  All WebPs are used only on earned feedback or in Settings, not on main page banners.
- The UI never writes XP, does not trigger events just because a page was re-rendered,
  respects opt-out, uses accessible dialogs and honors reduced-motion.
- Regression: node tests/fox-mission-batch.test.mjs (actual mission event batching/XP),
  node tests/fox-rewards-contract.test.mjs; real browser tests are available via
  scoped GitHub Actions workflow.


## Claimable reward ceremony (2026-10-18)

- The new `elara-fox-prize.js` and `.css` enhance the existing reward modal with a
  high-quality fox, an animated jewel/keepsake card and a real Collect button.
- The first Collect click registers keepsake star(s) and shows a collected confirmation.
  The second click follows the existing route or dismisses the popup.
- Closing an uncollected popup retains the item in Settings > Star vault for later.
- Device-local per-account cosmetic store: `elara_fox_prize_v1:<uid>` with pending,
  claimed and idempotency keys. Stars are collectibles, NOT a spendable currency,
  and are not yet synchronized to cloud accounts or across browsers.
- Claimed XP from `rpg.js` is shown as **already credited**, never paid twice;
  Leitner and Focus display only XP supplied by canonical committed events.
- Quiet Web Audio chimes run after a user clicks Collect and only when sound
  is enabled in Settings; sound defaults off. Animation toggle defaults on
  but respects `prefers-reduced-motion` and may be turned off.
- Settings previews never award XP or collectibles. The fox does not return
  to fixed cinematic banners.
- Tests include `tests/fox-prize-claim.test.mjs` and mobile/desktop Playwright
  acceptance, configured in GitHub Actions.

## Visual redesign — two-stage reward reveal (2026-10-19)

The existing collectible-star, locally persisted and idempotent claim flow remains unchanged.
The modal now has two visibly distinct states:

- **Reward ready:** a much larger fox, closed CSS treasure chest, two-step progress strip, strong gold
  typography and jewel card. The user must explicitly choose “Collect reward”.
- **Collected:** only after the persisted claim succeeds, the chest lid opens, a large star rises,
  the fox art swaps to `fox-celebrate.webp`, the title and CTA change, the scene becomes mint-gold,
  and particles briefly burst. A second CTA click navigates or closes; there is no second claim.
- On a short or mobile viewport the illustration, chest and content scale down and stay inside a
  scrollable dialog. Keyboard escape, focus restoration, reduced-motion and the optional sound
  settings are unchanged. No static page mascot has been reintroduced.
- QA contracts include ready/collected phase, treasure geometry in a real 390px and 1440px browser,
  collected-fox asset, XP invariance and local collectible idempotency.
