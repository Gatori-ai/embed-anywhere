# Playbook: WordPress

Untested on a live site. Written from the WordPress REST API and block editor documentation; verify carefully.

## Channels, best first

1. **WordPress connector, MCP or REST API** the person already has set up (an application password or OAuth on the site).
2. **The person's signed-in browser** on wp-admin.
3. **Computer use** on wp-admin.

## Through the REST API

1. Create the page as a draft:
   `POST /wp-json/wp/v2/pages` with `title`, `slug`, `status: "draft"` and `content` set to the snippet wrapped in a Custom HTML block:
   `<!-- wp:html -->` + snippet + `<!-- /wp:html -->`
2. Full screen: set `template` to the theme's blank or full-width template if it has one (`GET /wp-json/wp/v2/templates` on block themes lists them).
3. Read the page back (`GET /wp-json/wp/v2/pages/<id>?context=edit`) and confirm the `<script>` survived. Scripts survive only for users allowed unfiltered HTML (administrators on a single site).
4. Publish: update `status` to `publish`. The page's `link` is the address. Run verify on it.

## Through the browser

Pages, then Add New. Add a Custom HTML block (block editor) or an HTML widget (Elementor), put the snippet in it, choose a full-width template in the page settings, publish.

## Fixing what verify reports

| Report | In WordPress |
|---|---|
| A wrapper with max-width (auto or fixed mode) | Set the block's alignment to full width, or use a full-width page template |
| Wrapper padding | The theme's content padding; a blank or canvas template removes it |

## Notes

- WordPress.com may strip scripts and frames on some plans.
- Security plugins can strip iframes from content. Read the saved page back.
