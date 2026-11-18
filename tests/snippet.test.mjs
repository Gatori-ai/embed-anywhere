import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSnippet, PLATFORMS, SnippetError, escapeAttr } from '../lib/snippet.js';

const url = 'https://example-page.netlify.app/offer';

test('every platform, mode and format builds ASCII code with the page address', () => {
  for (const [key, p] of Object.entries(PLATFORMS)) {
    for (const mode of p.modes) {
      const s = buildSnippet({ url, platform: key, mode });
      assert.match(s.code, /src="https:\/\/example-page\.netlify\.app\/offer"/);
      const sc = buildSnippet({ url, platform: key, mode, format: 'script' });
      assert.match(sc.code, /^<script>/);
      assert.doesNotMatch(sc.code.slice(8, -10), /<\/script>/i);
      assert.match(sc.code, /^[\x09\x0a\x0d\x20-\x7e]*$/);
      assert.match(s.code, /^[\x09\x0a\x0d\x20-\x7e]*$/, `${key}/${mode} has non-ASCII characters`);
      assert.equal(s.playbook, `playbooks/${key}.md`);
      assert.match(s.verify, /verify-embed/);
    }
  }
});

test('full screen uses a fixed layer and escapes trapping ancestors', () => {
  const s = buildSnippet({ url, platform: 'kajabi', mode: 'fullscreen' });
  assert.match(s.code, /position:fixed;inset:0/);
  assert.match(s.code, /document\.body\.appendChild\(l\)/);
  assert.match(s.code, /html,body\{overflow:hidden!important/);
});

test('squarespace full screen hides the site header and footer', () => {
  assert.match(buildSnippet({ url, platform: 'squarespace', mode: 'fullscreen' }).code, /header\.header/);
  assert.doesNotMatch(buildSnippet({ url, platform: 'kajabi', mode: 'fullscreen' }).code, /header\.header/);
});

test('auto mode listens only to its own frame and clamps the height', () => {
  const s = buildSnippet({ url, platform: 'gohighlevel', mode: 'auto', minHeight: 400, maxHeight: 5000 });
  assert.match(s.code, /e\.source!==f\.contentWindow/);
  assert.match(s.code, /e\.origin!==o/);
  assert.match(s.code, /Math\.max\(400,Math\.min\(h,5000\)\)/);
  assert.match(s.code, /scrolling="no"/);
  assert.match(s.code, /data-min="400"/);
});

test('full bleed defaults on for auto, off for fixed, and can be set', () => {
  assert.match(buildSnippet({ url, mode: 'auto' }).code, /overflow-x:clip/);
  assert.doesNotMatch(buildSnippet({ url, mode: 'fixed' }).code, /overflow-x:clip/);
  assert.match(buildSnippet({ url, mode: 'fixed', fullBleed: true }).code, /de\.clientWidth/);
  assert.doesNotMatch(buildSnippet({ url, mode: 'auto', fullBleed: 'false' }).code, /overflow-x:clip/);
});

test('pass-through can be turned off; with nothing to run there is no empty script', () => {
  const s = buildSnippet({ url, mode: 'fixed', passThrough: false });
  assert.doesNotMatch(s.code, /<script>/);
});

test('titles and colors cannot break out of attributes', () => {
  const s = buildSnippet({ url, mode: 'fixed', title: 'A "quoted" <title>' });
  assert.match(s.code, /title="A &quot;quoted&quot; &lt;title&gt;"/);
  assert.throws(() => buildSnippet({ url, background: 'red;}</style><script>' }), SnippetError);
  assert.equal(escapeAttr('café'), 'caf&#233;');
});

test('rejects bad input with plain messages', () => {
  assert.throws(() => buildSnippet({ url: 'http://example.com' }), /https/);
  assert.throws(() => buildSnippet({ url: 'not a url' }), /full address/);
  assert.throws(() => buildSnippet({ url, platform: 'myspace' }), /Unknown platform/);
  assert.throws(() => buildSnippet({ url, platform: 'wix', mode: 'auto' }), /supports: fullscreen, fixed/);
  assert.throws(() => buildSnippet({ url, format: 'pdf' }), /Unknown format/);
  assert.throws(() => buildSnippet({ url, mode: 'auto', minHeight: 5 }), /Minimum height/);
  assert.doesNotThrow(() => buildSnippet({ url: 'http://localhost:8080/', mode: 'fixed' }));
});

test('untested platforms say so', () => {
  assert.equal(buildSnippet({ url, platform: 'webflow' }).tested, false);
  assert.match(buildSnippet({ url, platform: 'webflow' }).notes[0], /Not yet tested/);
  assert.equal(buildSnippet({ url, platform: 'kajabi' }).tested, true);
});
