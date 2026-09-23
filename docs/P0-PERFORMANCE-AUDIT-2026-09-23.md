# P0 performance audit — 2026-09-23

## Static baseline before P0 wiring
Measured from the real `main` tree before this pass (HEAD `ea0a8678076a33e1bd8986abbcbb61273b12b8a3`):
- 113 repository blobs.
- JavaScript: 35 files / 362,819 bytes.
- CSS: 16 files / 199,669 bytes.
- Images: 34 files / 33,930,440 bytes.
- The largest files are wardrobe/avatar PNGs (roughly 1.3–2.2 MB each); they must not be eagerly inserted into Home.

## What this pass changes
- Removes automatic Wellness Water/Sleep rows from Home, so Home does not construct health widgets or their imagery.
- Keeps Wardrobe images behind the Wardrobe interaction; no bulk avatar preload is added.
- Fixes the earlier self-triggering Drawer observer separately already in history; this pass does not add observers that rewrite their own observed subtree.
- Adds one small Home/search module and one CSS layer instead of duplicating user data or loading new artwork.

## Not yet measured
Real browser startup timings, request waterfall, long tasks, LCP/INP and before/after screenshots at identical viewports cannot be certified by repository/static checks. These remain required in a real browser at desktop 1280/1440 and mobile 320/375/390/430 before claiming the site is performance- or release-ready.
