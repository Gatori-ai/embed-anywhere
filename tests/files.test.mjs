import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('starter/frame.js is the same file as embed/frame.js', () => {
  assert.equal(readFileSync('starter/frame.js', 'utf8'), readFileSync('embed/frame.js', 'utf8'));
});
test('inspect.js is one expression a browser tool can evaluate', () => {
  const src = readFileSync('embed/inspect.js', 'utf8');
  assert.match(src, /\}\)\(window\.__embedAnywhere\);\s*$/);
  new Function(src);
});
