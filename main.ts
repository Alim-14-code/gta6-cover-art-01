// Vice Cover Studio — make.fun gta6-cover-art-01 entry program (Node 22, stdlib only).
// Copies app/ and screenshots/ from this repository into the output directory
// (env MAKEFUN_OUTPUT_DIR outside the grader, /output inside it) and writes
// /output/dossier.json with buildDossier from vendor/makefun-app.ts.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = resolve(import.meta.dirname);
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function copyTree(name: string): void {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in repository`);
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('app');
copyTree('screenshots');
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, caps));
console.log(`wrote ${outDir} (app/, screenshots/, dossier.json)`);
