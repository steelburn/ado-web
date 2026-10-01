# Changelog

All notable changes to the ADO Code website.

## [Unreleased]

### Added

- **0.7.0 feature rows in the table** — fifteen rows documenting the capabilities
  the feature reference had never covered: mid-run **steer vs. queue** input
  (`adoCode.chat.inputWhileBusy`), **chat density modes** (`adoCode.chat.density`),
  **AI delegation suggestions** (`adoCode.chat.suggestDelegation`), the chat-area
  declutter pass (folded tool rows, quiet reasoning text, attachment chips,
  jump-to-latest / collapse-all, one quiet status line), **detached background
  runs** with their stop guard and the `Running` / `Background run` session badge,
  session-scoped and **archived** goals, live session naming, `/remember` really
  persisting, and the shared error banner / settings-coverage fixes.
- **Capability counts 105 → 120** in the feature-reference heading and its toggle,
  with the per-area `feat-cat-count` badges updated to match (chat 30→41,
  agents 14→15, memory 8→9, ux 16→18). Every new row carries the `new · 0.6.5+`
  badge, so the 0.6.5-onward window stays the single rule.

### Tests

- New guard in `tests/version-consistency.test.mjs`: the feature table must
  document the documented release's capability set (steer/queue, density modes,
  delegation suggestions, the declutter pass, background runs, archived goals and
  the settings-coverage guard). Suite 197 → 198.
- New guard in `tests/architecture-doc.test.mjs`: the architecture doc must
  label its asset edges with `SITE_VERSION`, its committed SVG exports must match,
  and its deck slide count must match `deck.html`. Suite 199 → 202.
- `tests/version-consistency.test.mjs` spans the whole window now: the What’s new
  slide must announce “What’s new since 0.6.5.”, name the `v0.6.5 → v0.7.0` window,
  and cover seventeen capability markers across the table’s areas. Suite 202 → 203.
- The What's new slide's fixed 16:9 canvas is guarded now:
  `tests/version-consistency.test.mjs` fails if a column gains a fourth bullet
  (measured at the real 1280×720 canvas, four two-line bullets run 3px past the
  598px content box), if a bullet passes 58 characters, or if the footnote passes
  130. The slide itself was cut to three bullets a column. Suite 203 → 204.

### Changed

- **Extension version 0.6.7 → 0.7.0** throughout page copy, the index JSON-LD and
  the deck. 0.6.8 was never released, so its changes shipped inside 0.7.0. A pure
  version-string re-label at the time; the feature table has since gained the
  real 0.7.0 rows (see **Added**).
- **Deck “What’s new” slide** rewritten for 0.7.0 (three cards: *Steer, don’t
  stop*, *A calmer chat*, *Runs that don’t blink*) — mid-run steer vs. queue input,
  chat density modes, background runs that survive a session switch, delegation
  suggestions and archived goals. The slide had still described the 0.6.7 set.
- **Feature-table “new” badge now marks a release window** — rows new since
  **0.6.5** carry a single `new · 0.6.5+` badge instead of six per-release
  pills (`new · 0.6.1` … `new · 0.7.0`). Rows from 0.6.1/0.6.2/0.6.4 are no
  longer advertised as new, and the ten rows previously mislabelled
  `new · 0.7.0` (they shipped in 0.6.7) now sit correctly inside the window.
  The `feat-new-<n>` classes and the now-unused `sub-em-*` legend colours were
  retired.
- **Deck "What's new" slide refreshed** — the slide now covers the full documented
  0.7.0 capability set, matching the feature table: it gained the session-scoped
  To-do view and the consistency pass (one shared error banner, a control for every
  setting). Guarded by a new test, "the deck's What's new slide covers the release
  capability set", so the deck can no longer lag the table when rows are added for a
  release.
- **`docs/architecture.md` cache-bust drift fixed** — the diagram’s IDX→STY/MAIN
  edges had advertised `?v=0.7.0` since the page split while the site shipped
  `?v=0.11.0`, and the deck node still read “16-slide”. The mermaid source and its
  exported SVG/PNG now read `?v=0.11.0` / `17-slide`, and
  `scripts/set-site-version.mjs` rewrites the doc alongside the root pages, so the
  next `SITE_VERSION` bump cannot leave it stale.
- **Deck “What’s new” slide widened to the whole release window** — it used to stop
  at 0.7.0; it now covers every capability the table marks `new · 0.6.5+`, so its three
  cards group the 0.6.5 → 0.7.0 window: *A session that remembers* (Goal & To-do,
  per-session storage and editable checklists, archived goals, memory files and
  `/remember`), *A calmer, sturdier chat* (batch file reads, the loop circuit
  breaker, shell-safety guardrails, steer vs. queue, density, honest tool cards,
  the token-accounting overhaul) and *Runs that don’t blink* (unattached project
  mode, detached background runs, live session names, delegation suggestions, AI
  task review, editor-area chat and inline mermaid). The heading is now “What’s new
  since 0.6.5.” with a `v0.6.5 → v0.7.0` kicker. It is also **sized to fit its fixed
  canvas**: the slide sits in a fixed 1280×720 canvas with `overflow: hidden`,
  and the wider copy ran 271px past the 598px content box (the 0.7.0-only
  version already ran 155px past), so each column now carries three tighter
  bullets — measured at 69px of clearance.
  The slide’s speaker notes keep the long form of every trimmed capability.

## [0.11.0] — 2026-09-30

### Added

- **Full-screen screenshots on the deck and gallery** — clicking (or focusing
  and pressing Enter on) any screenshot in `deck.html` or `gallery.html` opens it
  in a lightbox at its natural size, with the caption beneath it. `Esc`, the ✕
  or a click on the backdrop closes it; the deck's keyboard shortcuts and the
  background-click slide advance pause while it is open, and the overlay is
  hidden in the print/export view.
- **Goal & To-do highlight** — the session Goal and its To-do list are now a
  fourth headline feature: a card in the landing page's `#highlights` bento, the
  same card at the top of the Features page, and a fourth card on the deck's
  Highlights slide (now a four-column grid).

### Changed

- `SITE_VERSION` `0.10.0` → `0.11.0`; `?v=` rewritten across all 10 root pages.

### Tests

- New `tests/deck-lightbox.test.mjs` (5), `tests/gallery-lightbox.test.mjs` (5)
  and `tests/goal-todo-highlight.test.mjs` (6) guards; the suite is now 196 tests.

## [0.10.0] — 2026-09-30

Documents the extension's **0.6.7** release.

### Added

- **0.6.7 feature rows** — ten new rows in the feature reference (session To-do
  list and goal, the `set_goal` / `update_todo_list` / `read_todo_list` tools in
  every mode, `/goal`, Thinking & Tools persistence, honest tool-card status,
  cleaner streaming answers, memory previews, opening memory files, per-session
  to-do storage and editable checklists), taking the table to **105 capabilities
  across 8 areas**. They carry a new `new · 0.6.7` rose badge.
- **Version guard test** — `tests/version-consistency.test.mjs` pins every
  version-bearing surface (header/footer chrome, hero eyebrow, JSON-LD
  `softwareVersion`, the feature heading + legend + table totals, the deck
  kickers and What's-new slide, the README and the capture tooling) to a single
  `PRODUCT_VERSION`, so a release bump is a deliberate, test-guarded change.

### Changed

- **Extension version 0.6.6 → 0.6.7** everywhere it appears in copy — page
  headers/footers, the hero eyebrow, `softwareVersion` in index.html's JSON-LD,
  the feature-reference heading and legend, the gallery's launch-film line, the
  deck's launch/closing kickers, the README and the capture tooling's `.vsix`
  mount.
- **Deck “What's new” slide** rewritten for 0.6.7 (three cards: *Plan in the
  open*, *A record you can trust*, *Memory & housekeeping*).
- **`assets/css/style.css`** — new `--rose` token plus the `new · 0.6.7` badge
  and legend swatch.
- **Asset cache-bust** `?v=0.9.0` → `?v=0.10.0` across all root pages
  (`SITE_VERSION` in `scripts/site-version.mjs`).
- **`sitemap.xml`** `lastmod` bumped to 2026-09-30.
- **`README.md`** deck line corrected to the current 17 slides.

## [0.7.0] — 2026-09-29

### Added

- **Multi-page information architecture (Option A)** — the single ~900-line
  `index.html` is split into **8 focused pages** plus the deck and a 404:
  `index.html` (landing), `features.html`, `gallery.html`, `modes.html`,
  `agents.html`, `commands.html`, `install.html`, `faq.html`. Each page carries
  its own `<title>`/description/canonical/OG and a single `<h1>`; JSON-LD is split
  (`SoftwareApplication` → home, `FAQPage` → FAQ). Section anchors are preserved
  and cross-linked as `/page.html#anchor`.
- **Shared chrome references** — `_partials/header.html` and `_partials/footer.html`
  are the canonical chrome (hand-duplicated into each page, per the no-build
  invariant), guarded by a parity test; the active nav item is marked
  `aria-current="page"`.
- **Page single source of truth** — `scripts/site-pages.mjs` lists every page
  (title, canonical, nav, JSON-LD) and is consumed by the version script and the
  structural tests.
- **Legacy deep-link redirect** — a small pre-paint script in `index.html` maps
  legacy `/#section` URLs to their new pages (`location.replace`, no history
  entry). Fragments never reach the server, so this is client-side by necessity.
- **Route infrastructure** — extensionless 301 aliases in `nginx.conf`
  (`/features` → `/features.html`, …, `/deck`), `sitemap.xml` now lists all 9 URLs
  with `lastmod`, and `404.html` links were repointed to the new IA.
- **Architecture diagrams** — `docs/architecture.md` plus committed self-contained
  SVG/2x-PNG exports in `docs/diagrams/`, generated by `scripts/make-diagrams.mjs`.
- **Onboarding quiz** — `docs/quiz.md` (10 sourced questions) with structural,
  evidence and deck-surface guards.
- **Capture tooling** — `tools/capture/` scaffold for producing redacted marketing
  screenshots.
- **Structural test suites** — `infra-routes`, `link-integrity`,
  `nav-completeness` and `chrome-parity`.

### Changed

- `index.html` is now a landing page (hero + capability highlights + install CTA)
  instead of the entire site.
- Guards that assumed a single page (`asset-version`, `a11y`, `reveal-fallback`)
  now iterate every page via `scripts/site-pages.mjs`.
- `scripts/set-site-version.mjs` rewrites `?v=` across every page (was
  `index.html` only).
- Asset cache-bust `SITE_VERSION` `0.7.0` → `0.8.0`; README gains a page inventory
  and the "no build step — chrome hand-duplicated" wording.

## [0.6.0] — 2026-09-28

### Added

- **Screenshot library** — `assets/img/screenshots/` is now a first-class asset with
  its own source of truth: `manifest.json` declares **12 marketing shots** (id,
  file, intrinsic size, alt, caption, which pages use them, capture recipe),
  `scripts/make-screenshots.mjs` renders deterministic stand-in PNGs (Node
  stdlib only, like the OG-image and diagram generators) and reports the capture
  backlog (`--check` / `--list` / `--force`), and the folder's `README.md` is the
  capture guide (window size, theme, demo data, redaction, per-shot recipe).
- **Screenshot gallery on the home page** — a new `#screens` section (nav link,
  lead shot + 9-cell grid) wired by id to the manifest.
- **Screenshot gallery slide in the deck** — a new `s6` slide puts 8 captures in
  one place; the deck is now **16 slides** (aria-labels renumbered).
- **`tests/screenshots.test.mjs`** — guards manifest ↔ PNG ↔ markup drift: file
  exists, real IHDR size, placeholder `tEXt` marker matches the declared status,
  every `data-shot` resolves, alt/caption copy matches the manifest (single
  source of copy), every shot is used by exactly the pages listed in `usedOn`,
  the capture guide documents every shot, and CSS keeps placeholders off the
  live site.

### Changed

- **Shots are wired by id, not by mockup.** `index.html` and `deck.html` use
  `<figure class="shot|s-shot" data-shot="…" data-state="placeholder|captured">`;
  while `data-state="placeholder"` the figure renders as a caption card and the
  generated stand-in PNG is never displayed. Real captures drop into the same
  slot with no markup change — and the deck's Work items (`s5`) and Demo (`s12`)
  slides keep their CSS mockup as the no-capture fallback.
- `?shots=placeholders` review mode on both pages shows the stand-ins so the
  gallery layout can be judged before the captures exist.
- Asset cache-bust bumped: `style.css` → `?v=0.7.0` (index, deck, 404),
  `deck.css` → `?v=1.2.0`; `SITE_VERSION` is now `0.7.0`.

## [0.5.2] — 2026-09-27

### Added

- **Launch film** — a 93-second narrated walkthrough of ADO Code v0.6.6 (`assets/video/ado-code-launch.mp4`, with a poster frame), embedded in a new **Launch film** section on the home page and on a new deck slide. Voiceover from Kokoro-82M and a MusicGen underscore, both generated locally and rendered with HyperFrames from an HTML composition; linked from the site nav and footer

### Changed

- Feature reference table updated to the **v0.6.6** feature set (95 features across 8 categories, up from 83): new rows for the 0.6.6 tool-system hardening (`delete_file` workspace delete tool, batch `read_file` via `paths` with the 400-line window and turn-scoped read cache, the degenerate-loop circuit breaker, quote-aware shell-operator sanitization + Windows `cmd.exe` builtin routing, `search_files` inline-flag parsing) and the 0.6.6 UI/config surface (chat in the editor area, interactive Mermaid diagrams with `Diagram | Code` + Copy Code, Mermaid SVG export/copy, custom branding & Secondary Side Bar container, header quick actions incl. `adoCode.rerunWizard`/`adoCode.openSettings`, per-organization PATs, unattached/standalone project mode, and the token-accounting & context-budgeting overhaul)
- New **new · 0.6.6** aqua badge (`feat-new-6` + `--aqua` token + `sub-em-aqua` legend pill), replacing 0.6.5 gold as the latest marker
- Existing rows refreshed for 0.6.6: context management (overhead-aware truncation against `maxTokens − overhead`, updated CJK/dense-code density), dynamic context window (longest-key-first matching with word boundaries), search-files flags, collapsible/dismissible/session-isolated confirmation cards, agent detection spawning the resolved binary (incl. the Claude adapter), full work-item detail rendering Mermaid, and rich-text images
- Two new highlight cards in the features bento — **Diagrams that render** (Mermaid + SVG export) and **Works without ADO** (standalone project mode)
- Copy refreshed: hero eyebrow/meta and sub mention Mermaid + standalone mode; Modes → Chat notes collapsible, dismissible, session-isolated consent cards; Commands section notes the view-header quick actions; Install step 2 marks Azure DevOps as optional with per-org PATs
- Version references bumped 0.6.5 → 0.6.6 (nav badge, hero eyebrow, footer, JSON-LD, feature-reference sub)
- Asset cache-bust bumped to `?v=0.5.2`
- **Presentation deck updated to v0.6.6** (the `deck.html` deployed from the presentation-deck branch): two new slides — **What's new in 0.6.6** and the **Launch film** — taking it from 13 to 15 slides; version refs, slide numbering and the counter updated, and the deck asset cache-busts bumped to `?v=1.1.0`
- Site nav and footer link the launch film and the presentation deck

## [0.5.1] — 2026-09-09

### Changed

- **Feature reference is default-collapsed**: the full table now sits behind a native `<details>` toggle — "Show the full feature list · 83 features · 8 categories" — so the section is lean until you ask for it. This also fixes a real bug: the table could render permanently invisible because the scroll-reveal only fired once **12% of the target** was visible, and an ~16,000&nbsp;px table can never satisfy that in a normal viewport (the previous 75-row version was borderline; the v0.6.5 rows pushed it past the point of revealing for everyone). The table is no longer opacity-gated at all, and any reveal target taller than the viewport now appears on first intersection
- Section copy trimmed; the release-badge legend (new · 0.6.1 … new · 0.6.5) moved inside the expander where the rows are visible
- Install CTA renamed "Open in Marketplace →" → "Open in Marketplace" (trailing arrow removed)
- Mobile polish: the toggle drops its count pill at ≤560&nbsp;px so the label stays on one line — this also removed a 7&nbsp;px horizontal page overflow the pill caused on narrow screens
- Asset cache-bust bumped to `?v=0.5.1`

## [0.5.0] — 2026-09-09

### Changed

- Feature reference table updated to the **v0.6.5** feature set (83 features across 8 categories): new rows for the v0.6.4 chat overhaul (two-sided chat layout without the (AI)/(You) avatar circles, session isolation — a turn is bound to the session that started it and can never bleed into another session, turns always conclude — iteration-budget exhaustion now ends in a chat summary instead of a bare error, round-trip iteration counting), the v0.6.4 understanding suite (self-updating AGENTS.md with `<!-- ado-code:managed -->` markers, drift reasons, diff Preview and decline memory; structure-first read-lazy project study), Windows-safe agent detection (.cmd → .exe fallback chain, spawn-the-detected-binary, 15s re-probe) and the v0.6.5 work-item safety rows (AI task review via Review Task Detail, one work item per session with Start-a-New-Session/Stay/Cancel guard)
- Existing rows refreshed for the latest release notes: agentic tool loop (iteration budget 100 default / round-trip semantics), live thinking & tool cards (in-flow per-iteration Thinking blocks + persistent ordered record), run history & progress (delegated runs stream as one evolving run card that concludes in place), git safety checks (YOLO still asks before pushing — `adoCode.yolo.pushApproval`), consent system (instant harmless-command approval, countdowns with named post-timeout actions that pause while you're away), native token counting (heuristic charges tool args/results/images; overhead sized from the real system prompt), Configuration page (model pickers are auto-fetched dropdowns)
- Batch work-item reads, batched terminal commands and focused wizard views re-badged **0.6.3 → 0.6.4** — they shipped in the marketplace 0.6.4 release (the previous site update tracked main ahead of the release); the gold "new" badge now marks **0.6.5** and 0.6.4 gets a new purple badge (legend + CSS updated; `feat-new-3` retired)
- Version references bumped 0.6.3 → 0.6.5 (nav badge, hero eyebrow, footer, JSON-LD, feature-reference sub)
- Chat / YOLO mode panel copy updated for v0.6.5 (instant harmless approval + live countdowns in Chat; push still asks even in YOLO); hero YOLO demo message updated to match
- Cache-busting: stylesheet and script now load with a `?v=0.6.5` query so the 7-day `immutable` asset cache can't serve stale CSS/JS against a fresh `index.html` after a deploy

## [0.4.0] — 2026-08-30

### Changed

- Feature reference table updated to the **v0.6.3** feature set (75 features across 8 categories) — new rows for batch work-item reads (`get_work_item` `ids` array, up to 20), batched terminal commands (`run_terminal_command` `commands` array, single consent card) and focused wizard views (sidebar collapse/restore, kebab "Configuration…" opens the in-app page); the project creation wizard row refreshed for the v0.6.3 wizard overhaul (creates projects anywhere, ADO integration creates the work item, branch name honored, template defaults pre-filled, project-name validation); the parallel tool calls row now documents mixed-batch parallelism
- "new · 0.6.3" badges added for freshly-landed rows
- Version references bumped 0.6.2 → 0.6.3 (nav badge, hero eyebrow, footer, JSON-LD, section sub)
- Fixed mobile horizontal overflow in the install grid (nowrap install command inflated the column past the viewport at ≤560px — `min-width: 0` on the grid children)
- Deployment: web service now runs as `container_name: ado-web` to match the Cloudflare tunnel's configured origin (`http://ado-web:80`) — without it the tunnel 502s; compose comment updated to reflect the real origin

## [0.3.0] — 2026-08-30

### Changed

- Feature reference table updated to the **v0.6.2** feature set (72 features across 8 categories) — new rows for rich-text work-item images, assignment cues, active editor context, AGENTS.md in chat, DeepSeek Harness (dsh) agent support and the repository understanding cache; existing rows refreshed (external agent list, native token counting, session persistence)
- Beautified feature table: per-category accent colors with icons and feature-count pills, "new · 0.6.1" / "new · 0.6.2" badges on recently-landed rows, label hover highlight, gradient category headers, table shadow
- Version references bumped 0.6.0 → 0.6.2 (nav badge, hero eyebrow, footer, JSON-LD)
- Copy updates: hero agent list, `/delegate` command row, agents note and backlog-tree checklist mention DeepSeek Harness and assignment cues

## [0.1.0] — 2026-08-24

### Added

- Initial landing page at https://ado-code.ne1.dev
- Hero with faithful VS Code mockup of the extension (Work Items tree, chat, mode pills, status bar)
- Features section: backlog tree, agent worktrees, memory, MCP & skills, model awareness, merge flow
- Interactive modes section (Chat / Plan / Act / YOLO)
- External agents section (Claude Code, Codex, OpenCode, Hermes)
- Slash commands reference
- Install section with copy-to-clipboard command and requirements
- Brand assets: logo, favicon, OG image
- Docker deployment (nginx) + static hosting instructions
- SEO: meta tags, Open Graph, JSON-LD SoftwareApplication, sitemap, robots.txt

## [0.2.0] — 2026-08-24

### Added

- Comprehensive feature reference table ("Everything ADO Code does") — 66 features across 8 categories (Work Items, AI Chat & Modes, Agents & Worktrees, Git Workflow, Memory, MCP & Skills, Model Intelligence & Context, Configuration & UX), covering the full v0.6.0 feature set from the release notes
- "All features" nav link

## [0.1.1] — 2026-08-24

### Added

- Cloudflare tunnel service in docker-compose (cloudflared, token from gitignored `.env`)
- `.env.example` template + `.gitignore` for secrets
- nginx security headers now apply to all responses (shared `security-headers.conf` include)

### Changed

- Host port for nginx changed from 8080 to **3060**
