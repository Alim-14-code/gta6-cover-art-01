// Vice Cover Studio v2 — entrypoint.
// Hands the app in: copies app/ and screenshots/ from this repository into
// the output directory and writes /output/dossier.json with buildDossier
// from vendor/makefun-app.ts. buildDossier takes the output root (which
// holds app/ and screenshots/) and the dossier caps, and returns the
// dossier as bytes. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output. Node 22, standard library only.
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

// Dossier caps from the competition gate: source text at most 160 KiB,
// the dossier at most 1.5 MiB, at most 4 screenshots.
const dossierCaps = { text_max_bytes: 163840, dossier_max_bytes: 1572864, max_images: 4 };

async function copyTree(source, target) {
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, dereference: false });
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  // Start from a clean output directory so stale files never leak in.
  for (const entry of await readdir(outputDir)) {
    await rm(join(outputDir, entry), { recursive: true, force: true });
  }
  await copyTree(join(repoRoot, "app"), join(outputDir, "app"));
  await copyTree(join(repoRoot, "screenshots"), join(outputDir, "screenshots"));
  const dossier = await buildDossier(outputDir, dossierCaps);
  const dossierBytes = dossier instanceof Uint8Array ? dossier : Buffer.from(String(dossier), "utf8");
  if (dossierBytes.length > dossierCaps.dossier_max_bytes) {
    throw new Error(`dossier ${dossierBytes.length} bytes exceeds the ${dossierCaps.dossier_max_bytes} byte cap`);
  }
  await writeFile(join(outputDir, "dossier.json"), dossierBytes);
  console.log(`wrote ${outputDir} (dossier ${dossierBytes.length} bytes)`);
}

await main();
