#!/usr/bin/env node
// Makes a page someone already has ready to embed: a single HTML file or a
// folder of static files. Adds frame.js and body{margin:0} to every HTML
// file, writes host config that allows framing, and reports what else to fix.
// The page's design is left alone.
//
//   node bin/prepare-page.mjs <file.html | folder> [--out <folder>] [--in-place]
//        [--top-hosts theirsite.com,www.theirsite.com] [--static] [--json]
//
// Without --out or --in-place the prepared copy goes next to the input as
// <name>-embed-ready. Deploy that folder.
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename, extname, relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareHtml, HEADERS_FILE, VERCEL_HEADERS, configBlocks } from '../lib/prepare.js';
import { parseArgs } from './args.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const a = parseArgs(process.argv.slice(2));
const input = a._[0];
if (!input) { console.log('Usage: node bin/prepare-page.mjs <file.html | folder> [--out <folder>] [--in-place] [--top-hosts a.com,b.com] [--json]'); process.exit(2); }
const src = resolve(input);
if (!existsSync(src)) { console.error(`Not found: ${src}`); process.exit(2); }

const SKIP = new Set(['node_modules', '.git', '.netlify', '.vercel', 'embed-check']);
const report = { input: src, folder: '', entry: '', files: [], config: [], warnings: [], next: [] };
const isFile = statSync(src).isFile();

if (isFile && !/\.html?$/i.test(src)) { console.error('Give an .html file or a folder. For a .zip, unzip it first.'); process.exit(2); }

// Framework source has no HTML to deploy yet: say how to get the built output.
// A package.json with a build script means the deployable files come from the build.
const pkgPath = join(src, 'package.json');
const pkg = !isFile && existsSync(pkgPath) ? (() => { try { return JSON.parse(readFileSync(pkgPath, 'utf8')); } catch { return {}; } })() : null;
if (pkg && (pkg.scripts?.build || !existsSync(join(src, 'index.html'))) && !a.static) {
  const built = ['dist', 'build', 'out', '.output/public', 'public'].filter((d) => existsSync(join(src, d, 'index.html')));
  const msg = {
    error: 'This folder is app source: the files to deploy come out of its build. (Pass --static if it really is plain files.)',
    build: pkg.scripts?.build ? `npm run build  (runs: ${pkg.scripts.build})` : 'no build script in package.json',
    builtFolders: built,
    fix: 'Either build it and run prepare-page on the output folder (for example dist/), or add frame.js to the static folder (public/) and its <script> tag to the root HTML or layout, then let the host build it.',
  };
  if (a.json) console.log(JSON.stringify(msg, null, 2));
  else console.log(`${msg.error}\nBuild: ${msg.build}\n${built.length ? 'Built output found: ' + built.join(', ') + '\n' : ''}${msg.fix}`);
  process.exit(3);
}

// Choose the folder to work in.
let folder;
if (a['in-place']) {
  folder = isFile ? dirname(src) : src;
} else {
  folder = resolve(a.out || join(dirname(src), `${basename(src, extname(src))}-embed-ready`));
  if (existsSync(folder) && readdirSync(folder).length && !a.out) {
    console.error(`${folder} already exists. Pass --out <folder> or --in-place.`); process.exit(2);
  }
  mkdirSync(folder, { recursive: true });
  if (isFile) {
    // Copy the file as index.html, plus the local files it points at.
    const html = readFileSync(src, 'utf8');
    writeFileSync(join(folder, 'index.html'), html);
    for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"'#?]+)/gi)) {
      const ref = m[1];
      if (/^(?:[a-z]+:|\/\/|\/)/i.test(ref)) continue;
      const from = resolve(dirname(src), ref);
      if (!from.startsWith(dirname(src) + sep) || !existsSync(from) || !statSync(from).isFile()) {
        if (!existsSync(from)) report.warnings.push({ check: 'Missing file', detail: `The page points at ${ref}, which is not next to it.`, fix: 'Find that file and put it in the prepared folder, or the page shows without it.' });
        continue;
      }
      const to = join(folder, relative(dirname(src), from));
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
    }
  } else {
    cpSync(src, folder, { recursive: true, filter: (p) => !SKIP.has(basename(p)) });
  }
}
report.folder = folder;

// Every HTML file gets frame.js and the margin rule.
const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.html?$/i.test(name)) htmlFiles.push(p);
  }
})(folder);

const targetFiles = a['in-place'] && isFile ? [src] : htmlFiles;
if (!targetFiles.length) { console.error(`No HTML files in ${folder}.`); process.exit(2); }
const entry = isFile ? (a['in-place'] ? src : join(folder, 'index.html')) : (htmlFiles.find((f) => f === join(folder, 'index.html')) || htmlFiles[0]);
report.entry = entry;

const seen = new Set();
for (const file of targetFiles) {
  const rel = relative(dirname(file), folder).split(sep).join(posix.sep);
  const frameSrc = (rel ? rel + '/' : '') + 'frame.js';
  const before = readFileSync(file, 'utf8');
  const { html, changes, warnings } = prepareHtml(before, { frameSrc, topHosts: a['top-hosts'] && a['top-hosts'] !== true ? a['top-hosts'].replace(/,/g, ' ') : '' });
  if (html !== before) writeFileSync(file, html);
  report.files.push({ file: relative(folder, file) || basename(file), changes });
  for (const w of warnings) {
    const key = w.check;
    if (seen.has(key)) continue;
    seen.add(key);
    report.warnings.push({ ...w, file: relative(folder, file) });
  }
}

// frame.js at the root, current version.
const frameJs = readFileSync(join(here, '..', 'embed', 'frame.js'));
const frameDest = join(folder, 'frame.js');
if (!existsSync(frameDest) || !readFileSync(frameDest).equals(frameJs)) {
  writeFileSync(frameDest, frameJs);
  report.config.push('wrote frame.js');
}

// Host config. _headers covers Netlify and Cloudflare Pages; vercel.json covers Vercel.
const headersPath = join(folder, '_headers');
if (!existsSync(headersPath)) { writeFileSync(headersPath, HEADERS_FILE); report.config.push('wrote _headers (Netlify, Cloudflare Pages)'); }
else if (!/frame-ancestors\s+\*/.test(readFileSync(headersPath, 'utf8'))) report.config.push('kept the existing _headers; it has no frame-ancestors rule');

const vercelPath = join(folder, 'vercel.json');
if (!existsSync(vercelPath)) {
  writeFileSync(vercelPath, JSON.stringify({ headers: VERCEL_HEADERS }, null, 2) + '\n');
  report.config.push('wrote vercel.json (Vercel)');
} else {
  const text = readFileSync(vercelPath, 'utf8');
  if (!/frame-ancestors/.test(text)) {
    try {
      const cfg = JSON.parse(text);
      cfg.headers = [...(cfg.headers || []), ...VERCEL_HEADERS];
      writeFileSync(vercelPath, JSON.stringify(cfg, null, 2) + '\n');
      report.config.push('added frame-ancestors headers to the existing vercel.json');
    } catch { report.warnings.push({ check: 'vercel.json', detail: 'The existing vercel.json is not valid JSON, so no headers were added.', fix: 'Fix the file, then run this again.' }); }
  }
}

for (const name of ['_headers', 'netlify.toml', 'vercel.json', 'staticwebapp.config.json']) {
  const p = join(folder, name);
  if (!existsSync(p)) continue;
  const blocks = configBlocks(readFileSync(p, 'utf8'));
  if (blocks.length) report.warnings.push({ check: 'Framing blocked', file: name, detail: `${name} sends ${blocks.join(' and ')}, which stops builders from showing the page.`, fix: `Remove that rule from ${name}, or add the builder's domains to frame-ancestors.` });
}

report.next = [
  `Deploy ${folder} (playbooks/hosting.md). Netlify and Cloudflare read _headers; Vercel reads vercel.json; GitHub Pages sends no framing headers.`,
  'Run bin/check-embed.mjs on the deployed address, then continue at step 4 of AGENTS.md.',
];

if (a.json) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
console.log(`Prepared: ${folder}`);
console.log(`Entry page: ${relative(folder, entry) || entry}`);
for (const f of report.files) console.log(`  ${f.file}: ${f.changes.length ? f.changes.join('; ') : 'already prepared'}`);
for (const c of report.config) console.log(`  ${c}`);
for (const w of report.warnings) console.log(`WARN  ${w.check}${w.file ? ' (' + w.file + ')' : ''}: ${w.detail}\n      ${w.fix}`);
console.log('Next:'); for (const n of report.next) console.log(`  ${n}`);
