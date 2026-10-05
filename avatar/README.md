# Elara Avatar

This directory owns the source-side contract for Elara's custom 3D identity system.

Canonical plan: [../docs/AVATAR-SYSTEM-ROADMAP.md](../docs/AVATAR-SYSTEM-ROADMAP.md)

## Status
- Current live avatar: technical prototype only.
- Production target: custom Female + Male VRM/GLB bases.
- Desktop first.
- Mobile placement is a later milestone.
- Store clothing waits until base topology and skeleton version are frozen.

## Important
Do not treat the current procedural mesh in `avatar-3d.js` as art source.
Its job is only to prove renderer placement, input, camera, lifecycle and animation hooks.

## Runtime contract
Production assets should eventually live under `assets/avatar/`.
The manifest in this directory defines stable IDs and versions used by the website.
