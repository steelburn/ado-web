# ado-code.ne1.dev — Website Architecture

Marketing / landing site for the **ADO Code** VS Code extension.
Static HTML + CSS + vanilla JS, **no build step, no framework, no runtime
dependencies**. It deploys anywhere a static host is available; the reference
deployment is an nginx container fronted by a Cloudflare tunnel.

---

## Diagrams

Each diagram below is written as inline ```mermaid source (rendered by GitHub
and VS Code) and also exported to `docs/diagrams/` as a self-contained SVG and a
2x PNG for slides, PDFs and viewers that do not run mermaid. Regenerate the
exports with `node scripts/make-diagrams.mjs` after editing any diagram.

| # | Diagram | SVG | PNG |
| --- | --- | --- | --- |
| 1 | Runtime / deployment topology | [svg](diagrams/01-runtime-deployment-topology.svg) | [png](diagrams/01-runtime-deployment-topology.png) |
| 2 | Static file / site composition | [svg](diagrams/02-static-file-site-composition.svg) | [png](diagrams/02-static-file-site-composition.png) |
| 3 | Tooling / developer workflow | [svg](diagrams/03-tooling-developer-workflow.svg) | [png](diagrams/03-tooling-developer-workflow.png) |
| 4 | Request handling inside nginx | [svg](diagrams/04-request-handling-inside-nginx.svg) | [png](diagrams/04-request-handling-inside-nginx.png) |

---

## 1. Runtime / deployment topology

How a request flows from a browser to the served files in production.

```mermaid
flowchart TB
    subgraph Client["Browser"]
        U["Visitor"]
    end

    U -->|"https://ado-code.ne1.dev"| CF["Cloudflare Edge<br/>(DNS · TLS · CDN · WAF)"]

    subgraph Host["Docker host (docker-compose)"]
        subgraph TunnelC["container: cloudflared"]
            T["Cloudflare Tunnel<br/>--token ${CLOUDFLARE_TUNNEL_TOKEN}"]
        end
        subgraph WebC["container: ado-web"]
            N["nginx:alpine :80<br/>static file server"]
            N --> R["root /usr/share/nginx/html"]
        end
    end

    CF -->|"tunnel (outbound only, no inbound ports)"| T
    T -->|"http://ado-web:80"| N

    R --> F1["index.html (landing)"]
    R --> F2["deck.html (presentation)"]
    R --> F3["404.html"]
    R --> F4["assets/css · assets/js · assets/img · assets/video"]
    R --> F5["sitemap.xml · robots.txt · favicon.svg"]

    N -.->|"include"| SH["security-headers.conf<br/>(CSP, HSTS, X-Frame-Options, …)"]
```

> Exported: [SVG](diagrams/01-runtime-deployment-topology.svg) · [PNG](diagrams/01-runtime-deployment-topology.png)

Key facts:

- **Only one published port**: `3060:80` on the host (`3060` → nginx `80`). The
  tunnel container reaches nginx over the compose network by service name
  `http://ado-web:80` — **no inbound public port is exposed**.
- The **Cloudflare tunnel token lives in `.env`** (gitignored); `.env.example`
  documents the single required variable.
- The compose service name / `container_name` (`ado-web`) must stay in sync with
  the tunnel's public-hostname config in the Cloudflare dashboard.

---

## 2. Static file / site composition

The content the nginx `root` serves, and how the two HTML entry points wire up
their assets.

```mermaid
flowchart LR
    subgraph Pages["HTML entry points"]
        IDX["index.html<br/>single landing page"]
        DECK["deck.html<br/>16-slide deck"]
        E404["404.html"]
    end

    subgraph CSS["assets/css/"]
        STY["style.css<br/>design tokens · components<br/>(dark, Azure accent, IBM Plex)"]
        DCSS["deck.css<br/>deck theme · print/PDF rules"]
    end

    subgraph JS["assets/js/"]
        MAIN["main.js<br/>mode demo · tree mockup · copy<br/>mobile nav · scroll reveal"]
        DJS["deck.js<br/>keyboard · overview grid · fullscreen<br/>progress · touch swipe"]
    end

    subgraph Media["assets/"]
        IMG["img/ logo.svg · favicon.svg<br/>og-image.svg / og-image.png"]
        VID["video/ ado-code-launch.mp4<br/>+ -poster.jpg"]
    end

    subgraph SEO["SEO / meta"]
        SM["sitemap.xml"]
        RB["robots.txt"]
        LD["JSON-LD structured data<br/>(inline in index.html)"]
    end

    IDX -->|"?v=0.7.0"| STY
    IDX -->|"?v=0.7.0"| MAIN
    IDX --> IMG
    IDX --> VID
    IDX --> LD
    DECK --> DCSS
    DECK --> DJS

    IDX -.->|inlined head| BOOT["inline boot safety-net<br/>(window.__adoBooted)"]
    MAIN -.->|sets| BOOT

    RB -->|points to| SM
```

> Exported: [SVG](diagrams/02-static-file-site-composition.svg) · [PNG](diagrams/02-static-file-site-composition.png)

Notes:

- **`main.js`** boots the demo interactions and sets `window.__adoBooted = true`;
  an inline head script in `index.html` is a safety-net that detects a failed
  script load (if the boot flag never appears).
- **`deck.js`** is a self-contained controller for `deck.html`: ←/→/Space
  navigation, `G` overview grid, `N` speaker notes, `F` fullscreen, progress bar,
  and touch swipe.
- Assets are referenced with a **`?v=` cache-bust query string** so nginx's
  `immutable` caching can be used safely (see §4).

---

## 3. Tooling / developer workflow

There is **no build step and no `package.json`** — the files served are exactly
the files in the repo. Lightweight Node `.mjs` scripts and the Node test runner
support authoring and CI.

```mermaid
flowchart TB
    subgraph Dev["Source (repo = deployable artifact)"]
        HTML["*.html"]
        ASSET["assets/**"]
    end

    subgraph Tools["scripts/ (node .mjs)"]
        SV["site-version.mjs<br/>reads the single source of truth<br/>for the asset ?v= version"]
        SSV["set-site-version.mjs<br/>bumps ?v= across stylesheets/scripts"]
        OG["make-og-image.mjs<br/>generates og-image from SVG"]
    end

    subgraph Tests["tests/ (node --test)"]
        AV["asset-version.test.mjs"]
        SEO["seo.test.mjs"]
        A11Y["a11y.test.mjs"]
        RF["reveal-fallback.test.mjs"]
    end

    HTML --> SV
    SSV -->|writes| HTML
    SSV --> SV
    OG -->|OG image| ASSET
    SVGIN["assets/img/og-image.svg"] --> OG

    AV --> HTML
    SEO --> HTML
    A11Y --> HTML
    RF --> ASSET

    CV["scripts + html + assets"] --> GATE{"tests pass?"}
    AV --> GATE
    SEO --> GATE
    A11Y --> GATE
    RF --> GATE
    GATE -->|yes| CI["commit / deploy"]
    GATE -->|no| STOP["fix"]
```

> Exported: [SVG](diagrams/03-tooling-developer-workflow.svg) · [PNG](diagrams/03-tooling-developer-workflow.png)

Test intent (regression guards):

- **asset-version** — the `?v=` version matches `site-version.mjs`.
- **seo** — meta/OG/JSON-LD/sitemap/robots presence.
- **a11y** — accessible markup (labels, aria, sr-only regions).
- **reveal-fallback** — guards the `querySelectorAll` alias so a single-element
  regression silently breaking scroll reveal is caught.

---

## 4. Request handling inside nginx

Caching and header behavior for the different request classes.

```mermaid
flowchart TB
    REQ["Incoming HTTP request<br/>(from cloudflared)"] --> SEL{"Which location?"}

    SEL -->|"~* \.(css|js|svg|png|jpg|webp|woff2?)$"| A["Static assets<br/>expires 7d<br/>Cache-Control: public, max-age=604800, immutable<br/>+ security headers"]
    SEL -->|"= / (home)"| B["index.html via try_files<br/>Cache-Control: no-cache<br/>+ security headers"]
    SEL -->|"other"| C["Other files (deck.html, etc.)<br/>default root lookup"]
    SEL -->|"not found"| D["error_page 404 → /404.html"]

    A --> GZ["gzip (on, min 1024 bytes)"]
    B --> GZ
    C --> GZ
    D --> GZ
    GZ --> RESP["Response"]

    note["security-headers.conf is re-included in every<br/>location that sets its own add_header — nginx<br/>does NOT inherit server-level add_header there."]
```

> Exported: [SVG](diagrams/04-request-handling-inside-nginx.svg) · [PNG](diagrams/04-request-handling-inside-nginx.png)

- **Asset URLs are versioned** (`?v=<site-version>`), so they can be cached
  `immutable` for 7 days; a version bump forces fresh fetches past the cache.
- **The home page is `no-cache`** so visitors always get the latest HTML (and
  therefore the latest asset version references).

---

## 5. Component summary

| Layer | Artifact | Responsibility |
| --- | --- | --- |
| Edge | Cloudflare | DNS, TLS, CDN, tunnel ingress |
| Tunnel | `cloudflared` container | Outbound-only link edge → host |
| Web server | nginx (`ado-web:80`) | Static serving, gzip, caching, security headers, 404 |
| Pages | `index.html`, `deck.html`, `404.html` | Content / entry points |
| Styles | `assets/css/style.css`, `deck.css` | Design system, landing + deck themes |
| Behavior | `assets/js/main.js`, `deck.js` | Landing interactions, deck controller |
| Media | `assets/img/`, `assets/img/screenshots/`, `assets/video/` | Logo, OG images, screenshot library (manifest + capture guide), launch film |
| SEO | `sitemap.xml`, `robots.txt`, inline JSON-LD | Crawlability / structured data |
| Tooling | `scripts/*.mjs` | Version bumping, OG image + architecture-diagram generation |
| Quality | `tests/*.test.mjs` | Asset-version, SEO, a11y, reveal regression, screenshot manifest ↔ PNG ↔ markup drift |
| Packaging | `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `security-headers.conf`, `.env.example` | Container build & orchestration |

---

## Data-flow in one line

`browser → Cloudflare edge → cloudflared tunnel → nginx (ado-web:80) → static files in /usr/share/nginx/html`
