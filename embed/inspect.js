/*
 * Embed Anywhere: inspect.js
 * Measures an embed on the published (or preview) host page and names whatever
 * squeezes it: margins, padding, max-width containers, clipping, sideways scroll.
 *
 * Use it two ways:
 *  - node bin/verify-embed.mjs <host page>   (runs this at three widths, with screenshots)
 *  - an agent's browser tool: evaluate this whole file in the host page; it returns the report
 *
 * Optional settings before running: window.__embedAnywhere = { url: 'https://your-page...', mode: 'auto' }
 * MIT. Brought to you by Gatori.ai.
 */
(function (opts) {
  'use strict';
  opts = opts || {};
  var de = document.documentElement;
  var vw = de.clientWidth;
  var vh = window.innerHeight;
  var results = [];
  function add(level, check, detail, fix) { results.push({ level: level, check: check, detail: detail, fix: fix || '' }); }
  function px(n) { return Math.round(n) + 'px'; }
  function near(a, b, tol) { return Math.abs(a - b) <= (tol || 1.5); }
  function name(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList && el.classList.length) s += '.' + Array.prototype.slice.call(el.classList, 0, 3).join('.');
    return s;
  }

  var targetHost = '';
  try { if (opts.url) targetHost = new URL(opts.url).host; } catch (e) {}
  var frames = Array.prototype.filter.call(document.querySelectorAll('iframe'), function (f) {
    if (/^ge-/.test(f.id)) return true;
    try { return targetHost && new URL(f.src).host === targetHost; } catch (e) { return false; }
  });

  if (!frames.length) {
    var all = Array.prototype.map.call(document.querySelectorAll('iframe'), function (f) { return f.src || '(no src)'; });
    add('fail', 'Embed found', 'No Embed Anywhere frame on this page. Frames present: ' + (all.join(', ') || 'none') + '.',
      'Check the embed code was saved and the page was published. Some builders run custom code only on the published page.');
    return { url: location.href, viewport: { width: vw, height: vh }, pass: false, results: results, suspects: [] };
  }

  var frame = frames[0];
  var mode = opts.mode || frame.getAttribute('data-embed-mode') ||
    (document.getElementById(frame.id + '-layer') ? 'fullscreen' : frame.getAttribute('scrolling') === 'no' ? 'auto' : 'fixed');
  var box = document.getElementById(frame.id + '-layer') || document.getElementById(frame.id + '-band') || frame;
  var r = frame.getBoundingClientRect();
  var fullBleed = mode === 'fullscreen' || frame.getAttribute('data-full-bleed') === 'true';

  add('ok', 'Embed found', name(frame) + ' showing ' + frame.src + ' in ' + mode + ' mode.');
  if (frames.length > 1) add('warn', 'One embed', frames.length + ' Embed Anywhere frames on this page; only the first was measured.', 'Remove duplicates or run the check per frame.');

  var cs = getComputedStyle(frame);
  if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 2 || r.height < 2) {
    add('fail', 'Visible', 'The frame is hidden or has no size (' + px(r.width) + ' x ' + px(r.height) + ').',
      'A builder setting or the host theme hides it. Look at the suspects below.');
  }

  if (mode === 'fullscreen') {
    var w = window.innerWidth;
    if (near(r.left, 0) && near(r.top, 0) && near(r.width, w, 2) && near(r.height, vh, 2)) {
      add('ok', 'Fills the window', px(r.width) + ' x ' + px(r.height) + ' at the top left corner.');
    } else {
      add('fail', 'Fills the window', 'Frame is ' + px(r.width) + ' x ' + px(r.height) + ' at (' + px(r.left) + ', ' + px(r.top) + '); window is ' + px(w) + ' x ' + px(vh) + '.',
        box === frame
          ? 'This frame is a plain iframe, so the builder\'s wrappers set its size. Replace it with the full screen code from bin/embed-snippet.mjs.'
          : 'An ancestor with transform, filter or contain traps the fixed layer, or the builder rewrote the styles. The snippet script normally moves the layer to <body>; check that scripts run on this page.');
    }
    var hit = document.elementFromPoint(Math.floor(w / 2), Math.floor(vh / 2));
    if (hit && hit !== frame && hit !== box) {
      add('warn', 'Nothing on top', name(hit) + ' covers the middle of the frame.', 'Hide that element on this page, or lower its z-index.');
    } else {
      add('ok', 'Nothing on top', 'The frame is the top element at the window center.');
    }
  } else {
    var docLeft = r.left;
    if (fullBleed) {
      if (near(docLeft, 0) && near(r.width, vw, 2)) {
        add('ok', 'Full width', px(r.width) + ' wide, edge to edge.');
      } else {
        add('fail', 'Full width', 'Frame is ' + px(r.width) + ' wide starting at ' + px(docLeft) + '; page is ' + px(vw) + '.',
          'A container clips or offsets the band. Set the suspects below to full width with padding 0, or remove their overflow:hidden.');
      }
    } else {
      var parentWidth = box.parentElement ? box.parentElement.getBoundingClientRect().width : vw;
      add(near(r.width, parentWidth, 2) ? 'ok' : 'warn', 'Fills its block', 'Frame is ' + px(r.width) + ' in a block ' + px(parentWidth) + ' wide.',
        'If you wanted it edge to edge, rebuild the snippet with full bleed on.');
    }
    if (mode === 'auto') {
      var min = Number(frame.getAttribute('data-min') || 0);
      if (min && near(r.height, min)) {
        add('fail', 'Height follows content', 'Frame is still at its minimum height (' + px(min) + ').',
          'Add frame.js to your hosted page and redeploy it. Check the page address in the snippet is the final address with no redirect.');
      } else {
        add('ok', 'Height follows content', 'Frame height is ' + px(r.height) + '.');
      }
    }
    var above = r.top + window.scrollY;
    add('info', 'Position', 'Frame starts ' + px(above) + ' from the top of the page.');
  }

  if (de.scrollWidth > vw + 1) {
    var wide = [];
    var els = document.body.getElementsByTagName('*');
    for (var i = 0; i < els.length && wide.length < 5; i++) {
      var er = els[i].getBoundingClientRect();
      if (er.right > vw + 1 && er.width > 0 && getComputedStyle(els[i]).position !== 'fixed') wide.push(name(els[i]) + ' ends at ' + px(er.right));
    }
    add('fail', 'No sideways scroll', 'The page is ' + px(de.scrollWidth) + ' wide in a ' + px(vw) + ' window. ' + wide.join('; '),
      'Add body{overflow-x:clip} (the full-bleed snippet includes it), or fix the element named.');
  } else {
    add('ok', 'No sideways scroll', 'Page width matches the window.');
  }

  var suspects = [];
  for (var p = box.parentElement; p && p !== de; p = p.parentElement) {
    var s = getComputedStyle(p);
    var pr = p.getBoundingClientRect();
    var why = [];
    var pad = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat);
    var mar = [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft].map(parseFloat);
    if (pad.some(function (n) { return n > 0; })) why.push('padding ' + s.padding);
    if (mar.some(function (n) { return n !== 0; }) && !near(pr.width, vw)) why.push('margin ' + s.margin);
    if (s.maxWidth !== 'none' && pr.width < vw - 1) why.push('max-width ' + s.maxWidth);
    if (pr.width < vw - 1) why.push('width ' + px(pr.width));
    if (/(hidden|clip)/.test(s.overflowX) && fullBleed && mode !== 'fullscreen' && pr.width < vw - 1) why.push('overflow-x ' + s.overflowX + ' (clips the full-bleed band)');
    if (s.transform !== 'none') why.push('transform (traps fixed layers)');
    if (s.display === 'grid' && s.columnGap !== 'normal' && parseFloat(s.columnGap) > 0) why.push('grid gap ' + s.columnGap);
    if (why.length) suspects.push({ element: name(p), reasons: why });
  }

  var failed = results.some(function (x) { return x.level === 'fail'; });
  return { url: location.href, viewport: { width: vw, height: vh }, frame: frame.src, mode: mode, pass: !failed, results: results, suspects: failed || mode !== 'fullscreen' ? suspects : [] };
})(window.__embedAnywhere);
