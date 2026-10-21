# Avatar motion source and usage

Elara uses `@pixiv/three-vrm-animation@3.5.5` (MIT) to retarget humanoid VRM Animation (`.vrma`) clips to each currently selected 3D VRM model. The player uses Three.js AnimationMixer; it does not override VRMA bone tracks with handmade trigonometric arm movements during playback.

The configured **optional** external motion sources are maintained by [state-alchemists/zrb-face](https://github.com/state-alchemists/zrb-face):
- `idle/Idle.vrma` — standing idle
- `dance/Bounce.vrma` — dance 1
- `dance/Sway.vrma` — dance 2
- `dance/StepTouch.vrma` — dance 3

The zrb-face project describes its own generated/keyframed dances as **CC0**, while some other motions in its package may be third-party. Elara intentionally refers only to the above author-generated CC0 motions and does not redistribute the source files in this repository. Review source attribution and rights when swapping or adding clips. The current remote file URLs are configured in `avatar-live-vrm.js` and are subject to the source repository's availability and cross-origin access.

**Important:** These external URLs have not yet been confirmed live in the user's deployed browser. If a URL fails to load or parse, the player logs a warning, does not claim a professional dance is playing, and gracefully returns to the standard character view. Do not label third-party animation files as CC0 without first verifying their individual license.

The official implementation guidance is in [pixiv three-vrm loader example](https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm-animation/examples/loader-plugin.html); the VRMA specification is at [vrm.dev/en/vrma](https://vrm.dev/en/vrma/).
