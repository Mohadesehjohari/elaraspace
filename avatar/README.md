# Elara Avatar

This directory owns the source-side contract for Elara's custom 3D identity system.

Avatar implementation and production-readiness requirements are verified against actual source assets, model exports and runtime tests.
## Status (real VRMs only)
- The experimental procedural character renderer has been permanently removed.
- The existing real female model lives at `assets/avatar/bases/eli-female-v1.vrm`.
- The real male VRM is configured at `assets/avatar/bases/eli-male-v1.vrm` and requires uploading the owner's export to that exact location.
- When no real model is available, the viewer shows a model-unavailable message, never a synthetic stand-in.
- Selecting male/female controls the appearance only; it does not modify personal profile gender.

## Runtime contract
Production assets should eventually live under `assets/avatar/`.
The manifest in this directory defines stable IDs and versions used by the website.
