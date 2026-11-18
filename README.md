<p align="center"><img src="generator/gatori-enso.png" alt="" width="64"></p>

<h1 align="center">Embed Anywhere</h1>

<p align="center">Build your own page, host it on Netlify or Vercel, and show it inside Kajabi, GoHighLevel, Squarespace or any site builder you already use.<br>Brought to you by <a href="https://gatori.ai">Gatori.ai</a>.</p>

---

Site builders make custom design hard. Their themes override your fonts, their sections add padding, and their editors strip your scripts. Embed Anywhere takes a different route: your page lives on its own host, exactly as you built it, and your builder shows it in a frame. Visitors stay on your domain and see your page pixel for pixel.

Your AI agent can do the whole job. Point Claude Code, Codex, Cursor or another coding agent at this repository and ask:

> Build me a sales page for my coaching program, host it on Netlify, and put it on my Kajabi site at /coaching.

It follows [AGENTS.md](AGENTS.md): it builds the page, deploys it, checks the page can be framed, writes the code for your builder with exact steps, and then checks the published page at phone, tablet and desktop widths until nothing is off.

| If you are | Start with |
|---|---|
| A person who wants the code now | The web generator (see [Run the generator](#run-the-generator)), or [By hand](#by-hand) |
| An AI agent asked to do this for someone | [AGENTS.md](AGENTS.md) |
| An AI agent asked to change this project | [AGENTS.md, "Working on the code"](AGENTS.md#working-on-the-code) |

## Three ways to show a page

| Mode | What visitors see | Good for |
|---|---|---|
| Full screen | Your page fills the browser window and scrolls inside the frame. Its sticky menus keep working. The builder's header and footer are covered. | Landing pages, sales pages, whole sites |
| Fits its content | A band across the page that grows to your page's height. Visitors scroll the host page as usual. | A custom section inside an existing page |
| Fixed height | A box of the height you choose. | Calculators, forms, widgets |

## Builders

| Builder | Status | Modes |
|---|---|---|
| Kajabi | Tested on live sites | all three |
| GoHighLevel | Tested on live sites | all three |
| Squarespace | Tested on live sites | all three |
| WordPress | Untested | all three |
| Webflow | Untested | all three |
| Shopify | Untested | all three |
| Wix | Untested | fixed height (Wix puts custom code in its own fixed-size frame) |
| Anything with an HTML block | Untested | all three |

Untested means the steps come from each builder's documented features. The verify step tells you within a minute whether it worked on your page. Tested it on another builder? Open an issue or a pull request with what you found.

## What the code handles for you

The first embed on a builder usually comes out wrong: a gap on each side, a section that refuses full width, a white border, a sideways scrollbar on phones, a page cut off at the bottom. The generated code is built to survive those:

- **Full screen** places the page in a fixed layer over the whole window, so builder padding, centered columns and grid gaps cannot squeeze it. If a builder wrapper uses a CSS transform (which traps fixed elements), the code moves the layer to the top of the page.
- **Edge to edge** measures where the builder put the block and pulls the band to the window's edges at the window's width, and clips the stray pixels that cause sideways scrolling.
- **Fits its content** follows your page's height through messages from `frame.js`, accepted only from your own frame, with a minimum and maximum.
- Your visitor's `?utm_source=` tags and `#anchor` links pass through to your page.
- `frame.js` on your page sends links to your main site to the whole window and opens other sites in a new tab, so nothing loads inside the frame by accident.

## Check the published page

Always check the real page, because each builder adds its own wrappers. After publishing (or on the builder's public preview address):

```
npm install
node bin/verify-embed.mjs https://www.yoursite.com/your-page --url https://your-page.netlify.app
```

It opens the page at 390, 768 and 1440 pixels wide in headless Chrome and reports, for each width: whether the frame loaded, fills the window or spans edge to edge, follows its content's height, and whether anything scrolls sideways. When something fails it lists the builder wrappers adding padding, margins, max-width, clipping or transforms, closest first, so you know which setting to change. It saves a screenshot per width in `embed-check/`. You need Node 20 or later and Google Chrome.

For a preview that needs a login, open it in your browser and paste [`embed/inspect.js`](embed/inspect.js) into the developer console. It prints the same report for the width you are looking at.

## By hand

1. Copy [`starter/`](starter/) and make it your page. Keep `frame.js` and the `<script src="frame.js">` line, with your own domain in `data-top-hosts`.
2. Deploy the folder to Netlify or Vercel. The included `netlify.toml` and `vercel.json` allow other sites to frame the page.
3. Check it can be embedded: `node bin/check-embed.mjs https://your-page.netlify.app`
4. Make the code: `node bin/embed-snippet.mjs --url https://your-page.netlify.app --platform kajabi --mode fullscreen --background "#ffffff"` and follow the steps it prints.
5. Publish, then run the check above.

## Run the generator

The web version makes the same code with a live preview on a sample builder page.

```
python3 -m http.server 8080
```

Open `http://localhost:8080/generator/`. The repository deploys as a static site too (`netlify.toml` is included): the generator sits at `/`, the starter page at `/starter/`, and two sample host pages at `/demo/`.

## Trade-offs

- Search engines index the builder's page, and your content sits inside the frame. Pages that depend on organic search do better built natively. Set the builder page's title, description and share image in its settings, because link previews read those.
- Full screen pages scroll inside the frame. On phones this behaves like a normal page in current browsers.
- Payment and booking providers often refuse to run inside a frame from another site. Link checkouts to your main site or a provider page so they open in the whole window.

## License

MIT. Use it, change it, sell what you build with it.
