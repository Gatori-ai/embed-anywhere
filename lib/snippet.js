// Embed Anywhere: builds the code a person pastes into their page builder.
// Pure functions, no dependencies. Used by bin/embed-snippet.mjs, the
// browser generator and the tests. MIT. Brought to you by Gatori.ai.

export const MODES = {
  fullscreen: {
    label: 'Full screen',
    summary: 'The page covers the whole browser window and scrolls inside the frame. Its own sticky menus keep working. Use it for a landing page or sales page.',
  },
  auto: {
    label: 'Fits its content',
    summary: 'The frame grows to the height of your page, so visitors scroll the host page as usual. Use it for a section inside an existing page. Needs frame.js on your page.',
  },
  fixed: {
    label: 'Fixed height',
    summary: 'A box of the height you choose that scrolls inside. Use it for a calculator, form or widget.',
  },
};

const STEP_CHECK = 'Publish (or open the builder preview), then run the check: node bin/verify-embed.mjs <published page address> --mode MODE. Fix what it names and run it again until it passes at every width.';

export const PLATFORMS = {
  kajabi: {
    label: 'Kajabi',
    tested: true,
    modes: ['fullscreen', 'auto', 'fixed'],
    steps: {
      fullscreen: [
        'Website, then Landing Pages, then New Landing Page. Any template works; you will remove its sections.',
        'Hide the Header and Footer sections on desktop and mobile.',
        'Delete the other sections, or leave one empty section. Set it to full width, flush, with top and bottom padding 0, and its background to BACKGROUND.',
        'Add a Custom Code block to that section and paste the snippet.',
        'Save, then publish the page.',
      ],
      auto: [
        'Open the page in the Kajabi editor.',
        'Add a section where the embed goes. Set it to full width, flush, padding 0.',
        'Add a Custom Code block and paste the snippet.',
        'Save and publish.',
      ],
    },
    notes: [
      'Use a Custom Code block. Text blocks strip scripts.',
      'Search engines and link previews read the Kajabi page. Set its title, description and share image in the page SEO settings.',
    ],
  },
  gohighlevel: {
    label: 'GoHighLevel',
    tested: true,
    modes: ['fullscreen', 'auto', 'fixed'],
    steps: {
      fullscreen: [
        'Open the funnel or website step in the page builder.',
        'Remove the template sections, keeping one section. Set that section, its row and its column to full width with padding and margin 0.',
        'Add a Custom Code (Custom JS/HTML) element to the column and paste the snippet.',
        'Save, then Publish.',
      ],
      auto: [
        'Open the page in the builder and add a full-width section where the embed goes.',
        'Set the section, row and column padding and margin to 0.',
        'Add a Custom Code (Custom JS/HTML) element and paste the snippet.',
        'Save, then Publish.',
      ],
    },
    notes: [
      'Search engines and link previews read the GoHighLevel page. Set the title, description and share image in the page SEO settings.',
      'Scripts in a Custom Code element often do nothing inside the editor. Check the published page or the preview link.',
    ],
  },
  squarespace: {
    label: 'Squarespace',
    tested: true,
    modes: ['fullscreen', 'auto', 'fixed'],
    steps: {
      fullscreen: [
        'Add a new blank page and open it in the editor.',
        'Add a Code block (HTML mode, Display Source off) and paste the snippet.',
        'Save. The site header and footer stay hidden on this page only.',
      ],
      auto: [
        'Open the page and add a Code block (HTML mode, Display Source off) where the embed goes.',
        'Stretch the block across the full grid width.',
        'Paste the snippet and save.',
      ],
    },
    notes: [
      'A full screen embed covers the page inside the Squarespace editor too. Select the Code block from the page sections to edit or remove it.',
      'If the Code block refuses your script, your Squarespace plan may limit custom code.',
    ],
  },
  wordpress: {
    label: 'WordPress',
    tested: false,
    modes: ['fullscreen', 'auto', 'fixed'],
    steps: {
      fullscreen: [
        'Create a page. In page settings choose a blank or full-width template if your theme has one.',
        'Add a Custom HTML block (block editor) or an HTML widget (Elementor) and paste the snippet.',
        'Publish.',
      ],
      auto: [
        'Add a Custom HTML block (block editor) or an HTML widget (Elementor) where the embed goes.',
        'Paste the snippet and update the page.',
      ],
    },
    notes: [
      'WordPress.com may strip scripts and frames on some plans. Self-hosted WordPress keeps them for administrators.',
    ],
  },
  webflow: {
    label: 'Webflow',
    tested: false,
    modes: ['fullscreen', 'auto', 'fixed'],
    steps: {
      fullscreen: [
        'Create a page with nothing on it but one Section.',
        'Add a Code Embed element to the Section and paste the snippet.',
        'Publish the site.',
      ],
      auto: [
        'Add a Code Embed element where the embed goes and paste the snippet.',
        'Publish the site.',
      ],
    },
    notes: ['Custom code embeds may need a paid Webflow site plan.'],
  },
  shopify: {
    label: 'Shopify',
    tested: false,
    modes: ['fullscreen', 'auto', 'fixed'],
    steps: {
      fullscreen: [
        'Online Store, then Pages: create a page and give it a template with no other sections.',
        'In the theme editor, add a Custom Liquid section to that template and paste the snippet.',
        'Save.',
      ],
      auto: [
        'In the theme editor, add a Custom Liquid section where the embed goes and paste the snippet.',
        'Save.',
      ],
    },
    notes: [],
  },
  wix: {
    label: 'Wix',
    tested: false,
    modes: ['fixed'],
    steps: {
      fixed: [
        'Add, then Embed Code, then Embed HTML.',
        'Choose Code, paste the snippet, then drag the element to the full width of the page and the height you set.',
        'Publish.',
      ],
    },
    notes: [
      'Wix places custom code inside its own frame of a fixed size, so only the fixed height mode fits. Wix Studio full-width sections help with width.',
    ],
  },
  other: {
    label: 'Any other builder',
    tested: false,
    modes: ['fullscreen', 'auto', 'fixed'],
    steps: {
      fullscreen: [
        'Find the block or element that accepts raw HTML (often called Code, HTML, Embed or Custom Code).',
        'Put it on a page with no other content, paste the snippet and publish.',
      ],
      auto: [
        'Add the raw HTML block where the embed goes, paste the snippet and publish.',
      ],
    },
    notes: ['If the builder places your code inside its own frame, only the fixed height mode will fit.'],
  },
};

const MSG_HEIGHT = 'gatori-embed:height';
const MSG_LOAD = 'gatori-embed:load';

export class SnippetError extends Error {}

export function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[^\x20-\x7e]/g, (ch) => '&#' + ch.codePointAt(0) + ';');
}

export function checkUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw new SnippetError('Give the full address of your page, starting with https://');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new SnippetError('The page address must start with https:// . Builders on https refuse to show http pages.');
  }
  return url;
}

function checkColor(raw) {
  const value = String(raw || '#ffffff').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(value) || /^[a-z]+$/i.test(value) || /^rgba?\([\d\s.,%]+\)$/i.test(value)) return value;
  throw new SnippetError('Background must be a hex color like #0b0b0b, a color name, or rgb().');
}

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'page';
}

function int(value, fallback, lo, hi, name) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new SnippetError(`${name} must be a number from ${lo} to ${hi}.`);
  return Math.round(n);
}

// Carries the visitor's ?query (ad tracking tags) and #anchor into the frame.
function passThroughScript(id) {
  return `(function(){var f=document.getElementById('${id}');if(!f)return;try{var u=new URL(f.src),q=new URLSearchParams(location.search),c=false;q.forEach(function(v,k){if(!u.searchParams.has(k)){u.searchParams.set(k,v);c=true;}});if(location.hash&&location.hash!==u.hash){u.hash=location.hash;c=true;}if(c)f.src=u.href;}catch(e){}})();`;
}

export function buildSnippet(options = {}) {
  const platformKey = String(options.platform || 'other').toLowerCase();
  const platform = PLATFORMS[platformKey];
  if (!platform) throw new SnippetError(`Unknown platform "${options.platform}". Choose one of: ${Object.keys(PLATFORMS).join(', ')}.`);
  const mode = String(options.mode || platform.modes[0]).toLowerCase();
  if (!MODES[mode]) throw new SnippetError(`Unknown mode "${options.mode}". Choose one of: ${Object.keys(MODES).join(', ')}.`);
  if (!platform.modes.includes(mode)) {
    throw new SnippetError(`${platform.label} supports: ${platform.modes.join(', ')}. See the platform notes for why.`);
  }

  const url = checkUrl(options.url);
  const background = checkColor(options.background);
  const title = String(options.title || 'Embedded page').slice(0, 140);
  const id = 'ge-' + slug(options.id || url.hostname.split('.')[0]);
  const minHeight = int(options.minHeight, 600, 100, 20000, 'Minimum height');
  const maxHeight = int(options.maxHeight, 30000, minHeight, 100000, 'Maximum height');
  const height = int(options.height, 700, 100, 20000, 'Height');
  const fullBleed = options.fullBleed === undefined || options.fullBleed === null || options.fullBleed === ''
    ? mode === 'auto'
    : options.fullBleed === true || options.fullBleed === 'true';
  const passThrough = options.passThrough !== false && options.passThrough !== 'false';

  const src = escapeAttr(url.href);
  const allow = 'clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture; web-share';
  const parts = [];

  if (mode === 'fullscreen') {
    // A fixed layer over the whole window. Host margins, max-width containers
    // and padding cannot squeeze it. The script moves it to <body> when an
    // ancestor's transform or filter would trap a fixed element.
    parts.push(
      `<div id="${id}-layer" style="position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;margin:0;padding:0;z-index:2147483000;background:${escapeAttr(background)};">`,
      `<iframe id="${id}" src="${src}" title="${escapeAttr(title)}" allow="${allow}" data-embed-mode="fullscreen" style="display:block;width:100%;height:100%;margin:0;padding:0;border:0;background:${escapeAttr(background)};"></iframe>`,
      '</div>',
      '<style>',
      `html,body{overflow:hidden!important;background:${escapeAttr(background)}!important;}`,
      `#${id}-layer{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;margin:0!important;padding:0!important;transform:none!important;}`,
      `#${id}{width:100%!important;max-width:none!important;height:100%!important;margin:0!important;}`,
      platformKey === 'squarespace'
        ? 'header.header,#header,.header-announcement-bar-wrapper,footer.sections,#footer-sections,[data-section-type="footer"]{display:none!important;}'
        : '',
      '</style>',
      '<script>',
      `(function(){var l=document.getElementById('${id}-layer');if(!l)return;for(var p=l.parentElement;p&&p!==document.body;p=p.parentElement){var s=getComputedStyle(p);if(s.transform!=='none'||s.filter!=='none'||s.perspective!=='none'||s.contain.indexOf('paint')>-1||s.willChange.indexOf('transform')>-1){document.body.appendChild(l);break;}}})();`,
      passThrough ? passThroughScript(id) : '',
      '</script>',
    );
  } else {
    const isAuto = mode === 'auto';
    const h = isAuto ? minHeight : height;
    const wrap = fullBleed
      ? `width:100vw;max-width:100vw;position:relative;left:50%;margin-left:-50vw;`
      : 'width:100%;';
    parts.push(
      `<div id="${id}-band" style="${wrap}padding:0;line-height:0;background:${escapeAttr(background)};">`,
      `<iframe id="${id}" src="${src}" title="${escapeAttr(title)}" allow="${allow}" data-embed-mode="${mode}"${isAuto ? ` data-min="${minHeight}"` : ''} data-full-bleed="${fullBleed}"${isAuto ? ' scrolling="no"' : ''} style="display:block;width:100%;height:${h}px;margin:0;padding:0;border:0;${isAuto ? 'overflow:hidden;' : ''}background:${escapeAttr(background)};"></iframe>`,
      '</div>',
      '<style>',
      fullBleed ? `body{overflow-x:clip;}#${id}-band{width:100vw!important;max-width:100vw!important;margin-left:-50vw!important;left:50%!important;}` : `#${id}-band{width:100%!important;}`,
      `#${id}{width:100%!important;max-width:none!important;margin:0!important;}`,
      '</style>',
      '<script>',
    );
    if (isAuto) {
      parts.push(
        `(function(){var f=document.getElementById('${id}');if(!f)return;var o=new URL(f.src).origin,n=0;window.addEventListener('message',function(e){if(e.source!==f.contentWindow||e.origin!==o||!e.data)return;var d=e.data;if(d.type==='${MSG_HEIGHT}'){var h=Math.ceil(Number(d.height));if(isFinite(h)&&h>0)f.style.setProperty('height',Math.max(${minHeight},Math.min(h,${maxHeight}))+'px','important');}else if(d.type==='${MSG_LOAD}'&&n++>0){var r=f.getBoundingClientRect();if(r.top<0)window.scrollBy(0,r.top);}});})();`,
      );
    }
    if (fullBleed) {
      // Measures where the band sits and pulls it to the window's left edge at
      // the window's width, whatever the builder's columns, padding or sidebars.
      parts.push(
        `(function(){var b=document.getElementById('${id}-band');if(!b)return;var de=document.documentElement;function fit(){b.style.setProperty('left','0px','important');b.style.setProperty('margin-left','0px','important');var r=b.getBoundingClientRect();b.style.setProperty('width',de.clientWidth+'px','important');b.style.setProperty('max-width','none','important');b.style.setProperty('margin-left',(-r.left)+'px','important');}fit();window.addEventListener('resize',fit);window.addEventListener('load',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(de);})();`,
      );
    }
    if (passThrough) parts.push(passThroughScript(id));
    parts.push('</script>');
  }

  const code = parts.filter(Boolean).join('\n').replace('<script>\n</script>', '').trim() + '\n';
  const stepList = (platform.steps[mode] || platform.steps.auto || platform.steps.fixed || [])
    .map((s) => s.replace('BACKGROUND', background));
  const notes = [...platform.notes];
  if (mode === 'auto') notes.unshift('Your page must include frame.js, or the frame stays at its minimum height. Avoid 100vh heights on your page in this mode: the frame grows, the viewport grows with it, and the page keeps growing until the maximum.');
  if (!platform.tested) notes.unshift(`Not yet tested on a live ${platform.label} page. The verify step matters more here.`);

  return {
    code,
    id,
    platform: platformKey,
    platformLabel: platform.label,
    tested: platform.tested,
    mode,
    steps: [...stepList, STEP_CHECK.replace('MODE', mode)],
    notes,
  };
}
