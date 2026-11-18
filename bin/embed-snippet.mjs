#!/usr/bin/env node
// Builds the embed code an agent places on the person's builder page, and names
// the playbook for that builder and the verify command to run after publishing.
//
//   node bin/embed-snippet.mjs --url https://your-page.netlify.app --platform kajabi --mode fullscreen --background "#0b0b0b"
//
// Flags: --url (required) --platform kajabi|gohighlevel|squarespace|wordpress|webflow|shopify|wix|other
//        --mode fullscreen|auto|fixed --background --title --id
//        --min --max (auto mode) --height (fixed mode) --full-bleed true|false
//        --format html|script|loader (script: one <script> for header, footer or script-only channels;
//          loader: a short tag plus embed-loader.js to deploy next to the hosted page)
//        --mount <css selector> (script format, non-fullscreen: where to place the frame)
//        --no-pass-through (keep the visitor's ?query and #anchor out of the frame)
//        --out <file> (also save the code) --files-dir <folder> (write loader files) --json
import { writeFileSync } from 'node:fs';
import { buildSnippet, SnippetError, PLATFORMS, MODES } from '../lib/snippet.js';
import { parseArgs } from './args.mjs';

const a = parseArgs(process.argv.slice(2));
if (a.help || !a.url) {
  console.log(`Usage: node bin/embed-snippet.mjs --url <https://your-page> --platform <${Object.keys(PLATFORMS).join('|')}> --mode <${Object.keys(MODES).join('|')}>`);
  console.log('Optional: --background --title --id --min --max --height --full-bleed true|false --format html|script|loader --mount <selector> --no-pass-through --out <file> --json');
  process.exit(a.help ? 0 : 2);
}

try {
  const s = buildSnippet({
    url: a.url, platform: a.platform, mode: a.mode, background: a.background, title: a.title, id: a.id,
    minHeight: a.min, maxHeight: a.max, height: a.height, fullBleed: a['full-bleed'],
    passThrough: !a['no-pass-through'], format: a.format, mount: a.mount,
  });
  if (a.out) writeFileSync(a.out, s.code);
  if (s.files && a['files-dir']) for (const [name, body] of Object.entries(s.files)) writeFileSync(`${a['files-dir']}/${name}`, body);
  if (a.json) { console.log(JSON.stringify(s, null, 2)); process.exit(0); }
  console.log(`--- Embed code: ${s.platformLabel}, ${MODES[s.mode].label}, ${s.format} ---\n`);
  console.log(s.code);
  if (s.files) console.log(`--- Deploy next to the hosted page: ${Object.keys(s.files).join(', ')} (write it with --files-dir <hosted page folder>, or read it from --json). Integrity: ${s.integrity}`);
  console.log(`--- Place it with: ${s.playbook}`);
  console.log(`--- After publishing: ${s.verify}`);
  if (s.notes.length) { console.log('--- Notes'); s.notes.forEach((n) => console.log(`- ${n}`)); }
  if (a.out) console.log(`\nSaved the code to ${a.out}`);
} catch (err) {
  if (err instanceof SnippetError) { console.error(err.message); process.exit(2); }
  throw err;
}
