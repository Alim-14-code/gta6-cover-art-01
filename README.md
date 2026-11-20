# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Alim-14-code/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Alim-14-code/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Cover Studio: Neon Reign** — a GTA 6-style cover art maker. Load a photo (yours, or one of the three built-in Vice City scenes), pick one of 6 multi-panel layouts, grade it in one of 7 neon/sunset colour grades, set the title in one of 3 title styles, add callouts, a seal, role tags and a billing block, then export a share-ready PNG in 1080×1080, 1080×1350 or 1920×1080. Everything runs offline in the browser: photos are read on your own machine and never uploaded.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network requests. `main.ts` hands the entry in: `MAKEFUN_OUTPUT_DIR=out node main.ts` copies `app/` and `screenshots/` to `out/` and writes `out/dossier.json`.

## What it does

- **6 layouts** — Hero Split, Triptych, Quad Grid, Focal Hero, Diagonal Slash, Poster Stack.
- **7 grades** — Vice Sunset, Neon Nights, Ocean Drive, Palm Gold, Midnight Purple, Bayside Blue, Heat Haze.
- **3 title styles** — Neon Reign, Sunset Slab, Vice Script.
- **Per-panel controls** — pan, zoom and focus for every panel, plus a focal hero close-up.
- **Dressing** — callout bubbles, a circular Vice City seal, role tags and a cast billing block (each toggleable).
- **Export** — PNG at 1080×1080, 1080×1350 and 1920×1080.

Fonts are Anton, Archivo Black and Bebas Neue (SIL Open Font License), shipped as woff2 under `app/fonts/`. The three sample photos under `app/samples/` are original illustrations drawn for this entry — no Rockstar artwork, logos or fonts are used anywhere.

---

<sub>Entered on [make.fun](https://make.fun/?ref=e6d1qmmj&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

---
