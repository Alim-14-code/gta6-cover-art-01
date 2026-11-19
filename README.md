[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Alim-14-code/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Alim-14-code/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Entry for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01) on make.fun.

# Vice Cover Studio

An offline cover maker that turns a photo and a caption into a GTA-style
poster cover — built for make.fun's `gta6-cover-art-01` bounty.

## What it does

- **4 layouts**: Vice Trio (three diagonal panels), Hero + Strip, Four Corners
  (2×2), Full Bleed.
- **Photos per panel**: upload your own, or use the three built-in sample
  photos (a sunset boulevard, a neon night street, a golden-hour pier).
  Click a panel to select it, drag to pan, scroll (or the slider) to zoom,
  "Fill all panels" copies the selected photo everywhere.
- **4 colour grades**: Vice Sunset, Neon Night, Ocean Drive, Noir — each a
  photo filter plus a colour wash and a vignette.
- **Caption**: title + tagline in three local OFL fonts (Anton, Bebas Neue,
  Archivo Black), five colours, size and tilt sliders, outline, top/bottom
  position.
- **Export**: a real PNG at exactly 1080×1080, 1080×1350, or 1920×1080.

Everything runs offline in a desktop browser — no network requests, no
Rockstar logos, artwork, or fonts. The sample photos were made with an image
model; the fonts are SIL OFL (see `app/fonts/OFL.txt`).

## Run it

```
node serve.ts        # opens http://localhost:8080
```

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That writes `out/dossier.json` (the summary the judge reads) next to the
copied `app/` and `screenshots/`.
