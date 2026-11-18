import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { prepareHtml, auditHtml, configBlocks } from '../lib/prepare.js';

const page = '<!doctype html><html><head><title>t</title></head><body><h1>Hi</h1></body></html>';

test('prepareHtml adds frame.js and the margin rule once', () => {
  const one = prepareHtml(page, { topHosts: 'a.com' });
  assert.match(one.html, /<script src="frame.js" data-top-hosts="a.com"><\/script>\n<\/body>/);
  assert.match(one.html, /<head>\n<style data-embed-anywhere>body\{margin:0\}<\/style>/);
  assert.equal(one.changes.length, 2);
  const two = prepareHtml(one.html);
  assert.equal(two.html, one.html);
  assert.equal(two.changes.length, 0);
});
test('prepareHtml keeps an existing frame.js tag', () => {
  const r = prepareHtml(page.replace('</body>', '<script src="/js/frame.js"></script></body>'));
  assert.equal((r.html.match(/frame\.js/g) || []).length, 1);
});
test('prepareHtml works on fragments with no head or body', () => {
  const r = prepareHtml('<h1>Hi</h1>');
  assert.match(r.html, /^<style data-embed-anywhere>/);
  assert.match(r.html, /frame\.js/);
});
test('auditHtml finds frame busting, 100vh and a missing viewport tag', () => {
  const w = auditHtml('<style>.h{min-height:100vh}</style><script>if(top!==self)top.location=self.location</script>').map((x) => x.check);
  assert.deepEqual(w.sort(), ['100vh heights', 'Frame busting', 'Viewport tag']);
  assert.equal(auditHtml('<meta name="viewport" content="width=device-width"><script>if (window.self !== window.top) x()</script>').length, 0);
});
test('configBlocks spots rules that stop framing', () => {
  assert.deepEqual(configBlocks('X-Frame-Options = "DENY"'), ['X-Frame-Options']);
  assert.deepEqual(configBlocks("Content-Security-Policy: frame-ancestors 'self'"), ["frame-ancestors 'self'"]);
  assert.deepEqual(configBlocks('Content-Security-Policy: frame-ancestors *'), []);
});

const run = (...args) => spawnSync(process.execPath, ['bin/prepare-page.mjs', ...args, '--json'], { encoding: 'utf8' });

test('prepare-page turns a single file into a deployable folder with its assets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ea-'));
  mkdirSync(join(dir, 'img'));
  writeFileSync(join(dir, 'img', 'a.png'), 'x');
  writeFileSync(join(dir, 'sales.html'), page.replace('<h1>', '<img src="img/a.png"><img src="gone.png"><h1>'));
  const r = run(join(dir, 'sales.html'));
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  for (const f of ['index.html', 'frame.js', '_headers', 'vercel.json', 'img/a.png']) assert.ok(existsSync(join(out.folder, f)), f);
  assert.ok(out.warnings.some((w) => w.check === 'Missing file'));
  assert.equal(readFileSync(join(dir, 'sales.html'), 'utf8').includes('frame.js'), false, 'the original stays untouched');
});
test('prepare-page points nested pages at the root frame.js and merges vercel.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ea-'));
  mkdirSync(join(dir, 'site', 'about'), { recursive: true });
  writeFileSync(join(dir, 'site', 'index.html'), page);
  writeFileSync(join(dir, 'site', 'about', 'index.html'), page);
  writeFileSync(join(dir, 'site', 'vercel.json'), '{"cleanUrls":true}');
  writeFileSync(join(dir, 'site', 'netlify.toml'), '[[headers]]\n  for = "/*"\n  [headers.values]\n    X-Frame-Options = "DENY"\n');
  const out = JSON.parse(run(join(dir, 'site')).stdout);
  assert.match(readFileSync(join(out.folder, 'about', 'index.html'), 'utf8'), /src="\.\.\/frame\.js"/);
  const v = JSON.parse(readFileSync(join(out.folder, 'vercel.json'), 'utf8'));
  assert.equal(v.cleanUrls, true);
  assert.ok(JSON.stringify(v.headers).includes('frame-ancestors *'));
  assert.ok(out.warnings.some((w) => w.check === 'Framing blocked' && w.file === 'netlify.toml'));
});
test('prepare-page sends app source to its build', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ea-'));
  writeFileSync(join(dir, 'package.json'), '{"scripts":{"build":"vite build"}}');
  writeFileSync(join(dir, 'index.html'), page);
  const r = run(dir);
  assert.equal(r.status, 3);
  assert.match(JSON.parse(r.stdout).build, /vite build/);
});
