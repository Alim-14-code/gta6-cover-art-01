/* Tiny static server for trying the cover studio locally.
   Serves the app/ folder (and screenshots/) over plain HTTP.
   Run with: node serve.ts — then open http://localhost:8080 */
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

const folderOfThisFile = path.dirname(fileURLToPath(import.meta.url));
const appFolder = path.join(folderOfThisFile, "app");
const shotsFolder = path.join(folderOfThisFile, "screenshots");
const port = Number(process.env.PORT || 8080);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml"
};

function resolveWithin(base: string, requestPath: string): string | null {
  const cleaned = decodeURIComponent(requestPath).split("?")[0].split("#")[0];
  const joined = path.join(base, cleaned);
  if (!joined.startsWith(base)) return null;
  return joined;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url === "/" || !req.url ? "/index.html" : req.url;
  let file = resolveWithin(appFolder, urlPath);
  if ((!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) && urlPath.startsWith("/screenshots/")) {
    file = resolveWithin(shotsFolder, urlPath.slice("/screenshots/".length));
  }
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found\n");
    return;
  }
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`Vice Cover Studio at http://localhost:${port}`);
});
