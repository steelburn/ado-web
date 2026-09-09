# Changelog

All notable changes to the ADO Code website.

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
