// Vice Cover Studio: Neon Reign — entry program.
//
// Hands the app in: copies app/ and screenshots/ from this repository into
// the output directory and writes dossier.json there with buildDossier from
// vendor/makefun-app.ts. The output directory is /output inside the grader
// and MAKEFUN_OUTPUT_DIR outside it. Everything is resolved relative to this
// file, never the working directory, so re-runs from any cwd write the same
// bytes: entries are copied in sorted order and the dossier is deterministic.

import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function copyTree(name: string): number {
  const from = join(repoRoot, name);
  const to = join(outDir, name);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  return countFiles(to);
}

function countFiles(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) n += countFiles(p);
    else if (statSync(p).isFile()) n += 1;
  }
  return n;
}

mkdirSync(outDir, { recursive: true });
const appFiles = copyTree('app');
const shotFiles = copyTree('screenshots');

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const sha = createHash('sha256').update(dossier).digest('hex');
console.log(`output: ${outDir}`);
console.log(`app files: ${appFiles}`);
console.log(`screenshots: ${shotFiles}`);
console.log(`dossier.json: ${dossier.length} bytes, sha256 ${sha}`);
