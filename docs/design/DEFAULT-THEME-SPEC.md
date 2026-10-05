# Elara Midnight — Default Theme Specification
**Design spec — 2026-10-05**

This file is the implementation-oriented spec for the default Elara theme.

## Tokens

```css
:root[data-theme="elara-midnight"] {
  --bg: #06111F;
  --bg-elevated: #08182A;
  --surface-1: #0C2036;
  --surface-2: #102A46;

  --border: #24405F;
  --border-hover: #3E628B;

  --text: #F5F8FF;
  --text-2: #A8B7CC;
  --text-muted: #7F92A8;

  --blue: #4F8CFF;
  --cyan: #2DD4D7;
  --purple: #8B5CF6;
  --gold: #F5C45B;
  --success: #38D39F;
  --warning: #F6A84B;
  --danger: #F0627D;

  --library-1: #5BA8FF;
  --library-2: #5667E8;
  --language-1: #36D6E7;
  --language-2: #F2B84B;
  --wellness-1: #20C9A6;
  --wellness-2: #59D98E;
  --friends-1: #53A8FF;
  --friends-2: #FF7D88;
  --freedom-1: #9064FF;
  --freedom-2: #D565E8;
  --reports-1: #4E8BFF;
  --reports-2: #38D0DD;
  --ranking-1: #F5C451;
  --ranking-2: #5C8DFF;
  --store-1: #F4C45E;
  --store-2: #E46C9D;
  --blog-1: #F38A5A;
  --blog-2: #668DFF;
  --goals-1: #5C98FF;
  --goals-2: #F2C052;
  --focus-1: #FF9B4A;
  --focus-2: #4E90FF;
}
```

## Background
Recommended default:
```css
background:
  radial-gradient(circle at 70% 10%, rgba(79,140,255,.08), transparent 36%),
  linear-gradient(180deg, #06111F 0%, #0A1630 100%);
```

No dense illustrated wallpaper under cards. Use cinematic art only in hero/banner modules.

## Surfaces
- normal card: `surface-1`, border `--border`
- elevated card: `surface-2`
- hover: border `--border-hover`, translateY(-1px to -2px)
- selected: section accent border + very soft glow

## Glow
Do not apply global glow to all cards/icons.
- inactive: 0–4px soft light
- hover: 6–10px
- active focal: 10–18px
- hero/achievement only: stronger, but local

## Task checkbox
- shape: rounded square
- UI size: 28–34px
- radius: 25–30%
- empty: transparent/dark fill + `#496783` border
- checked fill: `#2DD4D7` or task-domain accent
- checkmark: `#F5F8FF`
- hover: border +8% brightness
- no circle
- no giant neon halo

## Buttons
- primary default app CTA: `#4F8CFF`
- primary section CTA: section primary accent when appropriate
- secondary: transparent/surface with border
- destructive: `#F0627D`
- purple is not the universal button color

## Typography
- FA: Vazirmatn
- EN: Inter
Fallbacks allowed: Estedad / Plus Jakarta Sans.

## Section usage
- Library: blue/indigo
- Language: cyan/amber
- Wellness: teal/emerald
- Friends: sky/coral
- Freedom: violet/magenta
- Reports: blue/aqua
- Ranking: gold/blue
- Store: gold/rose
- Blog: sunset/periwinkle
- Goals: blue/gold
- Focus: orange/blue

## Accessibility
- primary text must remain readable against surfaces.
- do not encode state by color alone.
- focus-visible must be present.
- reduced-motion removes unnecessary glow animation/pulse.
