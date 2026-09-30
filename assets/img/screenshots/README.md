# Screenshot library

Every marketing screenshot used by `index.html` and `deck.html` lives here.

```
assets/img/screenshots/
├── manifest.json      ← single source of truth (shots, ids, sizes, copy, usedOn, recipe)
├── README.md          ← this capture guide
├── backlog-tree.png   ← one PNG per shot, named <id>.png
├── agent-chat-plan.png
└── …
```

There is no build step and no image dependency: `scripts/make-screenshots.mjs`
renders the stand-in PNGs with Node's `zlib` only, exactly like
`scripts/make-og-image.mjs` and `scripts/make-diagrams.mjs` do for their assets.

## How a shot is wired

HTML references a shot **by id**, never by ad-hoc markup:

```html
<figure class="shot" data-shot="backlog-tree" data-state="placeholder">
  <img src="/assets/img/screenshots/backlog-tree.png?v=0.7.0"
       alt="VS Code with the ADO Code activity bar open, …"
       width="1440" height="900" loading="lazy" decoding="async">
  <figcaption><strong>Work items</strong> — your backlog as a real editor tree.</figcaption>
</figure>
```

`data-state` mirrors the manifest `status`:

| `status` / `data-state` | PNG on disk | Rendering |
| --- | --- | --- |
| `placeholder` | generated stand-in (carries a `tEXt` marker) | caption card only — the stand-in raster is **never** shown on the live site |
| `captured` | real screenshot | image + caption |

Two rules keep the pages honest, and both are enforced by
`tests/screenshots.test.mjs`:

1. **No placeholder is ever displayed** — `data-state="placeholder"` renders the
   `.shot` as a caption card (`.shot[data-state="placeholder"] img { display:none }`).
2. **No figure may claim `captured` without a real PNG** — the marker chunk is
   read back from the file, so a renamed stand-in cannot pass as a capture.

Review the layout with stand-ins visible by appending `?shots=placeholders` to
`index.html` or `deck.html` (`index.html?shots=placeholders`).

## Capture recipe (all shots)

| Setting | Value |
| --- | --- |
| Window | 1440×900 content area, no OS chrome (VS Code maximised on a 1440×900 viewport is fine) |
| Theme | VS Code default dark (`Dark+`), zoom level 1, no custom CSS |
| Device pixel ratio | 2 when capturing on a HiDPI display; keep the PNG at its captured size (1440×900 @2x = 2880×1800) |
| Format | PNG, 8-bit, no alpha needed |
| Demo data | workspace `ado-demo`, organization `ne1-demo`, project `Payments` |
| Redaction | no real PATs, org names, user avatars, customer names or tokens on screen |

`width` / `height` in the manifest are the PNG's **intrinsic pixel** size — they must
match the file exactly (the guard compares them, and the figure's `width`/`height`
attributes mirror them). A 1440×900 window captured at DPR 2 is therefore declared
`2880×1800`; hand captures keep whatever window size they were taken at.

Tips:

- Prefer **content area only** (no title bar / dock) so the shot squares up with the page grid.
- Keep the sidebar at ~320px and the chat at ~380px so panels stay legible when scaled to a 360px grid cell.
- Capture the *stable* state: finished plans, completed gates — nothing mid-animation.
- Re-capture after a UI change in the extension; the deck and landing page then update with no HTML edit.

## Shot backlog

Run `node scripts/make-screenshots.mjs --list` for live status. The table below
is the plan; each row also carries a `capture` recipe in `manifest.json`.

| # | id | file | Shows | Landing | Deck |
| --- | --- | --- | --- | --- | --- |
| 1 | `backlog-tree` | `backlog-tree.png` | Epic → Feature → Story → Task tree in the editor | lead shot | `s5` media slot (replaces the CSS tree mockup) |
| 2 | `agent-chat-plan` | `agent-chat-plan.png` | plan card, tool calls, streamed diff | gallery | `s6` gallery |
| 3 | `worktree-run-card` | `worktree-run-card.png` | isolated worktree, branch, live log | gallery | `s6` gallery |
| 4 | `pull-request-open` | `pull-request-open.png` | gates green + created PR | gallery | `s6` gallery |
| 5 | `consent-countdown` | `consent-countdown.png` | consent card with auto-approve countdown | gallery | `s6` gallery |
| 6 | `memory-panel` | `memory-panel.png` | user + project memory scopes | gallery | `s6` gallery |
| 7 | `mcp-skills` | `mcp-skills.png` | MCP servers and skills manager | gallery | `s6` gallery |
| 8 | `command-palette` | `command-palette.png` | palette filtered to `ADO Code:` | gallery | `s12` media slot (replaces the CSS window mockup) |
| 9 | `work-item-webview` | `work-item-webview.png` | description, criteria, discussion | gallery | — |
| 10 | `run-verification` | `run-verification.png` | tests / lint / build gates | gallery | — |
| 11 | `modes-selector` | `modes-selector.png` | Ask / Plan / Agent / Auto | — | `s6` gallery |
| 12 | `mermaid-diagram` | `mermaid-diagram.png` | inline rendered Mermaid diagram | — | `s6` gallery |
| 13 | `todo-panel` | `todo-panel.png` | session to-do checklist with the pinned goal | gallery | — |

## Workflow: add or populate a shot

```sh
# 1. declare it (id, size, alt, caption, usedOn, capture recipe, status "placeholder")
#    → assets/img/screenshots/manifest.json

# 2. render the stand-in PNG + see the backlog
node scripts/make-screenshots.mjs

# 3. wire it into the markup, then capture the real screenshot
#    <figure class="shot" data-shot="<id>" data-state="placeholder"> … </figure>

# 4. drop the real PNG in place and flip BOTH switches
#    manifest.json:  "status": "captured"
#    html:           data-state="captured"

# 5. verify + bust caches
node scripts/make-screenshots.mjs --check
node scripts/set-site-version.mjs     # after bumping SITE_VERSION in scripts/site-version.mjs
node --test
```

Step 4 has to be done together: the manifest status and the markup `data-state`
are compared against the actual PNG bytes by the test suite, so a half-finished
swap fails CI instead of shipping a placeholder or hiding a real shot.

## Adding a brand-new shot

1. Add an entry to `manifest.json` (`status: "placeholder"`).
2. Run `node scripts/make-screenshots.mjs` — the stand-in PNG appears.
3. Add the `<figure data-shot="…">` markup in `index.html` (`#screens` section)
   and/or `deck.html`, and list the page in the manifest `usedOn`.
4. Extend this table.
5. `node --test` — the suite checks id ↔ file ↔ size ↔ alt ↔ caption ↔ page wiring.
