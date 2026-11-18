#!/usr/bin/env node
// After embedding: opens the published (or public preview) host page at phone,
// tablet and desktop widths, measures the frame, looks inside it, saves a
// screenshot of each, and names whatever adds margins or breaks full width.
//
//   node bin/verify-embed.mjs https://www.yoursite.com/your-page [--url https://your-page.netlify.app] [--mode auto]
//
// Flags: --url the hosted page inside the frame (helps find it)  --mode fullscreen|auto|fixed
//        --widths 390,768,1440  --shots <folder> (default embed-check)  --wait <ms> (default 2500)
//        --chrome <path to a Chrome or Chromium binary>  --json
// Needs playwright-core (npm install) and an installed Google Chrome, or Chromium
// from "npx playwright-core install chromium".
// Exit code 0 when every width passes, 1 otherwise.
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './args.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const a = parseArgs(process.argv.slice(2));
const hostPage = a._[0];
if (!hostPage) {
  console.log('Usage: node bin/verify-embed.mjs <published host page> [--url <hosted page>] [--mode auto] [--widths 390,768,1440]');
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  console.error('playwright-core is missing. Run "npm install" in this folder first.');
  console.error('No Node? Run embed/inspect.js in your browser on the host page instead (see AGENTS.md).');
  process.exit(2);
}

const inspectSource = readFileSync(join(here, '..', 'embed', 'inspect.js'), 'utf8');
const widths = String(a.widths || '390,768,1440').split(',').map((n) => parseInt(n, 10)).filter(Boolean);
const shots = a.shots || 'embed-check';
const wait = parseInt(a.wait || '2500', 10);
mkdirSync(shots, { recursive: true });

async function launch() {
  if (a.chrome) return chromium.launch({ executablePath: a.chrome, headless: true });
  try { return await chromium.launch({ channel: 'chrome', headless: true }); }
  catch { return chromium.launch({ headless: true }); }
}

const browser = await launch();
const reports = [];
let allPass = true;

for (const width of widths) {
  const mobile = width < 600;
  const height = mobile ? 844 : width < 1000 ? 1024 : 900;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await context.newPage();
  let report;
  try {
    const resp = await page.goto(hostPage, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(wait);
    const opts = JSON.stringify({ url: a.url || '', mode: a.mode || '' });
    report = await page.evaluate(`window.__embedAnywhere=${opts};\n${inspectSource}`);
    report.status = resp ? resp.status() : 0;

    // Look inside the frame. Playwright can read a cross-origin frame; the host page cannot.
    if (report.frame) {
      const host = new URL(report.frame).host;
      const inner = page.frames().find((f) => { if (f === page.mainFrame()) return false; try { return new URL(f.url()).host === host; } catch { return false; } });
      if (!inner) {
        report.results.push({ level: 'fail', check: 'Frame loads', detail: 'The frame never loaded a page from ' + host + '.', fix: 'Run bin/check-embed.mjs on the hosted page: it may block framing or need a login.' });
      } else {
        const m = await inner.evaluate(() => {
          const b = document.body; const s = b ? getComputedStyle(b) : null;
          return {
            title: document.title,
            innerWidth: window.innerWidth, innerHeight: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
            bodyMargin: s ? s.margin : '', embeddedClass: document.documentElement.classList.contains('is-embedded'),
            hasFrameJs: !!document.querySelector('script[src*="frame.js"]'),
            vhElements: Array.from(document.querySelectorAll('body *')).slice(0, 4000).filter((el) => {
              const h = el.getBoundingClientRect().height; return h > 0 && Math.abs(h - window.innerHeight) < 2;
            }).length,
          };
        });
        report.results.push({ level: 'ok', check: 'Frame loads', detail: `"${m.title}" loaded inside the frame.` });
        if (m.scrollWidth > m.innerWidth + 1) {
          report.results.push({ level: 'fail', check: 'Hosted page fits', detail: `Your hosted page is ${m.scrollWidth}px wide inside a ${m.innerWidth}px frame, so it scrolls sideways.`, fix: 'Fix the hosted page: something in it is wider than a phone screen. Add max-width:100% to images and check fixed widths.' });
        } else {
          report.results.push({ level: 'ok', check: 'Hosted page fits', detail: `No sideways scroll inside the frame at ${m.innerWidth}px.` });
        }
        if (m.bodyMargin && m.bodyMargin !== '0px') {
          report.results.push({ level: 'warn', check: 'Hosted page margin', detail: `Your hosted page's body has margin ${m.bodyMargin}, which shows as a border inside the frame.`, fix: 'Add body{margin:0} to the hosted page.' });
        }
        if (report.mode === 'auto') {
          if (!m.hasFrameJs) report.results.push({ level: 'fail', check: 'frame.js on hosted page', detail: 'The hosted page has no frame.js, so the frame cannot follow its height.', fix: 'Add <script src="frame.js"></script> before </body> and redeploy.' });
          if (m.scrollHeight > m.innerHeight + 2) report.results.push({ level: 'fail', check: 'Nothing cut off', detail: `Content is ${m.scrollHeight}px tall and the frame shows ${m.innerHeight}px; the rest is cut off.`, fix: 'Check frame.js loads, and raise --max if the page is taller than the maximum.' });
          if (m.vhElements > 0) report.results.push({ level: 'warn', check: 'No 100vh sections', detail: `${m.vhElements} element(s) on the hosted page are exactly one frame tall. 100vh in this mode grows with the frame.`, fix: 'Under .is-embedded, give those sections a fixed or auto height.' });
        }
      }
    }
    report.pass = !report.results.some((r) => r.level === 'fail');
    const file = join(shots, `width-${width}.png`);
    await page.screenshot({ path: file, fullPage: report.mode !== 'fullscreen' });
    report.screenshot = file;
  } catch (err) {
    report = { pass: false, viewport: { width, height }, results: [{ level: 'fail', check: 'Page opens', detail: String(err.message || err).split('\n')[0], fix: 'Check the address is published and public. For an editor preview that needs a login, run embed/inspect.js in your own browser instead.' }], suspects: [] };
  }
  await context.close();
  report.width = width;
  if (!report.pass) allPass = false;
  reports.push(report);
}
await browser.close();

if (a.json) {
  console.log(JSON.stringify({ hostPage, pass: allPass, reports }, null, 2));
} else {
  for (const r of reports) {
    console.log(`\n=== ${r.width}px wide: ${r.pass ? 'PASS' : 'FAIL'} ${r.screenshot ? '(' + r.screenshot + ')' : ''}`);
    for (const x of r.results) {
      console.log(`${x.level.toUpperCase().padEnd(5)} ${x.check}: ${x.detail}`);
      if (x.fix && x.level !== 'ok' && x.level !== 'info') console.log(`      Fix: ${x.fix}`);
    }
    if (!r.pass && r.suspects && r.suspects.length) {
      console.log('      Wrappers around the embed that add space or limit width (closest first):');
      for (const s of r.suspects) console.log(`        ${s.element}: ${s.reasons.join(', ')}`);
    }
  }
  console.log(`\n${allPass ? 'PASS' : 'FAIL'}: ${hostPage} at ${widths.join(', ')}px. Look at the screenshots in ${shots}/ too.`);
}
process.exit(allPass ? 0 : 1);
