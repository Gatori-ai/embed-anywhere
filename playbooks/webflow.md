# Playbook: Webflow

Untested on a live site. Written from the Webflow Data API (custom code endpoints) and Designer documentation; verify carefully.

## Channels, best first

1. **Webflow connector, MCP or Data API** with custom code and site publish access. The API places scripts on a page; it cannot add an Embed element to the canvas. That fits full screen mode.
2. **The person's signed-in browser** in the Webflow Designer.
3. **Computer use** in the Designer.

## Through the Data API (full screen)

1. Build the snippet with `--format loader --files-dir <hosted page folder>` and redeploy the hosted page, so `embed-loader.js` is live. The loader tag is short and carries an integrity hash, which hosted script registration asks for.
2. Register it as a hosted script on the site (`POST /v2/sites/{site_id}/registered_scripts/hosted` with the `embed-loader.js` address, the integrity hash, a display name and a version).
   An inline registration (`registered_scripts/inline`) with `--format script` also works when the code fits the API's inline size limit.
3. Find or create the page, then apply the script to it (`PUT /v2/pages/{page_id}/custom_code`, location `footer`).
4. Publish the site (`POST /v2/sites/{site_id}/publish`).
5. Run verify on the published page address.

## In the Designer (any mode)

Create a page with one Section. Add a Code Embed element, put the snippet in it (format `html`), save, publish the site.

## Fixing what verify reports

| Report | In Webflow |
|---|---|
| A wrapper with max-width or padding | The Section or Container style; remove the Container or set it to full width |

## Notes

- Custom code may need a paid site plan.
