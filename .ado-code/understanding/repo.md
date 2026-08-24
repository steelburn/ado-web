### Repository Facts

Root: /home/steelburn/Development/vscode/ado-code-website
Branch: main
HEAD: b56f193
Remote: git@github.com:steelburn/ado-web.git

## Top-Level Structure

- assets/
- .env
- .env.example
- .gitignore
- CHANGELOG.md
- Dockerfile
- README.md
- docker-compose.yml
- favicon.svg
- index.html
- nginx.conf
- robots.txt
- security-headers.conf
- sitemap.xml

## README (head)

```
# ado-code.ne1.dev — ADO Code website

Marketing / landing site for the **ADO Code** VS Code extension
([marketplace](https://marketplace.visualstudio.com/items?itemName=steelburn.ado-code),
[GitHub](https://github.com/steelburn/ado-code)).

## Stack

Static HTML + CSS + vanilla JS. No build step, no framework, no dependencies.
Deploys anywhere: nginx container, Netlify, Cloudflare Pages, or any static host.

- `index.html` — single landing page (hero + features + modes + agents + commands + install)
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
```

### LLM Summary

# ADO Code Website — Repository Understanding

## Architecture

This is a **static marketing/landing site** for the ADO Code VS Code extension. It is plain HTML + CSS + vanilla JS with **no build step, framework, or dependencies**. The site is served either from a local static server or an nginx container. There is no application backend; all content is client-side.

## Key Files and Directories

- `index.html` — Single landing page containing hero, features, modes, agents, commands, and install sections.
- `assets/` — Static assets:
  - `assets/css/style.css` — design tokens and components (dark developer theme, Azure accent, IBM Plex font).
  - `assets/js/main.js` — interactive features: mode demo, tree mockup, copy-to-clipboard, mobile nav, scroll reveal.
  - `assets/img/` — logo, favicon, OG image.
- `Dockerfile` / `nginx.conf` / `security-headers.conf` / `docker-compose.yml` — Containerized deployment using nginx, including gzip, caching, and security headers.
- `sitemap.xml`, `robots.txt` — SEO files.
- `.env`, `.env.example` — Present but not described in the README; likely deployment configuration.
- `CHANGELOG.md`, `README.md` — Project documentation.

## Conventions

- **Structure**: Flat static site; HTML at root, CSS/JS/images under `assets/`, deployment config at root.
- **Naming**: Lowercase, descriptive filenames (`style.css`, `main.js`, `nginx.conf`). Extension/project name is “ADO Code”.
- **Styling**: Centralized CSS with design tokens; theme matches developer tools and Azure branding.
- **JavaScript**: Vanilla JS, no modules or framework; responsibilities are split by feature (demo, tree, clipboard, nav, scroll).
- **Error handling**: No explicit error-handling patterns are visible in the repository facts; the README does not describe any.

## Build, Test, Lint

- **Build**: None. The README states “No build step, no framework, no dependencies.”
- **Run locally**:
  ```sh
  python3 -m http.server 8000
  ```
  Then open `http://localhost:8000`.
- **Run with Docker**:
  ```sh
  docker compose up --build
  ```
  Then open `http://localhost:8080`.
- **Test / Lint**: No test suite or linter configuration is present or described in the repository facts.

## Common Gotchas

- Since there is no build step, any changes to `index.html`, CSS, or JS are served directly; no compiled output needs regenerating.
- The site is a single page — most content lives in one HTML file, so edits can aggregate there.
- Docker setup exposes port **8080** while the Python server uses **8000**; don’t mix them up.
- Deployment is nginx-specific; local static hosting via Python won’t apply `nginx.conf` security headers or caching.
- `.env` exists but is not documented in the README; it may contain environment-specific values used by the container setup, but no u