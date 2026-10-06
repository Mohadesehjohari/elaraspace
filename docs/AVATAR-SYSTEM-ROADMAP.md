# Elara Avatar System — Production Roadmap
**Canonical avatar roadmap — 2026-10-05**

> این سند مرجع اصلی طراحی، مدل‌سازی، Rig، Hair Physics، Face Customization، Web Runtime و Store/Skins برای آواتار سه‌بعدی Elara است.
> هر تصمیم قدیمی که با این سند تعارض دارد، برای Avatar System از این سند تبعیت می‌کند.

## 0) تصمیم محصول

مدل procedural فعلی فقط **Prototype فنی** است و Art Base نهایی محسوب نمی‌شود.

### Art Direction تأییدشده
مرجع بصری نهایی، دو turnaround تأییدشدهٔ 2026-10-05 است:
- Female: adult, anime / semi-real, fashion-model proportions, rose/auburn layered hair, refined face.
- Male: adult, bishonen / semi-real, slim fashion-model proportions, masculine face, layered auburn hair.

### Non-goals
- بدن ساخته‌شده از sphere/cylinder/lathe به‌عنوان مدل Production ممنوع.
- موهای ribbon/primitive به‌عنوان Hair Production ممنوع.
- Chibi / toy-like / plastic look ممنوع.
- تغییر ظاهر برای راحتی فنی نباید Art Direction را خراب کند.

---

# 1) Target Architecture

## Runtime
- Three.js
- VRM 1.x / GLB
- `@pixiv/three-vrm`
- transparent WebGL canvas inside Profile
- desktop first, mobile second
- mouse/touch orbit + bounded zoom
- idle / emote / dance clips
- Spring Bones / colliders for hair and selected cosmetics

## Production asset contract
Expected files:

```
assets/avatar/
  bases/
    elara-female-v1.vrm
    elara-male-v1.vrm
  animations/
    idle-neutral.glb
    idle-soft.glb
    dance-01.glb
  cosmetics/
    hair/
    tops/
    bottoms/
    dresses/
    shoes/
    accessories/
  textures/
```

Runtime state is separate from meshes:

```json
{
  "base": "female-v1",
  "facePreset": "default",
  "morphs": {},
  "equipped": {
    "hair": "female-hair-default-v1",
    "outfit": null,
    "shoes": null,
    "accessories": []
  }
}
```

---

# 2) Female Production Base — P0

## Body
- mature adult silhouette
- elegant fashion-model proportions
- long legs and arms
- narrow waist
- natural shoulder/neck transition
- correct chest placement integrated into torso topology
- natural pelvis/hip/glute transition
- knees, ankles, wrists and elbows anatomically believable
- hands and feet modeled as real topology, not primitive blocks
- neutral seamless mannequin base layer; no explicit anatomy

## Face
The face is a first-class production asset, not an afterthought.

Required:
- clean anime/semi-real facial topology
- eyelids with enough loops for blink and eye-size morphs
- nose bridge / tip / nostril-supporting topology
- mouth loops supporting width/fullness/smile
- jaw/chin loops
- cheeks with controlled volume
- separated eyeballs with iris/cornea material structure
- lashes and brows as dedicated geometry/cards

## Default face morph targets
Minimum v1 set:
- `faceWidth`
- `jawWidth`
- `jawAngle`
- `chinLength`
- `chinWidth`
- `cheekVolume`
- `eyeSize`
- `eyeSpacing`
- `eyeTilt`
- `eyeHeight`
- `noseWidth`
- `noseLength`
- `noseBridge`
- `noseTip`
- `mouthWidth`
- `lipFullness`
- `browHeight`

Expression keys:
- blink L/R
- smile
- soft smile
- angry
- sad
- surprised
- relaxed

## Hair
Default female hair must match the approved layered shoulder-length reference.

Production requirements:
- scalp/base cap
- large silhouette clumps
- medium secondary clumps
- selected thin flyaway cards/curves
- no single rigid helmet look
- no flat ribbon strips as the visible final solution
- motion chains divided by region: front locks, side locks, back mass, lower tips
- collision against head, neck, shoulders and upper torso
- root motion low, tip motion higher
- damping tuned to avoid jelly/rubber behavior

---

# 3) Male Production Base — P0

Same technical quality as Female, not a lower-detail derivative.

Art requirements:
- adult bishonen / semi-real
- slim body
- shoulders slightly wider than Female
- defined but not bodybuilder chest
- stronger jaw/nose options than Female
- layered medium auburn hair
- default silhouette elegant; muscular body becomes a later preset, not the base

Initial male body presets after v1:
- Slim
- Athletic
- Muscular

---

# 4) Topology / Performance Budgets

These are quality targets, not hard caps.

## Desktop LOD0
- body + face: ~35k–55k triangles
- default hair: ~20k–40k triangles
- eyes/lashes/brows/teeth optional: ~8k–15k
- total default avatar target: ~70k–110k triangles

## Mobile LOD1 — later
- target total: ~35k–60k triangles

## Textures
Desktop v1:
- face/body: 2K–4K where visibly useful
- hair: 2K
- eyes: 1K–2K
- ORM/normal maps only when they visibly improve quality

Later optimization:
- KTX2/Basis
- Meshopt
- optional Draco only if load-time measurements justify it

---

# 5) Rig Contract

Humanoid rig must map cleanly to VRM humanoid bones.

Required:
- hips
- spine
- chest
- upperChest when useful
- neck
- head
- upper/lower arms
- hands
- upper/lower legs
- feet
- toes optional
- eye bones optional if look-at uses them

Skinning rules:
- shoulders must survive arm raise without collapsing
- elbows/knees need supporting topology
- pelvis/crotch weighting must survive walking/dance
- chest deformation must not shear unnaturally
- wrists/ankles need clean roll

QA poses:
- A-pose
- arms up
- elbow 90°
- squat
- one-leg balance
- torso twist
- dance stress pose

---

# 6) Hair Physics Contract

We use physics only where motion adds quality.

Each chain gets:
- stiffness
- gravity
- drag
- hit radius
- collider groups

Rules:
- roots should feel anchored
- front locks must not penetrate eyes/face
- side hair must collide with shoulders
- back hair must not pass through spine/upper torso
- no perpetual oscillation after user stops rotating
- frame-rate independent simulation
- Reduced Motion can lower secondary motion

Acceptance:
- 360° quick drag
- abrupt stop
- idle head turn
- dance clip
- 30/60/120 fps comparisons

---

# 7) Materials / Rendering

Goal: premium anime/semi-real, not plastic PBR.

Skin:
- soft roughness
- subtle normal detail
- no wet/plastic specular
- face shading kept clean

Hair:
- directional highlight
- controlled specular
- two-sided cards only where necessary
- color customizable without destroying highlights

Eyes:
- separate sclera / iris feel
- subtle wetness/catchlight
- stable under profile lighting

Lighting in Profile:
- warm key
- cool fill
- purple/blue rim consistent with Elara UI
- transparent renderer; UI background remains visible

---

# 8) Web Runtime Milestones

## AVATAR-RUNTIME-01 — DONE / prototype
- 3D stage in desktop Profile
- drag rotation
- zoom
- idle loop
- selection by stored profile sex
- animation hook

## ART-PIPELINE-01 — ACTIVE
- Procedural Blender blockout rejected after visual review on 2026-10-06.
- `avatar/blender/elara_female_reference_workspace.py` is now the active Blender starting point.
- The active workflow is reference-driven sculpt/retopo; no procedural hair/body output may be promoted to Production.

## AVATAR-RUNTIME-02 — NEXT
Replace procedural visual mesh with file-based VRM loader while preserving the same Profile contract.

Acceptance:
- external VRM loads
- fallback state if asset missing
- no procedural Production avatar shown when Production asset exists
- model centered and framed automatically
- cleanup/dispose on drawer lifecycle
- hair spring update in render loop

## AVATAR-RUNTIME-03
- expression manager
- look-at
- idle animation mixer
- animation crossfade

## AVATAR-RUNTIME-04
- customization state + morph sliders

## AVATAR-RUNTIME-05
- cosmetics attachment/equip contract

---

# 9) Customization Milestones

## Face Studio v1
Sliders:
- nose width/length/bridge/tip
- eye size/spacing/tilt
- jaw width/angle
- chin width/length
- cheek volume
- mouth width
- lip fullness
- brow height

Rules:
- sliders are clamped to artist-approved ranges
- combinations must be stress-tested
- no slider may create broken eyelids/lips/normals
- save numeric morph state, not generated mesh files per user

## Body Studio v2
- preset-first
- limited morphs only after clothing compatibility is proven

---

# 10) Store / Wardrobe Contract

Do not build the first production catalog until the base body + rig is frozen.

Phase 1:
- full outfits
- hair
- shoes
- accessories

Phase 2:
- modular tops/bottoms

Every wearable must declare:
- compatible base(s)
- skeleton version
- hidden body regions
- attachment bones
- physics groups
- LOD availability

Ownership remains server-authoritative. Local storage can only cache.

---

# 11) Dance / Emotes

Yes, dance is part of the planned system.

Requirements:
- retargeted to Elara humanoid rig
- animation root motion disabled or intentionally handled in Profile
- hair physics runs while dance plays
- crossfade Idle → Dance → Idle
- animation can be interrupted safely
- later Store can sell emotes/dances independently from outfits

---

# 12) Blender Production Pipeline

Canonical sequence:

1. Import approved front / 3-4 / side / back references.
2. Blockout body and head in neutral A-pose.
3. Sculpt silhouette and anatomical landmarks.
4. Retopology with deformation loops.
5. UV.
6. Face detailing and default neutral expression.
7. Create shape keys.
8. Eyes / lashes / brows.
9. Hair: scalp → primary clumps → secondary clumps → physics groups.
10. Humanoid rig.
11. Weight paint.
12. Corrective shape keys where required.
13. Material setup.
14. Pose stress tests.
15. Export GLB/VRM candidate.
16. Browser QA in Elara Profile.
17. Iterate until visual sign-off.
18. Freeze `skeletonVersion` and begin Store assets.

---

# 13) Production Gates

A base is **not Production** until all are true:

- [ ] front silhouette matches approved reference
- [ ] 3/4 silhouette matches
- [ ] side silhouette matches
- [ ] back silhouette matches
- [ ] face close-up approved
- [ ] hands/feet no placeholder geometry
- [ ] chest/pelvis topology integrated naturally
- [ ] eyes blink without clipping
- [ ] 17+ face morphs pass QA
- [ ] shoulder/elbow/knee deformation pass
- [ ] hair physics pass 360 drag + dance stress test
- [ ] no major body/hair clipping in neutral base
- [ ] VRM loads in current Profile runtime
- [ ] desktop performance measured
- [ ] fallback/error state measured
- [ ] user visual approval

---

# 14) Repository Layout

```
avatar/
  README.md
  avatar-manifest.json
  blender/
    README.md
    elara_avatar_setup.py
    elara_avatar_validate.py
  reference/
    README.md
  source/
    README.md

assets/avatar/
  bases/
  animations/
  cosmetics/
```

Binary source files such as `.blend` are not required to ship to production. Store source files only if repository size/LFS policy is agreed.

---

# 15) Immediate Work Queue

1. **[DONE]** Freeze approved Female/Male art direction.
2. **[DONE]** Write production topology/rig/hair/customization contract.
3. **[DONE]** Add Blender setup and validation scripts.
4. **[NEXT]** Build Female high-quality base in Blender from approved turnaround.
5. **[NEXT]** Female face sign-off before rig.
6. **[NEXT]** Female hair production + motion chains.
7. **[NEXT]** Female rig + morphs + browser export.
8. **[NEXT]** Replace procedural runtime with VRM loader.
9. Male repeats the same quality gates.
10. Add customization UI only after base topology is frozen.

---

# 16) Ownership / Change Control

- This file is the canonical Avatar roadmap.
- Do not mark a visual item DONE because code exists.
- Production visual acceptance requires browser screenshots and human visual approval.
- Do not regress to procedural primitives for final art.
- Do not start paid Store clothing before skeleton/base version is frozen.
