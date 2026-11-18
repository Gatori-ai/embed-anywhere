# Playbook: Wix

Untested on a live site. Written from Wix's custom code and Embed HTML documentation; verify carefully.

## Channels, best first

1. **The person's signed-in browser** on the Wix dashboard and editor.
2. **Computer use**.

## Full screen: page-level custom code

1. Dashboard, then Settings, then Custom Code, then Add Custom Code.
2. Put the snippet in (format `script`), choose "Load code on specific pages" with only the target page, and place it at the end of the body.
3. Save, publish the site, and run verify on the page address.

Custom code may need a premium plan with a connected domain.

## Fixed height: Embed HTML element

Editor: Add, then Embed Code, then Embed HTML. Choose Code, put the snippet in (format `html`, mode `fixed`), drag the element to the full page width and the height you set, publish.

The element is its own frame of a fixed size, which is why only fixed height fits here.

## Fixing what verify reports

| Report | In Wix |
|---|---|
| Embed found fails on an Embed HTML element | Expected: Wix nests the code in its own frame. Open the Wix frame's address in the browser and run inspect.js there, or judge from the screenshots |
| Width short of the page | Stretch the element, or use a full-width strip |
