/** Zero-dependency Node server: serves the front-end and exposes POST /api/compile. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../js/compiler.js';
import { astTree } from '../js/ast.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.md': 'text/markdown',
  '.json': 'application/json',
};
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
};

http
  .createServer(async (req, res) => {
    try {
      if (req.method === 'POST' && req.url === '/api/compile') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 1e5) return send(res, 413, '{"error":"payload too large"}');
        }
        const r = compile(String(JSON.parse(body || '{}').sql ?? ''));
        return send(
          res,
          200,
          JSON.stringify({
            status: r.status,
            stages: r.st,
            errors: r.errors,
            tokens: r.tokens,
            ast: r.ast ? astTree(r.ast) : null,
          }),
        );
      }
      const path = req.url.split('?')[0];
      const file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
      if (!file.startsWith(ROOT) || file.includes('node_modules'))
        return send(res, 403, 'Forbidden', 'text/plain');
      send(res, 200, await readFile(file), MIME[extname(file)] || 'application/octet-stream');
    } catch (e) {
      send(res, e.code === 'ENOENT' ? 404 : 400, JSON.stringify({ error: e.message }));
    }
  })
  .listen(PORT, () => console.log(`Mini SQL Compiler running at http://localhost:${PORT}`));
