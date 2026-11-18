// Writes the sample host pages in demo/. Each one imitates a site builder that
// pads, centers and transforms its sections, then embeds the starter page with
// the snippet this repository generates. verify-embed.mjs must pass on both.
//
//   node scripts/build-demo.mjs https://embed-anywhere.netlify.app
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildSnippet } from '../lib/snippet.js';

const base = (process.argv[2] || 'https://embed-anywhere.netlify.app').replace(/\/$/, '');
const starter = `${base}/starter/`;
mkdirSync('demo', { recursive: true });

const shell = (title, snippet) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Embed Anywhere demo</title>
<meta name="robots" content="noindex">
<style>
  /* Imitates a page builder: padding on every wrapper, a centered max-width
     column, a grid gap, and a transform that traps fixed elements. */
  body{margin:8px;font-family:Helvetica,Arial,sans-serif;color:#333;background:#fff}
  .site-header{display:flex;justify-content:space-between;padding:20px 32px;background:#222;color:#eee}
  .page-section{padding:60px 5vw;transform:translateZ(0)}
  .content-wrapper{max-width:960px;margin:0 auto;padding:0 24px}
  .block-grid{display:grid;grid-template-columns:1fr;column-gap:24px;padding:12px}
  .site-footer{padding:30px;background:#eee;text-align:center}
</style>
</head>
<body>
<header class="site-header"><span>Host site header</span><span>Home &middot; About</span></header>
<section class="page-section"><div class="content-wrapper"><p>Host page text above the code block.</p></div></section>
<section class="page-section"><div class="content-wrapper"><div class="block-grid"><div class="code-block">
${snippet}</div></div></div></section>
<section class="page-section"><div class="content-wrapper"><p>Host page text below the code block.</p></div></section>
<footer class="site-footer">Host site footer</footer>
</body>
</html>
`;

const full = buildSnippet({ url: starter, platform: 'other', mode: 'fullscreen', background: '#f2ece0', title: 'Starter page', id: 'demo' });
const auto = buildSnippet({ url: starter, platform: 'other', mode: 'auto', background: '#f2ece0', title: 'Starter page', id: 'demo' });
writeFileSync('demo/fullscreen.html', shell('Full screen', full.code));
writeFileSync('demo/section.html', shell('Fits its content', auto.code));
// The usual first attempt, for comparison: verify-embed.mjs fails it and names the wrappers.
const plain = `<iframe src="${starter}" title="Starter page" width="100%" height="900" style="border:0"></iframe>\n`;
writeFileSync('demo/plain-iframe.html', shell('Plain iframe', plain));
console.log(`Wrote demo/fullscreen.html, demo/section.html and demo/plain-iframe.html embedding ${starter}`);
