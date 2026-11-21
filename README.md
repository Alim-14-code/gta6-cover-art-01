# Vice Cover Studio v2

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Alim-14-code/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01/leaderboard/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Alim-14-code/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photos into GTA-style multi-panel cover art and export it as a PNG — offline, in the browser, photos never leave your machine.

## What it makes

A dense Vice City poster in the classic multi-panel formula:

- **Cast Grid** — one large hero close-up centre-top plus three panels in each side column, seven portraits with role tags (`THE DRIVER`, `THE BOSS`, `THE BRAINS`, `THE GETAWAY`, `THE LOOKOUT`, `THE FIXER`, `THE CAPTAIN`), face-aware crop that keeps faces in frame.
- **Chrome-striped title** — giant `VICE CITY` lettering with a horizontal yellow → orange → pink → purple gradient, thick dark outline and 3D bevel shadow.
- **Neon script subtitle** — `Neon Reign` in Pacifico with a pink glow.
- **Review strip** — five gold stars, a press quote and publication, plus a `VOL. 1` badge.
- **Tagline, billing block, COMING SOON, barcode and gold seal** — the full poster furniture, sunset Miami palette, palm silhouettes, warm grading, grain and vignette. No empty space.

## Editor

- Upload a photo per panel (or fill every panel with one photo), crop with zoom and position sliders, click a panel in the preview to select it.
- 7 layouts: Cast Grid, Single Photo, Two-Panel, Three-Panel, Four-Panel Mosaic, Grid, Strip.
- 7 sunset/neon grades.
- Edit the title, subtitle, tagline, press quote, publication and every role tag.
- Export PNG in the common post sizes: **1080 × 1080**, **1080 × 1350**, **1920 × 1080**.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Plain static files under `app/` — no build step, no network request. Fonts (Anton and Pacifico, SIL Open Font License) are vendored under `app/fonts/`. Sample portraits in `app/samples/` are AI-generated. Everything in this app is original: no Rockstar Games logo, artwork, character or font is used.

## Entry

Built for the [Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) bounty on make.fun. `main.ts` hands the entry in (copies `app/` and `screenshots/` and writes `dossier.json`).
