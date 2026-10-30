// A deliberately dumb file server that behaves like GitHub Pages: no SPA rewrites, directory
// index files only, and 404.html for anything else. Rewrites here would hide routing bugs.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const BASE = '/budzse';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const send = (file, status = 200) => {
    res.writeHead(status, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  };
  if (!path.startsWith(BASE)) return send(join(DIST, '404.html'), 404);
  const rel = path.slice(BASE.length) || '/';
  let file = join(DIST, rel);
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!rel.endsWith('/')) {
      res.writeHead(301, { Location: `${path}/` });
      return res.end();
    }
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) return send(join(DIST, '404.html'), 404);
  return send(file);
}).listen(4173);
