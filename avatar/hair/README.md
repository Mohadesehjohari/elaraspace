# Elara — Rose Layered Hair (3D concept v0.1)

This folder contains an **original**, editable-in-source procedural 3D hair concept for the approved Elara female turnaround (2026-10-05). It is **not** a production groom and must not be represented as a finished VRoid haircut.

## Preview without affecting the live website

Open `avatar/hair/preview.html` from a local static server, or at the corresponding GitHub Pages path after deploying the branch. It loads Three.js from jsDelivr. If offline or the CDN is blocked, the preview cannot load. Drag to rotate, scroll to zoom, and try different rose/auburn shades.

The prototype models center-parted layered hair falling towards the shoulders, slim face-framing locks, a short crown, a layered back, and subtle idle/turn sway. It uses real smooth 3D tapered geometry and vertex-color variation, rather than billboard hair cards.

**Export GLB for Blender** generates a static unrigged `elara-rose-layered-v01.glb` download containing **hair only** (no face or body). The GLB is suitable as a Blender starting asset or Three.js static geometry, but it is *not* a `.vroidcustomitem`, has no VRM spring bones, and is not automatically fitted to an exported VRoid character.

## Source API

```js
import { createElaraRoseHair } from './elara-rose-layered.js';
const hair = createElaraRoseHair(THREE,{color:'#b57578',scale:1,motion:true});
head.add(hair.group); // normalized head: W=.76 H=1.0 D=.69, faces +Z
// per animation frame:
hair.update(deltaSeconds,elapsedSeconds,headYaw);
// on avatar unload:
hair.dispose();
```

The normalized head is centered at `[0,0,0]`; the +Y axis is up, +Z faces the viewer. These transforms are **not** guaranteed to match arbitrary VRoid exports: fitting and testing with the final female VRM (head bone, scalp topology, hairline, ears, collisions, and animation) is required.

## Production checkpoints before enabling on the user's profile

1. Import the **actual approved exported female VRM** to Blender and fit each strand to the scalp/face silhouette from all four turnaround views. The preview's mannequin is illustrative only.
2. Adjust front hairline and part, replace curve-generated clumps where needed with groomed strand cards/meshes and proper normal/alpha textures. No hard bob fringe.
3. Rig to humanoid head and add dedicated spring bones/colliders for the mobile/VRM pipeline. Browser sway here is only an illustrative deformation.
4. Validate no intersections with cheeks, shoulders, outfit skins, or headwear across idle/dance/360° and mobile performance.
5. Export optimized GLB/VRM, test in the profile drawer, and obtain explicit visual approval before replacing the current avatar. Do not change `avatar/avatar-manifest.json` to `productionReady:true` until those checks pass.

This preview does not change auth, Firebase, cosmetics ownership, profile routing, or the live `avatar-3d.js` implementation.
