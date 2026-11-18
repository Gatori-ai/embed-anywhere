# Playbook: any other builder

Untested. The same method works anywhere that accepts custom code.

## Find the channel

1. An API, MCP or connector that writes page content or page scripts. Search the builder's API documentation for "custom code", "HTML", "embed" or "scripts".
2. The person's signed-in browser.
3. Computer use.

## Find the place for the code

| The builder offers | Use |
|---|---|
| A block or element called Code, HTML, Embed or Custom Code | Format `html`, any mode |
| Page header or footer code, tracking code, "scripts" settings | Format `script` (or `loader` when there is a size limit), full screen |
| Only an embed by address (paste a URL) | Mode fixed with the builder's own element; the snippet is unused |

Put it on a page with no other content for full screen. Publish, then run verify on the published address.

## When verify finds the code inside another frame

Some builders nest custom code in their own frame of a fixed size. The report then says no embed was found on the page. Only fixed height fits there.
