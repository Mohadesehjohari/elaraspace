# Elara Fox companion / reward UX

15 user-uploaded WebP assets: `assets/ui/fox-{sleep,sport,surprised,tasks,thoughtful,celebrate,focus,goals,habits,language,library,loved,mission,progress,sad}.webp`.
Fallback vector: `assets/mascot/fox-fallback.svg`.

**Placement:** decorative mascot on Home, Language, Leitner, Library, Wellness, Missions and Tasks/Habits/Goals.
No replacement of functional icons, charts or canonical layouts.

**Canonical events (no new XP awarded):**
- `elara:leitner-review-committed`: due word reviewed and due count reaches zero.
- `elara:mission-claimed`: show short fox toast for a real claimed mission.
- `elara:data-changed`: Level Up via `ElaraLevels` and true XP increase.
- `elara:domain-milestone`: finished book, goal, habit streak, 20-minute workout.
- `elara:fox-focus-completed`: first completion of a real Focus session.

**Controls:** Settings switches for mascot and celebrations saved to `elara_fox_options_v1`, plus preview that awards zero XP.
Popups are real HTML with escape handling, focus trap, focus restore, RTL/English and reduced motion support.
Events read existing `elara_space_v1` state; UI code must never write XP or grant achievements.
The automatic test `node tests/fox-rewards-contract.test.mjs` verifies references and all WebP headers.
