# Embed Anywhere: instructions for the agent

Brought to you by [Gatori.ai](https://gatori.ai).

You help a person put a page they own onto the site builder they already use (Kajabi, GoHighLevel, Squarespace, WordPress, Webflow, Shopify, Wix, or another). The page is built and hosted on its own, then shown inside the builder in a frame. The frame keeps the page's design exactly as built, because the builder's theme cannot reach inside it.

| You were asked to | Read |
|---|---|
| Build a page and put it on someone's site | "The job, start to finish" |
| Fix an embed that looks wrong | "Step 5: check the published page" |
| Change this project's code or docs | "Working on the code" |

## The job, start to finish

Do every step. The job is finished when step 5 passes at every width, never earlier.

### Step 1: ask four things, one at a time

1. What the page is for, and what it should say. Use their words and facts. Never invent prices, dates, testimonials or numbers; leave a visible placeholder like `[PRICE]` and tell them.
2. Which site builder, and the address of the page it will appear on (or will appear on once published).
3. How it shows: the whole screen (a landing or sales page), a section that fits its content inside an existing page, or a fixed-height box (a calculator, form or widget). Explain the three in one line each if they are unsure. Full screen is the usual answer for a whole page.
4. Where they host: Netlify, Vercel, Cloudflare Pages or GitHub Pages. If they have no preference and have no account, Netlify is the simplest.

### Step 2: build the page

Start from `starter/` (copy the folder). Any framework works as long as the output is static files. Keep these rules, because each one prevents a visible defect once embedded:

- `body { margin: 0 }`. A browser's default 8px margin shows as a border inside the frame.
- Nothing wider than a phone screen: `img { max-width: 100%; height: auto }`, no fixed pixel widths on containers, long words and links allowed to wrap.
- Include `frame.js` before `</body>`, with the person's main domain: `<script src="frame.js" data-top-hosts="theirsite.com"></script>`. It keeps link clicks from loading other sites inside the frame, and the "fits its content" mode needs it to report height.
- For the "fits its content" mode, avoid `100vh` heights. The frame grows to fit the page, the viewport grows with the frame, and the page grows again. Use `.is-embedded` (set by frame.js) to switch those sections to a fixed or automatic height, as `starter/index.html` does with its hero.
- Checkout, booking and payment links should leave the frame: link them to the person's own domain (listed in `data-top-hosts`) or add `data-embed-target="top"`. Payment providers and many forms refuse to run inside a third-party frame, and Safari blocks their cookies there.
- Forms that post to a third-party service inside the frame can silently lose submissions in Safari. Prefer a form on the host page, a provider that documents iframe support, or a top-level submit.

### Step 3: host it

Keep `starter/netlify.toml` (Netlify) or `starter/vercel.json` (Vercel) next to the page. Both send `Content-Security-Policy: frame-ancestors *`, which lets any site show the page. Once the embed works, offer to replace `*` with the person's domains.

Deploy to production and note the final address. On Vercel, preview addresses ask for a login by default; embed the production address.

Then check that the page is public and frameable:

```
node bin/check-embed.mjs https://their-page.netlify.app --parent https://www.theirsite.com
```

Fix every FAIL before going on. A redirect warning means the snippet should use the final address it names.

### Step 4: make the snippet and give exact steps

```
node bin/embed-snippet.mjs --url https://their-page.netlify.app --platform kajabi --mode fullscreen --background "#f2ece0"
```

- `--platform`: kajabi, gohighlevel, squarespace, wordpress, webflow, shopify, wix, other
- `--mode`: fullscreen, auto (fits its content), fixed
- `--background`: the page's own background color, so no white flash shows while it loads
- auto mode: `--min` and `--max` heights; fixed mode: `--height`; both: `--full-bleed true|false` for edge to edge
- `--json` gives you the code, steps and notes as data

It prints the code and the numbered steps for that builder. Give the person both, unchanged. If you can operate their builder yourself (a browser tool with their session, or the builder's API), do the steps for them and tell them what you did.

The snippet already handles the usual first-embed problems: builder padding and margins, centered max-width columns, grid gaps, wrappers whose transform traps fixed elements, horizontal scroll from a full-width band, and the visitor's `?utm=` tags and `#anchor` (passed into the frame).

Kajabi, GoHighLevel and Squarespace are tested on live sites. The others are written from each builder's documented features and are marked untested, so step 5 matters even more there.

### Step 5: check the published page

Every embed gets checked on the published page, or on the builder's public preview address, at phone, tablet and desktop widths. Builders add their own wrappers on the first embed (extra margins, a section that refuses full width, padding on a hidden row), and you only see them on the real page.

```
npm install          # once, for playwright-core
node bin/verify-embed.mjs https://www.theirsite.com/their-page --url https://their-page.netlify.app
```

It opens the host page at 390, 768 and 1440 pixels wide, then:

- finds the frame and confirms the hosted page loaded inside it;
- full screen: confirms the frame fills the window from the top left corner and nothing sits on top of it;
- edge to edge: confirms the frame spans the window with no gap on either side;
- fits its content: confirms the height follows the page and nothing is cut off;
- confirms neither the host page nor the hosted page scrolls sideways;
- lists every wrapper around the frame that adds padding, margin, max-width, clipping or a transform, closest first;
- saves a screenshot per width in `embed-check/`.

Read the report and look at every screenshot. Then fix what it names:

| Report says | Usual fix |
|---|---|
| Full width fails, a wrapper lists padding or max-width | Set that section, row or column to full width with padding 0 in the builder, or switch on the builder's "full width" or "flush" option |
| A wrapper lists overflow-x hidden | That wrapper clips the band. Use full screen mode, or move the code block out of that section |
| Fills the window fails on a plain iframe | The person pasted their own iframe. Replace it with the generated snippet |
| Height stays at the minimum | frame.js is missing on the hosted page, or the snippet address redirects |
| Sideways scroll inside the frame | Something on the hosted page is too wide. Fix the page and redeploy it |
| Hosted page margin | Add `body{margin:0}` to the hosted page |
| Nothing on top fails | A chat bubble, cookie bar or popup from the builder covers the frame. Turn it off for this page |
| Page opens fails | The address is unpublished or needs a login |

Run it again after each fix until every width passes. Then tell the person it passed and at which widths, and show one screenshot.

When the page needs a login to view (an unpublished builder preview), or Node is unavailable: open the page in your browser tool, evaluate the whole of `embed/inspect.js` in the page, and read the returned report. Resize to a phone width and run it again. A person can paste the same file into the browser console.

### Things to tell the person

- Search engines and link previews read the builder's page. They should set its title, description and share image in the builder's page settings.
- To change the page later, they edit and redeploy the hosted page. The builder's code stays the same.

## Working on the code

| Path | What it is |
|---|---|
| `lib/snippet.js` | Builds the embed code, steps and notes for each builder and mode. Pure functions |
| `lib/headers.js` | Reads response headers and says whether another site may frame the page |
| `embed/frame.js` | Goes on the hosted page: embedded class, link routing, height messages |
| `embed/inspect.js` | Runs on the host page and measures the embed. One expression returning a report |
| `bin/embed-snippet.mjs` | Command line for `lib/snippet.js` |
| `bin/check-embed.mjs` | Fetches the hosted page and checks status, redirects, framing headers and frame.js |
| `bin/verify-embed.mjs` | Opens the host page in headless Chrome at three widths and runs `inspect.js` plus checks inside the frame |
| `starter/` | The page people copy. `starter/frame.js` must stay identical to `embed/frame.js` (a test checks) |
| `generator/`, `preview/` | The web version of the snippet maker, with a preview on a sample builder page |
| `demo/` | Sample host pages with hostile builder wrappers, generated by `scripts/build-demo.mjs` |
| `tests/` | `npm test`. No network and no browser needed |

Message types between frame.js and the snippet are `gatori-embed:height` and `gatori-embed:load`. The snippet accepts them only from its own frame's window and origin.

After a change to `lib/snippet.js`, `embed/frame.js` or `embed/inspect.js`: run `npm test`, rebuild the demo pages, serve the folder locally (`python3 -m http.server 8787`, then `node scripts/build-demo.mjs http://127.0.0.1:8787`), and run `bin/verify-embed.mjs` on `demo/fullscreen.html` and `demo/section.html`. Both must pass at every width. Rebuild the demo against the live address before committing.

Code that people paste into builders is ASCII only, with HTML entities for anything else. Keep the copy plain and short.
