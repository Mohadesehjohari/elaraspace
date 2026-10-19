# Eli VRM live viewer + simple wardrobe (draft)

## What was actually uploaded

The user shared `eli.vroid` (VRoid Studio 2.14 project, ~6 MB). This file contains `meta.json`, `v1model/meta.json`, `v1model/data.bin`, and a JPG thumbnail. **It is not a browser-loadable `.vrm`** and has NOT been committed to the public repository. The user must export `VRM 1.0` using VRoid Studio.

## Implemented on branch only

- Desktop profile prefers real VRM over the existing procedural placeholder if an export has been published and enabled.
- Three.js + `@pixiv/three-vrm` runtime, 360° horizontal drag and zoom.
- Idle pose adjustment (arms lowered a little), breathing/head micro-motion, blink, and `vrm.update(dt)` for spring bones exported with the model.
- Accessible in-profile **3D wardrobe** with selectable **whole-look VRMs** and per-account per-browser look selection.
- A truthful **disabled** single-piece tab: standalone top/bottom/shoes/hair assets and skinned binding are **not implemented**.
- Existing 2D wardrobe, store, profile, Firebase, and mobile UI are unchanged.
- No fake model, no copyrighted third-party avatar, no `.vroid` source, and no binary asset are published.

## New: Eli's exported VRM received and inspected (2026-10-19)

A genuine `Elara Eli.vrm` file was uploaded privately in chat and passed GLB container and JSON parse checks: 16,857,048 bytes (~16.9 MB), VRM 1.0, 54 mapped humanoid bones, 29 Spring Bone groups (including `Hair`), 112 spring joints, and `blink` / `happy` face expressions. **The file has NOT been committed to this public repository.**

**Licensing blocker:** the embedded VRM metadata says `avatarPermission=onlySeparatelyLicensedPerson`, `commercialUsage=personalNonProfit`, `allowRedistribution=false`, `modification=allowModification`. Public GitHub Pages hosting makes the VRM downloadable, and Elara may have commercial features. Obtain the user's confirmation about ownership of the model and any third-party components, desired terms, and permission for public publishing before uploading. The author can decide their own license for original work, but cannot waive third-party asset restrictions.

A **private local HTML preview** is provided directly to the user outside the repository. It reads VRM through browser File API, uses the same Three.js/three-vrm CDN, and allows 360 rotation, blink, breathing, simple wave, hair physics and a truthful single-outfit closet. Static JavaScript syntax was checked, but an actual network-loaded browser render could not be tested in this environment. The prototype does not publish the file or change the deployment.

## Publish the actual character (pending)

1. Open `eli.vroid` in VRoid Studio 2.14.
2. Click the export icon (top-right) → **Export VRM** → choose **VRM 1.0** and save `eli-female-v1.vrm`. Keep your original `.vroid` private so you can edit it later.
3. Review model rights, redistributability, and any included third-party hair/clothes licenses: assets under a public GitHub Pages URL can be downloaded by site visitors.
4. Add the binary file to `assets/avatar/bases/eli-female-v1.vrm` (do not just rename `.vroid` to `.vrm`). A GitHub web upload or a repository binary-write workflow is necessary.
5. Change `avatar/vrm-looks.json` entry `bases.female.status` from `awaiting-export` to `preview` **only when the correct file exists**.
6. Test the site in desktop browser: model loads in profile, faces correct direction, blinks, arms rest naturally, hair reacts if Spring Bones are exported, rotates, zooms, and survives closing/reopening profile. Only then consider merging.
7. Keep `avatar/avatar-manifest.json.productionReady` false until overall avatar QA passes.

The avatar viewer falls back to the original technical placeholder if status is not enabled, the file is missing, or the VRM loader fails.

## Wardrobe

The editable manifest `avatar/vrm-looks.json` registers full looks. Each full look needs a separately exported **compatible VRM of the same avatar** (for example `assets/avatar/looks/eli-night-wanderer.vrm`) and its own status of `preview` or `ready`. Once available, clicking it in the profile switches the model and saves the choice for this UID in localStorage.

**Independent clothing:** A VRM export bakes all worn clothing into the avatar. Individual editable tops, skirts, shoes and hair require separately created, skinned, rig-compatible GLB/VRM meshes and tested attachment/clipping rules. The tab is a placeholder, not a working mixing system. In the future, the inventory/ownership for paid items MUST be verified server-side. LocalStorage is not purchase ownership or cross-device sync.

**Important:** Never silently apply someone else's 3D look to all user accounts. Current stage is a shared visual template with per-account local appearance choice; producing uniquely individualized bodies/faces for every user is a separate feature.

## Validation

JavaScript syntax compiled successfully for both `avatar-live-vrm.js` and modified `avatar-3d.js`; the JSON catalog and import map parse. **Actual VRM visual/render QA cannot run until a real exported .vrm exists**. Hair physics requires VRoid's bounce/spring settings exported into the VRM; pure scripts do not create detailed physics from the original proprietary `.vroid` project.

The real VRM path is pre-armed as `preview`, but only loads once the owner uploads the binary to `assets/avatar/bases/eli-female-v1.vrm`. Do not tell users the VRM is live prior to that upload.
