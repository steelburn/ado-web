# Changelog

All notable changes to the ADO Code website.

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
