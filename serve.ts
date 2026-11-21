// Vice Cover Studio v2 — tiny static file server for local testing.
// Serves app/ at http://localhost:8080. Standard library only.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.argv[2] ?? join(fileURLToPath(new URL(".", import.meta.url)), "app"));
const port = Number(process.env.PORT ?? 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, "");
    if (path === "") path = "index.html";
    const file = join(root, path);
    if (!file.startsWith(root)) {
      res.writeHead(403); res.end("forbidden"); return;
    }
    const info = await stat(file);
    if (info.isDirectory()) {
      res.writeHead(302, { location: url.pathname.replace(/\/?$/, "/") + "index.html" });
      res.end(); return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});

server.listen(port, () => {
  console.log(`Vice Cover Studio v2 serving ${root} at http://localhost:${port}`);
});
