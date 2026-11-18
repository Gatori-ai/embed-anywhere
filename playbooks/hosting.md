# Playbook: hosting the page

Use whatever host the person already has connected. Check in this order and take the first that works:

| Host | Connected when | Deploy |
|---|---|---|
| Netlify | `npx netlify status` shows a logged-in user, or a Netlify MCP or API token is available | `npx netlify sites:create --name <name>` once, then from the page folder `npx netlify deploy --prod --no-build --dir . --site <site id>`. Read the site address from the output |
| Vercel | `npx vercel whoami` answers, or a Vercel MCP or token is available | From the page folder: `npx vercel deploy --prod --yes`. Use the production address it prints |
| Cloudflare Pages | `npx wrangler whoami` answers | `npx wrangler pages deploy . --project-name <name>` |
| GitHub Pages | `gh auth status` answers | Push the folder to a public repository and enable Pages through `gh api` (`POST /repos/{owner}/{repo}/pages`). GitHub Pages sends no framing headers, so it can be embedded |

None connected: ask the person to connect one, in one sentence, and say what will happen ("I'll open Netlify's sign-in in your browser; approve it and I'll do the rest"). `npx netlify login` and `npx vercel login` open the browser for them. Never type a password for them.

Rules:

- Deploy the folder that holds `index.html`, `frame.js` and the host config: `netlify.toml` or `vercel.json` from `starter/`, or the `_headers` and `vercel.json` that `bin/prepare-page.mjs` writes. The config sends `Content-Security-Policy: frame-ancestors *`, which lets the builder show the page.
- A page already deploying from their repository stays on that host. Commit the prepared files and let it redeploy.
- Use the production address. Vercel preview addresses need a login by default, and so do password-protected Netlify sites.
- With the loader format, also deploy the `embed-loader.js` the snippet command wrote. The starter config gives it the cross-origin header the integrity check needs.
- After deploying, run `node bin/check-embed.mjs <address> --parent <builder page address>` and fix every FAIL before touching the builder.
- Once the embed passes verification, tighten `frame-ancestors` to the person's own domains (for Kajabi also `https://*.mykajabi.com`, for GoHighLevel the funnel domain), redeploy, and verify again.
- Changing the page later: edit and redeploy the hosted page. The builder code stays the same.
