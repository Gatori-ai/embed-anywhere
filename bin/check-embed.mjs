#!/usr/bin/env node
// Before embedding: checks that your hosted page loads publicly and that its
// headers let another site show it in a frame.
//
//   node bin/check-embed.mjs https://your-page.netlify.app [--parent https://www.yoursite.com]
//
// Exit code 0 when the page can be embedded, 1 when it cannot.
import { analyzeFrameHeaders } from '../lib/headers.js';
import { checkUrl, SnippetError } from '../lib/snippet.js';
import { parseArgs } from './args.mjs';

const a = parseArgs(process.argv.slice(2));
const target = a._[0] || a.url;
if (!target) { console.log('Usage: node bin/check-embed.mjs <https://your-page> [--parent <https://host-page>]'); process.exit(2); }

let url;
try { url = checkUrl(target); } catch (err) { console.error(err instanceof SnippetError ? err.message : err); process.exit(2); }

let res;
try {
  res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'embed-anywhere-check/1.0' } });
} catch (err) {
  console.log(`FAIL  Loads: could not reach ${url.href} (${err.cause?.code || err.message}).`);
  process.exit(1);
}

let failed = false;
const line = (level, check, text) => { if (level === 'FAIL') failed = true; console.log(`${level.padEnd(5)} ${check}: ${text}`); };

if (res.status === 401 || res.status === 403) {
  line('FAIL', 'Public', `the page answered ${res.status}. It needs a login or password. Vercel preview addresses are protected by default; embed the production address, or turn off deployment protection.`);
} else if (!res.ok) {
  line('FAIL', 'Loads', `the page answered ${res.status}.`);
} else {
  line('OK', 'Loads', `${res.status} ${res.headers.get('content-type') || ''}`.trim());
}

if (res.url && new URL(res.url).origin !== url.origin) {
  line('WARN', 'Final address', `${url.origin} redirects to ${new URL(res.url).origin}. Put ${res.url} in the snippet, or the "fits its content" mode ignores the page's height messages.`);
}

const verdict = analyzeFrameHeaders(res.headers, a.parent);
line(verdict.embeddable === false ? 'FAIL' : verdict.embeddable === 'limited' ? 'WARN' : 'OK', 'Framing allowed', `${verdict.reason} [${verdict.rule}]`);
if (verdict.fix) console.log(`      ${verdict.fix}`);

const body = res.ok ? await res.text() : '';
if (res.ok && !/frame\.js/.test(body)) {
  line('INFO', 'frame.js', 'not found on the page. Full screen and fixed height work without it. "Fits its content" needs it, and it keeps links from opening inside the frame.');
} else if (res.ok) {
  line('OK', 'frame.js', 'included.');
}

process.exit(failed ? 1 : 0);
