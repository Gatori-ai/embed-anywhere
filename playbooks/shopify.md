# Playbook: Shopify

Untested on a live store. Written from the Shopify Admin API and Online Store 2.0 theme documentation; verify carefully.

## Channels, best first

1. **Shopify connector, MCP or Admin API** with theme and content write access.
2. **The person's signed-in browser** on the Shopify admin and theme editor.
3. **Computer use**.

## Through the Admin API

1. Find the live theme (`GET /admin/api/<version>/themes.json`, role `main`).
2. Add one new template file, leaving every existing file untouched: `templates/page.embed-anywhere.json`, with one section of type `custom-liquid` whose `custom_liquid` setting is the snippet (format `html`). Most Online Store 2.0 themes, Dawn included, ship the `custom-liquid` section; check the theme's `sections/` list first.
3. Create the page (`POST /admin/api/<version>/pages.json`) with `template_suffix: "embed-anywhere"`.
4. The address is `https://<store domain>/pages/<handle>`. Run verify on it.

## Through the theme editor

Online Store, then Themes, then Customize. Create a page template, remove its default sections, add a Custom Liquid section, put the snippet in it, save. Assign the template to the page.

## Fixing what verify reports

| Report | In Shopify |
|---|---|
| A wrapper with padding or width | The section's padding settings, or the theme's page width setting |
| Header or footer showing (auto or fixed mode) | They are section groups shared by every page; use full screen mode to cover them |

## Notes

- Checkout links should leave the frame (`data-embed-target="top"` or the store's own domain in `data-top-hosts`).
