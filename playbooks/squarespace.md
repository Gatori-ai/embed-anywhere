# Playbook: Squarespace

Tested on a live Squarespace 7.1 site, full screen.

## Channels, best first

1. **The person's signed-in browser** (Claude in Chrome or another browser tool).
2. **Computer use** on the Squarespace editor.

Squarespace has no public API that writes page content.

## In the editor

1. Pages, then the plus button, then Blank Page. Name it and set its URL slug in page settings.
2. Edit the page. Add a block, choose Code. Leave it in HTML mode with Display Source off.
3. Put the snippet in the block (format `html`) and save. For fits-its-content mode, stretch the block across the full grid width first.
4. Save the page. New pages are visible once saved unless the site is private.
5. The address is `https://<domain>/<slug>`. Run verify on it.

Script route (full screen only, untested): page settings, Advanced, Page Header Code Injection, with the snippet in `script` format. It keeps the page editable, because no block covers the editor. Code injection needs a plan that includes it.

## Fixing what verify reports

| Report | In Squarespace |
|---|---|
| A wrapper with padding or width (auto or fixed mode) | Stretch the Code block across all grid columns; set the section's padding to the smallest value |
| Header or footer showing (full screen) | The full screen code hides them on this page; check the block was saved |

## Notes

- The full screen code covers the page inside the editor too. To edit later, open the page sections list and select the Code block there.
- If the Code block refuses scripts, the site's plan may limit custom code.
