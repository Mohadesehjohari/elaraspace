# Elara Avatar — Blender Handoff

You do **not** need to improvise the modeling pipeline.

Use the approved Female/Male turnaround as image planes and follow:
[../../docs/AVATAR-SYSTEM-ROADMAP.md](../../docs/AVATAR-SYSTEM-ROADMAP.md)

## Recommended Blender setup
- Blender 4.x
- Scene units: Metric, meters
- Modeling pose: relaxed A-pose
- Apply object scale before final rig/export
- Keep body, eyes, brows/lashes, hair and base suit logically separated
- Keep object and shape-key names stable once runtime integration begins

Run:
- `elara_avatar_setup.py` once in a fresh file to create the project collections and metadata.
- Save the approved turnaround PNGs under `avatar/reference/` using the canonical filenames, then run `elara_reference_setup.py` to load them as protected reference empties.
- `elara_avatar_validate.py` before every candidate export.

## What the artist/user must do manually
High-quality sculpting, retopology, hair art and weight painting are visual craft steps and cannot be replaced by the old procedural website mesh.

The minimum manual checkpoints are:
1. body/head blockout
2. face close-up approval
3. retopology
4. hair grooming/clump modeling
5. rig/weights cleanup
6. shape-key sculpting

Everything after export—web loader, camera, physics update loop, customization state, Store integration and browser QA—belongs to the Elara web implementation.

## Export
First candidate:
- GLB or VRM
- no unapplied scale
- no missing textures
- humanoid bone mapping complete
- neutral expression
- A-pose bind
- no animation baked into base unless intentional


## Automated Female blockout
Run `elara_female_production_blockout.py` after scene/reference setup.

It creates a substantially better structured starting mesh than the website prototype:
- integrated torso/pelvis silhouette
- long adult anime-fashion proportions
- head/eyes/face components
- hair guide curves
- rig scaffold
- face shape-key scaffold
- studio camera/light

It is intentionally marked BLOCKOUT. Final quality still requires sculpt/retopo/hair/weights work against the approved turnaround.
