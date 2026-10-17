# Elara Fox companion / reward UX

15 user-uploaded WebP assets: `assets/ui/fox-{sleep,sport,surprised,tasks,thoughtful,celebrate,focus,goals,habits,language,library,loved,mission,progress,sad}.webp`.
Fallback vector: `assets/mascot/fox-fallback.svg`.

**Placement (updated 2026-10-17):** No persistent mascot in any page banner, heading, home card, or Missions level card. The user reviewed screenshots and removed static placements because the art competes with the cinematic visual design. Mascot shows only for earned milestones (Leitner completed, mission claim, level up, focus complete, finished book/goal/streak/workout) and within optional settings preview. No functional icons or canonical layout are modified.

**Canonical events (no new XP awarded):**
- `elara:leitner-review-committed`: due word reviewed and due count reaches zero.
- `elara:mission-claimed`: show short fox toast for a real claimed mission.
- `elara:data-changed`: Level Up via `ElaraLevels` and true XP increase.
- `elara:domain-milestone`: finished book, goal, habit streak, 20-minute workout.
- `elara:fox-focus-completed`: first completion of a real Focus session.

**Controls:** Settings switches for reactions and celebrations saved to `elara_fox_options_v1`, plus preview that awards zero XP.
Popups are real HTML with escape handling, focus trap, focus restore, RTL/English and reduced motion support.
Events read existing `elara_space_v1` state; UI code must never write XP or grant achievements.
The automatic test `node tests/fox-rewards-contract.test.mjs` verifies references and all WebP headers.
