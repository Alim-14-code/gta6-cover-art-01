/* Entry point: hand the built cover studio in.
   Copies the app and its screenshots into the hand-in folder, then asks
   the vendor dossier builder to write the dossier there. The hand-in
   folder comes from the environment, falling back to /output. */
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildDossier } from "./vendor/makefun-app.ts";

const folderOfThisFile = path.dirname(fileURLToPath(import.meta.url));
const handInFolder =
  process.env.MAKEFUN_OUTPUT_DIR && process.env.MAKEFUN_OUTPUT_DIR.length > 0
    ? process.env.MAKEFUN_OUTPUT_DIR
    : "/output";

fs.mkdirSync(handInFolder, { recursive: true });
fs.cpSync(path.join(folderOfThisFile, "app"), path.join(handInFolder, "app"), {
  recursive: true
});
fs.cpSync(
  path.join(folderOfThisFile, "screenshots"),
  path.join(handInFolder, "screenshots"),
  { recursive: true }
);

buildDossier(handInFolder, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216
});
