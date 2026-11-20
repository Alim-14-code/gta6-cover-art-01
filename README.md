# Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Alim-14-code/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Alim-14-code/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A GTA-style cover art maker that runs entirely offline in a desktop browser.
Turn your own photos — or the three built-in sample photos — into a poster
cover with slanted multi-panel layouts, Vice City colour grades, key-art
lettering and one-click PNG export.

## What it does

- **Your photos + 3 built-in samples** — upload your own images, or use the
  Boulevard, Neon Street and Pier Sunset samples that ship with the app.
- **6 multi-panel layouts** — Vice Trio (3 slanted panels), Hero + Strip,
  Four Corners, Full Bleed, Duo and Stacked, all with diagonal dividers.
- **Hero close-up + focal point** — click a panel's photo to set its focus
  point; the cover-fit crop centres on it. Drag to pan, scroll to zoom, or
  use the per-panel zoom slider.
- **Per-panel controls** — each panel has its own photo, zoom, pan and
  focus. "Fill all panels" puts one photo across the whole cover.
- **7 colour grades** — Vice Sunset, Neon Night, Ocean Drive, Golden Hour,
  Midnight Drive, Heatwave and Poster Ink.
- **Caption + tagline lettering** — title and tagline in Anton, Bebas Neue
  and Archivo Black, with three title styles: Solid Bold, Retro Chrome
  gradient and Outline.
- **GTA key-art extras (toggleable)** — callout chips, a VC seal/badge,
  role tags on the panels and a billing block ("starring" credits line).
- **PNG export in 3 sizes** — 1080×1080 (1:1), 1080×1350 (4:5) and
  1920×1080 (16:9), rendered on canvas from the same engine as the preview.

## How to run

Node 22 and a desktop browser are all you need. No build step, no install,
no network at runtime — every font, photo and script is a local file.

```sh
node serve.ts
# open http://localhost:8080
```

Pick a layout, give each panel a photo, drag / scroll on the preview to
frame it, choose a grade and lettering, then Export PNG.

## Reproducible screenshots

`?shot=` loads a fixed scene (used for the screenshots in this repo):

- `?shot=cover` — Vice Trio cover, 16:9
- `?shot=editor` — the editor with Hero + Strip / Neon Night
- `?shot=cover-square` — Full Bleed cover, square
- `?shot=cover-portrait` — Duo cover, portrait

## How to hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json` with `buildDossier` from `vendor/makefun-app.ts`.

## Licence

MIT (see LICENSE). The display fonts (Anton, Bebas Neue, Archivo Black)
are under the SIL Open Font License 1.1 — see `app/fonts/OFL.txt`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=e6d1qmmj&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
