# Elara avatar motion sources

The three dance buttons load real VRM Animation (`.vrma`) clips from the public [ruslanmv/3D-Avatar-Chatbot](https://github.com/ruslanmv/3D-Avatar-Chatbot) repository, pinned at revision `2aa957f4dba43dc363a3d387b60df55b95bd2a91`:

- Dance rhythm: [dance_1.vrma](https://github.com/ruslanmv/3D-Avatar-Chatbot/blob/master/addons/vrma-dance/dance_1.vrma) (22.1 s)
- Dance pop: [dance_2.vrma](https://github.com/ruslanmv/3D-Avatar-Chatbot/blob/master/addons/vrma-dance/dance_2.vrma) (20.4 s)
- Dance energy: [dance_dab.vrma](https://github.com/ruslanmv/3D-Avatar-Chatbot/blob/master/addons/vrma-dance/dance_dab.vrma) (7.7 s)

All three files were verified to exist via the GitHub tree API, with nonzero file sizes. Their [source README](https://github.com/ruslanmv/3D-Avatar-Chatbot/blob/master/addons/vrma-dance/README.md) describes them as conversions from the repository's own BVH assets via the official bvh2vrma tool; it also warns that the *other*, Mixamo-derived clips aren't production-ready. The source repository's root LICENSE is Apache-2.0. Keep attribution and verify per-asset terms if replacing these recordings.

The importer is the official `@pixiv/three-vrm-animation` loader and retargeter. Three.js `AnimationMixer` drives the original joint keys and expression tracks rather than handmade `Math.sin`-only arm swings. Local idle uses the target's normalized VRM bones and author-designed finger rest pose: no third-party idle is loaded, and an unreachable dance returns a visible error instead of silently changing back to idle.

**Deployment caveat:** The remote GitHub raw URLs and browser cross-origin delivery have not yet been verified against the user's running site. The acceptance tests exercise the local loading/failure state, but a live 3D visual review is still required for each model and motion.