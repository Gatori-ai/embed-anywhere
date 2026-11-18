#!/usr/bin/env node
// Prints the code to paste into a page builder, plus the steps for that builder.
//
//   node bin/embed-snippet.mjs --url https://your-page.netlify.app --platform kajabi --mode fullscreen --background "#0b0b0b"
//
// Flags: --url (required) --platform kajabi|gohighlevel|squarespace|wordpress|webflow|shopify|wix|other
//        --mode fullscreen|auto|fixed --background --title --id
//        --min --max (auto mode) --height (fixed mode) --full-bleed true|false
//        --no-pass-through (keep the visitor's ?query and #anchor out of the frame)
//        --out <file> (also save the code) --json
import { writeFileSync } from 'node:fs';
import { buildSnippet, SnippetError, PLATFORMS, MODES } from '../lib/snippet.js';
import { parseArgs } from './args.mjs';

const a = parseArgs(process.argv.slice(2));
if (a.help || !a.url) {
  console.log(`Usage: node bin/embed-snippet.mjs --url <https://your-page> --platform <${Object.keys(PLATFORMS).join('|')}> --mode <${Object.keys(MODES).join('|')}>`);
  console.log('Optional: --background --title --id --min --max --height --full-bleed true|false --no-pass-through --out <file> --json');
  process.exit(a.help ? 0 : 2);
}

try {
  const s = buildSnippet({
    url: a.url, platform: a.platform, mode: a.mode, background: a.background, title: a.title, id: a.id,
    minHeight: a.min, maxHeight: a.max, height: a.height, fullBleed: a['full-bleed'],
    passThrough: !a['no-pass-through'],
  });
  if (a.out) writeFileSync(a.out, s.code);
  if (a.json) { console.log(JSON.stringify(s, null, 2)); process.exit(0); }
  console.log(`--- Paste this into ${s.platformLabel} (${MODES[s.mode].label}) ---\n`);
  console.log(s.code);
  console.log('--- Steps ---');
  s.steps.forEach((step, i) => console.log(`${i + 1}. ${step}`));
  if (s.notes.length) { console.log('\n--- Notes ---'); s.notes.forEach((n) => console.log(`- ${n}`)); }
  if (a.out) console.log(`\nSaved the code to ${a.out}`);
} catch (err) {
  if (err instanceof SnippetError) { console.error(err.message); process.exit(2); }
  throw err;
}
