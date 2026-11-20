// Vice Cover Studio — tiny static server for trying the app locally.
// Serves app/ at http://localhost:8080 (or the port given as argv[2]).
// Standard library only; no build step.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./app', import.meta.url));
const port = Number(process.argv[2] || 8080);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let file = join(root, decodeURIComponent(url.pathname));
    if (file.endsWith(sep)) file = join(file, 'index.html');
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'content-type': types[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log('Vice Cover Studio at http://localhost:' + port);
});
