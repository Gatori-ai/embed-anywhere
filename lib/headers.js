// Embed Anywhere: reads a hosted page's response headers and says whether
// another site may show it in a frame. Pure function; bin/check-embed.mjs
// does the fetching. MIT. Brought to you by Gatori.ai.

function sourceMatches(source, parent) {
  const s = source.toLowerCase();
  if (s === '*') return true;
  if (s === "'none'") return false;
  if (s === "'self'") return false; // the parent is a different site by definition
  if (/^[a-z][a-z0-9+.-]*:$/.test(s)) return parent.protocol === s;
  let pattern = s;
  let scheme = '';
  const m = pattern.match(/^([a-z][a-z0-9+.-]*):\/\/(.*)$/);
  if (m) { scheme = m[1] + ':'; pattern = m[2]; }
  if (scheme && scheme !== parent.protocol) return false;
  pattern = pattern.replace(/\/.*$/, '');
  let port = '';
  const pm = pattern.match(/^(.*):(\d+|\*)$/);
  if (pm) { pattern = pm[1]; port = pm[2]; }
  if (port && port !== '*' && port !== (parent.port || (parent.protocol === 'https:' ? '443' : '80'))) return false;
  const host = parent.hostname.toLowerCase();
  if (pattern.startsWith('*.')) return host.endsWith(pattern.slice(1));
  return host === pattern;
}

// headers: a Headers object or a plain object with lowercase keys.
// parent: optional address of the page that will hold the frame.
export function analyzeFrameHeaders(headers, parent) {
  const get = (k) => (typeof headers.get === 'function' ? headers.get(k) : headers[k]) || '';
  const csp = get('content-security-policy');
  const xfo = get('x-frame-options').trim().toUpperCase();
  const parentUrl = parent ? new URL(parent) : null;

  const directive = csp
    .split(',')
    .flatMap((policy) => policy.split(';'))
    .map((d) => d.trim())
    .find((d) => /^frame-ancestors\s/i.test(d) || /^frame-ancestors$/i.test(d));

  if (directive) {
    const sources = directive.split(/\s+/).slice(1);
    if (!sources.length || sources.some((s) => s.toLowerCase() === "'none'")) {
      return { embeddable: false, rule: directive, reason: 'Content-Security-Policy frame-ancestors forbids every other site.', fix: "Set frame-ancestors to * or list the domains of the sites that will show the page." };
    }
    if (sources.includes('*')) {
      return { embeddable: true, rule: directive, reason: 'Any site may show this page in a frame.', fix: 'Once it works, consider listing only your own domains in frame-ancestors.' };
    }
    if (!parentUrl) {
      return { embeddable: 'limited', rule: directive, reason: `Only these sites may show the page: ${sources.join(' ')}`, fix: 'Run again with --parent <host page address> to test your site against this list.' };
    }
    const ok = sources.some((s) => sourceMatches(s, parentUrl));
    return ok
      ? { embeddable: true, rule: directive, reason: `${parentUrl.host} is on the frame-ancestors list.`, fix: '' }
      : { embeddable: false, rule: directive, reason: `${parentUrl.host} is missing from frame-ancestors (${sources.join(' ')}).`, fix: `Add https://${parentUrl.host} to frame-ancestors, and redeploy.` };
  }

  if (xfo === 'DENY' || xfo === 'SAMEORIGIN') {
    return { embeddable: false, rule: `X-Frame-Options: ${xfo}`, reason: 'X-Frame-Options blocks other sites from showing this page.', fix: 'Remove the X-Frame-Options header, or send Content-Security-Policy: frame-ancestors with your domains (it takes priority).' };
  }
  return { embeddable: true, rule: xfo ? `X-Frame-Options: ${xfo}` : '(none)', reason: 'No header blocks framing.', fix: '' };
}
