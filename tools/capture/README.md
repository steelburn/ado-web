# Screenshot capture harness

Automated capture for the screenshot library, using **Playwright against
code-server in Docker**. Dev-only: nothing here ships in the site, and the whole
`tools/` tree is excluded from the Docker image (`.dockerignore`).

## Why this route

The 12 shots are surfaces of the **ADO Code VS Code extension**, not of this
website. code-server runs VS Code in a browser, so the extension's **webviews**
(chat panel, editor panels) become real DOM that Playwright can screenshot. The
extension's **native workbench chrome** (tree views, the QuickPick) is *not*
rendered faithfully by the web shell, so those shots are hand-captured on the
desktop.

`assets/img/screenshots/capture-set.json` records the split:

| mode | count | shots |
| --- | --- | --- |
| `browser` (automated) | 9 | `agent-chat-plan`, `pull-request-open`, `consent-countdown`, `memory-panel`, `mcp-skills`, `work-item-webview`, `run-verification`, `modes-selector`, `mermaid-diagram` |
| `manual` (hand-capture) | 3 | `backlog-tree`, `command-palette`, `worktree-run-card` |

The id set must stay equal to `assets/img/screenshots/manifest.json` — the guard
test fails otherwise.

> `worktree-run-card` is the movable one: it is `manual` here because the
> dedicated agent-worktree view is a native tree. If you capture it from the
> in-chat run card instead, delete its `surface`/`reason`/`how`, set
> `"mode": "browser"` and add `"scene": "worktreeRunCard"`, then add the matching
> scene in `capture.mjs`.

## Prerequisites

1. **Docker** — present in WSL2 (`wsl -e docker ps`). Not needed on the Windows PATH.
2. **code-server image** — pulled by `docker compose up`.
3. **The extension `.vsix`** — mounted and installed (default
   `../ado-code/ado-code-0.7.0.vsix`).
4. **Demo data** — a workspace with the "Payment Platform Overhaul" epic, a green
   pipeline and an open PR. The captures need a reachable Azure DevOps org and an
   LLM key, otherwise the surfaces render empty states.
5. **Playwright** — `cd tools/capture && npm install` (only when capturing).

Install the extension inside the container the first time:

```bash
wsl -e docker exec -it ado-capture \
  code-server --install-extension /tmp/ado-code.vsix
```

## Run

```bash
# 1. What would run (offline, no dependencies):
node tools/capture/capture.mjs --plan

# 2. Start the editor (from a WSL shell):
wsl -e bash -lc "cd /mnt/d/Development/vscode/ado-web/tools/capture && docker compose -f docker-compose.capture.yml up -d"

# 3. Capture (from Windows; Playwright reaches the published port on localhost):
cd tools/capture && npm install
node capture.mjs --password <pw>                 # all 9 browser shots
node capture.mjs --password <pw> --only agent-chat-plan --headed
```

PNGs are written to `assets/img/screenshots/<id>.png` at 1440x900 @2x, matching
`manifest.json` → `capture`.

Then finish the wiring by hand (the site owns this flow — see
`assets/img/screenshots/README.md`): set the shot's manifest `status` to
`captured`, flip the figure's `data-state`, and bump `SITE_VERSION`.

## Hand-capture the 3 native shots

Capture them from desktop VS Code at the same framing, following `capture-set.json`
→ `how` for each, then run the same wiring steps.

## Notes

- **Selectors are an external contract.** code-server's shell and the webview DOM
  are not ours. The scenes in `capture.mjs` are a working skeleton — tune a
  selector against the live editor on first run; each scene is isolated.
- **Headed mode** (`--headed --keep-open`) is the debugging path: it pauses so you
  can inspect frames with Playwright's inspector.
- **`docker exec` needs a WSL shell**: Docker lives in WSL2, so the compose/exec
  commands run there while the Playwright driver runs on Windows.
