// Makes an existing page ready to embed with the fewest possible changes.
// Pure string functions; bin/prepare-page.mjs does the file work.

export const MARGIN_STYLE = '<style data-embed-anywhere>body{margin:0}</style>';

const FRAME_TAG = /<script\b[^>]*\bsrc\s*=\s*["']?[^"'>]*frame\.js/i;
const FRAME_BUSTER = /\b(?:window\.)?(?:top|parent)\.location(?:\.href)?\s*=(?!=)|\b(?:window\.)?top\.location\.(?:replace|assign)\s*\(/;
const FULL_VH = /(?:^|[^\d.])100[dsl]?vh/i;

// Problems an embedded page shows that the agent should know about. Works on
// source files and on a fetched page.
export function auditHtml(html) {
  const warnings = [];
  if (FRAME_BUSTER.test(html)) {
    warnings.push({ check: 'Frame busting', detail: 'A script on the page sets top.location, which drags the visitor off the builder page when it runs inside a frame.', fix: 'Remove that script, or wrap it in if (!document.documentElement.classList.contains("is-embedded")).' });
  }
  if (FULL_VH.test(html)) {
    warnings.push({ check: '100vh heights', detail: 'The page uses 100vh. That is fine in full screen mode. In "fits its content" mode the frame and the section keep growing each other.', fix: 'For auto mode, give those sections a fixed or auto height under .is-embedded.' });
  }
  if (!/<meta[^>]+name\s*=\s*["']?viewport/i.test(html)) {
    warnings.push({ check: 'Viewport tag', detail: 'No viewport meta tag. Opened directly on a phone, the page renders at desktop width.', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the head.' });
  }
  return warnings;
}

// Adds frame.js before </body> and body{margin:0} at the top of <head>.
// Running it twice changes nothing the second time.
export function prepareHtml(html, { frameSrc = 'frame.js', topHosts = '' } = {}) {
  const changes = [];
  let out = html;

  if (!FRAME_TAG.test(out)) {
    const hosts = topHosts ? ` data-top-hosts="${topHosts.replace(/[^a-z0-9.,:\- ]/gi, '')}"` : '';
    const tag = `<script src="${frameSrc}"${hosts}></script>\n`;
    const at = out.search(/<\/body\s*>(?![\s\S]*<\/body\s*>)/i);
    out = at > -1 ? out.slice(0, at) + tag + out.slice(at) : out + '\n' + tag;
    changes.push('added frame.js before </body>');
  }

  if (!out.includes('data-embed-anywhere>')) {
    const head = out.match(/<head\b[^>]*>/i) || out.match(/<html\b[^>]*>/i);
    if (head) {
      const at = head.index + head[0].length;
      out = out.slice(0, at) + '\n' + MARGIN_STYLE + out.slice(at);
    } else {
      out = MARGIN_STYLE + '\n' + out;
    }
    changes.push('added body{margin:0} at the top of <head> (the page\'s own CSS still wins)');
  }

  return { html: out, changes, warnings: auditHtml(html) };
}

// Host config that lets builders frame the page.
export const HEADERS_FILE = `# Netlify and Cloudflare Pages: lets other sites show this page in a frame.
# Once the embed works, replace * with your own domains.
/*
  Content-Security-Policy: frame-ancestors *
/embed-loader.js
  Access-Control-Allow-Origin: *
`;

export const VERCEL_HEADERS = [
  { source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }] },
  { source: '/embed-loader.js', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] },
];

// Finds rules in existing host config that stop framing.
export function configBlocks(text) {
  const found = [];
  if (/X-Frame-Options/i.test(text)) found.push('X-Frame-Options');
  const fa = text.match(/frame-ancestors([^;"\n]*)/i);
  if (fa && !/\*/.test(fa[1])) found.push(`frame-ancestors${fa[1]}`.trim());
  return found;
}
