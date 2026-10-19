# VRoid Custom Item — Elara Hair (experimental)

This directory is separate from the web/GLB hair prototype under `avatar/hair/`.

## Important: blank original sample found (2026-10-19)

The uploaded `Front.vroidcustomitem` has a 512×512 solid-color thumbnail (RGB 245,245,245, **zero pixel variance**), matching the user's report that the generated `Elara Rose` item displays no Front Hair in VRoid Studio 2.14. The recolor generator never added any geometry. Its prior output `Elara_Rose_Front_Color_Prototype.vroidcustomitem` must NOT be presented as a working hairstyle.

The generator now **rejects completely uniform PNG thumbnails** rather than silently recoloring an apparently empty source. This conservative thumbnail check is not a guarantee that a nonblank source has valid hair; import and visual QA are still required.

Next input: export an *existing Front Hair custom item with visible strand geometry* and an obviously nonblank thumbnail from VRoid Studio, then separately tackle geometry and physics authoring. Do not claim color modification alone reproduces the reference.

## Current, validated scope

`build_front_color_prototype.py` takes a **user-exported VRoid Studio 2.14 Front Hair custom item** and creates another `.vroidcustomitem` that preserves all the original binary hairstyle data while changing only two hair color fields and the display name.

The pink/rose-auburn target (#B97880, shadow #8D5564) is derived from Elara's approved female reference.

**It does not create hairstyle geometry and does not yet reproduce the shoulder-length layered reference.** This is only a file-format/color pipeline test, and the output still needs to be imported and checked in VRoid Studio.

## Build on Windows (Python 3)

```powershell
python avatar/vroidcustomitem/build_front_color_prototype.py "Front.vroidcustomitem" "Elara_Rose_Front_Color_Prototype.vroidcustomitem"
```

The original source file is never overwritten. Once generated, use **VRoid Studio > Hairstyle > Front Hair > Custom > Import** to test the output.

Only test on a saved copy of the VRoid avatar. If VRoid refuses to import the result, do not change the extension or manually tamper with the internal binary: report the VRoid error and keep the original.

## Production milestones

- [x] Inspected real 2.14 Front source format and protobuf color fields.
- [x] Made a safe archive-preserving, CRC-valid recolor output locally.
- [ ] Verified import in actual VRoid Studio 2.14.
- [ ] Reconstructed / authored authentic center-parted hair strand geometry.
- [ ] Built matching Side and Back custom items with spring/bounce settings.
- [ ] Validated assembled style visually from front, side and rear.

VRoid's custom item archive is not equivalent to a GLB or VRM mesh. Three.js-generated hair cannot be renamed into a valid VRoid hairstyle item.
