/* Dossier builder for the cover-art entry.
   Reads the app/ and screenshots/ folders out of an output directory,
   assembles the dossier text (an App block plus the sources), and writes
   dossier.json next to them. Deterministic: same input, same bytes. */
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export interface DossierOptions {
  text_max_bytes: number;
  screenshots: { max: number; max_bytes: number };
  app_max_files: number;
  app_max_bytes: number;
}

const SOURCE_EXTS = new Set([
  ".html", ".js", ".mjs", ".css", ".glsl", ".vert", ".frag", ".wgsl", ".json"
]);

const LANG_BY_EXT: Record<string, string> = {
  ".html": "html",
  ".js": "js",
  ".mjs": "js",
  ".css": "css",
  ".json": "json",
  ".glsl": "glsl",
  ".vert": "glsl",
  ".frag": "glsl",
  ".wgsl": "wgsl"
};

function isMinified(name: string): boolean {
  return (
    name.endsWith(".min.js") ||
    name.endsWith(".min.mjs") ||
    name.endsWith(".min.css")
  );
}

function isSourceFile(rel: string): boolean {
  const parts = rel.split("/");
  if (parts.includes("vendor")) return false;
  const base = parts[parts.length - 1];
  if (isMinified(base)) return false;
  return SOURCE_EXTS.has(path.extname(base).toLowerCase());
}

function isVendoredFile(rel: string): boolean {
  const parts = rel.split("/");
  if (parts.includes("vendor")) return true;
  return isMinified(parts[parts.length - 1]);
}

/* Walk a directory depth-first: files of a folder first (alphabetical),
   then each subfolder (alphabetical). Returns paths relative to root,
   using forward slashes, plus the count of subfolders found. */
function walkDir(root: string): { files: string[]; subdirs: number } {
  const files: string[] = [];
  let subdirs = 0;
  const visit = (dir: string, rel: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const dirs: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        dirs.push(entry.name);
      } else if (entry.isFile()) {
        files.push(rel ? rel + "/" + entry.name : entry.name);
      }
    }
    for (const name of dirs) {
      subdirs += 1;
      visit(path.join(dir, name), rel ? rel + "/" + name : name);
    }
  };
  visit(root, "");
  return { files, subdirs };
}

function countLines(buf: Buffer): number {
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) n += 1;
  return n;
}

/* The scripts index.html loads, in document order, as app-relative paths. */
function scriptLoadOrder(appDir: string): string[] {
  const indexPath = path.join(appDir, "index.html");
  if (!fs.existsSync(indexPath)) return [];
  const html = fs.readFileSync(indexPath, "utf8");
  const order: string[] = [];
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    if (src.startsWith("data:") || src.includes("://")) continue;
    const clean = src.split("#")[0].split("?")[0];
    if (!clean) continue;
    const resolved = path.posix.normalize("app/" + clean);
    if (!resolved.startsWith("app/")) continue;
    if (!order.includes(resolved)) order.push(resolved);
  }
  return order;
}

function buildText(
  appDir: string,
  appFiles: string[],
  opts: DossierOptions
): string {
  const sources = appFiles.filter((f) => isSourceFile("app/" + f));
  const vendored = appFiles.filter((f) => isVendoredFile("app/" + f));
  const assets = appFiles.filter(
    (f) => !isSourceFile("app/" + f) && !isVendoredFile("app/" + f)
  );

  const read = (rel: string): Buffer => fs.readFileSync(path.join(appDir, rel));
  const sourceBytes = sources.reduce((s, f) => s + read(f).length, 0);
  const vendoredBytes = vendored.reduce((s, f) => s + read(f).length, 0);
  const totalBytes = appFiles.reduce((s, f) => s + read(f).length, 0);

  /* Assets grouped by extension, alphabetical. */
  const byExt = new Map<string, { count: number; bytes: number }>();
  for (const f of assets) {
    const ext = path.extname(f).toLowerCase().replace(/^\./, "") || "noext";
    const cur = byExt.get(ext) || { count: 0, bytes: 0 };
    cur.count += 1;
    cur.bytes += read(f).length;
    byExt.set(ext, cur);
  }
  const assetParts = [...byExt.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([ext, v]) => `${ext} ${v.count} (${v.bytes} bytes)`);
  const assetsLine = assetParts.length > 0 ? assetParts.join(", ") : "none";

  /* Source order: index.html, then the scripts in load order,
     then the remaining sources in walk order. */
  const loadOrder = scriptLoadOrder(appDir).map((p) => p.slice(4));
  const ordered: string[] = [];
  const pushOnce = (f: string) => {
    if (sources.includes(f) && !ordered.includes(f)) ordered.push(f);
  };
  pushOnce("index.html");
  for (const f of loadOrder) pushOnce(f);
  for (const f of sources) pushOnce(f);

  const { subdirs } = walkDir(appDir);
  const totalEntries = appFiles.length + subdirs;

  const head = [
    "## App",
    "",
    `Source files: ${sources.length} (${sourceBytes} bytes)`,
    `Vendored files: ${vendored.length} (${vendoredBytes} bytes)`,
    `Assets: ${assetsLine}`,
    `Totals: ${totalEntries} files and directories (${totalBytes} bytes)`,
    "",
    "## Sources",
    ""
  ].join("\n");

  /* Assemble the source blocks, honouring the text cap. */
  const blocks: string[] = [];
  let used = Buffer.byteLength(head, "utf8");
  let leftOutFiles = 0;
  let leftOutBytes = 0;
  for (const f of ordered) {
    const buf = read(f);
    const lang = LANG_BY_EXT[path.extname(f).toLowerCase()] || "";
    const heading = `### app/${f} (${countLines(buf)} lines, ${buf.length} bytes)`;
    const block = heading + "\n\n```" + lang + "\n" + buf.toString("utf8") + "```";
    const blockBytes = Buffer.byteLength(block, "utf8") + 1; /* + trailing newline */
    if (used + blockBytes + 1 > opts.text_max_bytes) {
      /* This source does not fit whole: keep the lines that fit. */
      const room = opts.text_max_bytes - used - 1;
      const lines = buf.toString("utf8").split("\n");
      let kept = "";
      let keptBytes = Buffer.byteLength(heading + "\n\n```" + lang + "\n", "utf8");
      for (const line of lines) {
        const add = Buffer.byteLength(line + "\n", "utf8");
        if (keptBytes + add + 4 > room) break;
        kept += line + "\n";
        keptBytes += add;
      }
      const partial = heading + "\n\n```" + lang + "\n" + kept + "```";
      blocks.push(partial);
      leftOutFiles = ordered.length - blocks.length;
      leftOutBytes = ordered
        .slice(blocks.length)
        .reduce((s, g) => s + read(g).length, 0);
      used = opts.text_max_bytes;
      break;
    }
    blocks.push(block);
    used += blockBytes + 1;
  }

  let text = head + "\n" + blocks.join("\n\n") + "\n";
  if (leftOutFiles > 0) {
    text += `\n${leftOutFiles} source files (${leftOutBytes} bytes) left out.\n`;
  }
  return text;
}

function mediaType(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".png") return "image/png";
  return "image/jpeg";
}

export function buildDossier(outDir: string, opts: DossierOptions): void {
  const appDir = path.join(outDir, "app");
  const shotsDir = path.join(outDir, "screenshots");
  if (!fs.existsSync(appDir) || !fs.statSync(appDir).isDirectory()) {
    throw new Error("app/ is missing from the output directory");
  }
  const { files: appFiles } = walkDir(appDir);
  if (appFiles.length > opts.app_max_files) {
    throw new Error(`app/ holds ${appFiles.length} files, over the ${opts.app_max_files} limit`);
  }
  const appBytes = appFiles.reduce(
    (s, f) => s + fs.statSync(path.join(appDir, f)).size,
    0
  );
  if (appBytes > opts.app_max_bytes) {
    throw new Error(`app/ holds ${appBytes} bytes, over the ${opts.app_max_bytes} limit`);
  }

  /* Screenshots: 3 or 4 images, each under the size cap, in name order. */
  let shotNames: string[] = [];
  if (fs.existsSync(shotsDir) && fs.statSync(shotsDir).isDirectory()) {
    shotNames = fs
      .readdirSync(shotsDir)
      .filter((n) => !n.startsWith("."))
      .filter((n) => /\.(png|jpe?g)$/i.test(n))
      .sort();
  }
  if (shotNames.length < 3 || shotNames.length > opts.screenshots.max) {
    throw new Error(
      `screenshots/ holds ${shotNames.length} images, need 3 to ${opts.screenshots.max}`
    );
  }
  const images = shotNames.map((name) => {
    const buf = fs.readFileSync(path.join(shotsDir, name));
    if (buf.length > opts.screenshots.max_bytes) {
      throw new Error(`screenshot ${name} is ${buf.length} bytes, over the ${opts.screenshots.max_bytes} limit`);
    }
    return {
      base64: buf.toString("base64"),
      media_type: mediaType(name),
      name,
      sha256: crypto.createHash("sha256").update(buf).digest("hex")
    };
  });

  const text = buildText(appDir, appFiles, opts);
  const dossier = {
    cover: 0,
    images,
    schema: "makefun/dossier/v1",
    text
  };
  fs.writeFileSync(path.join(outDir, "dossier.json"), JSON.stringify(dossier));
}
