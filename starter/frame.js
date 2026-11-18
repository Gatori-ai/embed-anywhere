/*
 * Embed Anywhere: frame.js
 * Put this on the page you host (Netlify, Vercel, anywhere), just before </body>:
 *
 *   <script src="frame.js" data-top-hosts="yourdomain.com"></script>
 *
 * When the page runs inside a frame it:
 *  1. adds the class "is-embedded" to <html>, so your CSS can adjust;
 *  2. opens links to your main site (data-top-hosts) in the whole window,
 *     and links to other sites in a new tab, so nothing loads inside the frame;
 *  3. tells the host page its height, for the "Fits its content" mode.
 * Outside a frame it does nothing.
 *
 * Force a link to leave the frame: <a href="/checkout" data-embed-target="top">
 * MIT. Brought to you by Gatori.ai (https://gatori.ai).
 */
(function () {
  'use strict';
  var script = document.currentScript;
  var inFrame;
  try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  if (!inFrame) return;

  var root = document.documentElement;
  root.classList.add('is-embedded');

  var topHosts = ((script && script.getAttribute('data-top-hosts')) || '')
    .split(/[\s,]+/).filter(Boolean).map(function (h) { return h.toLowerCase().replace(/^www\./, ''); });

  function isTopHost(hostname) {
    var h = hostname.toLowerCase().replace(/^www\./, '');
    for (var i = 0; i < topHosts.length; i++) {
      var t = topHosts[i];
      if (h === t || h.slice(-(t.length + 1)) === '.' + t) return true;
    }
    return false;
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (a.getAttribute('data-embed-target') === 'top') { a.target = '_top'; return; }
    var existing = a.getAttribute('target');
    if (existing && existing !== '_self') return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|sms:|javascript:)/i.test(href)) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin === location.origin) return;
    if (isTopHost(u.hostname)) { a.target = '_top'; }
    else { a.target = '_blank'; a.rel = 'noopener'; }
  }, true);

  var parentWindow = window.parent;
  var last = 0;
  var queued = false;

  function measure() {
    var body = document.body;
    if (!body) return 0;
    var style = getComputedStyle(body);
    var rect = body.getBoundingClientRect();
    var bottom = rect.bottom + (window.scrollY || 0) + Math.max(parseFloat(style.marginBottom) || 0, trailingMargin(body));
    return Math.ceil(Math.max(bottom, body.scrollHeight));
  }

  // The bottom margin of the last paragraph collapses through the body when
  // nothing stops it, and the body's box leaves it out. Follow the last-child
  // chain while margins can collapse and keep the largest one.
  function trailingMargin(el) {
    var most = 0;
    for (var depth = 0; el && depth < 20; depth++) {
      var s = getComputedStyle(el);
      if ((parseFloat(s.paddingBottom) || 0) > 0 || (parseFloat(s.borderBottomWidth) || 0) > 0) break;
      if (s.overflow !== 'visible' || /flex|grid|flow-root|inline|table/.test(s.display)) break;
      var c = el.lastElementChild;
      while (c && (/^(SCRIPT|STYLE|TEMPLATE|LINK|META|NOSCRIPT)$/.test(c.tagName) || /absolute|fixed/.test(getComputedStyle(c).position) || getComputedStyle(c).display === 'none')) c = c.previousElementSibling;
      if (!c) break;
      most = Math.max(most, parseFloat(getComputedStyle(c).marginBottom) || 0);
      el = c;
    }
    return most;
  }

  function send() {
    queued = false;
    var h = measure();
    if (h && Math.abs(h - last) >= 1) {
      last = h;
      parentWindow.postMessage({ type: 'gatori-embed:height', height: h }, '*');
    }
  }

  function queue() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || setTimeout)(send);
  }

  function start() {
    parentWindow.postMessage({ type: 'gatori-embed:load' }, '*');
    send();
    if (window.ResizeObserver) new ResizeObserver(queue).observe(document.body);
    window.addEventListener('load', queue);
    window.addEventListener('resize', queue);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    setTimeout(queue, 500);
    setTimeout(queue, 2000);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
