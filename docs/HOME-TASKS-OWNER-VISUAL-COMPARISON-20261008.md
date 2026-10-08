# Owner reference comparison — Home + Tasks (2026-10-08)

Branch under review: `ui/home-tasks-reference-fidelity-20261008`, SHA `fdf1501099ff4fa988b81c59bf94415cffb63e9c`.

This is an explicit **visual reviewer finding**, not an automated claim of visual similarity. Reference: the two owner-uploaded Home and Tasks screenshots in the request, at approximately 1648 px desktop. Reviewed implementation screenshots: GitHub Actions run **37825617009**, artifact **11571545612**, `fidelity-baseline-home-1672.png`, `fidelity-baseline-tasks-1672.png`.

## Home — observed mismatches

| Area | Reference | Implementation at 1672 | Finding |
|---|---|---|---|
| Structure | Hero, one four-card dashboard row, one six-card quick-access row, bottom row | The intended three layers are present | Mostly close |
| Hero | Character/castle composition and larger readable right-side copy | Artwork is recognizable but character/castle placement, title density, and CTA differ | Needs crop/text layout comparison |
| Streak | Dominant orange flame, large count, seven clearly legible daily markers | Flame/count and seven markers exist, but small labels/circles and lower visual impact | Needs hierarchy enlargement |
| Today's Tasks | High contrast progress, compact readable completed/incomplete rows | Task content is real but appears more compressed and visually busy | Needs spacing and legibility pass |
| Wellness | Central bright teal progress ring and three lower metric tiles | Ring and metrics present but legibility/hierarchy weaker | Needs clearer central focus |
| Goals | Large target graphic, visible horizontal progress and legible real goals | Graphic and progress present, but title/chips/progress crowd near artwork | Needs spacing/crop pass |
| Quick Access | Six broad image-first cards with clear title/body/CTA | Six destinations and artwork visible, but cards shorter and labels much smaller | Needs typography and card proportion adjustment |
| Bottom | Ranking with prominent avatar podium, quote in historical image, achievements | Ranking currently uses a compact non-podium data presentation; central Habits intentionally replaces prohibited quote | Do NOT synthesize fake friends/rank; improve layout using real data and retain no Quote |
| Header/sidebar | Larger logo and clean blue navigation icons | Smaller header control/text and mixed decorative navigation family | Requires icon family/scale review |
| Explicit overrides | No Quote on Home; no Settings gear | Must retain both | Mandatory |

## Tasks — observed mismatches

| Area | Reference | Implementation at 1672 | Finding |
|---|---|---|---|
| Hero | Large coherent banner with flame/streak left, fantasy castle center, copy right | All three regions exist; overall banner visually more compressed than reference | Needs proportion/text hierarchy |
| Toolbar | Bigger evenly balanced RTL chips and prominent pink/purple Add Task | Functional layout exists but chips/labels are substantially smaller and have more empty space | Needs scale/spacing |
| Task rows | Tall readable scenic strips; moderate-depth foreground metadata | Category scenery and borders are present; text and all controls are significantly smaller than reference | **Major gap** |
| Checkbox | Large outlined/completed art with visible hitbox | Small right-edge squares in screenshot | **Major gap**; verify actual clickable size |
| Title and icon | Dominant right-side readable Persian title and distinct category icon | Titles/icons exist but appear cramped and less prominent | Needs stronger type scale |
| Metadata | Legible grouped priority, recurrence, status, category, XP | Compact badges exist but are tiny | Needs layout priorities |
| Completed | Distinct muted lower block with edit/delete actions | Present, simpler and smaller | Needs visual refinement without altering CRUD |
| Sidebar | Strong cyan active Tasks state, matching logo/icon family with Home | Blue active state visible, icon family remains visually mixed | Needs common shell review |

## Non-negotiable verification before merge

1. Compare new desktop Home and Tasks screenshots visually with owner references, including image placement, density, typographic hierarchy and row/card proportions. Do not rely on DOM-only checks.
2. Keep screenshots as CI artifacts at desktop and 320/375/390/430/768/1440.
3. Verify actual owner files decode and computed CSS backgrounds use intended assets.
4. Verify functional CRUD, toggle, priority, recurrence, due date, linked/shared tasks, six-width no overflow, P0, Profile/Username, Firestore emulator and Social startup on **final** SHA.
5. **Do not merge PR #22 until these visible gaps are resolved**. No Firestore, Storage, Social or other page changes.

## Current evidence

- Actions **37825617009**: visual screenshot generation + regression successful, but **automated success does not imply reference-quality visual PASS**.
- Actions **37825624529**: P0 Fast successful.
- Actions **37825624631**: Home owner browser gate successful.
- PR **#22** remains draft; no production merge or Pages release performed from this branch.
