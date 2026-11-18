// Proves the toolchain works on this machine: serves the starter page and five
// sample host pages that imitate a messy site builder (body margin, padded
// sections, a centered column, a grid gap, a transform wrapper), then runs
// verify-embed.mjs on each. Four must pass; the plain iframe must fail.
//
//   npm run selftest
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSnippet } from '../lib/snippet.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

const shell = (title, snippet) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{margin:8px;font-family:Helvetica,Arial,sans-serif}.site-header{padding:20px 32px;background:#222;color:#eee}
.page-section{padding:60px 5vw;transform:translateZ(0)}.content-wrapper{max-width:960px;margin:0 auto;padding:0 24px}
.block-grid{display:grid;grid-template-columns:1fr;column-gap:24px;padding:12px}.site-footer{padding:30px;background:#eee}</style></head>
<body><header class="site-header">Host site header</header>
<section class="page-section"><div class="content-wrapper"><p>Host text above.</p></div></section>
<section class="page-section"><div class="content-wrapper"><div class="block-grid"><div class="code-block">
${snippet}</div></div></div></section>
<section class="page-section"><div class="content-wrapper"><p>Host text below.</p></div></section>
<footer class="site-footer">Host site footer</footer></body></html>`;

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const starter = `http://127.0.0.1:${server.address().port}/starter/`;
  const pages = {
    '/host/fullscreen.html': () => shell('Full screen', buildSnippet({ url: starter, mode: 'fullscreen', id: 't' }).code),
    '/host/section.html': () => shell('Fits its content', buildSnippet({ url: starter, mode: 'auto', id: 't' }).code),
    '/host/script.html': () => shell('Script only', buildSnippet({ url: starter, mode: 'fullscreen', format: 'script', id: 't' }).code),
    '/host/loader.html': () => shell('Loader', buildSnippet({ url: starter, mode: 'fullscreen', format: 'loader', id: 't' }).code),
    '/host/plain-iframe.html': () => shell('Plain iframe', `<iframe src="${starter}" width="100%" height="900" style="border:0"></iframe>`),
  };
  if (path === '/starter/embed-loader.js') {
    const js = buildSnippet({ url: starter, mode: 'fullscreen', format: 'loader', id: 't' }).files['embed-loader.js'];
    res.writeHead(200, { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' });
    return res.end(js);
  }
  if (pages[path]) { res.writeHead(200, { 'content-type': types['.html'] }); return res.end(pages[path]()); }
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(join(root, 'starter'))) { res.writeHead(404); return res.end(); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});

function run(args) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args);
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', (status) => resolve({ status, out }));
  });
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const cases = [['fullscreen', 0], ['section', 0], ['script', 0], ['loader', 0], ['plain-iframe', 1]];
  let ok = true;
  for (const [name, expected] of cases) {
    const args = [join(root, 'bin/verify-embed.mjs'), `${base}/host/${name}.html`, '--url', `${base}/starter/`, '--shots', join(root, 'embed-check', name)];
    if (name === 'plain-iframe') args.push('--mode', 'auto');
    const r = await run(args);
    const good = r.status === expected;
    if (!good) ok = false;
    console.log(`${good ? 'OK  ' : 'FAIL'} ${name}: verify exited ${r.status}, expected ${expected}`);
    if (!good) console.log(r.out.slice(-2500));
  }
  server.close();
  console.log(ok ? '\nSelf-test passed. Screenshots in embed-check/.' : '\nSelf-test failed.');
  process.exit(ok ? 0 : 1);
});
