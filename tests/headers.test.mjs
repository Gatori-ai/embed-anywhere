import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFrameHeaders } from '../lib/headers.js';

const h = (o) => new Headers(o);

test('no headers: embeddable', () => {
  assert.equal(analyzeFrameHeaders(h({})).embeddable, true);
});
test('X-Frame-Options DENY and SAMEORIGIN block', () => {
  assert.equal(analyzeFrameHeaders(h({ 'x-frame-options': 'DENY' })).embeddable, false);
  assert.equal(analyzeFrameHeaders(h({ 'x-frame-options': 'sameorigin' })).embeddable, false);
});
test('frame-ancestors wins over X-Frame-Options', () => {
  assert.equal(analyzeFrameHeaders(h({ 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'self'; frame-ancestors *" })).embeddable, true);
});
test("frame-ancestors 'none' and 'self' block other sites", () => {
  assert.equal(analyzeFrameHeaders(h({ 'content-security-policy': "frame-ancestors 'none'" })).embeddable, false);
  assert.equal(analyzeFrameHeaders(h({ 'content-security-policy': "frame-ancestors 'self'" }), 'https://www.site.com').embeddable, false);
});
test('frame-ancestors lists match hosts, wildcards and schemes', () => {
  const csp = { 'content-security-policy': "frame-ancestors 'self' https://www.site.com *.mykajabi.com" };
  assert.equal(analyzeFrameHeaders(h(csp)).embeddable, 'limited');
  assert.equal(analyzeFrameHeaders(h(csp), 'https://www.site.com/page').embeddable, true);
  assert.equal(analyzeFrameHeaders(h(csp), 'https://me.mykajabi.com/').embeddable, true);
  assert.equal(analyzeFrameHeaders(h(csp), 'https://other.com/').embeddable, false);
  assert.equal(analyzeFrameHeaders(h({ 'content-security-policy': 'frame-ancestors https:' }), 'https://any.com').embeddable, true);
});
