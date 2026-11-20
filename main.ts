// Vice Cover Studio entry point (Node 22, standard library only).
// Copies the app and its screenshots next to this file into the output
// directory and writes the dossier the judge reads, using the vendored
// make.fun library. Run locally with MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(dest, { recursive: true });
cpSync(join(root, "app"), join(dest, "app"), { recursive: true });
mkdirSync(join(dest, "screenshots"), { recursive: true });
if (existsSync(join(root, "screenshots"))) {
  cpSync(join(root, "screenshots"), join(dest, "screenshots"), { recursive: true });
}

writeFileSync(
  join(dest, "dossier.json"),
  buildDossier(dest, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
