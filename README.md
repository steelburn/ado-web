# ado-code.ne1.dev — ADO Code website

Marketing / landing site for the **ADO Code** VS Code extension
([marketplace](https://marketplace.visualstudio.com/items?itemName=steelburn.ado-code),
[GitHub](https://github.com/steelburn/ado-code)).

## Stack

Static HTML + CSS + vanilla JS. No build step, no framework, no dependencies.
Deploys anywhere: nginx container, Netlify, Cloudflare Pages, or any static host.

- `index.html` — single landing page (hero + VS Code mockup, feature highlights, comprehensive feature reference table, modes, agents, commands, install)
- `assets/css/style.css` — design tokens + components (dark developer-tool theme, Azure accent, IBM Plex)
- `assets/js/main.js` — mode demo, tree mockup, copy-to-clipboard, mobile nav, scroll reveal
- `assets/img/` — logo, favicon, OG image
- `Dockerfile` / `nginx.conf` / `security-headers.conf` / `docker-compose.yml` — nginx container deployment (gzip, caching, security headers)
- `sitemap.xml`, `robots.txt` — SEO basics

## Local development

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Or with Docker:

```sh
docker compose up --build   # http://localhost:8080
```

## Deploy

### Docker / nginx + Cloudflare tunnel (this repo's setup)

```sh
# 1. Put your tunnel token in .env (see .env.example), then:
docker compose up -d --build
# nginx: http://localhost:3060
# cloudflared: connects to Cloudflare edge automatically
```

The tunnel token is read from `.env` (`CLOUDFLARE_TUNNEL_TOKEN=...`), which is
gitignored. Copy `.env.example` and fill in your token.

**One-time Cloudflare dashboard steps** (can't be done from here):

1. Make sure the `ne1.dev` zone is active on Cloudflare (add the site to
   Cloudflare, then point the registrar's nameservers at Cloudflare).
2. In Zero Trust → Networks → Tunnels, open the tunnel and add a public
   hostname: `ado-code.ne1.dev` → service URL `http://web:80` (the compose
   network name of the nginx container). Cloudflare auto-creates the
   `ado-code.ne1.dev` CNAME record.

The site is then live at https://ado-code.ne1.dev — no open inbound ports
needed beyond the tunnel's outbound connection.

### Plain nginx (alternative, no tunnel)

```sh
docker build -t ado-code-site .
docker run -d -p 3060:80 ado-code-site
```

Point `ado-code.ne1.dev` (A/AAAA or CNAME) at the host, terminate TLS with
your reverse proxy of choice (Caddy/Traefik/nginx), and forward to port 3060.

### Netlify / Cloudflare Pages

Upload the repository root as the publish directory. No config needed.

## Updating content

- Version shown in the nav badge, hero eyebrow, hero meta and footer is hardcoded
  in `index.html` (also in the JSON-LD block). Bump it when a new extension
  version ships.
- Feature copy lives in the section markup of `index.html` — keep it in sync
  with the extension's `README.md` release notes.

## License

Site content © 2026 Khairulnizam Hasan (steelburn).
