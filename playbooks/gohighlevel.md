# Playbook: GoHighLevel

Tested on live GoHighLevel funnel pages, fits-its-content mode, by driving the page builder in a signed-in browser.

## Channels, best first

1. **The person's signed-in browser** (Claude in Chrome, or Playwright or raw Chrome DevTools Protocol attached to their Chrome).
2. **Computer use** on the GoHighLevel builder.

The GoHighLevel API and its MCP servers can list funnels and pages and manage redirects, but they cannot write page content (checked against the Funnels API). Placing the code always goes through the builder.

## In the builder

1. Open the sub-account, then Sites, then Funnels or Websites, then the funnel and its step. For a new page, the fastest path is cloning an existing step that already holds a framed page ("Clone step in this funnel"), then setting Step name and Step URL on its Publishing tab.
2. Edit the step. Keep one section. Set the section, its row and its column to full width with padding and margin 0.
3. Add a Custom Code (Custom JS/HTML) element to the column, open its code editor and put the snippet in (format `html`).
4. Save, then Publish.
5. The address is on the step's Publishing tab (the builder header can show a stale path). Run verify on it.

## Driving the builder

- The builder UI sits in a cross-origin frame (`page-builder.leadconnectorhq.com`). Playwright locators on the top page find nothing inside it, and typed keys reach the canvas as builder shortcuts.
- What works: Claude in Chrome clicks and reads inside it; or attach to the frame's own target over Chrome DevTools Protocol (`Target.attachToTarget` with flatten) and set inputs with the native value setter plus `input` and `change` events; or click by coordinates (screenshot pixels divided by the device pixel ratio).
- Code editor: click inside, select all, then paste from the clipboard (`pbcopy` on a Mac, then Meta+V). Read the last line afterwards; the editor's autocomplete has added a stray word before.
- Reloading the builder discards unsaved changes. Save first.

## Fixing what verify reports

| Report | In GoHighLevel |
|---|---|
| A wrapper with padding or width | Section, row and column: full width, padding 0, margin 0 (each has its own settings) |
| Frame shows at the minimum height | Scripts in the Custom Code element run on the published page only; verify the published address |

## Notes

- Search engines and link previews read the GoHighLevel page: set the title, description and share image in the builder's SEO settings.
- Many accounts build some pages natively in the builder. Embedding is for pages that need their own design or redeploys from code.
