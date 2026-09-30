# ado-code.ne1.dev — ADO Code website

Marketing / landing site for the **ADO Code** VS Code extension
([marketplace](https://marketplace.visualstudio.com/items?itemName=steelburn.ado-code),
[GitHub](https://github.com/steelburn/ado-code)).

## Stack

Static HTML + CSS + vanilla JS. **No build step, no bundler, no framework, no
dependencies** — shared page chrome (header/footer) is hand-duplicated across
every page and kept honest by a parity test. Deploys anywhere: nginx container,
Netlify, Cloudflare Pages, or any static host.

- `index.html` — landing page (hero + VS Code mockup, capability highlights, install CTA)
- `features.html` — the feature reference: highlights + the comprehensive feature table
- `gallery.html` — screenshot gallery + the launch film
- `modes.html` — the Modes tab demo
- `agents.html` — the agents overview
- `commands.html` — the command reference
- `install.html` — install steps
- `faq.html` — FAQ (own `FAQPage` JSON-LD + `<details>` accordions)
- `404.html` — not-found page (`noindex`)
- `deck.html` — presentation deck (v0.6.7): 17 slides (including a screenshot gallery and a capability-highlights slide) with speaker notes, an overview grid, progress bar and keyboard navigation (←/→/Space, G overview, N notes, F fullscreen)
- `assets/video/ado-code-launch.mp4` (+ `-poster.jpg`) — the 93-second narrated launch film, embedded on the home page and on the deck's launch-film slide
- `assets/css/style.css` — design tokens + components (dark developer-tool theme, Azure accent, IBM Plex)
- `assets/css/deck.css` — deck theme (brand-matched, print/PDF rules)
- `assets/js/main.js` — mode demo, tree mockup, copy-to-clipboard, mobile nav, scroll reveal
- `assets/js/deck.js` — deck controller (keyboard, overview grid, fullscreen, progress, touch swipe)
- `assets/img/` — logo, favicon, OG image
- `assets/img/screenshots/` — marketing screenshot library: `manifest.json` (source of truth), capture guide, one PNG per shot (`node scripts/make-screenshots.mjs`)
- `Dockerfile` / `nginx.conf` / `security-headers.conf` / `docker-compose.yml` — nginx container deployment (gzip, caching, security headers); `nginx.conf` also carries the extensionless 301 aliases (`/features` → `/features.html`, …, `/deck`) and the `404.html` error page
- `sitemap.xml`, `robots.txt` — SEO basics; the sitemap lists all 9 pages with `lastmod`
- `_partials/header.html` / `_partials/footer.html` — canonical chrome (copied into each page; not a build input)
- `scripts/site-pages.mjs` — single source of truth for the page set (titles, canonicals, nav, JSON-LD)

## Screenshots

Marketing screenshots are a first-class asset with their own source of truth:

```
assets/img/screenshots/
├── manifest.json   # every shot: id, file, width/height, alt, caption, usedOn, capture recipe
├── README.md       # capture guide: window size, theme, demo data, redaction, per-shot recipes
└── <id>.png        # one PNG per shot (generated stand-in until captured)
```

```sh
node scripts/make-screenshots.mjs           # render missing stand-in PNGs + report the backlog
node scripts/make-screenshots.mjs --check   # fail when the manifest and the PNGs disagree
node scripts/make-screenshots.mjs --list    # the capture backlog
```

Pages reference a shot **by id** — `<figure class="shot" data-shot="backlog-tree" data-state="placeholder">`.
While `data-state="placeholder"` the figure renders as a caption card and the
generated stand-in is never displayed. To publish a capture: drop the PNG in
`assets/img/screenshots/`, flip `data-state` (and the manifest `status`) to
`captured`, bump `SITE_VERSION` and run `node scripts/set-site-version.mjs`.
Review the layout with stand-ins visible via `gallery.html?shots=placeholders`.
`tests/screenshots.test.mjs` fails if the manifest, the PNGs, the markup copy or
the capture guide drift apart.

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
  in **every** page's markup (and the JSON-LD block): bump `SITE_VERSION` in
  `scripts/site-version.mjs`, run `node scripts/set-site-version.mjs`, then update
  the extension version strings when a new extension version ships.
- Feature copy lives in the per-page markup (`features.html`, `modes.html`,
  `agents.html`, `commands.html`, …) — keep it in sync with the extension's
  `README.md` release notes.
- Adding a page: add it to `scripts/site-pages.mjs`, copy the chrome from
  `_partials/`, link it in the nav, and add a `<url>` to `sitemap.xml` — the
  structural tests enforce all of this.
- `deck.html` mirrors the same release: bump the version in the title/kicker and
  add or revise slides when the extension's headline capabilities change.

## Architecture docs

`docs/architecture.md` documents the site (deployment topology, page/asset
wiring, tooling, nginx rules) with inline mermaid diagrams. Committed exports
live in `docs/diagrams/` as self-contained SVG plus 2x PNG, for slides and for
viewers that do not run mermaid. Regenerate them after editing a diagram:

```sh
node scripts/make-diagrams.mjs                          # every diagram
node scripts/make-diagrams.mjs --only 03-tooling-developer-workflow
node scripts/make-diagrams.mjs --force-fetch            # re-pin mermaid
```

Dependency-free, like `scripts/make-og-image.mjs`: the mermaid bundle is
downloaded once into the OS temp dir, each diagram is rendered in headless
Chrome/Edge, and the SVG + PNG are written to `docs/diagrams/`.

## Quiz

`docs/quiz.md` is a 10-question ADO Code quiz (8 single-answer, 2 multi-select)
with a sourced answer key, for onboarding, demos and docs. Answers are grounded
in the page copy (`faq.html`, `features.html`, …) and the slide deck, so re-verify
the key when marketing copy
changes. `tests/quiz.test.mjs` guards the structure (10 questions, 8 single +
2 multi-select, and an answer key that only cites options actually offered)
and `tests/quiz-evidence.test.mjs` guards derivation: `docs/quiz.md` carries an
`## Evidence` table quoting the exact site snippet behind each answer, and the
test grep-checks that every quote still exists in its source page and
that every distractor is still absent — so a copy change that breaks an answer
fails the build instead of shipping.
`tests/quiz-deck.test.mjs` guards the deck surface: `docs/quiz.md` carries a
`## Deck evidence` table mapping each question to a snippet that must appear
verbatim in `deck.html` (multi-select Q9/Q10 list every correct option), so a
presenter can grade all ten straight from the slides.
`tests/diagrams.test.mjs` fails when a diagram has no matching export or when an
export drifts from its source — run everything with `node --test`.

## License

Site content © 2026 Khairulnizam Hasan (steelburn).
