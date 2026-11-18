# Playbook: Kajabi

Tested on live Kajabi sites (Encore theme), full screen mode, through the Kajabi MCP.

## Channels, best first

1. **Kajabi MCP** (tools named `create_landing_page`, `get_theme_content`, `update_theme_content`, `update_landing_page`). Writes the page directly; no editor UI.
2. **The person's signed-in browser** (Claude in Chrome, a Playwright connection to their Chrome, or another browser tool).
3. **Computer use** on the Kajabi editor.

## Through the Kajabi MCP

1. Pick the site (`list_sites`, `select_site`). The MCP limits how many toolsets are active; if a call says a tool is unavailable, enable the `pages` or `themes` toolset again and retry.
2. New page: `create_landing_page` with the title and slug. It returns the page and its `active_theme_id`. Existing page: read it first with `get_theme_content` and keep the full result as a backup before changing anything.
3. `update_theme_content` on that theme:
   - set the `header` and `footer` sections to `hide_on_desktop: "true"` and `hide_on_mobile: "true"` (full screen mode);
   - set `content_for_index` to one section, for example `["embed"]`;
   - that section: `full_width: "true"`, `make_flush: "true"`, padding 0, `background_color` the page background;
   - one block of type `code` in that section, whose code is the snippet (format `html`).
4. Publish with `update_landing_page` and a `publish_at` time (ISO 8601). A time a minute ahead shows as scheduled, then flips to published.
5. The published address is `https://<site domain>/<slug>`. Run verify on it.

To give the embed a slug already in use: change the old page's slug first (its content stays at the new address), then give the new page the slug, then publish.

## Through the browser or computer use

Website, then Landing Pages, then New Landing Page. Hide the Header and Footer sections on desktop and mobile. Keep one section, set it to full width, flush, padding 0. Add a Custom Code block and put the snippet in its code field. Save, then Publish.

## Fixing what verify reports

| Report | In Kajabi |
|---|---|
| A wrapper with padding or max-width (auto or fixed mode) | Section settings: full width on, flush on, top and bottom padding 0 |
| Header or footer showing (auto mode) | Hide the Header and Footer sections |
| Nothing on top fails | A Kajabi chat or announcement bar is on; turn it off for this page |

## Notes

- Code blocks keep scripts and styles. Text blocks strip them.
- Theme writes are immediate. The page stays private until published.
- Search engines and link previews read the Kajabi page: set its SEO title, description and share image through `update_landing_page` or the page settings.
- Anchor links: the full screen code passes `#section` from the Kajabi address into the frame.
