# Embed Anywhere: the runbook

Brought to you by [Gatori.ai](https://gatori.ai).

You put a page the person owns onto the site builder they already use (Kajabi, GoHighLevel, Squarespace, WordPress, Webflow, Shopify, Wix, or another). You build the page, host it, place it in the builder in a frame, publish, and check the published result. You do every step yourself through the tools you have: the builder's MCP, connector or API; the person's signed-in browser; or computer use. The person answers questions and approves the publish. They never copy, paste or edit code.

The frame keeps the page's design exactly as built, because the builder's theme cannot reach inside it.

| You were asked to | Go to |
|---|---|
| Put a page on someone's site | "The run" |
| Put a page they already have on their site (HTML files, or a page already live somewhere) | "The run", with "Starting from a page that exists" at step 2 |
| Fix an embed that looks wrong | "Step 6: verify and fix" |
| Change this project's code or docs | "Working on the code" |

## The run

The run ends when step 6 passes at every width. Report then, never earlier.

### Step 0: take stock of your channels

Before asking anything, find out what you can operate. Check, without asking the person:

- **Hosting:** which of Netlify, Vercel, Cloudflare or GitHub you can deploy to ([playbooks/hosting.md](playbooks/hosting.md) has the checks).
- **The builder:** an MCP server, connector or API key for it; a browser tool attached to the person's own browser, where they are already signed in; computer use.
- **This toolkit:** `node --version` (20 or later) and `npm install` in this folder. `npm run selftest` proves the verify step works on this machine (about a minute).

If you lack a channel to the builder, ask the person to connect one, in one sentence, naming the easiest option you know works for that builder (for example "connect the Kajabi MCP", or "turn on the Claude in Chrome extension and sign in to GoHighLevel in that browser"). Their part is the sign-in. Never ask for a password, and never type one.

### Step 1: ask what only the person knows

One question at a time, and only what you cannot find yourself:

1. Whether the page exists already. Look first: a file or folder they named, a page address in the request, a repository. If it exists, skip the content question.
2. What the page is for and what it says, in their words (new pages only). Never invent prices, dates, testimonials or numbers. Use a visible placeholder like `[PRICE]` and list each one in your report.
3. Which builder and site, and the page address it should live at. Look up the site's domains yourself through your channel when you can.
4. How it shows. Decide it yourself unless the request leaves it open: a whole landing or sales page is **full screen**; a custom section inside an existing page is **auto** (fits its content); a calculator, form or widget is **fixed**.

### Step 2: build the page

Copy `starter/` and build from it. Any framework works if the output is static files. Each rule below prevents a defect that shows once the page is embedded:

- `body { margin: 0 }`. A default 8px margin shows as a border inside the frame.
- Nothing wider than a phone: `img { max-width: 100%; height: auto }`, no fixed pixel widths on containers.
- Keep `frame.js` and its tag before `</body>`, with the person's domains: `<script src="frame.js" data-top-hosts="theirsite.com"></script>`. It sends links to their own site to the whole window and opens other sites in a new tab, and auto mode needs it for the height.
- Auto mode: avoid `100vh` heights. The frame grows with the page and the viewport grows with the frame. Switch those sections under `.is-embedded`, as `starter/index.html` does with its hero.
- Checkout, booking and payment links leave the frame: point them at the person's own domain or add `data-embed-target="top"`. Payment providers and many forms refuse to run inside another site's frame, and Safari blocks their cookies there.

### Starting from a page that exists

Keep the page's design and copy exactly as they are. Change only what embedding needs.

| They have | Do |
|---|---|
| One HTML file, or a folder of static files | `node bin/prepare-page.mjs <file or folder> --top-hosts theirsite.com`. It writes a prepared copy next to the original (`<name>-embed-ready`), with the original untouched: frame.js added to every HTML file, `body{margin:0}` added first in the head so the page's own CSS still wins, the local files a single page points at copied along, and host config that allows framing (`_headers` for Netlify and Cloudflare, `vercel.json` for Vercel, merged into an existing one). Read its warnings, then host the prepared folder at step 3. A `.zip` gets unzipped first |
| A repository or folder with a host already deploying it | Run `prepare-page` with `--in-place`, review the diff, commit and push so their host redeploys. Keep their host |
| App source (a `package.json` with a build script) | `prepare-page` stops and names the build. Either build and prepare the output folder (`dist/`, `build/`, `out/`), or put `frame.js` in the static folder (`public/`), its tag in the root HTML or layout, and the frame-ancestors header in the host config, then let their host build it |
| A page already live at an address | Run `bin/check-embed.mjs <address> --parent <builder page>` and use the result below |

For a page already live, by what `check-embed` reports:

- **Framing allowed, frame.js absent:** full screen and fixed height work as it is; go straight to step 4. Auto mode, and links that leave the frame, need frame.js: add it where the page's files live (their repository, or the tool that made it, such as Lovable, Bolt, v0 or Framer, through its code or custom code setting), or use full screen.
- **Framing blocked:** the host sends `X-Frame-Options` or a narrow `frame-ancestors`. Change that header where the page is hosted (the fix line names it). When the person cannot change it, get the page's files (the tool's export or GitHub sync, or their repository), prepare them and host them at step 3. Copy only pages the person owns.
- **Needs a login:** use the production or public address. Vercel previews are protected by default.
- **Frame busting warning:** a script on the page jumps out of any frame. Remove it or guard it as the warning says, and redeploy.

### Step 3: host it

Skip this step when the page is already live and `check-embed` passed.

Follow [playbooks/hosting.md](playbooks/hosting.md). Deploy to production, then:

```
node bin/check-embed.mjs https://their-page.netlify.app --parent https://www.theirsite.com
```

Fix every FAIL before you touch the builder. If it reports a redirect, use the final address it names from here on.

### Step 4: build the embed code

```
node bin/embed-snippet.mjs --url https://their-page.netlify.app --platform kajabi --mode fullscreen --background "#f2ece0" --json
```

- `--platform`: kajabi, gohighlevel, squarespace, wordpress, webflow, shopify, wix, other
- `--mode`: fullscreen, auto, fixed
- `--format`: `html` for a code block on the page (the default); `script` for channels that take only scripts (page header or footer code); `loader` for script channels with a size limit or hosted script registration (add `--files-dir <hosted page folder>`, then redeploy the hosted page)
- `--background`: the hosted page's background color, so no white flash shows while it loads
- auto: `--min`, `--max`; fixed: `--height`; both: `--full-bleed true|false` for edge to edge

The JSON gives you `code`, `playbook`, `verify` (the command for step 6) and `notes`. The code already handles the usual first-embed problems: builder padding and margins, centered max-width columns, grid gaps, wrappers whose transform traps fixed elements, sideways scroll from a full-width band, and the visitor's `?utm_` tags and `#anchor` (passed into the frame).

### Step 5: place it and publish

Open the playbook the JSON names and follow the first channel in it that you have:

| Builder | Tested | Playbook |
|---|---|---|
| Kajabi | yes | [playbooks/kajabi.md](playbooks/kajabi.md) |
| GoHighLevel | yes | [playbooks/gohighlevel.md](playbooks/gohighlevel.md) |
| Squarespace | yes | [playbooks/squarespace.md](playbooks/squarespace.md) |
| WordPress | no | [playbooks/wordpress.md](playbooks/wordpress.md) |
| Webflow | no | [playbooks/webflow.md](playbooks/webflow.md) |
| Shopify | no | [playbooks/shopify.md](playbooks/shopify.md) |
| Wix | no | [playbooks/wix.md](playbooks/wix.md) |
| Anything else | no | [playbooks/other.md](playbooks/other.md) |

Untested playbooks come from each builder's documentation. Expect a surprise or two and lean on step 6.

Rules for this step:

- Before changing an existing page, save what is there (the builder's content as JSON, or a screenshot and the code you replace) so it can be put back.
- Publishing puts the page in front of the public. If the request did not already say to publish, get one yes from the person first, with the address it will go live at. A new, unlinked page or the builder's preview is fine to use without asking.
- Put the code in exactly as generated. Builders' code editors sometimes add characters (autocomplete, smart quotes); read the saved code back and compare.
- Set the builder page's own title, description and share image. Search engines and link previews read the builder's page, never the frame.

### Step 6: verify and fix

Builders add their own wrappers on the first embed: extra margins, a section that refuses full width, padding on a hidden row, a chat bubble on top. You see them only on the real page, so every embed gets checked on the published page or the builder's preview address:

```
node bin/verify-embed.mjs https://www.theirsite.com/their-page --url https://their-page.netlify.app --json
```

It opens the page in headless Chrome at 390, 768 and 1440 pixels wide and reports per width:

- whether the frame is there and the hosted page loaded inside it;
- full screen: the frame fills the window from the top left and nothing covers it;
- edge to edge: the frame spans the window with no gap at either side;
- auto: the height follows the content and nothing is cut off;
- neither the host page nor the hosted page scrolls sideways;
- `suspects`: every wrapper around the frame adding padding, margin, max-width, clipping or a transform, closest first;
- a screenshot per width in `embed-check/`. Look at every one.

Fix through the same channel you used to place the code. The playbook's "Fixing what verify reports" table maps each failure to the builder setting. The usual ones:

| Report | Usual fix |
|---|---|
| Full width fails; a suspect lists padding or max-width | Set that section, row or column to full width with padding 0 |
| A suspect lists overflow-x hidden | That wrapper clips the band: switch to full screen, or move the code out of that section |
| Fills the window fails on a plain iframe | Someone placed their own iframe. Replace it with the generated code |
| Height stays at the minimum | frame.js is missing on the hosted page, or the address redirects |
| Sideways scroll inside the frame | Something on the hosted page is too wide. Fix the page and redeploy it |
| Hosted page margin | `body{margin:0}` on the hosted page, redeploy |
| Nothing on top fails | A chat bubble, cookie bar or popup covers the frame. Turn it off for this page |
| Page opens fails | The page is unpublished or needs a login: use the in-browser check below |

Repeat until every width passes.

**Pages that need a login, or no Node:** open the page in the browser tool you already drive, evaluate the whole of `embed/inspect.js` in the page, and read the report it returns. Resize to 390 pixels wide and run it again, then at desktop width.

### Report

Tell the person, in a few lines: the live address, that it passed verification and at which widths, one screenshot, any placeholders they still need to fill, and that future changes go to the hosted page (you redeploy it; the builder stays as it is). Then offer to restrict `frame-ancestors` to their domains ([playbooks/hosting.md](playbooks/hosting.md)), or do it if the request covered it.

## Working on the code

| Path | What it is |
|---|---|
| `lib/snippet.js` | Builds the embed code for each builder, mode and format; names the playbook and verify command |
| `lib/prepare.js` | Adds frame.js and the margin rule to existing HTML; audits for frame busting, 100vh and framing headers |
| `bin/prepare-page.mjs` | Command line for `lib/prepare.js` on a file or folder |
| `lib/headers.js` | Reads response headers and says whether another site may frame the page |
| `embed/frame.js` | Goes on the hosted page: `is-embedded` class, link routing, height messages |
| `embed/inspect.js` | Runs on the host page and measures the embed. One expression that returns a report |
| `bin/embed-snippet.mjs` | Command line for `lib/snippet.js` |
| `bin/check-embed.mjs` | Fetches the hosted page: status, redirects, framing headers, frame.js |
| `bin/verify-embed.mjs` | Headless Chrome at three widths: runs `inspect.js`, checks inside the frame, saves screenshots |
| `playbooks/` | How to place the code in each builder, channel by channel |
| `starter/` | The page to build from. `starter/frame.js` must stay identical to `embed/frame.js` (a test checks) |
| `scripts/selftest.mjs` | Serves sample host pages with hostile builder wrappers and runs verify on each, including a plain existing page before and after `prepare-page` |
| `tests/` | `npm test`: offline, no browser |

Message types between frame.js and the embed code are `gatori-embed:height` and `gatori-embed:load`. The embed code accepts them only from its own frame's window and origin.

After a change to `lib/`, `embed/`, `bin/` or `starter/frame.js`: `npm test` and `npm run selftest` must both pass. A playbook change that comes from a live run should say which builder version or date it was checked on. Embed code is ASCII only. Keep the copy plain and short.
